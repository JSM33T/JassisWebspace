'use client';

import Link from 'next/link';
import Image from 'next/image';
import { useEffect, useMemo, useState } from 'react';
import { motion } from 'framer-motion';
import { Button } from '@/components/ui/button';
import { Switch } from '@/components/ui/switch';
import { Disc3, LoaderCircle, Music, Play } from 'lucide-react';
import { useTrackPlayer } from '@/hooks/use-audio-player';
import { musicService } from '@/lib/api/music.service';
import { MusicTrack } from '@/lib/api/music.types';
import { MusicContentPayload } from '@/lib/music-content.types';
import { FeedStatus } from '@/lib/feed-status';
import { toast } from 'sonner';
import { PageBanner } from '@/components/page-banner';
import { getVersionedMusicCoverUrl } from '@/lib/music-media';

const CATEGORY_ORDER = ['remixes', 'originals', 'snippets', 'radio/features', 'radio-features', 'features'];

const getCategoryRank = (category: string) => {
    const rank = CATEGORY_ORDER.indexOf(category);
    return rank === -1 ? CATEGORY_ORDER.length : rank;
};

export default function MusicPage() {
    const [selectedCategory, setSelectedCategory] = useState<string>('all');
    const [sortOrder, setSortOrder] = useState<'category' | 'newest' | 'title'>('category');
    const [playableOnly, setPlayableOnly] = useState(false);
    const [tracks, setTracks] = useState<MusicTrack[]>([]);
    const [feedStatus, setFeedStatus] = useState<FeedStatus | null>(null);
    const [loading, setLoading] = useState(true);
    const [playingTrackId, setPlayingTrackId] = useState<string | null>(null);
    const { playTrack } = useTrackPlayer();

    const categories = useMemo(
        () => {
            const uniqueCategories = Array.from(new Set(tracks.map((track) => track.category)));
            const sortedCategories = uniqueCategories.sort((a, b) => {
                const rankDiff = getCategoryRank(a) - getCategoryRank(b);
                if (rankDiff !== 0) {
                    return rankDiff;
                }

                return a.localeCompare(b);
            });

            return ['all', ...sortedCategories];
        },
        [tracks]
    );

    const filteredTracks = useMemo(
        () => {
            const baseTracks = selectedCategory === 'all'
                ? [...tracks]
                : tracks.filter((track) => track.category === selectedCategory);
            const refinedTracks = playableOnly
                ? baseTracks.filter((track) => track.hasPlayableSource)
                : baseTracks;

            return refinedTracks.sort((a, b) => {
                if (sortOrder === 'title') {
                    return a.title.localeCompare(b.title);
                }

                if (sortOrder === 'newest') {
                    return new Date(b.releaseDate).getTime() - new Date(a.releaseDate).getTime();
                }

                const rankDiff = getCategoryRank(a.category) - getCategoryRank(b.category);
                if (rankDiff !== 0) {
                    return rankDiff;
                }

                return a.title.localeCompare(b.title);
            });
        },
        [playableOnly, selectedCategory, sortOrder, tracks]
    );

    useEffect(() => {
        let active = true;

        const loadTracks = async () => {
            try {
                setLoading(true);
                const response = await fetch('/api/music-content', {
                    method: 'GET',
                    cache: 'no-store',
                });
                if (!response.ok) {
                    throw new Error('Failed to load music content.');
                }

                const payload = (await response.json()) as MusicContentPayload;
                if (active) {
                    setTracks(payload.tracks);
                    setFeedStatus(payload.status);
                }
            } catch (error) {
                console.error('Failed to load tracks', error);
                toast.error('Failed to load music tracks');
                if (active) setFeedStatus('unavailable');
            } finally {
                if (active) {
                    setLoading(false);
                }
            }
        };

        loadTracks();
        return () => {
            active = false;
        };
    }, []);

    const formatCategory = (value: string) => {
        if (value === 'features' || value === 'radio/features' || value === 'radio-features') {
            return 'Radio/Features';
        }

        return value
            .split('-')
            .map((part) => part.charAt(0).toUpperCase() + part.slice(1))
            .join(' ');
    };

    const handlePlay = async (track: MusicTrack) => {
        if (!track.hasPlayableSource) {
            return;
        }

        try {
            setPlayingTrackId(track.id);
            const playLink = await musicService.createPlayLink(track.id);
            playTrack({
                title: track.title,
                artist: track.authors.map((author) => author.displayName || author.username).join(', '),
                playFile: playLink.streamUrl,
            });
        } catch (error) {
            console.error('Failed to generate play link', error);
            toast.error('Unable to play this track right now');
        } finally {
            setPlayingTrackId(null);
        }
    };

    return (
        <motion.div
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.5, ease: "easeOut" }}
            className="flex flex-col min-h-screen bg-background/50"
        >
            <PageBanner
                badge="Audio Library"
                badgeIcon={Music}
                title="Music"
                description="Remixes, originals, snippets, radio features, collaborations, and small audio experiments from the shelf."
            >
                <div className="flex flex-col gap-3 sm:flex-row sm:items-center">
                    <div className="flex items-center gap-2 rounded-full border border-border/60 bg-background/60 px-3 py-2">
                        <Switch
                            checked={playableOnly}
                            onCheckedChange={setPlayableOnly}
                            aria-label="Show playable tracks only"
                        />
                        <span className="text-sm text-foreground">Playable only</span>
                    </div>
                    <div className="flex gap-2 rounded-full border border-border/60 bg-background/60 p-1">
                        {(
                            [
                                { value: 'category', label: 'Category' },
                                { value: 'newest', label: 'Newest' },
                                { value: 'title', label: 'Title' },
                            ] as const
                        ).map((option) => (
                            <Button
                                key={option.value}
                                type="button"
                                size="sm"
                                variant={sortOrder === option.value ? 'default' : 'ghost'}
                                className="h-8 rounded-full px-4"
                                onClick={() => setSortOrder(option.value)}
                            >
                                {option.label}
                            </Button>
                        ))}
                    </div>
                </div>
            </PageBanner>

            <main className="flex-1 px-4 pb-14 pt-8 md:px-8 md:pb-16 md:pt-10">
                <div className="mx-auto max-w-6xl pt-4">
                    {!loading && feedStatus !== 'available' ? (
                        <p role="status" className="mb-6 rounded-xl border border-border/70 bg-card/70 px-4 py-3 text-sm text-muted-foreground">
                            {feedStatus === 'cached' ? 'Showing the last available music list. New tracks may have appeared since then.' : 'Music is temporarily unavailable. Please try again later.'}
                        </p>
                    ) : null}
                    <div className="mb-6 flex flex-wrap gap-2">
                        {categories.map((category) => {
                            const isActive = selectedCategory === category;
                            const count = category === 'all'
                                ? tracks.length
                                : tracks.filter((track) => track.category === category).length;

                            return (
                                <Button
                                    key={category}
                                    type="button"
                                    variant={isActive ? 'default' : 'outline'}
                                    size="sm"
                                    aria-pressed={isActive}
                                    onClick={() => setSelectedCategory(category)}
                                    className="rounded-full h-8 px-4"
                                >
                                    {formatCategory(category)} ({count})
                                </Button>
                            );
                        })}
                    </div>
                    {loading ? (
                        <div className="grid grid-cols-2 gap-x-4 gap-y-7 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 xl:grid-cols-6" role="status" aria-label="Loading tracks">
                            {Array.from({ length: 6 }, (_, index) => (
                                <div key={index} className="animate-pulse motion-reduce:animate-none">
                                    <div className="aspect-square rounded-lg bg-muted" />
                                    <div className="mt-3 h-4 w-4/5 rounded bg-muted" />
                                    <div className="mt-2 h-3 w-1/2 rounded bg-muted" />
                                </div>
                            ))}
                        </div>
                    ) : null}
                    {!loading && filteredTracks.length === 0 ? (
                        <div className="max-w-6xl py-10 text-center text-muted-foreground">
                            {feedStatus === 'unavailable' ? 'Tracks could not be loaded.' : tracks.length > 0 ? 'No tracks match these filters.' : feedStatus === 'cached' ? 'No tracks in the last available snapshot.' : 'No tracks are published yet.'}
                        </div>
                    ) : null}
                    <div className="grid grid-cols-2 gap-x-4 gap-y-7 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 xl:grid-cols-6">
                        {filteredTracks.map((track, index) => (
                            <motion.article
                                key={track.id}
                                className="group min-w-0"
                                initial={{ opacity: 0, scale: 0.98 }}
                                animate={{ opacity: 1, scale: 1 }}
                                transition={{ duration: 0.25, delay: index * 0.02 }}
                            >
                                <div className="relative aspect-square">
                                    <Link
                                        href={`/music/${track.slug}`}
                                        aria-label={`View ${track.title}`}
                                        className="absolute inset-0 overflow-hidden rounded-lg bg-muted focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 focus-visible:ring-offset-background"
                                    >
                                        {track.cover ? (
                                            <Image
                                                src={getVersionedMusicCoverUrl(track) ?? track.cover}
                                                alt=""
                                                fill
                                                sizes="(max-width: 639px) 50vw, (max-width: 767px) 33vw, (max-width: 1023px) 25vw, (max-width: 1279px) 20vw, 180px"
                                                className="object-cover transition-transform duration-300 group-hover:scale-[1.03] motion-reduce:transform-none"
                                            />
                                        ) : (
                                            <div className="flex h-full items-center justify-center bg-gradient-to-br from-primary/15 via-muted to-primary/5">
                                                <Disc3 className="h-14 w-14 text-muted-foreground/50" aria-hidden="true" />
                                            </div>
                                        )}
                                    </Link>
                                    {track.hasPlayableSource ? (
                                        <Button
                                            type="button"
                                            size="icon"
                                            aria-label={playingTrackId === track.id ? `Loading ${track.title}` : `Play ${track.title}`}
                                            aria-busy={playingTrackId === track.id}
                                            className={`absolute bottom-2 right-2 h-11 w-11 cursor-pointer rounded-full shadow-lg transition-opacity group-hover:opacity-100 group-focus-within:opacity-100 focus-visible:opacity-100 [@media(hover:none)]:opacity-100 ${playingTrackId === track.id ? 'opacity-100' : 'opacity-0'}`}
                                            onClick={() => { void handlePlay(track); }}
                                            disabled={playingTrackId === track.id}
                                        >
                                            {playingTrackId === track.id ? (
                                                <LoaderCircle className="h-5 w-5 animate-spin" aria-hidden="true" />
                                            ) : (
                                                <Play className="ml-0.5 h-5 w-5 fill-current" aria-hidden="true" />
                                            )}
                                        </Button>
                                    ) : null}
                                </div>
                                <h3 className="mt-2.5 truncate text-sm font-semibold leading-5">
                                    <Link href={`/music/${track.slug}`} title={track.title} className="rounded-sm hover:underline focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring">
                                        {track.title}
                                    </Link>
                                </h3>
                                <div className="mt-0.5 flex items-center justify-between gap-2 text-sm leading-5 text-muted-foreground">
                                    <p className="min-w-0 truncate" title={track.authors.map((author) => author.displayName || author.username).join(', ')}>
                                        {track.authors.map((author) => author.displayName || author.username).join(', ') || 'Unknown artist'}
                                    </p>
                                    {track.duration?.trim() ? (
                                        <span className="shrink-0 tabular-nums" aria-label={`Duration: ${track.duration.trim()}`}>
                                            {track.duration.trim()}
                                        </span>
                                    ) : null}
                                </div>
                            </motion.article>
                        ))}
                    </div>
                </div>
            </main>
        </motion.div>
    );
}
