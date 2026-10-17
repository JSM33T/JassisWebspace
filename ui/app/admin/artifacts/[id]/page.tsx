'use client';

import Link from 'next/link';
import { useParams, useRouter } from 'next/navigation';
import { useCallback, useEffect, useState } from 'react';
import { ArrowLeft, Copy, FileBox, Link2, Loader2, Plus, RefreshCw, Trash2 } from 'lucide-react';
import { toast } from 'sonner';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { ArtifactLinkForm } from '@/components/admin/artifact-link-form';
import { ArtifactFileActions } from '@/components/admin/artifact-file-actions';
import { artifactService, formatArtifactSize } from '@/lib/api/artifact.service';
import { directArtifactDownloadUrl } from '@/lib/artifact-share-links';
import type { ArtifactDetail, ArtifactLink, ArtifactLinkSettings } from '@/lib/api/artifact.types';

function status(link: ArtifactLink, now: number) {
    if (link.revokedAt) return 'Revoked';
    if (link.expiresAt && new Date(link.expiresAt).getTime() <= now) return 'Expired';
    if (link.maxDownloads !== null && link.downloadCount >= link.maxDownloads) return 'Limit reached';
    return 'Active';
}

export default function ArtifactDetailPage() {
    const { id } = useParams<{ id: string }>();
    const router = useRouter();
    const [data, setData] = useState<ArtifactDetail | null>(null);
    const [error, setError] = useState('');
    const [title, setTitle] = useState('');
    const [note, setNote] = useState('');
    const [busy, setBusy] = useState(false);
    const [linkEditor, setLinkEditor] = useState<'new' | ArtifactLink | null>(null);
    const [newUrl, setNewUrl] = useState('');
    const [deleteOpen, setDeleteOpen] = useState(false);
    const [revokeTarget, setRevokeTarget] = useState<ArtifactLink | null>(null);
    const [deleteLinkTarget, setDeleteLinkTarget] = useState<ArtifactLink | null>(null);
    const [now, setNow] = useState(0);
    const load = useCallback(async (reset = false) => {
        const result = await artifactService.get(id);
        setData(result); setError(''); setNow(Date.now());
        if (reset) { setTitle(result.artifact.title); setNote(result.privateNote ?? ''); }
    }, [id]);
    useEffect(() => {
        let active = true;
        artifactService.get(id).then(result => {
            if (active) { setData(result); setTitle(result.artifact.title); setNote(result.privateNote ?? ''); setError(''); setNow(Date.now()); }
        }).catch(e => { if (active) setError(e instanceof Error ? e.message : 'Artifact could not be loaded.'); });
        return () => { active = false; };
    }, [id]);
    useEffect(() => { const timer = setInterval(() => setNow(Date.now()), 30_000); return () => clearInterval(timer); }, []);

    async function saveLink(settings: ArtifactLinkSettings) {
        setBusy(true);
        try {
            if (linkEditor === 'new') {
                const result = await artifactService.createLink(id, settings);
                setNewUrl(`${window.location.origin}/artifacts/share#${result.token}`);
                setLinkEditor(null);
            } else if (linkEditor) {
                await artifactService.updateLink(id, linkEditor.id, settings);
                setLinkEditor(null); toast.success('Link settings updated.');
            }
            await load();
        } finally { setBusy(false); }
    }
    async function revoke() {
        if (!revokeTarget) return;
        setBusy(true);
        try { await artifactService.revokeLink(id, revokeTarget.id); setRevokeTarget(null); await load(); toast.success('Link revoked.'); }
        catch (e) { toast.error(e instanceof Error ? e.message : 'Unable to revoke link.'); }
        finally { setBusy(false); }
    }
    async function deleteLink() {
        if (!deleteLinkTarget) return;
        setBusy(true);
        try {
            await artifactService.deleteLink(id, deleteLinkTarget.id);
            setDeleteLinkTarget(null);
            await load();
            toast.success('Revoked link permanently deleted.');
        } catch (e) { toast.error(e instanceof Error ? e.message : 'Unable to delete link.'); }
        finally { setBusy(false); }
    }
    if (error && !data) return <div className="mx-auto max-w-3xl space-y-4 p-8 pt-24"><Link href="/admin/artifacts">← Back to artifacts</Link><p role="alert">{error}</p><Button onClick={() => load(true).catch(e => setError(e.message))}>Try again</Button></div>;
    if (!data) return <p className="flex items-center gap-2 p-8 pt-24 text-muted-foreground"><Loader2 className="size-4 animate-spin" />Loading artifact…</p>;
    const a = data.artifact;
    const directUrl = newUrl ? directArtifactDownloadUrl(new URL(newUrl).hash.slice(1)) : '';
    return <div className="mx-auto max-w-5xl space-y-6 p-4 pt-24 sm:p-8 sm:pt-24">
        <Button asChild variant="ghost" size="sm"><Link href="/admin/artifacts"><ArrowLeft className="mr-2 size-4" />Artifacts</Link></Button>
        <div className="flex flex-wrap items-start justify-between gap-4"><div className="min-w-0"><Badge variant="outline">Private artifact</Badge><h1 className="mt-3 break-words text-3xl font-bold">{a.title}</h1><p className="mt-2 break-all text-sm text-muted-foreground">{a.originalFileName} · {formatArtifactSize(a.sizeBytes)}</p></div>
            <Button variant="destructive" disabled={busy} onClick={() => setDeleteOpen(true)}><Trash2 className="mr-2 size-4" />Delete artifact</Button></div>
        <div className="grid gap-3 sm:grid-cols-3">{[
            { label: 'Uploaded by', value: a.ownerName ?? 'Former uploader' },
            { label: 'Active links', value: data.links.filter(l => status(l, now) === 'Active').length },
            { label: 'Downloads across saved links', value: a.totalDownloads },
        ].map(item => <Card key={item.label}><CardContent className="flex items-center gap-3 pt-6"><FileBox className="size-5 text-primary" /><div><p className="text-xs text-muted-foreground">{item.label}</p><p className="font-semibold">{item.value}</p></div></CardContent></Card>)}</div>
        <ArtifactFileActions key={a.id} detail={data} busy={busy} onBusyChange={setBusy} onReplaced={result => { setData(result); setNow(Date.now()); }} />
        <Card><CardHeader><CardTitle>Artifact details</CardTitle></CardHeader><CardContent><form className="space-y-4" onSubmit={async event => {
            event.preventDefault(); setBusy(true);
            try { setData(await artifactService.update(id, title, note)); toast.success('Artifact updated.'); }
            catch (e) { toast.error(e instanceof Error ? e.message : 'Unable to save artifact.'); }
            finally { setBusy(false); }
        }}>
            <div><Label htmlFor="title">Title</Label><Input id="title" required maxLength={200} value={title} onChange={e => setTitle(e.target.value)} /></div>
            <div><Label htmlFor="private-note">Private note</Label><Textarea id="private-note" maxLength={4000} value={note} onChange={e => setNote(e.target.value)} /><p className="mt-1 text-xs text-muted-foreground">Recipients never see this note.</p></div>
            <div className="flex flex-wrap items-center gap-3"><Button disabled={busy}>Save details</Button><Button asChild variant="outline"><Link href={`/admin/content/${a.contentId}`}>View content record</Link></Button><span className="text-xs text-muted-foreground">Uploaded {new Date(a.createdAt).toLocaleString()}</span></div>
        </form></CardContent></Card>
        <div className="flex flex-wrap items-center justify-between gap-3"><div><h2 className="text-xl font-semibold">Share links</h2><p className="text-sm text-muted-foreground">Anyone holding an active link can download without signing in.</p></div><div className="flex gap-2"><Button variant="outline" size="icon" aria-label="Refresh share links" disabled={busy} onClick={() => load().catch(e => toast.error(e.message))}><RefreshCw className="size-4" /></Button><Button disabled={busy} onClick={() => setLinkEditor('new')}><Plus className="mr-2 size-4" />Create link</Button></div></div>
        {!data.links.length ? <Card><CardContent className="py-12 text-center"><Link2 className="mx-auto mb-3 size-8 text-muted-foreground" /><p className="font-medium">Ready when you are</p><p className="mt-2 text-sm text-muted-foreground">Create your first link to share this artifact.</p></CardContent></Card> :
            <div className="space-y-3">{data.links.map((link, index) => <Card key={link.id}><CardContent className="flex flex-wrap items-center justify-between gap-4 pt-6"><div className="space-y-2"><div className="flex items-center gap-3"><h3 className="font-semibold">Share link {data.links.length - index}</h3><Badge variant={status(link, now) === 'Active' ? 'default' : 'secondary'}>{status(link, now)}</Badge></div><p className="text-sm text-muted-foreground">{link.downloadCount} / {link.maxDownloads ?? 'unlimited'} downloads · {link.expiresAt ? `Expires ${new Date(link.expiresAt).toLocaleString()}` : 'No expiry'}</p><p className="text-xs text-muted-foreground">Created {new Date(link.createdAt).toLocaleString()}</p></div><div className="flex gap-2"><Button variant="outline" disabled={busy || !!link.revokedAt} onClick={() => setLinkEditor(link)}>Edit limits</Button>{link.revokedAt
                    ? <Button variant="destructive" disabled={busy} onClick={() => setDeleteLinkTarget(link)}><Trash2 className="mr-2 size-4" />Delete link</Button>
                    : <Button variant="outline" disabled={busy} onClick={() => setRevokeTarget(link)}>Revoke</Button>}</div></CardContent></Card>)}</div>}
        <p className="text-xs text-muted-foreground">Links are copyable when created. If you lose a link, create a new one and revoke the old one if needed. Download counts measure sessions issued, including interrupted transfers.</p>
        <Dialog open={!!linkEditor} onOpenChange={open => { if (!open && !busy) setLinkEditor(null); }}><DialogContent><DialogHeader><DialogTitle>{linkEditor === 'new' ? 'Create share link' : 'Edit link limits'}</DialogTitle><DialogDescription>Set an expiry, a download allowance, both, or neither.</DialogDescription></DialogHeader>
            {linkEditor && <ArtifactLinkForm key={linkEditor === 'new' ? 'new' : linkEditor.id} busy={busy} initial={linkEditor === 'new' ? undefined : { expiresAt: linkEditor.expiresAt, maxDownloads: linkEditor.maxDownloads }} onSave={saveLink} onCancel={() => setLinkEditor(null)} />}
        </DialogContent></Dialog>
        <Dialog open={!!newUrl} onOpenChange={open => { if (!open) setNewUrl(''); }}><DialogContent><DialogHeader><DialogTitle>Your share link is ready</DialogTitle><DialogDescription>Copy and save this link now. Its secret is only shown once.</DialogDescription></DialogHeader><Label htmlFor="share-url">Share URL</Label><Input id="share-url" readOnly value={newUrl} onFocus={e => e.currentTarget.select()} /><Button onClick={async () => { try { await navigator.clipboard.writeText(newUrl); toast.success('Share link copied.'); } catch { toast.error('Select the link above and copy it manually.'); } }}><Copy className="mr-2 size-4" />Copy link</Button><Label htmlFor="direct-share-url">Direct download URL</Label><Input id="direct-share-url" readOnly value={directUrl} onFocus={e => e.currentTarget.select()} /><Button variant="outline" onClick={async () => { try { await navigator.clipboard.writeText(directUrl); toast.success('Direct download link copied.'); } catch { toast.error('Select the direct download link above and copy it manually.'); } }}><Copy className="mr-2 size-4" />Copy direct download link</Button><Button variant="outline" onClick={() => setNewUrl('')}>Done</Button></DialogContent></Dialog>
        <Dialog open={deleteOpen} onOpenChange={open => { if (!busy) setDeleteOpen(open); }}><DialogContent><DialogHeader><DialogTitle>Delete this artifact?</DialogTitle><DialogDescription>Access stops immediately. The uploaded file, content record, share links, and download sessions will be permanently removed. If storage is temporarily unavailable, deletion will finish automatically when it recovers.</DialogDescription></DialogHeader><div className="flex justify-end gap-2"><Button variant="outline" disabled={busy} onClick={() => setDeleteOpen(false)}>Cancel</Button><Button variant="destructive" disabled={busy} onClick={async () => {
            setBusy(true); try { await artifactService.delete(id); toast.success('Artifact deleted.'); router.replace('/admin/artifacts'); } catch (e) { toast.error(e instanceof Error ? e.message : 'Deletion failed.'); } finally { setBusy(false); }
        }}>{busy ? 'Deleting…' : 'Delete artifact'}</Button></div></DialogContent></Dialog>
        <Dialog open={!!deleteLinkTarget} onOpenChange={open => { if (!busy && !open) setDeleteLinkTarget(null); }}><DialogContent><DialogHeader><DialogTitle>Permanently delete this link?</DialogTitle><DialogDescription>This removes the revoked link, its download sessions, and its usage count from this artifact. It cannot be restored.</DialogDescription></DialogHeader><div className="flex justify-end gap-2"><Button variant="outline" disabled={busy} onClick={() => setDeleteLinkTarget(null)}>Cancel</Button><Button variant="destructive" disabled={busy} onClick={() => void deleteLink()}>{busy ? 'Deleting…' : 'Delete link permanently'}</Button></div></DialogContent></Dialog>
        <Dialog open={!!revokeTarget} onOpenChange={open => { if (!busy && !open) setRevokeTarget(null); }}><DialogContent><DialogHeader><DialogTitle>Revoke this share link?</DialogTitle><DialogDescription>This permanently disables the link and its download sessions. Saved copies cannot be recalled.</DialogDescription></DialogHeader><div className="flex justify-end gap-2"><Button variant="outline" disabled={busy} onClick={() => setRevokeTarget(null)}>Cancel</Button><Button variant="destructive" disabled={busy} onClick={() => void revoke()}>{busy ? 'Revoking…' : 'Revoke link'}</Button></div></DialogContent></Dialog>
    </div>;
}
