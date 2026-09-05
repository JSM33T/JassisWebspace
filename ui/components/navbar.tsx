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
    FileText,
    ChevronDown,
    Check,
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
    Smile,
    Frown,
    Users,
    Wrench,
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
import { AnimatePresence, motion, useAnimation, MotionConfig, useReducedMotion } from 'framer-motion';

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
    const reduceMotion = useReducedMotion();
    const [searchShortcut, setSearchShortcut] = useState('Ctrl K');
    const [accountOpen, setAccountOpen] = useState(false);
    const desktopTriggerRef = useRef<HTMLButtonElement | null>(null);
    const desktopContentRef = useRef<HTMLDivElement | null>(null);
    useEffect(() => {
        const updateShortcut = () => setSearchShortcut(/Mac|iPhone|iPad/.test(navigator.platform) ? '⌘K' : 'Ctrl K');
        updateShortcut();
    }, []);
    const [menuOpen, setMenuOpen] = useState(false);
    const [desktopMenu, setDesktopMenu] = useState<string | null>(null);
    const desktopMenuCloseTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
    const desktopMenuOpenedByHover = useRef(false);

    const cancelDesktopMenuClose = () => {
        if (desktopMenuCloseTimer.current !== null) {
            clearTimeout(desktopMenuCloseTimer.current);
            desktopMenuCloseTimer.current = null;
        }
    };

    const scheduleDesktopMenuClose = () => {
        cancelDesktopMenuClose();
        // Allow the pointer to cross the gap between the trigger and menu.
        desktopMenuCloseTimer.current = setTimeout(() => {
            const focused = document.activeElement;
            if (
                desktopTriggerRef.current?.contains(focused) ||
                desktopContentRef.current?.contains(focused) ||
                desktopTriggerRef.current?.matches(':hover') ||
                desktopContentRef.current?.matches(':hover')
            ) return;
            setDesktopMenu(null);
        }, 250);
    };

    const handleDesktopMenuOpenChange = (name: string, open: boolean) => {
        cancelDesktopMenuClose();
        desktopMenuOpenedByHover.current = false;
        setDesktopMenu((current) => open ? name : current === name ? null : current);
    };

    const handleDesktopMenuPointerEnter = (event: React.PointerEvent<HTMLButtonElement>, name: string) => {
        if (event.pointerType !== 'mouse') return;
        cancelDesktopMenuClose();
        desktopTriggerRef.current = event.currentTarget;
        desktopMenuOpenedByHover.current = true;
        setDesktopMenu(name);
    };

    const handleDesktopMenuPointerLeave = (event: React.PointerEvent<HTMLElement>) => {
        if (event.pointerType === 'mouse') scheduleDesktopMenuClose();
    };

    const desktopMenuContentProps = {
        ref: desktopContentRef,
        onFocusCapture: cancelDesktopMenuClose,
        onBlurCapture: scheduleDesktopMenuClose,
        onKeyDown: () => { desktopMenuOpenedByHover.current = false; },
        onPointerEnter: cancelDesktopMenuClose,
        onPointerLeave: (event: React.PointerEvent<HTMLDivElement>) => {
            if (event.pointerType === 'mouse') scheduleDesktopMenuClose();
        },
        onOpenAutoFocus: (event: Event) => {
            if (desktopMenuOpenedByHover.current) event.preventDefault();
        },
        onCloseAutoFocus: (event: Event) => {
            if (desktopMenuOpenedByHover.current) event.preventDefault();
        },
    };

    useEffect(() => () => {
        if (desktopMenuCloseTimer.current !== null) clearTimeout(desktopMenuCloseTimer.current);
    }, []);
    const [sidebarOpen, setSidebarOpen] = useState(false);
    const [showLogoutDialog, setShowLogoutDialog] = useState(false);
    const [searchOpen, setSearchOpen] = useState(false);
    const [isNavbarHidden, setIsNavbarHidden] = useState(false);
    const [isScrolled, setIsScrolled] = useState(false);

    const handleLogout = async () => {
        setShowLogoutDialog(false);
        await logout();
        router.push('/');
    };

    const navRef = useRef<HTMLDivElement>(null);
    const cancelIconControls = useAnimation();
    const logoutIconControls = useAnimation();
    const previousPathnameRef = useRef(pathname);
    const [hoverStyle, setHoverStyle] = useState({ left: 0, width: 0, opacity: 0 });

    const normalizedRole = (user?.role ?? '').toLowerCase();

    const blogMenuItem = { href: '/blog', label: 'Blog', description: 'Read my latest posts and updates', icon: FileText };

    const mediaMenuItems = [
        { href: '/gallery', label: 'Gallery', description: 'Explore my photography and artwork', icon: Image },
        { href: '/music', label: 'Music', description: 'Listen to my music collection', icon: Music },
    ];

    const projectsMenuItem = { href: '/projects', label: 'Projects', description: 'Explore my projects', icon: FolderCode };

    const aboutMenuItems = [
        { href: '/about', label: 'About Me', description: 'Learn about me and JassSpace', icon: UserCircle },
        { href: '/uses', label: 'Uses', description: 'Tools, gear, and software I use daily', icon: Wrench },
        { href: '/services', label: 'Services', description: 'Explore the services I offer', icon: Briefcase },
        { href: '/contact', label: 'Contact', description: 'Get in touch', icon: Mail },
    ];

    const mobileMenuSections = [
        {
            title: 'Explore',
            items: [
                { href: '/', label: 'Home', icon: House },
                blogMenuItem,
                projectsMenuItem,
            ],
        },
        { title: 'Media', items: mediaMenuItems },
        { title: 'About', items: aboutMenuItems },
    ];

    const isActivePath = (href: string) => {
        if (href === '/') return pathname === '/';
        return pathname === href || pathname.startsWith(`${href}/`);
    };

    const isSectionActive = (items: Array<{ href: string }>) =>
        items.some((item) => isActivePath(item.href));

    const navDropdownContentClassName =
        'w-[min(42rem,calc(100vw-2rem))] rounded-3xl border border-border/60 bg-background/95 p-3 text-foreground shadow-lg shadow-black/10 backdrop-blur-xl';

    const navDropdownGridClassName = 'grid grid-cols-2 gap-2';

    const navDropdownItemClassName = (active: boolean) =>
        cn(
            'group/menuitem flex h-full min-h-24 cursor-pointer items-start gap-3 rounded-2xl border p-4 transition-colors duration-150 motion-reduce:transition-none',
            'border-transparent hover:border-primary/25 hover:bg-accent/55 focus-visible:outline-2 focus-visible:outline-offset-[-2px] focus-visible:outline-primary data-[highlighted]:bg-accent data-[highlighted]:outline-2 data-[highlighted]:outline-primary',
            active && 'border-primary/30 bg-accent/70 shadow-sm'
        );

    const navDropdownIconClassName = (active: boolean) =>
        cn(
            'mt-0.5 flex h-10 w-10 shrink-0 items-center justify-center rounded-xl border border-border/55 bg-card/80 text-primary transition-colors',
            'group-hover/menuitem:border-primary/25 group-hover/menuitem:bg-background',
            active && 'border-primary/35 bg-background text-foreground'
        );

    const renderDesktopMenuItem = (item: (typeof aboutMenuItems)[number]) => {
        const Icon = item.icon;
        const isActive = isActivePath(item.href);

        return (
            <DropdownMenuItem key={item.href} asChild className="p-0 focus:bg-transparent">
                <Link href={item.href} aria-current={isActive ? 'page' : undefined} className={navDropdownItemClassName(isActive)}>
                    <span className={navDropdownIconClassName(isActive)}>
                        <Icon className="h-5 w-5" />
                    </span>
                    <span className="flex min-w-0 flex-col gap-1">
                        <span className="font-semibold leading-none tracking-tight">{item.label}</span>
                        <span className="text-sm leading-5 text-muted-foreground">{item.description}</span>
                    </span>
                </Link>
            </DropdownMenuItem>
        );
    };

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

            setIsScrolled(currentScrollY > topThreshold);

            if (menuOpen || sidebarOpen || desktopMenu !== null || accountOpen || searchOpen || showLogoutDialog || document.activeElement?.closest('[data-navbar]')) {
                setIsNavbarHidden(false);
                lastScrollY = currentScrollY;
                return;
            }

            if (currentScrollY <= topThreshold) {
                setIsNavbarHidden(false);
                lastScrollY = currentScrollY;
                return;
            }

            if (Math.abs(scrollDelta) < scrollDeltaThreshold) {
                lastScrollY = currentScrollY;
                return;
            }

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
    }, [menuOpen, sidebarOpen, desktopMenu, accountOpen, searchOpen, showLogoutDialog]);

    useEffect(() => {
        const handleSidebarState = (event: Event) => {
            const detail = (event as CustomEvent<boolean>).detail;
            if (typeof detail === 'boolean') setSidebarOpen(detail);
        };
        window.addEventListener(SIDEBAR_OPEN_EVENT, handleSidebarState as EventListener);
        return () => window.removeEventListener(SIDEBAR_OPEN_EVENT, handleSidebarState as EventListener);
    }, []);

    useEffect(() => {
        if (previousPathnameRef.current === pathname) return;

        previousPathnameRef.current = pathname;

        if (!menuOpen && !sidebarOpen && desktopMenu === null && !accountOpen) return;

        const timeoutId = window.setTimeout(() => {
            setMenuOpen(false);
            setDesktopMenu(null);
            setAccountOpen(false);
            setSidebarOpen(false);
            window.dispatchEvent(new CustomEvent<boolean>(SIDEBAR_OPEN_EVENT, { detail: false }));
        }, 0);

        return () => window.clearTimeout(timeoutId);
    }, [pathname, menuOpen, sidebarOpen, desktopMenu, accountOpen]);

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
            'relative z-10 flex min-h-10 cursor-pointer items-center gap-1.5 rounded-full px-3 text-sm font-medium focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-primary',
            'transition-[color,opacity] duration-200',
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
            {(normalizedRole === 'admin' || normalizedRole === 'mod') && (
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

    const activeUnderline = (
        <motion.span
            initial={{ scaleX: 0, opacity: 0 }}
            animate={{ scaleX: 1, opacity: 1 }}
            transition={{ duration: 0.28, ease: 'easeOut' }}
            className="absolute inset-x-4 bottom-0 h-0.5 origin-center rounded-full bg-gradient-to-r from-primary/30 via-primary to-primary/30"
        />
    );

    return (
        <MotionConfig reducedMotion="user">
            {/* ── Desktop horizontal top navbar ── */}
            <nav
                data-navbar
                aria-label="Main navigation"
                onFocusCapture={() => setIsNavbarHidden(false)}
                className={cn(
                    'fixed inset-x-0 top-0 z-50 hidden lg:block',
                    'bg-background/70 backdrop-blur-xl supports-[backdrop-filter]:bg-background/55',
                    // Gradient hairline that fades at the edges
                    'after:pointer-events-none after:absolute after:inset-x-0 after:bottom-0 after:h-px',
                    'after:bg-gradient-to-r after:from-transparent after:via-border/70 after:to-transparent',
                    'transition-[transform,background-color,box-shadow] duration-300 ease-out motion-reduce:transition-none [&_a:focus-visible]:outline-2 [&_a:focus-visible]:outline-offset-2 [&_a:focus-visible]:outline-primary [&_button:focus-visible]:outline-2 [&_button:focus-visible]:outline-offset-2 [&_button:focus-visible]:outline-primary',
                    isScrolled &&
                        'shadow-lg shadow-black/10 bg-background/85 supports-[backdrop-filter]:bg-background/70',
                    isNavbarHidden ? '-translate-y-full' : 'translate-y-0'
                )}
            >
                <div
                    className={cn(
                        'mx-auto flex max-w-7xl items-center gap-6 px-6 lg:px-10',
                        'transition-[height] duration-300 ease-out motion-reduce:transition-none',
                        isScrolled ? 'h-14' : 'h-[4.25rem]'
                    )}
                >
                    {/* Logo */}
                    <Link
                        href="/"
                        aria-label="JassSpace home"
                        className="flex shrink-0 items-center gap-2.5 text-foreground transition-colors hover:text-primary"
                    >
                        <LogoMark className="h-8 w-8" />
                        <span className="hidden text-sm font-semibold tracking-tight xl:block">JassSpace</span>
                    </Link>

                    {/* Center nav links */}
                    <div className="flex flex-1 items-center justify-center">
                        <div
                            ref={navRef}
                            className="group/navlinks relative flex items-center"
                            onMouseLeave={() => setHoverStyle((prev) => ({ ...prev, opacity: 0 }))}
                        >
                            {/* Sliding hover pill */}
                            <div
                                aria-hidden="true"
                                className="pointer-events-none absolute h-8 rounded-full bg-accent/60 transition-all duration-200 ease-out motion-reduce:transition-none"
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
                        aria-label="JassSpace home"
                                aria-current={isActivePath('/') ? 'page' : undefined}
                                className={topNavLinkClass(isActivePath('/'))}
                                onMouseEnter={handleNavLinkHover}
                            >
                                {isActivePath('/') && activeUnderline}
                                <House className="h-3.5 w-3.5" />
                                Home
                            </Link>

                            {/* Blog */}
                            <Link
                                href={blogMenuItem.href}
                                aria-current={isActivePath(blogMenuItem.href) ? 'page' : undefined}
                                className={topNavLinkClass(isActivePath(blogMenuItem.href))}
                                onMouseEnter={handleNavLinkHover}
                            >
                                {isActivePath(blogMenuItem.href) && activeUnderline}
                                <FileText className="h-3.5 w-3.5" />
                                Blog
                            </Link>

                            {/* Projects */}
                            <Link
                                href={projectsMenuItem.href}
                                aria-current={isActivePath(projectsMenuItem.href) ? 'page' : undefined}
                                className={topNavLinkClass(isActivePath(projectsMenuItem.href))}
                                onMouseEnter={handleNavLinkHover}
                            >
                                {isActivePath(projectsMenuItem.href) && activeUnderline}
                                <FolderCode className="h-3.5 w-3.5" />
                                Projects
                            </Link>

                            {/* Media */}
                            <DropdownMenu modal={false} open={desktopMenu === 'media'} onOpenChange={(open) => handleDesktopMenuOpenChange('media', open)}>
                                <DropdownMenuTrigger asChild>
                                    <button
                                        onPointerEnter={(event) => handleDesktopMenuPointerEnter(event, 'media')}
                                        onPointerLeave={handleDesktopMenuPointerLeave}
                                        onFocus={(event) => { desktopTriggerRef.current = event.currentTarget; cancelDesktopMenuClose(); }}
                                        onBlur={scheduleDesktopMenuClose}
                                        className={topNavLinkClass(isSectionActive(mediaMenuItems))}
                                        onMouseEnter={handleNavLinkHover}
                                    >
                                        {isSectionActive(mediaMenuItems) && activeUnderline}
                                        <Library className="h-3.5 w-3.5" />
                                        Media
                                        <ChevronDown className="h-3 w-3 transition-transform duration-200 group-data-[state=open]:rotate-180" />
                                    </button>
                                </DropdownMenuTrigger>
                                <DropdownMenuContent
                                    {...desktopMenuContentProps}
                                    className={navDropdownContentClassName}
                                    align="center"
                                    sideOffset={14}
                                    collisionPadding={16}
                                >
                                    <div className={navDropdownGridClassName}>
                                        {mediaMenuItems.map(renderDesktopMenuItem)}
                                    </div>
                                </DropdownMenuContent>
                            </DropdownMenu>

                            {/* About */}
                            <DropdownMenu modal={false} open={desktopMenu === 'about'} onOpenChange={(open) => handleDesktopMenuOpenChange('about', open)}>
                                <DropdownMenuTrigger asChild>
                                    <button
                                        onPointerEnter={(event) => handleDesktopMenuPointerEnter(event, 'about')}
                                        onPointerLeave={handleDesktopMenuPointerLeave}
                                        onFocus={(event) => { desktopTriggerRef.current = event.currentTarget; cancelDesktopMenuClose(); }}
                                        onBlur={scheduleDesktopMenuClose}
                                        className={topNavLinkClass(isSectionActive(aboutMenuItems))}
                                        onMouseEnter={handleNavLinkHover}
                                    >
                                        {isSectionActive(aboutMenuItems) && activeUnderline}
                                        <Users className="h-3.5 w-3.5" />
                                        About
                                        <ChevronDown className="h-3 w-3 transition-transform duration-200 group-data-[state=open]:rotate-180" />
                                    </button>
                                </DropdownMenuTrigger>
                                <DropdownMenuContent
                                    {...desktopMenuContentProps}
                                    className={navDropdownContentClassName}
                                    align="center"
                                    sideOffset={14}
                                    collisionPadding={16}
                                >
                                    <div className={navDropdownGridClassName}>
                                        {aboutMenuItems.map(renderDesktopMenuItem)}
                                    </div>
                                </DropdownMenuContent>
                            </DropdownMenu>

                        </div>
                    </div>

                    {/* Right: search + actions + user */}
                    <div className="flex shrink-0 items-center gap-2">
                        {/* Search */}
                        <button
                            type="button"
                            onClick={() => setSearchOpen(true)}
                            aria-label="Search"
                            title={`Search (${searchShortcut})`}
                            className="flex h-10 cursor-pointer items-center gap-2 rounded-full border border-border/60 bg-muted/20 pl-3.5 pr-2.5 text-muted-foreground transition-colors hover:bg-muted/40 hover:text-foreground"
                        >
                            <Search className="h-3.5 w-3.5 shrink-0" />
                            <span className="hidden text-xs xl:block">Search</span>
                            <kbd className="hidden rounded border border-border/60 bg-background/80 px-1.5 py-0.5 text-[10px] font-medium xl:ml-1 xl:block">
                                {searchShortcut}
                            </kbd>
                        </button>

                        {/* Light / dark toggle */}
                        <Button
                            type="button"
                            variant="ghost"
                            size="icon"
                            className="relative h-10 w-10 rounded-full hover:bg-accent/50"
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
                                'h-10 w-10 rounded-full hover:bg-accent/50',
                                sidebarOpen && 'text-primary'
                            )}
                            onClick={() => handleSidebarOpenChange(true)}
                            aria-label="Open player and appearance"
                            aria-haspopup="dialog"
                            aria-expanded={sidebarOpen}
                            title="Player & appearance"
                        >
                            <PanelRight className="h-4 w-4" />
                        </Button>

                        {/* User */}
                        {isAuthenticated ? (
                            <DropdownMenu open={accountOpen} onOpenChange={setAccountOpen}>
                                <DropdownMenuTrigger asChild>
                                    <button
                                        type="button"
                                        aria-label="Open account menu"
                                        title="Account"
                                        className="flex h-10 cursor-pointer items-center gap-2.5 rounded-full border border-border/60 bg-muted/20 pl-1 pr-3 transition-colors hover:bg-muted/40"
                                    >
                                        <Avatar className="h-8 w-8 border border-border/60">
                                            <AvatarImage
                                                src={user?.avatarUrl || ''}
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
                            <Button asChild variant="outline" size="sm" className="h-10 rounded-full px-5 text-sm font-medium">
                                <Link href={loginHref}>Login</Link>
                            </Button>
                        )}
                    </div>
                </div>
            </nav>

            {/* ── Mobile top bar ── */}
            <nav
                data-navbar
                aria-label="Main navigation"
                onFocusCapture={() => setIsNavbarHidden(false)}
                className={cn(
                    'fixed inset-x-0 top-0 z-50 transition-all duration-300 motion-reduce:transition-none lg:hidden [&_a:focus-visible]:outline-2 [&_a:focus-visible]:outline-primary',
                    'border-b border-border/60 bg-background/95 shadow-sm shadow-black/5 backdrop-blur-xl supports-[backdrop-filter]:bg-background/88',
                    isNavbarHidden ? 'pointer-events-none -translate-y-14 opacity-0' : 'translate-y-0 opacity-100'
                )}
            >
                <div className="flex h-14 items-center justify-between px-4">
                    <Link
                        href="/"
                        aria-label="JassSpace home"
                        aria-current={isActivePath('/') ? 'page' : undefined}
                        className="flex h-11 min-w-11 items-center rounded-full text-foreground transition-colors hover:text-primary"
                    >
                        <LogoMark className="h-7 w-7" />
                    </Link>

                    <div className="flex items-center gap-2">
                        <Button
                            type="button"
                            variant="ghost"
                            size="icon"
                            className="relative h-11 w-11 rounded-full hover:bg-accent/50"
                            onClick={() => setSearchOpen(true)}
                            aria-label="Search"
                        >
                            <Search className="h-4 w-4" />
                        </Button>

                        <Sheet open={menuOpen} onOpenChange={setMenuOpen}>
                            <SheetTrigger asChild>
                                <Button aria-label="Open navigation" variant="outline" size="icon" className="h-11 w-11 rounded-full">
                                    <Menu className="h-4 w-4" />
                                </Button>
                            </SheetTrigger>
                            <SheetContent
                                side="right"
                                className="[&_a:focus-visible]:outline-2 [&_a:focus-visible]:outline-offset-2 [&_a:focus-visible]:outline-primary h-[100dvh] w-screen max-w-none overflow-y-auto data-[side=right]:w-screen data-[side=right]:max-w-none sm:h-full sm:w-[340px] sm:max-w-[340px]"
                            >
                                <SheetHeader>
                                    <SheetTitle>Navigation</SheetTitle>
                                    <SheetDescription>Browse the site and open quick controls.</SheetDescription>
                                </SheetHeader>
                                <div className="mt-6 space-y-5 px-4 pb-6">
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
                                                                aria-current={isActive ? 'page' : undefined}
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
                                    {isAuthenticated && user ? (
                                        <div className="rounded-3xl border border-border/60 bg-card/60 p-4">
                                            <div className="flex items-center gap-3">
                                                <Avatar className="h-11 w-11 border border-border/60">
                                                    <AvatarImage
                                                        src={user?.avatarUrl || ''}
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
                                        Player & appearance
                                    </Button>



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
                    className="[&_a:focus-visible]:outline-2 [&_a:focus-visible]:outline-offset-2 [&_a:focus-visible]:outline-primary h-[100dvh] w-screen max-w-none overflow-y-auto data-[side=right]:w-screen data-[side=right]:max-w-none sm:h-full sm:max-w-sm"
                >
                    <SheetHeader>
                        <SheetTitle>Player & appearance</SheetTitle>
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
                                <Button type="button" variant="outline" size="icon" asChild className="h-11 w-11 rounded-full">
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
                                    {sidebarOpen && !reduceMotion ? (
                                        <AudioSidebarVisualizer
                                            isOpen={sidebarOpen}
                                            isPlaying={isPlaying}
                                            getVisualizerAnalyser={getVisualizerAnalyser}
                                        />
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
                                        <Button
                                            type="button"
                                            size="icon"
                                            variant="outline"
                                            className="h-11 w-11 rounded-full"
                                            aria-label="Rewind 10 seconds"
                                            title="Rewind 10 seconds"
                                            onClick={() => seekBy(-10)}
                                        >
                                            <SkipBack className="h-4 w-4" />
                                        </Button>
                                        <Button
                                            type="button"
                                            size="icon"
                                            className="h-11 w-11 rounded-full"
                                            aria-label={isPlaying ? 'Pause' : 'Play'}
                                            title={isPlaying ? 'Pause' : 'Play'}
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
                                            className="h-11 w-11 rounded-full"
                                            aria-label="Stop playback"
                                            title="Stop playback"
                                            onClick={stop}
                                        >
                                            <Square className="h-4 w-4" />
                                        </Button>
                                        <Button
                                            type="button"
                                            size="icon"
                                            variant="outline"
                                            className="h-11 w-11 rounded-full"
                                            aria-label="Forward 10 seconds"
                                            title="Forward 10 seconds"
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
                                                aria-pressed={isActive}
                                                onClick={() => setTheme(mode)}
                                                className={cn(
                                                    'relative flex h-11 focus-visible:outline-2 focus-visible:outline-primary items-center justify-center gap-2 rounded-md text-sm font-medium transition-colors',
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
                                            aria-pressed={isActiveTheme}
                                            onClick={() => setActiveThemeSetId(themeSet.id)}
                                        >
                                            <span className="relative isolate mr-3 block h-10 w-14 shrink-0 overflow-hidden rounded-md border border-border/70">
                                                <span
                                                    className="block h-full w-full"
                                                    style={{ background: getThemePreviewBackground(themeSet) }}
                                                />
                                                {isActiveTheme && (
                                                    <span className="absolute right-1 top-1 rounded-full bg-primary p-0.5 text-primary-foreground">
                                                        <Check className="h-3 w-3" aria-hidden="true" />
                                                    </span>
                                                )}
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
                        <Button
                            variant="outline"
                            onClick={() => setShowLogoutDialog(false)}
                            onMouseEnter={() =>
                                !reduceMotion && cancelIconControls.start({
                                    rotate: [0, -10, 10, 0],
                                    scale: [1, 1.2, 1],
                                    transition: { duration: 0.55, ease: 'easeInOut' },
                                })
                            }
                            onMouseLeave={() =>
                                !reduceMotion && cancelIconControls.start({
                                    rotate: 0,
                                    scale: 1,
                                    transition: { duration: 0.15 },
                                })
                            }
                        >
                            <motion.span
                                className="inline-flex"
                                animate={cancelIconControls}
                                aria-hidden="true"
                            >
                                <Smile className="h-4 w-4" />
                            </motion.span>
                            Cancel
                        </Button>
                        <Button
                            variant="destructive"
                            onClick={handleLogout}
                            onMouseEnter={() =>
                                !reduceMotion && logoutIconControls.start({
                                    y: [0, 2, 0],
                                    rotate: [0, -5, 5, 0],
                                    scale: [1, 1.12, 1],
                                    transition: { duration: 0.55, ease: 'easeInOut' },
                                })
                            }
                            onMouseLeave={() =>
                                !reduceMotion && logoutIconControls.start({
                                    y: 0,
                                    rotate: 0,
                                    scale: 1,
                                    transition: { duration: 0.15 },
                                })
                            }
                        >
                            <motion.span
                                className="inline-flex"
                                animate={logoutIconControls}
                                aria-hidden="true"
                            >
                                <Frown className="h-4 w-4" />
                            </motion.span>
                            Logout
                        </Button>
                    </DialogFooter>
                </DialogContent>
            </Dialog>
        </MotionConfig>
    );
}
