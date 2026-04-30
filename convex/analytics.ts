import { mutation, query } from "./_generated/server";
import { v } from "convex/values";

export const recordView = mutation({
  args: {
    clinicId: v.id("clinics"),
    postId: v.id("posts"),
  },
  handler: async (ctx, args) => {
    // 1. Get the post to find the keywordId
    const post = await ctx.db.get(args.postId);
    if (!post || post.clinicId !== args.clinicId) {
      throw new Error("Post not found or clinic mismatch");
    }

    const keywordId = post.keywordId;

    // 2. Increment analytics.views for this post
    // Let's check if an analytics record exists for this post
    const existingRecord = await ctx.db
      .query("analytics")
      .withIndex("by_post", (q) => q.eq("postId", args.postId))
      .first();

    if (existingRecord) {
      await ctx.db.patch(existingRecord._id, {
        views: existingRecord.views + 1,
      });
    } else {
      await ctx.db.insert("analytics", {
        clinicId: args.clinicId,
        postId: args.postId,
        keywordId: keywordId,
        views: 1,
        avgTimeOnPage: 0,
        recordedAt: Date.now(),
      });
    }

    // 3. Recalculate keyword.performanceScore:
    // = total views of all posts with this keywordId / count of those posts
    const allKeywordAnalytics = await ctx.db
      .query("analytics")
      .withIndex("by_keyword", (q) => q.eq("keywordId", keywordId))
      .collect();

    let totalViews = 0;
    const postCount = allKeywordAnalytics.length; // number of distinct posts tracking analytics for this keyword

    for (const record of allKeywordAnalytics) {
      totalViews += record.views;
    }

    // if there are posts with this keyword that haven't been viewed yet, they won't be in analytics
    // to be perfectly accurate, we should count all posts with this keyword
    const allPostsWithKeyword = await ctx.db
      .query("posts")
      .filter((q) => q.eq(q.field("keywordId"), keywordId))
      .collect();
    
    const actualPostCount = allPostsWithKeyword.length || 1;
    const performanceScore = totalViews / actualPostCount;

    // 4. Update keyword.performanceScore in Convex
    await ctx.db.patch(keywordId, {
      performanceScore: performanceScore,
    });
  },
});

export const getTopPerformingPosts = query({
  args: { clinicId: v.id("clinics") },
  handler: async (ctx, args) => {
    const records = await ctx.db
      .query("analytics")
      .withIndex("by_clinic", (q) => q.eq("clinicId", args.clinicId))
      .collect();
    
    // Sort by views DESC and return top 5
    records.sort((a, b) => b.views - a.views);
    return records.slice(0, 5);
  },
});

export const getAnalyticsOverTime = query({
  args: { clinicId: v.id("clinics") },
  handler: async (ctx, args) => {
    // We can just return all records or do more complex aggregations.
    // For simplicity, we return the raw records so frontend can chart them.
    return await ctx.db
      .query("analytics")
      .withIndex("by_clinic", (q) => q.eq("clinicId", args.clinicId))
      .collect();
  },
});
