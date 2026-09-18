/**
 * Dashboard & Candidate Insights Controller
 * 
 * Exposes REST endpoints for:
 * - High-level dashboard statistics (Redis counters, BullMQ queue status, active roles)
 * - Candidate matching & ranking against target job roles
 */

import { Response } from "express";
import { AuthenticatedRequest } from "../middleware/auth.middleware";
import { getDashboardStats, getMatchScoreForJobRole } from "../services/dashboard.service";
import { asyncHandler } from "../utils/async-handler.util";
import { AppError } from "../utils/app-error";
import { HttpStatus } from "../constants/http-status";
import { sendSuccess } from "../utils/response.util";

/**
 * Controller: Fetches recruiter metrics for dashboard charts
 * GET /api/dashboard/dashboardData (Protected)
 */
export const getDashboardData = asyncHandler(async (req: AuthenticatedRequest, res: Response) => {
    if (!req.user?.userId) {
        throw new AppError('Unauthorized. Please sign in.', HttpStatus.UNAUTHORIZED);
    }

    const stats = await getDashboardStats(req.user.userId);

    return sendSuccess(
        res,
        stats,
        'Dashboard stats fetched successfully',
        HttpStatus.OK,
        { data: stats }
    );
});

/**
 * Controller: Computes match scores for candidate resumes against a given Job Role
 * GET /api/dashboard/matchedResumes/:jobRoleId/:minMatchScore (Protected)
 */
export const getResumewithMatchScore = asyncHandler(async (req: AuthenticatedRequest, res: Response) => {
    if (!req.user?.userId) {
        throw new AppError('Unauthorized. Please sign in.', HttpStatus.UNAUTHORIZED);
    }

    const jobRoleId = req.params.jobRoleId as string;
    const minMatchScoreParam = req.params.minMatchScore as string;

    if (!jobRoleId || minMatchScoreParam === undefined) {
        throw new AppError('jobRoleId and minMatchScore are required.', HttpStatus.BAD_REQUEST);
    }

    const parsedMinMatchScore = parseInt(minMatchScoreParam, 10);
    if (isNaN(parsedMinMatchScore) || parsedMinMatchScore < 0 || parsedMinMatchScore > 100) {
        throw new AppError('minMatchScore must be a number between 0 and 100.', HttpStatus.BAD_REQUEST);
    }

    const resumeDetails = await getMatchScoreForJobRole(req.user.userId, jobRoleId, parsedMinMatchScore);

    return sendSuccess(
        res,
        resumeDetails,
        'Resumes matched successfully',
        HttpStatus.OK,
        { data: resumeDetails }
    );
});
