import { ConvexHttpClient } from "convex/browser";
import { api } from "@/convex/_generated/api";

const convex = new ConvexHttpClient(process.env.NEXT_PUBLIC_CONVEX_URL!);

export async function GET(req: Request) {
  // Get host with fallback to x-forwarded-host (common on Vercel)
  const host = req.headers.get("x-forwarded-host") || req.headers.get("host") || "";
  const hostname = host.split(":")[0];

  // Detect if we are on a custom domain or the main domain
  const isLocal = hostname.includes("localhost") || hostname.includes("127.0.0.1");
  const isVercel = hostname.includes("vercel.app") || hostname.includes("vercel.pub");
  
  // Get the configured main app hostname
  const appHostname = process.env.NEXT_PUBLIC_APP_URL 
    ? new URL(process.env.NEXT_PUBLIC_APP_URL).hostname 
    : "";
    
  const isMainDomain = isLocal || isVercel || hostname === appHostname;

  let sitemapXml = "";

  if (!isMainDomain && hostname) {
    // CUSTOM DOMAIN CASE: Serve sitemap for a specific clinic
    try {
      const clinic = await convex.query(api.clinics.getByDomain, { domain: hostname });
      
      if (clinic) {
        const posts = await convex.query(api.posts.getPublishedByClinic, { clinicId: clinic._id });
        const baseUrl = `https://${hostname}`;
        
        const postUrls = posts.map(post => `
  <url>
    <loc>${baseUrl}/${post.slug}</loc>
    <lastmod>${new Date(post.updatedAt || post.publishedAt || post.createdAt).toISOString()}</lastmod>
    <changefreq>weekly</changefreq>
    <priority>0.7</priority>
  </url>`).join("");

        sitemapXml = `<?xml version="1.0" encoding="UTF-8"?>
<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">
  <url>
    <loc>${baseUrl}/</loc>
    <lastmod>${new Date().toISOString()}</lastmod>
    <changefreq>daily</changefreq>
    <priority>1.0</priority>
  </url>${postUrls}
</urlset>`.trim();
      }
    } catch (error) {
      console.error("Sitemap Generation Error:", error);
    }
  }

  // Fallback or Main Domain Case: Serve a general sitemap
  if (!sitemapXml) {
    try {
      const clinics = await convex.query(api.clinics.getActive);
      const baseUrl = process.env.NEXT_PUBLIC_APP_URL || `https://${host}`;
      
      const clinicUrls = clinics.map(clinic => `
  <url>
    <loc>${baseUrl}/blog/${clinic.slug}</loc>
    <lastmod>${new Date(clinic.createdAt).toISOString()}</lastmod>
    <changefreq>weekly</changefreq>
    <priority>0.8</priority>
  </url>`).join("");

      sitemapXml = `<?xml version="1.0" encoding="UTF-8"?>
<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">
  <url>
    <loc>${baseUrl}/</loc>
    <lastmod>${new Date().toISOString()}</lastmod>
    <changefreq>daily</changefreq>
    <priority>1.0</priority>
  </url>${clinicUrls}
</urlset>`.trim();
    } catch (error) {
      console.error("Main Sitemap Generation Error:", error);
      return new Response("Error generating sitemap", { status: 500 });
    }
  }

  return new Response(sitemapXml, {
    headers: {
      "Content-Type": "application/xml",
      "Cache-Control": "public, s-maxage=3600, stale-while-revalidate=59",
    },
  });
}
