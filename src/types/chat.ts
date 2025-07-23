// src/types/chat.ts
export interface ChatMessage {
  id: string;
  text: string;
  sender: 'user' | 'assistant';
  timestamp: Date;
  intent?: ChatIntent;
  confidence?: number;
  sources?: string[];
}

export interface ChatRequest {
  query: string;
  candidateId?: string;
  resumeText?: string;
  evaluationResult?: any; // TODO: Import proper EvaluationResult type
  jobDescription?: string;
  mustHaveAttributes?: string;
  sessionId?: string;
  jobType?: string; // entry-level, technical, or general
}

export interface ChatResponse {
  response: string;
  intent: ChatIntent;
  confidence: number;
  sources: string[];
  suggestions?: string[];
  error?: string;
}

export type ChatIntent = 
  | 'resume_detail_inquiry'      // "Did they mention AWS?"
  | 'evaluation_challenge'       // "Why weren't they qualified?"
  | 'candidate_comparison'       // "Who's stronger in research?"
  | 'ambiguity_check'           // "Is that gap justified?"
  | 'skill_verification'        // "Where do they show leadership?"
  | 'experience_analysis'       // "How many years of experience?"
  | 'ranking_explanation'        // "What does Q2 mean?" or "How are quartiles calculated?"
  | 'scoring_rationale'          // "Why did they score 65?" or "Explain the scoring"
  | 'unknown';

export interface ChatContext {
  candidateName?: string;
  candidateId?: string;
  resumeText?: string;
  evaluationResult?: any;
  jobDescription?: string;
  mustHaveAttributes?: string;
  jobRequirements?: any;
  quartileTier?: string; // Q1-Q4 ranking
  quartileRank?: number; // Rank within all candidates
  totalCandidates?: number; // Total candidates evaluated
  jobType?: string; // entry-level, technical, or general
}

export interface ChatSession {
  id: string;
  messages: ChatMessage[];
  context: ChatContext;
  createdAt: Date;
  updatedAt: Date;
}

export interface IntentClassificationResult {
  intent: ChatIntent;
  confidence: number;
  entities: Record<string, string>;
}

export interface EvidenceSource {
  type: 'resume' | 'evaluation' | 'job_description';
  content: string;
  relevanceScore: number;
  location?: string; // section or line reference
}
