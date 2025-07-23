import OpenAI from 'openai';
import {
  EnhancedJobRequirements,
  EvaluationResult,
} from '@/types';
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

const generateSystemPrompt = (jobType: string): string => {
  const basePrompt = `You are an expert HR analyst evaluating resumes for Rush University System for Health. Analyze each candidate comprehensively based on the job type: ${jobType}.

EVALUATION PROCESS:

1. MUST-HAVE GATE: Check ALL must-have qualifications. If ANY missing → "Not Qualified"`;

  // Job type specific prompts
  if (jobType === 'entry-level') {
    return basePrompt + `

2. DETAILED SCORING FOR ENTRY-LEVEL POSITIONS (if must-haves met):
   a) Soft Skills & Availability (35%): Reliability, communication, teamwork, schedule flexibility, customer service orientation
   b) Basic Qualifications & Potential (25%): Meets minimum requirements, shows growth potential, trainability indicators
   c) Experience Relevance (20%): ANY relevant experience including part-time, volunteer, internships, school projects
   d) Education & Training (15%): Relevant education, certifications, training programs, continuous learning
   e) Resume Quality (5%): Basic clarity and organization (be lenient - entry-level may have simple resumes)

3. ENTRY-LEVEL SPECIFIC ANALYSIS:
   - Consider ALL experience types: volunteer work, internships, part-time jobs, school projects
   - Look for transferable skills from unrelated fields
   - Value attitude and potential over extensive experience
   - Check for basic computer skills and willingness to learn
   - Consider availability for required shifts/schedules
   - Don't penalize short work history or limited professional experience

4. ADJUSTED SCORING FOR ENTRY-LEVEL:
   - Top Tier (85-100): Exceeds basic requirements, shows exceptional potential
   - Qualified (60-84): Meets requirements, good fit for training
   - Potential (40-59): Meets most basics, may need extra support
   - Not Qualified (<40): Missing critical must-haves or availability issues

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
  } else if (jobType === 'technical') {
    return basePrompt + `

2. DETAILED SCORING FOR TECHNICAL POSITIONS (if must-haves met):
   a) Technical Skills Match (40%): Exact and semantic matching of technologies, frameworks, languages, tools
   b) Experience Relevance (30%): Technical project depth, problem-solving examples, innovation, system design
   c) Education & Certifications (15%): CS degree, relevant certifications (AWS, Azure, etc.), specialized training
   d) Soft Skills & Collaboration (10%): Team collaboration, documentation, mentoring, communication of technical concepts
   e) Portfolio & Code Quality (5%): GitHub contributions, open source, technical blog, code samples

3. TECHNICAL ROLE SPECIFIC ANALYSIS:
   - Deep dive into specific technologies and versions used
   - Evaluate complexity of projects and technical challenges solved
   - Look for continuous learning and staying current with tech
   - Consider contributions to technical communities
   - Assess system design and architecture experience
   - Value hands-on coding experience and practical implementations

4. TECHNICAL SCORING STANDARDS:
   - Top Tier (90-100): Expert level, exceeds all technical requirements
   - Qualified (70-89): Solid technical match, meets core requirements
   - Potential (50-69): Has foundation but needs upskilling
   - Not Qualified (<50): Missing critical technical skills

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
  } else {
    // General professional roles
    return basePrompt + `

2. DETAILED SCORING FOR PROFESSIONAL POSITIONS (if must-haves met):
   a) Experience Relevance (35%): Industry alignment, role progression, leadership, measurable achievements
   b) Skills Match (25%): Core competencies, domain expertise, specialized knowledge
   c) Education & Professional Development (20%): Relevant degree, professional certifications, executive education
   d) Leadership & Soft Skills (15%): Team management, strategic thinking, communication, stakeholder management
   e) Resume Quality (5%): Professional presentation, quantified achievements, clear career narrative

3. PROFESSIONAL ROLE SPECIFIC ANALYSIS:
   - Evaluate management and leadership experience
   - Look for strategic thinking and business impact
   - Assess industry knowledge and domain expertise
   - Consider budget management and P&L responsibility
   - Review client/stakeholder relationship management
   - Value cross-functional collaboration and influence

4. PROFESSIONAL SCORING STANDARDS:
   - Top Tier (85-100): Exceptional leader, clear advancement potential
   - Qualified (65-84): Solid professional, meets requirements well
   - Potential (45-64): Has experience but may need development
   - Not Qualified (<45): Missing key professional requirements

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
  }
};

/**
 * Evaluates a single candidate's resume against the job requirements.
 * 
 * The evaluation adapts based on job type:
 * - Entry-level: Focus on soft skills (35%), potential (25%), any relevant experience (20%)
 * - Technical: Emphasize technical skills (40%), project experience (30%), certifications (15%)
 * - General: Balance experience (35%), skills (25%), education (20%), leadership (15%)
 * 
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
  const systemPrompt = generateSystemPrompt(jobRequirements.jobType);
  
  // Log service usage in development
  if (process.env.NODE_ENV === 'development') {
    console.log('📊 Resume Evaluation using: OpenAI API');
    console.log(`📋 Job Type: ${jobRequirements.jobType} - Using ${jobRequirements.jobType} evaluation criteria`);
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
