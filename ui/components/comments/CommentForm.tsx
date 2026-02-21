
'use client';

import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { Loader2, Send } from 'lucide-react';

interface CommentFormProps {
    onSubmit: (text: string) => Promise<void>;
    isReply?: boolean;
    onCancel?: () => void;
    placeholder?: string;
}

export function CommentForm({
    onSubmit,
    isReply = false,
    onCancel,
    placeholder = "Write a comment..."
}: CommentFormProps) {
    const [text, setText] = useState('');
    const [isSubmitting, setIsSubmitting] = useState(false);

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!text.trim()) return;

        setIsSubmitting(true);
        try {
            await onSubmit(text);
            setText('');
            if (onCancel) onCancel();
        } catch {
            // Error toasts are handled by the parent callbacks.
        } finally {
            setIsSubmitting(false);
        }
    };

    return (
        <form onSubmit={handleSubmit} className="space-y-4">
            <Textarea
                placeholder={placeholder}
                value={text}
                onChange={(e) => setText(e.target.value)}
                className="min-h-[100px]"
                disabled={isSubmitting}
            />
            <div className="flex justify-end gap-2">
                {onCancel && (
                    <Button
                        type="button"
                        variant="ghost"
                        onClick={onCancel}
                        disabled={isSubmitting}
                    >
                        Cancel
                    </Button>
                )}
                <Button type="submit" disabled={isSubmitting || !text.trim()}>
                    {isSubmitting ? (
                        <>
                            <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                            {isReply ? 'Replying...' : 'Posting...'}
                        </>
                    ) : (
                        <>
                            <Send className="mr-2 h-4 w-4" />
                            {isReply ? 'Reply' : 'Post Comment'}
                        </>
                    )}
                </Button>
            </div>
        </form>
    );
}
