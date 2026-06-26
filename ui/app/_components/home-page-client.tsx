"use client";

import { Suspense, useMemo, useState } from "react";
import Link from "next/link";
import NextImage from "next/image";
import { useSearchParams } from "next/navigation";
import { AnimatePresence, motion, type Variants } from "framer-motion";
import { ArrowUpRight, BookOpen, ChevronLeft, ChevronRight, Clock3, Disc3, Folder, Headphones, Image as GalleryIcon, Info, Layers, Mail, Music, Play, Radio, Sparkles, type LucideIcon } from "lucide-react";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import { useTrackPlayer } from "@/hooks/use-audio-player";
import projects from "@/data/projects";
import { type BlogListItem } from "@/lib/api/blog.types";
import { type Album } from "@/lib/api/gallery.types";
import { musicService } from "@/lib/api/music.service";
import { type MusicTrack } from "@/lib/api/music.types";
import { getVersionedGalleryCoverUrl } from "@/lib/gallery-media";
import { getVersionedMusicCoverUrl } from "@/lib/music-media";

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

type SpotlightKind = "gallery" | "music" | "blog";

interface HeroSpotlight {
    id: string;
    kind: SpotlightKind;
    label: string;
    icon: LucideIcon;
    title: string;
    meta: string;
    image: string | null;
    href: string;
    track?: MusicTrack;
}

const HERO_FLOAT_DOTS = [
    { left: "14%", top: "16%", size: 10, color: "var(--primary)", dur: 4, range: -12 },
    { left: "82%", top: "24%", size: 7, color: "var(--accent)", dur: 5, range: 10 },
    { left: "68%", top: "9%", size: 5, color: "var(--primary)", dur: 6, range: -8 },
    { left: "22%", top: "70%", size: 8, color: "var(--secondary)", dur: 5.5, range: 12 },
    { left: "86%", top: "58%", size: 6, color: "var(--accent)", dur: 4.5, range: -10 },
] as const;

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

function MobileNavPills() {
    const searchParams = useSearchParams();
    const links = searchParams.get("ref") === "resume" ? resumeLinks : defaultLinks;
    return (
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
    );
}

interface Props {
    galleries: Album[];
    galleryTotal: number;
    blogs: BlogListItem[];
    blogTotal: number;
    musicTracks: MusicTrack[];
}

export function HomePageClient({ galleries, galleryTotal, blogs, blogTotal, musicTracks }: Props) {
    const { playTrack } = useTrackPlayer();
    const [playingTrackId, setPlayingTrackId] = useState<string | null>(null);
    const [spotlightIndex, setSpotlightIndex] = useState(0);

    const latestBlog = blogs[0] ?? null;
    const latestGallery = galleries[0] ?? null;
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
        { label: "Albums", value: galleryTotal, icon: GalleryIcon },
        { label: "Tracks", value: musicTracks.length, icon: Headphones },
        { label: "Projects", value: projects.length, icon: Folder },
        { label: "Posts", value: blogTotal, icon: BookOpen },
    ];

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

    const spotlights = useMemo<HeroSpotlight[]>(() => {
        const items: HeroSpotlight[] = [];
        if (latestGallery) {
            items.push({
                id: `gallery-${latestGallery.id}`,
                kind: "gallery",
                label: "Featured Gallery",
                icon: GalleryIcon,
                title: latestGallery.name,
                meta: `${latestGallery.imageCount ?? 0} images`,
                image: latestGalleryCover ?? null,
                href: `/gallery/${latestGallery.slug}`,
            });
        }
        if (featuredTrack) {
            items.push({
                id: `track-${featuredTrack.id}`,
                kind: "music",
                label: "Latest Music",
                icon: Disc3,
                title: featuredTrack.title,
                meta: `${formatArtists(featuredTrack)}${featuredTrack.duration ? ` · ${featuredTrack.duration}` : ""}`,
                image: getVersionedMusicCoverUrl(featuredTrack) ?? null,
                href: `/music/${featuredTrack.slug}`,
                track: featuredTrack,
            });
        }
        if (latestBlog) {
            items.push({
                id: `blog-${latestBlog.id}`,
                kind: "blog",
                label: "Latest Blog",
                icon: BookOpen,
                title: latestBlog.title,
                meta: latestBlog.category?.name ?? "Writing",
                image: latestBlog.featuredImage ?? null,
                href: `/blog/${latestBlog.slug}`,
            });
        }
        return items;
    }, [latestGallery, latestGalleryCover, featuredTrack, latestBlog]);

    const active = spotlights[spotlightIndex] ?? spotlights[0] ?? null;
    const ActiveSpotlightIcon = active?.icon ?? Sparkles;

    const showPrevSpotlight = () =>
        setSpotlightIndex((index) => (index - 1 + spotlights.length) % spotlights.length);
    const showNextSpotlight = () =>
        setSpotlightIndex((index) => (index + 1) % spotlights.length);

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
                        className="relative flex min-h-[calc(100svh-4.25rem)] w-full flex-col items-center justify-center gap-10 pb-8 pt-8 md:flex-row md:items-center md:gap-10 md:pb-10 md:pt-10 lg:gap-14"
                        variants={itemVariants}
                    >
                        {/* ── Left: text ── */}
                        <div className="flex w-full flex-col items-center gap-7 text-center md:basis-[44%] md:items-start md:text-left">
                            <div className="inline-flex items-center gap-2.5 rounded-full border border-border/60 bg-card/60 px-4 py-1.5 text-sm text-muted-foreground backdrop-blur-sm">
                                <span className="flex h-5 w-5 items-center justify-center rounded-full bg-primary text-primary-foreground">
                                    <ArrowUpRight className="h-3 w-3" />
                                </span>
                                Software Engineer &amp; Wanderer
                            </div>

                            <h1 className="text-5xl font-bold leading-[1.05] tracking-tight sm:text-6xl md:text-7xl">
                                <span className="text-primary">Jassi&apos;s</span>
                                <br />
                                <span>Webspace</span>
                            </h1>

                            <p className="max-w-md text-base leading-relaxed text-muted-foreground sm:text-lg">
                                Music, writing, visuals, and background details all sit in one simple flow.
                            </p>

                            <div className="flex flex-wrap items-center justify-center gap-3 md:justify-start">
                                <Button asChild size="lg" className="h-12 rounded-full pl-2 pr-7">
                                    <Link href="/about" className="gap-3">
                                        <span className="flex h-8 w-8 items-center justify-center rounded-full bg-primary-foreground/15">
                                            <ArrowUpRight className="h-4 w-4" />
                                        </span>
                                        Explore
                                    </Link>
                                </Button>
                                <Button asChild size="lg" variant="secondary" className="h-12 rounded-full px-7">
                                    <Link href="/gallery">
                                        <GalleryIcon className="mr-2 h-4 w-4" />
                                        View Gallery
                                    </Link>
                                </Button>
                            </div>

                            {spotlights.length > 0 && (
                                <div className="flex items-center gap-2" role="tablist" aria-label="Featured spotlight">
                                    {spotlights.map((item, index) => (
                                        <button
                                            key={item.id}
                                            type="button"
                                            role="tab"
                                            aria-selected={index === spotlightIndex}
                                            aria-label={item.label}
                                            onClick={() => setSpotlightIndex(index)}
                                            className={cn(
                                                "h-1.5 rounded-full transition-all duration-300",
                                                index === spotlightIndex
                                                    ? "w-7 bg-primary"
                                                    : "w-2.5 bg-border hover:bg-muted-foreground/40"
                                            )}
                                        />
                                    ))}
                                </div>
                            )}

                            <Link href="/gallery" className="group mt-1 inline-flex items-center gap-3">
                                <span className="flex h-11 w-11 items-center justify-center rounded-full bg-gradient-to-br from-primary to-accent text-primary-foreground shadow-sm ring-4 ring-primary/15">
                                    <Sparkles className="h-5 w-5" />
                                </span>
                                <span className="text-left">
                                    <span className="block text-xs text-muted-foreground">Curated picks</span>
                                    <span className="flex items-center gap-1 text-sm font-semibold">
                                        See recent work
                                        <ArrowUpRight className="h-3.5 w-3.5 transition-transform group-hover:translate-x-0.5" />
                                    </span>
                                </span>
                            </Link>

                            <Suspense fallback={
                                <div className="flex flex-wrap justify-center gap-2 md:hidden">
                                    {defaultLinks.map((item) => {
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
                            }>
                                <MobileNavPills />
                            </Suspense>
                        </div>

                        {/* ── Right: spotlight stage — desktop only ── */}
                        <div className="hidden w-full md:block md:basis-[56%]">
                            <div className="relative flex h-[30rem] flex-col justify-between overflow-hidden rounded-[2rem] border border-white/10 bg-[radial-gradient(circle_at_72%_18%,color-mix(in_oklch,var(--primary)_26%,transparent),transparent_56%),linear-gradient(150deg,#111114,#0a0a0c)] p-6 shadow-2xl lg:h-[34rem]">
                                {/* diagonal sheen + dotted texture */}
                                <div className="pointer-events-none absolute inset-0 bg-[linear-gradient(120deg,color-mix(in_oklch,var(--primary)_10%,transparent),transparent_42%)]" />
                                <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(color-mix(in_oklch,white_14%,transparent)_1px,transparent_1px)] bg-[size:18px_18px] opacity-50 [mask-image:radial-gradient(ellipse_at_70%_30%,white,transparent_72%)]" />

                                {/* floating accent dots */}
                                {HERO_FLOAT_DOTS.map((dot, index) => (
                                    <motion.span
                                        key={index}
                                        className="pointer-events-none absolute rounded-full"
                                        style={{
                                            left: dot.left,
                                            top: dot.top,
                                            width: dot.size,
                                            height: dot.size,
                                            background: dot.color,
                                            boxShadow: `0 0 12px ${dot.color}`,
                                        }}
                                        animate={{ y: [0, dot.range, 0], opacity: [0.5, 1, 0.5] }}
                                        transition={{ duration: dot.dur, repeat: Infinity, ease: "easeInOut" }}
                                    />
                                ))}

                                {/* vertical scroll cue */}
                                <div className="pointer-events-none absolute left-3 top-1/2 hidden -translate-y-1/2 flex-col items-center gap-3 lg:flex">
                                    <span className="text-[10px] uppercase tracking-[0.4em] text-white/40 [writing-mode:vertical-rl]">scroll</span>
                                    <motion.span
                                        className="block h-12 w-px origin-top bg-gradient-to-b from-white/45 to-transparent"
                                        animate={{ scaleY: [0.6, 1, 0.6], opacity: [0.4, 1, 0.4] }}
                                        transition={{ duration: 1.8, repeat: Infinity, ease: "easeInOut" }}
                                    />
                                </div>

                                {/* circular featured media */}
                                <div className="relative flex flex-1 items-center justify-center">
                                    <motion.div
                                        animate={{ y: [0, -10, 0] }}
                                        transition={{ duration: 6, repeat: Infinity, ease: "easeInOut" }}
                                        className="relative aspect-square w-[72%] max-w-[20rem]"
                                    >
                                        <div className="absolute -inset-3 rounded-full bg-primary/15 blur-2xl" />
                                        <div className="absolute inset-0 rounded-full border border-white/10 p-2">
                                            <AnimatePresence mode="wait" initial={false}>
                                                <motion.div
                                                    key={active?.id ?? "empty"}
                                                    initial={{ opacity: 0, scale: 0.94, rotate: -3 }}
                                                    animate={{ opacity: 1, scale: 1, rotate: 0 }}
                                                    exit={{ opacity: 0, scale: 1.03 }}
                                                    transition={{ duration: 0.5, ease: [0.22, 1, 0.36, 1] }}
                                                    className="relative h-full w-full overflow-hidden rounded-full border border-white/15 shadow-2xl"
                                                >
                                                    {active?.image ? (
                                                        <NextImage
                                                            src={active.image}
                                                            alt={active.title}
                                                            fill
                                                            sizes="(max-width: 1024px) 40vw, 22vw"
                                                            className="object-cover"
                                                            priority
                                                        />
                                                    ) : (
                                                        <div className="flex h-full w-full items-center justify-center bg-[radial-gradient(circle_at_30%_24%,color-mix(in_oklch,var(--primary)_44%,transparent),transparent_56%),linear-gradient(145deg,#1b1b20,#101013)]">
                                                            <ActiveSpotlightIcon className="h-12 w-12 text-white/70" />
                                                        </div>
                                                    )}
                                                    <div className="absolute inset-0 bg-gradient-to-t from-black/45 via-transparent to-transparent" />
                                                </motion.div>
                                            </AnimatePresence>
                                        </div>

                                        {/* floating label chip */}
                                        <motion.div
                                            animate={{ y: [0, -8, 0], rotate: [0, 3, 0] }}
                                            transition={{ duration: 5, repeat: Infinity, ease: "easeInOut" }}
                                            className="absolute -right-3 top-4 flex items-center gap-2 rounded-2xl border border-white/15 bg-white/10 px-3 py-2 text-xs font-medium text-white backdrop-blur-md"
                                        >
                                            <ActiveSpotlightIcon className="h-4 w-4 text-primary" />
                                            {active?.label ?? "Featured"}
                                        </motion.div>

                                        {/* floating index chip */}
                                        {active && (
                                            <motion.div
                                                animate={{ y: [0, 8, 0] }}
                                                transition={{ duration: 5.5, repeat: Infinity, ease: "easeInOut" }}
                                                className="absolute -left-4 bottom-8 rounded-2xl border border-white/15 bg-white/10 px-3 py-2 text-xs text-white backdrop-blur-md"
                                            >
                                                <span className="font-semibold text-primary">{spotlightIndex + 1}</span>
                                                <span className="text-white/55"> / {spotlights.length}</span>
                                            </motion.div>
                                        )}
                                    </motion.div>
                                </div>

                                {/* spotlight card with prev/next */}
                                {active && (
                                    <div className="relative rounded-2xl border border-white/12 bg-white/[0.06] p-2.5 backdrop-blur-md">
                                        <div className="flex items-center justify-between px-1.5 pb-2">
                                            <span className="flex items-center gap-1.5 text-[11px] uppercase tracking-widest text-white/55">
                                                <ActiveSpotlightIcon className="h-3.5 w-3.5" />
                                                {active.label}
                                            </span>
                                            <div className="flex items-center gap-1">
                                                <button
                                                    type="button"
                                                    onClick={showPrevSpotlight}
                                                    aria-label="Previous spotlight"
                                                    className="flex h-7 w-7 items-center justify-center rounded-full border border-white/15 text-white/70 transition-colors hover:bg-white/10 hover:text-white"
                                                >
                                                    <ChevronLeft className="h-4 w-4" />
                                                </button>
                                                <button
                                                    type="button"
                                                    onClick={showNextSpotlight}
                                                    aria-label="Next spotlight"
                                                    className="flex h-7 w-7 items-center justify-center rounded-full border border-white/15 text-white/70 transition-colors hover:bg-white/10 hover:text-white"
                                                >
                                                    <ChevronRight className="h-4 w-4" />
                                                </button>
                                            </div>
                                        </div>
                                        <div className="flex items-center gap-3 rounded-xl border border-white/10 bg-black/25 p-2">
                                            <Link
                                                href={active.href}
                                                className="relative h-14 w-14 shrink-0 overflow-hidden rounded-lg border border-white/10"
                                            >
                                                {active.image ? (
                                                    <NextImage src={active.image} alt={active.title} fill sizes="56px" className="object-cover" />
                                                ) : (
                                                    <span className="flex h-full w-full items-center justify-center bg-white/5">
                                                        <ActiveSpotlightIcon className="h-5 w-5 text-white/70" />
                                                    </span>
                                                )}
                                            </Link>
                                            <Link href={active.href} className="min-w-0 flex-1">
                                                <span className="line-clamp-1 text-sm font-semibold text-white">{active.title}</span>
                                                <span className="line-clamp-1 text-xs text-white/55">{active.meta}</span>
                                            </Link>
                                            {active.kind === "music" && active.track ? (
                                                <button
                                                    type="button"
                                                    onClick={() => active.track && void handlePlayTrack(active.track)}
                                                    disabled={!active.track?.hasPlayableSource || playingTrackId === active.track?.id}
                                                    aria-label="Play track"
                                                    className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-primary text-primary-foreground transition-transform hover:scale-105 disabled:opacity-60"
                                                >
                                                    <Play className="h-4 w-4 fill-current" />
                                                </button>
                                            ) : (
                                                <Link
                                                    href={active.href}
                                                    aria-label={`Open ${active.title}`}
                                                    className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-white/10 text-white transition-colors hover:bg-white/20"
                                                >
                                                    <ArrowUpRight className="h-4 w-4" />
                                                </Link>
                                            )}
                                        </div>
                                    </div>
                                )}
                            </div>
                        </div>
                    </motion.section>

                    <motion.section variants={itemVariants} className="pb-8 md:pb-10">
                        <div className="grid overflow-hidden rounded-2xl border border-border/60 bg-card/55 backdrop-blur-sm sm:grid-cols-4">
                            {contentStats.map((stat) => {
                                const Icon = stat.icon;
                                return (
                                    <Link
                                        key={stat.label}
                                        href={
                                            stat.label === "Albums" ? "/gallery"
                                                : stat.label === "Tracks" ? "/music"
                                                : stat.label === "Projects" ? "/projects"
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

                                {galleries.length === 0 ? (
                                    <div className="rounded-2xl border bg-background/60 px-5 py-10 text-center">
                                        <p className="text-sm text-muted-foreground">No galleries available yet.</p>
                                    </div>
                                ) : (
                                    <div className="grid grid-cols-1 gap-3 md:grid-cols-4 md:grid-rows-2">
                                        {galleries.map((album, index) => {
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
                                                            {String(index + 1).padStart(2, "0")}
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
                                    {featuredTrack?.cover ? (
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
                                            {featuredTrack?.title ?? "Music shelf"}
                                        </h2>
                                        <p className="mt-1 line-clamp-1 text-sm text-muted-foreground">
                                            {featuredTrack
                                                ? `${formatArtists(featuredTrack)}${featuredTrack.duration ? ` · ${featuredTrack.duration}` : ""}`
                                                : "Tracks, remixes, and small audio experiments."}
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
                                            if (featuredTrack) void handlePlayTrack(featuredTrack);
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

                                {blogs.length === 0 ? (
                                    <div className="rounded-2xl border bg-background/60 px-5 py-10 text-center">
                                        <p className="text-sm text-muted-foreground">No blogs available yet.</p>
                                    </div>
                                ) : (
                                    <div className="grid grid-cols-1 gap-3 md:grid-cols-2">
                                        {blogs.map((blog, index) => (
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
                                                        {String(index + 1).padStart(2, "0")}
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
