"use client";

import { createContext, useCallback, useContext, useEffect, useMemo, useRef, useState } from "react";
import Link from "next/link";
import { Disc3, Library, Music2, Pause, Play, SkipBack, SkipForward, Square, Volume2 } from "lucide-react";
import {
    Sheet,
    SheetContent,
    SheetDescription,
    SheetHeader,
    SheetTitle,
} from "@/components/ui/sheet";
import { Button } from "@/components/ui/button";
import { Slider } from "@/components/ui/slider";

type OpenPlayerInput = {
    url: string;
    title?: string;
    artist?: string;
};

type AudioPlayerContextValue = {
    openPlayer: (input: OpenPlayerInput | string, title?: string, artist?: string) => void;
    closePlayer: () => void;
    togglePlayer: () => void;
    isOpen: boolean;
    hasSource: boolean;
};

const AudioPlayerContext = createContext<AudioPlayerContextValue | null>(null);

export function AudioPlayerProvider({ children }: { children: React.ReactNode }) {
    const audioRef = useRef<HTMLAudioElement | null>(null);
    const [isOpen, setIsOpen] = useState(false);
    const [currentUrl, setCurrentUrl] = useState<string>("");
    const [currentTitle, setCurrentTitle] = useState<string>("");
    const [currentArtist, setCurrentArtist] = useState<string>("");
    const [isPlaying, setIsPlaying] = useState(false);
    const [currentTime, setCurrentTime] = useState(0);
    const [duration, setDuration] = useState(0);

    const openPlayer = useCallback((input: OpenPlayerInput | string, title?: string, artist?: string) => {
        if (typeof input === "string") {
            if (!input.trim()) return;
            setCurrentTime(0);
            setDuration(0);
            setIsPlaying(false);
            setCurrentUrl(input);
            setCurrentTitle(title?.trim() || "");
            setCurrentArtist(artist?.trim() || "");
            setIsOpen(true);
            return;
        }

        if (!input.url.trim()) return;
        setCurrentTime(0);
        setDuration(0);
        setIsPlaying(false);
        setCurrentUrl(input.url);
        setCurrentTitle(input.title?.trim() || "");
        setCurrentArtist(input.artist?.trim() || "");
        setIsOpen(true);
    }, []);

    const closePlayer = useCallback(() => {
        setIsOpen(false);
    }, []);

    const togglePlayer = useCallback(() => {
        setIsOpen((prev) => !prev);
    }, []);

    const hasSource = !!currentUrl.trim();
    const seekMax = duration > 0 ? duration : 1;

    useEffect(() => {
        if (!hasSource) {
            return;
        }

        const audio = audioRef.current;
        if (!audio) return;

        audio.play().catch(() => {
            setIsPlaying(false);
        });
    }, [currentUrl, hasSource]);

    const handlePlayPause = useCallback(() => {
        const audio = audioRef.current;
        if (!audio || !hasSource) return;

        if (audio.paused) {
            audio.play().catch(() => {
                setIsPlaying(false);
            });
            return;
        }

        audio.pause();
    }, [hasSource]);

    const handleSeek = useCallback((values: number[]) => {
        const next = values[0] ?? 0;
        const audio = audioRef.current;
        if (!audio || !hasSource) return;
        audio.currentTime = next;
        setCurrentTime(next);
    }, [hasSource]);

    const handleStop = useCallback(() => {
        const audio = audioRef.current;
        if (!audio || !hasSource) return;
        audio.pause();
        audio.currentTime = 0;
        setCurrentTime(0);
        setIsPlaying(false);
    }, [hasSource]);

    const seekBy = useCallback((offsetSeconds: number) => {
        const audio = audioRef.current;
        if (!audio || !hasSource) return;
        const next = Math.max(0, Math.min((audio.duration || 0), audio.currentTime + offsetSeconds));
        audio.currentTime = next;
        setCurrentTime(next);
    }, [hasSource]);

    const formatTime = (seconds: number) => {
        if (!Number.isFinite(seconds) || seconds < 0) return "00:00";
        const s = Math.floor(seconds);
        const h = Math.floor(s / 3600);
        const m = Math.floor((s % 3600) / 60);
        const sec = s % 60;
        if (h > 0) {
            return `${h}:${m.toString().padStart(2, "0")}:${sec.toString().padStart(2, "0")}`;
        }
        return `${m.toString().padStart(2, "0")}:${sec.toString().padStart(2, "0")}`;
    };

    const value = useMemo(
        () => ({
            openPlayer,
            closePlayer,
            togglePlayer,
            isOpen,
            hasSource,
        }),
        [openPlayer, closePlayer, togglePlayer, isOpen, hasSource]
    );

    return (
        <AudioPlayerContext.Provider value={value}>
            {children}
            <audio
                ref={audioRef}
                src={currentUrl || undefined}
                preload="metadata"
                className="hidden"
                onPlay={() => setIsPlaying(true)}
                onPause={() => setIsPlaying(false)}
                onEnded={() => setIsPlaying(false)}
                onLoadedMetadata={(e) => {
                    const nextDuration = e.currentTarget.duration || 0;
                    setDuration(nextDuration);
                }}
                onTimeUpdate={(e) => {
                    setCurrentTime(e.currentTarget.currentTime || 0);
                }}
            >
                Your browser does not support the audio element.
            </audio>

            {hasSource && isPlaying ? (
                <button
                    type="button"
                    onClick={() => setIsOpen(true)}
                    className="fixed right-0 top-1/2 z-40 -translate-y-1/2 rounded-l-xl border border-r-0 bg-background/95 px-2 py-3 shadow-lg backdrop-blur-sm transition hover:bg-background"
                    title="Music is playing. Open player"
                >
                    <span className="flex flex-col items-center gap-1 text-[11px] font-medium">
                        <Volume2 className="h-3.5 w-3.5 text-primary" />
                        <span className="[writing-mode:vertical-rl] [text-orientation:mixed]">
                            Music is playing
                        </span>
                    </span>
                </button>
            ) : null}

            <Sheet open={isOpen} onOpenChange={setIsOpen}>
                <SheetContent side="right" className="w-full sm:max-w-md border-l bg-gradient-to-b from-background to-muted/40">
                    <SheetHeader>
                        <SheetTitle className="flex items-center gap-2">
                            <Music2 className="h-4 w-4 text-primary" />
                            Player
                        </SheetTitle>
                        <SheetDescription>{hasSource ? "Streaming securely" : "No track selected"}</SheetDescription>
                    </SheetHeader>
                    <div className="px-4 pb-6 pt-2 space-y-6">
                        <div className="rounded-2xl border bg-card/70 p-5">
                            <div className="mb-5 flex items-start justify-between gap-4">
                                <div className="flex items-center gap-4 min-w-0">
                                    <div className="flex h-14 w-14 items-center justify-center rounded-xl border bg-background/70">
                                        <Disc3 className={`h-6 w-6 text-primary ${isPlaying ? "animate-spin" : ""}`} />
                                    </div>
                                    <div className="min-w-0">
                                        <p className="truncate text-base font-semibold">{currentTitle || ""}</p>
                                        <p className="truncate text-sm text-muted-foreground">{currentArtist || ""}</p>
                                    </div>
                                </div>
                                <Button
                                    type="button"
                                    variant="outline"
                                    size="icon"
                                    asChild
                                    className="h-9 w-9 rounded-full"
                                >
                                    <Link href="/music" onClick={() => setIsOpen(false)} aria-label="Open music library">
                                        <Library className="h-4 w-4" />
                                    </Link>
                                </Button>
                            </div>
                            {hasSource ? (
                                <div className="space-y-4">
                                    <div className="flex h-10 items-end justify-between gap-1 rounded-xl border bg-background/60 px-3 py-2">
                                        {Array.from({ length: 18 }).map((_, idx) => {
                                            const normalized = (Math.sin(currentTime * 5 + idx * 0.8) + 1) / 2;
                                            const height = isPlaying
                                                ? 6 + Math.round(normalized * 22)
                                                : 5 + ((idx % 3) * 2);

                                            return (
                                                <span
                                                    key={`viz-${idx}`}
                                                    className="w-1 rounded-full bg-primary/80 transition-[height] duration-150"
                                                    style={{ height: `${height}px` }}
                                                />
                                            );
                                        })}
                                    </div>

                                    <div className="space-y-2">
                                        <Slider
                                            value={[Math.min(currentTime, seekMax)]}
                                            min={0}
                                            max={seekMax}
                                            step={0.1}
                                            onValueChange={handleSeek}
                                        />
                                        <div className="flex items-center justify-between text-xs text-muted-foreground">
                                            <span>{formatTime(currentTime)}</span>
                                            <span>{formatTime(duration)}</span>
                                        </div>
                                    </div>

                                    <div className="flex items-center justify-center gap-2">
                                        <Button
                                            type="button"
                                            size="icon"
                                            variant="outline"
                                            className="rounded-full"
                                            onClick={() => seekBy(-10)}
                                        >
                                            <SkipBack className="h-4 w-4" />
                                        </Button>
                                        <Button
                                            type="button"
                                            size="icon"
                                            className="h-11 w-11 rounded-full"
                                            onClick={handlePlayPause}
                                        >
                                            {isPlaying ? <Pause className="h-5 w-5" /> : <Play className="h-5 w-5" />}
                                        </Button>
                                        <Button
                                            type="button"
                                            size="icon"
                                            variant="outline"
                                            className="rounded-full"
                                            onClick={handleStop}
                                        >
                                            <Square className="h-4 w-4" />
                                        </Button>
                                        <Button
                                            type="button"
                                            size="icon"
                                            variant="outline"
                                            className="rounded-full"
                                            onClick={() => seekBy(10)}
                                        >
                                            <SkipForward className="h-4 w-4" />
                                        </Button>
                                    </div>
                                </div>
                            ) : (
                                <div className="text-sm text-muted-foreground">
                                    Select a track to start playback.
                                </div>
                            )}
                        </div>
                    </div>
                </SheetContent>
            </Sheet>
        </AudioPlayerContext.Provider>
    );
}

export function useAudioPlayer() {
    const context = useContext(AudioPlayerContext);
    if (!context) {
        throw new Error("useAudioPlayer must be used within AudioPlayerProvider");
    }
    return context;
}
