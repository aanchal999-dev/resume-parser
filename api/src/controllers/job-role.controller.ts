import { Response } from 'express';
import { AuthenticatedRequest } from '../middleware/auth.middleware';
import {
  createJobRoleService,
  getAllJobRolesService,
  deleteJobRoleService,
} from '../services/job-role.service';
import { asyncHandler } from '../utils/async-handler.util';
import { AppError } from '../utils/app-error';
import { HttpStatus } from '../constants/http-status';
import { sendSuccess } from '../utils/response.util';

/**
 * Controller: Creates a new Job Role
 * POST /api/job-roles (Protected)
 */
export const createJobRole = asyncHandler(async (req: AuthenticatedRequest, res: Response) => {
  const { title, requiredSkills, minExperience } = req.body;

  if (!title || typeof title !== 'string' || title.trim() === '') {
    throw new AppError('Job title is required.', HttpStatus.BAD_REQUEST);
  }

  if (!Array.isArray(requiredSkills) || requiredSkills.length === 0) {
    throw new AppError('requiredSkills must be a non-empty array.', HttpStatus.BAD_REQUEST);
  }

  const parsedMinExp = typeof minExperience === 'number' ? minExperience : 0;
  if (parsedMinExp < 0) {
    throw new AppError('minExperience must be a non-negative number.', HttpStatus.BAD_REQUEST);
  }

  const jobRole = await createJobRoleService({
    title,
    requiredSkills,
    minExperience: parsedMinExp,
    recruiterId: req.user?.userId,
  });

  return sendSuccess(
    res,
    jobRole,
    'Job role created successfully',
    HttpStatus.CREATED,
    { jobRole }
  );
});

/**
 * Controller: Fetches all active Job Roles
 * GET /api/job-roles (Protected)
 */
export const getAllJobRoles = asyncHandler(async (req: AuthenticatedRequest, res: Response) => {
  const jobRoles = await getAllJobRolesService(req.user?.userId);

  return sendSuccess(
    res,
    jobRoles,
    'Job roles fetched successfully',
    HttpStatus.OK,
    { jobRoles }
  );
});

/**
 * Controller: Deletes a Job Role by ID
 * DELETE /api/job-roles/:id (Protected)
 */
export const deleteJobRole = asyncHandler(async (req: AuthenticatedRequest, res: Response) => {
  const { id } = req.params as { id: string };
  if (!id) {
    throw new AppError('Job role ID is required.', HttpStatus.BAD_REQUEST);
  }

  await deleteJobRoleService(id, req.user?.userId);

  return sendSuccess(
    res,
    null,
    'Job role deleted successfully',
    HttpStatus.OK
  );
});