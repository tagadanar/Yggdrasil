// packages/frontend/src/hooks/index.ts
// Central export point for all custom hooks

// State management hooks
export { useAsyncState } from './useAsyncState';
export { useLocalStorage } from './useLocalStorage';
export { useDebounce } from './useDebounce';

// Phase 4: Advanced state management hooks
export { 
  useAsyncResource, 
  useAsyncData, 
  useAsyncPaginatedResource 
} from './useAsyncResource';
export { useForm, useSimpleForm } from './useForm';
export { 
  useModalManager, 
  useModal, 
  useManagedModal 
} from './useModalManager';
export { 
  useFilters, 
  useSearch, 
  useFilterPresets 
} from './useFilters';

// API hooks
export { useApi } from './useApi';
export { useCourses } from './useCourses';

// Auth hooks (enhancement)
// Note: useAuth is already provided by AuthProvider, these are additional utilities
export { useAuthState } from './useAuthState';