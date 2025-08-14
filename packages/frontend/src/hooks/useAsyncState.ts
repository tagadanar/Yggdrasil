// packages/frontend/src/hooks/useAsyncState.ts
// Reusable hook for managing async operations (loading, data, error states)

import { useState, useCallback } from 'react';

interface AsyncState<T> {
  data: T | null;
  loading: boolean;
  error: string | null;
}

interface UseAsyncStateReturn<T> {
  data: T | null;
  loading: boolean;
  error: string | null;
  setData: (data: T | null) => void;
  setLoading: (loading: boolean) => void;
  setError: (error: string | null) => void;
  reset: () => void;
  execute: (asyncFn: () => Promise<T>) => Promise<void>;
}

export function useAsyncState<T>(initialData: T | null = null): UseAsyncStateReturn<T> {
  const [state, setState] = useState<AsyncState<T>>({
    data: initialData,
    loading: false,
    error: null,
  });

  const setData = useCallback((data: T | null) => {
    setState(prev => ({ ...prev, data }));
  }, []);

  const setLoading = useCallback((loading: boolean) => {
    setState(prev => ({ ...prev, loading }));
  }, []);

  const setError = useCallback((error: string | null) => {
    setState(prev => ({ ...prev, error }));
  }, []);

  const reset = useCallback(() => {
    setState({
      data: initialData,
      loading: false,
      error: null,
    });
  }, [initialData]);

  const execute = useCallback(async (asyncFn: () => Promise<T>) => {
    try {
      setState(prev => ({ ...prev, loading: true, error: null }));
      const result = await asyncFn();
      setState(prev => ({ ...prev, data: result, loading: false }));
    } catch (err: any) {
      const errorMessage = err?.response?.data?.error || err?.message || 'An error occurred';
      setState(prev => ({ ...prev, error: errorMessage, loading: false }));
    }
  }, []);

  return {
    data: state.data,
    loading: state.loading,
    error: state.error,
    setData,
    setLoading,
    setError,
    reset,
    execute,
  };
}