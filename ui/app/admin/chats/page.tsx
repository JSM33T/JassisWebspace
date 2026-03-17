"use client";

import { useCallback, useEffect, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { Calendar, Search, Trash2, UserRound } from "lucide-react";
import { toast } from "sonner";
import { BotChatMarkdown } from "@/components/bot/bot-chat-markdown";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Skeleton } from "@/components/ui/skeleton";
import {
    Table,
    TableBody,
    TableCell,
    TableHead,
    TableHeader,
    TableRow,
} from "@/components/ui/table";
import { adminChatService } from "@/lib/api/admin-chat.service";
import type { AdminChatDetail, AdminChatSummary } from "@/lib/api/admin-chat.types";

export default function AdminChatsPage() {
    const router = useRouter();
    const searchParams = useSearchParams();
    const [chats, setChats] = useState<AdminChatSummary[]>([]);
    const [loading, setLoading] = useState(true);
    const [selectedChatId, setSelectedChatId] = useState<string | null>(null);
    const [selectedChat, setSelectedChat] = useState<AdminChatDetail | null>(null);
    const [loadingSelectedChat, setLoadingSelectedChat] = useState(false);
    const [deleting, setDeleting] = useState(false);

    const page = parseInt(searchParams.get("page") || "1", 10);
    const search = searchParams.get("search") || "";
    const pageSize = 20;

    const loadChats = useCallback(async () => {
        try {
            setLoading(true);
            const data = await adminChatService.getChats({
                page,
                pageSize,
                search: search || undefined,
            });
            setChats(data);
        } catch (error) {
            console.error("Failed to load chats", error);
            toast.error("Failed to load chats");
        } finally {
            setLoading(false);
        }
    }, [page, pageSize, search]);

    useEffect(() => {
        void loadChats();
    }, [loadChats]);

    useEffect(() => {
        if (!selectedChatId) {
            setSelectedChat(null);
            return;
        }

        const loadSelectedChat = async () => {
            try {
                setLoadingSelectedChat(true);
                const data = await adminChatService.getChat(selectedChatId);
                setSelectedChat(data);
            } catch (error) {
                console.error("Failed to load chat", error);
                toast.error("Failed to load chat details");
                setSelectedChatId(null);
            } finally {
                setLoadingSelectedChat(false);
            }
        };

        void loadSelectedChat();
    }, [selectedChatId]);

    const handleSearch = (term: string) => {
        const params = new URLSearchParams(searchParams);
        if (term) {
            params.set("search", term);
        } else {
            params.delete("search");
        }
        params.set("page", "1");
        router.replace(`?${params.toString()}`);
    };

    const handleDeleteChat = async () => {
        if (!selectedChat) {
            return;
        }

        try {
            setDeleting(true);
            await adminChatService.deleteChat(selectedChat.id);
            setChats((current) => current.filter((chat) => chat.id !== selectedChat.id));
            setSelectedChat(null);
            setSelectedChatId(null);
            toast.success("Chat deleted");
        } catch (error) {
            console.error("Failed to delete chat", error);
            toast.error("Failed to delete chat");
        } finally {
            setDeleting(false);
        }
    };

    return (
        <div className="space-y-8 p-8 pt-24">
            <div>
                <h2 className="text-3xl font-bold tracking-tight">Chats</h2>
                <p className="text-muted-foreground">Stored support chat sessions from authenticated users and anonymous visitors.</p>
            </div>

            <div className="flex items-center gap-4">
                <div className="relative max-w-sm flex-1">
                    <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
                    <Input
                        placeholder="Search chats..."
                        className="pl-9"
                        defaultValue={search}
                        onChange={(event) => handleSearch(event.target.value)}
                    />
                </div>
            </div>

            <div className="rounded-md border bg-card">
                <Table>
                    <TableHeader>
                        <TableRow>
                            <TableHead>Owner</TableHead>
                            <TableHead>Chat ID</TableHead>
                            <TableHead>Messages</TableHead>
                            <TableHead>Model</TableHead>
                            <TableHead>Last activity</TableHead>
                            <TableHead>Preview</TableHead>
                        </TableRow>
                    </TableHeader>
                    <TableBody>
                        {loading ? (
                            Array.from({ length: 6 }).map((_, index) => (
                                <TableRow key={index}>
                                    <TableCell><Skeleton className="h-10 w-44" /></TableCell>
                                    <TableCell><Skeleton className="h-6 w-40" /></TableCell>
                                    <TableCell><Skeleton className="h-6 w-12" /></TableCell>
                                    <TableCell><Skeleton className="h-6 w-28" /></TableCell>
                                    <TableCell><Skeleton className="h-6 w-32" /></TableCell>
                                    <TableCell><Skeleton className="h-6 w-72" /></TableCell>
                                </TableRow>
                            ))
                        ) : chats.length === 0 ? (
                            <TableRow>
                                <TableCell colSpan={6} className="h-24 text-center">
                                    No chats found.
                                </TableCell>
                            </TableRow>
                        ) : (
                            chats.map((chat) => (
                                <TableRow
                                    key={chat.id}
                                    className="cursor-pointer"
                                    onClick={() => setSelectedChatId(chat.id)}
                                >
                                    <TableCell>
                                        <div className="space-y-1">
                                            <div className="font-medium">{chat.ownerDisplay}</div>
                                            <div className="flex items-center gap-1 text-sm text-muted-foreground">
                                                <UserRound className="h-3.5 w-3.5" />
                                                {chat.userId ? "User" : chat.visitorId ? "Visitor" : "Unknown"}
                                            </div>
                                        </div>
                                    </TableCell>
                                    <TableCell className="max-w-[12rem] truncate font-mono text-xs">
                                        {chat.id}
                                    </TableCell>
                                    <TableCell>{chat.messageCount}</TableCell>
                                    <TableCell className="max-w-[10rem] truncate text-sm text-muted-foreground">
                                        {chat.model || "N/A"}
                                    </TableCell>
                                    <TableCell>
                                        <div className="flex items-center gap-2 text-sm text-muted-foreground">
                                            <Calendar className="h-4 w-4" />
                                            {new Date(chat.updatedAt).toLocaleString()}
                                        </div>
                                    </TableCell>
                                    <TableCell className="max-w-[28rem]">
                                        <p className="line-clamp-2 text-sm text-muted-foreground">
                                            {chat.preview || "No transcript preview available."}
                                        </p>
                                    </TableCell>
                                </TableRow>
                            ))
                        )}
                    </TableBody>
                </Table>
            </div>

            <div className="flex items-center justify-center gap-2">
                <Button
                    variant="outline"
                    size="sm"
                    onClick={() => {
                        const params = new URLSearchParams(searchParams);
                        params.set("page", (page - 1).toString());
                        router.push(`?${params.toString()}`);
                    }}
                    disabled={page <= 1 || loading}
                >
                    Previous
                </Button>
                <div className="text-sm text-muted-foreground">Page {page}</div>
                <Button
                    variant="outline"
                    size="sm"
                    onClick={() => {
                        const params = new URLSearchParams(searchParams);
                        params.set("page", (page + 1).toString());
                        router.push(`?${params.toString()}`);
                    }}
                    disabled={chats.length < pageSize || loading}
                >
                    Next
                </Button>
            </div>

            <Dialog
                open={!!selectedChatId}
                onOpenChange={(open) => {
                    if (!open) {
                        setSelectedChatId(null);
                    }
                }}
            >
                <DialogContent className="sm:max-w-4xl">
                    <DialogHeader>
                        <DialogTitle>Chat transcript</DialogTitle>
                        <DialogDescription>
                            Support chat session details.
                        </DialogDescription>
                    </DialogHeader>

                    {loadingSelectedChat || !selectedChat ? (
                        <div className="space-y-4">
                            <Skeleton className="h-24 w-full" />
                            <Skeleton className="h-64 w-full" />
                        </div>
                    ) : (
                        <div className="space-y-4 text-sm">
                            <div className="grid grid-cols-1 gap-3 md:grid-cols-2">
                                <div>
                                    <p className="text-xs uppercase tracking-wider text-muted-foreground">Owner</p>
                                    <p className="font-medium">{selectedChat.ownerDisplay}</p>
                                </div>
                                <div>
                                    <p className="text-xs uppercase tracking-wider text-muted-foreground">Model</p>
                                    <p className="font-medium">{selectedChat.model || "N/A"}</p>
                                </div>
                                <div>
                                    <p className="text-xs uppercase tracking-wider text-muted-foreground">Chat ID</p>
                                    <p className="break-all font-mono text-xs">{selectedChat.id}</p>
                                </div>
                                <div>
                                    <p className="text-xs uppercase tracking-wider text-muted-foreground">Visitor ID</p>
                                    <p className="break-all font-mono text-xs">{selectedChat.visitorId || "N/A"}</p>
                                </div>
                                <div>
                                    <p className="text-xs uppercase tracking-wider text-muted-foreground">Created</p>
                                    <p className="font-medium">{new Date(selectedChat.createdAt).toLocaleString()}</p>
                                </div>
                                <div>
                                    <p className="text-xs uppercase tracking-wider text-muted-foreground">Updated</p>
                                    <p className="font-medium">{new Date(selectedChat.updatedAt).toLocaleString()}</p>
                                </div>
                            </div>

                            <div>
                                <p className="mb-2 text-xs uppercase tracking-wider text-muted-foreground">Transcript</p>
                                <div className="max-h-[55vh] space-y-3 overflow-y-auto rounded-md border bg-muted/30 p-4">
                                    {selectedChat.messages.length === 0 ? (
                                        <p className="text-sm text-muted-foreground">No transcript available.</p>
                                    ) : (
                                        selectedChat.messages.map((message, index) => (
                                            <div
                                                key={`${message.role}-${index}`}
                                                className={`flex ${message.role === "assistant" ? "justify-start" : "justify-end"}`}
                                            >
                                                <div
                                                    className={`max-w-[85%] rounded-3xl px-4 py-3 text-sm leading-6 shadow-xs ${
                                                        message.role === "assistant"
                                                            ? "rounded-bl-xl border border-border/60 bg-card text-card-foreground"
                                                            : "rounded-br-xl bg-primary text-primary-foreground"
                                                    }`}
                                                >
                                                    {message.role === "assistant" ? (
                                                        <BotChatMarkdown
                                                            content={message.content}
                                                            onInternalLinkClick={() => setSelectedChatId(null)}
                                                        />
                                                    ) : (
                                                        message.content
                                                    )}
                                                </div>
                                            </div>
                                        ))
                                    )}
                                </div>
                            </div>
                        </div>
                    )}
                    <DialogFooter className="gap-2">
                        <Button
                            variant="destructive"
                            onClick={handleDeleteChat}
                            disabled={deleting || loadingSelectedChat || !selectedChat}
                        >
                            <Trash2 className="mr-2 h-4 w-4" />
                            {deleting ? "Deleting..." : "Delete Chat"}
                        </Button>
                        <Button
                            variant="outline"
                            onClick={() => setSelectedChatId(null)}
                            disabled={deleting}
                        >
                            Close
                        </Button>
                    </DialogFooter>
                </DialogContent>
            </Dialog>
        </div>
    );
}
