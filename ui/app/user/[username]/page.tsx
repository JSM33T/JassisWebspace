"use client";

import Link from "next/link";
import { useParams } from "next/navigation";
import { useEffect, useMemo, useState } from "react";
import { ArrowLeft, CalendarDays, ShieldCheck, UserRound } from "lucide-react";

import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { ApiError } from "@/lib/api/types";
import { PublicUser, userService } from "@/lib/api/user.service";

function formatDate(value: string) {
    return new Intl.DateTimeFormat(undefined, {
        month: "long",
        day: "numeric",
        year: "numeric",
    }).format(new Date(value));
}

function formatRole(role: string) {
    return role.charAt(0).toUpperCase() + role.slice(1);
}

function getInitials(user: PublicUser | null, username: string) {
    const first = user?.firstName?.trim();
    const last = user?.lastName?.trim();
    if (first || last) {
        return `${first?.[0] ?? ""}${last?.[0] ?? ""}`.toUpperCase();
    }

    return username.slice(0, 2).toUpperCase();
}

export default function PublicUserPage() {
    const params = useParams<{ username: string }>();
    const username = params.username ?? "";
    const [user, setUser] = useState<PublicUser | null>(null);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);

    useEffect(() => {
        if (!username) return;

        let active = true;
        const loadUser = async () => {
            try {
                setLoading(true);
                setError(null);
                const data = await userService.getPublicUser(username);
                if (active) setUser(data);
            } catch (err) {
                if (!active) return;
                setUser(null);
                if (err instanceof ApiError && err.isNotFound()) {
                    setError("User not found");
                } else {
                    setError("Unable to load this user right now");
                }
            } finally {
                if (active) setLoading(false);
            }
        };

        void loadUser();

        return () => {
            active = false;
        };
    }, [username]);

    const fullName = useMemo(() => {
        const parts = [user?.firstName, user?.lastName]
            .map((part) => part?.trim())
            .filter(Boolean);

        return parts.length > 0 ? parts.join(" ") : null;
    }, [user]);

    if (loading) {
        return (
            <main className="mx-auto max-w-4xl px-4 pb-16 pt-28 sm:px-6">
                <Skeleton className="h-52 w-full rounded-lg" />
                <div className="mt-6 flex items-center gap-4">
                    <Skeleton className="h-24 w-24 rounded-full" />
                    <div className="flex-1 space-y-3">
                        <Skeleton className="h-8 w-52" />
                        <Skeleton className="h-4 w-36" />
                    </div>
                </div>
            </main>
        );
    }

    if (!user || error) {
        return (
            <main className="mx-auto flex min-h-screen max-w-3xl flex-col items-center justify-center px-4 text-center">
                <div className="flex h-14 w-14 items-center justify-center rounded-full border bg-muted/40">
                    <UserRound className="h-7 w-7 text-muted-foreground" />
                </div>
                <h1 className="mt-5 text-2xl font-semibold">User not found</h1>
                <p className="mt-2 text-sm text-muted-foreground">
                    {error ?? "This public user profile is unavailable."}
                </p>
                <Button asChild variant="outline" className="mt-6">
                    <Link href="/development">
                        <ArrowLeft className="h-4 w-4" />
                        Back to Development
                    </Link>
                </Button>
            </main>
        );
    }

    const displayName = user.displayName || fullName || user.username;
    const roles = user.roles.length > 0 ? user.roles : ["user"];

    return (
        <main className="min-h-screen bg-background">
            <section className="border-b px-4 pb-10 pt-24 sm:px-6 lg:px-8">
                <div className="mx-auto max-w-5xl">
                    <Button asChild variant="ghost" size="sm" className="mb-5">
                        <Link href="/development">
                            <ArrowLeft className="h-4 w-4" />
                            Back
                        </Link>
                    </Button>

                    <div
                        className="relative min-h-56 overflow-hidden rounded-lg border bg-muted"
                        style={user.coverUrl ? { backgroundImage: `url(${user.coverUrl})`, backgroundSize: "cover", backgroundPosition: "center" } : undefined}
                    >
                        <div className="absolute inset-0 bg-gradient-to-t from-background via-background/45 to-transparent" />
                        <div className="relative flex min-h-56 flex-col justify-end p-5 sm:p-7">
                            <Avatar className="h-24 w-24 border-4 border-background">
                                <AvatarImage src={user.avatarUrl || undefined} alt={displayName} />
                                <AvatarFallback className="text-2xl font-semibold">
                                    {getInitials(user, user.username)}
                                </AvatarFallback>
                            </Avatar>
                        </div>
                    </div>

                    <div className="mt-6 flex flex-col gap-5 sm:flex-row sm:items-start sm:justify-between">
                        <div className="min-w-0 space-y-2">
                            <div className="flex flex-wrap items-center gap-2">
                                <h1 className="text-3xl font-semibold tracking-tight">{displayName}</h1>
                                {user.verifiedBadge ? (
                                    <Badge variant="secondary" className="gap-1">
                                        <ShieldCheck className="h-3.5 w-3.5" />
                                        Verified
                                    </Badge>
                                ) : null}
                            </div>
                            <p className="text-sm text-muted-foreground">@{user.username}</p>
                            {fullName ? (
                                <p className="text-sm">
                                    {fullName}
                                </p>
                            ) : null}
                            {user.bio ? (
                                <p className="max-w-2xl whitespace-pre-wrap text-sm leading-6 text-muted-foreground">
                                    {user.bio}
                                </p>
                            ) : null}
                        </div>

                        <div className="flex flex-wrap gap-2">
                            {roles.map((role) => (
                                <Badge key={role} variant="outline">
                                    {formatRole(role)}
                                </Badge>
                            ))}
                        </div>
                    </div>
                </div>
            </section>

            <section className="px-4 py-8 sm:px-6 lg:px-8">
                <div className="mx-auto grid max-w-5xl gap-3 sm:grid-cols-2">
                    <div className="rounded-lg border bg-card/70 p-4">
                        <div className="flex items-center gap-2 text-sm font-medium">
                            <CalendarDays className="h-4 w-4 text-primary" />
                            Joined
                        </div>
                        <p className="mt-2 text-sm text-muted-foreground">{formatDate(user.createdAt)}</p>
                    </div>

                    <div className="rounded-lg border bg-card/70 p-4">
                        <div className="flex items-center gap-2 text-sm font-medium">
                            <UserRound className="h-4 w-4 text-primary" />
                            Public profile
                        </div>
                        <p className="mt-2 break-all text-sm text-muted-foreground">/user/{user.username}</p>
                    </div>
                </div>
            </section>
        </main>
    );
}
