import type { Metadata } from 'next';
import Image from 'next/image';
import Link from 'next/link';
import { ArrowUpRight, Download, FileBox } from 'lucide-react';

import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { formatArtifactSize } from '@/lib/api/artifact.service';
import type { PublicArtifactPage } from '@/lib/api/artifact.types';
import { artifactCoverUrl, artifactDownloadUrl } from '@/lib/artifact-public-links';
import { apiBaseUrl, CONTENT_FETCH_TIMEOUT_MS, parseApiData } from '@/lib/server/cache-utils';
import { buildMetadata } from '@/lib/seo';

export const metadata: Metadata = buildMetadata({
    title: 'Downloads',
    description: 'Find presets, templates, and other downloadable resources from JassSpace.',
    canonicalPath: '/downloads',
});

function first(value: string | string[] | undefined) {
    return Array.isArray(value) ? value[0] : value;
}

function catalogUrl(search: string, category: string, page = 1) {
    const params = new URLSearchParams();
    if (search) params.set('q', search);
    if (category) params.set('category', category);
    if (page > 1) params.set('page', String(page));
    return params.size ? `/downloads?${params}` : '/downloads';
}

async function loadDownloads(search: string, category: string, page: number): Promise<PublicArtifactPage | null> {
    try {
        const params = new URLSearchParams({ search, page: String(page) });
        if (category) params.set('category', category);
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
    searchParams: Promise<{ q?: string | string[]; category?: string | string[]; page?: string | string[] }>;
}) {
    const query = await searchParams;
    const search = first(query.q)?.trim().slice(0, 200) ?? '';
    const category = first(query.category)?.trim().slice(0, 80) ?? '';
    const requestedPage = Number(first(query.page));
    const page = Number.isInteger(requestedPage) && requestedPage >= 1 && requestedPage <= 2147483647 ? requestedPage : 1;
    const data = await loadDownloads(search, category, page);
    const pages = data ? Math.ceil(data.total / data.pageSize) : 0;
    const categories = data?.categories ?? [];
    const selectedCategory = categories.find(item => item.toLowerCase() === category.toLowerCase()) ?? category;

    return (
        <main className="mx-auto min-h-screen max-w-5xl px-4 pt-28 pb-20 sm:px-6 sm:pt-32">
            <header className="mb-8 border-b pb-8">
                <h1 className="text-4xl font-semibold tracking-tight sm:text-5xl">Downloads</h1>
                <p className="mt-3 text-base text-muted-foreground">Presets, templates, guides, and other files you can use in your own projects.</p>
            </header>

            <form action="/downloads" method="get" role="search" className="mb-6 flex flex-wrap items-center gap-2">
                <Input
                    type="search"
                    name="q"
                    aria-label="Search downloads"
                    placeholder="Search downloads or tags"
                    defaultValue={search}
                    maxLength={200}
                    className="min-w-40 max-w-sm flex-1"
                />
                {(categories.length > 0 || category) && (
                    <select name="category" aria-label="Download category" defaultValue={selectedCategory} className="h-9 max-w-full rounded-md border border-input bg-background px-3 text-sm">
                        <option value="">All categories</option>
                        {category && !categories.includes(selectedCategory) && <option value={category}>{category}</option>}
                        {categories.map(item => <option key={item} value={item}>{item}</option>)}
                    </select>
                )}
                <Button type="submit" variant="outline">Search</Button>
                {(search || category) && <Button asChild variant="ghost"><Link href="/downloads">Clear</Link></Button>}
            </form>

            {!data ? (
                <div className="space-y-3 rounded-xl border bg-card p-6">
                    <p role="status" className="text-muted-foreground">Downloads are temporarily unavailable.</p>
                    <Button variant="outline" asChild><a href={catalogUrl(search, category, page)}>Try again</a></Button>
                </div>
            ) : data.items.length === 0 ? (
                <div className="rounded-xl border bg-card p-8 text-center">
                    <FileBox aria-hidden="true" className="mx-auto mb-3 size-7 text-muted-foreground" />
                    <p className="font-medium">{search || category ? 'No matching downloads.' : 'No files have been published yet.'}</p>
                </div>
            ) : (
                <ul aria-label="Download articles" className="space-y-5">
                    {data.items.map((artifact) => (
                        <li key={artifact.id}>
                            <article className="group relative grid gap-4 rounded-2xl border bg-card p-4 transition-colors hover:border-primary/40 sm:grid-cols-[13rem_minmax(0,1fr)] sm:gap-6 sm:p-5">
                                <div className={`relative grid place-items-center overflow-hidden rounded-xl bg-muted ${artifact.hasCover ? 'aspect-video sm:aspect-[4/3]' : 'min-h-20 sm:aspect-[4/3]'}`}>
                                    {artifact.hasCover ? <Image src={artifactCoverUrl(artifact.id)} alt="" fill unoptimized className="object-cover" /> :
                                        <FileBox aria-hidden="true" className="size-8 text-primary/70" />}
                                </div>
                                <div className="flex min-w-0 flex-col items-start justify-center gap-3">
                                    {artifact.category && <Badge variant="outline" className="h-auto max-w-full whitespace-normal wrap-anywhere">{artifact.category}</Badge>}
                                    <h2 className="text-xl font-semibold leading-tight tracking-tight wrap-anywhere sm:text-2xl">
                                        <Link href={`/downloads/${artifact.id}`} className="group-hover:text-primary after:absolute after:inset-0 after:rounded-2xl focus-visible:outline-none focus-visible:after:ring-2 focus-visible:after:ring-ring">
                                            {artifact.title}
                                        </Link>
                                    </h2>
                                    {artifact.description && <p className="line-clamp-3 text-sm leading-relaxed text-muted-foreground wrap-anywhere">{artifact.description}</p>}
                                    {artifact.tags.length > 0 && <ul aria-label="Tags" className="flex flex-wrap gap-1.5">
                                        {artifact.tags.map(tag => <li key={tag} className="min-w-0 max-w-full"><Badge variant="secondary" className="h-auto max-w-full whitespace-normal wrap-anywhere">{tag}</Badge></li>)}
                                    </ul>}
                                    <div className="flex w-full flex-wrap items-center justify-between gap-3 border-t pt-3">
                                        <span className="min-w-0 text-xs text-muted-foreground wrap-anywhere">{artifact.fileName} · {formatArtifactSize(artifact.sizeBytes)}</span>
                                        <Button asChild variant="outline" size="sm" className="relative z-10">
                                            <a href={artifactDownloadUrl(artifact.id)} aria-label={`Download ${artifact.title}`}><Download />Download</a>
                                        </Button>
                                    </div>
                                </div>
                                <ArrowUpRight aria-hidden="true" className="absolute top-5 right-5 hidden size-4 text-muted-foreground sm:block" />
                            </article>
                        </li>
                    ))}
                </ul>
            )}

            {data && pages > 1 && (
                <nav aria-label="Downloads pages" className="mt-6 flex flex-wrap items-center justify-between gap-3">
                    {data.page > 1 ? <Button asChild variant="outline"><Link href={catalogUrl(search, category, data.page - 1)}>Previous</Link></Button> : <Button variant="outline" disabled>Previous</Button>}
                    <p className="text-sm text-muted-foreground">Page {data.page} of {pages}</p>
                    {data.page < pages ? <Button asChild variant="outline"><Link href={catalogUrl(search, category, data.page + 1)}>Next</Link></Button> : <Button variant="outline" disabled>Next</Button>}
                </nav>
            )}
        </main>
    );
}
