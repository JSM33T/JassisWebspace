'use client';

import { useCallback, useEffect, useState } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import Link from 'next/link';
import Image from 'next/image';
import { motion } from 'framer-motion';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import {
    ArrowLeft,
    ArrowUpRight,
    BookOpen,
    CalendarDays,
    Filter,
    Heart,
    MessageSquare,
    Search,
    User,
    X,
} from 'lucide-react';
import { blogService } from '@/lib/api/blog.service';
import { BlogCategory, BlogListItem } from '@/lib/api/blog.types';
import { ApiError } from '@/lib/api/types';
import {
    Select,
    SelectContent,
    SelectItem,
    SelectTrigger,
    SelectValue,
} from '@/components/ui/select';
import { AuthorModal } from '@/components/blog/AuthorModal';

export default function BlogHomePage() {
    const router = useRouter();
    const searchParams = useSearchParams();

    const [blogs, setBlogs] = useState<BlogListItem[]>([]);
    const [categories, setCategories] = useState<BlogCategory[]>([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);

    const [search, setSearch] = useState(searchParams.get('search') || '');
    const [selectedCategorySlug, setSelectedCategorySlug] = useState<string | undefined>(
        searchParams.get('category') || undefined
    );
    const [selectedAuthor, setSelectedAuthor] = useState<string | undefined>(
        searchParams.get('author') || undefined
    );
    const [page, setPage] = useState(parseInt(searchParams.get('page') || '1', 10));

    const pageSize = 12;

    const [authorModalOpen, setAuthorModalOpen] = useState(false);
    const [selectedAuthorData, setSelectedAuthorData] = useState<{
        userId: string;
        username: string;
    } | null>(null);

    const hasActiveFilters = Boolean(search || selectedCategorySlug || selectedAuthor);

    useEffect(() => {
        blogService.getCategories().then(setCategories).catch(console.error);
    }, []);

    const updateUrlParams = useCallback(() => {
        const params = new URLSearchParams();
        if (search) params.set('search', search);
        if (selectedCategorySlug) params.set('category', selectedCategorySlug);
        if (selectedAuthor) params.set('author', selectedAuthor);
        if (page > 1) params.set('page', String(page));

        router.replace(params.toString() ? `?${params}` : '/blog', {
            scroll: false,
        });
    }, [page, router, search, selectedAuthor, selectedCategorySlug]);

    const loadBlogs = useCallback(async () => {
        try {
            setLoading(true);
            setError(null);

            const categoryId = selectedCategorySlug
                ? categories.find((c) => c.slug === selectedCategorySlug)?.id
                : undefined;

            const data = await blogService.getBlogs({
                search: search || undefined,
                authorUsername: selectedAuthor,
                categoryId,
                page,
                pageSize,
            });

            setBlogs(data);
        } catch (err) {
            if (err instanceof ApiError) {
                setError(err.problemDetails.detail || err.problemDetails.title);
            } else {
                setError('Failed to load blogs');
            }
        } finally {
            setLoading(false);
        }
    }, [categories, page, search, selectedAuthor, selectedCategorySlug]);

    useEffect(() => {
        if (!categories.length) return;
        updateUrlParams();
        loadBlogs();
    }, [categories.length, loadBlogs, updateUrlParams]);

    const clearFilters = () => {
        setSearch('');
        setSelectedCategorySlug(undefined);
        setSelectedAuthor(undefined);
        setPage(1);
    };

    const handleAuthorClick = (userId: string, username: string) => {
        setSelectedAuthorData({ userId, username });
        setAuthorModalOpen(true);
    };

    const formatDate = (publishedAt: string | null, createdAt: string) => {
        const sourceDate = publishedAt || createdAt;
        return new Date(sourceDate).toLocaleDateString('en-US', {
            year: 'numeric',
            month: 'long',
            day: 'numeric',
        });
    };

    return (
        <div className="flex min-h-screen flex-col bg-background/50">
            <div className="fixed inset-0 z-[-1] pointer-events-none">
                <div className="absolute top-[-10%] left-1/2 h-[600px] w-[600px] -translate-x-1/2 rounded-full bg-primary/5 blur-[120px]" />
                <div className="absolute bottom-[-10%] left-[-10%] h-[500px] w-[500px] rounded-full bg-blue-500/5 blur-[120px]" />
            </div>

            <section className="border-b bg-muted/30 px-4 py-8 backdrop-blur-sm md:py-12">
                <div className="container mx-auto max-w-7xl pt-16">
                    <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
                        <div className="space-y-3">
                            <Badge
                                variant="secondary"
                                className="w-fit gap-2 rounded-full border-border/50 bg-background/50 px-4 py-1.5 text-sm font-normal backdrop-blur-sm"
                            >
                                <BookOpen className="h-3.5 w-3.5 text-primary" />
                                <span>Insights & Stories</span>
                            </Badge>
                            <h1 className="text-4xl font-bold tracking-tight md:text-5xl">Blog</h1>
                            <p className="max-w-2xl text-lg text-muted-foreground">
                                Explore our latest articles, tutorials, and insights.
                            </p>
                        </div>
                        <Button variant="ghost" asChild className="rounded-full px-6">
                            <Link href="/">
                                <ArrowLeft className="mr-2 h-4 w-4" />
                                Back
                            </Link>
                        </Button>
                    </div>
                </div>
            </section>

            <section className="bg-muted/30 px-4 py-6">
                <div className="container mx-auto max-w-7xl">
                    <form
                        onSubmit={(e) => {
                            e.preventDefault();
                            setPage(1);
                        }}
                        className="flex flex-col gap-4 md:flex-row"
                    >
                        <div className="relative flex-1">
                            <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
                            <Input
                                value={search}
                                onChange={(e) => setSearch(e.target.value)}
                                placeholder="Search blogs..."
                                className="pl-10"
                            />
                        </div>

                        <Select
                            value={selectedCategorySlug ?? 'all'}
                            onValueChange={(value) => {
                                setSelectedCategorySlug(value === 'all' ? undefined : value);
                                setPage(1);
                            }}
                        >
                            <SelectTrigger className="w-full md:w-[210px]">
                                <Filter className="mr-2 h-4 w-4" />
                                <SelectValue placeholder="Category" />
                            </SelectTrigger>
                            <SelectContent>
                                <SelectItem value="all">All Categories</SelectItem>
                                {categories.map((category) => (
                                    <SelectItem key={category.id} value={category.slug}>
                                        {category.name}
                                    </SelectItem>
                                ))}
                            </SelectContent>
                        </Select>

                        {hasActiveFilters && (
                            <Button type="button" variant="outline" onClick={clearFilters}>
                                <X className="mr-2 h-4 w-4" />
                                Clear
                            </Button>
                        )}
                    </form>
                </div>
            </section>

            <section className="flex-1 px-4 py-12">
                <div className="container mx-auto max-w-7xl">
                    {error && (
                        <div className="pb-8 text-center text-sm text-destructive">{error}</div>
                    )}

                    {!loading && !error && blogs.length === 0 && (
                        <div className="py-20 text-center text-muted-foreground">No blogs found</div>
                    )}

                    {!loading && blogs.length > 0 && (
                        <div className="grid grid-cols-1 gap-5 lg:grid-cols-2">
                            {blogs.map((blog, index) => (
                                <motion.div
                                    key={blog.id}
                                    initial={{ opacity: 0, y: 14 }}
                                    animate={{ opacity: 1, y: 0 }}
                                    transition={{ duration: 0.3, delay: index * 0.05 }}
                                    className="h-full"
                                >
                                    <article className="group h-full overflow-hidden rounded-3xl border bg-card/55 backdrop-blur-sm transition-all duration-300 hover:bg-card/75 hover:shadow-lg">
                                        <div className="grid h-full grid-cols-1 md:h-[240px] md:grid-cols-[52%_48%]">
                                            <Link
                                                href={`/blog/${blog.slug}`}
                                                className="relative block h-full min-h-[210px] overflow-hidden bg-muted md:min-h-0"
                                            >
                                                {blog.featuredImage ? (
                                                    <Image
                                                        src={blog.featuredImage}
                                                        alt={blog.title}
                                                        fill
                                                        className="object-cover object-center transition-transform duration-500 group-hover:scale-105"
                                                        unoptimized
                                                    />
                                                ) : (
                                                    <div className="flex h-full items-center justify-center">
                                                        <div className="rounded-2xl border bg-background/60 p-4">
                                                            <BookOpen className="h-8 w-8 text-primary/80" />
                                                        </div>
                                                    </div>
                                                )}
                                                <span className="absolute bottom-4 right-4 inline-flex h-12 w-12 items-center justify-center rounded-full border border-white/20 bg-background/95 text-foreground shadow-lg">
                                                    <ArrowUpRight className="h-5 w-5" />
                                                </span>
                                            </Link>

                                            <div className="flex h-full flex-col p-5 md:p-5">
                                                <div className="mb-3 flex flex-wrap items-center gap-3 text-sm text-muted-foreground">
                                                    <span className="inline-flex items-center gap-1.5">
                                                        <CalendarDays className="h-4 w-4" />
                                                        {formatDate(blog.publishedAt, blog.createdAt)}
                                                    </span>
                                                    {blog.category && (
                                                        <Badge
                                                            variant="secondary"
                                                            className="rounded-full px-3 py-1"
                                                        >
                                                            {blog.category.name}
                                                        </Badge>
                                                    )}
                                                </div>

                                                <Link href={`/blog/${blog.slug}`} className="block">
                                                    <h3 className="line-clamp-2 text-xl font-semibold leading-tight tracking-tight transition-colors group-hover:text-primary">
                                                        {blog.title}
                                                    </h3>
                                                </Link>

                                                <p className="mt-3 line-clamp-3 text-sm leading-relaxed text-muted-foreground">
                                                    {blog.excerpt ||
                                                        'Read this article for implementation notes, product thinking, and practical engineering context.'}
                                                </p>

                                                <div className="mt-4 flex items-center gap-4 text-sm text-muted-foreground">
                                                    <span className="inline-flex items-center gap-1.5">
                                                        <Heart className="h-4 w-4" />
                                                        {blog.likeCount}
                                                    </span>
                                                    <span className="inline-flex items-center gap-1.5">
                                                        <MessageSquare className="h-4 w-4" />
                                                        {blog.commentCount}
                                                    </span>
                                                </div>

                                                {blog.authors?.[0] && (
                                                    <button
                                                        onClick={() =>
                                                            handleAuthorClick(
                                                                blog.authors[0].userId,
                                                                blog.authors[0].username
                                                            )
                                                        }
                                                        className="mt-auto flex w-fit items-center gap-2 pt-4 text-sm text-muted-foreground transition-colors hover:text-primary"
                                                    >
                                                        <span className="rounded-full border bg-background/60 p-1.5">
                                                            <User className="h-3.5 w-3.5" />
                                                        </span>
                                                        {blog.authors[0].displayName ||
                                                            blog.authors[0].username}
                                                    </button>
                                                )}
                                            </div>
                                        </div>
                                    </article>
                                </motion.div>
                            ))}
                        </div>
                    )}

                    {!loading && blogs.length === pageSize && (
                        <div className="mt-12 flex justify-center gap-4">
                            <Button
                                variant="outline"
                                disabled={page === 1}
                                onClick={() => setPage((prev) => Math.max(1, prev - 1))}
                            >
                                Previous
                            </Button>
                            <Button variant="outline" onClick={() => setPage((prev) => prev + 1)}>
                                Next
                            </Button>
                        </div>
                    )}
                </div>
            </section>

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
