"use client";

import { useEffect, useState, useCallback, useRef } from "react";
import { api } from "./api";

// In-memory cache: key → { data, timestamp }
const cache = new Map<string, { data: unknown; ts: number }>();

// Default stale time: 2 minutes
const STALE_TIME = 2 * 60 * 1000;

interface UseApiOptions {
  /** Skip fetching (e.g. when params not ready) */
  skip?: boolean;
  /** Cache TTL in ms (default 2min) */
  staleTime?: number;
}

interface UseApiResult<T> {
  data: T | null;
  loading: boolean;
  error: string | null;
  refresh: () => Promise<void>;
}

/**
 * Hook with in-memory stale-while-revalidate cache for GET requests.
 * Auth is handled via httpOnly cookies (credentials: include).
 * - If cached data exists, returns it immediately (loading = false)
 * - Revalidates in background if stale
 * - No skeleton flash on revisit
 */
export function useApi<T>(path: string, options: UseApiOptions = {}): UseApiResult<T> {
  const { skip = false, staleTime = STALE_TIME } = options;

  const cached = cache.get(path);
  const [data, setData] = useState<T | null>(
    cached ? (cached.data as T) : null
  );
  const [loading, setLoading] = useState(!cached && !skip);
  const [error, setError] = useState<string | null>(null);
  const mountedRef = useRef(true);
  const pathRef = useRef(path);
  pathRef.current = path;
  // H15: Counter to ignore stale responses when path changes rapidly
  const fetchIdRef = useRef(0);

  const fetchData = useCallback(
    async (showLoading: boolean) => {
      if (skip) return;

      const currentFetchId = ++fetchIdRef.current;

      if (showLoading) setLoading(true);
      setError(null);

      try {
        const result = await api<T>(pathRef.current);
        // H15: Only update state if this is still the latest request
        if (mountedRef.current && fetchIdRef.current === currentFetchId) {
          setData(result);
          cache.set(pathRef.current, { data: result, ts: Date.now() });
        }
      } catch (err) {
        if (mountedRef.current && fetchIdRef.current === currentFetchId) {
          setError(err instanceof Error ? err.message : "Erreur réseau");
        }
      } finally {
        if (mountedRef.current && fetchIdRef.current === currentFetchId) setLoading(false);
      }
    },
    [skip]
  );

  useEffect(() => {
    mountedRef.current = true;

    if (skip) {
      setLoading(false);
      return;
    }

    const entry = cache.get(path);
    if (entry) {
      // Show cached data immediately
      setData(entry.data as T);
      setLoading(false);

      // Revalidate if stale
      if (Date.now() - entry.ts > staleTime) {
        fetchData(false);
      }
    } else {
      // No cache — keep previous data visible while loading (prevents skeleton flash on filter change)
      fetchData(true);
    }

    return () => {
      mountedRef.current = false;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [path, skip]);

  const refresh = useCallback(async () => {
    cache.delete(pathRef.current);
    await fetchData(true);
  }, [fetchData]);

  return { data, loading, error, refresh };
}

/** Read from cache (for seeding initial state in pages with mutations/pagination) */
export function getCache<T>(path: string): T | null {
  const entry = cache.get(path);
  return entry ? (entry.data as T) : null;
}

/** Write to cache (for pages that manage their own fetching) */
export function setCache(path: string, data: unknown) {
  cache.set(path, { data, ts: Date.now() });
}

/** Invalidate a specific cache entry (useful after mutations) */
export function invalidateCache(path: string) {
  cache.delete(path);
}

/** Invalidate all cache entries matching a prefix */
export function invalidateCachePrefix(prefix: string) {
  for (const key of cache.keys()) {
    if (key.startsWith(prefix)) cache.delete(key);
  }
}
