'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { motion } from 'framer-motion';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Skeleton } from '@/components/ui/skeleton';
import { Image as ImageIcon, ArrowLeft, Calendar, Images, Eye } from 'lucide-react';
import Image from 'next/image';
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

    const formatDate = (dateString: string) => {
        return new Date(dateString).toLocaleDateString('en-US', {
            year: 'numeric',
            month: 'short',
            day: 'numeric'
        });
    };

    return (
        <div className="flex flex-col min-h-screen bg-background/50">

            {/* Ambient Background Glow (Same as services page) */}
            <div className="fixed inset-0 z-[-1] pointer-events-none">
                <div className="absolute top-[-10%] left-1/2 -translate-x-1/2 w-[600px] h-[600px] rounded-full bg-primary/5 blur-[120px]" />
                <div className="absolute bottom-[-10%] left-[-10%] w-[500px] h-[500px] rounded-full bg-blue-500/5 blur-[120px]" />
            </div>

            {/* Header */}
            <section className="px-4 py-8 md:py-12 border-b bg-muted/30 backdrop-blur-sm">
                <div className="container mx-auto max-w-7xl pt-16">
                    <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
                        <div className="space-y-3">
                            <Badge variant="secondary" className="px-4 py-1.5 rounded-full text-sm font-normal backdrop-blur-sm bg-background/50 border-border/50 gap-2 w-fit">
                                <ImageIcon className="h-3.5 w-3.5 text-primary" />
                                <span>Creative Showcase</span>
                            </Badge>
                            <h1 className="text-4xl md:text-5xl font-bold tracking-tight">
                                Gallery
                            </h1>
                            <p className="text-lg text-muted-foreground max-w-2xl">
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

            {/* Albums Grid */}
            <section className="flex-1 px-4 py-16">
                <div className="container mx-auto max-w-7xl">
                    {loading && (
                        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
                            {[1, 2, 3, 4, 5, 6, 7, 8].map((i) => (
                                <div key={i} className="group relative">
                                    <Skeleton className="aspect-[4/3] rounded-xl" />
                                    <div className="mt-3 space-y-2">
                                        <Skeleton className="h-5 w-3/4" />
                                        <Skeleton className="h-4 w-1/2" />
                                    </div>
                                </div>
                            ))}
                        </div>
                    )}

                    {error && (
                        <div className="text-center py-20">
                            <div className="inline-flex items-center justify-center w-16 h-16 rounded-full bg-destructive/10 mb-4">
                                <ImageIcon className="h-8 w-8 text-destructive" />
                            </div>
                            <h3 className="text-xl font-semibold mb-2">Failed to Load Albums</h3>
                            <p className="text-muted-foreground mb-6">{error}</p>
                            <Button onClick={loadAlbums} size="lg">Try Again</Button>
                        </div>
                    )}

                    {!loading && !error && albums.length === 0 && (
                        <div className="text-center py-20">
                            <div className="inline-flex items-center justify-center w-20 h-20 rounded-full bg-muted mb-6">
                                <ImageIcon className="h-10 w-10 text-muted-foreground" />
                            </div>
                            <h3 className="text-xl font-semibold mb-2">No Albums Yet</h3>
                            <p className="text-muted-foreground max-w-md mx-auto">
                                Check back soon for new albums and creative works
                            </p>
                        </div>
                    )}

                    {!loading && !error && albums.length > 0 && (
                        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
                            {albums.map((album, index) => (
                                <motion.div
                                    key={album.id}
                                    initial={{ opacity: 0, scale: 0.95 }}
                                    animate={{ opacity: 1, scale: 1 }}
                                    transition={{ duration: 0.3, delay: index * 0.05 }}
                                >
                                    <Link
                                        href={`/gallery/${album.slug}`}
                                        className="group block h-full"
                                    >
                                        <div className="flex flex-col h-full rounded-3xl border bg-card/50 hover:bg-card/80 transition-all duration-300 hover:shadow-lg backdrop-blur-sm overflow-hidden">
                                            <div className="relative overflow-hidden bg-muted aspect-[4/3]">
                                                {album.cover ? (
                                                    <>
                                                        <Image
                                                            src={album.cover}
                                                            alt={album.name}
                                                            fill
                                                            sizes="(max-width: 640px) 100vw, (max-width: 1024px) 50vw, (max-width: 1280px) 33vw, 25vw"
                                                            className="object-cover transition-transform duration-500 group-hover:scale-110"
                                                            unoptimized
                                                        />
                                                        <div className="absolute inset-0 bg-gradient-to-t from-black/60 via-black/0 to-black/0 opacity-0 group-hover:opacity-100 transition-opacity duration-300" />
                                                        <div className="absolute inset-0 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity duration-300">
                                                            <div className="flex items-center gap-2 bg-background/95 backdrop-blur-sm px-4 py-2 rounded-full shadow-lg">
                                                                <Eye className="h-4 w-4" />
                                                                <span className="text-sm font-medium">View Album</span>
                                                            </div>
                                                        </div>
                                                    </>
                                                ) : (
                                                    <div className="w-full h-full flex items-center justify-center">
                                                        <div className="p-4 rounded-2xl border bg-background/50">
                                                            <ImageIcon className="h-8 w-8 text-primary opacity-70" />
                                                        </div>
                                                    </div>
                                                )}
                                            </div>
                                            <div className="flex flex-col flex-1 p-6 space-y-3">
                                                <h3 className="font-medium text-lg leading-tight tracking-tight group-hover:text-primary transition-colors line-clamp-2">
                                                    {album.name}
                                                </h3>
                                                {album.authors.length > 0 && (
                                                    <p className="text-sm text-muted-foreground line-clamp-1">
                                                        By {album.authors.map((a) => a.displayName || a.username).join(', ')}
                                                    </p>
                                                )}
                                                <div className="flex items-center gap-3 text-sm text-muted-foreground">
                                                    <div className="flex items-center gap-1.5">
                                                        <div className="p-1 rounded-full border bg-background/50">
                                                            <Images className="h-3 w-3" />
                                                        </div>
                                                        <span>{album.imageCount}</span>
                                                    </div>
                                                    <span>•</span>
                                                    <div className="flex items-center gap-1.5">
                                                        <div className="p-1 rounded-full border bg-background/50">
                                                            <Calendar className="h-3 w-3" />
                                                        </div>
                                                        <span>{formatDate(album.createdAt)}</span>
                                                    </div>
                                                </div>
                                                {album.description && (
                                                    <p className="text-sm text-muted-foreground line-clamp-2 leading-relaxed">
                                                        {album.description}
                                                    </p>
                                                )}
                                            </div>
                                        </div>
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

