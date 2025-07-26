export abstract class AppError extends Error {
  public readonly statusCode: number;
  public readonly isOperational: boolean;
  public readonly timestamp: Date;
  public readonly context?: Record<string, any>;

  constructor(
    message: string,
    statusCode: number,
    isOperational = true,
    context?: Record<string, any>,
  ) {
    super(message);
    Object.setPrototypeOf(this, new.target.prototype);

    this.name = this.constructor.name;
    this.statusCode = statusCode;
    this.isOperational = isOperational;
    this.timestamp = new Date();
    this.context = context;

    Error.captureStackTrace(this, this.constructor);
  }

  toJSON() {
    return {
      name: this.name,
      message: this.message,
      statusCode: this.statusCode,
      timestamp: this.timestamp,
      context: this.context,
      stack: this.stack,
    };
  }
}

// Specific error types
export class ValidationError extends AppError {
  public readonly validationErrors: Array<{
    field: string;
    message: string;
    value?: any;
  }>;

  constructor(errors: Array<{ field: string; message: string; value?: any }>) {
    const message = `Validation failed: ${errors.map(e => e.field).join(', ')}`;
    super(message, 422, true, { errors });
    this.validationErrors = errors;
  }
}

export class AuthenticationError extends AppError {
  constructor(message = 'Authentication failed', context?: Record<string, any>) {
    super(message, 401, true, context);
  }
}

export class AuthorizationError extends AppError {
  constructor(message = 'Access denied', context?: Record<string, any>) {
    super(message, 403, true, context);
  }
}

export class NotFoundError extends AppError {
  constructor(resource: string, identifier?: string | number) {
    const message = identifier
      ? `${resource} with id '${identifier}' not found`
      : `${resource} not found`;
    super(message, 404, true, { resource, identifier });
  }
}

export class ConflictError extends AppError {
  constructor(message: string, context?: Record<string, any>) {
    super(message, 409, true, context);
  }
}

export class RateLimitError extends AppError {
  public readonly retryAfter: number;

  constructor(retryAfter: number, message = 'Too many requests') {
    super(message, 429, true, { retryAfter });
    this.retryAfter = retryAfter;
  }
}

export class ExternalServiceError extends AppError {
  public readonly service: string;
  public readonly originalError?: Error;

  constructor(service: string, message: string, originalError?: Error) {
    super(`External service error (${service}): ${message}`, 502, true, {
      service,
      originalError: originalError?.message,
    });
    this.service = service;
    this.originalError = originalError;
  }
}

export class DatabaseError extends AppError {
  public readonly operation: string;
  public readonly originalError?: Error;

  constructor(operation: string, originalError?: Error) {
    const message = `Database operation failed: ${operation}`;
    super(message, 500, false, {
      operation,
      originalError: originalError?.message,
    });
    this.operation = operation;
    this.originalError = originalError;
  }
}
