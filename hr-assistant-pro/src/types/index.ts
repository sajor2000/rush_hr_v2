// NOTE: These base types are inferred from the context of the provided evaluator code.

export interface JobRequirements {
  title: string;
  description: string;
  mustHave?: string[];
  niceToHave?: string[];
  education?: any;
}

export interface CandidateProfile {
  id: string;
  name: string;
  summary: string;
  experience: Experience[];
  education: Education[];
  skills: Skill[];
  certifications: string[];
}

export interface Experience {
  title: string;
  company: string;
  startDate: string;
  endDate: string | 'Present';
  description: string;
  technologies: string[];
}

export interface Education {
  school: string;
  degree: string;
  field: string;
  startDate: string;
  endDate: string;
}

export interface Skill {
  name: string;
  proficiency?: 'Beginner' | 'Intermediate' | 'Advanced' | 'Expert';
}

export interface EvaluationResult {
  candidateId: string;
  candidateName: string;
  scores: {
    overall: number;
    preferredQualifications: number; // Added for quartile sorting
    professionalism: number;
  };
  mustHavesMet: boolean;
  tier: 'Top Tier' | 'Qualified' | 'Potential' | 'Not Qualified';
  strengths: string[];
  gaps: string[];
  explanation: string;
  quartileTier?: string; 
  quartileRank?: number; 
  totalQualifiedForQuartile?: number; 
}

// --- New Types from Prompt ---

export type JobType = 'entry-level' | 'technical' | 'general';

export interface JobTypeProfile {
  type: JobType;
  extractionPrompt: string;
  scoringWeights: ScoringWeights;
  minimumRequirements: any;
  evaluationFocus: string[];
}

export interface ScoringWeights {
  // For entry-level
  availability?: number;
  physicalRequirements?: number;
  certifications?: number;
  location?: number;

  // For technical
  technicalSkills?: number;
  programmingLanguages?: number;
  frameworks?: number;
  projects?: number;

  // Common
  experience: number;
  education: number;
  softSkills?: number;
}

export interface BatchProgress {
  sessionId: string;
  total: number;
  processed: number;
  currentBatch: number;
  estimatedTimeRemaining: number;
  errors: Array<{
    candidateId: string;
    error: string;
  }>;
  startTime: Date;
}

export interface EnhancedJobRequirements extends JobRequirements {
  jobType: JobType;
  // Entry-level specific
  shifts?: string[];
  location?: {
    address: string;
    radius: number;
  };
  physicalRequirements?: string[];
  requiredCertifications?: string[];

  // Technical specific
  programmingLanguages?: string[];
  frameworks?: string[];
  tools?: string[];
  methodologies?: string[];
}

export interface EnhancedCandidateProfile extends CandidateProfile {
  // Entry-level specific
  availability?: {
    shifts: string[];
    startDate: string;
    fullTime: boolean;
  };
  location?: {
    address: string;
    willingToRelocate: boolean;
    commuteRadius: number;
  };
  physicalCapabilities?: string[];

  // Technical specific
  githubProfile?: string;
  portfolio?: string;
  projects?: Array<{
    name: string;
    description: string;
    technologies: string[];
    url?: string;
  }>;
  publications?: string[];
}
