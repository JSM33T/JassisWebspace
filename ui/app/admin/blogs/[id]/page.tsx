"use client";

import { useEffect, useState } from "react";
import { useParams } from "next/navigation";
import { BlogForm } from "@/components/admin/blog-form";
import { adminBlogService } from "@/lib/api/admin-blog.service";
import { BlogDetail } from "@/lib/api/blog.types";
import { Skeleton } from "@/components/ui/skeleton";

export default function EditBlogPage() {
    const params = useParams();
    const [blog, setBlog] = useState<BlogDetail | null>(null);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        const loadBlog = async () => {
            if (!params.id) return;
            try {
                setLoading(true);
                const data = await adminBlogService.getBlog(params.id as string);
                setBlog(data);
            } catch (error) {
                console.error("Failed to load blog", error);
            } finally {
                setLoading(false);
            }
        };
        loadBlog();
    }, [params.id]);

    if (loading) {
        return (
            <div className="p-8 pt-24 max-w-5xl mx-auto space-y-8">
                <div className="space-y-2">
                    <Skeleton className="h-10 w-1/3" />
                    <Skeleton className="h-4 w-1/4" />
                </div>
                <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
                    <div className="md:col-span-2 space-y-8">
                        <Skeleton className="h-12 w-full" />
                        <Skeleton className="h-[400px] w-full" />
                    </div>
                    <div className="space-y-8">
                        <Skeleton className="h-64 w-full" />
                    </div>
                </div>
            </div>
        );
    }

    if (!blog) {
        return (
            <div className="p-8 pt-24 text-center">
                <h2 className="text-2xl font-bold">Blog not found</h2>
                <p className="text-muted-foreground">The blog post you are trying to edit does not exist.</p>
            </div>
        );
    }

    return (
        <div className="p-8 pt-24 max-w-5xl mx-auto">
            <div className="mb-8">
                <h2 className="text-3xl font-bold tracking-tight">Edit Post</h2>
                <p className="text-muted-foreground">Update content for "{blog.title}"</p>
            </div>
            <BlogForm initialData={blog} />
        </div>
    );
}
