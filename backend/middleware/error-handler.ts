import type { ErrorRequestHandler } from "express";

type DatabaseError = Error & { code?: number; name?: string; keyPattern?: Record<string, unknown> };

/**
 * Final Express error handler. Do not leak stack traces, database details, or secrets to clients.
 */
export const errorHandler: ErrorRequestHandler = (error: unknown, _req, res, _next) => {
  if (res.headersSent) return;

  const databaseError = error as DatabaseError;
  if (databaseError?.code === 11000) {
    res.status(409).json({
      error: {
        code: "DUPLICATE_RESOURCE",
        message: "A record with a conflicting unique value already exists.",
      },
    });
    return;
  }

  if (databaseError?.name === "ValidationError" || databaseError?.name === "CastError") {
    res.status(400).json({
      error: {
        code: "INVALID_RESOURCE",
        message: "The submitted data is invalid.",
      },
    });
    return;
  }

  console.error("Unhandled API error:", error);
  res.status(500).json({
    error: {
      code: "INTERNAL_SERVER_ERROR",
      message: "Internal server error.",
    },
  });
};
