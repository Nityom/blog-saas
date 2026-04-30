"use client";

import { useState } from "react";
import { useAction, useQuery } from "convex/react";
import { api } from "@/convex/_generated/api";
import { useParams, useRouter } from "next/navigation";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { toast } from "sonner";
import Link from "next/link";
import { ArrowLeft, CheckCircle2, Circle, Loader2 } from "lucide-react";

export default function GeneratePostPage() {
  const params = useParams();
  const router = useRouter();
  const clinicId = params.clinicId as string;

  const clinic = useQuery(api.clinics.getById, { clinicId: clinicId as any });
  const generateAction = useAction(api.generation.generatePost);

  const [status, setStatus] = useState<"idle" | "generating" | "success" | "error">("idle");
  const [errorMessage, setErrorMessage] = useState("");

  if (clinic === undefined) {
    return <div className="p-8 text-neutral-400">Loading...</div>;
  }

  if (clinic === null) {
    return <div className="p-8 text-neutral-400">Clinic not found.</div>;
  }

  const handleGenerate = async () => {
    setStatus("generating");
    setErrorMessage("");
    try {
      // Calling the action which handles the full 2-pass pipeline
      await generateAction({ clinicId: clinic._id });
      setStatus("success");
      toast.success("Post generation complete!");
    } catch (error: any) {
      console.error(error);
      setStatus("error");
      setErrorMessage(error.message || "Failed to generate post.");
      toast.error("Generation failed");
    }
  };

  return (
    <div className="p-8 max-w-2xl mx-auto space-y-6">
      <div className="flex items-center gap-4">
        <Link href={`/super-admin/clinics/${clinic._id}`}>
          <Button variant="ghost" size="icon" className="text-neutral-400 hover:text-white hover:bg-neutral-800">
            <ArrowLeft className="h-5 w-5" />
          </Button>
        </Link>
        <div>
          <h2 className="text-2xl font-bold text-white tracking-tight">Generate Post</h2>
          <p className="text-neutral-400">for {clinic.name}</p>
        </div>
      </div>

      <Card className="bg-neutral-900 border-neutral-800 text-white">
        <CardHeader>
          <CardTitle>Manual Trigger</CardTitle>
          <CardDescription className="text-neutral-400">
            This will trigger the full AI pipeline: Keyword Selection → Draft (Pass 1) → Safety Check (Pass 2) → SEO & Image Fetch.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-6">
          <div className="bg-neutral-950 p-6 rounded-md border border-neutral-800 space-y-4">
            <div className="flex items-center gap-3">
              {status === "idle" ? <Circle className="text-neutral-600 w-5 h-5" /> : 
               status === "generating" ? <Loader2 className="text-blue-500 w-5 h-5 animate-spin" /> : 
               <CheckCircle2 className="text-green-500 w-5 h-5" />}
              <span className={status === "generating" ? "text-white" : "text-neutral-400"}>
                {status === "idle" ? "Ready to generate" : 
                 status === "generating" ? "Running AI Pipeline (this takes ~30 seconds)..." : 
                 status === "error" ? "Generation Failed" : "Complete!"}
              </span>
            </div>
            
            {status === "error" && (
              <div className="text-red-400 text-sm mt-2 p-3 bg-red-950/20 border border-red-900/30 rounded">
                Error: {errorMessage}
              </div>
            )}
          </div>

          <div className="flex gap-3 justify-end pt-4">
            {status === "success" ? (
              <Link href={`/clinic/${clinic._id}/posts`}>
                <Button className="bg-blue-600 hover:bg-blue-700 text-white">View Posts in Tenant Portal</Button>
              </Link>
            ) : (
              <Button 
                onClick={handleGenerate} 
                disabled={status === "generating"} 
                className="bg-blue-600 hover:bg-blue-700 text-white"
              >
                {status === "generating" ? "Generating..." : "Generate Now"}
              </Button>
            )}
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
