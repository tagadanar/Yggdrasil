// Path: packages/api-services/planning-service/src/types/express.d.ts

declare global {
  namespace Express {
    interface Request {
      user?: {
        id: string;
        email: string;
        role: string;
      };
    }
  }
}

export {};