import { ConvexHttpClient } from "convex/browser";
import { api } from "@/convex/_generated/api";

export const dynamic = "force-dynamic";
export const revalidate = 0;

const convex = new ConvexHttpClient(process.env.NEXT_PUBLIC_CONVEX_URL!);

export async function GET(req: Request): Promise<Response> {
  const host = req.headers.get("x-forwarded-host") ?? req.headers.get("host") ?? "";
  const hostname = host.split(":")[0].toLowerCase();
  const proto = (req.headers.get("x-forwarded-proto") ?? "https").split(",")[0].trim();

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

  const base = `${proto}://${hostname}`;

  // ── Custom clinic domain (e.g. blog.titaniumsmiles.in) ───────────────────
  if (!isMainDomain) {
    try {
      const bare = hostname.replace(/^www\./, "");
      const clinic =
        (await convex.query(api.clinics.getByDomain, { domain: bare })) ??
        (await convex.query(api.clinics.getByDomain, { domain: `www.${bare}` }));

      if (!clinic) {
        return new Response(`${base}/\n`, {
          status: 200,
          headers: { "Content-Type": "text/plain; charset=utf-8", "Cache-Control": "no-store" },
        });
      }

      const posts = await convex.query(api.posts.getPublishedByClinic, {
        clinicId: clinic._id,
      });

      const sorted = [...posts].sort(
        (a, b) => (b.publishedAt ?? b.createdAt) - (a.publishedAt ?? a.createdAt),
      );

      const lines = [
        `${base}/`,
        ...sorted.map((p) => `${base}/${p.slug}`),
      ].join("\n");

      return new Response(lines + "\n", {
        status: 200,
        headers: {
          "Content-Type": "text/plain; charset=utf-8",
          "Cache-Control": "public, max-age=3600, s-maxage=3600, stale-while-revalidate=86400",
        },
      });
    } catch (err) {
      console.error("[sitemap.txt] custom domain error:", hostname, err);
      return new Response(`${base}/\n`, {
        status: 200,
        headers: { "Content-Type": "text/plain; charset=utf-8", "Cache-Control": "no-store" },
      });
    }
  }

  // ── Main platform domain: list all hosted clinic blog roots ─────────────
  try {
    const platformBase = (process.env.NEXT_PUBLIC_APP_URL ?? base).replace(/\/$/, "");
    const allClinics = await convex.query(api.clinics.getActive);
    const hosted = allClinics.filter((c) => !c.customDomain);

    const postGroups = await Promise.all(
      hosted.map((c) => convex.query(api.posts.getPublishedByClinic, { clinicId: c._id })),
    );

    const lines: string[] = [`${platformBase}/`];
    hosted.forEach((clinic, i) => {
      lines.push(`${platformBase}/blog/${clinic.slug}`);
      postGroups[i]
        .sort((a, b) => (b.publishedAt ?? b.createdAt) - (a.publishedAt ?? a.createdAt))
        .forEach((p) => lines.push(`${platformBase}/blog/${clinic.slug}/${p.slug}`));
    });

    return new Response(lines.join("\n") + "\n", {
      status: 200,
      headers: {
        "Content-Type": "text/plain; charset=utf-8",
        "Cache-Control": "public, max-age=3600, s-maxage=3600, stale-while-revalidate=86400",
      },
    });
  } catch (err) {
    console.error("[sitemap.txt] main domain error:", err);
    return new Response(`${base}/\n`, {
      status: 200,
      headers: { "Content-Type": "text/plain; charset=utf-8", "Cache-Control": "no-store" },
    });
  }
}
