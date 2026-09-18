import { JobRole } from './job-role.models';

export interface SkillCount {
  skill: string;
  count: number;
}

export interface TotalJobsCount {
  queued: number;
  processing: number;
  completed: number;
  failed: number;
}

export interface DashboardStats {
  totalJobs: TotalJobsCount;
  topSkills: SkillCount[];
  expDistribution: Record<string, string>;
  jobRoles: JobRole[];
}

export interface MatchedCandidate {
  id: string;
  recruiterId: string;
  originalFilename: string;
  minioFileKey: string;
  candidateName: string | null;
  email: string | null;
  phone: string | null;
  location: string | null;
  skills: string[] | null;
  experienceYears: number | null;
  education: string | null;
  status: string;
  createdAt: string;
  matchPercentage: number;
  matchingSkills: string[];
}
