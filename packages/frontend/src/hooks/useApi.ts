// packages/frontend/src/hooks/useApi.ts
// Reusable hook for API operations with loading states and error handling

import { useCallback } from 'react';
import { useAsyncState } from './useAsyncState';

interface UseApiOptions {
  onSuccess?: (data: any) => void;
  onError?: (error: string) => void;
  initialData?: any;
}

interface UseApiReturn<T> {
  data: T | null;
  loading: boolean;
  error: string | null;
  execute: (apiCall: () => Promise<T>) => Promise<void>;
  reset: () => void;
}

export function useApi<T = any>(options: UseApiOptions = {}): UseApiReturn<T> {
  const { onSuccess, onError, initialData = null } = options;
  
  const {
    data,
    loading,
    error,
    reset,
    execute: executeAsync
  } = useAsyncState<T>(initialData);

  const execute = useCallback(async (apiCall: () => Promise<T>) => {
    try {
      await executeAsync(apiCall);
      if (onSuccess) {
        onSuccess(data);
      }
    } catch (err: any) {
      const errorMessage = err?.response?.data?.error || err?.message || 'An error occurred';
      if (onError) {
        onError(errorMessage);
      }
      throw err; // Re-throw so calling code can handle if needed
    }
  }, [executeAsync, onSuccess, onError, data]);

  return {
    data,
    loading,
    error,
    execute,
    reset,
  };
}

// Specialized hook for API calls that return lists/arrays
export function useApiList<T = any>(options: UseApiOptions = {}): UseApiReturn<T[]> {
  return useApi<T[]>({ ...options, initialData: [] });
}