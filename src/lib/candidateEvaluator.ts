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

CRITICAL INSTRUCTIONS:
- EXTRACT THE CANDIDATE'S FULL NAME from the resume (usually at the top)
- If no name found, use "Name Not Found" but NEVER leave blank
- CREATE SCORE DISTRIBUTION: Use the full scoring range to differentiate candidates
- Avoid clustering scores - spread them across the range for better quartile distribution

EVALUATION PROCESS:

1. MUST-HAVE GATE: Check ALL must-have qualifications. Note missing items but continue scoring`;

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

4. SCORING DISTRIBUTION FOR ENTRY-LEVEL (20-95 range):
   - Exceptional (85-95): Outstanding potential, exceeds all expectations
   - Strong (70-84): Very good fit, ready to excel with training
   - Good (55-69): Solid candidate, meets core requirements
   - Fair (40-54): Has potential but needs development
   - Weak (20-39): Significant gaps but could be considered

IMPORTANT: Differentiate scores! If evaluating multiple candidates:
- Best candidate: 85-95
- Second tier: 70-84
- Middle tier: 55-69
- Lower tier: 40-54
- Weakest: 20-39

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

4. SCORING DISTRIBUTION FOR TECHNICAL (40-100 range):
   - Expert (90-100): Exceeds all requirements, technical leader material
   - Senior (80-89): Strong match, can contribute immediately
   - Mid-level (70-79): Solid skills, meets most requirements
   - Junior (60-69): Good foundation, some gaps to fill
   - Entry (50-59): Basic skills present, significant training needed
   - Weak (40-49): Major skill gaps, risky hire

IMPORTANT: Create clear score separation between candidates!
- Best technical match: 90-100
- Strong candidates: 80-89
- Average candidates: 70-79
- Below average: 60-69
- Weakest viable: 40-59

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

4. SCORING DISTRIBUTION FOR GENERAL/PROFESSIONAL (30-95 range):
   - Executive (85-95): Exceptional leader, exceeds all requirements
   - Senior (75-84): Strong professional, ready for challenges
   - Experienced (65-74): Solid contributor, meets requirements well
   - Developing (55-64): Good experience, some growth needed
   - Entry Professional (45-54): Early career, high potential
   - Weak (30-44): Significant experience gaps

SCORING GUIDANCE: Ensure 10+ point gaps between tiers!
- Top performer: 85-95
- High performer: 75-84
- Solid performer: 65-74
- Average performer: 55-64
- Below average: 45-54
- Weakest: 30-44

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
      temperature: 0.1, // Very low temperature for consistent scoring and reduced clustering
      top_p: 0.85, // Reduced for more deterministic scoring distribution
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
    
    // Fallback name extraction if AI didn't find a name
    if (!evaluation.candidateName || evaluation.candidateName === 'full name' || evaluation.candidateName === 'Name Not Found') {
      // Try to extract name from the beginning of resume
      const namePatterns = [
        /^([A-Z][a-z]+ [A-Z][a-z]+)/m, // First Last
        /^([A-Z][a-z]+ [A-Z]\. [A-Z][a-z]+)/m, // First M. Last
        /^([A-Z][a-z]+ [A-Z][a-z]+ [A-Z][a-z]+)/m, // First Middle Last
        /Name:\s*([^\n]+)/i, // Name: field
        /^([A-Z][A-Z]+ [A-Z][A-Z]+)/m, // ALL CAPS names
      ];
      
      for (const pattern of namePatterns) {
        const match = resumeText.match(pattern);
        if (match && match[1]) {
          evaluation.candidateName = match[1].trim();
          break;
        }
      }
      
      // If still no name found, use filename without extension
      if (!evaluation.candidateName || evaluation.candidateName === 'full name' || evaluation.candidateName === 'Name Not Found') {
        evaluation.candidateName = fileName.replace(/\.[^/.]+$/, '').replace(/[_-]/g, ' ');
      }
    }

    return evaluation;

  } catch (error) {
    console.error(`Error evaluating candidate ${fileName}:`, error);
    // Re-throw the error to be caught by the calling stream handler
    throw new Error(`Failed to evaluate candidate ${fileName}. Reason: ${error instanceof Error ? error.message : 'Unknown'}`);
  }
}
