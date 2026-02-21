'use client';

import { useState } from 'react';
import { Heart } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { likeService } from '@/lib/api/like.service';
import { useUser } from '@/contexts/UserContext';
import { toast } from 'sonner';
import { cn } from '@/lib/utils';

interface LikeButtonProps {
    contentId: string;
    initialCount: number;
    initialLiked: boolean;
}

export function LikeButton({ contentId, initialCount, initialLiked }: LikeButtonProps) {
    const { user, isAuthenticated } = useUser();
    const [likeCount, setLikeCount] = useState(initialCount);
    const [isLiked, setIsLiked] = useState(initialLiked);
    const [isLoading, setIsLoading] = useState(false);

    const handleToggleLike = async () => {
        if (!isAuthenticated || !user?.login) {
            toast.error('Login first to like or comment');
            return;
        }

        if (isLoading) return;

        // Optimistic update
        const previousLiked = isLiked;
        const previousCount = likeCount;

        setIsLiked(!isLiked);
        setLikeCount(prev => isLiked ? prev - 1 : prev + 1);
        setIsLoading(true);

        try {
            const newLikedState = await likeService.toggleLike(contentId);
            // Verify server state matches optimistic
            if (newLikedState !== !previousLiked) {
                // Determine what happened? Actually endpoint returns bool which is "isLiked"
                // Our service returns that bool.
                setIsLiked(newLikedState);
                // If we drifted, we might be off by 1, but usually exact count sync needs refreshed. 
                // We'll trust our calc unless we implement refetch.
            }
        } catch (error) {
            console.error('Failed to toggle like', error);
            // Revert on error
            setIsLiked(previousLiked);
            setLikeCount(previousCount);
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
