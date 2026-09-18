/**
 * Standardized API Response Helper Module
 * 
 * Provides unified JSON formatting for successful HTTP responses.
 */

import { Response } from 'express';
import { HttpStatus } from '../constants/http-status';

export interface ApiResponse<T = any> {
  success: boolean;
  message: string;
  data?: T;
  [key: string]: any;
}

/**
 * Sends a standardized success JSON response
 * 
 * @param res - Express Response object
 * @param data - Payload to send in the `data` property
 * @param message - Descriptive success message
 * @param statusCode - HTTP status code enum (default: 200 OK)
 * @param additionalFields - Additional top-level response fields for backwards compatibility (e.g. token, user, jobRole)
 */
export function sendSuccess<T>(
  res: Response,
  data: T,
  message: string = 'Operation successful',
  statusCode: HttpStatus = HttpStatus.OK,
  additionalFields: Record<string, any> = {}
): Response {
  return res.status(statusCode).json({
    success: true,
    message,
    data,
    ...additionalFields,
  });
}
