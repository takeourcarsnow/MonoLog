"use client";

import { useState, useEffect, useCallback } from 'react';

/**
 * Hook for common data fetching pattern with loading, error, and data states.
 * @param fetcher Async function that returns the data
 * @param initialData Initial data value
 * @param deps Dependencies for the fetcher (will trigger refetch when changed)
 * @returns { data, loading, error, refetch }
 */
export function useDataFetch<T>(
  fetcher: () => Promise<T>,
  initialData: T,
  deps: React.DependencyList = []
) {
  const [data, setData] = useState<T>(initialData);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const load = useCallback(async () => {
    try {
      setLoading(true);
      setError(null);
      const result = await fetcher();
      setData(result);
    } catch (e: any) {
      setError(e?.message || 'Failed to load data');
    } finally {
      setLoading(false);
    }
  }, deps);

  useEffect(() => {
    load();
  }, [load]);

  return { data, setData, loading, error, refetch: load };
}