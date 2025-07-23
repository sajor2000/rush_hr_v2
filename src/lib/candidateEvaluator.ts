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

SCORING STRUCTURE:
- Base Score (0-85 points): Meeting required qualifications
- Bonus Points (0-15 points): For preferred qualifications and exceptional soft skills
  * Up to 10 points for preferred qualifications (niceToHave)
  * Up to 5 points for demonstrated soft skills (leadership, teamwork, etc.)
- Total Score = Base Score + Bonus Points (max 100)

EVALUATION PROCESS:

1. MUST-HAVE GATE: Check ALL must-have qualifications. Note missing items but continue scoring
   - For technical requirements (e.g., ServiceNow SPM), look for exact matches or very similar tools
   - For experience requirements, ensure minimum years are met
   - For education, accept equivalent experience when stated (e.g., "or related experience")
   
2. PREFERRED QUALIFICATIONS CHECK: Award bonus points for each preferred qualification met
   - Each preferred qualification met: +2-3 points
   - Related but not exact match: +1 point
   - Maximum 10 bonus points for preferred qualifications
   
3. SOFT SKILLS ASSESSMENT: Award bonus points for demonstrated soft skills
   - Look for evidence of soft skills in work experience descriptions
   - Leadership roles, team coordination, stakeholder management = high value
   - Communication examples (presentations, documentation, training) = medium value
   - Maximum 5 bonus points for exceptional soft skills`;

  // Job type specific prompts
  if (jobType === 'entry-level') {
    return basePrompt + `

4. DETAILED SCORING FOR ENTRY-LEVEL POSITIONS:
   BASE SCORE (0-85):
   a) Soft Skills & Availability (30%): Reliability, communication, teamwork, schedule flexibility, customer service orientation
   b) Basic Qualifications & Potential (20%): Meets minimum requirements, shows growth potential, trainability indicators
   c) Experience Relevance (15%): ANY relevant experience including part-time, volunteer, internships, school projects
   d) Education & Training (15%): Relevant education, certifications, training programs, continuous learning
   e) Resume Quality (5%): Basic clarity and organization (be lenient - entry-level may have simple resumes)
   
   BONUS POINTS (0-15):
   - Preferred Qualifications (0-10): 
     * High school diploma/GED when not required: +3 points
     * Prior experience in similar role: +4 points
     * Bilingual abilities: +3 points
   - Exceptional Soft Skills (0-5): 
     * Demonstrated reliability (long tenure, perfect attendance): +2 points
     * Customer service excellence: +2 points
     * Team leadership or training others: +1 point

5. ENTRY-LEVEL SPECIFIC ANALYSIS:
   - Consider ALL experience types: volunteer work, internships, part-time jobs, school projects
   - Look for transferable skills from unrelated fields
   - Value attitude and potential over extensive experience
   - Check for basic computer skills and willingness to learn
   - Consider availability for required shifts/schedules
   - Don't penalize short work history or limited professional experience
   - Physical capabilities mentioned = positive indicator
   - Any customer service or team experience = valuable
   - Consistent employment history (even different fields) = reliability indicator

6. SCORING DISTRIBUTION FOR ENTRY-LEVEL (20-100 range with bonus):
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
    "resumeQuality": number,
    "baseScore": number,
    "bonusPoints": number
  },
  "mustHavesMet": boolean,
  "tier": "tier name",
  "strengths": ["top 3-5 standout qualities with evidence"],
  "gaps": ["specific gaps or growth areas"],
  "explanation": "Comprehensive 3-4 sentence summary with specific examples",
  "redFlags": ["concerns like gaps, job hopping, etc."],
  "hiringRecommendation": "Strongly recommend/Recommend/Consider/Pass with reasoning",
  "preferredQualificationsMet": ["list of nice-to-have qualifications this candidate has"],
  "softSkillsIdentified": ["list of soft skills demonstrated in resume"],
  "bonusReason": "Explanation of why bonus points were awarded"
}`;
  } else if (jobType === 'technical') {
    return basePrompt + `

4. DETAILED SCORING FOR TECHNICAL POSITIONS:
   BASE SCORE (0-85):
   a) Technical Skills Match (35%): Exact and semantic matching of technologies, frameworks, languages, tools
   b) Experience Relevance (25%): Technical project depth, problem-solving examples, innovation, system design
   c) Education & Certifications (15%): CS degree, relevant certifications (AWS, Azure, etc.), specialized training
   d) Soft Skills & Collaboration (8%): Team collaboration, documentation, mentoring, communication of technical concepts
   e) Portfolio & Code Quality (2%): GitHub contributions, open source, technical blog, code samples
   
   BONUS POINTS (0-15):
   - Preferred Technologies (0-10): Award 2-3 points per preferred technology/framework mastered
   - Leadership & Mentoring (0-5): Technical leadership, mentoring juniors, teaching, speaking at conferences

5. TECHNICAL ROLE SPECIFIC ANALYSIS:
   - Deep dive into specific technologies and versions used
   - Evaluate complexity of projects and technical challenges solved
   - Look for continuous learning and staying current with tech
   - Consider contributions to technical communities
   - Assess system design and architecture experience
   - Value hands-on coding experience and practical implementations

6. SCORING DISTRIBUTION FOR TECHNICAL (40-100 range with bonus):
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
    "resumeQuality": number,
    "baseScore": number,
    "bonusPoints": number
  },
  "mustHavesMet": boolean,
  "tier": "tier name",
  "strengths": ["top 3-5 standout qualities with evidence"],
  "gaps": ["specific gaps or growth areas"],
  "explanation": "Comprehensive 3-4 sentence summary with specific examples",
  "redFlags": ["concerns like gaps, job hopping, etc."],
  "hiringRecommendation": "Strongly recommend/Recommend/Consider/Pass with reasoning",
  "preferredQualificationsMet": ["list of nice-to-have qualifications this candidate has"],
  "softSkillsIdentified": ["list of soft skills demonstrated in resume"],
  "bonusReason": "Explanation of why bonus points were awarded"
}`;
  } else {
    // General professional roles
    return basePrompt + `

4. DETAILED SCORING FOR PROFESSIONAL POSITIONS:
   BASE SCORE (0-85):
   a) Experience Relevance (30%): Industry alignment, role progression, leadership, measurable achievements
   b) Skills Match (20%): Core competencies, domain expertise, specialized knowledge
   c) Education & Professional Development (20%): Relevant degree, professional certifications, executive education
   d) Leadership & Soft Skills (12%): Team management, strategic thinking, communication, stakeholder management
   e) Resume Quality (3%): Professional presentation, quantified achievements, clear career narrative
   
   BONUS POINTS (0-15):
   - Preferred Qualifications (0-10): Industry certifications, advanced degrees, specific expertise
   - Exceptional Leadership (0-5): C-level experience, board positions, published work, speaking engagements

5. PROFESSIONAL ROLE SPECIFIC ANALYSIS:
   - Evaluate management and leadership experience
   - Look for strategic thinking and business impact
   - Assess industry knowledge and domain expertise
   - Consider budget management and P&L responsibility
   - Review client/stakeholder relationship management
   - Value cross-functional collaboration and influence

6. SCORING DISTRIBUTION FOR GENERAL/PROFESSIONAL (30-100 range with bonus):
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
    "resumeQuality": number,
    "baseScore": number,
    "bonusPoints": number
  },
  "mustHavesMet": boolean,
  "tier": "tier name",
  "strengths": ["top 3-5 standout qualities with evidence"],
  "gaps": ["specific gaps or growth areas"],
  "explanation": "Comprehensive 3-4 sentence summary with specific examples",
  "redFlags": ["concerns like gaps, job hopping, etc."],
  "hiringRecommendation": "Strongly recommend/Recommend/Consider/Pass with reasoning",
  "preferredQualificationsMet": ["list of nice-to-have qualifications this candidate has"],
  "softSkillsIdentified": ["list of soft skills demonstrated in resume"],
  "bonusReason": "Explanation of why bonus points were awarded"
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
          content: `Please evaluate the following resume:\n\n**Resume File Name:** ${fileName}\n\n**Resume Text:**\n${resumeText}\n\n**Job Requirements:**\n${JSON.stringify(jobRequirements, null, 2)}\n\n**IMPORTANT BONUS POINT INSTRUCTIONS:**\n- Check if candidate meets any preferred qualifications (niceToHave)\n- Check if candidate demonstrates exceptional soft skills (${jobRequirements.softSkills?.join(', ') || 'leadership, teamwork, communication'})\n- Award bonus points accordingly (up to 15 total)\n- List which preferred qualifications they meet\n- List which soft skills they demonstrate`,
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
