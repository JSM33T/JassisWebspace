'use client';

import { startTransition, useEffect, useRef, useState } from 'react';
import { cn } from '@/lib/utils';

const IDLE_LEVELS = [
    0.2, 0.3, 0.42, 0.56, 0.44, 0.3, 0.24, 0.34, 0.48,
    0.62, 0.52, 0.38, 0.26, 0.32, 0.46, 0.58, 0.48, 0.34,
];

const FRAME_INTERVAL_MS = 1000 / 28;

type AudioSidebarVisualizerProps = {
    isOpen: boolean;
    isPlaying: boolean;
    getVisualizerAnalyser: () => AnalyserNode | null;
    className?: string;
};

function sampleFrequencyLevels(data: Uint8Array) {
    const barCount = IDLE_LEVELS.length;
    const usableBins = Math.max(12, Math.floor(data.length * 0.82));

    return Array.from({ length: barCount }, (_, index) => {
        const start = Math.floor(Math.pow(index / barCount, 1.65) * usableBins);
        const end = Math.max(
            start + 1,
            Math.floor(Math.pow((index + 1) / barCount, 1.65) * usableBins)
        );

        let total = 0;
        for (let bin = start; bin < end; bin += 1) {
            total += data[bin] ?? 0;
        }

        const average = total / Math.max(1, end - start);
        const normalized = average / 255;
        return Math.min(0.98, Math.max(0.14, normalized * 1.25));
    });
}

export function AudioSidebarVisualizer({
    isOpen,
    isPlaying,
    getVisualizerAnalyser,
    className,
}: AudioSidebarVisualizerProps) {
    const [levels, setLevels] = useState(IDLE_LEVELS);
    const frameRef = useRef<number | null>(null);
    const lastFrameTimeRef = useRef(0);
    const frequencyDataRef = useRef<Uint8Array | null>(null);
    const smoothedLevelsRef = useRef<number[]>(IDLE_LEVELS.slice());
    const displayLevels = isOpen && isPlaying ? levels : IDLE_LEVELS;

    useEffect(() => {
        if (!isOpen || !isPlaying) {
            smoothedLevelsRef.current = IDLE_LEVELS.slice();
            return;
        }

        lastFrameTimeRef.current = 0;
        const updateLevels = (timestamp: number) => {
            if (timestamp - lastFrameTimeRef.current >= FRAME_INTERVAL_MS) {
                lastFrameTimeRef.current = timestamp;

                const analyser = getVisualizerAnalyser();
                if (analyser) {
                    const existingBuffer = frequencyDataRef.current;
                    const buffer =
                        existingBuffer && existingBuffer.length === analyser.frequencyBinCount
                            ? existingBuffer
                            : new Uint8Array(analyser.frequencyBinCount);

                    frequencyDataRef.current = buffer;
                    analyser.getByteFrequencyData(buffer);

                    const sampledLevels = sampleFrequencyLevels(buffer);
                    const smoothedLevels = sampledLevels.map((level, index) => {
                        const previous = smoothedLevelsRef.current[index] ?? IDLE_LEVELS[index] ?? 0.2;
                        return previous + (level - previous) * 0.38;
                    });

                    smoothedLevelsRef.current = smoothedLevels;
                    startTransition(() => setLevels(smoothedLevels));
                }
            }

            frameRef.current = window.requestAnimationFrame(updateLevels);
        };

        frameRef.current = window.requestAnimationFrame(updateLevels);

        return () => {
            if (frameRef.current !== null) {
                window.cancelAnimationFrame(frameRef.current);
                frameRef.current = null;
            }
            lastFrameTimeRef.current = 0;
        };
    }, [getVisualizerAnalyser, isOpen, isPlaying]);

    return (
        <div
            className={cn(
                'relative overflow-hidden rounded-xl border border-border/60 bg-gradient-to-br from-primary/12 via-background/90 to-accent/35 p-3',
                className
            )}
        >
            <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(circle_at_top,_rgba(255,255,255,0.18),_transparent_58%)] opacity-50" />
            <div className="relative flex items-center justify-between text-[10px] font-semibold uppercase tracking-[0.24em] text-muted-foreground/80">
                <span>Visualizer</span>
                <span className="inline-flex items-center gap-1.5">
                    <span
                        className={cn(
                            'h-2 w-2 rounded-full transition-colors',
                            isPlaying ? 'bg-primary shadow-sm shadow-primary/40' : 'bg-muted-foreground/35'
                        )}
                    />
                    {isPlaying ? 'Live' : 'Paused'}
                </span>
            </div>
            <div className="relative mt-3 flex h-20 items-end gap-1">
                {displayLevels.map((level, index) => (
                    <span
                        key={index}
                        className={cn(
                            'flex-1 rounded-full bg-gradient-to-t from-primary/25 via-primary/80 to-foreground/90 transition-[height,opacity] duration-150 ease-out',
                            isPlaying ? 'opacity-100' : 'opacity-45'
                        )}
                        style={{ height: `${Math.round(level * 100)}%` }}
                    />
                ))}
            </div>
        </div>
    );
}
