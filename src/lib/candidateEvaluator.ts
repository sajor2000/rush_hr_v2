import OpenAI from 'openai';
import {
  EnhancedJobRequirements,
  EvaluationResult,
} from '@/types';
import { retryOpenAICall } from './retryUtils';
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

// Dynamically generate transferable skills based on job requirements
function generateTransferableSkillsMapping(jobRequirements?: EnhancedJobRequirements): string {
  if (!jobRequirements) {
    return '   - Look for any relevant experience that could transfer to this role';
  }
  
  const mapping = [
    '   IMPORTANT: Analyze the job requirements and identify transferable skills from ANY background:',
    '   ',
    '   Read the job description carefully and consider:',
    '   1. What are the core tasks/responsibilities? Find candidates with experience in similar tasks, even from different industries',
    '   2. What skills are needed? Look for evidence of these skills in any context',
    '   3. What work environment is described? Value experience in similar environments',
    '   ',
    '   Examples of intelligent skill transfer mapping:',
    '   - If the job involves "cleaning" → value ANY cleaning experience (residential, commercial, automotive, etc.)',
    '   - If the job involves "customer interaction" → value retail, food service, call center, reception experience',
    '   - If the job involves "following protocols" → value military, laboratory, manufacturing, healthcare experience',
    '   - If the job involves "physical tasks" → value warehouse, construction, moving, fitness, sports experience',
    '   - If the job involves "data accuracy" → value bookkeeping, data entry, inventory, research experience',
    '   - If the job involves "equipment operation" → value any machinery, tools, or equipment experience',
    '   ',
    '   BE CREATIVE AND INCLUSIVE in recognizing transferable skills. A house cleaner HAS transferable skills for hospital environmental services. A retail worker HAS skills for patient interaction. A military veteran HAS skills for following procedures.',
    '   ',
    '   Award bonus points for ANY relevant experience that shows the candidate can succeed in this role.'
  ];
  
  return mapping.join('\n');
}

// Generate job-specific bonus point instructions
function generateJobSpecificBonusInstructions(jobRequirements: EnhancedJobRequirements): string {
  const instructions = [
    '- ANALYZE THE JOB REQUIREMENTS and award bonus points for relevant experience:',
    `  * If the job involves ${jobRequirements.title}, look for ANY related experience in that field or similar roles`,
    '  * For each skill mentioned in requirements, award points if candidate demonstrates that skill in ANY context',
    '  * Value industry-specific experience but ALSO value transferable experience from other industries',
    '  * Consider the work environment and value experience in similar settings (hospital → any healthcare, office → any professional setting)',
    '  * Award extra points for exact matches but still give points for related/transferable experience'
  ];
  
  return instructions.join('\n');
}

// Generate the base prompt that's common to all job types
function generateBasePrompt(jobType: string, jobRequirements?: EnhancedJobRequirements): string {
  const baseLines = [
    `You are an expert HR analyst evaluating resumes for Rush University System for Health. Analyze each candidate comprehensively based on the job type: ${jobType}.`,
    '',
    'CRITICAL INSTRUCTIONS:',
    '- EXTRACT THE CANDIDATE\'S FULL NAME from the resume (usually at the top)',
    '- If no name found, use "Name Not Found" but NEVER leave blank',
    '- CREATE SCORE DISTRIBUTION: Use the full scoring range to differentiate candidates',
    '- Avoid clustering scores - spread them across the range for better quartile distribution',
    '',
    'SCORING STRUCTURE:',
    '- Base Score (0-85 points): Meeting required qualifications',
    '- Bonus Points (0-15 points): For preferred qualifications and exceptional soft skills',
    '  * Up to 10 points for preferred qualifications (niceToHave)',
    '  * Up to 5 points for demonstrated soft skills (leadership, teamwork, etc.)',
    '- Total Score = Base Score + Bonus Points (max 100)',
    '',
    'EVALUATION PROCESS:',
    '',
    '1. MUST-HAVE GATE: Check ALL must-have qualifications. Note missing items but continue scoring',
    '   - For technical requirements (e.g., ServiceNow SPM), look for exact matches or very similar tools',
    '   - For experience requirements, ensure minimum years are met',
    '   - For education, accept equivalent experience when stated (e.g., "or related experience")',
    '   ',
    '2. PREFERRED QUALIFICATIONS CHECK: Award bonus points for each preferred qualification met',
    '   - Each preferred qualification met: +2-3 points',
    '   - Related but not exact match: +1 point',
    '   - Maximum 10 bonus points for preferred qualifications',
    '   ',
    '3. SOFT SKILLS ASSESSMENT: Award bonus points for demonstrated soft skills',
    '   - Look for evidence of soft skills in work experience descriptions',
    '   - Leadership roles, team coordination, stakeholder management = high value',
    '   - Communication examples (presentations, documentation, training) = medium value',
    '   - Maximum 5 bonus points for exceptional soft skills',
    '',
    '4. TRANSFERABLE SKILLS MAPPING:',
    generateTransferableSkillsMapping(jobRequirements),
    '',
    '5. JOB-SPECIFIC ANALYSIS FOLLOWS BELOW:'
  ];
  
  return baseLines.join('\n');
}

// Generate entry-level specific prompt
function generateEntryLevelPrompt(basePrompt: string): string {
  const entryLevelLines = [
    '',
    '6. DETAILED SCORING FOR ENTRY-LEVEL POSITIONS:',
    '   BASE SCORE (0-85):',
    '   a) Soft Skills & Availability (30%): Reliability, communication, teamwork, schedule flexibility, customer service orientation',
    '   b) Basic Qualifications & Potential (20%): Meets minimum requirements, shows growth potential, trainability indicators',
    '   c) Experience Relevance (15%): ANY relevant experience including part-time, volunteer, internships, school projects',
    '   d) Education & Training (15%): Relevant education, certifications, training programs, continuous learning',
    '   e) Resume Quality (5%): Basic clarity and organization (be lenient - entry-level may have simple resumes)',
    '   ',
    '   BONUS POINTS (0-15):',
    '   - Preferred Qualifications (0-10): ',
    '     * Each preferred qualification met: +2-3 points',
    '     * Related experience in similar industries: +2-4 points',
    '     * Bilingual abilities when relevant: +2-3 points',
    '     * Relevant certifications or training: +2-3 points',
    '   - Exceptional Soft Skills (0-5): ',
    '     * Demonstrated reliability (long tenure, consistent work history): +2 points',
    '     * Leadership or training experience: +1-2 points',
    '     * Outstanding communication examples: +1-2 points',
    '     * Military/veteran experience: +3 points (discipline, reliability, leadership)',
    '',
    '7. ENTRY-LEVEL SPECIFIC ANALYSIS:',
    '   - Consider ALL experience types: volunteer work, internships, part-time jobs, school projects, lab coursework, military service',
    '   - BE HIGHLY INCLUSIVE in recognizing transferable skills - think creatively about how ANY experience relates',
    '   - Value attitude and potential over extensive experience',
    '   - Check for basic computer skills and willingness to learn',
    '   - Consider availability for required shifts/schedules',
    '   - Don\'t penalize short work history or limited professional experience',
    '   - Physical capabilities mentioned = positive indicator',
    '   - Any customer service or team experience = valuable',
    '   - Consistent employment history (even different fields) = reliability indicator',
    '   ',
    '   CRITICAL: Use the transferable skills mapping provided above. If a candidate has experience that could transfer to this role, RECOGNIZE IT and award appropriate points. Don\'t be narrow in your interpretation - be generous in seeing connections between different types of experience.',
    '',
    '8. SCORING DISTRIBUTION FOR ENTRY-LEVEL (20-100 range with bonus):',
    '   - First Quartile (75-100): Top candidates with exceptional fit',
    '   - Second Quartile (50-74): Strong candidates worth considering',
    '   - Third Quartile (25-49): Candidates with potential, review carefully',
    '   - Fourth Quartile (0-24): Lower scoring candidates - manual review recommended',
    '',
    'IMPORTANT: Differentiate scores! Candidates are ranked by quartiles:',
    '- First Quartile: 75-100 (Top 25%)',
    '- Second Quartile: 50-74',
    '- Third Quartile: 25-49',
    '- Fourth Quartile: 0-24 (Requires manual review for processing issues)',
    '',
    'OUTPUT JSON:',
    '{',
    '  "candidateId": "filename",',
    '  "candidateName": "full name",',
    '  "scores": {',
    '    "overall": number,',
    '    "technicalSkills": number,',
    '    "experienceRelevance": number,',
    '    "educationCertifications": number,',
    '    "softSkillsCulture": number,',
    '    "resumeQuality": number,',
    '    "baseScore": number,',
    '    "bonusPoints": number',
    '  },',
    '  "mustHavesMet": boolean,',
    '  "tier": "tier name",',
    '  "strengths": ["top 3-5 standout qualities with evidence"],',
    '  "gaps": ["specific gaps or growth areas"],',
    '  "explanation": "Comprehensive 3-4 sentence summary with specific examples",',
    '  "redFlags": ["concerns like gaps, job hopping, etc."],',
    '  "hiringRecommendation": "Strongly recommend/Recommend/Consider/Pass with reasoning",',
    '  "preferredQualificationsMet": ["list of nice-to-have qualifications this candidate has"],',
    '  "softSkillsIdentified": ["list of soft skills demonstrated in resume"],',
    '  "bonusReason": "Explanation of why bonus points were awarded",',
    '  "transferableSkills": ["list of transferable skills identified, e.g. \'House cleaning experience → hospital environmental services\', \'Military service → following protocols\'"]',
    '}'
  ];
  
  return basePrompt + entryLevelLines.join('\n');
}

// Generate technical specific prompt
function generateTechnicalPrompt(basePrompt: string): string {
  const technicalLines = [
    '',
    '6. DETAILED SCORING FOR TECHNICAL POSITIONS:',
    '   BASE SCORE (0-85):',
    '   a) Technical Skills Match (35%): Exact and semantic matching of technologies, frameworks, languages, tools',
    '   b) Experience Relevance (25%): Technical project depth, problem-solving examples, innovation, system design',
    '   c) Education & Certifications (15%): CS degree, relevant certifications (AWS, Azure, etc.), specialized training',
    '   d) Soft Skills & Collaboration (8%): Team collaboration, documentation, mentoring, communication of technical concepts',
    '   e) Portfolio & Code Quality (2%): GitHub contributions, open source, technical blog, code samples',
    '   ',
    '   BONUS POINTS (0-15):',
    '   - Preferred Technologies (0-10): Award 2-3 points per preferred technology/framework mastered',
    '   - Leadership & Mentoring (0-5): Technical leadership, mentoring juniors, teaching, speaking at conferences',
    '',
    '7. TECHNICAL ROLE SPECIFIC ANALYSIS:',
    '   - Deep dive into specific technologies and versions used',
    '   - Evaluate complexity of projects and technical challenges solved',
    '   - Look for continuous learning and staying current with tech',
    '   - Consider contributions to technical communities',
    '   - Assess system design and architecture experience',
    '   - Value hands-on coding experience and practical implementations',
    '',
    '8. SCORING DISTRIBUTION FOR TECHNICAL (0-100 range with bonus):',
    '   - First Quartile (75-100): Top technical candidates',
    '   - Second Quartile (50-74): Strong technical match',
    '   - Third Quartile (25-49): Some technical alignment',
    '   - Fourth Quartile (0-24): Limited match - verify resume parsed correctly',
    '',
    'IMPORTANT: Use quartile distribution for fair ranking:',
    '- First Quartile: 75-100',
    '- Second Quartile: 50-74',
    '- Third Quartile: 25-49',
    '- Fourth Quartile: 0-24',
    '',
    'OUTPUT JSON:',
    '{',
    '  "candidateId": "filename",',
    '  "candidateName": "full name",',
    '  "scores": {',
    '    "overall": number,',
    '    "technicalSkills": number,',
    '    "experienceRelevance": number,',
    '    "educationCertifications": number,',
    '    "softSkillsCulture": number,',
    '    "resumeQuality": number,',
    '    "baseScore": number,',
    '    "bonusPoints": number',
    '  },',
    '  "mustHavesMet": boolean,',
    '  "tier": "tier name",',
    '  "strengths": ["top 3-5 standout qualities with evidence"],',
    '  "gaps": ["specific gaps or growth areas"],',
    '  "explanation": "Comprehensive 3-4 sentence summary with specific examples",',
    '  "redFlags": ["concerns like gaps, job hopping, etc."],',
    '  "hiringRecommendation": "Strongly recommend/Recommend/Consider/Pass with reasoning",',
    '  "preferredQualificationsMet": ["list of nice-to-have qualifications this candidate has"],',
    '  "softSkillsIdentified": ["list of soft skills demonstrated in resume"],',
    '  "bonusReason": "Explanation of why bonus points were awarded",',
    '  "transferableSkills": ["list of transferable skills identified, e.g. \'House cleaning experience → hospital environmental services\', \'Military service → following protocols\'"]',
    '}'
  ];
  
  return basePrompt + technicalLines.join('\n');
}

// Generate general/professional specific prompt
function generateGeneralPrompt(basePrompt: string): string {
  const generalLines = [
    '',
    '6. DETAILED SCORING FOR PROFESSIONAL POSITIONS:',
    '   BASE SCORE (0-85):',
    '   a) Experience Relevance (30%): Industry alignment, role progression, leadership, measurable achievements',
    '   b) Skills Match (20%): Core competencies, domain expertise, specialized knowledge',
    '   c) Education & Professional Development (20%): Relevant degree, professional certifications, executive education',
    '   d) Leadership & Soft Skills (12%): Team management, strategic thinking, communication, stakeholder management',
    '   e) Resume Quality (3%): Professional presentation, quantified achievements, clear career narrative',
    '   ',
    '   BONUS POINTS (0-15):',
    '   - Preferred Qualifications (0-10): Industry certifications, advanced degrees, specific expertise',
    '   - Exceptional Leadership (0-5): C-level experience, board positions, published work, speaking engagements',
    '',
    '7. PROFESSIONAL ROLE SPECIFIC ANALYSIS:',
    '   - Evaluate management and leadership experience',
    '   - Look for strategic thinking and business impact',
    '   - Assess industry knowledge and domain expertise',
    '   - Consider budget management and P&L responsibility',
    '   - Review client/stakeholder relationship management',
    '   - Value cross-functional collaboration and influence',
    '',
    '8. SCORING DISTRIBUTION FOR GENERAL/PROFESSIONAL (0-100 range with bonus):',
    '   - First Quartile (75-100): Top professional candidates',
    '   - Second Quartile (50-74): Strong professional background',
    '   - Third Quartile (25-49): Some relevant experience',
    '   - Fourth Quartile (0-24): Limited alignment - check for parsing issues',
    '',
    'SCORING GUIDANCE: Distribute candidates across quartiles:',
    '- First Quartile: 75-100',
    '- Second Quartile: 50-74',
    '- Third Quartile: 25-49',
    '- Fourth Quartile: 0-24 (Always recommend manual review)',
    '',
    'OUTPUT JSON:',
    '{',
    '  "candidateId": "filename",',
    '  "candidateName": "full name",',
    '  "scores": {',
    '    "overall": number,',
    '    "technicalSkills": number,',
    '    "experienceRelevance": number,',
    '    "educationCertifications": number,',
    '    "softSkillsCulture": number,',
    '    "resumeQuality": number,',
    '    "baseScore": number,',
    '    "bonusPoints": number',
    '  },',
    '  "mustHavesMet": boolean,',
    '  "tier": "tier name",',
    '  "strengths": ["top 3-5 standout qualities with evidence"],',
    '  "gaps": ["specific gaps or growth areas"],',
    '  "explanation": "Comprehensive 3-4 sentence summary with specific examples",',
    '  "redFlags": ["concerns like gaps, job hopping, etc."],',
    '  "hiringRecommendation": "Strongly recommend/Recommend/Consider/Pass with reasoning",',
    '  "preferredQualificationsMet": ["list of nice-to-have qualifications this candidate has"],',
    '  "softSkillsIdentified": ["list of soft skills demonstrated in resume"],',
    '  "bonusReason": "Explanation of why bonus points were awarded",',
    '  "transferableSkills": ["list of transferable skills identified, e.g. \'House cleaning experience → hospital environmental services\', \'Military service → following protocols\'"]',
    '}'
  ];
  
  return basePrompt + generalLines.join('\n');
}

// Main function to generate system prompt
const generateSystemPrompt = (jobType: string, jobRequirements?: EnhancedJobRequirements): string => {
  const basePrompt = generateBasePrompt(jobType, jobRequirements);
  
  if (jobType === 'entry-level') {
    return generateEntryLevelPrompt(basePrompt);
  } else if (jobType === 'technical') {
    return generateTechnicalPrompt(basePrompt);
  } else {
    return generateGeneralPrompt(basePrompt);
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
  const systemPrompt = generateSystemPrompt(jobRequirements.jobType, jobRequirements);
  
  // Log service usage in development
  logger.debug('📊 Resume Evaluation using: OpenAI API', {
    jobType: jobRequirements.jobType,
    fileName,
    resumePreview: resumeText.substring(0, 200) + '...',
    resumeLength: resumeText.length
  });

  try {
    // Build the user content message
    const userContentParts = [
      `Please evaluate the following resume:\n\n**Resume File Name:** ${fileName}\n\n**Resume Text:**\n${resumeText}\n\n**Job Requirements:**\n${JSON.stringify(jobRequirements, null, 2)}\n\n**CRITICAL TRANSFERABLE SKILLS INSTRUCTION:**`,
      'BE INCLUSIVE AND CREATIVE in recognizing how the candidate\'s experience transfers to this role. For example:',
      '- House cleaning experience IS relevant for hospital environmental technician roles',
      '- Retail experience IS relevant for patient interaction roles',
      '- Any cleaning/janitorial experience IS valuable for environmental services',
      '- Military experience transfers to ANY role requiring discipline and procedures',
      '',
      '**IMPORTANT BONUS POINT INSTRUCTIONS:**',
      '- Check if candidate meets any preferred qualifications (niceToHave)',
      `- Check if candidate demonstrates exceptional soft skills (${jobRequirements.softSkills?.join(', ') || 'leadership, teamwork, communication'})`,
      '- Check for military/veteran experience (Army, Navy, Air Force, Marines, Coast Guard, National Guard)',
      generateJobSpecificBonusInstructions(jobRequirements),
      '- Award bonus points accordingly (up to 15 total)',
      '- List which preferred qualifications they meet',
      '- List which soft skills they demonstrate',
      '- Note if candidate is a veteran for bonus consideration',
      '- IMPORTANT: List any transferable skills you identified and how they relate to this role'
    ];
    
    const userContent = userContentParts.join('\n');

    const response = await retryOpenAICall(
      () => client.chat.completions.create({
        model: 'gpt-4o',
        messages: [
          { role: 'system', content: systemPrompt },
          { role: 'user', content: userContent }
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