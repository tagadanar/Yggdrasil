// Path: packages/api-services/statistics-service/src/types/express.d.ts

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