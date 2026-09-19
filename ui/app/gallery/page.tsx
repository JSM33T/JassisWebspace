'use client';

import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { ArrowLeft, ArrowRight, Grid2X2, Grid3X3, Images, Search, X } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Skeleton } from '@/components/ui/skeleton';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { AlbumCard } from '@/components/gallery/album-card';
import { GalleryEditDialog } from '@/components/gallery/gallery-edit-dialog';
import { PageBanner } from '@/components/page-banner';
import { galleryService } from '@/lib/api/gallery.service';
import { type Album, type GallerySortOrder } from '@/lib/api/gallery.types';
import { ApiError } from '@/lib/api/types';
import { cn } from '@/lib/utils';
import { useUser } from '@/contexts/UserContext';

const PAGE_SIZE = 12;

function parseGallerySortOrder(value: string | null): GallerySortOrder {
    return value === 'oldest' || value === 'title' ? value : 'newest';
}

function parseGalleryPage(value: string | null): number {
    const page = Number(value || 1);
    return Number.isSafeInteger(page) && page > 0 ? page : 1;
}

export default function GalleryPage() {
    const { user } = useUser();
    const router = useRouter();
    const searchParams = useSearchParams();
    const [editingAlbum, setEditingAlbum] = useState<Album | null>(null);
    const [albums, setAlbums] = useState<Album[]>([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);
    const requestId = useRef(0);
    const resultsRef = useRef<HTMLElement>(null);

    const query = searchParams.get('q')?.trim() || '';
    const sortOrder = parseGallerySortOrder(searchParams.get('sort'));
    const requestedPage = parseGalleryPage(searchParams.get('page'));
    const compact = searchParams.get('view') === 'compact';
    const [searchInput, setSearchInput] = useState(query);

    useEffect(() => { setSearchInput(query); }, [query]);

    const loadAlbums = useCallback(async () => {
        const currentRequest = ++requestId.current;
        setLoading(true);
        setError(null);
        try {
            // Album metadata only; cover images remain lazy loaded by GalleryThumb.
            const data = await galleryService.getAllAlbums();
            if (currentRequest === requestId.current) setAlbums(data);
        } catch (err) {
            if (currentRequest !== requestId.current) return;
            setError(err instanceof ApiError
                ? err.problemDetails.detail || err.problemDetails.title
                : 'We couldn’t load the albums. Please try again.');
        } finally {
            if (currentRequest === requestId.current) setLoading(false);
        }
    }, []);

    useEffect(() => {
        void loadAlbums();
        return () => { requestId.current += 1; };
    }, [loadAlbums]);

    const filteredAlbums = useMemo(() => {
        const words = query.toLocaleLowerCase().split(/\s+/).filter(Boolean);
        return albums.filter(album => {
            const text = [album.name, album.description, ...album.authors.flatMap(author => [author.displayName, author.username])]
                .filter(Boolean).join(' ').toLocaleLowerCase();
            return words.every(word => text.includes(word));
        }).sort((a, b) => {
            const dateDifference = new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime();
            const titleDifference = a.name.localeCompare(b.name, undefined, { numeric: true, sensitivity: 'base' });
            if (sortOrder === 'title') return titleDifference || -dateDifference;
            return (sortOrder === 'oldest' ? dateDifference : -dateDifference) || titleDifference;
        });
    }, [albums, query, sortOrder]);

    const pageCount = Math.max(1, Math.ceil(filteredAlbums.length / PAGE_SIZE));
    const page = Math.min(requestedPage, pageCount);
    const offset = (page - 1) * PAGE_SIZE;
    const visibleAlbums = filteredAlbums.slice(offset, offset + PAGE_SIZE);
    const singleAlbum = albums.length === 1;
    const smallCollection = albums.length <= 2;
    const totalPhotos = albums.reduce((total, album) => total + album.imageCount, 0);
    const pageNumbers = [...new Set([1, page - 1, page, page + 1, pageCount])]
        .filter(value => value >= 1 && value <= pageCount).sort((a, b) => a - b);
    const gridClassName = cn('grid gap-4 sm:gap-5 lg:gap-6',
        singleAlbum ? 'mx-auto max-w-4xl grid-cols-1'
            : albums.length === 2 ? 'grid-cols-1 sm:grid-cols-2'
                : compact ? 'grid-cols-2 md:grid-cols-3 lg:grid-cols-4'
                    : 'grid-cols-1 sm:grid-cols-2 lg:grid-cols-3');

    const updateParams = (updates: Record<string, string | null>) => {
        const params = new URLSearchParams(searchParams.toString());
        for (const [key, value] of Object.entries(updates)) {
            if (value) params.set(key, value);
            else params.delete(key);
        }
        router.push(params.size ? `/gallery?${params}` : '/gallery', { scroll: false });
    };

    // Old bookmarks or an edited collection can point beyond the last page.
    useEffect(() => {
        if (loading || error || requestedPage <= pageCount) return;
        const params = new URLSearchParams(searchParams.toString());
        if (pageCount > 1) params.set('page', String(pageCount));
        else params.delete('page');
        router.replace(params.size ? `/gallery?${params}` : '/gallery', { scroll: false });
    }, [loading, error, requestedPage, pageCount, router, searchParams]);

    const goToPage = (nextPage: number) => {
        updateParams({ page: nextPage > 1 ? String(nextPage) : null });
        resultsRef.current?.scrollIntoView({ block: 'start' });
        resultsRef.current?.focus({ preventScroll: true });
    };

    const clearSearch = () => {
        setSearchInput('');
        updateParams({ q: null, page: null });
    };

    return (
        <div className="flex min-h-screen flex-col bg-background/50">
            {editingAlbum && user?.role === 'admin' && (
                <GalleryEditDialog target={{ kind: 'album', album: editingAlbum }} onClose={() => setEditingAlbum(null)} onSaved={() => { void loadAlbums(); }} />
            )}
            <PageBanner
                variant="default"
                badge="The photo journal"
                badgeIcon={Images}
                title="Gallery"
                description="Places, journeys, and everyday moments, collected in albums."
                maxWidth="max-w-7xl"
                rightContent={
                    !loading && !error && albums.length > 0 ? (
                        <div className="flex flex-wrap items-center gap-3 text-sm text-muted-foreground sm:justify-end">
                            <span><strong className="font-semibold text-foreground">{albums.length.toLocaleString()}</strong> {albums.length === 1 ? 'album' : 'albums'}</span>
                            <span aria-hidden="true" className="size-1 rounded-full bg-border" />
                            <span><strong className="font-semibold text-foreground">{totalPhotos.toLocaleString()}</strong> {totalPhotos === 1 ? 'photo' : 'photos'}</span>
                        </div>
                    ) : undefined
                }
            />

            <main className="flex-1 px-4 pb-12 pt-5 sm:px-6 md:px-10 md:pt-6">
                <div className="mx-auto max-w-7xl">
                    <div className="mb-6 flex flex-col gap-3 border-b border-border/40 pb-5 md:flex-row md:items-center md:justify-between">
                        <form role="search" aria-label="Search albums" className="flex min-w-0 flex-1 gap-2 md:max-w-md" onSubmit={event => {
                            event.preventDefault();
                            updateParams({ q: searchInput.trim() || null, page: null });
                        }}>
                            <div className="relative min-w-0 flex-1">
                                <label htmlFor="album-search" className="sr-only">Search album titles, descriptions, or authors</label>
                                <Search className="pointer-events-none absolute left-3 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" aria-hidden="true" />
                                <Input id="album-search" type="search" value={searchInput} onChange={event => setSearchInput(event.target.value)} placeholder="Find an album…" className="h-11 border-border/70 bg-background pl-9 pr-10 [&::-webkit-search-cancel-button]:appearance-none" />
                                {searchInput && <button type="button" className="absolute inset-y-0 right-0 flex w-10 items-center justify-center rounded-r-md text-muted-foreground hover:text-foreground focus-visible:outline-2 focus-visible:outline-ring" onClick={clearSearch} aria-label="Clear search"><X className="size-4" /></button>}
                            </div>
                            <Button type="submit" variant="outline" className="h-11 px-4">Search</Button>
                        </form>
                        {albums.length > 1 && <div className="flex items-center justify-between gap-3">
                            <Select value={sortOrder} onValueChange={value => updateParams({ sort: value === 'newest' ? null : value, page: null })}>
                                <SelectTrigger aria-label="Sort albums" className="h-11 min-w-40 flex-1 border-border/70 bg-background lg:flex-none"><SelectValue /></SelectTrigger>
                                <SelectContent>
                                    <SelectItem value="newest">Newest first</SelectItem>
                                    <SelectItem value="oldest">Oldest first</SelectItem>
                                    <SelectItem value="title">Title A–Z</SelectItem>
                                </SelectContent>
                            </Select>
                            {!smallCollection && <div role="group" aria-label="Album layout" className="flex shrink-0 gap-1 rounded-lg bg-muted/50 p-1">
                                <Button variant={compact ? 'ghost' : 'secondary'} size="icon" className="size-9" aria-label="Roomy album view" aria-pressed={!compact} title="Roomy view" onClick={() => updateParams({ view: null })}><Grid2X2 className="size-4" /></Button>
                                <Button variant={compact ? 'secondary' : 'ghost'} size="icon" className="size-9" aria-label="Compact album view" aria-pressed={compact} title="Compact view" onClick={() => updateParams({ view: 'compact' })}><Grid3X3 className="size-4" /></Button>
                            </div>}
                        </div>}
                    </div>

                    <section ref={resultsRef} tabIndex={-1} aria-labelledby="album-results-heading" aria-busy={loading} className="scroll-mt-24 outline-none">
                        <div className="mb-5 flex flex-wrap items-baseline justify-between gap-2">
                            <h2 id="album-results-heading" className="text-base font-semibold tracking-tight">{query ? 'Search results' : singleAlbum ? 'Explore the album' : 'Explore the albums'}</h2>
                            <p role="status" className={cn('text-sm text-muted-foreground', !loading && !error && !query && 'sr-only')}>{loading ? 'Loading albums…' : error ? 'Albums unavailable' : `${filteredAlbums.length} ${filteredAlbums.length === 1 ? 'album' : 'albums'}${query ? ' found' : ''}`}</p>
                        </div>
                        {query && <p className="mb-5 break-words text-sm text-muted-foreground">Results for <span className="font-medium text-foreground">“{query}”</span></p>}

                        {loading ? (
                            <div className={gridClassName} aria-hidden="true">
                                {Array.from({ length: singleAlbum ? 1 : albums.length === 2 ? 2 : 6 }, (_, index) => (
                                    <div key={index} className="overflow-hidden rounded-2xl border border-border/60 bg-card p-2">
                                        <Skeleton className={cn('w-full rounded-xl', singleAlbum ? 'aspect-[4/3] sm:aspect-[16/9]' : compact && !smallCollection ? 'aspect-square' : 'aspect-[4/3]')} />
                                        <div className="space-y-3 px-3 py-5"><Skeleton className="h-5 w-3/4" /><Skeleton className="h-3 w-full" /><Skeleton className="h-3 w-1/3" /></div>
                                    </div>
                                ))}
                            </div>
                        ) : error ? (
                            <div role="alert" className="rounded-2xl border border-dashed border-border py-16 text-center">
                                <Images className="mx-auto mb-4 size-9 text-muted-foreground" />
                                <h3 className="text-xl font-semibold">The albums couldn’t be loaded</h3>
                                <p className="mx-auto mb-6 mt-2 max-w-md px-4 text-muted-foreground">{error}</p>
                                <Button onClick={() => void loadAlbums()}>Try again</Button>
                            </div>
                        ) : visibleAlbums.length === 0 ? (
                            <div className="rounded-2xl border border-dashed border-border px-5 py-20 text-center">
                                {query ? <Search className="mx-auto mb-5 size-9 text-muted-foreground" /> : <Images className="mx-auto mb-5 size-9 text-muted-foreground" />}
                                <h3 className="text-xl font-semibold">{query ? 'No matching albums' : 'Stories are on their way'}</h3>
                                <p className="mx-auto mt-2 max-w-md text-muted-foreground">{query ? 'Try a different title, a place, or an author’s name.' : 'Check back soon for new albums and moments worth keeping.'}</p>
                                {query && <Button variant="outline" className="mt-6" onClick={clearSearch}>View all albums</Button>}
                            </div>
                        ) : (
                            <div className={gridClassName}>
                                {visibleAlbums.map(album => <AlbumCard key={album.id} album={album} compact={compact && !smallCollection} prominent={singleAlbum} onEdit={user?.role === 'admin' ? setEditingAlbum : undefined} />)}
                            </div>
                        )}

                        {!loading && !error && visibleAlbums.length > 0 && pageCount > 1 && (
                            <div className="mt-8 flex flex-col items-center justify-between gap-4 border-t border-border/60 pt-6 sm:flex-row">
                                <p className="text-sm text-muted-foreground">Showing {offset + 1}–{offset + visibleAlbums.length} of {filteredAlbums.length} albums</p>
                                {pageCount > 1 && (
                                    <nav aria-label="Album pages" className="flex flex-wrap items-center justify-center gap-1">
                                        <Button variant="ghost" size="icon" aria-label="Previous page" disabled={page === 1} onClick={() => goToPage(page - 1)}><ArrowLeft className="size-4" /></Button>
                                        {pageNumbers.map((number, index) => (
                                            <span key={number} className="inline-flex items-center gap-1">
                                                {index > 0 && number - pageNumbers[index - 1] > 1 && <span className="px-1 text-muted-foreground" aria-hidden="true">…</span>}
                                                <Button variant={number === page ? 'default' : 'ghost'} size="icon" aria-label={`Page ${number}`} aria-current={number === page ? 'page' : undefined} onClick={() => goToPage(number)}>{number}</Button>
                                            </span>
                                        ))}
                                        <Button variant="ghost" size="icon" aria-label="Next page" disabled={page === pageCount} onClick={() => goToPage(page + 1)}><ArrowRight className="size-4" /></Button>
                                    </nav>
                                )}
                            </div>
                        )}
                    </section>
                </div>
            </main>
        </div>
    );
}
