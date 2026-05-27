import { ConvexHttpClient } from "convex/browser";
import { api } from "@/convex/_generated/api";
import { Id } from "@/convex/_generated/dataModel";
import { notFound } from "next/navigation";
import { headers } from "next/headers";
import { Metadata } from "next";
import Link from "next/link";
import Image from "next/image";
import { extractToc, extractHowToSteps, markdownToHtml } from "@/lib/markdown";
import {
  generateLocalBusinessSchema,
  generateBreadcrumbSchema,
  generateSchemaMarkup,
  generateHowToSchema,
} from "@/lib/seo";
import PostViewTracker from "./PostViewTracker";
import SharePostButton from "@/components/share-post-button";
import TableOfContents from "@/components/TableOfContents";
import Breadcrumbs from "@/components/Breadcrumbs";
import ReadingProgress from "@/components/ReadingProgress";
import { ArrowLeft, ArrowRight, Phone, MapPin, MessageCircle } from "lucide-react";

// ISR: rebuild every 5 min so Google sees a cached, fast page (good Core Web
// Vitals) but new content still appears within minutes.
export const revalidate = 300;

const convex = new ConvexHttpClient(process.env.NEXT_PUBLIC_CONVEX_URL!);

function normalizeInternalLinks(content: string, clinicSlug: string, basePath: string) {
  const targetBasePath = basePath || "";
  return content
    .replaceAll(`](/blog/${clinicSlug}/`, `](${targetBasePath}/`)
    .replaceAll(`href="/blog/${clinicSlug}/`, `href="${targetBasePath}/`);
}

interface ClinicDoc {
  _id: Id<"clinics">;
  name: string;
  city: string;
  slug: string;
  bookingUrl: string;
  logoUrl?: string;
  address?: string;
  phone?: string;
  whatsappNumber?: string;
  mainWebsiteUrl?: string;
  googleMapsUrl?: string;
  googleMapsEmbedUrl?: string;
  customDomain?: string;
  authorQualification?: string;
  authorBio?: string;
  authorPhotoUrl?: string;
  integrationMethod: string;
}

/**
 * Build the ONE canonical URL for a post. Same post may be reachable at both
 * `app.com/blog/<clinic>/<post>` and `<custom-domain>/<post>`. Google must see
 * a single canonical or it will split ranking signals between the duplicates.
 *
 * Rule: if the clinic has a custom domain → that's the canonical home.
 *       otherwise → the platform URL (built from NEXT_PUBLIC_APP_URL).
 */
function buildCanonicalUrl(clinic: { customDomain?: string; slug: string }, postSlug: string, fallbackOrigin: string) {
  if (clinic.customDomain) {
    return `https://${clinic.customDomain}/${postSlug}`;
  }
  const appOrigin = process.env.NEXT_PUBLIC_APP_URL?.replace(/\/$/, "") || fallbackOrigin;
  return `${appOrigin}/blog/${clinic.slug}/${postSlug}`;
}

export async function generateMetadata({ params }: { params: { clinicSlug: string, postSlug: string } }): Promise<Metadata> {
  const clinic = await convex.query(api.clinics.getBySlug, { slug: params.clinicSlug });
  if (!clinic) return { title: "Not Found" };

  const post = await convex.query(api.posts.getBySlug, { clinicId: clinic._id, slug: params.postSlug });
  if (!post || post.status !== "published") return { title: "Post Not Found" };

  const requestHeaders = headers();
  const host = requestHeaders.get("host") || "";
  const protocol = requestHeaders.get("x-forwarded-proto") || "https";
  const fallbackOrigin = `${protocol}://${host}`;
  const canonicalUrl = buildCanonicalUrl(clinic as { customDomain?: string; slug: string }, post.slug, fallbackOrigin);

  const publishedDate = post.publishedAt ? new Date(post.publishedAt).toISOString() : undefined;
  const modifiedDate = post.updatedAt ? new Date(post.updatedAt).toISOString() : publishedDate;

  // Prefer the AI-generated SEO `metaTitle` (≤60 chars) — it's purpose-built
  // for SERP display. Fall back to the long H1 only when missing.
  const seoTitle = post.metaTitle?.trim() || post.title;
  const seoDescription = post.metaDesc?.trim() || post.excerpt;

  // Use Pexels image when present; otherwise fall back to a dynamically
  // rendered branded OG card so social shares always look intentional.
  const ogImage =
    post.imageUrl && post.imageUrl.startsWith("http")
      ? post.imageUrl
      : `${(process.env.NEXT_PUBLIC_APP_URL || fallbackOrigin).replace(/\/$/, "")}/api/og?title=${encodeURIComponent(
          seoTitle,
        )}&clinic=${encodeURIComponent(clinic.name)}&city=${encodeURIComponent(clinic.city)}`;

  return {
    title: { absolute: seoTitle },
    description: seoDescription,
    icons: { icon: clinic.logoUrl || '/favicon.ico' },
    robots: "index, follow, max-snippet:-1, max-image-preview:large, max-video-preview:-1",
    alternates: {
      canonical: canonicalUrl,
    },
    openGraph: {
      title: seoTitle,
      description: seoDescription,
      type: "article",
      url: canonicalUrl,
      images: [ogImage],
      ...(publishedDate && { publishedTime: publishedDate }),
      ...(modifiedDate && { modifiedTime: modifiedDate }),
      authors: post.authorName ? [post.authorName] : undefined,
    },
    twitter: {
      card: "summary_large_image",
      title: seoTitle,
      description: seoDescription,
      images: [ogImage],
    },
  };
}

export default async function BlogPostPage({ params }: { params: { clinicSlug: string, postSlug: string } }) {
  const clinicRaw = await convex.query(api.clinics.getBySlug, { slug: params.clinicSlug });
  if (!clinicRaw || clinicRaw.integrationMethod !== "hosted") notFound();
  
  const clinic = clinicRaw as unknown as ClinicDoc;

  const post = await convex.query(api.posts.getBySlug, { clinicId: clinic._id, slug: params.postSlug });
  if (!post || post.status !== "published") notFound();

  const requestHeaders = headers();
  const host = requestHeaders.get("host") || "";
  const protocol = requestHeaders.get("x-forwarded-proto") || "https";
  const appHostname = process.env.NEXT_PUBLIC_APP_URL ? new URL(process.env.NEXT_PUBLIC_APP_URL).hostname : "";
  const isCustomDomain = !host.includes("localhost") && !host.includes("vercel.app") && !host.includes("vercel.pub") && host !== appHostname;
  const basePath = isCustomDomain ? "" : `/blog/${clinic.slug}`;
  const siteOrigin = `${protocol}://${host}`;
  const blogUrl = `${siteOrigin}${basePath}`;
  const logoUrl = clinic.logoUrl || "";

  const allPosts = await convex.query(api.posts.getPublishedByClinic, { clinicId: clinic._id });

  // Pre-sort posts by publish date so we can derive prev/next without a
  // second query. "Prev" is the post published immediately before this one
  // (older), "next" is the one published immediately after (newer).
  const sortedAll = [...allPosts].sort(
    (a, b) => (a.publishedAt || a.createdAt) - (b.publishedAt || b.createdAt),
  );
  const currentIdx = sortedAll.findIndex((p) => p._id === post._id);
  const prevPost = currentIdx > 0 ? sortedAll[currentIdx - 1] : null;
  const nextPost = currentIdx >= 0 && currentIdx < sortedAll.length - 1 ? sortedAll[currentIdx + 1] : null;

  let relatedPosts = allPosts.filter(p => p._id !== post._id && p.keywordId === post.keywordId).slice(0, 3);
  if (relatedPosts.length < 3) {
    const additional = allPosts
      .filter(p => p._id !== post._id && p.keywordId !== post.keywordId)
      .sort((a, b) => b.createdAt - a.createdAt)
      .slice(0, 3 - relatedPosts.length);
    relatedPosts = [...relatedPosts, ...additional];
  }

  // Topic-cluster context: pull all keywords once and find sibling posts
  // sharing this post's cluster (and the pillar post if one exists). This
  // is what compounds internal-link authority for a topic.
  const allKeywords = await convex.query(api.keywords.getByClinic, { clinicId: clinic._id });
  const currentKeyword = allKeywords.find((k) => k._id === post.keywordId);
  const clusterTag = currentKeyword?.cluster;
  const clusterPillarKw = clusterTag
    ? allKeywords.find((k) => k.cluster === clusterTag && k.isPillar)
    : null;
  const clusterSiblingKwIds = clusterTag
    ? new Set(allKeywords.filter((k) => k.cluster === clusterTag && k._id !== post.keywordId).map((k) => k._id))
    : new Set<typeof post.keywordId>();
  const clusterPosts = clusterTag
    ? allPosts
        .filter((p) => p._id !== post._id && clusterSiblingKwIds.has(p.keywordId))
        .sort((a, b) => (b.publishedAt || b.createdAt) - (a.publishedAt || a.createdAt))
        .slice(0, 6)
    : [];
  const pillarPost = clusterPillarKw
    ? allPosts.find((p) => p.keywordId === clusterPillarKw._id && p._id !== post._id) || null
    : null;

  const normalizedContent = normalizeInternalLinks(post.content, clinic.slug, basePath);
  const contentHtml = markdownToHtml(normalizedContent);
  const tocItems = extractToc(normalizedContent);
  const howToSteps = extractHowToSteps(normalizedContent);
  const articleSchema = generateSchemaMarkup(
    {
      title: post.title,
      publishedAt: post.publishedAt,
      updatedAt: post.updatedAt,
      imageUrl: post.imageUrl,
      slug: post.slug,
      keywordTerm: post.title,
      authorName: post.authorName,
      excerpt: post.excerpt,
      content: normalizedContent,
      authorPhotoUrl: clinic.authorPhotoUrl,
      authorQualification: clinic.authorQualification,
    },
    {
      name: clinic.name,
      city: clinic.city,
      address: clinic.address,
      phone: clinic.phone,
      mainWebsiteUrl: clinic.mainWebsiteUrl,
      authorQualification: clinic.authorQualification,
      authorPhotoUrl: clinic.authorPhotoUrl,
    },
    normalizedContent
  );
  const localBusinessSchema = generateLocalBusinessSchema(
    {
      name: clinic.name,
      city: clinic.city,
      address: clinic.address,
      phone: clinic.phone,
      mainWebsiteUrl: clinic.mainWebsiteUrl,
      googleMapsUrl: clinic.googleMapsUrl,
    },
    blogUrl
  );
  
  const breadcrumbSchema = generateBreadcrumbSchema(
    clinic.name,
    clinic.slug,
    post.title,
    post.slug,
    basePath,
    siteOrigin
  );

  // Optional HowTo schema — only emitted when the post actually has a
  // numbered procedure. Unlocks Google's step-by-step rich result.
  const howToSchema =
    howToSteps.length >= 3
      ? generateHowToSchema({
          name: post.title,
          description: post.excerpt,
          imageUrl: post.imageUrl,
          steps: howToSteps,
        })
      : null;

  const whatsappNumber = clinic.whatsappNumber || clinic.phone || "";
  const whatsappHref = whatsappNumber
    ? `https://wa.me/${whatsappNumber.replace(/\D/g, "")}?text=Hi%2C%20I%20found%20your%20blog%20and%20would%20like%20to%20book%20an%20appointment.`
    : null;

  return (
    <div className="min-h-screen bg-white font-sans text-neutral-900">
      <ReadingProgress />
      <PostViewTracker clinicId={clinic._id} postId={post._id} />

      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: articleSchema }} />
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: localBusinessSchema }} />
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: breadcrumbSchema }} />
      {howToSchema && (
        <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: howToSchema }} />
      )}

      <header className="py-5 border-b border-neutral-200 bg-white sticky top-0 z-40">
        <div className="max-w-4xl mx-auto px-4">
          <div className="flex justify-between items-center">
            <div className="flex items-center gap-3">
              <Link href={`${basePath || '/'}`} className="flex items-center justify-center h-9 w-9 rounded-full hover:bg-neutral-100 transition-colors">
                <ArrowLeft className="w-5 h-5 text-neutral-600" />
              </Link>
              {logoUrl && (
                // eslint-disable-next-line @next/next/no-img-element
                <img src={logoUrl} alt={`${clinic.name} Logo`} className="h-10 w-auto object-contain" />
              )}
              <div>
                <Link href={`${basePath || '/'}`} className="text-lg font-bold tracking-tight text-neutral-900 hover:text-blue-600 transition-colors block leading-tight">
                  {clinic.name}
                </Link>
                <p className="text-xs text-neutral-500">{clinic.city}</p>
              </div>
            </div>
            <a
              href={clinic.bookingUrl}
              target="_blank"
              className="hidden sm:inline-flex text-sm font-semibold bg-blue-600 text-white px-4 py-2 rounded-lg hover:bg-blue-700 transition-colors"
            >
              Book Appointment
            </a>
          </div>
        </div>
      </header>

      <main className="max-w-3xl mx-auto px-4 py-12">
        <Breadcrumbs
          items={[
            { label: "Home", href: `${basePath || "/"}` },
            { label: clinic.name, href: `${basePath || "/"}` },
            { label: post.title },
          ]}
        />

        <article>
          <header className="mb-10 text-center">
            <div className="flex items-center justify-center gap-3 text-sm text-neutral-500 mb-5 uppercase tracking-wider font-semibold flex-wrap">
              <time dateTime={new Date(post.publishedAt || post.createdAt).toISOString()}>
                {new Date(post.publishedAt || post.createdAt).toLocaleDateString("en-IN", { year: "numeric", month: "long", day: "numeric" })}
              </time>
              <span>•</span>
              <span className="bg-neutral-100 text-neutral-600 px-2 py-1 rounded">{post.readingTime} min read</span>
              {post.updatedAt && post.updatedAt !== post.publishedAt && (
                <>
                  <span>•</span>
                  <span className="text-neutral-400 normal-case">
                    Updated {new Date(post.updatedAt).toLocaleDateString("en-IN", { month: "short", day: "numeric", year: "numeric" })}
                  </span>
                </>
              )}
            </div>

            <h1 className="text-4xl md:text-5xl font-extrabold tracking-tight mb-8 leading-tight">
              {post.title}
            </h1>

            {post.authorName && (
              <div className="inline-flex items-center gap-3 bg-neutral-50 border border-neutral-200 rounded-full px-4 py-2">
                {clinic.authorPhotoUrl ? (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img src={clinic.authorPhotoUrl} alt={post.authorName} className="w-8 h-8 rounded-full object-cover flex-shrink-0" />
                ) : (
                  <div className="w-8 h-8 rounded-full bg-blue-100 flex items-center justify-center flex-shrink-0">
                    <span className="text-sm font-bold text-blue-600">{post.authorName.replace("Dr. ", "").charAt(0)}</span>
                  </div>
                )}
                <div className="text-left">
                  <p className="text-sm font-semibold text-neutral-800 leading-none">{post.authorName}</p>
                  <p className="text-xs text-neutral-500 mt-0.5">
                    {clinic.authorQualification || "Dentist"} · {clinic.city}
                  </p>
                </div>
              </div>
            )}
          </header>

          {post.imageUrl && (
            <figure className="mb-12">
              <div className="relative w-full overflow-hidden rounded-xl shadow-sm bg-neutral-100" style={{ aspectRatio: "16 / 9" }}>
                <Image
                  src={post.imageUrl}
                  alt={post.title}
                  fill
                  priority
                  sizes="(max-width: 768px) 100vw, 768px"
                  className="object-cover"
                />
              </div>
              {post.imageCredit && (
                <figcaption className="text-center text-sm text-neutral-500 mt-3">
                  Photo by{" "}
                  <a href={post.imageCreditUrl} target="_blank" rel="nofollow" className="underline hover:text-neutral-800">
                    {post.imageCredit}
                  </a>
                  {post.imageCreditUrl?.includes("pexels") ? " on Pexels" : ""}
                </figcaption>
              )}
            </figure>
          )}

          <TableOfContents items={tocItems} />

          <div
            className="prose prose-lg max-w-none prose-neutral prose-p:leading-relaxed prose-p:mb-8 prose-li:mb-4 prose-ul:my-8 prose-ol:my-8 prose-a:text-blue-600 hover:prose-a:text-blue-800 prose-headings:font-bold prose-h2:text-3xl prose-h2:mt-16 prose-h2:mb-8 prose-h3:text-2xl prose-h3:mt-10 prose-h3:mb-6 prose-img:rounded-xl"
            dangerouslySetInnerHTML={{ __html: contentHtml }}
          />

          <div className="my-12 py-6 border-y border-neutral-100 text-center">
            <p className="text-neutral-500 text-sm mb-3 italic">Interested in treatment at {clinic.name}?</p>
            <a href={clinic.bookingUrl} target="_blank" className="text-blue-600 font-bold hover:underline">
              Check our available slots for {clinic.city} patients →
            </a>
          </div>

          {post.authorName && (
            <div className="mt-14 p-6 bg-blue-50 border border-blue-100 rounded-2xl flex gap-5 items-start">
              {clinic.authorPhotoUrl ? (
                // eslint-disable-next-line @next/next/no-img-element
                <img
                  src={clinic.authorPhotoUrl}
                  alt={post.authorName}
                  className="w-16 h-16 rounded-full object-cover flex-shrink-0 border-2 border-white shadow"
                />
              ) : (
                <div className="w-16 h-16 rounded-full bg-blue-200 flex items-center justify-center flex-shrink-0 text-2xl font-bold text-blue-700">
                  {post.authorName.replace("Dr. ", "").charAt(0)}
                </div>
              )}
              <div>
                <p className="font-bold text-neutral-900 text-lg leading-none">{post.authorName}</p>
                {clinic.authorQualification && (
                  <p className="text-sm text-blue-700 font-medium mt-1">{clinic.authorQualification}</p>
                )}
                <p className="text-sm text-neutral-600 mt-2">
                  {clinic.authorBio || `${post.authorName} is a practicing dentist at ${clinic.name}, ${clinic.city}. This article is reviewed for medical accuracy.`}
                </p>
              </div>
            </div>
          )}
        </article>

        {(prevPost || nextPost) && (
          <nav
            aria-label="Post navigation"
            className="mt-12 grid grid-cols-1 sm:grid-cols-2 gap-3"
          >
            {prevPost ? (
              <Link
                href={`${basePath}/${prevPost.slug}`}
                className="group rounded-xl border border-neutral-200 p-5 hover:border-blue-300 hover:bg-blue-50/40 transition-colors"
              >
                <span className="flex items-center gap-1 text-xs font-bold uppercase tracking-wider text-neutral-500 mb-1">
                  <ArrowLeft className="w-3 h-3" /> Previous
                </span>
                <span className="block font-semibold text-neutral-900 group-hover:text-blue-700 line-clamp-2">
                  {prevPost.title}
                </span>
              </Link>
            ) : (
              <span aria-hidden />
            )}
            {nextPost ? (
              <Link
                href={`${basePath}/${nextPost.slug}`}
                className="group rounded-xl border border-neutral-200 p-5 hover:border-blue-300 hover:bg-blue-50/40 transition-colors text-right"
              >
                <span className="flex items-center justify-end gap-1 text-xs font-bold uppercase tracking-wider text-neutral-500 mb-1">
                  Next <ArrowRight className="w-3 h-3" />
                </span>
                <span className="block font-semibold text-neutral-900 group-hover:text-blue-700 line-clamp-2">
                  {nextPost.title}
                </span>
              </Link>
            ) : (
              <span aria-hidden />
            )}
          </nav>
        )}

        <div className="mt-14 bg-gradient-to-br from-blue-600 to-blue-700 rounded-2xl p-8 text-center text-white">
          <h2 className="text-2xl font-bold mb-3">Ready to book your appointment?</h2>
          <p className="text-blue-100 mb-6 text-base">Visit {clinic.name} in {clinic.city} — our team is here to help.</p>
          <div className="flex flex-col sm:flex-row items-center justify-center gap-3">
            <a
              href={clinic.bookingUrl}
              target="_blank"
              className="inline-block bg-white text-blue-700 font-semibold px-8 py-3 rounded-lg hover:bg-blue-50 transition-colors w-full sm:w-auto"
            >
              Book Appointment
            </a>
            {whatsappHref && (
              <a
                href={whatsappHref}
                target="_blank"
                rel="noopener"
                className="inline-flex items-center gap-2 bg-green-500 text-white font-semibold px-8 py-3 rounded-lg hover:bg-green-600 transition-colors w-full sm:w-auto justify-center"
              >
                <MessageCircle className="w-4 h-4" />
                WhatsApp Us
              </a>
            )}
          </div>
        </div>

        {relatedPosts.length > 0 && (
          <div className="mt-20 pt-10 border-t border-neutral-200">
            {clusterTag && (clusterPosts.length > 0 || pillarPost) && (
              <div className="mb-12">
                <div className="flex items-center gap-2 mb-2">
                  <span className="text-xs font-semibold uppercase tracking-wider text-blue-600">Topic</span>
                  <span className="text-xs text-neutral-400">·</span>
                  <span className="text-xs font-medium text-neutral-700">{clusterTag}</span>
                </div>
                <h3 className="text-2xl font-bold mb-6">More on {clusterTag}</h3>
                {pillarPost && (
                  <Link
                    href={`${basePath}/${pillarPost.slug}`}
                    className="block mb-4 p-5 rounded-xl bg-gradient-to-br from-amber-50 to-orange-50 border border-amber-200 hover:border-amber-400 transition-colors"
                  >
                    <div className="text-xs font-semibold uppercase tracking-wider text-amber-700 mb-1">Complete Guide</div>
                    <div className="text-lg font-bold text-neutral-900">{pillarPost.title}</div>
                    <div className="text-sm text-neutral-600 line-clamp-2 mt-1">{pillarPost.excerpt}</div>
                  </Link>
                )}
                {clusterPosts.length > 0 && (
                  <ul className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                    {clusterPosts.map((cp) => (
                      <li key={cp._id}>
                        <Link
                          href={`${basePath}/${cp.slug}`}
                          className="block p-3 rounded-lg border border-neutral-200 hover:border-blue-400 hover:bg-blue-50/40 transition-colors text-sm text-neutral-800 hover:text-blue-700"
                        >
                          {cp.title}
                        </Link>
                      </li>
                    ))}
                  </ul>
                )}
              </div>
            )}
            <h3 className="text-2xl font-bold mb-8">Related Articles</h3>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
              {relatedPosts.map(rp => (
                <div key={rp._id} className="group relative overflow-hidden rounded-xl border border-neutral-200 hover:shadow-md transition-shadow">
                  <div className="absolute right-3 top-3 z-10">
                    <SharePostButton url={`${siteOrigin}${basePath}/${rp.slug}`} title={rp.title} />
                  </div>
                  <Link href={`${basePath}/${rp.slug}`} className="block h-full">
                    {/* eslint-disable-next-line @next/next/no-img-element */}
                    <img src={rp.imageUrl} alt={rp.title} className="w-full h-32 object-cover" />
                    <div className="p-4 flex flex-col flex-1">
                      <h4 className="font-bold text-neutral-900 group-hover:text-blue-600 line-clamp-2 mb-2">{rp.title}</h4>
                      <p className="text-sm text-neutral-500 line-clamp-2">{rp.excerpt}</p>
                    </div>
                  </Link>
                </div>
              ))}
            </div>
          </div>
        )}
      </main>

      <footer className="bg-neutral-50 border-t border-neutral-200 py-10 mt-12">
        <div className="max-w-4xl mx-auto px-4">
          <div className="flex flex-col md:flex-row justify-between gap-6 mb-6">
            <div>
              <div className="flex items-center gap-3 mb-2">
                {clinic.logoUrl && (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img src={clinic.logoUrl} alt={clinic.name} className="h-8 w-auto object-contain" />
                )}
                <p className="font-bold text-neutral-800 text-base">{clinic.name}</p>
              </div>
              {clinic.address && (
                <div className="flex items-start gap-2 mt-2 text-sm text-neutral-600">
                  <MapPin className="w-4 h-4 mt-0.5 flex-shrink-0 text-neutral-400" />
                  <span>{clinic.address}, {clinic.city}</span>
                </div>
              )}
              {clinic.phone && (
                <div className="flex items-center gap-2 mt-1 text-sm text-neutral-600">
                  <Phone className="w-4 h-4 flex-shrink-0 text-neutral-400" />
                  <a href={`tel:${clinic.phone}`} className="hover:text-blue-600">{clinic.phone}</a>
                </div>
              )}
              {clinic.mainWebsiteUrl && (
                <a href={clinic.mainWebsiteUrl} target="_blank" rel="noopener" className="inline-block mt-2 text-sm text-blue-600 hover:underline">
                  Visit Main Website →
                </a>
              )}
            </div>
            {clinic.googleMapsEmbedUrl && (
              <div className="rounded-xl overflow-hidden border border-neutral-200 flex-shrink-0 w-full md:w-64 h-40">
                <iframe
                  src={clinic.googleMapsEmbedUrl}
                  width="100%"
                  height="100%"
                  style={{ border: 0 }}
                  allowFullScreen={false}
                  loading="lazy"
                  referrerPolicy="no-referrer-when-downgrade"
                  title={`${clinic.name} location`}
                />
              </div>
            )}
          </div>
          <div className="text-neutral-500 text-xs text-center border-t border-neutral-200 pt-6">
            © {new Date().getFullYear()} {clinic.name} · {clinic.city} · All rights reserved ·{" "}
            Powered by <span className="text-blue-600 font-medium">BlogForge</span>
          </div>
        </div>
      </footer>

      <div className="fixed bottom-5 right-4 z-50 flex flex-col gap-3 items-end">
        {whatsappHref && (
          <a
            href={whatsappHref}
            target="_blank"
            rel="noopener"
            aria-label="Chat on WhatsApp"
            className="flex items-center gap-2 bg-green-500 text-white font-semibold text-sm px-4 py-3 rounded-full shadow-lg hover:bg-green-600 transition-all hover:scale-105"
          >
            <MessageCircle className="w-5 h-5" />
            <span className="hidden sm:inline">WhatsApp</span>
          </a>
        )}
        <a
          href={clinic.bookingUrl}
          target="_blank"
          aria-label="Book an appointment"
          className="flex items-center gap-2 bg-blue-600 text-white font-semibold text-sm px-4 py-3 rounded-full shadow-lg hover:bg-blue-700 transition-all hover:scale-105"
        >
          <span>Book Now</span>
        </a>
      </div>
    </div>
  );
}
