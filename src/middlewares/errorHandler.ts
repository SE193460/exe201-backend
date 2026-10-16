import { NextFunction, Request, Response } from "express";

/**
 * Errors that are safe to expose to the client.
 * Anything else is treated as an unexpected server error and masked.
 */
export class AppError extends Error {
  statusCode: number;
  details?: unknown;

  constructor(message: string, statusCode = 400, details?: unknown) {
    super(message);
    this.name = "AppError";
    this.statusCode = statusCode;
    this.details = details;
  }
}

export function notFoundHandler(req: Request, res: Response) {
  return res.status(404).json({ message: "Not found" });
}

// eslint-disable-next-line @typescript-eslint/no-unused-vars
export function errorHandler(err: unknown, req: Request, res: Response, _next: NextFunction) {
  if (err instanceof AppError) {
    return res.status(err.statusCode).json({
      message: err.message,
      ...(err.details ? { details: err.details } : {}),
    });
  }

  // Unexpected error: log the real cause server-side, never leak it to the client.
  console.error(`Unhandled error on ${req.method} ${req.originalUrl}:`, err);

  return res.status(500).json({ message: "Internal server error" });
}
