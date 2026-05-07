export const dynamic = "force-dynamic";
export const revalidate = 0;

export async function GET(req: Request) {
  const host = req.headers.get("x-forwarded-host") || req.headers.get("host") || "example.com";
  const protocol = req.headers.get("x-forwarded-proto") || "https";
  
  const robotsTxt = `User-agent: *
Allow: /

Sitemap: ${protocol}://${host}/sitemap.xml
Sitemap: ${protocol}://${host}/sitemap-index.xml
Sitemap: ${protocol}://${host}/sitemap.txt
`;

  return new Response(robotsTxt, {
    headers: {
      "Content-Type": "text/plain",
      "Cache-Control": "no-store, no-cache, must-revalidate",
    },
  });
}
