"use client";

import { useCallback, useEffect, useState } from "react";
import { AlertTriangle, CheckCircle2, Eye, ScanSearch, Trash2, X } from "lucide-react";
import { toast } from "sonner";
import Image from "next/image";

import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Spinner } from "@/components/ui/spinner";
import { Badge } from "@/components/ui/badge";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { adminGalleryService } from "@/lib/api/admin-gallery.service";
import { type GalleryAuditResult } from "@/lib/api/gallery.types";

const API_BASE = process.env.NEXT_PUBLIC_API_URL?.replace(/\/$/, "") ?? "";

function blobNameToPreviewUrl(blobName: string): string {
    // blob names: "gallery/covers/..." or "gallery/images/..."
    // media endpoint: /media/covers/... or /media/images/...
    const stripped = blobName.replace(/^gallery\//, "");
    return `${API_BASE}/media/${stripped}`;
}

interface PreviewState {
    blobName: string;
    url: string;
}

export default function GalleryAuditPage() {
    const [result, setResult] = useState<GalleryAuditResult | null>(null);
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState<string | null>(null);
    const [deletingBlob, setDeletingBlob] = useState<string | null>(null);
    const [preview, setPreview] = useState<PreviewState | null>(null);

    const runAudit = useCallback(async () => {
        try {
            setLoading(true);
            setError(null);
            const data = await adminGalleryService.auditBlobConsistency();
            setResult(data);
        } catch (err) {
            setError(err instanceof Error ? err.message : "Audit failed.");
        } finally {
            setLoading(false);
        }
    }, []);

    useEffect(() => {
        runAudit();
    }, [runAudit]);

    const removeOrphan = (blobName: string) => {
        setResult((prev) =>
            prev ? { ...prev, orphanedBlobs: prev.orphanedBlobs.filter((b) => b !== blobName) } : prev
        );
    };

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

    const totalIssues = result
        ? result.missingFromBlob.length + result.orphanedBlobs.length
        : 0;

    return (
        <>
            <div className="space-y-6 p-8 pt-24">
                <div className="flex items-start justify-between gap-4">
                    <div>
                        <h1 className="text-3xl font-bold">Gallery Blob Audit</h1>
                        <p className="mt-2 text-muted-foreground">
                            Cross-reference every DB gallery entry against Azure Blob Storage.
                        </p>
                    </div>
                    <Button
                        type="button"
                        onClick={runAudit}
                        disabled={loading}
                        className="rounded-full"
                    >
                        {loading ? (
                            <>
                                <Spinner className="mr-2 h-4 w-4" />
                                Scanning...
                            </>
                        ) : (
                            <>
                                <ScanSearch className="mr-2 h-4 w-4" />
                                Run Audit
                            </>
                        )}
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
                                        {result.missingFromBlob.length === 0
                                            ? "No missing blobs"
                                            : `${result.missingFromBlob.length} missing`}
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
                                                <div
                                                    key={`${entry.kind}-${entry.id}`}
                                                    className="rounded-xl border border-destructive/30 bg-destructive/5 p-4"
                                                >
                                                    <div className="flex flex-col gap-2 sm:flex-row sm:items-start sm:justify-between">
                                                        <div className="min-w-0 space-y-1">
                                                            <div className="flex items-center gap-2">
                                                                <Badge variant="destructive" className="capitalize">
                                                                    {entry.kind}
                                                                </Badge>
                                                                <span className="truncate text-sm font-medium">
                                                                    {entry.name ?? "(untitled)"}
                                                                </span>
                                                            </div>
                                                            <p className="break-all text-xs text-muted-foreground">
                                                                Expected blob:{" "}
                                                                <span className="font-mono">{entry.expectedBlobName}</span>
                                                            </p>
                                                            <p className="break-all text-xs text-muted-foreground">
                                                                Stored URL:{" "}
                                                                <span className="font-mono">{entry.storedUrl}</span>
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
                                    Blobs in Azure under{" "}
                                    <span className="font-mono">gallery/</span> with no DB reference.
                                </p>
                            </div>
                            <Card>
                                <CardHeader>
                                    <CardTitle className="text-base font-semibold">
                                        {result.orphanedBlobs.length === 0
                                            ? "No orphaned blobs"
                                            : `${result.orphanedBlobs.length} orphaned`}
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
                                                <div
                                                    key={blobName}
                                                    className="flex items-center gap-2 rounded-lg border px-3 py-2"
                                                >
                                                    <span className="min-w-0 flex-1 truncate font-mono text-xs text-muted-foreground">
                                                        {blobName}
                                                    </span>
                                                    <Button
                                                        type="button"
                                                        variant="ghost"
                                                        size="sm"
                                                        className="shrink-0"
                                                        disabled={deletingBlob !== null}
                                                        onClick={() =>
                                                            setPreview({
                                                                blobName,
                                                                url: blobNameToPreviewUrl(blobName),
                                                            })
                                                        }
                                                    >
                                                        <Eye className="h-4 w-4" />
                                                    </Button>
                                                    <Button
                                                        type="button"
                                                        variant="ghost"
                                                        size="sm"
                                                        className="shrink-0 text-destructive hover:bg-destructive/10 hover:text-destructive"
                                                        disabled={deletingBlob !== null}
                                                        onClick={() => handleDelete(blobName)}
                                                    >
                                                        {deletingBlob === blobName ? (
                                                            <Spinner className="h-4 w-4" />
                                                        ) : (
                                                            <Trash2 className="h-4 w-4" />
                                                        )}
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

            {/* Preview modal */}
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
                                onError={(e) => {
                                    (e.target as HTMLImageElement).style.display = "none";
                                }}
                            />
                        )}
                    </div>

                    <div className="flex items-center justify-between gap-3 pt-1">
                        <p className="text-xs text-muted-foreground">
                            This blob has no database reference and can be safely deleted.
                        </p>
                        <Button
                            type="button"
                            variant="destructive"
                            size="sm"
                            className="shrink-0 rounded-full"
                            disabled={deletingBlob !== null}
                            onClick={() => preview && handleDelete(preview.blobName, true)}
                        >
                            {deletingBlob === preview?.blobName ? (
                                <>
                                    <Spinner className="mr-2 h-4 w-4" />
                                    Deleting...
                                </>
                            ) : (
                                <>
                                    <Trash2 className="mr-2 h-4 w-4" />
                                    Delete Blob
                                </>
                            )}
                        </Button>
                    </div>
                </DialogContent>
            </Dialog>
        </>
    );
}
