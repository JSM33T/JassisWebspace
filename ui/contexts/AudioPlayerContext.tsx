"use client";

import { createContext, useCallback, useContext, useMemo, useState } from "react";
import { Disc3, Music2 } from "lucide-react";
import {
    Sheet,
    SheetContent,
    SheetDescription,
    SheetHeader,
    SheetTitle,
} from "@/components/ui/sheet";

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
    const [isOpen, setIsOpen] = useState(false);
    const [currentUrl, setCurrentUrl] = useState<string>("");
    const [currentTitle, setCurrentTitle] = useState<string>("");
    const [currentArtist, setCurrentArtist] = useState<string>("");

    const openPlayer = useCallback((input: OpenPlayerInput | string, title?: string, artist?: string) => {
        if (typeof input === "string") {
            if (!input.trim()) return;
            setCurrentUrl(input);
            setCurrentTitle(title?.trim() || "");
            setCurrentArtist(artist?.trim() || "");
            setIsOpen(true);
            return;
        }

        if (!input.url.trim()) return;
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
                            <div className="mb-5 flex items-center gap-4">
                                <div className="flex h-14 w-14 items-center justify-center rounded-xl border bg-background/70">
                                    <Disc3 className="h-6 w-6 text-primary" />
                                </div>
                                <div className="min-w-0">
                                    <p className="truncate text-base font-semibold">{currentTitle || ""}</p>
                                    <p className="truncate text-sm text-muted-foreground">{currentArtist || ""}</p>
                                </div>
                            </div>
                            {hasSource ? (
                                <audio
                                    key={currentUrl}
                                    controls
                                    autoPlay
                                    preload="metadata"
                                    className="w-full"
                                    src={currentUrl}
                                >
                                    Your browser does not support the audio element.
                                </audio>
                            ) : (
                                <div className="text-sm text-muted-foreground">
                                    Select a track to start playback.
                                </div>
                            )}
                        </div>

                        {hasSource ? (
                            <div className="rounded-xl border bg-background/60 p-3">
                                <p className="mb-1 text-xs uppercase tracking-wide text-muted-foreground">Source URL</p>
                                <p className="break-all text-xs text-muted-foreground">{currentUrl}</p>
                            </div>
                        ) : null}
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
