'use client';

import { useEffect, useState } from 'react';
import { AnimatePresence, motion, useReducedMotion } from 'framer-motion';
import { PanelRight, Pause, Volume2, X } from 'lucide-react';
import { Popover } from 'radix-ui';

import { NavbarAudioControls } from '@/components/navbar/audio-controls';
import { Button } from '@/components/ui/button';
import { useAudioPlayer } from '@/hooks/use-audio-player';

export function FloatingAudioPlayer() {
    const { hasSource, isPlaying, isOpen, togglePlayer } = useAudioPlayer();
    const [quickOpen, setQuickOpen] = useState(false);
    const reduceMotion = useReducedMotion();

    useEffect(() => {
        if (isOpen) setQuickOpen(false);
    }, [isOpen]);

    if (!hasSource || isOpen) return null;

    const status = isPlaying ? 'Music is playing' : 'Music is paused';
    const StatusIcon = isPlaying ? Volume2 : Pause;

    return (
        <Popover.Root open={quickOpen} onOpenChange={setQuickOpen} modal>
            <Popover.Trigger asChild>
                <button
                    type="button"
                    aria-label={`${status}. Open quick player controls`}
                    title={`${status}. Open quick player controls`}
                    className="fixed right-0 top-1/2 z-40 -translate-y-1/2 cursor-pointer rounded-l-xl border border-r-0 bg-background/95 px-2 py-3 shadow-lg backdrop-blur-sm transition hover:bg-background focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-primary"
                >
                    <span className="flex flex-col items-center gap-1 text-[11px] font-medium">
                        <StatusIcon className="h-3.5 w-3.5 text-primary" aria-hidden="true" />
                        <span className="[writing-mode:vertical-rl] [text-orientation:mixed]">{status}</span>
                    </span>
                </button>
            </Popover.Trigger>
            <Popover.Portal forceMount>
                <AnimatePresence>
                    {quickOpen ? (
                        <motion.div
                            key="backdrop"
                            aria-hidden="true"
                            className="fixed inset-0 z-50 bg-black/10 supports-backdrop-filter:backdrop-blur-xs"
                            initial={{ opacity: reduceMotion ? 1 : 0 }}
                            animate={{ opacity: 1 }}
                            exit={{ opacity: 0, pointerEvents: 'none' }}
                            transition={{ duration: reduceMotion ? 0 : 0.18, ease: 'easeOut' }}
                            style={{ pointerEvents: 'auto' }}
                            onClick={() => setQuickOpen(false)}
                        />
                    ) : null}
                    {quickOpen ? (
                        <Popover.Content
                            key="quick-controls"
                            asChild
                            forceMount
                            side="left"
                            align="center"
                            sideOffset={8}
                            collisionPadding={12}
                            aria-label="Quick music controls"
                            className="z-50 w-[min(21rem,calc(100vw-4rem))] max-h-[calc(100dvh-1.5rem)] overflow-y-auto rounded-3xl border border-border/60 bg-background/95 p-2 text-foreground shadow-lg shadow-black/10 backdrop-blur-xl"
                        >
                            <motion.div
                                initial={reduceMotion ? false : { opacity: 0, x: 12, scale: 0.96 }}
                                animate={{ opacity: 1, x: 0, scale: 1 }}
                                exit={reduceMotion ? { opacity: 0, pointerEvents: 'none' } : { opacity: 0, x: 12, scale: 0.96, pointerEvents: 'none' }}
                                transition={{ duration: reduceMotion ? 0 : 0.18, ease: 'easeOut' }}
                                style={{ transformOrigin: 'right center' }}
                            >
                                <NavbarAudioControls isOpen={quickOpen} compact />
                                <div className="mt-2 flex gap-2">
                                    <Button
                                        type="button"
                                        variant="outline"
                                        className="h-11 flex-1 rounded-full"
                                        onClick={() => {
                                            setQuickOpen(false);
                                            togglePlayer();
                                        }}
                                    >
                                        <PanelRight className="mr-2 h-4 w-4" aria-hidden="true" />
                                        Full player panel
                                    </Button>
                                    <Popover.Close asChild>
                                        <Button type="button" variant="ghost" size="icon" className="h-11 w-11 rounded-full" aria-label="Close quick player controls">
                                            <X className="h-4 w-4" aria-hidden="true" />
                                        </Button>
                                    </Popover.Close>
                                </div>
                            </motion.div>
                        </Popover.Content>
                    ) : null}
                </AnimatePresence>
            </Popover.Portal>
        </Popover.Root>
    );
}
