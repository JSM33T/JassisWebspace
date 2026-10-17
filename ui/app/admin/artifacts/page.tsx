'use client';

import Link from 'next/link';
import { useCallback, useEffect, useRef, useState } from 'react';
import { useRouter } from 'next/navigation';
import { FileBox, Upload, Search, ArrowRight, Loader2 } from 'lucide-react';
import { toast } from 'sonner';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { useUser } from '@/contexts/UserContext';
import { hasRole } from '@/lib/auth-roles';
import { artifactService, formatArtifactSize } from '@/lib/api/artifact.service';
import type { ArtifactPage } from '@/lib/api/artifact.types';

export default function ArtifactsPage() {
    const router = useRouter();
    const { user } = useUser();
    const [data, setData] = useState<ArtifactPage | null>(null);
    const [search, setSearch] = useState('');
    const [owner, setOwner] = useState('');
    const [page, setPage] = useState(1);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState('');
    const [uploading, setUploading] = useState(false);
    const [showUpload, setShowUpload] = useState(false);
    const [progress, setProgress] = useState(0);
    const [file, setFile] = useState<File | null>(null);
    const [title, setTitle] = useState('');
    const [note, setNote] = useState('');
    const uploadController = useRef<AbortController | null>(null);
    const sequence = useRef(0);
    const load = useCallback(async () => {
        const request = ++sequence.current;
        setLoading(true);
        try {
            const contentId = new URLSearchParams(window.location.search).get('contentId');
            if (contentId && /^[0-9a-f-]{36}$/i.test(contentId)) {
                const detail = await artifactService.byContent(contentId);
                if (request === sequence.current) router.replace(`/admin/artifacts/${detail.artifact.id}`);
                return;
            }
            const result = await artifactService.list(search, page, owner);
            if (request === sequence.current) { setData(result); setError(''); }
        } catch (e) { if (request === sequence.current) setError(e instanceof Error ? e.message : 'Unable to load artifacts.'); }
        finally { if (request === sequence.current) setLoading(false); }
    }, [owner, page, router, search]);
    useEffect(() => { const timer = setTimeout(() => void load(), 250); return () => { clearTimeout(timer); sequence.current++; }; }, [load]);
    useEffect(() => () => uploadController.current?.abort(), []);

    async function upload(event: React.FormEvent) {
        event.preventDefault();
        if (!file || uploading) return;
        if (file.size === 0 || file.size > (data?.maxUploadBytes ?? 100 * 1024 ** 2)) { toast.error('Choose a non-empty file within the upload limit.'); return; }
        const controller = new AbortController();
        uploadController.current = controller;
        setUploading(true); setProgress(0);
        try {
            const result = await artifactService.upload(file, title, note, setProgress, controller.signal);
            toast.success('Artifact uploaded. Create a link to share it.');
            router.push(`/admin/artifacts/${result.artifact.id}`);
        } catch (e) { toast.error(e instanceof Error ? e.message : 'Upload failed.'); }
        finally { setUploading(false); uploadController.current = null; }
    }

    return <div className="mx-auto max-w-6xl space-y-6 p-4 pt-24 sm:p-8 sm:pt-24">
        <div className="flex flex-wrap items-start justify-between gap-4">
            <div><p className="mb-2 flex items-center gap-2 text-sm text-primary"><FileBox className="size-4" /> Private content library</p>
                <h1 className="text-3xl font-bold">Artifacts</h1>
                <p className="mt-2 max-w-xl text-muted-foreground">Upload once. Share with a unique link, an expiry, and the download allowance you choose.</p>
            </div>
            <Button onClick={() => setShowUpload(!showUpload)}><Upload className="mr-2 size-4" />Upload artifact</Button>
        </div>
        {showUpload && <Card><CardHeader><CardTitle>Upload an artifact</CardTitle></CardHeader><CardContent>
            <form onSubmit={upload} className="space-y-4">
                <div><Label htmlFor="artifact-file">File</Label><Input id="artifact-file" type="file" required disabled={uploading} onChange={e => {
                    const selected = e.target.files?.[0] ?? null; setFile(selected); if (selected) setTitle(selected.name.slice(0, 200));
                }} /><p className="mt-1 text-xs text-muted-foreground">Up to {formatArtifactSize(data?.maxUploadBytes ?? 100 * 1024 ** 2)} per artifact. Storage allowance: {formatArtifactSize(data?.ownerQuotaBytes ?? 2 * 1024 ** 3)} per uploader.</p></div>
                <div><Label htmlFor="artifact-title">Title</Label><Input id="artifact-title" required maxLength={200} value={title} onChange={e => setTitle(e.target.value)} disabled={uploading} /></div>
                <div><Label htmlFor="artifact-note">Private note</Label><Textarea id="artifact-note" maxLength={4000} value={note} onChange={e => setNote(e.target.value)} disabled={uploading} /><p className="mt-1 text-xs text-muted-foreground">Only visible in artifact management.</p></div>
                {uploading && <div aria-live="polite"><progress className="w-full accent-primary" max={100} value={progress} /><p className="text-sm text-muted-foreground">{progress === 100 ? 'Saving artifact…' : `Uploading ${progress}%`}</p></div>}
                <div className="flex gap-2"><Button type="submit" disabled={!file || uploading}>{uploading && <Loader2 className="mr-2 size-4 animate-spin" />}Upload</Button>
                    {uploading && <Button type="button" variant="outline" onClick={() => uploadController.current?.abort()}>Cancel upload</Button>}</div>
            </form>
        </CardContent></Card>}
        <div className="flex flex-wrap gap-3">
            <div className="relative min-w-60 flex-1"><Search className="absolute left-3 top-3 size-4 text-muted-foreground" /><Input className="pl-9" aria-label="Search artifacts" placeholder="Search by title or filename" value={search} onChange={e => { setSearch(e.target.value); setPage(1); }} /></div>
            {hasRole(user, 'admin') && <select aria-label="Filter by uploader" className="rounded-md border bg-background px-3 py-2 text-sm" value={owner} onChange={e => { setOwner(e.target.value); setPage(1); }}>
                <option value="">All uploaders</option>{data?.owners.map(o => <option value={o.id} key={o.id}>{o.name}</option>)}
            </select>}
        </div>
        {error ? <Card><CardContent className="space-y-3 pt-6"><p role="alert">{error}</p><Button variant="outline" onClick={() => void load()}>Try again</Button></CardContent></Card> : loading ?
            <p className="flex items-center gap-2 py-12 text-muted-foreground"><Loader2 className="size-4 animate-spin" />Loading artifacts…</p> : !data?.items.length ?
                <Card><CardContent className="py-16 text-center"><FileBox className="mx-auto mb-4 size-10 text-muted-foreground" /><h2 className="text-lg font-semibold">{search || owner ? 'No matching artifacts' : 'Your first artifact starts here'}</h2><p className="mt-2 text-sm text-muted-foreground">{search || owner ? 'Try a different search or uploader.' : 'Upload a file, then choose how and for how long to share it.'}</p></CardContent></Card> :
                <div className="grid gap-4 md:grid-cols-2">{data.items.map(a => <Link href={`/admin/artifacts/${a.id}`} key={a.id} className="group rounded-xl border bg-card p-5 transition-colors hover:border-primary/50 focus-visible:outline-2 focus-visible:outline-primary">
                    <div className="flex items-start gap-3"><FileBox className="mt-1 size-5 shrink-0 text-primary" /><div className="min-w-0 flex-1"><h2 className="truncate font-semibold">{a.title}</h2><p className="truncate text-sm text-muted-foreground">{a.originalFileName}</p></div><ArrowRight className="size-4 shrink-0 text-muted-foreground group-hover:text-primary" /></div>
                    <div className="mt-5 flex flex-wrap gap-x-4 gap-y-1 text-xs text-muted-foreground"><span>{formatArtifactSize(a.sizeBytes)}</span><span>{a.activeLinkCount} active links</span><span>{a.totalDownloads} downloads</span></div>
                    <p className="mt-3 text-xs text-muted-foreground">{a.ownerName ?? 'Former uploader'} · {new Date(a.createdAt).toLocaleDateString()}</p>
                </Link>)}</div>}
        {data && data.total > data.pageSize && <div className="flex items-center justify-between"><Button variant="outline" disabled={loading || data.page <= 1} onClick={() => setPage(data.page - 1)}>Previous</Button><span className="text-sm text-muted-foreground">Page {data.page} of {Math.ceil(data.total / data.pageSize)}</span><Button variant="outline" disabled={loading || data.page * data.pageSize >= data.total} onClick={() => setPage(data.page + 1)}>Next</Button></div>}
    </div>;
}
