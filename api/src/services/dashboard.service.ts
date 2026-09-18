/**
 * Dashboard & Analytics Service
 * 
 * Aggregates analytical insights for recruiters including:
 * - Total queue metrics from BullMQ
 * - Top 5 skills from Redis Sorted Sets (ZREVRANGE)
 * - Experience distributions from Redis Hashes (HGETALL)
 * - Dynamic match score calculations against specific Job Roles
 */

import { prisma } from "../config/prisma";
import { ProcessingStatus, Resume, JobRole } from "@prisma/client";
import { calculateSingleMatchScore } from "./matching.service";
import { AppError } from "../utils/app-error";
import { HttpStatus } from "../constants/http-status";
import { redisClient } from "../utils/redis.util";

export interface SkillCount {
    skill: string;
    count: number;
}

export interface DashboardStatsResponse {
    totalJobs: Record<string, number>;
    topSkills: SkillCount[];
    expDistribution: Record<string, string>;
    jobRoles: JobRole[];
}

export interface MatchedResumeResult extends Resume {
    matchPercentage: number;
    matchingSkills: string[];
}

/**
 * Fetches high-level recruiter metrics and analytics from BullMQ, Redis, and MySQL.
 * 
 * @param {string} recruiterId - The unique ID of the recruiter requesting dashboard stats.
 * @returns {Promise<DashboardStatsResponse>} Aggregated metrics for ng2-charts visual display.
 */
export async function getDashboardStats(recruiterId: string): Promise<DashboardStatsResponse> {
    // Concurrently fetch queue counts, top skills, experience bucket counts, and active job roles
    const [stats, topSkillsRaw, expDistribution, jobRoles] = await Promise.all([
        redisClient.hgetall(`recruiter:${recruiterId}:stats`),
        redisClient.zrevrange(`analytics:skills:${recruiterId}`, 0, 4, 'WITHSCORES'),
        redisClient.hgetall(`analytics:exp_distribution:${recruiterId}`),
        prisma.jobRole.findMany({
            where: {
                recruiterId: recruiterId,
            },
            orderBy: { createdAt: 'desc' }
        })
    ]);

    // Parse Redis ZREVRANGE WITHSCORES array [skill1, score1, skill2, score2, ...] into structured objects
    const topSkills: SkillCount[] = [];
    for (let i = 0; i < topSkillsRaw.length; i += 2) {
        topSkills.push({
            skill: topSkillsRaw[i],
            count: parseInt(topSkillsRaw[i + 1], 10),
        });
    }
    const totalJobs = {
        queued: parseInt(stats.queued || '0', 10),
        processing: parseInt(stats.processing || '0', 10),
        completed: parseInt(stats.completed || '0', 10),
        failed: parseInt(stats.failed || '0', 10),
    };
    return {
        totalJobs,
        topSkills,
        expDistribution,
        jobRoles
    };
}

/**
 * Calculates on-demand candidate fit scores against a target job role and filters by minimum threshold.
 * 
 * @param {string} recruiterId - Recruiter requesting the ranked candidate list.
 * @param {string} jobRoleId - Database ID of the target Job Role.
 * @param {number} minMatchScore - Minimum fit percentage filter (0-100).
 * @returns {Promise<MatchedResumeResult[]>} List of matched candidates meeting or exceeding threshold.
 */
export async function getMatchScoreForJobRole(
    recruiterId: string,
    jobRoleId: string,
    minMatchScore: number
): Promise<MatchedResumeResult[]> {
    // 1. Fetch target Job Role details (required skills & minimum experience)
    const jobRole = await prisma.jobRole.findUnique({
        where: { id: jobRoleId },
    });

    if (!jobRole) {
        throw new AppError('Job role not found.', HttpStatus.NOT_FOUND);
    }

    const requiredSkills = Array.isArray(jobRole.requiredSkills)
        ? (jobRole.requiredSkills as string[])
        : [];

    // 2. Fetch all completed resumes uploaded by the current recruiter
    const resumes = await prisma.resume.findMany({
        where: {
            recruiterId,
            status: ProcessingStatus.COMPLETED
        },
    });

    if (!resumes || resumes.length === 0) {
        throw new AppError('No resumes found.', HttpStatus.NOT_FOUND);
    }

    // 3. Score each candidate dynamically against job requirements
    const resumeMatchScore: MatchedResumeResult[] = [];
    for (const resume of resumes) {
        const candidateSkills = Array.isArray(resume.skills) ? (resume.skills as string[]) : null;
        const matchScore = calculateSingleMatchScore(
            candidateSkills,
            resume.experienceYears,
            requiredSkills,
            jobRole.minExperience
        );

        // Filter by minMatchScore threshold
        if (matchScore.matchPercentage >= minMatchScore) {
            resumeMatchScore.push({ ...resume, ...matchScore });
        }
    }

    // Sort descending by match percentage (highest fit score first)
    resumeMatchScore.sort((a, b) => b.matchPercentage - a.matchPercentage);

    return resumeMatchScore;
}

