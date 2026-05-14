"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import NextImage from "next/image";
import { useSearchParams } from "next/navigation";
import { motion, type Variants } from "framer-motion";
import { ArrowUpRight, BookOpen, Clock3, Disc3, Folder, Headphones, Image as GalleryIcon, Info, Layers, Mail, Music, Play, Radio, Sparkles } from "lucide-react";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { useTrackPlayer } from "@/hooks/use-audio-player";
import projects from "@/data/projects";
import blogService from "@/lib/api/blog.service";
import { type BlogListItem } from "@/lib/api/blog.types";
import galleryService from "@/lib/api/gallery.service";
import { type Album } from "@/lib/api/gallery.types";
import { musicService } from "@/lib/api/music.service";
import { type MusicTrack } from "@/lib/api/music.types";
import { getVersionedGalleryCoverUrl } from "@/lib/gallery-media";
import { type MusicContentPayload } from "@/lib/music-content.types";

const containerVariants: Variants = {
    hidden: { opacity: 0 },
    visible: {
        opacity: 1,
        transition: { duration: 0.35, staggerChildren: 0.08 },
    },
};

const itemVariants: Variants = {
    hidden: { opacity: 0, y: 16 },
    visible: { opacity: 1, y: 0, transition: { duration: 0.45, ease: [0.22, 1, 0.36, 1] } },
};

const defaultLinks = [
    { href: "/about", label: "About", icon: Info },
    { href: "/projects", label: "Projects", icon: Folder },
    { href: "/blog", label: "Blog", icon: BookOpen },
    { href: "/gallery", label: "Gallery", icon: GalleryIcon },
    { href: "/music", label: "Music", icon: Music },
];

const resumeLinks = [
    { href: "/about", label: "About", icon: Info },
    { href: "/projects", label: "Projects", icon: Folder },
    { href: "/services", label: "Services", icon: Layers },
    { href: "/contact", label: "Contact", icon: Mail },
];

export default function HomePage() {
    const searchParams = useSearchParams();
    const isResumeRef = searchParams.get("ref") === "resume";
    const links = isResumeRef ? resumeLinks : defaultLinks;
    const { playTrack } = useTrackPlayer();
    const [recentGalleries, setRecentGalleries] = useState<Album[]>([]);
    const [galleryTotal, setGalleryTotal] = useState(0);
    const [galleryLoading, setGalleryLoading] = useState(true);
    const [galleryError, setGalleryError] = useState<string | null>(null);
    const [recentBlogs, setRecentBlogs] = useState<BlogListItem[]>([]);
    const [blogTotal, setBlogTotal] = useState(0);
    const [blogLoading, setBlogLoading] = useState(true);
    const [blogError, setBlogError] = useState<string | null>(null);
    const [musicTracks, setMusicTracks] = useState<MusicTrack[]>([]);
    const [musicLoading, setMusicLoading] = useState(true);
    const [musicError, setMusicError] = useState<string | null>(null);
    const [playingTrackId, setPlayingTrackId] = useState<string | null>(null);

    const latestBlog = recentBlogs[0] ?? null;
    const latestGallery = recentGalleries[0] ?? null;
    const latestGalleryCover = latestGallery ? getVersionedGalleryCoverUrl(latestGallery) : null;
    const featuredTrack = useMemo(() => {
        const playableTracks = musicTracks.filter((track) => track.hasPlayableSource);
        const candidates = playableTracks.length > 0 ? playableTracks : musicTracks;

        return [...candidates]
            .sort((a, b) => {
                const featuredSort = Number(b.featured) - Number(a.featured);
                if (featuredSort !== 0) return featuredSort;
                return new Date(b.releaseDate).getTime() - new Date(a.releaseDate).getTime();
            })[0] ?? null;
    }, [musicTracks]);
    const contentStats = [
        { label: "Albums", value: galleryLoading ? "..." : galleryTotal, icon: GalleryIcon },
        { label: "Tracks", value: musicLoading ? "..." : musicTracks.length, icon: Headphones },
        { label: "Projects", value: projects.length, icon: Folder },
        { label: "Posts", value: blogLoading ? "..." : blogTotal, icon: BookOpen },
    ];

    useEffect(() => {
        void loadRecentGalleries();
        void loadRecentBlogs();
        void loadRecentMusic();
    }, []);

    const loadRecentGalleries = async () => {
        try {
            setGalleryLoading(true);
            setGalleryError(null);
            const albums = await galleryService.getAllAlbums();
            setGalleryTotal(albums.length);
            const sortedAlbums = [...albums]
                .sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime())
                .slice(0, 5);
            setRecentGalleries(sortedAlbums);
        } catch (error) {
            const message = error instanceof Error
                ? error.message
                : "Unable to load galleries right now.";
            setGalleryError(message);
            console.error("Failed to load recent galleries:", error);
        } finally {
            setGalleryLoading(false);
        }
    };

    const loadRecentBlogs = async () => {
        try {
            setBlogLoading(true);
            setBlogError(null);
            const [displayBlogs, allBlogs] = await Promise.all([
                blogService.getBlogs({ page: 1, pageSize: 5 }),
                blogService.getBlogs(),
            ]);
            setBlogTotal(allBlogs.length);
            const sortedBlogs = [...displayBlogs]
                .sort((a, b) => {
                    const left = new Date(a.publishedAt ?? a.createdAt).getTime();
                    const right = new Date(b.publishedAt ?? b.createdAt).getTime();
                    return right - left;
                })
                .slice(0, 4);
            setRecentBlogs(sortedBlogs);
        } catch (error) {
            const message = error instanceof Error
                ? error.message
                : "Unable to load blog posts right now.";
            setBlogError(message);
            console.error("Failed to load recent blogs:", error);
        } finally {
            setBlogLoading(false);
        }
    };

    const loadRecentMusic = async () => {
        try {
            setMusicLoading(true);
            setMusicError(null);
            const response = await fetch('/api/music-content', {
                method: 'GET',
                cache: 'no-store',
            });
            if (!response.ok) {
                throw new Error('Failed to load music content.');
            }

            const payload = (await response.json()) as MusicContentPayload;
            setMusicTracks(payload.tracks);
        } catch (error) {
            const message = error instanceof Error
                ? error.message
                : "Unable to load music right now.";
            setMusicError(message);
            console.error("Failed to load recent music:", error);
        } finally {
            setMusicLoading(false);
        }
    };

    const formatArtists = (track: MusicTrack) => {
        const artists = track.authors
            .map((author) => author.displayName || author.username)
            .filter(Boolean);

        return artists.length > 0 ? artists.join(", ") : "JSM33T";
    };

    const formatCategory = (category: string) => category
        .replace(/[-/]+/g, " ")
        .split(" ")
        .filter(Boolean)
        .map((part) => part.charAt(0).toUpperCase() + part.slice(1))
        .join(" ");

    const handlePlayTrack = async (track: MusicTrack) => {
        if (!track.hasPlayableSource) return;

        try {
            setPlayingTrackId(track.id);
            const playLink = await musicService.createPlayLink(track.id);
            playTrack({
                title: track.title,
                artist: formatArtists(track),
                playFile: playLink.streamUrl,
            });
        } catch (error) {
            console.error("Failed to generate play link:", error);
        } finally {
            setPlayingTrackId(null);
        }
    };

    return (
        <div className="relative min-h-screen overflow-hidden bg-background text-foreground">
            <div className="pointer-events-none absolute inset-0">
                <div className="absolute -top-28 left-1/2 h-[34rem] w-[34rem] -translate-x-1/2 rounded-full bg-primary/12 blur-3xl" />
                <div className="absolute top-[24%] -left-32 h-80 w-80 rounded-full bg-accent/14 blur-3xl" />
                <div className="absolute top-[34%] -right-28 h-72 w-72 rounded-full bg-secondary/18 blur-3xl" />
                <div className="absolute inset-0 bg-[radial-gradient(circle_at_50%_28%,color-mix(in_oklch,var(--primary)_10%,transparent),transparent_62%)]" />
                <div className="absolute inset-0 bg-[linear-gradient(to_bottom,color-mix(in_oklch,var(--background)_8%,transparent),color-mix(in_oklch,var(--background)_100%,transparent)_82%)]" />
                <div className="absolute inset-0 bg-[linear-gradient(to_right,color-mix(in_oklch,var(--border)_10%,transparent)_1px,transparent_1px),linear-gradient(to_bottom,color-mix(in_oklch,var(--border)_10%,transparent)_1px,transparent_1px)] bg-[size:60px_60px] [mask-image:radial-gradient(ellipse_at_center,white,transparent_76%)]" />
                <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_center,transparent_54%,color-mix(in_oklch,var(--background)_88%,transparent)_97%)]" />
            </div>

            <main className="relative mx-auto max-w-6xl px-6">
                <motion.div variants={containerVariants} initial="hidden" animate="visible">
                    <motion.section
                        className="relative flex min-h-[calc(100svh-4.25rem)] w-full flex-col items-center justify-center gap-10 pb-8 pt-8 md:flex-row md:items-center md:gap-16 md:pb-10 md:pt-10"
                        variants={itemVariants}
                    >
                        {/* ── Left: text ── */}
                        <div className="flex w-full flex-col items-center gap-7 text-center md:flex-1 md:items-start md:text-left">
                            {/* Badge */}
                            <div className="inline-flex items-center gap-2.5 rounded-full border border-border/60 bg-card/60 px-4 py-1.5 text-sm text-muted-foreground backdrop-blur-sm">
                                <span className="flex h-5 w-5 items-center justify-center rounded-full bg-primary text-primary-foreground">
                                    <ArrowUpRight className="h-3 w-3" />
                                </span>
                                Software Engineer &amp; Wanderer
                            </div>

                            {/* Heading */}
                            <h1 className="text-5xl font-bold leading-[1.05] tracking-tight sm:text-6xl md:text-7xl">
                                <span className="text-primary">Jassi&apos;s</span>
                                <br />
                                <span>Webspace</span>
                            </h1>

                            {/* Description */}
                            <p className="max-w-md text-base leading-relaxed text-muted-foreground sm:text-lg">
                                Music, writing, visuals, and background details all sit in one simple flow.
                            </p>

                            {/* CTAs */}
                            <div className="flex flex-wrap justify-center gap-3 md:justify-start">
                                <Button asChild size="lg" className="rounded-full px-7">
                                    <Link href="/about">
                                        Explore
                                        <ArrowUpRight className="ml-2 h-4 w-4" />
                                    </Link>
                                </Button>
                                <Button asChild size="lg" variant="secondary" className="rounded-full px-7">
                                    <Link href="/gallery">
                                        <GalleryIcon className="mr-2 h-4 w-4" />
                                        View Gallery
                                    </Link>
                                </Button>
                            </div>

                            {/* Nav pills — mobile only */}
                            <div className="flex flex-wrap justify-center gap-2 md:hidden">
                                {links.map((item) => {
                                    const Icon = item.icon;
                                    return (
                                        <Link
                                            key={item.href}
                                            href={item.href}
                                            className="inline-flex items-center gap-1.5 rounded-full border bg-card/70 px-3 py-1.5 text-xs text-muted-foreground transition-colors hover:text-foreground"
                                        >
                                            <Icon className="h-3.5 w-3.5" />
                                            {item.label}
                                        </Link>
                                    );
                                })}
                            </div>
                        </div>

                        {/* ── Right: live content bento — desktop only ── */}
                        <div className="hidden h-[460px] flex-1 grid-cols-2 grid-rows-[1fr_1.08fr] gap-3 md:grid">
                            <Link
                                href={latestBlog ? `/blog/${latestBlog.slug}` : "/blog"}
                                className="group relative overflow-hidden rounded-2xl border border-border/60 bg-card/80 shadow-sm backdrop-blur-sm transition-all duration-300 hover:-translate-y-0.5 hover:shadow-xl"
                            >
                                {latestBlog?.featuredImage ? (
                                    <NextImage
                                        src={latestBlog.featuredImage}
                                        alt={latestBlog.title}
                                        fill
                                        sizes="(max-width: 768px) 100vw, 25vw"
                                        className="object-cover transition-transform duration-500 group-hover:scale-105"
                                        priority
                                    />
                                ) : (
                                    <div className="h-full w-full bg-[radial-gradient(circle_at_22%_18%,color-mix(in_oklch,var(--primary)_34%,transparent),transparent_54%),radial-gradient(circle_at_82%_76%,color-mix(in_oklch,var(--secondary)_28%,transparent),transparent_58%),linear-gradient(145deg,var(--muted),var(--card))]" />
                                )}
                                <div className="absolute inset-0 bg-gradient-to-t from-black/82 via-black/25 to-black/5" />
                                <div className="absolute inset-x-0 bottom-0 p-4">
                                    <p className="mb-1 flex items-center gap-1.5 text-[10px] font-medium uppercase tracking-widest text-white/65">
                                        <BookOpen className="h-3 w-3" />
                                        Latest Note
                                    </p>
                                    <h2 className="line-clamp-2 text-sm font-semibold leading-snug text-white">
                                        {blogLoading ? "Loading the newest post" : latestBlog?.title ?? "Writing lives here"}
                                    </h2>
                                </div>
                            </Link>

                            <div className="relative overflow-hidden rounded-2xl border border-border/60 bg-card/80 p-5 shadow-sm backdrop-blur-sm">
                                <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(circle_at_18%_18%,color-mix(in_oklch,var(--primary)_20%,transparent),transparent_42%),radial-gradient(circle_at_82%_76%,color-mix(in_oklch,var(--accent)_14%,transparent),transparent_48%)]" />
                                <div className="relative flex h-full flex-col justify-between">
                                    <div className="flex items-center justify-between">
                                        <span className="rounded-full border border-border/60 bg-background/60 px-3 py-1 text-[10px] font-medium uppercase tracking-widest text-muted-foreground">
                                            Scale
                                        </span>
                                        <Sparkles className="h-4 w-4 text-primary" />
                                    </div>
                                    <div>
                                        <div className="text-5xl font-semibold tracking-tight text-primary">
                                            {galleryLoading ? "..." : galleryTotal}
                                        </div>
                                        <p className="mt-1 text-sm font-medium">visual albums</p>
                                        <p className="mt-2 text-xs leading-relaxed text-muted-foreground">
                                            plus {musicLoading ? "..." : musicTracks.length} tracks, {projects.length} projects, and {blogLoading ? "..." : blogTotal} posts.
                                        </p>
                                    </div>
                                </div>
                            </div>

                            <Link
                                href={latestGallery ? `/gallery/${latestGallery.slug}` : "/gallery"}
                                className="group relative col-span-2 overflow-hidden rounded-2xl border border-border/50 bg-muted shadow-xl transition-all duration-300 hover:-translate-y-0.5 hover:shadow-2xl"
                            >
                                {!galleryLoading && latestGallery && latestGalleryCover ? (
                                    <NextImage
                                        src={latestGalleryCover}
                                        alt={latestGallery.name}
                                        fill
                                        sizes="(max-width: 768px) 100vw, 50vw"
                                        className="object-cover transition-transform duration-500 group-hover:scale-105"
                                        priority
                                    />
                                ) : (
                                    <div className="h-full w-full bg-[radial-gradient(circle_at_30%_30%,color-mix(in_oklch,var(--primary)_40%,transparent),transparent_60%),linear-gradient(145deg,var(--muted),var(--card))]" />
                                )}
                                <div className="absolute inset-0 bg-gradient-to-t from-black/82 via-black/18 to-transparent" />
                                <div className="absolute left-4 top-4 rounded-full border border-white/20 bg-black/40 px-3 py-1 text-[11px] font-semibold text-white backdrop-blur-sm">
                                    Gallery cover
                                </div>
                                <div className="absolute inset-x-0 bottom-0 px-5 pb-5 pt-12">
                                    <p className="mb-1 font-mono text-[10px] font-medium uppercase tracking-widest text-white/60">
                                        {galleryLoading ? "Loading" : `${latestGallery?.imageCount ?? 0} images`}
                                    </p>
                                    <p className="line-clamp-1 text-lg font-semibold text-white">
                                        {latestGallery?.name ?? "Recent visual work"}
                                    </p>
                                </div>
                            </Link>
                        </div>

                        {/* Scroll indicator */}
                        <motion.div
                            variants={itemVariants}
                            className="pointer-events-none absolute bottom-7 left-1/2 hidden -translate-x-1/2 flex-col items-center gap-2 text-[10px] font-medium uppercase tracking-[0.28em] text-muted-foreground/80 md:flex"
                        >
                            <motion.span
                                animate={{ opacity: [0.55, 1, 0.55], y: [0, 2, 0] }}
                                transition={{ duration: 1.8, repeat: Infinity, ease: "easeInOut" }}
                            >
                                Scroll to explore
                            </motion.span>
                            <div className="flex h-12 w-7 items-start justify-center rounded-full border border-border/70 bg-background/70 p-1 shadow-sm backdrop-blur-sm">
                                <motion.span
                                    className="block h-2.5 w-2.5 rounded-full bg-primary"
                                    animate={{ y: [0, 24, 0], opacity: [0.45, 1, 0.45], scale: [0.9, 1, 0.9] }}
                                    transition={{ duration: 1.5, repeat: Infinity, ease: "easeInOut" }}
                                />
                            </div>
                        </motion.div>
                    </motion.section>

                    <motion.section variants={itemVariants} className="pb-8 md:pb-10">
                        <div className="grid overflow-hidden rounded-2xl border border-border/60 bg-card/55 backdrop-blur-sm sm:grid-cols-4">
                            {contentStats.map((stat) => {
                                const Icon = stat.icon;
                                return (
                                    <Link
                                        key={stat.label}
                                        href={
                                            stat.label === "Albums"
                                                ? "/gallery"
                                                : stat.label === "Tracks"
                                                    ? "/music"
                                                    : stat.label === "Projects"
                                                        ? "/projects"
                                                        : "/blog"
                                        }
                                        className="group flex min-h-28 items-center gap-4 border-b border-border/60 px-5 py-6 transition-colors hover:bg-background/50 sm:border-b-0 sm:border-r sm:last:border-r-0 md:min-h-32 md:px-6"
                                    >
                                        <span className="flex h-11 w-11 shrink-0 items-center justify-center rounded-full border border-border/60 bg-background/65 text-muted-foreground transition-colors group-hover:text-foreground">
                                            <Icon className="h-5 w-5" />
                                        </span>
                                        <span className="min-w-0">
                                            <span className="block text-2xl font-semibold leading-none">{stat.value}</span>
                                            <span className="mt-2 block text-xs uppercase tracking-wide text-muted-foreground">{stat.label}</span>
                                        </span>
                                    </Link>
                                );
                            })}
                        </div>
                    </motion.section>

                    <motion.section variants={itemVariants} className="pb-16 md:pb-24">
                        <div className="relative overflow-hidden rounded-3xl border bg-card/65 p-6 backdrop-blur-sm md:p-8">
                            <div className="pointer-events-none absolute inset-0">
                                <div className="absolute inset-0 bg-[radial-gradient(circle_at_18%_24%,color-mix(in_oklch,var(--primary)_18%,transparent),transparent_42%),radial-gradient(circle_at_86%_72%,color-mix(in_oklch,var(--secondary)_14%,transparent),transparent_50%)]" />
                                <div className="absolute inset-0 bg-[linear-gradient(to_right,color-mix(in_oklch,var(--border)_12%,transparent)_1px,transparent_1px),linear-gradient(to_bottom,color-mix(in_oklch,var(--border)_12%,transparent)_1px,transparent_1px)] bg-[size:24px_24px] opacity-45" />
                                <div className="absolute inset-0 bg-[linear-gradient(145deg,color-mix(in_oklch,var(--background)_12%,transparent),transparent_62%)]" />
                            </div>

                            <div className="relative">
                                <div className="mb-6 flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
                                    <div className="space-y-3">
                                        <Badge variant="secondary" className="w-fit rounded-full px-4 py-1.5">
                                            Fresh Visuals
                                        </Badge>
                                        <h2 className="text-balance text-3xl font-semibold tracking-tight md:text-4xl">
                                            Recent Gallery Picks
                                        </h2>
                                        <p className="max-w-2xl text-sm text-muted-foreground md:text-base">
                                            Latest captures and curated moments from the visual collection.
                                        </p>
                                    </div>
                                    <Button asChild variant="secondary" className="rounded-full px-6">
                                        <Link href="/gallery">
                                            Discover all galleries
                                            <ArrowUpRight className="ml-2 h-4 w-4" />
                                        </Link>
                                    </Button>
                                </div>

                                {galleryLoading && (
                                    <div className="grid grid-cols-1 gap-3 md:grid-cols-4 md:grid-rows-2">
                                        <div className="relative overflow-hidden rounded-3xl border bg-background/60 md:col-span-2 md:row-span-2">
                                            <Skeleton className="aspect-[16/11] w-full rounded-none md:aspect-auto md:h-full" />
                                        </div>
                                        {Array.from({ length: 4 }).map((_, index) => (
                                            <div key={index} className="relative overflow-hidden rounded-3xl border bg-background/60">
                                                <Skeleton className="aspect-[4/3] w-full rounded-none" />
                                            </div>
                                        ))}
                                    </div>
                                )}

                                {!galleryLoading && galleryError && (
                                    <div className="rounded-2xl border bg-background/60 px-5 py-10 text-center">
                                        <p className="text-sm text-muted-foreground">{galleryError}</p>
                                        <Button onClick={() => void loadRecentGalleries()} variant="outline" className="mt-4 rounded-full">
                                            Retry
                                        </Button>
                                    </div>
                                )}

                                {!galleryLoading && !galleryError && recentGalleries.length === 0 && (
                                    <div className="rounded-2xl border bg-background/60 px-5 py-10 text-center">
                                        <p className="text-sm text-muted-foreground">No galleries available yet.</p>
                                    </div>
                                )}

                                {!galleryLoading && !galleryError && recentGalleries.length > 0 && (
                                    <div className="grid grid-cols-1 gap-3 md:grid-cols-4 md:grid-rows-2">
                                        {recentGalleries.map((album, index) => {
                                            const isFeature = index === 0;
                                            const coverUrl = getVersionedGalleryCoverUrl(album);
                                            return (
                                                <Link
                                                    key={album.id}
                                                    href={`/gallery/${album.slug}`}
                                                    className={[
                                                        "group relative block overflow-hidden rounded-3xl border bg-background/65 transition-all duration-300 hover:-translate-y-0.5 hover:shadow-xl",
                                                        isFeature ? "md:col-span-2 md:row-span-2" : "",
                                                    ].join(" ")}
                                                >
                                                    <div className={isFeature ? "relative aspect-[16/11] md:h-full md:aspect-auto" : "relative aspect-[4/3]"}>
                                                        {coverUrl ? (
                                                            <NextImage
                                                                src={coverUrl}
                                                                alt={album.name}
                                                                fill
                                                                sizes={isFeature ? "(max-width: 768px) 100vw, 50vw" : "(max-width: 768px) 100vw, 25vw"}
                                                                className="object-cover transition-transform duration-500 group-hover:scale-105"
                                                            />
                                                        ) : (
                                                            <div className="relative h-full w-full bg-[radial-gradient(circle_at_20%_20%,color-mix(in_oklch,var(--primary)_42%,transparent),transparent_54%),radial-gradient(circle_at_82%_76%,color-mix(in_oklch,var(--secondary)_36%,transparent),transparent_58%),linear-gradient(140deg,color-mix(in_oklch,var(--muted)_80%,transparent),var(--card))]" />
                                                        )}
                                                    </div>

                                                    <div className="absolute inset-x-0 bottom-0 bg-gradient-to-t from-black/75 via-black/30 to-transparent px-4 pb-4 pt-12 md:px-5 md:pb-5">
                                                        <p className="mb-0.5 font-mono text-[10px] font-medium uppercase tracking-widest text-white/60">
                                                            {String(index + 1).padStart(2, '0')}
                                                        </p>
                                                        <h3 className="line-clamp-1 text-base font-semibold text-white md:text-lg">
                                                            {album.name}
                                                        </h3>
                                                    </div>
                                                </Link>
                                            );
                                        })}
                                    </div>
                                )}
                            </div>
                        </div>
                    </motion.section>

                    <motion.section variants={itemVariants} className="pb-16 md:pb-24">
                        <div className="relative overflow-hidden rounded-3xl border bg-card/70 p-4 shadow-sm backdrop-blur-sm md:p-5">
                            <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(circle_at_12%_18%,color-mix(in_oklch,var(--primary)_18%,transparent),transparent_38%),radial-gradient(circle_at_86%_70%,color-mix(in_oklch,var(--secondary)_16%,transparent),transparent_48%)]" />
                            <div className="relative grid gap-4 md:grid-cols-[auto_1fr_auto] md:items-center">
                                <Link
                                    href={featuredTrack ? `/music/${featuredTrack.slug}` : "/music"}
                                    className="group relative aspect-square w-full overflow-hidden rounded-2xl border bg-background/65 md:h-28 md:w-28"
                                >
                                    {musicLoading ? (
                                        <Skeleton className="h-full w-full rounded-none" />
                                    ) : featuredTrack?.cover ? (
                                        <NextImage
                                            src={featuredTrack.cover}
                                            alt={featuredTrack.title}
                                            fill
                                            sizes="112px"
                                            className="object-cover transition-transform duration-500 group-hover:scale-105"
                                        />
                                    ) : (
                                        <div className="flex h-full w-full items-center justify-center bg-[radial-gradient(circle_at_30%_24%,color-mix(in_oklch,var(--primary)_38%,transparent),transparent_54%),linear-gradient(145deg,var(--muted),var(--card))]">
                                            <Disc3 className="h-8 w-8 text-white/70" />
                                        </div>
                                    )}
                                    <div className="absolute inset-0 bg-gradient-to-t from-black/55 to-transparent" />
                                </Link>

                                <div className="min-w-0 space-y-3">
                                    <div className="flex flex-wrap items-center gap-2">
                                        <Badge variant="secondary" className="w-fit rounded-full px-3 py-1">
                                            <Radio className="mr-1.5 h-3.5 w-3.5" />
                                            Now Playing
                                        </Badge>
                                        {featuredTrack?.category && (
                                            <span className="rounded-full border border-border/60 bg-background/55 px-3 py-1 text-xs text-muted-foreground">
                                                {formatCategory(featuredTrack.category)}
                                            </span>
                                        )}
                                    </div>
                                    <div>
                                        <h2 className="line-clamp-1 text-2xl font-semibold tracking-tight md:text-3xl">
                                            {musicLoading ? "Loading the music shelf" : featuredTrack?.title ?? "Music shelf"}
                                        </h2>
                                        <p className="mt-1 line-clamp-1 text-sm text-muted-foreground">
                                            {musicError ?? (featuredTrack ? `${formatArtists(featuredTrack)}${featuredTrack.duration ? ` · ${featuredTrack.duration}` : ""}` : "Tracks, remixes, and small audio experiments.")}
                                        </p>
                                    </div>
                                    <div className="flex h-8 items-end gap-1.5" aria-hidden="true">
                                        {[44, 70, 38, 82, 56, 92, 48, 74, 36, 64, 88, 52, 76, 42, 68, 58].map((height, index) => (
                                            <span
                                                key={`${height}-${index}`}
                                                className="w-1.5 rounded-full bg-primary/55"
                                                style={{ height: `${height}%` }}
                                            />
                                        ))}
                                    </div>
                                </div>

                                <div className="flex flex-wrap gap-2 md:justify-end">
                                    <Button
                                        type="button"
                                        size="lg"
                                        className="rounded-full px-6"
                                        disabled={!featuredTrack?.hasPlayableSource || playingTrackId === featuredTrack?.id}
                                        onClick={() => {
                                            if (featuredTrack) {
                                                void handlePlayTrack(featuredTrack);
                                            }
                                        }}
                                    >
                                        <Play className="mr-2 h-4 w-4 fill-current" />
                                        {playingTrackId === featuredTrack?.id ? "Loading..." : "Play"}
                                    </Button>
                                    <Button asChild size="lg" variant="secondary" className="rounded-full px-6">
                                        <Link href="/music">
                                            Open Music
                                            <ArrowUpRight className="ml-2 h-4 w-4" />
                                        </Link>
                                    </Button>
                                </div>
                            </div>
                        </div>
                    </motion.section>

                    <motion.section variants={itemVariants} className="pb-16 md:pb-24">
                        <div className="relative overflow-hidden rounded-3xl border bg-card/65 p-6 backdrop-blur-sm md:p-8">
                            <div className="pointer-events-none absolute inset-0">
                                <div className="absolute inset-0 bg-[radial-gradient(circle_at_16%_20%,color-mix(in_oklch,var(--primary)_16%,transparent),transparent_44%),radial-gradient(circle_at_84%_74%,color-mix(in_oklch,var(--secondary)_12%,transparent),transparent_52%)]" />
                                <div className="absolute inset-0 bg-[linear-gradient(to_right,color-mix(in_oklch,var(--border)_12%,transparent)_1px,transparent_1px),linear-gradient(to_bottom,color-mix(in_oklch,var(--border)_12%,transparent)_1px,transparent_1px)] bg-[size:24px_24px] opacity-45" />
                                <div className="absolute inset-0 bg-[linear-gradient(140deg,color-mix(in_oklch,var(--background)_10%,transparent),transparent_62%)]" />
                            </div>

                            <div className="relative">
                                <div className="mb-6 flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
                                    <div className="space-y-3">
                                        <Badge variant="secondary" className="w-fit rounded-full px-4 py-1.5">
                                            Fresh Writing
                                        </Badge>
                                        <h2 className="text-balance text-3xl font-semibold tracking-tight md:text-4xl">
                                            Recent Blog Picks
                                        </h2>
                                        <p className="max-w-2xl text-sm text-muted-foreground md:text-base">
                                            A visual showcase of my latest articles.
                                        </p>
                                    </div>
                                    <Button asChild variant="secondary" className="rounded-full px-6">
                                        <Link href="/blog">
                                            Discover all blogs
                                            <ArrowUpRight className="ml-2 h-4 w-4" />
                                        </Link>
                                    </Button>
                                </div>

                                {blogLoading && (
                                    <div className="grid grid-cols-1 gap-3 md:grid-cols-2">
                                        <div className="relative overflow-hidden rounded-3xl border bg-background/60">
                                            <Skeleton className="aspect-[16/10] w-full rounded-none" />
                                        </div>
                                        <div className="relative overflow-hidden rounded-3xl border bg-background/60">
                                            <Skeleton className="aspect-[16/10] w-full rounded-none" />
                                        </div>
                                    </div>
                                )}

                                {!blogLoading && blogError && (
                                    <div className="rounded-2xl border bg-background/60 px-5 py-10 text-center">
                                        <p className="text-sm text-muted-foreground">{blogError}</p>
                                        <Button onClick={() => void loadRecentBlogs()} variant="outline" className="mt-4 rounded-full">
                                            Retry
                                        </Button>
                                    </div>
                                )}

                                {!blogLoading && !blogError && recentBlogs.length === 0 && (
                                    <div className="rounded-2xl border bg-background/60 px-5 py-10 text-center">
                                        <p className="text-sm text-muted-foreground">No blogs available yet.</p>
                                    </div>
                                )}

                                {!blogLoading && !blogError && recentBlogs.length > 0 && (
                                    <div className="grid grid-cols-1 gap-3 md:grid-cols-2">
                                        {recentBlogs.map((blog, index) => (
                                            <Link
                                                key={blog.id}
                                                href={`/blog/${blog.slug}`}
                                                className="group relative block overflow-hidden rounded-3xl border bg-background/65 transition-all duration-300 hover:-translate-y-0.5 hover:shadow-xl"
                                            >
                                                <div className="relative aspect-[16/10]">
                                                    {blog.featuredImage ? (
                                                        <NextImage
                                                            src={blog.featuredImage}
                                                            alt={blog.title}
                                                            fill
                                                            sizes="(max-width: 768px) 100vw, 50vw"
                                                            className="object-cover transition-transform duration-500 group-hover:scale-105"
                                                        />
                                                    ) : (
                                                        <div className="relative flex h-full w-full items-center justify-center bg-[radial-gradient(circle_at_20%_20%,color-mix(in_oklch,var(--primary)_42%,transparent),transparent_54%),radial-gradient(circle_at_82%_76%,color-mix(in_oklch,var(--secondary)_36%,transparent),transparent_58%),linear-gradient(140deg,color-mix(in_oklch,var(--muted)_80%,transparent),var(--card))]">
                                                            <BookOpen className="h-8 w-8 text-white/80" />
                                                        </div>
                                                    )}
                                                </div>

                                                <div className="absolute inset-x-0 bottom-0 bg-gradient-to-t from-black/75 via-black/30 to-transparent px-4 pb-4 pt-12 md:px-5 md:pb-5">
                                                    <p className="mb-0.5 font-mono text-[10px] font-medium uppercase tracking-widest text-white/60">
                                                        {String(index + 1).padStart(2, '0')}
                                                        {blog.category && <span className="ml-1">· {blog.category.name}</span>}
                                                    </p>
                                                    <h3 className="line-clamp-1 text-base font-semibold text-white md:text-lg">
                                                        {blog.title}
                                                    </h3>
                                                </div>
                                            </Link>
                                        ))}
                                    </div>
                                )}
                            </div>
                        </div>
                    </motion.section>

                    <motion.section variants={itemVariants} className="pb-16 md:pb-24">
                        <div className="relative overflow-hidden rounded-3xl border bg-card/65 p-6 backdrop-blur-sm md:p-8">
                            <div className="pointer-events-none absolute inset-0">
                                <div className="absolute inset-0 bg-[radial-gradient(circle_at_14%_18%,color-mix(in_oklch,var(--primary)_20%,transparent),transparent_42%),radial-gradient(circle_at_86%_78%,color-mix(in_oklch,var(--secondary)_14%,transparent),transparent_56%)]" />
                                <div className="absolute inset-0 bg-[linear-gradient(to_right,color-mix(in_oklch,var(--border)_14%,transparent)_1px,transparent_1px),linear-gradient(to_bottom,color-mix(in_oklch,var(--border)_14%,transparent)_1px,transparent_1px)] bg-[size:22px_22px] opacity-40" />
                                <div className="absolute inset-0 bg-[linear-gradient(145deg,color-mix(in_oklch,var(--background)_12%,transparent),transparent_58%)]" />
                            </div>

                            <div className="relative grid gap-6 md:grid-cols-[1.05fr_0.95fr] md:items-center">
                                <div className="space-y-4">
                                    <Badge variant="secondary" className="w-fit rounded-full px-4 py-1.5">
                                        Services
                                    </Badge>
                                    <h2 className="max-w-xl text-balance text-3xl font-semibold tracking-tight md:text-4xl">
                                        Need hands-on engineering support?
                                    </h2>
                                    <p className="max-w-xl text-base leading-relaxed text-muted-foreground md:text-lg">
                                        Explore active services across web platforms, automation, and product delivery.
                                        Share your scope and get a clear execution path.
                                    </p>
                                    <div className="flex flex-wrap gap-3">
                                        <Button asChild size="lg" className="rounded-full px-7">
                                            <Link href="/services">
                                                <Layers className="mr-2 h-4 w-4" />
                                                Explore Services
                                                <ArrowUpRight className="ml-2 h-4 w-4" />
                                            </Link>
                                        </Button>
                                        <Button asChild size="lg" variant="secondary" className="rounded-full px-7">
                                            <Link href="/contact?ref=%2Fservices">
                                                <Mail className="mr-2 h-4 w-4" />
                                                Request Service
                                            </Link>
                                        </Button>
                                    </div>
                                </div>

                                <div className="rounded-2xl border bg-background/55 p-5 md:p-6">
                                    <div className="space-y-3">
                                        <p className="text-sm font-medium uppercase tracking-wide text-muted-foreground">
                                            What you can expect
                                        </p>
                                        <div className="space-y-2">
                                            <div className="rounded-xl border bg-card/70 px-4 py-3 text-sm">Clear scope and milestones</div>
                                            <div className="rounded-xl border bg-card/70 px-4 py-3 text-sm">Production-grade implementation</div>
                                            <div className="rounded-xl border bg-card/70 px-4 py-3 text-sm">Reliable communication and delivery</div>
                                        </div>
                                    </div>
                                </div>
                            </div>
                        </div>
                    </motion.section>

                    <motion.section variants={itemVariants} className="pb-16 md:pb-24">
                        <div className="relative overflow-hidden rounded-3xl border bg-card/65 p-6 backdrop-blur-sm md:p-8">
                            <div className="pointer-events-none absolute inset-0">
                                <div className="absolute inset-0 bg-[radial-gradient(circle_at_20%_22%,color-mix(in_oklch,var(--primary)_18%,transparent),transparent_44%),radial-gradient(circle_at_85%_70%,color-mix(in_oklch,var(--secondary)_16%,transparent),transparent_54%)]" />
                                <div className="absolute inset-0 bg-[linear-gradient(to_right,color-mix(in_oklch,var(--border)_18%,transparent)_1px,transparent_1px),linear-gradient(to_bottom,color-mix(in_oklch,var(--border)_18%,transparent)_1px,transparent_1px)] bg-[size:20px_20px] opacity-35" />
                                <div className="absolute inset-0 bg-[linear-gradient(145deg,color-mix(in_oklch,var(--background)_14%,transparent),transparent_60%)]" />
                            </div>

                            <div className="relative grid gap-7 md:grid-cols-[1.08fr_0.92fr] md:items-center">
                                <div className="space-y-4">
                                    <Badge variant="secondary" className="w-fit rounded-full px-4 py-1.5">
                                        Contact
                                    </Badge>
                                    <h2 className="max-w-xl text-balance text-3xl font-semibold tracking-tight md:text-4xl">
                                        Ready to build something meaningful together?
                                    </h2>
                                    <p className="max-w-xl text-base leading-relaxed text-muted-foreground md:text-lg">
                                        If you have a project, collaboration idea, or want to discuss
                                        production-grade execution, let&apos;s connect and shape it end-to-end.
                                    </p>
                                    <Button asChild size="lg" className="rounded-full px-7">
                                        <Link href="/contact">
                                            <Mail className="mr-2 h-4 w-4" />
                                            Start Conversation
                                            <ArrowUpRight className="ml-2 h-4 w-4" />
                                        </Link>
                                    </Button>
                                </div>

                                <div className="rounded-2xl border bg-background/55 p-4 md:p-5">
                                    <div className="grid gap-3">
                                        <div className="flex items-center justify-between gap-4 rounded-xl border bg-card/70 px-4 py-3">
                                            <div className="flex items-center gap-3">
                                                <span className="flex h-9 w-9 items-center justify-center rounded-full border bg-background/70 text-muted-foreground">
                                                    <Clock3 className="h-4 w-4" />
                                                </span>
                                                <div>
                                                    <p className="text-xs uppercase tracking-wide text-muted-foreground">Timezone</p>
                                                    <p className="text-sm font-semibold">IST, UTC+05:30</p>
                                                </div>
                                            </div>
                                        </div>
                                        <div className="flex items-center justify-between gap-4 rounded-xl border bg-card/70 px-4 py-3">
                                            <div className="flex items-center gap-3">
                                                <span className="flex h-9 w-9 items-center justify-center rounded-full border bg-background/70 text-muted-foreground">
                                                    <Mail className="h-4 w-4" />
                                                </span>
                                                <div>
                                                    <p className="text-xs uppercase tracking-wide text-muted-foreground">Response</p>
                                                    <p className="text-sm font-semibold">Usually within 24h</p>
                                                </div>
                                            </div>
                                        </div>
                                        <div className="flex items-center justify-between gap-4 rounded-xl border bg-card/70 px-4 py-3">
                                            <div className="flex items-center gap-3">
                                                <span className="relative flex h-9 w-9 items-center justify-center rounded-full border bg-background/70">
                                                    <span className="h-2.5 w-2.5 rounded-full bg-emerald-500 shadow-[0_0_0_6px_color-mix(in_oklch,var(--primary)_12%,transparent)]" />
                                                </span>
                                                <div>
                                                    <p className="text-xs uppercase tracking-wide text-muted-foreground">Availability</p>
                                                    <p className="text-sm font-semibold">Open to thoughtful work</p>
                                                </div>
                                            </div>
                                            <ArrowUpRight className="h-4 w-4 text-muted-foreground" />
                                        </div>
                                    </div>
                                </div>
                            </div>
                        </div>
                    </motion.section>
                </motion.div>
            </main>
        </div>
    );
}
