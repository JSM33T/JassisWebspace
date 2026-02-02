'use client';

import { useState, useRef, useEffect } from 'react';
import Link from 'next/link';
import { Button } from '@/components/ui/button';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Badge } from '@/components/ui/badge';
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
import { Menu, LogOut, User, UserCircle, Settings, Shield, Star, Sparkles, AtSign, BookOpen, FileText, Video, Code, Lightbulb, ChevronDown } from 'lucide-react';
import { useUser, userHelpers } from '@/contexts/UserContext';
import { useRouter } from 'next/navigation';
import { ModeToggle } from '@/components/mode-toggle';

export function Navbar() {
    const { user, logout, isAuthenticated } = useUser();
    const router = useRouter();
    const [menuOpen, setMenuOpen] = useState(false);
    const [showLogoutDialog, setShowLogoutDialog] = useState(false);

    const handleLogout = async () => {
        setShowLogoutDialog(false);
        await logout();
        router.push('/');
    };

    // Liquid hover effect state
    const [hoveredLink, setHoveredLink] = useState<string | null>(null);
    const [hoverStyle, setHoverStyle] = useState({ left: 0, width: 0, opacity: 0 });
    const navRef = useRef<HTMLDivElement>(null);


    const normalizedRole = (user?.role ?? '').toLowerCase();
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



    return (
        <>
            <nav className="fixed top-4 left-1/2 -translate-x-1/2 z-50 w-[95%] max-w-5xl">
                {/* Gradient border wrapper */}
                <div className="p-[1px] rounded-full bg-gradient-to-br from-primary/15 via-primary/10 to-primary/12">
                    <div className="bg-background/95 backdrop-blur-md supports-[backdrop-filter]:bg-background/80 rounded-full shadow-lg shadow-black/5 px-6 lg:px-8">
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
                                <Link
                                    href="/"
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
                                        setHoveredLink('home');
                                    }}
                                >
                                    Home
                                </Link>

                                <Link
                                    href="/blogs"
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
                                        setHoveredLink('plans');
                                    }}
                                >
                                    Blogs
                                </Link>
                                <DropdownMenu>
                                    <DropdownMenuTrigger asChild>
                                        <button

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
                                                setHoveredLink('resources');
                                            }}
                                        >
                                            Studio <ChevronDown className="h-3 w-3 inline ml-1" />
                                        </button>
                                    </DropdownMenuTrigger>
                                    <DropdownMenuContent className="w-64" align="center">
                                        <DropdownMenuItem asChild>
                                            <Link href="/services" className="cursor-pointer flex items-start gap-3 p-3">
                                                <Settings className="h-5 w-5 mt-0.5 text-primary" />
                                                <div className="flex flex-col">
                                                    <span className="font-medium">Services</span>
                                                    <span className="text-xs text-muted-foreground">Explore our service offerings</span>
                                                </div>
                                            </Link>
                                        </DropdownMenuItem>
                                        <DropdownMenuItem asChild>
                                            <Link href="/projects" className="cursor-pointer flex items-start gap-3 p-3">
                                                <Code className="h-5 w-5 mt-0.5 text-primary" />
                                                <div className="flex flex-col">
                                                    <span className="font-medium">Projects</span>
                                                    <span className="text-xs text-muted-foreground">View our latest projects</span>
                                                </div>
                                            </Link>
                                        </DropdownMenuItem>
                                        <DropdownMenuItem asChild>
                                            <Link href="/tools" className="cursor-pointer flex items-start gap-3 p-3">
                                                <Lightbulb className="h-5 w-5 mt-0.5 text-primary" />
                                                <div className="flex flex-col">
                                                    <span className="font-medium">Tools</span>
                                                    <span className="text-xs text-muted-foreground">Developer tools and utilities</span>
                                                </div>
                                            </Link>
                                        </DropdownMenuItem>
                                        <DropdownMenuSeparator />
                                    </DropdownMenuContent>
                                </DropdownMenu>
                                <Link
                                    href="/about"
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
                                        setHoveredLink('about');
                                    }}
                                >
                                    About
                                </Link>
                            </div>

                            {/* Right Side - Icons */}
                            <div className="hidden md:flex items-center gap-2">
                                <ModeToggle />
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
                                    <Link href="/login">
                                        <Button variant="ghost" size="sm" className="h-8 hover:bg-accent/50">
                                            <User className="h-4 w-4" />
                                        </Button>
                                    </Link>
                                )}
                            </div>

                            {/* Mobile Menu */}
                            <div className="md:hidden">
                                <Sheet open={menuOpen} onOpenChange={setMenuOpen}>
                                    <SheetTrigger asChild>
                                        <Button variant="outline" size="icon">
                                            <Menu className="h-4 w-4" />
                                        </Button>
                                    </SheetTrigger>
                                    <SheetContent side="right" className="w-[300px]">
                                        <SheetHeader>
                                            <SheetTitle>Menu</SheetTitle>
                                            <SheetDescription>Navigate through the app</SheetDescription>
                                        </SheetHeader>
                                        <div className="mt-6 space-y-4">
                                            {isAuthenticated && user && (
                                                <div className="flex items-center gap-3 pb-4 border-b">
                                                    <Avatar>
                                                        <AvatarImage
                                                            src={user.avatarUrl || '/placeholder-avatar.jpg'}
                                                            alt="User Avatar"
                                                        />
                                                        <AvatarFallback>{userHelpers.getInitials(user)}</AvatarFallback>
                                                    </Avatar>
                                                    <div className="flex-1 min-w-0">
                                                        <p className="text-sm font-medium truncate">{userHelpers.getFirstName(user)}</p>
                                                    </div>
                                                </div>
                                            )}

                                            <div className="space-y-2">
                                                <SheetClose asChild>
                                                    <Link href="/" className="block px-3 py-2 rounded-md text-base font-medium hover:bg-muted">
                                                        Home
                                                    </Link>
                                                </SheetClose>
                                                <SheetClose asChild>
                                                    <Link href="/about" className="block px-3 py-2 rounded-md text-base font-medium hover:bg-muted">
                                                        About
                                                    </Link>
                                                </SheetClose>
                                                <SheetClose asChild>
                                                    <Link href="/blog" className="block px-3 py-2 rounded-md text-base font-medium hover:bg-muted">
                                                        Blog
                                                    </Link>
                                                </SheetClose>
                                            </div>

                                            {isAuthenticated ? (
                                                <>
                                                    <div className="border-t pt-4 space-y-2">
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
                                            ) : (
                                                <SheetClose asChild>
                                                    <Link href="/login" className="block">
                                                        <Button variant="default" className="w-full">
                                                            <User className="h-3 w-3 mr-1" />
                                                            Login
                                                        </Button>
                                                    </Link>
                                                </SheetClose>
                                            )}
                                        </div>
                                    </SheetContent>
                                </Sheet>
                            </div>
                        </div>
                    </div>
                </div>
            </nav>

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
