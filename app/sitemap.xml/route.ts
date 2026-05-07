import { ConvexHttpClient } from "convex/browser";
import { api } from "@/convex/_generated/api";

const convex = new ConvexHttpClient(process.env.NEXT_PUBLIC_CONVEX_URL!);

export const dynamic = "force-dynamic";
export const revalidate = 0;

function escapeXml(value: string) {
  return value
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&apos;");
}

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
      console.log(`[Sitemap] Custom domain detected: ${hostname}`);
      
      // Try to get clinic by exact domain match
      let clinic = await convex.query(api.clinics.getByDomain, { domain: hostname });
      
      // If not found, try with www prefix
      if (!clinic && !hostname.startsWith("www.")) {
        const wwwDomain = `www.${hostname}`;
        clinic = await convex.query(api.clinics.getByDomain, { domain: wwwDomain });
        console.log(`[Sitemap] Tried www variant: ${wwwDomain} - ${clinic ? "Found" : "Not found"}`);
      }
      
      // If still not found, try without www prefix
      if (!clinic && hostname.startsWith("www.")) {
        const noPrefixDomain = hostname.substring(4);
        clinic = await convex.query(api.clinics.getByDomain, { domain: noPrefixDomain });
        console.log(`[Sitemap] Tried non-www variant: ${noPrefixDomain} - ${clinic ? "Found" : "Not found"}`);
      }
      
      if (clinic) {
        console.log(`[Sitemap] Clinic found: ${clinic.name}`);
        const posts = await convex.query(api.posts.getPublishedByClinic, { clinicId: clinic._id });
        console.log(`[Sitemap] Found ${posts.length} published posts`);
        
        const baseUrl = `https://${hostname}`;
        
        const postUrls = posts.map(post => `
  <url>
    <loc>${escapeXml(`${baseUrl}/${post.slug}`)}</loc>
    <lastmod>${new Date(post.updatedAt || post.publishedAt || post.createdAt).toISOString()}</lastmod>
    <changefreq>weekly</changefreq>
    <priority>0.7</priority>
  </url>`).join("");

        sitemapXml = `<?xml version="1.0" encoding="UTF-8"?>
<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">
  <url>
    <loc>${escapeXml(`${baseUrl}/`)}</loc>
    <lastmod>${new Date().toISOString()}</lastmod>
    <changefreq>daily</changefreq>
    <priority>1.0</priority>
  </url>${postUrls}
</urlset>`;
      } else {
        console.warn(`[Sitemap] Clinic not found for domain: ${hostname}`);
      }
    } catch (error) {
      console.error("[Sitemap] Generation Error for custom domain:", error);
    }
  }

  // Fallback or Main Domain Case: Serve a general sitemap
  if (!sitemapXml) {
    try {
      console.log("[Sitemap] Generating main/fallback sitemap");
      const clinics = await convex.query(api.clinics.getActive);
      const baseUrl = process.env.NEXT_PUBLIC_APP_URL || `https://${hostname || "localhost"}`;
      
      console.log(`[Sitemap] Found ${clinics.length} active clinics`);
      
      const clinicUrls = clinics.map(clinic => `
  <url>
    <loc>${escapeXml(`${baseUrl}/blog/${clinic.slug}`)}</loc>
    <lastmod>${new Date(clinic.createdAt).toISOString()}</lastmod>
    <changefreq>weekly</changefreq>
    <priority>0.8</priority>
  </url>`).join("");

      sitemapXml = `<?xml version="1.0" encoding="UTF-8"?>
<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">
  <url>
    <loc>${escapeXml(`${baseUrl}/`)}</loc>
    <lastmod>${new Date().toISOString()}</lastmod>
    <changefreq>daily</changefreq>
    <priority>1.0</priority>
  </url>${clinicUrls}
</urlset>`;
    } catch (error) {
      console.error("[Sitemap] Main Sitemap Generation Error:", error);
      // Return a minimal valid sitemap even on error
      sitemapXml = `<?xml version="1.0" encoding="UTF-8"?>
<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">
  <url>
    <loc>${escapeXml(`https://${hostname || "localhost"}/`)}</loc>
    <lastmod>${new Date().toISOString()}</lastmod>
    <changefreq>daily</changefreq>
    <priority>1.0</priority>
  </url>
</urlset>`;
    }
  }

  // Ensure we always have valid XML
  if (!sitemapXml) {
    console.warn("[Sitemap] No sitemap generated, returning minimal sitemap");
    sitemapXml = `<?xml version="1.0" encoding="UTF-8"?>
<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">
  <url>
    <loc>${escapeXml(`https://${hostname || "localhost"}/`)}</loc>
    <lastmod>${new Date().toISOString()}</lastmod>
    <changefreq>daily</changefreq>
    <priority>1.0</priority>
  </url>
</urlset>`;
  }

  return new Response(sitemapXml, {
    headers: {
      "Content-Type": "application/xml; charset=utf-8",
      "Cache-Control": "no-store, no-cache, must-revalidate",
    },
  });
}
