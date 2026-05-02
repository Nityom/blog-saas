import { internalMutation, query } from "./_generated/server";
import { v } from "convex/values";

export const getByClinic = query({
  args: { clinicId: v.id("clinics") },
  handler: async (ctx, args) => {
    const socialPosts = await ctx.db
      .query("socialPosts")
      .withIndex("by_clinic", (q) => q.eq("clinicId", args.clinicId))
      .order("desc")
      .collect();

    return await Promise.all(
      socialPosts.map(async (socialPost) => {
        const post = await ctx.db.get(socialPost.postId);
        return {
          ...socialPost,
          postTitle: post?.title || "Unknown post",
        };
      })
    );
  },
});

export const getByPost = query({
  args: { postId: v.id("posts") },
  handler: async (ctx, args) => {
    const socialPosts = await ctx.db
      .query("socialPosts")
      .withIndex("by_post", (q) => q.eq("postId", args.postId))
      .order("desc")
      .collect();

    const post = await ctx.db.get(args.postId);

    return socialPosts.map((socialPost) => ({
      ...socialPost,
      postTitle: post?.title || "Unknown post",
    }));
  },
});

export const getAdminOverview = query({
  handler: async (ctx) => {
    const clinics = await ctx.db.query("clinics").collect();
    const socialPosts = await ctx.db.query("socialPosts").order("desc").take(500);
    const startOfToday = new Date();
    startOfToday.setUTCHours(0, 0, 0, 0);
    const startOfTodayMs = startOfToday.getTime();

    return clinics.map((clinic) => {
      const clinicPosts = socialPosts.filter((post) => post.clinicId === clinic._id);
      const failedTodayCount = clinicPosts.filter(
        (post) => post.status === "failed" && post.createdAt >= startOfTodayMs
      ).length;
      const facebookConnected = Boolean(clinic.metaPageId);
      const instagramConnected = Boolean(clinic.metaInstagramAccountId);
      const tokenExpired = Boolean(clinic.metaTokenExpiresAt && clinic.metaTokenExpiresAt < Date.now());
      const tokenExpiringSoon = Boolean(
        clinic.metaTokenExpiresAt &&
          clinic.metaTokenExpiresAt >= Date.now() &&
          clinic.metaTokenExpiresAt - Date.now() <= 7 * 24 * 60 * 60 * 1000
      );

      return {
        ...clinic,
        facebookConnected,
        instagramConnected,
        tokenExpired,
        tokenExpiringSoon,
        failedTodayCount,
        socialLabel: `FB ${facebookConnected ? "✅" : "❌"} IG ${instagramConnected ? "✅" : "❌"}`,
      };
    });
  },
});

export const createSocialPostEntry = internalMutation({
  args: {
    clinicId: v.id("clinics"),
    postId: v.id("posts"),
    platform: v.union(v.literal("facebook"), v.literal("instagram")),
    content: v.string(),
    imageUrl: v.string(),
  },
  handler: async (ctx, args) => {
    return await ctx.db.insert("socialPosts", {
      ...args,
      status: "pending",
      createdAt: Date.now(),
    });
  },
});

export const updateSocialPostEntry = internalMutation({
  args: {
    socialPostId: v.id("socialPosts"),
    status: v.union(v.literal("pending"), v.literal("posted"), v.literal("failed")),
    platformPostId: v.optional(v.string()),
    errorMessage: v.optional(v.string()),
    postedAt: v.optional(v.number()),
  },
  handler: async (ctx, args) => {
    const { socialPostId, ...updates } = args;
    await ctx.db.patch(socialPostId, updates);
  },
});