// IndexNow key verification endpoint.
//
// IndexNow requires that you serve a plain-text file at
//   https://<your-domain>/<KEY>.txt
// containing exactly the same key. This route handles ANY <key>.txt request
// and returns the key when it matches the INDEXNOW_KEY env var.
//
// To enable: set INDEXNOW_KEY=<a 32+ char hex string of your choosing> in the
// platform AND on each clinic's custom domain deployment.

export const dynamic = "force-dynamic";

export async function GET(_req: Request, { params }: { params: { key: string } }) {
  const expected = process.env.INDEXNOW_KEY;
  const requested = params.key.replace(/\.txt$/, "");

  if (!expected || requested !== expected) {
    return new Response("Not Found", { status: 404 });
  }

  return new Response(expected, {
    headers: {
      "Content-Type": "text/plain; charset=utf-8",
      "Cache-Control": "public, max-age=3600, s-maxage=3600",
    },
  });
}
