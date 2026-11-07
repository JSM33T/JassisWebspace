'use client';

import { createContext, useCallback, useContext, useEffect, useMemo, useRef, useState } from 'react';
import { useUser } from '@/contexts/UserContext';
import { savedContentService, type SavedStatus } from '@/lib/api/saved-content.service';

type SavedContextValue = {
  statuses: Record<string, SavedStatus>;
  pending: Record<string, boolean>;
  requestStatus: (contentId: string) => void;
  toggle: (contentId: string) => Promise<void>;
  remove: (contentId: string) => Promise<void>;
};

const SavedContext = createContext<SavedContextValue | null>(null);
const validId = (id: string) => /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(id) && id !== '00000000-0000-0000-0000-000000000000';

export function SavedContentProvider({ children }: { children: React.ReactNode }) {
  const { user, isAuthenticated, isInitialized } = useUser();
  const accountId = isInitialized && isAuthenticated ? (user?.id ?? user?.username) : undefined;
  return <SavedContentStore key={accountId ?? 'guest'} accountId={accountId}>{children}</SavedContentStore>;
}

function SavedContentStore({ children, accountId }: { children: React.ReactNode; accountId?: string }) {
  const [statuses, setStatuses] = useState<Record<string, SavedStatus>>({});
  const [pending, setPending] = useState<Record<string, boolean>>({});
  const queue = useRef(new Set<string>());
  const registered = useRef(new Set<string>());
  const timer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const busy = useRef(new Set<string>());
  const generation = useRef(0);
  const fetchGeneration = useRef(0);
  const statusRef = useRef<Record<string, SavedStatus>>({});

  const commitStatus = useCallback((status: SavedStatus) => {
    const next = { ...statusRef.current, [status.contentId]: status };
    statusRef.current = next;
    setStatuses(next);
  }, []);

  const requestStatus = useCallback((contentId: string) => {
    if (!accountId || !validId(contentId) || statusRef.current[contentId]) return;
    registered.current.add(contentId);
    queue.current.add(contentId);
    if (timer.current) return;
    timer.current = setTimeout(async () => {
      timer.current = null;
      const ids = [...queue.current];
      queue.current.clear();
      if (!ids.length) return;
      const currentGeneration = generation.current;
      const currentFetch = fetchGeneration.current;
      try {
        for (let i = 0; i < ids.length; i += 100) {
          const results = await savedContentService.statuses(ids.slice(i, i + 100));
          if (currentGeneration !== generation.current || currentFetch !== fetchGeneration.current) return;
          const next = { ...statusRef.current };
            for (const result of results) if (!next[result.contentId]) next[result.contentId] = result;
          statusRef.current = next;
          setStatuses(next);
        }
      } catch {
        // The button remains available; a later interaction can retry.
      }
    }, 20);
  }, [accountId]);

  const toggle = useCallback(async (contentId: string) => {
    if (!accountId || !validId(contentId) || busy.current.has(contentId)) return;
    const currentGeneration = generation.current;
    busy.current.add(contentId);
    setPending(previous => ({ ...previous, [contentId]: true }));
    try {
      let current = statusRef.current[contentId];
      if (!current) {
        [current] = await savedContentService.statuses([contentId]);
        if (currentGeneration !== generation.current) return;
        if (current) commitStatus(current);
      }
      const result = current?.isSaved
        ? await savedContentService.remove(contentId)
        : await savedContentService.save(contentId);
      if (currentGeneration === generation.current) commitStatus(result);
    } finally {
      if (currentGeneration === generation.current) {
        busy.current.delete(contentId);
        setPending(previous => ({ ...previous, [contentId]: false }));
      }
    }
  }, [accountId, commitStatus]);

  const remove = useCallback(async (contentId: string) => {
    if (!accountId || !validId(contentId)) return;
    const currentGeneration = generation.current;
    const result = await savedContentService.remove(contentId);
    if (currentGeneration === generation.current) commitStatus(result);
  }, [accountId, commitStatus]);

  useEffect(() => {
    if (!accountId) return;
    const refresh = () => {
      const ids = [...registered.current];
      fetchGeneration.current++;
      queue.current.clear();
      if (timer.current) clearTimeout(timer.current);
      timer.current = null;
      statusRef.current = {};
      setStatuses({});
      for (const id of ids) requestStatus(id);
    };
    window.addEventListener('focus', refresh);
    return () => window.removeEventListener('focus', refresh);
  }, [accountId, requestStatus]);

  useEffect(() => () => { if (timer.current) clearTimeout(timer.current); generation.current++; }, []);

  const value = useMemo(() => ({ statuses, pending, requestStatus, toggle, remove }), [statuses, pending, requestStatus, toggle, remove]);
  return <SavedContext.Provider value={value}>{children}</SavedContext.Provider>;
}

export function useSavedContent() {
  const value = useContext(SavedContext);
  if (!value) throw new Error('SavedContentProvider is required');
  return value;
}

export { validId as isSaveableContentId };
