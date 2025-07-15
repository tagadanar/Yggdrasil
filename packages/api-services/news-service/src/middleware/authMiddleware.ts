import { Request, Response, NextFunction } from 'express';
import { UserModel } from '@yggdrasil/database-schemas';
import { ResponseHelper, SharedJWTHelper } from '@yggdrasil/shared-utilities';
import { AuthRequest } from '@yggdrasil/shared-utilities';

export const authenticate = async (
  req: AuthRequest,
  res: Response,
  next: NextFunction
): Promise<void> => {
  try {
    const authHeader = req.headers.authorization;
    const token = SharedJWTHelper.extractTokenFromHeader(authHeader);

    if (!token) {
      const errorResponse = ResponseHelper.error('No token provided', 401);
      res.status(errorResponse.statusCode).json(errorResponse);
      return;
    }

    // Use shared JWT helper for consistent token verification
    const verificationResult = SharedJWTHelper.verifyAccessToken(token);
    
    if (!verificationResult.success || !verificationResult.data) {
      const errorResponse = ResponseHelper.error(
        verificationResult.error || 'Invalid token', 
        401
      );
      res.status(errorResponse.statusCode).json(errorResponse);
      return;
    }

    const decoded = verificationResult.data;
    
    // Use userId field (with fallback to id for backward compatibility)
    const userId = decoded.userId || decoded.id;
    
    if (!userId) {
      const errorResponse = ResponseHelper.error('Invalid token payload', 401);
      res.status(errorResponse.statusCode).json(errorResponse);
      return;
    }

    const user = await UserModel.findById(userId).select('-password');

    if (!user) {
      const errorResponse = ResponseHelper.error('User not found', 401);
      res.status(errorResponse.statusCode).json(errorResponse);
      return;
    }

    req.user = user;
    next();
  } catch (error) {
    console.error('Authentication error:', error);
    const errorResponse = ResponseHelper.error('Invalid token', 401);
    res.status(errorResponse.statusCode).json(errorResponse);
  }
};