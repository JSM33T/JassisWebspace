"use client";

import { useMemo, useState } from "react";
import Image from "next/image";
import Link from "next/link";
import { motion, type Variants } from "framer-motion";
import {
    ArrowDownRight,
    ArrowUpRight,
    BookOpen,
    Camera,
    Disc3,
    Folder,
    Headphones,
    Mail,
    Play,
    TerminalSquare,
    type LucideIcon,
} from "lucide-react";

import { ContentRail } from "@/components/content-rail";
import { SectionHeader } from "@/components/section-header";
import { VisualFallback } from "@/components/visual-fallback";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import projects from "@/data/projects";
import { useTrackPlayer } from "@/hooks/use-audio-player";
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

const featuredProjectNames = ["ProBeacon", "SurfSwift", "Linqyard"];
const featuredWorkItems = featuredProjectNames
    .map((name) => projects.find((project) => project.title.toLowerCase().startsWith(name.toLowerCase())))
    .filter((project): project is NonNullable<typeof project> => Boolean(project));

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
    const latestGallery = galleries[0] ?? null;
    const latestGalleryCover = latestGallery ? getVersionedGalleryCoverUrl(latestGallery) : null;
    const latestBlogs = blogs.slice(0, 2);

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
                <div className="absolute top-[30%] -left-32 h-80 w-80 rounded-full bg-accent/14 blur-3xl" />
                <div className="absolute top-[48%] -right-28 h-72 w-72 rounded-full bg-secondary/18 blur-3xl" />
                <div className="absolute inset-0 bg-[linear-gradient(to_right,color-mix(in_oklch,var(--border)_10%,transparent)_1px,transparent_1px),linear-gradient(to_bottom,color-mix(in_oklch,var(--border)_10%,transparent)_1px,transparent_1px)] bg-[size:60px_60px] [mask-image:radial-gradient(ellipse_at_center,white,transparent_76%)]" />
            </div>

            <main className="relative mx-auto max-w-6xl px-4 sm:px-6">
                <motion.div variants={containerVariants} initial="hidden" animate="visible">
                    <motion.section
                        aria-labelledby="home-heading"
                        className="grid min-h-[calc(100svh-4.25rem)] items-center gap-10 py-12 md:grid-cols-[1.08fr_0.92fr] md:py-16"
                        variants={itemVariants}
                    >
                        <div className="max-w-3xl space-y-7">
                            <Badge variant="secondary" className="rounded-full px-4 py-1.5">
                                Software engineer and multidisciplinary maker
                            </Badge>
                            <div className="space-y-5">
                                <h1 id="home-heading" className="text-balance text-5xl font-bold leading-[1.03] tracking-tight sm:text-6xl md:text-7xl">
                                    Hi, I&apos;m <span className="text-primary">Jassi.</span>
                                </h1>
                                <p className="max-w-2xl text-balance text-lg leading-relaxed text-muted-foreground sm:text-xl">
                                    I build dependable software and document what I learn. This webspace brings together selected engineering projects, practical writing, photography, and music.
                                </p>
                            </div>
                            <div className="flex flex-wrap gap-3">
                                <Button asChild size="lg" className="h-12 rounded-full px-7">
                                    <Link href="#selected-work">
                                        Explore selected work
                                        <ArrowDownRight className="ml-2 h-4 w-4" />
                                    </Link>
                                </Button>
                                <Button asChild size="lg" variant="secondary" className="h-12 rounded-full px-7">
                                    <Link href="/about">About me</Link>
                                </Button>
                            </div>
                        </div>

                        <div className="rounded-3xl border bg-card/65 p-5 shadow-xl shadow-black/5 backdrop-blur-sm sm:p-7">
                            <p className="text-xs font-semibold uppercase tracking-[0.2em] text-muted-foreground">What you&apos;ll find here</p>
                            <div className="mt-5 grid gap-3 sm:grid-cols-2 md:grid-cols-1 lg:grid-cols-2">
                                {[
                                    { icon: TerminalSquare, label: "Engineering", text: "Systems, automation, and product work" },
                                    { icon: BookOpen, label: "Writing", text: "Implementation notes and field essays" },
                                    { icon: Camera, label: "Photography", text: "Travel, places, and visual stories" },
                                    { icon: Headphones, label: "Music", text: "Releases, remixes, and experiments" },
                                ].map(({ icon: Icon, label, text }) => (
                                    <div key={label} className="rounded-2xl border bg-background/60 p-4">
                                        <Icon className="h-5 w-5 text-primary" aria-hidden="true" />
                                        <p className="mt-4 font-semibold">{label}</p>
                                        <p className="mt-1 text-sm leading-relaxed text-muted-foreground">{text}</p>
                                    </div>
                                ))}
                            </div>
                        </div>
                    </motion.section>

                    <motion.div id="selected-work" className="scroll-mt-24" variants={itemVariants}>
                        <ContentRail
                            surface="panel"
                            header={
                                <SectionHeader
                                    eyebrow="Selected Work"
                                    title="Projects that show how I approach engineering."
                                    description="Three starting points across infrastructure monitoring, browser automation, and creator tooling, each with its own architecture and implementation notes."
                                    action={
                                        <Button asChild variant="secondary" className="rounded-full px-6">
                                            <Link href="/projects">
                                                All projects
                                                <ArrowUpRight className="ml-2 h-4 w-4" />
                                            </Link>
                                        </Button>
                                    }
                                />
                            }
                            className="pb-16 md:pb-24"
                        >
                            {featuredWorkItems.length > 0 ? (
                                <div className="grid gap-3 md:grid-cols-3">
                                    {featuredWorkItems.map((project) => {
                                        const preview = project.screenshots[0] ?? project.coverImage ?? null;
                                        return (
                                            <Link
                                                key={project.slug}
                                                href={`/projects/${project.slug}`}
                                                className="group flex min-w-0 flex-col overflow-hidden rounded-2xl border bg-background/65 p-3 transition-all duration-300 hover:-translate-y-0.5 hover:bg-background/85 hover:shadow-xl focus-visible:outline-none focus-visible:ring-[3px] focus-visible:ring-ring/50"
                                            >
                                                <div className="relative aspect-[16/10] overflow-hidden rounded-xl border bg-muted/40">
                                                    {preview ? (
                                                        <Image
                                                            src={preview}
                                                            alt={`${project.title} preview`}
                                                            fill
                                                            sizes="(max-width: 768px) 100vw, 33vw"
                                                            className="object-cover transition-transform duration-500 group-hover:scale-105"
                                                        />
                                                    ) : (
                                                        <VisualFallback kind="project" title={project.title} eyebrow={project.highlight || "Project"} className="h-full min-h-0" />
                                                    )}
                                                </div>
                                                <div className="flex flex-1 flex-col gap-4 px-1 pb-1 pt-4">
                                                    <div className="space-y-2">
                                                        <Badge variant="secondary" className="rounded-full px-3">{project.highlight || "Project"}</Badge>
                                                        <h3 className="line-clamp-2 text-lg font-semibold tracking-tight group-hover:text-primary">{project.title}</h3>
                                                        <p className="line-clamp-3 text-sm leading-relaxed text-muted-foreground">{project.description}</p>
                                                    </div>
                                                    <span className="mt-auto inline-flex items-center text-sm font-medium">
                                                        Read project details <ArrowUpRight className="ml-1.5 h-4 w-4" />
                                                    </span>
                                                </div>
                                            </Link>
                                        );
                                    })}
                                </div>
                            ) : (
                                <EmptyState icon={Folder} title="Project details are being prepared." description="The full project archive is still available." href="/projects" action="Browse projects" />
                            )}
                        </ContentRail>
                    </motion.div>

                    <motion.div id="latest-writing" className="scroll-mt-24" variants={itemVariants}>
                        <ContentRail
                            header={
                                <SectionHeader
                                    eyebrow="Latest Writing"
                                    title="Notes from building, debugging, and observing."
                                    description={blogTotal > 0 ? `${blogTotal} published ${blogTotal === 1 ? "article" : "articles"}, with the latest entries below.` : "Implementation notes, product thinking, and field essays will appear here."}
                                    action={
                                        <Button asChild variant="secondary" className="rounded-full px-6">
                                            <Link href="/blog">
                                                All writing
                                                <ArrowUpRight className="ml-2 h-4 w-4" />
                                            </Link>
                                        </Button>
                                    }
                                />
                            }
                            className="pb-16 md:pb-24"
                        >
                            {latestBlogs.length > 0 ? (
                                <div className="grid gap-4 md:grid-cols-2">
                                    {latestBlogs.map((blog) => (
                                        <Link key={blog.id} href={`/blog/${blog.slug}`} className="group overflow-hidden rounded-3xl border bg-card/65 transition-all duration-300 hover:-translate-y-0.5 hover:shadow-xl focus-visible:outline-none focus-visible:ring-[3px] focus-visible:ring-ring/50">
                                            <div className="relative aspect-[16/9] overflow-hidden border-b bg-muted/40">
                                                {blog.featuredImage ? (
                                                    <Image src={blog.featuredImage} alt="" fill sizes="(max-width: 768px) 100vw, 50vw" className="object-cover transition-transform duration-500 group-hover:scale-105" />
                                                ) : (
                                                    <VisualFallback kind="blog" title={blog.title} eyebrow={blog.category?.name ?? "Writing"} className="h-full min-h-0" />
                                                )}
                                            </div>
                                            <div className="p-5 sm:p-6">
                                                <p className="text-xs font-semibold uppercase tracking-wide text-primary">{blog.category?.name ?? "Writing"}</p>
                                                <h3 className="mt-2 line-clamp-2 text-xl font-semibold tracking-tight group-hover:text-primary">{blog.title}</h3>
                                                {blog.excerpt ? <p className="mt-3 line-clamp-2 text-sm leading-relaxed text-muted-foreground">{blog.excerpt}</p> : null}
                                            </div>
                                        </Link>
                                    ))}
                                </div>
                            ) : (
                                <EmptyState icon={BookOpen} title="No articles are published yet." description="Visit the writing archive when new notes arrive." href="/blog" action="Open writing" />
                            )}
                        </ContentRail>
                    </motion.div>

                    <motion.div id="creative-archive" className="scroll-mt-24" variants={itemVariants}>
                        <ContentRail
                            surface="panel"
                            header={<SectionHeader eyebrow="Gallery & Music" title="A visual and audio shelf beyond the code." description="The latest photo story and a featured track offer two compact ways into the creative archive." />}
                            className="pb-16 md:pb-24"
                        >
                            <div className="grid gap-4 md:grid-cols-2">
                                <article className="overflow-hidden rounded-3xl border bg-background/65">
                                    <Link href={latestGallery ? `/gallery/${latestGallery.slug}` : "/gallery"} className="group block focus-visible:outline-none focus-visible:ring-[3px] focus-visible:ring-inset focus-visible:ring-ring/50">
                                        <div className="relative aspect-[16/10] overflow-hidden border-b bg-muted/40">
                                            {latestGalleryCover && latestGallery ? (
                                                <Image src={latestGalleryCover} alt="" fill sizes="(max-width: 768px) 100vw, 50vw" className="object-cover transition-transform duration-500 group-hover:scale-105" />
                                            ) : (
                                                <VisualFallback kind="gallery" title={latestGallery?.name ?? "Gallery archive"} eyebrow={latestGallery ? `${latestGallery.imageCount} photos` : "Visual stories"} className="h-full min-h-0" />
                                            )}
                                        </div>
                                        <div className="p-5 sm:p-6">
                                            <p className="text-xs font-semibold uppercase tracking-wide text-primary">Latest gallery</p>
                                            <h3 className="mt-2 text-xl font-semibold tracking-tight group-hover:text-primary">{latestGallery?.name ?? "Explore the gallery"}</h3>
                                            <p className="mt-2 text-sm leading-relaxed text-muted-foreground">
                                                {latestGallery?.description || (galleryTotal > 0 ? `${galleryTotal} photo ${galleryTotal === 1 ? "album" : "albums"} from travels, field walks, and everyday observations.` : "Photo stories will appear here as they are published.")}
                                            </p>
                                            <span className="mt-4 inline-flex items-center text-sm font-medium">Open gallery <ArrowUpRight className="ml-1.5 h-4 w-4" /></span>
                                        </div>
                                    </Link>
                                </article>

                                <article className="overflow-hidden rounded-3xl border bg-background/65">
                                    <Link href={featuredTrack ? `/music/${featuredTrack.slug}` : "/music"} className="group block focus-visible:outline-none focus-visible:ring-[3px] focus-visible:ring-inset focus-visible:ring-ring/50">
                                        <div className="relative aspect-[16/10] overflow-hidden border-b bg-muted/40">
                                            {featuredTrack && getVersionedMusicCoverUrl(featuredTrack) ? (
                                                <Image src={getVersionedMusicCoverUrl(featuredTrack)!} alt="" fill sizes="(max-width: 768px) 100vw, 50vw" className="object-cover transition-transform duration-500 group-hover:scale-105" />
                                            ) : (
                                                <VisualFallback kind="music" title={featuredTrack?.title ?? "Music shelf"} eyebrow={featuredTrack?.category ? formatCategory(featuredTrack.category) : "Audio archive"} icon={Disc3} className="h-full min-h-0" />
                                            )}
                                        </div>
                                        <div className="p-5 sm:p-6">
                                            <p className="text-xs font-semibold uppercase tracking-wide text-primary">Featured music</p>
                                            <h3 className="mt-2 text-xl font-semibold tracking-tight group-hover:text-primary">{featuredTrack?.title ?? "Explore the music shelf"}</h3>
                                            <p className="mt-2 text-sm leading-relaxed text-muted-foreground">
                                                {featuredTrack ? `${formatArtists(featuredTrack)}${featuredTrack.duration ? ` · ${featuredTrack.duration}` : ""}` : "Releases, remixes, and audio experiments will appear here."}
                                            </p>
                                        </div>
                                    </Link>
                                    <div className="flex flex-wrap gap-2 px-5 pb-5 sm:px-6 sm:pb-6">
                                        {featuredTrack?.hasPlayableSource ? (
                                            <Button type="button" onClick={() => void handlePlayTrack(featuredTrack)} disabled={playingTrackId === featuredTrack.id} className="rounded-full px-5">
                                                <Play className="mr-2 h-4 w-4 fill-current" />
                                                {playingTrackId === featuredTrack.id ? "Loading..." : "Play track"}
                                            </Button>
                                        ) : null}
                                        <Button asChild variant="secondary" className="rounded-full px-5">
                                            <Link href="/music">Open music <ArrowUpRight className="ml-2 h-4 w-4" /></Link>
                                        </Button>
                                    </div>
                                </article>
                            </div>
                        </ContentRail>
                    </motion.div>

                    <motion.section id="work-together" variants={itemVariants} className="scroll-mt-24 pb-16 md:pb-24" aria-labelledby="work-together-heading">
                        <div className="relative overflow-hidden rounded-3xl border bg-card/70 p-6 backdrop-blur-sm sm:p-8 md:p-10">
                            <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(circle_at_16%_20%,color-mix(in_oklch,var(--primary)_18%,transparent),transparent_44%),radial-gradient(circle_at_84%_74%,color-mix(in_oklch,var(--secondary)_14%,transparent),transparent_52%)]" />
                            <div className="relative grid gap-8 md:grid-cols-[1fr_auto] md:items-end">
                                <div className="max-w-2xl space-y-4">
                                    <Badge variant="secondary" className="rounded-full px-4 py-1.5">Work together</Badge>
                                    <h2 id="work-together-heading" className="text-balance text-3xl font-semibold tracking-tight md:text-4xl">Have a software problem worth solving?</h2>
                                    <p className="text-base leading-relaxed text-muted-foreground md:text-lg">
                                        I help shape and build web platforms, automation, AI workflows, and backend systems. Share the context and I&apos;ll help identify a practical next step.
                                    </p>
                                </div>
                                <div className="flex flex-wrap gap-3 md:justify-end">
                                    <Button asChild size="lg" className="rounded-full px-7">
                                        <Link href="/contact?purpose=Service+Request&ref=%2Fservices"><Mail className="mr-2 h-4 w-4" />Start a conversation</Link>
                                    </Button>
                                    <Button asChild size="lg" variant="secondary" className="rounded-full px-7">
                                        <Link href="/services">View services</Link>
                                    </Button>
                                </div>
                            </div>
                        </div>
                    </motion.section>
                </motion.div>
            </main>
        </div>
    );
}

function EmptyState({ icon: Icon, title, description, href, action }: {
    icon: LucideIcon;
    title: string;
    description: string;
    href: string;
    action: string;
}) {
    return (
        <div className="flex flex-col items-start gap-4 rounded-2xl border bg-background/60 p-6 sm:flex-row sm:items-center sm:justify-between">
            <div className="flex items-start gap-4">
                <span className="flex h-11 w-11 shrink-0 items-center justify-center rounded-2xl border bg-card text-primary">
                    <Icon className="h-5 w-5" aria-hidden="true" />
                </span>
                <div>
                    <h3 className="font-semibold">{title}</h3>
                    <p className="mt-1 text-sm text-muted-foreground">{description}</p>
                </div>
            </div>
            <Button asChild variant="secondary" className="rounded-full px-5"><Link href={href}>{action}</Link></Button>
        </div>
    );
}
