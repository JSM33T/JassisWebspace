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
import {
    Menu,
    LogOut,
    User,
    UserCircle,
    Settings,
    Shield,
    AtSign,
    BookOpen,
    FileText,
    ChevronDown,
    Image,
    Music,
    LayoutDashboard,
    Briefcase,
    FolderCode,
    PanelRight,
    Pause,
    Play,
    SkipBack,
    SkipForward,
    Square,
    Library,
    Sun,
    Moon,
    Mail,
    House,
    Search,
    Users,
} from 'lucide-react';
import { SearchModal } from '@/components/search-modal';
import { useUser, userHelpers } from '@/contexts/UserContext';
import { useRouter, usePathname, useSearchParams } from 'next/navigation';
import { useTheme } from 'next-themes';
import { useThemeSet } from '@/components/theme-provider';
import { useAudioPlayer } from '@/hooks/use-audio-player';
import { cn } from '@/lib/utils';
import { buildLoginHref } from '@/lib/auth-redirect';
import { AudioSidebarVisualizer } from '@/components/audio-sidebar-visualizer';
import { AnimatePresence, motion } from 'framer-motion';

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
    const [showLogoutDialog, setShowLogoutDialog] = useState(false);
    const [searchOpen, setSearchOpen] = useState(false);
    const [isNavbarHidden, setIsNavbarHidden] = useState(false);

    const handleLogout = async () => {
        setShowLogoutDialog(false);
        await logout();
        router.push('/');
    };

    const navRef = useRef<HTMLDivElement>(null);
    const [hoverStyle, setHoverStyle] = useState({ left: 0, width: 0, opacity: 0 });

    const normalizedRole = (user?.role ?? '').toLowerCase();

    const studioMenuItems = [
        { href: '/blog', label: 'Blog', description: 'Read our latest posts and updates', icon: FileText },
        { href: '/gallery', label: 'Gallery', description: 'View our creative gallery', icon: Image },
        { href: '/music', label: 'Music', description: 'Explore our music collection', icon: Music },
    ];

    const workMenuItems = [
        { href: '/projects', label: 'Projects', description: 'View our completed projects', icon: FolderCode },
        { href: '/services', label: 'Services', description: 'Explore the services we offer', icon: Briefcase },
    ];

    const miscMenuItems = [] as typeof workMenuItems;

    const aboutMenuItems = [
        { href: '/about', label: 'About', description: 'Learn about JassSpace and our mission', icon: UserCircle },
        { href: '/contact', label: 'Contact', description: 'Get in touch with our team', icon: Mail },
        { href: '/privacy', label: 'Privacy Policy', description: 'See how we handle your data', icon: Shield },
        { href: '/faq', label: 'FAQ', description: 'Common questions and answers', icon: BookOpen },
    ];

    const mobileMenuSections = [
        {
            title: 'Explore',
            items: [
                { href: '/', label: 'Home', icon: House },
                ...studioMenuItems,
            ],
        },
        { title: 'Work', items: workMenuItems },
        { title: 'About', items: aboutMenuItems },
    ];

    const isActivePath = (href: string) => {
        if (href === '/') return pathname === '/';
        return pathname === href || pathname.startsWith(`${href}/`);
    };

    const isSectionActive = (items: Array<{ href: string }>) =>
        items.some((item) => isActivePath(item.href));

    const navDropdownContentClassName =
        'w-72 rounded-2xl border border-border/60 bg-background/70 p-2 text-foreground shadow-xl shadow-black/10 backdrop-blur-xl supports-[backdrop-filter]:bg-background/60';

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
        const handleGlobalKey = (e: KeyboardEvent) => {
            if ((e.metaKey || e.ctrlKey) && e.key === 'k') {
                e.preventDefault();
                setSearchOpen((prev) => !prev);
            }
        };
        window.addEventListener('keydown', handleGlobalKey);
        return () => window.removeEventListener('keydown', handleGlobalKey);
    }, []);

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

            if (Math.abs(scrollDelta) < scrollDeltaThreshold) return;

            setIsNavbarHidden(scrollDelta > 0);
            lastScrollY = currentScrollY;
        };

        const handleScroll = () => {
            if (animationFrameId !== null) return;
            animationFrameId = window.requestAnimationFrame(() => {
                updateNavbarVisibility();
                animationFrameId = null;
            });
        };

        updateNavbarVisibility();
        window.addEventListener('scroll', handleScroll, { passive: true });
        return () => {
            if (animationFrameId !== null) window.cancelAnimationFrame(animationFrameId);
            window.removeEventListener('scroll', handleScroll);
        };
    }, []);

    useEffect(() => {
        const handleSidebarState = (event: Event) => {
            const detail = (event as CustomEvent<boolean>).detail;
            if (typeof detail === 'boolean') setSidebarOpen(detail);
        };
        window.addEventListener(SIDEBAR_OPEN_EVENT, handleSidebarState as EventListener);
        return () => window.removeEventListener(SIDEBAR_OPEN_EVENT, handleSidebarState as EventListener);
    }, []);

    useEffect(() => {
        const timeoutId = window.setTimeout(() => {
            setMenuOpen(false);
            window.dispatchEvent(new CustomEvent<boolean>(SIDEBAR_OPEN_EVENT, { detail: false }));
            setSidebarOpen(false);
        }, 0);
        return () => window.clearTimeout(timeoutId);
    }, [pathname]);

    const handleSidebarOpenChange = (open: boolean) => {
        setSidebarOpen(open);
        if (typeof window !== 'undefined') {
            window.dispatchEvent(new CustomEvent<boolean>(SIDEBAR_OPEN_EVENT, { detail: open }));
        }
    };

    const handleNavLinkHover = (e: React.MouseEvent<HTMLElement>) => {
        const rect = e.currentTarget.getBoundingClientRect();
        const parentRect = navRef.current?.getBoundingClientRect();
        if (parentRect) {
            setHoverStyle({ left: rect.left - parentRect.left, width: rect.width, opacity: 1 });
        }
    };

    const topNavLinkClass = (active: boolean) =>
        cn(
            'relative flex cursor-pointer items-center gap-1 px-4 py-1.5 text-[11px] font-semibold uppercase tracking-[0.1em] transition-colors duration-200 z-10 outline-none',
            active ? 'text-foreground' : 'text-muted-foreground hover:text-foreground'
        );

    const accountDropdownContent = (
        <DropdownMenuContent className="w-56" align="end" forceMount>
            <DropdownMenuLabel className="font-normal">
                <div className="flex flex-col space-y-1">
                    <p className="truncate text-sm font-medium leading-none">{userHelpers.getFirstName(user)}</p>
                    <div className="flex w-full items-center justify-between gap-2 pt-0.5 text-xs text-muted-foreground">
                        <div className="flex items-center gap-1 truncate">
                            <AtSign className="h-3 w-3 shrink-0 text-muted-foreground/80" />
                            <span className="max-w-[10rem] truncate font-medium">
                                {user?.username?.replace(/^@+/, '')}
                            </span>
                        </div>
                        {user?.role && (
                            <span className="shrink-0 text-xs uppercase tracking-wide text-muted-foreground/70">
                                {roleDisplayName}
                            </span>
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
            <DropdownMenuItem
                onClick={() => setShowLogoutDialog(true)}
                className="cursor-pointer text-red-600 focus:text-red-600"
            >
                <LogOut className="mr-2 h-4 w-4" />
                Logout
            </DropdownMenuItem>
        </DropdownMenuContent>
    );

    const themeToggleIcon = (
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
    );

    const activeUnderline = <span className="absolute inset-x-4 bottom-0 h-0.5 rounded-full bg-primary" />;

    return (
        <>
            {/* ── Desktop horizontal top navbar ── */}
            <nav
                className={cn(
                    'fixed inset-x-0 top-0 z-50 hidden lg:block',
                    'border-b border-border/60 bg-background/95 shadow-sm shadow-black/5 backdrop-blur-xl supports-[backdrop-filter]:bg-background/88',
                    'transition-transform duration-300',
                    isNavbarHidden ? '-translate-y-full' : 'translate-y-0'
                )}
            >
                <div className="mx-auto flex h-[4.25rem] max-w-screen-2xl items-center gap-6 px-6 lg:px-10">
                    {/* Logo */}
                    <Link
                        href="/"
                        className="flex shrink-0 items-center gap-2.5 text-foreground transition-colors hover:text-primary"
                    >
                        <LogoMark className="h-8 w-8" />
                        <span className="hidden text-sm font-semibold tracking-tight xl:block">JassSpace</span>
                    </Link>

                    {/* Center nav links */}
                    <div className="flex flex-1 items-center justify-center">
                        <div
                            ref={navRef}
                            className="relative flex items-center"
                            onMouseLeave={() => setHoverStyle((prev) => ({ ...prev, opacity: 0 }))}
                        >
                            {/* Sliding hover pill */}
                            <div
                                aria-hidden="true"
                                className="pointer-events-none absolute h-8 rounded-full bg-accent/60 transition-all duration-200 ease-out"
                                style={{
                                    left: `${hoverStyle.left}px`,
                                    width: `${hoverStyle.width}px`,
                                    opacity: hoverStyle.opacity,
                                    top: '50%',
                                    transform: 'translateY(-50%)',
                                }}
                            />

                            {/* Home */}
                            <Link
                                href="/"
                                aria-current={isActivePath('/') ? 'page' : undefined}
                                className={topNavLinkClass(isActivePath('/'))}
                                onMouseEnter={handleNavLinkHover}
                            >
                                {isActivePath('/') && activeUnderline}
                                Home
                            </Link>

                            {/* Work */}
                            <DropdownMenu>
                                <DropdownMenuTrigger asChild>
                                    <button
                                        className={topNavLinkClass(isSectionActive(workMenuItems))}
                                        onMouseEnter={handleNavLinkHover}
                                    >
                                        {isSectionActive(workMenuItems) && activeUnderline}
                                        Work
                                        <ChevronDown className="h-3 w-3 transition-transform duration-200 group-data-[state=open]:rotate-180" />
                                    </button>
                                </DropdownMenuTrigger>
                                <DropdownMenuContent
                                    className={navDropdownContentClassName}
                                    align="center"
                                    sideOffset={14}
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
                                                        'flex cursor-pointer items-center gap-3 rounded-xl border border-transparent p-3 transition-colors',
                                                        'hover:border-border/50 hover:bg-accent/60',
                                                        isActive && 'border-border/70 bg-accent/70'
                                                    )}
                                                >
                                                    <Icon
                                                        className={cn(
                                                            'h-5 w-5 shrink-0 text-primary',
                                                            isActive && 'text-foreground'
                                                        )}
                                                    />
                                                    <div className="flex flex-col">
                                                        <span className="font-medium">{item.label}</span>
                                                        <span className="text-xs text-muted-foreground">
                                                            {item.description}
                                                        </span>
                                                    </div>
                                                </Link>
                                            </DropdownMenuItem>
                                        );
                                    })}
                                </DropdownMenuContent>
                            </DropdownMenu>

                            {/* Media */}
                            <DropdownMenu>
                                <DropdownMenuTrigger asChild>
                                    <button
                                        className={topNavLinkClass(isSectionActive(studioMenuItems))}
                                        onMouseEnter={handleNavLinkHover}
                                    >
                                        {isSectionActive(studioMenuItems) && activeUnderline}
                                        Media
                                        <ChevronDown className="h-3 w-3 transition-transform duration-200 group-data-[state=open]:rotate-180" />
                                    </button>
                                </DropdownMenuTrigger>
                                <DropdownMenuContent
                                    className={navDropdownContentClassName}
                                    align="center"
                                    sideOffset={14}
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
                                                        'flex cursor-pointer items-center gap-3 rounded-xl border border-transparent p-3 transition-colors',
                                                        'hover:border-border/50 hover:bg-accent/60',
                                                        isActive && 'border-border/70 bg-accent/70'
                                                    )}
                                                >
                                                    <Icon
                                                        className={cn(
                                                            'h-5 w-5 shrink-0 text-primary',
                                                            isActive && 'text-foreground'
                                                        )}
                                                    />
                                                    <div className="flex flex-col">
                                                        <span className="font-medium">{item.label}</span>
                                                        <span className="text-xs text-muted-foreground">
                                                            {item.description}
                                                        </span>
                                                    </div>
                                                </Link>
                                            </DropdownMenuItem>
                                        );
                                    })}
                                </DropdownMenuContent>
                            </DropdownMenu>

                            {/* About */}
                            <DropdownMenu>
                                <DropdownMenuTrigger asChild>
                                    <button
                                        className={topNavLinkClass(isSectionActive(aboutMenuItems))}
                                        onMouseEnter={handleNavLinkHover}
                                    >
                                        {isSectionActive(aboutMenuItems) && activeUnderline}
                                        About
                                        <ChevronDown className="h-3 w-3 transition-transform duration-200 group-data-[state=open]:rotate-180" />
                                    </button>
                                </DropdownMenuTrigger>
                                <DropdownMenuContent
                                    className={navDropdownContentClassName}
                                    align="center"
                                    sideOffset={14}
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
                                                        'flex cursor-pointer items-center gap-3 rounded-xl border border-transparent p-3 transition-colors',
                                                        'hover:border-border/50 hover:bg-accent/60',
                                                        isActive && 'border-border/70 bg-accent/70'
                                                    )}
                                                >
                                                    <Icon
                                                        className={cn(
                                                            'h-5 w-5 shrink-0 text-primary',
                                                            isActive && 'text-foreground'
                                                        )}
                                                    />
                                                    <div className="flex flex-col">
                                                        <span className="font-medium">{item.label}</span>
                                                        <span className="text-xs text-muted-foreground">
                                                            {item.description}
                                                        </span>
                                                    </div>
                                                </Link>
                                            </DropdownMenuItem>
                                        );
                                    })}
                                </DropdownMenuContent>
                            </DropdownMenu>

                            {/* Misc */}
                            {miscMenuItems.length > 0 && <DropdownMenu>
                                <DropdownMenuTrigger asChild>
                                    <button
                                        className={topNavLinkClass(isSectionActive(miscMenuItems))}
                                        onMouseEnter={handleNavLinkHover}
                                    >
                                        {isSectionActive(miscMenuItems) && activeUnderline}
                                        Misc
                                        <ChevronDown className="h-3 w-3 transition-transform duration-200 group-data-[state=open]:rotate-180" />
                                    </button>
                                </DropdownMenuTrigger>
                                <DropdownMenuContent
                                    className={navDropdownContentClassName}
                                    align="center"
                                    sideOffset={14}
                                    collisionPadding={16}
                                >
                                    {miscMenuItems.map((item) => {
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
                                                    <Icon
                                                        className={cn(
                                                            'h-5 w-5 shrink-0 text-primary',
                                                            isActive && 'text-foreground'
                                                        )}
                                                    />
                                                    <div className="flex flex-col">
                                                        <span className="font-medium">{item.label}</span>
                                                        <span className="text-xs text-muted-foreground">
                                                            {item.description}
                                                        </span>
                                                    </div>
                                                </Link>
                                            </DropdownMenuItem>
                                        );
                                    })}
                                </DropdownMenuContent>
                            </DropdownMenu>}
                        </div>
                    </div>

                    {/* Right: search + actions + user */}
                    <div className="flex shrink-0 items-center gap-2">
                        {/* Search */}
                        <button
                            type="button"
                            onClick={() => setSearchOpen(true)}
                            className="flex h-9 items-center gap-2 rounded-full border border-border/60 bg-muted/20 px-3.5 text-muted-foreground transition-colors hover:bg-muted/40 hover:text-foreground"
                        >
                            <Search className="h-3.5 w-3.5 shrink-0" />
                            <span className="hidden text-xs xl:block">Search here</span>
                            <kbd className="hidden rounded border border-border/60 bg-background/80 px-1.5 py-0.5 text-[10px] font-medium xl:block">
                                ⌘K
                            </kbd>
                        </button>

                        {/* Light / dark toggle */}
                        <Button
                            type="button"
                            variant="ghost"
                            size="icon"
                            className="relative h-9 w-9 rounded-full hover:bg-accent/50"
                            onClick={() => setTheme(activeMode === 'dark' ? 'light' : 'dark')}
                            aria-label={activeMode === 'dark' ? 'Switch to light mode' : 'Switch to dark mode'}
                            title={activeMode === 'dark' ? 'Switch to light mode' : 'Switch to dark mode'}
                        >
                            {themeToggleIcon}
                        </Button>

                        {/* Player / theme sidebar */}
                        <Button
                            variant="ghost"
                            size="icon"
                            className={cn(
                                'h-9 w-9 rounded-full hover:bg-accent/50',
                                sidebarOpen && 'text-primary'
                            )}
                            onClick={() => handleSidebarOpenChange(true)}
                            title="Player and theme"
                        >
                            <PanelRight className="h-4 w-4" />
                        </Button>

                        {/* User */}
                        {isAuthenticated ? (
                            <DropdownMenu>
                                <DropdownMenuTrigger asChild>
                                    <button
                                        type="button"
                                        className="flex h-10 items-center gap-2.5 rounded-full border border-border/60 bg-muted/20 pl-1 pr-3 transition-colors hover:bg-muted/40"
                                    >
                                        <Avatar className="h-8 w-8 border border-border/60">
                                            <AvatarImage
                                                src={user?.avatarUrl || '/placeholder-avatar.jpg'}
                                                alt="User Avatar"
                                            />
                                            <AvatarFallback className="text-xs">
                                                {userHelpers.getInitials(user)}
                                            </AvatarFallback>
                                        </Avatar>
                                        <div className="hidden flex-col items-start xl:flex">
                                            <span className="text-xs font-semibold leading-none">
                                                {userHelpers.getFirstName(user)}
                                            </span>
                                            <span className="mt-0.5 text-[10px] leading-none text-muted-foreground">
                                                {roleDisplayName}
                                            </span>
                                        </div>
                                        <ChevronDown className="hidden h-3 w-3 shrink-0 text-muted-foreground xl:block" />
                                    </button>
                                </DropdownMenuTrigger>
                                {accountDropdownContent}
                            </DropdownMenu>
                        ) : (
                            <Link href={loginHref}>
                                <Button
                                    variant="outline"
                                    size="sm"
                                    className="h-9 rounded-full px-5 text-[11px] font-semibold uppercase tracking-[0.08em]"
                                >
                                    Login
                                </Button>
                            </Link>
                        )}
                    </div>
                </div>
            </nav>

            {/* ── Mobile top bar ── */}
            <nav
                className={cn(
                    'fixed inset-x-0 top-0 z-50 transition-all duration-300 lg:hidden',
                    'border-b border-border/60 bg-background/95 shadow-sm shadow-black/5 backdrop-blur-xl supports-[backdrop-filter]:bg-background/88',
                    isNavbarHidden ? 'pointer-events-none -translate-y-14 opacity-0' : 'translate-y-0 opacity-100'
                )}
            >
                <div className="flex h-14 items-center justify-between px-4">
                    <Link
                        href="/"
                        aria-current={isActivePath('/') ? 'page' : undefined}
                        className="flex items-center rounded-full text-foreground transition-colors hover:text-primary"
                    >
                        <LogoMark className="h-7 w-7" />
                    </Link>

                    <div className="flex items-center gap-2">
                        <Button
                            type="button"
                            variant="ghost"
                            size="icon"
                            className="relative h-9 w-9 rounded-full hover:bg-accent/50"
                            onClick={() => setSearchOpen(true)}
                            aria-label="Search"
                        >
                            <Search className="h-4 w-4" />
                        </Button>

                        <Button
                            type="button"
                            variant="ghost"
                            size="icon"
                            className="relative h-9 w-9 rounded-full hover:bg-accent/50"
                            onClick={() => setTheme(activeMode === 'dark' ? 'light' : 'dark')}
                            aria-label={activeMode === 'dark' ? 'Switch to light mode' : 'Switch to dark mode'}
                        >
                            {themeToggleIcon}
                        </Button>

                        <Button
                            variant="ghost"
                            size="icon"
                            className={cn('h-9 w-9 rounded-full hover:bg-accent/50', sidebarOpen && 'text-primary')}
                            onClick={() => handleSidebarOpenChange(true)}
                            title="Open sidebar"
                        >
                            <PanelRight className="h-4 w-4" />
                        </Button>

                        <Sheet open={menuOpen} onOpenChange={setMenuOpen}>
                            <SheetTrigger asChild>
                                <Button variant="outline" size="icon" className="h-9 w-9 rounded-full">
                                    <Menu className="h-4 w-4" />
                                </Button>
                            </SheetTrigger>
                            <SheetContent
                                side="right"
                                className="h-[100dvh] w-screen max-w-none overflow-y-auto data-[side=right]:w-screen data-[side=right]:max-w-none sm:h-full sm:w-[340px] sm:max-w-[340px]"
                            >
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
                                                    <p className="truncate text-sm font-medium">
                                                        {userHelpers.getFirstName(user)}
                                                    </p>
                                                    <p className="truncate text-xs text-muted-foreground">
                                                        @{user?.username?.replace(/^@+/, '')}
                                                    </p>
                                                </div>
                                                {user?.role ? (
                                                    <Badge variant="secondary" className="rounded-full">
                                                        {roleDisplayName}
                                                    </Badge>
                                                ) : null}
                                            </div>
                                        </div>
                                    ) : (
                                        <SheetClose asChild>
                                            <Button asChild className="h-12 w-full rounded-2xl">
                                                <Link href={loginHref}>
                                                    <User className="mr-2 h-4 w-4" />
                                                    Login
                                                </Link>
                                            </Button>
                                        </SheetClose>
                                    )}

                                    <Button
                                        type="button"
                                        variant="outline"
                                        className="h-12 w-full cursor-pointer justify-start rounded-2xl"
                                        onClick={() => {
                                            setMenuOpen(false);
                                            setTimeout(() => setSearchOpen(true), 180);
                                        }}
                                    >
                                        <Search className="mr-2 h-4 w-4" />
                                        Search
                                    </Button>

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
                                        <div
                                            key={section.title}
                                            className="rounded-3xl border border-border/60 bg-card/60 p-3"
                                        >
                                            <p className="px-2 pb-2 text-xs font-semibold uppercase tracking-[0.2em] text-muted-foreground">
                                                {section.title}
                                            </p>
                                            <div className="space-y-1">
                                                {section.items.map((item) => {
                                                    const Icon = item.icon;
                                                    const isActive = isActivePath(item.href);
                                                    return (
                                                        <SheetClose key={item.href} asChild>
                                                            <Link
                                                                href={item.href}
                                                                className={cn(
                                                                    'flex items-center gap-3 rounded-2xl px-3 py-3 text-sm font-medium transition-colors',
                                                                    isActive
                                                                        ? 'bg-primary/12 text-foreground'
                                                                        : 'hover:bg-accent/70'
                                                                )}
                                                            >
                                                                <Icon
                                                                    className={cn(
                                                                        'h-4 w-4 text-primary',
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
                                                        <Link
                                                            href="/admin"
                                                            className="flex items-center gap-3 rounded-2xl px-3 py-3 text-sm font-medium hover:bg-accent/70"
                                                        >
                                                            <LayoutDashboard className="h-4 w-4 text-primary" />
                                                            <span>Admin</span>
                                                        </Link>
                                                    </SheetClose>
                                                )}
                                                <SheetClose asChild>
                                                    <Link
                                                        href="/account/profile"
                                                        className="flex items-center gap-3 rounded-2xl px-3 py-3 text-sm font-medium hover:bg-accent/70"
                                                    >
                                                        <UserCircle className="h-4 w-4 text-primary" />
                                                        <span>Profile</span>
                                                    </Link>
                                                </SheetClose>
                                                <SheetClose asChild>
                                                    <Link
                                                        href="/account/preferences"
                                                        className="flex items-center gap-3 rounded-2xl px-3 py-3 text-sm font-medium hover:bg-accent/70"
                                                    >
                                                        <Settings className="h-4 w-4 text-primary" />
                                                        <span>Settings</span>
                                                    </Link>
                                                </SheetClose>
                                                <SheetClose asChild>
                                                    <Link
                                                        href="/account/security"
                                                        className="flex items-center gap-3 rounded-2xl px-3 py-3 text-sm font-medium hover:bg-accent/70"
                                                    >
                                                        <Shield className="h-4 w-4 text-primary" />
                                                        <span>Security</span>
                                                    </Link>
                                                </SheetClose>
                                                <Button
                                                    variant="ghost"
                                                    className="w-full cursor-pointer justify-start rounded-2xl px-3 py-3 text-red-600 hover:bg-red-500/10 hover:text-red-700"
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

            {/* ── Sidebar: player + theme ── */}
            <Sheet open={sidebarOpen} onOpenChange={handleSidebarOpenChange}>
                <SheetContent
                    side="right"
                    className="h-[100dvh] w-screen max-w-none overflow-y-auto data-[side=right]:w-screen data-[side=right]:max-w-none sm:h-full sm:max-w-sm"
                >
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
                                        <p className="truncate text-xs text-muted-foreground">
                                            {currentArtist || 'Unknown Artist'}
                                        </p>
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
                                        <Button
                                            type="button"
                                            size="icon"
                                            variant="outline"
                                            className="rounded-full"
                                            onClick={() => seekBy(-10)}
                                        >
                                            <SkipBack className="h-4 w-4" />
                                        </Button>
                                        <Button
                                            type="button"
                                            size="icon"
                                            className="h-10 w-10 rounded-full"
                                            onClick={playPause}
                                        >
                                            {isPlaying ? (
                                                <Pause className="h-4 w-4" />
                                            ) : (
                                                <Play className="h-4 w-4" />
                                            )}
                                        </Button>
                                        <Button
                                            type="button"
                                            size="icon"
                                            variant="outline"
                                            className="rounded-full"
                                            onClick={stop}
                                        >
                                            <Square className="h-4 w-4" />
                                        </Button>
                                        <Button
                                            type="button"
                                            size="icon"
                                            variant="outline"
                                            className="rounded-full"
                                            onClick={() => seekBy(10)}
                                        >
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
                                                    isActive
                                                        ? 'text-foreground'
                                                        : 'text-muted-foreground hover:text-foreground'
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
                                                'h-auto w-full justify-start overflow-hidden whitespace-normal rounded-xl border px-2.5 py-2 text-left shadow-none',
                                                'border-border/60 bg-background/40 hover:border-border hover:bg-accent/50',
                                                isActiveTheme && 'border-primary/40 bg-accent/60 ring-1 ring-primary/20'
                                            )}
                                            onClick={() => setActiveThemeSetId(themeSet.id)}
                                        >
                                            <span className="relative isolate mr-3 block h-10 w-14 shrink-0 overflow-hidden rounded-md border border-border/70">
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
                                                <span className="block truncate text-sm font-medium leading-none">
                                                    {themeSet.name}
                                                </span>
                                                <span
                                                    className={cn(
                                                        'mt-1 block break-words text-xs leading-4 text-muted-foreground',
                                                        isActiveTheme && 'text-foreground/75'
                                                    )}
                                                >
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

            <SearchModal open={searchOpen} onClose={() => setSearchOpen(false)} />

            <Dialog open={showLogoutDialog} onOpenChange={setShowLogoutDialog}>
                <DialogContent className="sm:max-w-md">
                    <DialogHeader>
                        <DialogTitle className="flex items-center">
                            <LogOut className="mr-2 h-5 w-5 text-red-600" />
                            Confirm Logout
                        </DialogTitle>
                        <DialogDescription>Are you sure you want to logout?</DialogDescription>
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
