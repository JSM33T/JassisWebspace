'use client';

import { useEffect } from 'react';
import { viewService } from '@/lib/api/view.service';

const VIEW_COOLDOWN_MS = 5 * 60 * 1000;
const STORAGE_KEY_PREFIX = 'jassspace:content-view:';

interface ContentViewTrackerProps {
    contentId: string;
    disabled?: boolean;
    onViewCountChange?: (viewCount: number) => void;
}

export function ContentViewTracker({ contentId, disabled = false, onViewCountChange }: ContentViewTrackerProps) {
    useEffect(() => {
        if (disabled || !contentId || typeof window === 'undefined') {
            return;
        }

        const key = `${STORAGE_KEY_PREFIX}${contentId}`;
        const previousValue = window.localStorage.getItem(key);
        const previousTime = previousValue ? Date.parse(previousValue) : Number.NaN;
        const now = Date.now();

        if (!Number.isNaN(previousTime) && now - previousTime < VIEW_COOLDOWN_MS) {
            return;
        }

        const optimisticValue = new Date(now).toISOString();
        window.localStorage.setItem(key, optimisticValue);

        let cancelled = false;

        void (async () => {
            try {
                const result = await viewService.recordView(contentId);
                if (!cancelled) {
                    onViewCountChange?.(result.viewCount);
                }
            } catch (error) {
                if (previousValue) {
                    window.localStorage.setItem(key, previousValue);
                } else {
                    window.localStorage.removeItem(key);
                }

                if (!cancelled) {
                    console.error('Failed to record content view', error);
                }
            }
        })();

        return () => {
            cancelled = true;
        };
    }, [contentId, disabled, onViewCountChange]);

    return null;
}
