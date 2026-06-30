"use client";

import { useEffect } from "react";

export default function PostViewTracker({ clinicId, postId }: { clinicId: string, postId: string }) {
  useEffect(() => {
    // Fire and forget view tracking
    fetch(`${process.env.NEXT_PUBLIC_APP_URL}/api/analytics/view`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({ clinicId, postId }),
    }).catch(console.error);
  }, [clinicId, postId]);

  return null;
}
