import OpenAI from 'openai';
import { JobType } from '@/types';
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

const systemPrompt = `Analyze this job description and classify it into the most appropriate category based on experience level and skill requirements:

CATEGORIES:
- entry-level: Jobs requiring 0-2 years experience, basic skills, trainable positions (e.g., environmental services, housekeeping, food service, customer service, admin assistant, data entry, retail, entry nursing, maintenance)
- technical: Jobs requiring programming, IT, engineering, or data science skills (e.g., software developer, data analyst, system admin, DevOps, IT analyst with technical tools)
- general: Professional roles requiring 3+ years experience but not primarily technical (e.g., project manager, HR specialist, marketing manager, senior nurse, business analyst)

IMPORTANT CLASSIFICATION RULES:
1. If the job requires "no experience" or "entry-level" or "will train" or "training provided" → classify as entry-level
2. Service/manual labor jobs (cleaning, food service, maintenance) with basic requirements → classify as entry-level
3. If education is "preferred" not "required" and experience is 0-2 years → classify as entry-level
4. If the job lists programming languages, frameworks, or technical tools as primary requirements → classify as technical
5. IT Business Analyst roles: If they require specific technical tools (ServiceNow, SQL, etc.) → technical; Otherwise → general
6. Healthcare roles: Entry nurses/techs → entry-level; Senior nurses/specialists → general
7. Consider the primary focus: Is it technical skills, professional experience, or learning on the job?
8. Look at experience requirements: 0-2 years → consider entry-level; 2-5 years with technical focus → technical; 3+ years professional → general

You must respond with valid JSON format. Output ONLY: {"jobType": "category"}`;

/**
 * Detects the job type from a job description using the OpenAI API.
 * @param jobDescription The full text of the job description.
 * @returns The detected JobType ('entry-level', 'technical', 'general').
 * @throws An error if the API call fails or the response is invalid.
 */
export async function detectJobType(jobDescription: string): Promise<JobType> {
  const client = getOpenAIClient(); // Ensures API key is checked and client is initialized

  try {
    const response = await retryOpenAICall(
      () => client.chat.completions.create({
      model: 'gpt-4o-mini', // Using mini model for job type detection (faster/cheaper)
      messages: [
        {
          role: 'system',
          content: systemPrompt,
        },
        {
          role: 'user',
          content: `Here is the job description:\n\n${jobDescription}`,
        },
      ],
      response_format: { type: 'json_object' },
      temperature: 0.2, // Low temperature for consistent, reliable HR evaluations
      top_p: 0.90, // Moderate-high top_p for natural language while maintaining focus
      max_tokens: 4096,
    }),
      'detect job type'
    );

    const result = response.choices[0].message.content;
    if (!result) {
      throw new Error('OpenAI API returned an empty response.');
    }

    const parsedResult = JSON.parse(result);
    const jobType = parsedResult.jobType;

    if (['entry-level', 'technical', 'general'].includes(jobType)) {
      return jobType as JobType;
    }

    throw new Error(`Invalid job type returned: ${jobType}`);
  } catch (error) {
    console.error('Error detecting job type:', error);
    throw new Error('Failed to detect job type from the description.');
  }
}
