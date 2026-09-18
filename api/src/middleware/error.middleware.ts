/**
 * Global Centralized Error Handling Middleware
 * 
 * Intercepts all errors thrown anywhere in the API services, controllers, or middleware,
 * producing a standardized JSON error response.
 */

import { Request, Response, NextFunction } from 'express';
import { HttpStatus } from '../constants/http-status';
import { AppError } from '../utils/app-error';

export function errorHandler(
  err: any,
  req: Request,
  res: Response,
  next: NextFunction
): void {
  // Extract HTTP status code from AppError or fallback to 500
  const statusCode: HttpStatus = err.statusCode || HttpStatus.INTERNAL_SERVER_ERROR;
  const message: string = err.message || 'Internal server error occurred.';

  // Log server-side critical errors (500s)
  if (statusCode === HttpStatus.INTERNAL_SERVER_ERROR) {
    console.error(`💥 [500 Server Error] ${req.method} ${req.originalUrl}:`, err);
  } else {
    console.warn(`⚠️ [${statusCode} Client Error] ${req.method} ${req.originalUrl}: ${message}`);
  }

  res.status(statusCode).json({
    success: false,
    message,
    error: message, // Preserves backward compatibility for clients checking .error
    statusCode,
  });
}
