'use client';

import { Navbar } from '@/components/navbar';
import { RouteProgressBar } from '@/components/route-progress-bar';

type AppShellProps = {
    children: React.ReactNode;
};

export function AppShell({ children }: AppShellProps) {
    return (
        <div className="relative isolate min-h-screen">
            <div className="relative z-10">
                <RouteProgressBar />
                <Navbar />
                <div className="min-h-screen pt-[4.25rem]">
                    {children}
                </div>
            </div>
        </div>
    );
}
