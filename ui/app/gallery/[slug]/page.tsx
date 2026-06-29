'use client';

import { useCallback, useEffect, useState } from 'react';
import { useParams, usePathname, useRouter, useSearchParams } from 'next/navigation';
import Link from 'next/link';
import { Button } from '@/components/ui/button';
import { Skeleton } from '@/components/ui/skeleton';
import { ArrowLeft, Calendar, ImageIcon, MessageSquare, RefreshCw, Share2, ZoomIn } from 'lucide-react';
import { galleryService } from '@/lib/api/gallery.service';
import { adminGalleryService } from '@/lib/api/admin-gallery.service';
import { AlbumWithImages } from '@/lib/api/gallery.types';
import { ApiError } from '@/lib/api/types';
import { motion } from 'framer-motion';
import { toast } from 'sonner';
import { useUser } from '@/contexts/UserContext';
import { applyCacheBustingParam } from '@/lib/cacheBust';

import { CommentSection } from '@/components/comments/CommentSection';
import { GalleryThumb } from '@/components/gallery/gallery-thumb';
import { LikeButton } from '@/components/likes/LikeButton';
import { Badge } from '@/components/ui/badge';
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
import "yet-another-react-lightbox/plugins/counter.css";

const PHONE_LIGHTBOX_THUMBNAILS_QUERY = "(max-width: 640px)";

function usePhoneLightboxThumbnails() {
    const [isPhone, setIsPhone] = useState(false);

    useEffect(() => {
        if (typeof window === "undefined" || typeof window.matchMedia !== "function") {
            return;
        }

        const mediaQuery = window.matchMedia(PHONE_LIGHTBOX_THUMBNAILS_QUERY);
        const updateIsPhone = () => setIsPhone(mediaQuery.matches);

        updateIsPhone();
        mediaQuery.addEventListener("change", updateIsPhone);

        return () => {
            mediaQuery.removeEventListener("change", updateIsPhone);
        };
    }, []);

    return isPhone;
}

export default function AlbumDetailPage() {
    const params = useParams();
    const slug = params.slug as string;
    const router = useRouter();
    const pathname = usePathname();
    const searchParams = useSearchParams();
    const isPhoneLightbox = usePhoneLightboxThumbnails();

    const { user } = useUser();
    const isAdmin = user?.role === 'admin';

    const [album, setAlbum] = useState<AlbumWithImages | null>(null);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);
    const [imageVersions, setImageVersions] = useState<Record<string, number>>({});

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

    // Re-show the loading state when navigating to a different album.
    const [loadedSlug, setLoadedSlug] = useState(slug);
    if (slug !== loadedSlug) {
        setLoadedSlug(slug);
        setLoading(true);
        setError(null);
    }

    useEffect(() => {
        if (!slug) return;
        void (async () => {
            await loadAlbum();
        })();
    }, [slug, loadAlbum]);

    const handleImageRefresh = async (e: React.MouseEvent, imageId: string) => {
        e.stopPropagation();
        setImageVersions(prev => ({ ...prev, [imageId]: Date.now() }));
        try {
            await adminGalleryService.evictImageCache(imageId);
            await adminGalleryService.invalidateCache();
            toast.success('Cache cleared');
        } catch {
            toast.error('Failed to clear cache');
        }
    };

    const formatDate = (dateString: string) => {
        return new Date(dateString).toLocaleDateString('en-US', {
            year: 'numeric',
            month: 'long',
            day: 'numeric'
        });
    };

    const slides = album?.images.map(image => ({
        src: image.url,
        thumbnail: toGalleryThumbUrl(image.url),
        title: image.title,
        description: image.description
    })) ?? [];

    const selectedImageId = searchParams.get('image');
    const selectedIndex = selectedImageId && album
        ? album.images.findIndex((image) => image.id === selectedImageId)
        : -1;
    const isLightboxOpen = selectedIndex >= 0;
    const selectedImage = isLightboxOpen && album ? album.images[selectedIndex] : null;

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
            <div className="relative overflow-hidden border-b border-border/30 px-6 pb-10 pt-28 md:px-10 md:pb-14 md:pt-32">
                <div className="absolute right-0 top-0 h-[28rem] w-[28rem] -translate-y-1/2 translate-x-1/3 rounded-full bg-primary/6 blur-3xl" />
                <div className="mx-auto max-w-5xl relative">
                    <div className="flex items-center gap-3 mb-5">
                        <Button variant="ghost" size="sm" asChild className="rounded-full border border-border/60 bg-background/60 px-4 backdrop-blur-sm hover:bg-background/90">
                            <Link href="/gallery">
                                <ArrowLeft className="mr-2 h-4 w-4" />
                                Back to Gallery
                            </Link>
                        </Button>
                    </div>
                    <Badge variant="secondary" className="w-fit gap-2 rounded-full border-border/50 bg-background/55 px-4 py-1.5 text-sm font-normal backdrop-blur-sm">
                        <ImageIcon className="h-3.5 w-3.5 text-primary" />
                        Creative Showcase
                    </Badge>
                    <h1 className="mt-5 text-5xl font-bold tracking-tight md:text-6xl">{album.name}</h1>
                    {album.description && (
                        <p className="mt-3 text-lg leading-relaxed text-muted-foreground">{album.description}</p>
                    )}
                    {album.authors.length > 0 && (
                        <p className="mt-2 text-sm text-muted-foreground">
                            By {album.authors.map((a) => a.displayName || a.username).join(', ')}
                        </p>
                    )}
                    <div className="mt-5 flex flex-wrap items-center gap-3 text-sm text-muted-foreground">
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
                </div>
            </div>

            <main className="flex-1 px-4 pb-16 pt-8 md:px-8 md:pt-10">
                <motion.div
                    initial={{ opacity: 0, y: 20 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ duration: 0.5 }}
                    className="mx-auto max-w-5xl pt-4"
                >
                    <section>
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
                        <div className="columns-1 gap-2 space-y-2 sm:gap-3 sm:space-y-3 md:columns-2 md:gap-4 md:space-y-4 lg:columns-3">
                            {album.images.map((image, i) => (
                                <motion.div
                                    key={image.id}
                                    initial={{ opacity: 0, y: 20 }}
                                    animate={{ opacity: 1, y: 0 }}
                                    transition={{ duration: 0.4, delay: i * 0.06 }}
                                    className="break-inside-avoid group relative overflow-hidden rounded-xl bg-muted sm:rounded-2xl"
                                >
                                    <GalleryThumb
                                        src={applyCacheBustingParam(toGalleryThumbUrl(image.url), imageVersions[image.id]) ?? toGalleryThumbUrl(image.url)}
                                        alt={image.title || 'Album image'}
                                        width={800}
                                        height={600}
                                        wrapperClassName="w-full"
                                        imageClassName="transition-transform duration-500 group-hover:scale-105"
                                        sizes="(max-width: 768px) 100vw, (max-width: 1200px) 50vw, 33vw"
                                    />

                                    {/* Zoom icon */}
                                    <button
                                        type="button"
                                        className="absolute inset-0 z-[1] cursor-zoom-in text-left focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 focus-visible:ring-offset-background"
                                        aria-label={`Open ${image.title || `image ${i + 1}`} in gallery viewer`}
                                        onClick={() => setImageParam(image.id)}
                                    >
                                        <span className="sr-only">Open image</span>
                                    </button>
                                    <div className="pointer-events-none absolute inset-0 z-[2] flex items-center justify-center opacity-0 transition-opacity duration-300 group-hover:opacity-100 group-focus-within:opacity-100">
                                        <div className="bg-background/80 backdrop-blur-sm p-3 rounded-full text-foreground shadow-lg scale-75 group-hover:scale-100 transition-transform duration-300">
                                            <ZoomIn className="h-5 w-5" />
                                        </div>
                                    </div>

                                    {/* Admin-only cache refresh button */}
                                    {isAdmin && (
                                        <button
                                            type="button"
                                            className="absolute top-2 right-2 z-10 bg-background/80 backdrop-blur-sm p-1.5 rounded-full text-foreground shadow-md opacity-0 transition-opacity duration-300 hover:bg-background group-hover:opacity-100 group-focus-within:opacity-100"
                                            title="Refresh image cache"
                                            onClick={(e) => handleImageRefresh(e, image.id)}
                                        >
                                            <RefreshCw className="h-3.5 w-3.5" />
                                        </button>
                                    )}

                                    {/* Always-visible bottom label */}
                                    <div className="pointer-events-none absolute inset-x-0 bottom-0 z-[2] bg-gradient-to-t from-black/75 via-black/30 to-transparent px-3 pb-3 pt-10 sm:px-4 sm:pb-4 sm:pt-12">
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
                className="jass-gallery-lightbox"
                open={isLightboxOpen}
                index={isLightboxOpen ? selectedIndex : 0}
                close={() => setImageParam(null)}
                slides={slides}
                plugins={[Zoom, Thumbnails, Captions, Fullscreen, Counter]}
                animation={{ fade: 0 }}
                controller={{ closeOnBackdropClick: true }}
                captions={{ descriptionTextAlign: 'center' }}
                carousel={{ finite: true }}
                thumbnails={{
                    position: "bottom",
                    width: isPhoneLightbox ? 70 : 104,
                    height: isPhoneLightbox ? 50 : 70,
                    border: 1,
                    borderRadius: isPhoneLightbox ? 8 : 10,
                    padding: isPhoneLightbox ? 2 : 3,
                    gap: isPhoneLightbox ? 6 : 10,
                    imageFit: "cover",
                    vignette: true,
                    hidden: false,
                    showToggle: false,
                }}
                counter={{ container: { style: { top: 0, bottom: "unset" } } }}
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
                        if (imageId && imageId !== selectedImageId) {
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
