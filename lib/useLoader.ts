import { useFocusEffect } from 'expo-router';
import { useCallback, useRef, useState } from 'react';

type Result<T> = { data: T; error: string | null };

/**
 * Loads data every time the screen gets focus (EVENT: screen focused -> data refreshed)
 * and exposes pull-to-refresh state.
 */
export function useLoader<T>(fetcher: () => Promise<Result<T>>) {
  const [data, setData] = useState<T | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const fetcherRef = useRef(fetcher);
  fetcherRef.current = fetcher;

  const run = useCallback(async (pull: boolean) => {
    if (pull) setRefreshing(true);
    try {
      const res = await fetcherRef.current();
      setData(res.data);
      setError(res.error);
    } catch (e: any) {
      setError(e?.message ?? 'Unexpected error.');
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, []);

  useFocusEffect(
    useCallback(() => {
      run(false);
    }, [run])
  );

  return {
    data,
    error,
    loading,
    refreshing,
    reload: () => run(false),
    refresh: () => run(true),
  };
}
