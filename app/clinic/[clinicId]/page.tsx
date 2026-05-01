"use client";

import { useQuery } from "convex/react";
import { api } from "@/convex/_generated/api";
import { Id } from "@/convex/_generated/dataModel";
import { useParams } from "next/navigation";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import Link from "next/link";
import { Button } from "@/components/ui/button";

export default function ClinicDashboard() {
  const params = useParams();
  const clinicId = params.clinicId as string;


  const posts = useQuery(api.posts.getByClinic, { clinicId: clinicId as Id<"clinics"> });

  if (posts === undefined) {
    return <div className="p-8 text-neutral-400">Loading dashboard...</div>;
  }

  const published = posts.filter(p => p.status === "published").length;
  const drafts = posts.filter(p => p.status === "draft").length;
  const flagged = posts.filter(p => p.status === "flagged").length;

  const recentPosts = [...posts].sort((a, b) => b.createdAt - a.createdAt).slice(0, 5);

  return (
    <div className="p-8 max-w-5xl mx-auto space-y-8 text-neutral-900">
      <div>
        <h2 className="text-3xl font-bold tracking-tight">Overview</h2>
        <p className="text-neutral-500 mt-2">Manage your blog content and performance.</p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
        <Card className="bg-white border-neutral-200 shadow-sm">
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-neutral-500">Published</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-3xl font-bold text-green-600">{published}</div>
          </CardContent>
        </Card>
        <Card className="bg-white border-neutral-200 shadow-sm">
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-neutral-500">Drafts</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-3xl font-bold text-neutral-700">{drafts}</div>
          </CardContent>
        </Card>
        <Card className="bg-white border-neutral-200 shadow-sm">
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-neutral-500">Action Required</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-3xl font-bold text-red-500">{flagged}</div>
          </CardContent>
        </Card>
        <Card className="bg-white border-neutral-200 shadow-sm">
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-neutral-500">This Month</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-3xl font-bold text-blue-600">
              {posts.filter(p => p.createdAt > Date.now() - 30 * 24 * 60 * 60 * 1000).length}
            </div>
          </CardContent>
        </Card>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
        <div className="col-span-2 space-y-4">
          <div className="flex items-center justify-between">
            <h3 className="text-xl font-semibold">Recent Posts</h3>
            <Link href={`/clinic/${clinicId}/posts`}>
              <Button variant="outline" size="sm" className="shadow-sm">View All</Button>
            </Link>
          </div>
          
          <div className="bg-white border border-neutral-200 rounded-lg overflow-hidden divide-y divide-neutral-100 shadow-sm">
            {recentPosts.length === 0 && <div className="p-6 text-center text-neutral-500">No posts yet.</div>}
            {recentPosts.map((post) => (
              <div key={post._id} className="p-4 flex items-center justify-between hover:bg-neutral-50 transition-colors">
                <div>
                  <Link href={`/clinic/${clinicId}/posts/${post._id}`} className="font-medium text-blue-600 hover:underline">
                    {post.title}
                  </Link>
                  <div className="text-xs text-neutral-500 mt-1">{new Date(post.createdAt).toLocaleDateString()}</div>
                </div>
                <Badge variant="outline" className={
                  post.status === "published" ? "text-green-700 border-green-200 bg-green-50" : 
                  post.status === "flagged" ? "text-red-700 border-red-200 bg-red-50" : 
                  "text-neutral-700 border-neutral-200 bg-neutral-50"
                }>
                  {post.status}
                </Badge>
              </div>
            ))}
          </div>
        </div>

        <div className="space-y-4">
           <h3 className="text-xl font-semibold">System Status</h3>
           <Card className="bg-blue-50/50 border-blue-100 shadow-sm">
             <CardContent className="p-6">
                <p className="text-sm text-blue-800 mb-4">
                  AI blog generation runs automatically every weekday.
                </p>
                <div className="text-xs text-blue-600/80 uppercase font-bold tracking-wider">Next Run</div>
                <div className="font-medium text-blue-900 mt-1">Tomorrow, 9:00 AM</div>
             </CardContent>
           </Card>
        </div>
      </div>
    </div>
  );
}
