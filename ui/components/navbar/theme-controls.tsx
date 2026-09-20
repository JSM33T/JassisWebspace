'use client';

import { AnimatePresence, motion } from 'framer-motion';
import { Check, Moon, Sun } from 'lucide-react';
import { useTheme } from 'next-themes';

import { useThemeSet } from '@/components/theme-provider';
import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';
import type { ThemeSet } from '@/themes';

function getThemePreviewBackground(themeSet: ThemeSet) {
    const background = themeSet.tokens.light.background ?? 'oklch(0.98 0.01 250)';
    const primary = themeSet.tokens.light.primary ?? 'oklch(0.68 0.12 250)';
    const accent = themeSet.tokens.light.accent ?? themeSet.tokens.light.secondary ?? primary;
    return `linear-gradient(135deg, ${background} 0%, ${accent} 55%, ${primary} 100%)`;
}

export function NavbarThemeToggle() {
    const { resolvedTheme, setTheme } = useTheme();
    const activeMode = resolvedTheme === 'dark' ? 'dark' : 'light';

    return (
        <Button
            type="button"
            variant="ghost"
            size="icon"
            className="relative h-10 w-10 rounded-full hover:bg-accent/50"
            onClick={() => setTheme(activeMode === 'dark' ? 'light' : 'dark')}
            aria-label={activeMode === 'dark' ? 'Switch to light mode' : 'Switch to dark mode'}
            title={activeMode === 'dark' ? 'Switch to light mode' : 'Switch to dark mode'}
        >
            <AnimatePresence mode="wait" initial={false}>
                <motion.span
                    key={activeMode}
                    initial={{ rotate: -90, scale: 0.7, opacity: 0 }}
                    animate={{ rotate: 0, scale: 1, opacity: 1 }}
                    exit={{ rotate: 90, scale: 0.7, opacity: 0 }}
                    transition={{ duration: 0.22, ease: 'easeOut' }}
                    className="absolute inset-0 flex items-center justify-center"
                >
                    {activeMode === 'dark' ? <Sun className="h-4 w-4" /> : <Moon className="h-4 w-4" />}
                </motion.span>
            </AnimatePresence>
        </Button>
    );
}

export function NavbarAppearanceControls() {
    const { resolvedTheme, setTheme } = useTheme();
    const { activeThemeSetId, setActiveThemeSetId, themeSets } = useThemeSet();
    const activeMode = resolvedTheme === 'dark' ? 'dark' : 'light';

    return (
        <>
            <section className="space-y-3 rounded-xl border bg-card/60 p-3" aria-labelledby="navbar-mode-heading">
                <div className="space-y-0.5">
                    <h3 id="navbar-mode-heading" className="text-sm font-medium">Mode</h3>
                    <p className="text-xs text-muted-foreground">Choose light or dark appearance</p>
                </div>
                <div className="space-y-2">
                    <div className="grid grid-cols-2 gap-1 rounded-lg border border-border/60 bg-muted/40 p-1">
                        {([
                            { mode: 'light', label: 'Light', icon: Sun },
                            { mode: 'dark', label: 'Dark', icon: Moon },
                        ] as const).map(({ mode, label, icon: Icon }) => {
                            const isActive = activeMode === mode;
                            return (
                                <button
                                    key={mode}
                                    type="button"
                                    aria-pressed={isActive}
                                    onClick={() => setTheme(mode)}
                                    className={cn(
                                        'relative flex h-11 items-center justify-center gap-2 rounded-md text-sm font-medium transition-colors focus-visible:outline-2 focus-visible:outline-primary',
                                        isActive ? 'text-foreground' : 'text-muted-foreground hover:text-foreground',
                                    )}
                                >
                                    {isActive ? (
                                        <motion.span
                                            layoutId="mode-toggle-pill"
                                            className="absolute inset-0 rounded-md border border-border/70 bg-background shadow-sm"
                                            transition={{ type: 'spring', stiffness: 380, damping: 32 }}
                                        />
                                    ) : null}
                                    <motion.span
                                        className="relative z-10"
                                        animate={{ rotate: isActive ? [0, -10, 0] : 0, scale: isActive ? 1.05 : 1 }}
                                        transition={{ duration: 0.32, ease: 'easeOut' }}
                                    >
                                        <Icon className="h-4 w-4" />
                                    </motion.span>
                                    <span className="relative z-10">{label}</span>
                                </button>
                            );
                        })}
                    </div>
                    <AnimatePresence mode="wait" initial={false}>
                        <motion.p
                            key={activeMode}
                            initial={{ y: 4, opacity: 0 }}
                            animate={{ y: 0, opacity: 1 }}
                            exit={{ y: -4, opacity: 0 }}
                            transition={{ duration: 0.2, ease: 'easeOut' }}
                            className="text-xs text-muted-foreground"
                        >
                            {activeMode === 'dark'
                                ? 'Dark mode enabled for lower glare.'
                                : 'Light mode enabled for daytime clarity.'}
                        </motion.p>
                    </AnimatePresence>
                </div>
            </section>

            <section className="space-y-3 rounded-xl border bg-card/60 p-3" aria-labelledby="navbar-theme-set-heading">
                <div className="space-y-0.5">
                    <h3 id="navbar-theme-set-heading" className="text-sm font-medium">Theme Set</h3>
                    <p className="text-xs text-muted-foreground">Pick a visual theme variant</p>
                </div>
                <div className="grid gap-2">
                    {themeSets.map((themeSet) => {
                        const isActiveTheme = themeSet.id === activeThemeSetId;
                        return (
                            <Button
                                key={themeSet.id}
                                variant="ghost"
                                size="sm"
                                className={cn(
                                    'h-auto w-full justify-start overflow-hidden whitespace-normal rounded-xl border px-2.5 py-2 text-left shadow-none',
                                    'border-border/60 bg-background/40 hover:border-border hover:bg-accent/50',
                                    isActiveTheme && 'border-primary/40 bg-accent/60 ring-1 ring-primary/20',
                                )}
                                aria-pressed={isActiveTheme}
                                onClick={() => setActiveThemeSetId(themeSet.id)}
                            >
                                <span className="relative isolate mr-3 block h-10 w-14 shrink-0 overflow-hidden rounded-md border border-border/70">
                                    <span className="block h-full w-full" style={{ background: getThemePreviewBackground(themeSet) }} />
                                    {isActiveTheme ? (
                                        <span className="absolute right-1 top-1 rounded-full bg-primary p-0.5 text-primary-foreground">
                                            <Check className="h-3 w-3" aria-hidden="true" />
                                        </span>
                                    ) : null}
                                </span>
                                <span className="min-w-0 flex-1 text-left">
                                    <span className="block truncate text-sm font-medium leading-none">{themeSet.name}</span>
                                    <span className={cn('mt-1 block break-words text-xs leading-4 text-muted-foreground', isActiveTheme && 'text-foreground/75')}>
                                        {themeSet.description ?? 'A balanced theme preset.'}
                                    </span>
                                </span>
                            </Button>
                        );
                    })}
                </div>
            </section>
        </>
    );
}
