"use client";

import { useState } from "react";
import { useAction, useMutation, useQuery } from "convex/react";
import { api } from "@/convex/_generated/api";
import { Doc, Id } from "@/convex/_generated/dataModel";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Wand2, Loader2, Crown, Network } from "lucide-react";
import { toast } from "sonner";

type Keyword = Doc<"keywords">;

export default function ClustersPanel({ clinicId }: { clinicId: Id<"clinics"> }) {
  const data = useQuery(api.keywords.getClusters, { clinicId });
  const allKeywords = useQuery(api.keywords.getByClinic, { clinicId });
  const setCluster = useMutation(api.keywords.setCluster);
  const autoCluster = useAction(api.keywordSuggestions.autoCluster);
  const [running, setRunning] = useState(false);

  if (data === undefined || allKeywords === undefined) {
    return <div className="text-neutral-400">Loading clusters...</div>;
  }

  const runAuto = async () => {
    setRunning(true);
    try {
      const res = await autoCluster({ clinicId });
      toast.success(`Updated ${res.updated} keywords across ${res.clusters.length} clusters`);
    } catch (e) {
      toast.error((e as Error).message || "Auto-cluster failed");
    } finally {
      setRunning(false);
    }
  };

  const removeFromCluster = async (kw: Keyword) => {
    await setCluster({ keywordId: kw._id, cluster: undefined, isPillar: false, pillarKeywordId: undefined });
    toast.success("Removed from cluster");
  };

  const promoteToPillar = async (kw: Keyword, currentPillar: Keyword | null) => {
    if (!kw.cluster) return;
    // Demote current pillar
    if (currentPillar) {
      await setCluster({ keywordId: currentPillar._id, cluster: kw.cluster, isPillar: false, pillarKeywordId: kw._id });
    }
    await setCluster({ keywordId: kw._id, cluster: kw.cluster, isPillar: true, pillarKeywordId: undefined });
    toast.success(`${kw.term} is now the pillar`);
  };

  return (
    <div className="space-y-6">
      <Card className="bg-gradient-to-br from-emerald-600 to-teal-600 text-white border-none">
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-lg">
            <Network className="w-5 h-5" />
            Topic Clusters
          </CardTitle>
          <CardDescription className="text-emerald-100">
            Pillar pages target broad terms; supporting posts target long-tail variants and link back to the pillar. This compounds internal-link authority and is the #1 SEO architecture for content sites in 2026.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <Button
            onClick={runAuto}
            disabled={running || allKeywords.length === 0}
            className="bg-white text-emerald-700 hover:bg-emerald-50 font-semibold"
          >
            {running ? <Loader2 className="w-4 h-4 mr-2 animate-spin" /> : <Wand2 className="w-4 h-4 mr-2" />}
            Auto-cluster {allKeywords.length} keyword{allKeywords.length === 1 ? "" : "s"}
          </Button>
        </CardContent>
      </Card>

      {data.clusters.length === 0 && data.orphans.length > 0 && (
        <Card>
          <CardContent className="p-6 text-sm text-neutral-600">
            No clusters yet. Click <strong>Auto-cluster</strong> above to let AI group your existing keywords, or set a cluster name on individual keywords.
          </CardContent>
        </Card>
      )}

      {data.clusters.map((c) => (
        <Card key={c.name}>
          <CardHeader className="pb-3">
            <CardTitle className="text-base flex items-center gap-2">
              {c.name}
              <Badge variant="outline" className="text-xs">{c.children.length + (c.pillar ? 1 : 0)} keywords</Badge>
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-2">
            {c.pillar ? (
              <div className="flex items-center justify-between gap-2 p-3 rounded-md bg-amber-50 border border-amber-200">
                <div className="flex items-center gap-2 min-w-0">
                  <Crown className="w-4 h-4 text-amber-600 flex-shrink-0" />
                  <span className="font-semibold text-neutral-900 truncate">{c.pillar.term}</span>
                  <Badge variant="outline" className="text-xs bg-amber-100 text-amber-700 border-amber-300">PILLAR</Badge>
                </div>
                <Button size="sm" variant="ghost" onClick={() => removeFromCluster(c.pillar!)}>Remove</Button>
              </div>
            ) : (
              <div className="p-3 rounded-md bg-neutral-50 text-xs text-neutral-500 border border-dashed border-neutral-300">
                No pillar set &mdash; promote one of the supporting keywords below.
              </div>
            )}
            {c.children.map((kw) => (
              <div key={kw._id} className="flex items-center justify-between gap-2 p-2 rounded-md hover:bg-neutral-50">
                <span className="text-sm text-neutral-700 truncate">{kw.term}</span>
                <div className="flex gap-1">
                  <Button size="sm" variant="ghost" onClick={() => promoteToPillar(kw, c.pillar)}>
                    <Crown className="w-3 h-3 mr-1" /> Make pillar
                  </Button>
                  <Button size="sm" variant="ghost" onClick={() => removeFromCluster(kw)}>Remove</Button>
                </div>
              </div>
            ))}
          </CardContent>
        </Card>
      ))}

      {data.orphans.length > 0 && (
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-base text-neutral-600">Unclustered ({data.orphans.length})</CardTitle>
            <CardDescription>Run auto-cluster, or manually assign each to a cluster.</CardDescription>
          </CardHeader>
          <CardContent className="flex flex-wrap gap-2">
            {data.orphans.map((kw) => (
              <Badge key={kw._id} variant="outline" className="text-xs">
                {kw.term}
              </Badge>
            ))}
          </CardContent>
        </Card>
      )}
    </div>
  );
}
