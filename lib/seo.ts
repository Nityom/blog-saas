export interface SeoClinic {
  name: string;
  city: string;
  address?: string;
  phone?: string;
  mainWebsiteUrl?: string;
  googleMapsUrl?: string;
  authorQualification?: string;
  authorPhotoUrl?: string;
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
  content?: string;
  authorPhotoUrl?: string;
  authorQualification?: string;
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
  const faqSectionMatch = content.match(/##\s+(?:frequently asked questions|faqs?|common questions)[^\n]*\n([\s\S]*)/i);
  if (!faqSectionMatch) return faqs;

  const faqSection = faqSectionMatch[1].split(/\n##\s+/)[0];
  // Match ### Question followed by answer paragraph
  const faqRegex = /###\s+(.+?)\n+([\s\S]+?)(?=\n###|\n##|$)/g;
  let match;
  while ((match = faqRegex.exec(faqSection)) !== null) {
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
  
  // Calculate word count from markdown content
  const wordCount = contentMarkdown ? contentMarkdown.split(/\s+/).length : 0;
  
  // Strip markdown from content for articleBody
  const articleBody = contentMarkdown
    ? contentMarkdown
        .replace(/#+\s+/g, '')
        .replace(/\*\*(.+?)\*\*/g, '$1')
        .replace(/\*(.+?)\*/g, '$1')
        .replace(/\[(.+?)\]\(.+?\)/g, '$1')
        .trim()
    : post.excerpt;
  
  // Extract top 5-7 keywords - include main keyword plus terms from content
  const keywordsList = [
    post.keywordTerm,
    ...((contentMarkdown?.match(/\b([a-z]{4,})\b/gi) || []).slice(0, 5)),
  ].filter((v, i, a) => a.indexOf(v) === i).slice(0, 7);

  const authorSchema = post.authorName
    ? {
        "@type": "Person",
        name: post.authorName,
        jobTitle: post.authorQualification || "Dentist",
        affiliation: {
          "@type": "MedicalOrganization",
          name: clinic.name,
        },
        ...(post.authorPhotoUrl && { image: post.authorPhotoUrl }),
        worksFor: {
          "@type": "MedicalOrganization",
          name: clinic.name,
          areaServed: clinic.city,
        },
      }
    : {
        "@type": "MedicalOrganization",
        name: clinic.name,
      };

  const blogPostingSchema: Record<string, unknown> = {
    "@context": "https://schema.org",
    "@type": "BlogPosting",
    headline: post.title,
    description: post.excerpt,
    articleBody: articleBody,
    wordCount: wordCount,
    keywords: keywordsList.join(", "),
    datePublished: post.publishedAt ? new Date(post.publishedAt).toISOString() : undefined,
    dateModified: post.updatedAt
      ? new Date(post.updatedAt).toISOString()
      : post.publishedAt
      ? new Date(post.publishedAt).toISOString()
      : undefined,
    image: [
      {
        "@type": "ImageObject",
        url: post.imageUrl,
        width: 1200,
        height: 630,
      },
    ],
    author: authorSchema,
    about: {
      "@type": "MedicalCondition",
      name: post.keywordTerm,
    },
    inLanguage: "en-IN",
    isAccessibleForFree: true,
    publisher: {
      "@type": "MedicalOrganization",
      name: clinic.name,
      address: {
        "@type": "PostalAddress",
        addressLocality: clinic.city,
        addressCountry: "IN",
      },
      ...(clinic.phone && { telephone: clinic.phone }),
    },
    mainEntityOfPage: {
      "@type": "WebPage",
    },
  };

  const schemas = [blogPostingSchema];

  // Add FAQPage schema if FAQs found
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
    schemas.push(faqSchema);
  }

  return JSON.stringify(schemas.length > 1 ? schemas : schemas[0]);
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

/**
 * Generates BreadcrumbList schema for breadcrumb navigation.
 * Improves SERP appearance and crawlability.
 */
export function generateBreadcrumbSchema(
  clinicName: string,
  clinicSlug: string,
  postTitle: string,
  postSlug: string,
  basePath: string,
  siteOrigin: string
): string {
  const breadcrumbs = [
    {
      "@type": "ListItem",
      position: 1,
      name: "Home",
      item: `${siteOrigin}${basePath || "/"}`,
    },
    {
      "@type": "ListItem",
      position: 2,
      name: clinicName,
      item: `${siteOrigin}${basePath || "/"}`,
    },
    {
      "@type": "ListItem",
      position: 3,
      name: postTitle,
      item: `${siteOrigin}${basePath}/${postSlug}`,
    },
  ];

  return JSON.stringify({
    "@context": "https://schema.org",
    "@type": "BreadcrumbList",
    itemListElement: breadcrumbs,
  });
}

/**
 * Generates LocalBusiness + MedicalOrganization schema for the blog site.
 * Place on every blog page (index + post) for local SEO signals.
 */
export function generateLocalBusinessSchema(clinic: SeoClinic, blogUrl: string): string {
  const schema: Record<string, unknown> = {
    "@context": "https://schema.org",
    "@type": ["MedicalOrganization", "LocalBusiness"],
    name: clinic.name,
    url: clinic.mainWebsiteUrl || blogUrl,
    address: {
      "@type": "PostalAddress",
      ...(clinic.address ? { streetAddress: clinic.address } : {}),
      addressLocality: clinic.city,
      addressCountry: "IN",
    },
    ...(clinic.phone ? { telephone: clinic.phone } : {}),
    ...(clinic.googleMapsUrl ? { hasMap: clinic.googleMapsUrl } : {}),
    medicalSpecialty: "Dentistry",
    areaServed: { "@type": "City", name: clinic.city },
    sameAs: [
      ...(clinic.mainWebsiteUrl ? [clinic.mainWebsiteUrl] : []),
      ...(clinic.googleMapsUrl ? [clinic.googleMapsUrl] : []),
    ],
    knowsAbout: "Dentistry",
  };

  // Add doctor/founder as staff member for E-A-T
  if (clinic.authorQualification || clinic.authorPhotoUrl) {
    schema.staff = [
      {
        "@type": "Person",
        name: clinic.name.split(" ")[0], // Use first word of clinic name as doctor name
        jobTitle: clinic.authorQualification || "Dentist",
        ...(clinic.authorPhotoUrl && { image: clinic.authorPhotoUrl }),
        affiliation: {
          "@type": "MedicalOrganization",
          name: clinic.name,
        },
      },
    ];
  }

  return JSON.stringify(schema);
}
