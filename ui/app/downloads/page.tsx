import type { Metadata } from 'next';
import Link from 'next/link';
import { Download, FileBox } from 'lucide-react';

import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { formatArtifactSize } from '@/lib/api/artifact.service';
import type { PublicArtifactPage } from '@/lib/api/artifact.types';
import { apiBaseUrl, CONTENT_FETCH_TIMEOUT_MS, parseApiData } from '@/lib/server/cache-utils';
import { buildMetadata } from '@/lib/seo';

export const metadata: Metadata = buildMetadata({
    title: 'Downloads',
    description: 'Browse files published on JassSpace.',
    canonicalPath: '/downloads',
});

function first(value: string | string[] | undefined) {
    return Array.isArray(value) ? value[0] : value;
}

function catalogUrl(search: string, page = 1) {
    const params = new URLSearchParams();
    if (search) params.set('q', search);
    if (page > 1) params.set('page', String(page));
    return params.size ? `/downloads?${params}` : '/downloads';
}

async function loadDownloads(search: string, page: number): Promise<PublicArtifactPage | null> {
    try {
        const params = new URLSearchParams({ search, page: String(page) });
        const response = await fetch(`${apiBaseUrl()}/public-artifacts?${params}`, {
            cache: 'no-store',
            signal: AbortSignal.timeout(CONTENT_FETCH_TIMEOUT_MS),
        });
        return response.ok ? await parseApiData<PublicArtifactPage>(response) : null;
    } catch {
        return null;
    }
}

export default async function DownloadsPage({
    searchParams,
}: {
    searchParams: Promise<{ q?: string | string[]; page?: string | string[] }>;
}) {
    const query = await searchParams;
    const search = first(query.q)?.trim().slice(0, 200) ?? '';
    const requestedPage = Number(first(query.page));
    const page = Number.isInteger(requestedPage) && requestedPage >= 1 && requestedPage <= 2147483647 ? requestedPage : 1;
    const data = await loadDownloads(search, page);
    const pages = data ? Math.ceil(data.total / data.pageSize) : 0;
    const publicApi = process.env.NEXT_PUBLIC_API_URL?.replace(/\/$/, '') ?? '';

    return (
        <main className="mx-auto min-h-screen max-w-5xl px-4 pt-28 pb-20 sm:px-6 sm:pt-32">
            <header className="mb-8 border-b pb-8">
                <h1 className="text-4xl font-semibold tracking-tight sm:text-5xl">Downloads</h1>
                <p className="mt-3 text-base text-muted-foreground">Browse and download files published on JassSpace.</p>
            </header>

            <form action="/downloads" method="get" role="search" className="mb-6 flex flex-wrap items-center gap-2">
                <Input
                    type="search"
                    name="q"
                    aria-label="Search downloads"
                    placeholder="Search by title or filename"
                    defaultValue={search}
                    maxLength={200}
                    className="min-w-40 max-w-sm flex-1"
                />
                <Button type="submit" variant="outline">Search</Button>
                {search && <Button asChild variant="ghost"><Link href="/downloads">Clear</Link></Button>}
            </form>

            {!data ? (
                <div className="space-y-3 rounded-xl border bg-card p-6">
                    <p role="status" className="text-muted-foreground">Downloads are temporarily unavailable.</p>
                    <Button variant="outline" asChild><a href={catalogUrl(search, page)}>Try again</a></Button>
                </div>
            ) : data.items.length === 0 ? (
                <div className="rounded-xl border bg-card p-8 text-center">
                    <FileBox aria-hidden="true" className="mx-auto mb-3 size-7 text-muted-foreground" />
                    <p className="font-medium">{search ? 'No matching downloads.' : 'No files have been published yet.'}</p>
                </div>
            ) : (
                <ul aria-label="Published downloads" className="divide-y overflow-hidden rounded-xl border bg-card">
                    {data.items.map((artifact) => (
                        <li key={artifact.id} className="grid grid-cols-[auto_minmax(0,1fr)] items-center gap-3 p-4 sm:grid-cols-[auto_minmax(0,1fr)_auto] sm:gap-4 sm:p-5">
                            <FileBox aria-hidden="true" className="size-5 shrink-0 text-primary" />
                            <div className="min-w-0">
                                <h2 className="font-semibold wrap-anywhere">{artifact.title}</h2>
                                <p className="mt-1 flex flex-wrap gap-x-2 text-sm text-muted-foreground">
                                    {artifact.fileName !== artifact.title && <span className="wrap-anywhere">{artifact.fileName}</span>}
                                    <span>{formatArtifactSize(artifact.sizeBytes)}</span>
                                </p>
                            </div>
                            <Button asChild variant="outline" className="col-start-2 justify-self-start sm:col-start-auto">
                                <a href={`${publicApi}/public-artifacts/${encodeURIComponent(artifact.id)}/download`} aria-label={`Download ${artifact.title}`}>
                                    <Download />
                                    Download
                                </a>
                            </Button>
                        </li>
                    ))}
                </ul>
            )}

            {data && pages > 1 && (
                <nav aria-label="Downloads pages" className="mt-6 flex flex-wrap items-center justify-between gap-3">
                    {data.page > 1 ? <Button asChild variant="outline"><Link href={catalogUrl(search, data.page - 1)}>Previous</Link></Button> : <Button variant="outline" disabled>Previous</Button>}
                    <p className="text-sm text-muted-foreground">Page {data.page} of {pages}</p>
                    {data.page < pages ? <Button asChild variant="outline"><Link href={catalogUrl(search, data.page + 1)}>Next</Link></Button> : <Button variant="outline" disabled>Next</Button>}
                </nav>
            )}
        </main>
    );
}
