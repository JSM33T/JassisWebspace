"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { Copy, Loader2, Music2, Play, RefreshCw, Trash2, Upload } from "lucide-react";
import { toast } from "sonner";
import { adminBootlegService } from "@/lib/api/admin-bootleg.service";
import { BootlegAsset } from "@/lib/api/admin-bootleg.types";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { useAudioPlayer } from "@/hooks/use-audio-player";
import {
    Table,
    TableBody,
    TableCell,
    TableHead,
    TableHeader,
    TableRow,
} from "@/components/ui/table";
import {
    Select,
    SelectContent,
    SelectItem,
    SelectTrigger,
    SelectValue,
} from "@/components/ui/select";

const PAGE_SIZE = 20;

export default function AdminBootlegPage() {
    const { openPlayer } = useAudioPlayer();
    const [folder, setFolder] = useState("default");
    const [selectedFile, setSelectedFile] = useState<File | null>(null);
    const [uploading, setUploading] = useState(false);
    const [assets, setAssets] = useState<BootlegAsset[]>([]);
    const [folders, setFolders] = useState<string[]>([]);
    const [loadingAssets, setLoadingAssets] = useState(true);
    const [page, setPage] = useState(1);
    const [search, setSearch] = useState("");
    const [filterFolder, setFilterFolder] = useState("all");
    const [latestLink, setLatestLink] = useState<string | null>(null);
    const [workingAssetId, setWorkingAssetId] = useState<string | null>(null);

    const canGoNext = useMemo(() => assets.length === PAGE_SIZE, [assets.length]);

    const loadFolders = useCallback(async () => {
        try {
            const data = await adminBootlegService.getFolders();
            setFolders(data);
        } catch (error) {
            console.error("Failed to load folders", error);
        }
    }, []);

    const loadAssets = useCallback(async () => {
        try {
            setLoadingAssets(true);
            const data = await adminBootlegService.getAssets({
                folder: filterFolder === "all" ? undefined : filterFolder,
                search: search.trim() || undefined,
                page,
                pageSize: PAGE_SIZE,
            });
            setAssets(data);
        } catch (error) {
            console.error("Failed to load assets", error);
            toast.error("Failed to load assets");
        } finally {
            setLoadingAssets(false);
        }
    }, [filterFolder, page, search]);

    useEffect(() => {
        loadFolders();
    }, [loadFolders]);

    useEffect(() => {
        loadAssets();
    }, [loadAssets]);

    const handleUpload = async () => {
        if (!selectedFile) {
            toast.error("Select an audio file first");
            return;
        }

        try {
            setUploading(true);
            const result = await adminBootlegService.upload(selectedFile, folder.trim() || "default");
            setLatestLink(result.streamUrl);
            setSelectedFile(null);
            setFolder(result.folder);
            toast.success("Uploaded and stream link generated");
            await Promise.all([loadAssets(), loadFolders()]);
        } catch (error) {
            console.error("Upload failed", error);
            toast.error("Upload failed");
        } finally {
            setUploading(false);
        }
    };

    const handleCopy = async (value: string) => {
        try {
            await navigator.clipboard.writeText(value);
            toast.success("Link copied");
        } catch (error) {
            console.error("Copy failed", error);
            toast.error("Failed to copy link");
        }
    };

    const handleRegenerate = async (assetId: string) => {
        try {
            setWorkingAssetId(assetId);
            const link = await adminBootlegService.generateLink(assetId);
            await handleCopy(link.streamUrl);
        } catch (error) {
            console.error("Failed to generate link", error);
            toast.error("Failed to generate link");
        } finally {
            setWorkingAssetId(null);
        }
    };

    const handleDelete = async (assetId: string, fileName: string) => {
        const ok = window.confirm(`Delete "${fileName}"? This removes the file and record.`);
        if (!ok) return;

        try {
            setWorkingAssetId(assetId);
            await adminBootlegService.deleteAsset(assetId);
            setAssets((prev) => prev.filter((a) => a.id !== assetId));
            toast.success("Asset deleted");
            await loadFolders();
        } catch (error) {
            console.error("Failed to delete asset", error);
            toast.error("Failed to delete asset");
        } finally {
            setWorkingAssetId(null);
        }
    };

    return (
        <div className="p-8 pt-24 space-y-8">
            <div>
                <h2 className="text-3xl font-bold tracking-tight">Bootleg Assets</h2>
                <p className="text-muted-foreground">Upload audio, organize by folder, generate stream links, and delete assets.</p>
            </div>

            <Card>
                <CardHeader>
                    <CardTitle className="flex items-center gap-2">
                        <Music2 className="h-5 w-5" />
                        Upload Audio
                    </CardTitle>
                    <CardDescription>Files are stored privately and streamed via chunked secure links only.</CardDescription>
                </CardHeader>
                <CardContent className="space-y-4">
                    <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
                        <Input
                            value={folder}
                            onChange={(e) => setFolder(e.target.value)}
                            placeholder="folder/name"
                        />
                        <Input
                            type="file"
                            accept="audio/*"
                            onChange={(e) => setSelectedFile(e.target.files?.[0] || null)}
                        />
                        <Button onClick={handleUpload} disabled={uploading || !selectedFile}>
                            {uploading ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Upload className="mr-2 h-4 w-4" />}
                            Upload & Generate Link
                        </Button>
                    </div>
                    {latestLink && (
                        <div className="rounded-md border bg-muted/30 p-3 flex flex-col md:flex-row md:items-center gap-2">
                            <p className="text-sm text-muted-foreground break-all flex-1">{latestLink}</p>
                            <Button size="sm" variant="outline" onClick={() => openPlayer({ url: latestLink, title: "Preview Stream" })}>
                                <Play className="mr-2 h-4 w-4" />
                                Play
                            </Button>
                            <Button size="sm" variant="outline" onClick={() => handleCopy(latestLink)}>
                                <Copy className="mr-2 h-4 w-4" />
                                Copy
                            </Button>
                        </div>
                    )}
                </CardContent>
            </Card>

            <Card>
                <CardHeader>
                    <CardTitle>Records</CardTitle>
                    <CardDescription>Folder-wise records of uploaded files.</CardDescription>
                </CardHeader>
                <CardContent className="space-y-4">
                    <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
                        <Select value={filterFolder} onValueChange={(value) => { setFilterFolder(value); setPage(1); }}>
                            <SelectTrigger>
                                <SelectValue placeholder="Filter by folder" />
                            </SelectTrigger>
                            <SelectContent>
                                <SelectItem value="all">All folders</SelectItem>
                                {folders.map((item) => (
                                    <SelectItem key={item} value={item}>
                                        {item}
                                    </SelectItem>
                                ))}
                            </SelectContent>
                        </Select>
                        <Input
                            placeholder="Search files..."
                            value={search}
                            onChange={(e) => { setSearch(e.target.value); setPage(1); }}
                        />
                    </div>

                    <div className="rounded-md border">
                        <Table>
                            <TableHeader>
                                <TableRow>
                                    <TableHead>File</TableHead>
                                    <TableHead>Folder</TableHead>
                                    <TableHead>Size</TableHead>
                                    <TableHead>Uploaded</TableHead>
                                    <TableHead className="text-right">Actions</TableHead>
                                </TableRow>
                            </TableHeader>
                            <TableBody>
                                {loadingAssets ? (
                                    <TableRow>
                                        <TableCell colSpan={5} className="h-20 text-center text-muted-foreground">Loading...</TableCell>
                                    </TableRow>
                                ) : assets.length === 0 ? (
                                    <TableRow>
                                        <TableCell colSpan={5} className="h-20 text-center text-muted-foreground">No assets found.</TableCell>
                                    </TableRow>
                                ) : (
                                    assets.map((asset) => (
                                        <TableRow key={asset.id}>
                                            <TableCell className="font-medium">{asset.fileName}</TableCell>
                                            <TableCell>{asset.folder}</TableCell>
                                            <TableCell>{(asset.sizeBytes / (1024 * 1024)).toFixed(2)} MB</TableCell>
                                            <TableCell>{new Date(asset.createdAt).toLocaleString()}</TableCell>
                                            <TableCell className="text-right space-x-2">
                                                <Button size="sm" variant="outline" onClick={() => openPlayer({ url: asset.streamUrl, title: asset.fileName })}>
                                                    <Play className="h-4 w-4" />
                                                </Button>
                                                <Button size="sm" variant="outline" onClick={() => handleCopy(asset.streamUrl)}>
                                                    <Copy className="h-4 w-4" />
                                                </Button>
                                                <Button
                                                    size="sm"
                                                    variant="outline"
                                                    disabled={workingAssetId === asset.id}
                                                    onClick={() => handleRegenerate(asset.id)}
                                                >
                                                    {workingAssetId === asset.id ? <Loader2 className="h-4 w-4 animate-spin" /> : <RefreshCw className="h-4 w-4" />}
                                                </Button>
                                                <Button
                                                    size="sm"
                                                    variant="destructive"
                                                    disabled={workingAssetId === asset.id}
                                                    onClick={() => handleDelete(asset.id, asset.fileName)}
                                                >
                                                    <Trash2 className="h-4 w-4" />
                                                </Button>
                                            </TableCell>
                                        </TableRow>
                                    ))
                                )}
                            </TableBody>
                        </Table>
                    </div>

                    <div className="flex items-center justify-end gap-2">
                        <Button
                            variant="outline"
                            size="sm"
                            disabled={page <= 1 || loadingAssets}
                            onClick={() => setPage((p) => Math.max(1, p - 1))}
                        >
                            Previous
                        </Button>
                        <div className="text-sm text-muted-foreground">Page {page}</div>
                        <Button
                            variant="outline"
                            size="sm"
                            disabled={!canGoNext || loadingAssets}
                            onClick={() => setPage((p) => p + 1)}
                        >
                            Next
                        </Button>
                    </div>
                </CardContent>
            </Card>
        </div>
    );
}
