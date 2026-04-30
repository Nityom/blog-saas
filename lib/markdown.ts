import { marked } from 'marked';

export function markdownToHtml(markdown: string): string {
  // marked.parse can return string or Promise depending on config, but default synchronous returns string
  return marked.parse(markdown) as string;
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
