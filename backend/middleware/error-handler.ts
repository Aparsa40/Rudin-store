import type { ErrorRequestHandler } from "express";

/**
 * Final Express error handler. Do not leak stack traces or secrets to clients.
 */
export const errorHandler: ErrorRequestHandler = (error, _req, res, _next) => {
  console.error("Unhandled API error:", error);

  if (res.headersSent) {
    return;
  }

  res.status(500).json({
    status: "error",
    message: "Internal server error",
  });
};
