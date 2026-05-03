import { NextRequest, NextResponse } from "next/server";
import { fetchQuery } from "convex/nextjs";
import { api } from "@/convex/_generated/api";

export async function GET(
  req: NextRequest,
  { params }: { params: { clinicSlug: string } }
) {
  const { clinicSlug } = params;
  const origin = req.nextUrl.origin;

  try {
    const clinic = await fetchQuery(api.clinics.getBySlug, { slug: clinicSlug });
    if (!clinic) {
      return new NextResponse(`// Clinic not found`, { status: 404, headers: { "Content-Type": "application/javascript" } });
    }

    const posts = await fetchQuery(api.posts.getPublishedByClinic, { clinicId: clinic._id });
    const recent = posts
      .filter((p) => p.status === "published")
      .sort((a, b) => (b.publishedAt || 0) - (a.publishedAt || 0))
      .slice(0, 3);

    const blogBase = clinic.customDomain
      ? `https://${clinic.customDomain}`
      : `${origin}/blog/${clinicSlug}`;

    // Build a self-contained JS widget — no external dependencies
    const postsJson = JSON.stringify(
      recent.map((p) => ({
        title: p.title,
        excerpt: p.excerpt,
        slug: p.slug,
        imageUrl: p.imageUrl,
        readingTime: p.readingTime,
        url: `${blogBase}/${p.slug}`,
      }))
    );

    const script = `
(function() {
  var posts = ${postsJson};
  var container = document.getElementById('blogforge-recent-posts');
  if (!container) { container = document.createElement('div'); document.body.appendChild(container); }

  var style = document.createElement('style');
  style.textContent = [
    '.bf-grid { display: grid; grid-template-columns: repeat(auto-fit, minmax(240px, 1fr)); gap: 20px; font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif; }',
    '.bf-card { border: 1px solid #e5e7eb; border-radius: 12px; overflow: hidden; text-decoration: none; color: inherit; display: flex; flex-direction: column; transition: box-shadow 0.2s; }',
    '.bf-card:hover { box-shadow: 0 4px 20px rgba(0,0,0,0.10); }',
    '.bf-img { width: 100%; height: 160px; object-fit: cover; display: block; background: #f3f4f6; }',
    '.bf-body { padding: 14px; flex: 1; display: flex; flex-direction: column; gap: 6px; }',
    '.bf-title { font-size: 15px; font-weight: 700; color: #111827; line-height: 1.4; display: -webkit-box; -webkit-line-clamp: 2; -webkit-box-orient: vertical; overflow: hidden; }',
    '.bf-excerpt { font-size: 13px; color: #6b7280; line-height: 1.5; display: -webkit-box; -webkit-line-clamp: 2; -webkit-box-orient: vertical; overflow: hidden; flex: 1; }',
    '.bf-meta { font-size: 12px; color: #9ca3af; }',
    '.bf-cta { font-size: 13px; font-weight: 600; color: #2563eb; margin-top: 4px; }',
  ].join('');
  document.head.appendChild(style);

  var grid = document.createElement('div');
  grid.className = 'bf-grid';

  posts.forEach(function(p) {
    var card = document.createElement('a');
    card.href = p.url;
    card.target = '_blank';
    card.rel = 'noopener';
    card.className = 'bf-card';

    var img = '';
    if (p.imageUrl) {
      img = '<img class="bf-img" src="' + p.imageUrl + '" alt="' + p.title.replace(/"/g,'') + '" loading="lazy" />';
    }

    card.innerHTML = img + [
      '<div class="bf-body">',
      '<div class="bf-title">' + p.title + '</div>',
      '<div class="bf-excerpt">' + p.excerpt + '</div>',
      '<div class="bf-meta">' + (p.readingTime || 3) + ' min read</div>',
      '<div class="bf-cta">Read More &rarr;</div>',
      '</div>',
    ].join('');
    grid.appendChild(card);
  });

  container.appendChild(grid);
})();
`.trim();

    return new NextResponse(script, {
      status: 200,
      headers: {
        "Content-Type": "application/javascript; charset=utf-8",
        "Cache-Control": "public, s-maxage=3600, stale-while-revalidate=86400",
        "Access-Control-Allow-Origin": "*",
      },
    });
  } catch (err) {
    console.error("Embed error:", err);
    return new NextResponse(`// Error loading posts`, {
      status: 500,
      headers: { "Content-Type": "application/javascript" },
    });
  }
}
