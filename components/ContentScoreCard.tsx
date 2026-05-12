"use client";

import { useMemo } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { scoreContent, type ContentScore } from "@/lib/markdown";
import { CheckCircle2, AlertCircle, Sparkles } from "lucide-react";

const GRADE_COLOR: Record<ContentScore["grade"], string> = {
  A: "text-green-700 bg-green-100 border-green-300",
  B: "text-blue-700 bg-blue-100 border-blue-300",
  C: "text-amber-700 bg-amber-100 border-amber-300",
  D: "text-orange-700 bg-orange-100 border-orange-300",
  F: "text-red-700 bg-red-100 border-red-300",
};

export default function ContentScoreCard({
  content,
  title,
  metaTitle,
  metaDesc,
  keyword,
}: {
  content: string;
  title: string;
  metaTitle?: string;
  metaDesc?: string;
  keyword: string;
}) {
  const result = useMemo(
    () => scoreContent({ content, title, metaTitle, metaDesc, keyword: keyword || title }),
    [content, title, metaTitle, metaDesc, keyword],
  );

  return (
    <Card className="bg-white border-neutral-200">
      <CardHeader className="pb-3">
        <div className="flex items-center justify-between">
          <CardTitle className="flex items-center gap-2 text-base">
            <Sparkles className="w-4 h-4 text-blue-600" />
            SEO Quality Score
          </CardTitle>
          <span
            className={`px-3 py-1 rounded-full font-bold text-sm border ${GRADE_COLOR[result.grade]}`}
          >
            {result.grade} · {result.score}
          </span>
        </div>
      </CardHeader>
      <CardContent className="space-y-4 text-sm">
        <div className="grid grid-cols-2 gap-x-4 gap-y-1.5 text-xs text-neutral-600">
          <span>Words: <strong className="text-neutral-900">{result.details.wordCount}</strong></span>
          <span>H2s: <strong className="text-neutral-900">{result.details.h2Count}</strong></span>
          <span>H3s: <strong className="text-neutral-900">{result.details.h3Count}</strong></span>
          <span>Internal links: <strong className="text-neutral-900">{result.details.internalLinks}</strong></span>
          <span>External links: <strong className="text-neutral-900">{result.details.externalLinks}</strong></span>
          <span>FAQ items: <strong className="text-neutral-900">{result.details.faqCount}</strong></span>
        </div>

        {result.issues.length > 0 && (
          <div>
            <p className="font-semibold text-neutral-700 mb-2">Fix these to rank higher:</p>
            <ul className="space-y-1.5">
              {result.issues.map((it, i) => (
                <li key={i} className="flex items-start gap-2 text-neutral-700">
                  <AlertCircle className="w-4 h-4 text-amber-500 flex-shrink-0 mt-0.5" />
                  <span>{it}</span>
                </li>
              ))}
            </ul>
          </div>
        )}

        {result.wins.length > 0 && (
          <div>
            <p className="font-semibold text-neutral-700 mb-2">Strengths:</p>
            <ul className="space-y-1.5">
              {result.wins.map((w, i) => (
                <li key={i} className="flex items-start gap-2 text-neutral-600">
                  <CheckCircle2 className="w-4 h-4 text-green-600 flex-shrink-0 mt-0.5" />
                  <span>{w}</span>
                </li>
              ))}
            </ul>
          </div>
        )}
      </CardContent>
    </Card>
  );
}
