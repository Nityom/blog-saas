// Lightweight helpers to nudge search engines when a new post is published.
//
// IndexNow (Bing, Yandex, Naver, Seznam, Yep) accepts an immediate URL ping
// and is honoured by Bing within minutes. Google deprecated its public
// `ping` endpoint in 2023, so we rely on a healthy sitemap + Search Console
// for Google indexing.
//
// All errors are swallowed; this is best-effort and must never fail a publish.

const INDEXNOW_KEY = process.env.INDEXNOW_KEY;
const APP_URL = process.env.NEXT_PUBLIC_APP_URL;

export async function pingIndexNow(urls: string[]): Promise<void> {
  if (!INDEXNOW_KEY || urls.length === 0) return;

  // Use the first URL's host as the IndexNow host.
  let host: string;
  try {
    host = new URL(urls[0]).host;
  } catch {
    return;
  }

  const body = {
    host,
    key: INDEXNOW_KEY,
    keyLocation: `https://${host}/${INDEXNOW_KEY}.txt`,
    urlList: urls,
  };

  try {
    await fetch("https://api.indexnow.org/IndexNow", {
      method: "POST",
      headers: { "Content-Type": "application/json; charset=utf-8" },
      body: JSON.stringify(body),
    });
  } catch (err) {
    console.warn("[IndexNow] ping failed:", (err as Error).message);
  }
}

/**
 * Build the list of canonical URLs for a published post.
 * Pings the custom domain if set, otherwise the platform URL.
 */
export function buildPostUrls(opts: {
  customDomain?: string;
  clinicSlug: string;
  postSlug: string;
}): string[] {
  const urls: string[] = [];
  if (opts.customDomain) {
    urls.push(`https://${opts.customDomain}/${opts.postSlug}`);
  } else if (APP_URL) {
    urls.push(`${APP_URL.replace(/\/$/, "")}/blog/${opts.clinicSlug}/${opts.postSlug}`);
  }
  return urls;
}
