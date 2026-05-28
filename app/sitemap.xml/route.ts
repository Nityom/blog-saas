import { ConvexHttpClient } from "convex/browser";
import { api } from "@/convex/_generated/api";

export const dynamic = "force-dynamic";
// Edge runtime = zero cold start, globally distributed.
// ConvexHttpClient uses only fetch() — fully Edge-compatible.
export const runtime = "edge";

const convex = new ConvexHttpClient(process.env.NEXT_PUBLIC_CONVEX_URL!);

// W3C date format (YYYY-MM-DD) — required by sitemap spec
function toDate(ts: number) {
  return new Date(ts).toISOString().split("T")[0];
}

function url(loc: string, lastmod: string, changefreq: string, priority: string) {
  return `  <url>\n    <loc>${loc}</loc>\n    <lastmod>${lastmod}</lastmod>\n    <changefreq>${changefreq}</changefreq>\n    <priority>${priority}</priority>\n  </url>`;
}

function sitemap(urls: string[]) {
  return (
    `<?xml version="1.0" encoding="UTF-8"?>\n` +
    `<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">\n` +
    urls.join("\n") +
    `\n</urlset>`
  );
}

function respond(xml: string) {
  return new Response(xml, {
    status: 200,
    headers: {
      "Content-Type": "application/xml; charset=utf-8",
      // 1-hour edge cache: lets CDN serve fast without caching error responses
      // for long. GSC fetches infrequently so 1h is fine.
      "Cache-Control": "public, max-age=3600, s-maxage=3600, stale-while-revalidate=86400",
    },
  });
}

export async function GET(req: Request) {
  const host =
    req.headers.get("x-forwarded-host") ||
    req.headers.get("host") ||
    "";
  const hostname = host.split(":")[0].toLowerCase();
  const proto = (req.headers.get("x-forwarded-proto") || "https").split(",")[0].trim();

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

  const today = new Date().toISOString().split("T")[0];

  try {
    if (!isMainDomain) {
      // ── Custom clinic domain ──────────────────────────────────────────────
      const bare = hostname.replace(/^www\./, "");
      const www = `www.${bare}`;

      const [c1, c2] = await Promise.all([
        convex.query(api.clinics.getByDomain, { domain: bare }),
        convex.query(api.clinics.getByDomain, { domain: www }),
      ]);
      const clinic = c1 ?? c2;

      if (!clinic) {
        // Unknown domain — return minimal valid sitemap
        return respond(sitemap([url(`${proto}://${hostname}/`, today, "daily", "1.0")]));
      }

      const posts = await convex.query(api.posts.getPublishedByClinic, {
        clinicId: clinic._id,
      });

      const base = `${proto}://${hostname}`;
      return respond(
        sitemap([
          url(`${base}/`, today, "daily", "1.0"),
          ...posts.map((p) =>
            url(
              `${base}/${p.slug}`,
              toDate(p.updatedAt ?? p.publishedAt ?? p.createdAt),
              "weekly",
              "0.8",
            ),
          ),
        ]),
      );
    }

    // ── Platform / main domain ──────────────────────────────────────────────
    const base = (process.env.NEXT_PUBLIC_APP_URL || `${proto}://${hostname}`).replace(/\/$/, "");
    const clinics = await convex.query(api.clinics.getActive);
    // Only list clinics whose canonical URL is on the platform domain
    const hosted = clinics.filter((c) => !c.customDomain);

    const postGroups = await Promise.all(
      hosted.map((c) =>
        convex.query(api.posts.getPublishedByClinic, { clinicId: c._id }),
      ),
    );

    return respond(
      sitemap([
        url(`${base}/`, today, "daily", "1.0"),
        ...hosted.flatMap((c, i) => [
          url(`${base}/blog/${c.slug}`, toDate(c.createdAt), "weekly", "0.7"),
          ...postGroups[i].map((p) =>
            url(
              `${base}/blog/${c.slug}/${p.slug}`,
              toDate(p.updatedAt ?? p.publishedAt ?? p.createdAt),
              "weekly",
              "0.8",
            ),
          ),
        ]),
      ]),
    );
  } catch (err) {
    console.error("[sitemap.xml]", err);
    // Always return valid XML — never a 500 that GSC treats as "could not read"
    return respond(sitemap([url(`${proto}://${hostname}/`, today, "daily", "1.0")]));
  }
}
