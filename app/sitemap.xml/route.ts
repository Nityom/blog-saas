import { ConvexHttpClient } from "convex/browser";
import { api } from "@/convex/_generated/api";

const convex = new ConvexHttpClient(process.env.NEXT_PUBLIC_CONVEX_URL!);

// Allow CDN caching for 10 min so the sitemap is fast and crawl-friendly,
// but still refreshes within minutes when new posts are published.
export const revalidate = 600;

function escapeXml(value: string) {
  return value
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&apos;");
}

function urlEntry(loc: string, lastmod: string, changefreq: string, priority: string) {
  return `
  <url>
    <loc>${escapeXml(loc)}</loc>
    <lastmod>${lastmod}</lastmod>
    <changefreq>${changefreq}</changefreq>
    <priority>${priority}</priority>
  </url>`;
}

export async function GET(req: Request) {
  const host = req.headers.get("x-forwarded-host") || req.headers.get("host") || "";
  const hostname = host.split(":")[0];
  const protocol = req.headers.get("x-forwarded-proto") || "https";

  const isLocal = hostname.includes("localhost") || hostname.includes("127.0.0.1");
  const isVercel = hostname.includes("vercel.app") || hostname.includes("vercel.pub");
  const appHostname = process.env.NEXT_PUBLIC_APP_URL
    ? new URL(process.env.NEXT_PUBLIC_APP_URL).hostname
    : "";
  const isMainDomain = isLocal || isVercel || hostname === appHostname || !appHostname;

  let body = "";

  try {
    if (!isMainDomain && hostname) {
      // ── Custom-domain case: list posts for that clinic only ─────────────
      let clinic = await convex.query(api.clinics.getByDomain, { domain: hostname });
      if (!clinic && !hostname.startsWith("www.")) {
        clinic = await convex.query(api.clinics.getByDomain, { domain: `www.${hostname}` });
      }
      if (!clinic && hostname.startsWith("www.")) {
        clinic = await convex.query(api.clinics.getByDomain, { domain: hostname.substring(4) });
      }

      if (clinic) {
        const baseUrl = `${protocol}://${hostname}`;
        const posts = await convex.query(api.posts.getPublishedByClinic, { clinicId: clinic._id });
        const entries = [
          urlEntry(`${baseUrl}/`, new Date().toISOString(), "daily", "1.0"),
          ...posts.map((p) =>
            urlEntry(
              `${baseUrl}/${p.slug}`,
              new Date(p.updatedAt || p.publishedAt || p.createdAt).toISOString(),
              "weekly",
              "0.8",
            ),
          ),
        ].join("");
        body = `<?xml version="1.0" encoding="UTF-8"?>
<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">${entries}
</urlset>`;
      }
    }

    if (!body) {
      // ── Main / platform domain: list every clinic blog AND every post ───
      const baseUrl = process.env.NEXT_PUBLIC_APP_URL || `${protocol}://${hostname || "localhost"}`;
      const clinics = await convex.query(api.clinics.getActive);

      // Only enumerate posts for clinics whose canonical home is the platform.
      // Clinics with a custom domain expose their posts via that domain's own
      // sitemap — listing them here too would create duplicate URLs in
      // Google's index and split ranking signal.
      const hostedClinics = clinics.filter(
        (c) => c.integrationMethod === "hosted" && !c.customDomain,
      );

      const postUrlChunks = await Promise.all(
        hostedClinics.map(async (clinic) => {
          const posts = await convex.query(api.posts.getPublishedByClinic, {
            clinicId: clinic._id,
          });
          return posts.map((p) =>
            urlEntry(
              `${baseUrl}/blog/${clinic.slug}/${p.slug}`,
              new Date(p.updatedAt || p.publishedAt || p.createdAt).toISOString(),
              "weekly",
              "0.8",
            ),
          );
        }),
      );

      const entries = [
        urlEntry(`${baseUrl}/`, new Date().toISOString(), "daily", "1.0"),
        ...hostedClinics.map((c) =>
          urlEntry(`${baseUrl}/blog/${c.slug}`, new Date(c.createdAt).toISOString(), "weekly", "0.7"),
        ),
        ...postUrlChunks.flat(),
      ].join("");

      body = `<?xml version="1.0" encoding="UTF-8"?>
<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">${entries}
</urlset>`;
    }
  } catch (error) {
    console.error("[Sitemap] generation error:", error);
    body = `<?xml version="1.0" encoding="UTF-8"?>
<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">${urlEntry(
      `${protocol}://${hostname || "localhost"}/`,
      new Date().toISOString(),
      "daily",
      "1.0",
    )}
</urlset>`;
  }

  return new Response(body, {
    headers: {
      "Content-Type": "application/xml; charset=utf-8",
      "Cache-Control": "public, max-age=600, s-maxage=600, stale-while-revalidate=3600",
    },
  });
}
