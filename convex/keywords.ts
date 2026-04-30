import { mutation, query } from "./_generated/server";
import { v } from "convex/values";

export const getByClinic = query({
  args: { clinicId: v.id("clinics") },
  handler: async (ctx, args) => {
    return await ctx.db
      .query("keywords")
      .withIndex("by_clinic", (q) => q.eq("clinicId", args.clinicId))
      .collect();
  },
});

export const add = mutation({
  args: {
    clinicId: v.id("clinics"),
    term: v.string(),
    localVariant: v.string(),
    lowRisk: v.boolean(),
  },
  handler: async (ctx, args) => {
    return await ctx.db.insert("keywords", {
      ...args,
      timesUsed: 0,
      performanceScore: 0,
      paused: false,
      createdAt: Date.now(),
    });
  },
});

export const update = mutation({
  args: {
    keywordId: v.id("keywords"),
    term: v.optional(v.string()),
    localVariant: v.optional(v.string()),
    lowRisk: v.optional(v.boolean()),
    paused: v.optional(v.boolean()),
  },
  handler: async (ctx, args) => {
    const { keywordId, ...updates } = args;
    await ctx.db.patch(keywordId, updates);
  },
});

export const remove = mutation({
  args: { keywordId: v.id("keywords") },
  handler: async (ctx, args) => {
    await ctx.db.delete(args.keywordId);
  },
});

export const seedDefaultKeywords = mutation({
  args: { clinicId: v.id("clinics"), city: v.string() },
  handler: async (ctx, args) => {
    const defaultKeywords = [
      { term: "teeth whitening", lowRisk: true },
      { term: "root canal treatment", lowRisk: false },
      { term: "dental implants", lowRisk: false },
      { term: "gum disease treatment", lowRisk: false },
      { term: "cavity prevention", lowRisk: true },
      { term: "Invisalign", lowRisk: false },
      { term: "dental veneers", lowRisk: false },
      { term: "wisdom tooth removal", lowRisk: false },
      { term: "dental crowns", lowRisk: false },
      { term: "teeth sensitivity", lowRisk: false },
      { term: "children dentistry", lowRisk: true },
      { term: "dental bridges", lowRisk: false },
      { term: "tooth extraction", lowRisk: false },
      { term: "dental bonding", lowRisk: false },
      { term: "sleep dentistry", lowRisk: false },
      { term: "bad breath treatment", lowRisk: true },
      { term: "dental cleaning", lowRisk: true },
      { term: "tooth abscess", lowRisk: false },
      { term: "teeth grinding treatment", lowRisk: false },
      { term: "emergency dental care", lowRisk: false },
    ];

    for (const kw of defaultKeywords) {
      await ctx.db.insert("keywords", {
        clinicId: args.clinicId,
        term: kw.term,
        localVariant: `${kw.term} in ${args.city}`,
        timesUsed: 0,
        performanceScore: 0,
        lowRisk: kw.lowRisk,
        paused: false,
        createdAt: Date.now(),
      });
    }
  },
});
