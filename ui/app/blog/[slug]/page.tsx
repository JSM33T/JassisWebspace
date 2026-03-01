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
    Calendar,
    Clock,
    BookOpen,
    Users,
    MessageSquare,
} from 'lucide-react';

import { MarkdownRenderer } from '@/components/blog/MarkdownRenderer';
import { CommentSection } from '@/components/comments/CommentSection';
import { blogService } from '@/lib/api/blog.service';
import { BlogDetail } from '@/lib/api/blog.types';
import { ApiError } from '@/lib/api/types';
import { adminBlogService } from '@/lib/api/admin-blog.service';
import { AuthorModal } from '@/components/blog/AuthorModal';
import { LikeButton } from '@/components/likes/LikeButton';
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

    const tryLoadAdminBlogBySlug = useCallback(async () => {
        try {
            const adminBlogs = await adminBlogService.getBlogs({ page: 1, pageSize: 250 });
            const match = adminBlogs.find((item) => item.slug === slug);
            if (!match) return null;
            return await adminBlogService.getBlog(match.id);
        } catch (adminError) {
            console.error('Admin fallback blog load failed:', adminError);
            return null;
        }
    }, [slug]);

    const loadBlog = useCallback(async (allowAdminFallback: boolean) => {
        try {
            setLoading(true);
            setError(null);
            const publishedBlog = await blogService.getBlogBySlug(slug);
            setBlog(publishedBlog);
        } catch (err) {
            if (allowAdminFallback && err instanceof ApiError && err.isNotFound()) {
                const adminBlog = await tryLoadAdminBlogBySlug();
                if (adminBlog) {
                    setBlog(adminBlog);
                    setError(null);
                    return;
                }
            }

            setBlog(null);
            if (err instanceof ApiError) {
                setError(err.problemDetails.detail || err.problemDetails.title);
            } else {
                setError('Failed to load blog post');
            }
        } finally {
            setLoading(false);
        }
    }, [slug, tryLoadAdminBlogBySlug]);

    useEffect(() => {
        if (!slug || !isInitialized) return;
        loadBlog(user?.role === 'admin');
    }, [slug, isInitialized, user?.role, loadBlog]);

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
        <div className="pt-32">
            <div className="container max-w-4xl mx-auto px-4 pt-4 mb-12">

                {/* Back */}
                <Button variant="ghost" size="sm" asChild className="mb-6">
                    <Link href="/blog">
                        <ArrowLeft className="mr-2 h-4 w-4" />
                        Back to Blog
                    </Link>
                </Button>

                {blog.category && (
                    <Badge variant="secondary" className="mb-4">
                        {blog.category.name}
                    </Badge>
                )}
                {!blog.isPublished && (
                    <Badge variant="outline" className="mb-4 ml-2 border-amber-500/40 text-amber-600">
                        Draft (Admin Preview)
                    </Badge>
                )}

                <h1 className="text-4xl md:text-5xl font-bold mb-6">{blog.title}</h1>

                {blog.excerpt && (
                    <p className="text-xl text-muted-foreground mb-8">{blog.excerpt}</p>
                )}

                {/* Meta */}
                <div className="flex flex-wrap gap-6 text-sm text-muted-foreground mb-8">
                    <span className="flex items-center gap-2">
                        <Calendar className="h-4 w-4" />
                        {formatDate(blog.publishedAt)}
                    </span>

                    {blog.authors.length > 0 && (
                        <span className="flex items-center gap-2">
                            <Users className="h-4 w-4" />
                            {blog.authors.map((a, i) => (
                                <span key={a.userId}>
                                    <button
                                        onClick={() => openAuthor(a.userId, a.username)}
                                        className="underline hover:text-primary"
                                    >
                                        {a.displayName || a.username}
                                    </button>
                                    {i < blog.authors.length - 1 && ', '}
                                </span>
                            ))}
                        </span>
                    )}

                    <span className="flex items-center gap-2">
                        <Clock className="h-4 w-4" />
                        {estimateReadingTime(blog.content)} min read
                    </span>

                    <span className="flex items-center gap-2">
                        <LikeButton
                            contentId={blog.contentId}
                            initialCount={blog.likeCount}
                            initialLiked={blog.isLiked}
                        />
                    </span>
                    <span className="flex items-center gap-2 text-muted-foreground">
                        <MessageSquare className="h-4 w-4" />
                        <span>{blog.commentCount}</span>
                    </span>
                </div>

                <Separator className="mb-8" />

                {blog.featuredImage && (
                    <div className="relative aspect-[16/9] rounded-xl overflow-hidden mb-12">
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

                {/* Content */}
                <MarkdownRenderer content={blog.content} />

                <div className="mt-12">
                    <CommentSection contentId={blog.contentId} />
                </div>

                {/* Footer */}
                <div className="mt-16 pt-8 border-t flex justify-between items-center">
                    <Button asChild variant="outline">
                        <Link href="/blog">View More Articles</Link>
                    </Button>
                </div>
            </div>

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
