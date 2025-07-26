// Utility types for strict typing
export type Nullable<T> = T | null;
export type Optional<T> = T | undefined;
export type Maybe<T> = T | null | undefined;

// Branded types for type safety
export type Brand<K, T> = K & { __brand: T };

export type UserId = Brand<string, 'UserId'>;
export type Email = Brand<string, 'Email'>;
export type JWT = Brand<string, 'JWT'>;
export type HashedPassword = Brand<string, 'HashedPassword'>;
export type PlainPassword = Brand<string, 'PlainPassword'>;
export type RequestId = Brand<string, 'RequestId'>;
export type SessionId = Brand<string, 'SessionId'>;

// Environment types
export type NodeEnvironment = 'development' | 'test' | 'production';
export type LogLevel = 'error' | 'warn' | 'info' | 'http' | 'debug' | 'trace';

// Type guards
export function isUserId(value: string): value is UserId {
  return /^[0-9a-fA-F]{24}$/.test(value);
}

export function isEmail(value: string): value is Email {
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(value);
}

export function isJWT(value: string): value is JWT {
  return /^[A-Za-z0-9-_]+\.[A-Za-z0-9-_]+\.[A-Za-z0-9-_]*$/.test(value);
}

export function isRequestId(value: string): value is RequestId {
  return /^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(value);
}

export function isNodeEnvironment(value: string): value is NodeEnvironment {
  return ['development', 'test', 'production'].includes(value);
}

export function isLogLevel(value: string): value is LogLevel {
  return ['error', 'warn', 'info', 'http', 'debug', 'trace'].includes(value);
}

// Strict function types
export type AsyncFunction<TArgs extends any[] = any[], TReturn = any> =
  (...args: TArgs) => Promise<TReturn>;

export type ErrorHandler<TError = Error> =
  (error: TError) => void | Promise<void>;

export type RequestHandler<TRequest = any, TResponse = any> =
  (req: TRequest, res: TResponse) => void | Promise<void>;

// Exhaustive check helper
export function exhaustiveCheck(value: never): never {
  throw new Error(`Unhandled value: ${JSON.stringify(value)}`);
}

// Strict object types
export type StrictOmit<T, K extends keyof T> = Pick<T, Exclude<keyof T, K>>;
export type StrictPartial<T> = {
  [P in keyof T]?: T[P] | undefined;
};
export type StrictRequired<T> = {
  [P in keyof T]-?: T[P];
};

// Deep readonly and mutable types
export type DeepReadonly<T> = {
  readonly [P in keyof T]: DeepReadonly<T[P]>;
};

export type DeepPartial<T> = {
  [P in keyof T]?: T[P] extends object ? DeepPartial<T[P]> : T[P];
};

// Request/Response types with strict typing
// Note: These don't extend Express types to avoid compatibility issues
export interface StrictRequest<
  TParams = Record<string, string>,
  TQuery = Record<string, string | string[]>,
  TBody = unknown,
  TUser = unknown
> {
  params: TParams;
  query: TQuery;
  body: TBody;
  user?: TUser;
  id: RequestId;
  method: string;
  url: string;
  headers: Record<string, string | string[] | undefined>;
  ip: string;
}

export interface StrictResponse<TData = unknown> {
  json(body: ApiResponse<TData>): StrictResponse<TData>;
  status(code: number): StrictResponse<TData>;
  cookie(name: string, value: string, options?: any): StrictResponse<TData>;
}

export interface ApiResponse<TData = unknown> {
  success: boolean;
  data?: TData;
  error?: {
    message: string;
    code?: string;
    details?: unknown;
  };
  meta?: {
    timestamp: string;
    requestId: RequestId;
    [key: string]: unknown;
  };
}

// Environment variable types
export interface StrictProcessEnv {
  readonly NODE_ENV: NodeEnvironment;
  readonly JWT_SECRET: string;
  readonly JWT_REFRESH_SECRET: string;
  readonly JWT_ACCESS_EXPIRES_IN: string;
  readonly JWT_REFRESH_EXPIRES_IN: string;
  readonly MONGODB_URI: string;
  readonly LOG_LEVEL: LogLevel;
  readonly AUTH_SERVICE_PORT: string;
  readonly USER_SERVICE_PORT: string;
  readonly NEWS_SERVICE_PORT: string;
  readonly COURSE_SERVICE_PORT: string;
  readonly PLANNING_SERVICE_PORT: string;
  readonly STATISTICS_SERVICE_PORT: string;
  readonly [key: string]: string | undefined;
}

// User role types
export type UserRole = 'admin' | 'staff' | 'teacher' | 'student';
export const USER_ROLES: readonly UserRole[] = ['admin', 'staff', 'teacher', 'student'] as const;

export function isUserRole(value: string): value is UserRole {
  return USER_ROLES.includes(value as UserRole);
}

// JWT payload types
export interface StrictJWTPayload {
  _id: UserId;
  email: Email;
  role: UserRole;
  tokenVersion: number;
  iat?: number;
  exp?: number;
}

// Database document types
export interface StrictTimestamps {
  createdAt: Date;
  updatedAt: Date;
}

export interface StrictDocument extends StrictTimestamps {
  _id: UserId;
}

// Validation result types
export interface ValidationResult<T> {
  success: boolean;
  data?: T;
  errors?: Array<{
    field: string;
    message: string;
    value?: unknown;
  }>;
}

// Service response types
export interface ServiceResult<T = unknown> {
  success: boolean;
  data?: T;
  error?: string;
  code?: string;
}

// Pagination types
export interface StrictPaginationParams {
  page: number;
  limit: number;
  sort?: string;
  order?: 'asc' | 'desc';
}

export interface StrictPaginatedResult<T> {
  data: T[];
  pagination: {
    page: number;
    limit: number;
    total: number;
    totalPages: number;
    hasNextPage: boolean;
    hasPrevPage: boolean;
  };
}

// HTTP status code types
export type HttpStatusCode =
  | 200 // OK
  | 201 // Created
  | 204 // No Content
  | 400 // Bad Request
  | 401 // Unauthorized
  | 403 // Forbidden
  | 404 // Not Found
  | 409 // Conflict
  | 422 // Unprocessable Entity
  | 429 // Too Many Requests
  | 500 // Internal Server Error
  | 502 // Bad Gateway
  | 503; // Service Unavailable

// Type-safe environment access
export function getEnvVar(key: keyof StrictProcessEnv): string | undefined {
  return process.env[key];
}

export function requireEnvVar(key: keyof StrictProcessEnv): string {
  const value = process.env[key];
  if (!value) {
    throw new Error(`Required environment variable ${key} is not set`);
  }
  return value;
}

// Type assertion helpers
export function assertIsUserId(value: string): asserts value is UserId {
  if (!isUserId(value)) {
    throw new Error(`Invalid UserId format: ${value}`);
  }
}

export function assertIsEmail(value: string): asserts value is Email {
  if (!isEmail(value)) {
    throw new Error(`Invalid email format: ${value}`);
  }
}

export function assertIsUserRole(value: string): asserts value is UserRole {
  if (!isUserRole(value)) {
    throw new Error(`Invalid user role: ${value}`);
  }
}

// Safe JSON parsing
export function safeJsonParse<T>(json: string): ValidationResult<T> {
  try {
    const data = JSON.parse(json) as T;
    return { success: true, data };
  } catch (error) {
    return {
      success: false,
      errors: [{
        field: 'json',
        message: error instanceof Error ? error.message : 'Invalid JSON',
        value: json,
      }],
    };
  }
}

// Array utilities with strict typing
export function isNonEmptyArray<T>(arr: T[]): arr is [T, ...T[]] {
  return arr.length > 0;
}

export function filterNullish<T>(arr: (T | null | undefined)[]): T[] {
  return arr.filter((item): item is T => item != null);
}

// Object utilities
export function hasProperty<K extends string>(
  obj: object,
  key: K,
): obj is object & Record<K, unknown> {
  return Object.prototype.hasOwnProperty.call(obj, key);
}

export function getProperty<T, K extends keyof T>(
  obj: T,
  key: K,
): T[K] | undefined {
  return obj?.[key];
}
