import { action, internalMutation, internalQuery } from "./_generated/server";
import { v } from "convex/values";
import { internal } from "./_generated/api";
import { decrypt } from "../lib/encryption";
import { markdownToHtml } from "../lib/markdown";

export const getIntegrationData = internalQuery({
  args: { postId: v.id("posts") },
  handler: async (ctx, args) => {
    const post = await ctx.db.get(args.postId);
    if (!post) throw new Error("Post not found");
    const clinic = await ctx.db.get(post.clinicId);
    if (!clinic) throw new Error("Clinic not found");
    return { post, clinic };
  },
});

export const setPublished = internalMutation({
  args: { 
    postId: v.id("posts"), 
    wordpressPostId: v.optional(v.number()) 
  },
  handler: async (ctx, args) => {
    await ctx.db.patch(args.postId, {
      status: "published",
      publishedAt: Date.now(),
      ...(args.wordpressPostId ? { wordpressPostId: args.wordpressPostId } : {})
    });
  },
});

export const logIntegration = internalMutation({
  args: {
    clinicId: v.id("clinics"),
    postId: v.id("posts"),
    method: v.union(v.literal("wordpress"), v.literal("embed"), v.literal("hosted")),
    status: v.union(v.literal("success"), v.literal("failed")),
    response: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    await ctx.db.insert("integrationLogs", {
      ...args,
      runAt: Date.now(),
    });
  },
});

export const publishPost = action({
  args: { postId: v.id("posts") },
  handler: async (ctx, args) => {
    const data = await ctx.runQuery(internal.integrations.getIntegrationData, { postId: args.postId });
    const { post, clinic } = data;

    try {
      if (clinic.integrationMethod === "hosted" || clinic.integrationMethod === "embed") {
        await ctx.runMutation(internal.integrations.setPublished, { postId: post._id });
        await ctx.runMutation(internal.integrations.logIntegration, {
          clinicId: clinic._id,
          postId: post._id,
          method: clinic.integrationMethod,
          status: "success",
        });
        return { success: true };
      }

      if (clinic.integrationMethod === "wordpress") {
        if (!clinic.wordpressUrl || !clinic.wordpressAppPasswordEncrypted) {
          throw new Error("WordPress credentials missing");
        }

        const decryptedPass = await decrypt(clinic.wordpressAppPasswordEncrypted);
        const authHeader = "Basic " + btoa("admin:" + decryptedPass);

        // Step 1: Upload featured image
        // First we need to fetch the image from imageUrl
        const imgRes = await fetch(post.imageUrl);
        const imgBuffer = await imgRes.arrayBuffer();

        const mediaRes = await fetch(`${clinic.wordpressUrl}/wp-json/wp/v2/media`, {
          method: "POST",
          headers: {
            Authorization: authHeader,
            "Content-Disposition": 'attachment; filename="featured.jpg"',
            "Content-Type": "image/jpeg",
          },
          body: imgBuffer,
        });

        if (!mediaRes.ok) {
          const err = await mediaRes.text();
          throw new Error("Failed to upload image to WordPress: " + err);
        }

        const mediaData = await mediaRes.json();
        const mediaId = mediaData.id;

        // Step 2: Create Post
        const wpPostRes = await fetch(`${clinic.wordpressUrl}/wp-json/wp/v2/posts`, {
          method: "POST",
          headers: {
            Authorization: authHeader,
            "Content-Type": "application/json",
          },
          body: JSON.stringify({
            title: post.title,
            content: markdownToHtml(post.content),
            status: "publish",
            slug: post.slug,
            featured_media: mediaId,
            meta: {
              _yoast_wpseo_title: post.metaTitle,
              _yoast_wpseo_metadesc: post.metaDesc,
            },
          }),
        });

        if (!wpPostRes.ok) {
          const err = await wpPostRes.text();
          throw new Error("Failed to create post on WordPress: " + err);
        }

        const wpPostData = await wpPostRes.json();
        const wordpressPostId = wpPostData.id;

        // Step 3 & 4
        await ctx.runMutation(internal.integrations.setPublished, { 
          postId: post._id, 
          wordpressPostId 
        });
        
        await ctx.runMutation(internal.integrations.logIntegration, {
          clinicId: clinic._id,
          postId: post._id,
          method: "wordpress",
          status: "success",
        });

        return { success: true };
      }
    } catch (error: any) {
      console.error("Publishing error:", error);
      await ctx.runMutation(internal.integrations.logIntegration, {
        clinicId: clinic._id,
        postId: post._id,
        method: clinic.integrationMethod,
        status: "failed",
        response: error.message,
      });
      throw error;
    }
  },
});
