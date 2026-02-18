declare global {
  namespace Express {
    interface Request {
      requestId?: string;
      investSessionId?: string;
      investSessionToken?: string;
    }
  }
}

export {};
