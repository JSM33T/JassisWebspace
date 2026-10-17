'use client';

import { useEffect, useRef, useState } from 'react';
import { Download, FileBox, Loader2, ShieldCheck } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { artifactShareService, formatArtifactSize } from '@/lib/api/artifact.service';
import type { ArtifactGrant, ArtifactPublic } from '@/lib/api/artifact.types';

export default function ArtifactSharePage() {
    const [artifact, setArtifact] = useState<ArtifactPublic | null>(null);
    const [error, setError] = useState('');
    const [loading, setLoading] = useState(true);
    const [busy, setBusy] = useState(false);
    const [grant, setGrant] = useState<ArtifactGrant | null>(null);
    const [started, setStarted] = useState(false);
    const token = useRef('');
    const requestId = useRef('');
    const downloading = useRef(false);
    const frame = useRef<HTMLIFrameElement>(null);
    useEffect(() => {
        let active = true;
        async function load() {
            const secret = window.location.hash.slice(1);
            token.current = secret;
            requestId.current = '';
            setGrant(null); setStarted(false); setLoading(true); setError(''); setArtifact(null);
            if (!/^[A-Za-z0-9_-]{43}$/.test(secret)) { setError('This share link is invalid or incomplete.'); setLoading(false); return; }
            try { const result = await artifactShareService.metadata(secret); if (active && token.current === secret) setArtifact(result); }
            catch (e) { if (active && token.current === secret) setError(e instanceof Error ? e.message : 'Artifact unavailable.'); }
            finally { if (active && token.current === secret) setLoading(false); }
        }
        void load();
        const handler = () => void load();
        window.addEventListener('hashchange', handler);
        return () => { active = false; window.removeEventListener('hashchange', handler); };
    }, []);

    function deliver(session: ArtifactGrant) {
        // A regular form lets the browser stream to disk instead of buffering the whole file in JS.
        // Capabilities are POSTed, so they do not enter access logs or referrer URLs.
        const form = document.createElement('form');
        form.method = 'POST';
        form.action = `${process.env.NEXT_PUBLIC_API_URL?.replace(/\/$/, '') ?? ''}/artifact-downloads`;
        form.target = frame.current?.name ?? 'artifact-download-frame';
        const input = document.createElement('input');
        input.type = 'hidden'; input.name = 'grantToken'; input.value = session.grantToken;
        form.appendChild(input); document.body.appendChild(form); form.submit(); form.remove();
        setStarted(true);
    }
    async function download() {
        if (downloading.current) return;
        downloading.current = true; setBusy(true); setError('');
        try {
            // Preserve the request ID after network errors, so retries cannot consume another use.
            requestId.current ||= crypto.randomUUID();
            const result = await artifactShareService.redeem(token.current, requestId.current);
            setGrant(result); deliver(result);
        } catch (e) { setError(e instanceof Error ? e.message : 'Unable to start the download.'); }
        finally { downloading.current = false; setBusy(false); }
    }
    return <div className="grid min-h-screen place-items-center px-4 py-12">
        <div className="w-full max-w-lg space-y-6 rounded-2xl border bg-card p-6 shadow-sm sm:p-9">
            <div className="flex items-center gap-2 text-xs font-medium uppercase tracking-widest text-muted-foreground"><ShieldCheck className="size-4" />Jass Space · Shared artifact</div>
            {loading ? <p className="flex items-center gap-2 py-10 text-muted-foreground"><Loader2 className="size-5 animate-spin" />Checking link…</p> : <>
                <div className="flex size-14 items-center justify-center rounded-xl bg-primary/10"><FileBox className="size-7 text-primary" /></div>
                <div><h1 className="break-words text-2xl font-semibold">{artifact?.title ?? 'Artifact unavailable'}</h1>{artifact && <p className="mt-2 break-all text-sm text-muted-foreground">{artifact.fileName} · {formatArtifactSize(artifact.sizeBytes)}</p>}</div>
                {artifact && <div className="space-y-2 rounded-lg bg-muted/50 p-4 text-sm text-muted-foreground"><p>{artifact.expiresAt ? `Available until ${new Date(artifact.expiresAt).toLocaleString()}` : 'No time limit'}</p><p>{artifact.remainingDownloads === null ? 'Unlimited downloads' : `${artifact.remainingDownloads} download${artifact.remainingDownloads === 1 ? '' : 's'} remaining when this page loaded`}</p></div>}
                {error && <p role="alert" className="text-sm text-destructive">{error}</p>}
                {artifact && <>
                    {!grant ? <Button className="w-full" disabled={busy} onClick={() => void download()}>{busy ? <Loader2 className="mr-2 size-4 animate-spin" /> : <Download className="mr-2 size-4" />}Download file</Button> : <div className="space-y-3"><p aria-live="polite" className="text-sm">{started ? 'Your download was requested. Check your browser’s downloads.' : 'Your download session is ready.'}</p><Button className="w-full" variant="outline" onClick={() => deliver(grant)}>Retry this download</Button><p className="text-xs text-muted-foreground">Retries use the same allowance until {new Date(grant.expiresAt).toLocaleTimeString()}. If the session expires, reload this page to start a new download.</p></div>}
                    <p className="text-xs leading-relaxed text-muted-foreground">Downloading reserves one use, even if interrupted. Simply opening this page does not count. Keep this link private—anyone who has it can download.</p>
                </>}
            </>}
            <iframe ref={frame} name="artifact-download-frame" title="Artifact download" className="hidden" />
        </div>
    </div>;
}
