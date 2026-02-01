'use client';

import { useState } from 'react';
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
import { Menu, LogOut, User, UserCircle, Settings, Shield, Star, Sparkles, AtSign } from 'lucide-react';
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
            <nav className="sticky top-0 z-50 bg-background/70 backdrop-blur supports-[backdrop-filter]:bg-background/60 border-b">
                <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
                    <div className="flex h-16 items-center justify-between">
                        {/* Logo */}
                        <div className="flex-shrink-0">
                            <Link href="/" className="flex items-center gap-2 text-lg font-semibold text-foreground hover:opacity-85 transition-opacity">
                                <span>JassSpace</span>
                            </Link>
                        </div>

                        {/* Desktop Navigation */}
                        <div className="hidden md:flex items-center space-x-4">
                            <Link href="/" className="text-sm font-medium text-muted-foreground hover:text-foreground transition-colors">
                                Home
                            </Link>
                            <Link href="/about" className="text-sm font-medium text-muted-foreground hover:text-foreground transition-colors">
                                About
                            </Link>
                            <Link href="/pricing" className="text-sm font-medium text-muted-foreground hover:text-foreground transition-colors">
                                Pricing
                            </Link>
                        </div>

                        {/* Right Side */}
                        <div className="hidden md:flex items-center space-x-4">
                            <ModeToggle />
                            {isAuthenticated ? (
                                <DropdownMenu>
                                    <DropdownMenuTrigger asChild>
                                        <Button variant="ghost" className="relative h-9 w-9 rounded-full">
                                            <Avatar className="h-9 w-9">
                                                <AvatarImage
                                                    src={user?.avatarUrl || '/placeholder-avatar.jpg'}
                                                    alt="User Avatar"
                                                />
                                                <AvatarFallback>{userHelpers.getInitials(user)}</AvatarFallback>
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
                                    <Button variant="default" size="sm">
                                        <User className="h-3 w-3 mr-1" />
                                        Login
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
                                                <Link href="/pricing" className="block px-3 py-2 rounded-md text-base font-medium hover:bg-muted">
                                                    Pricing
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
