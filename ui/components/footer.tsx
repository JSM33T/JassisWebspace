'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { navigationSections, footerUtilityLinks, isNavigationActive, navigationAriaCurrent } from '@/lib/site-navigation';
import { cn } from '@/lib/utils';
import { LogoMark } from '@/components/logo-mark';
import { Github, Instagram, Linkedin, Twitter } from 'lucide-react';
import { VersionDialog } from '@/components/version-dialog';

const socialLinks = [
    { href: 'https://github.com/jsm33t', label: 'GitHub', icon: Github },
    { href: 'https://twitter.com/jsm33t', label: 'Twitter', icon: Twitter },
    { href: 'https://instagram.com/jsm33t', label: 'Instagram', icon: Instagram },
    { href: 'https://linkedin.com/in/jsm33t', label: 'LinkedIn', icon: Linkedin },
];

export function Footer() {
    const pathname = usePathname();
    return (
        <footer className="relative px-4 pb-0 pt-20 md:px-8 md:pt-24">
            <div className="mx-auto max-w-7xl">
                {/* Main card */}
                <div className="relative overflow-hidden rounded-3xl border border-border/50 bg-card/60 px-8 py-10 backdrop-blur-sm md:px-12 md:py-12">
                    {/* Top gradient accent — mirrors the navbar hairline */}
                    <div
                        aria-hidden="true"
                        className="pointer-events-none absolute inset-x-16 top-0 h-px bg-gradient-to-r from-transparent via-primary/40 to-transparent"
                    />

                    <div className="flex flex-col gap-10 lg:flex-row lg:justify-between">
                        {/* Brand column */}
                        <div className="max-w-xs">
                            <Link href="/" className="flex items-center gap-2.5">
                                <LogoMark className="h-7 w-7 text-foreground" />
                                <span className="text-lg font-semibold tracking-tight">Jassis</span>
                            </Link>
                            <p className="mt-4 text-sm leading-relaxed text-muted-foreground">
                                A personal space for projects, music, galleries, and everything in between.
                            </p>
                            <div className="mt-6 -ml-2 flex items-center gap-1">
                                {socialLinks.map(({ href, label, icon: Icon }) => (
                                    <Link
                                        key={label}
                                        href={href}
                                        target="_blank"
                                        rel="noreferrer"
                                        aria-label={label}
                                        className="flex h-9 w-9 items-center justify-center rounded-full text-muted-foreground transition-all duration-200 hover:-translate-y-0.5 hover:bg-accent/40 hover:text-foreground"
                                    >
                                        <Icon className="h-4 w-4" />
                                    </Link>
                                ))}
                            </div>
                        </div>

                        <nav aria-label="Footer navigation" className="grid grid-cols-2 gap-8 sm:grid-cols-3 sm:gap-12">
                            {navigationSections.map((section) => (
                                <div key={section.id}>
                                    <p className="mb-4 text-xs font-semibold uppercase tracking-widest text-foreground">
                                        {section.label}
                                    </p>
                                    <ul className="space-y-2.5">
                                        {section.items.map(({ href, label }) => (
                                            <li key={href}>
                                                <Link
                                                    href={href}
                                                    aria-current={navigationAriaCurrent(pathname, href)}
                                                    className={cn(
                                                        'inline-flex min-h-9 items-center rounded-sm text-sm text-muted-foreground transition-colors hover:text-foreground hover:underline focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-primary',
                                                        isNavigationActive(pathname, href) && 'font-medium text-foreground underline underline-offset-4'
                                                    )}
                                                >
                                                    {label}
                                                </Link>
                                            </li>
                                        ))}
                                    </ul>
                                </div>
                            ))}
                        </nav>
                    </div>

                    {/* Divider + bottom row */}
                    <div className="mt-10 flex flex-col items-center gap-4 border-t border-border/40 pt-6 text-center">
                        <nav aria-label="Site information" className="flex flex-wrap justify-center gap-x-6 gap-y-2">
                            {footerUtilityLinks.map(({ href, label }) => (
                                <Link
                                    key={href}
                                    href={href}
                                    aria-current={navigationAriaCurrent(pathname, href)}
                                    className={cn(
                                        'inline-flex min-h-9 items-center rounded-sm text-sm text-muted-foreground hover:text-foreground hover:underline focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-primary',
                                        isNavigationActive(pathname, href) && 'font-medium text-foreground underline underline-offset-4'
                                    )}
                                >
                                    {label}
                                </Link>
                            ))}
                        </nav>
                        <div className="flex flex-col items-center gap-1.5 text-xs text-muted-foreground sm:flex-row sm:gap-3">
                            <span>© {new Date().getFullYear()} Jassis. All rights reserved.</span>
                            <VersionDialog />
                        </div>
                    </div>
                </div>

            </div>

            {/* Watermark — full viewport width, submerged */}
            <div
                className="pointer-events-none select-none overflow-hidden text-center w-screen relative left-1/2 -translate-x-1/2 h-[clamp(4rem,16vw,13rem)]"
                style={{ maskImage: 'linear-gradient(to bottom, black 50%, transparent 100%)' }}
                aria-hidden="true"
            >
                <span className="block text-[clamp(6rem,22vw,18rem)] font-black uppercase leading-none tracking-tighter text-foreground/[0.055]">
                    jassi&apos;s
                </span>
            </div>
        </footer>
    );
}
