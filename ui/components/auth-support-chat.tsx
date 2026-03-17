'use client';

import { FormEvent, KeyboardEvent, useEffect, useRef, useState } from 'react';
import { Bot, MessageCircleMore, SendHorizontal, X } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { BACK_TO_TOP_VISIBILITY_EVENT } from '@/components/back-to-top-progress';
import botService, { type BotChatMessageRequest } from '@/lib/api/bot.service';
import { ApiError } from '@/lib/api';
import { cn } from '@/lib/utils';

type ChatRole = 'assistant' | 'user';

interface ChatMessage {
    id: string;
    role: ChatRole;
    content: string;
    includeInConversation: boolean;
}

interface PersistedChatState {
    version: 1;
    savedAt: number;
    unreadCount: number;
    messages: ChatMessage[];
}

const MAX_CONTEXT_MESSAGES = 10;
const AUTO_SCROLL_THRESHOLD = 48;
const CHAT_STORAGE_KEY = 'jassspace:auth-support-chat';
const CHAT_STORAGE_TTL_MS = 24 * 60 * 60 * 1000;

function createMessage(role: ChatRole, content: string, includeInConversation = true): ChatMessage {
    return {
        id: `${role}-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`,
        role,
        content,
        includeInConversation,
    };
}

function createInitialMessage() {
    return createMessage(
        'assistant',
        'Ask anything here. Replies stream from the backend bot endpoint.',
        false
    );
}

function toBotRequestMessages(messages: ChatMessage[]): BotChatMessageRequest[] {
    return messages
        .filter((message) => message.includeInConversation && message.content.trim().length > 0)
        .slice(-MAX_CONTEXT_MESSAGES)
        .map((message) => ({
            role: message.role,
            content: message.content,
        }));
}

function getErrorMessage(error: unknown): string {
    if (error instanceof ApiError) {
        return error.problemDetails.detail || error.problemDetails.title;
    }

    if (error instanceof Error) {
        return error.message;
    }

    return 'Failed to get a response from the bot.';
}

function sanitizePersistedMessages(value: unknown): ChatMessage[] {
    if (!Array.isArray(value)) {
        return [];
    }

    return value.flatMap((entry) => {
        if (!entry || typeof entry !== 'object') {
            return [];
        }

        const candidate = entry as Partial<ChatMessage>;
        const role = candidate.role === 'assistant' || candidate.role === 'user'
            ? candidate.role
            : null;
        const content = typeof candidate.content === 'string'
            ? candidate.content.trim()
            : '';

        if (!role || !content) {
            return [];
        }

        return [{
            id: typeof candidate.id === 'string' && candidate.id.trim().length > 0
                ? candidate.id
                : createMessage(role, content).id,
            role,
            content,
            includeInConversation: candidate.includeInConversation !== false,
        }];
    });
}

function readPersistedChatState(): PersistedChatState | null {
    if (typeof window === 'undefined') {
        return null;
    }

    try {
        const raw = window.localStorage.getItem(CHAT_STORAGE_KEY);
        if (!raw) {
            return null;
        }

        const parsed = JSON.parse(raw) as Partial<PersistedChatState>;
        if (parsed.version !== 1 || typeof parsed.savedAt !== 'number') {
            window.localStorage.removeItem(CHAT_STORAGE_KEY);
            return null;
        }

        if (Date.now() - parsed.savedAt > CHAT_STORAGE_TTL_MS) {
            window.localStorage.removeItem(CHAT_STORAGE_KEY);
            return null;
        }

        const messages = sanitizePersistedMessages(parsed.messages);
        return {
            version: 1,
            savedAt: parsed.savedAt,
            unreadCount:
                typeof parsed.unreadCount === 'number' && parsed.unreadCount > 0
                    ? Math.floor(parsed.unreadCount)
                    : 0,
            messages: messages.length > 0 ? messages : [createInitialMessage()],
        };
    } catch {
        window.localStorage.removeItem(CHAT_STORAGE_KEY);
        return null;
    }
}

function persistChatState(messages: ChatMessage[], unreadCount: number) {
    if (typeof window === 'undefined') {
        return;
    }

    const persistedMessages = messages.filter((message) => message.content.trim().length > 0);
    const payload: PersistedChatState = {
        version: 1,
        savedAt: Date.now(),
        unreadCount: Math.max(0, unreadCount),
        messages: persistedMessages.length > 0 ? persistedMessages : [createInitialMessage()],
    };

    window.localStorage.setItem(CHAT_STORAGE_KEY, JSON.stringify(payload));
}

export function AuthSupportChat() {
    const [isOpen, setIsOpen] = useState(false);
    const [isHiddenByBackToTop, setIsHiddenByBackToTop] = useState(false);
    const [unreadCount, setUnreadCount] = useState(0);
    const [draft, setDraft] = useState('');
    const [isReplying, setIsReplying] = useState(false);
    const [hasHydratedPersistence, setHasHydratedPersistence] = useState(false);
    const [messages, setMessages] = useState<ChatMessage[]>(() => [createInitialMessage()]);
    const textareaRef = useRef<HTMLTextAreaElement | null>(null);
    const messagesContainerRef = useRef<HTMLDivElement | null>(null);
    const abortControllerRef = useRef<AbortController | null>(null);
    const isOpenRef = useRef(false);
    const shouldStickToBottomRef = useRef(true);

    const cancelActiveRequest = () => {
        abortControllerRef.current?.abort();
        abortControllerRef.current = null;
    };

    const clearChat = () => {
        cancelActiveRequest();
        shouldStickToBottomRef.current = true;
        setDraft('');
        setUnreadCount(0);
        setIsReplying(false);
        setMessages([createInitialMessage()]);
    };

    const scrollMessagesToBottom = (behavior: ScrollBehavior = 'auto') => {
        const container = messagesContainerRef.current;
        if (!container) {
            return;
        }

        container.scrollTo({
            top: container.scrollHeight,
            behavior,
        });
    };

    const handleMessagesScroll = () => {
        const container = messagesContainerRef.current;
        if (!container) {
            return;
        }

        const distanceFromBottom =
            container.scrollHeight - container.scrollTop - container.clientHeight;

        shouldStickToBottomRef.current = distanceFromBottom <= AUTO_SCROLL_THRESHOLD;
    };

    const markUnreadIfClosed = () => {
        if (!isOpenRef.current) {
            setUnreadCount((current) => current + 1);
        }
    };

    useEffect(() => {
        const persistedState = readPersistedChatState();
        if (persistedState) {
            setMessages(persistedState.messages);
            setUnreadCount(persistedState.unreadCount);
        }

        setHasHydratedPersistence(true);
    }, []);

    useEffect(() => {
        if (!hasHydratedPersistence) {
            return;
        }

        persistChatState(messages, unreadCount);
    }, [hasHydratedPersistence, messages, unreadCount]);

    useEffect(() => {
        isOpenRef.current = isOpen;
    }, [isOpen]);

    useEffect(() => {
        const handleVisibilityChange = (event: Event) => {
            const customEvent = event as CustomEvent<{ visible?: boolean }>;
            const nextVisible = Boolean(customEvent.detail?.visible);
            setIsHiddenByBackToTop(nextVisible && !isOpen);
        };

        window.addEventListener(BACK_TO_TOP_VISIBILITY_EVENT, handleVisibilityChange as EventListener);

        return () => {
            window.removeEventListener(BACK_TO_TOP_VISIBILITY_EVENT, handleVisibilityChange as EventListener);
        };
    }, [isOpen]);

    useEffect(() => {
        if (!isOpen) {
            return;
        }

        const previousHtmlOverflow = document.documentElement.style.overflow;
        const previousBodyOverflow = document.body.style.overflow;
        const previousBodyOverscroll = document.body.style.overscrollBehavior;

        document.documentElement.style.overflow = 'hidden';
        document.body.style.overflow = 'hidden';
        document.body.style.overscrollBehavior = 'none';

        return () => {
            document.documentElement.style.overflow = previousHtmlOverflow;
            document.body.style.overflow = previousBodyOverflow;
            document.body.style.overscrollBehavior = previousBodyOverscroll;
        };
    }, [isOpen]);

    useEffect(() => {
        if (!isOpen) {
            return;
        }

        textareaRef.current?.focus();
        setUnreadCount(0);
        shouldStickToBottomRef.current = true;
        requestAnimationFrame(() => {
            scrollMessagesToBottom();
        });
    }, [isOpen]);

    useEffect(() => {
        return () => {
            cancelActiveRequest();
        };
    }, []);

    useEffect(() => {
        if (!isOpen || !shouldStickToBottomRef.current) {
            return;
        }

        requestAnimationFrame(() => {
            scrollMessagesToBottom();
        });
    }, [isOpen, isReplying, messages]);

    const submitMessage = async () => {
        const nextMessage = draft.trim();
        if (!nextMessage || isReplying) {
            return;
        }

        const userMessage = createMessage('user', nextMessage);
        const assistantMessage = createMessage('assistant', '');
        const assistantMessageId = assistantMessage.id;
        const requestMessages = toBotRequestMessages([...messages, userMessage]);
        const abortController = new AbortController();

        abortControllerRef.current = abortController;
        shouldStickToBottomRef.current = true;
        setDraft('');
        setIsReplying(true);
        setMessages((current) => [...current, userMessage, assistantMessage]);

        try {
            await botService.streamChatCompletion(
                { messages: requestMessages },
                {
                    signal: abortController.signal,
                    onDelta: ({ delta }) => {
                        setMessages((current) =>
                            current.map((message) =>
                                message.id === assistantMessageId
                                    ? { ...message, content: `${message.content}${delta}` }
                                    : message
                            )
                        );
                    },
                    onComplete: ({ message }) => {
                        setMessages((current) =>
                            current.map((currentMessage) =>
                                currentMessage.id === assistantMessageId
                                    ? {
                                        ...currentMessage,
                                        content: message,
                                        includeInConversation: true,
                                    }
                                    : currentMessage
                            )
                        );
                        markUnreadIfClosed();
                    },
                }
            );
        } catch (error) {
            if (abortController.signal.aborted) {
                setMessages((current) =>
                    current.flatMap((message) => {
                        if (message.id !== assistantMessageId) {
                            return [message];
                        }

                        if (message.content.trim().length === 0) {
                            return [];
                        }

                        return [{ ...message, includeInConversation: false }];
                    })
                );
                return;
            }

            const errorMessage = getErrorMessage(error);
            setMessages((current) =>
                current.map((message) =>
                    message.id === assistantMessageId
                        ? {
                            ...message,
                            content: errorMessage,
                            includeInConversation: false,
                        }
                        : message
                )
            );
            markUnreadIfClosed();
        } finally {
            if (abortControllerRef.current === abortController) {
                abortControllerRef.current = null;
            }
            setIsReplying(false);
        }
    };

    const handleSubmit = async (event: FormEvent<HTMLFormElement>) => {
        event.preventDefault();
        await submitMessage();
    };

    const handleTextareaKeyDown = (event: KeyboardEvent<HTMLTextAreaElement>) => {
        if (event.key !== 'Enter' || event.shiftKey) {
            return;
        }

        event.preventDefault();
        void submitMessage();
    };

    if (isHiddenByBackToTop && !isOpen) {
        return null;
    }

    return (
        <>
            {isOpen && <div className="fixed inset-0 z-[129] bg-transparent" aria-hidden="true" />}
            <div className="pointer-events-none fixed bottom-8 right-6 z-[130]">
            {isOpen ? (
                <section className="pointer-events-auto animate-in fade-in zoom-in-95 slide-in-from-bottom-2 flex h-[min(70vh,40rem)] w-[min(calc(100vw-2rem),24rem)] flex-col overflow-hidden rounded-[28px] border border-primary/20 bg-background/95 shadow-2xl shadow-black/15 supports-[backdrop-filter]:bg-background/85 supports-[backdrop-filter]:backdrop-blur-xl">
                    <header className="border-b border-border/70 bg-gradient-to-br from-primary/12 via-background to-background px-4 py-4">
                        <div className="flex items-start justify-between gap-3">
                            <div className="min-w-0">
                                <div className="flex items-center gap-3">
                                    <div className="flex size-10 shrink-0 items-center justify-center rounded-2xl bg-primary text-primary-foreground shadow-lg shadow-primary/20">
                                        <Bot className="size-5" />
                                    </div>
                                    <div className="min-w-0">
                                        <p className="truncate text-sm font-semibold text-foreground">Support chat</p>
                                        <p className="text-xs text-muted-foreground">Streaming live</p>
                                    </div>
                                </div>
                            </div>
                            <div className="flex shrink-0 items-center gap-1">
                                <Button
                                    type="button"
                                    variant="ghost"
                                    size="sm"
                                    className="h-8 px-2 text-xs"
                                    onClick={clearChat}
                                >
                                    Clear
                                </Button>
                                <Button
                                    type="button"
                                    variant="ghost"
                                    size="icon-sm"
                                    className="shrink-0"
                                    onClick={() => {
                                        setIsOpen(false);
                                    }}
                                >
                                    <X className="size-4" />
                                    <span className="sr-only">Minimize chat</span>
                                </Button>
                            </div>
                        </div>
                    </header>

                    <div
                        ref={messagesContainerRef}
                        onScroll={handleMessagesScroll}
                        className="flex-1 space-y-3 overflow-y-auto overscroll-contain bg-[radial-gradient(circle_at_top,_rgba(99,113,143,0.08),_transparent_50%)] px-4 py-4"
                    >
                        {messages
                            .filter((message) => message.content.trim().length > 0)
                            .map((message) => (
                            <div
                                key={message.id}
                                className={cn('flex', message.role === 'user' ? 'justify-end' : 'justify-start')}
                            >
                                <div
                                    className={cn(
                                        'max-w-[85%] rounded-3xl px-4 py-3 text-sm leading-6 shadow-sm',
                                        message.role === 'user'
                                            ? 'rounded-br-xl bg-primary text-primary-foreground'
                                            : 'rounded-bl-xl border border-border/70 bg-background/90 text-foreground'
                                    )}
                                >
                                    {message.content}
                                </div>
                            </div>
                        ))}

                        {isReplying && (
                            <div className="flex justify-start">
                                <div className="flex items-center gap-1 rounded-3xl rounded-bl-xl border border-border/70 bg-background/90 px-4 py-3 shadow-sm">
                                    <span className="size-2 animate-pulse rounded-full bg-primary/55" />
                                    <span className="size-2 animate-pulse rounded-full bg-primary/40 [animation-delay:120ms]" />
                                    <span className="size-2 animate-pulse rounded-full bg-primary/25 [animation-delay:240ms]" />
                                </div>
                            </div>
                        )}
                    </div>

                    <form onSubmit={handleSubmit} className="border-t border-border/70 bg-background/90 p-4">
                        <div className="rounded-[22px] border border-border/70 bg-background/95 px-3 py-2.5 shadow-sm">
                            <Textarea
                                ref={textareaRef}
                                value={draft}
                                onChange={(event) => setDraft(event.target.value)}
                                onKeyDown={handleTextareaKeyDown}
                                placeholder="Type a message..."
                                rows={3}
                                className="min-h-16 resize-none border-0 bg-transparent p-0 text-sm shadow-none focus-visible:ring-0"
                                disabled={isReplying}
                            />
                            <div className="mt-2 flex justify-end">
                                <Button type="submit" size="sm" disabled={!draft.trim() || isReplying}>
                                    <SendHorizontal className="size-4" />
                                    Send
                                </Button>
                            </div>
                        </div>
                    </form>
                </section>
            ) : (
                <Button
                    type="button"
                    size="icon-lg"
                    className="pointer-events-auto relative size-14 rounded-full shadow-2xl shadow-primary/20"
                    onClick={() => {
                        setUnreadCount(0);
                        setIsOpen(true);
                    }}
                >
                    <MessageCircleMore className="size-6" />
                    {unreadCount > 0 && (
                        <span className="absolute -right-1 -top-1 inline-flex min-h-5 min-w-5 items-center justify-center rounded-full bg-destructive px-1 text-[11px] font-semibold leading-none text-destructive-foreground">
                            {unreadCount > 9 ? '9+' : unreadCount}
                        </span>
                    )}
                    <span className="sr-only">Open support chat</span>
                </Button>
            )}
            </div>
        </>
    );
}
