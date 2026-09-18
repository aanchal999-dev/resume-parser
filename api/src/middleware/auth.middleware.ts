import { Request, Response, NextFunction } from 'express';
import jwt from 'jsonwebtoken';
import { ENV } from '../config/env';
import { AppError } from '../utils/app-error';
import { HttpStatus } from '../constants/http-status';

/**
 * Extended Express Request interface carrying authenticated recruiter identity
 */
export interface AuthenticatedRequest extends Request {
  user?: {
    userId: string;
    email: string;
  };
}

/**
 * JWT Authentication Middleware:
 * Inspects incoming 'Authorization: Bearer <token>' header or '?token=<token>' query parameter,
 * verifies signature against JWT_SECRET, and attaches decoded user to req.user.
 */
export function authenticateToken(
  req: AuthenticatedRequest,
  res: Response,
  next: NextFunction
): void {
  const authHeader = req.headers['authorization'];

  // Format: "Bearer <token_string>" or query param "?token=<token>" for EventSource streams
  const token = (authHeader && authHeader.split(' ')[1]) || (req.query.token as string);

  if (!token) {
    return next(new AppError('Access token required. Please sign in.', HttpStatus.UNAUTHORIZED));
  }

  jwt.verify(token, ENV.JWT_SECRET, (err, decoded) => {
    if (err) {
      return next(new AppError('Invalid or expired access token.', HttpStatus.FORBIDDEN));
    }

    req.user = decoded as { userId: string; email: string };
    next();
  });
}

