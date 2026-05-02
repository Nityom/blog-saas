"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { useMutation } from "convex/react";
import { api } from "@/convex/_generated/api";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { toast } from "sonner";
import Link from "next/link";
import { ArrowLeft, Upload } from "lucide-react";

export default function NewClinicPage() {
  const router = useRouter();
  const createClinic = useMutation(api.clinics.create);
  const seedKeywords = useMutation(api.keywords.seedDefaultKeywords);
  const generateUploadUrl = useMutation(api.posts.generateUploadUrl);

  const [formData, setFormData] = useState({
    name: "",
    city: "",
    bookingUrl: "",
    services: "",
    doctorNames: "",
    tone: "professional",
    targetAge: "adults",
    active: true,
    integrationMethod: "hosted",
    wordpressUrl: "",
    wordpressAppPassword: "",
    customDomain: "",
    autoPostFacebook: false,
    autoPostInstagram: false,
  });

  const [logoFile, setLogoFile] = useState<File | null>(null);
  const [logoPreview, setLogoPreview] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [logoUrl, setLogoUrl] = useState("");
  const [logoInputMode, setLogoInputMode] = useState<"file" | "url">("file");
  
  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement>) => {
    const { name, value, type } = e.target;
    const checked = (e.target as HTMLInputElement).checked;
    setFormData(prev => ({
      ...prev,
      [name]: type === "checkbox" ? checked : value
    }));
  };

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

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSubmitting(true);

    try {
      // 1. Generate slug
      const baseSlug = formData.name.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/(^-|-$)+/g, "");

      // 2. Format arrays
      const services = formData.services.split(",").map(s => s.trim()).filter(Boolean);
      const doctorNames = formData.doctorNames.split(",").map(d => d.trim()).filter(Boolean);

      // 3. Upload logo if provided
      let finalLogoUrl: string | undefined = undefined;
      if (logoInputMode === "url" && logoUrl.trim()) {
        finalLogoUrl = logoUrl.trim();
      } else if (logoInputMode === "file" && logoFile) {
        try {
          const postUrl = await generateUploadUrl();
          const result = await fetch(postUrl, {
            method: "POST",
            headers: { "Content-Type": logoFile.type },
            body: logoFile,
          });
          const { storageId } = await result.json();
          finalLogoUrl = storageId;
        } catch (logoError) {
          console.error("Logo upload failed:", logoError);
          toast.warning("Logo upload failed, creating clinic without logo");
        }
      }

      // 4. Create Clinic
      const clinicId = await createClinic({
        name: formData.name,
        city: formData.city,
        slug: baseSlug,
        services,
        doctorNames,
        tone: formData.tone as "professional" | "warm" | "friendly",
        targetAge: formData.targetAge,
        active: formData.active,
        bookingUrl: formData.bookingUrl,
        integrationMethod: formData.integrationMethod as "hosted" | "wordpress" | "embed",
        ...(formData.integrationMethod === "wordpress" ? {
          wordpressUrl: formData.wordpressUrl,
          wordpressAppPassword: formData.wordpressAppPassword,
        } : {}),
        ...(formData.integrationMethod === "hosted" && formData.customDomain ? {
          customDomain: formData.customDomain,
        } : {}),
        autoPostFacebook: formData.autoPostFacebook,
        autoPostInstagram: formData.autoPostInstagram,
        ...(finalLogoUrl ? { logoUrl: finalLogoUrl } : {}),
      });

      // 5. Seed Keywords
      await seedKeywords({
        clinicId,
        city: formData.city,
      });

      toast.success("Clinic created successfully!");
      router.push(`/super-admin/clinics/${clinicId}`);
    } catch (error: unknown) {
      toast.error((error as Error).message || "Failed to create clinic");
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="p-8 max-w-4xl mx-auto space-y-6">
      <div className="flex items-center gap-4">
        <Link href="/super-admin">
          <Button variant="ghost" size="icon" className="text-neutral-500 hover:text-neutral-900 hover:bg-neutral-100">
            <ArrowLeft className="h-5 w-5" />
          </Button>
        </Link>
        <div>
          <h2 className="text-2xl font-bold text-neutral-900 tracking-tight">Add New Clinic</h2>
          <p className="text-neutral-500">Configure a new tenant for the platform.</p>
        </div>
      </div>

      <Card className="bg-white border-neutral-200 text-neutral-900 shadow-sm">
        <form onSubmit={handleSubmit}>
          <CardHeader>
            <CardTitle>Clinic Details</CardTitle>
            <CardDescription className="text-neutral-500">Basic information used for AI generation.</CardDescription>
          </CardHeader>
          <CardContent className="space-y-6">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="name" className="text-neutral-700">Clinic Name *</Label>
                <Input required id="name" name="name" value={formData.name} onChange={handleChange} className="bg-white border-neutral-300 focus-visible:ring-blue-500 shadow-sm" />
              </div>
              <div className="space-y-2">
                <Label htmlFor="city" className="text-neutral-700">City *</Label>
                <Input required id="city" name="city" value={formData.city} onChange={handleChange} className="bg-white border-neutral-300 focus-visible:ring-blue-500 shadow-sm" />
              </div>
            </div>

            <div className="pt-4 border-t border-neutral-100 space-y-4">
              <div>
                <h3 className="text-sm font-semibold text-neutral-900">Clinic Logo (Optional)</h3>
                <p className="text-xs text-neutral-500 mt-1">Upload a logo that will be displayed in your blog header.</p>
              </div>
              
              {logoPreview || logoUrl ? (
                <div className="inline-block border-2 border-neutral-200 rounded-lg p-2">
                  <img src={logoPreview || logoUrl} alt="Logo Preview" className="h-16 w-auto object-contain" />
                </div>
              ) : null}

              <Dialog>
                <DialogTrigger>
                  <Button variant="outline" className="border-neutral-300 text-neutral-700 hover:text-neutral-900 hover:bg-neutral-50">
                    <Upload className="w-4 h-4 mr-2" />
                    Add Logo
                  </Button>
                </DialogTrigger>
                <DialogContent className="bg-white border-neutral-200">
                  <DialogHeader>
                    <DialogTitle className="text-neutral-900">Upload or Paste Logo URL</DialogTitle>
                  </DialogHeader>
                  <div className="space-y-4 pt-4">
                    {/* Tab-like buttons */}
                    <div className="flex gap-2 border-b border-neutral-200">
                      <button
                        type="button"
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
                        type="button"
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
                        <div>
                          <input
                            type="file"
                            id="clinicLogoDialogUpload"
                            className="hidden"
                            accept="image/*"
                            onChange={handleLogoSelect}
                            disabled={isSubmitting}
                          />
                          <label htmlFor="clinicLogoDialogUpload" className="cursor-pointer block">
                            <div className="border-2 border-dashed border-neutral-300 rounded-lg p-6 text-center hover:border-neutral-400 transition-colors" {...(isSubmitting ? {style: {opacity: 0.5, pointerEvents: 'none'}} : {})}>
                              <Upload className="w-6 h-6 mx-auto mb-2 text-neutral-400" />
                              <p className="text-sm text-neutral-600">Click to upload or drag and drop</p>
                              <p className="text-xs text-neutral-500">PNG, JPG, SVG up to 10MB</p>
                            </div>
                          </label>
                        </div>
                        {logoPreview && (
                          <Button
                            type="button"
                            onClick={removeLogo}
                            variant="outline"
                            className="w-full border-neutral-300"
                          >
                            Clear Preview
                          </Button>
                        )}
                      </div>
                    )}

                    {/* URL Input */}
                    {logoInputMode === "url" && (
                      <div className="space-y-3">
                        <div>
                          <Label htmlFor="logoUrlInput" className="text-neutral-700">Logo URL</Label>
                          <Input
                            id="logoUrlInput"
                            type="url"
                            placeholder="https://example.com/logo.png"
                            value={logoUrl}
                            onChange={(e) => setLogoUrl(e.target.value)}
                            className="bg-white border-neutral-200 text-neutral-900 mt-1"
                            disabled={isSubmitting}
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
                      </div>
                    )}
                  </div>
                </DialogContent>
              </Dialog>
            </div>

            <div className="space-y-2">
              <Label htmlFor="bookingUrl" className="text-neutral-700">Booking URL *</Label>
              <Input required id="bookingUrl" name="bookingUrl" type="url" value={formData.bookingUrl} onChange={handleChange} className="bg-white border-neutral-300 focus-visible:ring-blue-500 shadow-sm" placeholder="https://..." />
            </div>

            <div className="space-y-2">
              <Label htmlFor="services" className="text-neutral-700">Services Offered (comma separated) *</Label>
              <Input required id="services" name="services" value={formData.services} onChange={handleChange} className="bg-white border-neutral-300 focus-visible:ring-blue-500 shadow-sm" placeholder="Teeth Whitening, Implants..." />
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="doctorNames" className="text-neutral-700">Doctor Names (comma separated) *</Label>
                <Input required id="doctorNames" name="doctorNames" value={formData.doctorNames} onChange={handleChange} className="bg-white border-neutral-300 focus-visible:ring-blue-500 shadow-sm" placeholder="Dr. Smith, Dr. Doe" />
              </div>
              <div className="space-y-2">
                <Label htmlFor="targetAge" className="text-neutral-700">Target Age Group *</Label>
                <Input required id="targetAge" name="targetAge" value={formData.targetAge} onChange={handleChange} className="bg-white border-neutral-300 focus-visible:ring-blue-500 shadow-sm" placeholder="Adults, 30-50 years" />
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="tone" className="text-neutral-700">Brand Tone</Label>
                <select id="tone" name="tone" value={formData.tone} onChange={handleChange} className="w-full h-10 px-3 rounded-md bg-white border border-neutral-300 shadow-sm text-sm focus:outline-none focus:ring-2 focus:ring-blue-500">
                  <option value="professional">Professional</option>
                  <option value="warm">Warm</option>
                  <option value="friendly">Friendly</option>
                </select>
              </div>
              <div className="space-y-2">
                <Label htmlFor="integrationMethod" className="text-neutral-700">Integration Method</Label>
                <select id="integrationMethod" name="integrationMethod" value={formData.integrationMethod} onChange={handleChange} className="w-full h-10 px-3 rounded-md bg-white border border-neutral-300 shadow-sm text-sm focus:outline-none focus:ring-2 focus:ring-blue-500">
                  <option value="hosted">Hosted Blog</option>
                  <option value="wordpress">WordPress REST API</option>
                  <option value="embed">Embed Script</option>
                </select>
              </div>
            </div>

            {formData.integrationMethod === "wordpress" && (
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4 pt-6 border-t border-neutral-200">
                <div className="space-y-2">
                  <Label htmlFor="wordpressUrl" className="text-neutral-700">WordPress URL *</Label>
                  <Input required id="wordpressUrl" name="wordpressUrl" type="url" value={formData.wordpressUrl} onChange={handleChange} className="bg-white border-neutral-300 focus-visible:ring-blue-500 shadow-sm" placeholder="https://example.com" />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="wordpressAppPassword" className="text-neutral-700">Application Password *</Label>
                  <Input required id="wordpressAppPassword" name="wordpressAppPassword" type="password" value={formData.wordpressAppPassword} onChange={handleChange} className="bg-white border-neutral-300 focus-visible:ring-blue-500 shadow-sm" />
                </div>
              </div>
            )}

            {formData.integrationMethod === "hosted" && (
              <div className="pt-6 border-t border-neutral-200 space-y-4">
                <div className="space-y-2">
                  <Label htmlFor="customDomain" className="text-neutral-700">Custom Domain (Optional)</Label>
                  <Input id="customDomain" name="customDomain" value={formData.customDomain} onChange={handleChange} className="bg-white border-neutral-300 focus-visible:ring-blue-500 shadow-sm" placeholder="blog.titaniumsmiles.in" />
                  <p className="text-xs text-neutral-500">Do not include https://</p>
                </div>
                <p className="text-sm text-neutral-500">Default hosted URL: <span className="text-blue-600">/blog/[clinic-slug]</span></p>
              </div>
            )}

            {formData.integrationMethod === "embed" && (
              <div className="pt-6 border-t border-neutral-200">
                <p className="text-sm text-neutral-500">You will be provided an embed script to paste on the client&apos;s website.</p>
              </div>
            )}

            <div className="pt-6 border-t border-neutral-200 space-y-4">
              <div>
                <h3 className="text-base font-semibold text-neutral-900">Social Media</h3>
                <p className="text-sm text-neutral-500 mt-1">Create the clinic now, then connect Meta from the clinic settings to enable auto-posting.</p>
              </div>

              <div className="rounded-lg border border-dashed border-neutral-200 bg-neutral-50 p-4 space-y-3">
                <div className="flex items-center justify-between gap-3">
                  <div>
                    <div className="font-medium text-neutral-800">Facebook + Instagram</div>
                    <div className="text-xs text-neutral-500">Connect after the clinic is created.</div>
                  </div>
                  <Button type="button" variant="outline" disabled className="text-neutral-400 border-neutral-200">
                    Connect Facebook Page
                  </Button>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-3 pt-2">
                  <label className="flex items-center gap-2 text-sm text-neutral-700">
                    <input
                      type="checkbox"
                      checked={formData.autoPostFacebook}
                      onChange={handleChange}
                      name="autoPostFacebook"
                      className="w-4 h-4 rounded border-neutral-300 text-blue-600 focus:ring-blue-500"
                    />
                    Auto-post to Facebook
                  </label>
                  <label className="flex items-center gap-2 text-sm text-neutral-700">
                    <input
                      type="checkbox"
                      checked={formData.autoPostInstagram}
                      onChange={handleChange}
                      name="autoPostInstagram"
                      className="w-4 h-4 rounded border-neutral-300 text-blue-600 focus:ring-blue-500"
                    />
                    Auto-post to Instagram Story
                  </label>
                </div>
              </div>
            </div>

            <div className="flex items-center gap-2 pt-6 border-t border-neutral-200">
              <input type="checkbox" id="active" name="active" checked={formData.active} onChange={handleChange} className="w-5 h-5 rounded border-neutral-300 text-blue-600 focus:ring-blue-500 bg-white" />
              <Label htmlFor="active" className="cursor-pointer text-neutral-700 font-medium">Clinic is Active</Label>
            </div>

            <div className="pt-4 flex justify-end">
              <Button type="submit" disabled={isSubmitting} className="bg-blue-600 hover:bg-blue-700 text-white shadow-sm w-full sm:w-auto">
                {isSubmitting ? "Creating..." : "Create Clinic"}
              </Button>
            </div>
          </CardContent>
        </form>
      </Card>
    </div>
  );
}
