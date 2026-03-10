"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { useParams } from "next/navigation";
import { ArrowLeft, ShieldAlert } from "lucide-react";
import { BlogForm } from "@/components/admin/blog-form";
import { blogService } from "@/lib/api/blog.service";
import { BlogDetail } from "@/lib/api/blog.types";
import { ApiError } from "@/lib/api/types";
import { useUser } from "@/contexts/UserContext";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";

export default function EditAssignedBlogPage() {
    const { slug } = useParams<{ slug: string }>();
    const { user, isAuthenticated, isInitialized } = useUser();

    const [blog, setBlog] = useState<BlogDetail | null>(null);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);
    const [forbidden, setForbidden] = useState(false);

    useEffect(() => {
        if (!slug || !isInitialized) return;

        const loadBlog = async () => {
            if (!isAuthenticated || !user?.id) {
                setLoading(false);
                return;
            }

            try {
                setLoading(true);
                setForbidden(false);
                setError(null);

                const data = await blogService.getBlogBySlug(slug);
                const canEdit =
                    user.role === "admin" ||
                    data.authors.some((author) => author.userId === user.id);

                if (!canEdit) {
                    setBlog(null);
                    setForbidden(true);
                    return;
                }

                setBlog(data);
            } catch (err) {
                setBlog(null);
                if (err instanceof ApiError) {
                    setError(err.problemDetails.detail || err.problemDetails.title);
                } else {
                    setError("Failed to load blog post");
                }
            } finally {
                setLoading(false);
            }
        };

        loadBlog();
    }, [slug, isInitialized, isAuthenticated, user?.id, user?.role]);

    if (loading || !isInitialized) {
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

    if (!isAuthenticated || !user?.id) {
        return (
            <div className="container max-w-3xl mx-auto pt-24 px-4 text-center space-y-4">
                <h1 className="text-2xl font-bold">Sign in required</h1>
                <p className="text-muted-foreground">
                    You need to sign in with an assigned author or admin account to edit this blog.
                </p>
                <div className="flex justify-center gap-2">
                    <Button variant="outline" asChild>
                        <Link href={`/blog/${encodeURIComponent(slug)}`}>
                            <ArrowLeft className="mr-2 h-4 w-4" />
                            Back to Blog
                        </Link>
                    </Button>
                    <Button asChild>
                        <Link href={`/login?redirect=${encodeURIComponent(`/blog/${slug}/edit`)}`}>Sign In</Link>
                    </Button>
                </div>
            </div>
        );
    }

    if (forbidden) {
        return (
            <div className="container max-w-3xl mx-auto pt-24 px-4 text-center space-y-4">
                <ShieldAlert className="mx-auto h-10 w-10 text-destructive" />
                <h1 className="text-2xl font-bold">Access denied</h1>
                <p className="text-muted-foreground">
                    Only assigned authors and admins can edit this blog.
                </p>
                <Button variant="outline" asChild>
                    <Link href={`/blog/${encodeURIComponent(slug)}`}>
                        <ArrowLeft className="mr-2 h-4 w-4" />
                        Back to Blog
                    </Link>
                </Button>
            </div>
        );
    }

    if (!blog || error) {
        return (
            <div className="container max-w-3xl mx-auto pt-24 px-4 text-center space-y-4">
                <h1 className="text-2xl font-bold">Blog not found</h1>
                <p className="text-muted-foreground">{error || "The blog post could not be loaded."}</p>
                <Button variant="outline" asChild>
                    <Link href="/blog">
                        <ArrowLeft className="mr-2 h-4 w-4" />
                        Back to Blog
                    </Link>
                </Button>
            </div>
        );
    }

    return (
        <div className="p-8 pt-24 max-w-5xl mx-auto">
            <div className="mb-8">
                <div className="flex flex-wrap items-center justify-between gap-3">
                    <h2 className="text-3xl font-bold tracking-tight">Edit Post</h2>
                    <Button variant="outline" asChild>
                        <Link href={`/blog/${blog.slug}`}>
                            <ArrowLeft className="mr-2 h-4 w-4" />
                            Back to Blog
                        </Link>
                    </Button>
                </div>
                <p className="text-muted-foreground mt-2">Update content for &quot;{blog.title}&quot;</p>
            </div>
            <BlogForm
                initialData={blog}
                allowCategoryManagement={false}
                allowAuthorSelection={false}
            />
        </div>
    );
}
