import { mutation, query } from "./_generated/server";
import { v } from "convex/values";

export const getById = query({
  args: { keywordId: v.id("keywords") },
  handler: async (ctx, args) => {
    return await ctx.db.get(args.keywordId);
  },
});

export const getByClinic = query({
  args: { clinicId: v.id("clinics") },
  handler: async (ctx, args) => {
    return await ctx.db
      .query("keywords")
      .withIndex("by_clinic", (q) => q.eq("clinicId", args.clinicId))
      .collect();
  },
});

export const getClusters = query({
  args: { clinicId: v.id("clinics") },
  handler: async (ctx, args) => {
    const all = await ctx.db
      .query("keywords")
      .withIndex("by_clinic", (q) => q.eq("clinicId", args.clinicId))
      .collect();

    const buckets = new Map<string, { name: string; pillar: typeof all[number] | null; children: typeof all }>();
    const orphans: typeof all = [];

    for (const kw of all) {
      const tag = kw.cluster?.trim();
      if (!tag) { orphans.push(kw); continue; }
      if (!buckets.has(tag)) buckets.set(tag, { name: tag, pillar: null, children: [] });
      const b = buckets.get(tag)!;
      if (kw.isPillar) b.pillar = kw;
      else b.children.push(kw);
    }

    return {
      clusters: Array.from(buckets.values()).sort((a, b) => a.name.localeCompare(b.name)),
      orphans,
    };
  },
});

export const add = mutation({
  args: {
    clinicId: v.id("clinics"),
    term: v.string(),
    localVariant: v.string(),
    lowRisk: v.boolean(),
    cluster: v.optional(v.string()),
    pillarKeywordId: v.optional(v.id("keywords")),
    isPillar: v.optional(v.boolean()),
    source: v.optional(v.union(
      v.literal("manual"),
      v.literal("ai_longtail"),
      v.literal("gsc_almost_ranking"),
      v.literal("seed")
    )),
    intent: v.optional(v.union(
      v.literal("informational"),
      v.literal("commercial"),
      v.literal("transactional"),
      v.literal("navigational")
    )),
  },
  handler: async (ctx, args) => {
    return await ctx.db.insert("keywords", {
      ...args,
      source: args.source ?? "manual",
      timesUsed: 0,
      performanceScore: 0,
      paused: false,
      createdAt: Date.now(),
    });
  },
});

export const bulkInsert = mutation({
  args: {
    clinicId: v.id("clinics"),
    items: v.array(v.object({
      term: v.string(),
      localVariant: v.string(),
      lowRisk: v.boolean(),
      cluster: v.optional(v.string()),
      pillarTerm: v.optional(v.string()), // resolved to pillarKeywordId below
      isPillar: v.optional(v.boolean()),
      source: v.optional(v.union(
        v.literal("manual"),
        v.literal("ai_longtail"),
        v.literal("gsc_almost_ranking"),
        v.literal("seed")
      )),
      intent: v.optional(v.union(
        v.literal("informational"),
        v.literal("commercial"),
        v.literal("transactional"),
        v.literal("navigational")
      )),
    })),
  },
  handler: async (ctx, args) => {
    const existing = await ctx.db
      .query("keywords")
      .withIndex("by_clinic", (q) => q.eq("clinicId", args.clinicId))
      .collect();

    const norm = (s: string) => s.trim().toLowerCase();
    const seen = new Set(existing.map((k) => norm(k.term)));
    const byTerm = new Map(existing.map((k) => [norm(k.term), k._id] as const));

    let inserted = 0;
    let skipped = 0;
    for (const it of args.items) {
      const key = norm(it.term);
      if (seen.has(key)) { skipped++; continue; }
      const pillarKeywordId = it.pillarTerm ? byTerm.get(norm(it.pillarTerm)) : undefined;
      const id = await ctx.db.insert("keywords", {
        clinicId: args.clinicId,
        term: it.term,
        localVariant: it.localVariant,
        lowRisk: it.lowRisk,
        cluster: it.cluster,
        pillarKeywordId,
        isPillar: it.isPillar,
        source: it.source ?? "manual",
        intent: it.intent,
        timesUsed: 0,
        performanceScore: 0,
        paused: false,
        createdAt: Date.now(),
      });
      seen.add(key);
      byTerm.set(key, id);
      inserted++;
    }
    return { inserted, skipped };
  },
});

export const setCluster = mutation({
  args: {
    keywordId: v.id("keywords"),
    cluster: v.optional(v.string()),
    pillarKeywordId: v.optional(v.id("keywords")),
    isPillar: v.optional(v.boolean()),
  },
  handler: async (ctx, args) => {
    const { keywordId, ...rest } = args;
    await ctx.db.patch(keywordId, rest);
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

export const reorder = mutation({
  args: {
    updates: v.array(
      v.object({
        keywordId: v.id("keywords"),
        order: v.number(),
      })
    ),
  },
  handler: async (ctx, args) => {
    for (const update of args.updates) {
      await ctx.db.patch(update.keywordId, { order: update.order });
    }
  },
});

export const seedDefaultKeywords = mutation({
  args: { clinicId: v.id("clinics"), city: v.string() },
  handler: async (ctx, args) => {
    const now = Date.now();
    const c = args.clinicId;
    const city = args.city;

    // Helper to build a keyword record
    const kw = (
      term: string,
      lowRisk: boolean,
      cluster: string,
      isPillar: boolean,
      intent: "informational" | "commercial" | "transactional",
    ) => ({
      clinicId: c,
      term,
      localVariant: `${term} in ${city}`,
      lowRisk,
      cluster,
      isPillar,
      source: "seed" as const,
      intent,
      timesUsed: 0,
      performanceScore: 0,
      paused: false,
      createdAt: now,
    });

    // ── 0. Find already-existing terms so we don't insert duplicates ──────
    const existing = await ctx.db
      .query("keywords")
      .withIndex("by_clinic", (q) => q.eq("clinicId", c))
      .collect();
    const norm = (s: string) => s.toLowerCase().trim();
    const seen = new Set(existing.map((k) => norm(k.term)));

    // ── 1. Insert all pillar keywords first and capture their IDs ──────────
    const pillarIds: Record<string, string> = {};

    const pillars: Array<{ term: string; lowRisk: boolean; cluster: string; intent: "informational" | "commercial" | "transactional" }> = [
      { term: "root canal treatment", lowRisk: false, cluster: "Root Canal", intent: "transactional" },
      { term: "dental implants", lowRisk: false, cluster: "Dental Implants", intent: "commercial" },
      { term: "teeth whitening", lowRisk: true, cluster: "Teeth Whitening", intent: "commercial" },
      { term: "cosmetic dentistry", lowRisk: true, cluster: "Cosmetic Dentistry", intent: "commercial" },
      { term: "Invisalign treatment", lowRisk: false, cluster: "Orthodontics", intent: "commercial" },
      { term: "gum disease treatment", lowRisk: false, cluster: "Gum Disease", intent: "transactional" },
      { term: "dental crowns", lowRisk: false, cluster: "Crowns & Bridges", intent: "commercial" },
      { term: "tooth extraction", lowRisk: false, cluster: "Oral Surgery", intent: "transactional" },
      { term: "children dentistry", lowRisk: true, cluster: "Pediatric Dentistry", intent: "commercial" },
      { term: "dental checkup and cleaning", lowRisk: true, cluster: "Preventive Dentistry", intent: "transactional" },
      { term: "emergency dental care", lowRisk: false, cluster: "Dental Emergencies", intent: "transactional" },
      { term: "oral health tips", lowRisk: true, cluster: "Oral Health & Lifestyle", intent: "informational" },
      { term: "dentures", lowRisk: true, cluster: "Dentures & Prosthetics", intent: "commercial" },
    ];

    for (const p of pillars) {
      if (seen.has(norm(p.term))) {
        // Already exists — resolve its ID for supporting keyword linking
        const existing = await ctx.db
          .query("keywords")
          .withIndex("by_clinic", (q) => q.eq("clinicId", c))
          .collect();
        const match = existing.find((k) => norm(k.term) === norm(p.term));
        if (match) pillarIds[p.cluster] = match._id;
        continue;
      }
      const id = await ctx.db.insert("keywords", {
        ...kw(p.term, p.lowRisk, p.cluster, true, p.intent),
      });
      seen.add(norm(p.term));
      pillarIds[p.cluster] = id;
    }

    // ── 2. Insert supporting keywords referencing their pillar ─────────────
    type SupportingKw = {
      term: string;
      lowRisk: boolean;
      cluster: string;
      intent: "informational" | "commercial" | "transactional";
    };

    const supporting: SupportingKw[] = [
      // Root Canal
      { term: "is root canal treatment painful", lowRisk: false, cluster: "Root Canal", intent: "informational" },
      { term: "root canal vs tooth extraction", lowRisk: false, cluster: "Root Canal", intent: "informational" },
      { term: "signs you need a root canal", lowRisk: false, cluster: "Root Canal", intent: "informational" },
      { term: "root canal treatment cost", lowRisk: true, cluster: "Root Canal", intent: "commercial" },
      { term: "root canal recovery tips", lowRisk: true, cluster: "Root Canal", intent: "informational" },

      // Dental Implants
      { term: "dental implants cost", lowRisk: true, cluster: "Dental Implants", intent: "commercial" },
      { term: "dental implants vs dentures", lowRisk: false, cluster: "Dental Implants", intent: "informational" },
      { term: "all-on-4 dental implants", lowRisk: false, cluster: "Dental Implants", intent: "commercial" },
      { term: "mini dental implants", lowRisk: false, cluster: "Dental Implants", intent: "commercial" },
      { term: "dental implant procedure steps", lowRisk: false, cluster: "Dental Implants", intent: "informational" },

      // Teeth Whitening
      { term: "laser teeth whitening", lowRisk: true, cluster: "Teeth Whitening", intent: "commercial" },
      { term: "teeth whitening cost", lowRisk: true, cluster: "Teeth Whitening", intent: "commercial" },
      { term: "teeth whitening at home tips", lowRisk: true, cluster: "Teeth Whitening", intent: "informational" },
      { term: "zoom teeth whitening", lowRisk: true, cluster: "Teeth Whitening", intent: "commercial" },

      // Cosmetic Dentistry
      { term: "dental veneers", lowRisk: false, cluster: "Cosmetic Dentistry", intent: "commercial" },
      { term: "smile makeover", lowRisk: true, cluster: "Cosmetic Dentistry", intent: "commercial" },
      { term: "dental bonding", lowRisk: false, cluster: "Cosmetic Dentistry", intent: "commercial" },
      { term: "composite veneers vs porcelain veneers", lowRisk: true, cluster: "Cosmetic Dentistry", intent: "informational" },
      { term: "teeth reshaping and contouring", lowRisk: true, cluster: "Cosmetic Dentistry", intent: "commercial" },

      // Orthodontics
      { term: "Invisalign vs braces", lowRisk: false, cluster: "Orthodontics", intent: "informational" },
      { term: "Invisalign cost", lowRisk: false, cluster: "Orthodontics", intent: "commercial" },
      { term: "clear aligners for adults", lowRisk: false, cluster: "Orthodontics", intent: "commercial" },
      { term: "retainers after braces", lowRisk: true, cluster: "Orthodontics", intent: "informational" },
      { term: "teeth straightening options", lowRisk: false, cluster: "Orthodontics", intent: "informational" },

      // Gum Disease
      { term: "bleeding gums causes and treatment", lowRisk: true, cluster: "Gum Disease", intent: "informational" },
      { term: "gingivitis treatment at home", lowRisk: false, cluster: "Gum Disease", intent: "informational" },
      { term: "deep cleaning scaling and root planing", lowRisk: false, cluster: "Gum Disease", intent: "commercial" },
      { term: "gum recession treatment", lowRisk: false, cluster: "Gum Disease", intent: "commercial" },
      { term: "periodontitis stages and treatment", lowRisk: false, cluster: "Gum Disease", intent: "informational" },

      // Crowns & Bridges
      { term: "zirconia dental crowns", lowRisk: false, cluster: "Crowns & Bridges", intent: "commercial" },
      { term: "dental crown procedure", lowRisk: false, cluster: "Crowns & Bridges", intent: "informational" },
      { term: "dental bridges", lowRisk: false, cluster: "Crowns & Bridges", intent: "commercial" },
      { term: "dental crown cost", lowRisk: true, cluster: "Crowns & Bridges", intent: "commercial" },
      { term: "temporary vs permanent dental crown", lowRisk: true, cluster: "Crowns & Bridges", intent: "informational" },

      // Oral Surgery
      { term: "wisdom tooth removal", lowRisk: false, cluster: "Oral Surgery", intent: "transactional" },
      { term: "wisdom tooth pain relief", lowRisk: false, cluster: "Oral Surgery", intent: "informational" },
      { term: "tooth extraction recovery tips", lowRisk: true, cluster: "Oral Surgery", intent: "informational" },
      { term: "dry socket after tooth extraction", lowRisk: false, cluster: "Oral Surgery", intent: "informational" },
      { term: "bone grafting for dental implants", lowRisk: false, cluster: "Oral Surgery", intent: "commercial" },

      // Pediatric Dentistry
      { term: "baby teeth care tips", lowRisk: true, cluster: "Pediatric Dentistry", intent: "informational" },
      { term: "first dental visit for child", lowRisk: true, cluster: "Pediatric Dentistry", intent: "informational" },
      { term: "dental problems in children", lowRisk: false, cluster: "Pediatric Dentistry", intent: "informational" },
      { term: "pit and fissure sealants for children", lowRisk: true, cluster: "Pediatric Dentistry", intent: "commercial" },
      { term: "braces for children", lowRisk: false, cluster: "Pediatric Dentistry", intent: "commercial" },

      // Preventive Dentistry
      { term: "dental scaling and polishing", lowRisk: true, cluster: "Preventive Dentistry", intent: "commercial" },
      { term: "fluoride treatment for adults", lowRisk: true, cluster: "Preventive Dentistry", intent: "commercial" },
      { term: "cavity prevention tips", lowRisk: true, cluster: "Preventive Dentistry", intent: "informational" },
      { term: "how often should you visit the dentist", lowRisk: true, cluster: "Preventive Dentistry", intent: "informational" },
      { term: "dental X-rays safety and importance", lowRisk: true, cluster: "Preventive Dentistry", intent: "informational" },

      // Dental Emergencies
      { term: "toothache causes and relief", lowRisk: false, cluster: "Dental Emergencies", intent: "informational" },
      { term: "chipped or cracked tooth repair", lowRisk: false, cluster: "Dental Emergencies", intent: "transactional" },
      { term: "dental abscess symptoms and treatment", lowRisk: false, cluster: "Dental Emergencies", intent: "informational" },
      { term: "knocked out tooth first aid", lowRisk: false, cluster: "Dental Emergencies", intent: "informational" },
      { term: "lost dental crown what to do", lowRisk: false, cluster: "Dental Emergencies", intent: "informational" },

      // Oral Health & Lifestyle
      { term: "bad breath causes and treatment", lowRisk: true, cluster: "Oral Health & Lifestyle", intent: "informational" },
      { term: "teeth grinding treatment", lowRisk: false, cluster: "Oral Health & Lifestyle", intent: "transactional" },
      { term: "teeth sensitivity treatment", lowRisk: false, cluster: "Oral Health & Lifestyle", intent: "transactional" },
      { term: "dental care during pregnancy", lowRisk: true, cluster: "Oral Health & Lifestyle", intent: "informational" },
      { term: "foods that damage teeth", lowRisk: true, cluster: "Oral Health & Lifestyle", intent: "informational" },
      { term: "diabetes and dental health", lowRisk: true, cluster: "Oral Health & Lifestyle", intent: "informational" },
      { term: "dry mouth causes and remedies", lowRisk: true, cluster: "Oral Health & Lifestyle", intent: "informational" },

      // Dentures & Prosthetics
      { term: "full mouth dentures cost", lowRisk: true, cluster: "Dentures & Prosthetics", intent: "commercial" },
      { term: "partial dentures", lowRisk: true, cluster: "Dentures & Prosthetics", intent: "commercial" },
      { term: "flexible dentures", lowRisk: true, cluster: "Dentures & Prosthetics", intent: "commercial" },
      { term: "denture care tips", lowRisk: true, cluster: "Dentures & Prosthetics", intent: "informational" },
      { term: "dental implant supported dentures", lowRisk: false, cluster: "Dentures & Prosthetics", intent: "commercial" },
    ];

    for (const s of supporting) {
      if (seen.has(norm(s.term))) continue;
      await ctx.db.insert("keywords", {
        ...kw(s.term, s.lowRisk, s.cluster, false, s.intent),
        pillarKeywordId: pillarIds[s.cluster] as any,
      });
      seen.add(norm(s.term));
    }
  },
});

export const insertRefinedKeywords = mutation({
  args: { clinicId: v.id("clinics") },
  handler: async (ctx, args) => {
    const clinic = await ctx.db.get(args.clinicId);
    if (!clinic) throw new Error("Clinic not found");

    // Advanced / long-tail topics beyond the seed set — added in a second pass
    // after the clinic's first batch of posts is live.
    const advanced: Array<{ term: string; lowRisk: boolean; cluster: string; intent: "informational" | "commercial" | "transactional" }> = [
      // Sleep dentistry & anxiety
      { term: "dental anxiety treatment", lowRisk: false, cluster: "Sedation Dentistry", intent: "informational" },
      { term: "sedation dentistry options", lowRisk: false, cluster: "Sedation Dentistry", intent: "commercial" },
      { term: "nitrous oxide sedation for dentistry", lowRisk: false, cluster: "Sedation Dentistry", intent: "informational" },

      // TMJ & Jaw
      { term: "TMJ disorder symptoms and treatment", lowRisk: false, cluster: "TMJ & Jaw", intent: "informational" },
      { term: "jaw pain causes and relief", lowRisk: true, cluster: "TMJ & Jaw", intent: "informational" },
      { term: "night guard for teeth grinding", lowRisk: true, cluster: "TMJ & Jaw", intent: "commercial" },

      // Smile design & aesthetics
      { term: "digital smile design", lowRisk: true, cluster: "Cosmetic Dentistry", intent: "commercial" },
      { term: "gummy smile treatment", lowRisk: false, cluster: "Cosmetic Dentistry", intent: "commercial" },
      { term: "tooth gap closure options", lowRisk: true, cluster: "Cosmetic Dentistry", intent: "commercial" },

      // Endodontics advanced
      { term: "re-root canal treatment", lowRisk: false, cluster: "Root Canal", intent: "informational" },
      { term: "root canal vs dental implant which is better", lowRisk: false, cluster: "Root Canal", intent: "informational" },

      // Implant advanced
      { term: "same day dental implants", lowRisk: false, cluster: "Dental Implants", intent: "commercial" },
      { term: "full mouth rehabilitation cost", lowRisk: false, cluster: "Dental Implants", intent: "commercial" },
      { term: "implant failure signs", lowRisk: false, cluster: "Dental Implants", intent: "informational" },

      // Seniors & special populations
      { term: "dental care for seniors", lowRisk: true, cluster: "Oral Health & Lifestyle", intent: "informational" },
      { term: "dental care for diabetic patients", lowRisk: true, cluster: "Oral Health & Lifestyle", intent: "informational" },
      { term: "dental care after chemotherapy", lowRisk: false, cluster: "Oral Health & Lifestyle", intent: "informational" },

      // Preventive advanced
      { term: "laser dentistry benefits", lowRisk: true, cluster: "Preventive Dentistry", intent: "informational" },
      { term: "digital X-rays vs traditional", lowRisk: true, cluster: "Preventive Dentistry", intent: "informational" },
      { term: "oil pulling dental health benefits", lowRisk: true, cluster: "Preventive Dentistry", intent: "informational" },

      // General patient education
      { term: "how to choose a good dentist", lowRisk: true, cluster: "Oral Health & Lifestyle", intent: "informational" },
      { term: "dental insurance in India guide", lowRisk: true, cluster: "Oral Health & Lifestyle", intent: "informational" },
      { term: "why are regular dental checkups important", lowRisk: true, cluster: "Preventive Dentistry", intent: "informational" },
      { term: "electric toothbrush vs manual", lowRisk: true, cluster: "Oral Health & Lifestyle", intent: "informational" },
      { term: "best foods for healthy teeth and gums", lowRisk: true, cluster: "Oral Health & Lifestyle", intent: "informational" },
    ];

    const now = Date.now();
    let inserted = 0;

    // Resolve existing pillar IDs for cluster linking
    const existingKeywords = await ctx.db
      .query("keywords")
      .withIndex("by_clinic", (q) => q.eq("clinicId", args.clinicId))
      .collect();
    const pillarByCluster = new Map<string, string>();
    for (const k of existingKeywords) {
      if (k.isPillar && k.cluster) pillarByCluster.set(k.cluster, k._id);
    }

    for (const item of advanced) {
      await ctx.db.insert("keywords", {
        clinicId: args.clinicId,
        term: item.term,
        localVariant: `${item.term} in ${clinic.city}`,
        lowRisk: item.lowRisk,
        cluster: item.cluster,
        isPillar: false,
        source: "seed",
        intent: item.intent as any,
        pillarKeywordId: pillarByCluster.get(item.cluster) as any,
        timesUsed: 0,
        performanceScore: 0,
        paused: false,
        createdAt: now,
      });
      inserted++;
    }
    return inserted;
  },
});
