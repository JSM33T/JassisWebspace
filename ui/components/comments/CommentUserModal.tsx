'use client';

import { useEffect, useMemo, useState } from 'react';
import Link from 'next/link';
import { Dialog, DialogContent, DialogTitle } from '@/components/ui/dialog';
import { VisuallyHidden } from '@/components/ui/visually-hidden';
import { Skeleton } from '@/components/ui/skeleton';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Button } from '@/components/ui/button';
import { UserRound } from 'lucide-react';
import { profileService, ProfileInfo } from '@/lib/api/profile.service';

interface CommentUserModalProps {
    isOpen: boolean;
    onClose: () => void;
    username: string | null;
    userId?: string | null;
    fallbackAvatarUrl?: string;
    fallbackDisplayName?: string;
}

export function CommentUserModal({
    isOpen,
    onClose,
    username,
    fallbackAvatarUrl,
    fallbackDisplayName
}: CommentUserModalProps) {
    const [profile, setProfile] = useState<ProfileInfo | null>(null);
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState<string | null>(null);

    useEffect(() => {
        const loadProfile = async () => {
            if (!isOpen || !username) {
                return;
            }

            try {
                setLoading(true);
                setError(null);
                const data = await profileService.getPublicProfile(username);
                setProfile(data);
            } catch (loadError) {
                console.error('Failed to load comment user profile', loadError);
                setError('Failed to load profile details.');
                setProfile(null);
            } finally {
                setLoading(false);
            }
        };

        loadProfile();
    }, [isOpen, username]);

    const fullName = useMemo(() => {
        const first = profile?.firstName?.trim();
        const last = profile?.lastName?.trim();
        return [first, last].filter(Boolean).join(' ');
    }, [profile?.firstName, profile?.lastName]);

    const resolvedUsername = profile?.username || username || '';
    const bio = profile?.bio?.trim() || '-';
    const avatarUrl = profile?.avatarUrl || fallbackAvatarUrl || undefined;
    const coverUrl = profile?.coverUrl || null;
    const initialsSource = fullName || fallbackDisplayName || resolvedUsername || 'U';
    const initials = initialsSource
        .split(' ')
        .map(part => part[0])
        .join('')
        .slice(0, 2)
        .toUpperCase();

    return (
        <Dialog open={isOpen} onOpenChange={onClose}>
            <DialogContent className="sm:max-w-[520px] p-0 overflow-hidden">
                <VisuallyHidden>
                    <DialogTitle>User profile</DialogTitle>
                </VisuallyHidden>

                {loading ? (
                    <div className="p-6 space-y-4">
                        <Skeleton className="h-36 w-full" />
                        <div className="flex items-center gap-4 -mt-12">
                            <Skeleton className="h-20 w-20 rounded-full" />
                            <div className="space-y-2 flex-1">
                                <Skeleton className="h-5 w-2/3" />
                                <Skeleton className="h-4 w-1/2" />
                            </div>
                        </div>
                        <Skeleton className="h-16 w-full" />
                    </div>
                ) : error ? (
                    <div className="p-6 text-sm text-muted-foreground">
                        {error}
                    </div>
                ) : (
                    <>
                        <div className="relative h-36 w-full bg-gradient-to-br from-primary/20 to-primary/5">
                            {coverUrl && (
                                // eslint-disable-next-line @next/next/no-img-element
                                <img
                                    src={coverUrl}
                                    alt={`${resolvedUsername} cover`}
                                    className="absolute inset-0 h-full w-full object-cover"
                                    loading="lazy"
                                />
                            )}
                        </div>

                        <div className="p-6 -mt-10">
                            <Avatar className="h-20 w-20 border-4 border-background mb-4">
                                <AvatarImage src={avatarUrl} alt={resolvedUsername} />
                                <AvatarFallback className="text-lg font-semibold">{initials}</AvatarFallback>
                            </Avatar>

                            <div className="space-y-1">
                                <p className="text-lg font-semibold">{fullName || 'Name not provided'}</p>
                                <p className="text-sm text-muted-foreground">@{resolvedUsername}</p>
                            </div>

                            <div className="mt-4">
                                <p className="text-sm leading-relaxed text-foreground/90 whitespace-pre-wrap">{bio}</p>
                            </div>

                            {resolvedUsername ? (
                                <Button asChild variant="outline" className="mt-6 w-full" onClick={onClose}>
                                    <Link href={`/user/${encodeURIComponent(resolvedUsername)}`}>
                                        <UserRound className="mr-2 h-4 w-4" />
                                        View profile
                                    </Link>
                                </Button>
                            ) : null}
                        </div>
                    </>
                )}
            </DialogContent>
        </Dialog>
    );
}
