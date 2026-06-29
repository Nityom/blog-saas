import { ConvexHttpClient } from "convex/browser";
import { api } from "@/convex/_generated/api";

// Force every request to be evaluated at runtime — never statically cached.
export const dynamic = "force-dynamic";

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

/** Escape characters that are invalid inside XML text / attribute values. */
function esc(s: string): string {
  return s
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&apos;");
}

function toDate(ts: number): string {
  return new Date(ts).toISOString().split("T")[0];
}

type UrlEntry = { loc: string; lastmod: string; priority: string };

function buildSitemap(urls: UrlEntry[]): string {
  const inner = urls
    .map(
      (u) =>
        `  <url>\n    <loc>${esc(u.loc)}</loc>\n    <lastmod>${u.lastmod}</lastmod>\n    <priority>${u.priority}</priority>\n  </url>`,
    )
    .join("\n");
  return `<?xml version="1.0" encoding="UTF-8"?>\n<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">\n${inner}\n</urlset>`;
}

function xmlOk(xml: string): Response {
  return new Response(xml, {
    status: 200,
    headers: {
      "Content-Type": "application/xml; charset=utf-8",
      "Cache-Control": "public, max-age=3600, s-maxage=3600",
    },
  });
}

/** Always returns a syntactically valid minimal sitemap — used on any error path. */
function minimal(base: string): Response {
  const today = toDate(Date.now());
  return xmlOk(buildSitemap([{ loc: `${base}/`, lastmod: today, priority: "1.0" }]));
}

// ---------------------------------------------------------------------------
// Handler
// ---------------------------------------------------------------------------

export async function GET(req: Request): Promise<Response> {
  // ── Resolve origin ────────────────────────────────────────────────────────
  const rawHost =
    req.headers.get("x-forwarded-host") ?? req.headers.get("host") ?? "localhost";
  const hostname = rawHost.split(":")[0].toLowerCase();
  const proto = (req.headers.get("x-forwarded-proto") ?? "https").split(",")[0].trim();
  const base = `${proto}://${hostname}`;
  const today = toDate(Date.now());

  // ── Detect domain type ────────────────────────────────────────────────────
  let appHostname = "";
  try {
    if (process.env.NEXT_PUBLIC_APP_URL) {
      appHostname = new URL(process.env.NEXT_PUBLIC_APP_URL).hostname;
    }
  } catch {
    // ignore — appHostname stays ""
  }

  const isCustomDomain =
    hostname !== "localhost" &&
    !hostname.startsWith("127.") &&
    !hostname.includes("vercel.app") &&
    !hostname.includes("vercel.pub") &&
    (appHostname === "" || hostname !== appHostname);

  // ── Convex client (created here so any init error is caught below) ────────
  let convex: ConvexHttpClient;
  try {
    convex = new ConvexHttpClient(process.env.NEXT_PUBLIC_CONVEX_URL ?? "");
  } catch {
    return minimal(base);
  }

  // ── Custom clinic domain (e.g. blog.titaniumsmiles.in) ───────────────────
  if (isCustomDomain) {
    try {
      const bare = hostname.replace(/^www\./, "");
      const clinic =
        (await convex.query(api.clinics.getByDomain, { domain: bare })) ??
        (await convex.query(api.clinics.getByDomain, { domain: `www.${bare}` }));

      if (!clinic) {
        return minimal(base);
      }

      const posts = await convex.query(api.posts.getPublishedByClinic, {
        clinicId: clinic._id,
      });

      const urls: UrlEntry[] = [{ loc: `${base}/`, lastmod: today, priority: "1.0" }];

      const sorted = [...posts].sort(
        (a, b) => (b.publishedAt ?? b.createdAt) - (a.publishedAt ?? a.createdAt),
      );
      for (const p of sorted) {
        urls.push({
          loc: `${base}/${p.slug}`,
          lastmod: toDate(p.updatedAt ?? p.publishedAt ?? p.createdAt),
          priority: "0.8",
        });
      }

      return xmlOk(buildSitemap(urls));
    } catch (err) {
      console.error("[sitemap.xml] custom-domain error:", hostname, err);
      return minimal(base);
    }
  }

  // ── Main platform domain ──────────────────────────────────────────────────
  try {
    const appBase = (process.env.NEXT_PUBLIC_APP_URL ?? base).replace(/\/$/, "");

    const allClinics = await convex.query(api.clinics.getActive);
    const hosted = allClinics.filter((c) => !c.customDomain);

    const urls: UrlEntry[] = [{ loc: `${appBase}/`, lastmod: today, priority: "1.0" }];

    for (const clinic of hosted) {
      urls.push({
        loc: `${appBase}/blog/${clinic.slug}`,
        lastmod: toDate(clinic.createdAt),
        priority: "0.7",
      });
      const posts = await convex.query(api.posts.getPublishedByClinic, {
        clinicId: clinic._id,
      });
      for (const p of posts) {
        urls.push({
          loc: `${appBase}/blog/${clinic.slug}/${p.slug}`,
          lastmod: toDate(p.updatedAt ?? p.publishedAt ?? p.createdAt),
          priority: "0.8",
        });
      }
    }

    return xmlOk(buildSitemap(urls));
  } catch (err) {
    console.error("[sitemap.xml] main-domain error:", hostname, err);
    return minimal(base);
  }
}
