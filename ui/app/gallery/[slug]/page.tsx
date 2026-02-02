'use client';

import { useEffect, useState } from 'react';
import { useParams, useRouter } from 'next/navigation';
import Link from 'next/link';
import Image from 'next/image';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { Skeleton } from '@/components/ui/skeleton';
import { ArrowLeft, Calendar, ImageIcon } from 'lucide-react';
import { galleryService } from '@/lib/api/gallery.service';
import { AlbumWithImages } from '@/lib/api/gallery.types';
import { ApiError } from '@/lib/api/types';

export default function AlbumDetailPage() {
    const params = useParams();
    const router = useRouter();
    const slug = params.slug as string;

    const [album, setAlbum] = useState<AlbumWithImages | null>(null);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);

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
                    <div className="container mx-auto">
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
                        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                            {[1, 2, 3, 4, 5, 6].map((i) => (
                                <Skeleton key={i} className="aspect-square rounded-lg" />
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

    return (
        <div className="flex flex-col min-h-screen">
            {/* Header */}
            <section className="px-4 py-12 md:py-16 border-b">
                <div className="container mx-auto">
                    <Button variant="outline" asChild className="mb-6">
                        <Link href="/gallery">
                            <ArrowLeft className="mr-2 h-4 w-4" />
                            Back to Gallery
                        </Link>
                    </Button>

                    <div className="flex items-start justify-between">
                        <div>
                            <h1 className="text-4xl md:text-5xl font-bold tracking-tight mb-4">
                                {album.name}
                            </h1>
                            {album.description && (
                                <p className="text-lg text-muted-foreground mb-4">
                                    {album.description}
                                </p>
                            )}
                            <div className="flex items-center gap-4 text-sm text-muted-foreground">
                                <div className="flex items-center">
                                    <Calendar className="mr-2 h-4 w-4" />
                                    {formatDate(album.createdAt)}
                                </div>
                                <div className="flex items-center">
                                    <ImageIcon className="mr-2 h-4 w-4" />
                                    {album.images.length} {album.images.length === 1 ? 'image' : 'images'}
                                </div>
                            </div>
                        </div>
                    </div>
                </div>
            </section>

            {/* Images Grid */}
            <section className="flex-1 px-4 py-12">
                <div className="container mx-auto">
                    {album.images.length === 0 ? (
                        <div className="text-center py-12">
                            <div className="inline-flex items-center justify-center w-16 h-16 rounded-full bg-muted mb-4">
                                <ImageIcon className="h-8 w-8 text-muted-foreground" />
                            </div>
                            <h3 className="text-lg font-semibold mb-2">No Images Yet</h3>
                            <p className="text-muted-foreground">
                                This album doesn't have any images yet.
                            </p>
                        </div>
                    ) : (
                        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                            {album.images.map((image) => (
                                <Card key={image.id} className="overflow-hidden hover:shadow-lg transition-shadow">
                                    <div className="relative aspect-square">
                                        <Image
                                            src={image.url}
                                            alt={image.title || 'Album image'}
                                            fill
                                            className="object-cover"
                                            sizes="(max-width: 768px) 100vw, (max-width: 1200px) 50vw, 33vw"
                                        />
                                    </div>
                                    {(image.title || image.description) && (
                                        <CardContent className="p-4">
                                            {image.title && (
                                                <h3 className="font-semibold mb-1">{image.title}</h3>
                                            )}
                                            {image.description && (
                                                <p className="text-sm text-muted-foreground line-clamp-2">
                                                    {image.description}
                                                </p>
                                            )}
                                        </CardContent>
                                    )}
                                </Card>
                            ))}
                        </div>
                    )}
                </div>
            </section>
        </div>
    );
}
