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

    useEffect(() => {
        setLikeCount(initialCount);
        setIsLiked(initialLiked);
    }, [contentId, initialCount, initialLiked]);

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
            className={cn(
                "flex items-center gap-2 transition-colors",
                isLiked ? "text-red-500 hover:text-red-600" : "text-muted-foreground hover:text-primary"
            )}
        >
            <Heart className={cn("h-5 w-5", isLiked && "fill-current")} />
            <span>{likeCount}</span>
        </Button>
    );
}
