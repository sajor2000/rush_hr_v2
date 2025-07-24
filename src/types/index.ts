// NOTE: These base types are inferred from the context of the provided evaluator code.

export interface JobRequirements {
  title: string;
  description: string;
  mustHave?: string[];
  niceToHave?: string[];
  education?: string[];
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

// Rubric evaluation for objective scoring
export interface RubricEvaluation {
  technicalSkills: {
    requiredTechsFound: string[];
    similarTechsFound: string[];
    yearsOfExperience: number;
    projectComplexity: 'none' | 'learning' | 'basic' | 'medium' | 'enterprise';
  };
  experience: {
    industryMatch: 'exact' | 'healthcare_related' | 'similar_regulated' | 'transferable' | 'unrelated';
    roleMatch: 'exact' | 'very_similar' | 'related' | 'some_overlap' | 'different';
    quantifiableAchievements: string[];
    careerProgression: 'clear_advancement' | 'steady_growth' | 'lateral_moves' | 'gaps_explained' | 'concerning_pattern';
  };
  education: {
    meetsRequirement: 'exceeds' | 'meets' | 'equivalent_experience' | 'related' | 'none';
    relevanceToRole: 'directly_relevant' | 'somewhat_relevant' | 'transferable_skills' | 'unrelated';
    certifications: string[];
  };
  softSkills: {
    communicationEvidence: 'extensive' | 'good' | 'some' | 'none';
    leadershipExperience: 'formal' | 'project' | 'team' | 'individual';
    culturalFitIndicators: string[];
    adaptabilityEvidence: 'highly_adaptable' | 'shows_flexibility' | 'some_evidence' | 'rigid_approach';
  };
  resumeQuality: {
    clarity: 'exceptional' | 'well_organized' | 'adequate' | 'needs_improvement' | 'poor';
    completeness: 'comprehensive' | 'mostly_complete' | 'adequate' | 'missing_key_info' | 'sparse';
  };
  bonusFactors: {
    transferableSkills: string[];
    preferredQualificationsMet: string[];
  };
}

// Score breakdown for transparency
export interface ScoreBreakdown {
  category: string;
  rawScore: number;
  maxPossible: number;
  weight: number;
  weightedScore: number;
  details: Array<{
    item: string;
    points: number;
    maxPoints: number;
    reason: string;
  }>;
}

export interface EvaluationResult {
  candidateId: string;
  candidateName: string;
  resumeText?: string; // Raw resume text for chat analysis
  rubricEvaluation?: RubricEvaluation; // New: Objective rubric data
  scoreBreakdown?: ScoreBreakdown[]; // New: Detailed score calculation
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
  tier: 'First Quartile' | 'Second Quartile' | 'Third Quartile' | 'Fourth Quartile';
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
  minimumRequirements: {
    education?: string;
    experience?: string;
    skills?: string[];
  };
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
