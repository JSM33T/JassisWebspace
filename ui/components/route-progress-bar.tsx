"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { usePathname, useSearchParams } from "next/navigation";
import { cn } from "@/lib/utils";

const START_PROGRESS = 8;
const MAX_PROGRESS = 92;

function buildRouteKey(pathname: string, searchParams: { toString: () => string }) {
    const query = searchParams.toString();
    return query ? `${pathname}?${query}` : pathname;
}

function isRouteDifferent(nextUrl: URL, currentUrl: URL) {
    return nextUrl.pathname !== currentUrl.pathname || nextUrl.search !== currentUrl.search;
}

export function RouteProgressBar() {
    const pathname = usePathname();
    const searchParams = useSearchParams();
    const routeKey = buildRouteKey(pathname, searchParams);

    const [progress, setProgress] = useState(0);
    const [visible, setVisible] = useState(false);

    const routeRef = useRef(routeKey);
    const navigatingRef = useRef(false);
    const intervalRef = useRef<ReturnType<typeof setInterval> | null>(null);
    const startDelayRef = useRef<ReturnType<typeof setTimeout> | null>(null);
    const hideRef = useRef<ReturnType<typeof setTimeout> | null>(null);
    const safetyRef = useRef<ReturnType<typeof setTimeout> | null>(null);

    const clearIntervalTimer = useCallback(() => {
        if (intervalRef.current) {
            clearInterval(intervalRef.current);
            intervalRef.current = null;
        }
    }, []);

    const clearPendingTimers = useCallback(() => {
        if (startDelayRef.current) {
            clearTimeout(startDelayRef.current);
            startDelayRef.current = null;
        }
        if (hideRef.current) {
            clearTimeout(hideRef.current);
            hideRef.current = null;
        }
        if (safetyRef.current) {
            clearTimeout(safetyRef.current);
            safetyRef.current = null;
        }
    }, []);

    const completeNavigation = useCallback(() => {
        if (startDelayRef.current && !navigatingRef.current) {
            clearTimeout(startDelayRef.current);
            startDelayRef.current = null;
            return;
        }

        clearIntervalTimer();
        clearPendingTimers();

        navigatingRef.current = false;
        setVisible(true);
        setProgress(100);

        hideRef.current = setTimeout(() => {
            setVisible(false);
            setProgress(0);
            hideRef.current = null;
        }, 220);
    }, [clearIntervalTimer, clearPendingTimers]);

    const startNavigation = useCallback(() => {
        if (navigatingRef.current || startDelayRef.current) {
            return;
        }

        clearIntervalTimer();
        clearPendingTimers();

        startDelayRef.current = setTimeout(() => {
            startDelayRef.current = null;
            navigatingRef.current = true;
            setVisible(true);
            setProgress((prev) => (prev >= START_PROGRESS ? prev : START_PROGRESS));

            intervalRef.current = setInterval(() => {
                setProgress((prev) => {
                    if (prev >= MAX_PROGRESS) {
                        return prev;
                    }
                    if (prev < 30) {
                        return Math.min(MAX_PROGRESS, prev + 10);
                    }
                    if (prev < 60) {
                        return Math.min(MAX_PROGRESS, prev + 5);
                    }
                    return Math.min(MAX_PROGRESS, prev + 2);
                });
            }, 140);

            // Failsafe to avoid a stuck bar if a navigation never resolves.
            safetyRef.current = setTimeout(() => {
                completeNavigation();
            }, 10000);
        }, 80);
    }, [clearIntervalTimer, clearPendingTimers, completeNavigation]);

    useEffect(() => {
        if (routeRef.current !== routeKey) {
            routeRef.current = routeKey;
            const completionTimer = setTimeout(() => {
                completeNavigation();
            }, 0);
            return () => {
                clearTimeout(completionTimer);
            };
        }
        return undefined;
    }, [routeKey, completeNavigation]);

    useEffect(() => {
        const handleDocumentClick = (event: MouseEvent) => {
            if (event.defaultPrevented || event.button !== 0) {
                return;
            }
            if (event.metaKey || event.ctrlKey || event.shiftKey || event.altKey) {
                return;
            }

            const target = event.target as HTMLElement | null;
            const anchor = target?.closest("a[href]") as HTMLAnchorElement | null;
            if (!anchor) {
                return;
            }
            if (anchor.target && anchor.target !== "_self") {
                return;
            }
            if (anchor.hasAttribute("download")) {
                return;
            }

            const rawHref = anchor.getAttribute("href");
            if (!rawHref || rawHref.startsWith("#") || rawHref.startsWith("mailto:") || rawHref.startsWith("tel:")) {
                return;
            }

            const currentUrl = new URL(window.location.href);
            const nextUrl = new URL(anchor.href, currentUrl.href);
            if (nextUrl.origin !== currentUrl.origin) {
                return;
            }
            if (!isRouteDifferent(nextUrl, currentUrl)) {
                return;
            }

            startNavigation();
        };

        const shouldStartForHistoryUrl = (url: string | URL | null | undefined) => {
            if (!url) {
                return false;
            }
            const currentUrl = new URL(window.location.href);
            const nextUrl = new URL(String(url), currentUrl.href);
            return isRouteDifferent(nextUrl, currentUrl);
        };

        const originalPushState = window.history.pushState.bind(window.history);
        const originalReplaceState = window.history.replaceState.bind(window.history);

        const wrappedPushState: History["pushState"] = (...args) => {
            if (shouldStartForHistoryUrl(args[2])) {
                startNavigation();
            }
            return originalPushState(...args);
        };

        const wrappedReplaceState: History["replaceState"] = (...args) => {
            if (shouldStartForHistoryUrl(args[2])) {
                startNavigation();
            }
            return originalReplaceState(...args);
        };

        window.history.pushState = wrappedPushState;
        window.history.replaceState = wrappedReplaceState;

        const handlePopState = () => startNavigation();

        document.addEventListener("click", handleDocumentClick, true);
        window.addEventListener("popstate", handlePopState);

        return () => {
            document.removeEventListener("click", handleDocumentClick, true);
            window.removeEventListener("popstate", handlePopState);
            window.history.pushState = originalPushState;
            window.history.replaceState = originalReplaceState;
            clearIntervalTimer();
            clearPendingTimers();
        };
    }, [startNavigation, clearIntervalTimer, clearPendingTimers]);

    return (
        <div
            aria-hidden
            className={cn(
                "pointer-events-none fixed left-0 top-0 z-[220] h-[3px] bg-primary transition-[width,opacity] duration-200 ease-out",
                "shadow-[0_0_18px_hsl(var(--primary)/0.55)]",
                visible ? "opacity-100" : "opacity-0"
            )}
            style={{ width: `${progress}%` }}
        />
    );
}
