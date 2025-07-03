// Express type extensions for user-service
import { Request } from 'express';

interface UserPayload {
  _id: string;
  email: string;
  role: string;
}

declare global {
  namespace Express {
    interface Request {
      user?: UserPayload;
    }
  }
}