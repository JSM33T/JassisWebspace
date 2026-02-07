"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { Plus, Pencil, Trash, User, Calendar, Tag } from "lucide-react";
import { BlogListItem } from "@/lib/api/blog.types";
import { blogService } from "@/lib/api/blog.service";
import { adminBlogService } from "@/lib/api/admin-blog.service";
import { Button } from "@/components/ui/button";
import { Card, CardTitle, CardDescription } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { Badge } from "@/components/ui/badge";

export default function AdminBlogsPage() {
    const [blogs, setBlogs] = useState<BlogListItem[]>([]);
    const [loading, setLoading] = useState(true);
    const [deleting, setDeleting] = useState<string | null>(null);

    useEffect(() => {
        loadBlogs();
    }, []);

    const loadBlogs = async () => {
        try {
            setLoading(true);
            // Use getBlogs which returns Promise<BlogListItem[]>
            const data = await blogService.getBlogs({ pageSize: 100 });
            setBlogs(data);
        } catch (error) {
            console.error("Failed to load blogs", error);
        } finally {
            setLoading(false);
        }
    };

    const handleDelete = async (blogId: string, blogTitle: string) => {
        if (!confirm(`Are you sure you want to delete "${blogTitle}"?`)) {
            return;
        }

        try {
            setDeleting(blogId);
            await adminBlogService.deleteBlog(blogId);
            setBlogs(blogs.filter(b => b.id !== blogId));
        } catch (error) {
            console.error("Failed to delete blog", error);
            alert("Failed to delete blog. Please try again.");
        } finally {
            setDeleting(null);
        }
    };

    return (
        <div className="p-8 pt-24 space-y-8">
            <div className="flex items-center justify-between">
                <div>
                    <h2 className="text-3xl font-bold tracking-tight">Blog Management</h2>
                    <p className="text-muted-foreground">Manage your blog posts, authors, and categories.</p>
                </div>
                <Button asChild>
                    <Link href="/admin/blogs/new">
                        <Plus className="mr-2 h-4 w-4" />
                        Create Post
                    </Link>
                </Button>
            </div>

            {loading ? (
                <div className="space-y-4">
                    {[1, 2, 3].map((i) => (
                        <Skeleton key={i} className="h-32 w-full rounded-xl" />
                    ))}
                </div>
            ) : (
                <div className="grid gap-4">
                    {blogs.length === 0 ? (
                        <div className="text-center py-12 text-muted-foreground">
                            No blog posts found. Create one to get started.
                        </div>
                    ) : (
                        blogs.map((blog) => (
                            <Card key={blog.id} className="p-6 flex flex-col md:flex-row gap-6 relative overflow-hidden transition-all hover:shadow-md">
                                <div className="flex-1 space-y-3">
                                    <div className="flex items-start justify-between">
                                        <div className="space-y-1">
                                            <div className="flex items-center gap-2">
                                                <CardTitle className="text-xl">
                                                    <Link href={`/admin/blogs/${blog.id}`} className="hover:underline">
                                                        {blog.title}
                                                    </Link>
                                                </CardTitle>
                                                {blog.isPublished ? (
                                                    <Badge variant="default" className="bg-green-600 hover:bg-green-700">Published</Badge>
                                                ) : (
                                                    <Badge variant="secondary">Draft</Badge>
                                                )}
                                            </div>
                                            <CardDescription className="line-clamp-2">
                                                {blog.excerpt || "No excerpt"}
                                            </CardDescription>
                                        </div>
                                    </div>

                                    <div className="flex flex-wrap gap-4 text-sm text-muted-foreground">
                                        {blog.category && (
                                            <div className="flex items-center gap-1">
                                                <Tag className="h-3 w-3" />
                                                {blog.category.name}
                                            </div>
                                        )}
                                        <div className="flex items-center gap-1">
                                            <User className="h-3 w-3" />
                                            {blog.authors.map(a => a.displayName || a.username).join(", ")}
                                        </div>
                                        <div className="flex items-center gap-1">
                                            <Calendar className="h-3 w-3" />
                                            {blog.publishedAt ? new Date(blog.publishedAt).toLocaleDateString() : 'Not published'}
                                        </div>
                                    </div>
                                </div>

                                <div className="flex items-center gap-2 md:self-center">
                                    <Button variant="outline" size="sm" asChild>
                                        <Link href={`/admin/blogs/${blog.id}`}>
                                            <Pencil className="h-4 w-4 mr-2" />
                                            Edit
                                        </Link>
                                    </Button>
                                    <Button
                                        variant="destructive"
                                        size="sm"
                                        onClick={() => handleDelete(blog.id, blog.title)}
                                        disabled={deleting === blog.id}
                                    >
                                        <Trash className="h-4 w-4" />
                                    </Button>
                                </div>
                            </Card>
                        ))
                    )}
                </div>
            )}
        </div>
    );
}
