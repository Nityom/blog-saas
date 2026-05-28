"use client";

import { useQuery } from "convex/react";
import { api } from "@/convex/_generated/api";
import { Id } from "@/convex/_generated/dataModel";
import { useParams } from "next/navigation";
import { Badge } from "@/components/ui/badge";
import Link from "next/link";
import { Button } from "@/components/ui/button";
import { CheckCircle2, FileText, AlertTriangle, CalendarDays, Copy, ExternalLink, Clock, ArrowRight, Cpu } from "lucide-react";
import { useState } from "react";

function StatCard({ icon, label, value, color }: { icon: React.ReactNode; label: string; value: number; color: string }) {
  return (
    <div className="bg-white border border-neutral-200 rounded-xl p-5 flex items-center gap-4 shadow-sm hover:shadow-md transition-shadow">
      <div className={`w-11 h-11 rounded-lg flex items-center justify-center flex-shrink-0 ${color}`}>
        {icon}
      </div>
      <div>
        <div className="text-2xl font-bold text-neutral-900">{value}</div>
        <div className="text-xs text-neutral-500 font-medium mt-0.5">{label}</div>
      </div>
    </div>
  );
}

export default function ClinicDashboard() {
  const params = useParams();
  const clinicId = params.clinicId as string;
  const [copied, setCopied] = useState(false);

  const posts = useQuery(api.posts.getByClinic, { clinicId: clinicId as Id<"clinics"> });
  const clinic = useQuery(api.clinics.getById, { clinicId: clinicId as Id<"clinics"> });

  if (posts === undefined || clinic === undefined) {
    return (
      <div className="p-8 flex items-center justify-center min-h-[400px]">
        <div className="flex flex-col items-center gap-3 text-neutral-400">
          <div className="w-8 h-8 border-2 border-neutral-200 border-t-blue-500 rounded-full animate-spin" />
          <span className="text-sm">Loading dashboard...</span>
        </div>
      </div>
    );
  }

  const published = posts.filter(p => p.status === "published").length;
  const drafts = posts.filter(p => p.status === "draft").length;
  const flagged = posts.filter(p => p.status === "flagged").length;
  const thisMonth = posts.filter(p => p.createdAt > Date.now() - 30 * 24 * 60 * 60 * 1000).length;

  const recentPosts = [...posts].sort((a, b) => b.createdAt - a.createdAt).slice(0, 5);

  const appUrl = process.env.NEXT_PUBLIC_APP_URL || "https://blog-saas-five.vercel.app";
  const embedCode = clinic
    ? `<div id="blogforge-recent-posts"></div>\n<script src="${appUrl}/api/embed/${clinic.slug}/recent-posts.js"></script>`
    : "";

  const handleCopy = () => {
    navigator.clipboard.writeText(embedCode);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  // Find the next Mon–Fri at 9:00 AM IST (UTC+5:30)
  const now = new Date();
  // Work in IST: shift now by +5:30
  const IST_OFFSET_MS = 5.5 * 60 * 60 * 1000;
  const nowIST = new Date(now.getTime() + IST_OFFSET_MS);
  // Start from tomorrow IST
  const candidate = new Date(nowIST);
  candidate.setUTCDate(nowIST.getUTCDate() + 1);
  candidate.setUTCHours(3, 30, 0, 0); // 9 AM IST = 03:30 UTC
  // Advance past weekend days (0=Sun, 6=Sat in UTC day, but we're already in IST)
  while (candidate.getUTCDay() === 0 || candidate.getUTCDay() === 6) {
    candidate.setUTCDate(candidate.getUTCDate() + 1);
  }
  const nextRun = candidate.toLocaleDateString("en-IN", {
    weekday: "long",
    hour: "numeric",
    minute: "2-digit",
    timeZone: "Asia/Kolkata",
  });

  return (
    <div className="p-6 lg:p-8 max-w-5xl mx-auto space-y-8 text-neutral-900">

      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold tracking-tight">Overview</h2>
          <p className="text-neutral-500 text-sm mt-1">Manage your blog content and performance.</p>
        </div>
        {clinic?.customDomain && (
          <a
            href={`https://${clinic.customDomain}`}
            target="_blank"
            rel="noopener noreferrer"
            className="flex items-center gap-1.5 text-sm text-blue-600 font-medium hover:underline"
          >
            View Blog <ExternalLink className="w-3.5 h-3.5" />
          </a>
        )}
      </div>

      {/* Stat Cards */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <StatCard
          icon={<CheckCircle2 className="w-5 h-5 text-green-600" />}
          label="Published Posts"
          value={published}
          color="bg-green-50"
        />
        <StatCard
          icon={<FileText className="w-5 h-5 text-neutral-500" />}
          label="Waitlist / Drafts"
          value={drafts}
          color="bg-neutral-100"
        />
        <StatCard
          icon={<AlertTriangle className="w-5 h-5 text-amber-500" />}
          label="Action Required"
          value={flagged}
          color="bg-amber-50"
        />
        <StatCard
          icon={<CalendarDays className="w-5 h-5 text-blue-600" />}
          label="Published This Month"
          value={thisMonth}
          color="bg-blue-50"
        />
      </div>

      {/* Recent Posts + Sidebar */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Recent Posts */}
        <div className="lg:col-span-2 space-y-3">
          <div className="flex items-center justify-between">
            <h3 className="font-semibold text-neutral-900">Recent Posts</h3>
            <Link href={`/clinic/${clinicId}/posts`}>
              <Button variant="outline" size="sm" className="gap-1 text-xs h-8">
                View All <ArrowRight className="w-3 h-3" />
              </Button>
            </Link>
          </div>
          
          <div className="bg-white border border-neutral-200 rounded-xl overflow-hidden divide-y divide-neutral-100 shadow-sm">
            {recentPosts.length === 0 && (
              <div className="p-8 text-center text-neutral-400 text-sm">No posts yet. Generate your first post above.</div>
            )}
            {recentPosts.map((post) => (
              <div key={post._id} className="px-4 py-3.5 flex items-center justify-between gap-3 hover:bg-neutral-50 transition-colors group">
                <div className="min-w-0">
                  <Link href={`/clinic/${clinicId}/posts/${post._id}`} className="font-medium text-sm text-neutral-800 group-hover:text-blue-600 truncate block transition-colors">
                    {post.title}
                  </Link>
                  <div className="flex items-center gap-1.5 mt-0.5 text-xs text-neutral-400">
                    <Clock className="w-3 h-3" />
                    {new Date(post.createdAt).toLocaleDateString("en-IN", { day: "numeric", month: "short", year: "numeric" })}
                  </div>
                </div>
                <Badge variant="outline" className={`flex-shrink-0 text-xs ${
                  post.status === "published" ? "text-green-700 border-green-200 bg-green-50" :
                  post.status === "flagged" ? "text-amber-700 border-amber-200 bg-amber-50" :
                  "text-neutral-600 border-neutral-200 bg-neutral-50"
                }`}>
                  {post.status}
                </Badge>
              </div>
            ))}
          </div>
        </div>

        {/* Right sidebar */}
        <div className="space-y-4">
          {/* AI Schedule */}
          <div className="bg-gradient-to-br from-blue-600 to-indigo-600 rounded-xl p-5 text-white shadow-md">
            <div className="flex items-center gap-2 mb-3">
              <Cpu className="w-4 h-4 opacity-80" />
              <span className="text-sm font-semibold opacity-90">AI Schedule</span>
            </div>
            <p className="text-xs opacity-75 mb-3 leading-relaxed">
              New posts are generated automatically every weekday.
            </p>
            <div className="text-[10px] font-bold uppercase tracking-widest opacity-60 mb-1">Next Run</div>
            <div className="text-sm font-semibold">{nextRun} IST</div>
          </div>

          {/* Embed Widget */}
          <div className="bg-white border border-neutral-200 rounded-xl p-5 shadow-sm space-y-3">
            <div className="flex items-center justify-between">
              <h4 className="text-sm font-semibold text-neutral-800">Embed Widget</h4>
              <button
                onClick={handleCopy}
                className="flex items-center gap-1.5 text-xs text-neutral-500 hover:text-blue-600 transition-colors font-medium"
              >
                <Copy className="w-3.5 h-3.5" />
                {copied ? "Copied!" : "Copy"}
              </button>
            </div>
            <p className="text-xs text-neutral-500 leading-relaxed">
              Add this to your main website to display your latest posts.
            </p>
            <pre className="bg-neutral-50 border border-neutral-100 rounded-lg p-3 text-[10px] text-neutral-700 overflow-x-auto whitespace-pre-wrap break-all leading-relaxed font-mono">
              {embedCode}
            </pre>
          </div>
        </div>
      </div>
    </div>
  );
}
