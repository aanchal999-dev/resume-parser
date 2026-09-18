/**
 * Custom Operational Application Error Class
 * 
 * Extends JavaScript's native Error class to associate an HTTP status code
 * and operational flag with domain / service level errors.
 */

import { HttpStatus } from '../constants/http-status';

export class AppError extends Error {
  public readonly statusCode: HttpStatus;
  public readonly isOperational: boolean;

  constructor(
    message: string,
    statusCode: HttpStatus = HttpStatus.INTERNAL_SERVER_ERROR
  ) {
    super(message);
    this.statusCode = statusCode;
    this.isOperational = true;

    // Capture standard stack trace excluding constructor call from it
    Error.captureStackTrace(this, this.constructor);
  }
}
