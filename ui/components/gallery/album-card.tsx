'use client';

import Link from 'next/link';
import { ArrowUpRight, Images, Pencil } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { GalleryThumb } from '@/components/gallery/gallery-thumb';
import { AlbumEngagement } from '@/components/gallery/album-engagement';
import { type Album } from '@/lib/api/gallery.types';
import { toGalleryThumbUrl } from '@/lib/gallery-media';
import { applyCacheBustingParam } from '@/lib/cacheBust';
import { cn } from '@/lib/utils';

export function AlbumCard({ album, compact, prominent = false, onEdit }: {
    album: Album;
    compact: boolean;
    prominent?: boolean;
    onEdit?: (album: Album) => void;
}) {
    const createdAt = new Date(album.createdAt);
    const dateLabel = Number.isNaN(createdAt.getTime()) ? null : createdAt.toLocaleDateString('en-US', {
        month: 'short', year: 'numeric', timeZone: 'UTC',
    });
    const authors = album.authors.map(author => author.displayName || author.username).join(', ');
    const thumbnailImages = [
        ...(album.cover ? [{ url: album.cover, version: album.updatedAt || album.createdAt }] : []),
        ...(album.previewImages ?? []).map(image => ({ url: image.url, version: image.createdAt })),
    ]
        .filter((image, index, images) => images.findIndex(candidate => candidate.url === image.url) === index)
        .slice(0, 3)
        .map(image => applyCacheBustingParam(toGalleryThumbUrl(image.url), image.version));
    const [foregroundImage, ...backgroundImages] = thumbnailImages;
    const hasStackedImages = backgroundImages.length > 0;

    return (
        <article className="group flex h-full min-w-0 flex-col text-foreground">
            <Link href={`/gallery/${album.slug}`} className="flex min-w-0 flex-1 flex-col rounded-2xl outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-4 focus-visible:ring-offset-background" aria-label={`Open ${album.name}, ${album.imageCount} ${album.imageCount === 1 ? 'photo' : 'photos'}`}>
                <div className={cn('relative isolate shrink-0', prominent ? 'aspect-[4/3] sm:aspect-[16/9]' : compact ? 'aspect-square' : 'aspect-[4/3]')}>
                    {backgroundImages.map((image, index) => (
                        <div key={image} className={cn(
                            'absolute inset-x-[10%] inset-y-[12%] overflow-hidden rounded-2xl bg-muted shadow-xl shadow-black/25 brightness-90 transition-transform duration-300 ease-out motion-reduce:transition-none',
                            prominent && 'sm:inset-y-[16%]',
                            index === 0
                                ? '-translate-x-[5%] -rotate-[9deg] motion-safe:group-hover:-rotate-[12deg] motion-safe:group-focus-within:-rotate-[12deg]'
                                : 'translate-x-[5%] rotate-[10deg] motion-safe:group-hover:rotate-[13deg] motion-safe:group-focus-within:rotate-[13deg]',
                        )}>
                            <GalleryThumb src={image} alt="" fill showFallbackIcon={false}
                                sizes={prominent ? '(max-width: 960px) 100vw, 896px' : compact ? '(max-width: 768px) 50vw, (max-width: 1024px) 33vw, 25vw' : '(max-width: 640px) 100vw, (max-width: 1024px) 50vw, 33vw'} />
                        </div>
                    ))}
                    <div className={cn('absolute overflow-hidden rounded-2xl bg-muted shadow-lg shadow-black/15 transition-transform duration-300 ease-out motion-safe:group-hover:-translate-y-1 motion-safe:group-focus-within:-translate-y-1 motion-reduce:transition-none', hasStackedImages ? 'inset-x-[8%] inset-y-[12%]' : 'inset-0', hasStackedImages && prominent && 'sm:inset-y-[16%]')}>
                        <GalleryThumb src={foregroundImage} alt="" fill
                            sizes={prominent ? '(max-width: 960px) 100vw, 896px' : compact ? '(max-width: 768px) 50vw, (max-width: 1024px) 33vw, 25vw' : '(max-width: 640px) 100vw, (max-width: 1024px) 50vw, 33vw'}
                            imageClassName="duration-500 ease-out motion-safe:group-hover:scale-[1.03] motion-safe:group-focus-within:scale-[1.03] motion-reduce:transition-none" />
                        <span className="absolute left-3 top-3 inline-flex items-center gap-1.5 rounded-full bg-black/40 px-2.5 py-1.5 text-xs font-medium text-white backdrop-blur-md">
                            <Images className="size-3.5" aria-hidden="true" />
                            {album.imageCount} <span className={compact ? 'hidden sm:inline' : ''}>{album.imageCount === 1 ? 'photo' : 'photos'}</span>
                        </span>
                        <span className="absolute right-3 top-3 flex size-8 items-center justify-center rounded-full bg-black/30 text-white backdrop-blur-md transition-colors group-hover:bg-black/50" aria-hidden="true"><ArrowUpRight className="size-4" /></span>
                    </div>
                </div>
                <div className="flex-1 px-1 pb-2 pt-3">
                    <div className="flex flex-wrap items-center justify-between gap-x-3 gap-y-2">
                        <h3 className={cn('min-w-0 flex-1 basis-36 line-clamp-2 break-words font-semibold tracking-tight transition-colors group-hover:text-primary', prominent ? 'text-xl sm:text-2xl' : compact ? 'text-sm sm:text-base' : 'text-lg')} title={album.name}>{album.name}</h3>
                        <AlbumEngagement key={`${album.id}:${album.contentId}:${album.updatedAt}`} albumId={album.id} contentId={album.contentId} />
                    </div>
                    {album.description && <p className={cn('mt-1 line-clamp-1 break-words text-sm leading-relaxed text-muted-foreground', compact && 'hidden sm:line-clamp-1')}>{album.description}</p>}
                </div>
            </Link>
            <div className="flex min-h-10 items-center justify-between gap-2 px-1 pb-2 text-xs text-muted-foreground">
                <div className="flex min-w-0 items-center gap-2">
                    {dateLabel && <time className="shrink-0" dateTime={album.createdAt}>{dateLabel}</time>}
                    {dateLabel && authors && <span className={compact ? 'hidden sm:inline' : undefined} aria-hidden="true">·</span>}
                    {authors && <span className={cn('truncate', compact && 'hidden sm:inline')} title={authors}>By {authors}</span>}
                </div>
                {onEdit && <Button variant="ghost" size="icon" className="size-8 shrink-0" aria-label={`Edit album: ${album.name}`} title="Edit album" onClick={() => onEdit(album)}><Pencil className="size-3.5" /></Button>}
            </div>
        </article>
    );
}
