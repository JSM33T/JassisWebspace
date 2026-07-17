'use client';

import { useCallback, useEffect, useState } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import Link from 'next/link';
import { motion } from 'framer-motion';
import { Button } from '@/components/ui/button';
import { Skeleton } from '@/components/ui/skeleton';
import {
    Select,
    SelectContent,
    SelectItem,
    SelectTrigger,
    SelectValue,
} from '@/components/ui/select';
import { GalleryThumb } from '@/components/gallery/gallery-thumb';
import { PageBanner } from '@/components/page-banner';
import { Image as ImageIcon } from 'lucide-react';
import { galleryService } from '@/lib/api/gallery.service';
import { Album, GallerySortOrder } from '@/lib/api/gallery.types';
import { getVersionedGalleryCoverUrl } from '@/lib/gallery-media';
import { ApiError } from '@/lib/api/types';

function parseGallerySortOrder(value: string | null): GallerySortOrder {
    return value === 'oldest' || value === 'title' ? value : 'newest';
}

function parseGalleryPage(value: string | null): number {
    const parsedPage = parseInt(value || '1', 10);
    return Number.isFinite(parsedPage) && parsedPage > 0 ? parsedPage : 1;
}

export default function GalleryPage() {
    const router = useRouter();
    const searchParams = useSearchParams();

    const [albums, setAlbums] = useState<Album[]>([]);
    const [totalAlbums, setTotalAlbums] = useState(0);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);
    const [sortOrder, setSortOrder] = useState<GallerySortOrder>(
        parseGallerySortOrder(searchParams.get('sort'))
    );
    const [page, setPage] = useState(parseGalleryPage(searchParams.get('page')));

    const pageSize = 6;
    const hasNextPage = page * pageSize < totalAlbums;
    const showPagination = page > 1 || totalAlbums > pageSize;

    const loadAlbums = useCallback(async () => {
        try {
            const data = await galleryService.getAlbumsPage({
                sortOrder,
                page,
                pageSize,
            });
            setAlbums(data.albums);
            setTotalAlbums(data.total);
        } catch (err) {
            if (err instanceof ApiError) {
                setError(err.problemDetails.detail || err.problemDetails.title);
            } else {
                setError('Failed to load albums');
            }
            setTotalAlbums(0);
            console.error('Error loading albums:', err);
        } finally {
            setLoading(false);
        }
    }, [page, pageSize, sortOrder]);

    const updateUrlParams = useCallback(() => {
        const params = new URLSearchParams();
        if (sortOrder !== 'newest') params.set('sort', sortOrder);
        if (page > 1) params.set('page', String(page));

        router.replace(params.toString() ? `?${params}` : '/gallery', { scroll: false });
    }, [page, router, sortOrder]);

    const handleRetry = () => {
        setError(null);
        setLoading(true);
        void loadAlbums();
    };

    useEffect(() => {
        updateUrlParams();
    }, [updateUrlParams]);

    useEffect(() => {
        setLoading(true);
        setError(null);
        void (async () => {
            await loadAlbums();
        })();
    }, [loadAlbums]);

    return (
        <div className="flex min-h-screen flex-col bg-background/50">
            <PageBanner
                badge="Creative Showcase"
                badgeIcon={ImageIcon}
                title="Gallery"
                description="Field walks, travel fragments, ruins, roads, and small visual stories collected as albums."
                maxWidth="max-w-7xl"
                rightContent={
                    <Select
                        value={sortOrder}
                        onValueChange={(value) => {
                            setSortOrder(value as GallerySortOrder);
                            setPage(1);
                        }}
                    >
                        <SelectTrigger>
                            <SelectValue placeholder="Sort albums" />
                        </SelectTrigger>
                        <SelectContent>
                            <SelectItem value="newest">Newest first</SelectItem>
                            <SelectItem value="oldest">Oldest first</SelectItem>
                            <SelectItem value="title">Title A-Z</SelectItem>
                        </SelectContent>
                    </Select>
                }
            />

            <main className="flex-1 px-4 pb-14 pt-8 md:px-8 md:pb-16 md:pt-10">
                <div className="mx-auto max-w-7xl pt-4">
                    <section>
                    {loading && (
                        <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-3">
                            {Array.from({ length: 6 }).map((_, index) => (
                                <div key={index} className="h-full">
                                    <div className="relative overflow-hidden rounded-3xl bg-card/40">
                                        <Skeleton className="aspect-[4/3] w-full rounded-none" />
                                    </div>
                                    <div className="mt-3 rounded-2xl bg-background/60 px-4 py-3 backdrop-blur-md">
                                        <Skeleton className="mb-2 h-5 w-3/4" />
                                        <Skeleton className="h-3.5 w-full" />
                                    </div>
                                </div>
                            ))}
                        </div>
                    )}

                    {error && (
                        <div className="py-20 text-center">
                            <div className="mb-4 inline-flex h-16 w-16 items-center justify-center rounded-full bg-destructive/10">
                                <ImageIcon className="h-8 w-8 text-destructive" />
                            </div>
                            <h3 className="mb-2 text-xl font-semibold">Failed to Load Albums</h3>
                            <p className="mb-6 text-muted-foreground">{error}</p>
                            <Button onClick={handleRetry} size="lg">
                                Try Again
                            </Button>
                        </div>
                    )}

                    {!loading && !error && albums.length === 0 && (
                        <div className="py-20 text-center">
                            <div className="mb-6 inline-flex h-20 w-20 items-center justify-center rounded-full bg-muted">
                                <ImageIcon className="h-10 w-10 text-muted-foreground" />
                            </div>
                            <h3 className="mb-2 text-xl font-semibold">No Albums Yet</h3>
                            <p className="mx-auto max-w-md text-muted-foreground">
                                Check back soon for new albums and creative works.
                            </p>
                        </div>
                    )}

                    {!loading && !error && albums.length > 0 && (
                        <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-3">
                            {albums.map((album, index) => (
                                <motion.div
                                    key={album.id}
                                    initial={{ opacity: 0, y: 14 }}
                                    animate={{ opacity: 1, y: 0 }}
                                    transition={{ duration: 0.3, delay: index * 0.05 }}
                                >
                                    <Link href={`/gallery/${album.slug}`} className="group block">
                                        <article className="relative aspect-square overflow-hidden rounded-3xl bg-muted shadow-sm transition-shadow duration-300 group-hover:shadow-xl">
                                            <GalleryThumb
                                                src={getVersionedGalleryCoverUrl(album)}
                                                alt={album.name}
                                                fill
                                                sizes="(max-width: 640px) 100vw, (max-width: 1024px) 50vw, 33vw"
                                                imageClassName="transition-transform duration-500 group-hover:scale-105"
                                            />

                                            {/* Bottom label overlay */}
                                            <div className="absolute inset-x-0 bottom-0 bg-gradient-to-t from-black/75 via-black/30 to-transparent px-5 pb-5 pt-16">
                                                <p className="mb-0.5 font-mono text-[11px] font-medium uppercase tracking-widest text-white/60">
                                                    {String((page - 1) * pageSize + index + 1).padStart(2, '0')}
                                                    {album.imageCount > 0 && (
                                                        <span className="ml-1">· {album.imageCount} photos</span>
                                                    )}
                                                </p>
                                                <h3 className="line-clamp-1 text-base font-semibold text-white">
                                                    {album.name}
                                                </h3>
                                            </div>
                                        </article>
                                    </Link>
                                </motion.div>
                            ))}
                        </div>
                    )}

                    {!loading && showPagination && (
                        <div className="mt-12 flex items-center justify-center gap-4">
                            <Button
                                variant="outline"
                                disabled={page === 1}
                                onClick={() => setPage((prev) => Math.max(1, prev - 1))}
                            >
                                Previous
                            </Button>
                            <Button
                                variant="outline"
                                disabled={!hasNextPage}
                                onClick={() => setPage((prev) => prev + 1)}
                            >
                                Next
                            </Button>
                        </div>
                    )}

                    </section>
                </div>
            </main>
        </div>
    );
}
