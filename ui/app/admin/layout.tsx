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
        <div className="h-full relative">
            <div className="hidden h-full md:flex md:w-72 md:flex-col md:fixed md:inset-y-0 z-[80] bg-gray-900">
                <AdminSidebar />
            </div>
            <main className="md:pl-72">
                {children}
            </main>
        </div>
    );
}
