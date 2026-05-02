import { ConvexHttpClient } from "convex/browser";
import { api } from "@/convex/_generated/api";
import Link from "next/link";
import { notFound } from "next/navigation";
import { headers } from "next/headers";
import { Metadata } from "next";
import SharePostButton from "@/components/share-post-button";
import { Phone, Clock, MapPin, Star } from "lucide-react";

export const dynamic = "force-dynamic";
export const revalidate = 0;

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
  const requestHeaders = headers();
  const host = requestHeaders.get("host") || "";
  const protocol = requestHeaders.get("x-forwarded-proto") || "https";
  const isCustomDomain = !host.includes("localhost") && !host.includes("vercel.app") && !host.includes("vercel.pub");
  const basePath = isCustomDomain ? "" : `/blog/${clinic.slug}`;
  const siteOrigin = `${protocol}://${host}`;

  const posts = await convex.query(api.posts.getPublishedByClinic, { clinicId: clinic._id });
  const sortedPosts = posts.sort((a, b) => (b.publishedAt || 0) - (a.publishedAt || 0));

  const page = parseInt(searchParams.page || "1");
  const limit = 10;
  const totalPages = Math.ceil(sortedPosts.length / limit);
  const paginatedPosts = sortedPosts.slice((page - 1) * limit, page * limit);
  const logoUrl = clinic.logoUrl || "https://titaniumsmiles.in/logo.svg";

 

  return (
    <div className="min-h-screen bg-neutral-50 font-sans">
      <header className="bg-white border-b border-neutral-200 py-6 sticky top-0 z-50">
        <div className="max-w-6xl mx-auto px-4">
          <div className="flex flex-col sm:flex-row items-center justify-between gap-4">
            <div className="flex flex-row items-center gap-4 text-left">
              {logoUrl && (
                <Link href={`${basePath || '/'}`} className="flex-shrink-0 transition-transform hover:scale-105">
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img src={logoUrl} alt={`${clinic.name} Logo`} className="h-12 w-auto max-w-[120px] object-contain" />
                </Link>
              )}
              <div>
                <h1 className="text-2xl sm:text-3xl font-extrabold text-neutral-900 tracking-tight">{clinic.name}</h1>
                <p className="text-sm sm:text-base text-neutral-500 font-medium">Dental insights and advice from {clinic.city}</p>
              </div>
            </div>
            {clinic.bookingUrl && (
              <a 
                href={clinic.bookingUrl} 
                target="_blank" 
                rel="noopener noreferrer" 
                className="hidden sm:inline-flex bg-blue-600 text-white font-semibold px-6 py-2.5 rounded-full shadow-sm hover:bg-blue-700 hover:shadow-md transition-all text-sm items-center gap-2"
              >
                Book Appointment
              </a>
            )}
          </div>
        </div>
      </header>

      <main className="max-w-6xl mx-auto px-4 py-12">
        {sortedPosts.length === 0 ? (
          <div className="text-center py-20 text-neutral-500 text-lg">No posts published yet. Check back soon!</div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
            {paginatedPosts.map((post) => (
              <article key={post._id} className="group relative h-full overflow-hidden rounded-xl border border-neutral-200 bg-white transition-shadow hover:shadow-lg">
                <div className="absolute right-3 top-3 z-10">
                  <SharePostButton url={`${siteOrigin}${basePath}/${post.slug}`} title={post.title} />
                </div>
                <Link href={`${basePath}/${post.slug}`} className="flex h-full flex-col">
                  <div className="h-48 overflow-hidden relative bg-neutral-100">
                    <img 
                      src={post.imageUrl} 
                      alt={post.title} 
                      className="w-full h-full object-cover transition-transform duration-300 group-hover:scale-105"
                    />
                  </div>
                  <div className="flex flex-1 flex-col p-6">
                    <div className="mb-3 flex items-center gap-3 text-sm text-neutral-500">
                      <time dateTime={new Date(post.publishedAt || post.createdAt).toISOString()}>
                        {new Date(post.publishedAt || post.createdAt).toLocaleDateString(undefined, { year: 'numeric', month: 'long', day: 'numeric' })}
                      </time>
                      <span>•</span>
                      <span>{post.readingTime} min read</span>
                    </div>
                    <h2 className="mb-3 line-clamp-2 text-xl font-bold text-neutral-900 transition-colors group-hover:text-blue-600">
                      {post.title}
                    </h2>
                    <p className="mb-4 line-clamp-3 flex-1 text-neutral-600">
                      {post.excerpt}
                    </p>
                    <div className="text-sm font-medium text-blue-600">Read Article →</div>
                  </div>
                </Link>
              </article>
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
      
      <footer className="bg-[#1c1c1c] text-neutral-300 py-16 border-t border-neutral-800 font-sans mt-12">
        <div className="max-w-6xl mx-auto px-4">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-12 lg:gap-24">
            
            {/* Left Column */}
            <div className="space-y-8">
              <div className="flex items-center gap-4">
                {logoUrl && (
                  <div className="flex-shrink-0 bg-white p-2 rounded-xl">
                    {/* eslint-disable-next-line @next/next/no-img-element */}
                    <img src={logoUrl} alt={`${clinic.name} Logo`} className="h-12 w-auto object-contain" />
                  </div>
                )}
                <h2 className="text-2xl font-bold text-white tracking-tight">{clinic.name}</h2>
              </div>
              
              <p className="text-sm leading-relaxed text-neutral-400 max-w-md">
                {clinic.name} is a top-rated local practice specializing in cosmetic, preventative, and restorative dentistry. Our expert team is committed to providing personalized care, cutting-edge treatments, and a comfortable experience for every patient.
              </p>
            </div>

            {/* Right Column */}
            <div className="space-y-8">
              <div className="flex items-start gap-4">
                <div className="bg-white text-neutral-900 p-2.5 rounded-lg flex-shrink-0 mt-1">
                  <Phone className="w-5 h-5" />
                </div>
                <div>
                  <h4 className="text-sm text-neutral-400 mb-1">Phone Numbers</h4>
                  <p className="text-white font-medium text-sm leading-relaxed">+91 9917609177<br/>+91 7771970889</p>
                </div>
              </div>
              
              <div className="flex items-start gap-4">
                <div className="bg-white text-neutral-900 p-2.5 rounded-lg flex-shrink-0 mt-1">
                  <Clock className="w-5 h-5" />
                </div>
                <div>
                  <h4 className="text-sm text-neutral-400 mb-1">Open Hour</h4>
                  <p className="text-white font-medium text-sm">10:00 AM - 8:00 PM</p>
                </div>
              </div>
              
              <div className="flex items-start gap-4">
                <div className="bg-white text-neutral-900 p-2.5 rounded-lg flex-shrink-0 mt-1">
                  <MapPin className="w-5 h-5" />
                </div>
                <div>
                  <h4 className="text-sm text-neutral-400 mb-1">Clinic Address</h4>
                  <p className="text-white font-medium text-sm leading-relaxed">
                    E3/119, First Floor, Arera<br/>
                    Colony, Main Road No.3, Near<br/>
                    Gastrocare Hospital, Bhopal,<br/>
                    M.P. 462016
                  </p>
                </div>
              </div>
              
              <div className="flex items-start gap-4">
                <div className="bg-white text-neutral-900 p-2.5 rounded-lg flex-shrink-0 mt-1">
                  <Star className="w-5 h-5 fill-current" />
                </div>
                <div>
                  <h4 className="text-sm text-neutral-400 mb-1">Write A Review</h4>
                  <a href="#" className="text-white font-medium text-sm hover:underline">Share Your Experience</a>
                </div>
              </div>
            </div>
            
          </div>
          
          <div className="mt-16 pt-8 border-t border-neutral-800 text-center text-sm text-neutral-500">
            &copy; {new Date().getFullYear()} {clinic.name}. All Rights Reserved
          </div>
        </div>
      </footer>
    </div>
  );
}
