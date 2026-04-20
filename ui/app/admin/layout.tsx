"use client";

import { useUser } from "@/contexts/UserContext";
import { usePathname, useRouter, useSearchParams } from "next/navigation";
import { useEffect } from "react";
import { AdminSidebar } from "@/components/admin/sidebar";
import { buildAuthRequiredLoginHref, persistLoginRedirectTarget } from "@/lib/auth-redirect";

export default function AdminLayout({
    children,
}: {
    children: React.ReactNode;
}) {
    const { user, isInitialized } = useUser();
    const router = useRouter();
    const pathname = usePathname();
    const searchParams = useSearchParams();

    const currentPathWithQuery = searchParams.toString()
        ? `${pathname}?${searchParams.toString()}`
        : pathname;

    useEffect(() => {
        if (!isInitialized) {
            return;
        }

        if (!user) {
            persistLoginRedirectTarget(currentPathWithQuery);
            router.replace(buildAuthRequiredLoginHref(currentPathWithQuery));
            return;
        }

        if (user.role !== "admin") {
            router.replace("/");
        }
    }, [currentPathWithQuery, isInitialized, router, user]);

    if (!isInitialized) {
        return null;
    }

    if (!user || user.role !== "admin") {
        return null;
    }

    return (
        <div className="relative min-h-screen lg:flex">
            <aside className="hidden h-screen w-72 shrink-0 border-r border-sidebar-border/80 bg-sidebar/95 shadow-[18px_0_45px_-38px_var(--foreground)] backdrop-blur-xl lg:sticky lg:top-0 lg:flex lg:flex-col">
                <AdminSidebar />
            </aside>
            <main className="min-w-0 flex-1 bg-background/55">
                {children}
            </main>
        </div>
    );
}
