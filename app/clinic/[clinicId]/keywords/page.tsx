"use client";

import { useState } from "react";
import { useQuery, useMutation } from "convex/react";
import { api } from "@/convex/_generated/api";
import { useParams } from "next/navigation";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { toast } from "sonner";
import { Trash2, PauseCircle, PlayCircle, Plus } from "lucide-react";

export default function ClinicKeywordsPage() {
  const params = useParams();
  const clinicId = params.clinicId as string;

  const clinic = useQuery(api.clinics.getById, { clinicId: clinicId as any });
  const keywords = useQuery(api.keywords.getByClinic, { clinicId: clinicId as any });
  
  const addKeyword = useMutation(api.keywords.add);
  const updateKeyword = useMutation(api.keywords.update);
  const deleteKeyword = useMutation(api.keywords.remove);

  const [term, setTerm] = useState("");
  const [localVariant, setLocalVariant] = useState("");
  const [lowRisk, setLowRisk] = useState(false);

  if (clinic === undefined || keywords === undefined) {
    return <div className="p-8 text-neutral-400">Loading keywords...</div>;
  }

  const handleTermChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const newTerm = e.target.value;
    setTerm(newTerm);
    if (clinic && clinic.city) {
      setLocalVariant(`${newTerm} in ${clinic.city}`);
    }
  };

  const handleAdd = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      await addKeyword({
        clinicId: clinicId as any,
        term,
        localVariant,
        lowRisk,
      });
      toast.success("Keyword added");
      setTerm("");
      setLocalVariant("");
      setLowRisk(false);
    } catch (e: any) {
      toast.error(e.message || "Failed to add keyword");
    }
  };

  const togglePause = async (kw: any) => {
    await updateKeyword({ keywordId: kw._id, paused: !kw.paused });
  };

  const handleDelete = async (kw: any) => {
    if (confirm(`Delete keyword "${kw.term}"?`)) {
      await deleteKeyword({ keywordId: kw._id });
    }
  };

  return (
    <div className="p-8 max-w-6xl mx-auto space-y-6">
      <div>
        <h2 className="text-2xl font-bold tracking-tight text-neutral-900">Keyword Manager</h2>
        <p className="text-neutral-500">Add and manage the keywords the AI uses to generate blog posts.</p>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-4 gap-6">
        <div className="lg:col-span-1">
          <Card className="bg-white border-neutral-200">
            <CardHeader>
              <CardTitle>Add Keyword</CardTitle>
            </CardHeader>
            <CardContent>
              <form onSubmit={handleAdd} className="space-y-4">
                <div className="space-y-2">
                  <Label htmlFor="term">Term</Label>
                  <Input id="term" value={term} onChange={handleTermChange} required placeholder="e.g. root canal" />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="localVariant">Local Variant</Label>
                  <Input id="localVariant" value={localVariant} onChange={(e) => setLocalVariant(e.target.value)} required />
                </div>
                <div className="flex items-center gap-2 pt-2">
                  <input type="checkbox" id="lowRisk" checked={lowRisk} onChange={(e) => setLowRisk(e.target.checked)} className="rounded border-neutral-300" />
                  <Label htmlFor="lowRisk" className="cursor-pointer text-sm">Low Risk (skips safety check)</Label>
                </div>
                <Button type="submit" className="w-full bg-blue-600 hover:bg-blue-700 text-white mt-4">
                  <Plus className="w-4 h-4 mr-2" /> Add
                </Button>
              </form>
            </CardContent>
          </Card>
        </div>

        <div className="lg:col-span-3">
          <div className="bg-white border border-neutral-200 rounded-lg overflow-hidden">
            <Table>
              <TableHeader>
                <TableRow className="bg-neutral-50 hover:bg-neutral-50">
                  <TableHead>Term / Variant</TableHead>
                  <TableHead>Performance</TableHead>
                  <TableHead>Last Used</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead className="text-right">Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {keywords.sort((a,b) => b.performanceScore - a.performanceScore).map((kw) => (
                  <TableRow key={kw._id} className="hover:bg-neutral-50 transition-colors">
                    <TableCell>
                      <div className="font-medium text-neutral-900">{kw.term}</div>
                      <div className="text-xs text-neutral-500">{kw.localVariant}</div>
                    </TableCell>
                    <TableCell>
                      <div className="flex flex-col">
                         <span className="font-medium">{kw.performanceScore.toFixed(2)} score</span>
                         <span className="text-xs text-neutral-500">{kw.timesUsed} uses</span>
                      </div>
                    </TableCell>
                    <TableCell className="text-neutral-500">
                      {kw.lastUsed ? new Date(kw.lastUsed).toLocaleDateString() : "Never"}
                    </TableCell>
                    <TableCell>
                      {kw.paused ? (
                        <Badge variant="outline" className="text-amber-600 border-amber-200 bg-amber-50">Paused</Badge>
                      ) : (
                        <Badge variant="outline" className="text-green-600 border-green-200 bg-green-50">Active</Badge>
                      )}
                    </TableCell>
                    <TableCell className="text-right">
                      <div className="flex justify-end gap-2">
                        <Button variant="ghost" size="icon" onClick={() => togglePause(kw)} title={kw.paused ? "Resume" : "Pause"}>
                          {kw.paused ? <PlayCircle className="w-4 h-4 text-green-600" /> : <PauseCircle className="w-4 h-4 text-amber-600" />}
                        </Button>
                        <Button variant="ghost" size="icon" onClick={() => handleDelete(kw)} title="Delete">
                          <Trash2 className="w-4 h-4 text-red-500" />
                        </Button>
                      </div>
                    </TableCell>
                  </TableRow>
                ))}
                {keywords.length === 0 && (
                  <TableRow>
                    <TableCell colSpan={5} className="text-center py-8 text-neutral-500">
                      No keywords found. Add one to get started.
                    </TableCell>
                  </TableRow>
                )}
              </TableBody>
            </Table>
          </div>
        </div>
      </div>
    </div>
  );
}
