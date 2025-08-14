// packages/frontend/src/hooks/useFilters.ts
// Filter and search state management hook to replace 30+ filter patterns

import { useState, useCallback, useMemo, useEffect } from 'react';
import { useDebounce } from './useDebounce';
import { useLocalStorage } from './useLocalStorage';
import { createComponentLogger } from '@/lib/errors/logger';

interface FilterState<T> {
  filters: T;
  searchQuery: string;
  showFilters: boolean;
  isActive: boolean; // True if any filters or search are applied
}

interface UseFiltersOptions<T> {
  component?: string;
  persistent?: boolean; // Persist filters in localStorage (default: false)
  storageKey?: string; // Key for localStorage (required if persistent: true)
  searchDebounceMs?: number; // Debounce delay for search (default: 300)
  onFiltersChange?: (filters: T, searchQuery: string) => void;
  validateFilters?: (filters: T) => T; // Validate and sanitize filters
  searchFields?: (keyof T)[]; // Fields that should be cleared when search is used
}

interface UseFiltersReturn<T> {
  // Current state
  filters: T;
  searchQuery: string;
  debouncedSearchQuery: string;
  showFilters: boolean;
  isActive: boolean;
  
  // Filter actions
  setFilter: <K extends keyof T>(key: K, value: T[K]) => void;
  setFilters: (filters: Partial<T>) => void;
  clearFilter: (key: keyof T) => void;
  clearFilters: () => void;
  resetFilters: () => void; // Reset to initial state
  
  // Search actions
  setSearchQuery: (query: string) => void;
  clearSearch: () => void;
  
  // UI actions
  toggleFilters: () => void;
  showFiltersPanel: () => void;
  hideFiltersPanel: () => void;
  
  // Advanced actions
  clearAll: () => void; // Clear filters and search
  applyPreset: (preset: Partial<T>) => void;
  
  // Computed values
  activeFilterCount: number;
  hasActiveFilters: boolean;
  hasActiveSearch: boolean;
  
  // Helpers
  getFilterValue: <K extends keyof T>(key: K) => T[K];
  isFilterActive: (key: keyof T) => boolean;
  getSearchableFilters: () => Partial<T>; // Filters that work with search
}

const logger = createComponentLogger('useFilters');

export function useFilters<T extends Record<string, any>>(
  initialFilters: T,
  options: UseFiltersOptions<T> = {}
): UseFiltersReturn<T> {
  const {
    component = 'Filters',
    persistent = false,
    storageKey,
    searchDebounceMs = 300,
    onFiltersChange,
    validateFilters,
    searchFields = [],
  } = options;

  // Storage key validation
  if (persistent && !storageKey) {
    throw new Error('storageKey is required when persistent is true');
  }

  // Persistent storage for filters
  const [persistentFilters, setPersistentFilters] = useLocalStorage<T>(
    storageKey || 'filters',
    initialFilters
  );

  // Use persistent filters if enabled, otherwise use state
  const [localFilters, setLocalFilters] = useState<T>(
    persistent ? persistentFilters : initialFilters
  );
  
  const [searchQuery, setSearchQueryState] = useState('');
  const [showFilters, setShowFilters] = useState(false);

  const filters = persistent ? persistentFilters : localFilters;
  const setFiltersState = persistent ? setPersistentFilters : setLocalFilters;

  // Debounced search query
  const debouncedSearchQuery = useDebounce(searchQuery, searchDebounceMs);

  // Validate filters when they change
  const validatedFilters = useMemo(() => {
    if (!validateFilters) return filters;
    
    try {
      return validateFilters(filters);
    } catch (error) {
      logger.error('Filter validation failed', { component, error });
      return filters;
    }
  }, [filters, validateFilters, component]);

  // Calculate if filters are active
  const { activeFilterCount, hasActiveFilters } = useMemo(() => {
    const initialKeys = Object.keys(initialFilters);
    let count = 0;
    
    for (const key of initialKeys) {
      const current = validatedFilters[key];
      const initial = initialFilters[key];
      
      // Consider filter active if it's different from initial value
      if (Array.isArray(current)) {
        if (current.length > 0) count++;
      } else if (typeof current === 'string') {
        if (current !== initial && current.length > 0) count++;
      } else if (typeof current === 'boolean') {
        if (current !== initial) count++;
      } else if (current !== initial && current != null) {
        count++;
      }
    }
    
    return {
      activeFilterCount: count,
      hasActiveFilters: count > 0,
    };
  }, [validatedFilters, initialFilters]);

  const hasActiveSearch = searchQuery.length > 0;
  const isActive = hasActiveFilters || hasActiveSearch;

  // Notify about filter changes
  useEffect(() => {
    onFiltersChange?.(validatedFilters, debouncedSearchQuery);
  }, [validatedFilters, debouncedSearchQuery, onFiltersChange]);

  const setFilter = useCallback(<K extends keyof T>(key: K, value: T[K]) => {
    logger.debug('Setting filter', { component, key: String(key), value });
    
    setFiltersState(prev => ({
      ...prev,
      [key]: value,
    }));
  }, [component, setFiltersState]);

  const setFilters = useCallback((newFilters: Partial<T>) => {
    logger.debug('Setting multiple filters', { component, filters: newFilters });
    
    setFiltersState(prev => ({
      ...prev,
      ...newFilters,
    }));
  }, [component, setFiltersState]);

  const clearFilter = useCallback((key: keyof T) => {
    logger.debug('Clearing filter', { component, key: String(key) });
    
    setFiltersState(prev => ({
      ...prev,
      [key]: initialFilters[key],
    }));
  }, [component, setFiltersState, initialFilters]);

  const clearFilters = useCallback(() => {
    logger.debug('Clearing all filters', { component });
    
    setFiltersState(initialFilters);
  }, [component, setFiltersState, initialFilters]);

  const resetFilters = useCallback(() => {
    logger.debug('Resetting filters to initial state', { component });
    
    setFiltersState(initialFilters);
    setSearchQueryState('');
    setShowFilters(false);
  }, [component, setFiltersState, initialFilters]);

  const setSearchQuery = useCallback((query: string) => {
    logger.debug('Setting search query', { component, query });
    
    setSearchQueryState(query);
    
    // Clear search-related filters when search is used
    if (query && searchFields.length > 0) {
      const clearedFields: Partial<T> = {};
      searchFields.forEach(field => {
        clearedFields[field] = initialFilters[field];
      });
      setFilters(clearedFields);
    }
  }, [component, searchFields, initialFilters, setFilters]);

  const clearSearch = useCallback(() => {
    logger.debug('Clearing search query', { component });
    setSearchQueryState('');
  }, [component]);

  const toggleFilters = useCallback(() => {
    setShowFilters(prev => !prev);
  }, []);

  const showFiltersPanel = useCallback(() => {
    setShowFilters(true);
  }, []);

  const hideFiltersPanel = useCallback(() => {
    setShowFilters(false);
  }, []);

  const clearAll = useCallback(() => {
    logger.debug('Clearing all filters and search', { component });
    
    clearFilters();
    clearSearch();
  }, [component, clearFilters, clearSearch]);

  const applyPreset = useCallback((preset: Partial<T>) => {
    logger.debug('Applying filter preset', { component, preset });
    
    setFilters(preset);
    // Optionally clear search when applying preset
    if (hasActiveSearch) {
      clearSearch();
    }
  }, [component, setFilters, hasActiveSearch, clearSearch]);

  const getFilterValue = useCallback(<K extends keyof T>(key: K): T[K] => {
    return validatedFilters[key];
  }, [validatedFilters]);

  const isFilterActive = useCallback((key: keyof T): boolean => {
    const current = validatedFilters[key];
    const initial = initialFilters[key];
    
    if (Array.isArray(current)) {
      return current.length > 0;
    } else if (typeof current === 'string') {
      return current !== initial && current.length > 0;
    } else if (typeof current === 'boolean') {
      return current !== initial;
    } else {
      return current !== initial && current != null;
    }
  }, [validatedFilters, initialFilters]);

  const getSearchableFilters = useCallback((): Partial<T> => {
    const searchable: Partial<T> = {};
    
    Object.keys(validatedFilters).forEach(key => {
      if (!searchFields.includes(key as keyof T)) {
        searchable[key as keyof T] = validatedFilters[key];
      }
    });
    
    return searchable;
  }, [validatedFilters, searchFields]);

  return {
    // Current state
    filters: validatedFilters,
    searchQuery,
    debouncedSearchQuery,
    showFilters,
    isActive,
    
    // Filter actions
    setFilter,
    setFilters,
    clearFilter,
    clearFilters,
    resetFilters,
    
    // Search actions
    setSearchQuery,
    clearSearch,
    
    // UI actions
    toggleFilters,
    showFiltersPanel,
    hideFiltersPanel,
    
    // Advanced actions
    clearAll,
    applyPreset,
    
    // Computed values
    activeFilterCount,
    hasActiveFilters,
    hasActiveSearch,
    
    // Helpers
    getFilterValue,
    isFilterActive,
    getSearchableFilters,
  };
}

// Convenience hook for simple search-only functionality
export function useSearch(
  initialQuery: string = '',
  debounceMs: number = 300,
  options: { onSearch?: (query: string) => void } = {}
) {
  const [query, setQuery] = useState(initialQuery);
  const debouncedQuery = useDebounce(query, debounceMs);
  
  useEffect(() => {
    options.onSearch?.(debouncedQuery);
  }, [debouncedQuery, options.onSearch]);
  
  return {
    query,
    debouncedQuery,
    setQuery,
    clearQuery: () => setQuery(''),
    hasQuery: query.length > 0,
  };
}

// Hook for filter presets management
export function useFilterPresets<T extends Record<string, any>>(
  presets: Record<string, Partial<T>>,
  storageKey?: string
) {
  const [customPresets, setCustomPresets] = useLocalStorage<Record<string, Partial<T>>>(
    storageKey || 'filter-presets',
    {}
  );
  
  const allPresets = useMemo(() => ({
    ...presets,
    ...customPresets,
  }), [presets, customPresets]);
  
  const saveCustomPreset = useCallback((name: string, filters: Partial<T>) => {
    setCustomPresets(prev => ({
      ...prev,
      [name]: filters,
    }));
  }, [setCustomPresets]);
  
  const deleteCustomPreset = useCallback((name: string) => {
    setCustomPresets(prev => {
      const updated = { ...prev };
      delete updated[name];
      return updated;
    });
  }, [setCustomPresets]);
  
  return {
    presets: allPresets,
    customPresets,
    saveCustomPreset,
    deleteCustomPreset,
    getPreset: (name: string) => allPresets[name],
    hasPreset: (name: string) => name in allPresets,
  };
}