export interface SeoClinic {
  name: string;
  city: string;
}

export interface SeoPost {
  title: string;
  publishedAt?: number;
  imageUrl: string;
  slug: string;
  keywordTerm: string; // we need the term to build the schema
}

export function generateSlug(title: string, existingSlugs: string[]): string {
  const baseSlug = title
    .toLowerCase()
    .replace(/[^a-z0-9\s-]/g, '') // remove invalid chars
    .replace(/\s+/g, '-')         // replace spaces with dashes
    .replace(/-+/g, '-')          // collapse dashes
    .trim();

  let slug = baseSlug;
  let counter = 2;
  
  while (existingSlugs.includes(slug)) {
    slug = `${baseSlug}-${counter}`;
    counter++;
  }
  
  return slug;
}

export function generateSchemaMarkup(post: SeoPost, clinic: SeoClinic): string {
  const schema = {
    "@context": "https://schema.org",
    "@type": "BlogPosting",
    headline: post.title,
    datePublished: post.publishedAt ? new Date(post.publishedAt).toISOString() : undefined,
    image: post.imageUrl,
    author: {
      "@type": "MedicalOrganization",
      name: clinic.name
    },
    about: {
      "@type": "MedicalCondition",
      name: post.keywordTerm
    },
    publisher: {
      "@type": "MedicalOrganization",
      name: clinic.name,
      address: {
        "@type": "PostalAddress",
        addressLocality: clinic.city
      }
    }
  };
  
  return JSON.stringify(schema);
}

export function addInternalLinks(content: string, relatedPosts: { slug: string, keyword: string }[]): string {
  let updatedContent = content;
  
  // Link to max 2 related posts
  let linksAdded = 0;
  for (const post of relatedPosts) {
    if (linksAdded >= 2) break;
    
    // Simple regex to find keyword (case insensitive) not already inside a link
    // This regex looks for the keyword, but we need to be careful not to replace inside existing markdown links.
    // A robust way without complex AST parsing:
    const regex = new RegExp(`(?<!\\[[^\\]]*)(?<!\\()\\b(${post.keyword})\\b(?![^\\[]*\\])(?!\\))`, 'i');
    
    if (regex.test(updatedContent)) {
      updatedContent = updatedContent.replace(regex, `[$1](/blog/CLINIC_SLUG_PLACEHOLDER/${post.slug})`);
      linksAdded++;
    }
  }
  
  return updatedContent;
}
