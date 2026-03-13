'use client';

import { useState } from 'react';
import Image from 'next/image';
import { Image as ImageIcon } from 'lucide-react';
import { cn } from '@/lib/utils';

const GALLERY_THUMB_BLUR_DATA_URL = `data:image/svg+xml;charset=utf-8,${encodeURIComponent(`
<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 800 600" preserveAspectRatio="none">
  <defs>
    <linearGradient id="bg" x1="0%" y1="0%" x2="100%" y2="100%">
      <stop offset="0%" stop-color="#1f2937" />
      <stop offset="50%" stop-color="#334155" />
      <stop offset="100%" stop-color="#0f172a" />
    </linearGradient>
    <filter id="blur">
      <feGaussianBlur stdDeviation="56" />
    </filter>
  </defs>
  <rect width="800" height="600" fill="url(#bg)" />
  <circle cx="180" cy="160" r="170" fill="#60a5fa" fill-opacity="0.28" filter="url(#blur)" />
  <circle cx="630" cy="170" r="140" fill="#f8fafc" fill-opacity="0.16" filter="url(#blur)" />
  <circle cx="580" cy="470" r="220" fill="#38bdf8" fill-opacity="0.2" filter="url(#blur)" />
  <circle cx="250" cy="470" r="150" fill="#93c5fd" fill-opacity="0.18" filter="url(#blur)" />
</svg>
`)}`;

type GalleryThumbProps = {
    src?: string | null;
    alt: string;
    sizes: string;
    fill?: boolean;
    width?: number;
    height?: number;
    wrapperClassName?: string;
    imageClassName?: string;
    showFallbackIcon?: boolean;
};

function GalleryThumbPlaceholder({
    className,
    showIcon = false,
}: {
    className?: string;
    showIcon?: boolean;
}) {
    return (
        <div
            aria-hidden="true"
            className={cn('pointer-events-none absolute inset-0 overflow-hidden bg-slate-950/70', className)}
        >
            <div className="absolute inset-0 animate-pulse bg-gradient-to-br from-primary/20 via-slate-200/8 to-sky-400/20" />
            <div className="absolute left-[-10%] top-[10%] h-36 w-36 rounded-full bg-primary/30 blur-3xl" />
            <div className="absolute right-[-6%] top-[16%] h-28 w-28 rounded-full bg-white/15 blur-3xl" />
            <div className="absolute bottom-[-12%] right-[8%] h-40 w-40 rounded-full bg-sky-400/30 blur-3xl" />
            <div className="absolute inset-0 bg-gradient-to-t from-black/20 via-transparent to-white/10 backdrop-blur-2xl" />

            {showIcon && (
                <div className="absolute inset-0 flex items-center justify-center">
                    <div className="rounded-2xl border border-white/15 bg-background/60 p-4 backdrop-blur-xl">
                        <ImageIcon className="h-8 w-8 text-primary/80" />
                    </div>
                </div>
            )}
        </div>
    );
}

export function GalleryThumb({
    src,
    alt,
    sizes,
    fill = false,
    width,
    height,
    wrapperClassName,
    imageClassName,
    showFallbackIcon = true,
}: GalleryThumbProps) {
    const [isLoaded, setIsLoaded] = useState(false);
    const [hasError, setHasError] = useState(false);

    const wrapperStyle =
        !fill && width && height
            ? {
                  aspectRatio: `${width} / ${height}`,
              }
            : undefined;

    if (!src || hasError) {
        return (
            <div className={cn(fill ? 'absolute inset-0' : 'relative', wrapperClassName)} style={wrapperStyle}>
                <GalleryThumbPlaceholder showIcon={showFallbackIcon} />
            </div>
        );
    }

    return (
        <div className={cn(fill ? 'absolute inset-0' : 'relative', wrapperClassName)} style={wrapperStyle}>
            <GalleryThumbPlaceholder
                className={cn('transition-opacity duration-500', isLoaded ? 'opacity-0' : 'opacity-100')}
            />
            <Image
                src={src}
                alt={alt}
                {...(fill ? { fill: true } : { width: width ?? 800, height: height ?? 600 })}
                sizes={sizes}
                placeholder="blur"
                blurDataURL={GALLERY_THUMB_BLUR_DATA_URL}
                className={cn(
                    fill ? 'h-full w-full object-cover' : 'block h-auto w-full',
                    'transition-[transform,filter] duration-700',
                    isLoaded ? 'scale-100 blur-0' : 'scale-110 blur-xl',
                    imageClassName,
                )}
                onLoad={() => setIsLoaded(true)}
                onError={() => setHasError(true)}
                unoptimized
            />
        </div>
    );
}
