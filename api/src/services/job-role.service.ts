import { JobRole } from '@prisma/client';
import { prisma } from '../config/prisma';
import { AppError } from '../utils/app-error';
import { HttpStatus } from '../constants/http-status';

export interface CreateJobRoleDto {
  title: string;
  requiredSkills: string[];
  minExperience: number;
  recruiterId?: string;
}

/**
 * Creates a new Job Role in the database.
 */
export async function createJobRoleService(data: CreateJobRoleDto): Promise<JobRole> {
  const jobRole = await prisma.jobRole.create({
    data: {
      title: data.title.trim(),
      requiredSkills: data.requiredSkills,
      minExperience: data.minExperience,
      recruiterId: data.recruiterId,
    },
  });

  return jobRole;
}

/**
 * Retrieves all active job roles, optionally filtered by recruiter ID.
 */
export async function getAllJobRolesService(recruiterId?: string): Promise<JobRole[]> {
  const whereClause = recruiterId ? { recruiterId } : {};
  return await prisma.jobRole.findMany({
    where: whereClause,
    orderBy: { createdAt: 'desc' },
  });
}

/**
 * Deletes a job role after ensuring recruiter ownership.
 */
export async function deleteJobRoleService(id: string, recruiterId?: string): Promise<void> {
  const existingRole = await prisma.jobRole.findUnique({
    where: { id },
  });

  if (!existingRole) {
    throw new AppError('Job role not found.', HttpStatus.NOT_FOUND);
  }

  if (existingRole.recruiterId && recruiterId && existingRole.recruiterId !== recruiterId) {
    throw new AppError('You do not have permission to delete this job role.', HttpStatus.FORBIDDEN);
  }

  await prisma.jobRole.delete({
    where: { id },
  });
}

