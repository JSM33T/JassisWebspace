'use client';

import { useCallback, useEffect, useState } from 'react';
import { useParams, usePathname, useRouter, useSearchParams } from 'next/navigation';
import Link from 'next/link';
import { Button } from '@/components/ui/button';
import { Skeleton } from '@/components/ui/skeleton';
import { ArrowLeft, Calendar, ImageIcon, MessageSquare, Share2, ZoomIn } from 'lucide-react';
import { galleryService } from '@/lib/api/gallery.service';
import { AlbumWithImages } from '@/lib/api/gallery.types';
import { ApiError } from '@/lib/api/types';
import { motion } from 'framer-motion';
import { toast } from 'sonner';

import { CommentSection } from '@/components/comments/CommentSection';
import { GalleryThumb } from '@/components/gallery/gallery-thumb';
import { LikeButton } from '@/components/likes/LikeButton';
import { PageIntroCard } from '@/components/page-intro-card';
import { toGalleryThumbUrl } from '@/lib/gallery-media';
import Lightbox from "yet-another-react-lightbox";
import "yet-another-react-lightbox/styles.css";
import Zoom from "yet-another-react-lightbox/plugins/zoom";
import Thumbnails from "yet-another-react-lightbox/plugins/thumbnails";
import Captions from "yet-another-react-lightbox/plugins/captions";
import Fullscreen from "yet-another-react-lightbox/plugins/fullscreen";
import Counter from "yet-another-react-lightbox/plugins/counter";
import "yet-another-react-lightbox/plugins/thumbnails.css";
import "yet-another-react-lightbox/plugins/captions.css";

export default function AlbumDetailPage() {
    const params = useParams();
    const slug = params.slug as string;
    const router = useRouter();
    const pathname = usePathname();
    const searchParams = useSearchParams();

    const [album, setAlbum] = useState<AlbumWithImages | null>(null);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);

    const setImageParam = (imageId: string | null) => {
        const params = new URLSearchParams(searchParams.toString());
        if (imageId) {
            params.set('image', imageId);
        } else {
            params.delete('image');
        }
        const query = params.toString();
        router.replace(query ? `${pathname}?${query}` : pathname, { scroll: false });
    };

    const loadAlbum = useCallback(async () => {
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
    }, [slug]);

    useEffect(() => {
        if (slug) {
            loadAlbum();
        }
    }, [slug, loadAlbum]);

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
                    <div className="container mx-auto max-w-5xl">
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
                            The album you&apos;re looking for doesn&apos;t exist or has been removed.
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
        thumbnail: toGalleryThumbUrl(image.url),
        title: image.title,
        description: image.description
    }));

    const selectedImageId = searchParams.get('image');
    const selectedIndex = selectedImageId
        ? album.images.findIndex((image) => image.id === selectedImageId)
        : -1;
    const isLightboxOpen = selectedIndex >= 0;
    const selectedImage = isLightboxOpen ? album.images[selectedIndex] : null;

    const handleShareCurrentImage = async () => {
        if (!selectedImage || typeof window === 'undefined') {
            return;
        }

        const shareUrl = window.location.href;
        const shareTitle = selectedImage.title || `${album.name} image`;

        try {
            if (navigator.share) {
                await navigator.share({
                    title: shareTitle,
                    text: `Check out this image from ${album.name}`,
                    url: shareUrl,
                });
                return;
            }

            await navigator.clipboard.writeText(shareUrl);
            toast.success('Share link copied to clipboard');
        } catch (error) {
            console.error('Failed to share image', error);
            toast.error('Failed to share image link');
        }
    };

    return (
        <div className="flex flex-col min-h-screen bg-background text-foreground">
            <div className="fixed inset-0 z-[-1] pointer-events-none">
                <div className="absolute top-[-10%] left-1/2 h-[600px] w-[600px] -translate-x-1/2 rounded-full bg-primary/5 blur-[120px]" />
                <div className="absolute bottom-[-10%] left-[-10%] h-[500px] w-[500px] rounded-full bg-secondary/8 blur-[120px]" />
            </div>

            <main className="flex-1 px-4 pb-16 pt-8 md:pt-10">
                <motion.div
                    initial={{ opacity: 0, y: 20 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ duration: 0.5 }}
                    className="container mx-auto max-w-5xl pt-12"
                >
                    <PageIntroCard
                        badge="Creative Showcase"
                        badgeIcon={ImageIcon}
                        title={album.name}
                        description={album.description}
                        showBackButton
                        backHref="/gallery"
                        backLabel="Back to Gallery"
                    >
                        <div className="flex flex-wrap items-center gap-3 text-sm text-muted-foreground">
                            <div className="inline-flex items-center gap-2 rounded-full border border-border/50 bg-background/55 px-3 py-1.5 backdrop-blur-sm">
                                <Calendar className="h-4 w-4" />
                                <span>{formatDate(album.createdAt)}</span>
                            </div>
                            <div className="inline-flex items-center gap-2 rounded-full border border-border/50 bg-background/55 px-3 py-1.5 backdrop-blur-sm">
                                <ImageIcon className="h-4 w-4" />
                                <span>{album.images.length} {album.images.length === 1 ? 'image' : 'images'}</span>
                            </div>
                            {album.contentId && (
                                <div className="inline-flex items-center rounded-full border border-border/50 bg-background/55 px-1 py-1 backdrop-blur-sm">
                                    <LikeButton
                                        contentId={album.contentId}
                                        initialCount={album.likeCount}
                                        initialLiked={album.isLiked}
                                    />
                                </div>
                            )}
                            <div className="inline-flex items-center gap-2 rounded-full border border-border/50 bg-background/55 px-3 py-1.5 backdrop-blur-sm">
                                <MessageSquare className="h-4 w-4" />
                                <span>{album.commentCount}</span>
                            </div>
                        </div>

                        {album.authors.length > 0 && (
                            <div className="mt-4 text-sm text-muted-foreground">
                                By {album.authors.map((a) => a.displayName || a.username).join(', ')}
                            </div>
                        )}
                    </PageIntroCard>

                    <section className="mt-6">
                    {/* Grid uses thumbs by default; Lightbox uses original `image.url` for full size. */}
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
                        <div className="columns-1 md:columns-2 lg:columns-3 gap-4 space-y-4">
                            {album.images.map((image, i) => (
                                <motion.div
                                    key={image.id}
                                    initial={{ opacity: 0, y: 20 }}
                                    animate={{ opacity: 1, y: 0 }}
                                    transition={{ duration: 0.4, delay: i * 0.06 }}
                                    className="break-inside-avoid group cursor-zoom-in relative overflow-hidden rounded-2xl bg-muted"
                                    onClick={() => setImageParam(image.id)}
                                >
                                    <GalleryThumb
                                        src={toGalleryThumbUrl(image.url)}
                                        alt={image.title || 'Album image'}
                                        width={800}
                                        height={600}
                                        wrapperClassName="w-full"
                                        imageClassName="transition-transform duration-500 group-hover:scale-105"
                                        sizes="(max-width: 768px) 100vw, (max-width: 1200px) 50vw, 33vw"
                                    />

                                    {/* Zoom icon */}
                                    <div className="absolute inset-0 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity duration-300">
                                        <div className="bg-background/80 backdrop-blur-sm p-3 rounded-full text-foreground shadow-lg scale-75 group-hover:scale-100 transition-transform duration-300">
                                            <ZoomIn className="h-5 w-5" />
                                        </div>
                                    </div>

                                    {/* Always-visible bottom label */}
                                    <div className="absolute inset-x-0 bottom-0 bg-gradient-to-t from-black/75 via-black/30 to-transparent px-4 pb-4 pt-12">
                                        <p className="mb-0.5 font-mono text-[11px] font-medium uppercase tracking-widest text-white/60">
                                            {String(i + 1).padStart(2, '0')}
                                        </p>
                                        {image.title && (
                                            <h3 className="line-clamp-1 text-sm font-semibold text-white">
                                                {image.title}
                                            </h3>
                                        )}
                                    </div>
                                </motion.div>
                            ))}
                        </div>
                    )}
                    </section>
                </motion.div>
            </main>

            <Lightbox
                open={isLightboxOpen}
                index={isLightboxOpen ? selectedIndex : 0}
                close={() => setImageParam(null)}
                slides={slides}
                plugins={[Zoom, Thumbnails, Captions, Fullscreen, Counter]}
                animation={{ fade: 0 }}
                controller={{ closeOnBackdropClick: true }}
                captions={{ descriptionTextAlign: 'center' }}
                carousel={{ finite: true }}
                counter={{ container: { style: { top: "unset", bottom: 0 } } }}
                toolbar={{
                    buttons: [
                        "fullscreen",
                        <button
                            key="share-image"
                            type="button"
                            className="yarl__button"
                            title="Share image"
                            aria-label="Share image"
                            onClick={handleShareCurrentImage}
                        >
                            <Share2 className="h-5 w-5" />
                        </button>,
                        "close",
                    ],
                }}
                on={{
                    view: ({ index }) => {
                        const imageId = album.images[index]?.id;
                        if (imageId) {
                            setImageParam(imageId);
                        }
                    },
                }}
            />

            {album.contentId && (
                <section className="px-4 pb-16">
                    <div className="container mx-auto max-w-5xl">
                        <CommentSection contentId={album.contentId} />
                    </div>
                </section>
            )}
        </div>
    );
}
