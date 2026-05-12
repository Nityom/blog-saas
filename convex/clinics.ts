import { mutation, query } from "./_generated/server";
import { v } from "convex/values";
import { encrypt } from "../lib/encryption";

export const getById = query({
  args: { clinicId: v.id("clinics") },
  handler: async (ctx, args) => {
    return await ctx.db.get(args.clinicId);
  },
});

export const getBySlug = query({
  args: { slug: v.string() },
  handler: async (ctx, args) => {
    return await ctx.db
      .query("clinics")
      .withIndex("by_slug", (q) => q.eq("slug", args.slug))
      .first();
  },
});

export const getByDomain = query({
  args: { domain: v.string() },
  handler: async (ctx, args) => {
    return await ctx.db
      .query("clinics")
      .withIndex("by_domain", (q) => q.eq("customDomain", args.domain))
      .first();
  },
});

export const getAll = query({
  handler: async (ctx) => {
    return await ctx.db.query("clinics").collect();
  },
});

export const getActive = query({
  handler: async (ctx) => {
    return await ctx.db.query("clinics").filter(q => q.eq(q.field("active"), true)).collect();
  },
});

export const create = mutation({
  args: {
    name: v.string(),
    city: v.string(),
    slug: v.string(),
    services: v.array(v.string()),
    doctorNames: v.array(v.string()),
    tone: v.union(v.literal("professional"), v.literal("warm"), v.literal("friendly")),
    targetAge: v.string(),
    bookingUrl: v.string(),
    active: v.boolean(),
    integrationMethod: v.union(v.literal("hosted"), v.literal("wordpress"), v.literal("embed")),
    wordpressUrl: v.optional(v.string()),
    wordpressAppPassword: v.optional(v.string()),
    customDomain: v.optional(v.string()),
    autoPostFacebook: v.optional(v.boolean()),
    autoPostInstagram: v.optional(v.boolean()),
    logoUrl: v.optional(v.string()),
    address: v.optional(v.string()),
    phone: v.optional(v.string()),
    whatsappNumber: v.optional(v.string()),
    mainWebsiteUrl: v.optional(v.string()),
    googleMapsUrl: v.optional(v.string()),
    googleMapsEmbedUrl: v.optional(v.string()),
    authorQualification: v.optional(v.string()),
    authorBio: v.optional(v.string()),
    authorPhotoUrl: v.optional(v.string()),
    establishedYear: v.optional(v.number()),
    uniqueSellingPoints: v.optional(v.array(v.string())),
    equipmentBrands: v.optional(v.array(v.string())),
    neighborhoodLandmarks: v.optional(v.string()),
    clinicFacts: v.optional(v.string()),
    subscriptionStartDate: v.optional(v.string()),
    monthlyRate: v.optional(v.number()),
  },
  handler: async (ctx, args) => {
    let encryptedPass: string | undefined = undefined;
    if (args.wordpressAppPassword) {
      encryptedPass = await encrypt(args.wordpressAppPassword);
    }
    
    const { wordpressAppPassword, ...rest } = args;

    const clinicId = await ctx.db.insert("clinics", {
      ...rest,
      autoPostFacebook: args.autoPostFacebook ?? false,
      autoPostInstagram: args.autoPostInstagram ?? false,
      wordpressAppPasswordEncrypted: encryptedPass,
      createdAt: Date.now(),
    });
    return clinicId;
  },
});

export const update = mutation({
  args: {
    clinicId: v.id("clinics"),
    name: v.optional(v.string()),
    city: v.optional(v.string()),
    slug: v.optional(v.string()),
    services: v.optional(v.array(v.string())),
    doctorNames: v.optional(v.array(v.string())),
    tone: v.optional(v.union(v.literal("professional"), v.literal("warm"), v.literal("friendly"))),
    targetAge: v.optional(v.string()),
    bookingUrl: v.optional(v.string()),
    active: v.optional(v.boolean()),
    integrationMethod: v.optional(v.union(v.literal("hosted"), v.literal("wordpress"), v.literal("embed"))),
    wordpressUrl: v.optional(v.string()),
    wordpressAppPassword: v.optional(v.string()),
    customDomain: v.optional(v.string()),
    metaPageId: v.optional(v.string()),
    metaPageName: v.optional(v.string()),
    metaPageAccessTokenEncrypted: v.optional(v.string()),
    metaTokenExpiresAt: v.optional(v.number()),
    metaInstagramAccountId: v.optional(v.string()),
    autoPostFacebook: v.optional(v.boolean()),
    autoPostInstagram: v.optional(v.boolean()),
    logoUrl: v.optional(v.string()),
    address: v.optional(v.string()),
    phone: v.optional(v.string()),
    whatsappNumber: v.optional(v.string()),
    mainWebsiteUrl: v.optional(v.string()),
    googleMapsUrl: v.optional(v.string()),
    googleMapsEmbedUrl: v.optional(v.string()),
    authorQualification: v.optional(v.string()),
    authorBio: v.optional(v.string()),
    authorPhotoUrl: v.optional(v.string()),
    establishedYear: v.optional(v.number()),
    uniqueSellingPoints: v.optional(v.array(v.string())),
    equipmentBrands: v.optional(v.array(v.string())),
    neighborhoodLandmarks: v.optional(v.string()),
    clinicFacts: v.optional(v.string()),
    subscriptionStartDate: v.optional(v.string()),
    monthlyRate: v.optional(v.number()),
    lastPaidCycleStart: v.optional(v.number()),
  },
  handler: async (ctx, args) => {
    const { clinicId, wordpressAppPassword, ...updates } = args;

    const toUpdate: Record<string, string | number | boolean | string[] | undefined> = {};
    for (const [key, value] of Object.entries(updates)) {
      if (value !== undefined) {
        toUpdate[key] = value;
      }
    }

    if (wordpressAppPassword !== undefined) {
      if (wordpressAppPassword) {
        toUpdate.wordpressAppPasswordEncrypted = await encrypt(wordpressAppPassword);
      }
    }

 
    
    await ctx.db.patch(clinicId, toUpdate);
  },
});

export const clearMetaConnection = mutation({
  args: { clinicId: v.id("clinics") },
  handler: async (ctx, args) => {
    const clinic = await ctx.db.get(args.clinicId);
    if (!clinic) {
      throw new Error("Clinic not found");
    }

    const {
      _id,
      _creationTime,
      metaPageId,
      metaPageName,
      metaPageAccessTokenEncrypted,
      metaTokenExpiresAt,
      metaInstagramAccountId,
      autoPostFacebook,
      autoPostInstagram,
      ...doc
    } = clinic;
    await ctx.db.replace(args.clinicId, {
      ...doc,
      autoPostFacebook: false,
      autoPostInstagram: false,
    });
  },
});

export const remove = mutation({
  args: { clinicId: v.id("clinics") },
  handler: async (ctx, args) => {
    // Ideally we should also delete related keywords, posts, etc.
    // For now we just delete the clinic
    await ctx.db.delete(args.clinicId);
  },
});

export const markPaid = mutation({
  args: { clinicId: v.id("clinics"), cycleStartTime: v.number() },
  handler: async (ctx, args) => {
    await ctx.db.patch(args.clinicId, {
      lastPaidCycleStart: args.cycleStartTime,
    });
  },
});

/**
 * Toggle a single off-page SEO checklist item (e.g. "submitted to Practo").
 * Items are stored as a record { itemId: completedAtMs }. Removing an item
 * means it's not yet done.
 */
export const toggleSeoChecklistItem = mutation({
  args: {
    clinicId: v.id("clinics"),
    itemId: v.string(),
    completed: v.boolean(),
  },
  handler: async (ctx, args) => {
    const clinic = await ctx.db.get(args.clinicId);
    if (!clinic) throw new Error("Clinic not found");

    const existing = { ...(clinic.seoChecklist ?? {}) };
    if (args.completed) {
      existing[args.itemId] = Date.now();
    } else {
      delete existing[args.itemId];
    }
    await ctx.db.patch(args.clinicId, { seoChecklist: existing });
  },
});

export const fixBrokenInternalLinks = mutation({
  args: { clinicId: v.id("clinics") },
  handler: async (ctx, args) => {
    const clinic = await ctx.db.get(args.clinicId);
    if (!clinic) throw new Error("Clinic not found");

    const posts = await ctx.db
      .query("posts")
      .withIndex("by_clinic", (q) => q.eq("clinicId", args.clinicId))
      .collect();

    let fixedCount = 0;
    for (const post of posts) {
      if (post.content.includes("CLINIC_SLUG_PLACEHOLDER")) {
        const newContent = post.content.split("CLINIC_SLUG_PLACEHOLDER").join(clinic.slug);
        await ctx.db.patch(post._id, { content: newContent });
        fixedCount++;
      }
    }
    return fixedCount;
  },
});

