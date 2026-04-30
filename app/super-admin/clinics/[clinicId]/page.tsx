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
            <Button variant="ghost" size="icon" className="text-neutral-400 hover:text-white hover:bg-neutral-800">
              <ArrowLeft className="h-5 w-5" />
            </Button>
          </Link>
          <div>
            <h2 className="text-2xl font-bold text-white tracking-tight flex items-center gap-3">
              {clinic.name}
              {clinic.active ? (
                <Badge className="bg-green-500/10 text-green-400">Active</Badge>
              ) : (
                <Badge className="bg-neutral-500/10 text-neutral-400">Paused</Badge>
              )}
            </h2>
            <p className="text-neutral-400">{clinic.city} • {clinic.integrationMethod} integration</p>
          </div>
        </div>
        <div className="flex items-center gap-3">
          <Link href={`/super-admin/clinics/${clinic._id}/generate`}>
            <Button className="bg-blue-600 hover:bg-blue-700 text-white gap-2">
              <PlayCircle className="w-4 h-4" />
              Generate Post
            </Button>
          </Link>
          <Link href={`/clinic/${clinic._id}`} target="_blank">
            <Button variant="outline" className="border-neutral-700 text-neutral-300 hover:text-white hover:bg-neutral-800">
              Tenant Portal
            </Button>
          </Link>
        </div>
      </div>

      <Tabs defaultValue="overview" className="w-full">
        <TabsList className="bg-neutral-900 border border-neutral-800 text-neutral-400">
          <TabsTrigger value="overview" className="data-[state=active]:bg-neutral-800 data-[state=active]:text-white">Overview</TabsTrigger>
          <TabsTrigger value="posts" className="data-[state=active]:bg-neutral-800 data-[state=active]:text-white">Posts ({posts.length})</TabsTrigger>
          <TabsTrigger value="keywords" className="data-[state=active]:bg-neutral-800 data-[state=active]:text-white">Keywords ({keywords.length})</TabsTrigger>
          <TabsTrigger value="danger" className="data-[state=active]:bg-red-900/20 data-[state=active]:text-red-400">Danger Zone</TabsTrigger>
        </TabsList>
        
        <TabsContent value="overview" className="space-y-6 pt-4">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            <Card className="bg-neutral-900 border-neutral-800 text-white">
              <CardHeader className="pb-2">
                <CardTitle className="text-sm font-medium text-neutral-400">Published Posts</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="text-3xl font-bold">{posts.filter(p => p.status === "published").length}</div>
              </CardContent>
            </Card>
            <Card className="bg-neutral-900 border-neutral-800 text-white">
              <CardHeader className="pb-2">
                <CardTitle className="text-sm font-medium text-neutral-400">Drafts & Flagged</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="text-3xl font-bold">{posts.filter(p => p.status === "draft" || p.status === "flagged").length}</div>
              </CardContent>
            </Card>
            <Card className="bg-neutral-900 border-neutral-800 text-white">
              <CardHeader className="pb-2">
                <CardTitle className="text-sm font-medium text-neutral-400">Active Keywords</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="text-3xl font-bold">{keywords.filter(k => !k.paused).length}</div>
              </CardContent>
            </Card>
          </div>

          <Card className="bg-neutral-900 border-neutral-800 text-white">
            <CardHeader className="flex flex-row items-center justify-between">
              <CardTitle>Configuration</CardTitle>
              {clinic.integrationMethod === "hosted" && (
                <Dialog open={isEditing} onOpenChange={setIsEditing}>
                  <DialogTrigger render={<Button variant="ghost" size="sm" className="text-neutral-400 hover:text-white hover:bg-neutral-800" />}>
                    <Edit className="w-4 h-4 mr-2" />
                    Edit Domain
                  </DialogTrigger>
                  <DialogContent className="bg-neutral-900 border-neutral-800 text-white">
                    <DialogHeader>
                      <DialogTitle>Edit Custom Domain</DialogTitle>
                    </DialogHeader>
                    <div className="space-y-4 pt-4">
                      <div className="space-y-2">
                        <Label htmlFor="customDomain">Custom Domain</Label>
                        <Input
                          id="customDomain"
                          value={customDomain}
                          onChange={(e) => setCustomDomain(e.target.value)}
                          className="bg-neutral-950 border-neutral-800"
                          placeholder="blog.titaniumsmiles.in"
                        />
                        <p className="text-xs text-neutral-500">Do not include https://</p>
                      </div>
                      <Button onClick={handleSaveDomain} disabled={isSaving} className="w-full bg-blue-600 hover:bg-blue-700 text-white">
                        {isSaving ? "Saving..." : "Save Changes"}
                      </Button>
                    </div>
                  </DialogContent>
                </Dialog>
              )}
            </CardHeader>
            <CardContent className="space-y-4 text-sm text-neutral-300">
              <div className="grid grid-cols-2 gap-4">
                <div><span className="text-neutral-500 block">Services</span> {clinic.services.join(", ")}</div>
                <div><span className="text-neutral-500 block">Doctors</span> {clinic.doctorNames.join(", ")}</div>
                <div><span className="text-neutral-500 block">Target Age</span> {clinic.targetAge}</div>
                <div><span className="text-neutral-500 block">Tone</span> <span className="capitalize">{clinic.tone}</span></div>
                <div><span className="text-neutral-500 block">Booking URL</span> <a href={clinic.bookingUrl} target="_blank" className="text-blue-400 hover:underline">{clinic.bookingUrl}</a></div>
                {clinic.customDomain && (
                  <div><span className="text-neutral-500 block">Custom Domain</span> <a href={`https://${clinic.customDomain}`} target="_blank" className="text-blue-400 hover:underline">{clinic.customDomain}</a></div>
                )}
                
                {clinic.integrationMethod === "embed" && (
                  <div className="col-span-2 mt-4 p-4 bg-neutral-950 rounded-md border border-neutral-800">
                    <span className="text-neutral-500 block mb-2">Embed Script</span>
                    <code className="text-xs text-green-400 break-all">
                      &lt;script src=&quot;YOUR_DOMAIN/api/embed/{clinic._id}.js&quot;&gt;&lt;/script&gt;<br/>
                      &lt;div id=&quot;dental-blog&quot;&gt;&lt;/div&gt;
                    </code>
                  </div>
                )}
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="posts" className="pt-4">
          <Card className="bg-neutral-900 border-neutral-800 text-white">
            <CardContent className="p-0">
               {/* Simplified table for Super Admin view */}
               <div className="divide-y divide-neutral-800">
                  {posts.length === 0 && <div className="p-6 text-center text-neutral-500">No posts yet.</div>}
                  {posts.map(post => (
                    <div key={post._id} className="p-4 flex items-center justify-between hover:bg-neutral-800/50">
                      <div>
                        <div className="font-medium">{post.title}</div>
                        <div className="text-xs text-neutral-500 mt-1">{new Date(post.createdAt).toLocaleDateString()}</div>
                      </div>
                      <Badge variant="outline" className={
                        post.status === "published" ? "text-green-400 border-green-500/20" : 
                        post.status === "flagged" ? "text-red-400 border-red-500/20" : 
                        "text-neutral-400 border-neutral-500/20"
                      }>
                        {post.status}
                      </Badge>
                    </div>
                  ))}
               </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="keywords" className="pt-4">
          <Card className="bg-neutral-900 border-neutral-800 text-white">
            <CardContent className="p-0">
               <div className="divide-y divide-neutral-800">
                  {keywords.length === 0 && <div className="p-6 text-center text-neutral-500">No keywords found.</div>}
                  {keywords.map(kw => (
                    <div key={kw._id} className="p-4 flex items-center justify-between hover:bg-neutral-800/50">
                      <div>
                        <div className="font-medium">{kw.term}</div>
                        <div className="text-xs text-neutral-500 mt-1">{kw.localVariant}</div>
                      </div>
                      <div className="text-right text-sm text-neutral-400">
                        Score: {kw.performanceScore.toFixed(2)}
                      </div>
                    </div>
                  ))}
               </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="danger" className="pt-4">
          <Card className="bg-red-950/10 border-red-900/20">
            <CardContent className="p-6 space-y-4">
              <div>
                <h3 className="text-lg font-medium text-red-400">Delete Clinic</h3>
                <p className="text-neutral-500 text-sm mt-1">Permanently remove this clinic and all associated data. This action cannot be undone.</p>
              </div>
              <Button onClick={handleDelete} className="bg-red-600 hover:bg-red-700 text-white">
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
