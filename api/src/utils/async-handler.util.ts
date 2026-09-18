/**
 * Asynchronous Controller Wrapper (AsyncHandler)
 * 
 * Automatically wraps Express async route handlers and catches any rejected
 * promises or synchronous errors, forwarding them to the global error middleware via next(error).
 */

import { Request, Response, NextFunction } from 'express';

export type AsyncRequestHandler = (
  req: Request | any,
  res: Response,
  next: NextFunction
) => Promise<any>;

export const asyncHandler = (fn: AsyncRequestHandler) => {
  return (req: Request, res: Response, next: NextFunction) => {
    Promise.resolve(fn(req, res, next)).catch(next);
  };
};
