"use client";

import { useCallback } from "react";
import { useAudioPlayer as useAudioPlayerContext } from "@/contexts/AudioPlayerContext";

type PlayableTrack = {
    title: string;
    artist?: string;
    playFile?: string;
};

export function useAudioPlayer() {
    return useAudioPlayerContext();
}

export function useTrackPlayer() {
    const { openPlayer, closePlayer } = useAudioPlayerContext();

    const playTrack = useCallback(
        (track: PlayableTrack) => {
            if (!track.playFile) return false;
            openPlayer({ url: track.playFile, title: track.title || "", artist: track.artist || "" });
            return true;
        },
        [openPlayer]
    );

    return {
        openPlayer,
        closePlayer,
        playTrack,
    };
}
