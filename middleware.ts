import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";
import { ConvexHttpClient } from "convex/browser";
import { api } from "./convex/_generated/api";

const convex = new ConvexHttpClient(process.env.NEXT_PUBLIC_CONVEX_URL!);

// Match all routes except for static assets, Next.js internals, and API routes
export const config = {
  matcher: [
    "/((?!api/|_next/|_static/|_vercel|[\\w-]+\\.\\w+).*)",
  ],
};

export async function middleware(req: NextRequest) {
  const url = req.nextUrl;

  // Get hostname of request (e.g. blog.titaniumsmiles.in:3000, demo.vercel.app, localhost:3000)
  const hostHeader = req.headers.get("host");

  if (!hostHeader) {
    return NextResponse.next();
  }

  // Strip the port number for local testing (e.g. blog.titaniumsmiles.in:3000 -> blog.titaniumsmiles.in)
  const hostname = hostHeader.split(":")[0];

  // Check if this is a local environment or Vercel preview domain
  // You might want to customize this list with your actual vercel.app domain
  const isLocal = hostname.includes("localhost") || hostname.includes("127.0.0.1");
  const isVercel = hostname.includes("vercel.app") || hostname.includes("vercel.pub");
  
  if (isLocal || isVercel) {
    return NextResponse.next();
  }

  // For any custom domain, fetch the clinic slug from Convex
  try {
    const clinic = await convex.query(api.clinics.getByDomain, { domain: hostname });
    
    if (clinic) {
      // Rewrite to our native blog route: /blog/[clinicSlug]
      // This allows Next.js to render the page as if the user visited /blog/...
      return NextResponse.rewrite(new URL(`/blog/${clinic.slug}${url.pathname === '/' ? '' : url.pathname}`, req.url));
    }
  } catch (error) {
    console.error("Middleware Convex Error:", error);
  }

  // If no clinic matches the custom domain, you can return a 404 or redirect somewhere else
  // For now, we'll just let it fall through which will probably 404 naturally
  return NextResponse.next();
}
