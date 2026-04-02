"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { cn } from "@/lib/utils";
import { LayoutDashboard, Image, Settings, Users, BookOpen, Mail, Music2, FileText, SlidersHorizontal } from "lucide-react";

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
        label: "Settings",
        icon: Settings,
        href: "/admin/settings",
    },
];

export function AdminSidebar() {
    const pathname = usePathname();

    return (
        <div className="flex h-full flex-col space-y-4 py-4 text-sidebar-foreground">
            <div className="flex-1 px-3 py-2">
                <Link href="/admin" className="mb-14 flex items-center pl-3">
                    <h1 className="text-2xl font-bold text-foreground">
                        JassSpace Admin
                    </h1>
                </Link>
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
                                    "group flex w-full cursor-pointer justify-start rounded-lg px-3 py-2.5 text-sm font-medium transition-colors hover:bg-accent hover:text-accent-foreground",
                                    isActive
                                        ? "bg-accent text-accent-foreground"
                                        : "text-muted-foreground"
                                )}
                            >
                                <div className="flex flex-1 items-center">
                                    <route.icon
                                        className={cn(
                                            "mr-3 h-5 w-5 transition-colors",
                                            isActive
                                                ? "text-accent-foreground"
                                                : "text-accent group-hover:text-accent-foreground"
                                        )}
                                    />
                                    {route.label}
                                </div>
                            </Link>
                        );
                    })}
                </div>
            </div>
        </div>
    );
}
