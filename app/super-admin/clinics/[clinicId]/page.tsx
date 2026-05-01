"use client";

import { useQuery, useMutation } from "convex/react";
import { api } from "@/convex/_generated/api";
import { Id } from "@/convex/_generated/dataModel";
import { useParams, useRouter } from "next/navigation";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import Link from "next/link";
import { ArrowLeft, PlayCircle, Trash2, Edit } from "lucide-react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useState, useEffect } from "react";
import { toast } from "sonner";

export default function ClinicDetailsPage() {
  const params = useParams();
  const router = useRouter();
  const clinicId = params.clinicId as string;

  const clinic = useQuery(api.clinics.getById, { clinicId: clinicId as Id<"clinics"> });
  const posts = useQuery(api.posts.getByClinic, { clinicId: clinicId as Id<"clinics"> });
  const keywords = useQuery(api.keywords.getByClinic, { clinicId: clinicId as Id<"clinics"> });
  const removeClinic = useMutation(api.clinics.remove);
  const updateClinic = useMutation(api.clinics.update);
  const deletePost = useMutation(api.posts.remove);

  const [isEditing, setIsEditing] = useState(false);
  const [customDomain, setCustomDomain] = useState("");
  const [isSaving, setIsSaving] = useState(false);

  useEffect(() => {
    if (clinic) {
      setCustomDomain(clinic.customDomain || "");
    }
  }, [clinic]);

  if (clinic === undefined || posts === undefined || keywords === undefined) {
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
