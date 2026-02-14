'use client';

import Link from 'next/link';
import { useMemo, useState } from 'react';
import { motion } from 'framer-motion';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Card, CardDescription, CardFooter, CardHeader, CardTitle } from '@/components/ui/card';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Music, ArrowLeft, MoveUpRight, Play } from 'lucide-react';
import { musicTracks, type Track } from '@/data/tracks';
import { useTrackPlayer } from '@/hooks/use-audio-player';

export default function MusicPage() {
    const [selectedCategory, setSelectedCategory] = useState<string>('all');
    const [streamTrack, setStreamTrack] = useState<Track | null>(null);
    const { playTrack } = useTrackPlayer();

    const categories = useMemo(
        () => ['all', ...Array.from(new Set(musicTracks.map((track) => track.category)))],
        []
    );

    const filteredTracks = useMemo(
        () =>
            selectedCategory === 'all'
                ? musicTracks
                : musicTracks.filter((track) => track.category === selectedCategory),
        [selectedCategory]
    );

    const formatCategory = (value: string) =>
        value
            .split('-')
            .map((part) => part.charAt(0).toUpperCase() + part.slice(1))
            .join(' ');
    const formatLinkType = (value: string) => value.replaceAll('-', ' ');

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
                                ? musicTracks.length
                                : musicTracks.filter((track) => track.category === category).length;

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
                    <div className="grid grid-cols-1 lg:grid-cols-2 gap-4 max-w-6xl mx-auto">
                        {filteredTracks.map((track, index) => (
                            <motion.div
                                key={track.id}
                                initial={{ opacity: 0, scale: 0.98 }}
                                animate={{ opacity: 1, scale: 1 }}
                                transition={{ duration: 0.25, delay: index * 0.02 }}
                            >
                                <Card
                                    className={`flex flex-col h-full min-h-[220px] rounded-2xl border backdrop-blur-sm group transition-all duration-300 ${
                                        track.playFile
                                            ? 'bg-card/50 hover:bg-card/80 hover:shadow-lg'
                                            : 'bg-card/30 opacity-60 saturate-50'
                                    }`}
                                >
                                    <CardHeader className="p-5">
                                        <div className="flex items-start justify-between gap-3 mb-3">
                                            <Badge variant="secondary" className="rounded-full px-3 capitalize">
                                                {track.category}
                                            </Badge>
                                            <div className="p-2 rounded-full border bg-background/50 group-hover:scale-110 transition-transform">
                                                <MoveUpRight className="h-4 w-4 opacity-60" />
                                            </div>
                                        </div>
                                        {!track.playFile ? (
                                            <Badge variant="outline" className="w-fit rounded-full text-xs">
                                                Inactive
                                            </Badge>
                                        ) : null}
                                        <CardTitle className="text-lg font-semibold tracking-tight line-clamp-1">
                                            {track.title}
                                        </CardTitle>
                                        <CardDescription className="text-sm pt-1 leading-relaxed line-clamp-2">
                                            {track.description}
                                        </CardDescription>
                                        <div className="pt-3 flex flex-wrap gap-2">
                                            {track.tags.slice(0, 3).map((tag) => (
                                                <Badge key={tag} variant="outline" className="rounded-full">
                                                    {tag}
                                                </Badge>
                                            ))}
                                        </div>
                                    </CardHeader>
                                    <CardFooter className="mt-auto px-5 pb-5 pt-0 flex flex-wrap items-center justify-between gap-2">
                                        <div className="text-xs text-muted-foreground line-clamp-1">
                                            {track.artists.map((artist) => artist.name).join(', ')}
                                        </div>
                                        <div className="flex items-center gap-2">
                                            <Badge variant="outline" className="rounded-full text-xs">
                                                {track.releaseDate}
                                            </Badge>
                                            {track.playFile ? (
                                                <Button
                                                    type="button"
                                                    size="sm"
                                                    className="rounded-full h-8 px-4"
                                                    onClick={() =>
                                                        playTrack({
                                                            title: track.title,
                                                            artist: track.artists.map((artist) => artist.name).join(', '),
                                                            playFile: track.playFile,
                                                        })
                                                    }
                                                >
                                                    <Play className="mr-1 h-3.5 w-3.5 fill-current" />
                                                    Play
                                                </Button>
                                            ) : null}
                                            {track.links.length > 0 ? (
                                                <Button
                                                    type="button"
                                                    size="sm"
                                                    variant="outline"
                                                    className="rounded-full h-8 px-4"
                                                    onClick={() => setStreamTrack(track)}
                                                >
                                                    Stream options
                                                </Button>
                                            ) : null}
                                        </div>
                                    </CardFooter>
                                </Card>
                            </motion.div>
                        ))}
                    </div>
                </div>
            </section>
            <Dialog open={!!streamTrack} onOpenChange={(open) => !open && setStreamTrack(null)}>
                <DialogContent className="sm:max-w-lg">
                    <DialogHeader>
                        <DialogTitle>{streamTrack?.title || 'Stream options'}</DialogTitle>
                        <DialogDescription>
                            Open this track on your preferred platform.
                        </DialogDescription>
                    </DialogHeader>
                    <div className="flex flex-wrap gap-2">
                        {streamTrack?.links.map((link) => (
                            <Button key={`${streamTrack.id}-${link.type}-${link.url}`} asChild size="sm" className="rounded-full capitalize">
                                <Link href={link.url} target="_blank" rel="noreferrer">
                                    {formatLinkType(link.type)}
                                </Link>
                            </Button>
                        ))}
                    </div>
                </DialogContent>
            </Dialog>
        </motion.div>
    );
}
