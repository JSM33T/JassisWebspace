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
    Calendar, 
    User, 
    Search,
    Filter,
    X
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
} from "@/components/ui/select";

export default function BlogHomePage() {
    const router = useRouter();
    const searchParams = useSearchParams();
    
    const [blogs, setBlogs] = useState<BlogListItem[]>([]);
    const [categories, setCategories] = useState<BlogCategory[]>([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);
    
    // Filter states - initialize from URL params
    const [search, setSearch] = useState(searchParams.get('search') || '');
    const [selectedCategorySlug, setSelectedCategorySlug] = useState<string | undefined>(
        searchParams.get('category') || undefined
    );
    const [page, setPage] = useState(
        parseInt(searchParams.get('page') || '1', 10)
    );
    const pageSize = 12;

    useEffect(() => {
        loadCategories();
    }, []);

    useEffect(() => {
        updateUrlParams();
        loadBlogs();
    }, [search, selectedCategorySlug, page]);

    const updateUrlParams = () => {
        const params = new URLSearchParams();
        
        if (search) params.set('search', search);
        if (selectedCategorySlug) params.set('category', selectedCategorySlug);
        if (page > 1) params.set('page', page.toString());
        
        const queryString = params.toString();
        const newUrl = queryString ? `?${queryString}` : '/blog/page';
        
        router.replace(newUrl, { scroll: false });
    };

    const loadCategories = async () => {
        try {
            const data = await blogService.getCategories();
            setCategories(data);
        } catch (err) {
            console.error('Error loading categories:', err);
        }
    };

    const loadBlogs = async () => {
        try {
            setLoading(true);
            setError(null);
            
            // Convert category slug to ID for API call
            const categoryId = selectedCategorySlug 
                ? categories.find(c => c.slug === selectedCategorySlug)?.id 
                : undefined;
            
            const data = await blogService.getBlogs({
                search: search || undefined,
                categoryId: categoryId,
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
            console.error('Error loading blogs:', err);
        } finally {
            setLoading(false);
        }
    };

    const formatDate = (dateString: string | null) => {
        if (!dateString) return 'Not published';
        return new Date(dateString).toLocaleDateString('en-US', {
            year: 'numeric',
            month: 'short',
            day: 'numeric'
        });
    };

    const handleSearchSubmit = (e: React.FormEvent) => {
        e.preventDefault();
        setPage(1);
    };

    const clearFilters = () => {
        setSearch('');
        setSelectedCategorySlug(undefined);
        setPage(1);
    };

    const hasActiveFilters = search || selectedCategorySlug;

    return (
        <div className="flex flex-col min-h-screen pt-20 bg-gradient-to-b from-background to-muted/20">
            {/* Header */}
            <section className="px-4 py-8 md:py-12 border-b">
                <div className="container mx-auto max-w-7xl">
                    <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
                        <div className="space-y-3">
                            <Badge variant="secondary" className="w-fit">
                                <BookOpen className="mr-2 h-3.5 w-3.5" />
                                Insights & Stories
                            </Badge>
                            <h1 className="text-4xl md:text-5xl lg:text-6xl font-bold tracking-tight">
                                Blog
                            </h1>
                            <p className="text-base md:text-lg text-muted-foreground max-w-2xl">
                                Discover articles, tutorials, and stories from our community
                            </p>
                        </div>
                        <Button variant="outline" size="lg" asChild className="w-fit">
                            <Link href="/">
                                <ArrowLeft className="mr-2 h-4 w-4" />
                                Back to Home
                            </Link>
                        </Button>
                    </div>
                </div>
            </section>

            {/* Filters */}
            <section className="px-4 py-6 bg-muted/30">
                <div className="container mx-auto max-w-7xl">
                    <form onSubmit={handleSearchSubmit} className="flex flex-col md:flex-row gap-4">
                        <div className="flex-1 relative">
                            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                            <Input
                                placeholder="Search blogs..."
                                value={search}
                                onChange={(e) => setSearch(e.target.value)}
                                className="pl-10"
                            />
                        </div>
                        
                        <Select
                            value={selectedCategorySlug || "all"}
                            onValueChange={(value) => {
                                setSelectedCategorySlug(value === "all" ? undefined : value);
                                setPage(1);
                            }}
                        >
                            <SelectTrigger className="w-full md:w-[200px]">
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
                            <Button
                                type="button"
                                variant="outline"
                                onClick={clearFilters}
                                className="w-full md:w-auto"
                            >
                                <X className="mr-2 h-4 w-4" />
                                Clear
                            </Button>
                        )}
                    </form>
                </div>
            </section>

            {/* Blog Grid */}
            <section className="flex-1 px-4 py-12">
                <div className="container mx-auto max-w-7xl">
                    {loading && (
                        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
                            {[1, 2, 3, 4, 5, 6].map((i) => (
                                <div key={i} className="group relative">
                                    <Skeleton className="aspect-[16/10] rounded-xl" />
                                    <div className="mt-4 space-y-3">
                                        <Skeleton className="h-4 w-20" />
                                        <Skeleton className="h-6 w-full" />
                                        <Skeleton className="h-4 w-full" />
                                        <Skeleton className="h-4 w-3/4" />
                                        <div className="flex gap-2">
                                            <Skeleton className="h-4 w-24" />
                                            <Skeleton className="h-4 w-32" />
                                        </div>
                                    </div>
                                </div>
                            ))}
                        </div>
                    )}

                    {error && (
                        <div className="text-center py-20">
                            <div className="inline-flex items-center justify-center w-16 h-16 rounded-full bg-destructive/10 mb-4">
                                <BookOpen className="h-8 w-8 text-destructive" />
                            </div>
                            <h3 className="text-xl font-semibold mb-2">Failed to Load Blogs</h3>
                            <p className="text-muted-foreground mb-6">{error}</p>
                            <Button onClick={loadBlogs} variant="outline">
                                Try Again
                            </Button>
                        </div>
                    )}

                    {!loading && !error && blogs.length === 0 && (
                        <div className="text-center py-20">
                            <div className="inline-flex items-center justify-center w-16 h-16 rounded-full bg-muted mb-4">
                                <BookOpen className="h-8 w-8 text-muted-foreground" />
                            </div>
                            <h3 className="text-xl font-semibold mb-2">No Blogs Found</h3>
                            <p className="text-muted-foreground">
                                {hasActiveFilters
                                    ? 'Try adjusting your filters'
                                    : 'No blogs have been published yet'}
                            </p>
                        </div>
                    )}

                    {!loading && !error && blogs.length > 0 && (
                        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
                            {blogs.map((blog) => (
                                <Link
                                    key={blog.id}
                                    href={`/blog/${blog.slug}`}
                                    className="group block"
                                >
                                    <article className="h-full bg-card rounded-xl overflow-hidden border shadow-sm hover:shadow-lg transition-all duration-300 hover:-translate-y-1">
                                        {/* Featured Image */}
                                        {blog.featuredImage ? (
                                            <div className="relative aspect-[16/10] overflow-hidden bg-muted">
                                                <Image
                                                    src={blog.featuredImage}
                                                    alt={blog.title}
                                                    fill
                                                    className="object-cover group-hover:scale-105 transition-transform duration-300"
                                                />
                                            </div>
                                        ) : (
                                            <div className="aspect-[16/10] bg-gradient-to-br from-primary/10 to-primary/5 flex items-center justify-center">
                                                <BookOpen className="h-12 w-12 text-primary/40" />
                                            </div>
                                        )}

                                        {/* Content */}
                                        <div className="p-6 space-y-3">
                                            {/* Category */}
                                            {blog.category && (
                                                <Badge variant="secondary" className="text-xs">
                                                    {blog.category.name}
                                                </Badge>
                                            )}

                                            {/* Title */}
                                            <h3 className="text-xl font-semibold line-clamp-2 group-hover:text-primary transition-colors">
                                                {blog.title}
                                            </h3>

                                            {/* Excerpt */}
                                            {blog.excerpt && (
                                                <p className="text-sm text-muted-foreground line-clamp-3">
                                                    {blog.excerpt}
                                                </p>
                                            )}

                                            {/* Meta */}
                                            <div className="flex items-center gap-4 text-xs text-muted-foreground pt-2">
                                                <div className="flex items-center gap-1">
                                                    <Calendar className="h-3.5 w-3.5" />
                                                    <span>{formatDate(blog.publishedAt)}</span>
                                                </div>
                                                {blog.authors.length > 0 && (
                                                    <div className="flex items-center gap-1">
                                                        <User className="h-3.5 w-3.5" />
                                                        <span>
                                                            {blog.authors[0].displayName || blog.authors[0].username}
                                                        </span>
                                                    </div>
                                                )}
                                            </div>
                                        </div>
                                    </article>
                                </Link>
                            ))}
                        </div>
                    )}

                    {/* Pagination */}
                    {!loading && blogs.length === pageSize && (
                        <div className="flex justify-center gap-4 mt-12">
                            <Button
                                variant="outline"
                                onClick={() => setPage((p) => Math.max(1, p - 1))}
                                disabled={page === 1}
                            >
                                Previous
                            </Button>
                            <Button
                                variant="outline"
                                onClick={() => setPage((p) => p + 1)}
                            >
                                Next
                            </Button>
                        </div>
                    )}
                </div>
            </section>
        </div>
    );
}
