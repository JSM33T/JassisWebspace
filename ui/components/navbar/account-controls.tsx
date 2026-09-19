'use client';

import { createContext, useCallback, useContext, useEffect, useMemo, useState } from 'react';
import Link from 'next/link';
import { usePathname, useRouter, useSearchParams } from 'next/navigation';
import { motion, useAnimation, useReducedMotion } from 'framer-motion';
import {
    AtSign,
    ChevronDown,
    Frown,
    LayoutDashboard,
    LogOut,
    Settings,
    Shield,
    Smile,
    User as UserIcon,
    UserCircle,
} from 'lucide-react';

import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import {
    Dialog,
    DialogContent,
    DialogDescription,
    DialogFooter,
    DialogHeader,
    DialogTitle,
} from '@/components/ui/dialog';
import {
    DropdownMenu,
    DropdownMenuContent,
    DropdownMenuItem,
    DropdownMenuLabel,
    DropdownMenuSeparator,
    DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { SheetClose } from '@/components/ui/sheet';
import { userHelpers, useUser, type User } from '@/contexts/UserContext';
import { buildLoginHref } from '@/lib/auth-redirect';

type AccountContextValue = {
    user: User | null;
    isAuthenticated: boolean;
    normalizedRole: string;
    roleDisplayName: string;
    loginHref: string;
    accountOpen: boolean;
    setAccountOpen: (open: boolean) => void;
    requestLogout: (delayMs?: number) => void;
};

const AccountContext = createContext<AccountContextValue | null>(null);

function useNavbarAccount() {
    const context = useContext(AccountContext);
    if (!context) throw new Error('Navbar account controls must be used inside NavbarAccountProvider');
    return context;
}

export function NavbarAccountProvider({ children, onOverlayOpenChange }: {
    children: React.ReactNode;
    onOverlayOpenChange: (open: boolean) => void;
}) {
    const { user, logout, isAuthenticated } = useUser();
    const router = useRouter();
    const pathname = usePathname();
    const searchParams = useSearchParams();
    const [accountOpen, setAccountOpen] = useState(false);
    const [logoutOpen, setLogoutOpen] = useState(false);

    const normalizedRole = (user?.role ?? '').toLowerCase();
    const roleDisplayName = normalizedRole === 'admin'
        ? 'Admin'
        : normalizedRole === 'mod'
          ? 'Mod'
          : normalizedRole === 'user'
            ? 'User'
            : normalizedRole
              ? normalizedRole.charAt(0).toUpperCase() + normalizedRole.slice(1)
              : 'User';
    const currentPathWithQuery = searchParams.toString() ? `${pathname}?${searchParams.toString()}` : pathname;
    const loginHref = buildLoginHref(currentPathWithQuery);

    useEffect(() => onOverlayOpenChange(accountOpen || logoutOpen), [accountOpen, logoutOpen, onOverlayOpenChange]);
    useEffect(() => {
        setAccountOpen(false);
        setLogoutOpen(false);
    }, [pathname]);

    const requestLogout = useCallback((delayMs = 0) => {
        setAccountOpen(false);
        if (delayMs > 0) window.setTimeout(() => setLogoutOpen(true), delayMs);
        else setLogoutOpen(true);
    }, []);

    const value = useMemo(() => ({
        user,
        isAuthenticated,
        normalizedRole,
        roleDisplayName,
        loginHref,
        accountOpen,
        setAccountOpen,
        requestLogout,
    }), [user, isAuthenticated, normalizedRole, roleDisplayName, loginHref, accountOpen, requestLogout]);

    const confirmLogout = async () => {
        setLogoutOpen(false);
        await logout();
        router.push('/');
    };

    return (
        <AccountContext.Provider value={value}>
            {children}
            <LogoutDialog open={logoutOpen} onOpenChange={setLogoutOpen} onConfirm={confirmLogout} />
        </AccountContext.Provider>
    );
}

export function DesktopNavbarAccount() {
    const { user, isAuthenticated, normalizedRole, roleDisplayName, loginHref, accountOpen, setAccountOpen, requestLogout } = useNavbarAccount();

    if (!isAuthenticated) {
        return (
            <Button asChild variant="outline" size="sm" className="h-10 rounded-full px-5 text-sm font-medium">
                <Link href={loginHref}>Login</Link>
            </Button>
        );
    }

    return (
        <DropdownMenu open={accountOpen} onOpenChange={setAccountOpen}>
            <DropdownMenuTrigger asChild>
                <button
                    type="button"
                    aria-label="Open account menu"
                    title="Account"
                    className="flex h-10 cursor-pointer items-center gap-2.5 rounded-full border border-border/60 bg-muted/20 pl-1 pr-3 transition-colors hover:bg-muted/40"
                >
                    <Avatar className="h-8 w-8 border border-border/60">
                        <AvatarImage src={user?.avatarUrl || ''} alt="User Avatar" />
                        <AvatarFallback className="text-xs">{userHelpers.getInitials(user)}</AvatarFallback>
                    </Avatar>
                    <div className="hidden flex-col items-start xl:flex">
                        <span className="text-xs font-semibold leading-none">{userHelpers.getFirstName(user)}</span>
                        <span className="mt-0.5 text-[10px] leading-none text-muted-foreground">{roleDisplayName}</span>
                    </div>
                    <ChevronDown className="hidden h-3 w-3 shrink-0 text-muted-foreground xl:block" />
                </button>
            </DropdownMenuTrigger>
            <DropdownMenuContent className="w-56" align="end" forceMount>
                <DropdownMenuLabel className="font-normal">
                    <div className="flex flex-col space-y-1">
                        <p className="truncate text-sm font-medium leading-none">{userHelpers.getFirstName(user)}</p>
                        <div className="flex w-full items-center justify-between gap-2 pt-0.5 text-xs text-muted-foreground">
                            <div className="flex items-center gap-1 truncate">
                                <AtSign className="h-3 w-3 shrink-0 text-muted-foreground/80" />
                                <span className="max-w-[10rem] truncate font-medium">{user?.username?.replace(/^@+/, '')}</span>
                            </div>
                            {user?.role ? <span className="shrink-0 text-xs uppercase tracking-wide text-muted-foreground/70">{roleDisplayName}</span> : null}
                        </div>
                    </div>
                </DropdownMenuLabel>
                <DropdownMenuSeparator />
                {(normalizedRole === 'admin' || normalizedRole === 'mod') ? (
                    <AccountDropdownLink href="/admin" icon={LayoutDashboard}>Admin</AccountDropdownLink>
                ) : null}
                <AccountDropdownLink href="/account/profile" icon={UserCircle}>Profile</AccountDropdownLink>
                <AccountDropdownLink href="/account/preferences" icon={Settings}>Settings</AccountDropdownLink>
                <AccountDropdownLink href="/account/security" icon={Shield}>Security</AccountDropdownLink>
                <DropdownMenuSeparator />
                <DropdownMenuItem onClick={() => requestLogout()} className="cursor-pointer text-red-600 focus:text-red-600">
                    <LogOut className="mr-2 h-4 w-4" />Logout
                </DropdownMenuItem>
            </DropdownMenuContent>
        </DropdownMenu>
    );
}

export function MobileNavbarAccountSummary() {
    const { user, isAuthenticated, roleDisplayName, loginHref } = useNavbarAccount();

    if (!isAuthenticated || !user) {
        return (
            <SheetClose asChild>
                <Button asChild className="h-12 w-full rounded-2xl">
                    <Link href={loginHref}><UserIcon className="mr-2 h-4 w-4" />Login</Link>
                </Button>
            </SheetClose>
        );
    }

    return (
        <div className="rounded-3xl border border-border/60 bg-card/60 p-4">
            <div className="flex items-center gap-3">
                <Avatar className="h-11 w-11 border border-border/60">
                    <AvatarImage src={user.avatarUrl || ''} alt="User Avatar" />
                    <AvatarFallback>{userHelpers.getInitials(user)}</AvatarFallback>
                </Avatar>
                <div className="min-w-0 flex-1">
                    <p className="truncate text-sm font-medium">{userHelpers.getFirstName(user)}</p>
                    <p className="truncate text-xs text-muted-foreground">@{user.username?.replace(/^@+/, '')}</p>
                </div>
                {user.role ? <Badge variant="secondary" className="rounded-full">{roleDisplayName}</Badge> : null}
            </div>
        </div>
    );
}

export function MobileNavbarAccountLinks({ closeMenu }: { closeMenu: () => void }) {
    const { isAuthenticated, normalizedRole, requestLogout } = useNavbarAccount();
    if (!isAuthenticated) return null;

    return (
        <div className="rounded-3xl border border-border/60 bg-card/60 p-3">
            <p className="px-2 pb-2 text-xs font-semibold uppercase tracking-[0.2em] text-muted-foreground">Account</p>
            <div className="space-y-1">
                {normalizedRole === 'admin' ? <MobileAccountLink href="/admin" icon={LayoutDashboard}>Admin</MobileAccountLink> : null}
                <MobileAccountLink href="/account/profile" icon={UserCircle}>Profile</MobileAccountLink>
                <MobileAccountLink href="/account/preferences" icon={Settings}>Settings</MobileAccountLink>
                <MobileAccountLink href="/account/security" icon={Shield}>Security</MobileAccountLink>
                <Button
                    variant="ghost"
                    className="w-full cursor-pointer justify-start rounded-2xl px-3 py-3 text-red-600 hover:bg-red-500/10 hover:text-red-700"
                    onClick={() => {
                        closeMenu();
                        requestLogout(180);
                    }}
                >
                    <LogOut className="mr-3 h-4 w-4" />Logout
                </Button>
            </div>
        </div>
    );
}

function AccountDropdownLink({ href, icon: Icon, children }: { href: string; icon: typeof UserCircle; children: React.ReactNode }) {
    return (
        <DropdownMenuItem asChild>
            <Link href={href} className="cursor-pointer"><Icon className="mr-2 h-4 w-4" />{children}</Link>
        </DropdownMenuItem>
    );
}

function MobileAccountLink({ href, icon: Icon, children }: { href: string; icon: typeof UserCircle; children: React.ReactNode }) {
    return (
        <SheetClose asChild>
            <Link href={href} className="flex items-center gap-3 rounded-2xl px-3 py-3 text-sm font-medium hover:bg-accent/70">
                <Icon className="h-4 w-4 text-primary" /><span>{children}</span>
            </Link>
        </SheetClose>
    );
}

function LogoutDialog({ open, onOpenChange, onConfirm }: {
    open: boolean;
    onOpenChange: (open: boolean) => void;
    onConfirm: () => Promise<void>;
}) {
    const reduceMotion = useReducedMotion();
    const cancelIconControls = useAnimation();
    const logoutIconControls = useAnimation();

    return (
        <Dialog open={open} onOpenChange={onOpenChange}>
            <DialogContent className="sm:max-w-md">
                <DialogHeader>
                    <DialogTitle className="flex items-center"><LogOut className="mr-2 h-5 w-5 text-red-600" />Confirm Logout</DialogTitle>
                    <DialogDescription>Are you sure you want to logout?</DialogDescription>
                </DialogHeader>
                <DialogFooter>
                    <Button
                        variant="outline"
                        onClick={() => onOpenChange(false)}
                        onMouseEnter={() => !reduceMotion && cancelIconControls.start({ rotate: [0, -10, 10, 0], scale: [1, 1.2, 1], transition: { duration: 0.55, ease: 'easeInOut' } })}
                        onMouseLeave={() => !reduceMotion && cancelIconControls.start({ rotate: 0, scale: 1, transition: { duration: 0.15 } })}
                    >
                        <motion.span className="inline-flex" animate={cancelIconControls} aria-hidden="true"><Smile className="h-4 w-4" /></motion.span>
                        Cancel
                    </Button>
                    <Button
                        variant="destructive"
                        onClick={() => void onConfirm()}
                        onMouseEnter={() => !reduceMotion && logoutIconControls.start({ y: [0, 2, 0], rotate: [0, -5, 5, 0], scale: [1, 1.12, 1], transition: { duration: 0.55, ease: 'easeInOut' } })}
                        onMouseLeave={() => !reduceMotion && logoutIconControls.start({ y: 0, rotate: 0, scale: 1, transition: { duration: 0.15 } })}
                    >
                        <motion.span className="inline-flex" animate={logoutIconControls} aria-hidden="true"><Frown className="h-4 w-4" /></motion.span>
                        Logout
                    </Button>
                </DialogFooter>
            </DialogContent>
        </Dialog>
    );
}
