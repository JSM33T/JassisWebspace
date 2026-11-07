'use client';

import { useEffect } from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { Bookmark } from 'lucide-react';
import { toast } from 'sonner';
import { Button } from '@/components/ui/button';
import { useUser } from '@/contexts/UserContext';
import { isSaveableContentId, useSavedContent } from '@/contexts/SavedContentContext';
import { buildAuthRequiredLoginHref } from '@/lib/auth-redirect';

export function SaveButton({ contentId, itemTitle, compact = false }: { contentId: string | null | undefined; itemTitle?: string; compact?: boolean }) {
  const { user, isAuthenticated, isInitialized } = useUser();
  const accountKey = user?.id ?? user?.username;
  const { statuses, pending, requestStatus, toggle } = useSavedContent();
  const pathname = usePathname();
  const id = contentId ?? '';
  const valid = isSaveableContentId(id);
  useEffect(() => { if (valid && isAuthenticated) requestStatus(id); }, [id, valid, isAuthenticated, accountKey, requestStatus]);
  if (!valid) return null;
  const status = statuses[id];
  const label = status?.isSaved ? 'Saved' : 'Save';
  const onClick = async () => {
    if (!isInitialized) return;
    if (!isAuthenticated) {
      toast.error(<span><Link className="font-medium underline" href={buildAuthRequiredLoginHref(pathname)}>Log in</Link> to save this item</span>);
      return;
    }
    try { await toggle(id); }
    catch { toast.error('Could not update saved items. Please try again.'); }
  };
  return (
    <Button type="button" size="sm" variant="ghost" onClick={() => void onClick()}
      disabled={!isInitialized || pending[id]} aria-pressed={Boolean(status?.isSaved)}
      aria-label={`${label} ${itemTitle ?? 'item'}`}
      title={label}
      className="inline-flex items-center gap-1.5 text-muted-foreground hover:text-primary">
      <Bookmark className={`h-4 w-4 ${status?.isSaved ? 'fill-current' : ''}`} aria-hidden="true" />
      {!compact && <span>{label}</span>}
    </Button>
  );
}
