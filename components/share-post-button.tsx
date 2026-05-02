"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Share2 } from "lucide-react";
import { toast } from "sonner";

export default function SharePostButton({ url, title }: { url: string; title: string }) {
  const [isSharing, setIsSharing] = useState(false);

  const handleShare = async (event: React.MouseEvent<HTMLButtonElement>) => {
    event.preventDefault();
    event.stopPropagation();

    try {
      setIsSharing(true);

      if (navigator.share) {
        await navigator.share({
          title,
          url,
        });
        return;
      }

      await navigator.clipboard.writeText(url);
      toast.success("Blog link copied to clipboard");
    } catch (error: unknown) {
      if ((error as DOMException)?.name !== "AbortError") {
        toast.error((error as Error).message || "Failed to share link");
      }
    } finally {
      setIsSharing(false);
    }
  };

  return (
    <Button
      type="button"
      variant="outline"
      size="icon"
      className="h-9 w-9 rounded-full border-neutral-200 bg-white/95 text-neutral-600 shadow-sm hover:bg-blue-50 hover:text-blue-600"
      onClick={handleShare}
      disabled={isSharing}
      aria-label="Share blog post"
      title="Share blog post"
    >
      <Share2 className="h-4 w-4" />
    </Button>
  );
}
