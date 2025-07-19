// packages/shared-utilities/src/index.ts
// Main export file for shared utilities

// Types
export * from './types/auth';
export * from './types/api';
export * from './types/news';
export * from './types/course';
export * from './types/planning';

// Validation schemas
export * from './validation/auth';
export * from './validation/news';
export * from './validation/course';
export * from './validation/planning';

// Constants
export * from './constants';

// Helpers
export * from './helpers/response';
export * from './helpers/validation';
export * from './helpers/jwt';

// Middleware
export * from './middleware/auth';

// Testing utilities are exported separately to avoid Node.js dependencies in browser builds
// Use: import { ... } from '@yggdrasil/shared-utilities/testing' for test infrastructure