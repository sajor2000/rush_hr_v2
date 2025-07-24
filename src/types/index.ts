// NOTE: These base types are inferred from the context of the provided evaluator code.

export interface JobRequirements {
  title: string;
  description: string;
  mustHave?: string[];
  niceToHave?: string[];
  education?: any;
  softSkills?: string[]; // New field for extracted soft skills
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
  resumeText?: string; // Raw resume text for chat analysis
  scores: {
    overall: number;
    preferredQualifications?: number; // Legacy field for backward compatibility
    professionalism?: number; // Legacy field for backward compatibility
    technicalSkills: number;
    experienceRelevance: number;
    educationCertifications: number;
    softSkillsCulture: number;
    resumeQuality: number;
    baseScore?: number; // Base score (0-85) before bonus points
    bonusPoints?: number; // Bonus points (0-15) for preferred qualifications and soft skills
  };
  mustHavesMet: boolean;
  tier: 'Top Tier' | 'Qualified' | 'Potential' | 'Not Qualified';
  strengths: string[];
  gaps: string[];
  explanation: string;
  redFlags?: string[];
  hiringRecommendation?: string;
  quartileTier?: string; 
  quartileRank?: number; 
  totalQualifiedForQuartile?: number;
  // New fields for bonus tracking
  preferredQualificationsMet?: string[]; // List of preferred qualifications the candidate has
  softSkillsIdentified?: string[]; // List of soft skills demonstrated
  bonusReason?: string; // Explanation of why bonus points were awarded
  transferableSkills?: string[]; // List of transferable skills identified and how they relate
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
