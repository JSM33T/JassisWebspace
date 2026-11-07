'use client';

import { useCallback, useEffect, useRef, useState } from 'react';
import Image from 'next/image';
import Link from 'next/link';
import { usePathname, useRouter, useSearchParams } from 'next/navigation';
import { Bookmark, BookOpen, Camera, Disc3, Trash2 } from 'lucide-react';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from '@/components/ui/alert-dialog';
import { Button } from '@/components/ui/button';
import { useUser } from '@/contexts/UserContext';
import { useSavedContent } from '@/contexts/SavedContentContext';
import { buildAuthRequiredLoginHref } from '@/lib/auth-redirect';
import { savedContentService, type SavedItem, type SavedPage } from '@/lib/api/saved-content.service';
import { toast } from 'sonner';

const filters = [
  { label: 'All', value: '' },
  { label: 'Posts', value: 'Blog' },
  { label: 'Albums', value: 'Album' },
  { label: 'Music', value: 'Music' },
] as const;

function ContentIcon({ type }: { type: SavedItem['contentType'] }) {
  if (type === 'Blog') return <BookOpen className="h-4 w-4" />;
  if (type === 'Album') return <Camera className="h-4 w-4" />;
  return <Disc3 className="h-4 w-4" />;
}

export default function SavedPage() {
  const { user, isAuthenticated, isInitialized } = useUser();
  const accountKey = user?.id ?? user?.username;
  const { remove } = useSavedContent();
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const searchQuery = searchParams.toString();
  const requestedType = searchParams.get('type') ?? '';
  const type = filters.some(filter => filter.value === requestedType) ? requestedType : '';
  const rawPage = Number(searchParams.get('page') ?? 1);
  const page = Number.isSafeInteger(rawPage) && rawPage > 0 ? rawPage : 1;
  const [data, setData] = useState<SavedPage | null>(null);
  const [dataOwner, setDataOwner] = useState<string | null>(null);
  const requestId = useRef(0);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(false);
  const [removing, setRemoving] = useState<string | null>(null);

  const load = useCallback(async () => {
    if (!isAuthenticated) return;
    const currentRequest = ++requestId.current;
    const owner = accountKey ?? null;
    setLoading(true);
    setError(false);
    try {
      const result = await savedContentService.list(page, type || undefined);
      if (currentRequest !== requestId.current) return;
      setData(result);
      setDataOwner(owner);
      const lastPage = Math.max(1, Math.ceil(result.total / result.pageSize));
      if (page > lastPage) {
        router.replace(`/account/saved${type ? `?type=${type}&page=${lastPage}` : `?page=${lastPage}`}`);
      }
    } catch {
      if (currentRequest === requestId.current) setError(true);
    } finally {
      if (currentRequest === requestId.current) setLoading(false);
    }
  }, [isAuthenticated, accountKey, page, type, router]);

  useEffect(() => {
    if (!isInitialized) return;
    if (!isAuthenticated) {
      router.replace(buildAuthRequiredLoginHref(`${pathname}${searchQuery ? `?${searchQuery}` : ''}`));
      return;
    }
    void load();
  }, [isInitialized, isAuthenticated, load, pathname, router, searchQuery]);

  const setFilter = (nextType: string) => router.push(`/account/saved${nextType ? `?type=${nextType}` : ''}`);
  const setPage = (nextPage: number) => router.push(`/account/saved?${type ? `type=${type}&` : ''}page=${nextPage}`);
  const removeItem = async (id: string) => {
    setRemoving(id);
    try { await remove(id); await load(); }
    catch { toast.error('Could not remove saved item.'); }
    finally { setRemoving(null); }
  };

  if (!isInitialized || !isAuthenticated) return <div className="mx-auto max-w-5xl px-4 py-16">Checking your account…</div>;
  const visibleData = dataOwner === accountKey ? data : null;
  return (
    <main className="mx-auto min-h-[65vh] max-w-5xl px-4 py-12 sm:px-6">
      <div className="mb-8 flex items-center gap-3">
        <Bookmark className="h-7 w-7 text-primary" />
        <div><h1 className="text-3xl font-bold">Saved</h1><p className="text-sm text-muted-foreground">Your posts, albums, and music in one place.</p></div>
      </div>
      <div className="mb-7 flex flex-wrap gap-2" aria-label="Filter saved items">
        {filters.map(filter => <Button key={filter.label} type="button" size="sm" variant={type === filter.value ? 'default' : 'outline'}
          aria-pressed={type === filter.value} onClick={() => setFilter(filter.value)}>{filter.label}</Button>)}
      </div>
      {loading || !visibleData && !error ? <p role="status">Loading saved items…</p> : error ? (
        <div className="rounded-xl border p-6"><p>Could not load your saved items.</p><Button className="mt-3" onClick={() => void load()}>Retry</Button></div>
      ) : visibleData && visibleData.items.length > 0 ? (
        <div className="space-y-4">
          {visibleData.items.map(item => <article key={item.contentId} className="flex gap-4 rounded-xl border bg-card p-4">
            <Link href={item.href} className="relative hidden h-24 w-32 shrink-0 overflow-hidden rounded-lg bg-muted sm:block" aria-label={`Open ${item.title}`}>
              {item.cover ? <Image src={item.cover} alt="" fill unoptimized sizes="128px" className="object-cover" />
                : <div className="flex h-full items-center justify-center text-muted-foreground"><ContentIcon type={item.contentType} /></div>}
            </Link>
            <div className="min-w-0 flex-1">
              <div className="flex flex-wrap items-center gap-2 text-xs text-muted-foreground"><ContentIcon type={item.contentType} />{item.contentType}
              </div>
              <Link href={item.href} className="mt-1 block font-semibold hover:text-primary">{item.title}</Link>
              {item.description && <p className="mt-1 line-clamp-2 text-sm text-muted-foreground">{item.description}</p>}
              <time className="mt-2 block text-xs text-muted-foreground" dateTime={item.savedAt}>Saved {new Date(item.savedAt).toLocaleDateString()}</time>
            </div>
            <AlertDialog>
              <AlertDialogTrigger asChild>
                <Button type="button" size="icon" variant="ghost" title="Remove from saved" aria-label={`Remove ${item.title} from saved`}
                  disabled={removing !== null}><Trash2 className="h-4 w-4" /></Button>
              </AlertDialogTrigger>
              <AlertDialogContent>
                <AlertDialogHeader>
                  <AlertDialogTitle>Remove from saved?</AlertDialogTitle>
                  <AlertDialogDescription>
                    Remove &ldquo;{item.title}&rdquo; from your saved list? You can save it again later.
                  </AlertDialogDescription>
                </AlertDialogHeader>
                <AlertDialogFooter>
                  <AlertDialogCancel>Cancel</AlertDialogCancel>
                  <AlertDialogAction variant="destructive" onClick={() => void removeItem(item.contentId)}>
                    Remove
                  </AlertDialogAction>
                </AlertDialogFooter>
              </AlertDialogContent>
            </AlertDialog>
          </article>)}
          {visibleData.total > visibleData.pageSize && <div className="flex justify-center gap-3 pt-5">
            <Button variant="outline" disabled={page <= 1} onClick={() => setPage(page - 1)}>Previous</Button>
            <span className="self-center text-sm">Page {page} of {Math.ceil(visibleData.total / visibleData.pageSize)}</span>
            <Button variant="outline" disabled={page >= Math.ceil(visibleData.total / visibleData.pageSize)} onClick={() => setPage(page + 1)}>Next</Button>
          </div>}
        </div>
      ) : <div className="rounded-xl border bg-card p-8 text-center">
        <Bookmark className="mx-auto h-8 w-8 text-muted-foreground" />
        <h2 className="mt-3 font-semibold">{type ? 'Nothing saved in this category' : 'Your saved list is empty'}</h2>
        <p className="mt-2 text-sm text-muted-foreground">Save something you want to revisit.</p>
        <div className="mt-5 flex justify-center gap-3"><Link className="underline" href="/blog">Posts</Link><Link className="underline" href="/gallery">Gallery</Link><Link className="underline" href="/music">Music</Link></div>
      </div>}
    </main>
  );
}
