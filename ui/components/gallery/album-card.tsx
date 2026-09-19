'use client';

import Link from 'next/link';
import { ArrowUpRight, Images, Pencil } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { GalleryThumb } from '@/components/gallery/gallery-thumb';
import { AlbumEngagement } from '@/components/gallery/album-engagement';
import { type Album } from '@/lib/api/gallery.types';
import { getVersionedGalleryCoverUrl } from '@/lib/gallery-media';
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

    return (
        <article className="group flex h-full min-w-0 flex-col overflow-hidden rounded-3xl border border-border/60 bg-card text-card-foreground transition-[border-color,box-shadow] duration-300 hover:border-border hover:shadow-lg">
            <Link href={`/gallery/${album.slug}`} className="flex min-w-0 flex-1 flex-col outline-none focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-ring" aria-label={`Open ${album.name}, ${album.imageCount} ${album.imageCount === 1 ? 'photo' : 'photos'}`}>
                <div className={cn('relative shrink-0 overflow-hidden', prominent ? 'aspect-[4/3] sm:aspect-[16/9]' : compact ? 'aspect-square' : 'aspect-[4/3]')}>
                    <GalleryThumb src={getVersionedGalleryCoverUrl(album)} alt="" fill
                        sizes={prominent ? '(max-width: 960px) 100vw, 896px' : compact ? '(max-width: 768px) 50vw, (max-width: 1024px) 33vw, 25vw' : '(max-width: 640px) 100vw, (max-width: 1024px) 50vw, 33vw'}
                        imageClassName="duration-500 ease-out motion-safe:group-hover:scale-105 motion-safe:group-focus-within:scale-105 motion-reduce:transition-none" />
                    <span className="absolute left-3 top-3 inline-flex items-center gap-1.5 rounded-full border border-white/20 bg-black/65 px-2.5 py-1 text-xs font-medium text-white">
                        <Images className="size-3.5" aria-hidden="true" />
                        {album.imageCount} <span className={compact ? 'hidden sm:inline' : ''}>{album.imageCount === 1 ? 'photo' : 'photos'}</span>
                    </span>
                    <span className="absolute right-3 top-3 flex size-8 items-center justify-center rounded-full border border-white/20 bg-black/50 text-white transition-colors group-hover:bg-black/65" aria-hidden="true"><ArrowUpRight className="size-4" /></span>
                </div>
                <div className={cn('flex-1 pb-2 pt-3', compact ? 'px-3 sm:px-4' : 'px-5')}>
                    <div className="flex flex-wrap items-center justify-between gap-x-3 gap-y-2">
                        <h3 className={cn('min-w-0 flex-1 basis-36 line-clamp-2 break-words font-semibold tracking-tight', prominent ? 'text-xl sm:text-2xl' : compact ? 'text-sm sm:text-base' : 'text-lg')} title={album.name}>{album.name}</h3>
                        <AlbumEngagement key={`${album.id}:${album.contentId}:${album.updatedAt}`} albumId={album.id} contentId={album.contentId} />
                    </div>
                    {album.description && <p className={cn('mt-1 line-clamp-1 break-words text-sm leading-relaxed text-muted-foreground', compact && 'hidden sm:line-clamp-1')}>{album.description}</p>}
                </div>
            </Link>
            <div className={cn('flex min-h-10 items-center justify-between gap-2 pb-2 text-xs text-muted-foreground', compact ? 'px-3 sm:px-4' : 'px-5')}>
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
