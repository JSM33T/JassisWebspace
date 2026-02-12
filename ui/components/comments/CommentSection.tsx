
'use client';

import { useEffect, useState, useMemo } from 'react';
import { useUser } from '@/contexts/UserContext';
import { commentService } from '@/lib/api/comment.service';
import { CommentResponse, CommentNode } from '@/lib/api/comment.types';
import { CommentForm } from './CommentForm';
import { CommentItem } from './CommentItem';
import { Skeleton } from '@/components/ui/skeleton';
import { MessageSquare } from 'lucide-react';
import { toast } from 'sonner';

interface CommentSectionProps {
    contentId: string;
}

export function CommentSection({ contentId }: CommentSectionProps) {
    const { user } = useUser();
    const [comments, setComments] = useState<CommentResponse[]>([]);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        loadComments();
    }, [contentId]);

    const loadComments = async () => {
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
    };

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

    // Helper function to recursively collect all descendant comment IDs
    const getAllDescendantIds = (commentId: string, allComments: CommentResponse[]): string[] => {
        const ids: string[] = [commentId];
        const children = allComments.filter(c => c.parentCommentId === commentId);

        children.forEach(child => {
            ids.push(...getAllDescendantIds(child.id, allComments));
        });

        return ids;
    };

    const handleDelete = async (id: string) => {
        try {
            await commentService.deleteComment(id);

            // Get all descendant IDs (including the parent)
            const idsToRemove = getAllDescendantIds(id, comments);

            // Remove the comment and all its descendants
            setComments(prev => prev.filter(c => !idsToRemove.includes(c.id)));

            toast.success('Comment deleted successfully');
        } catch (error) {
            console.error('Failed to delete comment', error);
            toast.error('Failed to delete comment');
            throw error;
        }
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

            {user ? (
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
                        />
                    ))
                ) : (
                    <p className="text-muted-foreground text-center py-8">
                        No comments yet. Be the first to share your thoughts!
                    </p>
                )}
            </div>
        </section>
    );
}
