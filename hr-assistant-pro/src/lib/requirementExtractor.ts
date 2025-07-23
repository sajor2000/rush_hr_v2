import OpenAI from 'openai';
import { EnhancedJobRequirements, JobType } from '@/types';
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

/**
 * Extracts structured job requirements from a job description using a profile-based prompt.
 * @param jobDescription The full text of the job description.
 * @param jobType The detected type of the job ('entry-level', 'technical', 'general').
 * @returns A structured object containing the extracted job requirements.
 * @throws An error if the API call fails or the job type profile is not found.
 */
export async function extractJobRequirements(
  jobDescription: string,
  jobType: JobType
): Promise<EnhancedJobRequirements> {
  const client = getOpenAIClient(); // Ensures API key is checked and client is initialized
  const profile = jobTypeProfiles[jobType];
  if (!profile) {
    throw new Error(`No job type profile found for '${jobType}'`);
  }

  try {
    const response = await retryOpenAICall(
      () => client.chat.completions.create({
      model: 'gpt-4o',
      messages: [
        {
          role: 'system',
          content: profile.extractionPrompt,
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
      'extract job requirements'
    );

    const result = response.choices[0].message.content;
    if (!result) {
      throw new Error('OpenAI API returned an empty response while extracting requirements.');
    }

    const requirements = JSON.parse(result) as EnhancedJobRequirements;
    requirements.jobType = jobType; // Inject the job type for context

    return requirements;

  } catch (error) {
    console.error('Error extracting job requirements:', error);
    throw new Error('Failed to extract structured job requirements.');
  }
}
