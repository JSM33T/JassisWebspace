"use client";

import { useEffect, useState } from "react";
import { Users, X } from "lucide-react";
import * as z from "zod";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Dialog, DialogClose, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
export const authorSelectionSchema = z.array(z.object({
    userId: z.string(),
    username: z.string(),
    displayName: z.string().nullish(),
}));

type AuthorOption = z.infer<typeof authorSelectionSchema>[number];
type LoadAuthors = (search: string | undefined, page: { skip: number; take: number }) => Promise<AuthorOption[]>;

interface AuthorPickerProps {
    authors: AuthorOption[];
    onApply?: (authors: AuthorOption[]) => void;
    loadAuthors: LoadAuthors;
    subject: "post" | "album";
    disabled?: boolean;
}

type AuthorResults = {
    authors: AuthorOption[];
    status: "loading" | "ready" | "error";
    hasMore: boolean;
};

const pageSize = 25;
const initialResults: AuthorResults = { authors: [], status: "loading", hasMore: false };

function authorName(author: AuthorOption) {
    return author.displayName?.trim() || author.username;
}

export function AuthorPicker({ authors, onApply, loadAuthors, subject, disabled }: AuthorPickerProps) {
    return (
        <div className="space-y-2">
            <h4 className="text-sm font-medium">Authors</h4>
            {authors.length > 0 ? (
                <ul aria-label="Assigned authors" className="flex flex-wrap gap-1.5">
                    {authors.map((author) => (
                        <li key={author.userId} className="min-w-0 max-w-full">
                            <Badge variant="secondary" className="h-auto max-w-full whitespace-normal wrap-anywhere">
                                {authorName(author)}
                            </Badge>
                        </li>
                    ))}
                </ul>
            ) : (
                <p className="text-sm text-muted-foreground">No authors assigned.</p>
            )}
            {onApply && (
                <AuthorDialog authors={authors} onApply={onApply} loadAuthors={loadAuthors} subject={subject} disabled={disabled} />
            )}
        </div>
    );
}

type AuthorDialogProps = AuthorPickerProps & Required<Pick<AuthorPickerProps, "onApply">>;

function AuthorDialog({ authors, onApply, loadAuthors, subject, disabled }: AuthorDialogProps) {
    const [open, setOpen] = useState(false);
    const [draft, setDraft] = useState<AuthorOption[]>([]);
    const [search, setSearch] = useState("");
    const [skip, setSkip] = useState(0);
    const [retry, setRetry] = useState(0);
    const [results, setResults] = useState(initialResults);

    useEffect(() => {
        if (!open) return;

        let active = true;
        const query = search.trim();
        const timeout = setTimeout(async () => {
            try {
                const page = await loadAuthors(query || undefined, { skip, take: pageSize + 1 });
                if (!active) return;

                setResults((current) => {
                    const previous = skip === 0 ? [] : current.authors;
                    const seen = new Set(previous.map((author) => author.userId));
                    const next = page.slice(0, pageSize).filter((author) => !seen.has(author.userId));
                    return { authors: [...previous, ...next], status: "ready", hasMore: page.length > pageSize };
                });
            } catch (error) {
                if (!active) return;
                console.error("Failed to load authors", error);
                setResults((current) => ({ ...current, status: "error" }));
            }
        }, query && skip === 0 ? 250 : 0);

        return () => {
            active = false;
            clearTimeout(timeout);
        };
    }, [loadAuthors, open, search, skip, retry]);

    function changeOpen(nextOpen: boolean) {
        if (nextOpen) {
            setDraft(authors);
            setSearch("");
            setSkip(0);
            setResults(initialResults);
        }
        setOpen(nextOpen);
    }

    function changeSearch(value: string) {
        setSearch(value);
        setSkip(0);
        setResults(initialResults);
    }

    function changeSelection({ userId, username, displayName }: AuthorOption, selected: boolean) {
        setDraft((current) => selected
            ? [...current, { userId, username, displayName }]
            : current.filter((author) => author.userId !== userId));
    }

    function loadNextPage() {
        setResults((current) => ({ ...current, status: "loading" }));
        setSkip((current) => current + pageSize);
    }

    function retryPage() {
        setResults((current) => ({ ...current, status: "loading" }));
        setRetry((current) => current + 1);
    }

    return (
        <Dialog open={open} onOpenChange={changeOpen}>
            <DialogTrigger asChild>
                <Button type="button" variant="outline" disabled={disabled}>
                    <Users />
                    Manage authors
                </Button>
            </DialogTrigger>
            <DialogContent className="max-h-[calc(100dvh-2rem)] gap-4 overflow-y-auto p-4 sm:max-w-xl sm:p-6">
                <DialogHeader className="pr-10">
                    <DialogTitle className="text-lg font-semibold">Manage authors</DialogTitle>
                    <DialogDescription>Choose who is credited on this {subject}.</DialogDescription>
                </DialogHeader>

                <div className="space-y-2">
                    <h3 className="font-medium">Selected authors</h3>
                    {draft.length > 0 ? (
                        <ul aria-label="Selected authors" className="flex max-h-28 flex-wrap items-start gap-1.5 overflow-y-auto p-1">
                            {draft.map((author) => (
                                <li key={author.userId} className="min-w-0 max-w-full">
                                    <Badge asChild variant="secondary" className="h-auto max-w-full gap-0.5 pr-0.5 whitespace-normal">
                                        <span>
                                            <span className="wrap-anywhere">{authorName(author)}</span>
                                            <Button
                                                type="button"
                                                size="icon-xs"
                                                variant="ghost"
                                                aria-label={`Remove ${authorName(author)}`}
                                                onClick={() => changeSelection(author, false)}
                                            >
                                                <X />
                                            </Button>
                                        </span>
                                    </Badge>
                                </li>
                            ))}
                        </ul>
                    ) : (
                        <p className="text-muted-foreground">No authors selected.</p>
                    )}
                </div>

                <div className="space-y-2">
                    <Input
                        type="search"
                        aria-label="Search authors"
                        placeholder="Search authors…"
                        value={search}
                        onChange={(event) => changeSearch(event.target.value)}
                        autoFocus
                    />
                    {results.authors.length > 0 && (
                        <ul aria-label="Available authors" className="max-h-[min(34dvh,20rem)] divide-y overflow-y-auto rounded-lg border">
                            {results.authors.map((author) => (
                                <li key={author.userId}>
                                    <label className="flex cursor-pointer items-center gap-3 px-3 py-2 hover:bg-muted">
                                        <input
                                            type="checkbox"
                                            checked={draft.some((selected) => selected.userId === author.userId)}
                                            onChange={(event) => changeSelection(author, event.target.checked)}
                                            className="size-4 shrink-0 accent-primary"
                                        />
                                        <span className="min-w-0 wrap-anywhere">
                                            <span className="block font-medium">{authorName(author)}</span>
                                            <span className="block text-xs text-muted-foreground">@{author.username}</span>
                                        </span>
                                    </label>
                                </li>
                            ))}
                        </ul>
                    )}
                    {results.status === "loading" && <p role="status" className="text-muted-foreground">Loading authors…</p>}
                    {results.status === "error" && (
                        <div className="flex flex-wrap items-center justify-between gap-2">
                            <p role="alert" className="text-destructive">Could not load authors.</p>
                            <Button type="button" variant="outline" size="sm" onClick={retryPage}>Try again</Button>
                        </div>
                    )}
                    {results.status === "ready" && results.authors.length === 0 && (
                        <p className="text-muted-foreground">No authors found.</p>
                    )}
                    {results.status === "ready" && results.hasMore && (
                        <Button type="button" variant="outline" size="sm" onClick={loadNextPage}>Load more authors</Button>
                    )}
                </div>

                <DialogFooter>
                    <DialogClose asChild><Button type="button" variant="outline">Cancel</Button></DialogClose>
                    <DialogClose asChild><Button type="button" onClick={() => onApply(draft)}>Apply selection</Button></DialogClose>
                </DialogFooter>
            </DialogContent>
        </Dialog>
    );
}
