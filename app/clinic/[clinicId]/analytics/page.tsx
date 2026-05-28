"use client";

import { useState } from "react";
import { useQuery } from "convex/react";
import { api } from "@/convex/_generated/api";
import { Id } from "@/convex/_generated/dataModel";
import { useParams } from "next/navigation";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { BarChart3, TrendingUp, Eye, Activity } from "lucide-react";
import Link from "next/link";
import { AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from "recharts";

type TimeRange = "weekly" | "monthly" | "yearly" | "overall";
type FilterType = "all" | "post" | "keyword";

const TIME_RANGES: { label: string; value: TimeRange }[] = [
  { label: "Week", value: "weekly" },
  { label: "Month", value: "monthly" },
  { label: "Year", value: "yearly" },
  { label: "All Time", value: "overall" },
];

export default function ClinicAnalyticsPage() {
  const params = useParams();
  const clinicId = params.clinicId as string;

  const [timeRange, setTimeRange] = useState<TimeRange>("monthly");
  const [filterType, setFilterType] = useState<FilterType>("all");
  const [selectedPost, setSelectedPost] = useState<string>("");
  const [selectedKeyword, setSelectedKeyword] = useState<string>("");

  const topPosts = useQuery(api.analytics.getTopPerformingPosts, { clinicId: clinicId as Id<"clinics">, timeRange });
  const keywords = useQuery(api.keywords.getByClinic, { clinicId: clinicId as Id<"clinics"> });
  const allPosts = useQuery(api.posts.getPublishedByClinic, { clinicId: clinicId as Id<"clinics"> });
  const analyticsData = useQuery(api.analytics.getAnalyticsOverTime, { clinicId: clinicId as Id<"clinics">, timeRange });

  if (topPosts === undefined || keywords === undefined || allPosts === undefined || analyticsData === undefined) {
    return (
      <div className="p-8 flex items-center justify-center min-h-[400px]">
        <div className="flex flex-col items-center gap-3 text-neutral-400">
          <div className="w-8 h-8 border-2 border-neutral-200 border-t-blue-500 rounded-full animate-spin" />
          <span className="text-sm">Loading analytics...</span>
        </div>
      </div>
    );
  }

  const topKeywords = [...keywords].sort((a, b) => b.performanceScore - a.performanceScore).slice(0, 5);

  const getPostTitle = (postId: string) => allPosts.find(p => p._id === postId)?.title || "Unknown Post";

  let filteredAnalytics = analyticsData;
  if (filterType === "post" && selectedPost) {
    filteredAnalytics = analyticsData.filter(r => r.postId === selectedPost);
  } else if (filterType === "keyword" && selectedKeyword) {
    filteredAnalytics = analyticsData.filter(r => {
      const post = allPosts.find(p => p._id === r.postId);
      return post && post.keywordId === selectedKeyword;
    });
  }

  const totalViews = filteredAnalytics.reduce((s, r) => s + r.views, 0);
  const avgTime = filteredAnalytics.length
    ? Math.round(filteredAnalytics.reduce((s, r) => s + (r.avgTimeOnPage || 0), 0) / filteredAnalytics.length)
    : 0;

  const chartData = filteredAnalytics
    .map(record => ({
      name: getPostTitle(record.postId).substring(0, 18) + "…",
      views: record.views,
    }))
    .sort((a, b) => b.views - a.views)
    .slice(0, 10);

  const finalChartData = chartData.length > 0 ? chartData : [
    { name: "Post 1", views: 0 },
    { name: "Post 2", views: 0 },
    { name: "Post 3", views: 0 },
  ];

  return (
    <div className="p-6 lg:p-8 max-w-6xl mx-auto space-y-6">

      {/* Header + Filters */}
      <div className="flex flex-col md:flex-row md:items-start md:justify-between gap-4">
        <div>
          <h2 className="text-2xl font-bold tracking-tight text-neutral-900">Analytics</h2>
          <p className="text-neutral-500 text-sm mt-1">Track the performance of your generated content.</p>
        </div>

        <div className="flex flex-col sm:flex-row gap-3 items-start sm:items-center">
          {/* Time range pill buttons */}
          <div className="flex items-center bg-neutral-100 rounded-lg p-1 gap-0.5">
            {TIME_RANGES.map(({ label, value }) => (
              <button
                key={value}
                onClick={() => setTimeRange(value)}
                className={`px-3 py-1.5 rounded-md text-sm font-medium transition-all ${
                  timeRange === value
                    ? "bg-white text-neutral-900 shadow-sm"
                    : "text-neutral-500 hover:text-neutral-700"
                }`}
              >
                {label}
              </button>
            ))}
          </div>

          {/* Content filter */}
          <div className="flex items-center gap-2">
            <select
              value={filterType}
              onChange={e => { setFilterType(e.target.value as FilterType); setSelectedPost(""); setSelectedKeyword(""); }}
              className="bg-white border border-neutral-200 text-sm text-neutral-700 rounded-lg px-3 py-2 cursor-pointer outline-none focus:ring-2 focus:ring-blue-500 shadow-sm"
            >
              <option value="all">All Content</option>
              <option value="post">By Post</option>
              <option value="keyword">By Keyword</option>
            </select>
            {filterType === "post" && (
              <select
                value={selectedPost}
                onChange={e => setSelectedPost(e.target.value)}
                className="bg-white border border-neutral-200 text-sm text-neutral-700 rounded-lg px-3 py-2 cursor-pointer outline-none focus:ring-2 focus:ring-blue-500 shadow-sm max-w-[200px]"
              >
                <option value="">Select Post</option>
                {allPosts.map(post => (
                  <option key={post._id} value={post._id}>{post.title}</option>
                ))}
              </select>
            )}
            {filterType === "keyword" && (
              <select
                value={selectedKeyword}
                onChange={e => setSelectedKeyword(e.target.value)}
                className="bg-white border border-neutral-200 text-sm text-neutral-700 rounded-lg px-3 py-2 cursor-pointer outline-none focus:ring-2 focus:ring-blue-500 shadow-sm"
              >
                <option value="">Select Keyword</option>
                {keywords.map(kw => (
                  <option key={kw._id} value={kw._id}>{kw.term}</option>
                ))}
              </select>
            )}
          </div>
        </div>
      </div>

      {/* Summary stat pills */}
      <div className="grid grid-cols-2 sm:grid-cols-3 gap-4">
        <div className="bg-white border border-neutral-200 rounded-xl p-4 flex items-center gap-3 shadow-sm">
          <div className="w-9 h-9 rounded-lg bg-blue-50 flex items-center justify-center flex-shrink-0">
            <Eye className="w-4 h-4 text-blue-600" />
          </div>
          <div>
            <div className="text-xl font-bold text-neutral-900">{totalViews.toLocaleString()}</div>
            <div className="text-xs text-neutral-500">Total Views</div>
          </div>
        </div>
        <div className="bg-white border border-neutral-200 rounded-xl p-4 flex items-center gap-3 shadow-sm">
          <div className="w-9 h-9 rounded-lg bg-purple-50 flex items-center justify-center flex-shrink-0">
            <Activity className="w-4 h-4 text-purple-600" />
          </div>
          <div>
            <div className="text-xl font-bold text-neutral-900">{avgTime}s</div>
            <div className="text-xs text-neutral-500">Avg. Time on Page</div>
          </div>
        </div>
        <div className="bg-white border border-neutral-200 rounded-xl p-4 flex items-center gap-3 shadow-sm">
          <div className="w-9 h-9 rounded-lg bg-green-50 flex items-center justify-center flex-shrink-0">
            <TrendingUp className="w-4 h-4 text-green-600" />
          </div>
          <div>
            <div className="text-xl font-bold text-neutral-900">{filteredAnalytics.length}</div>
            <div className="text-xs text-neutral-500">Posts Tracked</div>
          </div>
        </div>
      </div>

      {/* Top Posts + Top Keywords */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        <Card className="bg-white border-neutral-200 shadow-sm">
          <CardHeader className="pb-3 border-b border-neutral-100">
            <CardTitle className="flex items-center gap-2 text-base">
              <Eye className="w-4 h-4 text-blue-500" /> Top Performing Posts
            </CardTitle>
          </CardHeader>
          <CardContent className="pt-4">
            <div className="space-y-3">
              {topPosts.length === 0 && (
                <p className="text-neutral-400 text-sm text-center py-4">No analytics data yet for this period.</p>
              )}
              {topPosts.map((record, i) => (
                <div key={record._id} className="flex items-center justify-between gap-3">
                  <div className="flex items-center gap-2.5 min-w-0">
                    <span className="text-xs text-neutral-400 font-mono w-4 text-right flex-shrink-0">{i + 1}</span>
                    <Link
                      href={`/clinic/${clinicId}/posts/${record.postId}`}
                      className="text-sm text-neutral-700 hover:text-blue-600 truncate transition-colors"
                    >
                      {getPostTitle(record.postId)}
                    </Link>
                  </div>
                  <span className="text-xs font-semibold bg-blue-50 text-blue-700 px-2.5 py-1 rounded-full flex-shrink-0 whitespace-nowrap">
                    {record.views.toLocaleString()} views
                  </span>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>

        <Card className="bg-white border-neutral-200 shadow-sm">
          <CardHeader className="pb-3 border-b border-neutral-100">
            <CardTitle className="flex items-center gap-2 text-base">
              <TrendingUp className="w-4 h-4 text-green-500" /> Top Keywords
            </CardTitle>
          </CardHeader>
          <CardContent className="pt-4">
            <div className="space-y-3">
              {topKeywords.length === 0 && (
                <p className="text-neutral-400 text-sm text-center py-4">No keyword data yet.</p>
              )}
              {topKeywords.map((kw, i) => (
                <div key={kw._id} className="flex items-center justify-between gap-3">
                  <div className="flex items-center gap-2.5 min-w-0">
                    <span className="text-xs text-neutral-400 font-mono w-4 text-right flex-shrink-0">{i + 1}</span>
                    <div className="min-w-0">
                      <div className="text-sm text-neutral-700 truncate">{kw.term}</div>
                      <div className="text-xs text-neutral-400">{kw.timesUsed} post{kw.timesUsed !== 1 ? "s" : ""}</div>
                    </div>
                  </div>
                  <span className="text-xs font-semibold bg-green-50 text-green-700 px-2.5 py-1 rounded-full flex-shrink-0 whitespace-nowrap">
                    {kw.performanceScore.toFixed(1)} score
                  </span>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Traffic Chart */}
      <Card className="bg-white border-neutral-200 shadow-sm">
        <CardHeader className="pb-3 border-b border-neutral-100">
          <CardTitle className="flex items-center gap-2 text-base">
            <BarChart3 className="w-4 h-4 text-purple-500" /> Traffic Overview
            <span className="ml-auto text-xs font-normal text-neutral-400">
              {TIME_RANGES.find(t => t.value === timeRange)?.label}
            </span>
          </CardTitle>
        </CardHeader>
        <CardContent className="pt-4">
          {chartData.length === 0 && (
            <p className="text-neutral-400 text-xs text-center mb-2">No data for this period — showing placeholder.</p>
          )}
          <div className="h-72">
            <ResponsiveContainer width="100%" height="100%">
              <AreaChart data={finalChartData} margin={{ top: 4, right: 16, left: -10, bottom: 0 }}>
                <defs>
                  <linearGradient id="colorViews" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="#8b5cf6" stopOpacity={0.25} />
                    <stop offset="95%" stopColor="#8b5cf6" stopOpacity={0} />
                  </linearGradient>
                </defs>
                <XAxis dataKey="name" tick={{ fill: "#9ca3af", fontSize: 11 }} axisLine={false} tickLine={false} />
                <YAxis tick={{ fill: "#9ca3af", fontSize: 11 }} axisLine={false} tickLine={false} />
                <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f3f4f6" />
                <Tooltip
                  contentStyle={{ borderRadius: "8px", border: "1px solid #e5e7eb", fontSize: 12 }}
                  cursor={{ stroke: "#8b5cf6", strokeWidth: 1, strokeDasharray: "3 3" }}
                />
                <Area type="monotone" dataKey="views" stroke="#8b5cf6" strokeWidth={2} fillOpacity={1} fill="url(#colorViews)" />
              </AreaChart>
            </ResponsiveContainer>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
