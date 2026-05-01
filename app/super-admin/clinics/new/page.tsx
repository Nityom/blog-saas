"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { useMutation } from "convex/react";
import { api } from "@/convex/_generated/api";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { toast } from "sonner";
import Link from "next/link";
import { ArrowLeft } from "lucide-react";

export default function NewClinicPage() {
  const router = useRouter();
  const createClinic = useMutation(api.clinics.create);
  const seedKeywords = useMutation(api.keywords.seedDefaultKeywords);

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
  });

  const [isSubmitting, setIsSubmitting] = useState(false);
  
  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement>) => {
    const { name, value, type } = e.target;
    const checked = (e.target as HTMLInputElement).checked;
    setFormData(prev => ({
      ...prev,
      [name]: type === "checkbox" ? checked : value
    }));
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

      // 3. Create Clinic
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
        } : {})
      });

      // 4. Seed Keywords
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
