import { ConvexHttpClient } from "convex/browser";
import { api } from "@/convex/_generated/api";

const convex = new ConvexHttpClient(process.env.NEXT_PUBLIC_CONVEX_URL!);

export const dynamic = "force-dynamic";
export const revalidate = 0;

export async function GET(req: Request) {
  const host = req.headers.get("x-forwarded-host") || req.headers.get("host") || "";
  const hostname = host.split(":")[0];
  const isLocal = hostname.includes("localhost") || hostname.includes("127.0.0.1");
  const isVercel = hostname.includes("vercel.app") || hostname.includes("vercel.pub");
  const appHostname = process.env.NEXT_PUBLIC_APP_URL
    ? new URL(process.env.NEXT_PUBLIC_APP_URL).hostname
    : "";
  const isMainDomain = isLocal || isVercel || hostname === appHostname;

  const urls: string[] = [];

  if (!isMainDomain && hostname) {
    let clinic = await convex.query(api.clinics.getByDomain, { domain: hostname });

    if (!clinic && !hostname.startsWith("www.")) {
      clinic = await convex.query(api.clinics.getByDomain, { domain: `www.${hostname}` });
    }

    if (!clinic && hostname.startsWith("www.")) {
      clinic = await convex.query(api.clinics.getByDomain, { domain: hostname.substring(4) });
    }

    if (clinic) {
      const baseUrl = `https://${hostname}`;
      const posts = await convex.query(api.posts.getPublishedByClinic, { clinicId: clinic._id });
      urls.push(`${baseUrl}/`, ...posts.map((post) => `${baseUrl}/${post.slug}`));
    }
  }

  if (urls.length === 0) {
    const baseUrl = process.env.NEXT_PUBLIC_APP_URL || `https://${hostname || "localhost"}`;
    const clinics = await convex.query(api.clinics.getActive);
    urls.push(`${baseUrl}/`, ...clinics.map((clinic) => `${baseUrl}/blog/${clinic.slug}`));
  }

  return new Response(`${urls.join("\n")}\n`, {
    headers: {
      "Content-Type": "text/plain; charset=utf-8",
      "Cache-Control": "no-store, no-cache, must-revalidate",
    },
  });
}
