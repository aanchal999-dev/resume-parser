export interface JobRole {
  id: string;
  title: string;
  requiredSkills: string[];
  minExperience: number;
  recruiterId?: string;
  createdAt: string;
}

export interface CreateJobRoleDto {
  title: string;
  requiredSkills: string[];
  minExperience: number;
}
