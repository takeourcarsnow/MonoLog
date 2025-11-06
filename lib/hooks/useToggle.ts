import { useState, useEffect, useRef } from "react";
import { api } from "@/lib/api";
import { useCurrentUser } from "@/lib/hooks";
import { storage } from "@/lib/storage";

interface UseToggleOptions<T> {
  id: string;
  initialState?: boolean;
  checkApi: (id: string) => Promise<boolean>;
  toggleApi: (id: string, current: boolean) => Promise<void>;
  eventName: string;
  eventDetailKey: string;
  eventValueKey?: string; // optional, defaults to 'favorited' or 'following' based on eventDetailKey
  onSuccess?: (newState: boolean) => void;
  onError?: (error: any) => void;
}

export function useToggle<T = any>({
  id,
  initialState = false,
  checkApi,
  toggleApi,
  eventName,
  eventDetailKey,
  eventValueKey,
  onSuccess,
  onError
}: UseToggleOptions<T>) {
  // Try to derive initial state synchronously from the cached currentUser
  // (SWR). This avoids a visible flicker when toggles mount after a
  // view switch because we can initialize to the correct value immediately.
  const valueKeySync = eventValueKey || (eventName.includes('follow') ? 'following' : 'favorites');
  const { data: currentUser, mutate: mutateCurrentUser } = useCurrentUser();
  const derivedInitial = (() => {
    try {
      const arr = (currentUser as any)?.[valueKeySync];
      if (Array.isArray(arr)) return arr.includes(id);
    } catch (_) {}
    try {
      // Fall back to synchronous client cache if SWR hasn't hydrated yet
      const cacheKey = eventName.includes('follow') ? 'currentUserFollowing' : 'currentUserFavorites';
      const cached: string[] = (typeof window !== 'undefined') ? (storage.get<string[]>(cacheKey, []) as string[]) : [];
      if (Array.isArray(cached)) return cached.includes(id);
    } catch (_) {}
    return initialState;
  })();
  // If we were able to derive the initial state from the SWR cache or
  // the synchronous local cache, mark the toggle as "checked" so the
  // mount effect doesn't fire an extra per-item API check.
  const hadCachedInitial = (typeof window !== 'undefined') && (
    !!currentUser || window.localStorage.getItem('monolog_v1:currentUserFollowing') !== null
  );

  const [state, setState] = useState(derivedInitial);
  const inFlightRef = useRef(false);
  const checkedRef = useRef<boolean>(hadCachedInitial);
  // Check initial state on mount (fallback when we don't have currentUser)
  useEffect(() => {
    if (checkedRef.current) return;
    checkedRef.current = true;
    (async () => {
      // If we already have the current user in SWR cache and it contains
      // the relevant array (e.g. `following` or `favorites`), derive the
      // toggle state from that without making a per-item API call. This
      // avoids issuing many redundant requests when many toggles mount.
      try {
        const valueKey = eventValueKey || (eventDetailKey.includes('follow') ? 'following' : 'favorited');
        // useCurrentUser() is used below; guard in case it's not available
        // synchronously here by falling back to the API check.
        // Note: we don't import `useCurrentUser` at top-level of this effect
        // because hooks can't be called conditionally. Instead, we rely on
        // the outer call to useCurrentUser (see above) to provide `currentUser`.
      } catch (_) {}
      // Fallback: call checkApi if we don't have cached current user info
      const cur = await api.getCurrentUser();
      if (cur) {
        setState(await checkApi(id));
      }
    })();
  }, [id, checkApi]);
  // If currentUser changes later (e.g. revalidated), keep state in sync
  useEffect(() => {
    if (!currentUser) return;
    try {
      const candidate = (currentUser as any)[valueKeySync];
      if (Array.isArray(candidate)) {
        const has = candidate.includes(id);
        setState(has);
        checkedRef.current = true;
      }
    } catch (_) { /* ignore */ }
  }, [currentUser, id, valueKeySync]);

  // Listen for external changes
  useEffect(() => {
    const valueKey = eventValueKey || (eventName.includes('follow') ? 'following' : 'favorites');
    const onChanged = (e: any) => {
      const changedId = e?.detail?.[eventDetailKey];
      const newState = e?.detail?.[valueKey];
      if (!changedId || changedId !== id) return;
      if (inFlightRef.current) return; // ignore if we initiated it

      setState(newState);
    };
    if (typeof window !== 'undefined') {
      window.addEventListener(eventName, onChanged as any);
    }
    return () => {
      if (typeof window !== 'undefined') {
        window.removeEventListener(eventName, onChanged as any);
      }
    };
  }, [id, eventName, eventDetailKey, eventValueKey]);

  const toggleWithAuth = async () => {
    const cur = await api.getCurrentUser();
    if (!cur) {
      return false;
    }

    // Prevent duplicate requests
    if (inFlightRef.current) return false;

    const prev = state;
    setState(!prev); // Optimistic update

    inFlightRef.current = true;
    try {
      await toggleApi(id, prev);
      // After successfully toggling, revalidate currentUser once so the
      // global following/favorites list stays in sync. This triggers a
      // single network request instead of many per-item calls.
      try { mutateCurrentUser?.(); } catch (_) {}
      // Dispatch event
      const valueKey = eventValueKey || (eventName.includes('follow') ? 'following' : 'favorites');
      const eventDetail = { [eventDetailKey]: id, [valueKey]: !prev };
      if (typeof window !== 'undefined') {
        window.dispatchEvent(new CustomEvent(eventName, { detail: eventDetail }));
      }
      onSuccess?.(!prev);
      return true;
    } catch (e: any) {
      setState(prev); // Revert
      onError?.(e);
      return false;
    } finally {
      inFlightRef.current = false;
    }
  };

  return {
    state,
    setState,
    toggleWithAuth
  };
}