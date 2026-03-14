"use client";

import { createContext, useCallback, useContext, useEffect, useMemo, useRef, useState } from "react";
import { Volume2 } from "lucide-react";

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
    currentTitle: string;
    currentArtist: string;
    isPlaying: boolean;
    currentTime: number;
    duration: number;
    playPause: () => void;
    stop: () => void;
    seekBy: (offsetSeconds: number) => void;
    seekTo: (seconds: number) => void;
    getVisualizerAnalyser: () => AnalyserNode | null;
};

type WindowWithWebkitAudioContext = Window &
    typeof globalThis & {
        webkitAudioContext?: typeof AudioContext;
    };

const AudioPlayerContext = createContext<AudioPlayerContextValue | null>(null);
const SIDEBAR_OPEN_EVENT = "app-sidebar:set-open";

export function AudioPlayerProvider({ children }: { children: React.ReactNode }) {
    const audioRef = useRef<HTMLAudioElement | null>(null);
    const audioContextRef = useRef<AudioContext | null>(null);
    const sourceNodeRef = useRef<MediaElementAudioSourceNode | null>(null);
    const analyserRef = useRef<AnalyserNode | null>(null);
    const outputGainRef = useRef<GainNode | null>(null);
    const [isOpen, setIsOpen] = useState(false);
    const [currentUrl, setCurrentUrl] = useState<string>("");
    const [currentTitle, setCurrentTitle] = useState<string>("");
    const [currentArtist, setCurrentArtist] = useState<string>("");
    const [isPlaying, setIsPlaying] = useState(false);
    const [currentTime, setCurrentTime] = useState(0);
    const [duration, setDuration] = useState(0);

    const dispatchSidebarState = useCallback((open: boolean) => {
        if (typeof window === "undefined") return;
        window.dispatchEvent(new CustomEvent<boolean>(SIDEBAR_OPEN_EVENT, { detail: open }));
    }, []);

    const getVisualizerAnalyser = useCallback(() => {
        if (typeof window === "undefined") return null;

        const audio = audioRef.current;
        if (!audio) return null;

        const AudioContextConstructor =
            window.AudioContext ||
            (window as WindowWithWebkitAudioContext).webkitAudioContext;

        if (!AudioContextConstructor) return null;

        if (!audioContextRef.current) {
            audioContextRef.current = new AudioContextConstructor();
        }

        const audioContext = audioContextRef.current;

        if (!sourceNodeRef.current) {
            try {
                sourceNodeRef.current = audioContext.createMediaElementSource(audio);
            } catch {
                return analyserRef.current;
            }
        }

        if (!analyserRef.current) {
            const analyser = audioContext.createAnalyser();
            analyser.fftSize = 256;
            analyser.minDecibels = -92;
            analyser.maxDecibels = -16;
            analyser.smoothingTimeConstant = 0.84;

            sourceNodeRef.current.connect(analyser);
            const outputGain = audioContext.createGain();
            outputGain.gain.value = 1;
            analyser.connect(outputGain);
            outputGain.connect(audioContext.destination);

            analyserRef.current = analyser;
            outputGainRef.current = outputGain;
        }

        if (audioContext.state === "suspended") {
            void audioContext.resume().catch(() => undefined);
        }

        return analyserRef.current;
    }, []);

    const openPlayer = useCallback((input: OpenPlayerInput | string, title?: string, artist?: string) => {
        getVisualizerAnalyser();

        if (typeof input === "string") {
            if (!input.trim()) return;
            setCurrentTime(0);
            setDuration(0);
            setIsPlaying(false);
            setCurrentUrl(input);
            setCurrentTitle(title?.trim() || "");
            setCurrentArtist(artist?.trim() || "");
            setIsOpen(true);
            dispatchSidebarState(true);
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
        dispatchSidebarState(true);
    }, [dispatchSidebarState, getVisualizerAnalyser]);

    const closePlayer = useCallback(() => {
        setIsOpen(false);
        dispatchSidebarState(false);
    }, [dispatchSidebarState]);

    const togglePlayer = useCallback(() => {
        setIsOpen((prev) => {
            const next = !prev;
            dispatchSidebarState(next);
            return next;
        });
    }, [dispatchSidebarState]);

    const hasSource = !!currentUrl.trim();

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

    useEffect(() => {
        if (typeof window === "undefined") return;

        const handleSidebarState = (event: Event) => {
            const detail = (event as CustomEvent<boolean>).detail;
            if (typeof detail === "boolean") {
                setIsOpen(detail);
            }
        };

        window.addEventListener(SIDEBAR_OPEN_EVENT, handleSidebarState as EventListener);
        return () => {
            window.removeEventListener(SIDEBAR_OPEN_EVENT, handleSidebarState as EventListener);
        };
    }, []);

    const playPause = useCallback(() => {
        const audio = audioRef.current;
        if (!audio || !hasSource) return;

        if (audio.paused) {
            getVisualizerAnalyser();
            audio.play().catch(() => {
                setIsPlaying(false);
            });
            return;
        }

        audio.pause();
    }, [getVisualizerAnalyser, hasSource]);

    const seekTo = useCallback((seconds: number) => {
        const next = Number.isFinite(seconds) ? Math.max(0, seconds) : 0;
        const audio = audioRef.current;
        if (!audio || !hasSource) return;
        audio.currentTime = next;
        setCurrentTime(next);
    }, [hasSource]);

    const stop = useCallback(() => {
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

    useEffect(() => {
        return () => {
            analyserRef.current?.disconnect();
            sourceNodeRef.current?.disconnect();
            outputGainRef.current?.disconnect();

            if (audioContextRef.current) {
                void audioContextRef.current.close().catch(() => undefined);
            }
        };
    }, []);

    const value = useMemo(
        () => ({
            openPlayer,
            closePlayer,
            togglePlayer,
            isOpen,
            hasSource,
            currentTitle,
            currentArtist,
            isPlaying,
            currentTime,
            duration,
            playPause,
            stop,
            seekBy,
            seekTo,
            getVisualizerAnalyser,
        }),
        [
            openPlayer,
            closePlayer,
            togglePlayer,
            isOpen,
            hasSource,
            currentTitle,
            currentArtist,
            isPlaying,
            currentTime,
            duration,
            playPause,
            stop,
            seekBy,
            seekTo,
            getVisualizerAnalyser,
        ]
    );

    return (
        <AudioPlayerContext.Provider value={value}>
            {children}
            <audio
                ref={audioRef}
                src={currentUrl || undefined}
                crossOrigin="anonymous"
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
                    onClick={() => {
                        setIsOpen(true);
                        dispatchSidebarState(true);
                    }}
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
