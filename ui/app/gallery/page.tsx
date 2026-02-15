'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import Image from 'next/image';
import { motion } from 'framer-motion';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Skeleton } from '@/components/ui/skeleton';
import {
    ArrowLeft,
    ArrowUpRight,
    CalendarDays,
    Image as ImageIcon,
    Images,
} from 'lucide-react';
import { galleryService } from '@/lib/api/gallery.service';
import { Album } from '@/lib/api/gallery.types';
import { ApiError } from '@/lib/api/types';

export default function GalleryPage() {
    const [albums, setAlbums] = useState<Album[]>([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);

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
                                <ImageIcon className="h-3.5 w-3.5 text-primary" />
                                <span>Creative Showcase</span>
                            </Badge>
                            <h1 className="text-4xl font-bold tracking-tight md:text-5xl">Gallery</h1>
                            <p className="max-w-2xl text-lg text-muted-foreground">
                                Explore our curated collection of albums and creative works.
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

            <section className="flex-1 px-4 py-12">
                <div className="container mx-auto max-w-7xl">
                    {loading && (
                        <div className="grid grid-cols-1 gap-6 xl:grid-cols-2">
                            {Array.from({ length: 6 }).map((_, index) => (
                                <div key={index} className="overflow-hidden rounded-3xl border bg-card/40 p-0">
                                    <div className="grid grid-cols-1 md:grid-cols-[42%_58%]">
                                        <Skeleton className="min-h-[260px] rounded-none" />
                                        <div className="space-y-4 p-6">
                                            <Skeleton className="h-4 w-32" />
                                            <Skeleton className="h-8 w-3/4" />
                                            <Skeleton className="h-5 w-full" />
                                            <Skeleton className="h-5 w-5/6" />
                                            <Skeleton className="h-4 w-1/2" />
                                        </div>
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
                        <div className="grid grid-cols-1 gap-6 xl:grid-cols-2">
                            {albums.map((album, index) => (
                                <motion.div
                                    key={album.id}
                                    initial={{ opacity: 0, y: 14 }}
                                    animate={{ opacity: 1, y: 0 }}
                                    transition={{ duration: 0.3, delay: index * 0.05 }}
                                    className="h-full"
                                >
                                    <Link href={`/gallery/${album.slug}`} className="group block h-full">
                                        <article className="h-full overflow-hidden rounded-3xl border bg-card/55 backdrop-blur-sm transition-all duration-300 hover:bg-card/75 hover:shadow-xl">
                                            <div className="grid h-full grid-cols-1 md:grid-cols-[42%_58%]">
                                                <div className="relative min-h-[260px] overflow-hidden bg-muted">
                                                    {album.cover ? (
                                                        <Image
                                                            src={album.cover}
                                                            alt={album.name}
                                                            fill
                                                            sizes="(max-width: 767px) 100vw, (max-width: 1279px) 42vw, 34vw"
                                                            className="object-cover transition-transform duration-500 group-hover:scale-105"
                                                            unoptimized
                                                        />
                                                    ) : (
                                                        <div className="flex h-full items-center justify-center">
                                                            <div className="rounded-2xl border bg-background/60 p-4">
                                                                <ImageIcon className="h-8 w-8 text-primary/80" />
                                                            </div>
                                                        </div>
                                                    )}
                                                    <span className="absolute bottom-4 right-4 inline-flex h-12 w-12 items-center justify-center rounded-full border border-white/20 bg-background/95 text-foreground shadow-lg">
                                                        <ArrowUpRight className="h-5 w-5" />
                                                    </span>
                                                </div>

                                                <div className="flex min-h-[260px] flex-col p-6 md:p-7">
                                                    <div className="mb-4 flex flex-wrap items-center gap-3 text-sm text-muted-foreground">
                                                        <span className="inline-flex items-center gap-1.5">
                                                            <CalendarDays className="h-4 w-4" />
                                                            {formatDate(album.createdAt)}
                                                        </span>
                                                        <Badge variant="secondary" className="rounded-full px-3 py-1">
                                                            <Images className="mr-1.5 h-3.5 w-3.5" />
                                                            {album.imageCount}
                                                        </Badge>
                                                    </div>

                                                    <h3 className="line-clamp-2 text-2xl font-semibold leading-tight tracking-tight transition-colors group-hover:text-primary">
                                                        {album.name}
                                                    </h3>

                                                    <p className="mt-4 line-clamp-4 text-base leading-relaxed text-muted-foreground">
                                                        {album.description ||
                                                            'A curated album exploring visual themes, composition, and creative direction.'}
                                                    </p>

                                                    {album.authors.length > 0 && (
                                                        <p className="mt-auto pt-6 text-sm text-muted-foreground">
                                                            By{' '}
                                                            {album.authors
                                                                .map((a) => a.displayName || a.username)
                                                                .join(', ')}
                                                        </p>
                                                    )}
                                                </div>
                                            </div>
                                        </article>
                                    </Link>
                                </motion.div>
                            ))}
                        </div>
                    )}
                </div>
            </section>
        </div>
    );
}
