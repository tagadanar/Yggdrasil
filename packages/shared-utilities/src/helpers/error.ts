// Path: packages/shared-utilities/src/helpers/error.ts

export class ErrorHelper {
  /**
   * Handle service errors with consistent format
   */
  static handleServiceError(message: string, error: any): { success: false; error: string } {
    // Only log in non-test environments to reduce noise
    if (process.env.NODE_ENV !== 'test') {
      console.error(`${message}:`, error);
    }
    
    if (error.name === 'ValidationError') {
      return { success: false, error: `Validation failed: ${error.message}` };
    }
    
    if (error.name === 'MongoError' || error.name === 'MongoServerError') {
      if (error.code === 11000) {
        return { success: false, error: 'Resource already exists' };
      }
      return { success: false, error: 'Database operation failed' };
    }
    
    return { success: false, error: `${message}: ${error.message || 'Unknown error'}` };
  }
}