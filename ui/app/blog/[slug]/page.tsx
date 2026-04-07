'use client';

import { useCallback, useEffect, useState } from 'react';
import { useParams, useRouter } from 'next/navigation';
import Link from 'next/link';
import Image from 'next/image';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Skeleton } from '@/components/ui/skeleton';
import { Separator } from '@/components/ui/separator';
import {
    ArrowLeft,
    Pencil,
    Calendar,
    Clock,
    BookOpen,
    Users,
    Heart,
    MessageSquare,
    AlertTriangle,
} from 'lucide-react';

import { MarkdownRenderer } from '@/components/blog/MarkdownRenderer';
import { CommentSection } from '@/components/comments/CommentSection';
import { blogService } from '@/lib/api/blog.service';
import { BlogDetail } from '@/lib/api/blog.types';
import { ApiError } from '@/lib/api/types';
import { AuthorModal } from '@/components/blog/AuthorModal';
import { LikeButton } from '@/components/likes/LikeButton';
import { PageIntroCard } from '@/components/page-intro-card';
import { useUser } from '@/contexts/UserContext';

export default function BlogViewPage() {
    const { slug } = useParams<{ slug: string }>();
    const router = useRouter();
    const { user, isInitialized } = useUser();

    const [blog, setBlog] = useState<BlogDetail | null>(null);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);

    const [authorModalOpen, setAuthorModalOpen] = useState(false);
    const [selectedAuthorData, setSelectedAuthorData] = useState<{
        userId: string;
        username: string;
    } | null>(null);

    const loadBlog = useCallback(async () => {
        try {
            setLoading(true);
            setError(null);
            const publishedBlog = await blogService.getBlogBySlug(slug);
            setBlog(publishedBlog);
        } catch (err) {
            setBlog(null);
            if (err instanceof ApiError) {
                setError(err.problemDetails.detail || err.problemDetails.title);
            } else {
                setError('Failed to load blog post');
            }
        } finally {
            setLoading(false);
        }
    }, [slug]);

    useEffect(() => {
        if (!slug || !isInitialized) return;
        loadBlog();
    }, [slug, isInitialized, loadBlog]);

    const formatDate = (date: string | null) =>
        date
            ? new Date(date).toLocaleDateString('en-US', {
                year: 'numeric',
                month: 'long',
                day: 'numeric',
            })
            : 'Not published';

    const estimateReadingTime = (html: string) => {
        const words = html.replace(/<[^>]*>/g, '').split(/\s+/).length;
        return Math.max(1, Math.ceil(words / 200));
    };

    const openAuthor = (userId: string, username: string) => {
        setSelectedAuthorData({ userId, username });
        setAuthorModalOpen(true);
    };

    const isInteractivityDisabled = !blog?.isPublished;
    const canEditBlog =
        !!blog &&
        (
            user?.role === "admin" ||
            (!!user?.id && blog.authors.some((author) => author.userId === user.id))
        );

    /* ---------------- loading ---------------- */

    if (loading) {
        return (
            <div className="container max-w-4xl mx-auto pt-24 px-4 space-y-4">
                <Skeleton className="h-10 w-3/4" />
                <Skeleton className="h-6 w-1/2" />
                <Skeleton className="aspect-[16/9]" />
                <Skeleton className="h-4 w-full" />
                <Skeleton className="h-4 w-5/6" />
            </div>
        );
    }

    if (!blog || error) {
        return (
            <div className="container max-w-4xl mx-auto pt-24 px-4 text-center">
                <BookOpen className="mx-auto h-10 w-10 text-destructive mb-4" />
                <h1 className="text-2xl font-bold mb-2">Blog Not Found</h1>
                <p className="text-muted-foreground mb-6">{error}</p>
                <div className="flex justify-center gap-4">
                    <Button variant="outline" onClick={() => router.back()}>
                        <ArrowLeft className="mr-2 h-4 w-4" />
                        Go Back
                    </Button>
                    <Button asChild>
                        <Link href="/blog">All Blogs</Link>
                    </Button>
                </div>
            </div>
        );
    }

    /* ---------------- render ---------------- */

    return (
        <div className="flex min-h-screen flex-col bg-background text-foreground">
            <div className="fixed inset-0 z-[-1] pointer-events-none">
                <div className="absolute top-[-10%] left-1/2 h-[600px] w-[600px] -translate-x-1/2 rounded-full bg-primary/5 blur-[120px]" />
                <div className="absolute bottom-[-10%] left-[-10%] h-[500px] w-[500px] rounded-full bg-secondary/8 blur-[120px]" />
            </div>

            <main className="flex-1 px-4 pb-16 pt-2 md:pt-4">
                <div className="container mx-auto max-w-6xl">
                    <PageIntroCard
                        title={blog.title}
                        topContent={
                            <div className="flex flex-wrap items-center gap-3 text-sm text-muted-foreground">
                                <div className="inline-flex items-center gap-2 rounded-full border border-border/50 bg-background/55 px-3 py-1.5 backdrop-blur-sm">
                                    <Calendar className="h-4 w-4" />
                                    <span>{formatDate(blog.publishedAt)}</span>
                                </div>
                                {blog.authors.length > 0 && (
                                    <div className="inline-flex flex-wrap items-center gap-2 rounded-full border border-border/50 bg-background/55 px-3 py-1.5 backdrop-blur-sm">
                                        <Users className="h-4 w-4" />
                                        <span className="flex flex-wrap items-center gap-1">
                                            {blog.authors.map((a, i) => (
                                                <span key={a.userId}>
                                                    <button
                                                        onClick={() => openAuthor(a.userId, a.username)}
                                                        className="underline underline-offset-4 transition-colors hover:text-primary"
                                                    >
                                                        {a.displayName || a.username}
                                                    </button>
                                                    {i < blog.authors.length - 1 && ', '}
                                                </span>
                                            ))}
                                        </span>
                                    </div>
                                )}
                            </div>
                        }
                        showBackButton
                        backHref="/blog"
                        backLabel="Back to Blog"
                        className="px-6 py-7 sm:px-10 sm:py-9 md:px-12 md:py-11"
                    >
                        <div className="flex flex-wrap items-center gap-3 text-sm text-muted-foreground">
                            {blog.category && (
                                <Badge
                                    variant="secondary"
                                    className="rounded-full border border-border/50 bg-background/55 px-3 py-1.5 backdrop-blur-sm"
                                >
                                    {blog.category.name}
                                </Badge>
                            )}
                            {!blog.isPublished && (
                                <Badge
                                    variant="outline"
                                    className="rounded-full border-amber-500/40 bg-amber-500/10 px-3 py-1.5 text-amber-600"
                                >
                                    Draft (Unpublished)
                                </Badge>
                            )}
                            <div className="inline-flex items-center gap-2 rounded-full border border-border/50 bg-background/55 px-3 py-1.5 backdrop-blur-sm">
                                <Clock className="h-4 w-4" />
                                <span>{estimateReadingTime(blog.content)} min read</span>
                            </div>
                            {isInteractivityDisabled ? (
                                <div
                                    className="inline-flex items-center gap-2 rounded-full border border-border/50 bg-background/55 px-3 py-1.5 text-muted-foreground/70 backdrop-blur-sm"
                                    title="Interactivity is disabled because this blog is unpublished."
                                >
                                    <Heart className="h-4 w-4" />
                                    <span>{blog.likeCount}</span>
                                    <span className="text-xs uppercase tracking-wide">Likes disabled</span>
                                </div>
                            ) : (
                                <div className="inline-flex items-center rounded-full border border-border/50 bg-background/55 px-1 py-1 backdrop-blur-sm">
                                    <LikeButton
                                        contentId={blog.contentId}
                                        initialCount={blog.likeCount}
                                        initialLiked={blog.isLiked}
                                    />
                                </div>
                            )}
                            <div className="inline-flex items-center gap-2 rounded-full border border-border/50 bg-background/55 px-3 py-1.5 backdrop-blur-sm">
                                <MessageSquare className="h-4 w-4" />
                                <span>{blog.commentCount}</span>
                            </div>
                            {canEditBlog && (
                                <Button variant="outline" size="sm" asChild className="rounded-full">
                                    <Link href={`/blog/${blog.slug}/edit`}>
                                        <Pencil className="mr-2 h-4 w-4" />
                                        Edit Post
                                    </Link>
                                </Button>
                            )}
                        </div>
                    </PageIntroCard>
                </div>

                <div className="container mx-auto mt-6 max-w-4xl">
                    <div>
                        <Separator className="mb-8" />

                        {blog.featuredImage && (
                            <div className="relative mb-12 aspect-[16/9] overflow-hidden rounded-xl">
                                <Image
                                    src={blog.featuredImage}
                                    alt={blog.title}
                                    fill
                                    className="object-cover"
                                    priority
                                    unoptimized
                                />
                            </div>
                        )}

                        <MarkdownRenderer content={blog.content} />

                        <div className="mt-12">
                            {isInteractivityDisabled ? (
                                <div className="rounded-xl border border-amber-500/40 bg-amber-500/10 px-4 py-3 text-sm text-amber-700">
                                    <p className="flex items-center gap-2 font-semibold">
                                        <AlertTriangle className="h-4 w-4" />
                                        Interactivity is disabled
                                    </p>
                                    <p className="mt-1">
                                        Likes and comments are disabled because this blog is unpublished.
                                    </p>
                                </div>
                            ) : (
                                <CommentSection contentId={blog.contentId} />
                            )}
                        </div>

                        <div className="mt-16 flex items-center justify-between border-t pt-8">
                            <Button asChild variant="outline">
                                <Link href="/blog">View More Articles</Link>
                            </Button>
                        </div>
                    </div>
                </div>
            </main>

            {/* Author Modal */}
            {selectedAuthorData && (
                <AuthorModal
                    isOpen={authorModalOpen}
                    onClose={() => setAuthorModalOpen(false)}
                    userId={selectedAuthorData.userId}
                    username={selectedAuthorData.username}
                />
            )}
        </div>
    );
}
