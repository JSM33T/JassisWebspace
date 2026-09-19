'use client';

import Link from 'next/link';
import { useReducedMotion } from 'framer-motion';
import { Library, Pause, Play, SkipBack, SkipForward, Square } from 'lucide-react';

import { AudioSidebarVisualizer } from '@/components/audio-sidebar-visualizer';
import { Button } from '@/components/ui/button';
import { Slider } from '@/components/ui/slider';
import { useAudioPlayer } from '@/hooks/use-audio-player';

function formatAudioTime(seconds: number) {
    if (!Number.isFinite(seconds) || seconds < 0) return '00:00';
    const totalSeconds = Math.floor(seconds);
    const minutes = Math.floor(totalSeconds / 60);
    const remainder = totalSeconds % 60;
    return `${minutes.toString().padStart(2, '0')}:${remainder.toString().padStart(2, '0')}`;
}

export function NavbarAudioControls({ isOpen }: { isOpen: boolean }) {
    const {
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
    } = useAudioPlayer();
    const reduceMotion = useReducedMotion();

    return (
        <section className="space-y-3 rounded-xl border bg-card/60 p-3" aria-labelledby="navbar-player-heading">
            <div className="flex items-center justify-between">
                <div className="space-y-0.5">
                    <h3 id="navbar-player-heading" className="text-sm font-medium">Music Player</h3>
                    <p className="text-xs text-muted-foreground">
                        {hasSource ? 'Control playback directly here' : 'Select a track to start playback'}
                    </p>
                </div>
                <Button type="button" variant="outline" size="icon" asChild className="h-11 w-11 rounded-full">
                    <Link href="/music" aria-label="Open music library"><Library className="h-4 w-4" /></Link>
                </Button>
            </div>
            {hasSource ? (
                <div className="space-y-3">
                    <div className="min-w-0">
                        <p className="truncate text-sm font-semibold">{currentTitle || 'Untitled Track'}</p>
                        <p className="truncate text-xs text-muted-foreground">{currentArtist || 'Unknown Artist'}</p>
                    </div>
                    {isOpen && !reduceMotion ? (
                        <AudioSidebarVisualizer isOpen={isOpen} isPlaying={isPlaying} getVisualizerAnalyser={getVisualizerAnalyser} />
                    ) : null}
                    <div className="space-y-2">
                        <Slider
                            thumbProps={{
                                'aria-label': 'Playback position',
                                'aria-valuetext': `${Math.floor(currentTime / 60)} minutes ${Math.floor(currentTime % 60)} seconds of ${Math.floor(duration / 60)} minutes ${Math.floor(duration % 60)} seconds`,
                            }}
                            value={[Math.min(currentTime, duration > 0 ? duration : 1)]}
                            min={0}
                            max={duration > 0 ? duration : 1}
                            step={0.1}
                            onValueChange={(values) => seekTo(values[0] ?? 0)}
                        />
                        <div className="flex items-center justify-between text-xs text-muted-foreground">
                            <span>{formatAudioTime(currentTime)}</span>
                            <span>{formatAudioTime(duration)}</span>
                        </div>
                    </div>
                    <div className="flex items-center justify-center gap-2">
                        <PlayerButton label="Rewind 10 seconds" onClick={() => seekBy(-10)}><SkipBack className="h-4 w-4" /></PlayerButton>
                        <PlayerButton label={isPlaying ? 'Pause' : 'Play'} onClick={playPause} primary>
                            {isPlaying ? <Pause className="h-4 w-4" /> : <Play className="h-4 w-4" />}
                        </PlayerButton>
                        <PlayerButton label="Stop playback" onClick={stop}><Square className="h-4 w-4" /></PlayerButton>
                        <PlayerButton label="Forward 10 seconds" onClick={() => seekBy(10)}><SkipForward className="h-4 w-4" /></PlayerButton>
                    </div>
                </div>
            ) : null}
        </section>
    );
}

function PlayerButton({ label, onClick, primary = false, children }: {
    label: string;
    onClick: () => void;
    primary?: boolean;
    children: React.ReactNode;
}) {
    return (
        <Button
            type="button"
            size="icon"
            variant={primary ? 'default' : 'outline'}
            className="h-11 w-11 rounded-full"
            aria-label={label}
            title={label}
            onClick={onClick}
        >
            {children}
        </Button>
    );
}
