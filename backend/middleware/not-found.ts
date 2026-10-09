import type { Request, Response } from "express";

/**
 * Consistent JSON response for unknown API paths.
 */
export function notFoundHandler(req: Request, res: Response): void {
  res.status(404).json({
    status: "error",
    message: `Route not found: ${req.method} ${req.originalUrl}`,
  });
}
