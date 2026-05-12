import { TocItem } from "@/lib/markdown";

/**
 * Renders a sticky in-page table of contents from H2/H3 headings.
 * Helps Google generate "Jump to" SERP links and improves dwell time.
 */
export default function TableOfContents({ items }: { items: TocItem[] }) {
  if (items.length < 3) return null; // Not worth showing on short posts.

  return (
    <nav
      aria-label="Table of contents"
      className="my-8 rounded-xl border border-neutral-200 bg-neutral-50 p-5"
    >
      <p className="text-xs font-bold uppercase tracking-wider text-neutral-500 mb-3">
        On this page
      </p>
      <ol className="space-y-1.5 text-sm">
        {items.map((it) => (
          <li
            key={it.id}
            className={it.level === 3 ? "ml-5 text-neutral-600" : "text-neutral-800"}
          >
            <a
              href={`#${it.id}`}
              className="hover:text-blue-600 hover:underline transition-colors"
            >
              {it.text}
            </a>
          </li>
        ))}
      </ol>
    </nav>
  );
}
