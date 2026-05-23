"use client";

import { useCallback, useEffect, useState } from "react";
import { AlertTriangle, CheckCircle2, RefreshCcw, ScanSearch } from "lucide-react";

import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Spinner } from "@/components/ui/spinner";
import { Badge } from "@/components/ui/badge";
import { adminGalleryService } from "@/lib/api/admin-gallery.service";
import { type GalleryAuditResult } from "@/lib/api/gallery.types";

export default function GalleryAuditPage() {
    const [result, setResult] = useState<GalleryAuditResult | null>(null);
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState<string | null>(null);

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

    const totalIssues = result
        ? result.missingFromBlob.length + result.orphanedBlobs.length
        : 0;

    return (
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

            {error && (
                <p className="text-sm text-destructive">{error}</p>
            )}

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
                                            <div key={`${entry.kind}-${entry.id}`} className="rounded-xl border border-destructive/30 bg-destructive/5 p-4">
                                                <div className="flex flex-col gap-2 sm:flex-row sm:items-start sm:justify-between">
                                                    <div className="space-y-1 min-w-0">
                                                        <div className="flex items-center gap-2">
                                                            <Badge variant="destructive" className="capitalize">
                                                                {entry.kind}
                                                            </Badge>
                                                            <span className="text-sm font-medium truncate">
                                                                {entry.name ?? "(untitled)"}
                                                            </span>
                                                        </div>
                                                        <p className="text-xs text-muted-foreground break-all">
                                                            Expected blob: <span className="font-mono">{entry.expectedBlobName}</span>
                                                        </p>
                                                        <p className="text-xs text-muted-foreground break-all">
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
                                Blobs in Azure under <span className="font-mono">gallery/</span> that are not referenced by any DB record.
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
                                            <div key={blobName} className="flex items-center justify-between rounded-lg border px-3 py-2">
                                                <span className="truncate font-mono text-xs text-muted-foreground">
                                                    {blobName}
                                                </span>
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
    );
}
