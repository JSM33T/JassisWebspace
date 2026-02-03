'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Skeleton } from '@/components/ui/skeleton';
import { Image as ImageIcon, ArrowLeft, Calendar, Images } from 'lucide-react';
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
            month: 'long',
            day: 'numeric'
        });
    };

    return (
        <div className="flex flex-col min-h-screen pt-24">
            {/* Header */}
            <section className="px-4 py-12 md:py-16 border-b">
                <div className="container mx-auto">
                    <div className="flex items-center justify-between">
                        <div>
                            <div className="inline-flex items-center rounded-full border px-4 py-1.5 text-sm font-medium mb-4">
                                <ImageIcon className="mr-2 h-4 w-4" />
                                Creative Showcase
                            </div>
                            <h1 className="text-4xl md:text-5xl font-bold tracking-tight mb-2">
                                Gallery
                            </h1>
                            <p className="text-lg text-muted-foreground">
                                Explore our collection of albums and creative works
                            </p>
                        </div>
                        <Button variant="outline" asChild>
                            <Link href="/">
                                <ArrowLeft className="mr-2 h-4 w-4" />
                                Back to Home
                            </Link>
                        </Button>
                    </div>
                </div>
            </section>

            {/* Albums Grid */}
            <section className="flex-1 px-4 py-12">
                <div className="container mx-auto">
                    {loading && (
                        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                            {[1, 2, 3, 4, 5, 6].map((i) => (
                                <Card key={i}>
                                    <CardHeader>
                                        <Skeleton className="h-6 w-3/4 mb-2" />
                                        <Skeleton className="h-4 w-full" />
                                    </CardHeader>
                                    <CardContent>
                                        <Skeleton className="h-4 w-1/2" />
                                    </CardContent>
                                </Card>
                            ))}
                        </div>
                    )}

                    {error && (
                        <div className="text-center py-12">
                            <div className="inline-flex items-center justify-center w-16 h-16 rounded-full bg-destructive/10 mb-4">
                                <ImageIcon className="h-8 w-8 text-destructive" />
                            </div>
                            <h3 className="text-lg font-semibold mb-2">Failed to Load Albums</h3>
                            <p className="text-muted-foreground mb-4">{error}</p>
                            <Button onClick={loadAlbums}>Try Again</Button>
                        </div>
                    )}

                    {!loading && !error && albums.length === 0 && (
                        <div className="text-center py-12">
                            <div className="inline-flex items-center justify-center w-16 h-16 rounded-full bg-muted mb-4">
                                <ImageIcon className="h-8 w-8 text-muted-foreground" />
                            </div>
                            <h3 className="text-lg font-semibold mb-2">No Albums Yet</h3>
                            <p className="text-muted-foreground">
                                Check back soon for new albums and creative works
                            </p>
                        </div>
                    )}

                    {!loading && !error && albums.length > 0 && (
                        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                            {albums.map((album) => (
                                <Card key={album.id} className="hover:shadow-lg transition-shadow">
                                    {album.cover ? (
                                        <div className="w-full h-48 overflow-hidden rounded-t-md relative">
                                            <Image
                                                src={album.cover}
                                                alt={`${album.name} cover`}
                                                fill
                                                className="object-cover"
                                            />
                                        </div>
                                    ) : (
                                        <div className="w-full h-48 overflow-hidden rounded-t-md flex items-center justify-center bg-muted">
                                            <div className="text-muted-foreground flex flex-col items-center">
                                                <ImageIcon className="h-8 w-8 mb-2" />
                                                <span className="text-sm">No cover</span>
                                            </div>
                                        </div>
                                    )}

                                    <CardHeader>
                                        <CardTitle className="flex items-start justify-between">
                                            <span className="line-clamp-1">{album.name}</span>
                                            <div className="flex items-center gap-1 text-sm font-normal text-muted-foreground ml-2">
                                                <Images className="h-4 w-4" />
                                                <span>{album.imageCount}</span>
                                            </div>
                                        </CardTitle>
                                        {album.description && (
                                            <CardDescription className="line-clamp-2">
                                                {album.description}
                                            </CardDescription>
                                        )}
                                    </CardHeader>
                                    <CardContent>
                                        <div className="flex items-center text-sm text-muted-foreground">
                                            <Calendar className="mr-2 h-4 w-4" />
                                            {formatDate(album.createdAt)}
                                        </div>
                                        <Button asChild className="w-full mt-4" variant="outline">
                                            <Link href={`/gallery/${album.slug}`}>
                                                View Album
                                            </Link>
                                        </Button>
                                    </CardContent>
                                </Card>
                            ))}
                        </div>
                    )}
                </div>
            </section>
        </div>
    );
}

