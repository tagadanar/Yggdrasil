// packages/api-services/auth-service/src/utils/JWTHelper.ts
// JWT token generation and validation utilities - now using shared utilities

import { SharedJWTHelper } from '@yggdrasil/shared-utilities/jwt';

// Re-export shared JWT helper for backward compatibility
export class JWTHelper extends SharedJWTHelper {
  // All functionality is now inherited from SharedJWTHelper
  // This ensures consistent JWT handling across all services
}
