'use client';

import Link from 'next/link';
import Image from 'next/image';
import { useRouter } from 'next/navigation';
import { useEffect, useMemo, useState } from 'react';
import { motion } from 'framer-motion';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Card, CardDescription, CardTitle } from '@/components/ui/card';
import { Disc3, Music, ArrowLeft, Play } from 'lucide-react';
import { useTrackPlayer } from '@/hooks/use-audio-player';
import { musicService } from '@/lib/api/music.service';
import { MusicTrack } from '@/lib/api/music.types';
import { toast } from 'sonner';

export default function MusicPage() {
    const router = useRouter();
    const [selectedCategory, setSelectedCategory] = useState<string>('all');
    const [tracks, setTracks] = useState<MusicTrack[]>([]);
    const [loading, setLoading] = useState(true);
    const [playingTrackId, setPlayingTrackId] = useState<string | null>(null);
    const { playTrack } = useTrackPlayer();

    const categories = useMemo(
        () => ['all', ...Array.from(new Set(tracks.map((track) => track.category)))],
        [tracks]
    );

    const filteredTracks = useMemo(
        () =>
            selectedCategory === 'all'
                ? tracks
                : tracks.filter((track) => track.category === selectedCategory),
        [selectedCategory, tracks]
    );

    useEffect(() => {
        let active = true;

        const loadTracks = async () => {
            try {
                setLoading(true);
                const data = await musicService.getTracks({ page: 1, pageSize: 100 });
                if (active) {
                    setTracks(data);
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

    const formatCategory = (value: string) =>
        value
            .split('-')
            .map((part) => part.charAt(0).toUpperCase() + part.slice(1))
            .join(' ');

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

            {/* Header */}
            <section className="px-4 py-8 md:py-12 border-b bg-muted/30 backdrop-blur-sm">
                <div className="container mx-auto max-w-7xl pt-16">
                    <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
                        <div className="space-y-3">
                            <Badge variant="secondary" className="px-4 py-1.5 rounded-full text-sm font-normal backdrop-blur-sm bg-background/50 border-border/50 gap-2 w-fit">
                                <Music className="h-3.5 w-3.5 text-primary" />
                                <span>Audio Library</span>
                            </Badge>
                            <h1 className="text-4xl md:text-5xl font-bold tracking-tight">
                                Music
                            </h1>
                            <p className="text-lg text-muted-foreground max-w-2xl">
                                Explore all published tracks from the catalog.
                            </p>
                        </div>
                        <Button variant="ghost" asChild className="rounded-full px-6">
                            <Link href="/">
                                <ArrowLeft className="mr-2 h-4 w-4" />
                                Back
                            </Link>
                        </Button>
                    </div>
                </div>
            </section>

            <section className="flex-1 px-4 py-12">
                <div className="container mx-auto max-w-6xl">
                    <div className="max-w-6xl mx-auto mb-6 flex flex-wrap gap-2">
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
                        <div className="max-w-6xl mx-auto py-10 text-center text-muted-foreground">
                            Loading tracks...
                        </div>
                    ) : null}
                    {!loading && filteredTracks.length === 0 ? (
                        <div className="max-w-6xl mx-auto py-10 text-center text-muted-foreground">
                            No tracks found.
                        </div>
                    ) : null}
                    <div className="grid grid-cols-1 lg:grid-cols-2 gap-4 max-w-6xl mx-auto">
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
                                        <div className="relative h-32 w-32 shrink-0 overflow-hidden rounded-xl border border-primary/30 bg-muted">
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
                                                    className="rounded-full h-8 px-4"
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
            </section>
        </motion.div>
    );
}
