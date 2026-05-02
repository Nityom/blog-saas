"use client";

import { useState } from "react";
import { useAction, useMutation } from "convex/react";
import { api } from "@/convex/_generated/api";
import { Id } from "@/convex/_generated/dataModel";
import { useParams, useRouter } from "next/navigation";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { toast } from "sonner";
import Link from "next/link";
import { ArrowLeft, Loader2, Upload, X } from "lucide-react";

export default function CustomPostPage() {
  const params = useParams();
  const router = useRouter();
  const clinicId = params.clinicId as string;

  const generateCustomPost = useAction(api.generation.generateCustomPost);
  const generateUploadUrl = useMutation(api.posts.generateUploadUrl);
  const updatePost = useMutation(api.posts.update);

  const [prompt, setPrompt] = useState("");
  const [imageFile, setImageFile] = useState<File | null>(null);
  const [imagePreview, setImagePreview] = useState<string | null>(null);
  const [isGenerating, setIsGenerating] = useState(false);

  const handleImageSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      setImageFile(file);
      const url = URL.createObjectURL(file);
      setImagePreview(url);
    }
  };

  const removeImage = () => {
    setImageFile(null);
    if (imagePreview) {
      URL.revokeObjectURL(imagePreview);
      setImagePreview(null);
    }
  };

  const handleGenerate = async () => {
    if (!prompt.trim()) {
      toast.error("Please enter a prompt.");
      return;
    }
    
    setIsGenerating(true);
    try {
      const postId = await generateCustomPost({ clinicId: clinicId as Id<"clinics">, prompt });
      if (!postId) {
        throw new Error("Failed to create the custom post draft.");
      }
      
      if (imageFile) {
        toast.info("Uploading image...");
        const postUrl = await generateUploadUrl();
        const result = await fetch(postUrl, {
          method: "POST",
          headers: { "Content-Type": imageFile.type },
          body: imageFile,
        });
        const { storageId } = await result.json();
        
        await updatePost({
          postId,
          storageId,
        });
      }

      toast.success("New post generated as draft!");
      router.push(`/clinic/${clinicId}/posts/${postId}`);
    } catch (error: unknown) {
      toast.error(error instanceof Error ? error.message : "Generation failed.");
    } finally {
      setIsGenerating(false);
    }
  };

  return (
    <div className="p-8 max-w-2xl mx-auto space-y-6">
      <div className="flex items-center gap-4">
        <Link href={`/clinic/${clinicId}/posts`}>
          <Button variant="ghost" size="icon" className="text-neutral-500 hover:text-neutral-900">
            <ArrowLeft className="h-5 w-5" />
          </Button>
        </Link>
        <div>
          <h2 className="text-2xl font-bold text-neutral-900 tracking-tight">Create Custom Post</h2>
          <p className="text-neutral-500">Provide a topic or text to instantly generate a blog post.</p>
        </div>
      </div>

      <Card className="bg-white border-neutral-200">
        <CardHeader>
          <CardTitle>AI Prompt</CardTitle>
          <CardDescription>
            What should this post be about? You can add specific details, local references, or a patient FAQ.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <Textarea 
            placeholder="e.g. Write a post about the importance of flossing for children under 10..."
            className="min-h-[150px] resize-y"
            value={prompt}
            onChange={(e) => setPrompt(e.target.value)}
            disabled={isGenerating}
          />

          <div className="pt-4 space-y-3">
            <div className="text-sm font-medium text-neutral-900">Featured Image (Optional)</div>
            {imagePreview ? (
              <div className="relative inline-block border border-neutral-200 rounded-md p-1">
                <img src={imagePreview} alt="Preview" className="h-32 w-auto object-cover rounded-sm" />
                <button
                  type="button"
                  onClick={removeImage}
                  disabled={isGenerating}
                  className="absolute -top-2 -right-2 bg-white border border-neutral-200 text-neutral-500 hover:text-red-500 rounded-full p-1 shadow-sm"
                >
                  <X className="w-4 h-4" />
                </button>
              </div>
            ) : (
              <div>
                <input
                  type="file"
                  id="customImageUpload"
                  className="hidden"
                  accept="image/*"
                  onChange={handleImageSelect}
                  disabled={isGenerating}
                />
                <label htmlFor="customImageUpload" className="cursor-pointer inline-block">
                  <div className="inline-flex items-center justify-center rounded-md border border-neutral-200 bg-neutral-50 hover:bg-neutral-100 text-neutral-700 h-9 px-4 text-sm font-medium transition-colors" {...(isGenerating ? {style: {opacity: 0.5, pointerEvents: 'none'}} : {})}>
                    <Upload className="w-4 h-4 mr-2" />
                    Select Image
                  </div>
                </label>
              </div>
            )}
          </div>

          <div className="flex justify-end pt-4 border-t border-neutral-100">
            <Button 
              onClick={handleGenerate} 
              disabled={isGenerating || !prompt.trim()} 
              className="bg-blue-600 hover:bg-blue-700 text-white"
            >
              {isGenerating && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
              {isGenerating ? "Generating..." : "Generate Post & Edit"}
            </Button>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
