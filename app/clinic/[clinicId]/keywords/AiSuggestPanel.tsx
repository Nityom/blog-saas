"use client";

import { useState } from "react";
import { useAction, useMutation, useQuery } from "convex/react";
import { api } from "@/convex/_generated/api";
import { Id } from "@/convex/_generated/dataModel";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Sparkles, Wand2, Plus, Loader2, FileSpreadsheet } from "lucide-react";
import { toast } from "sonner";

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

type GscRow = { query: string; position: number; impressions: number; clicks: number };

function parseGscCsv(text: string): GscRow[] {
  const lines = text.split(/\r?\n/).map((l) => l.trim()).filter(Boolean);
  if (lines.length === 0) return [];
  const headerCells = lines[0].split(/[,\t]/).map((h) => h.trim().toLowerCase().replace(/^"|"$/g, ""));
  const idx = (names: string[]) => names.map((n) => headerCells.indexOf(n)).find((i) => i !== -1) ?? -1;
  const qi = idx(["query", "top queries", "queries"]);
  const pi = idx(["position", "average position", "avg position"]);
  const ii = idx(["impressions", "impr."]);
  const ci = idx(["clicks"]);
  if (qi === -1) return [];
  const rows: GscRow[] = [];
  for (let i = 1; i < lines.length; i++) {
    const parts = lines[i].split(/[,\t]/).map((p) => p.trim().replace(/^"|"$/g, ""));
    const q = parts[qi];
    if (!q) continue;
    rows.push({
      query: q,
      position: pi !== -1 ? parseFloat(parts[pi]) || 99 : 99,
      impressions: ii !== -1 ? parseInt(parts[ii], 10) || 0 : 0,
      clicks: ci !== -1 ? parseInt(parts[ci], 10) || 0 : 0,
    });
  }
  return rows;
}

const INTENT_COLORS: Record<Suggestion["intent"], string> = {
  informational: "bg-blue-50 text-blue-700 border-blue-200",
  commercial: "bg-purple-50 text-purple-700 border-purple-200",
  transactional: "bg-green-50 text-green-700 border-green-200",
  navigational: "bg-neutral-100 text-neutral-700 border-neutral-200",
};

export default function AiSuggestPanel({ clinicId }: { clinicId: Id<"clinics"> }) {
  const suggest = useAction(api.keywordSuggestions.suggestLongTail);
  const bulkInsert = useMutation(api.keywords.bulkInsert);

  const [loading, setLoading] = useState(false);
  const [suggestions, setSuggestions] = useState<Suggestion[]>([]);
  const [selected, setSelected] = useState<Set<number>>(new Set());
  const [gscText, setGscText] = useState("");
  const [showGsc, setShowGsc] = useState(false);
  const [mode, setMode] = useState<string>("");

  const existingKeywords = useQuery(api.keywords.getByClinic, { clinicId });

  const run = async () => {
    setLoading(true);
    setSuggestions([]);
    setSelected(new Set());
    try {
      const gscQueries = gscText.trim() ? parseGscCsv(gscText) : undefined;
      const res = await suggest({ clinicId, gscQueries, targetCount: 15 });
      setSuggestions(res.suggestions);
      setMode(res.mode);
      setSelected(new Set(res.suggestions.map((_, i) => i))); // pre-select all
      toast.success(`${res.suggestions.length} suggestions ready`);
    } catch (e) {
      toast.error((e as Error).message || "Suggestion failed");
    } finally {
      setLoading(false);
    }
  };

  const toggle = (i: number) => {
    const next = new Set(selected);
    if (next.has(i)) next.delete(i); else next.add(i);
    setSelected(next);
  };

  const apply = async () => {
    const items = Array.from(selected).map((i) => suggestions[i]).filter(Boolean).map((s) => ({
      term: s.term,
      localVariant: s.localVariant,
      lowRisk: s.lowRisk,
      cluster: s.cluster,
      pillarTerm: s.pillarTerm,
      intent: s.intent,
      source: s.source,
    }));
    if (items.length === 0) { toast.error("Select at least one"); return; }
    try {
      const res = await bulkInsert({ clinicId, items });
      toast.success(`Added ${res.inserted}${res.skipped ? ` (${res.skipped} skipped as duplicates)` : ""}`);
      setSuggestions([]);
      setSelected(new Set());
    } catch (e) {
      toast.error((e as Error).message || "Insert failed");
    }
  };

  return (
    <div className="space-y-6">
      <Card className="bg-gradient-to-br from-violet-600 to-blue-600 text-white border-none">
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-lg">
            <Sparkles className="w-5 h-5" />
            AI Long-tail Keyword Suggestions
          </CardTitle>
          <CardDescription className="text-violet-100">
            {existingKeywords?.length || 0} existing keywords. The AI will brainstorm long-tail variants grouped into topic clusters &mdash; or if you paste a Google Search Console export, it will mine your &quot;almost ranking&quot; queries (positions 4-20) for the highest-opportunity targets.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-3">
          <div className="flex items-center gap-2">
            <Button
              onClick={() => setShowGsc((s) => !s)}
              variant="outline"
              className="bg-white/10 border-white/20 text-white hover:bg-white/20 hover:text-white"
            >
              <FileSpreadsheet className="w-4 h-4 mr-2" />
              {showGsc ? "Hide" : "Paste"} GSC export (optional)
            </Button>
            <Button
              onClick={run}
              disabled={loading}
              className="bg-white text-violet-700 hover:bg-violet-50 font-semibold"
            >
              {loading ? <Loader2 className="w-4 h-4 mr-2 animate-spin" /> : <Wand2 className="w-4 h-4 mr-2" />}
              {loading ? "Thinking..." : "Generate Suggestions"}
            </Button>
          </div>
          {showGsc && (
            <div className="space-y-2">
              <textarea
                value={gscText}
                onChange={(e) => setGscText(e.target.value)}
                placeholder={`Paste CSV/TSV from GSC > Performance > Queries (Export). Columns: Query, Clicks, Impressions, Position.\n\nExample:\nQuery,Clicks,Impressions,Position\nroot canal cost bangalore,3,127,8.4\nteeth whitening price,1,89,11.2`}
                className="w-full h-40 p-3 rounded-md text-sm font-mono text-neutral-900 bg-white"
              />
              <p className="text-xs text-violet-100">
                In GSC: Performance &rarr; Queries tab &rarr; Export &rarr; download CSV. Open in Sheets, copy all rows, paste here.
              </p>
            </div>
          )}
        </CardContent>
      </Card>

      {suggestions.length > 0 && (
        <Card>
          <CardHeader>
            <div className="flex items-center justify-between">
              <div>
                <CardTitle className="text-base">{suggestions.length} suggestions ({mode === "gsc_almost_ranking" ? "from GSC almost-ranking queries" : "AI brainstormed"})</CardTitle>
                <CardDescription>{selected.size} selected</CardDescription>
              </div>
              <Button onClick={apply} disabled={selected.size === 0} className="bg-blue-600 hover:bg-blue-700 text-white">
                <Plus className="w-4 h-4 mr-2" />
                Add {selected.size} keyword{selected.size === 1 ? "" : "s"}
              </Button>
            </div>
          </CardHeader>
          <CardContent className="p-0">
            <div className="divide-y">
              {suggestions.map((s, i) => (
                <label
                  key={i}
                  className={`flex items-start gap-3 p-4 cursor-pointer transition-colors ${selected.has(i) ? "bg-blue-50/50" : "hover:bg-neutral-50"}`}
                >
                  <input
                    type="checkbox"
                    checked={selected.has(i)}
                    onChange={() => toggle(i)}
                    className="mt-1 rounded border-neutral-300 text-blue-600 focus:ring-blue-500"
                  />
                  <div className="flex-1 min-w-0">
                    <div className="flex flex-wrap items-center gap-2 mb-1">
                      <span className="font-semibold text-neutral-900">{s.term}</span>
                      <Badge variant="outline" className="text-xs">
                        {s.cluster}
                      </Badge>
                      <Badge variant="outline" className={`text-xs ${INTENT_COLORS[s.intent]}`}>
                        {s.intent}
                      </Badge>
                      {s.lowRisk && (
                        <Badge variant="outline" className="text-xs bg-green-50 text-green-700 border-green-200">
                          low-risk
                        </Badge>
                      )}
                      {s.pillarTerm && (
                        <span className="text-xs text-neutral-500">supports &rarr; {s.pillarTerm}</span>
                      )}
                    </div>
                    {s.reasoning && <p className="text-sm text-neutral-600">{s.reasoning}</p>}
                  </div>
                </label>
              ))}
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
