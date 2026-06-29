import { ConvexHttpClient } from "convex/browser";
import { api } from "@/convex/_generated/api";

export const dynamic = "force-dynamic";
export const revalidate = 0;

const convex = new ConvexHttpClient(process.env.NEXT_PUBLIC_CONVEX_URL!);

function w3cDate(ts: number): string {
  return new Date(ts).toISOString().split("T")[0];
}

function buildUrlEntry(
  loc: string,
  lastmod: string,
  changefreq: string,
  priority: string,
): string {
  return [
    "  <url>",
    `    <loc>${loc}</loc>`,
    `    <lastmod>${lastmod}</lastmod>`,
    `    <changefreq>${changefreq}</changefreq>`,
    `    <priority>${priority}</priority>`,
    "  </url>",
  ].join("\n");
}

function buildSitemapXml(entries: string[]): string {
  return [
    '<?xml version="1.0" encoding="UTF-8"?>',
    '<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">',
    ...entries,
    "</urlset>",
  ].join("\n");
}

function xmlResponse(xml: string, cacheSeconds = 3600): Response {
  return new Response(xml, {
    status: 200,
    headers: {
      "Content-Type": "application/xml; charset=utf-8",
      "Cache-Control": `public, max-age=${cacheSeconds}, s-maxage=${cacheSeconds}, stale-while-revalidate=${cacheSeconds * 24}`,
    },
  });
}

function errorResponse(xml: string): Response {
  return new Response(xml, {
    status: 200,
    headers: {
      "Content-Type": "application/xml; charset=utf-8",
      "Cache-Control": "no-store, no-cache, must-revalidate",
    },
  });
}

export async function GET(req: Request): Promise<Response> {
  const host = req.headers.get("x-forwarded-host") || req.headers.get("host") || "";
  const hostname = host.split(":")[0].toLowerCase();
  const proto = (req.headers.get("x-forwarded-proto") || "https").split(",")[0].trim();
  const today = new Date().toISOString().split("T")[0];

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

  // ── Custom clinic domain ────────────────────────────────────────────────
  if (!isMainDomain) {
    try {
      const bare = hostname.replace(/^www\./, "");

      // Try bare domain first, then www-prefixed variant
      let clinic =
        (await convex.query(api.clinics.getByDomain, { domain: bare })) ??
        (await convex.query(api.clinics.getByDomain, { domain: `www.${bare}` }));

      if (!clinic) {
        return errorResponse(
          buildSitemapXml([buildUrlEntry(`${proto}://${hostname}/`, today, "daily", "1.0")]),
        );
      }

      const posts = await convex.query(api.posts.getPublishedByClinic, {
        clinicId: clinic._id,
      });

      const base = `${proto}://${hostname}`;

      const sortedPosts = [...posts].sort(
        (a, b) => (b.publishedAt ?? b.createdAt) - (a.publishedAt ?? a.createdAt),
      );

      const entries = [
        buildUrlEntry(`${base}/`, today, "daily", "1.0"),
        ...sortedPosts.map((p) =>
          buildUrlEntry(
            `${base}/${p.slug}`,
            w3cDate(p.updatedAt ?? p.publishedAt ?? p.createdAt),
            "weekly",
            "0.8",
          ),
        ),
      ];

      return xmlResponse(buildSitemapXml(entries));
    } catch (err) {
      console.error("[sitemap.xml] custom domain error:", hostname, err);
      return errorResponse(
        buildSitemapXml([buildUrlEntry(`${proto}://${hostname}/`, today, "daily", "1.0")]),
      );
    }
  }

  // ── Platform / main domain ──────────────────────────────────────────────
  try {
    const base = (process.env.NEXT_PUBLIC_APP_URL || `${proto}://${hostname}`).replace(/\/$/, "");

    const clinics = await convex.query(api.clinics.getActive);
    const hostedClinics = clinics.filter((c) => !c.customDomain);

    const postGroups = await Promise.all(
      hostedClinics.map((c) =>
        convex.query(api.posts.getPublishedByClinic, { clinicId: c._id }),
      ),
    );

    const entries = [
      buildUrlEntry(`${base}/`, today, "daily", "1.0"),
      ...hostedClinics.flatMap((c, i) => {
        const sortedPosts = [...postGroups[i]].sort(
          (a, b) => (b.publishedAt ?? b.createdAt) - (a.publishedAt ?? a.createdAt),
        );
        return [
          buildUrlEntry(`${base}/blog/${c.slug}`, w3cDate(c.createdAt), "weekly", "0.7"),
          ...sortedPosts.map((p) =>
            buildUrlEntry(
              `${base}/blog/${c.slug}/${p.slug}`,
              w3cDate(p.updatedAt ?? p.publishedAt ?? p.createdAt),
              "weekly",
              "0.8",
            ),
          ),
        ];
      }),
    ];

    return xmlResponse(buildSitemapXml(entries));
  } catch (err) {
    console.error("[sitemap.xml] main domain error:", err);
    const base = (process.env.NEXT_PUBLIC_APP_URL || `${proto}://${hostname}`).replace(/\/$/, "");
    return errorResponse(
      buildSitemapXml([buildUrlEntry(`${base}/`, today, "daily", "1.0")]),
    );
  }
}
