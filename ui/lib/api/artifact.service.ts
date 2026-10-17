import { del, get, post, put } from './client';
import type { ArtifactDetail, ArtifactGrant, ArtifactLink, ArtifactLinkSettings, ArtifactPage, ArtifactPublic } from './artifact.types';

export function formatArtifactSize(bytes: number): string {
    if (bytes < 1024) return `${bytes} B`;
    const unit = bytes < 1024 ** 2 ? 'KiB' : bytes < 1024 ** 3 ? 'MiB' : 'GiB';
    const divisor = unit === 'KiB' ? 1024 : unit === 'MiB' ? 1024 ** 2 : 1024 ** 3;
    return `${(bytes / divisor).toFixed(1)} ${unit}`;
}

export const artifactService = {
    list: (search: string, page: number, owner = '') => {
        const query = new URLSearchParams({ search, page: String(page), pageSize: '20' });
        if (owner) query.set('owner', owner);
        return get<ArtifactPage>(`/admin/artifacts?${query}`);
    },
    get: (id: string) => get<ArtifactDetail>(`/admin/artifacts/${id}`),
    byContent: (id: string) => get<ArtifactDetail>(`/admin/artifacts/content/${id}`),
    update: (id: string, title: string, privateNote: string) => put<ArtifactDetail>(`/admin/artifacts/${id}`, { title, privateNote }),
    delete: (id: string) => del<void>(`/admin/artifacts/${id}`),
    createLink: (id: string, settings: ArtifactLinkSettings) => post<{ link: ArtifactLink; token: string }>(`/admin/artifacts/${id}/links`, settings),
    updateLink: (id: string, linkId: string, settings: ArtifactLinkSettings) => put<void>(`/admin/artifacts/${id}/links/${linkId}`, settings),
    revokeLink: (id: string, linkId: string) => post<void>(`/admin/artifacts/${id}/links/${linkId}/revoke`),
    deleteLink: (id: string, linkId: string) => del<void>(`/admin/artifacts/${id}/links/${linkId}`),
    upload: (file: File, title: string, privateNote: string, progress: (value: number) => void, signal: AbortSignal) =>
        uploadArtifactFile('/admin/artifacts', file, title, privateNote, progress, signal),
    replace: (id: string, file: File, progress: (value: number) => void, signal: AbortSignal) =>
        uploadArtifactFile(`/admin/artifacts/${id}/file`, file, undefined, undefined, progress, signal),
    async download(id: string, fallbackName: string, signal: AbortSignal): Promise<void> {
        await get('/auth/me');
        const response = await fetch(`${process.env.NEXT_PUBLIC_API_URL?.replace(/\/$/, '') ?? ''}/admin/artifacts/${id}/download`, {
            headers: { Authorization: `Bearer ${localStorage.getItem('accessToken') ?? ''}` },
            cache: 'no-store', credentials: 'omit', referrerPolicy: 'no-referrer', signal,
        });
        if (!response.ok) {
            const problem = await response.json().catch(() => null);
            throw new Error(problem?.detail ?? problem?.title ?? 'Unable to download this artifact.');
        }
        let fileName = fallbackName;
        const disposition = response.headers.get('Content-Disposition') ?? '';
        const encoded = /filename\*=UTF-8''([^;]+)/i.exec(disposition)?.[1];
        const plain = /filename="([^"]+)"|filename=([^;]+)/i.exec(disposition);
        try { fileName = encoded ? decodeURIComponent(encoded.trim()) : plain?.[1] ?? plain?.[2]?.trim() ?? fallbackName; }
        catch { fileName = fallbackName; }
        const blob = await response.blob();
        signal.throwIfAborted();
        const url = URL.createObjectURL(blob);
        const anchor = document.createElement('a');
        anchor.href = url; anchor.download = fileName; anchor.hidden = true;
        document.body.appendChild(anchor); anchor.click(); anchor.remove();
        setTimeout(() => URL.revokeObjectURL(url), 60_000);
    },
};

async function uploadArtifactFile(path: string, file: File, title: string | undefined, privateNote: string | undefined, progress: (value: number) => void, signal: AbortSignal): Promise<ArtifactDetail> {
    // Refresh an expired access token through the shared client before starting an XHR upload.
    await get('/auth/me');
    if (signal.aborted) throw new Error('Upload cancelled.');
    return new Promise((resolve, reject) => {
        const xhr = new XMLHttpRequest();
        const form = new FormData();
        form.append('file', file);
        if (title !== undefined) form.append('title', title);
        if (privateNote !== undefined) form.append('privateNote', privateNote);
        const abort = () => xhr.abort();
        xhr.open('POST', `${process.env.NEXT_PUBLIC_API_URL?.replace(/\/$/, '') ?? ''}${path}`);
        xhr.setRequestHeader('Authorization', `Bearer ${localStorage.getItem('accessToken') ?? ''}`);
        xhr.timeout = 10 * 60 * 1000;
        xhr.upload.onprogress = (event) => { if (event.lengthComputable) progress(Math.round(event.loaded / event.total * 100)); };
        xhr.onload = () => {
            try {
                const data = JSON.parse(xhr.responseText);
                if (xhr.status >= 200 && xhr.status < 300) resolve(data.data ?? data);
                else reject(new Error(data.detail ?? data.title ?? 'Upload failed.'));
            } catch { reject(new Error('Upload failed. Please try again.')); }
        };
        xhr.onerror = () => reject(new Error('The upload connection was interrupted.'));
        xhr.ontimeout = () => reject(new Error('The upload timed out.'));
        xhr.onabort = () => reject(new Error('Upload cancelled.'));
        xhr.onloadend = () => signal.removeEventListener('abort', abort);
        signal.addEventListener('abort', abort, { once: true });
        if (signal.aborted) { signal.removeEventListener('abort', abort); reject(new Error('Upload cancelled.')); return; }
        xhr.send(form);
    });
}

// Public calls intentionally omit account tokens/cookies and never log capabilities.
async function shareRequest<T>(token: string, idempotencyKey?: string): Promise<T> {
    const response = await fetch(`${process.env.NEXT_PUBLIC_API_URL?.replace(/\/$/, '') ?? ''}/artifact-shares${idempotencyKey ? '/redeem' : ''}`, {
        method: idempotencyKey ? 'POST' : 'GET', cache: 'no-store', credentials: 'omit', referrerPolicy: 'no-referrer',
        headers: { 'X-Artifact-Token': token, ...(idempotencyKey ? { 'Content-Type': 'application/json' } : {}) },
        body: idempotencyKey ? JSON.stringify({ idempotencyKey }) : undefined,
    });
    if (!response.ok) {
        if (response.status === 404) throw new Error('This share link could not be found.');
        if (response.status === 410) throw new Error('This link is no longer available. It may have expired, reached its download limit, or been revoked.');
        if (response.status === 429) throw new Error('Too many requests. Please try again shortly.');
        throw new Error('Unable to access this artifact right now. Please try again.');
    }
    const payload = await response.json();
    return payload.data ?? payload;
}
export const artifactShareService = {
    metadata: (token: string) => shareRequest<ArtifactPublic>(token),
    redeem: (token: string, key: string) => shareRequest<ArtifactGrant>(token, key),
};
