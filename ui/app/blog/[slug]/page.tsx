'use client';

import { useEffect, useState } from 'react';
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
    User, 
    Clock,
    BookOpen,
    Users
} from 'lucide-react';
import { blogService } from '@/lib/api/blog.service';
import { BlogDetail } from '@/lib/api/blog.types';
import { ApiError } from '@/lib/api/types';

export default function BlogViewPage() {
    const params = useParams();
    const router = useRouter();
    const slug = params.slug as string;

    const [blog, setBlog] = useState<BlogDetail | null>(null);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);

    useEffect(() => {
        if (slug) {
            loadBlog();
        }
    }, [slug]);

    const loadBlog = async () => {
        try {
            setLoading(true);
            setError(null);
            const data = await blogService.getBlogBySlug(slug);
            setBlog(data);
        } catch (err) {
            if (err instanceof ApiError) {
                setError(err.problemDetails.detail || err.problemDetails.title);
            } else {
                setError('Failed to load blog post');
            }
            console.error('Error loading blog:', err);
        } finally {
            setLoading(false);
        }
    };

    const formatDate = (dateString: string | null) => {
        if (!dateString) return 'Not published';
        return new Date(dateString).toLocaleDateString('en-US', {
            year: 'numeric',
            month: 'long',
            day: 'numeric'
        });
    };

    const estimateReadingTime = (content: string): number => {
        const wordsPerMinute = 200;
        const text = content.replace(/<[^>]*>/g, '');
        const wordCount = text.split(/\s+/).length;
        return Math.ceil(wordCount / wordsPerMinute);
    };

    if (loading) {
        return (
            <div className="flex flex-col min-h-screen pt-20">
                <div className="container mx-auto max-w-4xl px-4 py-8">
                    <Skeleton className="h-8 w-32 mb-8" />
                    <Skeleton className="h-12 w-3/4 mb-4" />
                    <Skeleton className="h-6 w-1/2 mb-8" />
                    <Skeleton className="aspect-[16/9] w-full rounded-xl mb-8" />
                    <div className="space-y-4">
                        <Skeleton className="h-4 w-full" />
                        <Skeleton className="h-4 w-full" />
                        <Skeleton className="h-4 w-3/4" />
                    </div>
                </div>
            </div>
        );
    }

    if (error || !blog) {
        return (
            <div className="flex flex-col min-h-screen pt-20">
                <div className="container mx-auto max-w-4xl px-4 py-20">
                    <div className="text-center">
                        <div className="inline-flex items-center justify-center w-16 h-16 rounded-full bg-destructive/10 mb-4">
                            <BookOpen className="h-8 w-8 text-destructive" />
                        </div>
                        <h1 className="text-2xl font-bold mb-2">Blog Post Not Found</h1>
                        <p className="text-muted-foreground mb-6">
                            {error || 'The blog post you\'re looking for doesn\'t exist or has been removed.'}
                        </p>
                        <div className="flex gap-4 justify-center">
                            <Button onClick={() => router.back()} variant="outline">
                                <ArrowLeft className="mr-2 h-4 w-4" />
                                Go Back
                            </Button>
                            <Button asChild>
                                <Link href="/blog/page">View All Blogs</Link>
                            </Button>
                        </div>
                    </div>
                </div>
            </div>
        );
    }

    return (
        <div className="flex flex-col min-h-screen pt-20">
            {/* Back Button */}
            <div className="container mx-auto max-w-4xl px-4 py-6">
                <Button variant="ghost" size="sm" asChild>
                    <Link href="/blog/page">
                        <ArrowLeft className="mr-2 h-4 w-4" />
                        Back to Blog
                    </Link>
                </Button>
            </div>

            {/* Article Header */}
            <article className="container mx-auto max-w-4xl px-4 pb-16">
                {/* Category Badge */}
                {blog.category && (
                    <Badge variant="secondary" className="mb-4">
                        {blog.category.name}
                    </Badge>
                )}

                {/* Title */}
                <h1 className="text-4xl md:text-5xl lg:text-6xl font-bold tracking-tight mb-6">
                    {blog.title}
                </h1>

                {/* Excerpt */}
                {blog.excerpt && (
                    <p className="text-xl text-muted-foreground mb-8">
                        {blog.excerpt}
                    </p>
                )}

                {/* Meta Information */}
                <div className="flex flex-wrap items-center gap-6 text-sm text-muted-foreground mb-8">
                    <div className="flex items-center gap-2">
                        <Calendar className="h-4 w-4" />
                        <span>{formatDate(blog.publishedAt)}</span>
                    </div>
                    
                    {blog.authors.length > 0 && (
                        <div className="flex items-center gap-2">
                            {blog.authors.length === 1 ? (
                                <>
                                    <User className="h-4 w-4" />
                                    <span>
                                        {blog.authors[0].displayName || blog.authors[0].username}
                                    </span>
                                </>
                            ) : (
                                <>
                                    <Users className="h-4 w-4" />
                                    <span>
                                        {blog.authors.map(a => a.displayName || a.username).join(', ')}
                                    </span>
                                </>
                            )}
                        </div>
                    )}

                    <div className="flex items-center gap-2">
                        <Clock className="h-4 w-4" />
                        <span>{estimateReadingTime(blog.content)} min read</span>
                    </div>
                </div>

                <Separator className="mb-8" />

                {/* Featured Image */}
                {blog.featuredImage && (
                    <div className="relative aspect-[16/9] w-full rounded-xl overflow-hidden mb-12">
                        <Image
                            src={blog.featuredImage}
                            alt={blog.title}
                            fill
                            className="object-cover"
                            priority
                        />
                    </div>
                )}

                {/* Blog Content */}
                <div 
                    className="prose prose-lg dark:prose-invert max-w-none
                        prose-headings:font-bold prose-headings:tracking-tight
                        prose-h1:text-4xl prose-h2:text-3xl prose-h3:text-2xl
                        prose-p:text-foreground/90 prose-p:leading-relaxed
                        prose-a:text-primary prose-a:no-underline hover:prose-a:underline
                        prose-strong:text-foreground prose-strong:font-semibold
                        prose-code:text-primary prose-code:bg-muted prose-code:px-1 prose-code:py-0.5 prose-code:rounded
                        prose-pre:bg-muted prose-pre:border
                        prose-ul:my-6 prose-ol:my-6
                        prose-li:text-foreground/90
                        prose-img:rounded-xl prose-img:shadow-md"
                    dangerouslySetInnerHTML={{ __html: blog.content }}
                />

                {/* Footer */}
                <div className="mt-16 pt-8 border-t">
                    <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
                        {/* Authors */}
                        {blog.authors.length > 0 && (
                            <div className="space-y-2">
                                <p className="text-sm font-medium text-muted-foreground">
                                    Written by
                                </p>
                                <div className="flex flex-wrap gap-2">
                                    {blog.authors.map((author) => (
                                        <Badge key={author.userId} variant="outline">
                                            <User className="mr-1.5 h-3 w-3" />
                                            {author.displayName || author.username}
                                        </Badge>
                                    ))}
                                </div>
                            </div>
                        )}

                        {/* Back to Blog Button */}
                        <Button asChild variant="outline">
                            <Link href="/blog/page">
                                View More Articles
                            </Link>
                        </Button>
                    </div>
                </div>
            </article>
        </div>
    );
}
