import { ConvexHttpClient } from "convex/browser";
import { api } from "@/convex/_generated/api";
import { Id } from "@/convex/_generated/dataModel";
import Link from "next/link";
import { notFound } from "next/navigation";
import { headers } from "next/headers";
import { Metadata } from "next";
import { generateLocalBusinessSchema } from "@/lib/seo";
import SharePostButton from "@/components/share-post-button";
import { Phone, MapPin } from "lucide-react";

export const dynamic = "force-dynamic";
export const revalidate = 0;

const convex = new ConvexHttpClient(process.env.NEXT_PUBLIC_CONVEX_URL!);

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
  integrationMethod: string;
}

export async function generateMetadata({ params }: { params: { clinicSlug: string } }): Promise<Metadata> {
  const clinic = await convex.query(api.clinics.getBySlug, { slug: params.clinicSlug });
  if (!clinic) return { title: "Blog Not Found" };
  return {
    title: `Blog | ${clinic.name}`,
    description: `Read the latest dental advice and news from ${clinic.name} in ${clinic.city}.`,
    icons: {
      icon: clinic.logoUrl || '/favicon.ico',
    },
  };
}

export default async function BlogIndexPage({ params, searchParams }: { params: { clinicSlug: string }, searchParams: { page?: string } }) {
  const clinicRaw = await convex.query(api.clinics.getBySlug, { slug: params.clinicSlug });
  
  if (!clinicRaw || clinicRaw.integrationMethod !== "hosted") {
    notFound();
  }

  const clinic = clinicRaw as unknown as ClinicDoc;

  const requestHeaders = headers();
  const host = requestHeaders.get("host") || "";
  const protocol = requestHeaders.get("x-forwarded-proto") || "https";
  const isCustomDomain = !host.includes("localhost") && !host.includes("vercel.app") && !host.includes("vercel.pub");
  const basePath = isCustomDomain ? "" : `/blog/${clinic.slug}`;
  const siteOrigin = `${protocol}://${host}`;
  const blogUrl = `${siteOrigin}${basePath}`;

  const posts = await convex.query(api.posts.getPublishedByClinic, { clinicId: clinic._id });
  const sortedPosts = posts.sort((a, b) => (b.publishedAt || 0) - (a.publishedAt || 0));

  const page = parseInt(searchParams.page || "1");
  const limit = 10;
  const totalPages = Math.ceil(sortedPosts.length / limit);
  const paginatedPosts = sortedPosts.slice((page - 1) * limit, page * limit);
  const logoUrl = clinic.logoUrl || "";

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

  return (
    <div className="min-h-screen bg-neutral-50 font-sans">
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: localBusinessSchema }} />

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
                    {/* eslint-disable-next-line @next/next/no-img-element */}
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
      
      <footer className="bg-white border-t border-neutral-200 py-12 mt-12">
        <div className="max-w-6xl mx-auto px-4">
          <div className="flex flex-col md:flex-row justify-between gap-8 mb-8">
            <div className="max-w-md">
              <div className="flex items-center gap-3 mb-4">
                {clinic.logoUrl && (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img src={clinic.logoUrl} alt={clinic.name} className="h-10 w-auto object-contain" />
                )}
                <p className="font-bold text-neutral-900 text-lg">{clinic.name}</p>
              </div>
              {clinic.address && (
                <div className="flex items-start gap-3 text-neutral-600 mb-3">
                  <MapPin className="w-5 h-5 mt-0.5 flex-shrink-0 text-neutral-400" />
                  <span className="text-sm">{clinic.address}, {clinic.city}</span>
                </div>
              )}
              {clinic.phone && (
                <div className="flex items-center gap-3 text-neutral-600 mb-3">
                  <Phone className="w-5 h-5 flex-shrink-0 text-neutral-400" />
                  <a href={`tel:${clinic.phone}`} className="text-sm hover:text-blue-600">{clinic.phone}</a>
                </div>
              )}
              {clinic.mainWebsiteUrl && (
                <a href={clinic.mainWebsiteUrl} target="_blank" rel="noopener" className="inline-block mt-2 text-sm font-semibold text-blue-600 hover:underline">
                  Visit Main Website →
                </a>
              )}
            </div>
            
            {clinic.googleMapsEmbedUrl && (
              <div className="rounded-xl overflow-hidden border border-neutral-200 w-full md:w-80 h-48 shadow-sm">
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
          
          <div className="pt-8 border-t border-neutral-100 text-center">
            <p className="text-neutral-500 text-xs">
              © {new Date().getFullYear()} {clinic.name} · {clinic.city} · All rights reserved
            </p>
          </div>
        </div>
      </footer>

      <div className="sm:hidden fixed bottom-6 right-6 z-50">
        <a 
          href={clinic.bookingUrl}
          target="_blank"
          className="flex items-center gap-2 bg-blue-600 text-white px-5 py-3 rounded-full shadow-xl font-bold text-sm"
        >
          Book Now
        </a>
      </div>
    </div>
  );
}
