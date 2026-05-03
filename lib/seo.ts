export interface SeoClinic {
  name: string;
  city: string;
}

export interface SeoPost {
  title: string;
  publishedAt?: number;
  updatedAt?: number;
  imageUrl: string;
  slug: string;
  keywordTerm: string;
  authorName?: string;
  excerpt?: string;
}

export function generateSlug(title: string, existingSlugs: string[]): string {
  const baseSlug = title
    .toLowerCase()
    .replace(/[^a-z0-9\s-]/g, '')
    .replace(/\s+/g, '-')
    .replace(/-+/g, '-')
    .trim();

  let slug = baseSlug;
  let counter = 2;

  while (existingSlugs.includes(slug)) {
    slug = `${baseSlug}-${counter}`;
    counter++;
  }

  return slug;
}

/**
 * Extracts FAQ question/answer pairs from markdown content.
 * Looks for ### headings followed by paragraphs (the FAQ block pattern used in generation).
 */
export function extractFaqsFromMarkdown(content: string): Array<{ question: string; answer: string }> {
  const faqs: Array<{ question: string; answer: string }> = [];
  // Match ### Question followed by answer paragraph
  const faqRegex = /###\s+(.+?)\n+([\s\S]+?)(?=\n###|\n##|$)/g;
  let match;
  while ((match = faqRegex.exec(content)) !== null) {
    const question = match[1].trim();
    // Strip markdown from answer, take first paragraph only
    const answer = match[2]
      .split(/\n\n/)[0]
      .replace(/\*\*(.+?)\*\*/g, '$1')
      .replace(/\*(.+?)\*/g, '$1')
      .replace(/\[(.+?)\]\(.+?\)/g, '$1')
      .replace(/#+\s*/g, '')
      .trim();
    if (question && answer) {
      faqs.push({ question, answer });
    }
  }
  return faqs;
}

export function generateSchemaMarkup(post: SeoPost, clinic: SeoClinic, contentMarkdown?: string): string {
  const faqs = contentMarkdown ? extractFaqsFromMarkdown(contentMarkdown) : [];

  const blogPostingSchema: Record<string, unknown> = {
    "@context": "https://schema.org",
    "@type": "BlogPosting",
    headline: post.title,
    description: post.excerpt,
    datePublished: post.publishedAt ? new Date(post.publishedAt).toISOString() : undefined,
    dateModified: post.updatedAt
      ? new Date(post.updatedAt).toISOString()
      : post.publishedAt
      ? new Date(post.publishedAt).toISOString()
      : undefined,
    image: post.imageUrl,
    author: post.authorName
      ? {
          "@type": "Person",
          name: post.authorName,
          jobTitle: "Dentist",
          worksFor: {
            "@type": "MedicalOrganization",
            name: clinic.name,
          },
        }
      : {
          "@type": "MedicalOrganization",
          name: clinic.name,
        },
    about: {
      "@type": "MedicalCondition",
      name: post.keywordTerm,
    },
    publisher: {
      "@type": "MedicalOrganization",
      name: clinic.name,
      address: {
        "@type": "PostalAddress",
        addressLocality: clinic.city,
      },
    },
    mainEntityOfPage: {
      "@type": "WebPage",
    },
  };

  // If we found FAQs, add FAQPage schema alongside BlogPosting
  if (faqs.length > 0) {
    const faqSchema = {
      "@context": "https://schema.org",
      "@type": "FAQPage",
      mainEntity: faqs.map((faq) => ({
        "@type": "Question",
        name: faq.question,
        acceptedAnswer: {
          "@type": "Answer",
          text: faq.answer,
        },
      })),
    };
    // Return as JSON array so both schemas go in a single <script> tag
    return JSON.stringify([blogPostingSchema, faqSchema]);
  }

  return JSON.stringify(blogPostingSchema);
}

/**
 * Converts a keyword string to a proper hashtag: "dental implants pune" → "#DentalImplantsPune"
 */
export function toHashtag(keyword: string): string {
  return (
    "#" +
    keyword
      .split(/\s+/)
      .map((w) => w.charAt(0).toUpperCase() + w.slice(1).toLowerCase())
      .join("")
  );
}

export function addInternalLinks(
  content: string,
  relatedPosts: { slug: string; keyword: string }[],
  clinicSlug?: string
): string {
  let updatedContent = content;
  const basePath = clinicSlug ? `/blog/${clinicSlug}` : "";

  let linksAdded = 0;
  for (const post of relatedPosts) {
    if (linksAdded >= 3) break; // increased from 2 to 3
    if (!post.keyword) continue;

    const regex = new RegExp(
      `(?<!\\[[^\\]]*(?<!\\()])(\\b(${post.keyword})\\b)(?![^\\[]*\\])(?![^(]*\\))`,
      "i"
    );

    if (regex.test(updatedContent)) {
      updatedContent = updatedContent.replace(
        regex,
        `[$1](${basePath}/${post.slug})`
      );
      linksAdded++;
    }
  }

  return updatedContent;
}
