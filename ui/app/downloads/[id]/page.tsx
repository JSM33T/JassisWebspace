import type { Metadata } from 'next';
import Image from 'next/image';
import Link from 'next/link';
import { notFound } from 'next/navigation';
import { ArrowLeft, Download, FileBox } from 'lucide-react';
import { cache } from 'react';

import { MarkdownRenderer } from '@/components/blog/MarkdownRenderer';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { formatArtifactSize } from '@/lib/api/artifact.service';
import type { PublicArtifactDetail } from '@/lib/api/artifact.types';
import { artifactCoverUrl, artifactDownloadUrl } from '@/lib/artifact-public-links';
import { apiBaseUrl, CONTENT_FETCH_TIMEOUT_MS, parseApiData } from '@/lib/server/cache-utils';
import { buildMetadata } from '@/lib/seo';

type DownloadPageProps = { params: Promise<{ id: string }> };
type DownloadResult = { status: 'ready'; data: PublicArtifactDetail } | { status: 'missing' | 'unavailable' };

const loadDownload = cache(async (id: string): Promise<DownloadResult> => {
    if (!/^[0-9a-f]{8}(?:-[0-9a-f]{4}){3}-[0-9a-f]{12}$/i.test(id)) return { status: 'missing' };
    try {
        const response = await fetch(`${apiBaseUrl()}/public-artifacts/${encodeURIComponent(id)}`, {
            cache: 'no-store',
            signal: AbortSignal.timeout(CONTENT_FETCH_TIMEOUT_MS),
        });
        if (response.status === 404) return { status: 'missing' };
        if (response.ok) {
            const data = await parseApiData<PublicArtifactDetail>(response);
            if (data?.artifact) return { status: 'ready', data };
        }
    } catch {
        return { status: 'unavailable' };
    }
    return { status: 'unavailable' };
});

export async function generateMetadata({ params }: DownloadPageProps): Promise<Metadata> {
    const { id } = await params;
    const result = await loadDownload(id);
    if (result.status !== 'ready') return buildMetadata({ title: 'Download', noIndex: true });
    const { artifact } = result.data;
    return buildMetadata({
        title: artifact.title,
        description: artifact.description ?? `Download ${artifact.fileName} from JassSpace.`,
        canonicalPath: `/downloads/${artifact.id}`,
        image: artifact.hasCover ? artifactCoverUrl(artifact.id) : undefined,
        tags: artifact.tags,
        type: 'article',
    });
}

export default async function DownloadArticlePage({ params }: DownloadPageProps) {
    const { id } = await params;
    const result = await loadDownload(id);
    if (result.status === 'missing') notFound();
    if (result.status !== 'ready') {
        return (
            <main className="mx-auto min-h-screen max-w-3xl space-y-4 px-4 pt-28 pb-20 sm:px-6">
                <h1 className="text-2xl font-semibold">Download temporarily unavailable</h1>
                <Button asChild variant="outline"><a href={`/downloads/${encodeURIComponent(id)}`}>Try again</a></Button>
            </main>
        );
    }

    const { artifact, body } = result.data;
    return (
        <main className="mx-auto min-h-screen max-w-5xl px-4 pt-24 pb-20 sm:px-6 sm:pt-28">
            <Button asChild variant="ghost" className="-ml-2 mb-6">
                <Link href="/downloads"><ArrowLeft />All downloads</Link>
            </Button>

            <article>
                <header className="max-w-3xl space-y-4">
                    {artifact.category && <Badge asChild variant="outline" className="h-auto max-w-full whitespace-normal wrap-anywhere">
                        <Link href={`/downloads?${new URLSearchParams({ category: artifact.category })}`}>{artifact.category}</Link>
                    </Badge>}
                    <h1 className="text-4xl font-semibold leading-tight tracking-tight wrap-anywhere sm:text-5xl">{artifact.title}</h1>
                    {artifact.description && <p className="text-lg leading-relaxed whitespace-pre-line text-muted-foreground wrap-anywhere">{artifact.description}</p>}
                    {artifact.tags.length > 0 && <ul aria-label="Tags" className="flex flex-wrap gap-1.5">
                        {artifact.tags.map(tag => <li key={tag} className="min-w-0 max-w-full"><Badge variant="secondary" className="h-auto max-w-full whitespace-normal wrap-anywhere">{tag}</Badge></li>)}
                    </ul>}
                </header>

                {artifact.hasCover && (
                    <div className="relative mt-7 aspect-video max-h-[34rem] overflow-hidden rounded-2xl border bg-muted">
                        <Image src={artifactCoverUrl(artifact.id)} alt="" fill unoptimized preload className="object-cover" />
                    </div>
                )}

                <div className="mt-8 grid items-start gap-8 lg:grid-cols-[minmax(0,1fr)_18rem]">
                    <aside aria-label="Download file" className="order-first rounded-xl border bg-card p-5 lg:order-last lg:sticky lg:top-24">
                        <div className="mb-4 flex items-start gap-3">
                            <FileBox aria-hidden="true" className="mt-0.5 size-5 shrink-0 text-primary" />
                            <div className="min-w-0">
                                <p className="font-medium wrap-anywhere">{artifact.fileName}</p>
                                <p className="mt-1 text-sm text-muted-foreground">{formatArtifactSize(artifact.sizeBytes)}</p>
                            </div>
                        </div>
                        <Button asChild className="w-full">
                            <a href={artifactDownloadUrl(artifact.id)}><Download />Download file</a>
                        </Button>
                    </aside>
                    {body && <section aria-labelledby="download-details" className="min-w-0">
                        <h2 id="download-details" className="mb-4 text-xl font-semibold">About this download</h2>
                        <MarkdownRenderer content={body} />
                    </section>}
                </div>
            </article>
        </main>
    );
}
