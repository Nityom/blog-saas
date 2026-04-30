/* eslint-disable @next/next/no-img-element */
"use client";

import { useState, useEffect } from "react";
import { useQuery, useMutation, useAction } from "convex/react";
import { api } from "@/convex/_generated/api";
import { Id } from "@/convex/_generated/dataModel";
import { useParams, useRouter } from "next/navigation";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { toast } from "sonner";
import Link from "next/link";
import { ArrowLeft, Save, Globe, Trash2, AlertTriangle, CheckCircle2 } from "lucide-react";
import dynamic from 'next/dynamic';

const MDEditor = dynamic(() => import('@uiw/react-md-editor'), { ssr: false });

export default function EditPostPage() {
  const params = useParams();
  const router = useRouter();
  const clinicId = params.clinicId as string;
  const postId = params.postId as string;

  const post = useQuery(api.posts.getById, { postId: postId as Id<"posts"> });
  const clinic = useQuery(api.clinics.getById, { clinicId: clinicId as Id<"clinics"> });
  const updatePost = useMutation(api.posts.update);
  const deletePost = useMutation(api.posts.remove);
  const publishPost = useAction(api.integrations.publishPost);

  const [formData, setFormData] = useState({
    title: "",
    metaTitle: "",
    metaDesc: "",
    excerpt: "",
    content: "",
  });
  
  const [isSaving, setIsSaving] = useState(false);
  const [isPublishing, setIsPublishing] = useState(false);

  useEffect(() => {
    if (post) {
      setFormData({
        title: post.title,
        metaTitle: post.metaTitle,
        metaDesc: post.metaDesc,
        excerpt: post.excerpt,
        content: post.content,
      });
    }
  }, [post]);

  if (post === undefined || clinic === undefined) {
    return <div className="p-8 text-neutral-400">Loading...</div>;
  }

  if (post === null || clinic === null) {
    return <div className="p-8 text-neutral-400">Not found.</div>;
  }

  let safetyReport = { safe: true, riskLevel: "low", flags: [], suggestedEdits: [] };
  try {
    if (post.safetyReport) safetyReport = JSON.parse(post.safetyReport);
  } catch {
    // Ignore parse errors
  }

  const handleSave = async (statusOverride?: "draft" | "published") => {
    setIsSaving(true);
    try {
      await updatePost({
        postId: post._id,
        ...formData,
        ...(statusOverride ? { status: statusOverride } : {})
      });
      toast.success("Post saved!");
    } catch (e: unknown) {
      toast.error((e as Error).message || "Failed to save post");
    } finally {
      setIsSaving(false);
    }
  };

  const handlePublish = async () => {
    if (post.status === "flagged") {
      const confirmOverride = confirm("This post was flagged for safety reasons. Are you sure you want to publish it?");
      if (!confirmOverride) return;
    }
    
    setIsPublishing(true);
    try {
      await updatePost({ postId: post._id, ...formData }); // Save current state
      await publishPost({ postId: post._id });
      toast.success("Post published successfully!");
    } catch (e: unknown) {
      toast.error((e as Error).message || "Failed to publish post");
    } finally {
      setIsPublishing(false);
    }
  };

  const handleDelete = async () => {
    if (confirm("Delete this post? This cannot be undone.")) {
      await deletePost({ postId: post._id });
      router.push(`/clinic/${clinicId}/posts`);
    }
  };

  return (
    <div className="p-4 md:p-8 max-w-7xl mx-auto space-y-6">
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div className="flex items-center gap-4">
          <Link href={`/clinic/${clinicId}/posts`}>
            <Button variant="ghost" size="icon" className="text-neutral-500">
              <ArrowLeft className="h-5 w-5" />
            </Button>
          </Link>
          <div>
            <div className="flex items-center gap-3">
              <h2 className="text-2xl font-bold tracking-tight text-neutral-900 truncate max-w-sm" title={post.title}>
                {post.title}
              </h2>
              <Badge variant="outline" className={
                post.status === "published" ? "text-green-600 border-green-200 bg-green-50" : 
                post.status === "flagged" ? "text-red-600 border-red-200 bg-red-50" : 
                "text-neutral-600 border-neutral-200 bg-neutral-100"
              }>
                {post.status}
              </Badge>
              {clinic.integrationMethod === "wordpress" && post.wordpressPostId && (
                <Badge variant="secondary" className="bg-blue-100 text-blue-800 border-blue-200">
                  WP Synced
                </Badge>
              )}
            </div>
            <p className="text-neutral-500 text-sm">Last updated: {new Date(post.createdAt).toLocaleString()}</p>
          </div>
        </div>
        
        <div className="flex items-center gap-3">
          <Button variant="outline" className="text-red-600 hover:text-red-700 hover:bg-red-50" onClick={handleDelete}>
            <Trash2 className="w-4 h-4 mr-2" /> Delete
          </Button>
          
          <Button variant="outline" onClick={() => handleSave()} disabled={isSaving}>
            <Save className="w-4 h-4 mr-2" /> Save Draft
          </Button>

          {post.status !== "published" && (
            <Button className="bg-green-600 hover:bg-green-700 text-white" onClick={handlePublish} disabled={isPublishing}>
              <Globe className="w-4 h-4 mr-2" /> {isPublishing ? "Publishing..." : "Publish"}
            </Button>
          )}

          {post.status === "published" && (
             <Button variant="outline" className="text-amber-600 hover:bg-amber-50" onClick={() => handleSave("draft")}>
               Unpublish
             </Button>
          )}
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <div className="lg:col-span-2 space-y-6">
          <Card className="bg-white border-neutral-200">
            <CardHeader>
              <CardTitle>Content</CardTitle>
            </CardHeader>
            <CardContent>
              <div data-color-mode="light">
                <MDEditor
                  value={formData.content}
                  onChange={(val) => setFormData({...formData, content: val || ""})}
                  height={600}
                  className="w-full"
                />
              </div>
            </CardContent>
          </Card>
        </div>

        <div className="space-y-6">
          {post.status === "flagged" && (
            <Card className="bg-red-50 border-red-200">
              <CardHeader className="pb-3">
                <CardTitle className="text-red-700 flex items-center gap-2 text-lg">
                  <AlertTriangle className="w-5 h-5" /> Safety Review Flagged
                </CardTitle>
              </CardHeader>
              <CardContent className="text-sm text-red-900 space-y-4">
                <p>This content was flagged by the AI safety checker as <strong>{safetyReport.riskLevel} risk</strong>.</p>
                
                {safetyReport.flags && safetyReport.flags.length > 0 && (
                  <div>
                    <strong className="block mb-1">Issues Found:</strong>
                    <ul className="list-disc pl-5 space-y-1">
                      {safetyReport.flags.map((f: string, i: number) => <li key={i}>{f}</li>)}
                    </ul>
                  </div>
                )}
              </CardContent>
            </Card>
          )}

          {post.status !== "flagged" && safetyReport.riskLevel === "low" && (
            <Card className="bg-green-50 border-green-200">
               <CardContent className="p-4 flex items-center gap-3 text-green-800 text-sm">
                 <CheckCircle2 className="w-5 h-5" />
                 Content passed safety review.
               </CardContent>
            </Card>
          )}

          <Card className="bg-white border-neutral-200">
            <CardHeader>
              <CardTitle>SEO & Meta</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="title">Post Title (H1)</Label>
                <Input id="title" value={formData.title} onChange={(e) => setFormData({...formData, title: e.target.value})} />
              </div>
              <div className="space-y-2">
                <Label htmlFor="metaTitle">Meta Title</Label>
                <Input id="metaTitle" value={formData.metaTitle} onChange={(e) => setFormData({...formData, metaTitle: e.target.value})} />
                <p className="text-xs text-neutral-500">{formData.metaTitle.length}/60 chars</p>
              </div>
              <div className="space-y-2">
                <Label htmlFor="metaDesc">Meta Description</Label>
                <textarea 
                  id="metaDesc" 
                  className="w-full min-h-[80px] p-2 text-sm border border-neutral-200 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                  value={formData.metaDesc} 
                  onChange={(e) => setFormData({...formData, metaDesc: e.target.value})} 
                />
                <p className="text-xs text-neutral-500">{formData.metaDesc.length}/155 chars</p>
              </div>
              <div className="space-y-2">
                <Label htmlFor="excerpt">Excerpt</Label>
                <textarea 
                  id="excerpt" 
                  className="w-full min-h-[80px] p-2 text-sm border border-neutral-200 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                  value={formData.excerpt} 
                  onChange={(e) => setFormData({...formData, excerpt: e.target.value})} 
                />
              </div>
            </CardContent>
          </Card>

          <Card className="bg-white border-neutral-200">
            <CardHeader>
              <CardTitle>Featured Image</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
               <img src={post.imageUrl} alt="Featured" className="w-full h-48 object-cover rounded-md" />
               <p className="text-xs text-center text-neutral-500">
                 Photo by <a href={post.imageCreditUrl} target="_blank" className="text-blue-500 hover:underline">{post.imageCredit}</a> on Pexels
               </p>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}
