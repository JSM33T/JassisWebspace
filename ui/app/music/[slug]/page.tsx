'use client';

import { useEffect, useMemo, useState } from 'react';
import { useParams, useRouter } from 'next/navigation';
import Link from 'next/link';
import Image from 'next/image';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Skeleton } from '@/components/ui/skeleton';
import { Separator } from '@/components/ui/separator';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import {
    ArrowLeft,
    Calendar,
    Disc3,
    MessageSquare,
    Music,
    Play,
    UserRound,
} from 'lucide-react';
import { CommentSection } from '@/components/comments/CommentSection';
import { LikeButton } from '@/components/likes/LikeButton';
import { useTrackPlayer } from '@/hooks/use-audio-player';
import { musicService } from '@/lib/api/music.service';
import { TrackDetail } from '@/lib/api/music.types';
import { getVersionedMusicCoverUrl } from '@/lib/music-media';
import { ApiError } from '@/lib/api/types';
import { toast } from 'sonner';

export default function MusicTrackViewPage() {
    const { slug } = useParams<{ slug: string }>();
    const router = useRouter();
    const { playTrack } = useTrackPlayer();

    const [track, setTrack] = useState<TrackDetail | null>(null);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);
    const [streamOpen, setStreamOpen] = useState(false);
    const [playing, setPlaying] = useState(false);

    useEffect(() => {
        if (!slug) {
            return;
        }

        let active = true;
        const loadTrack = async () => {
            try {
                setLoading(true);
                setError(null);
                const data = await musicService.getTrackBySlug(slug);
                if (active) {
                    setTrack(data);
                }
            } catch (err) {
                if (!active) {
                    return;
                }

                if (err instanceof ApiError) {
                    setError(err.problemDetails.detail || err.problemDetails.title);
                } else {
                    setError('Failed to load track');
                }
            } finally {
                if (active) {
                    setLoading(false);
                }
            }
        };

        loadTrack();
        return () => {
            active = false;
        };
    }, [slug]);

    const artistNames = useMemo(
        () => track?.authors.map((author) => author.displayName || author.username).join(', ') || 'Unknown artist',
        [track]
    );

    const formatReleaseDate = (value: string | null) =>
        value
            ? new Date(value).toLocaleDateString('en-US', {
                year: 'numeric',
                month: 'long',
                day: 'numeric',
            })
            : 'Unknown date';

    const formatCategory = (value: string) =>
        value
            .split('-')
            .map((part) => part.charAt(0).toUpperCase() + part.slice(1))
            .join(' ');

    const formatLinkType = (value: string) => value.replaceAll('-', ' ');

    const handlePlay = async () => {
        if (!track?.hasPlayableSource) {
            return;
        }

        try {
            setPlaying(true);
            const playLink = await musicService.createPlayLink(track.id);
            playTrack({
                title: track.title,
                artist: artistNames,
                playFile: playLink.streamUrl,
            });
        } catch (err) {
            console.error('Failed to generate play link', err);
            toast.error('Unable to play this track right now');
        } finally {
            setPlaying(false);
        }
    };

    if (loading) {
        return (
            <div className="container max-w-5xl mx-auto pt-24 px-4 space-y-4">
                <Skeleton className="h-10 w-3/4" />
                <Skeleton className="h-6 w-1/2" />
                <Skeleton className="aspect-[16/9]" />
                <Skeleton className="h-4 w-full" />
                <Skeleton className="h-4 w-5/6" />
            </div>
        );
    }

    if (!track || error) {
        return (
            <div className="container max-w-4xl mx-auto pt-24 px-4 text-center">
                <Music className="mx-auto h-10 w-10 text-destructive mb-4" />
                <h1 className="text-2xl font-bold mb-2">Track Not Found</h1>
                <p className="text-muted-foreground mb-6">{error}</p>
                <div className="flex justify-center gap-4">
                    <Button variant="outline" onClick={() => router.back()}>
                        <ArrowLeft className="mr-2 h-4 w-4" />
                        Go Back
                    </Button>
                    <Button asChild>
                        <Link href="/music">All Tracks</Link>
                    </Button>
                </div>
            </div>
        );
    }

    return (
        <div className="pt-8">
            <div className="container max-w-5xl mx-auto px-4 pt-12 mb-12">
                <Button variant="ghost" size="sm" asChild className="mb-6">
                    <Link href="/music">
                        <ArrowLeft className="mr-2 h-4 w-4" />
                        Back to Music
                    </Link>
                </Button>

                <div className="grid grid-cols-1 lg:grid-cols-[320px_1fr] gap-8">
                    <div className="relative aspect-square rounded-2xl overflow-hidden border bg-muted">
                        {track.cover ? (
                            <Image
                                src={getVersionedMusicCoverUrl(track) ?? track.cover}
                                alt={track.title}
                                fill
                                sizes="(max-width: 768px) 100vw, (max-width: 1280px) 40vw, 512px"
                                className="object-cover"
                                priority
                            />
                        ) : (
                            <div className="h-full w-full flex items-center justify-center text-muted-foreground">
                                <Disc3 className="h-12 w-12" />
                            </div>
                        )}
                    </div>

                    <div className="space-y-5">
                        <div className="flex flex-wrap items-center gap-2">
                            <Badge variant="secondary">{formatCategory(track.category)}</Badge>
                            {!track.hasPlayableSource ? (
                                <Badge variant="outline">Inactive</Badge>
                            ) : null}
                            {track.featured ? (
                                <Badge variant="outline">Featured</Badge>
                            ) : null}
                        </div>

                        <h1 className="text-4xl md:text-5xl font-bold tracking-tight">{track.title}</h1>

                        <p className="text-lg text-muted-foreground leading-relaxed">{track.description}</p>

                        <div className="flex flex-wrap gap-6 text-sm text-muted-foreground">
                            <span className="flex items-center gap-2">
                                <UserRound className="h-4 w-4" />
                                {artistNames}
                            </span>
                            <span className="flex items-center gap-2">
                                <Calendar className="h-4 w-4" />
                                {formatReleaseDate(track.releaseDate)}
                            </span>
                            {track.genre ? (
                                <span className="flex items-center gap-2">
                                    <Music className="h-4 w-4" />
                                    {track.genre}
                                </span>
                            ) : null}
                        </div>

                        {track.tags.length > 0 ? (
                            <div className="flex flex-wrap gap-2">
                                {track.tags.map((tag) => (
                                    <Badge key={tag} variant="outline">
                                        {tag}
                                    </Badge>
                                ))}
                            </div>
                        ) : null}

                        <div className="flex flex-wrap items-center gap-2">
                            {track.hasPlayableSource ? (
                                <Button
                                    type="button"
                                    size="lg"
                                    className="cursor-pointer rounded-full px-6"
                                    onClick={handlePlay}
                                    disabled={playing}
                                >
                                    <Play className="mr-2 h-4 w-4 fill-current" />
                                    {playing ? 'Loading...' : 'Play'}
                                </Button>
                            ) : null}

                            {track.links.length > 0 ? (
                                <Button
                                    type="button"
                                    size="lg"
                                    variant="outline"
                                    className="rounded-full px-6"
                                    onClick={() => setStreamOpen(true)}
                                >
                                    Stream options
                                </Button>
                            ) : null}
                        </div>

                        {track.contentId ? (
                            <div className="flex flex-wrap items-center gap-4 text-sm text-muted-foreground">
                                <LikeButton
                                    contentId={track.contentId}
                                    initialCount={track.likeCount}
                                    initialLiked={track.isLiked}
                                />
                                <span className="flex items-center gap-2">
                                    <MessageSquare className="h-4 w-4" />
                                    <span>{track.commentCount}</span>
                                </span>
                            </div>
                        ) : null}
                    </div>
                </div>

                <Separator className="my-10" />

                {track.contentId ? (
                    <CommentSection contentId={track.contentId} />
                ) : (
                    <div className="rounded-lg border bg-muted/30 p-4 text-sm text-muted-foreground">
                        Comments are unavailable for this track because no content record is linked yet.
                    </div>
                )}
            </div>

            <Dialog open={streamOpen} onOpenChange={setStreamOpen}>
                <DialogContent className="sm:max-w-lg">
                    <DialogHeader>
                        <DialogTitle>{track.title}</DialogTitle>
                        <DialogDescription>
                            Open this track on your preferred platform.
                        </DialogDescription>
                    </DialogHeader>
                    <div className="flex flex-wrap gap-2">
                        {track.links.map((link) => (
                            <Button key={`${track.id}-${link.type}-${link.url}`} asChild size="sm" className="rounded-full capitalize">
                                <Link href={link.url} target="_blank" rel="noreferrer">
                                    {formatLinkType(link.type)}
                                </Link>
                            </Button>
                        ))}
                    </div>
                </DialogContent>
            </Dialog>
        </div>
    );
}
