'use client';

import Link from 'next/link';
import Image from 'next/image';
import { useRouter } from 'next/navigation';
import { useEffect, useMemo, useState } from 'react';
import { motion } from 'framer-motion';
import { PageIntroCard } from '@/components/page-intro-card';
import { Button } from '@/components/ui/button';
import { Card, CardDescription, CardTitle } from '@/components/ui/card';
import { Disc3, Music, Play } from 'lucide-react';
import { useTrackPlayer } from '@/hooks/use-audio-player';
import { musicService } from '@/lib/api/music.service';
import { MusicTrack } from '@/lib/api/music.types';
import { MusicContentPayload } from '@/lib/music-content.types';
import { toast } from 'sonner';

const CATEGORY_ORDER = ['remixes', 'originals', 'snippets', 'radio/features', 'radio-features', 'features'];

const getCategoryRank = (category: string) => {
    const rank = CATEGORY_ORDER.indexOf(category);
    return rank === -1 ? CATEGORY_ORDER.length : rank;
};

export default function MusicPage() {
    const router = useRouter();
    const [selectedCategory, setSelectedCategory] = useState<string>('all');
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
            if (selectedCategory === 'all') {
                return [...tracks].sort(
                    (a, b) => getCategoryRank(a.category) - getCategoryRank(b.category)
                );
            }

            return tracks.filter((track) => track.category === selectedCategory);
        },
        [selectedCategory, tracks]
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
            {/* Ambient Background Glow */}
            <div className="fixed inset-0 z-[-1] pointer-events-none">
                <div className="absolute top-[-10%] left-1/2 -translate-x-1/2 w-[600px] h-[600px] rounded-full bg-primary/5 blur-[120px]" />
                <div className="absolute bottom-[-10%] left-[-10%] w-[500px] h-[500px] rounded-full bg-blue-500/5 blur-[120px]" />
            </div>

            <main className="flex-1 px-4 pb-14 pt-8 md:pb-16 md:pt-10">
                <div className="container mx-auto max-w-6xl pt-12">
                    <PageIntroCard
                        badge="Audio Library"
                        badgeIcon={Music}
                        title="Music"
                        description="Explore all published tracks from the catalog."
                    />

                    <div className="mt-6 mb-6 flex max-w-6xl flex-wrap gap-2">
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
                    <div className="grid max-w-6xl grid-cols-1 gap-4 lg:grid-cols-2">
                        {filteredTracks.map((track, index) => (
                            <motion.div
                                key={track.id}
                                initial={{ opacity: 0, scale: 0.98 }}
                                animate={{ opacity: 1, scale: 1 }}
                                transition={{ duration: 0.25, delay: index * 0.02 }}
                            >
                                <Card
                                    className={`h-full rounded-2xl border backdrop-blur-sm transition-all duration-300 ${
                                        track.hasPlayableSource
                                            ? 'bg-card/50 hover:bg-card/80 hover:shadow-lg'
                                            : 'bg-card/30 opacity-60 saturate-50'
                                    }`}
                                    role="button"
                                    tabIndex={0}
                                    onClick={() => router.push(`/music/${track.slug}`)}
                                    onKeyDown={(event) => {
                                        if (event.key === 'Enter' || event.key === ' ') {
                                            event.preventDefault();
                                            router.push(`/music/${track.slug}`);
                                        }
                                    }}
                                >
                                    <div className="px-4 py-0 flex items-center gap-3">
                                        <div className="relative h-24 w-24 shrink-0 overflow-hidden rounded-xl border border-primary/30 bg-muted sm:h-32 sm:w-32">
                                            {track.cover ? (
                                                <Image
                                                    src={track.cover}
                                                    alt={track.title}
                                                    fill
                                                    className="object-cover"
                                                    unoptimized
                                                />
                                            ) : (
                                                <div className="h-full w-full flex items-center justify-center text-muted-foreground">
                                                    <Disc3 className="h-8 w-8" />
                                                </div>
                                            )}
                                        </div>

                                        <div className="flex min-w-0 flex-1 flex-col">
                                            <CardTitle className="text-lg font-semibold tracking-tight line-clamp-1">
                                                {track.title}
                                            </CardTitle>
                                            <CardDescription className="text-sm pt-1 leading-relaxed line-clamp-2">
                                                {track.description}
                                            </CardDescription>
                                            <p className="pt-2 text-xs text-muted-foreground line-clamp-1">
                                                {track.authors.map((author) => author.displayName || author.username).join(', ')}
                                            </p>
                                            <div className="pt-3 flex items-center gap-2">
                                                <Button
                                                    type="button"
                                                    size="sm"
                                                    className="h-8 cursor-pointer rounded-full px-4"
                                                    onClick={(event) => {
                                                        event.stopPropagation();
                                                        void handlePlay(track);
                                                    }}
                                                    onKeyDown={(event) => {
                                                        if (event.key === 'Enter' || event.key === ' ') {
                                                            event.stopPropagation();
                                                        }
                                                    }}
                                                    disabled={!track.hasPlayableSource || playingTrackId === track.id}
                                                >
                                                    <Play className="mr-1 h-3.5 w-3.5 fill-current" />
                                                    {playingTrackId === track.id ? 'Loading...' : 'Play'}
                                                </Button>
                                                <Button asChild type="button" size="sm" variant="outline" className="rounded-full h-8 px-4">
                                                    <Link href={`/music/${track.slug}`}>Open</Link>
                                                </Button>
                                            </div>
                                        </div>
                                    </div>
                                </Card>
                            </motion.div>
                        ))}
                    </div>
                </div>
            </main>
        </motion.div>
    );
}
