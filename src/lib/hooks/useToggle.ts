import { useState, useEffect, useRef } from "react";
import { api } from "@/src/lib/api";

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
  const [state, setState] = useState(initialState);
  const inFlightRef = useRef(false);
  const checkedRef = useRef(false);

  // Check initial state on mount
  useEffect(() => {
    if (checkedRef.current) return;
    checkedRef.current = true;
    (async () => {
      const cur = await api.getCurrentUser();
      if (cur) {
        setState(await checkApi(id));
      }
    })();
  }, [id, checkApi]);

  // Listen for external changes
  useEffect(() => {
    const valueKey = eventValueKey || (eventDetailKey.includes('follow') ? 'following' : 'favorited');
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
      // Dispatch event
      const valueKey = eventValueKey || (eventDetailKey.includes('follow') ? 'following' : 'favorited');
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