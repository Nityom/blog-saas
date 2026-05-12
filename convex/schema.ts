import { defineSchema, defineTable } from "convex/server";
import { v } from "convex/values";

export default defineSchema({
  clinics: defineTable({
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
    wordpressAppPasswordEncrypted: v.optional(v.string()),
    customDomain: v.optional(v.string()),
    metaPageId: v.optional(v.string()),
    metaPageName: v.optional(v.string()),
    metaPageAccessTokenEncrypted: v.optional(v.string()),
    metaTokenExpiresAt: v.optional(v.number()),
    metaInstagramAccountId: v.optional(v.string()),
    autoPostFacebook: v.optional(v.boolean()),
    autoPostInstagram: v.optional(v.boolean()),
    logoUrl: v.optional(v.string()),
    // Local SEO & Contact
    address: v.optional(v.string()),
    phone: v.optional(v.string()),
    whatsappNumber: v.optional(v.string()),
    mainWebsiteUrl: v.optional(v.string()),
    googleMapsUrl: v.optional(v.string()),
    googleMapsEmbedUrl: v.optional(v.string()),
    // Author / Doctor E-E-A-T
    authorQualification: v.optional(v.string()),
    authorBio: v.optional(v.string()),
    authorPhotoUrl: v.optional(v.string()),
    // Unique-content inputs (used by AI generation to avoid template
    // duplication across clinics on the same network).
    establishedYear: v.optional(v.number()),
    uniqueSellingPoints: v.optional(v.array(v.string())), // ["in-house CBCT", "30-min implant procedure"]
    equipmentBrands: v.optional(v.array(v.string())),     // ["Straumann", "Invisalign", "Sirona"]
    neighborhoodLandmarks: v.optional(v.string()),        // free text: "Near Phoenix Mall, opp. HDFC Bank"
    clinicFacts: v.optional(v.string()),                  // free-text bullet list of distinctive facts the AI must use
    // Off-page SEO checklist progress: keys are item IDs, value is timestamp completed.
    seoChecklist: v.optional(v.record(v.string(), v.number())),
    subscriptionStartDate: v.optional(v.string()),
    monthlyRate: v.optional(v.number()),
    lastPaidCycleStart: v.optional(v.number()),
    createdAt: v.number(),
  })
    .index("by_slug", ["slug"])
    .index("by_domain", ["customDomain"]),

  keywords: defineTable({
    clinicId: v.id("clinics"),
    term: v.string(),
    localVariant: v.string(),
    lastUsed: v.optional(v.number()),
    timesUsed: v.number(),
    performanceScore: v.number(),
    lowRisk: v.boolean(),
    paused: v.boolean(),
    order: v.optional(v.number()),
    // Topic clusters: pillar keywords have isPillar=true and no pillarKeywordId.
    // Supporting keywords reference their pillar via pillarKeywordId and share `cluster`.
    cluster: v.optional(v.string()),                    // human-readable cluster tag, e.g. "Root Canal"
    pillarKeywordId: v.optional(v.id("keywords")),
    isPillar: v.optional(v.boolean()),
    // AI suggestion provenance (so operators can review where a keyword came from).
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
    createdAt: v.number(),
  })
    .index("by_clinic", ["clinicId"])
    .index("by_clinic_and_performance", ["clinicId", "performanceScore"])
    .index("by_clinic_and_cluster", ["clinicId", "cluster"])
    .index("by_pillar", ["pillarKeywordId"]),

  posts: defineTable({
    clinicId: v.id("clinics"),
    keywordId: v.id("keywords"),
    title: v.string(),
    slug: v.string(),
    excerpt: v.string(),
    content: v.string(),
    metaTitle: v.string(),
    metaDesc: v.string(),
    imageUrl: v.string(),
    imageCredit: v.string(),
    imageCreditUrl: v.string(),
    socialContent: v.optional(v.string()),
    safetyReport: v.string(), // JSON string
    status: v.union(
      v.literal("generating"),
      v.literal("draft"),
      v.literal("published"),
      v.literal("flagged")
    ),
    readingTime: v.number(),
    schemaMarkup: v.string(),
    wordpressPostId: v.optional(v.number()),
    publishedAt: v.optional(v.number()),
    updatedAt: v.optional(v.number()),   // for freshness refresh
    authorName: v.optional(v.string()),  // doctor name for E-E-A-T
    createdAt: v.number(),
  })
    .index("by_clinic", ["clinicId"])
    .index("by_clinic_and_slug", ["clinicId", "slug"])
    .index("by_clinic_and_status", ["clinicId", "status"]),

  analytics: defineTable({
    clinicId: v.id("clinics"),
    postId: v.id("posts"),
    keywordId: v.id("keywords"),
    views: v.number(),
    avgTimeOnPage: v.number(),
    recordedAt: v.number(),
  }).index("by_post", ["postId"]).index("by_clinic", ["clinicId"]).index("by_keyword", ["keywordId"]),

  generationLogs: defineTable({
    clinicId: v.id("clinics"),
    keywordUsed: v.string(),
    status: v.union(v.literal("success"), v.literal("failed"), v.literal("flagged")),
    passesCompleted: v.number(),
    errorMessage: v.optional(v.string()),
    runAt: v.number(),
  }).index("by_clinic", ["clinicId"]),

  integrationLogs: defineTable({
    clinicId: v.id("clinics"),
    postId: v.id("posts"),
    method: v.union(v.literal("wordpress"), v.literal("embed"), v.literal("hosted")),
    status: v.union(v.literal("success"), v.literal("failed")),
    response: v.optional(v.string()),
    runAt: v.number(),
  }).index("by_clinic", ["clinicId"]).index("by_post", ["postId"]),

  socialPosts: defineTable({
    clinicId: v.id("clinics"),
    postId: v.id("posts"),
    platform: v.union(v.literal("facebook"), v.literal("instagram")),
    content: v.string(),
    imageUrl: v.string(),
    platformPostId: v.optional(v.string()),
    status: v.union(v.literal("pending"), v.literal("posted"), v.literal("failed")),
    errorMessage: v.optional(v.string()),
    postedAt: v.optional(v.number()),
    createdAt: v.number(),
  })
    .index("by_clinic", ["clinicId"])
    .index("by_post", ["postId"])
    .index("by_clinic_and_platform", ["clinicId", "platform"])
    .index("by_clinic_and_status", ["clinicId", "status"]),
});
