import { Request, Response, NextFunction } from "express";

/**
 * Custom API error class that includes a status code and optional details.
 * Used for throwing application-specific errors that can be properly formatted
 * in the error response.
 */
export class ApiError extends Error {
  /**
   * Creates a new API error.
   * @param statusCode - HTTP status code for the error
   * @param message - Error message
   * @param details - Optional additional error details
   */
  constructor(
    public statusCode: number,
    message: string,
    public details?: Record<string, unknown>
  ) {
    super(message);
    this.name = "ApiError";
  }
}

/**
 * Global error handling middleware.
 * Catches all errors thrown in the application and formats them into a consistent
 * error response structure.
 *
 * @param err - The error object
 * @param req - Express request object
 * @param res - Express response object
 * @param _next - Express next function (intentionally unused)
 */
export const errorHandler = (
  err: Error,
  req: Request,
  res: Response,
  _next: NextFunction
): void => {
  console.error("Error:", err);

  if (err instanceof ApiError) {
    res.status(err.statusCode).json({
      error: {
        message: err.message,
        ...(err.details && { details: err.details }),
      },
    });
    return;
  }

  res.status(500).json({
    error: {
      message: "Internal server error",
    },
  });
};
