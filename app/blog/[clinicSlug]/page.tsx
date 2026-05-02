import { ConvexHttpClient } from "convex/browser";
import { api } from "@/convex/_generated/api";
import Link from "next/link";
import { notFound } from "next/navigation";
import { headers } from "next/headers";
import { Metadata } from "next";

const convex = new ConvexHttpClient(process.env.NEXT_PUBLIC_CONVEX_URL!);

export async function generateMetadata({ params }: { params: { clinicSlug: string } }): Promise<Metadata> {
  const clinic = await convex.query(api.clinics.getBySlug, { slug: params.clinicSlug });
  if (!clinic) return { title: "Blog Not Found" };
  return {
    title: `Blog | ${clinic.name}`,
    description: `Read the latest dental advice and news from ${clinic.name} in ${clinic.city}.`,
  };
}

export default async function BlogIndexPage({ params, searchParams }: { params: { clinicSlug: string }, searchParams: { page?: string } }) {
  const clinic = await convex.query(api.clinics.getBySlug, { slug: params.clinicSlug });
  
  if (!clinic || clinic.integrationMethod !== "hosted") {
    notFound();
  }

  // Determine if we are on a custom domain to format links correctly
  const host = headers().get("host") || "";
  const isCustomDomain = !host.includes("localhost") && !host.includes("vercel.app") && !host.includes("vercel.pub");
  const basePath = isCustomDomain ? "" : `/blog/${clinic.slug}`;

  const posts = await convex.query(api.posts.getPublishedByClinic, { clinicId: clinic._id });
  const sortedPosts = posts.sort((a, b) => (b.publishedAt || 0) - (a.publishedAt || 0));

  const page = parseInt(searchParams.page || "1");
  const limit = 10;
  const totalPages = Math.ceil(sortedPosts.length / limit);
  const paginatedPosts = sortedPosts.slice((page - 1) * limit, page * limit);

  return (
    <div className="min-h-screen bg-neutral-50 font-sans">
      <header className="bg-white border-b border-neutral-200 py-12 text-center">
        <div className="max-w-4xl mx-auto px-4">
          {clinic.logoUrl && (
            <div className="flex justify-center mb-6">
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img src={clinic.logoUrl} alt={`${clinic.name} Logo`} className="h-20 w-auto object-contain" />
            </div>
          )}
          <h1 className="text-4xl font-bold text-neutral-900 tracking-tight mb-2">{clinic.name}</h1>
          <p className="text-xl text-neutral-500">Dental insights and advice from {clinic.city}</p>
        </div>
      </header>

      <main className="max-w-6xl mx-auto px-4 py-12">
        {sortedPosts.length === 0 ? (
          <div className="text-center py-20 text-neutral-500 text-lg">No posts published yet. Check back soon!</div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
            {paginatedPosts.map((post) => (
              <Link key={post._id} href={`${basePath}/${post.slug}`} className="group block h-full">
                <article className="bg-white rounded-xl overflow-hidden border border-neutral-200 h-full flex flex-col transition-shadow hover:shadow-lg">
                  <div className="h-48 overflow-hidden relative bg-neutral-100">
                    <img 
                      src={post.imageUrl} 
                      alt={post.title} 
                      className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
                    />
                  </div>
                  <div className="p-6 flex flex-col flex-1">
                    <div className="flex items-center gap-3 text-sm text-neutral-500 mb-3">
                      <time dateTime={new Date(post.publishedAt || post.createdAt).toISOString()}>
                        {new Date(post.publishedAt || post.createdAt).toLocaleDateString(undefined, { year: 'numeric', month: 'long', day: 'numeric' })}
                      </time>
                      <span>•</span>
                      <span>{post.readingTime} min read</span>
                    </div>
                    <h2 className="text-xl font-bold text-neutral-900 mb-3 group-hover:text-blue-600 transition-colors line-clamp-2">
                      {post.title}
                    </h2>
                    <p className="text-neutral-600 line-clamp-3 mb-4 flex-1">
                      {post.excerpt}
                    </p>
                    <div className="text-blue-600 font-medium text-sm">Read Article →</div>
                  </div>
                </article>
              </Link>
            ))}
          </div>
        )}

        {totalPages > 1 && (
          <div className="flex justify-center items-center gap-4 mt-16">
            {page > 1 ? (
              <Link href={`${basePath || '/'}?page=${page - 1}`} className="px-4 py-2 border border-neutral-300 rounded-md hover:bg-neutral-100 text-neutral-700 font-medium">
                Previous
              </Link>
            ) : (
              <span className="px-4 py-2 border border-neutral-200 rounded-md text-neutral-400 bg-neutral-50 cursor-not-allowed">Previous</span>
            )}
            
            <span className="text-neutral-600 font-medium">Page {page} of {totalPages}</span>
            
            {page < totalPages ? (
              <Link href={`${basePath || '/'}?page=${page + 1}`} className="px-4 py-2 border border-neutral-300 rounded-md hover:bg-neutral-100 text-neutral-700 font-medium">
                Next
              </Link>
            ) : (
              <span className="px-4 py-2 border border-neutral-200 rounded-md text-neutral-400 bg-neutral-50 cursor-not-allowed">Next</span>
            )}
          </div>
        )}
      </main>
      
      <footer className="bg-white border-t border-neutral-200 py-8 text-center text-neutral-500">
        <p>&copy; {new Date().getFullYear()} {clinic.name}. All rights reserved.</p>
      </footer>
    </div>
  );
}
