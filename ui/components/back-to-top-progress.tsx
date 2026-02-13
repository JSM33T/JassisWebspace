"use client";

import { useEffect, useState } from "react";
import { ChevronUp } from "lucide-react";
import { cn } from "@/lib/utils";

function getScrollProgress() {
    const scrollTop = window.scrollY || document.documentElement.scrollTop;
    const scrollableHeight = document.documentElement.scrollHeight - document.documentElement.clientHeight;

    if (scrollableHeight <= 0) return 0;

    return Math.min(Math.max(scrollTop / scrollableHeight, 0), 1);
}

export function BackToTopProgress() {
    const [progress, setProgress] = useState(0);
    const [showPercentage, setShowPercentage] = useState(false);
    const [isVisible, setIsVisible] = useState(false);
    const percentage = Math.round(progress * 100);

    useEffect(() => {
        let scrollEndTimeout: ReturnType<typeof setTimeout> | null = null;
        let hideTimeout: ReturnType<typeof setTimeout> | null = null;
        let burstResetTimeout: ReturnType<typeof setTimeout> | null = null;
        let lastScrollY = window.scrollY || document.documentElement.scrollTop;
        let burstCount = 0;

        const updateProgress = () => {
            const currentScrollY = window.scrollY || document.documentElement.scrollTop;
            setProgress(getScrollProgress());
            setIsVisible(currentScrollY > 0 && currentScrollY >= lastScrollY);
            lastScrollY = currentScrollY;
            burstCount += 1;

            if (burstResetTimeout) {
                clearTimeout(burstResetTimeout);
            }
            burstResetTimeout = setTimeout(() => {
                burstCount = 0;
            }, 220);

            // Show percentage only when the user keeps scrolling (not a single wheel/touch hit).
            setShowPercentage(burstCount >= 2);

            if (scrollEndTimeout) {
                clearTimeout(scrollEndTimeout);
            }
            if (hideTimeout) {
                clearTimeout(hideTimeout);
            }

            scrollEndTimeout = setTimeout(() => {
                setShowPercentage(false);
            }, 150);
            hideTimeout = setTimeout(() => {
                setIsVisible(false);
            }, 3000);
        };

        updateProgress();
        window.addEventListener("scroll", updateProgress, { passive: true });
        window.addEventListener("resize", updateProgress);

        return () => {
            window.removeEventListener("scroll", updateProgress);
            window.removeEventListener("resize", updateProgress);
            if (scrollEndTimeout) {
                clearTimeout(scrollEndTimeout);
            }
            if (hideTimeout) {
                clearTimeout(hideTimeout);
            }
            if (burstResetTimeout) {
                clearTimeout(burstResetTimeout);
            }
        };
    }, []);

    return (
        <button
            type="button"
            aria-label={`Back to top (${percentage}% scrolled)`}
            title={`${percentage}% scrolled`}
            onClick={() => window.scrollTo({ top: 0, behavior: "smooth" })}
            className={cn(
                "fixed bottom-8 right-6 z-[120] inline-flex h-14 w-14 items-center justify-center rounded-full border border-border p-[3px] shadow-xl transition-all duration-300",
                "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary focus-visible:ring-offset-2",
                isVisible ? "translate-y-0 opacity-100" : "pointer-events-none translate-y-2 opacity-0"
            )}
            style={{
                background: `conic-gradient(hsl(var(--primary)) ${progress * 360}deg, hsl(var(--border)) 0deg)`,
            }}
        >
            <span className="inline-flex h-full w-full items-center justify-center rounded-full bg-primary text-primary-foreground">
                {showPercentage ? (
                    <span className="text-[11px] font-semibold leading-none">{percentage}%</span>
                ) : (
                    <ChevronUp className="h-6 w-6" />
                )}
            </span>
        </button>
    );
}
