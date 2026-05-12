"use client";

import { useState, useEffect } from "react";
import { useQuery, useMutation } from "convex/react";
import { api } from "@/convex/_generated/api";
import { Id } from "@/convex/_generated/dataModel";
import { useParams } from "next/navigation";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { toast } from "sonner";
import { Trash2, PauseCircle, PlayCircle, Plus, GripVertical } from "lucide-react";
import { DragDropContext, Droppable, Draggable, DropResult } from "@hello-pangea/dnd";
import AiSuggestPanel from "./AiSuggestPanel";
import ClustersPanel from "./ClustersPanel";

export default function ClinicKeywordsPage() {
  const params = useParams();
  const clinicId = params.clinicId as string;

  const clinic = useQuery(api.clinics.getById, { clinicId: clinicId as Id<"clinics"> });
  const keywords = useQuery(api.keywords.getByClinic, { clinicId: clinicId as Id<"clinics"> });
  
  const addKeyword = useMutation(api.keywords.add);
  const updateKeyword = useMutation(api.keywords.update);
  const deleteKeyword = useMutation(api.keywords.remove);
  const reorderKeywords = useMutation(api.keywords.reorder);

  const [term, setTerm] = useState("");
  const [localVariant, setLocalVariant] = useState("");
  const [lowRisk, setLowRisk] = useState(false);
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const [localKeywords, setLocalKeywords] = useState<any[]>([]);

  useEffect(() => {
    if (keywords) {
      setLocalKeywords([...keywords].sort((a,b) => {
        const orderA = a.order ?? Infinity;
        const orderB = b.order ?? Infinity;
        if (orderA !== orderB) return orderA - orderB;
        return (b.performanceScore || 0) - (a.performanceScore || 0);
      }));
    }
  }, [keywords]);

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
        clinicId: clinicId as Id<"clinics">,
        term,
        localVariant,
        lowRisk,
      });
      toast.success("Keyword added");
      setTerm("");
      setLocalVariant("");
      setLowRisk(false);
    } catch (e: unknown) {
      toast.error((e as Error).message || "Failed to add keyword");
    }
  };

  const togglePause = async (kw: { _id: Id<"keywords">; paused: boolean }) => {
    await updateKeyword({ keywordId: kw._id, paused: !kw.paused });
  };

  const handleDelete = async (kw: { _id: Id<"keywords">; term: string }) => {
    if (confirm(`Delete keyword "${kw.term}"?`)) {
      await deleteKeyword({ keywordId: kw._id });
    }
  };

  const onDragEnd = async (result: DropResult) => {
    if (!result.destination) return;
    
    const items = Array.from(localKeywords);
    const [reorderedItem] = items.splice(result.source.index, 1);
    items.splice(result.destination.index, 0, reorderedItem);

    setLocalKeywords(items);

    const updates = items.map((item, index) => ({
      keywordId: item._id,
      order: index,
    }));

    try {
      await reorderKeywords({ updates });
    } catch {
      toast.error("Failed to save new order");
    }
  };

  return (
    <div className="p-8 max-w-6xl mx-auto space-y-6">
      <div>
        <h2 className="text-2xl font-bold tracking-tight text-neutral-900">Keyword Manager</h2>
        <p className="text-neutral-500">Add, cluster, and let AI surface long-tail keywords the AI generator should target.</p>
      </div>

      <Tabs defaultValue="list" className="space-y-6">
        <TabsList>
          <TabsTrigger value="list">All Keywords</TabsTrigger>
          <TabsTrigger value="suggest">AI Suggest</TabsTrigger>
          <TabsTrigger value="clusters">Topic Clusters</TabsTrigger>
        </TabsList>

        <TabsContent value="suggest">
          <AiSuggestPanel clinicId={clinicId as Id<"clinics">} />
        </TabsContent>

        <TabsContent value="clusters">
          <ClustersPanel clinicId={clinicId as Id<"clinics">} />
        </TabsContent>

        <TabsContent value="list" className="space-y-6">
      <div className="grid grid-cols-1 lg:grid-cols-4 gap-6">
        <div className="lg:col-span-1">
          <Card className="bg-white border-neutral-200 shadow-sm">
            <CardHeader>
              <CardTitle className="text-lg">Add Keyword</CardTitle>
            </CardHeader>
            <CardContent>
              <form onSubmit={handleAdd} className="space-y-4">
                <div className="space-y-2">
                  <Label htmlFor="term" className="text-neutral-700">Term</Label>
                  <Input id="term" value={term} onChange={handleTermChange} required placeholder="e.g. root canal" className="shadow-sm" />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="localVariant" className="text-neutral-700">Local Variant</Label>
                  <Input id="localVariant" value={localVariant} onChange={(e) => setLocalVariant(e.target.value)} required className="shadow-sm" />
                </div>
                <div className="flex items-center gap-2 pt-2">
                  <input type="checkbox" id="lowRisk" checked={lowRisk} onChange={(e) => setLowRisk(e.target.checked)} className="rounded border-neutral-300 text-blue-600 focus:ring-blue-500" />
                  <Label htmlFor="lowRisk" className="cursor-pointer text-sm text-neutral-700 font-medium">Low Risk (skips safety check)</Label>
                </div>
                <Button type="submit" className="w-full bg-blue-600 hover:bg-blue-700 text-white mt-4 shadow-sm">
                  <Plus className="w-4 h-4 mr-2" /> Add Keyword
                </Button>
              </form>
            </CardContent>
          </Card>
        </div>

        <div className="lg:col-span-3">
          <div className="bg-white border border-neutral-200 rounded-lg overflow-hidden shadow-sm">
            <DragDropContext onDragEnd={onDragEnd}>
              <Table>
                <TableHeader>
                  <TableRow className="bg-neutral-50 hover:bg-neutral-50">
                    <TableHead className="w-10"></TableHead>
                    <TableHead>Term / Variant</TableHead>
                    <TableHead>Performance</TableHead>
                    <TableHead>Last Used</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead className="text-right">Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <Droppable droppableId="keywords-list" direction="vertical">
                  {(provided) => (
                    <TableBody {...provided.droppableProps} ref={provided.innerRef}>
                      {localKeywords.map((kw, index) => (
                        <Draggable key={kw._id} draggableId={kw._id} index={index}>
                          {(provided, snapshot) => (
                            <TableRow 
                              ref={provided.innerRef}
                              {...provided.draggableProps}
                              className={`hover:bg-neutral-50 transition-colors ${snapshot.isDragging ? "bg-blue-50 shadow-md" : ""}`}
                              style={{ ...provided.draggableProps.style }}
                            >
                              <TableCell className="w-10">
                                <div {...provided.dragHandleProps} className="cursor-grab text-neutral-400 hover:text-neutral-600">
                                  <GripVertical className="h-5 w-5" />
                                </div>
                              </TableCell>
                              <TableCell>
                                <div className="font-medium text-neutral-900">{kw.term}</div>
                                <div className="text-xs text-neutral-500">{kw.localVariant}</div>
                              </TableCell>
                              <TableCell>
                                <div className="flex flex-col">
                                  <span className="font-medium">{kw.performanceScore?.toFixed(2) || "0.00"} score</span>
                                  <span className="text-xs text-neutral-500">{kw.timesUsed || 0} uses</span>
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
                          )}
                        </Draggable>
                      ))}
                      {provided.placeholder}
                      {localKeywords.length === 0 && (
                        <TableRow>
                          <TableCell colSpan={6} className="text-center py-8 text-neutral-500">
                            No keywords found. Add one to get started.
                          </TableCell>
                        </TableRow>
                      )}
                    </TableBody>
                  )}
                </Droppable>
              </Table>
            </DragDropContext>
          </div>
        </div>
      </div>
        </TabsContent>
      </Tabs>
    </div>
  );
}
