import { marked } from 'marked';

/**
 * Strips the first # H1 heading from markdown so it doesn't duplicate
 * the <h1> the page already renders from post.title.
 */
export function stripLeadingH1(markdown: string): string {
  return markdown.replace(/^#\s+.+\n*/m, '');
}

export interface TocItem {
  level: 2 | 3;
  text: string;
  id: string;
}

/** Slugify heading text for in-page anchor IDs. */
export function slugifyHeading(text: string): string {
  return text
    .toLowerCase()
    .replace(/[^a-z0-9\s-]/g, '')
    .replace(/\s+/g, '-')
    .replace(/-+/g, '-')
    .replace(/^-|-$/g, '')
    .slice(0, 80);
}

/**
 * Extract H2/H3 headings to power an in-page table of contents.
 * Skips the FAQ block (it has its own UI).
 */
export function extractToc(markdown: string): TocItem[] {
  const items: TocItem[] = [];
  const lines = markdown.split('\n');
  const seen = new Set<string>();
  for (const line of lines) {
    const m = line.match(/^(#{2,3})\s+(.+?)\s*$/);
    if (!m) continue;
    const level = m[1].length as 2 | 3;
    const text = m[2].replace(/[*_`]/g, '').trim();
    if (!text) continue;
    let id = slugifyHeading(text);
    if (!id) continue;
    let i = 2;
    const base = id;
    while (seen.has(id)) id = `${base}-${i++}`;
    seen.add(id);
    items.push({ level, text, id });
  }
  return items;
}

/**
 * Custom marked renderer that adds stable `id` slugs to H2/H3 so the table
 * of contents anchors land at the right section. We re-use the same
 * dedup logic as `extractToc` so IDs match exactly.
 */
function renderWithHeadingIds(markdown: string): string {
  const renderer = new marked.Renderer();
  const seen = new Set<string>();
  // marked v16 passes a Heading token: { tokens, depth, text, ... }
  renderer.heading = function ({ tokens, depth }) {
    const text = this.parser.parseInline(tokens);
    const stripped = String(text).replace(/<[^>]+>/g, '');
    let id = slugifyHeading(stripped);
    if (id) {
      let i = 2;
      const base = id;
      while (seen.has(id)) id = `${base}-${i++}`;
      seen.add(id);
    }
    return id
      ? `<h${depth} id="${id}">${text}</h${depth}>\n`
      : `<h${depth}>${text}</h${depth}>\n`;
  };
  return marked.parse(markdown, { renderer }) as string;
}

export function markdownToHtml(markdown: string): string {
  return renderWithHeadingIds(stripLeadingH1(markdown));
}

export function getWordCount(markdown: string): number {
  // Simple word count: remove markdown characters approximately
  const text = markdown.replace(/[#*`_\[\]()]/g, ' ').replace(/\s+/g, ' ').trim();
  return text ? text.split(' ').length : 0;
}

export function truncateToSentence(text: string, maxChars: number): string {
  if (text.length <= maxChars) return text;
  const truncated = text.substring(0, maxChars);
  // Find the last sentence boundary (.!?)
  const lastBoundary = Math.max(
    truncated.lastIndexOf('. '),
    truncated.lastIndexOf('! '),
    truncated.lastIndexOf('? ')
  );
  
  if (lastBoundary > 0) {
    return truncated.substring(0, lastBoundary + 1);
  }
  
  // If no sentence boundary found, just truncate at last word boundary
  const lastSpace = truncated.lastIndexOf(' ');
  if (lastSpace > 0) {
    return truncated.substring(0, lastSpace) + '...';
  }
  
  return truncated + '...';
}

/**
 * Detect numbered "step" lists inside a "How to / Steps / Process / Procedure"
 * section. Returns the steps when found — used to emit HowTo schema, which
 * unlocks Google's step-by-step rich result.
 */
export function extractHowToSteps(
  markdown: string,
): { name: string; text: string }[] {
  // Find a section whose H2 looks like a process/how-to.
  const sectionMatch = markdown.match(
    /##\s+([^\n]*?(?:how to|steps?|procedure|process|what to expect|step-by-step)[^\n]*)\n([\s\S]*?)(?=\n##\s|$)/i,
  );
  if (!sectionMatch) return [];
  const body = sectionMatch[2];
  // Match `1. xxx` style ordered list items, picking up multi-line content.
  const stepRegex = /^\s*(\d+)\.\s+(.+(?:\n(?!\s*\d+\.\s|##\s|###\s).+)*)/gm;
  const steps: { name: string; text: string }[] = [];
  let m: RegExpExecArray | null;
  while ((m = stepRegex.exec(body)) !== null) {
    const raw = m[2]
      .replace(/\*\*(.+?)\*\*/g, '$1')
      .replace(/\*(.+?)\*/g, '$1')
      .replace(/\[(.+?)\]\(.+?\)/g, '$1')
      .replace(/\s+/g, ' ')
      .trim();
    if (!raw) continue;
    // First sentence becomes the step name; full text becomes the description.
    const firstStop = raw.search(/[.!?]\s/);
    const name = (firstStop > 0 ? raw.slice(0, firstStop) : raw).slice(0, 110).trim();
    steps.push({ name, text: raw });
  }
  return steps.length >= 3 ? steps : []; // ≥3 steps for HowTo to be meaningful
}

/**
 * Score a post on the dimensions Google rewards. Returns a 0-100 score plus
 * specific issues so the operator knows what to fix. Pure function — safe to
 * call from anywhere in the app.
 */
export interface ContentScore {
  score: number;
  grade: 'A' | 'B' | 'C' | 'D' | 'F';
  issues: string[];
  wins: string[];
  details: {
    wordCount: number;
    h2Count: number;
    h3Count: number;
    faqCount: number;
    internalLinks: number;
    externalLinks: number;
    keywordInTitle: boolean;
    keywordInFirst100Words: boolean;
  };
}

export function scoreContent(opts: {
  content: string;
  title: string;
  metaTitle?: string;
  metaDesc?: string;
  keyword: string;
}): ContentScore {
  const { content, title, metaTitle, metaDesc, keyword } = opts;
  const issues: string[] = [];
  const wins: string[] = [];
  const wordCount = getWordCount(content);
  const h2Count = (content.match(/^##\s+/gm) || []).length;
  const h3Count = (content.match(/^###\s+/gm) || []).length;
  const faqCount = (content.match(/^###\s+/gm) || []).length; // approximation
  const links = content.match(/\[([^\]]+)\]\(([^)]+)\)/g) || [];
  const internalLinks = links.filter((l) => /\(\/[^)]/.test(l)).length;
  const externalLinks = links.length - internalLinks;
  const kwLower = keyword.toLowerCase();
  const keywordInTitle = title.toLowerCase().includes(kwLower);
  const first100Words = content.split(/\s+/).slice(0, 100).join(' ').toLowerCase();
  const keywordInFirst100Words = first100Words.includes(kwLower);

  let score = 100;

  // Word count
  if (wordCount < 800) {
    score -= 25;
    issues.push(`Thin content (${wordCount} words). Target 1,200+.`);
  } else if (wordCount < 1200) {
    score -= 10;
    issues.push(`Borderline word count (${wordCount}). 1,200+ ranks better.`);
  } else {
    wins.push(`Good word count (${wordCount}).`);
  }

  // Structure
  if (h2Count < 4) {
    score -= 10;
    issues.push(`Only ${h2Count} H2 sections. Aim for 5–6.`);
  } else {
    wins.push(`Solid structure (${h2Count} H2 sections).`);
  }

  // FAQ
  if (faqCount < 3) {
    score -= 8;
    issues.push('No FAQ block — missing FAQPage rich result opportunity.');
  } else {
    wins.push(`${faqCount} FAQ-style questions detected.`);
  }

  // Internal links
  if (internalLinks < 2) {
    score -= 8;
    issues.push('Fewer than 2 internal links. Topic clusters need cross-linking.');
  } else {
    wins.push(`${internalLinks} internal links.`);
  }

  // Keyword placement
  if (!keywordInTitle) {
    score -= 12;
    issues.push('Primary keyword missing from H1/title.');
  } else {
    wins.push('Keyword is in the title.');
  }
  if (!keywordInFirst100Words) {
    score -= 8;
    issues.push('Keyword not in the first 100 words.');
  }

  // Meta
  if (!metaTitle || metaTitle.length > 60) {
    score -= 5;
    issues.push(metaTitle ? `Meta title too long (${metaTitle.length} chars, max 60).` : 'Meta title missing.');
  }
  if (!metaDesc || metaDesc.length > 160 || metaDesc.length < 80) {
    score -= 5;
    issues.push(
      !metaDesc
        ? 'Meta description missing.'
        : `Meta description length suboptimal (${metaDesc.length} chars; aim 120–155).`,
    );
  }

  score = Math.max(0, Math.min(100, score));
  const grade: ContentScore['grade'] =
    score >= 90 ? 'A' : score >= 80 ? 'B' : score >= 70 ? 'C' : score >= 60 ? 'D' : 'F';

  return {
    score,
    grade,
    issues,
    wins,
    details: {
      wordCount,
      h2Count,
      h3Count,
      faqCount,
      internalLinks,
      externalLinks,
      keywordInTitle,
      keywordInFirst100Words,
    },
  };
}
