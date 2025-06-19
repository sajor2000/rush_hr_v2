import OpenAI from 'openai';
import { JobType } from '@/types';
import { getAzureOpenAIClient, isUsingAzure, AZURE_CONFIG } from './azureOpenAIClient';

let openai: OpenAI | null = null;

function getOpenAIClient(): OpenAI {
  if (isUsingAzure()) {
    return getAzureOpenAIClient() as any;
  }
  
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

const systemPrompt = `
You are an expert HR analyst. Your task is to classify a job description into one of three categories: 'entry-level', 'technical', or 'general'.

- 'entry-level': Jobs requiring minimal experience, often in manual labor, customer service, or administrative roles. Keywords: "no experience required", "training provided", "entry-level", "associate".
- 'technical': Jobs in fields like software engineering, data science, IT, or engineering that require specific technical skills, programming languages, or advanced degrees. Keywords: "Bachelor's/Master's/PhD in Computer Science", "experience with Python/Java/C++", "SQL", "machine learning", "cloud computing".
- 'general': Jobs that don't fit neatly into the other two categories, such as marketing, management, or other professional roles that are not strictly technical.

Respond with a single JSON object containing one key, "jobType", with the value being one of the three categories.
Example: {"jobType": "technical"}
`;

/**
 * Detects the job type from a job description using the OpenAI API.
 * @param jobDescription The full text of the job description.
 * @returns The detected JobType ('entry-level', 'technical', 'general').
 * @throws An error if the API call fails or the response is invalid.
 */
export async function detectJobType(jobDescription: string): Promise<JobType> {
  const client = getOpenAIClient(); // Ensures API key is checked and client is initialized

  try {
    const response = await client.chat.completions.create({
      model: isUsingAzure() ? AZURE_CONFIG.deploymentName : 'gpt-4o',
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
    });

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
