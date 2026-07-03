"use client";

import { FormEvent, useCallback, useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import {
    ArrowUpRight,
    CheckCircle2,
    CircleDot,
    GitPullRequest,
    MessageSquarePlus,
    RefreshCcw,
    Send,
    Tag,
    X,
} from "lucide-react";
import { toast } from "sonner";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { AuthorModal } from "@/components/blog/AuthorModal";
import {
    DevelopmentProgressLayer,
    issueProgressLevel,
    suggestionProgressLevel,
} from "@/components/development/development-progress-layer";
import { Input } from "@/components/ui/input";
import { Skeleton } from "@/components/ui/skeleton";
import { Textarea } from "@/components/ui/textarea";
import { useUser } from "@/contexts/UserContext";
import { buildAuthRequiredLoginHref } from "@/lib/auth-redirect";
import { ApiError } from "@/lib/api/types";
import { developmentService } from "@/lib/api/development.service";
import {
    DevelopmentIssue,
    DevelopmentNote,
    DevelopmentRelease,
    DevelopmentSuggestion,
    DevelopmentSummary,
} from "@/lib/api/development.types";
import { cn } from "@/lib/utils";

type DevelopmentView = "all" | "suggestions" | "issues" | "releases" | "notes";
type FeedItem =
    | { kind: "note"; date: string; item: DevelopmentNote }
    | { kind: "release"; date: string; item: DevelopmentRelease }
    | { kind: "issue"; date: string; item: DevelopmentIssue }
    | { kind: "suggestion"; date: string; item: DevelopmentSuggestion };

const TITLE_LIMIT = 180;
const BODY_LIMIT = 5000;
const views: Array<{ id: DevelopmentView; label: string }> = [
    { id: "all", label: "All" },
    { id: "suggestions", label: "Suggestions" },
    { id: "issues", label: "Issues" },
    { id: "releases", label: "Releases" },
    { id: "notes", label: "Notes" },
];

function formatDate(value: string | null | undefined) {
    if (!value) return "No date";
    return new Intl.DateTimeFormat(undefined, { month: "short", day: "numeric", year: "numeric" }).format(new Date(value));
}

function kindLabel(kind: FeedItem["kind"]) {
    if (kind === "note") return "Note";
    if (kind === "release") return "Release";
    if (kind === "issue") return "Issue";
    return "Suggestion";
}

function kindBadgeVariant(kind: FeedItem["kind"]) {
    if (kind === "issue") return "outline" as const;
    if (kind === "release") return "default" as const;
    if (kind === "suggestion") return "secondary" as const;
    return "outline" as const;
}

function itemTitle(entry: FeedItem) {
    if (entry.kind === "issue") return entry.item.title;
    if (entry.kind === "release") return entry.item.name;
    return entry.item.title;
}

function itemBody(entry: FeedItem) {
    if (entry.kind === "issue") return entry.item.body;
    if (entry.kind === "release") return entry.item.body;
    return entry.item.body;
}

function itemHref(entry: FeedItem) {
    if (entry.kind === "issue") return entry.item.url;
    if (entry.kind === "release") return entry.item.url;
    if (entry.kind === "suggestion") return entry.item.githubIssueUrl;
    return null;
}

function itemMeta(entry: FeedItem) {
    if (entry.kind === "issue") {
        return `#${entry.item.number} - ${entry.item.state} - updated ${formatDate(entry.item.updatedAt)}`;
    }

    if (entry.kind === "release") {
        return `${entry.item.tagName} - ${formatDate(entry.item.publishedAt ?? entry.item.createdAt)}`;
    }

    if (entry.kind === "suggestion") {
        return `${entry.item.status} - ${formatDate(entry.item.reviewedAt ?? entry.item.createdAt)}`;
    }

    return `${entry.item.category}${entry.item.version ? ` - ${entry.item.version}` : ""} - ${formatDate(entry.item.publishedAt ?? entry.item.createdAt)}`;
}

function KindIcon({ kind }: { kind: FeedItem["kind"] }) {
    if (kind === "issue") return <CircleDot className="h-4 w-4" />;
    if (kind === "release") return <Tag className="h-4 w-4" />;
    if (kind === "suggestion") return <MessageSquarePlus className="h-4 w-4" />;
    return <CheckCircle2 className="h-4 w-4" />;
}

function FeedRow({
    entry,
    onUserClick,
}: {
    entry: FeedItem;
    onUserClick: (userId: string, username: string) => void;
}) {
    const href = itemHref(entry);
    const body = itemBody(entry);
    const progressLevel =
        entry.kind === "issue" ? issueProgressLevel(entry.item.state) :
        entry.kind === "suggestion" ? suggestionProgressLevel(entry.item.status) :
        null;

    return (
        <article className="grid gap-3 rounded-lg border bg-card/70 p-4 sm:grid-cols-[auto_minmax(0,1fr)_auto]">
            <div className="flex h-9 w-9 items-center justify-center rounded-md border bg-background text-muted-foreground">
                <KindIcon kind={entry.kind} />
            </div>
            <div className="min-w-0 space-y-2">
                <div className="flex flex-wrap items-center gap-2">
                    <Badge variant={kindBadgeVariant(entry.kind)}>{kindLabel(entry.kind)}</Badge>
                    <span className="text-xs text-muted-foreground">{itemMeta(entry)}</span>
                </div>
                <h2 className="text-base font-semibold leading-6">{itemTitle(entry)}</h2>
                {body ? (
                    <p className="line-clamp-3 whitespace-pre-wrap text-sm leading-6 text-muted-foreground">{body}</p>
                ) : null}
                {progressLevel ? <DevelopmentProgressLayer level={progressLevel} /> : null}
                {entry.kind === "suggestion" ? (
                    <button
                        type="button"
                        className="text-left text-xs font-medium text-primary underline-offset-4 hover:underline"
                        onClick={() => onUserClick(entry.item.userId, entry.item.username)}
                    >
                        {entry.item.userDisplayName ?? entry.item.username}
                    </button>
                ) : null}
            </div>
            {href ? (
                <Button asChild variant="ghost" size="icon-sm" aria-label={`Open ${kindLabel(entry.kind).toLowerCase()}`}>
                    <Link href={href} target="_blank" rel="noreferrer">
                        <ArrowUpRight className="h-4 w-4" />
                    </Link>
                </Button>
            ) : null}
        </article>
    );
}

export default function DevelopmentPage() {
    const { isAuthenticated } = useUser();
    const pathname = usePathname();
    const [view, setView] = useState<DevelopmentView>("all");
    const [summary, setSummary] = useState<DevelopmentSummary | null>(null);
    const [issues, setIssues] = useState<DevelopmentIssue[]>([]);
    const [releases, setReleases] = useState<DevelopmentRelease[]>([]);
    const [notes, setNotes] = useState<DevelopmentNote[]>([]);
    const [suggestions, setSuggestions] = useState<DevelopmentSuggestion[]>([]);
    const [loading, setLoading] = useState(true);
    const [refreshing, setRefreshing] = useState(false);
    const [showSuggestionForm, setShowSuggestionForm] = useState(false);
    const [issueState, setIssueState] = useState<"open" | "closed" | "all">("open");
    const [issueSearch, setIssueSearch] = useState("");
    const [title, setTitle] = useState("");
    const [body, setBody] = useState("");
    const [submitError, setSubmitError] = useState<string | null>(null);
    const [submitting, setSubmitting] = useState(false);
    const [selectedUser, setSelectedUser] = useState<{ userId: string; username: string } | null>(null);
    const [userModalOpen, setUserModalOpen] = useState(false);

    const titleText = title.trim();
    const bodyText = body.trim();
    const titleError = title.length > 0 && titleText.length < 3 ? "Use at least 3 characters." : null;
    const bodyError = body.length > 0 && bodyText.length < 10 ? "Use at least 10 characters." : null;
    const canSubmit =
        isAuthenticated &&
        titleText.length >= 3 &&
        title.length <= TITLE_LIMIT &&
        bodyText.length >= 10 &&
        body.length <= BODY_LIMIT &&
        !submitting;

    const loadSummary = useCallback(async () => {
        const data = await developmentService.getSummary();
        setSummary(data);
        setIssues(data.latestIssues);
        setReleases(data.latestReleases);
        setNotes(data.notes);
        setSuggestions(data.suggestions);
    }, []);

    useEffect(() => {
        let ignore = false;
        void (async () => {
            try {
                const data = await developmentService.getSummary();
                if (ignore) return;
                setSummary(data);
                setIssues(data.latestIssues);
                setReleases(data.latestReleases);
                setNotes(data.notes);
                setSuggestions(data.suggestions);
            } catch (error) {
                console.error("Failed to load development updates", error);
                toast.error("Development updates are unavailable");
            } finally {
                if (!ignore) setLoading(false);
            }
        })();

        return () => {
            ignore = true;
        };
    }, []);

    useEffect(() => {
        if (view !== "issues") return;
        let ignore = false;
        void (async () => {
            try {
                const data = await developmentService.getIssues({
                    state: issueState,
                    search: issueSearch || undefined,
                    pageSize: 30,
                });
                if (!ignore) setIssues(data);
            } catch (error) {
                console.error("Failed to load issues", error);
                toast.error("Could not load issues");
            }
        })();

        return () => {
            ignore = true;
        };
    }, [issueSearch, issueState, view]);

    useEffect(() => {
        if (view !== "releases" && view !== "notes") return;
        let ignore = false;
        void (async () => {
            try {
                const data = await developmentService.getReleases({ pageSize: 30 });
                if (!ignore) {
                    setReleases(data.releases);
                    setNotes(data.notes);
                }
            } catch (error) {
                console.error("Failed to load releases", error);
                toast.error("Could not load releases");
            }
        })();

        return () => {
            ignore = true;
        };
    }, [view]);

    useEffect(() => {
        if (view !== "suggestions") return;
        let ignore = false;
        void (async () => {
            try {
                const data = await developmentService.getSuggestions({ pageSize: 30 });
                if (!ignore) setSuggestions(data);
            } catch (error) {
                console.error("Failed to load suggestions", error);
                toast.error("Could not load suggestions");
            }
        })();

        return () => {
            ignore = true;
        };
    }, [view]);

    const handleRefresh = async () => {
        try {
            setRefreshing(true);
            await loadSummary();
            toast.success("Development updates refreshed");
        } catch (error) {
            console.error("Failed to refresh development updates", error);
            toast.error("Refresh failed");
        } finally {
            setRefreshing(false);
        }
    };

    const handleSubmitSuggestion = async (event: FormEvent<HTMLFormElement>) => {
        event.preventDefault();
        setSubmitError(null);

        if (!isAuthenticated) {
            setSubmitError("Please log in before posting a suggestion.");
            return;
        }

        if (!canSubmit) {
            setSubmitError("Please fix the highlighted fields before sending.");
            return;
        }

        try {
            setSubmitting(true);
            await developmentService.createSuggestion({ title: titleText, body: bodyText });
            setTitle("");
            setBody("");
            setShowSuggestionForm(false);
            toast.success("Suggestion sent for review");
        } catch (error) {
            console.error("Failed to submit suggestion", error);
            setSubmitError(error instanceof ApiError ? error.message : "Suggestion could not be saved. Please try again.");
        } finally {
            setSubmitting(false);
        }
    };

    const openUserPanel = (userId: string, username: string) => {
        setSelectedUser({ userId, username });
        setUserModalOpen(true);
    };

    const allItems = useMemo<FeedItem[]>(() => {
        const items: FeedItem[] = [
            ...notes.map((item) => ({ kind: "note" as const, date: item.publishedAt ?? item.createdAt, item })),
            ...releases.map((item) => ({ kind: "release" as const, date: item.publishedAt ?? item.createdAt, item })),
            ...suggestions.map((item) => ({ kind: "suggestion" as const, date: item.reviewedAt ?? item.createdAt, item })),
            ...issues.map((item) => ({ kind: "issue" as const, date: item.updatedAt, item })),
        ];

        return items.sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());
    }, [issues, notes, releases, suggestions]);

    const visibleItems = useMemo(() => {
        if (view === "all") return allItems;
        return allItems.filter((entry) => {
            if (view === "suggestions") return entry.kind === "suggestion";
            if (view === "issues") return entry.kind === "issue";
            if (view === "releases") return entry.kind === "release";
            return entry.kind === "note";
        });
    }, [allItems, view]);

    if (loading) {
        return (
            <main className="mx-auto max-w-5xl px-4 pb-16 pt-28 sm:px-6 lg:px-8">
                <Skeleton className="h-20 w-full" />
                <div className="mt-6 space-y-3">
                    {Array.from({ length: 6 }).map((_, index) => (
                        <Skeleton key={index} className="h-28 w-full" />
                    ))}
                </div>
            </main>
        );
    }

    return (
        <main className="mx-auto max-w-5xl px-4 pb-16 pt-28 sm:px-6 lg:px-8">
            <div className="flex flex-col gap-4 border-b pb-6 sm:flex-row sm:items-end sm:justify-between">
                <div className="space-y-2">
                    <div className="flex flex-wrap items-center gap-2">
                        <Badge variant="outline">
                            <GitPullRequest className="h-3 w-3" />
                            JSM33T/JassisWebspace
                        </Badge>
                        <span className="text-xs text-muted-foreground">
                            {summary?.openIssueCount ?? 0} open issues
                        </span>
                    </div>
                    <h1 className="text-3xl font-semibold tracking-tight">Development</h1>
                    <p className="max-w-2xl text-sm leading-6 text-muted-foreground">
                        A simple list of releases, notes, issues, and reviewed suggestions.
                    </p>
                </div>
                <div className="flex flex-wrap gap-2">
                    <Button variant="outline" onClick={handleRefresh} disabled={refreshing}>
                        <RefreshCcw className={cn("h-4 w-4", refreshing && "animate-spin")} />
                        Refresh
                    </Button>
                    <Button onClick={() => setShowSuggestionForm((current) => !current)}>
                        {showSuggestionForm ? <X className="h-4 w-4" /> : <MessageSquarePlus className="h-4 w-4" />}
                        {showSuggestionForm ? "Close" : "Add suggestion"}
                    </Button>
                </div>
            </div>

            {showSuggestionForm ? (
                <section className="mt-6 rounded-lg border bg-card/70 p-4">
                    <form className="space-y-4" onSubmit={handleSubmitSuggestion} noValidate>
                        <div className="grid gap-4 md:grid-cols-[minmax(0,1fr)_12rem]">
                            <div className="space-y-1.5">
                                <label htmlFor="suggestion-title" className="text-sm font-medium">Title</label>
                                <Input
                                    id="suggestion-title"
                                    value={title}
                                    onChange={(event) => {
                                        setTitle(event.target.value);
                                        setSubmitError(null);
                                    }}
                                    placeholder="Short summary"
                                    maxLength={TITLE_LIMIT}
                                    aria-invalid={Boolean(titleError)}
                                    aria-describedby="suggestion-title-help"
                                />
                                <div id="suggestion-title-help" className="flex justify-between gap-3 text-xs">
                                    <span className={titleError ? "text-destructive" : "text-muted-foreground"}>
                                        {titleError ?? "3 characters minimum."}
                                    </span>
                                    <span className="text-muted-foreground">{title.length}/{TITLE_LIMIT}</span>
                                </div>
                            </div>
                            <div className="rounded-md border bg-muted/30 p-3 text-xs leading-5 text-muted-foreground">
                                Suggestions are reviewed before they appear here. Admins can promote approved ideas to GitHub issues.
                            </div>
                        </div>

                        <div className="space-y-1.5">
                            <label htmlFor="suggestion-body" className="text-sm font-medium">Details</label>
                            <Textarea
                                id="suggestion-body"
                                value={body}
                                onChange={(event) => {
                                    setBody(event.target.value);
                                    setSubmitError(null);
                                }}
                                placeholder="What should change, and why?"
                                className="min-h-32"
                                maxLength={BODY_LIMIT}
                                aria-invalid={Boolean(bodyError)}
                                aria-describedby="suggestion-body-help"
                            />
                            <div id="suggestion-body-help" className="flex justify-between gap-3 text-xs">
                                <span className={bodyError ? "text-destructive" : "text-muted-foreground"}>
                                    {bodyError ?? "10 characters minimum."}
                                </span>
                                <span className="text-muted-foreground">{body.length}/{BODY_LIMIT}</span>
                            </div>
                        </div>

                        {!isAuthenticated ? (
                            <p className="text-sm text-muted-foreground">
                                <Link href={buildAuthRequiredLoginHref(pathname)} className="font-medium underline underline-offset-2">
                                    Log in
                                </Link>
                                {" "}to post a suggestion.
                            </p>
                        ) : null}
                        {submitError ? <p className="text-sm text-destructive">{submitError}</p> : null}
                        <div className="flex justify-end">
                            <Button type="submit" disabled={!canSubmit}>
                                <Send className="h-4 w-4" />
                                {submitting ? "Sending..." : "Send suggestion"}
                            </Button>
                        </div>
                    </form>
                </section>
            ) : null}

            <div className="mt-6 flex flex-wrap gap-2 rounded-lg border bg-card/60 p-1">
                {views.map((item) => (
                    <Button
                        key={item.id}
                        type="button"
                        variant={view === item.id ? "default" : "ghost"}
                        size="sm"
                        onClick={() => setView(item.id)}
                    >
                        {item.label}
                    </Button>
                ))}
            </div>

            {view === "issues" ? (
                <div className="mt-4 flex flex-col gap-3 rounded-lg border bg-card/60 p-3 sm:flex-row">
                    <div className="grid grid-cols-3 gap-1 rounded-md border bg-muted/30 p-1">
                        {(["open", "closed", "all"] as const).map((state) => (
                            <Button
                                key={state}
                                type="button"
                                size="sm"
                                variant={issueState === state ? "default" : "ghost"}
                                onClick={() => setIssueState(state)}
                            >
                                {state}
                            </Button>
                        ))}
                    </div>
                    <Input
                        value={issueSearch}
                        onChange={(event) => setIssueSearch(event.target.value)}
                        placeholder="Search issue text"
                        className="sm:max-w-sm"
                    />
                </div>
            ) : null}

            <section className="mt-4 space-y-3">
                {visibleItems.length > 0 ? (
                    visibleItems.map((entry) => {
                        const key =
                            entry.kind === "issue" ? `issue-${entry.item.number}` :
                            entry.kind === "release" ? `release-${entry.item.id}` :
                            `${entry.kind}-${entry.item.id}`;

                        return <FeedRow key={key} entry={entry} onUserClick={openUserPanel} />;
                    })
                ) : (
                    <div className="rounded-lg border bg-card/70 p-8 text-center text-sm text-muted-foreground">
                        Nothing to show here yet.
                    </div>
                )}
            </section>

            {selectedUser ? (
                <AuthorModal
                    isOpen={userModalOpen}
                    onClose={() => setUserModalOpen(false)}
                    userId={selectedUser.userId}
                    username={selectedUser.username}
                    showMoreFromAuthor={false}
                />
            ) : null}
        </main>
    );
}
