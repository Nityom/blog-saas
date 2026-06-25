import { action, internalAction, internalMutation, internalQuery, query } from "./_generated/server";
import { v } from "convex/values";
import { generateText } from "../lib/ai";
import { parseJsonFromText } from "../lib/json";
import { fetchPexelsImage } from "../lib/pexels";
import { generateSlug, generateSchemaMarkup, addInternalLinks, toHashtag } from "../lib/seo";
import { selectNextKeyword } from "../lib/keywords";
import { markdownToHtml, getWordCount, truncateToSentence } from "../lib/markdown";
import { pingIndexNow, buildPostUrls } from "../lib/indexing";
import { pickRotation, buildClinicFactsBlock } from "../lib/contentVariation";
import { internal, api } from "./_generated/api";
import { Doc, Id } from "./_generated/dataModel";

// Helper mutation to prepare post and update keyword
export const prepareGeneration = internalMutation({
  args: { clinicId: v.id("clinics") },
  handler: async (ctx, args) => {
    // 1. Query keywords
    const keywords = await ctx.db
      .query("keywords")
      .withIndex("by_clinic", (q) => q.eq("clinicId", args.clinicId))
      .collect();

    // 2. Select next keyword
    const keyword = selectNextKeyword(keywords as any);
    if (!keyword) {
      return null;
    }

    // 3. Count existing posts so the prompt can deterministically rotate
    //    outline templates and content angles. This is the key lever that
    //    breaks template duplication across clinics writing on the same
    //    keywords.
    const existingPosts = await ctx.db
      .query("posts")
      .withIndex("by_clinic", (q) => q.eq("clinicId", args.clinicId))
      .collect();
    const postIndex = existingPosts.length;

    // 4. Create post record
    const postId = await ctx.db.insert("posts", {
      clinicId: args.clinicId,
      keywordId: keyword._id as any,
      title: "Generating...",
      slug: `generating-${Date.now()}`,
      excerpt: "",
      content: "",
      metaTitle: "",
      metaDesc: "",
      imageUrl: "",
      imageCredit: "",
      imageCreditUrl: "",
      safetyReport: "{}",
      status: "generating",
      readingTime: 0,
      schemaMarkup: "",
      createdAt: Date.now(),
    });

    return { postId, keyword, postIndex };
  },
});

export const finalizeGeneration = internalMutation({
  args: {
    clinicId: v.id("clinics"),
    postId: v.id("posts"),
    keywordId: v.id("keywords"),
    postData: v.any(),
    status: v.union(v.literal("draft"), v.literal("published"), v.literal("flagged")),
    logData: v.any(),
    isRefresh: v.optional(v.boolean()),
  },
  handler: async (ctx, args) => {
    // 1. Get existing post slugs for this clinic to handle collisions
    const existingPosts = await ctx.db
      .query("posts")
      .withIndex("by_clinic", (q) => q.eq("clinicId", args.clinicId))
      .collect();
    const existingSlugs = existingPosts.filter(p => p._id !== args.postId).map((p) => p.slug);

    // 2. Generate unique slug
    const finalSlug = generateSlug(args.postData.title, existingSlugs);

    // 3. Get clinic data for schema
    const clinic = await ctx.db.get(args.clinicId);
    if (!clinic) throw new Error("Clinic not found");

    const keyword = await ctx.db.get(args.keywordId);
    if (!keyword) throw new Error("Keyword not found");

    const now = Date.now();

    // 4. Generate schema markup (now includes FAQPage if FAQs detected + author + E-A-T)
    const schemaMarkup = generateSchemaMarkup(
      {
        title: args.postData.title,
        imageUrl: args.postData.imageUrl,
        slug: finalSlug,
        keywordTerm: keyword.term,
        authorName: args.postData.authorName,
        excerpt: args.postData.excerpt,
        publishedAt: args.isRefresh ? undefined : now,
        updatedAt: args.isRefresh ? now : undefined,
        content: args.postData.content,
        authorPhotoUrl: clinic.authorPhotoUrl,
        authorQualification: clinic.authorQualification,
      },
      { name: clinic.name, city: clinic.city },
      args.postData.content  // pass raw markdown for FAQ extraction
    );

    // 5. Add internal links (now includes clinic slug for proper URLs)
    const relatedPostsData = existingPosts
      .filter(p => p.status === "published" && p._id !== args.postId)
      .sort((a, b) => (b.publishedAt || 0) - (a.publishedAt || 0))
      .slice(0, 10);

    const relatedLinks = await Promise.all(relatedPostsData.map(async p => {
      const kw = await ctx.db.get(p.keywordId);
      return { slug: p.slug, keyword: kw?.term || "" };
    }));

    const linkedContent = addInternalLinks(args.postData.content, relatedLinks, clinic.slug);

    // 6. Update post record
    const updateData: any = {
      title: args.postData.title,
      slug: finalSlug,
      excerpt: args.postData.excerpt,
      content: linkedContent,
      metaTitle: args.postData.metaTitle,
      metaDesc: args.postData.metaDesc,
      imageUrl: args.postData.imageUrl,
      imageCredit: args.postData.imageCredit,
      imageCreditUrl: args.postData.imageCreditUrl,
      socialContent: args.postData.socialContent,
      safetyReport: args.postData.safetyReport,
      status: args.status,
      readingTime: args.postData.readingTime,
      schemaMarkup: schemaMarkup,
      authorName: args.postData.authorName,
    };

    if (args.isRefresh) {
      updateData.updatedAt = now;
    } else if (args.status === "published") {
      updateData.publishedAt = now;
      updateData.updatedAt = now;
    }

    await ctx.db.patch(args.postId, updateData);

    // 7. Update keyword
    await ctx.db.patch(args.keywordId, {
      lastUsed: now,
      timesUsed: keyword.timesUsed + 1,
    });

    // 8. Log generation
    await ctx.db.insert("generationLogs", {
      clinicId: args.clinicId,
      keywordUsed: keyword.term,
      status: args.logData.status,
      passesCompleted: args.logData.passesCompleted,
      errorMessage: args.logData.errorMessage,
      runAt: now,
    });
  },
});

export const logFailure = internalMutation({
  args: { clinicId: v.id("clinics"), keywordUsed: v.string(), errorMessage: v.string(), postId: v.optional(v.id("posts")) },
  handler: async (ctx, args) => {
    if (args.postId) {
      await ctx.db.delete(args.postId);
    }
    await ctx.db.insert("generationLogs", {
      clinicId: args.clinicId,
      keywordUsed: args.keywordUsed,
      status: "failed",
      passesCompleted: 0,
      errorMessage: args.errorMessage,
      runAt: Date.now(),
    });
  }
});

export const generatePost = action({
  args: { clinicId: v.id("clinics") },
  handler: async (ctx, args) => {
    const clinic = await ctx.runQuery(internal.generationHelpers.getClinic, { clinicId: args.clinicId });
    if (!clinic) return;

    const prepResult = await ctx.runMutation(internal.generation.prepareGeneration, { clinicId: args.clinicId });
    if (!prepResult) {
      console.warn("No available keyword for clinic:", clinic.name);
      return;
    }
    const { postId, keyword, postIndex } = prepResult;

    try {
      // PASS 1 — DRAFT
      const systemPrompt1 = `You are an SEO dental content writer for patient-friendly blog posts. Return ONLY markdown. No explanation, no preamble, no backticks.`;
      
      // Use first doctor name for author attribution
      const rawDoctorName = clinic.doctorNames[0] || clinic.name;
      const authorName = rawDoctorName.toLowerCase().startsWith("dr.") 
        ? rawDoctorName 
        : `Dr. ${rawDoctorName}`;

      // Deterministic rotation: same (clinic, postIndex) always produces the
      // same outline + angle so retries stay stable, but successive posts and
      // sibling clinics get DIFFERENT structures — this is what defeats the
      // "every clinic publishes the same article" duplication problem.
      const rotation = pickRotation(`${clinic.slug}::${keyword.term}`, postIndex);
      const renderedOutline = rotation.outline.outline
        .replace(/\{city\}/g, clinic.city)
        .replace(/\{clinic\}/g, clinic.name)
        .replace(/\{keyword\}/g, keyword.localVariant || keyword.term);
      const factsBlock = buildClinicFactsBlock(clinic);

      // Cluster-aware internal linking: if this keyword sits in a topic
      // cluster, surface the pillar + sibling posts so the AI can link them
      // naturally inside the article body. This is how topical authority
      // compounds across a site.
      const clusterCtx = await ctx.runQuery(internal.generationHelpers.getClusterContext, {
        clinicId: args.clinicId,
        keywordId: keyword._id as Id<"keywords">,
      });
      const linkBase = clinic.customDomain
        ? `https://${clinic.customDomain}`
        : `${process.env.NEXT_PUBLIC_APP_URL || ""}/blog/${clinic.slug}`;
      const clusterBlock = clusterCtx.cluster
        ? `--- TOPIC CLUSTER: "${clusterCtx.cluster}" ---
${clusterCtx.isPillar ? `This article is the PILLAR for the "${clusterCtx.cluster}" cluster. It must be the most comprehensive piece on this topic and link OUT to supporting articles below.` : `This is a SUPPORTING article in the "${clusterCtx.cluster}" cluster. It MUST link back to the pillar article naturally.`}
${clusterCtx.pillar ? `\nPILLAR ARTICLE (link to this with anchor text close to "${clusterCtx.pillar.term}"):\n- ${clusterCtx.pillar.title} → ${linkBase}/${clusterCtx.pillar.slug}` : ""}
${clusterCtx.siblings.length > 0 ? `\nSIBLING ARTICLES (link to 1-3 of these inline where contextually relevant; use natural anchor text, NOT the URL):
${clusterCtx.siblings.map((s) => `- "${s.title}" → ${linkBase}/${s.slug}`).join("\n")}` : ""}

When you reference these, use markdown links like [natural anchor text](url). Do NOT add a generic "related posts" section — weave them into paragraphs.
`
        : "";

      const userPrompt1 = `Write a complete, in-depth SEO-optimized blog post.

Keyword: ${keyword.localVariant || keyword.term}
Clinic: ${clinic.name}
City: ${clinic.city}
Address: ${clinic.address || "N/A"}
Tone: ${clinic.tone}
Author / Doctor: ${authorName}
Author Qualification: ${clinic.authorQualification || "N/A"}
Author Bio: ${clinic.authorBio || "N/A"}
Doctor(s): ${clinic.doctorNames.join(", ")}
Target patients: aged ${clinic.targetAge}
Services: ${clinic.services.join(", ")}
Booking URL: ${clinic.bookingUrl}

--- CONTENT ANGLE (mandatory) ---
${rotation.angle.instruction}

--- REQUIRED H2 OUTLINE (use these exact section headings, in order, adapted naturally to the topic) ---
${renderedOutline}

${factsBlock ? `--- UNIQUE CLINIC FACTS — you MUST naturally weave these into the article so it doesn't read like generic copy ---
${factsBlock}
` : ""}
${clusterBlock}
At the very top include these HTML comments EXACTLY:
<!-- metaTitle: your meta title here (max 60 chars, must include the primary keyword) -->
<!-- metaDesc: your meta description here (max 155 chars, includes keyword + a CTA verb) -->
<!-- excerpt: one to two sentence post summary -->

Then write the post following these rules:
- MUST use strict Markdown formatting.
- **CRITICAL**: Leave a blank empty line between EVERY paragraph, heading, and list.
- Use \`#\` for the main H1 title (include city and clinic name naturally).
- Use \`##\` for the H2 sections from the outline above.
- Use bullet points (\`-\` or \`*\`) to break up text and present lists.
- Use **bold** for key terms and *italics* for important points.
- **Write 1,200 to 1,500 words total** — this is critical for ranking.
- Simple language, no unexplained medical jargon.
- Include real, helpful, specific information a patient would actually want (costs in INR for India where relevant, procedure steps, recovery, what to ask your dentist).
- FAQ block under the final H2 with 3 to 4 patient questions using \`###\` for each question heading.
- Author credit line at the bottom: "*Written by ${authorName}, ${clinic.authorQualification || 'Dentist'} at ${clinic.name}, ${clinic.city}.*"
- Final CTA paragraph mentioning ${clinic.name} with a link to ${clinic.bookingUrl}. Mention the location (${clinic.address || clinic.city}) naturally.
- Naturally use the keyword and local city name (${clinic.city}) throughout, but never keyword-stuff (max ~1.5% density).
- Do NOT invent patient testimonials, fake statistics, medical guarantees, or specific success rates.`;

      const draftOutput = await generateText(systemPrompt1, userPrompt1, 2200, 2, "anthropic/claude-haiku-4-5");

      // Parse output
      const metaTitleMatch = draftOutput.match(/<!-- metaTitle:\s*(.*?)\s*-->/i);
      const metaDescMatch = draftOutput.match(/<!-- metaDesc:\s*(.*?)\s*-->/i);
      const excerptMatch = draftOutput.match(/<!-- excerpt:\s*(.*?)\s*-->/i);
      
      let content = draftOutput.replace(/<!--[\s\S]*?-->/g, "").trim();
      const h1Match = content.match(/^#\s+(.*)/m);
      const title = h1Match ? h1Match[1] : `${keyword.localVariant || keyword.term} at ${clinic.name}`;

      // Use the AI-generated SEO title when present — it's tuned to ≤60 chars
      // for SERP display. Fall back to the (often longer) H1 only if missing.
      const metaTitle = metaTitleMatch?.[1]?.trim() || title;
      const metaDesc = metaDescMatch ? metaDescMatch[1] : `Learn about ${keyword.term} at ${clinic.name} in ${clinic.city}.`;
      const excerpt = excerptMatch ? excerptMatch[1] : truncateToSentence(content, 160);
      const readingTime = Math.ceil(getWordCount(content) / 200);
      let socialContentJson = "{}";

      let passesCompleted = 1;
      let finalStatus: "published" | "flagged" = "published";
      let safetyReportJson = "{}";

        // Parallel tasks: Pexels, Pass 2, and Pass 3 social content.
        const usedImageUrls = await ctx.runQuery(internal.generationHelpers.getUsedImageUrls, { clinicId: args.clinicId });
        const tasks: Promise<any>[] = [fetchPexelsImage(keyword.term, usedImageUrls)];
      
      if (!keyword.lowRisk) {
        tasks.push((async () => {
          const systemPrompt2 = `You are a medical content compliance reviewer. Return ONLY valid JSON. No markdown. No explanation.`;
          const userPrompt2 = `Review this dental blog post for patient safety.
Post: ${content}

Return JSON:
{
  "safe": boolean,
  "riskLevel": "low" | "medium" | "high",
  "flags": ["string"],
  "suggestedEdits": ["string"]
}

Flag if post: makes unverified medical claims, promises specific results, could cause patients to delay professional care, or carries legal risk.`;
          
          try {
            const safetyRes = await generateText(systemPrompt2, userPrompt2, 300);
            return parseJsonFromText(safetyRes);
          } catch (e) {
            console.error("Safety check failed", e);
            return { safe: false, riskLevel: "high", flags: ["Safety check failed to parse"], suggestedEdits: [] };
          }
        })());
      }

      tasks.push((async () => {
        const systemPrompt3 = "You are a dental clinic social media manager. Return ONLY valid JSON. No markdown. No explanation.";
        const userPrompt3 = `Based on this blog post create social media content.

Blog title: ${title}
Blog excerpt: ${excerpt}
Clinic name: ${clinic.name}
City: ${clinic.city}
Booking URL: ${clinic.bookingUrl}
Tone: ${clinic.tone}

Return JSON exactly:
{
  "facebook": {
    "postText": string,
    "hashtags": string[]
  },
  "instagram": {
    "storyText": string,
    "caption": string,
    "hashtags": string[]
  }
}

Rules:
- facebook.postText: 150-200 words, engaging, end with booking URL
- facebook.hashtags: 3-5 relevant dental hashtags
- instagram.storyText: max 80 chars, bold hook line
- instagram.caption: max 150 chars with booking URL
- instagram.hashtags: 8-10 dental + local hashtags including ${toHashtag(clinic.city + ' dentist')} #DentalCare ${toHashtag(keyword.term)}
- IMPORTANT: All hashtags must be PascalCase (e.g. #DentalImplantsPune not #dentalimplantspune)`;

        const fallback = {
          facebook: {
            postText: `${title}\n\n${excerpt}\n\nBook here: ${clinic.bookingUrl}`,
            hashtags: ["#DentalCare", "#HealthySmile", "#Dentist"],
          },
          instagram: {
            storyText: `Did you see this dental tip? 🦷`,
            caption: `${title} - book now ${clinic.bookingUrl}`,
            hashtags: ["#DentalCare", `#${clinic.city}Dentist`, "#HealthySmile"],
          },
        };

        try {
          const socialRes = await generateText(systemPrompt3, userPrompt3, 400, 2, "anthropic/claude-haiku-4-5");
          return parseJsonFromText(socialRes);
        } catch (e) {
          console.error("Social content generation failed", e);
          return fallback;
        }
      })());

      const results = await Promise.allSettled(tasks);
      
      const imageResult = results[0].status === "fulfilled" ? results[0].value : null;
      const pexelsImage = imageResult || { imageUrl: "/dental-placeholder.jpg", imageCredit: "Unsplash", imageCreditUrl: "https://unsplash.com" };

      if (!keyword.lowRisk && results.length > 1) {
        passesCompleted = 2;
        const safetyResult = results[1].status === "fulfilled" ? results[1].value : null;
        if (safetyResult) {
          safetyReportJson = JSON.stringify(safetyResult);
          if (!safetyResult.safe || safetyResult.riskLevel === "high") {
            finalStatus = "flagged";
          }
        }
      }

      const socialSettled = results[results.length - 1];
      if (socialSettled.status === "fulfilled") {
        socialContentJson = JSON.stringify(socialSettled.value);
      }

      // Finalize
      await ctx.runMutation(internal.generation.finalizeGeneration, {
        clinicId: args.clinicId,
        postId: postId as any,
        keywordId: keyword._id as any,
        postData: {
          title,
          excerpt,
          content,
          metaTitle,
          metaDesc,
          readingTime,
          imageUrl: pexelsImage.imageUrl,
          imageCredit: pexelsImage.imageCredit,
          imageCreditUrl: pexelsImage.imageCreditUrl,
          safetyReport: safetyReportJson,
          socialContent: socialContentJson,
          authorName,
        },
        status: finalStatus,
        logData: {
          status: finalStatus === "flagged" ? "flagged" : "success",
          passesCompleted,
        }
      });

      // Best-effort: tell IndexNow (Bing/Yandex/etc.) the new URL exists so it
      // gets crawled in minutes instead of days. Google relies on the sitemap
      // + Search Console for fast indexing.
      if (finalStatus === "published") {
        const persisted = await ctx.runQuery(internal.generation.getPostById, { postId });
        if (persisted) {
          const urls = buildPostUrls({
            customDomain: clinic.customDomain,
            clinicSlug: clinic.slug,
            postSlug: persisted.slug,
          });
          await pingIndexNow(urls);
        }
      }

    } catch (error: any) {
      console.error(error);
      await ctx.runMutation(internal.generation.logFailure, {
        clinicId: args.clinicId,
        keywordUsed: keyword.term,
        errorMessage: error.message || "Unknown error",
        postId,
      });
      throw error;
    }
  },
});

export const runAll = internalAction({
  handler: async (ctx) => {
    // 1. Query all clinics where active=true
    const activeClinics: Doc<"clinics">[] = await ctx.runQuery(api.clinics.getActive);
    
    // 2. Run full generation flow for each clinic in parallel
    const promises = activeClinics.map((clinic: Doc<"clinics">) => 
      ctx.runAction(api.generation.generatePost, { clinicId: clinic._id })
    );

    const results: PromiseSettledResult<unknown>[] = await Promise.allSettled(promises);

    // 3 & 4. Log warnings and errors
    results.forEach((result: PromiseSettledResult<unknown>, index: number) => {
      const clinic = activeClinics[index];
      if (result.status === "rejected") {
        console.error(`Generation failed for clinic ${clinic.name}:`, result.reason);
      }
    });
  }
});

export const prepareCustomGeneration = internalMutation({
  args: { clinicId: v.id("clinics"), prompt: v.string() },
  handler: async (ctx, args): Promise<{ postId: Id<"posts">; keyword: Doc<"keywords"> }> => {
    let keyword = await ctx.db
      .query("keywords")
      .withIndex("by_clinic", (q) => q.eq("clinicId", args.clinicId))
      .filter((q) => q.eq(q.field("term"), "Custom Topic"))
      .first();

    if (!keyword) {
      const keywordId = await ctx.db.insert("keywords", {
        clinicId: args.clinicId,
        term: "Custom Topic",
        localVariant: "Custom Topic",
        timesUsed: 0,
        performanceScore: 0,
        lowRisk: true,
        paused: false,
        createdAt: Date.now(),
      });
      keyword = await ctx.db.get(keywordId);
    }

    const postId = await ctx.db.insert("posts", {
      clinicId: args.clinicId,
      keywordId: keyword!._id,
      title: "Generating Custom Post...",
      slug: `custom-${Date.now()}`,
      excerpt: "",
      content: "",
      metaTitle: "",
      metaDesc: "",
      imageUrl: "",
      imageCredit: "",
      imageCreditUrl: "",
      safetyReport: "{}",
      status: "generating",
      readingTime: 0,
      schemaMarkup: "",
      createdAt: Date.now(),
    });

    return { postId, keyword: keyword! };
  },
});

export const generateCustomPost = action({
  args: { clinicId: v.id("clinics"), prompt: v.string() },
  handler: async (ctx, args): Promise<Id<"posts"> | null> => {
    const clinic = await ctx.runQuery(internal.generationHelpers.getClinic, { clinicId: args.clinicId });
    if (!clinic) return null;

    const prepResult = await ctx.runMutation(internal.generation.prepareCustomGeneration, { clinicId: args.clinicId, prompt: args.prompt });
    if (!prepResult) return null;
    const { postId, keyword } = prepResult;

    try {
      const systemPrompt1 = `You are an SEO dental content writer. Return ONLY markdown. No explanation.`;
      const userPrompt1 = `Write a complete SEO-optimized blog post based on this prompt:
Prompt: ${args.prompt}

Clinic: ${clinic.name}
Tone: ${clinic.tone}

Include HTML comments at the top:
<!-- metaTitle: ... -->
<!-- metaDesc: ... -->
<!-- excerpt: ... -->

Use strict Markdown, blank lines between elements.`;

      const draftOutput = await generateText(systemPrompt1, userPrompt1, 900);

      const metaTitleMatch = draftOutput.match(/<!-- metaTitle:\s*(.*?)\s*-->/i);
      const metaDescMatch = draftOutput.match(/<!-- metaDesc:\s*(.*?)\s*-->/i);
      const excerptMatch = draftOutput.match(/<!-- excerpt:\s*(.*?)\s*-->/i);
      
      let content = draftOutput.replace(/<!--[\s\S]*?-->/g, "").trim();
      const h1Match = content.match(/^#\s+(.*)/m);
      const title = h1Match ? h1Match[1] : `Custom Post for ${clinic.name}`;

      const metaTitle = metaTitleMatch?.[1]?.trim() || title;
      const metaDesc = metaDescMatch ? metaDescMatch[1] : `Learn more at ${clinic.name}.`;
      const excerpt = excerptMatch ? excerptMatch[1] : truncateToSentence(content, 160);
      const readingTime = Math.ceil(getWordCount(content) / 200);

      await ctx.runMutation(internal.generation.finalizeGeneration, {
        clinicId: args.clinicId,
        postId: postId,
        keywordId: keyword._id,
        postData: {
          title,
          excerpt,
          content,
          metaTitle,
          metaDesc,
          readingTime,
          imageUrl: "",
          imageCredit: "",
          imageCreditUrl: "",
          safetyReport: "{}",
          socialContent: "{}",
        },
        status: "draft",
        logData: {
          status: "success",
          passesCompleted: 1,
        }
      });
      return postId;
    } catch (error: any) {
      console.error(error);
      await ctx.runMutation(internal.generation.logFailure, {
        clinicId: args.clinicId,
        keywordUsed: keyword.term,
        errorMessage: error.message || "Unknown error",
        postId,
      });
      throw error;
    }
  },
});

// ─── Content Freshness Refresh ──────────────────────────────────────────────
// Finds published posts that haven't been updated in 90+ days and re-generates
// their content. Signals to Google the site is actively maintained.

export const getPostsNeedingRefresh = internalQuery({
  handler: async (ctx) => {
    const ninetyDaysAgo = Date.now() - 90 * 24 * 60 * 60 * 1000;
    const allPublished = await ctx.db
      .query("posts")
      .filter((q) => q.eq(q.field("status"), "published"))
      .collect();

    // Return posts where updatedAt is missing or older than 90 days
    return allPublished.filter(
      (p) => !p.updatedAt || p.updatedAt < ninetyDaysAgo
    );
  },
});

export const refreshPost = internalAction({
  args: { postId: v.id("posts") },
  handler: async (ctx, args) => {
    const post = await ctx.runQuery(internal.generation.getPostById, { postId: args.postId });
    if (!post) return;

    const clinic = await ctx.runQuery(internal.generationHelpers.getClinic, { clinicId: post.clinicId });
    if (!clinic) return;

    const keyword = await ctx.runQuery(internal.generation.getKeywordById, { keywordId: post.keywordId });
    if (!keyword) return;

    const rawDoctorName = clinic.doctorNames[0] || clinic.name;
    const authorName = rawDoctorName.toLowerCase().startsWith("dr.") 
      ? rawDoctorName 
      : `Dr. ${rawDoctorName}`;

    const systemPrompt = `You are an SEO dental content writer. Rewrite and improve this blog post to be fresher, more detailed, and better optimised. Return ONLY markdown. No explanation.`;
    const factsBlock = buildClinicFactsBlock(clinic);
    const userPrompt = `Rewrite and significantly improve this existing dental blog post. Keep the same topic but make it more detailed, current, and helpful.

Keyword: ${keyword.localVariant || keyword.term}
Clinic: ${clinic.name}, ${clinic.city}
Author: ${authorName}
Booking URL: ${clinic.bookingUrl}

${factsBlock ? `Unique clinic facts to weave in naturally:\n${factsBlock}\n\n` : ""}Existing content to improve:
${post.content}

Rules:
- At the top include: <!-- metaTitle: ... (max 60 chars, must include the keyword) --> <!-- metaDesc: ... (max 155 chars) --> <!-- excerpt: ... -->
- Write 1,200 to 1,500 words
- Use ## for 5-6 H2 headings
- FAQ block with ### for 3-4 questions
- Include current year where relevant
- Author credit at bottom: "*Written by ${authorName}, ${clinic.name}.*"
- Naturally use keyword and city throughout`;

    try {
      const refreshed = await generateText(systemPrompt, userPrompt, 2200, 2, "anthropic/claude-haiku-4-5");

      const metaTitleMatch = refreshed.match(/<!-- metaTitle:\s*(.*?)\s*-->/i);
      const metaDescMatch = refreshed.match(/<!-- metaDesc:\s*(.*?)\s*-->/i);
      const excerptMatch = refreshed.match(/<!-- excerpt:\s*(.*?)\s*-->/i);

      let content = refreshed.replace(/<!--[\s\S]*?-->/g, "").trim();
      const h1Match = content.match(/^#\s+(.*)/m);
      const title = h1Match ? h1Match[1] : post.title;

      const metaTitle = metaTitleMatch?.[1]?.trim() || title;
      const metaDesc = metaDescMatch ? metaDescMatch[1] : post.metaDesc;
      const excerpt = excerptMatch ? excerptMatch[1] : post.excerpt;
      const readingTime = Math.ceil(getWordCount(content) / 200);

      await ctx.runMutation(internal.generation.finalizeGeneration, {
        clinicId: post.clinicId,
        postId: post._id,
        keywordId: post.keywordId,
        postData: {
          title,
          excerpt,
          content,
          metaTitle,
          metaDesc,
          readingTime,
          imageUrl: post.imageUrl,
          imageCredit: post.imageCredit,
          imageCreditUrl: post.imageCreditUrl,
          safetyReport: post.safetyReport,
          socialContent: post.socialContent,
          authorName,
        },
        status: "published",
        isRefresh: true,
        logData: { status: "success", passesCompleted: 1 },
      });

      console.log(`Refreshed post: ${title}`);
    } catch (err: any) {
      console.error(`Failed to refresh post ${post._id}:`, err.message);
    }
  },
});

export const getPostById = internalQuery({
  args: { postId: v.id("posts") },
  handler: async (ctx, args) => ctx.db.get(args.postId),
});

export const getKeywordById = internalQuery({
  args: { keywordId: v.id("keywords") },
  handler: async (ctx, args) => ctx.db.get(args.keywordId),
});

export const refreshAllOldPosts = internalAction({
  handler: async (ctx) => {
    const stalePosts = await ctx.runQuery(internal.generation.getPostsNeedingRefresh);
    console.log(`Refreshing ${stalePosts.length} stale posts...`);

    // Refresh up to 5 posts per run to stay within Convex action limits
    const batch = stalePosts.slice(0, 5);
    await Promise.allSettled(
      batch.map((p) =>
        ctx.runAction(internal.generation.refreshPost, { postId: p._id })
      )
    );
  },
});
