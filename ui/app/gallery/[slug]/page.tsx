'use client';

import { useEffect, useState } from 'react';
import { useParams, useRouter } from 'next/navigation';
import Link from 'next/link';
import Image from 'next/image';
import { Button } from '@/components/ui/button';
import { Skeleton } from '@/components/ui/skeleton';
import { ArrowLeft, Calendar, ImageIcon, ZoomIn } from 'lucide-react';
import { galleryService } from '@/lib/api/gallery.service';
import { AlbumWithImages } from '@/lib/api/gallery.types';
import { ApiError } from '@/lib/api/types';
import { motion } from 'framer-motion';

import Lightbox from "yet-another-react-lightbox";
import "yet-another-react-lightbox/styles.css";
import Zoom from "yet-another-react-lightbox/plugins/zoom";
import Thumbnails from "yet-another-react-lightbox/plugins/thumbnails";
import Captions from "yet-another-react-lightbox/plugins/captions";
import "yet-another-react-lightbox/plugins/thumbnails.css";
import "yet-another-react-lightbox/plugins/captions.css";

export default function AlbumDetailPage() {
    const params = useParams();
    const router = useRouter();
    const slug = params.slug as string;

    const [album, setAlbum] = useState<AlbumWithImages | null>(null);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);

    // Lightbox state
    const [index, setIndex] = useState(-1);

    useEffect(() => {
        if (slug) {
            loadAlbum();
        }
    }, [slug]);

    const loadAlbum = async () => {
        try {
            setLoading(true);
            setError(null);

            // First, get all albums to find the one with matching slug
            const albums = await galleryService.getAllAlbums();
            const matchedAlbum = albums.find(a => a.slug === slug);

            if (!matchedAlbum) {
                setError('Album not found');
                setLoading(false);
                return;
            }

            // Then fetch the full album with images
            const albumData = await galleryService.getAlbumById(matchedAlbum.id);
            setAlbum(albumData);
        } catch (err) {
            if (err instanceof ApiError) {
                setError(err.problemDetails.detail || err.problemDetails.title);
            } else {
                setError('Failed to load album');
            }
            console.error('Error loading album:', err);
        } finally {
            setLoading(false);
        }
    };

    const formatDate = (dateString: string) => {
        return new Date(dateString).toLocaleDateString('en-US', {
            year: 'numeric',
            month: 'long',
            day: 'numeric'
        });
    };

    if (loading) {
        return (
            <div className="flex flex-col min-h-screen">
                <section className="px-4 py-12 md:py-16 border-b">
                    <div className="container mx-auto pt-16">
                        <Button variant="outline" asChild className="mb-6">
                            <Link href="/gallery">
                                <ArrowLeft className="mr-2 h-4 w-4" />
                                Back to Gallery
                            </Link>
                        </Button>
                        <Skeleton className="h-12 w-3/4 mb-4" />
                        <Skeleton className="h-6 w-1/2 mb-2" />
                        <Skeleton className="h-4 w-1/4" />
                    </div>
                </section>
                <section className="flex-1 px-4 py-12">
                    <div className="container mx-auto">
                        <div className="columns-1 md:columns-2 lg:columns-3 gap-6 space-y-6">
                            {[1, 2, 3, 4, 5, 6].map((i) => (
                                <Skeleton key={i} className="aspect-square w-full rounded-xl" />
                            ))}
                        </div>
                    </div>
                </section>
            </div>
        );
    }

    if (error || !album) {
        return (
            <div className="flex flex-col min-h-screen">
                <section className="flex-1 flex items-center justify-center px-4 py-20">
                    <div className="text-center">
                        <div className="inline-flex items-center justify-center w-16 h-16 rounded-full bg-destructive/10 mb-4">
                            <ImageIcon className="h-8 w-8 text-destructive" />
                        </div>
                        <h3 className="text-lg font-semibold mb-2">
                            {error || 'Album Not Found'}
                        </h3>
                        <p className="text-muted-foreground mb-4">
                            The album you're looking for doesn't exist or has been removed.
                        </p>
                        <Button asChild>
                            <Link href="/gallery">
                                <ArrowLeft className="mr-2 h-4 w-4" />
                                Back to Gallery
                            </Link>
                        </Button>
                    </div>
                </section>
            </div>
        );
    }

    const slides = album.images.map(image => ({
        src: image.url,
        title: image.title,
        description: image.description
    }));

    return (
        <div className="flex flex-col min-h-screen bg-background text-foreground">
            {/* Header */}
            <motion.section
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.5 }}
                className="px-4 py-12 md:py-16 border-b bg-muted/20"
            >
                <div className="container mx-auto pt-16">
                    <div className="mb-8">
                        <Link href="/gallery" className="inline-flex items-center text-sm font-medium text-muted-foreground hover:text-primary transition-colors">
                            <ArrowLeft className="mr-2 h-4 w-4" />
                            Back to Gallery
                        </Link>
                    </div>

                    <div className="max-w-4xl">
                        <h1 className="text-4xl md:text-5xl lg:text-6xl font-bold tracking-tight mb-6">
                            {album.name}
                        </h1>
                        {album.description && (
                            <p className="text-xl text-muted-foreground mb-6 leading-relaxed">
                                {album.description}
                            </p>
                        )}
                        <div className="flex flex-wrap items-center gap-6 text-sm text-muted-foreground">
                            <div className="flex items-center gap-2 bg-muted/50 px-3 py-1 rounded-full">
                                <Calendar className="h-4 w-4" />
                                <span>{formatDate(album.createdAt)}</span>
                            </div>
                            <div className="flex items-center gap-2 bg-muted/50 px-3 py-1 rounded-full">
                                <ImageIcon className="h-4 w-4" />
                                <span>{album.images.length} {album.images.length === 1 ? 'image' : 'images'}</span>
                            </div>
                        </div>
                    </div>
                </div>
            </motion.section>

            {/* Images Grid */}
            <section className="flex-1 px-4 py-12 md:py-16">
                <div className="container mx-auto">
                    {album.images.length === 0 ? (
                        <div className="text-center py-20 bg-muted/10 rounded-3xl border border-dashed">
                            <div className="inline-flex items-center justify-center w-20 h-20 rounded-full bg-muted mb-6">
                                <ImageIcon className="h-10 w-10 text-muted-foreground" />
                            </div>
                            <h3 className="text-xl font-semibold mb-2">No Images Yet</h3>
                            <p className="text-muted-foreground max-w-md mx-auto">
                                This album is empty. Check back later for updates!
                            </p>
                        </div>
                    ) : (
                        <div className="columns-1 md:columns-2 lg:columns-3 gap-6 space-y-6">
                            {album.images.map((image, i) => (
                                <motion.div
                                    key={image.id}
                                    initial={{ opacity: 0, y: 20 }}
                                    animate={{ opacity: 1, y: 0 }}
                                    transition={{ duration: 0.5, delay: i * 0.1 }}
                                    className="break-inside-avoid group cursor-zoom-in relative rounded-xl overflow-hidden bg-muted"
                                    onClick={() => setIndex(i)}
                                >
                                    <div className="relative w-full">
                                        <Image
                                            src={image.url}
                                            alt={image.title || 'Album image'}
                                            width={800}
                                            height={600}
                                            className="w-full h-auto transform transition-transform duration-500 group-hover:scale-105"
                                            sizes="(max-width: 768px) 100vw, (max-width: 1200px) 50vw, 33vw"
                                            unoptimized // Since we don't know dimensions, unoptimized helps prevent layout shift issues if aspect ratio is unknown
                                        />
                                        <div className="absolute inset-0 bg-black/0 group-hover:bg-black/20 transition-colors duration-300" />

                                        <div className="absolute inset-0 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity duration-300">
                                            <div className="bg-background/80 backdrop-blur-sm p-3 rounded-full text-foreground shadow-lg transform scale-75 group-hover:scale-100 transition-transform duration-300">
                                                <ZoomIn className="h-6 w-6" />
                                            </div>
                                        </div>

                                        {(image.title || image.description) && (
                                            <div className="absolute inset-x-0 bottom-0 bg-gradient-to-t from-black/80 via-black/40 to-transparent p-6 pt-12 translate-y-4 group-hover:translate-y-0 opacity-0 group-hover:opacity-100 transition-all duration-300">
                                                {image.title && (
                                                    <h3 className="text-white font-semibold text-lg mb-1">{image.title}</h3>
                                                )}
                                                {image.description && (
                                                    <p className="text-white/80 text-sm line-clamp-2">
                                                        {image.description}
                                                    </p>
                                                )}
                                            </div>
                                        )}
                                    </div>
                                </motion.div>
                            ))}
                        </div>
                    )}
                </div>
            </section>

            <Lightbox
                open={index >= 0}
                index={index}
                close={() => setIndex(-1)}
                slides={slides}
                plugins={[Zoom, Thumbnails, Captions]}
                animation={{ fade: 0 }}
                controller={{ closeOnBackdropClick: true }}
                captions={{ descriptionTextAlign: 'center' }}
            />
        </div>
    );
}
