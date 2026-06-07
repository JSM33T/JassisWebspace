"use client";

import { useCallback, useEffect, useState } from "react";
import { AlertTriangle, CheckCircle2, Eye, FolderInput, ScanSearch, Trash2 } from "lucide-react";
import { toast } from "sonner";
import Image from "next/image";

import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Spinner } from "@/components/ui/spinner";
import { Badge } from "@/components/ui/badge";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { adminGalleryService } from "@/lib/api/admin-gallery.service";
import { type Album, type GalleryAuditResult } from "@/lib/api/gallery.types";

const API_BASE = process.env.NEXT_PUBLIC_API_URL?.replace(/\/$/, "") ?? "";

function blobToPreviewUrl(blobName: string) {
    return `${API_BASE}/media/${blobName.replace(/^gallery\//, "")}`;
}

interface PreviewState {
    blobName: string;
    url: string;
}

interface AssignForm {
    albumId: string;
    title: string;
    description: string;
    order: string;
}

export default function GalleryAuditPage() {
    const [result, setResult] = useState<GalleryAuditResult | null>(null);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);

    // preview modal
    const [preview, setPreview] = useState<PreviewState | null>(null);
    const [deletingBlob, setDeletingBlob] = useState<string | null>(null);

    // assign dialog
    const [assigningBlob, setAssigningBlob] = useState<string | null>(null);
    const [albums, setAlbums] = useState<Album[]>([]);
    const [albumsLoading, setAlbumsLoading] = useState(false);
    const [assignForm, setAssignForm] = useState<AssignForm>({ albumId: "", title: "", description: "", order: "" });
    const [submitting, setSubmitting] = useState(false);

    const runAudit = useCallback(async () => {
        try {
            setResult(await adminGalleryService.auditBlobConsistency());
        } catch (err) {
            setError(err instanceof Error ? err.message : "Audit failed.");
        } finally {
            setLoading(false);
        }
    }, []);

    const handleRunAudit = () => {
        setError(null);
        setLoading(true);
        void runAudit();
    };

    useEffect(() => {
        void (async () => {
            await runAudit();
        })();
    }, [runAudit]);

    // Show the albums loading state when the assign dialog opens.
    const [albumsLoadKey, setAlbumsLoadKey] = useState<string | null>(null);
    if (assigningBlob !== albumsLoadKey) {
        setAlbumsLoadKey(assigningBlob);
        setAlbumsLoading(!!assigningBlob);
    }

    // Load albums when assign dialog opens
    useEffect(() => {
        if (!assigningBlob) return;
        let ignore = false;
        adminGalleryService.getAllAlbums()
            .then((data) => { if (!ignore) setAlbums(data); })
            .catch(() => toast.error("Failed to load albums."))
            .finally(() => { if (!ignore) setAlbumsLoading(false); });
        return () => { ignore = true; };
    }, [assigningBlob]);

    const removeOrphan = (blobName: string) =>
        setResult((prev) =>
            prev ? { ...prev, orphanedBlobs: prev.orphanedBlobs.filter((b) => b !== blobName) } : prev
        );

    const handleDelete = async (blobName: string, closeModal = false) => {
        try {
            setDeletingBlob(blobName);
            await adminGalleryService.deleteOrphanedBlob(blobName);
            removeOrphan(blobName);
            if (closeModal) setPreview(null);
            toast.success("Orphaned blob deleted.");
        } catch (err) {
            toast.error(err instanceof Error ? err.message : "Failed to delete blob.");
        } finally {
            setDeletingBlob(null);
        }
    };

    const openAssign = (blobName: string) => {
        setPreview(null);
        setAssignForm({ albumId: "", title: "", description: "", order: "" });
        setAssigningBlob(blobName);
    };

    const handleAssign = async () => {
        if (!assigningBlob || !assignForm.albumId) return;
        try {
            setSubmitting(true);
            await adminGalleryService.assignOrphanedBlob(
                assigningBlob,
                assignForm.albumId,
                assignForm.title || undefined,
                assignForm.description || undefined,
                assignForm.order ? parseInt(assignForm.order, 10) : undefined,
            );
            removeOrphan(assigningBlob);
            setAssigningBlob(null);
            toast.success("Blob assigned to album and renamed successfully.");
        } catch (err) {
            toast.error(err instanceof Error ? err.message : "Failed to assign blob.");
        } finally {
            setSubmitting(false);
        }
    };

    const totalIssues = result ? result.missingFromBlob.length + result.orphanedBlobs.length : 0;

    return (
        <>
            <div className="space-y-6 p-8 pt-24">
                {/* Header */}
                <div className="flex items-start justify-between gap-4">
                    <div>
                        <h1 className="text-3xl font-bold">Gallery Blob Audit</h1>
                        <p className="mt-2 text-muted-foreground">
                            Cross-reference every DB gallery entry against Azure Blob Storage.
                        </p>
                    </div>
                    <Button type="button" onClick={handleRunAudit} disabled={loading} className="rounded-full">
                        {loading ? <><Spinner className="mr-2 h-4 w-4" />Scanning...</> : <><ScanSearch className="mr-2 h-4 w-4" />Run Audit</>}
                    </Button>
                </div>

                {error && <p className="text-sm text-destructive">{error}</p>}

                {result && (
                    <>
                        {/* Summary */}
                        <div className="grid grid-cols-2 gap-4 sm:grid-cols-4">
                            {[
                                { label: "Albums", value: result.totalAlbums },
                                { label: "Images", value: result.totalImages },
                                { label: "Azure Blobs", value: result.totalBlobsInAzure },
                                { label: "Issues", value: totalIssues },
                            ].map(({ label, value }) => (
                                <div key={label} className="rounded-xl border p-4 text-center">
                                    <p className="text-2xl font-bold">{value}</p>
                                    <p className="text-sm text-muted-foreground">{label}</p>
                                </div>
                            ))}
                        </div>

                        {/* Missing from blob */}
                        <section className="space-y-3">
                            <div>
                                <h2 className="text-xl font-semibold">Missing from Azure</h2>
                                <p className="text-sm text-muted-foreground">
                                    DB entries whose blob no longer exists in Azure Blob Storage.
                                </p>
                            </div>
                            <Card>
                                <CardHeader>
                                    <CardTitle className="text-base font-semibold">
                                        {result.missingFromBlob.length === 0 ? "No missing blobs" : `${result.missingFromBlob.length} missing`}
                                    </CardTitle>
                                </CardHeader>
                                <CardContent>
                                    {result.missingFromBlob.length === 0 ? (
                                        <div className="flex items-center gap-2 text-sm text-emerald-600">
                                            <CheckCircle2 className="h-4 w-4" />
                                            All DB entries have a corresponding blob in Azure.
                                        </div>
                                    ) : (
                                        <div className="space-y-3">
                                            {result.missingFromBlob.map((entry) => (
                                                <div key={`${entry.kind}-${entry.id}`} className="rounded-xl border border-destructive/30 bg-destructive/5 p-4">
                                                    <div className="flex flex-col gap-2 sm:flex-row sm:items-start sm:justify-between">
                                                        <div className="min-w-0 space-y-1">
                                                            <div className="flex items-center gap-2">
                                                                <Badge variant="destructive" className="capitalize">{entry.kind}</Badge>
                                                                <span className="truncate text-sm font-medium">{entry.name ?? "(untitled)"}</span>
                                                            </div>
                                                            <p className="break-all text-xs text-muted-foreground">
                                                                Expected blob: <span className="font-mono">{entry.expectedBlobName}</span>
                                                            </p>
                                                            <p className="break-all text-xs text-muted-foreground">
                                                                Stored URL: <span className="font-mono">{entry.storedUrl}</span>
                                                            </p>
                                                        </div>
                                                        <AlertTriangle className="h-4 w-4 shrink-0 text-destructive" />
                                                    </div>
                                                </div>
                                            ))}
                                        </div>
                                    )}
                                </CardContent>
                            </Card>
                        </section>

                        {/* Orphaned blobs */}
                        <section className="space-y-3">
                            <div>
                                <h2 className="text-xl font-semibold">Orphaned in Azure</h2>
                                <p className="text-sm text-muted-foreground">
                                    Blobs under <span className="font-mono">gallery/</span> with no DB reference.
                                    Preview, assign to an album, or delete.
                                </p>
                            </div>
                            <Card>
                                <CardHeader>
                                    <CardTitle className="text-base font-semibold">
                                        {result.orphanedBlobs.length === 0 ? "No orphaned blobs" : `${result.orphanedBlobs.length} orphaned`}
                                    </CardTitle>
                                </CardHeader>
                                <CardContent>
                                    {result.orphanedBlobs.length === 0 ? (
                                        <div className="flex items-center gap-2 text-sm text-emerald-600">
                                            <CheckCircle2 className="h-4 w-4" />
                                            No orphaned blobs found.
                                        </div>
                                    ) : (
                                        <div className="space-y-2">
                                            {result.orphanedBlobs.map((blobName) => (
                                                <div key={blobName} className="flex items-center gap-2 rounded-lg border px-3 py-2">
                                                    <span className="min-w-0 flex-1 truncate font-mono text-xs text-muted-foreground">
                                                        {blobName}
                                                    </span>
                                                    {/* Preview */}
                                                    <Button
                                                        type="button" variant="ghost" size="sm"
                                                        className="shrink-0"
                                                        disabled={deletingBlob !== null || submitting}
                                                        onClick={() => setPreview({ blobName, url: blobToPreviewUrl(blobName) })}
                                                    >
                                                        <Eye className="h-4 w-4" />
                                                    </Button>
                                                    {/* Assign */}
                                                    <Button
                                                        type="button" variant="ghost" size="sm"
                                                        className="shrink-0 text-blue-600 hover:bg-blue-50 hover:text-blue-700"
                                                        disabled={deletingBlob !== null || submitting}
                                                        onClick={() => openAssign(blobName)}
                                                    >
                                                        <FolderInput className="h-4 w-4" />
                                                    </Button>
                                                    {/* Delete */}
                                                    <Button
                                                        type="button" variant="ghost" size="sm"
                                                        className="shrink-0 text-destructive hover:bg-destructive/10 hover:text-destructive"
                                                        disabled={deletingBlob !== null || submitting}
                                                        onClick={() => handleDelete(blobName)}
                                                    >
                                                        {deletingBlob === blobName ? <Spinner className="h-4 w-4" /> : <Trash2 className="h-4 w-4" />}
                                                    </Button>
                                                </div>
                                            ))}
                                        </div>
                                    )}
                                </CardContent>
                            </Card>
                        </section>
                    </>
                )}

                {!result && !loading && !error && (
                    <div className="rounded-xl border border-dashed p-10 text-center text-muted-foreground">
                        Click <strong>Run Audit</strong> to scan blob consistency.
                    </div>
                )}
            </div>

            {/* ── Preview modal ── */}
            <Dialog open={preview !== null} onOpenChange={(open) => { if (!open) setPreview(null); }}>
                <DialogContent className="max-w-2xl">
                    <DialogHeader>
                        <DialogTitle className="truncate font-mono text-sm font-normal text-muted-foreground">
                            {preview?.blobName}
                        </DialogTitle>
                    </DialogHeader>

                    <div className="relative aspect-video w-full overflow-hidden rounded-lg bg-muted">
                        {preview && (
                            <Image
                                src={preview.url}
                                alt={preview.blobName}
                                fill
                                unoptimized
                                className="object-contain"
                                onError={(e) => { (e.target as HTMLImageElement).style.display = "none"; }}
                            />
                        )}
                    </div>

                    <div className="flex items-center justify-end gap-2 pt-1">
                        <Button
                            type="button" variant="outline" size="sm" className="rounded-full"
                            disabled={deletingBlob !== null}
                            onClick={() => preview && openAssign(preview.blobName)}
                        >
                            <FolderInput className="mr-2 h-4 w-4" />
                            Assign to Album
                        </Button>
                        <Button
                            type="button" variant="destructive" size="sm" className="rounded-full"
                            disabled={deletingBlob !== null}
                            onClick={() => preview && handleDelete(preview.blobName, true)}
                        >
                            {deletingBlob === preview?.blobName
                                ? <><Spinner className="mr-2 h-4 w-4" />Deleting...</>
                                : <><Trash2 className="mr-2 h-4 w-4" />Delete Blob</>}
                        </Button>
                    </div>
                </DialogContent>
            </Dialog>

            {/* ── Assign to album dialog ── */}
            <Dialog open={assigningBlob !== null} onOpenChange={(open) => { if (!open) setAssigningBlob(null); }}>
                <DialogContent className="max-w-md">
                    <DialogHeader>
                        <DialogTitle>Assign to Album</DialogTitle>
                    </DialogHeader>

                    <p className="truncate font-mono text-xs text-muted-foreground">
                        {assigningBlob}
                    </p>
                    <p className="text-xs text-muted-foreground">
                        The blob will be copied to{" "}
                        <span className="font-mono">gallery/images/&#123;albumId&#125;-&#123;guid&#125;.webp</span>{" "}
                        and an image record will be created in the selected album.
                    </p>

                    <div className="space-y-4 pt-1">
                        <div className="space-y-1.5">
                            <Label htmlFor="assign-album">Album <span className="text-destructive">*</span></Label>
                            <Select
                                value={assignForm.albumId}
                                onValueChange={(v) => setAssignForm((f) => ({ ...f, albumId: v }))}
                                disabled={albumsLoading}
                            >
                                <SelectTrigger id="assign-album">
                                    <SelectValue placeholder={albumsLoading ? "Loading albums…" : "Select an album"} />
                                </SelectTrigger>
                                <SelectContent>
                                    {albums.map((a) => (
                                        <SelectItem key={a.id} value={a.id}>
                                            {a.name}
                                        </SelectItem>
                                    ))}
                                </SelectContent>
                            </Select>
                        </div>

                        <div className="space-y-1.5">
                            <Label htmlFor="assign-title">Title <span className="text-muted-foreground text-xs">(optional)</span></Label>
                            <Input
                                id="assign-title"
                                placeholder="Leave blank for no title"
                                value={assignForm.title}
                                onChange={(e) => setAssignForm((f) => ({ ...f, title: e.target.value }))}
                            />
                        </div>

                        <div className="space-y-1.5">
                            <Label htmlFor="assign-desc">Description <span className="text-muted-foreground text-xs">(optional)</span></Label>
                            <Textarea
                                id="assign-desc"
                                placeholder="Leave blank for no description"
                                rows={2}
                                value={assignForm.description}
                                onChange={(e) => setAssignForm((f) => ({ ...f, description: e.target.value }))}
                            />
                        </div>

                        <div className="space-y-1.5">
                            <Label htmlFor="assign-order">Sort order <span className="text-muted-foreground text-xs">(optional, auto if blank)</span></Label>
                            <Input
                                id="assign-order"
                                type="number"
                                min={1}
                                placeholder="Auto"
                                value={assignForm.order}
                                onChange={(e) => setAssignForm((f) => ({ ...f, order: e.target.value }))}
                            />
                        </div>
                    </div>

                    <div className="flex justify-end gap-2 pt-2">
                        <Button type="button" variant="outline" className="rounded-full" onClick={() => setAssigningBlob(null)} disabled={submitting}>
                            Cancel
                        </Button>
                        <Button
                            type="button"
                            className="rounded-full"
                            disabled={!assignForm.albumId || submitting}
                            onClick={handleAssign}
                        >
                            {submitting
                                ? <><Spinner className="mr-2 h-4 w-4" />Assigning…</>
                                : <><FolderInput className="mr-2 h-4 w-4" />Assign</>}
                        </Button>
                    </div>
                </DialogContent>
            </Dialog>
        </>
    );
}
