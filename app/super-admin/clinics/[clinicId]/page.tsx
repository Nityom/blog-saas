"use client";

import { useQuery, useMutation } from "convex/react";
import { api } from "@/convex/_generated/api";
import { Id } from "@/convex/_generated/dataModel";
import { useParams, useRouter, useSearchParams } from "next/navigation";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import Link from "next/link";
import { ArrowLeft, PlayCircle, Trash2, Edit, RefreshCw, AlertTriangle, Upload } from "lucide-react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useState, useEffect } from "react";
import { toast } from "sonner";
import { useAction } from "convex/react";

export default function ClinicDetailsPage() {
  const params = useParams();
  const searchParams = useSearchParams();
  const router = useRouter();
  const clinicId = params.clinicId as string;

  const clinic = useQuery(api.clinics.getById, { clinicId: clinicId as Id<"clinics"> });
  const posts = useQuery(api.posts.getByClinic, { clinicId: clinicId as Id<"clinics"> });
  const keywords = useQuery(api.keywords.getByClinic, { clinicId: clinicId as Id<"clinics"> });
  const socialPosts = useQuery(api.socialOps.getByClinic, { clinicId: clinicId as Id<"clinics"> });
  const removeClinic = useMutation(api.clinics.remove);
  const updateClinic = useMutation(api.clinics.update);
  const clearMetaConnection = useMutation(api.clinics.clearMetaConnection);
  const deletePost = useMutation(api.posts.remove);
  const generateUploadUrl = useMutation(api.posts.generateUploadUrl);
  const postToFacebook = useAction(api.social.postToFacebook);
  const postToInstagram = useAction(api.social.postToInstagram);

  const [isEditing, setIsEditing] = useState(false);
  const [customDomain, setCustomDomain] = useState("");
  const [isSaving, setIsSaving] = useState(false);
  const [isUpdatingSocial, setIsUpdatingSocial] = useState(false);
  const [logoFile, setLogoFile] = useState<File | null>(null);
  const [logoPreview, setLogoPreview] = useState<string | null>(null);
  const [isUploadingLogo, setIsUploadingLogo] = useState(false);
  const [logoUrl, setLogoUrl] = useState("");
  const [isLogoDialogOpen, setIsLogoDialogOpen] = useState(false);
  const [logoInputMode, setLogoInputMode] = useState<"file" | "url">("file");
  const [socialSettings, setSocialSettings] = useState({
    autoPostFacebook: false,
    autoPostInstagram: false,
  });

  useEffect(() => {
    if (clinic) {
      setCustomDomain(clinic.customDomain || "");
      setSocialSettings({
        autoPostFacebook: clinic.autoPostFacebook ?? false,
        autoPostInstagram: clinic.autoPostInstagram ?? false,
      });
    }
  }, [clinic]);

  useEffect(() => {
    const socialSuccess = searchParams.get("socialSuccess");
    const socialDisconnected = searchParams.get("socialDisconnected");
    const socialError = searchParams.get("socialError");

    if (socialSuccess === "1") {
      toast.success("Facebook + Instagram connected!");
    }
    if (socialDisconnected === "1") {
      toast.success("Social account disconnected");
    }
    if (socialError) {
      toast.error(`Social connection error: ${socialError}`);
    }
  }, [searchParams]);

  if (clinic === undefined || posts === undefined || keywords === undefined || socialPosts === undefined) {
    return <div className="p-8 text-neutral-400">Loading clinic details...</div>;
  }

  if (clinic === null) {
    return <div className="p-8 text-neutral-400">Clinic not found.</div>;
  }

  const handleDelete = async () => {
    if (confirm("Are you sure you want to delete this clinic? This cannot be undone.")) {
      await removeClinic({ clinicId: clinic._id });
      router.push("/super-admin");
    }
  };

  const handleDeletePost = async (postId: Id<"posts">) => {
    if (confirm("Are you sure you want to delete this post? This cannot be undone.")) {
      await deletePost({ postId });
      toast.success("Post deleted");
    }
  };

  const handleSaveDomain = async () => {
    setIsSaving(true);
    try {
      await updateClinic({
        clinicId: clinic._id,
        customDomain: customDomain || undefined,
      });
      toast.success("Domain updated!");
      setIsEditing(false);
    } catch (e: unknown) {
      toast.error((e as Error).message || "Failed to update domain");
    } finally {
      setIsSaving(false);
    }
  };

  const handleToggleSocial = async (field: "autoPostFacebook" | "autoPostInstagram", value: boolean) => {
    setIsUpdatingSocial(true);
    try {
      const payload: {
        clinicId: Id<"clinics">;
        autoPostFacebook?: boolean;
        autoPostInstagram?: boolean;
      } = {
        clinicId: clinic._id,
        [field]: value,
      };
      await updateClinic(payload);
      setSocialSettings((prev) => ({ ...prev, [field]: value }));
      toast.success("Social settings updated");
    } catch (error: unknown) {
      toast.error((error as Error).message || "Failed to update social settings");
    } finally {
      setIsUpdatingSocial(false);
    }
  };

  const handleReconnect = () => {
    window.location.href = `/api/connect/facebook/${clinic._id}`;
  };

  const handleDisconnect = async () => {
    setIsUpdatingSocial(true);
    try {
      await clearMetaConnection({ clinicId: clinic._id });
      toast.success("Social account disconnected");
    } catch (error: unknown) {
      toast.error((error as Error).message || "Failed to disconnect social account");
    } finally {
      setIsUpdatingSocial(false);
    }
  };

  const failedSocialCount = socialPosts.filter((post) => post.status === "failed").length;
  const tokenExpiresInDays = clinic.metaTokenExpiresAt ? Math.ceil((clinic.metaTokenExpiresAt - Date.now()) / (24 * 60 * 60 * 1000)) : null;

  const handleLogoSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      setLogoFile(file);
      const url = URL.createObjectURL(file);
      setLogoPreview(url);
    }
  };

  const removeLogo = () => {
    setLogoFile(null);
    if (logoPreview) {
      URL.revokeObjectURL(logoPreview);
      setLogoPreview(null);
    }
  };

  const handleUploadLogo = async () => {
    if (!logoFile) return;
    setIsUploadingLogo(true);
    try {
      const postUrl = await generateUploadUrl();
      const result = await fetch(postUrl, {
        method: "POST",
        headers: { "Content-Type": logoFile.type },
        body: logoFile,
      });
      const { storageId } = await result.json();
      
      // Get the URL from the storageId
      const logoUrlResponse = await fetch("/api/logo-url", {
        method: "POST",
        body: JSON.stringify({ storageId }),
      });
      
      if (!logoUrlResponse.ok) {
        throw new Error("Failed to get logo URL");
      }
      
      const { url: logoUrl } = await logoUrlResponse.json();
      
      await updateClinic({
        clinicId: clinic._id,
        logoUrl,
      });
      
      toast.success("Logo uploaded successfully!");
      removeLogo();
      setIsLogoDialogOpen(false);
    } catch (error: unknown) {
      toast.error((error as Error).message || "Failed to upload logo");
    } finally {
      setIsUploadingLogo(false);
    }
  };

  const handleLogoUrlSubmit = async () => {
    if (!logoUrl.trim()) {
      toast.error("Please enter a logo URL");
      return;
    }
    
    setIsUploadingLogo(true);
    try {
      await updateClinic({
        clinicId: clinic._id,
        logoUrl: logoUrl.trim(),
      });
      
      toast.success("Logo URL saved successfully!");
      setLogoUrl("");
      setIsLogoDialogOpen(false);
    } catch (error: unknown) {
      toast.error((error as Error).message || "Failed to save logo URL");
    } finally {
      setIsUploadingLogo(false);
    }
  };

  return (
    <div className="p-8 max-w-6xl mx-auto space-y-6">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-4">
          <Link href="/super-admin">
            <Button variant="ghost" size="icon" className="text-neutral-500 hover:text-neutral-900 hover:bg-neutral-100">
              <ArrowLeft className="h-5 w-5" />
            </Button>
          </Link>
          <div>
            <h2 className="text-2xl font-bold text-neutral-900 tracking-tight flex items-center gap-3">
              {clinic.name}
              {clinic.active ? (
                <Badge className="bg-green-100 text-green-700 hover:bg-green-200 border-green-200">Active</Badge>
              ) : (
                <Badge className="bg-neutral-100 text-neutral-600 hover:bg-neutral-200 border-neutral-200">Paused</Badge>
              )}
            </h2>
            <p className="text-neutral-500">{clinic.city} • {clinic.integrationMethod} integration</p>
          </div>
        </div>
        <div className="flex items-center gap-3">
          <Link href={`/super-admin/clinics/${clinic._id}/generate`}>
            <Button className="bg-blue-600 hover:bg-blue-700 text-white gap-2 shadow-sm">
              <PlayCircle className="w-4 h-4" />
              Generate Post
            </Button>
          </Link>
          <Link href={`/clinic/${clinic._id}`} target="_blank">
            <Button variant="outline" className="border-neutral-200 text-neutral-700 hover:text-neutral-900 hover:bg-neutral-50 shadow-sm">
              Tenant Portal
            </Button>
          </Link>
        </div>
      </div>

      <Tabs defaultValue="overview" orientation="vertical" className="w-full flex md:flex-row flex-col gap-6">
        <TabsList className="flex flex-col bg-white border border-neutral-200 text-neutral-600 p-2 shadow-sm rounded-lg w-full md:w-48 xl:w-56 shrink-0 h-fit items-stretch justify-start">
          <TabsTrigger value="overview" className="data-[state=active]:bg-blue-50 data-[state=active]:text-blue-700 data-[state=active]:shadow-none rounded-md px-3 py-2 text-sm justify-start">Overview</TabsTrigger>
          <TabsTrigger value="posts" className="data-[state=active]:bg-blue-50 data-[state=active]:text-blue-700 data-[state=active]:shadow-none rounded-md px-3 py-2 text-sm justify-start">Posts ({posts.length})</TabsTrigger>
          <TabsTrigger value="keywords" className="data-[state=active]:bg-blue-50 data-[state=active]:text-blue-700 data-[state=active]:shadow-none rounded-md px-3 py-2 text-sm justify-start">Keywords ({keywords.length})</TabsTrigger>
          <TabsTrigger value="social" className="data-[state=active]:bg-blue-50 data-[state=active]:text-blue-700 data-[state=active]:shadow-none rounded-md px-3 py-2 text-sm justify-start">Social</TabsTrigger>
          <TabsTrigger value="danger" className="data-[state=active]:bg-red-50 data-[state=active]:text-red-700 data-[state=active]:shadow-none rounded-md px-3 py-2 text-sm justify-start">Danger Zone</TabsTrigger>
        </TabsList>
        
        <TabsContent value="overview" className="space-y-6 flex-1 min-w-0">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            <Card className="bg-white border-neutral-200 shadow-sm">
              <CardHeader className="pb-2">
                <CardTitle className="text-sm font-medium text-neutral-500">Published Posts</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="text-3xl font-bold text-neutral-900">{posts.filter(p => p.status === "published").length}</div>
              </CardContent>
            </Card>
            <Card className="bg-white border-neutral-200 shadow-sm">
              <CardHeader className="pb-2">
                <CardTitle className="text-sm font-medium text-neutral-500">Drafts & Flagged</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="text-3xl font-bold text-neutral-900">{posts.filter(p => p.status === "draft" || p.status === "flagged").length}</div>
              </CardContent>
            </Card>
            <Card className="bg-white border-neutral-200 shadow-sm">
              <CardHeader className="pb-2">
                <CardTitle className="text-sm font-medium text-neutral-500">Active Keywords</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="text-3xl font-bold text-neutral-900">{keywords.filter(k => !k.paused).length}</div>
              </CardContent>
            </Card>
          </div>

          <Card className="bg-white border-neutral-200 shadow-sm">
            <CardHeader>
              <CardTitle className="text-neutral-900">Clinic Logo</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              {clinic.logoUrl ? (
                <div className="space-y-3">
                  <div className="inline-block border border-neutral-200 rounded-lg p-2 bg-neutral-50">
                    {/* eslint-disable-next-line @next/next/no-img-element */}
                    <img src={clinic.logoUrl} alt="Clinic Logo" className="h-16 w-auto object-contain" />
                  </div>
                  <p className="text-sm text-neutral-600">Current logo will be displayed in blog headers and public pages.</p>
                </div>
              ) : (
                <p className="text-sm text-neutral-500">No logo uploaded yet.</p>
              )}
              
              <Dialog open={isLogoDialogOpen} onOpenChange={setIsLogoDialogOpen}>
                <DialogTrigger>
                  <Button className="bg-blue-600 hover:bg-blue-700 text-white" disabled={isUploadingLogo}>
                    <Upload className="w-4 h-4 mr-2" />
                    Change Logo
                  </Button>
                </DialogTrigger>
                <DialogContent className="bg-white border-neutral-200">
                  <DialogHeader>
                    <DialogTitle className="text-neutral-900">Upload Clinic Logo</DialogTitle>
                  </DialogHeader>
                  <div className="space-y-4 pt-4">
                    {/* Tab-like buttons */}
                    <div className="flex gap-2 border-b border-neutral-200">
                      <button
                        onClick={() => setLogoInputMode("file")}
                        className={`px-4 py-2 text-sm font-medium border-b-2 transition-colors ${
                          logoInputMode === "file"
                            ? "border-blue-600 text-blue-600"
                            : "border-transparent text-neutral-600 hover:text-neutral-900"
                        }`}
                      >
                        Upload File
                      </button>
                      <button
                        onClick={() => setLogoInputMode("url")}
                        className={`px-4 py-2 text-sm font-medium border-b-2 transition-colors ${
                          logoInputMode === "url"
                            ? "border-blue-600 text-blue-600"
                            : "border-transparent text-neutral-600 hover:text-neutral-900"
                        }`}
                      >
                        Paste URL
                      </button>
                    </div>

                    {/* File Upload */}
                    {logoInputMode === "file" && (
                      <div className="space-y-3">
                        {logoPreview ? (
                          <div className="space-y-3">
                            <div className="inline-block border-2 border-neutral-300 rounded-lg p-2">
                              <img src={logoPreview} alt="Preview" className="h-16 w-auto object-contain" />
                            </div>
                            <div className="flex gap-2">
                              <Button onClick={handleUploadLogo} disabled={isUploadingLogo} className="bg-blue-600 hover:bg-blue-700 text-white">
                                {isUploadingLogo ? "Uploading..." : "Upload Logo"}
                              </Button>
                              <Button onClick={removeLogo} variant="outline" className="border-neutral-200">
                                Cancel
                              </Button>
                            </div>
                          </div>
                        ) : (
                          <div>
                            <input
                              type="file"
                              id="clinicLogoUpload"
                              className="hidden"
                              accept="image/*"
                              onChange={handleLogoSelect}
                              disabled={isUploadingLogo}
                            />
                            <label htmlFor="clinicLogoUpload" className="cursor-pointer block">
                              <div className="border-2 border-dashed border-neutral-300 rounded-lg p-6 text-center hover:border-neutral-400 transition-colors" {...(isUploadingLogo ? {style: {opacity: 0.5, pointerEvents: 'none'}} : {})}>
                                <Upload className="w-6 h-6 mx-auto mb-2 text-neutral-400" />
                                <p className="text-sm text-neutral-600">Click to upload or drag and drop</p>
                                <p className="text-xs text-neutral-500">PNG, JPG, SVG up to 10MB</p>
                              </div>
                            </label>
                          </div>
                        )}
                      </div>
                    )}

                    {/* URL Input */}
                    {logoInputMode === "url" && (
                      <div className="space-y-3">
                        <div>
                          <Label htmlFor="logoUrl" className="text-neutral-700">Logo URL</Label>
                          <Input
                            id="logoUrl"
                            type="url"
                            placeholder="https://example.com/logo.png"
                            value={logoUrl}
                            onChange={(e) => setLogoUrl(e.target.value)}
                            className="bg-white border-neutral-200 text-neutral-900 mt-1"
                            disabled={isUploadingLogo}
                          />
                          <p className="text-xs text-neutral-500 mt-1">Enter the full URL to your clinic logo image</p>
                        </div>
                        {logoUrl && (
                          <div className="border border-neutral-200 rounded-lg p-3 bg-neutral-50">
                            <p className="text-xs text-neutral-600 mb-2">Preview:</p>
                            {/* eslint-disable-next-line @next/next/no-img-element */}
                            <img src={logoUrl} alt="Logo Preview" className="h-16 w-auto object-contain" onError={() => toast.error("Failed to load image from URL")} />
                          </div>
                        )}
                        <Button onClick={handleLogoUrlSubmit} disabled={isUploadingLogo || !logoUrl.trim()} className="w-full bg-blue-600 hover:bg-blue-700 text-white">
                          {isUploadingLogo ? "Saving..." : "Save Logo URL"}
                        </Button>
                      </div>
                    )}
                  </div>
                </DialogContent>
              </Dialog>
            </CardContent>
          </Card>

          <Card className="bg-white border-neutral-200 shadow-sm">
            <CardHeader className="flex flex-row items-center justify-between">
              <CardTitle className="text-neutral-900">Configuration</CardTitle>
              {clinic.integrationMethod === "hosted" && (
                <Dialog open={isEditing} onOpenChange={setIsEditing}>
                  <DialogTrigger render={<Button variant="ghost" size="sm" className="text-neutral-500 hover:text-neutral-900 hover:bg-neutral-100" />}>
                    <Edit className="w-4 h-4 mr-2" />
                    Edit Domain
                  </DialogTrigger>
                  <DialogContent className="bg-white border-neutral-200">
                    <DialogHeader>
                      <DialogTitle className="text-neutral-900">Edit Custom Domain</DialogTitle>
                    </DialogHeader>
                    <div className="space-y-4 pt-4">
                      <div className="space-y-2">
                        <Label htmlFor="customDomain" className="text-neutral-700">Custom Domain</Label>
                        <Input
                          id="customDomain"
                          value={customDomain}
                          onChange={(e) => setCustomDomain(e.target.value)}
                          className="bg-white border-neutral-200 text-neutral-900"
                          placeholder="blog.titaniumsmiles.in"
                        />
                        <p className="text-xs text-neutral-500">Do not include https://</p>
                      </div>
                      <Button onClick={handleSaveDomain} disabled={isSaving} className="w-full bg-blue-600 hover:bg-blue-700 text-white shadow-sm">
                        {isSaving ? "Saving..." : "Save Changes"}
                      </Button>
                    </div>
                  </DialogContent>
                </Dialog>
              )}
            </CardHeader>
            <CardContent className="space-y-4 text-sm text-neutral-600">
              <div className="grid grid-cols-2 gap-4">
                <div><span className="text-neutral-900 font-medium block mb-1">Services</span> {clinic.services.join(", ")}</div>
                <div><span className="text-neutral-900 font-medium block mb-1">Doctors</span> {clinic.doctorNames.join(", ")}</div>
                <div><span className="text-neutral-900 font-medium block mb-1">Target Age</span> {clinic.targetAge}</div>
                <div><span className="text-neutral-900 font-medium block mb-1">Tone</span> <span className="capitalize">{clinic.tone}</span></div>
                <div><span className="text-neutral-900 font-medium block mb-1">Booking URL</span> <a href={clinic.bookingUrl} target="_blank" className="text-blue-600 hover:text-blue-700 hover:underline">{clinic.bookingUrl}</a></div>
                {clinic.customDomain && (
                  <div><span className="text-neutral-900 font-medium block mb-1">Custom Domain</span> <a href={`https://${clinic.customDomain}`} target="_blank" className="text-blue-600 hover:text-blue-700 hover:underline">{clinic.customDomain}</a></div>
                )}
                
                {clinic.integrationMethod === "embed" && (
                  <div className="col-span-2 mt-4 p-4 bg-neutral-50 rounded-lg border border-neutral-200 shadow-sm">
                    <span className="text-neutral-900 font-medium block mb-2">Embed Script</span>
                    <code className="text-xs text-blue-600 break-all bg-white p-2 rounded block border border-neutral-100">
                      &lt;script src=&quot;YOUR_DOMAIN/api/embed/{clinic._id}.js&quot;&gt;&lt;/script&gt;<br/>
                      &lt;div id=&quot;dental-blog&quot;&gt;&lt;/div&gt;
                    </code>
                  </div>
                )}
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="posts" className="flex-1 min-w-0">
          <Card className="bg-white border-neutral-200 text-neutral-900 shadow-sm">
            <CardContent className="p-0">
               <div className="divide-y divide-neutral-100">
                  {posts.length === 0 && <div className="p-6 text-center text-neutral-500">No posts yet.</div>}
                  {posts.map(post => (
                    <div key={post._id} className="p-4 flex items-center justify-between hover:bg-neutral-50">
                      <div className="flex-1 min-w-0 mr-4">
                        <div className="font-medium text-neutral-900 truncate">{post.title}</div>
                        <div className="text-xs text-neutral-500 mt-1 flex items-center gap-2">
                          <span>{new Date(post.createdAt).toLocaleDateString()}</span>
                          <span>•</span>
                          <Badge variant="outline" className={
                            post.status === "published" ? "text-green-700 bg-green-50 border-green-200" : 
                            post.status === "flagged" ? "text-red-700 bg-red-50 border-red-200" : 
                            "text-neutral-700 bg-neutral-100 border-neutral-200"
                          }>
                            {post.status}
                          </Badge>
                        </div>
                      </div>
                      <div className="flex items-center gap-2 shrink-0">
                        <Link href={`/clinic/${clinic._id}/posts/${post._id}`}>
                          <Button variant="outline" size="sm" className="text-blue-600 border-neutral-200 hover:bg-blue-50">
                            <Edit className="w-4 h-4" />
                          </Button>
                        </Link>
                        <Button variant="outline" size="sm" className="text-red-600 border-neutral-200 hover:bg-red-50" onClick={() => handleDeletePost(post._id)}>
                          <Trash2 className="w-4 h-4" />
                        </Button>
                      </div>
                    </div>
                  ))}
               </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="keywords" className="flex-1 min-w-0">
          <Card className="bg-white border-neutral-200 text-neutral-900 shadow-sm">
            <CardContent className="p-0">
               <div className="divide-y divide-neutral-100">
                  {keywords.length === 0 && <div className="p-6 text-center text-neutral-500">No keywords found.</div>}
                  {keywords.map(kw => (
                    <div key={kw._id} className="p-4 flex items-center justify-between hover:bg-neutral-50">
                      <div>
                        <div className="font-medium text-neutral-900">{kw.term}</div>
                        <div className="text-xs text-neutral-500 mt-1">{kw.localVariant}</div>
                      </div>
                      <div className="text-right text-sm text-neutral-500">
                        Score: <span className="font-medium text-neutral-900">{kw.performanceScore.toFixed(2)}</span>
                      </div>
                    </div>
                  ))}
               </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="social" className="space-y-6 flex-1 min-w-0">
          <Card className="bg-white border-neutral-200 shadow-sm">
            <CardHeader className="flex flex-row items-center justify-between gap-4">
              <div>
                <CardTitle className="text-neutral-900">Connection Status</CardTitle>
                <p className="text-sm text-neutral-500 mt-1">Facebook Page and Instagram Business connection for automatic posting.</p>
              </div>
              <div className="flex items-center gap-2">
                <Button variant="outline" onClick={handleReconnect} disabled={isUpdatingSocial} className="border-neutral-200 text-neutral-700">
                  <RefreshCw className="w-4 h-4 mr-2" />
                  {clinic.metaPageId ? "Reconnect" : "Connect"}
                </Button>
                <Button variant="outline" onClick={handleDisconnect} disabled={isUpdatingSocial} className="border-neutral-200 text-red-600 hover:bg-red-50">
                  Disconnect
                </Button>
              </div>
            </CardHeader>
            <CardContent className="grid grid-cols-1 md:grid-cols-2 gap-4 text-sm">
              <div className="rounded-lg border border-neutral-200 p-4 space-y-2">
                <div className="flex items-center gap-2 font-medium text-neutral-900">Facebook Page</div>
                <div className="text-neutral-600">{clinic.metaPageName || "Not connected"}</div>
                <div className="text-xs text-neutral-500">{clinic.metaPageId ? `Page ID: ${clinic.metaPageId}` : "Connect Meta to enable page posting."}</div>
              </div>
              <div className="rounded-lg border border-neutral-200 p-4 space-y-2">
                <div className="flex items-center gap-2 font-medium text-neutral-900">Instagram</div>
                <div className="text-neutral-600">{clinic.metaInstagramAccountId ? "Connected" : "Not connected"}</div>
                <div className="text-xs text-neutral-500">{clinic.metaInstagramAccountId ? `Account ID: ${clinic.metaInstagramAccountId}` : "Instagram Business is detected from the connected page."}</div>
              </div>
              <div className="rounded-lg border border-neutral-200 p-4 space-y-2 md:col-span-2">
                <div className="font-medium text-neutral-900">Token Status</div>
                <div className="text-neutral-600">
                  {clinic.metaTokenExpiresAt ? new Date(clinic.metaTokenExpiresAt).toLocaleString() : "No Meta token stored"}
                </div>
                {tokenExpiresInDays !== null && (
                  <div className={tokenExpiresInDays <= 0 ? "text-red-600 text-xs" : tokenExpiresInDays <= 7 ? "text-amber-600 text-xs" : "text-neutral-500 text-xs"}>
                    {tokenExpiresInDays <= 0 ? "Token expired" : `Auto-refreshes in ${tokenExpiresInDays} day(s)`}
                  </div>
                )}
              </div>
            </CardContent>
          </Card>

          {clinic.metaTokenExpiresAt && clinic.metaTokenExpiresAt - Date.now() <= 7 * 24 * 60 * 60 * 1000 && (
            <Card className={clinic.metaTokenExpiresAt < Date.now() ? "bg-red-50 border-red-200" : "bg-amber-50 border-amber-200"}>
              <CardContent className="p-4 flex items-center gap-3 text-sm">
                <AlertTriangle className={clinic.metaTokenExpiresAt < Date.now() ? "text-red-600 w-5 h-5" : "text-amber-600 w-5 h-5"} />
                <span className="text-neutral-800">Meta token is {clinic.metaTokenExpiresAt < Date.now() ? "expired" : "expiring soon"}. Reconnect to keep auto-posting active.</span>
              </CardContent>
            </Card>
          )}

          {failedSocialCount > 0 && (
            <Card className="bg-red-50 border-red-200">
              <CardContent className="p-4 text-sm text-red-700">
                {failedSocialCount} social post{failedSocialCount > 1 ? "s" : ""} failed. Review the log below and retry any failed items.
              </CardContent>
            </Card>
          )}

          <Card className="bg-white border-neutral-200 shadow-sm">
            <CardHeader>
              <CardTitle className="text-neutral-900">Auto-post Settings</CardTitle>
            </CardHeader>
            <CardContent className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <label className="flex items-center justify-between gap-4 rounded-lg border border-neutral-200 p-4">
                <div>
                  <div className="font-medium text-neutral-900">Auto-post to Facebook</div>
                  <div className="text-xs text-neutral-500">Send each published blog post to the connected Page.</div>
                </div>
                <input
                  type="checkbox"
                  checked={socialSettings.autoPostFacebook}
                  disabled={isUpdatingSocial || !clinic.metaPageId}
                  onChange={(e) => handleToggleSocial("autoPostFacebook", e.target.checked)}
                  className="h-4 w-4 rounded border-neutral-300 text-blue-600 focus:ring-blue-500"
                />
              </label>
              <label className="flex items-center justify-between gap-4 rounded-lg border border-neutral-200 p-4">
                <div>
                  <div className="font-medium text-neutral-900">Auto-post to Instagram Story</div>
                  <div className="text-xs text-neutral-500">Generate and publish a story after every published blog post.</div>
                </div>
                <input
                  type="checkbox"
                  checked={socialSettings.autoPostInstagram}
                  disabled={isUpdatingSocial || !clinic.metaInstagramAccountId}
                  onChange={(e) => handleToggleSocial("autoPostInstagram", e.target.checked)}
                  className="h-4 w-4 rounded border-neutral-300 text-blue-600 focus:ring-blue-500"
                />
              </label>
            </CardContent>
          </Card>

          <Card className="bg-white border-neutral-200 shadow-sm">
            <CardHeader>
              <CardTitle className="text-neutral-900">Recent Social Posts</CardTitle>
            </CardHeader>
            <CardContent className="p-0">
              <div className="divide-y divide-neutral-100">
                {socialPosts.length === 0 && <div className="p-6 text-center text-neutral-500">No social posts yet.</div>}
                {socialPosts.map((socialPost) => (
                  <div key={socialPost._id} className="p-4 flex flex-col md:flex-row md:items-center md:justify-between gap-4">
                    <div>
                      <div className="font-medium text-neutral-900">{socialPost.postTitle}</div>
                      <div className="text-xs text-neutral-500 mt-1 capitalize">{socialPost.platform}</div>
                    </div>
                    <div className="flex items-center gap-3">
                      <Badge variant="outline" className={
                        socialPost.status === "posted" ? "text-green-700 bg-green-50 border-green-200" :
                        socialPost.status === "failed" ? "text-red-700 bg-red-50 border-red-200" :
                        "text-neutral-700 bg-neutral-100 border-neutral-200"
                      }>
                        {socialPost.status}
                      </Badge>
                      <div className="text-xs text-neutral-500">
                        {socialPost.postedAt ? new Date(socialPost.postedAt).toLocaleString() : new Date(socialPost.createdAt).toLocaleString()}
                      </div>
                      {socialPost.status === "failed" && (
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={async () => {
                            try {
                              if (socialPost.platform === "facebook") {
                                await postToFacebook({ clinicId: clinic._id, postId: socialPost.postId });
                              } else {
                                await postToInstagram({ clinicId: clinic._id, postId: socialPost.postId });
                              }
                              toast.success("Retry started");
                            } catch (error: unknown) {
                              toast.error((error as Error).message || "Retry failed");
                            }
                          }}
                        >
                          Retry
                        </Button>
                      )}
                      {socialPost.status === "posted" && socialPost.platformPostId && (
                        <a
                          href={socialPost.platform === "facebook"
                            ? `https://www.facebook.com/${clinic.metaPageId}/posts/${socialPost.platformPostId}`
                            : `https://www.instagram.com/`}
                          target="_blank"
                          rel="noreferrer"
                        >
                          <Button variant="ghost" size="sm" className="text-blue-600 hover:text-blue-700 hover:bg-blue-50">
                            View on Platform
                          </Button>
                        </a>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="danger" className="flex-1 min-w-0">
          <Card className="bg-red-50/50 border-red-200 shadow-sm">
            <CardContent className="p-6 space-y-4">
              <div>
                <h3 className="text-lg font-medium text-red-600">Delete Clinic</h3>
                <p className="text-neutral-600 text-sm mt-1">Permanently remove this clinic and all associated data. This action cannot be undone.</p>
              </div>
              <Button onClick={handleDelete} className="bg-red-600 hover:bg-red-700 text-white shadow-sm">
                <Trash2 className="w-4 h-4 mr-2" />
                Delete Clinic
              </Button>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
}
