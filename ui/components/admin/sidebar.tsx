"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { cn } from "@/lib/utils";
import { LayoutDashboard, Image, Settings, Users, BookOpen, Mail, Music2, FileText, SlidersHorizontal, Send } from "lucide-react";
import { LogoMark } from "@/components/logo-mark";

const routes = [
    {
        label: "Dashboard",
        icon: LayoutDashboard,
        href: "/admin",
    },
    {
        label: "Gallery",
        icon: Image,
        href: "/admin/gallery",
    },
    {
        label: "Users",
        icon: Users,
        href: "/admin/users",
    },
    {
        label: "Blogs",
        icon: BookOpen,
        href: "/admin/blogs",
    },
    {
        label: "Content",
        icon: FileText,
        href: "/admin/content",
    },
    {
        label: "Messages",
        icon: Mail,
        href: "/admin/messages",
    },
    {
        label: "Music",
        icon: Music2,
        href: "/admin/music",
    },
    {
        label: "Properties",
        icon: SlidersHorizontal,
        href: "/admin/properties",
    },
    {
        label: "Email",
        icon: Send,
        href: "/admin/email",
    },
    {
        label: "Settings",
        icon: Settings,
        href: "/admin/settings",
    },
];

export function AdminSidebar() {
    const pathname = usePathname();

    return (
        <div className="flex h-full flex-col text-sidebar-foreground">
            <div className="border-b border-sidebar-border/70 px-4 py-5">
                <Link href="/admin" className="flex items-center gap-3 rounded-lg px-2 py-1.5 transition-colors hover:bg-sidebar-accent/70">
                    <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg border border-sidebar-border bg-background/80 text-sidebar-primary shadow-sm">
                        <LogoMark className="h-7 w-7" />
                    </span>
                    <span className="min-w-0">
                        <span className="block text-base font-semibold leading-5 text-sidebar-foreground">
                            JassSpace
                        </span>
                        <span className="block text-xs font-medium text-muted-foreground">
                            Admin
                        </span>
                    </span>
                </Link>
            </div>

            <div className="flex-1 overflow-y-auto px-3 py-5">
                <div className="space-y-1">
                    {routes.map((route) => {
                        const isActive = route.href === "/admin"
                            ? pathname === route.href
                            : pathname.startsWith(route.href);

                        return (
                            <Link
                                key={route.href}
                                href={route.href}
                                className={cn(
                                    "group relative flex w-full cursor-pointer justify-start rounded-lg px-3 py-2.5 text-sm font-medium transition-colors hover:bg-sidebar-accent hover:text-sidebar-accent-foreground",
                                    isActive
                                        ? "bg-sidebar-accent text-sidebar-accent-foreground shadow-sm"
                                        : "text-muted-foreground"
                                )}
                            >
                                {isActive ? (
                                    <span className="absolute inset-y-2 left-0 w-1 rounded-r-full bg-sidebar-primary" />
                                ) : null}
                                <div className="flex flex-1 items-center pl-1">
                                    <route.icon
                                        className={cn(
                                            "mr-3 h-5 w-5 transition-colors",
                                            isActive
                                                ? "text-sidebar-primary"
                                                : "text-muted-foreground group-hover:text-sidebar-accent-foreground"
                                        )}
                                    />
                                    {route.label}
                                </div>
                            </Link>
                        );
                    })}
                </div>
            </div>

            <div className="border-t border-sidebar-border/70 px-5 py-4">
                <div className="h-1.5 rounded-full bg-sidebar-accent">
                    <div className="h-full w-2/3 rounded-full bg-sidebar-primary" />
                </div>
            </div>
        </div>
    );
}
