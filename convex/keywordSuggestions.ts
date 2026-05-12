"use node";

import { action } from "./_generated/server";
import { v } from "convex/values";
import { api } from "./_generated/api";
import { generateText } from "../lib/ai";

// Strict JSON parser that tolerates ```json fences and stray prose.
function extractJson<T = unknown>(text: string): T | null {
  if (!text) return null;
  const fenced = text.match(/```(?:json)?\s*([\s\S]*?)```/i);
  const raw = fenced ? fenced[1] : text;
  const start = raw.indexOf("[");
  const end = raw.lastIndexOf("]");
  const slice = start !== -1 && end !== -1 ? raw.slice(start, end + 1) : raw;
  try { return JSON.parse(slice) as T; } catch { return null; }
}

type Suggestion = {
  term: string;
  localVariant: string;
  lowRisk: boolean;
  cluster: string;
  pillarTerm?: string;
  intent: "informational" | "commercial" | "transactional" | "navigational";
  reasoning: string;
  source: "ai_longtail" | "gsc_almost_ranking";
};

/**
 * Suggest long-tail keywords using:
 *  - existing clinic keywords as seed clusters
 *  - optional GSC "almost-ranking" queries (positions 4-20 with impressions)
 *
 * Returns suggestions only — operator must apply via `applySuggestions`.
 */
export const suggestLongTail = action({
  args: {
    clinicId: v.id("clinics"),
    gscQueries: v.optional(v.array(v.object({
      query: v.string(),
      position: v.number(),
      impressions: v.number(),
      clicks: v.number(),
    }))),
    targetCount: v.optional(v.number()),
  },
  handler: async (ctx, args): Promise<{ suggestions: Suggestion[]; mode: string }> => {
    const clinic = await ctx.runQuery(api.clinics.getById, { clinicId: args.clinicId });
    if (!clinic) throw new Error("Clinic not found");

    const existing = await ctx.runQuery(api.keywords.getByClinic, { clinicId: args.clinicId });
    const existingTerms = existing.map((k) => k.term.toLowerCase());

    const target = Math.min(args.targetCount ?? 12, 25);

    // Build mode-specific input block
    let inputBlock = "";
    let mode = "ai_longtail";

    if (args.gscQueries && args.gscQueries.length > 0) {
      // Filter to "almost ranking" zone: position 4-20 with at least some impressions.
      const almost = args.gscQueries
        .filter((q) => q.position >= 4 && q.position <= 20 && q.impressions >= 5)
        .filter((q) => !existingTerms.includes(q.query.toLowerCase()))
        .sort((a, b) => b.impressions - a.impressions)
        .slice(0, 60);

      if (almost.length > 0) {
        mode = "gsc_almost_ranking";
        inputBlock = `GOOGLE SEARCH CONSOLE QUERIES (positions 4-20, real user search terms):
${almost.map((q) => `- "${q.query}" (pos ${q.position.toFixed(1)}, ${q.impressions} impressions, ${q.clicks} clicks)`).join("\n")}

Your job: pick the ${target} BEST candidates from this list to publish dedicated posts targeting. Prioritize queries with high impressions but low clicks (huge opportunity). Cluster them by topic.`;
      }
    }

    if (!inputBlock) {
      // Pure AI brainstorm from existing keywords + clinic profile
      const seedTerms = existing
        .filter((k) => !k.paused)
        .sort((a, b) => (b.performanceScore || 0) - (a.performanceScore || 0))
        .slice(0, 30)
        .map((k) => k.term);

      inputBlock = `EXISTING KEYWORDS (use as seeds, do NOT duplicate):
${seedTerms.map((t) => `- ${t}`).join("\n")}

Generate ${target} NEW long-tail variants. Each should be:
- 3-7 words (long-tail = lower competition, higher intent)
- A real question or comparison real patients ask in India
- Distinct from the existing list
- Grouped into 3-6 topic clusters`;
    }

    const systemPrompt = `You are an expert SEO strategist for Indian dental clinics.
Your output is STRICT JSON only — a single JSON array, no prose, no markdown fences.
Every keyword you propose must be something a real patient in India would type into Google.
Avoid generic single-word terms. Favor patient questions, comparisons, costs, and specific procedures.`;

    const userPrompt = `Clinic: ${clinic.name} in ${clinic.city}
Services: ${clinic.services.join(", ")}

${inputBlock}

Output a JSON array of objects with this exact shape:
[
  {
    "term": "string (the keyword, no city)",
    "cluster": "string (short topic name like 'Root Canal' or 'Teeth Whitening')",
    "pillarTerm": "string or null (the broader pillar keyword if this supports one)",
    "intent": "informational" | "commercial" | "transactional" | "navigational",
    "lowRisk": boolean (true if NOT a medical claim — e.g. cost, comparison, FAQ; false if treatment-specific medical claim),
    "reasoning": "string (one sentence why this is worth publishing)"
  }
]

Return between 8 and ${target} suggestions. STRICT JSON only.`;

    const raw = await generateText(systemPrompt, userPrompt, 2200, 2, "anthropic/claude-haiku-4-5");
    const parsed = extractJson<Array<{
      term: string;
      cluster?: string;
      pillarTerm?: string | null;
      intent?: string;
      lowRisk?: boolean;
      reasoning?: string;
    }>>(raw);

    if (!parsed || !Array.isArray(parsed)) {
      throw new Error("AI returned invalid JSON. Try again.");
    }

    const validIntents = new Set(["informational", "commercial", "transactional", "navigational"]);
    const sourceTag: Suggestion["source"] = mode === "gsc_almost_ranking" ? "gsc_almost_ranking" : "ai_longtail";

    const suggestions: Suggestion[] = parsed
      .filter((s) => s && typeof s.term === "string" && s.term.trim().length > 0)
      .filter((s) => !existingTerms.includes(s.term.trim().toLowerCase()))
      .map((s) => ({
        term: s.term.trim(),
        localVariant: `${s.term.trim()} in ${clinic.city}`,
        lowRisk: s.lowRisk === true,
        cluster: (s.cluster || "Uncategorized").trim(),
        pillarTerm: s.pillarTerm && typeof s.pillarTerm === "string" ? s.pillarTerm.trim() : undefined,
        intent: validIntents.has(s.intent || "") ? (s.intent as Suggestion["intent"]) : "informational",
        reasoning: (s.reasoning || "").trim().slice(0, 240),
        source: sourceTag,
      }));

    return { suggestions, mode };
  },
});

/**
 * Group existing un-clustered keywords into clusters using AI.
 * Does not create new keywords — only patches `cluster` and `isPillar` on existing ones.
 */
export const autoCluster = action({
  args: { clinicId: v.id("clinics") },
  handler: async (ctx, args): Promise<{ updated: number; clusters: string[] }> => {
    const clinic = await ctx.runQuery(api.clinics.getById, { clinicId: args.clinicId });
    if (!clinic) throw new Error("Clinic not found");

    const all = await ctx.runQuery(api.keywords.getByClinic, { clinicId: args.clinicId });
    if (all.length === 0) return { updated: 0, clusters: [] };

    const systemPrompt = `You are an SEO topic-cluster strategist. Output STRICT JSON only.`;

    const userPrompt = `Group these dental keywords into 4-10 topic clusters. For each cluster pick ONE keyword as the pillar (broadest, most commercial intent).

KEYWORDS:
${all.map((k) => `- ${k.term}`).join("\n")}

Output JSON array:
[
  {
    "cluster": "Short topic name",
    "pillarTerm": "exact existing keyword from the list",
    "memberTerms": ["exact existing keyword", "..."]
  }
]

Every keyword from the input must appear in exactly one cluster (as pillar OR member).`;

    const raw = await generateText(systemPrompt, userPrompt, 2000, 2, "anthropic/claude-haiku-4-5");
    const parsed = extractJson<Array<{ cluster: string; pillarTerm: string; memberTerms: string[] }>>(raw);
    if (!parsed) throw new Error("AI returned invalid JSON.");

    const norm = (s: string) => s.trim().toLowerCase();
    const byTerm = new Map(all.map((k) => [norm(k.term), k] as const));
    let updated = 0;
    const clusterNames: string[] = [];

    for (const grp of parsed) {
      if (!grp.cluster || !grp.pillarTerm) continue;
      clusterNames.push(grp.cluster);
      const pillar = byTerm.get(norm(grp.pillarTerm));
      if (!pillar) continue;
      await ctx.runMutation(api.keywords.setCluster, {
        keywordId: pillar._id,
        cluster: grp.cluster,
        isPillar: true,
        pillarKeywordId: undefined,
      });
      updated++;
      for (const m of grp.memberTerms || []) {
        if (norm(m) === norm(grp.pillarTerm)) continue;
        const child = byTerm.get(norm(m));
        if (!child) continue;
        await ctx.runMutation(api.keywords.setCluster, {
          keywordId: child._id,
          cluster: grp.cluster,
          isPillar: false,
          pillarKeywordId: pillar._id,
        });
        updated++;
      }
    }

    return { updated, clusters: clusterNames };
  },
});
