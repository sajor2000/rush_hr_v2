import OpenAI from 'openai';
import {
  EnhancedJobRequirements,
  EnhancedCandidateProfile,
  EvaluationResult,
  JobTypeProfile,
} from '@/types';
import { jobTypeProfiles } from './jobTypeProfiles';

// Initialize OpenAI client
const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY,
});

const generateSystemPrompt = (): string => {
  return `
    You are a world-class HR analyst AI, specifically trained to follow the Rush University System for Health hiring methodology. Your task is to evaluate a candidate's resume against a specific set of job requirements with a strict, multi-tiered approach.

    **Evaluation Process:**

    **Step 1: Must-Have Qualifications (Non-Negotiable Gate)**
    - First, you MUST verify if the candidate meets ALL of the "must-have" qualifications listed in the job requirements.
    - If the candidate fails to meet even ONE of these qualifications, they are not a viable candidate. You must assign them to the 'Not Qualified' tier, give them an overall score under 40, and clearly state which must-have requirement was not met in the 'gaps' section. Set 'meetsMinimum' to false.
    - If they meet all must-haves, proceed to Step 2.

    **Step 2: Preferred Qualifications & Resume Professionalism (Weighted Scoring)**
    For candidates who pass Step 1, you will calculate a final score based on two weighted factors:
    
    1.  **Preferred Qualifications Alignment (85% of score):**
        - Score the candidate based on how well their experience aligns with the "preferred" qualifications.
        - Assess the depth and relevance of their skills and experience for each preferred item.
        - A strong match in many areas should result in a high score for this component.

    2.  **Resume Professionalism (15% of score):**
        - Assess the resume itself for clarity, organization, and professionalism.
        - Consider factors like: Is it well-structured? Are there spelling or grammatical errors? Is the information presented logically and concisely?
        - A polished, professional resume gets a higher score for this component.

    **Scoring and Tiering:**
    - **Overall Score:** A weighted average based on Preferred Qualifications (85%) and Resume Professionalism (15%). This score is only for candidates who pass the must-have gate.
    - **Tiers (based on Overall Score):**
        - **Top Tier:** 90-100
        - **Qualified:** 70-89
        - **Potential:** 40-69
        - **Not Qualified:** < 40 (This tier is also for anyone who fails the must-have gate).

    **Output Format:**
    You MUST respond with a single, valid JSON object that conforms to the EvaluationResult interface. Do not include any text or markdown outside of the JSON object.
    Example structure:
    {
      "candidateId": "resume_file_name.pdf",
      "candidateName": "Jane Doe",
      "scores": { "overall": 85, "preferredQualifications": 90, "resumeProfessionalism": 70 },
      "meetsMinimum": true,
      "percentile": 0,
      "tier": "Qualified",
      "strengths": ["List of strengths based on preferred qualifications"],
      "gaps": ["List of gaps based on preferred qualifications OR the unmet must-have requirement"],
      "explanation": "A concise explanation for your reasoning, referencing the scoring methodology."
    }
  `;
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
  if (!process.env.OPENAI_API_KEY) {
    throw new Error('OPENAI_API_KEY is not set.');
  }

  const systemPrompt = generateSystemPrompt();

  try {
    const response = await openai.chat.completions.create({
      model: 'gpt-4o',
      messages: [
        { role: 'system', content: systemPrompt },
        {
          role: 'user',
          content: `Please evaluate the following resume:\n\n**Resume File Name:** ${fileName}\n\n**Resume Text:**\n${resumeText}\n\n**Job Requirements:**\n${JSON.stringify(jobRequirements, null, 2)}`,
        },
      ],
      response_format: { type: 'json_object' },
      temperature: 0.1,
    });

    const result = response.choices[0].message.content;
    if (!result) {
      throw new Error('OpenAI API returned an empty evaluation response.');
    }

    const evaluation = JSON.parse(result) as EvaluationResult;
    // Ensure the candidateId is set to the file name for tracking
    evaluation.candidateId = fileName;

    return evaluation;

  } catch (error) {
    console.error(`Error evaluating candidate ${fileName}:`, error);
    // Re-throw the error to be caught by the calling stream handler
    throw new Error(`Failed to evaluate candidate ${fileName}. Reason: ${error instanceof Error ? error.message : 'Unknown'}`);
  }
}
