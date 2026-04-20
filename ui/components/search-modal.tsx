'use client';

import { useEffect, useRef, useState, useCallback } from 'react';
import { createPortal } from 'react-dom';
import { useRouter } from 'next/navigation';
import { AnimatePresence, motion } from 'framer-motion';
import { Search, X, FileText, Image, Music, Video, ArrowRight, Loader2 } from 'lucide-react';
import { cn } from '@/lib/utils';
import { searchService } from '@/lib/api/search.service';
import type { SearchResultItem, ContentType } from '@/lib/api/search.types';

const CONTENT_TYPE_META: Record<ContentType, {
    label: string;
    href: (item: SearchResultItem) => string;
    Icon: React.ElementType;
    color: string;
}> = {
    Blog: {
        label: 'Blog',
        href: (item) => `/blog/${item.slug}`,
        Icon: FileText,
        color: 'text-blue-500',
    },
    Album: {
        label: 'Gallery',
        href: (item) => `/gallery/${item.slug}`,
        Icon: Image,
        color: 'text-emerald-500',
    },
    Music: {
        label: 'Music',
        href: (item) => `/music/${item.slug}`,
        Icon: Music,
        color: 'text-purple-500',
    },
    Video: {
        label: 'Video',
        href: (item) => `/gallery/${item.slug}`,
        Icon: Video,
        color: 'text-orange-500',
    },
};

interface SearchModalProps {
    open: boolean;
    onClose: () => void;
}

export function SearchModal({ open, onClose }: SearchModalProps) {
    const router = useRouter();
    const inputRef = useRef<HTMLInputElement>(null);
    const [query, setQuery] = useState('');
    const [results, setResults] = useState<SearchResultItem[]>([]);
    const [total, setTotal] = useState(0);
    const [loading, setLoading] = useState(false);
    const [selectedIndex, setSelectedIndex] = useState(-1);
    const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);

    const runSearch = useCallback(async (q: string) => {
        if (!q.trim()) {
            setResults([]);
            setTotal(0);
            return;
        }
        setLoading(true);
        try {
            const res = await searchService.search({ q, pageSize: 10 });
            setResults(res.items);
            setTotal(res.total);
        } catch {
            setResults([]);
            setTotal(0);
        } finally {
            setLoading(false);
        }
    }, []);

    useEffect(() => {
        if (debounceRef.current) clearTimeout(debounceRef.current);
        if (!query.trim()) {
            setResults([]);
            setTotal(0);
            setLoading(false);
            return;
        }
        setLoading(true);
        debounceRef.current = setTimeout(() => runSearch(query), 300);
        return () => {
            if (debounceRef.current) clearTimeout(debounceRef.current);
        };
    }, [query, runSearch]);

    // Focus input when modal opens, reset on close
    useEffect(() => {
        if (open) {
            setTimeout(() => inputRef.current?.focus(), 60);
        } else {
            setQuery('');
            setResults([]);
            setTotal(0);
            setSelectedIndex(-1);
        }
    }, [open]);

    // Keyboard navigation
    useEffect(() => {
        if (!open) return;

        const handleKey = (e: KeyboardEvent) => {
            if (e.key === 'Escape') {
                onClose();
                return;
            }
            if (results.length === 0) return;
            if (e.key === 'ArrowDown') {
                e.preventDefault();
                setSelectedIndex((i) => Math.min(i + 1, results.length - 1));
            } else if (e.key === 'ArrowUp') {
                e.preventDefault();
                setSelectedIndex((i) => Math.max(i - 1, -1));
            } else if (e.key === 'Enter' && selectedIndex >= 0) {
                const item = results[selectedIndex];
                if (item) navigateTo(item);
            }
        };

        window.addEventListener('keydown', handleKey);
        return () => window.removeEventListener('keydown', handleKey);
    // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [open, results, selectedIndex]);

    const navigateTo = (item: SearchResultItem) => {
        const meta = CONTENT_TYPE_META[item.contentType];
        if (!meta) return;
        router.push(meta.href(item));
        onClose();
    };

    const hasResults = results.length > 0;
    const showEmpty = !loading && query.trim().length > 0 && !hasResults;

    const content = (
        <AnimatePresence>
            {open && (
                <>
                    <motion.div
                        key="search-backdrop"
                        initial={{ opacity: 0 }}
                        animate={{ opacity: 1 }}
                        exit={{ opacity: 0 }}
                        transition={{ duration: 0.18 }}
                        className="fixed inset-0 z-[60] bg-black/40 backdrop-blur-sm"
                        onClick={onClose}
                        aria-hidden="true"
                    />
                    <motion.div
                        key="search-panel"
                        initial={{ opacity: 0, y: -12, scale: 0.97 }}
                        animate={{ opacity: 1, y: 0, scale: 1 }}
                        exit={{ opacity: 0, y: -8, scale: 0.97 }}
                        transition={{ duration: 0.2, ease: 'easeOut' }}
                        className="fixed inset-x-4 top-[5vh] z-[61] mx-auto max-w-xl sm:inset-x-auto sm:left-1/2 sm:w-full sm:-translate-x-1/2"
                        role="dialog"
                        aria-modal="true"
                        aria-label="Search"
                    >
                        <div className="overflow-hidden rounded-[1.75rem] border border-border/60 bg-background/95 shadow-2xl shadow-black/20 backdrop-blur-xl">
                            {/* Input row */}
                            <div className="flex items-center gap-3 border-b border-border/50 px-4 py-3.5">
                                <Search className="h-4 w-4 shrink-0 text-muted-foreground" />
                                <input
                                    ref={inputRef}
                                    type="search"
                                    value={query}
                                    onChange={(e) => {
                                        setQuery(e.target.value);
                                        setSelectedIndex(-1);
                                    }}
                                    placeholder="Search everything..."
                                    className="min-w-0 flex-1 bg-transparent text-sm text-foreground placeholder:text-muted-foreground focus:outline-none"
                                    autoComplete="off"
                                    spellCheck={false}
                                />
                                <div className="flex items-center gap-1.5">
                                    {loading && (
                                        <Loader2 className="h-4 w-4 animate-spin text-muted-foreground" />
                                    )}
                                    {query && (
                                        <button
                                            type="button"
                                            onClick={() => { setQuery(''); setResults([]); setTotal(0); inputRef.current?.focus(); }}
                                            className="flex h-6 w-6 items-center justify-center rounded-full text-muted-foreground hover:bg-accent hover:text-foreground"
                                            aria-label="Clear search"
                                        >
                                            <X className="h-3.5 w-3.5" />
                                        </button>
                                    )}
                                    <kbd className="hidden rounded border border-border/70 bg-muted px-1.5 py-0.5 text-[10px] font-medium text-muted-foreground sm:inline">
                                        ESC
                                    </kbd>
                                </div>
                            </div>

                            {/* Results */}
                            <AnimatePresence>
                                {hasResults && (
                                    <motion.div
                                        key="results"
                                        initial={{ opacity: 0 }}
                                        animate={{ opacity: 1 }}
                                        exit={{ opacity: 0 }}
                                        transition={{ duration: 0.12 }}
                                    >
                                        <ul className="max-h-[55vh] overflow-y-auto overscroll-contain py-2">
                                            {results.map((item, index) => {
                                                const meta = CONTENT_TYPE_META[item.contentType];
                                                if (!meta) return null;
                                                const { Icon, label, color } = meta;
                                                const isSelected = index === selectedIndex;

                                                return (
                                                    <li key={item.contentId}>
                                                        <button
                                                            type="button"
                                                            onMouseEnter={() => setSelectedIndex(index)}
                                                            onClick={() => navigateTo(item)}
                                                            className={cn(
                                                                'group flex w-full items-start gap-3 px-4 py-3 text-left transition-colors',
                                                                isSelected ? 'bg-accent/70' : 'hover:bg-accent/40'
                                                            )}
                                                        >
                                                            <span className={cn('mt-0.5 shrink-0', color)}>
                                                                <Icon className="h-4 w-4" />
                                                            </span>
                                                            <span className="min-w-0 flex-1">
                                                                <span className="block truncate text-sm font-medium text-foreground">
                                                                    {item.title}
                                                                </span>
                                                                {item.headline && (
                                                                    <span
                                                                        className="mt-0.5 block text-xs leading-relaxed text-muted-foreground line-clamp-1"
                                                                        // headline may contain <b> tags from ts_headline
                                                                        dangerouslySetInnerHTML={{ __html: item.headline }}
                                                                    />
                                                                )}
                                                            </span>
                                                            <span className="ml-auto flex items-center gap-1.5 shrink-0">
                                                                <span className="rounded-full border border-border/60 bg-muted/60 px-2 py-0.5 text-[10px] font-medium text-muted-foreground">
                                                                    {label}
                                                                </span>
                                                                <ArrowRight className={cn(
                                                                    'h-3.5 w-3.5 text-muted-foreground/40 transition-all duration-150',
                                                                    isSelected && 'translate-x-0.5 text-foreground/60'
                                                                )} />
                                                            </span>
                                                        </button>
                                                    </li>
                                                );
                                            })}
                                        </ul>

                                        {total > results.length && (
                                            <div className="border-t border-border/50 px-4 py-2.5 text-center text-xs text-muted-foreground">
                                                Showing {results.length} of {total} results
                                            </div>
                                        )}
                                    </motion.div>
                                )}

                                {showEmpty && (
                                    <motion.div
                                        key="empty"
                                        initial={{ opacity: 0 }}
                                        animate={{ opacity: 1 }}
                                        exit={{ opacity: 0 }}
                                        transition={{ duration: 0.12 }}
                                        className="flex flex-col items-center gap-2 px-4 py-10 text-center"
                                    >
                                        <Search className="h-8 w-8 text-muted-foreground/30" />
                                        <p className="text-sm font-medium text-muted-foreground">
                                            No results for &ldquo;{query}&rdquo;
                                        </p>
                                        <p className="text-xs text-muted-foreground/60">
                                            Try different keywords or check your spelling.
                                        </p>
                                    </motion.div>
                                )}

                                {!query && !loading && (
                                    <motion.div
                                        key="hint"
                                        initial={{ opacity: 0 }}
                                        animate={{ opacity: 1 }}
                                        exit={{ opacity: 0 }}
                                        transition={{ duration: 0.12 }}
                                        className="flex items-center gap-2 px-4 py-4 text-xs text-muted-foreground/60"
                                    >
                                        <Search className="h-3.5 w-3.5" />
                                        Search across blog posts, gallery albums, and music tracks.
                                    </motion.div>
                                )}
                            </AnimatePresence>
                        </div>
                    </motion.div>
                </>
            )}
        </AnimatePresence>
    );

    return typeof window !== 'undefined' ? createPortal(content, document.body) : null;
}
