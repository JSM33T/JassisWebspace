"use client";

import { FormEvent, useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { Archive, ArrowUpRight, Check, GitPullRequest, Pencil, Plus, Send, Trash2, X } from "lucide-react";
import { toast } from "sonner";

import { adminDevelopmentService } from "@/lib/api/admin-development.service";
import { ApiError } from "@/lib/api/types";
import {
    DevelopmentNote,
    DevelopmentSuggestion,
    DevelopmentSuggestionStatus,
} from "@/lib/api/development.types";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { AuthorModal } from "@/components/blog/AuthorModal";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import {
    AlertDialog,
    AlertDialogAction,
    AlertDialogCancel,
    AlertDialogContent,
    AlertDialogDescription,
    AlertDialogFooter,
    AlertDialogHeader,
    AlertDialogMedia,
    AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import {
    DevelopmentProgressLayer,
    suggestionProgressLevel,
} from "@/components/development/development-progress-layer";
import {
    Dialog,
    DialogContent,
    DialogDescription,
    DialogFooter,
    DialogHeader,
    DialogTitle,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import {
    Select,
    SelectContent,
    SelectItem,
    SelectTrigger,
    SelectValue,
} from "@/components/ui/select";
import { Skeleton } from "@/components/ui/skeleton";
import { Switch } from "@/components/ui/switch";
import { Textarea } from "@/components/ui/textarea";
import {
    Table,
    TableBody,
    TableCell,
    TableHead,
    TableHeader,
    TableRow,
} from "@/components/ui/table";

const statuses: Array<DevelopmentSuggestionStatus | "all"> = ["all", "pending", "approved", "rejected", "archived", "promoted"];
const editableStatuses: DevelopmentSuggestionStatus[] = ["pending", "approved", "rejected", "archived", "promoted"];

const emptyNoteForm = {
    title: "",
    body: "",
    version: "",
    category: "update",
    isPublished: true,
};

const emptySuggestionForm = {
    title: "",
    body: "",
    status: "pending" as DevelopmentSuggestionStatus,
};

type PendingAction =
    | { type: "promote"; suggestion: DevelopmentSuggestion }
    | { type: "closeIssue"; suggestion: DevelopmentSuggestion }
    | { type: "deleteSuggestion"; suggestion: DevelopmentSuggestion }
    | { type: "deleteNote"; note: DevelopmentNote };

function formatDate(value: string | null | undefined) {
    if (!value) return "N/A";
    return new Date(value).toLocaleString();
}

function statusVariant(status: DevelopmentSuggestionStatus) {
    if (status === "promoted") return "default" as const;
    if (status === "rejected" || status === "archived") return "destructive" as const;
    if (status === "approved") return "secondary" as const;
    return "outline" as const;
}

function getSuggestionFormError(title: string, body: string) {
    const titleText = title.trim();
    const bodyText = body.trim();

    if (titleText.length < 3) return "Title must be at least 3 characters.";
    if (titleText.length > 180) return "Title must be 180 characters or fewer.";
    if (bodyText.length < 10) return "Body must be at least 10 characters.";
    if (bodyText.length > 5000) return "Body must be 5000 characters or fewer.";
    return null;
}

function getPendingActionCopy(action: PendingAction) {
    if (action.type === "promote") {
        return {
            title: "Promote this suggestion?",
            description: `This will create a GitHub issue from "${action.suggestion.title}" and link it back to the suggestion.`,
            confirmLabel: "Yes, promote",
            busyLabel: "Promoting...",
            icon: GitPullRequest,
            destructive: false,
        };
    }

    if (action.type === "closeIssue") {
        return {
            title: "Close this GitHub issue?",
            description: `This will close GitHub issue #${action.suggestion.githubIssueNumber} and archive "${action.suggestion.title}" locally.`,
            confirmLabel: "Yes, close it",
            busyLabel: "Closing...",
            icon: X,
            destructive: true,
        };
    }

    if (action.type === "deleteSuggestion") {
        const hasIssue = Boolean(action.suggestion.githubIssueNumber || action.suggestion.githubIssueUrl);
        return {
            title: "Delete this suggestion?",
            description: hasIssue
                ? `This deletes "${action.suggestion.title}" locally. The linked GitHub issue will stay on GitHub.`
                : `This permanently deletes "${action.suggestion.title}" from the local development wall.`,
            confirmLabel: "Yes, delete",
            busyLabel: "Deleting...",
            icon: Trash2,
            destructive: true,
        };
    }

    return {
        title: "Delete this note?",
        description: `This permanently removes "${action.note.title}" from the development wall.`,
        confirmLabel: "Yes, delete",
        busyLabel: "Deleting...",
        icon: Trash2,
        destructive: true,
    };
}

export default function AdminDevelopmentPage() {
    const [suggestions, setSuggestions] = useState<DevelopmentSuggestion[]>([]);
    const [notes, setNotes] = useState<DevelopmentNote[]>([]);
    const [status, setStatus] = useState<DevelopmentSuggestionStatus | "all">("pending");
    const [loading, setLoading] = useState(true);
    const [busyId, setBusyId] = useState<string | null>(null);
    const [savingNote, setSavingNote] = useState(false);
    const [editingNoteId, setEditingNoteId] = useState<string | null>(null);
    const [noteForm, setNoteForm] = useState(emptyNoteForm);
    const [editingSuggestion, setEditingSuggestion] = useState<DevelopmentSuggestion | null>(null);
    const [suggestionForm, setSuggestionForm] = useState(emptySuggestionForm);
    const [selectedUser, setSelectedUser] = useState<{ userId: string; username: string } | null>(null);
    const [userModalOpen, setUserModalOpen] = useState(false);
    const [pendingAction, setPendingAction] = useState<PendingAction | null>(null);

    useEffect(() => {
        let ignore = false;
        void (async () => {
            try {
                const [suggestionData, noteData] = await Promise.all([
                    adminDevelopmentService.getSuggestions({ status, pageSize: 50 }),
                    adminDevelopmentService.getNotes(),
                ]);
                if (ignore) return;
                setSuggestions(suggestionData);
                setNotes(noteData);
            } catch (error) {
                console.error("Failed to load development admin data", error);
                toast.error("Development admin data could not be loaded");
            } finally {
                if (!ignore) setLoading(false);
            }
        })();
        return () => {
            ignore = true;
        };
    }, [status]);

    const publicNotes = useMemo(() => notes.filter((note) => note.isPublished).length, [notes]);
    const suggestionFormError = useMemo(
        () => editingSuggestion ? getSuggestionFormError(suggestionForm.title, suggestionForm.body) : null,
        [editingSuggestion, suggestionForm.body, suggestionForm.title]
    );
    const pendingActionBusy = pendingAction
        ? busyId === ("note" in pendingAction ? pendingAction.note.id : pendingAction.suggestion.id)
        : false;

    const updateStatus = async (suggestion: DevelopmentSuggestion, nextStatus: DevelopmentSuggestionStatus) => {
        try {
            setBusyId(suggestion.id);
            const updated = await adminDevelopmentService.updateSuggestionStatus(suggestion.id, { status: nextStatus });
            setSuggestions((current) => current.map((item) => item.id === updated.id ? updated : item));
            toast.success(`Suggestion marked ${nextStatus}`);
        } catch (error) {
            console.error("Failed to update suggestion status", error);
            toast.error("Could not update suggestion");
        } finally {
            setBusyId(null);
        }
    };

    const openUserPanel = (userId: string, username: string) => {
        setSelectedUser({ userId, username });
        setUserModalOpen(true);
    };

    const promoteSuggestion = async (suggestion: DevelopmentSuggestion) => {
        try {
            setBusyId(suggestion.id);
            const updated = await adminDevelopmentService.promoteSuggestion(suggestion.id, {});
            setSuggestions((current) => current.map((item) => item.id === updated.id ? updated : item));
            toast.success("GitHub issue created");
            setPendingAction(null);
        } catch (error) {
            console.error("Failed to promote suggestion", error);
            toast.error(error instanceof ApiError ? error.message : "Could not promote suggestion");
        } finally {
            setBusyId(null);
        }
    };

    const editSuggestion = (suggestion: DevelopmentSuggestion) => {
        setEditingSuggestion(suggestion);
        setSuggestionForm({
            title: suggestion.title,
            body: suggestion.body,
            status: suggestion.status,
        });
    };

    const resetSuggestionForm = () => {
        setEditingSuggestion(null);
        setSuggestionForm(emptySuggestionForm);
    };

    const saveSuggestion = async (event: FormEvent<HTMLFormElement>) => {
        event.preventDefault();
        if (!editingSuggestion) return;

        const validationError = getSuggestionFormError(suggestionForm.title, suggestionForm.body);
        if (validationError) {
            toast.error(validationError);
            return;
        }

        try {
            setBusyId(editingSuggestion.id);
            const updated = await adminDevelopmentService.updateSuggestion(editingSuggestion.id, {
                title: suggestionForm.title.trim(),
                body: suggestionForm.body.trim(),
                status: suggestionForm.status,
            });
            setSuggestions((current) => current.map((item) => item.id === updated.id ? updated : item));
            toast.success("Suggestion updated");
            resetSuggestionForm();
        } catch (error) {
            console.error("Failed to update suggestion", error);
            toast.error(error instanceof ApiError ? error.message : "Could not update suggestion");
        } finally {
            setBusyId(null);
        }
    };

    const closePromotedIssue = async (suggestion: DevelopmentSuggestion) => {
        try {
            setBusyId(suggestion.id);
            const updated = await adminDevelopmentService.closePromotedIssue(suggestion.id);
            setSuggestions((current) => current.map((item) => item.id === updated.id ? updated : item));
            toast.success("GitHub issue closed and suggestion archived");
            setPendingAction(null);
        } catch (error) {
            console.error("Failed to close GitHub issue", error);
            toast.error(error instanceof ApiError ? error.message : "Could not close GitHub issue");
        } finally {
            setBusyId(null);
        }
    };

    const deleteSuggestion = async (suggestion: DevelopmentSuggestion) => {
        try {
            setBusyId(suggestion.id);
            await adminDevelopmentService.deleteSuggestion(suggestion.id);
            setSuggestions((current) => current.filter((item) => item.id !== suggestion.id));
            if (editingSuggestion?.id === suggestion.id) resetSuggestionForm();
            toast.success("Suggestion deleted");
            setPendingAction(null);
        } catch (error) {
            console.error("Failed to delete suggestion", error);
            toast.error(error instanceof ApiError ? error.message : "Could not delete suggestion");
        } finally {
            setBusyId(null);
        }
    };

    const editNote = (note: DevelopmentNote) => {
        setEditingNoteId(note.id);
        setNoteForm({
            title: note.title,
            body: note.body,
            version: note.version ?? "",
            category: note.category,
            isPublished: note.isPublished,
        });
    };

    const resetNoteForm = () => {
        setEditingNoteId(null);
        setNoteForm(emptyNoteForm);
    };

    const saveNote = async (event: FormEvent<HTMLFormElement>) => {
        event.preventDefault();
        const request = {
            title: noteForm.title,
            body: noteForm.body,
            version: noteForm.version || null,
            category: noteForm.category,
            isPublished: noteForm.isPublished,
            publishedAt: noteForm.isPublished ? new Date().toISOString() : null,
        };

        try {
            setSavingNote(true);
            if (editingNoteId) {
                const updated = await adminDevelopmentService.updateNote(editingNoteId, request);
                setNotes((current) => current.map((note) => note.id === updated.id ? updated : note));
                toast.success("Note updated");
            } else {
                const created = await adminDevelopmentService.createNote(request);
                setNotes((current) => [created, ...current]);
                toast.success("Note created");
            }
            resetNoteForm();
        } catch (error) {
            console.error("Failed to save development note", error);
            toast.error("Could not save note");
        } finally {
            setSavingNote(false);
        }
    };

    const deleteNote = async (note: DevelopmentNote) => {
        try {
            setBusyId(note.id);
            await adminDevelopmentService.deleteNote(note.id);
            setNotes((current) => current.filter((item) => item.id !== note.id));
            if (editingNoteId === note.id) resetNoteForm();
            toast.success("Note deleted");
            setPendingAction(null);
        } catch (error) {
            console.error("Failed to delete development note", error);
            toast.error("Could not delete note");
        } finally {
            setBusyId(null);
        }
    };

    const confirmPendingAction = async () => {
        if (!pendingAction) return;

        if (pendingAction.type === "promote") {
            await promoteSuggestion(pendingAction.suggestion);
            return;
        }

        if (pendingAction.type === "closeIssue") {
            await closePromotedIssue(pendingAction.suggestion);
            return;
        }

        if (pendingAction.type === "deleteSuggestion") {
            await deleteSuggestion(pendingAction.suggestion);
            return;
        }

        await deleteNote(pendingAction.note);
    };

    const pendingActionCopy = pendingAction ? getPendingActionCopy(pendingAction) : null;
    const PendingActionIcon = pendingActionCopy?.icon;

    return (
        <div className="space-y-8 p-8 pt-24">
            <div className="flex flex-col gap-4 lg:flex-row lg:items-end lg:justify-between">
                <div>
                    <h1 className="text-3xl font-bold tracking-tight">Development</h1>
                    <p className="text-muted-foreground">Review suggestions, publish release-wall notes, and promote work to GitHub.</p>
                </div>
                <Button asChild variant="outline">
                    <Link href="/development" target="_blank" rel="noreferrer">
                        Public wall
                        <ArrowUpRight className="h-4 w-4" />
                    </Link>
                </Button>
            </div>

            <div className="grid gap-4 md:grid-cols-3">
                <Card className="rounded-lg">
                    <CardHeader>
                        <CardTitle>Suggestions</CardTitle>
                    </CardHeader>
                    <CardContent className="text-3xl font-semibold">{suggestions.length}</CardContent>
                </Card>
                <Card className="rounded-lg">
                    <CardHeader>
                        <CardTitle>Notes</CardTitle>
                    </CardHeader>
                    <CardContent className="text-3xl font-semibold">{notes.length}</CardContent>
                </Card>
                <Card className="rounded-lg">
                    <CardHeader>
                        <CardTitle>Published Notes</CardTitle>
                    </CardHeader>
                    <CardContent className="text-3xl font-semibold">{publicNotes}</CardContent>
                </Card>
            </div>

            <div className="grid gap-8 xl:grid-cols-[minmax(0,1fr)_24rem]">
                <section className="space-y-4">
                    <div className="flex flex-wrap gap-2 rounded-lg border bg-card/60 p-2">
                        {statuses.map((item) => (
                            <Button
                                key={item}
                                type="button"
                                size="sm"
                                variant={status === item ? "default" : "ghost"}
                                onClick={() => setStatus(item)}
                            >
                                {item}
                            </Button>
                        ))}
                    </div>

                    <div className="rounded-md border bg-card">
                        <Table>
                            <TableHeader>
                                <TableRow>
                                    <TableHead>Suggestion</TableHead>
                                    <TableHead>Status</TableHead>
                                    <TableHead>Submitted</TableHead>
                                    <TableHead className="text-right">Actions</TableHead>
                                </TableRow>
                            </TableHeader>
                            <TableBody>
                                {loading ? (
                                    Array.from({ length: 5 }).map((_, index) => (
                                        <TableRow key={index}>
                                            <TableCell><Skeleton className="h-16 w-full" /></TableCell>
                                            <TableCell><Skeleton className="h-6 w-20" /></TableCell>
                                            <TableCell><Skeleton className="h-6 w-32" /></TableCell>
                                            <TableCell><Skeleton className="ml-auto h-8 w-48" /></TableCell>
                                        </TableRow>
                                    ))
                                ) : suggestions.length === 0 ? (
                                    <TableRow>
                                        <TableCell colSpan={4} className="h-24 text-center">No suggestions found.</TableCell>
                                    </TableRow>
                                ) : (
                                    suggestions.map((suggestion) => {
                                        const isBusy = busyId === suggestion.id;
                                        const isApproved = suggestion.status === "approved";
                                        const isPromoted = suggestion.status === "promoted" || Boolean(suggestion.githubIssueNumber || suggestion.githubIssueUrl);
                                        const canPromote = isApproved && !isPromoted;
                                        const canCloseIssue = suggestion.status === "promoted" && Boolean(suggestion.githubIssueNumber || suggestion.githubIssueUrl);

                                        return (
                                            <TableRow key={suggestion.id}>
                                                <TableCell className="max-w-xl">
                                                    <div className="space-y-2">
                                                        <div className="font-medium">{suggestion.title}</div>
                                                        <p className="line-clamp-3 whitespace-pre-wrap text-sm text-muted-foreground">{suggestion.body}</p>
                                                        <DevelopmentProgressLayer
                                                            level={suggestionProgressLevel(suggestion.status)}
                                                            className="max-w-md"
                                                        />
                                                        <button
                                                            type="button"
                                                            className="text-left text-xs font-medium text-primary underline-offset-4 hover:underline"
                                                            onClick={() => openUserPanel(suggestion.userId, suggestion.username)}
                                                        >
                                                            {suggestion.userDisplayName ?? suggestion.username}
                                                        </button>
                                                        {suggestion.githubIssueUrl ? (
                                                            <Button asChild variant="link" size="sm" className="h-auto p-0">
                                                                <Link href={suggestion.githubIssueUrl} target="_blank" rel="noreferrer">
                                                                    GitHub #{suggestion.githubIssueNumber}
                                                                    <ArrowUpRight className="h-3.5 w-3.5" />
                                                                </Link>
                                                            </Button>
                                                        ) : null}
                                                    </div>
                                                </TableCell>
                                                <TableCell>
                                                    <Badge variant={statusVariant(suggestion.status)}>{suggestion.status}</Badge>
                                                </TableCell>
                                                <TableCell className="text-sm text-muted-foreground">
                                                    {formatDate(suggestion.createdAt)}
                                                </TableCell>
                                                <TableCell>
                                                    <div className="flex flex-wrap justify-end gap-2">
                                                        <Button
                                                            type="button"
                                                            size="sm"
                                                            variant="outline"
                                                            disabled={isBusy}
                                                            onClick={() => editSuggestion(suggestion)}
                                                        >
                                                            <Pencil className="h-4 w-4" />
                                                            Edit
                                                        </Button>
                                                        {!isApproved && !isPromoted ? (
                                                            <Button
                                                                type="button"
                                                                size="sm"
                                                                variant="outline"
                                                                disabled={isBusy}
                                                                onClick={() => updateStatus(suggestion, "approved")}
                                                            >
                                                                <Check className="h-4 w-4" />
                                                                Approve
                                                            </Button>
                                                        ) : null}
                                                        {!isPromoted ? (
                                                            <Button
                                                                type="button"
                                                                size="sm"
                                                                variant={canPromote ? "default" : "outline"}
                                                                disabled={isBusy || !canPromote}
                                                                title={canPromote ? "Create a GitHub issue" : "Approve this suggestion before promoting it"}
                                                                onClick={() => setPendingAction({ type: "promote", suggestion })}
                                                            >
                                                                <GitPullRequest className="h-4 w-4" />
                                                                Promote
                                                            </Button>
                                                        ) : null}
                                                        {!isPromoted && suggestion.status !== "rejected" ? (
                                                            <Button
                                                                type="button"
                                                                size="sm"
                                                                variant="destructive"
                                                                disabled={isBusy}
                                                                onClick={() => updateStatus(suggestion, "rejected")}
                                                            >
                                                                <X className="h-4 w-4" />
                                                                Reject
                                                            </Button>
                                                        ) : null}
                                                        {suggestion.status !== "archived" && !canCloseIssue ? (
                                                            <Button
                                                                type="button"
                                                                size="sm"
                                                                variant="outline"
                                                                disabled={isBusy}
                                                                onClick={() => updateStatus(suggestion, "archived")}
                                                            >
                                                                <Archive className="h-4 w-4" />
                                                                Archive
                                                            </Button>
                                                        ) : null}
                                                        {isPromoted && suggestion.githubIssueUrl ? (
                                                            <Button asChild type="button" size="sm" variant="outline">
                                                                <Link href={suggestion.githubIssueUrl} target="_blank" rel="noreferrer">
                                                                    Open issue
                                                                    <ArrowUpRight className="h-4 w-4" />
                                                                </Link>
                                                            </Button>
                                                        ) : null}
                                                        {canCloseIssue ? (
                                                            <Button
                                                                type="button"
                                                                size="sm"
                                                                variant="destructive"
                                                                disabled={isBusy}
                                                                onClick={() => setPendingAction({ type: "closeIssue", suggestion })}
                                                            >
                                                                <X className="h-4 w-4" />
                                                                Close issue
                                                            </Button>
                                                        ) : null}
                                                        <Button
                                                            type="button"
                                                            size="sm"
                                                            variant="destructive"
                                                            disabled={isBusy}
                                                            onClick={() => setPendingAction({ type: "deleteSuggestion", suggestion })}
                                                        >
                                                            <Trash2 className="h-4 w-4" />
                                                            Delete
                                                        </Button>
                                                    </div>
                                                </TableCell>
                                            </TableRow>
                                        );
                                    })
                                )}
                            </TableBody>
                        </Table>
                    </div>
                </section>

                <aside className="space-y-4">
                    <Card className="rounded-lg">
                        <CardHeader>
                            <div className="flex items-center justify-between gap-3">
                                <CardTitle>{editingNoteId ? "Edit Note" : "New Note"}</CardTitle>
                                {editingNoteId ? (
                                    <Button type="button" variant="ghost" size="sm" onClick={resetNoteForm}>
                                        Cancel
                                    </Button>
                                ) : null}
                            </div>
                        </CardHeader>
                        <CardContent>
                            <form className="space-y-3" onSubmit={saveNote}>
                                <Input
                                    value={noteForm.title}
                                    onChange={(event) => setNoteForm((current) => ({ ...current, title: event.target.value }))}
                                    placeholder="Title"
                                    maxLength={180}
                                    required
                                />
                                <div className="grid grid-cols-2 gap-2">
                                    <Input
                                        value={noteForm.version}
                                        onChange={(event) => setNoteForm((current) => ({ ...current, version: event.target.value }))}
                                        placeholder="Version"
                                        maxLength={80}
                                    />
                                    <Input
                                        value={noteForm.category}
                                        onChange={(event) => setNoteForm((current) => ({ ...current, category: event.target.value }))}
                                        placeholder="Category"
                                        maxLength={64}
                                        required
                                    />
                                </div>
                                <Textarea
                                    value={noteForm.body}
                                    onChange={(event) => setNoteForm((current) => ({ ...current, body: event.target.value }))}
                                    placeholder="Release note or change summary"
                                    className="min-h-36"
                                    maxLength={8000}
                                    required
                                />
                                <label className="flex items-center justify-between rounded-md border p-3 text-sm">
                                    Published
                                    <Switch
                                        checked={noteForm.isPublished}
                                        onCheckedChange={(checked) => setNoteForm((current) => ({ ...current, isPublished: checked }))}
                                    />
                                </label>
                                <Button type="submit" className="w-full" disabled={savingNote}>
                                    {editingNoteId ? <Send className="h-4 w-4" /> : <Plus className="h-4 w-4" />}
                                    {savingNote ? "Saving..." : editingNoteId ? "Update note" : "Create note"}
                                </Button>
                            </form>
                        </CardContent>
                    </Card>

                    <Card className="rounded-lg">
                        <CardHeader>
                            <CardTitle>Notes</CardTitle>
                        </CardHeader>
                        <CardContent className="space-y-3">
                            {notes.length === 0 ? (
                                <p className="text-sm text-muted-foreground">No notes yet.</p>
                            ) : (
                                notes.map((note) => (
                                    <div key={note.id} className="space-y-2 rounded-md border p-3">
                                        <div className="flex items-start justify-between gap-3">
                                            <div className="min-w-0">
                                                <div className="truncate font-medium">{note.title}</div>
                                                <div className="mt-1 flex flex-wrap gap-2">
                                                    <Badge variant={note.isPublished ? "default" : "secondary"}>
                                                        {note.isPublished ? "published" : "draft"}
                                                    </Badge>
                                                    <Badge variant="outline">{note.category}</Badge>
                                                </div>
                                            </div>
                                            <div className="flex shrink-0 gap-2">
                                                <Button type="button" variant="outline" size="sm" onClick={() => editNote(note)}>
                                                    <Pencil className="h-4 w-4" />
                                                    Edit
                                                </Button>
                                                <Button
                                                    type="button"
                                                    variant="destructive"
                                                    size="sm"
                                                    disabled={busyId === note.id}
                                                    onClick={() => setPendingAction({ type: "deleteNote", note })}
                                                >
                                                    <Trash2 className="h-4 w-4" />
                                                    Delete
                                                </Button>
                                            </div>
                                        </div>
                                        <p className="line-clamp-3 whitespace-pre-wrap text-sm text-muted-foreground">{note.body}</p>
                                    </div>
                                ))
                            )}
                        </CardContent>
                    </Card>
                </aside>
            </div>

            <Dialog open={editingSuggestion !== null} onOpenChange={(open) => { if (!open) resetSuggestionForm(); }}>
                <DialogContent className="sm:max-w-2xl">
                    <DialogHeader>
                        <DialogTitle>Edit suggestion</DialogTitle>
                        <DialogDescription>
                            Update the local suggestion text or moderation status.
                        </DialogDescription>
                    </DialogHeader>
                    <form className="space-y-4" onSubmit={saveSuggestion}>
                        <div className="space-y-2">
                            <Input
                                value={suggestionForm.title}
                                onChange={(event) => setSuggestionForm((current) => ({ ...current, title: event.target.value }))}
                                placeholder="Title"
                                maxLength={180}
                                required
                            />
                            <div className="flex justify-between text-xs text-muted-foreground">
                                <span>{suggestionForm.title.trim().length < 3 ? "Minimum 3 characters" : "Title looks good"}</span>
                                <span>{suggestionForm.title.length}/180</span>
                            </div>
                        </div>

                        <div className="space-y-2">
                            <Textarea
                                value={suggestionForm.body}
                                onChange={(event) => setSuggestionForm((current) => ({ ...current, body: event.target.value }))}
                                placeholder="Details"
                                className="min-h-40"
                                maxLength={5000}
                                required
                            />
                            <div className="flex justify-between text-xs text-muted-foreground">
                                <span>{suggestionForm.body.trim().length < 10 ? "Minimum 10 characters" : "Details look good"}</span>
                                <span>{suggestionForm.body.length}/5000</span>
                            </div>
                        </div>

                        <Select
                            value={suggestionForm.status}
                            onValueChange={(value) => setSuggestionForm((current) => ({
                                ...current,
                                status: value as DevelopmentSuggestionStatus,
                            }))}
                        >
                            <SelectTrigger className="w-full">
                                <SelectValue placeholder="Status" />
                            </SelectTrigger>
                            <SelectContent>
                                {editableStatuses.map((item) => (
                                    <SelectItem
                                        key={item}
                                        value={item}
                                        disabled={item === "promoted" && !editingSuggestion?.githubIssueNumber}
                                    >
                                        {item}
                                    </SelectItem>
                                ))}
                            </SelectContent>
                        </Select>

                        {suggestionFormError ? (
                            <p className="text-sm text-destructive">{suggestionFormError}</p>
                        ) : null}

                        <DialogFooter>
                            <Button type="button" variant="outline" onClick={resetSuggestionForm}>
                                Cancel
                            </Button>
                            <Button
                                type="submit"
                                disabled={Boolean(suggestionFormError) || busyId === editingSuggestion?.id}
                            >
                                <Send className="h-4 w-4" />
                                Save suggestion
                            </Button>
                        </DialogFooter>
                    </form>
                </DialogContent>
            </Dialog>

            <AlertDialog
                open={Boolean(pendingAction)}
                onOpenChange={(open) => {
                    if (!open && !pendingActionBusy) {
                        setPendingAction(null);
                    }
                }}
            >
                <AlertDialogContent size="sm">
                    <AlertDialogHeader>
                        {PendingActionIcon && pendingActionCopy ? (
                            <AlertDialogMedia className={pendingActionCopy.destructive ? "bg-destructive/10 text-destructive" : "bg-primary/10 text-primary"}>
                                <PendingActionIcon className="h-7 w-7" />
                            </AlertDialogMedia>
                        ) : null}
                        <AlertDialogTitle>{pendingActionCopy?.title}</AlertDialogTitle>
                        <AlertDialogDescription>
                            {pendingActionCopy?.description}
                        </AlertDialogDescription>
                    </AlertDialogHeader>
                    <AlertDialogFooter>
                        <AlertDialogCancel disabled={pendingActionBusy}>No</AlertDialogCancel>
                        <AlertDialogAction
                            variant={pendingActionCopy?.destructive ? "destructive" : "default"}
                            disabled={pendingActionBusy}
                            onClick={(event) => {
                                event.preventDefault();
                                void confirmPendingAction();
                            }}
                        >
                            {pendingActionBusy ? pendingActionCopy?.busyLabel : pendingActionCopy?.confirmLabel}
                        </AlertDialogAction>
                    </AlertDialogFooter>
                </AlertDialogContent>
            </AlertDialog>

            {selectedUser ? (
                <AuthorModal
                    isOpen={userModalOpen}
                    onClose={() => setUserModalOpen(false)}
                    userId={selectedUser.userId}
                    username={selectedUser.username}
                    showMoreFromAuthor={false}
                />
            ) : null}
        </div>
    );
}
