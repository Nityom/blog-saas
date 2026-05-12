"use client";

import { useMutation } from "convex/react";
import { api } from "@/convex/_generated/api";
import { Id } from "@/convex/_generated/dataModel";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { CheckCircle2, Circle, ExternalLink } from "lucide-react";
import { useState } from "react";
import { toast } from "sonner";

// Curated, opinionated checklist of off-page work that actually moves the
// needle for a local Indian dental clinic blog. Ordered roughly by ROI.
type ChecklistItem = {
  id: string;
  title: string;
  why: string;
  url?: string;
  category: "must-do" | "high-impact" | "ongoing";
};

const CATEGORIES: Record<ChecklistItem["category"], { label: string; color: string }> = {
  "must-do": { label: "Must-do (Week 1)", color: "bg-red-50 text-red-700 border-red-200" },
  "high-impact": { label: "High-impact (Month 1)", color: "bg-amber-50 text-amber-700 border-amber-200" },
  "ongoing": { label: "Ongoing", color: "bg-blue-50 text-blue-700 border-blue-200" },
};

const ITEMS: ChecklistItem[] = [
  // Must-do — without these, no amount of on-page SEO will rank you.
  { id: "gsc-verify", category: "must-do", title: "Verify domain in Google Search Console", why: "Google won't tell you why pages aren't ranking until you verify ownership. This is the single most important step.", url: "https://search.google.com/search-console" },
  { id: "gsc-sitemap", category: "must-do", title: "Submit sitemap.xml in GSC", why: "Tells Google about every post URL in one shot — accelerates indexing from weeks to days." },
  { id: "bing-verify", category: "must-do", title: "Verify domain in Bing Webmaster Tools", why: "Bing powers ChatGPT search and ~7% of search traffic. Free traffic many clinics ignore.", url: "https://www.bing.com/webmasters" },
  { id: "gbp-claim", category: "must-do", title: "Claim & complete Google Business Profile", why: "For local services, GBP drives 5-10× more clicks than a blog. Add the blog URL in the website field.", url: "https://business.google.com" },
  { id: "main-site-link", category: "must-do", title: "Link to blog from main clinic website footer", why: "Internal links from an established domain pass authority to the new blog instantly." },

  // High-impact — backlinks + local citations.
  { id: "practo", category: "high-impact", title: "List on Practo with blog URL", why: "Practo has very high domain authority in India. A backlink from there is worth ~10 random links.", url: "https://www.practo.com" },
  { id: "justdial", category: "high-impact", title: "List on JustDial with blog URL", why: "Local citations on JustDial improve Google's confidence in your NAP (Name/Address/Phone).", url: "https://www.justdial.com" },
  { id: "sulekha", category: "high-impact", title: "List on Sulekha", why: "Another high-trust local directory in India.", url: "https://www.sulekha.com" },
  { id: "lybrate", category: "high-impact", title: "Doctor profile on Lybrate", why: "Author E-E-A-T signal — link doctor's Lybrate profile from author bio.", url: "https://www.lybrate.com" },
  { id: "ida-listing", category: "high-impact", title: "Listed on Indian Dental Association directory", why: "Authoritative .org backlink from IDA improves medical-content trust signals.", url: "https://www.ida.org.in" },
  { id: "gbp-posts", category: "high-impact", title: "Post 1 GBP update per week linking to a blog post", why: "GBP posts appear in local pack and feed Google fresh signals about your blog." },

  // Ongoing — what to do every month.
  { id: "monthly-keywords", category: "ongoing", title: "Review GSC top queries monthly", why: "Find keywords where you rank #5–15 and create deeper posts to push to top 3." },
  { id: "monthly-reviews", category: "ongoing", title: "Ask 5 patients for Google reviews per month", why: "Reviews are the strongest local ranking signal. They also feed schema markup ratings." },
  { id: "social-share", category: "ongoing", title: "Share each new blog post to FB & Instagram", why: "Auto-post is enabled in the Social tab — verify it's working monthly." },
  { id: "broken-links", category: "ongoing", title: "Run \"Fix Broken Links\" monthly", why: "Old internal links can break when slugs change. The button is on this page header." },
];

export function SeoChecklist({ clinicId, completed }: { clinicId: Id<"clinics">; completed: Record<string, number> }) {
  const toggle = useMutation(api.clinics.toggleSeoChecklistItem);
  const [pending, setPending] = useState<Set<string>>(new Set());

  const handleToggle = async (itemId: string, isDone: boolean) => {
    setPending((p) => new Set(p).add(itemId));
    try {
      await toggle({ clinicId, itemId, completed: !isDone });
      toast.success(isDone ? "Marked as not done" : "Nice — marked complete!");
    } catch {
      toast.error("Could not update checklist");
    } finally {
      setPending((p) => {
        const next = new Set(p);
        next.delete(itemId);
        return next;
      });
    }
  };

  const grouped = (Object.keys(CATEGORIES) as ChecklistItem["category"][]).map((cat) => ({
    category: cat,
    items: ITEMS.filter((i) => i.category === cat),
  }));

  const totalDone = ITEMS.filter((i) => completed[i.id]).length;
  const pct = Math.round((totalDone / ITEMS.length) * 100);

  return (
    <div className="space-y-6">
      <Card className="bg-gradient-to-br from-blue-600 to-blue-700 text-white border-none">
        <CardHeader>
          <CardTitle className="text-lg">Off-page SEO Checklist</CardTitle>
          <CardDescription className="text-blue-100">
            Great content alone won&apos;t rank a new domain. These off-page items drive most of the early traffic.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="flex items-center justify-between mb-2">
            <span className="text-sm text-blue-100">Progress</span>
            <span className="text-sm font-bold">{totalDone} / {ITEMS.length} ({pct}%)</span>
          </div>
          <div className="h-2 bg-blue-900/40 rounded-full overflow-hidden">
            <div className="h-full bg-white transition-all" style={{ width: `${pct}%` }} />
          </div>
        </CardContent>
      </Card>

      {grouped.map(({ category, items }) => (
        <Card key={category} className="bg-white border-neutral-200">
          <CardHeader className="pb-3">
            <div className={`inline-flex w-fit items-center gap-2 px-3 py-1 rounded-full text-xs font-bold border ${CATEGORIES[category].color}`}>
              {CATEGORIES[category].label}
            </div>
          </CardHeader>
          <CardContent className="p-0">
            <ul className="divide-y divide-neutral-100">
              {items.map((item) => {
                const isDone = !!completed[item.id];
                const isBusy = pending.has(item.id);
                return (
                  <li key={item.id} className="p-4 flex items-start gap-4 hover:bg-neutral-50 transition-colors">
                    <button
                      onClick={() => handleToggle(item.id, isDone)}
                      disabled={isBusy}
                      aria-label={isDone ? "Mark incomplete" : "Mark complete"}
                      className="mt-0.5 flex-shrink-0 disabled:opacity-50"
                    >
                      {isDone ? (
                        <CheckCircle2 className="w-6 h-6 text-green-600" />
                      ) : (
                        <Circle className="w-6 h-6 text-neutral-300 hover:text-neutral-500 transition-colors" />
                      )}
                    </button>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-start justify-between gap-3">
                        <p className={`font-semibold ${isDone ? "text-neutral-400 line-through" : "text-neutral-900"}`}>
                          {item.title}
                        </p>
                        {item.url && (
                          <a
                            href={item.url}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="text-xs text-blue-600 hover:underline flex items-center gap-1 flex-shrink-0 mt-0.5"
                          >
                            Open <ExternalLink className="w-3 h-3" />
                          </a>
                        )}
                      </div>
                      <p className={`text-xs mt-1 ${isDone ? "text-neutral-400" : "text-neutral-500"}`}>{item.why}</p>
                      {isDone && completed[item.id] && (
                        <p className="text-xs text-green-600 mt-1">
                          Completed {new Date(completed[item.id]).toLocaleDateString()}
                        </p>
                      )}
                    </div>
                  </li>
                );
              })}
            </ul>
          </CardContent>
        </Card>
      ))}
    </div>
  );
}
