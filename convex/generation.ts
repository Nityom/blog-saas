import { action, internalAction, internalMutation, internalQuery } from "./_generated/server";
import { v } from "convex/values";
import { generateText } from "../lib/ai";
import { fetchPexelsImage } from "../lib/pexels";
import { generateSlug, generateSchemaMarkup, addInternalLinks } from "../lib/seo";
import { selectNextKeyword } from "../lib/keywords";
import { markdownToHtml, getWordCount, truncateToSentence } from "../lib/markdown";
import { internal, api } from "./_generated/api";

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

    // 3. Create post record
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

    return { postId, keyword };
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

    // 4. Generate schema markup
    const schemaMarkup = generateSchemaMarkup(
      {
        title: args.postData.title,
        imageUrl: args.postData.imageUrl,
        slug: finalSlug,
        keywordTerm: keyword.term,
      },
      { name: clinic.name, city: clinic.city }
    );

    // 5. Add internal links
    const relatedPostsData = existingPosts
      .filter(p => p.status === "published" && p._id !== args.postId)
      .slice(0, 5); // get some published posts
    
    // We would need to map keyword logic here, for simplicity we just map to the few recent ones
    // In a real scenario we'd query keywords for these posts
    const relatedLinks = await Promise.all(relatedPostsData.map(async p => {
      const kw = await ctx.db.get(p.keywordId);
      return { slug: p.slug, keyword: kw?.term || "" };
    }));
    
    const linkedContent = addInternalLinks(args.postData.content, relatedLinks);

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
      safetyReport: args.postData.safetyReport,
      status: args.status,
      readingTime: args.postData.readingTime,
      schemaMarkup: schemaMarkup,
    };
    
    if (args.status === "published") {
      updateData.publishedAt = Date.now();
    }

    await ctx.db.patch(args.postId, updateData);

    // 7. Update keyword
    await ctx.db.patch(args.keywordId, {
      lastUsed: Date.now(),
      timesUsed: keyword.timesUsed + 1,
    });

    // 8. Log generation
    await ctx.db.insert("generationLogs", {
      clinicId: args.clinicId,
      keywordUsed: keyword.term,
      status: args.logData.status,
      passesCompleted: args.logData.passesCompleted,
      errorMessage: args.logData.errorMessage,
      runAt: Date.now(),
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
    const { postId, keyword } = prepResult;

    try {
      // PASS 1 — DRAFT
      const systemPrompt1 = `You are an SEO dental content writer for patient-friendly blog posts. Return ONLY markdown. No explanation, no preamble, no backticks.`;
      
      const userPrompt1 = `Write a complete SEO-optimized blog post.

Keyword: ${keyword.localVariant || keyword.term}
Clinic: ${clinic.name}
City: ${clinic.city}
Tone: ${clinic.tone}
Doctor(s): ${clinic.doctorNames.join(", ")}
Target patients: aged ${clinic.targetAge}
Services: ${clinic.services.join(", ")}
Booking URL: ${clinic.bookingUrl}

At the very top include these HTML comments EXACTLY:
<!-- metaTitle: your meta title here (max 60 chars) -->
<!-- metaDesc: your meta description here (max 155 chars) -->
<!-- excerpt: one to two sentence post summary -->

Then write the post:
- MUST use strict Markdown formatting.
- **CRITICAL**: You MUST leave a blank empty line between EVERY paragraph, heading, and list to ensure proper spacing.
- Use \`#\` for the main H1 title.
- Use \`##\` for 3 to 4 H2 section headings.
- Use bullet points (\`-\` or \`*\`) to break up large chunks of text and present lists nicely.
- Use **bold** for key terms and *italics* for important emphasized lines.
- Write 500 to 600 words total.
- Simple language, no unexplained medical jargon.
- FAQ block with 2 patient questions (Use \`###\` for the questions).
- Final CTA paragraph mentioning ${clinic.name} with a link to ${clinic.bookingUrl} for booking.
- Naturally use the keyword throughout.`;

      const draftOutput = await generateText(systemPrompt1, userPrompt1, 900);

      // Parse output
      const metaTitleMatch = draftOutput.match(/<!-- metaTitle:\s*(.*?)\s*-->/i);
      const metaDescMatch = draftOutput.match(/<!-- metaDesc:\s*(.*?)\s*-->/i);
      const excerptMatch = draftOutput.match(/<!-- excerpt:\s*(.*?)\s*-->/i);
      
      let content = draftOutput.replace(/<!--[\s\S]*?-->/g, "").trim();
      const h1Match = content.match(/^#\s+(.*)/m);
      const title = h1Match ? h1Match[1] : `${keyword.localVariant || keyword.term} at ${clinic.name}`;

      const metaTitle = metaTitleMatch ? metaTitleMatch[1] : title;
      const metaDesc = metaDescMatch ? metaDescMatch[1] : `Learn about ${keyword.term} at ${clinic.name}.`;
      const excerpt = excerptMatch ? excerptMatch[1] : truncateToSentence(content, 160);
      const readingTime = Math.ceil(getWordCount(content) / 200);

      let passesCompleted = 1;
      let finalStatus: "published" | "flagged" = "published";
      let safetyReportJson = "{}";

      // Parallel tasks: Pexels and Pass 2 (if not lowRisk)
      const tasks: Promise<any>[] = [fetchPexelsImage(keyword.term)];
      
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
            return JSON.parse(safetyRes);
          } catch (e) {
            console.error("Safety check failed", e);
            return { safe: false, riskLevel: "high", flags: ["Safety check failed to parse"], suggestedEdits: [] };
          }
        })());
      }

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
        },
        status: finalStatus,
        logData: {
          status: finalStatus === "flagged" ? "flagged" : "success",
          passesCompleted,
        }
      });

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
    const activeClinics = await ctx.runQuery(api.clinics.getActive);
    
    // 2. Run full generation flow for each clinic in parallel
    const promises = activeClinics.map(clinic => 
      ctx.runAction(api.generation.generatePost, { clinicId: clinic._id })
    );

    const results = await Promise.allSettled(promises);

    // 3 & 4. Log warnings and errors
    results.forEach((result, index) => {
      const clinic = activeClinics[index];
      if (result.status === "rejected") {
        console.error(`Generation failed for clinic ${clinic.name}:`, result.reason);
      }
    });
  }
});
