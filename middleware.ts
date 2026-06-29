import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";
import { ConvexHttpClient } from "convex/browser";
import { api } from "./convex/_generated/api";

const convex = new ConvexHttpClient(process.env.NEXT_PUBLIC_CONVEX_URL!);

// Match all routes except for static assets, Next.js internals, and API routes.
// /favicon.ico is included explicitly so custom-domain clinics get their logo
// served as the favicon instead of the platform default.
// SEO system paths (sitemap.xml, robots.txt, etc.) are also included so the
// middleware can explicitly pass them through without rewriting.
export const config = {
  matcher: [
    "/((?!api/|_next/|_static/|_vercel|[\\w-]+\\.\\w+).*)",
    "/favicon.ico",
    "/sitemap.xml",
    "/sitemap.txt",
    "/robots.txt",
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

  // Always let SEO/system paths be handled by their own route handlers.
  // These must never be rewritten to /blog/[clinicSlug]/[path] or they 404.
  const SYSTEM_PATHS = ["/sitemap.xml", "/sitemap.txt", "/robots.txt"];
  if (SYSTEM_PATHS.includes(url.pathname)) {
    return NextResponse.next();
  }

  // For any custom domain, fetch the clinic slug from Convex
  try {
    const clinic = await convex.query(api.clinics.getByDomain, { domain: hostname });
    
    if (clinic) {
      // For favicon requests, redirect to the clinic's uploaded logo so the
      // browser tab shows the clinic brand instead of the platform default.
      if (url.pathname === '/favicon.ico' && clinic.logoUrl) {
        return NextResponse.redirect(clinic.logoUrl, { status: 302 });
      }

      // Rewrite to our native blog route: /blog/[clinicSlug]
      // This allows Next.js to render the page as if the user visited /blog/...
      const rewriteUrl = new URL(`/blog/${clinic.slug}${url.pathname === '/' ? '' : url.pathname}`, req.url);
      // Preserve query params (e.g. ?page=2) — new URL() drops them when given an absolute path
      rewriteUrl.search = url.search;
      return NextResponse.rewrite(rewriteUrl);
    }
  } catch (error) {
    console.error("Middleware Convex Error:", error);
  }

  // If no clinic matches the custom domain, you can return a 404 or redirect somewhere else
  // For now, we'll just let it fall through which will probably 404 naturally
  return NextResponse.next();
}
