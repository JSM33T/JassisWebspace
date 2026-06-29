'use client';

import Link from 'next/link';
import Image from 'next/image';
import { useEffect, useMemo, useState } from 'react';
import { motion } from 'framer-motion';
import { Button } from '@/components/ui/button';
import { Switch } from '@/components/ui/switch';
import { Disc3, Music, Play } from 'lucide-react';
import { useTrackPlayer } from '@/hooks/use-audio-player';
import { musicService } from '@/lib/api/music.service';
import { MusicTrack } from '@/lib/api/music.types';
import { MusicContentPayload } from '@/lib/music-content.types';
import { toast } from 'sonner';
import { PageBanner } from '@/components/page-banner';
import { VisualFallback } from '@/components/visual-fallback';
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

            return [...sortedCategories, 'all'];
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
                }
            } catch (error) {
                console.error('Failed to load tracks', error);
                toast.error('Failed to load music tracks');
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
                description="Explore all published tracks from the catalog."
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
                                    onClick={() => setSelectedCategory(category)}
                                    className="rounded-full h-8 px-4"
                                >
                                    {formatCategory(category)} ({count})
                                </Button>
                            );
                        })}
                    </div>
                    {loading ? (
                        <div className="max-w-6xl py-10 text-center text-muted-foreground">
                            Loading tracks...
                        </div>
                    ) : null}
                    {!loading && filteredTracks.length === 0 ? (
                        <div className="max-w-6xl py-10 text-center text-muted-foreground">
                            No tracks found.
                        </div>
                    ) : null}
                    <div className="grid max-w-6xl grid-cols-2 gap-4 md:grid-cols-3">
                        {filteredTracks.map((track, index) => (
                            <motion.div
                                key={track.id}
                                initial={{ opacity: 0, scale: 0.98 }}
                                animate={{ opacity: 1, scale: 1 }}
                                transition={{ duration: 0.25, delay: index * 0.02 }}
                            >
                                <div
                                    className={`group relative aspect-square overflow-hidden rounded-2xl border transition-all duration-300 ${
                                        track.hasPlayableSource
                                            ? 'hover:-translate-y-0.5 hover:shadow-xl'
                                            : 'opacity-60 saturate-50'
                                    }`}
                                >
                                    {/* Background image */}
                                    {track.cover ? (
                                        <Image
                                            src={getVersionedMusicCoverUrl(track) ?? track.cover}
                                            alt={track.title}
                                            fill
                                            sizes="(max-width: 640px) 50vw, (max-width: 1024px) 33vw, 25vw"
                                            className="object-cover transition-transform duration-500 group-hover:scale-105"
                                        />
                                    ) : (
                                        <VisualFallback
                                            kind="music"
                                            title={track.title}
                                            eyebrow={formatCategory(track.category)}
                                            icon={Disc3}
                                            className="absolute inset-0 min-h-0"
                                        />
                                    )}

                                    {/* Gradient overlay */}
                                    <div className="absolute inset-0 bg-gradient-to-t from-black/85 via-black/30 to-transparent" />

                                    {/* Category badge — top right */}
                                    <div className="absolute right-3 top-3">
                                        <span className="inline-flex items-center gap-1 rounded-full border border-white/20 bg-black/50 px-2.5 py-1 text-[10px] font-medium text-white/90 backdrop-blur-sm">
                                            <Disc3 className="h-3 w-3" />
                                            {formatCategory(track.category)}
                                        </span>
                                    </div>

                                    {/* Bottom content */}
                                    <div className="absolute inset-x-0 bottom-0 p-4">
                                        <h3 className="line-clamp-2 text-sm font-bold leading-snug text-white sm:text-base">
                                            {track.title}
                                        </h3>
                                        <p className="mt-1 line-clamp-1 text-[11px] text-white/55">
                                            {track.authors.map((author) => author.displayName || author.username).join(', ')}
                                        </p>
                                        <div className="mt-3 flex items-center gap-2">
                                            <Button
                                                type="button"
                                                size="sm"
                                                className="h-10 flex-1 cursor-pointer rounded-full text-sm font-semibold"
                                                onClick={() => { void handlePlay(track); }}
                                                disabled={!track.hasPlayableSource || playingTrackId === track.id}
                                            >
                                                <Play className="mr-1.5 h-3.5 w-3.5 fill-current" />
                                                {playingTrackId === track.id ? 'Loading…' : 'Play'}
                                            </Button>
                                            <Button asChild type="button" size="sm" variant="outline" className="h-10 flex-1 rounded-full border-white/20 bg-white/10 text-sm font-semibold text-white hover:bg-white/20 hover:text-white">
                                                <Link href={`/music/${track.slug}`}>Open</Link>
                                            </Button>
                                        </div>
                                    </div>
                                </div>
                            </motion.div>
                        ))}
                    </div>
                </div>
            </main>
        </motion.div>
    );
}
