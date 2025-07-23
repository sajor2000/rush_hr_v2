import OpenAI from 'openai';
import {
  EnhancedJobRequirements,
  EnhancedCandidateProfile,
  EvaluationResult,
  JobTypeProfile,
} from '@/types';
import { jobTypeProfiles } from './jobTypeProfiles';
import { retryOpenAICall } from './retryUtils';

let openai: OpenAI | null = null;

function getOpenAIClient(): OpenAI {
  if (!process.env.OPENAI_API_KEY) {
    throw new Error('OPENAI_API_KEY is not set or empty in the environment.');
  }
  if (!openai) {
    openai = new OpenAI({
      apiKey: process.env.OPENAI_API_KEY,
    });
  }
  return openai;
}

const generateSystemPrompt = (): string => {
  return `You are an expert HR analyst evaluating resumes for Rush University System for Health. Analyze each candidate comprehensively.

EVALUATION PROCESS:

1. MUST-HAVE GATE: Check ALL must-have qualifications. If ANY missing → "Not Qualified" (score <40)

2. DETAILED SCORING (if must-haves met):
   a) Technical Skills Match (40%): Exact and semantic matching (e.g., Python = Python programming)
   b) Experience Relevance (30%): Industry alignment, role progression, achievement impact
   c) Education & Certifications (15%): Degree relevance, certifications, continuous learning
   d) Soft Skills & Culture Fit (10%): Leadership, teamwork, communication evidence
   e) Resume Quality (5%): Structure, clarity, quantified achievements

3. ADVANCED ANALYSIS:
   - Career progression patterns (promotions, increasing responsibilities)
   - Industry-specific keywords and technologies
   - Quantified achievements (percentages, dollar amounts, team sizes)
   - Employment gaps or job hopping patterns
   - Hidden strengths not explicitly in requirements

4. SCORING INTELLIGENCE:
   - Top Tier (90-100): Exceeds requirements, standout candidate
   - Qualified (70-89): Solid match, meets most preferences
   - Potential (40-69): Meets basics, development needed
   - Not Qualified (<40): Missing must-haves or poor fit

OUTPUT JSON:
{
  "candidateId": "filename",
  "candidateName": "full name",
  "scores": {
    "overall": number,
    "technicalSkills": number,
    "experienceRelevance": number,
    "educationCertifications": number,
    "softSkillsCulture": number,
    "resumeQuality": number
  },
  "mustHavesMet": boolean,
  "tier": "tier name",
  "strengths": ["top 3-5 standout qualities with evidence"],
  "gaps": ["specific gaps or growth areas"],
  "explanation": "Comprehensive 3-4 sentence summary with specific examples",
  "redFlags": ["concerns like gaps, job hopping, etc."],
  "hiringRecommendation": "Strongly recommend/Recommend/Consider/Pass with reasoning"
}`;
};

/**
 * Evaluates a single candidate's resume against the job requirements.
 * @param resumeText The full text of the candidate's resume.
 * @param fileName The original file name of the resume, used as a candidate ID.
 * @param jobRequirements The structured requirements for the job.
 * @returns A detailed evaluation result for the candidate.
 */
export async function evaluateCandidate(
  resumeText: string,
  fileName: string,
  jobRequirements: EnhancedJobRequirements
): Promise<EvaluationResult> {
  const client = getOpenAIClient(); // Ensures API key is checked and client is initialized
  const systemPrompt = generateSystemPrompt();
  
  // Log service usage in development
  if (process.env.NODE_ENV === 'development') {
    console.log('📊 Resume Evaluation using: OpenAI API');
  }

  try {
    const response = await retryOpenAICall(
      () => client.chat.completions.create({
      model: 'gpt-4o',
      messages: [
        { role: 'system', content: systemPrompt },
        {
          role: 'user',
          content: `Please evaluate the following resume:\n\n**Resume File Name:** ${fileName}\n\n**Resume Text:**\n${resumeText}\n\n**Job Requirements:**\n${JSON.stringify(jobRequirements, null, 2)}`,
        },
      ],
      response_format: { type: 'json_object' },
      temperature: 0.2, // Low temperature for consistent, reliable HR evaluations
      top_p: 0.90, // Moderate-high top_p for natural language while maintaining focus
      max_tokens: 4096,
    }),
      `evaluate candidate ${fileName}`
    );

    const result = response.choices[0].message.content;
    if (!result) {
      throw new Error('OpenAI API returned an empty evaluation response.');
    }

    const evaluation = JSON.parse(result) as EvaluationResult;
    // Ensure the candidateId is set to the file name for tracking
    evaluation.candidateId = fileName;
    // Include the resume text for chat analysis
    evaluation.resumeText = resumeText;

    return evaluation;

  } catch (error) {
    console.error(`Error evaluating candidate ${fileName}:`, error);
    // Re-throw the error to be caught by the calling stream handler
    throw new Error(`Failed to evaluate candidate ${fileName}. Reason: ${error instanceof Error ? error.message : 'Unknown'}`);
  }
}
