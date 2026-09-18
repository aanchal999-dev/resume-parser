import { Request, Response } from 'express';
import { AuthenticatedRequest } from '../middleware/auth.middleware';
import {
  registerRecruiter,
  loginRecruiter,
  getRecruiterProfile,
} from '../services/auth.service';
import { asyncHandler } from '../utils/async-handler.util';
import { AppError } from '../utils/app-error';
import { HttpStatus } from '../constants/http-status';
import { sendSuccess } from '../utils/response.util';

/**
 * Controller: Handles Recruiter Registration
 * POST /api/auth/register
 */
export const register = asyncHandler(async (req: Request, res: Response) => {
  const { name, email, password } = req.body;
  if (!name || !email || !password) {
    throw new AppError('Name, email, and password are required.', HttpStatus.BAD_REQUEST);
  }

  const authResult = await registerRecruiter(name, email, password);

  return sendSuccess(
    res,
    authResult,
    'User registered successfully',
    HttpStatus.CREATED,
    {
      token: authResult.token,
      user: authResult.user,
    }
  );
});

/**
 * Controller: Handles Recruiter Login
 * POST /api/auth/login
 */
export const login = asyncHandler(async (req: Request, res: Response) => {
  const { email, password } = req.body;
  if (!email || !password) {
    throw new AppError('Email and password are required.', HttpStatus.BAD_REQUEST);
  }

  const authResult = await loginRecruiter(email, password);

  return sendSuccess(
    res,
    authResult,
    'User logged in successfully',
    HttpStatus.OK,
    {
      token: authResult.token,
      user: authResult.user,
    }
  );
});

/**
 * Controller: Fetches Logged-In Recruiter Profile
 * GET /api/auth/me (Protected by authenticateToken)
 */
export const getProfile = asyncHandler(async (req: AuthenticatedRequest, res: Response) => {
  const userId = req.user?.userId;
  if (!userId) {
    throw new AppError('Unauthorized.', HttpStatus.UNAUTHORIZED);
  }

  const user = await getRecruiterProfile(userId);

  return sendSuccess(
    res,
    user,
    'User profile fetched successfully',
    HttpStatus.OK,
    { user }
  );
});

