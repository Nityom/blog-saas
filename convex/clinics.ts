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
    logoStorageId: v.optional(v.id("_storage")),
  },
  handler: async (ctx, args) => {
    const { clinicId, wordpressAppPassword, logoStorageId, ...updates } = args;

    const toUpdate: Record<string, string | number | boolean | string[] | undefined> = {};
    for (const [key, value] of Object.entries(updates)) {
      if (value !== undefined) {
        toUpdate[key] = value;
      }
    }

    if (logoStorageId) {
      const url = await ctx.storage.getUrl(logoStorageId);
      if (url) {
        toUpdate.logoUrl = url;
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
