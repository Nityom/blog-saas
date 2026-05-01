"use client";

import { useState } from "react";
import { useQuery, useMutation } from "convex/react";
import { api } from "@/convex/_generated/api";
import { Id } from "@/convex/_generated/dataModel";
import { useParams } from "next/navigation";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";
import Link from "next/link";
import { motion } from "framer-motion";
import { Trash2 } from "lucide-react";

export default function ClinicPostsPage() {
  const params = useParams();
  const clinicId = params.clinicId as string;

  const posts = useQuery(api.posts.getByClinic, { clinicId: clinicId as Id<"clinics"> });
  const keywords = useQuery(api.keywords.getByClinic, { clinicId: clinicId as Id<"clinics"> });
  const deletePost = useMutation(api.posts.remove);

  const [filter, setFilter] = useState("all");

  const handleDelete = async (postId: Id<"posts">) => {
    if (window.confirm("Are you sure you want to delete this post? This action cannot be undone.")) {
      await deletePost({ postId });
    }
  };

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

      <Tabs defaultValue="all" value={filter} onValueChange={setFilter} className="w-full flex-col">
        <TabsList className="mb-4 bg-neutral-100/50 border border-neutral-200 p-1 w-fit relative flex text-sm">
          {[
            { id: "all", label: "All" },
            { id: "draft", label: "Drafts" },
            { id: "published", label: "Published" },
            { id: "flagged", label: "Flagged" },
          ].map((tab) => (
            <TabsTrigger
              key={tab.id}
              value={tab.id}
              className={
                `relative rounded-sm px-3 py-1.5 bg-transparent data-active:bg-transparent ` +
                (filter === tab.id
                  ? "text-white hover:text-white"
                  : "text-neutral-600 hover:text-neutral-700")
              }
            >
              {filter === tab.id && (
                <motion.div
                  layoutId="active-tab"
                  className="absolute inset-0 bg-neutral-900 rounded-sm shadow-sm"
                  initial={false}
                  transition={{ type: "spring", stiffness: 400, damping: 30 }}
                />
              )}
              <span className={`relative z-10 font-medium text-sm ${filter === tab.id ? "text-white" : ""}`}>{tab.label}</span>
            </TabsTrigger>
          ))}
        </TabsList>

        <div className="bg-white border border-neutral-200 rounded-lg overflow-hidden shadow-sm">
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
                  <TableCell className="text-right flex items-center justify-end gap-2">
                    <Link href={`/clinic/${clinicId}/posts/${post._id}`}>
                      <Button variant="ghost" size="sm" className="text-blue-600 hover:text-blue-700 hover:bg-blue-50">
                        Edit / View
                      </Button>
                    </Link>
                    <Button 
                      variant="ghost" 
                      size="icon-sm" 
                      className="text-red-500 hover:text-red-600 hover:bg-red-50"
                      onClick={() => handleDelete(post._id)}
                    >
                      <Trash2 className="w-4 h-4" />
                    </Button>
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
