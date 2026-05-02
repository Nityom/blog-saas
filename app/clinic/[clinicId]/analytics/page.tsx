"use client";

import { useState } from "react";
import { useQuery } from "convex/react";
import { api } from "@/convex/_generated/api";
import { Id } from "@/convex/_generated/dataModel";
import { useParams } from "next/navigation";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { BarChart3, TrendingUp, Eye } from "lucide-react";
import Link from "next/link";
import { AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from "recharts";

type TimeRange = "weekly" | "monthly" | "yearly" | "overall";

type FilterType = "all" | "post" | "keyword";

export default function ClinicAnalyticsPage() {
  const params = useParams();
  const clinicId = params.clinicId as string;

  const [timeRange, setTimeRange] = useState<TimeRange>("overall");
  const [filterType, setFilterType] = useState<FilterType>("all");
  const [selectedPost, setSelectedPost] = useState<string>("");
  const [selectedKeyword, setSelectedKeyword] = useState<string>("");

  const topPosts = useQuery(api.analytics.getTopPerformingPosts, { clinicId: clinicId as Id<"clinics">, timeRange });
  const keywords = useQuery(api.keywords.getByClinic, { clinicId: clinicId as Id<"clinics"> });
  const allPosts = useQuery(api.posts.getPublishedByClinic, { clinicId: clinicId as Id<"clinics"> });
  const analyticsData = useQuery(api.analytics.getAnalyticsOverTime, { clinicId: clinicId as Id<"clinics">, timeRange });

  if (topPosts === undefined || keywords === undefined || allPosts === undefined || analyticsData === undefined) {
    return <div className="p-8 text-neutral-400">Loading analytics...</div>;
  }

  const topKeywords = [...keywords].sort((a, b) => b.performanceScore - a.performanceScore).slice(0, 5);

  const getPostTitle = (postId: string) => {
    return allPosts.find(p => p._id === postId)?.title || "Unknown Post";
  };

  // Combine analytics records by day (or just use raw data if there's one per day, but we'll mock dates if needed)
  let filteredAnalytics = analyticsData;
  if (filterType === "post" && selectedPost) {
    filteredAnalytics = analyticsData.filter(r => r.postId === selectedPost);
  } else if (filterType === "keyword" && selectedKeyword) {
    filteredAnalytics = analyticsData.filter(r => {
      const post = allPosts.find(p => p._id === r.postId);
      return post && post.keywordId === selectedKeyword;
    });
  }

  const chartData = filteredAnalytics.map(record => ({
    name: getPostTitle(record.postId).substring(0, 15) + "...",
    views: record.views,
    time: Math.round(record.avgTimeOnPage || 0)
  })).sort((a, b) => b.views - a.views).slice(0, 10);

  // If no data, use mock data for empty state preview
  const finalChartData = chartData.length > 0 ? chartData : [
    { name: "Post 1", views: 400 },
    { name: "Post 2", views: 300 },
    { name: "Post 3", views: 200 },
    { name: "Post 4", views: 278 },
    { name: "Post 5", views: 189 },
    { name: "Post 6", views: 239 },
    { name: "Post 7", views: 349 },
  ];

  return (
    <div className="p-8 max-w-6xl mx-auto space-y-6">
      <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
        <div>
          <h2 className="text-2xl font-bold tracking-tight text-neutral-900">Analytics</h2>
          <p className="text-neutral-500">Track the performance of your generated content.</p>
        </div>
        <div className="flex flex-wrap gap-2 items-center">
          <select
            value={timeRange}
            onChange={e => setTimeRange(e.target.value as TimeRange)}
            className="bg-white border text-sm border-neutral-300 text-neutral-900 rounded-md px-3 py-2 cursor-pointer outline-none focus:ring-2 focus:ring-blue-500 transition-colors"
          >
            <option value="weekly">Weekly</option>
            <option value="monthly">Monthly</option>
            <option value="yearly">Yearly</option>
            <option value="overall">Overall</option>
          </select>
          <select
            value={filterType}
            onChange={e => {
              setFilterType(e.target.value as FilterType);
              setSelectedPost("");
              setSelectedKeyword("");
            }}
            className="bg-white border text-sm border-neutral-300 text-neutral-900 rounded-md px-3 py-2 cursor-pointer outline-none focus:ring-2 focus:ring-blue-500 transition-colors"
          >
            <option value="all">All</option>
            <option value="post">By Post</option>
            <option value="keyword">By Keyword</option>
          </select>
          {filterType === "post" && (
            <select
              value={selectedPost}
              onChange={e => setSelectedPost(e.target.value)}
              className="bg-white border text-sm border-neutral-300 text-neutral-900 rounded-md px-3 py-2 cursor-pointer outline-none focus:ring-2 focus:ring-blue-500 transition-colors"
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
              className="bg-white border text-sm border-neutral-300 text-neutral-900 rounded-md px-3 py-2 cursor-pointer outline-none focus:ring-2 focus:ring-blue-500 transition-colors"
            >
              <option value="">Select Keyword</option>
              {keywords.map(kw => (
                <option key={kw._id} value={kw._id}>{kw.term}</option>
              ))}
            </select>
          )}
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        <Card className="bg-white border-neutral-200">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Eye className="w-5 h-5 text-blue-500" /> Top Performing Posts
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              {topPosts.length === 0 && <p className="text-neutral-500 text-sm">No analytics data yet.</p>}
              {topPosts.map((record) => (
                <div key={record._id} className="flex items-center justify-between">
                  <div className="truncate pr-4 max-w-[250px]">
                    <Link href={`/clinic/${clinicId}/posts/${record.postId}`} className="font-medium text-sm text-neutral-800 hover:text-blue-600 hover:underline truncate block">
                      {getPostTitle(record.postId)}
                    </Link>
                  </div>
                  <div className="text-sm font-semibold bg-blue-50 text-blue-700 px-2 py-1 rounded">
                    {record.views} views
                  </div>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>

        <Card className="bg-white border-neutral-200">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <TrendingUp className="w-5 h-5 text-green-500" /> Top Keywords
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              {topKeywords.length === 0 && <p className="text-neutral-500 text-sm">No keyword data yet.</p>}
              {topKeywords.map((kw) => (
                <div key={kw._id} className="flex items-center justify-between">
                  <div>
                    <div className="font-medium text-sm text-neutral-800">{kw.term}</div>
                    <div className="text-xs text-neutral-500">{kw.timesUsed} posts</div>
                  </div>
                  <div className="text-sm font-semibold bg-green-50 text-green-700 px-2 py-1 rounded">
                    {kw.performanceScore.toFixed(1)} score
                  </div>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      </div>

      <Card className="bg-white border-neutral-200">
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <BarChart3 className="w-5 h-5 text-purple-500" /> Traffic Overview
          </CardTitle>
        </CardHeader>
        <CardContent className="h-[400px] flex flex-col items-center justify-center border-t border-neutral-100 bg-neutral-50 pt-6">
          {chartData.length === 0 && (
            <p className="text-neutral-400 text-sm mb-4 text-center">Not enough data to display. Showing sample overview.</p>
          )}
          <ResponsiveContainer width="100%" height="100%">
            <AreaChart data={finalChartData} margin={{ top: 10, right: 30, left: 0, bottom: 0 }}>
              <defs>
                <linearGradient id="colorViews" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="5%" stopColor="#8b5cf6" stopOpacity={0.8}/>
                  <stop offset="95%" stopColor="#8b5cf6" stopOpacity={0}/>
                </linearGradient>
              </defs>
              <XAxis dataKey="name" className="text-xs" tick={{ fill: '#888' }} axisLine={true} tickLine={false} />
              <YAxis className="text-xs" tick={{ fill: '#888' }} axisLine={false} tickLine={false} />
              <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#e5e5e5" />
              <Tooltip 
                contentStyle={{ borderRadius: '8px', border: '1px solid #e5e5e5', boxShadow: '0 4px 6px -1px rgb(0 0 0 / 0.1)' }}
              />
              <Area type="monotone" dataKey="views" stroke="#8b5cf6" fillOpacity={1} fill="url(#colorViews)" />
            </AreaChart>
          </ResponsiveContainer>
        </CardContent>
      </Card>
    </div>
  );
}
