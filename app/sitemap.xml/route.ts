import { ConvexHttpClient } from "convex/browser";
import { api } from "@/convex/_generated/api";

const convex = new ConvexHttpClient(process.env.NEXT_PUBLIC_CONVEX_URL!);

// This route serves DIFFERENT content per host (custom-domain clinic vs platform).
// Next.js ISR caches by path only — so the first host's response would be served
// to all subsequent hosts. force-dynamic disables ISR; CDN caching is handled by
// the Cache-Control header below, which Vercel correctly keys per URL+host.
export const dynamic = "force-dynamic";

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
  const protocol = (req.headers.get("x-forwarded-proto") || "https").split(",")[0].trim();

  const isLocal = hostname.includes("localhost") || hostname.includes("127.0.0.1");
  const isVercel = hostname.includes("vercel.app") || hostname.includes("vercel.pub");
  const appHostname = process.env.NEXT_PUBLIC_APP_URL
    ? new URL(process.env.NEXT_PUBLIC_APP_URL).hostname
    : "";
  // Do NOT fall back to "main domain" when appHostname is empty — that would
  // cause every custom clinic domain to skip the clinic lookup and return the
  // platform sitemap (with 0 posts) when NEXT_PUBLIC_APP_URL is unset.
  const isMainDomain = isLocal || isVercel || (appHostname !== "" && hostname === appHostname);

  // Abort the Convex queries if they take too long so the function always
  // returns a valid 200 XML response instead of timing out with a 504.
  // 5 s gives a large buffer below Vercel's 10 s serverless limit even on cold starts.
  const TIMEOUT_MS = 5000;
  const timeoutPromise = new Promise<never>((_, reject) =>
    setTimeout(() => reject(new Error("sitemap timeout")), TIMEOUT_MS),
  );

  let body = "";

  try {
    body = await Promise.race([buildSitemap(isMainDomain, hostname, protocol), timeoutPromise]);
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
      // no-store prevents CDN from caching a stale/error response on cold starts.
      // Google re-fetches sitemaps every few days so caching is not needed here.
      "Cache-Control": "no-store, no-cache, must-revalidate",
    },
  });
}

async function buildSitemap(isMainDomain: boolean, hostname: string, protocol: string) {
  let body = "";

  if (!isMainDomain && hostname) {
    // ── Custom-domain case: list posts for that clinic only ─────────────
    // Query bare and www variants in parallel to halve lookup latency.
    const bare = hostname.startsWith("www.") ? hostname.substring(4) : hostname;
    const www = hostname.startsWith("www.") ? hostname : `www.${hostname}`;
    const [clinicByBare, clinicByWww] = await Promise.all([
      convex.query(api.clinics.getByDomain, { domain: bare }),
      convex.query(api.clinics.getByDomain, { domain: www }),
    ]);
    let clinic = clinicByBare ?? clinicByWww;

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

  return body;
}
