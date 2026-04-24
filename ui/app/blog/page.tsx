'use client';

import { useCallback, useEffect, useState } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import Link from 'next/link';
import Image from 'next/image';
import { motion } from 'framer-motion';
import { PageIntroCard } from '@/components/page-intro-card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import {
    BookOpen,
    CalendarDays,
    Filter,
    Search,
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

const CARD_COLORS = [
    'bg-[#d8e8c8]',
    'bg-[#e8d0e8]',
    'bg-[#d0d0f0]',
    'bg-[#e8e0c8]',
    'bg-[#d8d8f0]',
    'bg-[#c8e0e0]',
    'bg-[#f0d8d8]',
    'bg-[#d0e8d8]',
];

function getInitials(name: string) {
    return name
        .split(' ')
        .map((n) => n[0])
        .join('')
        .toUpperCase()
        .slice(0, 2);
}

export default function BlogHomePage() {
    const router = useRouter();
    const searchParams = useSearchParams();

    const [blogs, setBlogs] = useState<BlogListItem[]>([]);
    const [categories, setCategories] = useState<BlogCategory[]>([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);

    const [search, setSearch] = useState(searchParams.get('search') || '');
    const [debouncedSearch, setDebouncedSearch] = useState(searchParams.get('search') || '');
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
    const selectedCategory = selectedCategorySlug
        ? categories.find((category) => category.slug === selectedCategorySlug)
        : undefined;
    const isCategoryFilterPending = Boolean(selectedCategorySlug) && categories.length === 0;
    const isCategoryFilterInvalid = Boolean(selectedCategorySlug) && categories.length > 0 && !selectedCategory;

    useEffect(() => {
        blogService.getCategories().then(setCategories).catch(console.error);
    }, []);

    useEffect(() => {
        const timeoutId = window.setTimeout(() => {
            setDebouncedSearch(search);
        }, 300);
        return () => window.clearTimeout(timeoutId);
    }, [search]);

    const updateUrlParams = useCallback(() => {
        const params = new URLSearchParams();
        if (debouncedSearch) params.set('search', debouncedSearch);
        if (selectedCategorySlug) params.set('category', selectedCategorySlug);
        if (selectedAuthor) params.set('author', selectedAuthor);
        if (page > 1) params.set('page', String(page));

        router.replace(params.toString() ? `?${params}` : '/blog', { scroll: false });
    }, [debouncedSearch, page, router, selectedAuthor, selectedCategorySlug]);

    const loadBlogs = useCallback(async () => {
        if (isCategoryFilterPending) return;

        if (isCategoryFilterInvalid) {
            setBlogs([]);
            setError(null);
            setLoading(false);
            return;
        }

        try {
            setLoading(true);
            setError(null);

            const data = await blogService.getBlogs({
                search: debouncedSearch || undefined,
                authorUsername: selectedAuthor,
                categoryId: selectedCategory?.id,
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
    }, [
        isCategoryFilterInvalid,
        isCategoryFilterPending,
        debouncedSearch,
        page,
        selectedAuthor,
        selectedCategory?.id,
    ]);

    useEffect(() => {
        updateUrlParams();
    }, [updateUrlParams]);

    useEffect(() => {
        void loadBlogs();
    }, [loadBlogs]);

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
            month: 'short',
            day: 'numeric',
        });
    };

    return (
        <div className="flex min-h-screen flex-col bg-background/50">
            <div className="fixed inset-0 z-[-1] pointer-events-none">
                <div className="absolute top-[-10%] left-1/2 h-[600px] w-[600px] -translate-x-1/2 rounded-full bg-primary/5 blur-[120px]" />
                <div className="absolute bottom-[-10%] left-[-10%] h-[500px] w-[500px] rounded-full bg-blue-500/5 blur-[120px]" />
            </div>

            <main className="flex-1 px-4 pb-14 pt-20 md:pb-16 md:pt-0">
                <div className="container mx-auto max-w-7xl">
                    <PageIntroCard
                        badge="Blogs"
                        badgeIcon={BookOpen}
                        title="Blog"
                        description="Explore my latest articles, tutorials, and insights."
                    />

                    <section className="mt-6 rounded-[1.5rem] border border-border/60 bg-card/45 p-4 backdrop-blur-lg md:p-5">
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
                                    onChange={(e) => {
                                        setSearch(e.target.value);
                                        setPage(1);
                                    }}
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
                    </section>

                    <section className="mt-6">
                        {error && (
                            <div className="pb-8 text-center text-sm text-destructive">{error}</div>
                        )}

                        {!loading && !error && blogs.length === 0 && (
                            <div className="py-20 text-center text-muted-foreground">No blogs found</div>
                        )}

                        {!loading && blogs.length > 0 && (
                            <div className="grid grid-cols-1 gap-5 sm:grid-cols-2 lg:grid-cols-3">
                                {blogs.map((blog, index) => {
                                    const cardColor = CARD_COLORS[index % CARD_COLORS.length];
                                    const author = blog.authors?.[0];
                                    const authorName = author?.displayName || author?.username || '';

                                    return (
                                        <motion.div
                                            key={blog.id}
                                            initial={{ opacity: 0, y: 14 }}
                                            animate={{ opacity: 1, y: 0 }}
                                            transition={{ duration: 0.3, delay: index * 0.04 }}
                                        >
                                            <article className="group overflow-hidden rounded-2xl border border-border/50 bg-card shadow-sm transition-shadow duration-300 hover:shadow-md">
                                                {/* Banner — 16:9 */}
                                                <Link href={`/blog/${blog.slug}`} className="relative block aspect-video overflow-hidden">
                                                    {blog.featuredImage ? (
                                                        <Image
                                                            src={blog.featuredImage}
                                                            alt={blog.title}
                                                            fill
                                                            sizes="(max-width: 640px) 100vw, (max-width: 1024px) 50vw, 33vw"
                                                            className="object-cover object-center transition-transform duration-500 group-hover:scale-105"
                                                            loading={index === 0 ? 'eager' : 'lazy'}
                                                            priority={index === 0}
                                                        />
                                                    ) : (
                                                        <div className={`flex h-full w-full items-end ${cardColor}`} />
                                                    )}

                                                    {/* Title + category overlay */}
                                                    <div className="absolute inset-0 flex flex-col justify-between bg-gradient-to-r from-black/50 via-black/20 to-transparent p-5">
                                                        <h3 className="max-w-[65%] text-lg font-bold leading-snug tracking-tight text-white drop-shadow line-clamp-3">
                                                            {blog.title}
                                                        </h3>
                                                        {blog.category && (
                                                            <Badge
                                                                variant="outline"
                                                                className="w-fit rounded-full border-white/30 bg-black/30 text-xs text-white backdrop-blur-sm"
                                                            >
                                                                #{blog.category.name}
                                                            </Badge>
                                                        )}
                                                    </div>

                                                    {/* Author overlay bottom-right */}
                                                    {author && (
                                                        <button
                                                            onClick={(e) => {
                                                                e.preventDefault();
                                                                handleAuthorClick(author.userId, author.username);
                                                            }}
                                                            className="absolute bottom-3 right-4 text-right"
                                                        >
                                                            <p className="text-xs font-semibold text-white drop-shadow">
                                                                {authorName}
                                                            </p>
                                                        </button>
                                                    )}
                                                </Link>

                                                {/* Card body — no repeated title */}
                                                <div className="p-5">
                                                    <p className="mb-3 flex items-center gap-1.5 text-xs text-muted-foreground">
                                                        <CalendarDays className="h-3.5 w-3.5" />
                                                        {formatDate(blog.publishedAt, blog.createdAt)}
                                                    </p>

                                                    <p className="line-clamp-2 text-sm leading-relaxed text-muted-foreground">
                                                        {blog.excerpt ||
                                                            'Read this article for implementation notes, product thinking, and practical engineering context.'}
                                                    </p>

                                                    <Link
                                                        href={`/blog/${blog.slug}`}
                                                        className="mt-4 inline-flex items-center gap-1 text-sm font-medium text-primary hover:gap-2 transition-all"
                                                    >
                                                        Read more →
                                                    </Link>
                                                </div>
                                            </article>
                                        </motion.div>
                                    );
                                })}
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
                    </section>
                </div>
            </main>

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
