"use client";

import { ConvexProvider, ConvexReactClient } from "convex/react";
import { ReactNode } from "react";

const convexUrl = process.env.NEXT_PUBLIC_CONVEX_URL;
const convex = convexUrl ? new ConvexReactClient(convexUrl) : null;

export default function ConvexClientProvider({
  children,
}: {
  children: ReactNode;
}) {
  if (!convex) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-neutral-950 text-white p-8 font-sans">
        <div className="max-w-md w-full bg-neutral-900 border border-neutral-800 rounded-lg p-6 space-y-4">
          <h2 className="text-xl font-bold text-red-400">Convex Not Initialized</h2>
          <p className="text-neutral-400 text-sm">
            NEXT_PUBLIC_CONVEX_URL is missing. You need to run <code className="bg-neutral-800 px-1 py-0.5 rounded text-neutral-200">npx convex dev</code> to initialize the backend and generate this environment variable.
          </p>
        </div>
      </div>
    );
  }

  return <ConvexProvider client={convex}>{children}</ConvexProvider>;
}
