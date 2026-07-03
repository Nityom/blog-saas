import { action, mutation, query } from "./_generated/server";
import { v } from "convex/values";
import { api } from "./_generated/api";
import { fetchPexelsImage } from "../lib/pexels";

export const getByClinic = query({
  args: { clinicId: v.id("clinics") },
  handler: async (ctx, args) => {
    return await ctx.db
      .query("posts")
      .withIndex("by_clinic", (q) => q.eq("clinicId", args.clinicId))
      .collect();
  },
});

export const getPublishedByClinic = query({
  args: { clinicId: v.id("clinics") },
  handler: async (ctx, args) => {
    return await ctx.db
      .query("posts")
      .withIndex("by_clinic_and_status", (q) =>
        q.eq("clinicId", args.clinicId).eq("status", "published")
      )
      .collect();
  },
});

export const getBySlug = query({
  args: { clinicId: v.id("clinics"), slug: v.string() },
  handler: async (ctx, args) => {
    return await ctx.db
      .query("posts")
      .withIndex("by_clinic_and_slug", (q) =>
        q.eq("clinicId", args.clinicId).eq("slug", args.slug)
      )
      .first();
  },
});

export const getById = query({
  args: { postId: v.id("posts") },
  handler: async (ctx, args) => {
    return await ctx.db.get(args.postId);
  },
});

export const getUsedImageUrls = query({
  args: { clinicId: v.id("clinics") },
  handler: async (ctx, args) => {
    const posts = await ctx.db
      .query("posts")
      .withIndex("by_clinic", (q) => q.eq("clinicId", args.clinicId))
      .collect();
    return posts
      .map((p) => p.imageUrl)
      .filter((url): url is string => !!url && url.startsWith("http"));
  },
});

export const update = mutation({
  args: {
    postId: v.id("posts"),
    title: v.optional(v.string()),
    slug: v.optional(v.string()),
    excerpt: v.optional(v.string()),
    content: v.optional(v.string()),
    metaTitle: v.optional(v.string()),
    metaDesc: v.optional(v.string()),
    imageUrl: v.optional(v.string()),
    storageId: v.optional(v.id("_storage")),
    imageCredit: v.optional(v.string()),
    imageCreditUrl: v.optional(v.string()),
    authorName: v.optional(v.string()),
    status: v.optional(
      v.union(v.literal("generating"), v.literal("draft"), v.literal("published"), v.literal("flagged"))
    ),
    wordpressPostId: v.optional(v.number()),
    publishedAt: v.optional(v.number()),
    updatedAt: v.optional(v.number()),
  },
  handler: async (ctx, args) => {
    const { postId, storageId, ...updates } = args;

    let resolvedImageUrl = updates.imageUrl;
    if (storageId) {
      const url = await ctx.storage.getUrl(storageId);
      if (url) resolvedImageUrl = url;
    }

    await ctx.db.patch(postId, {
      ...updates,
      ...(resolvedImageUrl ? { imageUrl: resolvedImageUrl } : {}),
      updatedAt: Date.now(),
    });
  },
});

export const generateUploadUrl = mutation(async (ctx) => {
  return await ctx.storage.generateUploadUrl();
});

export const getStorageUrl = mutation({
  args: { storageId: v.id("_storage") },
  handler: async (ctx, args) => {
    const url = await ctx.storage.getUrl(args.storageId);
    return url;
  },
});

export const remove = mutation({
  args: { postId: v.id("posts") },
  handler: async (ctx, args) => {
    await ctx.db.delete(args.postId);
  },
});

export const cleanupAuthorNames = mutation({
  handler: async (ctx) => {
    const posts = await ctx.db.query("posts").collect();
    let fixedCount = 0;
    for (const post of posts) {
      if (post.authorName && post.authorName.toLowerCase().startsWith("dr. dr.")) {
        const newName = post.authorName.replace(/^dr\.\s+dr\./i, "Dr.");
        await ctx.db.patch(post._id, { authorName: newName });
        fixedCount++;
      }
    }
    return fixedCount;
  },
});

export const syncMetaTitlesWithTitles = mutation({
  args: {},
  handler: async (ctx) => {
    const posts = await ctx.db.query("posts").collect();
    let fixedCount = 0;

    for (const post of posts) {
      if (post.metaTitle !== post.title) {
        await ctx.db.patch(post._id, {
          metaTitle: post.title,
          updatedAt: Date.now(),
        });
        fixedCount++;
      }
    }

    return fixedCount;
  },
});

export const refreshImage = action({
  args: { postId: v.id("posts") },
  handler: async (ctx, args) => {
    const post = await ctx.runQuery(api.posts.getById, { postId: args.postId });
    if (!post) throw new Error("Post not found");

    const keyword = await ctx.runQuery(api.keywords.getById, { keywordId: post.keywordId });
    const keywordTerm = keyword?.term ?? post.title;

    const usedUrls: string[] = await ctx.runQuery(api.posts.getUsedImageUrls, { clinicId: post.clinicId });
    // Exclude current image so we always get a fresh one.
    const excludeUrls = usedUrls.filter((u) => u !== post.imageUrl);

    const queries = [
      `${keywordTerm} dental procedure`,
      keywordTerm,
      "dental treatment dentist clinic",
    ];

    const pexelsImage = await fetchPexelsImage(queries, excludeUrls);

    await ctx.runMutation(api.posts.update, {
      postId: args.postId,
      imageUrl: pexelsImage.imageUrl,
      imageCredit: pexelsImage.imageCredit,
      imageCreditUrl: pexelsImage.imageCreditUrl,
    });

    return pexelsImage;
  },
});
