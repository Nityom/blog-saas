"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { useMutation } from "convex/react";
import { api } from "@/convex/_generated/api";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { toast } from "sonner";
import Link from "next/link";
import { ArrowLeft, Globe, MapPin, Phone, MessageCircle, User } from "lucide-react";

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
    autoPostFacebook: false,
    autoPostInstagram: false,
    subscriptionStartDate: "",
    monthlyRate: "",
    // New SEO & Author fields
    address: "",
    phone: "",
    whatsappNumber: "",
    mainWebsiteUrl: "",
    googleMapsUrl: "",
    googleMapsEmbedUrl: "",
    authorQualification: "",
    authorBio: "",
    authorPhotoUrl: "",
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
      const baseSlug = formData.name.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/(^-|-$)+/g, "");
      const services = formData.services.split(",").map(s => s.trim()).filter(Boolean);
      const doctorNames = formData.doctorNames.split(",").map(d => d.trim()).filter(Boolean);

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
        ...(formData.subscriptionStartDate ? { subscriptionStartDate: formData.subscriptionStartDate } : {}),
        ...(formData.monthlyRate ? { monthlyRate: Number(formData.monthlyRate) } : {}),
        // Add SEO and Author bio fields
        address: formData.address,
        phone: formData.phone,
        whatsappNumber: formData.whatsappNumber,
        mainWebsiteUrl: formData.mainWebsiteUrl,
        googleMapsUrl: formData.googleMapsUrl,
        googleMapsEmbedUrl: formData.googleMapsEmbedUrl,
        authorQualification: formData.authorQualification,
        authorBio: formData.authorBio,
        authorPhotoUrl: formData.authorPhotoUrl,
      });

      await seedKeywords({ clinicId, city: formData.city });
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
          <CardContent className="space-y-8">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="name" className="text-neutral-700 font-semibold">Clinic Name *</Label>
                <Input required id="name" name="name" value={formData.name} onChange={handleChange} className="bg-white border-neutral-300 focus-visible:ring-blue-500 shadow-sm" />
              </div>
              <div className="space-y-2">
                <Label htmlFor="city" className="text-neutral-700 font-semibold">City *</Label>
                <Input required id="city" name="city" value={formData.city} onChange={handleChange} className="bg-white border-neutral-300 focus-visible:ring-blue-500 shadow-sm" />
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="doctorNames" className="text-neutral-700 font-semibold">Doctor Names (comma separated)</Label>
                <Input id="doctorNames" name="doctorNames" value={formData.doctorNames} onChange={handleChange} placeholder="e.g. Dr. Tarun Pandey, Dr. Jane Doe" className="bg-white border-neutral-300 shadow-sm" />
              </div>
              <div className="space-y-2">
                <Label htmlFor="services" className="text-neutral-700 font-semibold">Services (comma separated)</Label>
                <Input id="services" name="services" value={formData.services} onChange={handleChange} placeholder="e.g. Orthodontics, Dental Implants" className="bg-white border-neutral-300 shadow-sm" />
              </div>
            </div>

            <div className="space-y-4 pt-6 border-t border-neutral-100">
              <div className="flex items-center gap-2 text-blue-600">
                <MapPin className="w-5 h-5" />
                <h3 className="font-bold text-neutral-900">Local SEO & Contact</h3>
              </div>
              <div className="space-y-2">
                <Label htmlFor="address" className="text-neutral-700">Full Address</Label>
                <Input id="address" name="address" value={formData.address} onChange={handleChange} placeholder="e.g. 123, Dental Street, Bhopal" className="bg-white border-neutral-300" />
              </div>
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="phone" className="text-neutral-700 flex items-center gap-1.5"><Phone className="w-3 h-3"/> Phone</Label>
                  <Input id="phone" name="phone" value={formData.phone} onChange={handleChange} placeholder="+91..." className="bg-white border-neutral-300" />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="whatsappNumber" className="text-neutral-700 flex items-center gap-1.5"><MessageCircle className="w-3 h-3"/> WhatsApp</Label>
                  <Input id="whatsappNumber" name="whatsappNumber" value={formData.whatsappNumber} onChange={handleChange} placeholder="91..." className="bg-white border-neutral-300" />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="mainWebsiteUrl" className="text-neutral-700 flex items-center gap-1.5"><Globe className="w-3 h-3"/> Website</Label>
                  <Input id="mainWebsiteUrl" name="mainWebsiteUrl" value={formData.mainWebsiteUrl} onChange={handleChange} placeholder="https://..." className="bg-white border-neutral-300" />
                </div>
              </div>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="googleMapsUrl" className="text-neutral-700">Google Maps Share Link</Label>
                  <Input id="googleMapsUrl" name="googleMapsUrl" value={formData.googleMapsUrl} onChange={handleChange} placeholder="https://maps.app.goo.gl/..." className="bg-white border-neutral-300" />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="googleMapsEmbedUrl" className="text-neutral-700">Maps Embed URL (iframe src)</Label>
                  <Input id="googleMapsEmbedUrl" name="googleMapsEmbedUrl" value={formData.googleMapsEmbedUrl} onChange={handleChange} placeholder="https://www.google.com/maps/embed?..." className="bg-white border-neutral-300" />
                </div>
              </div>
            </div>

            <div className="space-y-4 pt-6 border-t border-neutral-100">
              <div className="flex items-center gap-2 text-blue-600">
                <User className="w-5 h-5" />
                <h3 className="font-bold text-neutral-900">Author & E-E-A-T</h3>
              </div>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="authorQualification" className="text-neutral-700">Qualification / Degree</Label>
                  <Input id="authorQualification" name="authorQualification" value={formData.authorQualification} onChange={handleChange} placeholder="e.g. BDS, MDS - Orthodontics" className="bg-white border-neutral-300" />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="authorPhotoUrl" className="text-neutral-700">Doctor Photo URL</Label>
                  <Input id="authorPhotoUrl" name="authorPhotoUrl" value={formData.authorPhotoUrl} onChange={handleChange} placeholder="https://..." className="bg-white border-neutral-300" />
                </div>
              </div>
              <div className="space-y-2">
                <Label htmlFor="authorBio" className="text-neutral-700">Short Bio</Label>
                <Textarea id="authorBio" name="authorBio" value={formData.authorBio} onChange={handleChange} placeholder="1-2 sentences about the doctor's experience." className="bg-white border-neutral-300 min-h-[80px]" />
              </div>
            </div>

            <div className="pt-6 border-t border-neutral-100 space-y-4">
              <h3 className="font-bold text-neutral-900">Technical Config</h3>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="bookingUrl" className="text-neutral-700">Booking URL *</Label>
                  <Input required id="bookingUrl" name="bookingUrl" type="url" value={formData.bookingUrl} onChange={handleChange} className="bg-white border-neutral-300 shadow-sm" placeholder="https://..." />
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
              {formData.integrationMethod === "hosted" && (
                <div className="space-y-2">
                  <Label htmlFor="customDomain" className="text-neutral-700">Custom Domain (Optional)</Label>
                  <Input id="customDomain" name="customDomain" value={formData.customDomain} onChange={handleChange} className="bg-white border-neutral-300 shadow-sm" placeholder="blog.titaniumsmiles.in" />
                </div>
              )}
            </div>

            <div className="pt-6 border-t border-neutral-100 space-y-4">
              <h3 className="font-bold text-neutral-900">Billing</h3>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="subscriptionStartDate" className="text-neutral-700">Start Date</Label>
                  <Input id="subscriptionStartDate" name="subscriptionStartDate" type="date" value={formData.subscriptionStartDate} onChange={handleChange} className="bg-white border-neutral-300" />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="monthlyRate" className="text-neutral-700">Monthly Rate (INR)</Label>
                  <Input id="monthlyRate" name="monthlyRate" type="number" value={formData.monthlyRate} onChange={handleChange} className="bg-white border-neutral-300" placeholder="5000" />
                </div>
              </div>
            </div>

            <div className="flex items-center gap-2 pt-6 border-t border-neutral-100">
              <input type="checkbox" id="active" name="active" checked={formData.active} onChange={handleChange} className="w-5 h-5 rounded border-neutral-300 text-blue-600" />
              <Label htmlFor="active" className="cursor-pointer text-neutral-700 font-medium">Clinic is Active</Label>
            </div>

            <div className="pt-4">
              <Button type="submit" disabled={isSubmitting} className="bg-blue-600 hover:bg-blue-700 text-white shadow-sm w-full h-12 text-lg font-bold">
                {isSubmitting ? "Creating..." : "Create Clinic"}
              </Button>
            </div>
          </CardContent>
        </form>
      </Card>
    </div>
  );
}
