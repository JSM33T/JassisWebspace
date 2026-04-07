'use client';

import { useState, useRef, useEffect } from 'react';
import Link from 'next/link';
import { Button } from '@/components/ui/button';
import { Slider } from '@/components/ui/slider';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Badge } from '@/components/ui/badge';
import { LogoMark } from '@/components/logo-mark';
import {
    DropdownMenu,
    DropdownMenuContent,
    DropdownMenuItem,
    DropdownMenuLabel,
    DropdownMenuSeparator,
    DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import {
    Dialog,
    DialogContent,
    DialogDescription,
    DialogFooter,
    DialogHeader,
    DialogTitle,
} from '@/components/ui/dialog';
import {
    Sheet,
    SheetContent,
    SheetDescription,
    SheetHeader,
    SheetTitle,
    SheetTrigger,
    SheetClose,
} from '@/components/ui/sheet';
import { Menu, LogOut, User, UserCircle, Settings, Shield, Sparkles, AtSign, BookOpen, FileText, ChevronDown, ChevronLeft, ChevronRight, ChevronUp, Image, Music, LayoutDashboard, Briefcase, FolderCode, PanelRight, Pause, Play, SkipBack, SkipForward, Square, Library, Sun, Moon, Mail } from 'lucide-react';
import { useUser, userHelpers } from '@/contexts/UserContext';
import { useRouter, usePathname, useSearchParams } from 'next/navigation';
import { useTheme } from 'next-themes';
import { useThemeSet } from '@/components/theme-provider';
import { useAudioPlayer } from '@/hooks/use-audio-player';
import { cn } from '@/lib/utils';
import { buildLoginHref } from '@/lib/auth-redirect';
import { AudioSidebarVisualizer } from '@/components/audio-sidebar-visualizer';
import { AnimatePresence, motion } from 'framer-motion';
import { NAVBAR_EXPANDED_EVENT, NAVBAR_EXPANDED_STORAGE_KEY } from '@/lib/navbar-layout';

const SIDEBAR_OPEN_EVENT = 'app-sidebar:set-open';

export function Navbar() {
    const { user, logout, isAuthenticated } = useUser();
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
    const { resolvedTheme, setTheme } = useTheme();
    const { activeThemeSetId, setActiveThemeSetId, themeSets } = useThemeSet();
    const router = useRouter();
    const pathname = usePathname();
    const searchParams = useSearchParams();
    const [menuOpen, setMenuOpen] = useState(false);
    const [sidebarOpen, setSidebarOpen] = useState(false);
    const [moreMenuOpen, setMoreMenuOpen] = useState(false);
    const [showLogoutDialog, setShowLogoutDialog] = useState(false);
    const [isNavbarHidden, setIsNavbarHidden] = useState(false);
    const [isRailExpanded, setIsRailExpanded] = useState(false);
    const [showRailScrollUpHint, setShowRailScrollUpHint] = useState(false);
    const [showRailScrollDownHint, setShowRailScrollDownHint] = useState(false);

    const handleLogout = async () => {
        setShowLogoutDialog(false);
        await logout();
        router.push('/');
    };

    // Liquid hover effect state
    const [, setHoveredLink] = useState<string | null>(null);
    const [hoverStyle, setHoverStyle] = useState({ left: 0, width: 0, opacity: 0 });
    const navRef = useRef<HTMLDivElement>(null);
    const railRef = useRef<HTMLDivElement>(null);
    const railScrollAreaRef = useRef<HTMLDivElement>(null);
    const [railHoverStyle, setRailHoverStyle] = useState({
        top: 0,
        left: 0,
        width: 0,
        height: 0,
        opacity: 0,
    });

    // Navigation menu configuration - single source of truth
    const normalizedRole = (user?.role ?? '').toLowerCase();

    const navigationLinks = [
        { href: '/', label: 'Home', id: 'home' },
    ];

    const studioMenuItems = [
        {
            href: '/blog',
            label: 'Blog',
            description: 'Read our latest posts and updates',
            icon: FileText,
        },
        {
            href: '/gallery',
            label: 'Gallery',
            description: 'View our creative gallery',
            icon: Image,
        },
        {
            href: '/music',
            label: 'Music',
            description: 'Explore our music collection',
            icon: Music,
        },
        //   {
        //     href: '/tools',
        //     label: 'Tools',
        //     description: 'Online Web Tools',
        //     icon: Music,
        // },
    ];

    const workMenuItems = [
        {
            href: '/projects',
            label: 'Projects',
            description: 'View our completed projects',
            icon: FolderCode,
        },
        {
            href: '/services',
            label: 'Services',
            description: 'Explore the services we offer',
            icon: Briefcase,
        },
    ];

    const aboutMenuItems = [
        {
            href: '/about',
            label: 'About',
            description: 'Learn about JassSpace and our mission',
            icon: UserCircle,
        },
        {
            href: '/contact',
            label: 'Contact',
            description: 'Get in touch with our team',
            icon: Mail,
        },
        {
            href: '/privacy',
            label: 'Privacy Policy',
            description: 'See how we handle your data',
            icon: Shield,
        },
        {
            href: '/faq',
            label: 'FAQ',
            description: 'Common questions and answers',
            icon: BookOpen,
        },
    ];

    const isActivePath = (href: string) => {
        if (href === '/') return pathname === '/';
        return pathname === href || pathname.startsWith(`${href}/`);
    };

    const isSectionActive = (items: Array<{ href: string }>) =>
        items.some((item) => isActivePath(item.href));

    const navDropdownContentClassName =
        "w-72 rounded-2xl border border-border/60 bg-background/70 p-2 text-foreground shadow-xl shadow-black/10 backdrop-blur-xl supports-[backdrop-filter]:bg-background/60";

    const formatAudioTime = (seconds: number) => {
        if (!Number.isFinite(seconds) || seconds < 0) return '00:00';
        const s = Math.floor(seconds);
        const m = Math.floor(s / 60);
        const sec = s % 60;
        return `${m.toString().padStart(2, '0')}:${sec.toString().padStart(2, '0')}`;
    };

    const getThemePreviewBackground = (themeSet: (typeof themeSets)[number]) => {
        const background = themeSet.tokens.light.background ?? 'oklch(0.98 0.01 250)';
        const primary = themeSet.tokens.light.primary ?? 'oklch(0.68 0.12 250)';
        const accent = themeSet.tokens.light.accent ?? themeSet.tokens.light.secondary ?? primary;
        return `linear-gradient(135deg, ${background} 0%, ${accent} 55%, ${primary} 100%)`;
    };

    const activeMode = resolvedTheme === 'dark' ? 'dark' : 'light';
    const currentPathWithQuery = searchParams.toString()
        ? `${pathname}?${searchParams.toString()}`
        : pathname;
    const loginHref = buildLoginHref(currentPathWithQuery);


    const roleDisplayName =
        normalizedRole === 'admin'
            ? 'Admin'
            : normalizedRole === 'mod'
                ? 'Mod'
                : normalizedRole === 'user'
                    ? 'User'
                    : normalizedRole
                        ? normalizedRole.charAt(0).toUpperCase() + normalizedRole.slice(1)
                        : 'User';

    useEffect(() => {
        const savedState = window.localStorage.getItem(NAVBAR_EXPANDED_STORAGE_KEY);
        if (savedState === 'true') {
            setIsRailExpanded(true);
        }
    }, []);

    useEffect(() => {
        window.localStorage.setItem(NAVBAR_EXPANDED_STORAGE_KEY, String(isRailExpanded));
        window.dispatchEvent(new CustomEvent<boolean>(NAVBAR_EXPANDED_EVENT, { detail: isRailExpanded }));
    }, [isRailExpanded]);

    useEffect(() => {
        const scrollArea = railScrollAreaRef.current;
        if (!scrollArea) {
            setShowRailScrollUpHint(false);
            setShowRailScrollDownHint(false);
            return;
        }

        const updateScrollHints = () => {
            const { scrollTop, clientHeight, scrollHeight } = scrollArea;
            const maxScrollTop = scrollHeight - clientHeight;
            const hasOverflow = maxScrollTop > 4;

            setShowRailScrollUpHint(hasOverflow && scrollTop > 8);
            setShowRailScrollDownHint(hasOverflow && scrollTop < maxScrollTop - 8);
        };

        updateScrollHints();
        scrollArea.addEventListener('scroll', updateScrollHints, { passive: true });
        window.addEventListener('resize', updateScrollHints);

        return () => {
            scrollArea.removeEventListener('scroll', updateScrollHints);
            window.removeEventListener('resize', updateScrollHints);
        };
    }, [isRailExpanded, sidebarOpen, pathname]);

    useEffect(() => {
        const topThreshold = 24;
        const scrollDeltaThreshold = 12;
        let lastScrollY = window.scrollY || document.documentElement.scrollTop;
        let animationFrameId: number | null = null;

        const updateNavbarVisibility = () => {
            const currentScrollY = window.scrollY || document.documentElement.scrollTop;
            const scrollDelta = currentScrollY - lastScrollY;

            if (currentScrollY <= topThreshold) {
                setIsNavbarHidden(false);
                lastScrollY = currentScrollY;
                return;
            }

            if (Math.abs(scrollDelta) < scrollDeltaThreshold) {
                return;
            }

            setIsNavbarHidden(scrollDelta > 0);
            lastScrollY = currentScrollY;
        };

        const handleScroll = () => {
            if (animationFrameId !== null) {
                return;
            }

            animationFrameId = window.requestAnimationFrame(() => {
                updateNavbarVisibility();
                animationFrameId = null;
            });
        };

        updateNavbarVisibility();

        window.addEventListener('scroll', handleScroll, { passive: true });
        return () => {
            if (animationFrameId !== null) {
                window.cancelAnimationFrame(animationFrameId);
            }
            window.removeEventListener('scroll', handleScroll);
        };
    }, []);

    useEffect(() => {
        const handleSidebarState = (event: Event) => {
            const detail = (event as CustomEvent<boolean>).detail;
            if (typeof detail === 'boolean') {
                setSidebarOpen(detail);
            }
        };

        window.addEventListener(SIDEBAR_OPEN_EVENT, handleSidebarState as EventListener);
        return () => {
            window.removeEventListener(SIDEBAR_OPEN_EVENT, handleSidebarState as EventListener);
        };
    }, []);

    useEffect(() => {
        const timeoutId = window.setTimeout(() => {
            setMenuOpen(false);
            window.dispatchEvent(new CustomEvent<boolean>(SIDEBAR_OPEN_EVENT, { detail: false }));
            setSidebarOpen(false);
        }, 0);

        return () => {
            window.clearTimeout(timeoutId);
        };
    }, [pathname]);

    const handleSidebarOpenChange = (open: boolean) => {
        setSidebarOpen(open);
        if (typeof window !== 'undefined') {
            window.dispatchEvent(new CustomEvent<boolean>(SIDEBAR_OPEN_EVENT, { detail: open }));
        }
    };

    const updateRailHoverStyle = (element: HTMLElement) => {
        const rect = element.getBoundingClientRect();
        const parentRect = railRef.current?.getBoundingClientRect();

        if (!parentRect) return;

        setRailHoverStyle({
            top: rect.top - parentRect.top - 2,
            left: rect.left - parentRect.left - 2,
            width: rect.width + 4,
            height: rect.height + 4,
            opacity: 1,
        });
    };

    const clearRailHoverStyle = () => {
        setRailHoverStyle((prev) => ({ ...prev, opacity: 0 }));
    };

    const desktopRailSections = [
        {
            title: 'Media',
            items: studioMenuItems,
        },
        {
            title: 'Work',
            items: workMenuItems,
        },
        {
            title: 'About',
            items: aboutMenuItems.filter((item) => item.href === '/about' || item.href === '/contact'),
        },
    ];

    const supportMenuItems = aboutMenuItems.filter(
        (item) => item.href === '/privacy' || item.href === '/faq'
    );

    const mobileDockItems = [
        { href: '/', label: 'Home', icon: LogoMark },
        { href: '/blog', label: 'Blog', icon: FileText },
        { href: '/gallery', label: 'Gallery', icon: Image },
        { href: '/music', label: 'Music', icon: Music },
    ];

    const mobileMenuSections = [
        {
            title: 'Explore',
            items: [
                { href: '/', label: 'Home', icon: LogoMark },
                ...studioMenuItems,
            ],
        },
        { title: 'Work', items: workMenuItems },
        { title: 'About', items: aboutMenuItems },
    ];

    const railItemClassName =
        'group relative flex h-11 cursor-pointer items-center rounded-2xl border border-transparent bg-background/35 text-muted-foreground outline-none transition-all duration-200 hover:-translate-y-0.5 hover:text-foreground focus-visible:border-ring focus-visible:ring-ring/50 focus-visible:ring-[3px]';

    const railIconClassName = 'h-[18px] w-[18px]';
    const railHomeIconClassName = 'h-[28px] w-[28px]';

    const railBubbleClassName =
        'pointer-events-none absolute left-full top-1/2 ml-3 -translate-y-1/2 translate-x-1 whitespace-nowrap rounded-xl border border-border/70 bg-background/95 px-3 py-1.5 text-xs font-medium text-foreground opacity-0 shadow-lg shadow-black/10 transition-all duration-200 group-hover:translate-x-0 group-hover:opacity-100 group-focus-visible:translate-x-0 group-focus-visible:opacity-100';


    return (
        <>
            <nav className="fixed inset-y-4 left-4 z-50 hidden lg:flex">
                <div className="relative h-full">
                    <div className="absolute inset-0 rounded-[2rem] bg-gradient-to-b from-primary/20 via-primary/8 to-primary/16 blur-2xl" />
                    <div
                        ref={railRef}
                        className={cn(
                            'relative flex h-full min-h-0 flex-col justify-between overflow-hidden rounded-[2rem] border border-border/60 bg-background/85 px-3 py-4 shadow-2xl shadow-black/10 backdrop-blur-xl supports-[backdrop-filter]:bg-background/75',
                            isRailExpanded ? 'w-64 items-stretch' : 'w-20 items-center'
                        )}
                        onMouseLeave={clearRailHoverStyle}
                        onBlurCapture={(event) => {
                            const nextTarget = event.relatedTarget;
                            if (!(nextTarget instanceof Node) || !event.currentTarget.contains(nextTarget)) {
                                clearRailHoverStyle();
                            }
                        }}
                    >
                        <motion.span
                            aria-hidden="true"
                            className="pointer-events-none absolute rounded-[1.35rem] border border-border/70 bg-accent/70 shadow-lg shadow-primary/10 backdrop-blur-sm"
                            animate={{
                                top: railHoverStyle.top,
                                left: railHoverStyle.left,
                                width: railHoverStyle.width,
                                height: railHoverStyle.height,
                                opacity: railHoverStyle.opacity,
                            }}
                            transition={{ type: 'spring', stiffness: 360, damping: 30, mass: 0.45 }}
                        />
                        <div className="flex min-h-0 w-full flex-1 flex-col items-center gap-3 overflow-hidden">
                            <Link
                                href="/"
                                className={cn(
                                    'group relative flex h-12 items-center rounded-2xl border border-primary/20 bg-gradient-to-br from-primary/18 to-background/80 text-primary transition-all duration-200 hover:-translate-y-0.5',
                                    isRailExpanded ? 'w-full justify-start gap-3 px-3' : 'w-12 justify-center'
                                )}
                                aria-label="Home"
                                title="Home"
                                onMouseEnter={(event) => updateRailHoverStyle(event.currentTarget)}
                                onFocus={(event) => updateRailHoverStyle(event.currentTarget)}
                            >
                                <LogoMark className={railHomeIconClassName} />
                                {isRailExpanded ? (
                                    <span className="truncate text-sm font-semibold text-foreground">Home</span>
                                ) : (
                                    <span className={railBubbleClassName}>Home</span>
                                )}
                            </Link>

                            <button
                                type="button"
                                className={cn(
                                    railItemClassName,
                                    isRailExpanded ? 'w-full justify-between px-3' : 'w-11 justify-center'
                                )}
                                onClick={() => setIsRailExpanded((prev) => !prev)}
                                aria-expanded={isRailExpanded}
                                aria-label={isRailExpanded ? 'Collapse navigation' : 'Expand navigation'}
                                title={isRailExpanded ? 'Collapse navigation' : 'Expand navigation'}
                                onMouseEnter={(event) => updateRailHoverStyle(event.currentTarget)}
                                onFocus={(event) => updateRailHoverStyle(event.currentTarget)}
                            >
                                <span className={cn('flex items-center', isRailExpanded ? 'gap-3' : 'justify-center')}>
                                    {isRailExpanded ? (
                                        <ChevronLeft className={railIconClassName} />
                                    ) : (
                                        <ChevronRight className={railIconClassName} />
                                    )}
                                    {isRailExpanded ? (
                                        <span className="truncate text-sm font-medium text-foreground">Collapse menu</span>
                                    ) : null}
                                </span>
                                {!isRailExpanded ? <span className={railBubbleClassName}>Expand menu</span> : null}
                            </button>

                            <div className={cn('bg-gradient-to-r from-transparent via-border to-transparent', isRailExpanded ? 'h-px w-full' : 'h-px w-10')} />

                            <div className="relative flex min-h-0 w-full flex-1 flex-col overflow-hidden">
                                {showRailScrollUpHint ? (
                                    <div className="pointer-events-none absolute inset-x-0 top-0 z-10 flex justify-center">
                                        <div className="mt-1 flex items-center gap-1 rounded-full border border-border/70 bg-background/92 px-2.5 py-1 text-[10px] font-semibold uppercase tracking-[0.18em] text-muted-foreground shadow-sm backdrop-blur-sm">
                                            <ChevronUp className="h-3 w-3" />
                                            <span>Scroll</span>
                                        </div>
                                    </div>
                                ) : null}
                                {showRailScrollDownHint ? (
                                    <div className="pointer-events-none absolute inset-x-0 bottom-0 z-10 flex justify-center">
                                        <div className="mb-1 flex items-center gap-1 rounded-full border border-border/70 bg-background/92 px-2.5 py-1 text-[10px] font-semibold uppercase tracking-[0.18em] text-muted-foreground shadow-sm backdrop-blur-sm">
                                            <span>Scroll</span>
                                            <ChevronDown className="h-3 w-3" />
                                        </div>
                                    </div>
                                ) : null}
                                <div
                                    ref={railScrollAreaRef}
                                    className="flex min-h-0 w-full flex-1 flex-col overflow-y-auto overflow-x-hidden overscroll-contain pr-1"
                                >
                                <div className="flex w-full flex-col gap-3 pb-2">
                                    {desktopRailSections.map((section, sectionIndex) => (
                                        <ul
                                            key={`rail-section-${sectionIndex}`}
                                            role="group"
                                            aria-label={section.title ?? 'Primary'}
                                            className={cn('flex flex-col gap-2', isRailExpanded ? 'w-full items-stretch' : 'items-center')}
                                        >
                                            {isRailExpanded && section.title ? (
                                                <li className="px-3 pt-1">
                                                    <p className="text-[11px] font-semibold uppercase tracking-[0.2em] text-muted-foreground">
                                                        {section.title}
                                                    </p>
                                                </li>
                                            ) : null}
                                            {section.items.map((item) => {
                                                const Icon = item.icon;
                                                const isActive = isActivePath(item.href);

                                                return (
                                                    <li key={item.href} className={cn(isRailExpanded ? 'w-full' : 'contents')}>
                                                        <Link
                                                            href={item.href}
                                                            aria-current={isActive ? 'page' : undefined}
                                                            aria-label={item.label}
                                                            title={item.label}
                                                            className={cn(
                                                                railItemClassName,
                                                                isRailExpanded ? 'w-full justify-start gap-3 px-3' : 'w-11 justify-center',
                                                                isActive && 'border-primary/30 bg-primary/12 text-foreground shadow-sm shadow-primary/10'
                                                            )}
                                                            onMouseEnter={(event) => updateRailHoverStyle(event.currentTarget)}
                                                            onFocus={(event) => updateRailHoverStyle(event.currentTarget)}
                                                        >
                                                            <Icon className={railIconClassName} />
                                                            {isActive ? (
                                                                <span className="absolute -left-1 h-2 w-2 rounded-full bg-primary" />
                                                            ) : null}
                                                            {isRailExpanded ? (
                                                                <span className="truncate text-sm font-medium text-foreground">{item.label}</span>
                                                            ) : (
                                                                <span className={railBubbleClassName}>{item.label}</span>
                                                            )}
                                                        </Link>
                                                    </li>
                                                );
                                            })}
                                            {sectionIndex < desktopRailSections.length - 1 ? (
                                                <li
                                                    className={cn(
                                                        'mt-1 h-px bg-gradient-to-r from-transparent via-border/80 to-transparent',
                                                        isRailExpanded ? 'w-full' : 'w-8'
                                                    )}
                                                />
                                            ) : null}
                                        </ul>
                                    ))}
                                </div>
                            </div>
                            </div>
                        </div>

                        <div className="flex w-full flex-col items-center gap-2 border-t border-border/70 pt-3">
                            {isRailExpanded ? (
                                <div className="w-full px-3">
                                    <p className="text-[11px] font-semibold uppercase tracking-[0.2em] text-muted-foreground">
                                        Utilities
                                    </p>
                                </div>
                            ) : null}
                            <DropdownMenu open={moreMenuOpen} onOpenChange={setMoreMenuOpen}>
                                <DropdownMenuTrigger asChild>
                                    <button
                                        type="button"
                                        className={cn(
                                            railItemClassName,
                                            isRailExpanded ? 'w-full justify-between border-border/60 bg-background/55 px-3' : 'w-11 justify-center border-border/60 bg-background/55'
                                        )}
                                        aria-haspopup="menu"
                                        aria-expanded={moreMenuOpen}
                                        aria-label="More links"
                                        title="More links"
                                        onMouseEnter={(event) => updateRailHoverStyle(event.currentTarget)}
                                        onFocus={(event) => updateRailHoverStyle(event.currentTarget)}
                                    >
                                        <span className={cn('flex items-center', isRailExpanded ? 'gap-3' : 'justify-center')}>
                                            <Menu className={railIconClassName} />
                                            {isRailExpanded ? (
                                                <span className="truncate text-sm font-medium text-foreground">More</span>
                                            ) : null}
                                        </span>
                                        {isRailExpanded ? (
                                            <ChevronRight className={cn('h-4 w-4 shrink-0 text-muted-foreground transition-transform', moreMenuOpen && 'rotate-90 text-foreground')} />
                                        ) : (
                                            <span className={railBubbleClassName}>More</span>
                                        )}
                                    </button>
                                </DropdownMenuTrigger>
                                <DropdownMenuContent className={navDropdownContentClassName} side="right" align="end" sideOffset={16}>
                                    {supportMenuItems.map((item) => {
                                        const Icon = item.icon;
                                        const isActive = isActivePath(item.href);
                                        return (
                                            <DropdownMenuItem key={item.href} asChild>
                                                <Link
                                                    href={item.href}
                                                    className={cn(
                                                        'flex cursor-pointer items-center gap-3 rounded-xl border border-transparent p-3 transition-colors',
                                                        'hover:border-border/50 hover:bg-accent/60',
                                                        isActive && 'border-border/70 bg-accent/70'
                                                    )}
                                                >
                                                    <Icon className={cn('h-5 w-5 shrink-0 text-primary', isActive && 'text-foreground')} />
                                                    <div className="flex flex-col">
                                                        <span className="font-medium">{item.label}</span>
                                                        <span className="text-xs text-muted-foreground">{item.description}</span>
                                                    </div>
                                                </Link>
                                            </DropdownMenuItem>
                                        );
                                    })}
                                </DropdownMenuContent>
                            </DropdownMenu>

                            {isAuthenticated ? (
                                <DropdownMenu>
                                    <DropdownMenuTrigger asChild>
                                        <button
                                            type="button"
                                            className={cn(
                                                railItemClassName,
                                                isRailExpanded ? 'w-full justify-start gap-3 overflow-hidden px-0' : 'w-11 justify-center overflow-hidden p-0'
                                            )}
                                            aria-label="Account"
                                            title="Account"
                                            onMouseEnter={(event) => updateRailHoverStyle(event.currentTarget)}
                                            onFocus={(event) => updateRailHoverStyle(event.currentTarget)}
                                        >
                                            <Avatar
                                                className={cn(
                                                    'rounded-2xl border border-border/60',
                                                    isRailExpanded ? 'h-11 w-11 shrink-0' : 'h-full w-full'
                                                )}
                                            >
                                                <AvatarImage
                                                    src={user?.avatarUrl || '/placeholder-avatar.jpg'}
                                                    alt="User Avatar"
                                                />
                                                <AvatarFallback className="rounded-2xl text-xs">{userHelpers.getInitials(user)}</AvatarFallback>
                                            </Avatar>
                                            {isRailExpanded ? (
                                                <span className="truncate pr-3 text-sm font-medium text-foreground">Account</span>
                                            ) : (
                                                <span className={railBubbleClassName}>Account</span>
                                            )}
                                        </button>
                                    </DropdownMenuTrigger>
                                    <DropdownMenuContent className="w-56" side="right" align="end" sideOffset={16} forceMount>
                                        <DropdownMenuLabel className="font-normal">
                                            <div className="flex flex-col space-y-1">
                                                <p className="text-sm font-medium leading-none truncate">{userHelpers.getFirstName(user)}</p>
                                                <div className="flex items-center justify-between w-full gap-2 pt-0.5 text-xs text-muted-foreground">
                                                    <div className="flex items-center gap-1 truncate">
                                                        <AtSign className="h-3 w-3 text-muted-foreground/80 flex-shrink-0" />
                                                        <span className="font-medium truncate max-w-[10rem]">{user?.username?.replace(/^@+/, '')}</span>
                                                    </div>
                                                    {user?.role && (
                                                        <div className="flex-shrink-0">
                                                            <span className="text-xs text-muted-foreground/70 uppercase tracking-wide">{roleDisplayName}</span>
                                                        </div>
                                                    )}
                                                </div>
                                            </div>
                                        </DropdownMenuLabel>
                                        <DropdownMenuSeparator />
                                        {normalizedRole === 'admin' && (
                                            <DropdownMenuItem asChild>
                                                <Link href="/admin" className="cursor-pointer">
                                                    <LayoutDashboard className="mr-2 h-4 w-4" />
                                                    Admin
                                                </Link>
                                            </DropdownMenuItem>
                                        )}
                                        <DropdownMenuItem asChild>
                                            <Link href="/account/profile" className="cursor-pointer">
                                                <UserCircle className="mr-2 h-4 w-4" />
                                                Profile
                                            </Link>
                                        </DropdownMenuItem>
                                        <DropdownMenuItem asChild>
                                            <Link href="/account/preferences" className="cursor-pointer">
                                                <Settings className="mr-2 h-4 w-4" />
                                                Settings
                                            </Link>
                                        </DropdownMenuItem>
                                        <DropdownMenuItem asChild>
                                            <Link href="/account/security" className="cursor-pointer">
                                                <Shield className="mr-2 h-4 w-4" />
                                                Security
                                            </Link>
                                        </DropdownMenuItem>
                                        <DropdownMenuSeparator />
                                        <DropdownMenuItem onClick={() => setShowLogoutDialog(true)} className="cursor-pointer text-red-600 focus:text-red-600">
                                            <LogOut className="mr-2 h-4 w-4" />
                                            Logout
                                        </DropdownMenuItem>
                                    </DropdownMenuContent>
                                </DropdownMenu>
                            ) : (
                                <Link
                                    href={loginHref}
                                    className={cn(
                                        railItemClassName,
                                        isRailExpanded ? 'w-full justify-start gap-3 border-border/60 bg-background/55 px-3' : 'w-11 justify-center border-border/60 bg-background/55'
                                    )}
                                    aria-label="Login"
                                    title="Login"
                                >
                                    <User className="h-4 w-4" />
                                    {isRailExpanded ? (
                                        <span className="truncate text-sm font-medium text-foreground">Login</span>
                                    ) : (
                                        <span className={railBubbleClassName}>Login</span>
                                    )}
                                </Link>
                            )}

                            <button
                                type="button"
                                className={cn(
                                    railItemClassName,
                                    isRailExpanded ? 'w-full justify-start gap-3 border-border/60 bg-background/55 px-3' : 'w-11 justify-center border-border/60 bg-background/55',
                                    sidebarOpen && 'border-primary/30 bg-primary/12 text-foreground shadow-sm shadow-primary/10'
                                )}
                                onClick={() => handleSidebarOpenChange(true)}
                                aria-label="Player and theme"
                                title="Player and theme"
                                onMouseEnter={(event) => updateRailHoverStyle(event.currentTarget)}
                                onFocus={(event) => updateRailHoverStyle(event.currentTarget)}
                            >
                                <Settings className={railIconClassName} />
                                {isRailExpanded ? (
                                    <span className="truncate text-sm font-medium text-foreground">Player and theme</span>
                                ) : (
                                    <span className={railBubbleClassName}>Player and theme</span>
                                )}
                            </button>
                        </div>
                    </div>
                </div>
            </nav>

            <nav
                className={cn(
                    'fixed inset-x-0 bottom-4 z-50 px-4 transition-all duration-300 lg:hidden',
                    isNavbarHidden ? 'pointer-events-none translate-y-24 opacity-0' : 'translate-y-0 opacity-100'
                )}
            >
                <div className="mx-auto max-w-sm rounded-[2rem] border border-border/60 bg-background/90 p-2 shadow-2xl shadow-black/10 backdrop-blur-xl supports-[backdrop-filter]:bg-background/80">
                    <div className="grid grid-cols-5 gap-1">
                        {mobileDockItems.map((item) => {
                            const Icon = item.icon;
                            const isActive = isActivePath(item.href);
                            const isHomeItem = item.href === '/';

                            return (
                                <Link
                                    key={item.href}
                                    href={item.href}
                                    aria-current={isActive ? 'page' : undefined}
                                    className={cn(
                                        'flex h-14 flex-col items-center justify-center rounded-2xl text-[11px] font-medium transition-all duration-200',
                                        isActive
                                            ? 'bg-primary/12 text-foreground shadow-sm shadow-primary/10'
                                            : 'text-muted-foreground hover:bg-accent/70 hover:text-foreground'
                                    )}
                                >
                                    <Icon className={cn('mb-1', isHomeItem ? 'h-6 w-6' : 'h-4 w-4')} />
                                    <span>{item.label}</span>
                                </Link>
                            );
                        })}

                        <Sheet open={menuOpen} onOpenChange={setMenuOpen}>
                            <SheetTrigger asChild>
                                <button
                                    type="button"
                                    className="flex h-14 cursor-pointer flex-col items-center justify-center rounded-2xl text-[11px] font-medium text-muted-foreground transition-all duration-200 hover:bg-accent/70 hover:text-foreground"
                                    aria-label="Open menu"
                                >
                                    <Menu className="mb-1 h-4 w-4" />
                                    <span>Menu</span>
                                </button>
                            </SheetTrigger>
                            <SheetContent side="right" className="h-[100dvh] w-screen max-w-none overflow-y-auto data-[side=right]:w-screen data-[side=right]:max-w-none sm:h-full sm:w-[340px] sm:max-w-[340px]">
                                <SheetHeader>
                                    <SheetTitle>Navigation</SheetTitle>
                                    <SheetDescription>Browse the site and open quick controls.</SheetDescription>
                                </SheetHeader>
                                <div className="mt-6 space-y-5 px-4 pb-6">
                                    {isAuthenticated && user ? (
                                        <div className="rounded-3xl border border-border/60 bg-card/60 p-4">
                                            <div className="flex items-center gap-3">
                                                <Avatar className="h-11 w-11 border border-border/60">
                                                    <AvatarImage
                                                        src={user?.avatarUrl || '/placeholder-avatar.jpg'}
                                                        alt="User Avatar"
                                                    />
                                                    <AvatarFallback>{userHelpers.getInitials(user)}</AvatarFallback>
                                                </Avatar>
                                                <div className="min-w-0 flex-1">
                                                    <p className="truncate text-sm font-medium">{userHelpers.getFirstName(user)}</p>
                                                    <p className="truncate text-xs text-muted-foreground">@{user?.username?.replace(/^@+/, '')}</p>
                                                </div>
                                                {user?.role ? <Badge variant="secondary" className="rounded-full">{roleDisplayName}</Badge> : null}
                                            </div>
                                        </div>
                                    ) : (
                                        <SheetClose asChild>
                                            <Link href={loginHref}>
                                                <Button className="h-12 w-full cursor-pointer rounded-2xl">
                                                    <User className="mr-2 h-4 w-4" />
                                                    Login
                                                </Button>
                                            </Link>
                                        </SheetClose>
                                    )}

                                    <Button
                                        type="button"
                                        variant="outline"
                                        className="h-12 w-full cursor-pointer justify-start rounded-2xl"
                                        onClick={() => {
                                            setMenuOpen(false);
                                            setTimeout(() => handleSidebarOpenChange(true), 180);
                                        }}
                                    >
                                        <PanelRight className="mr-2 h-4 w-4" />
                                        Player and theme controls
                                    </Button>

                                    {mobileMenuSections.map((section) => (
                                        <div key={section.title} className="rounded-3xl border border-border/60 bg-card/60 p-3">
                                            <p className="px-2 pb-2 text-xs font-semibold uppercase tracking-[0.2em] text-muted-foreground">
                                                {section.title}
                                            </p>
                                            <div className="space-y-1">
                                                {section.items.map((item) => {
                                                    const Icon = item.icon;
                                                    const isActive = isActivePath(item.href);
                                                    const isHomeItem = item.href === '/';
                                                    return (
                                                        <SheetClose key={item.href} asChild>
                                                            <Link
                                                                href={item.href}
                                                                className={cn(
                                                                    'flex items-center gap-3 rounded-2xl px-3 py-3 text-sm font-medium transition-colors',
                                                                    isActive ? 'bg-primary/12 text-foreground' : 'hover:bg-accent/70'
                                                                )}
                                                            >
                                                                <Icon
                                                                    className={cn(
                                                                        isHomeItem ? 'h-6 w-6' : 'h-4 w-4',
                                                                        'text-primary',
                                                                        isActive && 'text-foreground'
                                                                    )}
                                                                />
                                                                <span>{item.label}</span>
                                                            </Link>
                                                        </SheetClose>
                                                    );
                                                })}
                                            </div>
                                        </div>
                                    ))}

                                    {isAuthenticated ? (
                                        <div className="rounded-3xl border border-border/60 bg-card/60 p-3">
                                            <p className="px-2 pb-2 text-xs font-semibold uppercase tracking-[0.2em] text-muted-foreground">
                                                Account
                                            </p>
                                            <div className="space-y-1">
                                                {normalizedRole === 'admin' && (
                                                    <SheetClose asChild>
                                                        <Link href="/admin" className="flex items-center gap-3 rounded-2xl px-3 py-3 text-sm font-medium hover:bg-accent/70">
                                                            <LayoutDashboard className="h-4 w-4 text-primary" />
                                                            <span>Admin</span>
                                                        </Link>
                                                    </SheetClose>
                                                )}
                                                <SheetClose asChild>
                                                    <Link href="/account/profile" className="flex items-center gap-3 rounded-2xl px-3 py-3 text-sm font-medium hover:bg-accent/70">
                                                        <UserCircle className="h-4 w-4 text-primary" />
                                                        <span>Profile</span>
                                                    </Link>
                                                </SheetClose>
                                                <SheetClose asChild>
                                                    <Link href="/account/preferences" className="flex items-center gap-3 rounded-2xl px-3 py-3 text-sm font-medium hover:bg-accent/70">
                                                        <Settings className="h-4 w-4 text-primary" />
                                                        <span>Settings</span>
                                                    </Link>
                                                </SheetClose>
                                                <SheetClose asChild>
                                                    <Link href="/account/security" className="flex items-center gap-3 rounded-2xl px-3 py-3 text-sm font-medium hover:bg-accent/70">
                                                        <Shield className="h-4 w-4 text-primary" />
                                                        <span>Security</span>
                                                    </Link>
                                                </SheetClose>
                                                <Button
                                                    variant="ghost"
                                                    className="h-12 w-full cursor-pointer justify-start rounded-2xl px-3 text-red-600 hover:bg-red-500/10 hover:text-red-700"
                                                    onClick={() => {
                                                        setMenuOpen(false);
                                                        setTimeout(() => setShowLogoutDialog(true), 180);
                                                    }}
                                                >
                                                    <LogOut className="mr-3 h-4 w-4" />
                                                    Logout
                                                </Button>
                                            </div>
                                        </div>
                                    ) : null}
                                </div>
                            </SheetContent>
                        </Sheet>
                    </div>
                </div>
            </nav>
            {false ? (
            <nav className={`fixed top-4 left-1/2 z-50 w-full max-w-5xl px-4 transition-transform duration-300 ${isNavbarHidden ? "-translate-x-1/2 -translate-y-28" : "-translate-x-1/2 translate-y-0"}`}>
                {/* Gradient border wrapper */}
                <div className="p-[1px] rounded-full bg-gradient-to-br from-primary/15 via-primary/10 to-primary/12">
                    <div className="bg-background/80 backdrop-blur-md supports-[backdrop-filter]:bg-background/65 rounded-full shadow-lg shadow-black/5 px-6 lg:px-8">
                        <div className="flex h-14 items-center justify-between">
                            {/* Logo - Icon Style */}
                            <div className="flex-shrink-0">
                                <Link href="/" className="flex items-center gap-2 group">
                                    <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-gradient-to-br from-primary/20 to-primary/10 border border-primary/20 group-hover:border-primary/40 transition-all duration-200">
                                        <Sparkles className="h-4 w-4 text-primary" />
                                    </div>
                                </Link>
                            </div>

                            {/* Desktop Navigation - Centered */}
                            <div ref={navRef} className="hidden md:flex absolute left-1/2 -translate-x-1/2 items-center gap-1" onMouseLeave={() => {
                                setHoverStyle(prev => ({ ...prev, opacity: 0 }));
                                setHoveredLink(null);
                            }}>
                                {/* Animated background */}
                                <div
                                    className="absolute bg-accent/50 rounded-full transition-all duration-300 ease-out pointer-events-none"
                                    style={{
                                        left: `${hoverStyle.left}px`,
                                        width: `${hoverStyle.width}px`,
                                        height: '32px',
                                        opacity: hoverStyle.opacity,
                                        top: '50%',
                                        transform: 'translateY(-50%)',
                                    }}
                                />
                                {navigationLinks.map((link) => (
                                    <Link
                                        key={link.id}
                                        href={link.href}
                                        className="relative px-4 py-1.5 text-sm font-medium text-center text-foreground/80 hover:text-foreground transition-colors duration-200 z-10"
                                        onMouseEnter={(e) => {
                                            const rect = e.currentTarget.getBoundingClientRect();
                                            const parentRect = navRef.current?.getBoundingClientRect();
                                            if (parentRect) {
                                                setHoverStyle({
                                                    left: rect.left - parentRect.left,
                                                    width: rect.width,
                                                    opacity: 1,
                                                });
                                            }
                                            setHoveredLink(link.id);
                                        }}
                                    >
                                        {link.label}
                                    </Link>
                                ))}

                                <DropdownMenu>
                                    <DropdownMenuTrigger asChild>
                                        <button
                                            className="group relative px-4 py-1.5 text-sm font-medium text-center text-foreground/80 hover:text-foreground transition-colors duration-200 z-10"
                                            onMouseEnter={(e) => {
                                                const rect = e.currentTarget.getBoundingClientRect();
                                                const parentRect = navRef.current?.getBoundingClientRect();
                                                if (parentRect) {
                                                    setHoverStyle({
                                                        left: rect.left - parentRect.left,
                                                        width: rect.width,
                                                        opacity: 1,
                                                    });
                                                }
                                                setHoveredLink('work');
                                            }}
                                        >
                                            Work <ChevronDown className="ml-1 inline h-3 w-3 transition-transform duration-200 group-data-[state=open]:rotate-180" />
                                        </button>
                                    </DropdownMenuTrigger>
                                    <DropdownMenuContent
                                        className={navDropdownContentClassName}
                                        align="center"
                                        sideOffset={12}
                                        collisionPadding={16}
                                    >
                                        {workMenuItems.map((item) => {
                                            const Icon = item.icon;
                                            const isActive = isActivePath(item.href);
                                            return (
                                                <DropdownMenuItem key={item.href} asChild>
                                                    <Link
                                                        href={item.href}
                                                        className={cn(
                                                            "flex cursor-pointer items-center gap-3 rounded-xl border border-transparent p-3 transition-colors",
                                                            "hover:border-border/50 hover:bg-accent/60",
                                                            isActive && "border-border/70 bg-accent/70"
                                                        )}
                                                    >
                                                        <Icon className={cn("h-5 w-5 shrink-0 text-primary", isActive && "text-foreground")} />
                                                        <div className="flex flex-col">
                                                            <span className="font-medium">{item.label}</span>
                                                            <span className="text-xs text-muted-foreground">{item.description}</span>
                                                        </div>
                                                    </Link>
                                                </DropdownMenuItem>
                                            );
                                        })}
                                    </DropdownMenuContent>
                                </DropdownMenu>



                                <DropdownMenu>
                                    <DropdownMenuTrigger asChild>
                                        <button
                                            className="group relative px-4 py-1.5 text-sm font-medium text-center text-foreground/80 hover:text-foreground transition-colors duration-200 z-10"
                                            onMouseEnter={(e) => {
                                                const rect = e.currentTarget.getBoundingClientRect();
                                                const parentRect = navRef.current?.getBoundingClientRect();
                                                if (parentRect) {
                                                    setHoverStyle({
                                                        left: rect.left - parentRect.left,
                                                        width: rect.width,
                                                        opacity: 1,
                                                    });
                                                }
                                                setHoveredLink('resources');
                                            }}
                                        >
                                            Media <ChevronDown className="ml-1 inline h-3 w-3 transition-transform duration-200 group-data-[state=open]:rotate-180" />
                                        </button>
                                    </DropdownMenuTrigger>
                                    <DropdownMenuContent
                                        className={navDropdownContentClassName}
                                        align="center"
                                        sideOffset={12}
                                        collisionPadding={16}
                                    >
                                        {studioMenuItems.map((item) => {
                                            const Icon = item.icon;
                                            const isActive = isActivePath(item.href);
                                            return (
                                                <DropdownMenuItem key={item.href} asChild>
                                                    <Link
                                                        href={item.href}
                                                        className={cn(
                                                            "flex cursor-pointer items-center gap-3 rounded-xl border border-transparent p-3 transition-colors",
                                                            "hover:border-border/50 hover:bg-accent/60",
                                                            isActive && "border-border/70 bg-accent/70"
                                                        )}
                                                    >
                                                        <Icon className={cn("h-5 w-5 shrink-0 text-primary", isActive && "text-foreground")} />
                                                        <div className="flex flex-col">
                                                            <span className="font-medium">{item.label}</span>
                                                            <span className="text-xs text-muted-foreground">{item.description}</span>
                                                        </div>
                                                    </Link>
                                                </DropdownMenuItem>
                                            );
                                        })}
                                        {/* <DropdownMenuSeparator /> */}
                                    </DropdownMenuContent>
                                </DropdownMenu>
                                <DropdownMenu>
                                    <DropdownMenuTrigger asChild>
                                        <button
                                            className="group relative px-4 py-1.5 text-sm font-medium text-center text-foreground/80 hover:text-foreground transition-colors duration-200 z-10"
                                            onMouseEnter={(e) => {
                                                const rect = e.currentTarget.getBoundingClientRect();
                                                const parentRect = navRef.current?.getBoundingClientRect();
                                                if (parentRect) {
                                                    setHoverStyle({
                                                        left: rect.left - parentRect.left,
                                                        width: rect.width,
                                                        opacity: 1,
                                                    });
                                                }
                                                setHoveredLink('about');
                                            }}
                                        >
                                            About <ChevronDown className="ml-1 inline h-3 w-3 transition-transform duration-200 group-data-[state=open]:rotate-180" />
                                        </button>
                                    </DropdownMenuTrigger>
                                    <DropdownMenuContent
                                        className={navDropdownContentClassName}
                                        align="center"
                                        sideOffset={12}
                                        collisionPadding={16}
                                    >
                                        {aboutMenuItems.map((item) => {
                                            const Icon = item.icon;
                                            const isActive = isActivePath(item.href);
                                            return (
                                                <DropdownMenuItem key={item.href} asChild>
                                                    <Link
                                                        href={item.href}
                                                        className={cn(
                                                            "flex cursor-pointer items-center gap-3 rounded-xl border border-transparent p-3 transition-colors",
                                                            "hover:border-border/50 hover:bg-accent/60",
                                                            isActive && "border-border/70 bg-accent/70"
                                                        )}
                                                    >
                                                        <Icon className={cn("h-5 w-5 shrink-0 text-primary", isActive && "text-foreground")} />
                                                        <div className="flex flex-col">
                                                            <span className="font-medium">{item.label}</span>
                                                            <span className="text-xs text-muted-foreground">{item.description}</span>
                                                        </div>
                                                    </Link>
                                                </DropdownMenuItem>
                                            );
                                        })}
                                    </DropdownMenuContent>
                                </DropdownMenu>
                            </div>

                            {/* Right Side - Icons */}
                            <div className="hidden md:flex items-center gap-2">
                                <Button
                                    variant="ghost"
                                    size="sm"
                                    className="h-8 px-2 hover:bg-accent/50"
                                    onClick={() => handleSidebarOpenChange(true)}
                                    title="Open sidebar"
                                >
                                    <PanelRight className={`h-4 w-4 ${sidebarOpen ? 'text-primary' : ''}`} />
                                </Button>
                                {isAuthenticated ? (
                                    <DropdownMenu>
                                        <DropdownMenuTrigger asChild>
                                            <Button variant="ghost" className="relative h-8 w-8 rounded-full hover:bg-accent/50">
                                                <Avatar className="h-8 w-8 border border-border/40">
                                                    <AvatarImage
                                                        src={user?.avatarUrl || '/placeholder-avatar.jpg'}
                                                        alt="User Avatar"
                                                    />
                                                    <AvatarFallback className="text-xs">{userHelpers.getInitials(user)}</AvatarFallback>
                                                </Avatar>
                                            </Button>
                                        </DropdownMenuTrigger>
                                        <DropdownMenuContent className="w-56" align="end" forceMount>
                                            <DropdownMenuLabel className="font-normal">
                                                <div className="flex flex-col space-y-1">
                                                    <p className="text-sm font-medium leading-none truncate">{userHelpers.getFirstName(user)}</p>
                                                    <div className="flex items-center justify-between w-full gap-2 pt-0.5 text-xs text-muted-foreground">
                                                        <div className="flex items-center gap-1 truncate">
                                                            <AtSign className="h-3 w-3 text-muted-foreground/80 flex-shrink-0" />
                                                            <span className="font-medium truncate max-w-[10rem]">{user?.username?.replace(/^@+/, '')}</span>
                                                        </div>
                                                        {user?.role && (
                                                            <div className="flex-shrink-0">
                                                                <span className="text-xs text-muted-foreground/70 uppercase tracking-wide">{roleDisplayName}</span>
                                                            </div>
                                                        )}
                                                    </div>
                                                </div>
                                            </DropdownMenuLabel>
                                            <DropdownMenuSeparator />
                                            {normalizedRole === 'admin' && (
                                                <DropdownMenuItem asChild>
                                                    <Link href="/admin" className="cursor-pointer">
                                                        <LayoutDashboard className="mr-2 h-4 w-4" />
                                                        Admin
                                                    </Link>
                                                </DropdownMenuItem>
                                            )}
                                            <DropdownMenuItem asChild>
                                                <Link href="/account/profile" className="cursor-pointer">
                                                    <UserCircle className="mr-2 h-4 w-4" />
                                                    Profile
                                                </Link>
                                            </DropdownMenuItem>
                                            <DropdownMenuItem asChild>
                                                <Link href="/account/preferences" className="cursor-pointer">
                                                    <Settings className="mr-2 h-4 w-4" />
                                                    Settings
                                                </Link>
                                            </DropdownMenuItem>
                                            <DropdownMenuItem asChild>
                                                <Link href="/account/security" className="cursor-pointer">
                                                    <Shield className="mr-2 h-4 w-4" />
                                                    Security
                                                </Link>
                                            </DropdownMenuItem>
                                            <DropdownMenuSeparator />
                                            <DropdownMenuItem onClick={() => setShowLogoutDialog(true)} className="cursor-pointer text-red-600 focus:text-red-600">
                                                <LogOut className="mr-2 h-4 w-4" />
                                                Logout
                                            </DropdownMenuItem>
                                        </DropdownMenuContent>
                                    </DropdownMenu>
                                ) : (
                                    <Link href={loginHref}>
                                        <Button variant="ghost" size="sm" className="h-8 hover:bg-accent/50">
                                            <User className="h-4 w-4" />
                                        </Button>
                                    </Link>
                                )}
                            </div>

                            {/* Mobile Menu */}
                            <div className="md:hidden flex items-center gap-2">
                                <Button
                                    variant="ghost"
                                    size="sm"
                                    className="h-8 px-2 hover:bg-accent/50"
                                    onClick={() => handleSidebarOpenChange(true)}
                                    title="Open sidebar"
                                >
                                    <PanelRight className={`h-4 w-4 ${sidebarOpen ? 'text-primary' : ''}`} />
                                </Button>
                                <Sheet open={menuOpen} onOpenChange={setMenuOpen}>
                                    <SheetTrigger asChild>
                                        <Button variant="outline" size="icon">
                                            <Menu className="h-4 w-4" />
                                        </Button>
                                    </SheetTrigger>
                                    <SheetContent side="right" className="h-[100dvh] w-screen max-w-none overflow-y-auto data-[side=right]:w-screen data-[side=right]:max-w-none sm:h-full sm:w-[300px] sm:max-w-[300px]">
                                        <SheetHeader>
                                            <SheetTitle>Menu</SheetTitle>
                                            <SheetDescription>Navigate through the app</SheetDescription>
                                        </SheetHeader>
                                        <div className="mt-6 space-y-4 px-4 pb-6">
                                            {!isAuthenticated && (
                                                <SheetClose asChild>
                                                    <Link href={loginHref} className="block border-b pb-4">
                                                        <Button variant="default" className="h-11 w-full text-base font-semibold">
                                                            <User className="h-4 w-4 mr-2" />
                                                            Login
                                                        </Button>
                                                    </Link>
                                                </SheetClose>
                                            )}

                                            {isAuthenticated && user && (
                                                <div className="flex items-center gap-3 pb-4 border-b">
                                                    <Avatar>
                                                        <AvatarImage
                                                            src={user?.avatarUrl || '/placeholder-avatar.jpg'}
                                                            alt="User Avatar"
                                                        />
                                                        <AvatarFallback>{userHelpers.getInitials(user)}</AvatarFallback>
                                                    </Avatar>
                                                    <div className="flex-1 min-w-0">
                                                        <p className="text-sm font-medium truncate">{userHelpers.getFirstName(user)}</p>
                                                    </div>
                                                </div>
                                            )}

                                            <div className="space-y-5">
                                                <div className="space-y-2">
                                                    {navigationLinks.map((link) => (
                                                        <SheetClose key={link.id} asChild>
                                                            <Link
                                                                href={link.href}
                                                                className={cn(
                                                                    "block rounded-md px-3 py-2 text-base font-medium transition-colors",
                                                                    "hover:bg-muted",
                                                                    isActivePath(link.href) && "bg-accent text-foreground"
                                                                )}
                                                            >
                                                                {link.label}
                                                            </Link>
                                                        </SheetClose>
                                                    ))}
                                                </div>

                                                <ul role="group" aria-label="Work" className="space-y-2 border-l border-border/60 pl-3">
                                                    <p className={cn(
                                                        "pb-1 text-xs font-semibold uppercase tracking-wider",
                                                        isSectionActive(workMenuItems) ? "text-primary" : "text-muted-foreground"
                                                    )}>
                                                        Work
                                                    </p>
                                                    {workMenuItems.map((item) => {
                                                        const Icon = item.icon;
                                                        const isActive = isActivePath(item.href);
                                                        return (
                                                            <li key={item.href}>
                                                                <SheetClose asChild>
                                                                    <Link
                                                                        href={item.href}
                                                                        className={cn(
                                                                            "flex items-center rounded-md px-3 py-2 text-base font-medium transition-colors",
                                                                            "hover:bg-muted",
                                                                            isActive && "bg-accent text-foreground"
                                                                        )}
                                                                    >
                                                                        <Icon className={cn("mr-2 h-4 w-4 text-primary", isActive && "text-foreground")} />
                                                                        {item.label}
                                                                    </Link>
                                                                </SheetClose>
                                                            </li>
                                                        );
                                                    })}
                                                </ul>

                                                <ul role="group" aria-label="Media" className="space-y-2 border-l border-border/60 pl-3">
                                                    <p className={cn(
                                                        "pb-1 text-xs font-semibold uppercase tracking-wider",
                                                        isSectionActive(studioMenuItems) ? "text-primary" : "text-muted-foreground"
                                                    )}>
                                                        Media
                                                    </p>
                                                    {studioMenuItems.map((item) => {
                                                        const Icon = item.icon;
                                                        const isActive = isActivePath(item.href);
                                                        return (
                                                            <li key={item.href}>
                                                                <SheetClose asChild>
                                                                    <Link
                                                                        href={item.href}
                                                                        className={cn(
                                                                            "flex items-center rounded-md px-3 py-2 text-base font-medium transition-colors",
                                                                            "hover:bg-muted",
                                                                            isActive && "bg-accent text-foreground"
                                                                        )}
                                                                    >
                                                                        <Icon className={cn("mr-2 h-4 w-4 text-primary", isActive && "text-foreground")} />
                                                                        {item.label}
                                                                    </Link>
                                                                </SheetClose>
                                                            </li>
                                                        );
                                                    })}
                                                </ul>

                                                <ul role="group" aria-label="About" className="space-y-2 border-l border-border/60 pl-3">
                                                    <p className={cn(
                                                        "pb-1 text-xs font-semibold uppercase tracking-wider",
                                                        isSectionActive(aboutMenuItems) ? "text-primary" : "text-muted-foreground"
                                                    )}>
                                                        About
                                                    </p>
                                                    {aboutMenuItems.map((item) => {
                                                        const Icon = item.icon;
                                                        const isActive = isActivePath(item.href);
                                                        return (
                                                            <li key={item.href}>
                                                                <SheetClose asChild>
                                                                    <Link
                                                                        href={item.href}
                                                                        className={cn(
                                                                            "flex items-center rounded-md px-3 py-2 text-base font-medium transition-colors",
                                                                            "hover:bg-muted",
                                                                            isActive && "bg-accent text-foreground"
                                                                        )}
                                                                    >
                                                                        <Icon className={cn("mr-2 h-4 w-4 text-primary", isActive && "text-foreground")} />
                                                                        {item.label}
                                                                    </Link>
                                                                </SheetClose>
                                                            </li>
                                                        );
                                                    })}
                                                </ul>
                                            </div>

                                            {isAuthenticated ? (
                                                <>
                                                    <div className="border-t pt-4 space-y-2">
                                                        {normalizedRole === 'admin' && (
                                                            <SheetClose asChild>
                                                                <Link href="/admin" className="block px-3 py-2 rounded-md text-base font-medium hover:bg-muted">
                                                                    <LayoutDashboard className="h-4 w-4 inline mr-2" />
                                                                    Admin
                                                                </Link>
                                                            </SheetClose>
                                                        )}
                                                        <SheetClose asChild>

                                                            <Link href="/account/profile" className="block px-3 py-2 rounded-md text-base font-medium hover:bg-muted">
                                                                <UserCircle className="h-4 w-4 inline mr-2" />
                                                                Profile
                                                            </Link>
                                                        </SheetClose>
                                                        <SheetClose asChild>
                                                            <Link href="/account/preferences" className="block px-3 py-2 rounded-md text-base font-medium hover:bg-muted">
                                                                <Settings className="h-4 w-4 inline mr-2" />
                                                                Settings
                                                            </Link>
                                                        </SheetClose>
                                                        <SheetClose asChild>
                                                            <Link href="/account/security" className="block px-3 py-2 rounded-md text-base font-medium hover:bg-muted">
                                                                <Shield className="h-4 w-4 inline mr-2" />
                                                                Security
                                                            </Link>
                                                        </SheetClose>
                                                    </div>
                                                    <SheetClose asChild>
                                                        <Button
                                                            variant="outline"
                                                            className="w-full justify-start text-red-600 hover:text-red-700"
                                                            onClick={() => {
                                                                setMenuOpen(false);
                                                                setTimeout(() => setShowLogoutDialog(true), 250);
                                                            }}
                                                        >
                                                            <LogOut className="h-3 w-3 mr-2" />
                                                            Logout
                                                        </Button>
                                                    </SheetClose>
                                                </>
                                            ) : null}
                                        </div>
                                    </SheetContent>
                                </Sheet>
                            </div>
                        </div>
                    </div>
                </div>
            </nav>
            ) : null}

            <Sheet open={sidebarOpen} onOpenChange={handleSidebarOpenChange}>
                <SheetContent side="right" className="h-[100dvh] w-screen max-w-none overflow-y-auto data-[side=right]:w-screen data-[side=right]:max-w-none sm:h-full sm:max-w-sm">
                    <SheetHeader>
                        <SheetTitle>Sidebar</SheetTitle>
                        <SheetDescription>Appearance settings and quick controls</SheetDescription>
                    </SheetHeader>
                    <div className="mt-6 space-y-4 px-4">
                        <div className="space-y-3 rounded-xl border bg-card/60 p-3">
                            <div className="flex items-center justify-between">
                                <div className="space-y-0.5">
                                    <p className="text-sm font-medium">Music Player</p>
                                    <p className="text-xs text-muted-foreground">
                                        {hasSource ? 'Control playback directly here' : 'Select a track to start playback'}
                                    </p>
                                </div>
                                <Button type="button" variant="outline" size="icon" asChild className="h-8 w-8 rounded-full">
                                    <Link href="/music" aria-label="Open music library">
                                        <Library className="h-4 w-4" />
                                    </Link>
                                </Button>
                            </div>
                            {hasSource ? (
                                <div className="space-y-3">
                                    <div className="min-w-0">
                                        <p className="truncate text-sm font-semibold">{currentTitle || 'Untitled Track'}</p>
                                        <p className="truncate text-xs text-muted-foreground">{currentArtist || 'Unknown Artist'}</p>
                                    </div>
                                    {sidebarOpen ? (
                                        <AudioSidebarVisualizer
                                            isOpen={sidebarOpen}
                                            isPlaying={isPlaying}
                                            getVisualizerAnalyser={getVisualizerAnalyser}
                                        />
                                    ) : null}
                                    <div className="space-y-2">
                                        <Slider
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
                                        <Button type="button" size="icon" variant="outline" className="rounded-full" onClick={() => seekBy(-10)}>
                                            <SkipBack className="h-4 w-4" />
                                        </Button>
                                        <Button type="button" size="icon" className="h-10 w-10 rounded-full" onClick={playPause}>
                                            {isPlaying ? <Pause className="h-4 w-4" /> : <Play className="h-4 w-4" />}
                                        </Button>
                                        <Button type="button" size="icon" variant="outline" className="rounded-full" onClick={stop}>
                                            <Square className="h-4 w-4" />
                                        </Button>
                                        <Button type="button" size="icon" variant="outline" className="rounded-full" onClick={() => seekBy(10)}>
                                            <SkipForward className="h-4 w-4" />
                                        </Button>
                                    </div>
                                </div>
                            ) : null}
                        </div>
                        <div className="space-y-3 rounded-xl border bg-card/60 p-3">
                            <div className="space-y-0.5">
                                <p className="text-sm font-medium">Mode</p>
                                <p className="text-xs text-muted-foreground">Choose light or dark appearance</p>
                            </div>
                            <div className="space-y-2">
                                <div className="grid grid-cols-2 gap-1 rounded-lg border border-border/60 bg-muted/40 p-1">
                                    {(
                                        [
                                            { mode: 'light', label: 'Light', icon: Sun },
                                            { mode: 'dark', label: 'Dark', icon: Moon },
                                        ] as const
                                    ).map(({ mode, label, icon: Icon }) => {
                                        const isActive = activeMode === mode;
                                        return (
                                            <button
                                                key={mode}
                                                type="button"
                                                onClick={() => setTheme(mode)}
                                                className={cn(
                                                    'relative flex h-9 items-center justify-center gap-2 rounded-md text-sm font-medium transition-colors',
                                                    isActive ? 'text-foreground' : 'text-muted-foreground hover:text-foreground'
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
                        </div>
                        <div className="space-y-3 rounded-xl border bg-card/60 p-3">
                            <div className="space-y-0.5">
                                <p className="text-sm font-medium">Theme Set</p>
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
                                                'h-auto w-full justify-start rounded-lg border px-2.5 py-2 text-left whitespace-normal shadow-none overflow-hidden',
                                                'border-border/60 bg-background/40 hover:bg-accent/50 hover:border-border',
                                                isActiveTheme && 'border-primary/40 bg-accent/60 ring-1 ring-primary/20'
                                            )}
                                            onClick={() => setActiveThemeSetId(themeSet.id)}
                                        >
                                            <span className="relative isolate mr-3 block h-10 w-14 shrink-0 overflow-hidden rounded-md border border-border/70 transition-transform duration-200 group-hover/button:-rotate-2">
                                                <span
                                                    className="block h-full w-full"
                                                    style={{ background: getThemePreviewBackground(themeSet) }}
                                                />
                                                <AnimatePresence>
                                                    {isActiveTheme ? (
                                                        <motion.span
                                                            className="pointer-events-none absolute inset-0"
                                                            initial={{ opacity: 0 }}
                                                            animate={{ opacity: 1 }}
                                                            exit={{ opacity: 0 }}
                                                            transition={{ duration: 0.22, ease: 'easeOut' }}
                                                        >
                                                            <motion.span
                                                                className="absolute -inset-y-2 -left-1/3 w-1/2 rotate-12 bg-gradient-to-r from-transparent via-white/45 to-transparent mix-blend-screen"
                                                                animate={{ x: ['-140%', '180%'] }}
                                                                transition={{
                                                                    duration: 1.8,
                                                                    repeat: Infinity,
                                                                    repeatDelay: 1.2,
                                                                    ease: 'easeInOut',
                                                                }}
                                                            />
                                                        </motion.span>
                                                    ) : null}
                                                </AnimatePresence>
                                            </span>
                                            <span className="min-w-0 flex-1 text-left">
                                                <span className="block truncate text-sm font-medium leading-none">{themeSet.name}</span>
                                                <span className={cn('mt-1 block text-xs leading-4 text-muted-foreground whitespace-normal break-words', isActiveTheme && 'text-foreground/75')}>
                                                    {themeSet.description ?? 'A balanced theme preset.'}
                                                </span>
                                            </span>
                                        </Button>
                                    );
                                })}
                            </div>
                        </div>
                    </div>
                </SheetContent>
            </Sheet>

            {/* Logout Confirmation Dialog */}
            <Dialog open={showLogoutDialog} onOpenChange={setShowLogoutDialog}>
                <DialogContent className="sm:max-w-md">
                    <DialogHeader>
                        <DialogTitle className="flex items-center">
                            <LogOut className="h-5 w-5 mr-2 text-red-600" />
                            Confirm Logout
                        </DialogTitle>
                        <DialogDescription>
                            Are you sure you want to logout?
                        </DialogDescription>
                    </DialogHeader>
                    <DialogFooter>
                        <Button variant="outline" onClick={() => setShowLogoutDialog(false)}>
                            Cancel
                        </Button>
                        <Button variant="destructive" onClick={handleLogout}>
                            Logout
                        </Button>
                    </DialogFooter>
                </DialogContent>
            </Dialog>
        </>
    );
}

