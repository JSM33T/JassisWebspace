'use client';

import { useEffect, useState } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import Link from 'next/link';
import Image from 'next/image';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Skeleton } from '@/components/ui/skeleton';
import { Input } from '@/components/ui/input';
import {
    BookOpen,
    ArrowLeft,
    Search,
    Filter,
    X,
    User,
} from 'lucide-react';
import { blogService } from '@/lib/api/blog.service';
import { BlogListItem, BlogCategory } from '@/lib/api/blog.types';
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
    const [page, setPage] = useState(
        parseInt(searchParams.get('page') || '1', 10)
    );

    const pageSize = 12;

    const [authorModalOpen, setAuthorModalOpen] = useState(false);
    const [selectedAuthorData, setSelectedAuthorData] = useState<{
        userId: string;
        username: string;
    } | null>(null);

    const hasActiveFilters = Boolean(search || selectedCategorySlug || selectedAuthor);

    /* -------------------- effects -------------------- */

    useEffect(() => {
        blogService.getCategories().then(setCategories).catch(console.error);
    }, []);

    useEffect(() => {
        if (!categories.length) return;
        updateUrlParams();
        loadBlogs();
    }, [search, selectedCategorySlug, selectedAuthor, page, categories]);

    /* -------------------- helpers -------------------- */

    const updateUrlParams = () => {
        const params = new URLSearchParams();
        if (search) params.set('search', search);
        if (selectedCategorySlug) params.set('category', selectedCategorySlug);
        if (selectedAuthor) params.set('author', selectedAuthor);
        if (page > 1) params.set('page', String(page));

        router.replace(params.toString() ? `?${params}` : '/blog', {
            scroll: false,
        });
    };

    const loadBlogs = async () => {
        try {
            setLoading(true);
            setError(null);

            const categoryId = selectedCategorySlug
                ? categories.find(c => c.slug === selectedCategorySlug)?.id
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
    };

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

    /* -------------------- render -------------------- */

    return (
        <div className="flex flex-col min-h-screen pt-20 bg-gradient-to-b from-background to-muted/20">

            {/* Header */}
            <section className="px-4 py-8 border-b">
                <div className="container max-w-7xl mx-auto flex justify-between items-center">
                    <div>
                        <Badge variant="secondary" className="mb-2">
                            <BookOpen className="mr-2 h-3.5 w-3.5" />
                            Insights & Stories
                        </Badge>
                        <h1 className="text-4xl font-bold">Blog</h1>
                    </div>
                    <Button variant="outline" asChild>
                        <Link href="/">
                            <ArrowLeft className="mr-2 h-4 w-4" />
                            Back to Home
                        </Link>
                    </Button>
                </div>
            </section>

            {/* Filters */}
            <section className="px-4 py-6 bg-muted/30">
                <div className="container max-w-7xl mx-auto">
                    <form
                        onSubmit={e => {
                            e.preventDefault();
                            setPage(1);
                        }}
                        className="flex flex-col md:flex-row gap-4"
                    >
                        <div className="flex-1 relative">
                            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                            <Input
                                value={search}
                                onChange={e => setSearch(e.target.value)}
                                placeholder="Search blogs…"
                                className="pl-10"
                            />
                        </div>

                        <Select
                            value={selectedCategorySlug ?? 'all'}
                            onValueChange={v => {
                                setSelectedCategorySlug(v === 'all' ? undefined : v);
                                setPage(1);
                            }}
                        >
                            <SelectTrigger className="w-full md:w-[200px]">
                                <Filter className="mr-2 h-4 w-4" />
                                <SelectValue placeholder="Category" />
                            </SelectTrigger>
                            <SelectContent>
                                <SelectItem value="all">All Categories</SelectItem>
                                {categories.map(c => (
                                    <SelectItem key={c.id} value={c.slug}>
                                        {c.name}
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

            {/* Grid */}
            <section className="flex-1 px-4 py-12">
                <div className="container max-w-7xl mx-auto">

                    {!loading && !error && blogs.length === 0 && (
                        <div className="text-center py-20 text-muted-foreground">
                            No blogs found
                        </div>
                    )}

                    {!loading && blogs.length > 0 && (
                        <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-8">
                            {blogs.map(blog => (
                                <article key={blog.id} className="border rounded-xl overflow-hidden hover:shadow-lg transition">
                                    <Link href={`/blog/${blog.slug}`}>
                                        <div className="relative aspect-[16/10] bg-muted">
                                            {blog.featuredImage ? (
                                                <Image
                                                    src={blog.featuredImage}
                                                    alt={blog.title}
                                                    fill
                                                    className="object-cover"
                                                />
                                            ) : (
                                                <BookOpen className="m-auto h-12 w-12 text-muted-foreground" />
                                            )}
                                        </div>
                                    </Link>

                                    <div className="p-6 space-y-3">
                                        {blog.category && (
                                            <Badge variant="secondary">{blog.category.name}</Badge>
                                        )}

                                        <h3 className="text-xl font-semibold line-clamp-2">
                                            {blog.title}
                                        </h3>

                                        {blog.authors?.[0] && (
                                            <button
                                                onClick={() =>
                                                    handleAuthorClick(
                                                        blog.authors[0].userId,
                                                        blog.authors[0].username
                                                    )
                                                }
                                                className="flex items-center gap-1 text-sm text-muted-foreground hover:text-primary"
                                            >
                                                <User className="h-3.5 w-3.5" />
                                                {blog.authors[0].displayName || blog.authors[0].username}
                                            </button>
                                        )}
                                    </div>
                                </article>
                            ))}
                        </div>
                    )}

                    {/* Pagination */}
                    {!loading && blogs.length === pageSize && (
                        <div className="flex justify-center gap-4 mt-12">
                            <Button
                                variant="outline"
                                disabled={page === 1}
                                onClick={() => setPage(p => Math.max(1, p - 1))}
                            >
                                Previous
                            </Button>
                            <Button variant="outline" onClick={() => setPage(p => p + 1)}>
                                Next
                            </Button>
                        </div>
                    )}
                </div>
            </section>

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
