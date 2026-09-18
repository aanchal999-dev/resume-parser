export interface ScoredCandidate {
  id: string;
  recruiterId: string;
  originalFilename: string;
  minioFileKey: string;
  candidateName: string | null;
  email: string | null;
  phone: string | null;
  location: string | null;
  skills: string[];
  experienceYears: number | null;
  education: string | null;
  status: string;
  createdAt: Date;
  matchPercentage: number;
  matchingSkills: string[];
}

export function calculateSingleMatchScore(
  candidateSkills: string[] | null,
  experienceYears: number | null,
  requiredSkills: string[],
  minExperience: number
): { matchPercentage: number; matchingSkills: string[] } {
  if (!requiredSkills || requiredSkills.length === 0) {
    return { matchPercentage: 0, matchingSkills: [] };
  }

  const normalizedCandidateSkills = (candidateSkills || []).map(s => s.trim().toLowerCase());
  const matchingSkills: string[] = [];

  requiredSkills.forEach(reqSkill => {
    const normalizedReq = reqSkill.trim().toLowerCase();
    if (normalizedCandidateSkills.includes(normalizedReq)) {
      matchingSkills.push(reqSkill);
    }
  });

  const skillScore = (matchingSkills.length / requiredSkills.length) * 100;

  let finalScore = skillScore;
  if (minExperience > 0 && experienceYears !== null) {
    if (experienceYears >= minExperience) {
      finalScore = Math.min(100, finalScore + 5);
    } else {
      finalScore = Math.max(0, finalScore - 10);
    }
  }

  const matchPercentage = Math.round(finalScore * 10) / 10;
  return { matchPercentage, matchingSkills };
}
