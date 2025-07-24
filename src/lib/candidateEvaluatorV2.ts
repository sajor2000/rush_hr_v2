import OpenAI from 'openai';
import {
  EnhancedJobRequirements,
  EvaluationResult,
  RubricEvaluation,
  ScoreBreakdown,
} from '@/types';
import { retryOpenAICall } from './retryUtils';
import { calculateScores, determineTier } from './scoreCalculator';
import { logger } from './logger';

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

// Generate the rubric extraction prompt
// Generate job-specific transferable skills based on job requirements
const generateJobSpecificTransferableSkills = (jobRequirements: EnhancedJobRequirements): string => {
  const jobTitle = jobRequirements.title?.toLowerCase() || '';
  const jobDescription = jobRequirements.description?.toLowerCase() || '';
  const skills: string[] = [];

  // Healthcare/Hospital specific
  if (jobTitle.includes('hospital') || jobTitle.includes('health') || jobTitle.includes('clinical') || 
      jobDescription.includes('patient') || jobDescription.includes('medical')) {
    skills.push(
      '- House cleaning/Janitorial → Understanding of sanitation protocols critical for hospital environments',
      '- Food service → Experience with health department regulations and hygiene standards',
      '- Childcare → Patient care skills, especially for pediatric units',
      '- Eldercare → Experience with vulnerable populations, patience, and compassion',
      '- Veterinary experience → Medical environment familiarity, handling biological materials'
    );
  }

  // Customer service roles
  if (jobTitle.includes('coordinator') || jobTitle.includes('assistant') || jobTitle.includes('service') ||
      jobDescription.includes('customer') || jobDescription.includes('client')) {
    skills.push(
      '- Retail experience → Direct customer interaction and conflict resolution',
      '- Call center → Phone etiquette and handling difficult conversations',
      '- Hospitality → Service excellence and attention to detail',
      '- Banking/Finance → Accuracy with sensitive information and regulatory compliance'
    );
  }

  // Technical roles
  if (jobTitle.includes('developer') || jobTitle.includes('engineer') || jobTitle.includes('analyst') ||
      jobDescription.includes('programming') || jobDescription.includes('technical')) {
    skills.push(
      '- Gaming/Modding → Problem-solving and debugging skills',
      '- Data entry → Attention to detail and systematic approach',
      '- Excel power user → Data manipulation and analytical thinking',
      '- Technical writing → Documentation skills crucial for code maintenance'
    );
  }

  // Administrative roles
  if (jobTitle.includes('admin') || jobTitle.includes('office') || jobTitle.includes('coordinator')) {
    skills.push(
      '- Event planning → Project management and vendor coordination',
      '- Teaching → Training and documentation creation abilities',
      '- Small business experience → Wearing multiple hats and prioritization',
      '- Military → Following procedures and maintaining accurate records'
    );
  }

  // Physical/Manual roles
  if (jobDescription.includes('physical') || jobDescription.includes('lifting') || jobDescription.includes('standing')) {
    skills.push(
      '- Warehouse work → Experience with safety protocols and equipment',
      '- Construction → Understanding of safety regulations and teamwork',
      '- Delivery driver → Time management and route optimization',
      '- Manufacturing → Quality control and process improvement'
    );
  }

  // If no specific skills identified, return general transferable skills
  if (skills.length === 0) {
    skills.push(
      '- Any customer-facing role → Communication and interpersonal skills',
      '- Any team environment → Collaboration and conflict resolution',
      '- Any deadline-driven role → Time management and prioritization',
      '- Any regulated industry → Attention to compliance and documentation'
    );
  }

  return skills.join('\n');
};

const generateRubricExtractionPrompt = (jobType: string, jobRequirements: EnhancedJobRequirements): string => {
  // Build job-specific context
  const requiredSkills = jobRequirements.mustHave?.join(', ') || 'Not specified';
  const preferredSkills = jobRequirements.niceToHave?.join(', ') || 'Not specified';
  const jobTitle = jobRequirements.title || 'Position';
  
  const basePrompt = [
    `You are an expert HR analyst extracting FACTUAL information from resumes for objective evaluation.`,
    ``,
    `JOB CONTEXT:`,
    `- Job Title: ${jobTitle}`,
    `- Job Type: ${jobType}`,
    `- Required Qualifications: ${requiredSkills}`,
    `- Preferred Qualifications: ${preferredSkills}`,
    ``,
    `CRITICAL INSTRUCTIONS:`,
    `- Extract ONLY factual information that can be verified from the resume`,
    `- DO NOT generate scores or make subjective judgments`,
    `- Extract the candidate's FULL NAME from the resume`,
    `- Be VERY INCLUSIVE in recognizing transferable skills`,
    `- Consider HOW skills from different contexts apply to THIS specific role`,
    ``,
    `EXTRACT THE FOLLOWING INFORMATION:`,
    ``,
    `1. REQUIRED QUALIFICATIONS MATCHING:`,
    `   For EACH required qualification listed above, be VERY INCLUSIVE:`,
    `   - Mark if found EXACTLY in resume (yes/no)`,
    `   - If not exact, note ANY SIMILAR/EQUIVALENT experience that could qualify`,
    `   - Consider PARTIAL matches (e.g., "3 years experience" when requirement is "5 years")`,
    `   - Note the CONTEXT where this qualification appears`,
    `   - For experience requirements:`,
    `     * Calculate TOTAL years across ALL relevant positions`,
    `     * Include internships, part-time, and contract work`,
    `     * Consider adjacent field experience (e.g., nursing experience for medical assistant role)`,
    ``,
    `2. TECHNICAL SKILLS:`,
    `   - List all technologies/tools that match the required skills EXACTLY`,
    `   - List related/similar technologies with explanation of similarity`,
    `   - Count total years of relevant technical experience`,
    `   - Assess project complexity based on descriptions:`,
    `     * "enterprise" = large-scale, production systems, high impact`,
    `     * "medium" = professional projects, team collaboration`,
    `     * "basic" = simple applications, personal projects`,
    `     * "learning" = tutorials, coursework only`,
    `     * "none" = no projects mentioned`,
    ``,
    `2. EXPERIENCE:`,
    `   - Industry match:`,
    `     * "exact" = same industry as job posting`,
    `     * "healthcare_related" = any healthcare setting`,
    `     * "similar_regulated" = other regulated industries (finance, government)`,
    `     * "transferable" = relevant skills from different industry`,
    `     * "unrelated" = no clear connection`,
    `   - Role match:`,
    `     * "exact" = same job title or very similar`,
    `     * "very_similar" = closely related role`,
    `     * "related" = same field but different focus`,
    `     * "some_overlap" = some common responsibilities`,
    `     * "different" = unrelated role`,
    `   - List quantifiable achievements (with numbers/percentages)`,
    `   - Career progression:`,
    `     * "clear_advancement" = promotions, increasing responsibility`,
    `     * "steady_growth" = consistent employment, lateral growth`,
    `     * "lateral_moves" = multiple similar positions`,
    `     * "gaps_explained" = employment gaps with explanations`,
    `     * "concerning_pattern" = unexplained gaps, job hopping`,
    ``,
    `3. EDUCATION:`,
    `   - Requirement match:`,
    `     * "exceeds" = higher degree than required`,
    `     * "meets" = exact degree match`,
    `     * "equivalent_experience" = no degree but relevant experience`,
    `     * "related" = different but related field`,
    `     * "none" = no relevant education`,
    `   - Relevance: "directly_relevant", "somewhat_relevant", "transferable_skills", "unrelated"`,
    `   - List all professional certifications`,
    ``,
    `4. SOFT SKILLS (Extract evidence, not just labels):`,
    `   - Communication evidence:`,
    `     * Look for: presentations, training others, customer interaction, writing samples`,
    `     * Rate: "extensive" (multiple examples), "good" (clear examples), "some" (mentioned), "none"`,
    `   - Leadership experience:`,
    `     * "formal" = titled positions (manager, lead, supervisor)`,
    `     * "project" = led specific projects or initiatives`,
    `     * "team" = collaborative leadership, mentoring`,
    `     * "individual" = no leadership evidence`,
    `   - Cultural fit indicators - Extract SPECIFIC examples of:`,
    `     * Values alignment (e.g., "patient-focused", "quality-driven", "collaborative")`,
    `     * Work style (e.g., "detail-oriented", "fast-paced", "methodical")`,
    `     * Team dynamics (e.g., "cross-functional collaboration", "independent worker")`,
    `   - Adaptability evidence:`,
    `     * "highly_adaptable" = career pivots, diverse roles, learns new skills`,
    `     * "shows_flexibility" = handles change, multiple responsibilities`,
    `     * "some_evidence" = minor examples of adaptation`,
    `     * "rigid_approach" = no evidence of flexibility`,
    `   - Problem-solving examples: List specific instances where candidate solved problems`,
    `   - Emotional intelligence: Evidence of empathy, self-awareness, relationship management`,
    ``,
    `5. RESUME QUALITY:`,
    `   - Clarity: "exceptional", "well_organized", "adequate", "needs_improvement", "poor"`,
    `   - Completeness: "comprehensive", "mostly_complete", "adequate", "missing_key_info", "sparse"`,
    ``,
    `6. BONUS FACTORS:`,
    `   - List ALL transferable skills with explanations (e.g., "Customer service in retail → Patient interaction")`,
    `   - List which preferred qualifications are met`,
    `   - For each transferable skill, explain HOW it applies to ${jobTitle}`,
    ``,
    `COMPREHENSIVE TRANSFERABLE SKILLS MAPPING:`,
    ``,
    `For Healthcare/Hospital Roles:`,
    `- House cleaning/Janitorial → Hospital environmental services, infection control awareness`,
    `- Retail/Customer Service → Patient interaction, handling difficult situations`,
    `- Food Service → Fast-paced environment, hygiene standards, customer care`,
    `- Hospitality → Patient comfort, service orientation, attention to detail`,
    `- Military → Following strict protocols, chain of command, discipline, reliability`,
    `- Childcare/Eldercare → Patient care skills, empathy, safety awareness`,
    `- Manufacturing → Quality control, safety procedures, equipment operation`,
    ``,
    `For Technical Roles:`,
    `- Self-taught projects → Initiative, learning ability, practical application`,
    `- Different programming languages → Ability to learn new technologies`,
    `- IT support → Problem-solving, user communication, technical troubleshooting`,
    `- Data entry → Attention to detail, accuracy, computer skills`,
    `- Gaming/Modding → Problem-solving, technical skills, community collaboration`,
    ``,
    `For Administrative/Professional Roles:`,
    `- Volunteer coordination → Project management, stakeholder communication`,
    `- Small business owner → Multi-tasking, budget management, customer relations`,
    `- Teaching/Training → Communication, presentation, mentoring abilities`,
    `- Sales → Negotiation, relationship building, goal achievement`,
    `- Event planning → Organization, deadline management, vendor coordination`,
    ``,
    `Universal Transferable Skills:`,
    `- Team sports → Teamwork, communication, working under pressure`,
    `- Leadership in ANY context → Management potential`,
    `- Multi-language skills → Communication, cultural awareness`,
    `- Academic projects → Research, analysis, presentation skills`,
    `- Crisis/emergency experience → Calm under pressure, quick decision-making`,
    ``,
    `IMPORTANT: For ${jobTitle}, particularly look for:`,
    `${generateJobSpecificTransferableSkills(jobRequirements)}`,
    ``,
    `OUTPUT FORMAT:`,
    `Return a JSON object with the exact structure shown below. Fill in ALL fields based on the resume.`
  ].join('\n');

  return basePrompt;
};

// Generate the output format specification
const generateOutputFormat = (): string => {
  return `
{
  "candidateId": "filename",
  "candidateName": "extracted full name",
  "rubricEvaluation": {
    "technicalSkills": {
      "requiredTechsFound": ["list of exact matches"],
      "similarTechsFound": ["list of similar/related technologies"],
      "yearsOfExperience": number,
      "projectComplexity": "none|learning|basic|medium|enterprise"
    },
    "experience": {
      "industryMatch": "exact|healthcare_related|similar_regulated|transferable|unrelated",
      "roleMatch": "exact|very_similar|related|some_overlap|different",
      "quantifiableAchievements": ["list achievements with numbers"],
      "careerProgression": "clear_advancement|steady_growth|lateral_moves|gaps_explained|concerning_pattern"
    },
    "education": {
      "meetsRequirement": "exceeds|meets|equivalent_experience|related|none",
      "relevanceToRole": "directly_relevant|somewhat_relevant|transferable_skills|unrelated",
      "certifications": ["list of certifications"]
    },
    "softSkills": {
      "communicationEvidence": "extensive|good|some|none",
      "communicationExamples": ["specific examples of communication skills"],
      "leadershipExperience": "formal|project|team|individual",
      "leadershipExamples": ["specific leadership instances"],
      "culturalFitIndicators": ["specific indicators found"],
      "adaptabilityEvidence": "highly_adaptable|shows_flexibility|some_evidence|rigid_approach",
      "adaptabilityExamples": ["specific examples of adaptability"],
      "problemSolvingExamples": ["specific problem-solving instances"],
      "emotionalIntelligenceExamples": ["examples of EI"]
    },
    "resumeQuality": {
      "clarity": "exceptional|well_organized|adequate|needs_improvement|poor",
      "completeness": "comprehensive|mostly_complete|adequate|missing_key_info|sparse"
    },
    "bonusFactors": {
      "transferableSkills": ["skill → how it applies"],
      "preferredQualificationsMet": ["list of preferred quals met"],
      "additionalStrengths": ["other notable qualifications not in requirements"]
    }
  },
  "mustHavesMet": boolean,
  "partialMatches": ["requirements that are partially met with explanation"],
  "strengths": ["top 3-5 factual strengths with evidence"],
  "gaps": ["specific missing requirements with context"],
  "redFlags": ["concerning patterns if any"],
  "hiringRecommendation": "Strongly recommend|Recommend|Consider|Pass",
  "recommendationRationale": "Brief explanation of recommendation based on evidence"
}`;
};

/**
 * Evaluates a candidate using rubric-based scoring
 */
export async function evaluateCandidateV2(
  resumeText: string,
  fileName: string,
  jobRequirements: EnhancedJobRequirements
): Promise<EvaluationResult> {
  const client = getOpenAIClient();
  const systemPrompt = generateRubricExtractionPrompt(jobRequirements.jobType, jobRequirements);
  
  logger.debug('📊 Resume Evaluation V2 using: Rubric-based scoring', {
    jobType: jobRequirements.jobType,
    fileName
  });

  try {
    // Build the extraction request
    const userContent = [
      `Please extract information from the following resume:`,
      ``,
      `**Resume File Name:** ${fileName}`,
      `**Resume Text:**`,
      resumeText,
      ``,
      `**Job Requirements:**`,
      JSON.stringify(jobRequirements, null, 2),
      ``,
      `**Required Output Format:**`,
      generateOutputFormat()
    ].join('\n');

    const response = await retryOpenAICall(
      () => client.chat.completions.create({
        model: 'gpt-4o',
        messages: [
          { role: 'system', content: systemPrompt },
          { role: 'user', content: userContent }
        ],
        response_format: { type: 'json_object' },
        temperature: 0.1, // Low temperature for factual extraction
        max_tokens: 4096,
      }),
      `extract rubric data for ${fileName}`
    );

    const result = response.choices[0].message.content;
    if (!result) {
      throw new Error('OpenAI API returned an empty response.');
    }

    // Parse the extracted rubric data
    const extractedData = JSON.parse(result) as {
      candidateId: string;
      candidateName: string;
      rubricEvaluation: RubricEvaluation;
      mustHavesMet: boolean;
      partialMatches?: string[];
      strengths: string[];
      gaps: string[];
      redFlags?: string[];
      hiringRecommendation: string;
      recommendationRationale?: string;
    };

    // Calculate scores mathematically based on rubric evaluation
    const { scores, breakdown } = calculateScores(
      extractedData.rubricEvaluation,
      jobRequirements.jobType,
      jobRequirements
    );

    // Determine tier based on calculated score
    const tier = determineTier(scores.overall, jobRequirements.jobType) as EvaluationResult['tier'];

    // Generate explanation based on score breakdown
    const explanation = generateExplanation(
      extractedData.candidateName,
      scores,
      breakdown,
      extractedData.strengths,
      extractedData.gaps
    );

    // Build the complete evaluation result
    const evaluation: EvaluationResult = {
      candidateId: fileName,
      candidateName: extractedData.candidateName || fileName.replace(/\.[^/.]+$/, '').replace(/[_-]/g, ' '),
      resumeText,
      rubricEvaluation: extractedData.rubricEvaluation,
      scoreBreakdown: breakdown,
      scores,
      mustHavesMet: extractedData.mustHavesMet,
      tier,
      strengths: extractedData.strengths,
      gaps: extractedData.gaps,
      explanation,
      redFlags: extractedData.redFlags,
      hiringRecommendation: extractedData.hiringRecommendation,
      transferableSkills: extractedData.rubricEvaluation.bonusFactors.transferableSkills,
      preferredQualificationsMet: extractedData.rubricEvaluation.bonusFactors.preferredQualificationsMet,
      softSkillsIdentified: extractedData.rubricEvaluation.softSkills.culturalFitIndicators,
      bonusReason: `Transferable skills: ${extractedData.rubricEvaluation.bonusFactors.transferableSkills.length}, Preferred qualifications: ${extractedData.rubricEvaluation.bonusFactors.preferredQualificationsMet.length}`,
      partialMatches: extractedData.partialMatches,
      recommendationRationale: extractedData.recommendationRationale
    };

    return evaluation;

  } catch (error) {
    logger.error(`Error evaluating candidate ${fileName}:`, error);
    throw new Error(`Failed to evaluate candidate ${fileName}. Reason: ${error instanceof Error ? error.message : 'Unknown'}`);
  }
}

/**
 * Generate explanation based on calculated scores
 */
function generateExplanation(
  candidateName: string,
  scores: {
    overall: number;
    baseScore: number;
    bonusPoints: number;
  },
  breakdown: ScoreBreakdown[],
  strengths: string[],
  gaps: string[]
): string {
  const topCategories = breakdown
    .filter(b => b.category !== 'bonus')
    .sort((a, b) => b.weightedScore - a.weightedScore)
    .slice(0, 2)
    .map(b => b.category);

  const strengthSummary = strengths.length > 0 
    ? `Key strengths include ${strengths.slice(0, 2).join(' and ')}.`
    : '';

  const gapSummary = gaps.length > 0
    ? `Areas for development: ${gaps.slice(0, 2).join(' and ')}.`
    : 'No significant gaps identified.';

  return `${candidateName} scored ${scores.overall}/100 (${scores.baseScore} base + ${scores.bonusPoints} bonus). ` +
         `Strongest areas: ${topCategories.join(' and ')}. ${strengthSummary} ${gapSummary}`;
}