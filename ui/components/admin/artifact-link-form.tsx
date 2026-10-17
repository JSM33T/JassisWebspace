'use client';

import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import type { ArtifactLinkSettings } from '@/lib/api/artifact.types';

function localDate(value: string | null): string {
    if (!value) return '';
    const date = new Date(value);
    return new Date(date.getTime() - date.getTimezoneOffset() * 60_000).toISOString().slice(0, 16);
}

export function ArtifactLinkForm({ initial, busy, onSave, onCancel }: {
    initial?: ArtifactLinkSettings;
    busy: boolean;
    onSave: (settings: ArtifactLinkSettings) => Promise<void>;
    onCancel: () => void;
}) {
    const [expiry, setExpiry] = useState(initial ? initial.expiresAt ? 'custom' : 'never' : '24h');
    const [customExpiry, setCustomExpiry] = useState(localDate(initial?.expiresAt ?? null));
    const [downloads, setDownloads] = useState(initial?.maxDownloads?.toString() ?? '');
    const [error, setError] = useState('');
    return <form className="space-y-5" onSubmit={async event => {
        event.preventDefault(); setError('');
        let expiresAt: string | null = null;
        if (expiry === 'custom') {
            const parsed = new Date(customExpiry);
            if (!customExpiry || !Number.isFinite(parsed.getTime()) || parsed.getTime() <= Date.now()) { setError('Choose a future expiry.'); return; }
            expiresAt = parsed.toISOString();
        } else if (expiry !== 'never') expiresAt = new Date(Date.now() + Number(expiry.slice(0, -1)) * 60 * 60 * 1000).toISOString();
        const maxDownloads = downloads.trim() ? Number(downloads) : null;
        if (maxDownloads !== null && (!Number.isInteger(maxDownloads) || maxDownloads < 1 || maxDownloads > 2147483647)) { setError('Allowed downloads must be a positive whole number.'); return; }
        try { await onSave({ expiresAt, maxDownloads }); }
        catch (e) { setError(e instanceof Error ? e.message : 'Unable to save link settings.'); }
    }}>
        <div className="space-y-2"><Label htmlFor="link-expiry">Link expires</Label>
            <select id="link-expiry" className="w-full rounded-md border bg-background p-2 text-sm" value={expiry} disabled={busy} onChange={e => setExpiry(e.target.value)}>
                <option value="1h">In 1 hour</option><option value="24h">In 24 hours</option><option value="168h">In 7 days</option><option value="custom">At a specific date and time</option><option value="never">Never</option>
            </select>
            {expiry === 'custom' && <><Label htmlFor="link-custom-expiry">Expiry in your local time</Label><Input id="link-custom-expiry" type="datetime-local" required value={customExpiry} onChange={e => setCustomExpiry(e.target.value)} disabled={busy} /></>}
        </div>
        <div className="space-y-2"><Label htmlFor="link-downloads">Allowed downloads</Label><Input id="link-downloads" type="number" min={1} max={2147483647} step={1} placeholder="Unlimited" value={downloads} disabled={busy} onChange={e => setDownloads(e.target.value)} />
            <div className="flex gap-2">{['1', '5', '10', ''].map(value => <Button type="button" key={value} variant="outline" size="sm" disabled={busy} onClick={() => setDownloads(value)}>{value || 'Unlimited'}</Button>)}</div>
            <p className="text-xs text-muted-foreground">Each deliberate download uses one allowance. Page visits and link previews do not count. Interrupted downloads still count once a session is issued.</p>
        </div>
        {initial && <p className="text-xs text-muted-foreground">Changing limits preserves the download count. Extending an expired or exhausted link can make it active again.</p>}
        {error && <p role="alert" className="text-sm text-destructive">{error}</p>}
        <div className="flex justify-end gap-2"><Button type="button" variant="outline" disabled={busy} onClick={onCancel}>Cancel</Button><Button disabled={busy}>{busy ? 'Saving…' : initial ? 'Save settings' : 'Create share link'}</Button></div>
    </form>;
}
