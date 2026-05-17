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
                <div className="rounded-3xl border border-border/50 bg-card/60 px-8 py-10 backdrop-blur-sm md:px-12 md:py-12">
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
                            <div className="mt-6 flex items-center gap-4">
                                {socialLinks.map(({ href, label, icon: Icon }) => (
                                    <Link
                                        key={label}
                                        href={href}
                                        target="_blank"
                                        rel="noreferrer"
                                        aria-label={label}
                                        className="text-muted-foreground transition-colors hover:text-foreground"
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
                                                className="text-sm text-muted-foreground transition-colors hover:text-foreground"
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
                                                className="text-sm text-muted-foreground transition-colors hover:text-foreground"
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
                                                className="text-sm text-muted-foreground transition-colors hover:text-foreground"
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
                        <p className="text-xs text-muted-foreground">
                            © {new Date().getFullYear()} Jassis. All rights reserved.
                        </p>
                        <div className="flex items-center gap-5">
                            <Link href="/privacy" className="text-xs text-muted-foreground transition-colors hover:text-foreground">
                                Privacy Policy
                            </Link>
                            <Link href="/faq" className="text-xs text-muted-foreground transition-colors hover:text-foreground">
                                FAQ
                            </Link>
                            <Link href="/contact" className="text-xs text-muted-foreground transition-colors hover:text-foreground">
                                Contact
                            </Link>
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
