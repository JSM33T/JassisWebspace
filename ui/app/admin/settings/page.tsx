"use client";

import { useCallback, useEffect, useState } from "react";
import { Clock3, RefreshCcw, Tags } from "lucide-react";

import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Spinner } from "@/components/ui/spinner";
import { type CacheTagMeta } from "@/lib/home-content.types";

export default function AdminSettingsPage() {
    const [cacheTags, setCacheTags] = useState<CacheTagMeta[]>([]);
    const [loadingCacheMeta, setLoadingCacheMeta] = useState(true);
    const [cacheError, setCacheError] = useState<string | null>(null);
    const [revalidatingTag, setRevalidatingTag] = useState<string | null>(null);
    const [cacheNotice, setCacheNotice] = useState<string | null>(null);

    const formatDateTime = (isoDate: string) =>
        new Date(isoDate).toLocaleString("en-US", {
            year: "numeric",
            month: "short",
            day: "numeric",
            hour: "2-digit",
            minute: "2-digit",
            second: "2-digit",
        });

    const formatTtl = (ttlSeconds: number) => {
        if (ttlSeconds % 86400 === 0) {
            const days = ttlSeconds / 86400;
            return `${days} day${days === 1 ? "" : "s"} (${ttlSeconds}s)`;
        }

        if (ttlSeconds % 3600 === 0) {
            const hours = ttlSeconds / 3600;
            return `${hours} hour${hours === 1 ? "" : "s"} (${ttlSeconds}s)`;
        }

        return `${ttlSeconds}s`;
    };

    const fetchCacheMeta = useCallback(async () => {
        try {
            const token = typeof window === "undefined" ? null : localStorage.getItem("accessToken");
            const response = await fetch("/api/admin/cache/home", {
                method: "GET",
                headers: token ? { Authorization: `Bearer ${token}` } : {},
                cache: "no-store",
            });

            if (!response.ok) {
                const payload = await response.json().catch(() => null);
                throw new Error(payload?.message || "Failed to load cache metadata.");
            }

            const payload = await response.json();
            setCacheTags((payload.tags || []) as CacheTagMeta[]);
        } catch (error) {
            const message = error instanceof Error ? error.message : "Failed to load cache metadata.";
            setCacheError(message);
        } finally {
            setLoadingCacheMeta(false);
        }
    }, []);

    const handleRevalidateCache = async (tag: string) => {
        try {
            setRevalidatingTag(tag);
            setCacheError(null);
            setCacheNotice(null);

            const token = typeof window === "undefined" ? null : localStorage.getItem("accessToken");
            const response = await fetch("/api/admin/cache/home", {
                method: "POST",
                headers: {
                    ...(token ? { Authorization: `Bearer ${token}` } : {}),
                    "Content-Type": "application/json",
                },
                body: JSON.stringify({ tag }),
                cache: "no-store",
            });

            if (!response.ok) {
                const payload = await response.json().catch(() => null);
                throw new Error(payload?.message || "Failed to revalidate cache.");
            }

            const payload = await response.json();
            setCacheTags((payload.tags || []) as CacheTagMeta[]);
            setCacheNotice(`Revalidated tag: ${tag}`);
        } catch (error) {
            const message = error instanceof Error ? error.message : "Failed to revalidate cache.";
            setCacheError(message);
        } finally {
            setRevalidatingTag(null);
        }
    };

    useEffect(() => {
        void (async () => {
            await fetchCacheMeta();
        })();
    }, [fetchCacheMeta]);

    return (
        <div className="space-y-6 p-8 pt-24">
            <div>
                <h1 className="text-3xl font-bold">Settings</h1>
                <p className="mt-2 text-muted-foreground">
                    Manage cache and system behavior for admin-controlled sections.
                </p>
            </div>

            <section className="space-y-3">
                <div>
                    <h2 className="text-xl font-semibold">ISR Cache Tags</h2>
                    <p className="text-sm text-muted-foreground">
                        Tag-wise settings for home blog/gallery feeds and music listing cache.
                    </p>
                </div>
                <Card>
                    <CardHeader className="space-y-2">
                        <CardTitle className="text-base font-semibold">Tag List</CardTitle>
                        <p className="text-sm text-muted-foreground">
                            Each entry has its own tag, TTL, generated time, and manual revalidate action.
                        </p>
                    </CardHeader>
                    <CardContent>
                        {loadingCacheMeta ? (
                            <div className="flex items-center text-sm text-muted-foreground">
                                <Spinner className="mr-2 h-4 w-4" />
                                Loading cache metadata...
                            </div>
                        ) : cacheTags.length > 0 ? (
                            <div className="space-y-3">
                                {cacheTags.map((entry) => (
                                    <div key={entry.tag} className="rounded-xl border p-4">
                                        <div className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
                                            <div className="space-y-2">
                                                <p className="text-sm font-semibold">{entry.label}</p>
                                                <p className="text-xs text-muted-foreground">{entry.description}</p>
                                                <div className="flex flex-wrap items-center gap-2 text-xs text-muted-foreground">
                                                    <span className="inline-flex items-center gap-1.5 rounded-full border px-2 py-1">
                                                        <Tags className="h-3 w-3" />
                                                        {entry.tag}
                                                    </span>
                                                    <span className="inline-flex items-center gap-1.5 rounded-full border px-2 py-1">
                                                        <Clock3 className="h-3 w-3" />
                                                        {formatTtl(entry.ttlSeconds)}
                                                    </span>
                                                    <span className="inline-flex items-center gap-1.5 rounded-full border px-2 py-1">
                                                        Status: {entry.isExpired ? "Stale" : "Fresh"}
                                                    </span>
                                                    <span className="inline-flex items-center gap-1.5 rounded-full border px-2 py-1">
                                                        Items: {entry.itemCount}
                                                    </span>
                                                </div>
                                                <div className="text-xs text-muted-foreground">
                                                    Generated: {formatDateTime(entry.generatedAt)}
                                                </div>
                                                <div className="text-xs text-muted-foreground">
                                                    Expires: {formatDateTime(entry.expiresAt)}
                                                </div>
                                            </div>
                                            <Button
                                                type="button"
                                                onClick={() => handleRevalidateCache(entry.tag)}
                                                disabled={revalidatingTag !== null}
                                                className="rounded-full"
                                            >
                                                {revalidatingTag === entry.tag ? (
                                                    <>
                                                        <Spinner className="mr-2 h-4 w-4" />
                                                        Revalidating...
                                                    </>
                                                ) : (
                                                    <>
                                                        <RefreshCcw className="mr-2 h-4 w-4" />
                                                        Revalidate
                                                    </>
                                                )}
                                            </Button>
                                        </div>
                                    </div>
                                ))}
                            </div>
                        ) : (
                            <div className="text-sm text-muted-foreground">No cache metadata available.</div>
                        )}

                        {cacheError && <p className="mt-4 text-sm text-destructive">{cacheError}</p>}
                        {cacheNotice && <p className="mt-4 text-sm text-emerald-600">{cacheNotice}</p>}
                    </CardContent>
                </Card>
            </section>
        </div>
    );
}

