// Path: packages/api-gateway/src/types/gateway.ts

export interface ServiceConfig {
  name: string;
  url: string;
  path: string;
  timeout: number;
  retries: number;
  healthCheck: string;
  version: string;
  isActive: boolean;
  weight: number;
  rateLimit?: RateLimitConfig;
  authentication?: AuthConfig;
  circuitBreaker?: CircuitBreakerConfig;
}

export interface RateLimitConfig {
  windowMs: number;
  maxRequests: number;
  message?: string;
  skipSuccessfulRequests?: boolean;
  skipFailedRequests?: boolean;
}

export interface AuthConfig {
  required: boolean;
  roles?: string[];
  permissions?: string[];
  bypassPaths?: string[];
}

export interface CircuitBreakerConfig {
  enabled: boolean;
  failureThreshold: number;
  resetTimeout: number;
  monitoringPeriod: number;
}

export interface LoadBalancerConfig {
  strategy: LoadBalancingStrategy;
  healthCheckInterval: number;
  unhealthyThreshold: number;
  healthyThreshold: number;
}

export interface ProxyConfig {
  changeOrigin: boolean;
  preserveHeaderKeyCase: boolean;
  followRedirects: boolean;
  timeout: number;
  retries: number;
  logLevel: LogLevel;
  onError?: (err: Error, req: any, res: any, target: string) => void;
  onProxyReq?: (proxyReq: any, req: any, res: any, options: any) => void;
  onProxyRes?: (proxyRes: any, req: any, res: any) => void;
}

export interface CacheConfig {
  enabled: boolean;
  ttl: number;
  maxSize: number;
  keyGenerator?: (req: any) => string;
  shouldCache?: (req: any, res: any) => boolean;
}

export interface MetricsConfig {
  enabled: boolean;
  endpoint: string;
  collectDefaultMetrics: boolean;
  labels?: string[];
}

export interface SecurityConfig {
  cors: {
    origins: string[];
    credentials: boolean;
    methods: string[];
    headers: string[];
  };
  helmet: {
    enabled: boolean;
    options?: any;
  };
  rateLimiting: {
    global: RateLimitConfig;
    perService?: Record<string, RateLimitConfig>;
  };
  authentication: {
    jwtSecret: string;
    tokenHeader: string;
    refreshTokenHeader?: string;
    cookieName?: string;
  };
}

export interface LoggingConfig {
  level: LogLevel;
  format: LogFormat;
  transports: LogTransport[];
  requestLogging: boolean;
  errorLogging: boolean;
  performanceLogging: boolean;
}

export interface HealthCheckResult {
  service: string;
  status: HealthStatus;
  responseTime: number;
  timestamp: Date;
  error?: string;
  details?: any;
}

export interface ServiceMetrics {
  service: string;
  requestCount: number;
  errorCount: number;
  averageResponseTime: number;
  uptime: number;
  healthStatus: HealthStatus;
  lastHealthCheck: Date;
  circuitBreakerState: CircuitBreakerState;
}

export interface RequestMetrics {
  requestId: string;
  method: string;
  url: string;
  service: string;
  startTime: Date;
  endTime?: Date;
  responseTime?: number;
  statusCode?: number;
  userAgent?: string;
  userId?: string;
  errorMessage?: string;
}

export interface GatewayStats {
  totalRequests: number;
  successfulRequests: number;
  failedRequests: number;
  averageResponseTime: number;
  uptime: number;
  servicesStatus: ServiceStatus[];
  memoryUsage: MemoryUsage;
  systemLoad: number;
  timestamp: Date;
}

export interface ServiceStatus {
  name: string;
  status: HealthStatus;
  url: string;
  responseTime: number;
  requestCount: number;
  errorRate: number;
  lastHealthCheck: Date;
}

export interface MemoryUsage {
  rss: number;
  heapTotal: number;
  heapUsed: number;
  external: number;
  arrayBuffers: number;
}

export interface RouteConfig {
  method: HttpMethod;
  path: string;
  service: string;
  timeout?: number;
  retries?: number;
  cache?: CacheConfig;
  rateLimit?: RateLimitConfig;
  auth?: AuthConfig;
  transform?: {
    request?: (req: any) => any;
    response?: (res: any) => any;
  };
}

export interface CircuitBreakerStats {
  state: CircuitBreakerState;
  failureCount: number;
  successCount: number;
  nextAttempt?: Date;
  lastFailureTime?: Date;
  lastSuccessTime?: Date;
}

export interface ApiResponse<T = any> {
  success: boolean;
  data?: T;
  error?: string;
  message?: string;
  timestamp: Date;
  requestId: string;
  service?: string;
  responseTime?: number;
}

export interface ServiceDiscoveryConfig {
  enabled: boolean;
  provider: ServiceDiscoveryProvider;
  refreshInterval: number;
  healthCheckPath: string;
  registrationTtl: number;
}

export interface WebSocketConfig {
  enabled: boolean;
  path: string;
  cors: {
    origins: string[];
    credentials: boolean;
  };
  authentication: boolean;
  heartbeatInterval: number;
}

// Enums and Types
export type LoadBalancingStrategy = 
  | 'round_robin' 
  | 'least_connections' 
  | 'weighted_round_robin' 
  | 'least_response_time' 
  | 'ip_hash';

export type HealthStatus = 'healthy' | 'unhealthy' | 'unknown' | 'degraded';

export type CircuitBreakerState = 'closed' | 'open' | 'half_open';

export type LogLevel = 'error' | 'warn' | 'info' | 'debug' | 'verbose';

export type LogFormat = 'json' | 'simple' | 'combined' | 'common';

export type LogTransport = 'console' | 'file' | 'database' | 'elasticsearch';

export type HttpMethod = 'GET' | 'POST' | 'PUT' | 'PATCH' | 'DELETE' | 'OPTIONS' | 'HEAD';

export type ServiceDiscoveryProvider = 'consul' | 'etcd' | 'zookeeper' | 'eureka' | 'static';

// Request/Response Interfaces
export interface GatewayRequest extends Request {
  requestId: string;
  startTime: Date;
  user?: {
    id: string;
    email: string;
    role: string;
    permissions?: string[];
  };
  service?: string;
  metrics?: {
    startTime: Date;
    endTime?: Date;
    responseTime?: number;
  };
}

export interface GatewayResponse extends Response {
  responseTime?: number;
  service?: string;
  fromCache?: boolean;
}

// Error Types
export interface GatewayError extends Error {
  statusCode: number;
  service?: string;
  originalError?: Error;
  requestId?: string;
  timestamp: Date;
}

export interface ServiceError {
  service: string;
  error: string;
  statusCode: number;
  timestamp: Date;
  requestId?: string;
}

// Configuration Interfaces
export interface GatewayConfig {
  port: number;
  host: string;
  services: ServiceConfig[];
  loadBalancer: LoadBalancerConfig;
  proxy: ProxyConfig;
  cache: CacheConfig;
  metrics: MetricsConfig;
  security: SecurityConfig;
  logging: LoggingConfig;
  serviceDiscovery?: ServiceDiscoveryConfig;
  webSocket?: WebSocketConfig;
}

export interface EnvironmentConfig {
  NODE_ENV: string;
  PORT: string;
  HOST: string;
  JWT_SECRET: string;
  REDIS_URL?: string;
  LOG_LEVEL: string;
  CORS_ORIGINS: string;
  RATE_LIMIT_WINDOW: string;
  RATE_LIMIT_MAX: string;
  HEALTH_CHECK_INTERVAL: string;
  CIRCUIT_BREAKER_THRESHOLD: string;
  CACHE_TTL: string;
  METRICS_ENABLED: string;
  SERVICE_DISCOVERY_ENABLED: string;
}

// Middleware Types
export interface MiddlewareConfig {
  order: number;
  enabled: boolean;
  paths?: string[];
  excludePaths?: string[];
  options?: any;
}

export interface AuthMiddlewareConfig extends MiddlewareConfig {
  jwtSecret: string;
  tokenHeader: string;
  bypassPaths: string[];
  requiredRoles?: string[];
}

export interface RateLimitMiddlewareConfig extends MiddlewareConfig {
  windowMs: number;
  maxRequests: number;
  message: string;
  skipSuccessfulRequests: boolean;
}

export interface CacheMiddlewareConfig extends MiddlewareConfig {
  ttl: number;
  maxSize: number;
  keyGenerator: (req: any) => string;
}

export interface CompressionMiddlewareConfig extends MiddlewareConfig {
  level: number;
  threshold: number;
  filter: (req: any, res: any) => boolean;
}