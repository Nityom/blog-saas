"use client";

import { useQuery } from "convex/react";
import { api } from "@/convex/_generated/api";
import { Id } from "@/convex/_generated/dataModel";
import { useParams } from "next/navigation";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { BarChart3, TrendingUp, Eye } from "lucide-react";
import Link from "next/link";
import { AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from "recharts";

export default function ClinicAnalyticsPage() {
  const params = useParams();
  const clinicId = params.clinicId as string;

  const topPosts = useQuery(api.analytics.getTopPerformingPosts, { clinicId: clinicId as Id<"clinics"> });
  const keywords = useQuery(api.keywords.getByClinic, { clinicId: clinicId as Id<"clinics"> });
  const allPosts = useQuery(api.posts.getPublishedByClinic, { clinicId: clinicId as Id<"clinics"> });
  const analyticsData = useQuery(api.analytics.getAnalyticsOverTime, { clinicId: clinicId as Id<"clinics"> });

  if (topPosts === undefined || keywords === undefined || allPosts === undefined || analyticsData === undefined) {
    return <div className="p-8 text-neutral-400">Loading analytics...</div>;
  }

  const topKeywords = [...keywords].sort((a, b) => b.performanceScore - a.performanceScore).slice(0, 5);

  const getPostTitle = (postId: string) => {
    return allPosts.find(p => p._id === postId)?.title || "Unknown Post";
  };

  // Combine analytics records by day (or just use raw data if there's one per day, but we'll mock dates if needed)
  const chartData = analyticsData.map(record => ({
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
      <div>
        <h2 className="text-2xl font-bold tracking-tight text-neutral-900">Analytics</h2>
        <p className="text-neutral-500">Track the performance of your generated content.</p>
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
