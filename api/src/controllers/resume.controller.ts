import { Response } from 'express';
import { AuthenticatedRequest } from '../middleware/auth.middleware';
import { addSSEClient } from '../utils/sse.util';
import { uploadAndQueueResumes } from '../services/resume.service';
import { asyncHandler } from '../utils/async-handler.util';
import { AppError } from '../utils/app-error';
import { HttpStatus } from '../constants/http-status';
import { sendSuccess } from '../utils/response.util';

/**
 * Controller: Handles bulk resume upload
 * POST /api/resumes/upload (Protected)
 */
export const uploadResumes = asyncHandler(async (req: AuthenticatedRequest, res: Response) => {
  if (!req.user?.userId) {
    throw new AppError('Unauthorized. Please sign in.', HttpStatus.UNAUTHORIZED);
  }

  const batchId = req.body.batchId;
  if (!batchId) {
    throw new AppError('batchId is required.', HttpStatus.BAD_REQUEST);
  }

  const files = req.files as Express.Multer.File[];
  if (!files || files.length === 0) {
    throw new AppError('No resume files uploaded.', HttpStatus.BAD_REQUEST);
  }

  const result = await uploadAndQueueResumes(files, req.user.userId, batchId);

  return sendSuccess(
    res,
    result,
    result.message,
    HttpStatus.ACCEPTED,
    result
  );
});

/**
 * Controller: Connects to real-time Server-Sent Events stream for batch progress
 * GET /api/resumes/stream/:batchId (Protected)
 */
export const streamBatchProgress = asyncHandler(async (req: AuthenticatedRequest, res: Response) => {
  const batchId = req.params.batchId as string;
  if (!batchId) {
    throw new AppError('batchId is required.', HttpStatus.BAD_REQUEST);
  }

  addSSEClient(batchId, res);
});

