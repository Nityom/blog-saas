import { ConvexHttpClient } from "convex/browser";
import { api } from "@/convex/_generated/api";

// Must be force-dynamic: this route serves DIFFERENT content per Host header.
// Next.js ISR caches by path only — the first host's response would be served
// to every subsequent host. force-dynamic disables ISR entirely.
export const dynamic = "force-dynamic";

// Edge runtime: near-zero cold start (vs ~500ms Node.js cold start).
// ConvexHttpClient uses the Fetch API only — no Node.js builtins — so it
// runs in Edge without modification. This prevents Googlebot from hitting
// a 504 during a Node.js cold start.
export const runtime = "edge";

const convex = new ConvexHttpClient(process.env.NEXT_PUBLIC_CONVEX_URL!);

// ─── helpers ────────────────────────────────────────────────────────────────

function escapeXml(s: string) {
  return s
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&apos;");
}

function urlEntry(loc: string, lastmod: string, changefreq: string, priority: string) {
  return `\n  <url>\n    <loc>${escapeXml(loc)}</loc>\n    <lastmod>${lastmod}</lastmod>\n    <changefreq>${changefreq}</changefreq>\n    <priority>${priority}</priority>\n  </url>`;
}

function wrapUrlset(entries: string) {
  return `<?xml version="1.0" encoding="UTF-8"?>\n<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">${entries}\n</urlset>`;
}

function xmlResponse(body: string) {
  return new Response(body, {
    status: 200,
    headers: {
      "Content-Type": "application/xml; charset=utf-8",
      // no-store: prevents CDN/edge from caching an error response on cold starts.
      // Googlebot re-fetches sitemaps infrequently so there is no benefit to caching.
      "Cache-Control": "no-store, no-cache, must-revalidate",
    },
  });
}

// ─── request handler ─────────────────────────────────────────────────────────

export async function GET(req: Request) {
  const host = req.headers.get("x-forwarded-host") || req.headers.get("host") || "";
  const hostname = host.split(":")[0].toLowerCase();
  // x-forwarded-proto may be a comma-separated list ("http,https") on some proxies.
  const protocol = (req.headers.get("x-forwarded-proto") || "https").split(",")[0].trim();

  let appHostname = "";
  try {
    appHostname = process.env.NEXT_PUBLIC_APP_URL
      ? new URL(process.env.NEXT_PUBLIC_APP_URL).hostname
      : "";
  } catch {
    // malformed env var — treat as unset
  }

  const isMainDomain =
    !hostname ||
    hostname === "localhost" ||
    hostname.startsWith("127.") ||
    hostname.includes("vercel.app") ||
    hostname.includes("vercel.pub") ||
    (appHostname !== "" && hostname === appHostname);

  // Minimal fallback — always valid XML so Google never sees a non-200.
  const fallback = wrapUrlset(
    urlEntry(`${protocol}://${hostname || "localhost"}/`, new Date().toISOString(), "daily", "1.0"),
  );

  try {
    const body = await Promise.race([
      isMainDomain
        ? buildPlatformSitemap(protocol, hostname)
        : buildClinicSitemap(protocol, hostname),
      new Promise<never>((_, reject) =>
        setTimeout(() => reject(new Error("sitemap_timeout")), 8000),
      ),
    ]);
    return xmlResponse(body);
  } catch (err) {
    console.error("[sitemap.xml] failed:", (err as Error).message);
    return xmlResponse(fallback);
  }
}

// ─── per-clinic sitemap (custom domain) ──────────────────────────────────────

async function buildClinicSitemap(protocol: string, hostname: string): Promise<string> {
  // Look up both bare and www variants simultaneously to halve latency.
  const bare = hostname.startsWith("www.") ? hostname.slice(4) : hostname;
  const www = hostname.startsWith("www.") ? hostname : `www.${hostname}`;

  const [clinicByBare, clinicByWww] = await Promise.all([
    convex.query(api.clinics.getByDomain, { domain: bare }),
    convex.query(api.clinics.getByDomain, { domain: www }),
  ]);

  const clinic = clinicByBare ?? clinicByWww;

  if (!clinic) {
    // Unknown custom domain — return a minimal valid sitemap, NOT the platform
    // sitemap (which would expose all other clinics' URLs on a foreign domain).
    console.warn(`[sitemap.xml] no clinic found for hostname: ${hostname}`);
    return wrapUrlset(
      urlEntry(`${protocol}://${hostname}/`, new Date().toISOString(), "daily", "1.0"),
    );
  }

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

  return wrapUrlset(entries);
}

// ─── platform sitemap (main domain) ──────────────────────────────────────────

async function buildPlatformSitemap(protocol: string, hostname: string): Promise<string> {
  const baseUrl = (process.env.NEXT_PUBLIC_APP_URL || `${protocol}://${hostname}`).replace(/\/$/, "");

  const clinics = await convex.query(api.clinics.getActive);

  // Only enumerate posts for clinics whose canonical home is the platform.
  // Clinics with a custom domain expose their posts via that domain's own
  // sitemap — listing them here creates duplicate URLs that split ranking signal.
  const hostedClinics = clinics.filter(
    (c) => c.integrationMethod === "hosted" && !c.customDomain,
  );

  const postUrlChunks = await Promise.all(
    hostedClinics.map(async (clinic) => {
      const posts = await convex.query(api.posts.getPublishedByClinic, { clinicId: clinic._id });
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

  return wrapUrlset(entries);
}
