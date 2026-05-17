
'use client';

import { useEffect, useMemo, useState, useCallback } from 'react';
import { useUser } from '@/contexts/UserContext';
import { commentService } from '@/lib/api/comment.service';
import { CommentResponse, CommentNode } from '@/lib/api/comment.types';
import { CommentForm } from './CommentForm';
import { CommentItem } from './CommentItem';
import { CommentUserModal } from './CommentUserModal';
import { Skeleton } from '@/components/ui/skeleton';
import {
    AlertDialog,
    AlertDialogAction,
    AlertDialogCancel,
    AlertDialogContent,
    AlertDialogDescription,
    AlertDialogFooter,
    AlertDialogHeader,
    AlertDialogMedia,
    AlertDialogTitle,
} from '@/components/ui/alert-dialog';
import { MessageSquare, Trash2 } from 'lucide-react';
import { toast } from 'sonner';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { buildAuthRequiredLoginHref } from '@/lib/auth-redirect';

interface CommentSectionProps {
    contentId: string;
}

function getAllDescendantIds(commentId: string, allComments: CommentResponse[]): string[] {
    const ids: string[] = [commentId];
    const children = allComments.filter(c => c.parentCommentId === commentId);

    children.forEach(child => {
        ids.push(...getAllDescendantIds(child.id, allComments));
    });

    return ids;
}

export function CommentSection({ contentId }: CommentSectionProps) {
    const { user, isAuthenticated } = useUser();
    const pathname = usePathname();
    const [comments, setComments] = useState<CommentResponse[]>([]);
    const [loading, setLoading] = useState(true);
    const [isDeleting, setIsDeleting] = useState(false);
    const [pendingDeleteId, setPendingDeleteId] = useState<string | null>(null);
    const [selectedUser, setSelectedUser] = useState<{
        userId: string;
        username: string;
        avatarUrl?: string;
        displayName?: string;
    } | null>(null);

    const ensureAuthenticated = () => {
        if (!isAuthenticated || !user?.login) {
            toast.error(
                <span>
                    <Link href={buildAuthRequiredLoginHref(pathname)} className="underline font-medium">Login</Link>
                    {' '}first to like or comment
                </span>
            );
            return false;
        }

        return true;
    };

    const loadComments = useCallback(async () => {
        try {
            setLoading(true);
            const data = await commentService.getComments(contentId);
            setComments(data);
        } catch (error) {
            console.error('Failed to load comments', error);
            // toast.error('Failed to load comments'); // Optional: don't annoy if just fetch failed quietly
        } finally {
            setLoading(false);
        }
    }, [contentId]);

    useEffect(() => {
        loadComments();
    }, [loadComments]);

    const commentTree = useMemo(() => {
        const map = new Map<string, CommentNode>();
        const roots: CommentNode[] = [];

        // 1. Initialize map
        comments.forEach(c => {
            map.set(c.id, { ...c, children: [] });
        });

        // 2. Build tree
        // Sort by createdAt to ensure order
        const sortedComments = [...comments].sort((a, b) =>
            new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime()
        );

        sortedComments.forEach(c => {
            const node = map.get(c.id)!;
            if (c.parentCommentId && map.has(c.parentCommentId)) {
                map.get(c.parentCommentId)!.children.push(node);
            } else {
                roots.push(node);
            }
        });

        // 3. Sort roots by newest first (descending)
        return roots.sort((a, b) =>
            new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()
        );
    }, [comments]);

    const handleCreateComment = async (text: string) => {
        if (!ensureAuthenticated()) {
            throw new Error('Authentication required to comment');
        }

        try {
            const newComment = await commentService.createComment({
                contentId,
                text
            });
            setComments(prev => [...prev, newComment]);
            toast.success('Comment posted successfully');
        } catch (error) {
            console.error('Failed to post comment', error);
            toast.error('Failed to post comment');
            throw error;
        }
    };

    const handleReply = async (parentId: string, text: string) => {
        if (!ensureAuthenticated()) {
            throw new Error('Authentication required to reply');
        }

        try {
            const newComment = await commentService.createComment({
                contentId,
                parentCommentId: parentId,
                text
            });
            setComments(prev => [...prev, newComment]);
            toast.success('Reply posted successfully');
        } catch (error) {
            console.error('Failed to post reply', error);
            toast.error('Failed to post reply');
            throw error;
        }
    };

    const handleEdit = async (id: string, text: string) => {
        if (!ensureAuthenticated()) {
            throw new Error('Authentication required to edit');
        }

        try {
            const updatedComment = await commentService.updateComment(id, { text });
            setComments(prev => prev.map(c => c.id === id ? updatedComment : c));
            toast.success('Comment updated successfully');
        } catch (error) {
            console.error('Failed to update comment', error);
            toast.error('Failed to update comment');
            throw error;
        }
    };

    const handleDelete = async (id: string) => {
        if (!ensureAuthenticated()) {
            throw new Error('Authentication required to delete');
        }

        setPendingDeleteId(id);
    };

    const confirmDelete = async () => {
        if (!pendingDeleteId) {
            return;
        }

        try {
            setIsDeleting(true);
            await commentService.deleteComment(pendingDeleteId);

            // Get all descendant IDs (including the parent)
            const idsToRemove = getAllDescendantIds(pendingDeleteId, comments);

            // Remove the comment and all its descendants
            setComments(prev => prev.filter(c => !idsToRemove.includes(c.id)));
            setPendingDeleteId(null);

            toast.success('Comment deleted successfully');
        } catch (error) {
            console.error('Failed to delete comment', error);
            toast.error('Failed to delete comment');
            throw error;
        } finally {
            setIsDeleting(false);
        }
    };

    const pendingDeleteComment = useMemo(
        () => comments.find(comment => comment.id === pendingDeleteId) ?? null,
        [comments, pendingDeleteId]
    );

    const pendingDeleteReplyCount = useMemo(() => {
        if (!pendingDeleteId) {
            return 0;
        }

        return Math.max(getAllDescendantIds(pendingDeleteId, comments).length - 1, 0);
    }, [comments, pendingDeleteId]);

    const handleOpenUserProfile = (
        userId: string,
        username: string,
        avatarUrl?: string,
        displayName?: string
    ) => {
        setSelectedUser({ userId, username, avatarUrl, displayName });
    };

    if (loading) {
        return (
            <div className="space-y-4 mt-8">
                <Skeleton className="h-24 w-full" />
                <Skeleton className="h-24 w-full" />
            </div>
        );
    }

    return (
        <section className="mt-12 pt-8 border-t">
            <h2 className="text-2xl font-bold mb-6 flex items-center gap-2">
                <MessageSquare className="h-6 w-6" />
                Comments ({comments.length})
            </h2>

            {isAuthenticated ? (
                <div className="mb-8">
                    <CommentForm onSubmit={handleCreateComment} />
                </div>
            ) : (
                <div className="mb-8 p-4 bg-muted rounded-lg text-center text-muted-foreground">
                    Please log in to leave a comment.
                </div>
            )}

            <div className="space-y-8">
                {commentTree.length > 0 ? (
                    commentTree.map(node => (
                        <CommentItem
                            key={node.id}
                            comment={node}
                            onReply={handleReply}
                            onEdit={handleEdit}
                            onDelete={handleDelete}
                            onOpenUserProfile={handleOpenUserProfile}
                        />
                    ))
                ) : (
                    <p className="text-muted-foreground text-center py-8">
                        No comments yet. Be the first to share your thoughts!
                    </p>
                )}
            </div>

            <CommentUserModal
                isOpen={Boolean(selectedUser)}
                onClose={() => setSelectedUser(null)}
                userId={selectedUser?.userId ?? null}
                username={selectedUser?.username ?? null}
                fallbackAvatarUrl={selectedUser?.avatarUrl}
                fallbackDisplayName={selectedUser?.displayName}
            />

            <AlertDialog
                open={Boolean(pendingDeleteId)}
                onOpenChange={(open) => {
                    if (!open && !isDeleting) {
                        setPendingDeleteId(null);
                    }
                }}
            >
                <AlertDialogContent size="sm">
                    <AlertDialogHeader>
                        <AlertDialogMedia className="bg-destructive/10 text-destructive">
                            <Trash2 className="h-7 w-7" />
                        </AlertDialogMedia>
                        <AlertDialogTitle>Delete this comment?</AlertDialogTitle>
                        <AlertDialogDescription>
                            {pendingDeleteReplyCount > 0
                                ? `This will permanently remove this comment and ${pendingDeleteReplyCount} ${pendingDeleteReplyCount === 1 ? 'reply' : 'replies'}.`
                                : 'This will permanently remove this comment.'}
                            {pendingDeleteComment?.text
                                ? ` "${pendingDeleteComment.text.slice(0, 120)}${pendingDeleteComment.text.length > 120 ? '...' : ''}"`
                                : ''}
                        </AlertDialogDescription>
                    </AlertDialogHeader>
                    <AlertDialogFooter>
                        <AlertDialogCancel disabled={isDeleting}>Cancel</AlertDialogCancel>
                        <AlertDialogAction
                            variant="destructive"
                            disabled={isDeleting}
                            onClick={(event) => {
                                event.preventDefault();
                                void confirmDelete();
                            }}
                        >
                            {isDeleting ? 'Deleting...' : 'Delete comment'}
                        </AlertDialogAction>
                    </AlertDialogFooter>
                </AlertDialogContent>
            </AlertDialog>
        </section>
    );
}
