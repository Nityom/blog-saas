import { NextRequest, NextResponse } from "next/server";

export const runtime = 'edge';

export async function GET(
  request: NextRequest,
  { params }: { params: { clinicId: string } }
) {
  const { clinicId } = params;
  
  // Extract protocol and host to build absolute URLs dynamically
  const host = request.headers.get("host") || "localhost:3000";
  const protocol = host.includes("localhost") ? "http" : "https";
  const baseUrl = `${protocol}://${host}`;

  const jsCode = `
(function() {
  const container = document.getElementById("dental-blog");
  if (!container) {
    console.error("Dental Blog Embed: Could not find element with id 'dental-blog'");
    return;
  }

  // Use shadow DOM to isolate styles
  const shadow = container.attachShadow({ mode: "open" });
  
  const style = document.createElement("style");
  style.textContent = \`
    .blog-container { font-family: system-ui, -apple-system, sans-serif; color: #333; max-width: 1000px; margin: 0 auto; padding: 20px; }
    .grid { display: grid; grid-template-columns: repeat(auto-fill, minmax(300px, 1fr)); gap: 24px; }
    .card { border: 1px solid #eaeaea; border-radius: 8px; overflow: hidden; background: #fff; cursor: pointer; transition: transform 0.2s; }
    .card:hover { transform: translateY(-4px); box-shadow: 0 10px 15px -3px rgba(0,0,0,0.1); }
    .card-img { width: 100%; height: 200px; object-fit: cover; }
    .card-content { padding: 20px; }
    .card-title { font-size: 1.25rem; font-weight: 600; margin: 0 0 10px 0; }
    .card-excerpt { font-size: 0.95rem; color: #666; margin: 0 0 15px 0; line-height: 1.5; }
    .card-meta { font-size: 0.8rem; color: #999; display: flex; justify-content: space-between; }
    .pagination { display: flex; justify-content: center; gap: 10px; margin-top: 30px; }
    .btn { padding: 8px 16px; border: 1px solid #ddd; background: #fff; border-radius: 4px; cursor: pointer; }
    .btn:disabled { opacity: 0.5; cursor: not-allowed; }
    .btn:hover:not(:disabled) { background: #f5f5f5; }
    .post-view { max-width: 800px; margin: 0 auto; }
    .back-btn { margin-bottom: 20px; color: #0066cc; background: none; border: none; cursor: pointer; padding: 0; font-size: 1rem; }
    .back-btn:hover { text-decoration: underline; }
    .post-img { width: 100%; max-height: 400px; object-fit: cover; border-radius: 8px; margin-bottom: 20px; }
    .post-credit { font-size: 0.8rem; color: #666; text-align: center; margin-bottom: 30px; }
    .post-content { line-height: 1.6; font-size: 1.1rem; }
    .post-content h2 { margin-top: 2em; }
    .loading { text-align: center; padding: 40px; color: #666; }
  \`;
  shadow.appendChild(style);

  const appDiv = document.createElement("div");
  appDiv.className = "blog-container";
  shadow.appendChild(appDiv);

  let currentPage = 1;
  let currentPost = null;

  async function fetchPosts(page) {
    appDiv.innerHTML = '<div class="loading">Loading posts...</div>';
    try {
      const res = await fetch(\`${baseUrl}/api/public/posts/${clinicId}?page=\` + page);
      const data = await res.json();
      renderGrid(data);
    } catch (e) {
      appDiv.innerHTML = '<div class="loading">Failed to load posts.</div>';
    }
  }

  function renderGrid(data) {
    if (!data.posts || data.posts.length === 0) {
      appDiv.innerHTML = '<div class="loading">No posts available.</div>';
      return;
    }

    let html = '<div class="grid">';
    data.posts.forEach((post, i) => {
      const date = new Date(post.publishedAt || post.createdAt).toLocaleDateString();
      html += \`
        <div class="card" data-index="\${i}">
          <img class="card-img" src="\${post.imageUrl}" alt="\${post.title}" />
          <div class="card-content">
            <h3 class="card-title">\${post.title}</h3>
            <p class="card-excerpt">\${post.excerpt}</p>
            <div class="card-meta">
              <span>\${date}</span>
              <span>\${post.readingTime} min read</span>
            </div>
          </div>
        </div>
      \`;
    });
    html += '</div>';

    // Pagination
    if (data.totalPages > 1) {
      html += \`
        <div class="pagination">
          <button class="btn" id="prevBtn" \${data.page === 1 ? 'disabled' : ''}>Previous</button>
          <span style="line-height: 35px;">Page \${data.page} of \${data.totalPages}</span>
          <button class="btn" id="nextBtn" \${data.page === data.totalPages ? 'disabled' : ''}>Next</button>
        </div>
      \`;
    }

    appDiv.innerHTML = html;

    // Attach event listeners
    const cards = appDiv.querySelectorAll('.card');
    cards.forEach(card => {
      card.addEventListener('click', () => {
        const idx = card.getAttribute('data-index');
        currentPost = data.posts[idx];
        renderPost();
      });
    });

    const prevBtn = appDiv.querySelector('#prevBtn');
    if (prevBtn) {
      prevBtn.addEventListener('click', () => {
        currentPage--;
        fetchPosts(currentPage);
      });
    }

    const nextBtn = appDiv.querySelector('#nextBtn');
    if (nextBtn) {
      nextBtn.addEventListener('click', () => {
        currentPage++;
        fetchPosts(currentPage);
      });
    }
  }

  function renderPost() {
    // Record view
    fetch(\`${baseUrl}/api/analytics/view\`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ postId: currentPost._id, clinicId: "${clinicId}" })
    }).catch(console.error);

    const date = new Date(currentPost.publishedAt || currentPost.createdAt).toLocaleDateString();

    // The currentPost.content is raw markdown since the embed script fetches from the public posts API which returns the post record.
    // However, the prompt says markdownToHtml is used. It's usually better to render markdown on the server and store it, 
    // or convert it in the Next.js API. 
    // For the embed, let's use a very simple regex parser or we should have the Next API return HTML.
    // Assuming the Next API doesn't convert it, we will use a basic parser for the embed.
    let contentHtml = currentPost.content
      .replace(/^### (.*$)/gim, '<h3>$1</h3>')
      .replace(/^## (.*$)/gim, '<h2>$1</h2>')
      .replace(/^# (.*$)/gim, '<h1>$1</h1>')
      .replace(/\\*\\*(.*)\\*\\*/gim, '<strong>$1</strong>')
      .replace(/\\*(.*)\\*/gim, '<em>$1</em>')
      .replace(/\\[(.*?)\\]\\((.*?)\\)/gim, '<a href="$2">$1</a>');
    
    // Convert newlines to paragraphs
    contentHtml = contentHtml.split('\\n\\n').map(p => \`<p>\${p}</p>\`).join('');

    appDiv.innerHTML = \`
      <div class="post-view">
        <button class="back-btn" id="backBtn">← Back to all posts</button>
        <h1>\${currentPost.title}</h1>
        <div class="card-meta" style="margin-bottom: 20px;">
          <span>\${date}</span>
          <span>\${currentPost.readingTime} min read</span>
        </div>
        <img class="post-img" src="\${currentPost.imageUrl}" alt="\${currentPost.title}" />
        <div class="post-credit">
          Photo by <a href="\${currentPost.imageCreditUrl}" target="_blank">\${currentPost.imageCredit}</a> on Pexels
        </div>
        <div class="post-content">
          \${contentHtml}
        </div>
      </div>
    \`;

    appDiv.querySelector('#backBtn').addEventListener('click', () => {
      currentPost = null;
      fetchPosts(currentPage);
    });
  }

  // Initial fetch
  fetchPosts(1);

})();
  `;

  return new NextResponse(jsCode, {
    headers: {
      "Content-Type": "application/javascript",
      "Access-Control-Allow-Origin": "*",
      "Cache-Control": "public, max-age=3600",
    },
  });
}
