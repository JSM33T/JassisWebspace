'use client';

import { useEffect, useState } from 'react';
import { Heart, MessageSquare } from 'lucide-react';
import { galleryService } from '@/lib/api/gallery.service';

type Counts = { likeCount: number; commentCount: number };

const countFormatter = new Intl.NumberFormat('en', { notation: 'compact', maximumFractionDigits: 1 });

export function AlbumEngagement({ albumId, contentId }: { albumId: string; contentId: string | null }) {
    const [counts, setCounts] = useState<Counts | null>(null);
    const [loading, setLoading] = useState(Boolean(contentId));

    useEffect(() => {
        if (!contentId) return;
        let active = true;

        // The existing detail endpoint includes both counts; the album list does not.
        void galleryService.getAlbumById(albumId)
            .then(album => {
                if (active) setCounts({ likeCount: album.likeCount, commentCount: album.commentCount });
            })
            .catch(() => {
                if (active) setCounts(null);
            })
            .finally(() => {
                if (active) setLoading(false);
            });

        return () => { active = false; };
    }, [albumId, contentId]);

    const likeCount = contentId ? counts?.likeCount : 0;
    const commentCount = contentId ? counts?.commentCount : 0;

    return (
        <div className="flex flex-wrap items-center gap-x-3 gap-y-1 text-xs font-medium text-muted-foreground" aria-busy={loading}>
            {[
                { label: 'likes', count: likeCount, Icon: Heart },
                { label: 'comments', count: commentCount, Icon: MessageSquare },
            ].map(({ label, count, Icon }) => {
                const accessibleLabel = count == null
                    ? `${label === 'likes' ? 'Likes' : 'Comments'} ${loading ? 'loading' : 'unavailable'}`
                    : `${count.toLocaleString()} ${count === 1 ? label.slice(0, -1) : label}`;

                return (
                    <span key={label} className="inline-flex items-center gap-1.5" aria-label={accessibleLabel} title={accessibleLabel}>
                        <Icon className="size-3.5 shrink-0" aria-hidden="true" />
                        <span aria-hidden="true" className="tabular-nums">{count == null ? '—' : countFormatter.format(count)}</span>
                    </span>
                );
            })}
        </div>
    );
}
