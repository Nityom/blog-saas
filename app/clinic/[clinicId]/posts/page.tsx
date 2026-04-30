"use client";

import { useState } from "react";
import { useQuery } from "convex/react";
import { api } from "@/convex/_generated/api";
import { useParams } from "next/navigation";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import Link from "next/link";

export default function ClinicPostsPage() {
  const params = useParams();
  const clinicId = params.clinicId as string;

  const posts = useQuery(api.posts.getByClinic, { clinicId: clinicId as any });
  const keywords = useQuery(api.keywords.getByClinic, { clinicId: clinicId as any });

  const [filter, setFilter] = useState("all");

  if (posts === undefined || keywords === undefined) {
    return <div className="p-8 text-neutral-400">Loading posts...</div>;
  }

  const filteredPosts = posts.filter(p => filter === "all" ? true : p.status === filter)
    .sort((a, b) => b.createdAt - a.createdAt);

  const getKeywordName = (keywordId: string) => {
    return keywords.find(k => k._id === keywordId)?.term || "Unknown";
  };

  return (
    <div className="p-8 max-w-6xl mx-auto space-y-6">
      <div>
        <h2 className="text-2xl font-bold tracking-tight text-neutral-900">Posts</h2>
        <p className="text-neutral-500">Manage your generated blog content.</p>
      </div>

      <Tabs defaultValue="all" value={filter} onValueChange={setFilter} className="w-full">
        <TabsList className="mb-4">
          <TabsTrigger value="all">All</TabsTrigger>
          <TabsTrigger value="draft">Drafts</TabsTrigger>
          <TabsTrigger value="published">Published</TabsTrigger>
          <TabsTrigger value="flagged">Flagged</TabsTrigger>
        </TabsList>

        <div className="bg-white border border-neutral-200 rounded-lg overflow-hidden">
          <Table>
            <TableHeader>
              <TableRow className="bg-neutral-50 hover:bg-neutral-50">
                <TableHead>Title</TableHead>
                <TableHead>Keyword</TableHead>
                <TableHead>Status</TableHead>
                <TableHead>Date</TableHead>
                <TableHead>Read Time</TableHead>
                <TableHead className="text-right">Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {filteredPosts.map((post) => (
                <TableRow key={post._id} className="hover:bg-neutral-50 transition-colors">
                  <TableCell className="font-medium max-w-xs truncate" title={post.title}>
                    {post.title}
                  </TableCell>
                  <TableCell className="text-neutral-500">
                    {getKeywordName(post.keywordId)}
                  </TableCell>
                  <TableCell>
                    <Badge variant="outline" className={
                      post.status === "published" ? "text-green-600 border-green-200 bg-green-50" : 
                      post.status === "flagged" ? "text-red-600 border-red-200 bg-red-50" : 
                      post.status === "generating" ? "text-blue-600 border-blue-200 bg-blue-50 animate-pulse" :
                      "text-neutral-600 border-neutral-200 bg-neutral-100"
                    }>
                      {post.status}
                    </Badge>
                  </TableCell>
                  <TableCell className="text-neutral-500">
                    {new Date(post.createdAt).toLocaleDateString()}
                  </TableCell>
                  <TableCell className="text-neutral-500">
                    {post.readingTime} min
                  </TableCell>
                  <TableCell className="text-right">
                    <Link href={`/clinic/${clinicId}/posts/${post._id}`}>
                      <Button variant="ghost" size="sm" className="text-blue-600 hover:text-blue-700 hover:bg-blue-50">
                        Edit / View
                      </Button>
                    </Link>
                  </TableCell>
                </TableRow>
              ))}
              {filteredPosts.length === 0 && (
                <TableRow>
                  <TableCell colSpan={6} className="text-center py-8 text-neutral-500">
                    No posts found for this filter.
                  </TableCell>
                </TableRow>
              )}
            </TableBody>
          </Table>
        </div>
      </Tabs>
    </div>
  );
}
