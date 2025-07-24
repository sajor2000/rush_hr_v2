import OpenAI from 'openai';
import {
  EnhancedJobRequirements,
  EvaluationResult,
  RubricEvaluation,
  ScoreBreakdown,
} from '@/types';
import { retryOpenAICall } from './retryUtils';
import { calculateScores, determineTier } from './scoreCalculator';

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
const generateRubricExtractionPrompt = (jobType: string, _jobRequirements: EnhancedJobRequirements): string => {
  const basePrompt = [
    `You are an expert HR analyst extracting FACTUAL information from resumes for objective evaluation.`,
    `Job Type: ${jobType}`,
    ``,
    `CRITICAL INSTRUCTIONS:`,
    `- Extract ONLY factual information that can be verified from the resume`,
    `- DO NOT generate scores or make subjective judgments`,
    `- Extract the candidate's FULL NAME from the resume`,
    `- Be INCLUSIVE in recognizing transferable skills`,
    ``,
    `EXTRACT THE FOLLOWING INFORMATION:`,
    ``,
    `1. TECHNICAL SKILLS:`,
    `   - List all technologies/tools that match the required skills EXACTLY`,
    `   - List related/similar technologies (e.g., MySQL for PostgreSQL requirement)`,
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
    `4. SOFT SKILLS:`,
    `   - Communication evidence: "extensive", "good", "some", "none"`,
    `   - Leadership: "formal", "project", "team", "individual"`,
    `   - List specific cultural fit indicators (e.g., "patient-focused", "collaborative")`,
    `   - Adaptability: "highly_adaptable", "shows_flexibility", "some_evidence", "rigid_approach"`,
    ``,
    `5. RESUME QUALITY:`,
    `   - Clarity: "exceptional", "well_organized", "adequate", "needs_improvement", "poor"`,
    `   - Completeness: "comprehensive", "mostly_complete", "adequate", "missing_key_info", "sparse"`,
    ``,
    `6. BONUS FACTORS:`,
    `   - List ALL transferable skills with explanations (e.g., "Customer service in retail → Patient interaction")`,
    `   - List which preferred qualifications are met`,
    ``,
    `IMPORTANT NOTES ON TRANSFERABLE SKILLS:`,
    `- House cleaning → Hospital environmental services`,
    `- Retail → Customer service, patient interaction`,
    `- Military → Following procedures, discipline, leadership`,
    `- Food service → Fast-paced environment, customer focus`,
    `- Warehouse → Physical stamina, equipment operation`,
    `- Any cleaning experience → Environmental services`,
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
      "leadershipExperience": "formal|project|team|individual",
      "culturalFitIndicators": ["specific indicators found"],
      "adaptabilityEvidence": "highly_adaptable|shows_flexibility|some_evidence|rigid_approach"
    },
    "resumeQuality": {
      "clarity": "exceptional|well_organized|adequate|needs_improvement|poor",
      "completeness": "comprehensive|mostly_complete|adequate|missing_key_info|sparse"
    },
    "bonusFactors": {
      "transferableSkills": ["skill → how it applies"],
      "preferredQualificationsMet": ["list of preferred quals met"]
    }
  },
  "mustHavesMet": boolean,
  "strengths": ["top 3-5 factual strengths"],
  "gaps": ["specific missing requirements"],
  "redFlags": ["concerning patterns if any"],
  "hiringRecommendation": "Strongly recommend|Recommend|Consider|Pass"
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
  
  if (process.env.NODE_ENV === 'development') {
    console.log('📊 Resume Evaluation V2 using: Rubric-based scoring');
    console.log(`📋 Job Type: ${jobRequirements.jobType}`);
    console.log(`📄 Resume: ${fileName}`);
  }

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
      strengths: string[];
      gaps: string[];
      redFlags?: string[];
      hiringRecommendation: string;
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
      bonusReason: `Transferable skills: ${extractedData.rubricEvaluation.bonusFactors.transferableSkills.length}, Preferred qualifications: ${extractedData.rubricEvaluation.bonusFactors.preferredQualificationsMet.length}`
    };

    return evaluation;

  } catch (error) {
    console.error(`Error evaluating candidate ${fileName}:`, error);
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