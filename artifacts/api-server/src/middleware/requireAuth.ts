import type { RequestHandler } from "express";

export const requireAuth: RequestHandler = (req, res, next) => {
  const session = (req as any).session;
  if (session?.userId) {
    return next();
  }
  return res.status(401).json({ error: "Authentication required" });
};
