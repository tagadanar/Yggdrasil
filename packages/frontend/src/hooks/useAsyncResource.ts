// packages/frontend/src/hooks/useAsyncResource.ts
// Enhanced hook for API resource fetching - replaces common loading/data/error patterns

import { useState, useEffect, useCallback, useRef } from 'react';
import { useErrorHandler } from '@/lib/errors/useErrorHandler';
import { createComponentLogger } from '@/lib/errors/logger';

interface AsyncResourceState<T> {
  data: T | null;
  loading: boolean;
  error: string | null;
  lastFetch: Date | null;
}

interface UseAsyncResourceOptions {
  immediate?: boolean; // Fetch immediately on mount (default: true)
  retryCount?: number; // Number of retries on failure (default: 2)
  retryDelay?: number; // Delay between retries in ms (default: 1000)
  cacheTime?: number; // Cache time in ms, 0 = no cache (default: 0)
  onSuccess?: (data: any) => void;
  onError?: (error: any) => void;
  component?: string; // Component name for logging
  dependencies?: any[]; // Dependencies that trigger refetch
}

interface UseAsyncResourceReturn<T> {
  data: T | null;
  loading: boolean;
  error: string | null;
  lastFetch: Date | null;
  refetch: () => Promise<void>;
  refresh: () => Promise<void>; // Alias for refetch
  reset: () => void;
  setData: (data: T | null) => void;
  isStale: boolean; // True if data is older than cacheTime
}

const logger = createComponentLogger('useAsyncResource');

export function useAsyncResource<T>(
  fetcher: () => Promise<T>,
  options: UseAsyncResourceOptions = {}
): UseAsyncResourceReturn<T> {
  const {
    immediate = true,
    retryCount = 2,
    retryDelay = 1000,
    cacheTime = 0,
    onSuccess,
    onError,
    component = 'Unknown',
    dependencies = [],
  } = options;

  const [state, setState] = useState<AsyncResourceState<T>>({
    data: null,
    loading: false,
    error: null,
    lastFetch: null,
  });

  const { handleError } = useErrorHandler({
    component,
    maxRetries: retryCount,
    retryDelay,
    onError,
  });

  const fetcherRef = useRef(fetcher);
  const abortControllerRef = useRef<AbortController | null>(null);
  const isMountedRef = useRef(true);

  // Update fetcher ref when it changes
  useEffect(() => {
    fetcherRef.current = fetcher;
  }, [fetcher]);

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      isMountedRef.current = false;
      if (abortControllerRef.current) {
        abortControllerRef.current.abort();
      }
    };
  }, []);

  const executeRequest = useCallback(async (force = false): Promise<void> => {
    // Don't fetch if already loading or if data is still fresh (unless forced)
    if (state.loading) {
      logger.debug('Skipping fetch - already loading', { component });
      return;
    }

    if (!force && state.data && state.lastFetch && cacheTime > 0) {
      const age = Date.now() - state.lastFetch.getTime();
      if (age < cacheTime) {
        logger.debug('Skipping fetch - data still fresh', { component, age, cacheTime });
        return;
      }
    }

    // Cancel previous request if it exists
    if (abortControllerRef.current) {
      abortControllerRef.current.abort();
    }

    // Create new abort controller
    abortControllerRef.current = new AbortController();

    try {
      logger.debug('Starting async resource fetch', { component, force });
      
      setState(prev => ({ 
        ...prev, 
        loading: true, 
        error: null 
      }));

      const result = await fetcherRef.current();
      
      // Check if component is still mounted
      if (!isMountedRef.current) {
        logger.debug('Component unmounted during fetch', { component });
        return;
      }

      logger.debug('Async resource fetch successful', { 
        component, 
        hasData: !!result 
      });

      setState(prev => ({
        ...prev,
        data: result,
        loading: false,
        error: null,
        lastFetch: new Date(),
      }));

      onSuccess?.(result);

    } catch (error: any) {
      // Check if component is still mounted and error wasn't from abort
      if (!isMountedRef.current || error.name === 'AbortError') {
        logger.debug('Fetch aborted or component unmounted', { component });
        return;
      }

      logger.error('Async resource fetch failed', { 
        component, 
        error: error.message 
      });

      const appError = handleError(error, { component, action: 'fetchResource' });
      const errorMessage = appError.userMessage || appError.message;

      setState(prev => ({
        ...prev,
        loading: false,
        error: errorMessage,
      }));

    } finally {
      abortControllerRef.current = null;
    }
  }, [state.loading, state.data, state.lastFetch, cacheTime, component, handleError, onSuccess]);

  // Fetch data when dependencies change
  useEffect(() => {
    if (immediate) {
      executeRequest();
    }
  }, [immediate, ...dependencies]); // eslint-disable-line react-hooks/exhaustive-deps

  const refetch = useCallback(() => executeRequest(true), [executeRequest]);
  const refresh = refetch; // Alias

  const reset = useCallback(() => {
    logger.debug('Resetting async resource state', { component });
    
    if (abortControllerRef.current) {
      abortControllerRef.current.abort();
    }

    setState({
      data: null,
      loading: false,
      error: null,
      lastFetch: null,
    });
  }, [component]);

  const setData = useCallback((data: T | null) => {
    setState(prev => ({ 
      ...prev, 
      data,
      lastFetch: data ? new Date() : prev.lastFetch 
    }));
  }, []);

  // Calculate if data is stale
  const isStale = state.lastFetch && cacheTime > 0 
    ? (Date.now() - state.lastFetch.getTime()) > cacheTime
    : false;

  return {
    data: state.data,
    loading: state.loading,
    error: state.error,
    lastFetch: state.lastFetch,
    refetch,
    refresh,
    reset,
    setData,
    isStale,
  };
}

// Convenience hook for simple data fetching without options
export function useAsyncData<T>(
  fetcher: () => Promise<T>,
  dependencies: any[] = []
): Pick<UseAsyncResourceReturn<T>, 'data' | 'loading' | 'error' | 'refetch'> {
  const { data, loading, error, refetch } = useAsyncResource(fetcher, {
    dependencies,
    component: 'AsyncData',
  });

  return { data, loading, error, refetch };
}

// Hook for paginated data fetching
export function useAsyncPaginatedResource<T>(
  fetcher: (page: number, limit: number) => Promise<{ data: T[]; total: number; page: number; hasMore: boolean }>,
  initialPage: number = 1,
  pageSize: number = 10,
  options: Omit<UseAsyncResourceOptions, 'dependencies'> = {}
) {
  const [page, setPage] = useState(initialPage);
  const [allData, setAllData] = useState<T[]>([]);
  const [hasMore, setHasMore] = useState(true);

  const wrappedFetcher = useCallback(async () => {
    const result = await fetcher(page, pageSize);
    return result;
  }, [fetcher, page, pageSize]);

  const { data, loading, error, refetch } = useAsyncResource(wrappedFetcher, {
    ...options,
    dependencies: [page],
    onSuccess: (result) => {
      if (page === 1) {
        // First page - replace all data
        setAllData(result.data);
      } else {
        // Additional pages - append data
        setAllData(prev => [...prev, ...result.data]);
      }
      setHasMore(result.hasMore);
      options.onSuccess?.(result);
    },
  });

  const loadMore = useCallback(() => {
    if (!loading && hasMore) {
      setPage(prev => prev + 1);
    }
  }, [loading, hasMore]);

  const reset = useCallback(() => {
    setPage(initialPage);
    setAllData([]);
    setHasMore(true);
  }, [initialPage]);

  return {
    data: allData,
    currentPageData: data?.data || [],
    loading,
    error,
    hasMore,
    page,
    loadMore,
    refetch: () => {
      reset();
      return refetch();
    },
    reset,
  };
}