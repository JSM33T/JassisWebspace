'use client';

import { useEffect, useState } from 'react';
import { Navbar } from '@/components/navbar';
import { CursorMeshBackground } from '@/components/cursor-mesh-background';
import { RouteProgressBar } from '@/components/route-progress-bar';
import { cn } from '@/lib/utils';
import { NAVBAR_EXPANDED_EVENT, NAVBAR_EXPANDED_STORAGE_KEY } from '@/lib/navbar-layout';

type AppShellProps = {
    children: React.ReactNode;
};

export function AppShell({ children }: AppShellProps) {
    const [isRailExpanded, setIsRailExpanded] = useState(false);

    useEffect(() => {
        const syncExpandedState = () => {
            setIsRailExpanded(window.localStorage.getItem(NAVBAR_EXPANDED_STORAGE_KEY) === 'true');
        };

        const handleExpandedStateChange = (event: Event) => {
            const detail = (event as CustomEvent<boolean>).detail;
            if (typeof detail === 'boolean') {
                setIsRailExpanded(detail);
                return;
            }

            syncExpandedState();
        };

        syncExpandedState();
        window.addEventListener(NAVBAR_EXPANDED_EVENT, handleExpandedStateChange as EventListener);
        window.addEventListener('storage', syncExpandedState);

        return () => {
            window.removeEventListener(NAVBAR_EXPANDED_EVENT, handleExpandedStateChange as EventListener);
            window.removeEventListener('storage', syncExpandedState);
        };
    }, []);

    return (
        <div className="relative isolate min-h-screen">
            <CursorMeshBackground />
            <div className="relative z-10">
                <RouteProgressBar />
                <Navbar />
                <div
                    className={cn(
                        'min-h-screen pb-24 transition-[padding] duration-200 lg:pb-0',
                        isRailExpanded ? 'lg:pl-72 lg:pr-4' : 'lg:pl-28'
                    )}
                >
                    {children}
                </div>
            </div>
        </div>
    );
}
