import Link from 'next/link';
import { LogoMark } from '@/components/logo-mark';
import { Github, Instagram, Linkedin, Twitter } from 'lucide-react';

const exploreLinks = [
    { href: '/', label: 'Home' },
    { href: '/blog', label: 'Blog' },
    { href: '/gallery', label: 'Gallery' },
    { href: '/music', label: 'Music' },
];

const workLinks = [
    { href: '/projects', label: 'Projects' },
    { href: '/services', label: 'Services' },
];

const infoLinks = [
    { href: '/about', label: 'About' },
    { href: '/contact', label: 'Contact' },
    { href: '/faq', label: 'FAQ' },
    { href: '/privacy', label: 'Privacy Policy' },
];

const socialLinks = [
    { href: 'https://github.com/jsm33t', label: 'GitHub', icon: Github },
    { href: 'https://twitter.com/jsm33t', label: 'Twitter', icon: Twitter },
    { href: 'https://instagram.com/jsm33t', label: 'Instagram', icon: Instagram },
    { href: 'https://linkedin.com/in/jsm33t', label: 'LinkedIn', icon: Linkedin },
];

export function Footer() {
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

                        {/* Link columns */}
                        <div className="grid grid-cols-3 gap-8 sm:gap-12">
                            <div>
                                <p className="mb-4 text-xs font-semibold uppercase tracking-widest text-foreground">
                                    Explore
                                </p>
                                <ul className="space-y-2.5">
                                    {exploreLinks.map(({ href, label }) => (
                                        <li key={href}>
                                            <Link
                                                href={href}
                                                className="relative inline-block text-sm text-muted-foreground transition-colors hover:text-foreground after:absolute after:bottom-0 after:left-0 after:h-px after:w-full after:origin-left after:scale-x-0 after:bg-current after:transition-transform after:duration-200 after:content-[''] hover:after:scale-x-100"
                                            >
                                                {label}
                                            </Link>
                                        </li>
                                    ))}
                                </ul>
                            </div>
                            <div>
                                <p className="mb-4 text-xs font-semibold uppercase tracking-widest text-foreground">
                                    Work
                                </p>
                                <ul className="space-y-2.5">
                                    {workLinks.map(({ href, label }) => (
                                        <li key={href}>
                                            <Link
                                                href={href}
                                                className="relative inline-block text-sm text-muted-foreground transition-colors hover:text-foreground after:absolute after:bottom-0 after:left-0 after:h-px after:w-full after:origin-left after:scale-x-0 after:bg-current after:transition-transform after:duration-200 after:content-[''] hover:after:scale-x-100"
                                            >
                                                {label}
                                            </Link>
                                        </li>
                                    ))}
                                </ul>
                            </div>
                            <div>
                                <p className="mb-4 text-xs font-semibold uppercase tracking-widest text-foreground">
                                    Info
                                </p>
                                <ul className="space-y-2.5">
                                    {infoLinks.map(({ href, label }) => (
                                        <li key={href}>
                                            <Link
                                                href={href}
                                                className="relative inline-block text-sm text-muted-foreground transition-colors hover:text-foreground after:absolute after:bottom-0 after:left-0 after:h-px after:w-full after:origin-left after:scale-x-0 after:bg-current after:transition-transform after:duration-200 after:content-[''] hover:after:scale-x-100"
                                            >
                                                {label}
                                            </Link>
                                        </li>
                                    ))}
                                </ul>
                            </div>
                        </div>
                    </div>

                    {/* Divider + bottom row */}
                    <div className="mt-10 border-t border-border/40 pt-6 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
                        <div className="flex flex-wrap items-center gap-x-3 gap-y-2 text-xs text-muted-foreground">
                            <span>© {new Date().getFullYear()} Jassis. All rights reserved.</span>
                            <span className="rounded-full border border-border/50 px-2 py-0.5 text-[10px] font-medium uppercase tracking-wider">
                                v1.0 · May 2026
                            </span>
                        </div>
                        <p className="text-xs text-muted-foreground">
                            Built with{' '}
                            <span className="text-foreground/85">Next.js</span>,{' '}
                            <span className="text-foreground/85">Tailwind</span> &{' '}
                            <span className="text-foreground/85">.NET</span>
                        </p>
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
