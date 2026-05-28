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
import { ArrowLeft, PlayCircle, MapPin, Phone, MessageCircle, User, Globe, Link2, Copy, ExternalLink, Share2, ShieldCheck, ShieldAlert, Sparkles } from "lucide-react";
import { useState, useEffect } from "react";
import { useSearchParams } from "next/navigation";
import { toast } from "sonner";
import { SeoChecklist } from "./SeoChecklist";

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
  establishedYear?: number;
  uniqueSellingPoints?: string[];
  equipmentBrands?: string[];
  neighborhoodLandmarks?: string;
  clinicFacts?: string;
  seoChecklist?: Record<string, number>;
  doctorNames?: string[];
  services?: string[];
  metaPageId?: string;
  metaPageName?: string;
  metaInstagramAccountId?: string;
  autoPostFacebook?: boolean;
  autoPostInstagram?: boolean;
}

const FacebookIcon = ({ className }: { className?: string }) => (
  <svg 
    xmlns="http://www.w3.org/2000/svg" 
    viewBox="0 0 24 24" 
    fill="none" 
    stroke="currentColor" 
    strokeWidth="2" 
    strokeLinecap="round" 
    strokeLinejoin="round" 
    className={className}
  >
    <path d="M18 2h-3a5 5 0 0 0-5 5v3H7v4h3v8h4v-8h3l1-4h-4V7a1 1 0 0 1 1-1h3z" />
  </svg>
);

const InstagramIcon = ({ className }: { className?: string }) => (
  <svg 
    xmlns="http://www.w3.org/2000/svg" 
    viewBox="0 0 24 24" 
    fill="none" 
    stroke="currentColor" 
    strokeWidth="2" 
    strokeLinecap="round" 
    strokeLinejoin="round" 
    className={className}
  >
    <rect width="20" height="20" x="2" y="2" rx="5" ry="5" />
    <path d="M16 11.37A4 4 0 1 1 12.63 8 4 4 0 0 1 16 11.37z" />
    <line x1="17.5" x2="17.51" y1="6.5" y2="6.5" />
  </svg>
);

export default function ClinicDetailsPage() {
  const params = useParams();
  const router = useRouter();
  const searchParams = useSearchParams();
  const clinicId = params.clinicId as Id<"clinics">;

  const socialError = searchParams.get("socialError");
  const socialSuccess = searchParams.get("socialSuccess");

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
    doctorNames: "",
    services: "",
    establishedYear: "",
    uniqueSellingPoints: "",
    equipmentBrands: "",
    neighborhoodLandmarks: "",
    clinicFacts: "",
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
        doctorNames: clinic.doctorNames?.join(", ") || "",
        services: clinic.services?.join(", ") || "",
        establishedYear: clinic.establishedYear ? String(clinic.establishedYear) : "",
        uniqueSellingPoints: clinic.uniqueSellingPoints?.join(", ") || "",
        equipmentBrands: clinic.equipmentBrands?.join(", ") || "",
        neighborhoodLandmarks: clinic.neighborhoodLandmarks || "",
        clinicFacts: clinic.clinicFacts || "",
      });
      setSubscriptionStartDate(clinic.subscriptionStartDate || "");
      setMonthlyRate(clinic.monthlyRate ?? "");
    }
  }, [clinic]);

  useEffect(() => {
    if (socialError) {
      toast.error(`Social Connection Failed: ${socialError.replace(/_/g, ' ')}`);
      router.replace(`/super-admin/clinics/${clinicId}`);
    }
    if (socialSuccess) {
      toast.success("Social Connection Successful!");
      router.replace(`/super-admin/clinics/${clinicId}`);
    }
  }, [socialError, socialSuccess, clinicId, router]);

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
      const { establishedYear, uniqueSellingPoints, equipmentBrands, doctorNames, services, ...rest } = seoData;
      await updateClinic({
        clinicId: clinic._id,
        ...rest,
        doctorNames: doctorNames.split(",").map(d => d.trim()).filter(Boolean),
        services: services.split(",").map(s => s.trim()).filter(Boolean),
        ...(establishedYear ? { establishedYear: Number(establishedYear) } : {}),
        uniqueSellingPoints: uniqueSellingPoints.split(",").map(s => s.trim()).filter(Boolean),
        equipmentBrands: equipmentBrands.split(",").map(s => s.trim()).filter(Boolean),
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
  
  const handleToggleAutoPost = async (platform: "facebook" | "instagram", enabled: boolean) => {
    try {
      await updateClinic({
        clinicId: clinic._id,
        [platform === "facebook" ? "autoPostFacebook" : "autoPostInstagram"]: enabled,
      });
      toast.success(`${platform === "facebook" ? "Facebook" : "Instagram"} auto-posting ${enabled ? "enabled" : "disabled"}`);
    } catch {
      toast.error("Failed to update auto-post settings");
    }
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
          <Link href={`/clinic/${clinic._id}`}>
            <Button variant="outline" className="border-neutral-200 text-neutral-700 hover:bg-neutral-50 gap-2">
              <ExternalLink className="w-4 h-4" />
              Login as Tenant
            </Button>
          </Link>
          <Link href={`/super-admin/clinics/${clinic._id}/generate`}>
            <Button className="bg-blue-600 hover:bg-blue-700 text-white gap-2">
              <PlayCircle className="w-4 h-4" />
              Generate Post
            </Button>
          </Link>
        </div>
      </div>

      <Tabs defaultValue="overview" orientation="vertical" className="w-full flex-col md:flex-row items-start gap-6">
        <TabsList className="w-full md:w-48 xl:w-52 shrink-0 overflow-x-auto md:overflow-visible md:sticky md:top-4 md:self-start">
          <TabsTrigger value="overview" className="text-sm whitespace-nowrap">Overview</TabsTrigger>
          <TabsTrigger value="seo" className="text-sm whitespace-nowrap">SEO & Profile</TabsTrigger>
          <TabsTrigger value="checklist" className="text-sm whitespace-nowrap">SEO Checklist</TabsTrigger>
          <TabsTrigger value="posts" className="text-sm whitespace-nowrap">Posts ({posts.length})</TabsTrigger>
          <TabsTrigger value="keywords" className="text-sm whitespace-nowrap">Keywords ({keywords.length})</TabsTrigger>
          <TabsTrigger value="social" className="text-sm whitespace-nowrap">Social Media</TabsTrigger>
          <TabsTrigger value="billing" className="text-sm whitespace-nowrap">Billing</TabsTrigger>
          <TabsTrigger value="danger" className="text-sm whitespace-nowrap text-red-600">Danger Zone</TabsTrigger>
        </TabsList>

        <div className="flex-1 min-w-0">
        <TabsContent value="overview" className="space-y-6 mt-0">
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

        <TabsContent value="seo" className="space-y-6 mt-0">
          <Card className="bg-white border-neutral-200 shadow-sm">
            <CardHeader>
              <CardTitle className="flex items-center gap-2 text-neutral-900">
                <MapPin className="w-5 h-5 text-blue-600" />
                Local SEO & Contact
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-6">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="doctorNames">Doctor Names (comma separated for multiple)</Label>
                  <Input name="doctorNames" value={seoData.doctorNames} onChange={handleSeoChange} placeholder="Dr. Tarun Pandey, Dr. Jane Doe" className="bg-white" />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="services">Services (comma separated for multiple)</Label>
                  <Input name="services" value={seoData.services} onChange={handleSeoChange} placeholder="Orthodontics, Dental Implants" className="bg-white" />
                </div>
              </div>
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

          <Card className="bg-white border-amber-200 shadow-sm">
            <CardHeader>
              <CardTitle className="flex items-center gap-2 text-neutral-900">
                <Sparkles className="w-5 h-5 text-amber-500" />
                Unique Clinic Facts <span className="text-xs font-medium text-amber-600">(critical for ranking)</span>
              </CardTitle>
              <CardDescription>
                The AI feeds these into every blog post so each clinic on the network produces structurally different content. Without 2+ filled, posts read as generic — Google penalises duplicate-feeling articles across multi-tenant networks.
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-6">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label>Year Established</Label>
                  <Input name="establishedYear" type="number" value={seoData.establishedYear} onChange={handleSeoChange} placeholder="2012" className="bg-white" />
                </div>
                <div className="space-y-2">
                  <Label>Neighborhood Landmarks</Label>
                  <Input name="neighborhoodLandmarks" value={seoData.neighborhoodLandmarks} onChange={handleSeoChange} placeholder="Near Phoenix Mall, opp. HDFC Bank" className="bg-white" />
                </div>
              </div>
              <div className="space-y-2">
                <Label>Unique Selling Points (comma separated)</Label>
                <Input name="uniqueSellingPoints" value={seoData.uniqueSellingPoints} onChange={handleSeoChange} placeholder="in-house CBCT, same-day implants, sedation dentistry" className="bg-white" />
              </div>
              <div className="space-y-2">
                <Label>Equipment / Brands Used (comma separated)</Label>
                <Input name="equipmentBrands" value={seoData.equipmentBrands} onChange={handleSeoChange} placeholder="Straumann, Invisalign, Sirona, NSK" className="bg-white" />
              </div>
              <div className="space-y-2">
                <Label>Other Distinctive Facts (free text, one per line)</Label>
                <Textarea
                  name="clinicFacts"
                  value={seoData.clinicFacts}
                  onChange={handleSeoChange}
                  placeholder={`- Treated 5,000+ patients since opening\n- Specialised in pediatric dentistry\n- Free initial consultation`}
                  className="bg-white min-h-[110px] font-mono text-xs"
                />
              </div>
            </CardContent>
          </Card>

          <div className="flex justify-end">
            <Button onClick={handleSaveSeo} disabled={isSavingSeo} className="bg-blue-600 hover:bg-blue-700 text-white min-w-[150px]">
              {isSavingSeo ? "Saving..." : "Save SEO Settings"}
            </Button>
          </div>
        </TabsContent>

        <TabsContent value="checklist" className="mt-0">
          <SeoChecklist clinicId={clinic._id} completed={clinic.seoChecklist || {}} />
        </TabsContent>

        <TabsContent value="posts" className="mt-0">
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

        <TabsContent value="keywords" className="space-y-6 mt-0">
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

        <TabsContent value="billing" className="space-y-6 mt-0">
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

        <TabsContent value="social" className="space-y-6 mt-0">
          <Card className="bg-white border-neutral-200">
            <CardHeader>
              <div className="flex items-center justify-between">
                <div>
                  <CardTitle className="flex items-center gap-2">
                    <Share2 className="w-5 h-5 text-blue-600" />
                    Meta Integration
                  </CardTitle>
                  <CardDescription>Auto-post blog updates to Facebook & Instagram.</CardDescription>
                </div>
                {clinic.metaPageId ? (
                  <Badge className="bg-green-100 text-green-700 flex items-center gap-1">
                    <ShieldCheck className="w-3 h-3" /> Connected
                  </Badge>
                ) : (
                  <Badge variant="outline" className="text-neutral-400 flex items-center gap-1">
                    <ShieldAlert className="w-3 h-3" /> Disconnected
                  </Badge>
                )}
              </div>
            </CardHeader>
            <CardContent className="space-y-8">
              {!clinic.metaPageId ? (
                <div className="bg-neutral-50 border border-neutral-200 rounded-xl p-8 text-center space-y-4">
                  <div className="flex justify-center gap-4">
                    <div className="p-3 bg-white rounded-full shadow-sm"><FacebookIcon className="w-8 h-8 text-[#1877F2]" /></div>
                    <div className="p-3 bg-white rounded-full shadow-sm"><InstagramIcon className="w-8 h-8 text-[#E4405F]" /></div>
                  </div>
                  <div className="max-w-md mx-auto">
                    <h4 className="font-bold text-neutral-900 text-lg">Connect to Meta</h4>
                    <p className="text-sm text-neutral-500 mt-1">
                      Link this clinic to a Facebook Page to enable automated social media updates for every new blog post.
                    </p>
                  </div>
                  <a 
                    href={`${typeof window !== 'undefined' ? window.location.origin : ''}/api/connect/facebook/${clinic._id}`}
                    className="inline-flex items-center justify-center bg-[#1877F2] hover:bg-[#166fe5] text-white px-8 h-12 rounded-full font-bold shadow-lg shadow-blue-200 mt-4 no-underline"
                  >
                    <FacebookIcon className="w-5 h-5 mr-2" />
                    Login with Facebook
                  </a>
                </div>
              ) : (
                <div className="space-y-6">
                   <div className="p-6 bg-blue-50 border border-blue-100 rounded-xl flex items-center justify-between">
                      <div className="flex items-center gap-4">
                        <div className="p-3 bg-white rounded-full shadow-sm"><FacebookIcon className="w-6 h-6 text-[#1877F2]" /></div>
                        <div>
                          <p className="text-xs text-blue-600 font-bold uppercase tracking-wider">Connected Page</p>
                          <h4 className="font-bold text-blue-900 text-lg">{clinic.metaPageName}</h4>
                        </div>
                      </div>
                      <Button variant="ghost" className="text-red-600 hover:text-red-700 hover:bg-red-50" onClick={async () => {
                        if(confirm("Are you sure you want to disconnect Meta?")) {
                          // Note: You would need a clearMeta mutation here, but we'll use a placeholder or the clinic update
                          await updateClinic({ clinicId: clinic._id, metaPageId: "", metaPageName: "", metaPageAccessTokenEncrypted: "", metaInstagramAccountId: "" });
                          toast.success("Disconnected from Meta");
                        }
                      }}>Disconnect</Button>
                   </div>

                   <div className="grid grid-cols-1 md:grid-cols-2 gap-6 pt-4">
                      <div className="flex items-center justify-between p-4 bg-white border border-neutral-200 rounded-lg">
                        <div className="flex items-center gap-3">
                          <FacebookIcon className="w-5 h-5 text-[#1877F2]" />
                          <span className="font-medium">Facebook Auto-post</span>
                        </div>
                        <input 
                          type="checkbox" 
                          className="w-5 h-5 accent-blue-600"
                          checked={clinic.autoPostFacebook}
                          onChange={(e) => handleToggleAutoPost("facebook", e.target.checked)}
                        />
                      </div>
                      <div className="flex items-center justify-between p-4 bg-white border border-neutral-200 rounded-lg">
                        <div className="flex items-center gap-3">
                          <InstagramIcon className="w-5 h-5 text-[#E4405F]" />
                          <span className="font-medium">Instagram Auto-post</span>
                        </div>
                        <input 
                          type="checkbox" 
                          className="w-5 h-5 accent-pink-600"
                          checked={clinic.autoPostInstagram}
                          onChange={(e) => handleToggleAutoPost("instagram", e.target.checked)}
                        />
                      </div>
                   </div>
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="danger" className="mt-0">
          <Card className="bg-red-50 border-red-200">
            <CardContent className="p-6">
              <h3 className="text-lg font-bold text-red-600 mb-2">Delete Clinic</h3>
              <p className="text-sm text-neutral-600 mb-6">This will delete all posts, keywords, and history. Action is IRREVERSIBLE.</p>
              <Button onClick={handleDelete} className="bg-red-600 hover:bg-red-700 text-white">Delete Permanently</Button>
            </CardContent>
          </Card>
        </TabsContent>
        </div>{/* flex-1 content wrapper */}
      </Tabs>
    </div>
  );
}
