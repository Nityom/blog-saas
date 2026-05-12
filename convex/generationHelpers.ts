import { internalQuery } from "./_generated/server";
import { v } from "convex/values";

export const getClinic = internalQuery({
  args: { clinicId: v.id("clinics") },
  handler: async (ctx, args) => {
    return await ctx.db.get(args.clinicId);
  },
});

/**
 * Resolve cluster siblings for a keyword and pull their most recent
 * published posts. Used to feed the generation prompt with high-quality
 * internal-link targets that compound topical authority.
 */
export const getClusterContext = internalQuery({
  args: {
    clinicId: v.id("clinics"),
    keywordId: v.id("keywords"),
  },
  handler: async (ctx, args) => {
    const keyword = await ctx.db.get(args.keywordId);
    if (!keyword) return { siblings: [], pillar: null, isPillar: false, cluster: null };

    if (!keyword.cluster) {
      return { siblings: [], pillar: null, isPillar: !!keyword.isPillar, cluster: null };
    }

    const clusterMates = await ctx.db
      .query("keywords")
      .withIndex("by_clinic_and_cluster", (q) =>
        q.eq("clinicId", args.clinicId).eq("cluster", keyword.cluster)
      )
      .collect();

    let pillarPost: { slug: string; term: string; title: string } | null = null;
    const pillarKw = clusterMates.find((k) => k.isPillar && k._id !== keyword._id);
    if (pillarKw) {
      const posts = await ctx.db
        .query("posts")
        .withIndex("by_clinic", (q) => q.eq("clinicId", args.clinicId))
        .collect();
      const p = posts
        .filter((p) => p.keywordId === pillarKw._id && p.status === "published")
        .sort((a, b) => (b.publishedAt || 0) - (a.publishedAt || 0))[0];
      if (p) pillarPost = { slug: p.slug, term: pillarKw.term, title: p.title };
    }

    const siblingKwIds = clusterMates
      .filter((k) => k._id !== keyword._id && (!pillarKw || k._id !== pillarKw._id))
      .map((k) => k._id);

    if (siblingKwIds.length === 0) {
      return { siblings: [], pillar: pillarPost, isPillar: !!keyword.isPillar, cluster: keyword.cluster };
    }

    const allPosts = await ctx.db
      .query("posts")
      .withIndex("by_clinic", (q) => q.eq("clinicId", args.clinicId))
      .collect();

    const siblings = siblingKwIds
      .map((kid) => {
        const p = allPosts
          .filter((p) => p.keywordId === kid && p.status === "published")
          .sort((a, b) => (b.publishedAt || 0) - (a.publishedAt || 0))[0];
        const kw = clusterMates.find((c) => c._id === kid);
        return p && kw ? { slug: p.slug, term: kw.term, title: p.title } : null;
      })
      .filter((x): x is { slug: string; term: string; title: string } => x !== null)
      .slice(0, 5);

    return { siblings, pillar: pillarPost, isPillar: !!keyword.isPillar, cluster: keyword.cluster };
  },
});
