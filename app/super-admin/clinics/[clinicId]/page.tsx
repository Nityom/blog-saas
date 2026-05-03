"use client";

import { useQuery, useMutation } from "convex/react";
import { api } from "@/convex/_generated/api";
import { Id } from "@/convex/_generated/dataModel";
import { useParams, useRouter } from "next/navigation";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import Link from "next/link";
import { ArrowLeft, PlayCircle, MapPin, Phone, MessageCircle, User, Globe, Link2, Copy, ExternalLink } from "lucide-react";
import { useState, useEffect } from "react";
import { toast } from "sonner";

interface ClinicData {
  _id: Id<"clinics">;
  name: string;
  city: string;
  slug: string;
  active: boolean;
  integrationMethod: string;
  bookingUrl: string;
  customDomain?: string;
  subscriptionStartDate?: string;
  monthlyRate?: number;
  address?: string;
  phone?: string;
  whatsappNumber?: string;
  mainWebsiteUrl?: string;
  googleMapsUrl?: string;
  googleMapsEmbedUrl?: string;
  authorQualification?: string;
  authorBio?: string;
  authorPhotoUrl?: string;
}

export default function ClinicDetailsPage() {
  const params = useParams();
  const router = useRouter();
  const clinicId = params.clinicId as Id<"clinics">;

  const clinicRaw = useQuery(api.clinics.getById, { clinicId });
  const posts = useQuery(api.posts.getByClinic, { clinicId });
  const keywords = useQuery(api.keywords.getByClinic, { clinicId });
  
  const clinic = clinicRaw as unknown as ClinicData | undefined;

  const removeClinic = useMutation(api.clinics.remove);
  const updateClinic = useMutation(api.clinics.update);
  const fixLinks = useMutation(api.clinics.fixBrokenInternalLinks);

  const [seoData, setSeoData] = useState({
    address: "",
    phone: "",
    whatsappNumber: "",
    mainWebsiteUrl: "",
    googleMapsUrl: "",
    googleMapsEmbedUrl: "",
    authorQualification: "",
    authorBio: "",
    authorPhotoUrl: "",
    customDomain: "",
  });

  const [isSavingSeo, setIsSavingSeo] = useState(false);
  const [isFixingLinks, setIsFixingLinks] = useState(false);
  const [subscriptionStartDate, setSubscriptionStartDate] = useState("");
  const [monthlyRate, setMonthlyRate] = useState<number | "">("");
  const [isSavingBilling, setIsSavingBilling] = useState(false);

  useEffect(() => {
    if (clinic) {
      setSeoData({
        address: clinic.address || "",
        phone: clinic.phone || "",
        whatsappNumber: clinic.whatsappNumber || "",
        mainWebsiteUrl: clinic.mainWebsiteUrl || "",
        googleMapsUrl: clinic.googleMapsUrl || "",
        googleMapsEmbedUrl: clinic.googleMapsEmbedUrl || "",
        authorQualification: clinic.authorQualification || "",
        authorBio: clinic.authorBio || "",
        authorPhotoUrl: clinic.authorPhotoUrl || "",
        customDomain: clinic.customDomain || "",
      });
      setSubscriptionStartDate(clinic.subscriptionStartDate || "");
      setMonthlyRate(clinic.monthlyRate ?? "");
    }
  }, [clinic]);

  if (clinic === undefined || posts === undefined || keywords === undefined) {
    return <div className="p-8 text-neutral-400">Loading clinic details...</div>;
  }

  if (clinic === null) {
    return <div className="p-8 text-neutral-400">Clinic not found.</div>;
  }

  const handleSeoChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => {
    const { name, value } = e.target;
    setSeoData(prev => ({ ...prev, [name]: value }));
  };

  const handleSaveSeo = async () => {
    setIsSavingSeo(true);
    try {
      await updateClinic({
        clinicId: clinic._id,
        ...seoData,
      });
      toast.success("SEO & Profile data updated!");
    } catch {
      toast.error("Failed to update SEO data");
    } finally {
      setIsSavingSeo(false);
    }
  };

  const handleFixLinks = async () => {
    setIsFixingLinks(true);
    try {
      const fixedCount = await fixLinks({ clinicId: clinic._id });
      toast.success(`Repaired ${fixedCount} broken links!`);
    } catch {
      toast.error("Failed to repair links");
    } finally {
      setIsFixingLinks(false);
    }
  };

  const handleDelete = async () => {
    if (confirm("Are you sure?")) {
      await removeClinic({ clinicId: clinic._id });
      router.push("/super-admin");
    }
  };

  const handleSaveBilling = async () => {
    setIsSavingBilling(true);
    try {
      await updateClinic({
        clinicId: clinic._id,
        subscriptionStartDate: subscriptionStartDate || undefined,
        monthlyRate: monthlyRate === "" ? undefined : Number(monthlyRate),
      });
      toast.success("Billing updated");
    } catch {
      toast.error("Failed to update billing");
    } finally {
      setIsSavingBilling(false);
    }
  };

  const copyEmbedCode = () => {
    const origin = typeof window !== 'undefined' ? window.location.origin : '';
    const code = `<div id="blogforge-recent-posts"></div>\n<script src="${origin}/api/embed/${clinic.slug}/recent-posts.js"></script>`;
    navigator.clipboard.writeText(code);
    toast.success("Embed code copied to clipboard!");
  };

  const blogUrl = clinic.customDomain ? `https://${clinic.customDomain}` : `/blog/${clinic.slug}`;

  return (
    <div className="p-8 max-w-6xl mx-auto space-y-6">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-4">
          <Link href="/super-admin">
            <Button variant="ghost" size="icon" className="text-neutral-500 hover:text-neutral-900">
              <ArrowLeft className="h-5 w-5" />
            </Button>
          </Link>
          <div>
            <h2 className="text-2xl font-bold text-neutral-900 flex items-center gap-3">
              {clinic.name}
              <Badge className={clinic.active ? "bg-green-100 text-green-700" : "bg-neutral-100 text-neutral-600"}>
                {clinic.active ? "Active" : "Paused"}
              </Badge>
            </h2>
            <div className="flex items-center gap-2 text-neutral-500">
              <span>{clinic.city} • {clinic.integrationMethod} integration</span>
              <span>•</span>
              <Link href={blogUrl} target="_blank" className="text-blue-600 hover:underline flex items-center gap-1">
                View Blog <ExternalLink className="w-3 h-3" />
              </Link>
            </div>
          </div>
        </div>
        <div className="flex items-center gap-3">
          <Button 
            variant="outline" 
            onClick={handleFixLinks} 
            disabled={isFixingLinks} 
            className="border-blue-200 text-blue-700 hover:bg-blue-50"
          >
            <Link2 className="w-4 h-4 mr-2" />
            {isFixingLinks ? "Fixing..." : "Fix Broken Links"}
          </Button>
          <Link href={`/super-admin/clinics/${clinic._id}/generate`}>
            <Button className="bg-blue-600 hover:bg-blue-700 text-white gap-2">
              <PlayCircle className="w-4 h-4" />
              Generate Post
            </Button>
          </Link>
        </div>
      </div>

      <Tabs defaultValue="overview" className="w-full flex md:flex-row flex-col gap-6">
        <TabsList className="flex flex-col bg-white border border-neutral-200 p-2 rounded-lg w-full md:w-48 xl:w-56 h-fit items-stretch justify-start">
          <TabsTrigger value="overview" className="justify-start">Overview</TabsTrigger>
          <TabsTrigger value="seo" className="justify-start">SEO & Profile</TabsTrigger>
          <TabsTrigger value="posts" className="justify-start">Posts ({posts.length})</TabsTrigger>
          <TabsTrigger value="keywords" className="justify-start">Keywords ({keywords.length})</TabsTrigger>
          <TabsTrigger value="billing" className="justify-start">Billing</TabsTrigger>
          <TabsTrigger value="danger" className="justify-start text-red-600">Danger Zone</TabsTrigger>
        </TabsList>
        
        <TabsContent value="overview" className="flex-1 space-y-6">
           {/* Summary Cards */}
           <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            <Card className="bg-white border-neutral-200">
              <CardHeader className="pb-2"><CardTitle className="text-sm font-medium text-neutral-500">Published Posts</CardTitle></CardHeader>
              <CardContent><div className="text-3xl font-bold text-neutral-900">{posts.filter(p => p.status === "published").length}</div></CardContent>
            </Card>
            <Card className="bg-white border-neutral-200">
              <CardHeader className="pb-2"><CardTitle className="text-sm font-medium text-neutral-500">Waitlist/Drafts</CardTitle></CardHeader>
              <CardContent><div className="text-3xl font-bold text-neutral-900">{posts.filter(p => p.status !== "published").length}</div></CardContent>
            </Card>
            <Card className="bg-white border-neutral-200">
              <CardHeader className="pb-2"><CardTitle className="text-sm font-medium text-neutral-500">Total Keywords</CardTitle></CardHeader>
              <CardContent><div className="text-3xl font-bold text-neutral-900">{keywords.length}</div></CardContent>
            </Card>
          </div>

          <Card className="bg-blue-600 text-white shadow-lg border-none">
            <CardHeader className="flex flex-row items-center justify-between pb-2">
              <CardTitle className="text-lg">Recent Posts Embed Widget</CardTitle>
              <Button variant="ghost" size="sm" onClick={copyEmbedCode} className="text-white hover:bg-blue-500">
                <Copy className="w-4 h-4 mr-2" />
                Copy Code
              </Button>
            </CardHeader>
            <CardContent className="space-y-4">
              <p className="text-sm text-blue-100">
                Provide this code to the clinic to show their latest blog posts on their main website (e.g. titaniumsmiles.in).
              </p>
              <div className="p-4 bg-blue-700/50 rounded-lg border border-blue-400/30">
                <code className="text-xs break-all whitespace-pre-wrap font-mono">
                  {`<div id="blogforge-recent-posts"></div>\n<script src="${typeof window !== 'undefined' ? window.location.origin : ''}/api/embed/${clinic.slug}/recent-posts.js"></script>`}
                </code>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="seo" className="flex-1 space-y-6">
          <Card className="bg-white border-neutral-200 shadow-sm">
            <CardHeader>
              <CardTitle className="flex items-center gap-2 text-neutral-900">
                <MapPin className="w-5 h-5 text-blue-600" />
                Local SEO & Contact
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-6">
              <div className="space-y-2">
                <Label htmlFor="address">Full Clinic Address</Label>
                <Input name="address" value={seoData.address} onChange={handleSeoChange} placeholder="123, Street Name, Bhopal" className="bg-white" />
              </div>
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <div className="space-y-2">
                  <Label className="flex items-center gap-1.5"><Phone className="w-3 h-3"/> Phone</Label>
                  <Input name="phone" value={seoData.phone} onChange={handleSeoChange} placeholder="+91..." className="bg-white" />
                </div>
                <div className="space-y-2">
                  <Label className="flex items-center gap-1.5"><MessageCircle className="w-3 h-3"/> WhatsApp</Label>
                  <Input name="whatsappNumber" value={seoData.whatsappNumber} onChange={handleSeoChange} placeholder="91..." className="bg-white" />
                </div>
                <div className="space-y-2">
                  <Label className="flex items-center gap-1.5"><Globe className="w-3 h-3"/> Main Website</Label>
                  <Input name="mainWebsiteUrl" value={seoData.mainWebsiteUrl} onChange={handleSeoChange} placeholder="https://..." className="bg-white" />
                </div>
              </div>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label>Google Maps Share URL</Label>
                  <Input name="googleMapsUrl" value={seoData.googleMapsUrl} onChange={handleSeoChange} placeholder="https://maps.app.goo.gl/..." className="bg-white" />
                </div>
                <div className="space-y-2">
                  <Label>Maps Embed URL (iframe src)</Label>
                  <Input name="googleMapsEmbedUrl" value={seoData.googleMapsEmbedUrl} onChange={handleSeoChange} placeholder="https://www.google.com/maps/embed?..." className="bg-white" />
                </div>
              </div>
            </CardContent>
          </Card>

          <Card className="bg-white border-neutral-200 shadow-sm">
            <CardHeader>
              <CardTitle className="flex items-center gap-2 text-neutral-900">
                <User className="w-5 h-5 text-blue-600" />
                Author Profile (E-E-A-T)
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-6">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label>Qualification / Specialization</Label>
                  <Input name="authorQualification" value={seoData.authorQualification} onChange={handleSeoChange} placeholder="MDS - Orthodontics" className="bg-white" />
                </div>
                <div className="space-y-2">
                  <Label>Author Photo URL</Label>
                  <Input name="authorPhotoUrl" value={seoData.authorPhotoUrl} onChange={handleSeoChange} placeholder="https://..." className="bg-white" />
                </div>
              </div>
              <div className="space-y-2">
                <Label>Author Short Bio</Label>
                <Textarea name="authorBio" value={seoData.authorBio} onChange={handleSeoChange} placeholder="Professional bio for the article author card..." className="bg-white min-h-[80px]" />
              </div>
            </CardContent>
          </Card>

          <div className="flex justify-end">
            <Button onClick={handleSaveSeo} disabled={isSavingSeo} className="bg-blue-600 hover:bg-blue-700 text-white min-w-[150px]">
              {isSavingSeo ? "Saving..." : "Save SEO Settings"}
            </Button>
          </div>
        </TabsContent>

        <TabsContent value="posts" className="flex-1">
          <Card className="bg-white border-neutral-200">
            <CardContent className="p-0">
              <div className="divide-y divide-neutral-100">
                {posts.map(post => (
                  <div key={post._id} className="p-4 flex items-center justify-between hover:bg-neutral-50 transition-colors">
                    <div className="flex-1 min-w-0 mr-4">
                      <p className="font-bold text-neutral-900 truncate">{post.title}</p>
                      <div className="flex items-center gap-2 text-xs text-neutral-500 mt-1">
                        <span>{new Date(post.createdAt).toLocaleDateString()}</span>
                        <span>•</span>
                        <Badge variant="outline" className={post.status === "published" ? "bg-green-50 text-green-700" : "bg-neutral-100 text-neutral-600"}>
                          {post.status}
                        </Badge>
                      </div>
                    </div>
                    <Link href={`/clinic/${clinic._id}/posts/${post._id}`}>
                      <Button variant="ghost" size="sm" className="text-blue-600">Edit</Button>
                    </Link>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="keywords" className="flex-1 space-y-6">
          <Card className="bg-white border-neutral-200">
            <CardHeader className="flex flex-row items-center justify-between">
              <div>
                <CardTitle>Target Keywords</CardTitle>
                <CardDescription>Keywords currently being tracked for this clinic.</CardDescription>
              </div>
            </CardHeader>
            <CardContent className="p-0">
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-px bg-neutral-100">
                {keywords.map((kw) => (
                  <div key={kw._id} className="bg-white p-4 flex flex-col gap-1">
                    <span className="font-semibold text-neutral-900">{kw.term}</span>
                    <span className="text-xs text-neutral-500 uppercase tracking-wider">
                      {kw.localVariant || "General"}
                    </span>
                  </div>
                ))}
              </div>
              {keywords.length === 0 && (
                <div className="p-8 text-center text-neutral-500">No keywords found.</div>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="billing" className="flex-1 space-y-6">
           <Card className="bg-white border-neutral-200">
            <CardHeader><CardTitle className="text-neutral-900">Billing Config</CardTitle></CardHeader>
            <CardContent className="space-y-4">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label>Subscription Start Date</Label>
                  <Input type="date" value={subscriptionStartDate} onChange={(e) => setSubscriptionStartDate(e.target.value)} className="bg-white" />
                </div>
                <div className="space-y-2">
                  <Label>Monthly Rate (INR)</Label>
                  <Input type="number" value={monthlyRate} onChange={(e) => setMonthlyRate(e.target.value === "" ? "" : Number(e.target.value))} className="bg-white" />
                </div>
              </div>
              <Button onClick={handleSaveBilling} disabled={isSavingBilling} className="bg-blue-600 text-white">Save Billing</Button>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="danger" className="flex-1">
          <Card className="bg-red-50 border-red-200">
            <CardContent className="p-6">
              <h3 className="text-lg font-bold text-red-600 mb-2">Delete Clinic</h3>
              <p className="text-sm text-neutral-600 mb-6">This will delete all posts, keywords, and history. Action is IRREVERSIBLE.</p>
              <Button onClick={handleDelete} className="bg-red-600 hover:bg-red-700 text-white">Delete Permanently</Button>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
}
