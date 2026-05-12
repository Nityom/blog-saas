// Cache for 1 hour at the edge — robots.txt rarely changes.
export const revalidate = 3600;

export async function GET(req: Request) {
  const host = req.headers.get("x-forwarded-host") || req.headers.get("host") || "example.com";
  const protocol = req.headers.get("x-forwarded-proto") || "https";

  // Single canonical sitemap entry. Multiple sitemap declarations pointing
  // at identical content waste crawl budget and confuse search engines.
  const robotsTxt = `User-agent: *
Allow: /
Disallow: /api/
Disallow: /super-admin/
Disallow: /clinic/

Sitemap: ${protocol}://${host}/sitemap.xml
`;

  return new Response(robotsTxt, {
    headers: {
      "Content-Type": "text/plain",
      "Cache-Control": "public, max-age=3600, s-maxage=3600",
    },
  });
}
