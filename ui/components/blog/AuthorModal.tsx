'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import Image from 'next/image';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Skeleton } from '@/components/ui/skeleton';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { VisuallyHidden } from '@/components/ui/visually-hidden';
import { User, BookOpen, AlertCircle } from 'lucide-react';
import { profileService, ProfileInfo } from '@/lib/api/profile.service';

interface AuthorModalProps {
    isOpen: boolean;
    onClose: () => void;
    userId: string;
    username: string;
}

export function AuthorModal({ isOpen, onClose, userId, username }: AuthorModalProps) {
    const router = useRouter();
    const [profile, setProfile] = useState<ProfileInfo | null>(null);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);

    useEffect(() => {
        if (isOpen && userId) {
            loadProfile();
        }
    }, [isOpen, userId]);

    const loadProfile = async () => {
        try {
            setLoading(true);
            setError(null);
            const profile = await profileService.getPublicProfile(username);
            setProfile(profile);
        } catch (err) {
            setError('Failed to load author profile');
            console.error('Error loading profile:', err);
        } finally {
            setLoading(false);
        }
    };

    const handleMoreFromAuthor = () => {
        onClose();
        router.push(`/blog/page?author=${username}`);
    };

    const getInitials = (name: string) => {
        return name
            .split(' ')
            .map(n => n[0])
            .join('')
            .toUpperCase()
            .slice(0, 2);
    };

    const displayName = profile?.displayName || profile?.username || username;

    return (
        <Dialog open={isOpen} onOpenChange={onClose}>
            <DialogContent className="sm:max-w-[500px] p-0 overflow-hidden">
                {loading ? (
                    <div className="p-6 space-y-4">
                        <VisuallyHidden>
                            <DialogTitle>Loading author profile</DialogTitle>
                        </VisuallyHidden>
                        <Skeleton className="h-32 w-full" />
                        <div className="flex items-center gap-4">
                            <Skeleton className="h-20 w-20 rounded-full" />
                            <div className="space-y-2 flex-1">
                                <Skeleton className="h-6 w-3/4" />
                                <Skeleton className="h-4 w-1/2" />
                            </div>
                        </div>
                        <Skeleton className="h-20 w-full" />
                    </div>
                ) : error ? (
                    <div className="p-6 text-center">
                        <VisuallyHidden>
                            <DialogTitle>Error loading profile</DialogTitle>
                        </VisuallyHidden>
                        <div className="inline-flex items-center justify-center w-12 h-12 rounded-full bg-destructive/10 mb-3">
                            <AlertCircle className="h-6 w-6 text-destructive" />
                        </div>
                        <p className="text-sm text-muted-foreground">{error}</p>
                        <Button onClick={onClose} variant="outline" className="mt-4">
                            Close
                        </Button>
                    </div>
                ) : profile ? (
                    <>
                        {/* Cover Image */}
                        {profile.coverUrl ? (
                            <div className="relative h-32 w-full bg-gradient-to-br from-primary/20 to-primary/5">
                                <Image
                                    src={profile.coverUrl}
                                    alt="Cover"
                                    fill
                                    className="object-cover"
                                />
                            </div>
                        ) : (
                            <div className="h-32 w-full bg-gradient-to-br from-primary/20 to-primary/5" />
                        )}

                        <div className="p-6 -mt-10 relative">
                            {/* Avatar */}
                            <Avatar className="h-20 w-20 border-4 border-background mb-4">
                                <AvatarImage src={profile.avatarUrl || undefined} />
                                <AvatarFallback className="text-xl font-semibold">
                                    {getInitials(displayName)}
                                </AvatarFallback>
                            </Avatar>

                            {/* Profile Info */}
                            <DialogHeader className="mb-4">
                                <DialogTitle className="text-2xl flex items-center gap-2">
                                    {displayName}
                                    {profile.verifiedBadge && (
                                        <span className="text-primary">✓</span>
                                    )}
                                </DialogTitle>
                                <p className="text-sm text-muted-foreground">@{profile.username}</p>
                            </DialogHeader>

                            {/* Name */}
                            {(profile.firstName || profile.lastName) && (
                                <div className="mb-4">
                                    <p className="text-sm font-medium text-foreground">
                                        {[profile.firstName, profile.lastName].filter(Boolean).join(' ')}
                                    </p>
                                </div>
                            )}

                            {/* Bio */}
                            {profile.bio && (
                                <div className="mb-6">
                                    <p className="text-sm text-muted-foreground leading-relaxed">
                                        {profile.bio}
                                    </p>
                                </div>
                            )}

                            {/* More Button */}
                            <Button 
                                onClick={handleMoreFromAuthor}
                                className="w-full"
                            >
                                <BookOpen className="mr-2 h-4 w-4" />
                                More from this author
                            </Button>
                        </div>
                    </>
                ) : null}
            </DialogContent>
        </Dialog>
    );
}
