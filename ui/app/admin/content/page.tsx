"use client";

import { useCallback, useEffect, useState } from "react";
import Link from "next/link";
import { Eye, Heart, MessageCircle } from "lucide-react";
import {
    AdminContentListItem,
    AdminContentSortBy,
    AdminContentSortDir,
    ContentType,
} from "@/lib/api/admin-content.types";
import { adminContentService } from "@/lib/api/admin-content.service";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardDescription, CardTitle } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";

const contentTypeOptions: (ContentType | "All")[] = [
    "All",
    "Music",
    "Album",
    "Blog",
    "Video",
];

const sortOptions: { value: AdminContentSortBy; label: string }[] = [
    { value: "lastActivity", label: "Last activity" },
    { value: "createdAt", label: "Created date" },
    { value: "updatedAt", label: "Updated date" },
];

const formatForInput = (date: Date) => date.toISOString().split("T")[0];

function formatDate(value: string | null): string {
    if (!value) {
        return "―";
    }
    return new Date(value).toLocaleDateString();
}

function formatDateTime(value: string): string {
    return new Date(value).toLocaleString(undefined, {
        month: "short",
        day: "numeric",
        year: "numeric",
        hour: "2-digit",
        minute: "2-digit",
    });
}

export default function AdminContentPage() {
    const [items, setItems] = useState<AdminContentListItem[]>([]);
    const [loading, setLoading] = useState(true);
    const [typeFilter, setTypeFilter] = useState<ContentType | "All">("All");
    const [sortBy, setSortBy] = useState<AdminContentSortBy>("lastActivity");
    const [sortDir, setSortDir] = useState<AdminContentSortDir>("desc");
    const [dateFrom, setDateFrom] = useState(() => {
        const from = new Date();
        from.setDate(from.getDate() - 7);
        return formatForInput(from);
    });
    const [dateTo, setDateTo] = useState(() => formatForInput(new Date()));

    const loadItems = useCallback(async () => {
        try {
            setLoading(true);
            const safeFrom = Number.isNaN(new Date(dateFrom).valueOf())
                ? new Date()
                : new Date(dateFrom);
            safeFrom.setHours(0, 0, 0, 0);
            const safeTo = Number.isNaN(new Date(dateTo).valueOf())
                ? new Date()
                : new Date(dateTo);
            safeTo.setHours(23, 59, 59, 999);
            const data = await adminContentService.getContents({
                contentType: typeFilter === "All" ? undefined : typeFilter,
                sortBy,
                sortDir,
                dateFrom: safeFrom.toISOString(),
                dateTo: safeTo.toISOString(),
            });
            setItems(data);
        } catch (error) {
            console.error("Failed to load content list", error);
        } finally {
            setLoading(false);
        }
    }, [typeFilter, sortBy, sortDir]);

    useEffect(() => {
        loadItems();
    }, [loadItems]);

    return (
        <div className="p-8 pt-24 space-y-8">
            <div className="flex flex-col gap-6">
                <div>
                    <h1 className="text-3xl font-bold">Content Management</h1>
                    <p className="text-muted-foreground">
                        Filter by type and sort by the most recent activity to surface the assets that need attention.
                    </p>
                </div>

                <div className="grid gap-3 sm:grid-cols-5">
                    <label className="space-y-1 text-xs uppercase tracking-wide text-muted-foreground">
                        Content type
                        <select
                            value={typeFilter}
                            onChange={(event) => setTypeFilter(event.target.value as ContentType | "All")}
                            className="w-full rounded-md border px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-sky-500"
                        >
                            {contentTypeOptions.map((option) => (
                                <option key={option} value={option}>
                                    {option}
                                </option>
                            ))}
                        </select>
                    </label>
                    <label className="space-y-1 text-xs uppercase tracking-wide text-muted-foreground">
                        Sort by
                        <select
                            value={sortBy}
                            onChange={(event) => setSortBy(event.target.value as AdminContentSortBy)}
                            className="w-full rounded-md border px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-sky-500"
                        >
                            {sortOptions.map((option) => (
                                <option key={option.value} value={option.value}>
                                    {option.label}
                                </option>
                            ))}
                        </select>
                    </label>
                    <label className="space-y-1 text-xs uppercase tracking-wide text-muted-foreground">
                        Direction
                        <select
                            value={sortDir}
                            onChange={(event) => setSortDir(event.target.value as AdminContentSortDir)}
                            className="w-full rounded-md border px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-sky-500"
                        >
                            <option value="desc">Descending</option>
                            <option value="asc">Ascending</option>
                        </select>
                    </label>
                    <label className="space-y-1 text-xs uppercase tracking-wide text-muted-foreground">
                        From
                        <input
                            type="date"
                            value={dateFrom}
                            onChange={(event) => setDateFrom(event.target.value)}
                            className="w-full rounded-md border px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-sky-500"
                        />
                    </label>
                    <label className="space-y-1 text-xs uppercase tracking-wide text-muted-foreground">
                        To
                        <input
                            type="date"
                            value={dateTo}
                            onChange={(event) => setDateTo(event.target.value)}
                            className="w-full rounded-md border px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-sky-500"
                        />
                    </label>
                </div>
            </div>

            {loading ? (
                <div className="space-y-4">
                    {[1, 2, 3].map((i) => (
                        <Skeleton key={i} className="h-32 w-full rounded-xl" />
                    ))}
                </div>
            ) : items.length === 0 ? (
                <div className="rounded-xl border border-dashed border-muted-foreground/40 p-8 text-center text-muted-foreground">
                    No content records yet. Once there is content in the system, you will see it here.
                </div>
            ) : (
                <div className="grid gap-4">
                    {items.map((item) => (
                        <Card key={item.id} className="p-6 flex flex-col gap-4 transition-all hover:shadow-lg">
                            <div className="flex flex-col gap-4 md:flex-row md:items-start md:justify-between">
                                <div>
                                    <CardTitle className="text-xl">
                                        <Link href={`/admin/content/${item.id}`} className="hover:underline">
                                            {item.title}
                                        </Link>
                                    </CardTitle>
                                    <CardDescription className="text-sm text-muted-foreground line-clamp-2">
                                        {item.slug}
                                    </CardDescription>
                                </div>
                                <div className="flex flex-wrap items-center gap-2">
                                    <Badge variant="outline" className="uppercase text-[11px] tracking-wide">
                                        {item.contentType}
                                    </Badge>
                                    <Badge variant={item.isPublished ? "default" : "secondary"}>
                                        {item.isPublished ? "Published" : "Draft"}
                                    </Badge>
                                </div>
                            </div>

                            <div className="grid gap-3 sm:grid-cols-3 text-sm text-muted-foreground">
                                <div className="flex items-center gap-2">
                                    <Heart className="h-4 w-4" />
                                    <span className="font-semibold text-foreground">{item.likeCount}</span>
                                    <span>likes</span>
                                </div>
                                <div className="flex items-center gap-2">
                                    <MessageCircle className="h-4 w-4" />
                                    <span className="font-semibold text-foreground">{item.commentCount}</span>
                                    <span>comments</span>
                                </div>
                                <div className="flex items-center gap-2">
                                    <span className="text-xs text-muted-foreground uppercase tracking-wide">
                                        Last activity
                                    </span>
                                    <span className="font-semibold text-foreground">{formatDateTime(item.lastActivityAt)}</span>
                                </div>
                            </div>

                            <div className="mt-2 flex flex-wrap items-center justify-between gap-3 text-xs text-muted-foreground">
                                <span>Created {formatDate(item.createdAt)}</span>
                                <Button variant="outline" size="sm" asChild>
                                    <Link href={`/admin/content/${item.id}`} className="flex items-center gap-1">
                                        <Eye className="h-4 w-4" />
                                        View details
                                    </Link>
                                </Button>
                            </div>
                        </Card>
                    ))}
                </div>
            )}
        </div>
    );
}
