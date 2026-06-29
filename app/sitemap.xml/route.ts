import { ConvexHttpClient } from "convex/browser";
import { api } from "@/convex/_generated/api";

export const dynamic = "force-dynamic";
export const revalidate = 0;

const convex = new ConvexHttpClient(process.env.NEXT_PUBLIC_CONVEX_URL!);

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function toDate(ts: number): string {
  return new Date(ts).toISOString().split("T")[0];
}

function urlEntry(
  loc: string,
  lastmod: string,
  changefreq: "always" | "daily" | "weekly" | "monthly" | "yearly" | "never",
  priority: string,
): string {
  return `  <url>\n    <loc>${loc}</loc>\n    <lastmod>${lastmod}</lastmod>\n    <changefreq>${changefreq}</changefreq>\n    <priority>${priority}</priority>\n  </url>`;
}

function buildXml(entries: string[]): string {
  return [
    '<?xml version="1.0" encoding="UTF-8"?>',
    '<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">',
    ...entries,
    "</urlset>",
  ].join("\n");
}

function okResponse(xml: string): Response {
  return new Response(xml, {
    status: 200,
    headers: {
      "Content-Type": "application/xml; charset=utf-8",
      // Cache for 1 h on CDN; fresh enough for daily blogs
      "Cache-Control": "public, max-age=3600, s-maxage=3600, stale-while-revalidate=86400",
    },
  });
}

function fallbackResponse(proto: string, hostname: string): Response {
  const today = toDate(Date.now());
  return new Response(buildXml([urlEntry(`${proto}://${hostname}/`, today, "daily", "1.0")]), {
    status: 200,
    headers: {
      "Content-Type": "application/xml; charset=utf-8",
      // Never cache an error/fallback response
      "Cache-Control": "no-store, no-cache, must-revalidate",
    },
  });
}

// ---------------------------------------------------------------------------
// Handler
// ---------------------------------------------------------------------------

export async function GET(req: Request): Promise<Response> {
  const host = req.headers.get("x-forwarded-host") ?? req.headers.get("host") ?? "";
  const hostname = host.split(":")[0].toLowerCase();
  const proto = (req.headers.get("x-forwarded-proto") ?? "https").split(",")[0].trim();
  const today = toDate(Date.now());

  const appHostname = (() => {
    try {
      return process.env.NEXT_PUBLIC_APP_URL
        ? new URL(process.env.NEXT_PUBLIC_APP_URL).hostname
        : "";
    } catch {
      return "";
    }
  })();

  const isMainDomain =
    !hostname ||
    hostname === "localhost" ||
    hostname.startsWith("127.") ||
    hostname.includes("vercel.app") ||
    hostname.includes("vercel.pub") ||
    (appHostname !== "" && hostname === appHostname);

  // ── Custom clinic domain (e.g. blog.titaniumsmiles.in) ───────────────────
  if (!isMainDomain) {
    try {
      const bare = hostname.replace(/^www\./, "");

      // Try bare first, then www variant
      const clinic =
        (await convex.query(api.clinics.getByDomain, { domain: bare })) ??
        (await convex.query(api.clinics.getByDomain, { domain: `www.${bare}` }));

      if (!clinic) {
        return fallbackResponse(proto, hostname);
      }

      const posts = await convex.query(api.posts.getPublishedByClinic, {
        clinicId: clinic._id,
      });

      // Sort newest-first so crawlers see fresh content at the top
      const sorted = [...posts].sort(
        (a, b) => (b.publishedAt ?? b.createdAt) - (a.publishedAt ?? a.createdAt),
      );

      const base = `${proto}://${hostname}`;
      const entries = [
        urlEntry(`${base}/`, today, "daily", "1.0"),
        ...sorted.map((p) =>
          urlEntry(
            `${base}/${p.slug}`,
            toDate(p.updatedAt ?? p.publishedAt ?? p.createdAt),
            "weekly",
            "0.8",
          ),
        ),
      ];

      return okResponse(buildXml(entries));
    } catch (err) {
      console.error("[sitemap.xml] custom domain error:", hostname, err);
      return fallbackResponse(proto, hostname);
    }
  }

  // ── Main platform domain ─────────────────────────────────────────────────
  try {
    const base = (process.env.NEXT_PUBLIC_APP_URL ?? `${proto}://${hostname}`).replace(/\/$/, "");

    const allClinics = await convex.query(api.clinics.getActive);
    // Only include clinics served on the platform domain (no custom domain)
    const hosted = allClinics.filter((c) => !c.customDomain);

    const postGroups = await Promise.all(
      hosted.map((c) => convex.query(api.posts.getPublishedByClinic, { clinicId: c._id })),
    );

    const entries: string[] = [urlEntry(`${base}/`, today, "daily", "1.0")];

    for (let i = 0; i < hosted.length; i++) {
      const clinic = hosted[i];
      const posts = [...postGroups[i]].sort(
        (a, b) => (b.publishedAt ?? b.createdAt) - (a.publishedAt ?? a.createdAt),
      );
      entries.push(urlEntry(`${base}/blog/${clinic.slug}`, toDate(clinic.createdAt), "weekly", "0.7"));
      for (const p of posts) {
        entries.push(
          urlEntry(
            `${base}/blog/${clinic.slug}/${p.slug}`,
            toDate(p.updatedAt ?? p.publishedAt ?? p.createdAt),
            "weekly",
            "0.8",
          ),
        );
      }
    }

    return okResponse(buildXml(entries));
  } catch (err) {
    console.error("[sitemap.xml] main domain error:", err);
    return fallbackResponse(proto, hostname);
  }
}
