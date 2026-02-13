"use client";

import { useCallback, useEffect, useState } from "react";
import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { Search, Mail, Calendar, ExternalLink } from "lucide-react";
import { adminContactService } from "@/lib/api/admin-contact.service";
import { AdminContactMessage } from "@/lib/api/admin-contact.types";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
    Table,
    TableBody,
    TableCell,
    TableHead,
    TableHeader,
    TableRow,
} from "@/components/ui/table";
import { Skeleton } from "@/components/ui/skeleton";

export default function AdminMessagesPage() {
    const router = useRouter();
    const searchParams = useSearchParams();
    const [messages, setMessages] = useState<AdminContactMessage[]>([]);
    const [loading, setLoading] = useState(true);

    const page = parseInt(searchParams.get("page") || "1", 10);
    const search = searchParams.get("search") || "";
    const pageSize = 20;

    const loadMessages = useCallback(async () => {
        try {
            setLoading(true);
            const data = await adminContactService.getMessages({
                page,
                pageSize,
                search: search || undefined,
            });
            setMessages(data);
        } catch (error) {
            console.error("Failed to load messages", error);
        } finally {
            setLoading(false);
        }
    }, [page, search]);

    useEffect(() => {
        loadMessages();
    }, [loadMessages]);

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

    return (
        <div className="p-8 pt-24 space-y-8">
            <div>
                <h2 className="text-3xl font-bold tracking-tight">Messages</h2>
                <p className="text-muted-foreground">Contact submissions sent from website forms.</p>
            </div>

            <div className="flex items-center gap-4">
                <div className="relative flex-1 max-w-sm">
                    <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
                    <Input
                        placeholder="Search messages..."
                        className="pl-9"
                        defaultValue={search}
                        onChange={(e) => handleSearch(e.target.value)}
                    />
                </div>
            </div>

            <div className="rounded-md border bg-card">
                <Table>
                    <TableHeader>
                        <TableRow>
                            <TableHead>From</TableHead>
                            <TableHead>Purpose</TableHead>
                            <TableHead>Message</TableHead>
                            <TableHead>Ref</TableHead>
                            <TableHead>Date</TableHead>
                        </TableRow>
                    </TableHeader>
                    <TableBody>
                        {loading ? (
                            Array.from({ length: 6 }).map((_, i) => (
                                <TableRow key={i}>
                                    <TableCell><Skeleton className="h-10 w-48" /></TableCell>
                                    <TableCell><Skeleton className="h-6 w-24" /></TableCell>
                                    <TableCell><Skeleton className="h-6 w-80" /></TableCell>
                                    <TableCell><Skeleton className="h-6 w-20" /></TableCell>
                                    <TableCell><Skeleton className="h-6 w-28" /></TableCell>
                                </TableRow>
                            ))
                        ) : messages.length === 0 ? (
                            <TableRow>
                                <TableCell colSpan={5} className="h-24 text-center">
                                    No messages found.
                                </TableCell>
                            </TableRow>
                        ) : (
                            messages.map((item) => (
                                <TableRow key={item.id}>
                                    <TableCell>
                                        <div className="space-y-1">
                                            <div className="font-medium">{item.name}</div>
                                            <div className="text-sm text-muted-foreground flex items-center gap-1">
                                                <Mail className="h-3.5 w-3.5" />
                                                {item.email}
                                            </div>
                                        </div>
                                    </TableCell>
                                    <TableCell>
                                        <Badge variant="outline">{item.purpose}</Badge>
                                    </TableCell>
                                    <TableCell className="max-w-[460px]">
                                        <p className="text-sm line-clamp-3 whitespace-pre-wrap">{item.message}</p>
                                    </TableCell>
                                    <TableCell>
                                        {item.refUrl ? (
                                            <Button variant="ghost" size="sm" asChild>
                                                <Link href={item.refUrl} target="_blank" rel="noreferrer">
                                                    Open <ExternalLink className="ml-1 h-3.5 w-3.5" />
                                                </Link>
                                            </Button>
                                        ) : (
                                            <span className="text-xs text-muted-foreground">N/A</span>
                                        )}
                                    </TableCell>
                                    <TableCell>
                                        <div className="flex items-center gap-2 text-sm text-muted-foreground">
                                            <Calendar className="h-4 w-4" />
                                            {new Date(item.createdAt).toLocaleString()}
                                        </div>
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
                    disabled={messages.length < pageSize || loading}
                >
                    Next
                </Button>
            </div>
        </div>
    );
}
