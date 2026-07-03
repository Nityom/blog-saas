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
import { ArrowLeft, Save, Globe, Trash2, AlertTriangle, CheckCircle2, Upload, RotateCcw, RefreshCw } from "lucide-react";
import dynamic from 'next/dynamic';
import { parseJsonFromText } from "@/lib/json";
import ContentScoreCard from "@/components/ContentScoreCard";

const MDEditor = dynamic(() => import('@uiw/react-md-editor'), { ssr: false });

export default function EditPostPage() {
  const params = useParams();
  const router = useRouter();
  const clinicId = params.clinicId as string;
  const postId = params.postId as string;

  const post = useQuery(api.posts.getById, { postId: postId as Id<"posts"> });
  const clinic = useQuery(api.clinics.getById, { clinicId: clinicId as Id<"clinics"> });
  const socialPosts = useQuery(api.socialOps.getByPost, { postId: postId as Id<"posts"> });
  const keywords = useQuery(api.keywords.getByClinic, { clinicId: clinicId as Id<"clinics"> });
  const updatePost = useMutation(api.posts.update);
  const deletePost = useMutation(api.posts.remove);
  const publishPost = useAction(api.integrations.publishPost);
  const postToFacebook = useAction(api.social.postToFacebook);
  const postToInstagram = useAction(api.social.postToInstagram);
  const generateUploadUrl = useMutation(api.posts.generateUploadUrl);
  const refreshImageAction = useAction(api.posts.refreshImage);

  const [formData, setFormData] = useState({
    title: "",
    metaTitle: "",
    metaDesc: "",
    excerpt: "",
    content: "",
    imageUrl: "",
    imageCredit: "",
    imageCreditUrl: "",
  });
  
  const [isSaving, setIsSaving] = useState(false);
  const [isPublishing, setIsPublishing] = useState(false);
  const [isUploading, setIsUploading] = useState(false);
  const [isRefreshingImage, setIsRefreshingImage] = useState(false);
  const [savedFormData, setSavedFormData] = useState(formData);
  const [isInitialized, setIsInitialized] = useState(false);

  useEffect(() => {
    if (post && !isInitialized) {
      const nextFormData = {
        title: post.title,
        metaTitle: post.metaTitle,
        metaDesc: post.metaDesc,
        excerpt: post.excerpt,
        content: post.content,
        imageUrl: post.imageUrl || "",
        imageCredit: post.imageCredit || "",
        imageCreditUrl: post.imageCreditUrl || "",
      };

      setFormData(nextFormData);
      setSavedFormData(nextFormData);
      setIsInitialized(true);
    }
  }, [post, isInitialized]);

  if (post === undefined || clinic === undefined || socialPosts === undefined || keywords === undefined) {
    return <div className="p-8 text-neutral-400">Loading...</div>;
  }

  if (post === null || clinic === null) {
    return <div className="p-8 text-neutral-400">Not found.</div>;
  }

  let safetyReport = { safe: true, riskLevel: "low", flags: [], suggestedEdits: [] };
  let socialContentData: {
    facebook?: { postText?: string; hashtags?: string[] };
    instagram?: { storyText?: string; caption?: string; hashtags?: string[] };
  } | null = null;
  try {
    if (post.safetyReport) safetyReport = parseJsonFromText(post.safetyReport);
  } catch {
    // Ignore parse errors
  }

  try {
    if (post.socialContent) socialContentData = parseJsonFromText(post.socialContent);
  } catch {
    socialContentData = null;
  }

  const handleRefreshImage = async () => {
    setIsRefreshingImage(true);
    try {
      const result = await refreshImageAction({ postId: postId as Id<"posts"> });
      setFormData((prev) => ({
        ...prev,
        imageUrl: result.imageUrl,
        imageCredit: result.imageCredit,
        imageCreditUrl: result.imageCreditUrl,
      }));
      toast.success("Image refreshed from Pexels!");
    } catch {
      toast.error("Failed to refresh image");
    } finally {
      setIsRefreshingImage(false);
    }
  };

  const handleImageUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setIsUploading(true);
    try {
      const postUrl = await generateUploadUrl();
      const result = await fetch(postUrl, {
        method: "POST",
        headers: { "Content-Type": file.type },
        body: file,
      });
      const { storageId } = await result.json();
      
      await updatePost({
        postId: post._id,
        storageId,
      });
      
      toast.success("Image uploaded successfully!");
    } catch {
      toast.error("Failed to upload image");
    } finally {
      setIsUploading(false);
    }
  };

  const handleSave = async (statusOverride?: "draft" | "published") => {
    setIsSaving(true);
    try {
      const nextFormData = {
        ...formData,
        ...(statusOverride ? { status: statusOverride } : {}),
      };

      await updatePost({
        postId: post._id,
        ...nextFormData,
      });
      setSavedFormData(formData);
      toast.success("Post saved!");
    } catch (e: unknown) {
      toast.error((e as Error).message || "Failed to save post");
    } finally {
      setIsSaving(false);
    }
  };

  const handleUndoChanges = () => {
    setFormData(savedFormData);
    toast.success("Reverted unsaved changes");
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

  const latestFacebook = socialPosts.find((entry) => entry.platform === "facebook");
  const latestInstagram = socialPosts.find((entry) => entry.platform === "instagram");

  const handleManualPost = async (platform: "facebook" | "instagram") => {
    try {
      if (platform === "facebook") {
        await postToFacebook({ clinicId: clinic._id, postId: post._id });
      } else {
        await postToInstagram({ clinicId: clinic._id, postId: post._id });
      }
      toast.success(`Queued ${platform} post`);
    } catch (error: unknown) {
      toast.error((error as Error).message || `Failed to post to ${platform}`);
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
          <Button variant="outline" onClick={handleUndoChanges}>
            <RotateCcw className="w-4 h-4 mr-2" /> Undo Changes
          </Button>

          <Button variant="outline" className="text-red-600 hover:text-red-700 hover:bg-red-50" onClick={handleDelete}>
            <Trash2 className="w-4 h-4 mr-2" /> Delete
          </Button>
          
          <Button variant="outline" onClick={() => handleSave()} disabled={isSaving}>
            <Save className="w-4 h-4 mr-2" /> Save Changes
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

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 items-stretch">
        <div className="lg:col-span-2 flex flex-col">
          <Card className="bg-white border-neutral-200 flex-1 flex flex-col min-h-[600px]">
            <CardHeader>
              <CardTitle>Content</CardTitle>
            </CardHeader>
            <CardContent className="flex-1 flex flex-col min-h-0 pb-6">
              <div data-color-mode="light" className="flex-1 h-full">
                <MDEditor
                  value={formData.content}
                  onChange={(val) => setFormData({...formData, content: val || ""})}
                  height="100%"
                  className="w-full h-full min-h-[500px] !border-0"
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

          <ContentScoreCard
            content={formData.content}
            title={formData.title}
            metaTitle={formData.metaTitle}
            metaDesc={formData.metaDesc}
            keyword={keywords?.find((k) => k._id === post.keywordId)?.term || ""}
          />

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

          {post.socialContent && (
            <Card className="bg-white border-neutral-200">
              <CardHeader>
                <CardTitle>Social Preview</CardTitle>
              </CardHeader>
              <CardContent className="space-y-4 text-sm">
                {latestFacebook && (
                  <div className="rounded-lg border border-neutral-200 p-4 space-y-2">
                    <div className="flex items-center justify-between gap-2">
                      <div className="flex items-center gap-2 font-medium text-neutral-900">Facebook</div>
                      <Badge variant="outline" className={
                        latestFacebook.status === "posted" ? "text-green-700 bg-green-50 border-green-200" :
                        latestFacebook.status === "failed" ? "text-red-700 bg-red-50 border-red-200" :
                        "text-neutral-700 bg-neutral-100 border-neutral-200"
                      }>
                        {latestFacebook.status}
                      </Badge>
                    </div>
                    <p className="text-neutral-700 whitespace-pre-line">{socialContentData?.facebook?.postText}</p>
                    <p className="text-xs text-neutral-500">{socialContentData?.facebook?.hashtags?.join(" ")}</p>
                    {latestFacebook.status === "failed" && (
                      <Button variant="outline" size="sm" onClick={() => handleManualPost("facebook")}>Retry Post</Button>
                    )}
                    {latestFacebook.status === "posted" && latestFacebook.platformPostId && (
                      <a href={`https://www.facebook.com/${clinic.metaPageId}/posts/${latestFacebook.platformPostId}`} target="_blank" rel="noreferrer">
                        <Button variant="ghost" size="sm" className="text-blue-600 hover:bg-blue-50">View on Facebook</Button>
                      </a>
                    )}
                  </div>
                )}

                {latestInstagram && (
                  <div className="rounded-lg border border-neutral-200 p-4 space-y-2">
                    <div className="flex items-center justify-between gap-2">
                      <div className="flex items-center gap-2 font-medium text-neutral-900">Instagram Story</div>
                      <Badge variant="outline" className={
                        latestInstagram.status === "posted" ? "text-green-700 bg-green-50 border-green-200" :
                        latestInstagram.status === "failed" ? "text-red-700 bg-red-50 border-red-200" :
                        "text-neutral-700 bg-neutral-100 border-neutral-200"
                      }>
                        {latestInstagram.status}
                      </Badge>
                    </div>
                    <p className="text-neutral-700 font-semibold text-base whitespace-pre-line">{socialContentData?.instagram?.storyText}</p>
                    <p className="text-neutral-600 whitespace-pre-line">{socialContentData?.instagram?.caption}</p>
                    <p className="text-xs text-neutral-500">{socialContentData?.instagram?.hashtags?.join(" ")}</p>
                    {latestInstagram.status === "failed" && (
                      <Button variant="outline" size="sm" onClick={() => handleManualPost("instagram")}>Retry</Button>
                    )}
                  </div>
                )}

                {(!latestFacebook || latestFacebook.status !== "posted") && (
                  <Button className="w-full bg-blue-600 hover:bg-blue-700 text-white" onClick={() => handleManualPost("facebook")}>Post to Facebook Now</Button>
                )}
                {(!latestInstagram || latestInstagram.status !== "posted") && (
                  <Button variant="outline" className="w-full" onClick={() => handleManualPost("instagram")}>Post to Instagram Now</Button>
                )}
              </CardContent>
            </Card>
          )}

          <Card className="bg-white border-neutral-200">
            <CardHeader className="flex flex-row items-center justify-between pb-2">
              <CardTitle>Featured Image</CardTitle>
              <div className="flex items-center gap-2">
                <button
                  onClick={handleRefreshImage}
                  disabled={isRefreshingImage}
                  className="inline-flex items-center justify-center rounded-[min(var(--radius-md),12px)] border border-border bg-background hover:bg-muted hover:text-foreground h-7 gap-1 px-2.5 text-[0.8rem] font-medium transition-all disabled:opacity-50"
                >
                  <RefreshCw className={`w-4 h-4 mr-2 ${isRefreshingImage ? 'animate-spin' : ''}`} />
                  {isRefreshingImage ? "Refreshing..." : "Refresh from Pexels"}
                </button>
                <input
                  type="file"
                  id="imageUpload"
                  className="hidden"
                  accept="image/*"
                  onChange={handleImageUpload}
                  disabled={isUploading}
                />
                <label htmlFor="imageUpload" className="cursor-pointer">
                  <div className="inline-flex items-center justify-center rounded-[min(var(--radius-md),12px)] border border-border bg-background hover:bg-muted hover:text-foreground h-7 gap-1 px-2.5 text-[0.8rem] font-medium transition-all" {...(isUploading ? {style: {opacity: 0.5, pointerEvents: 'none'}} : {})}>
                    <Upload className="w-4 h-4 mr-2" />
                    {isUploading ? "Uploading..." : "Upload Image"}
                  </div>
                </label>
              </div>
            </CardHeader>
            <CardContent className="space-y-4">
              {formData.imageUrl ? (
                <img src={formData.imageUrl} alt="Featured" className="w-full h-48 object-cover rounded-md border border-neutral-200" />
              ) : (
                <div className="w-full h-48 bg-neutral-100 border border-neutral-200 rounded-md flex items-center justify-center text-neutral-400">No Image</div>
              )}
               <div className="space-y-2 mt-4">
                 <Label htmlFor="imageUrl">Image URL</Label>
                 <Input id="imageUrl" value={formData.imageUrl} onChange={(e) => setFormData({...formData, imageUrl: e.target.value})} placeholder="https://images.pexels.com/..." />
               </div>
               <div className="grid grid-cols-2 gap-4">
                 <div className="space-y-2">
                   <Label htmlFor="imageCredit">Credit Name</Label>
                   <Input id="imageCredit" value={formData.imageCredit} onChange={(e) => setFormData({...formData, imageCredit: e.target.value})} placeholder="Photographer Name" />
                 </div>
                 <div className="space-y-2">
                   <Label htmlFor="imageCreditUrl">Credit URL</Label>
                   <Input id="imageCreditUrl" value={formData.imageCreditUrl} onChange={(e) => setFormData({...formData, imageCreditUrl: e.target.value})} placeholder="https://ununsplash.com/..." />
                 </div>
               </div>
               <p className="text-xs text-center text-neutral-500 mt-2">
                 Photo by <a href={formData.imageCreditUrl} target="_blank" className="text-blue-500 hover:underline">{formData.imageCredit || "Unknown"}</a>
               </p>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}
