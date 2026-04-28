'use client';

import { usePathname } from 'next/navigation';
import { Navbar } from '@/components/navbar';
import { Footer } from '@/components/footer';
import { RouteProgressBar } from '@/components/route-progress-bar';

type AppShellProps = {
    children: React.ReactNode;
};

export function AppShell({ children }: AppShellProps) {
    const pathname = usePathname();
    const isAdmin = pathname.startsWith('/admin');

    return (
        <div className="relative isolate min-h-screen flex flex-col">
            <div className="relative z-10 flex flex-col flex-1">
                <RouteProgressBar />
                <Navbar />
                <div className="flex-1 pt-[4.25rem]">
                    {children}
                </div>
                {!isAdmin && <Footer />}
            </div>
        </div>
    );
}
