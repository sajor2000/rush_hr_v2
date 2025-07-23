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

const systemPrompt = `Classify this job into one of three categories:

entry-level: Minimal experience, manual labor, customer service, or admin roles
technical: IT, engineering, programming, data science requiring technical skills
general: All other professional roles (marketing, management, etc.)

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
