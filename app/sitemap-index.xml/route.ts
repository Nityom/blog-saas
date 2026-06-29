export const dynamic = "force-dynamic";
export const revalidate = 0;

export async function GET(req: Request): Promise<Response> {
  const host = req.headers.get("x-forwarded-host") || req.headers.get("host") || "";
  const proto = (req.headers.get("x-forwarded-proto") || "https").split(",")[0].trim();
  const origin = `${proto}://${host}`;
  const today = new Date().toISOString().split("T")[0];

  const body = [
    '<?xml version="1.0" encoding="UTF-8"?>',
    '<sitemapindex xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">',
    "  <sitemap>",
    `    <loc>${origin}/sitemap.xml</loc>`,
    `    <lastmod>${today}</lastmod>`,
    "  </sitemap>",
    "</sitemapindex>",
  ].join("\n");

  return new Response(body, {
    headers: {
      "Content-Type": "application/xml; charset=utf-8",
      "Cache-Control": "no-store, no-cache, must-revalidate",
    },
  });
}
