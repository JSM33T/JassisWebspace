'use client';

import { useEffect, useMemo, useState } from 'react';
import Link from 'next/link';
import { motion } from 'framer-motion';
import { PageIntroCard } from '@/components/page-intro-card';
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
import {
    ArrowUpRight,
    CalendarDays,
    Image as ImageIcon,
    Images,
} from 'lucide-react';
import { galleryService } from '@/lib/api/gallery.service';
import { Album } from '@/lib/api/gallery.types';
import { getVersionedGalleryCoverUrl } from '@/lib/gallery-media';
import { ApiError } from '@/lib/api/types';

export default function GalleryPage() {
    const [albums, setAlbums] = useState<Album[]>([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);
    const [sortOrder, setSortOrder] = useState<'newest' | 'oldest' | 'title'>('newest');

    useEffect(() => {
        loadAlbums();
    }, []);

    const loadAlbums = async () => {
        try {
            setLoading(true);
            setError(null);
            const data = await galleryService.getAllAlbums();
            setAlbums(data);
        } catch (err) {
            if (err instanceof ApiError) {
                setError(err.problemDetails.detail || err.problemDetails.title);
            } else {
                setError('Failed to load albums');
            }
            console.error('Error loading albums:', err);
        } finally {
            setLoading(false);
        }
    };

    const formatDate = (dateString: string) =>
        new Date(dateString).toLocaleDateString('en-US', {
            year: 'numeric',
            month: 'long',
            day: 'numeric',
        });

    const visibleAlbums = useMemo(() => {
        const sorted = [...albums];

        if (sortOrder === 'title') {
            return sorted.sort((a, b) => a.name.localeCompare(b.name));
        }

        return sorted.sort((a, b) => {
            const left = new Date(a.createdAt).getTime();
            const right = new Date(b.createdAt).getTime();
            return sortOrder === 'oldest' ? left - right : right - left;
        });
    }, [albums, sortOrder]);

    return (
        <div className="flex min-h-screen flex-col bg-background/50">
            <div className="fixed inset-0 z-[-1] pointer-events-none">
                <div className="absolute top-[-10%] left-1/2 h-[600px] w-[600px] -translate-x-1/2 rounded-full bg-primary/5 blur-[120px]" />
                <div className="absolute bottom-[-10%] left-[-10%] h-[500px] w-[500px] rounded-full bg-blue-500/5 blur-[120px]" />
            </div>

            <main className="flex-1 px-4 pb-14 pt-8 md:pb-16 md:pt-10">
                <div className="container mx-auto max-w-7xl pt-12">
                    <PageIntroCard
                        badge="Creative Showcase"
                        badgeIcon={ImageIcon}
                        title="Gallery"
                        description="Explore my curated collection of albums and creative works."
                    >
                        <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
                            <p className="text-sm text-muted-foreground">
                                Sort albums by recency or title to scan the collection faster.
                            </p>
                            <div className="w-full sm:w-[200px]">
                                <Select value={sortOrder} onValueChange={(value) => setSortOrder(value as typeof sortOrder)}>
                                    <SelectTrigger>
                                        <SelectValue placeholder="Sort albums" />
                                    </SelectTrigger>
                                    <SelectContent>
                                        <SelectItem value="newest">Newest first</SelectItem>
                                        <SelectItem value="oldest">Oldest first</SelectItem>
                                        <SelectItem value="title">Title A-Z</SelectItem>
                                    </SelectContent>
                                </Select>
                            </div>
                        </div>
                    </PageIntroCard>

                    <section className="mt-6">
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
                            <Button onClick={loadAlbums} size="lg">
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
                            {visibleAlbums.map((album, index) => (
                                <motion.div
                                    key={album.id}
                                    initial={{ opacity: 0, y: 14 }}
                                    animate={{ opacity: 1, y: 0 }}
                                    transition={{ duration: 0.3, delay: index * 0.05 }}
                                    className="h-full"
                                >
                                    <Link href={`/gallery/${album.slug}`} className="group block h-full">
                                        <article className="relative aspect-[4/3] overflow-hidden rounded-3xl bg-card/55 backdrop-blur-sm transition-all duration-300 hover:bg-card/75 hover:shadow-xl">
                                            <GalleryThumb
                                                src={getVersionedGalleryCoverUrl(album)}
                                                alt={album.name}
                                                fill
                                                sizes="(max-width: 767px) 100vw, 50vw"
                                                imageClassName="group-hover:scale-105"
                                            />

                                            <div className="absolute right-4 top-4 inline-flex items-center gap-2 rounded-full border border-white/20 bg-background/85 px-3 py-1 text-xs text-foreground backdrop-blur-md">
                                                <Images className="h-3.5 w-3.5" />
                                                <span>{album.imageCount}</span>
                                            </div>

                                            <span className="absolute right-4 top-14 inline-flex items-center gap-1.5 rounded-full border border-white/20 bg-background/85 px-3 py-1 text-xs text-foreground backdrop-blur-md">
                                                <CalendarDays className="h-3.5 w-3.5" />
                                                {formatDate(album.createdAt)}
                                            </span>

                                            <span className="absolute bottom-4 right-4 inline-flex h-10 w-10 items-center justify-center rounded-full border border-white/20 bg-background/95 text-foreground shadow-lg">
                                                <ArrowUpRight className="h-4 w-4" />
                                            </span>
                                        </article>
                                        <div className="mt-3 rounded-2xl bg-background/60 px-4 py-3 backdrop-blur-md transition-colors duration-300 group-hover:bg-background/75">
                                            <h3 className="line-clamp-1 text-lg font-semibold leading-tight tracking-tight text-foreground">
                                                {album.name}
                                            </h3>
                                            <p className="mt-1 line-clamp-1 text-xs leading-relaxed text-muted-foreground">
                                                {album.description ||
                                                    'A curated album exploring visual themes, composition, and creative direction.'}
                                            </p>
                                        </div>
                                    </Link>
                                </motion.div>
                            ))}
                        </div>
                    )}

                    </section>
                </div>
            </main>
        </div>
    );
}
