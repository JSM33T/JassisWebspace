'use client';

import { useEffect, useRef, useState } from 'react';
import { cn } from '@/lib/utils';

const IDLE_LEVELS = [
    0.2, 0.3, 0.42, 0.56, 0.44, 0.3, 0.24, 0.34, 0.48,
    0.62, 0.52, 0.38, 0.26, 0.32, 0.46, 0.58, 0.48, 0.34,
];

const BOX_ROWS = 8;
const HIGH_END_CUTOFF_RATIO = 0.9;
const FREQUENCY_SPREAD_EXPONENT = 1.4;

type AudioSidebarVisualizerProps = {
    isOpen: boolean;
    isPlaying: boolean;
    getVisualizerAnalyser: () => AnalyserNode | null;
    className?: string;
};

function sampleFrequencyLevels(data: Uint8Array<ArrayBuffer>) {
    const barCount = IDLE_LEVELS.length;
    const usableBins = Math.max(16, Math.floor(data.length * HIGH_END_CUTOFF_RATIO));

    return Array.from({ length: barCount }, (_, index) => {
        const start = Math.floor(Math.pow(index / barCount, FREQUENCY_SPREAD_EXPONENT) * usableBins);
        const end = Math.max(
            start + 1,
            Math.floor(Math.pow((index + 1) / barCount, FREQUENCY_SPREAD_EXPONENT) * usableBins)
        );

        let total = 0;
        for (let bin = start; bin < end; bin += 1) {
            total += data[bin] ?? 0;
        }

        const average = total / Math.max(1, end - start);
        const position = index / Math.max(1, barCount - 1);
        const threshold = 0.08 - position * 0.04;
        const gain = 0.9 + position * 0.34;
        const normalized = Math.max(0, average / 255 - threshold) * gain;

        return Math.min(0.98, Math.max(0.08, normalized * 1.22));
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
    const frequencyDataRef = useRef<Uint8Array<ArrayBuffer> | null>(null);
    const smoothedLevelsRef = useRef<number[]>(IDLE_LEVELS.slice());
    const bassAverageRef = useRef(0.18);
    const displayLevels = isOpen && isPlaying ? levels : IDLE_LEVELS;

    const renderColumns = (muted = false) =>
        displayLevels.map((level, columnIndex) => {
            const activeBoxes = Math.max(1, Math.round(level * BOX_ROWS));

            return (
                <div
                    key={`${muted ? 'reflection' : 'main'}-${columnIndex}`}
                    className="grid h-full flex-1 gap-1"
                    style={{ gridTemplateRows: `repeat(${BOX_ROWS}, minmax(0, 1fr))` }}
                >
                    {Array.from({ length: BOX_ROWS }, (_, rowIndex) => {
                        const rowFromBottom = BOX_ROWS - rowIndex;
                        const isActive = rowFromBottom <= activeBoxes;

                        return (
                            <span
                                key={rowIndex}
                                className={cn(
                                    'w-full rounded-[3px] border transition-[background-color,opacity,box-shadow] duration-150 ease-out',
                                    isActive
                                        ? rowFromBottom <= 2
                                            ? 'border-lime-300/60 bg-lime-400 shadow-[0_0_12px_rgba(132,204,22,0.4)]'
                                            : rowFromBottom <= 5
                                            ? 'border-yellow-300/60 bg-yellow-400 shadow-[0_0_14px_rgba(250,204,21,0.34)]'
                                            : 'border-orange-300/60 bg-orange-500 shadow-[0_0_16px_rgba(249,115,22,0.32)]'
                                        : 'border-border/70 bg-background/80 shadow-[inset_0_1px_0_rgba(255,255,255,0.22)] dark:border-black/60 dark:bg-black/45 dark:shadow-none',
                                    isActive
                                        ? muted
                                            ? 'opacity-35'
                                            : isPlaying
                                                ? 'opacity-100'
                                                : 'opacity-75'
                                        : muted
                                            ? 'opacity-0'
                                            : 'opacity-35'
                                )}
                            />
                        );
                    })}
                </div>
            );
        });

    useEffect(() => {
        if (!isOpen || !isPlaying) {
            smoothedLevelsRef.current = IDLE_LEVELS.slice();
            bassAverageRef.current = 0.18;
            return;
        }

        const updateLevels = () => {
            const analyser = getVisualizerAnalyser();
            if (analyser) {
                const existingBuffer = frequencyDataRef.current;
                const buffer =
                    existingBuffer && existingBuffer.length === analyser.frequencyBinCount
                        ? existingBuffer
                        : new Uint8Array(new ArrayBuffer(analyser.frequencyBinCount));

                frequencyDataRef.current = buffer;
                analyser.getByteFrequencyData(buffer);

                const sampledLevels = sampleFrequencyLevels(buffer);
                const bassWindow = sampledLevels.slice(0, 4);
                const bassEnergy =
                    bassWindow.reduce((total, value) => total + value, 0) / Math.max(1, bassWindow.length);
                const bassAverage = bassAverageRef.current + (bassEnergy - bassAverageRef.current) * 0.08;
                bassAverageRef.current = bassAverage;
                const beatPulse = Math.max(0, Math.min(0.26, (bassEnergy - bassAverage * 1.06) * 1.5));

                const responsiveLevels = sampledLevels.map((level, index) => {
                    const beatWeight = 1 - (index / Math.max(1, sampledLevels.length - 1)) * 0.55;
                    return Math.min(0.98, level + beatPulse * beatWeight);
                });

                const smoothedLevels = responsiveLevels.map((level, index) => {
                    const previous = smoothedLevelsRef.current[index] ?? IDLE_LEVELS[index] ?? 0.2;
                    const response = level > previous ? 0.78 : 0.24;
                    return previous + (level - previous) * response;
                });

                smoothedLevelsRef.current = smoothedLevels;
                setLevels(smoothedLevels);
            }

            frameRef.current = window.requestAnimationFrame(updateLevels);
        };

        frameRef.current = window.requestAnimationFrame(updateLevels);

        return () => {
            if (frameRef.current !== null) {
                window.cancelAnimationFrame(frameRef.current);
                frameRef.current = null;
            }
        };
    }, [getVisualizerAnalyser, isOpen, isPlaying]);

    return (
        <div
            className={cn(
                'relative overflow-hidden rounded-xl border border-border/60 bg-background/90 p-3 shadow-[inset_0_1px_0_rgba(255,255,255,0.4)] dark:bg-[#040704] dark:shadow-[inset_0_1px_0_rgba(255,255,255,0.03)]',
                className
            )}
        >
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
            <div className="relative mt-4">
                <div className="absolute inset-0 rounded-lg border border-border/50 dark:border-white/5" />
                <div className="relative flex h-28 items-stretch gap-1.5 rounded-lg bg-muted/55 px-2 py-2 dark:bg-black/40">
                    {renderColumns()}
                </div>
                <div className="pointer-events-none relative mt-2 overflow-hidden">
                    <div className="flex h-12 origin-top scale-y-[-0.55] items-stretch gap-1.5 px-2 opacity-45 blur-[1px]">
                        {renderColumns(true)}
                    </div>
                    <div className="absolute inset-0 bg-background/75 dark:bg-black/75" />
                </div>
            </div>
        </div>
    );
}
