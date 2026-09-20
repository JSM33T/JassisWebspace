'use client';

import { useState, useRef, useEffect } from 'react';
import Link from 'next/link';
import { Button } from '@/components/ui/button';
import { LogoMark } from '@/components/logo-mark';
import {
    DropdownMenu,
    DropdownMenuContent,
    DropdownMenuItem,
    DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
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
    ChevronDown,
    PanelRight,
    Search,
} from 'lucide-react';
import { primaryNavigation, navigationSections, isNavigationActive, navigationAriaCurrent, type NavigationItem } from '@/lib/site-navigation';
import { SearchModal } from '@/components/search-modal';
import { usePathname } from 'next/navigation';
import { cn } from '@/lib/utils';
import { motion, MotionConfig } from 'framer-motion';
import {
    DesktopNavbarAccount,
    MobileNavbarAccountLinks,
    MobileNavbarAccountSummary,
    NavbarAccountProvider,
} from '@/components/navbar/account-controls';
import { PlayerAppearanceSheet } from '@/components/navbar/player-appearance-sheet';
import { NavbarThemeToggle } from '@/components/navbar/theme-controls';

const SIDEBAR_OPEN_EVENT = 'app-sidebar:set-open';

export function Navbar() {
    const pathname = usePathname();
    const [searchShortcut, setSearchShortcut] = useState('Ctrl K');
    const [accountOverlayOpen, setAccountOverlayOpen] = useState(false);
    const desktopTriggerRef = useRef<HTMLButtonElement | null>(null);
    const desktopContentRef = useRef<HTMLDivElement | null>(null);
    const [menuOpen, setMenuOpen] = useState(false);
    const [desktopMenu, setDesktopMenu] = useState<string | null>(null);
    const desktopMenuCloseTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
    const desktopMenuOpenedByHover = useRef(false);
    const [sidebarOpen, setSidebarOpen] = useState(false);
    const [searchOpen, setSearchOpen] = useState(false);
    const [isNavbarHidden, setIsNavbarHidden] = useState(false);
    const [isScrolled, setIsScrolled] = useState(false);

    const navRef = useRef<HTMLDivElement>(null);
    const previousPathnameRef = useRef(pathname);
    const [hoverStyle, setHoverStyle] = useState({ left: 0, width: 0, opacity: 0 });

    useEffect(() => {
        const updateShortcut = () => setSearchShortcut(/Mac|iPhone|iPad/.test(navigator.platform) ? '⌘K' : 'Ctrl K');
        updateShortcut();
    }, []);

    const cancelDesktopMenuClose = () => {
        if (desktopMenuCloseTimer.current !== null) {
            clearTimeout(desktopMenuCloseTimer.current);
            desktopMenuCloseTimer.current = null;
        }
    };

    const scheduleDesktopMenuClose = () => {
        cancelDesktopMenuClose();
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

    const isActivePath = (href: string) => isNavigationActive(pathname, href);

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

    const renderDesktopMenuItem = (item: NavigationItem) => {
        const Icon = item.icon;
        const isActive = isActivePath(item.href);

        return (
            <DropdownMenuItem key={item.href} asChild className="p-0 focus:bg-transparent">
                <Link href={item.href} aria-current={navigationAriaCurrent(pathname, item.href)} className={navDropdownItemClassName(isActive)}>
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

            if (menuOpen || sidebarOpen || desktopMenu !== null || accountOverlayOpen || searchOpen || document.activeElement?.closest('[data-navbar]')) {
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
    }, [menuOpen, sidebarOpen, desktopMenu, accountOverlayOpen, searchOpen]);

    useEffect(() => {
        if (previousPathnameRef.current === pathname) return;

        previousPathnameRef.current = pathname;

        if (!menuOpen && !sidebarOpen && desktopMenu === null) return;

        const timeoutId = window.setTimeout(() => {
            setMenuOpen(false);
            setDesktopMenu(null);
            setSidebarOpen(false);
            window.dispatchEvent(new CustomEvent<boolean>(SIDEBAR_OPEN_EVENT, { detail: false }));
        }, 0);

        return () => window.clearTimeout(timeoutId);
    }, [pathname, menuOpen, sidebarOpen, desktopMenu]);

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
            'relative z-10 flex min-h-10 cursor-pointer items-center gap-1.5 rounded-full px-2 xl:px-3 text-sm font-medium focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-primary',
            'transition-[color,opacity] duration-200',
            active ? 'text-foreground' : 'text-muted-foreground hover:text-foreground'
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
            <NavbarAccountProvider onOverlayOpenChange={setAccountOverlayOpen}>
                <nav
                    data-navbar
                    aria-label="Main navigation"
                    onFocusCapture={() => setIsNavbarHidden(false)}
                    className={cn(
                        'fixed inset-x-0 top-0 z-50 hidden lg:block',
                        'bg-background/70 backdrop-blur-xl supports-[backdrop-filter]:bg-background/55',
                        'after:pointer-events-none after:absolute after:inset-x-0 after:bottom-0 after:h-px',
                        'after:bg-gradient-to-r after:from-transparent after:via-border/70 after:to-transparent',
                        'transition-[transform,background-color,box-shadow] duration-300 ease-out motion-reduce:transition-none [&_a:focus-visible]:outline-2 [&_a:focus-visible]:outline-offset-2 [&_a:focus-visible]:outline-primary [&_button:focus-visible]:outline-2 [&_button:focus-visible]:outline-offset-2 [&_button:focus-visible]:outline-primary',
                        isScrolled && 'shadow-lg shadow-black/10 bg-background/85 supports-[backdrop-filter]:bg-background/70',
                        isNavbarHidden ? '-translate-y-full' : 'translate-y-0'
                    )}
                >
                    <div className={cn('mx-auto flex max-w-7xl items-center gap-3 px-6 xl:gap-6 xl:px-10', 'transition-[height] duration-300 ease-out motion-reduce:transition-none', isScrolled ? 'h-14' : 'h-[4.25rem]')}>
                        <Link href="/" aria-label="JassSpace home" className="flex shrink-0 items-center gap-2.5 text-foreground transition-colors hover:text-primary">
                            <LogoMark className="h-8 w-8" />
                            <span className="hidden text-sm font-semibold tracking-tight xl:block">JassSpace</span>
                        </Link>

                        <div className="flex flex-1 items-center justify-center">
                            <div ref={navRef} className="group/navlinks relative flex items-center" onMouseLeave={() => setHoverStyle((prev) => ({ ...prev, opacity: 0 }))}>
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

                                {primaryNavigation.map((entry) => {
                                    const Icon = entry.icon;
                                    if ('href' in entry) {
                                        const active = isActivePath(entry.href);
                                        return (
                                            <Link
                                                key={entry.href}
                                                href={entry.href}
                                                aria-current={navigationAriaCurrent(pathname, entry.href)}
                                                className={topNavLinkClass(active)}
                                                onMouseEnter={handleNavLinkHover}
                                            >
                                                {active && activeUnderline}
                                                <Icon aria-hidden="true" className="h-3.5 w-3.5" />
                                                {entry.label}
                                            </Link>
                                        );
                                    }

                                    const active = entry.items.some((item) => isActivePath(item.href));
                                    return (
                                        <DropdownMenu key={entry.id} modal={false} open={desktopMenu === entry.id} onOpenChange={(open) => handleDesktopMenuOpenChange(entry.id, open)}>
                                            <DropdownMenuTrigger asChild>
                                                <button
                                                    type="button"
                                                    onPointerEnter={(event) => handleDesktopMenuPointerEnter(event, entry.id)}
                                                    onPointerLeave={handleDesktopMenuPointerLeave}
                                                    onFocus={(event) => { desktopTriggerRef.current = event.currentTarget; cancelDesktopMenuClose(); }}
                                                    onBlur={scheduleDesktopMenuClose}
                                                    aria-current={active ? 'location' : undefined}
                                                    className={topNavLinkClass(active)}
                                                    onMouseEnter={handleNavLinkHover}
                                                >
                                                    {active && activeUnderline}
                                                    <Icon aria-hidden="true" className="h-3.5 w-3.5" />
                                                    {entry.label}
                                                    <ChevronDown aria-hidden="true" className="h-3 w-3 transition-transform duration-200 group-data-[state=open]:rotate-180" />
                                                </button>
                                            </DropdownMenuTrigger>
                                            <DropdownMenuContent {...desktopMenuContentProps} className={navDropdownContentClassName} align="center" sideOffset={14} collisionPadding={16}>
                                                <div className={navDropdownGridClassName}>{entry.items.map(renderDesktopMenuItem)}</div>
                                            </DropdownMenuContent>
                                        </DropdownMenu>
                                    );
                                })}
                            </div>
                        </div>

                        <div role="group" aria-label="Site tools and account" className="flex shrink-0 items-center gap-1 border-l border-border/60 pl-3 xl:gap-2">
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

                            <NavbarThemeToggle />

                            <Button
                                variant="ghost"
                                size="icon"
                                className={cn('h-10 w-10 rounded-full hover:bg-accent/50', sidebarOpen && 'text-primary')}
                                onClick={() => handleSidebarOpenChange(true)}
                                aria-label="Open player and appearance"
                                aria-haspopup="dialog"
                                aria-expanded={sidebarOpen}
                                title="Player & appearance"
                            >
                                <PanelRight className="h-4 w-4" />
                            </Button>

                            <DesktopNavbarAccount />
                        </div>
                    </div>
                </nav>

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
                        <Link href="/" aria-label="JassSpace home" aria-current={isActivePath('/') ? 'page' : undefined} className="flex h-11 min-w-11 items-center rounded-full text-foreground transition-colors hover:text-primary">
                            <LogoMark className="h-7 w-7" />
                        </Link>

                        <div className="flex items-center gap-2">
                            <Button type="button" variant="ghost" size="icon" className="relative h-11 w-11 rounded-full hover:bg-accent/50" onClick={() => setSearchOpen(true)} aria-label="Search">
                                <Search className="h-4 w-4" />
                            </Button>

                            <Sheet open={menuOpen} onOpenChange={setMenuOpen}>
                                <SheetTrigger asChild>
                                    <Button aria-label="Open navigation" variant="outline" size="icon" className="h-11 w-11 rounded-full">
                                        <Menu className="h-4 w-4" />
                                    </Button>
                                </SheetTrigger>
                                <SheetContent side="right" className="[&_a:focus-visible]:outline-2 [&_a:focus-visible]:outline-offset-2 [&_a:focus-visible]:outline-primary h-[100dvh] w-screen max-w-none overflow-y-auto data-[side=right]:w-screen data-[side=right]:max-w-none sm:h-full sm:w-[340px] sm:max-w-[340px]">
                                    <SheetHeader>
                                        <SheetTitle>Navigation</SheetTitle>
                                        <SheetDescription>Browse the site and open quick controls.</SheetDescription>
                                    </SheetHeader>
                                    <div className="mt-6 space-y-5 px-4 pb-6">
                                        {navigationSections.map((section) => (
                                            <div key={section.id} className="rounded-3xl border border-border/60 bg-card/60 p-3">
                                                <p className="px-2 pb-2 text-xs font-semibold uppercase tracking-[0.2em] text-muted-foreground">{section.label}</p>
                                                <div className="space-y-1">
                                                    {section.items.map((item) => {
                                                        const Icon = item.icon;
                                                        const isActive = isActivePath(item.href);
                                                        return (
                                                            <SheetClose key={item.href} asChild>
                                                                <Link href={item.href} aria-current={navigationAriaCurrent(pathname, item.href)} className={cn('flex items-center gap-3 rounded-2xl px-3 py-3 text-sm font-medium transition-colors', isActive ? 'bg-primary/12 text-foreground' : 'hover:bg-accent/70')}>
                                                                    <Icon className={cn('h-4 w-4 text-primary', isActive && 'text-foreground')} />
                                                                    <span>{item.label}</span>
                                                                </Link>
                                                            </SheetClose>
                                                        );
                                                    })}
                                                </div>
                                            </div>
                                        ))}
                                        <div role="group" aria-label="Site tools and account" className="space-y-3 border-t border-border/60 pt-5">
                                            <p className="px-2 text-xs font-semibold uppercase tracking-[0.2em] text-muted-foreground">Tools & account</p>
                                            <MobileNavbarAccountSummary />
                                            <Button type="button" variant="outline" className="h-12 w-full cursor-pointer justify-start rounded-2xl" onClick={() => { setMenuOpen(false); setTimeout(() => setSearchOpen(true), 180); }}>
                                                <Search className="mr-2 h-4 w-4" />
                                                Search
                                            </Button>
                                            <Button type="button" variant="outline" className="h-12 w-full cursor-pointer justify-start rounded-2xl" onClick={() => { setMenuOpen(false); setTimeout(() => handleSidebarOpenChange(true), 180); }}>
                                                <PanelRight className="mr-2 h-4 w-4" />
                                                Player & appearance
                                            </Button>
                                            <MobileNavbarAccountLinks closeMenu={() => setMenuOpen(false)} />
                                        </div>
                                    </div>
                                </SheetContent>
                            </Sheet>
                        </div>
                    </div>
                </nav>

                <PlayerAppearanceSheet open={sidebarOpen} onOpenChange={handleSidebarOpenChange} />
                <SearchModal open={searchOpen} onClose={() => setSearchOpen(false)} />
            </NavbarAccountProvider>
        </MotionConfig>
    );
}
