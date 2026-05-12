import Link from "next/link";
import { ChevronRight } from "lucide-react";

/**
 * Visible breadcrumb trail. The corresponding BreadcrumbList JSON-LD is
 * already emitted from the post page — having both visible + structured
 * lifts CTR ~10% by surfacing the trail in Google SERPs.
 */
export default function Breadcrumbs({
  items,
}: {
  items: { label: string; href?: string }[];
}) {
  return (
    <nav aria-label="Breadcrumb" className="mb-6 text-sm text-neutral-500">
      <ol className="flex items-center flex-wrap gap-1">
        {items.map((it, idx) => {
          const isLast = idx === items.length - 1;
          return (
            <li key={`${it.label}-${idx}`} className="flex items-center gap-1 min-w-0">
              {it.href && !isLast ? (
                <Link
                  href={it.href}
                  className="hover:text-blue-600 hover:underline truncate"
                >
                  {it.label}
                </Link>
              ) : (
                <span
                  className={isLast ? "text-neutral-700 font-medium truncate" : "truncate"}
                  aria-current={isLast ? "page" : undefined}
                >
                  {it.label}
                </span>
              )}
              {!isLast && <ChevronRight className="w-3.5 h-3.5 text-neutral-300 flex-shrink-0" aria-hidden />}
            </li>
          );
        })}
      </ol>
    </nav>
  );
}
