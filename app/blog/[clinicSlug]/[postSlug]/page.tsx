import { ConvexHttpClient } from "convex/browser";
import { api } from "@/convex/_generated/api";
import { notFound } from "next/navigation";
import { headers } from "next/headers";
import { Metadata } from "next";
import Link from "next/link";
import { markdownToHtml } from "@/lib/markdown";
import PostViewTracker from "./PostViewTracker";
import SharePostButton from "@/components/share-post-button";
import { ArrowLeft } from "lucide-react";

export const dynamic = "force-dynamic";
export const revalidate = 0;

const convex = new ConvexHttpClient(process.env.NEXT_PUBLIC_CONVEX_URL!);

export async function generateMetadata({ params }: { params: { clinicSlug: string, postSlug: string } }): Promise<Metadata> {
  const clinic = await convex.query(api.clinics.getBySlug, { slug: params.clinicSlug });
  if (!clinic) return { title: "Not Found" };
  
  const post = await convex.query(api.posts.getBySlug, { clinicId: clinic._id, slug: params.postSlug });
  if (!post || post.status !== "published") return { title: "Post Not Found" };

  return {
    title: post.metaTitle || post.title,
    description: post.metaDesc || post.excerpt,
    icons: {
      icon: clinic.logoUrl || '/favicon.ico',
    },
    openGraph: {
      title: post.metaTitle || post.title,
      description: post.metaDesc || post.excerpt,
      images: [post.imageUrl],
    }
  };
}

export default async function BlogPostPage({ params }: { params: { clinicSlug: string, postSlug: string } }) {
  const clinic = await convex.query(api.clinics.getBySlug, { slug: params.clinicSlug });
  
  if (!clinic || clinic.integrationMethod !== "hosted") {
    notFound();
  }

  const post = await convex.query(api.posts.getBySlug, { clinicId: clinic._id, slug: params.postSlug });
  
  if (!post || post.status !== "published") {
    notFound();
  }

  // Determine if we are on a custom domain to format links correctly
  const requestHeaders = headers();
  const host = requestHeaders.get("host") || "";
  const protocol = requestHeaders.get("x-forwarded-proto") || "https";
  const isCustomDomain = !host.includes("localhost") && !host.includes("vercel.app") && !host.includes("vercel.pub");
  const basePath = isCustomDomain ? "" : `/blog/${clinic.slug}`;
  const siteOrigin = `${protocol}://${host}`;
  const logoUrl = clinic.logoUrl || "https://titaniumsmiles.in/logo.svg";

  

  // Get related posts (3 posts from same clinic, different slug, preferably same keyword)
  const allPosts = await convex.query(api.posts.getPublishedByClinic, { clinicId: clinic._id });
  let relatedPosts = allPosts.filter(p => p._id !== post._id && p.keywordId === post.keywordId).slice(0, 3);
  if (relatedPosts.length < 3) {
    const additional = allPosts.filter(p => p._id !== post._id && p.keywordId !== post.keywordId)
      .sort((a,b) => b.createdAt - a.createdAt)
      .slice(0, 3 - relatedPosts.length);
    relatedPosts = [...relatedPosts, ...additional];
  }

  const contentHtml = markdownToHtml(post.content);

  return (
    <div className="min-h-screen bg-white font-sans text-neutral-900">
      <PostViewTracker clinicId={clinic._id} postId={post._id} />
      
      {/* JSON-LD Schema */}
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: post.schemaMarkup || "{}" }}
      />

      <header className="py-8 border-b border-neutral-200 bg-white">
        <div className="max-w-4xl mx-auto px-4">
          <div className="flex justify-between items-center">
            <div className="flex items-center gap-4">
              <Link href={`${basePath || '/'}`} className="flex items-center justify-center h-10 w-10 rounded-full hover:bg-neutral-100 transition-colors mr-1">
                <ArrowLeft className="w-5 h-5 text-neutral-600" />
              </Link>
              {logoUrl && (
                <div className="flex-shrink-0">
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img src={logoUrl} alt={`${clinic.name} Logo`} className="h-12 w-auto object-contain" />
                </div>
              )}
              <div>
                <Link href={`${basePath || '/'}`} className="text-xl font-bold tracking-tight text-neutral-900 hover:text-blue-600 transition-colors block">
                  {clinic.name} Blog
                </Link>
                <p className="text-sm text-neutral-500">{clinic.city}</p>
              </div>
            </div>
            <a href={clinic.bookingUrl} target="_blank" className="text-sm font-medium bg-blue-600 text-white px-4 py-2 rounded-md hover:bg-blue-700 transition-colors">
              Book Appointment
            </a>
          </div>
        </div>
      </header>

      <main className="max-w-3xl mx-auto px-4 py-12">
        <article>
          <header className="mb-10 text-center">
            <div className="flex items-center justify-center gap-3 text-sm text-neutral-500 mb-6 uppercase tracking-wider font-semibold">
              <time dateTime={new Date(post.publishedAt || post.createdAt).toISOString()}>
                {new Date(post.publishedAt || post.createdAt).toLocaleDateString(undefined, { year: 'numeric', month: 'long', day: 'numeric' })}
              </time>
              <span>•</span>
              <span className="bg-neutral-100 text-neutral-600 px-2 py-1 rounded">{post.readingTime} min read</span>
            </div>
            
            <h1 className="text-4xl md:text-5xl font-extrabold tracking-tight mb-8 leading-tight">
              {post.title}
            </h1>
          </header>

          <figure className="mb-12">
            <img 
              src={post.imageUrl} 
              alt={post.title} 
              className="w-full h-auto max-h-[500px] object-cover rounded-xl shadow-sm"
            />
            {post.imageCredit && (
              <figcaption className="text-center text-sm text-neutral-500 mt-4">
                Photo by <a href={post.imageCreditUrl} target="_blank" rel="nofollow" className="underline hover:text-neutral-800">{post.imageCredit}</a>
                {post.imageCreditUrl?.includes('pexels') ? ' on Pexels' : ''}
              </figcaption>
            )}
          </figure>

          {/* Markdown Content */}
          <div 
            className="prose prose-lg max-w-none prose-neutral prose-p:leading-relaxed prose-p:mb-8 prose-li:mb-4 prose-ul:my-8 prose-ol:my-8 prose-a:text-blue-600 hover:prose-a:text-blue-800 prose-headings:font-bold prose-h2:text-3xl prose-h2:mt-16 prose-h2:mb-8 prose-h3:text-2xl prose-h3:mt-10 prose-h3:mb-6 prose-img:rounded-xl"
            dangerouslySetInnerHTML={{ __html: contentHtml }}
          />
        </article>

        {/* CTA Banner */}
        <div className="mt-16 bg-blue-50 border border-blue-100 rounded-2xl p-8 text-center">
          <h2 className="text-2xl font-bold text-blue-900 mb-4">Ready to improve your smile?</h2>
          <p className="text-blue-700 mb-6 text-lg">Book an appointment at {clinic.name} today and let our experts take care of your dental needs.</p>
          <a href={clinic.bookingUrl} target="_blank" className="inline-block bg-blue-600 text-white font-semibold px-8 py-4 rounded-lg shadow-sm hover:bg-blue-700 hover:shadow-md transition-all">
            Book an Appointment Now
          </a>
        </div>

        {/* Related Posts */}
        {relatedPosts.length > 0 && (
          <div className="mt-20 pt-10 border-t border-neutral-200">
            <h3 className="text-2xl font-bold mb-8">Related Articles</h3>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
              {relatedPosts.map(rp => (
                <div key={rp._id} className="group relative overflow-hidden rounded-xl border border-neutral-200 hover:shadow-md transition-shadow">
                  <div className="absolute right-3 top-3 z-10">
                    <SharePostButton url={`${siteOrigin}${basePath}/${rp.slug}`} title={rp.title} />
                  </div>
                  <Link href={`${basePath}/${rp.slug}`} className="block h-full">
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

      <footer className="bg-white border-t border-neutral-200 py-12 mt-12">
        <div className="max-w-6xl mx-auto px-4 flex flex-col items-center justify-center gap-6">
          <div className="text-neutral-600 text-sm text-center">
            Copyright &copy; {new Date().getFullYear()} {clinic.name} | Developed by <span className="text-[#0056b3] font-medium">Nityom Tikhe</span>
          </div>
        </div>
      </footer>
    </div>
  );
}
