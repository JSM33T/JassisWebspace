"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { useParams } from "next/navigation";
import { ArrowLeft, Clock, Heart, Link as LinkIcon, MessageCircle } from "lucide-react";
import { adminContentService } from "@/lib/api/admin-content.service";
import { AdminContentDetail } from "@/lib/api/admin-content.types";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";

function formatDate(value: string | null): string {
    if (!value) {
        return "–";
    }
    return new Date(value).toLocaleString(undefined, {
        month: "short",
        day: "numeric",
        year: "numeric",
    });
}

function renderUser(user: { userId: string; username: string; displayName: string | null; avatarUrl: string | null }) {
    const initials = user.displayName ?
        user.displayName
            .split(/\s+/)
            .map((part) => part[0])
            .join("")
            .slice(0, 2)
            .toUpperCase()
        : user.username.slice(0, 2).toUpperCase();

    return (
        <div key={user.userId} className="flex items-center gap-3">
            <Avatar size="sm">
                {user.avatarUrl ? (
                    <AvatarImage src={user.avatarUrl} alt={user.displayName || user.username} />
                ) : (
                    <AvatarFallback>{initials}</AvatarFallback>
                )}
            </Avatar>
            <div>
                <p className="text-sm font-medium text-foreground">{user.displayName || user.username}</p>
                <p className="text-xs text-muted-foreground">@{user.username}</p>
            </div>
        </div>
    );
}

export default function AdminContentDetailPage() {
    const params = useParams();
    const [content, setContent] = useState<AdminContentDetail | null>(null);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        const load = async () => {
            if (!params?.id) {
                return;
            }

            try {
                setLoading(true);
                const data = await adminContentService.getContent(params.id);
                setContent(data);
            } catch (error) {
                console.error("Failed to load content detail", error);
                setContent(null);
            } finally {
                setLoading(false);
            }
        };

        load();
    }, [params?.id]);

    if (loading) {
        return (
            <div className="p-8 pt-24 max-w-5xl mx-auto space-y-6">
                <Skeleton className="h-10 w-1/3" />
                <Skeleton className="h-64 w-full" />
                <Skeleton className="h-64 w-full" />
            </div>
        );
    }

    if (!content) {
        return (
            <div className="p-8 pt-24 max-w-5xl mx-auto text-center">
                <h2 className="text-2xl font-bold">Content not found</h2>
                <p className="text-muted-foreground">
                    We could not find that content item. It may have been removed.
                </p>
                <div className="mt-6">
                    <Button asChild>
                        <Link href="/admin/content">
                            <ArrowLeft className="mr-2 h-4 w-4" />
                            Back to content
                        </Link>
                    </Button>
                </div>
            </div>
        );
    }

    return (
        <div className="p-8 pt-24 max-w-5xl mx-auto space-y-6">
            <div className="flex flex-wrap items-center gap-2">
                <Button variant="ghost" size="sm" asChild>
                    <Link href="/admin/content" className="flex items-center gap-2 text-xs">
                        <ArrowLeft className="h-4 w-4" />
                        Back to list
                    </Link>
                </Button>
                <Badge variant="outline" className="uppercase text-[11px] tracking-wide">
                    {content.contentType}
                </Badge>
                <Badge variant={content.isPublished ? "default" : "secondary"}>
                    {content.isPublished ? "Published" : "Draft"}
                </Badge>
            </div>

            <Card>
                <CardHeader>
                    <div className="flex flex-col gap-1">
                        <CardTitle className="text-3xl">{content.title}</CardTitle>
                        <CardDescription className="text-sm text-muted-foreground">{content.slug}</CardDescription>
                    </div>
                </CardHeader>
                <CardContent className="grid gap-4 md:grid-cols-4">
                    <div className="flex items-center gap-2 text-sm text-muted-foreground">
                        <LinkIcon className="h-4 w-4" />
                        <div>
                            <p className="text-xs uppercase tracking-wide">Links</p>
                            <p className="text-base font-semibold text-foreground">{content.linkCount}</p>
                        </div>
                    </div>
                    <div className="flex items-center gap-2 text-sm text-muted-foreground">
                        <MessageCircle className="h-4 w-4" />
                        <div>
                            <p className="text-xs uppercase tracking-wide">Comments</p>
                            <p className="text-base font-semibold text-foreground">{content.commentCount}</p>
                        </div>
                    </div>
                    <div className="flex flex-col text-sm text-muted-foreground">
                        <span className="flex items-center gap-2 font-semibold text-foreground">
                            <Heart className="h-4 w-4" />
                            {content.likeCount}
                        </span>
                        <span className="text-xs uppercase tracking-wide">Likes</span>
                    </div>
                    <div className="flex flex-col text-sm text-muted-foreground">
                        <span className="flex items-center gap-2 font-semibold text-foreground">
                            <Clock className="h-4 w-4" />
                            {formatDate(content.lastActivityAt)}
                        </span>
                        <span className="text-xs uppercase tracking-wide">Last activity</span>
                    </div>
                </CardContent>
                <CardContent className="border-t border-muted-foreground/20">
                    <p className="text-sm text-muted-foreground">
                        Published {content.publishedAt ? formatDate(content.publishedAt) : "Not published"} · Last updated {formatDate(content.updatedAt ?? content.createdAt)} · Last activity {formatDate(content.lastActivityAt)}
                    </p>
                </CardContent>
            </Card>

            <div className="grid gap-4 md:grid-cols-2">
                <Card className="space-y-2">
                    <CardHeader>
                        <CardTitle className="text-base font-semibold">People who liked</CardTitle>
                    </CardHeader>
                    <CardContent className="space-y-3 max-h-72 overflow-y-auto">
                        {content.likedBy.length === 0 ? (
                            <p className="text-sm text-muted-foreground">No likes yet.</p>
                        ) : (
                            content.likedBy.map(renderUser)
                        )}
                    </CardContent>
                </Card>

                <Card className="space-y-2">
                    <CardHeader>
                        <CardTitle className="text-base font-semibold">People who commented</CardTitle>
                    </CardHeader>
                    <CardContent className="space-y-3 max-h-72 overflow-y-auto">
                        {content.commentedBy.length === 0 ? (
                            <p className="text-sm text-muted-foreground">No comments yet.</p>
                        ) : (
                            content.commentedBy.map(renderUser)
                        )}
                    </CardContent>
                </Card>
            </div>
        </div>
    );
}
