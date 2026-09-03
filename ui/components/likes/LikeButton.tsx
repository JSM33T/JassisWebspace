'use client';

import { useEffect, useState } from 'react';
import { Heart } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { likeService } from '@/lib/api/like.service';
import { useUser } from '@/contexts/UserContext';
import { toast } from 'sonner';
import { cn } from '@/lib/utils';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { buildAuthRequiredLoginHref } from '@/lib/auth-redirect';
import { motion, useAnimation, useReducedMotion } from 'framer-motion';

interface LikeButtonProps {
    contentId: string;
    initialCount: number;
    initialLiked: boolean;
}

export function LikeButton({ contentId, initialCount, initialLiked }: LikeButtonProps) {
    const { user, isAuthenticated } = useUser();
    const pathname = usePathname();
    const [likeCount, setLikeCount] = useState(initialCount);
    const [isLiked, setIsLiked] = useState(initialLiked);
    const [isLoading, setIsLoading] = useState(false);
    const [syncedContentId, setSyncedContentId] = useState(contentId);
    const [likeBurstId, setLikeBurstId] = useState(0);
    const heartControls = useAnimation();
    const shouldReduceMotion = useReducedMotion();

    // Re-sync to the server-provided initial values when the content changes.
    if (contentId !== syncedContentId) {
        setSyncedContentId(contentId);
        setLikeCount(initialCount);
        setIsLiked(initialLiked);
    }

    useEffect(() => {
        let active = true;

        const syncLikeStatus = async () => {
            try {
                const status = await likeService.getLikeStatus(contentId);

                if (!active) {
                    return;
                }

                setLikeCount(status.likeCount);
                setIsLiked(status.isLiked);
            } catch (error) {
                if (active) {
                    console.error('Failed to sync like status', error);
                }
            }
        };

        syncLikeStatus();

        return () => {
            active = false;
        };
    }, [contentId, isAuthenticated]);

    const handleToggleLike = async () => {
        if (!isAuthenticated || !user?.login) {
            toast.error(
                <span>
                    <Link href={buildAuthRequiredLoginHref(pathname)} className="underline font-medium">Login</Link>
                    {' '}first to like or comment
                </span>
            );
            return;
        }

        if (isLoading) return;
        setIsLoading(true);

        try {
            const status = await likeService.toggleLike(contentId);
            setIsLiked(status.isLiked);
            setLikeCount(status.likeCount);

            if (status.isLiked && !shouldReduceMotion) {
                setLikeBurstId((current) => current + 1);
                void heartControls.start({
                    rotate: [0, -12, 9, 0],
                    scale: [1, 1.45, 0.9, 1.15, 1],
                    transition: {
                        duration: 0.5,
                        ease: 'easeOut',
                        times: [0, 0.3, 0.55, 0.78, 1],
                    },
                });
            }
        } catch (error) {
            console.error('Failed to toggle like', error);
            toast.error('Failed to update like status');
        } finally {
            setIsLoading(false);
        }
    };

    return (
        <Button
            variant="ghost"
            size="sm"
            onClick={handleToggleLike}
            disabled={isLoading}
            aria-pressed={isLiked}
            className={cn(
                "flex items-center gap-2 transition-colors",
                isLiked ? "text-red-500 hover:text-red-600" : "text-muted-foreground hover:text-primary"
            )}
        >
            <span className="relative flex h-5 w-5 items-center justify-center">
                {likeBurstId > 0 && (
                    <motion.span
                        key={likeBurstId}
                        aria-hidden="true"
                        className="pointer-events-none absolute inset-0 rounded-full border-2 border-red-400"
                        initial={{ opacity: 0.9, scale: 0.35 }}
                        animate={{ opacity: 0, scale: 2.15 }}
                        transition={{ duration: 0.45, ease: 'easeOut' }}
                    />
                )}
                <motion.span
                    aria-hidden="true"
                    className="relative z-10 inline-flex"
                    animate={heartControls}
                >
                    <Heart className={cn("h-5 w-5", isLiked && "fill-current")} />
                </motion.span>
            </span>
            <span>{likeCount}</span>
        </Button>
    );
}
