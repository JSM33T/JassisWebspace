'use client';

import { useEffect, useRef, useState } from 'react';
import { Download, Loader2, Replace } from 'lucide-react';
import { toast } from 'sonner';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { artifactService, formatArtifactSize } from '@/lib/api/artifact.service';
import type { ArtifactDetail } from '@/lib/api/artifact.types';

export function ArtifactFileActions({ detail, busy, onBusyChange, onReplaced }: {
    detail: ArtifactDetail;
    busy: boolean;
    onBusyChange: (busy: boolean) => void;
    onReplaced: (detail: ArtifactDetail) => void;
}) {
    const [replaceOpen, setReplaceOpen] = useState(false);
    const [file, setFile] = useState<File | null>(null);
    const [replacing, setReplacing] = useState(false);
    const [downloading, setDownloading] = useState(false);
    const [progress, setProgress] = useState(0);
    const upload = useRef<AbortController | null>(null);
    const download = useRef<AbortController | null>(null);
    useEffect(() => () => { upload.current?.abort(); download.current?.abort(); }, []);
    const a = detail.artifact;
    const maxBytes = detail.maxUploadBytes ?? 100 * 1024 ** 2;

    async function downloadFile() {
        if (busy || download.current) return;
        const controller = new AbortController();
        download.current = controller;
        setDownloading(true); onBusyChange(true);
        try {
            await artifactService.download(a.id, a.originalFileName, controller.signal);
            toast.success('Download started.');
        } catch (e) {
            if (controller.signal.aborted) toast.info('Download cancelled.');
            else toast.error(e instanceof Error ? e.message : 'Unable to download artifact.');
        } finally { download.current = null; setDownloading(false); onBusyChange(false); }
    }

    async function replaceFile(event: React.FormEvent) {
        event.preventDefault();
        if (!file || busy || upload.current) return;
        if (file.size === 0 || file.size > maxBytes) { toast.error('Choose a non-empty file within the upload limit.'); return; }
        const controller = new AbortController();
        upload.current = controller;
        setReplacing(true); onBusyChange(true); setProgress(0);
        try {
            const result = await artifactService.replace(a.id, file, setProgress, controller.signal);
            onReplaced(result); setReplaceOpen(false); setFile(null);
            toast.success('File replaced. Your share links and limits are preserved.');
        } catch (e) {
            if (controller.signal.aborted) toast.info('Replacement cancelled.');
            else toast.error(e instanceof Error ? e.message : 'Unable to replace artifact.');
        } finally { upload.current = null; setReplacing(false); onBusyChange(false); }
    }

    return <>
        <Card>
            <CardHeader><CardTitle>File</CardTitle></CardHeader>
            <CardContent className="space-y-4">
                <div><p className="break-all font-medium">{a.originalFileName}</p><p className="mt-1 text-sm text-muted-foreground">{formatArtifactSize(a.sizeBytes)} · {a.mediaType || 'File'}</p></div>
                <div className="flex flex-wrap gap-2">
                    <Button disabled={busy} onClick={() => void downloadFile()}>{downloading ? <Loader2 className="mr-2 size-4 animate-spin" /> : <Download className="mr-2 size-4" />}{downloading ? 'Downloading…' : 'Download for myself'}</Button>
                    {downloading && <Button variant="outline" onClick={() => download.current?.abort()}>Cancel download</Button>}
                    <Button variant="outline" disabled={busy} onClick={() => { setFile(null); setProgress(0); setReplaceOpen(true); }}><Replace className="mr-2 size-4" />Replace file</Button>
                </div>
                <p className="text-xs text-muted-foreground">Your own downloads use your management access and do not consume any share-link allowance.</p>
            </CardContent>
        </Card>
        <Dialog open={replaceOpen} onOpenChange={open => { if (!replacing) { setReplaceOpen(open); if (!open) setFile(null); } }}>
            <DialogContent>
                <DialogHeader><DialogTitle>Replace artifact file</DialogTitle><DialogDescription>Existing share links will serve the new file. The title, private note, expiry settings, and download counts stay the same. Existing download sessions will need to restart.</DialogDescription></DialogHeader>
                <form onSubmit={replaceFile} className="space-y-4">
                    <div className="space-y-2"><Label htmlFor="replacement-file">Replacement file</Label><Input id="replacement-file" type="file" required disabled={busy} onChange={event => setFile(event.target.files?.[0] ?? null)} /><p className="text-xs text-muted-foreground">Up to {formatArtifactSize(maxBytes)}. The original remains available while the new file uploads; enough storage for both files is required until replacement completes.</p></div>
                    {file && <p className="break-all text-sm">{file.name} · {formatArtifactSize(file.size)}</p>}
                    {replacing && <div aria-live="polite"><progress className="w-full accent-primary" max={100} value={progress} /><p className="text-sm text-muted-foreground">{progress === 100 ? 'Saving replacement…' : `Uploading ${progress}%`}</p></div>}
                    <div className="flex justify-end gap-2"><Button type="button" variant="outline" onClick={() => { if (replacing) upload.current?.abort(); else { setReplaceOpen(false); setFile(null); } }}>{replacing ? 'Cancel upload' : 'Cancel'}</Button><Button type="submit" disabled={busy || !file}>{replacing && <Loader2 className="mr-2 size-4 animate-spin" />}Replace file</Button></div>
                </form>
            </DialogContent>
        </Dialog>
    </>;
}
