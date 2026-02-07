
'use client';

import { useState } from 'react';
import { CommentNode } from '@/lib/api/comment.types';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Button } from '@/components/ui/button';
import { MoreVertical, Reply, Trash2, Edit2 } from 'lucide-react';
import { useUser, userHelpers } from '@/contexts/UserContext';
import { CommentForm } from './CommentForm';
import {
    DropdownMenu,
    DropdownMenuContent,
    DropdownMenuItem,
    DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { cn } from '@/lib/utils'; // Assuming utils exists, otherwise I'll mock/check

interface CommentItemProps {
    comment: CommentNode;
    onReply: (parentId: string, text: string) => Promise<void>;
    onEdit: (id: string, text: string) => Promise<void>;
    onDelete: (id: string) => Promise<void>;
    depth?: number;
}

export function CommentItem({
    comment,
    onReply,
    onEdit,
    onDelete,
    depth = 0
}: CommentItemProps) {
    const { user } = useUser();
    const [isReplying, setIsReplying] = useState(false);
    const [isEditing, setIsEditing] = useState(false);

    // Limit nesting depth visual indentation to prevent squeezing
    const maxDepth = 3;
    const isThreaded = depth < maxDepth;

    const isAuthor = user?.id === comment.userId;
    const isAdmin = user?.role === 'admin' || user?.role === 'mod';
    const canModify = isAuthor || isAdmin; // Admin can delete/edit? Logic says admin delete usually.
    // Spec says strictly author for edit, admin/mod for delete. 
    // I'll stick to API logic: Author can Edit/Delete. Admin/Mod can Delete.

    const handleReply = async (text: string) => {
        await onReply(comment.id, text);
        setIsReplying(false);
    };

    const handleEdit = async (text: string) => {
        await onEdit(comment.id, text);
        setIsEditing(false);
    };

    return (
        <div className={cn("group", depth > 0 && "mt-4")}>
            <div className="flex gap-4">
                <Avatar className="h-8 w-8 md:h-10 md:w-10">
                    <AvatarImage src={comment.avatarUrl} alt={comment.username} />
                    <AvatarFallback>{comment.username[0]?.toUpperCase()}</AvatarFallback>
                </Avatar>

                <div className="flex-1 space-y-2">
                    <div className="flex items-center justify-between">
                        <div className="flex items-center gap-2">
                            <span className="font-semibold text-sm">
                                {comment.displayName || comment.username}
                            </span>
                            <span className="text-xs text-muted-foreground">
                                {new Date(comment.createdAt).toLocaleDateString()}
                            </span>
                        </div>

                        {(canModify || user) && (
                            <DropdownMenu>
                                <DropdownMenuTrigger asChild>
                                    <Button variant="ghost" size="icon" className="h-8 w-8 opacity-0 group-hover:opacity-100 transition-opacity">
                                        <MoreVertical className="h-4 w-4" />
                                        <span className="sr-only">More options</span>
                                    </Button>
                                </DropdownMenuTrigger>
                                <DropdownMenuContent align="end">
                                    {user && (
                                        <DropdownMenuItem onClick={() => setIsReplying(!isReplying)}>
                                            <Reply className="mr-2 h-4 w-4" />
                                            Reply
                                        </DropdownMenuItem>
                                    )}
                                    {isAuthor && (
                                        <DropdownMenuItem onClick={() => setIsEditing(!isEditing)}>
                                            <Edit2 className="mr-2 h-4 w-4" />
                                            Edit
                                        </DropdownMenuItem>
                                    )}
                                    {(isAuthor || isAdmin) && (
                                        <DropdownMenuItem
                                            className="text-destructive focus:text-destructive"
                                            onClick={() => onDelete(comment.id)}
                                        >
                                            <Trash2 className="mr-2 h-4 w-4" />
                                            Delete
                                        </DropdownMenuItem>
                                    )}
                                </DropdownMenuContent>
                            </DropdownMenu>
                        )}
                    </div>

                    {isEditing ? (
                        <div className="mt-2">
                            <CommentForm
                                onSubmit={handleEdit}
                                onCancel={() => setIsEditing(false)}
                                placeholder="Edit your comment..."
                            // Initial value handling would require CommentForm update or ref override. 
                            // For now, I'll update CommentForm to accept initial value or just text.
                            // Wait, CommentForm manages its own state. I should probably pass initial value.
                            />
                            {/* NOTE: I need to update CommentForm to accept initialValue. I'll do that next or assume user types it again for MVP? 
                                No, editing empty is bad. I'll patch CommentForm. */}
                        </div>
                    ) : (
                        <p className="text-sm text-foreground/90 leading-relaxed whitespace-pre-wrap">
                            {comment.text}
                        </p>
                    )}

                    {!isEditing && !isReplying && (
                        <div className="flex items-center gap-4">
                            <Button
                                variant="ghost"
                                size="sm"
                                className="h-auto p-0 text-muted-foreground hover:text-foreground text-xs"
                                onClick={() => setIsReplying(true)}
                            >
                                <Reply className="mr-2 h-3 w-3" />
                                Reply
                            </Button>
                        </div>
                    )}
                </div>
            </div>

            {isReplying && (
                <div className="ml-12 mt-4">
                    <CommentForm
                        onSubmit={handleReply}
                        isReply
                        onCancel={() => setIsReplying(false)}
                    />
                </div>
            )}

            {/* Nested Replies */}
            {comment.children && comment.children.length > 0 && (
                <div className={cn(
                    "mt-4 space-y-6",
                    isThreaded ? "ml-12 border-l-2 pl-4" : "ml-0"
                )}>
                    {comment.children.map(reply => (
                        <CommentItem
                            key={reply.id}
                            comment={reply}
                            onReply={onReply}
                            onEdit={onEdit}
                            onDelete={onDelete}
                            depth={depth + 1}
                        />
                    ))}
                </div>
            )}
        </div>
    );
}
