// src/lib/chatService.ts
import OpenAI from 'openai';
import { ChatIntent, IntentClassificationResult, EvidenceSource, ChatContext } from '@/types/chat';

// Ensure OpenAI client is properly initialized
let openai: OpenAI | null = null;

function getOpenAIClient(): OpenAI {
  if (!openai) {
    const apiKey = process.env.OPENAI_API_KEY;
    if (!apiKey) {
      throw new Error('OPENAI_API_KEY environment variable is not set');
    }
    openai = new OpenAI({ apiKey });
  }
  return openai;
}

export class ChatService {
  private static readonly RISEN_SYSTEM_PROMPT = `
You are a professional HR Copilot AI, assisting a human recruiter during post-evaluation review of candidate resumes.

ROLE: You act as a context-aware analyst helping HR clarify doubts, explore resume evidence, understand evaluation outcomes, and explain the ranking system. You are accurate, transparent, and always grounded in the candidate's actual documents and evaluation data.

RANKING SYSTEM KNOWLEDGE:
- ALL candidates are ranked into quartiles (Q1-Q4) based on their overall score
- Q1 (Top 25%): Highest scoring candidates
- Q2 (Top 50%): Above average candidates  
- Q3 (Top 75%): Below average candidates
- Q4 (Bottom 25%): Lowest scoring candidates
- Rankings apply to ALL candidates, not just "qualified" ones
- Each job type has different scoring ranges:
  * Entry-level: 20-95 (wider range to differentiate potential)
  * Technical: 40-100 (strict scoring for skills)
  * General: 30-95 (balanced professional assessment)

SCORING RATIONALE:
- Base Score (0-85): Meeting required qualifications
- Bonus Points (0-15): For preferred qualifications and exceptional soft skills
- Total Score = Base + Bonus (max 100)
- Job type affects weight of different criteria:
  * Entry-level: Soft skills (30%), potential (20%), any experience (15%)
  * Technical: Technical skills (35%), project depth (25%), certifications (15%)
  * General: Experience (30%), skills (20%), leadership (12%)
- Bonus points awarded for:
  * Each preferred qualification met: +2-3 points
  * Exceptional soft skills demonstrated: up to +5 points
- Temperature set to 0.1 for consistent scoring
- 10+ point gaps between performance tiers ensure clear differentiation

FORMATTING RULES:
- Use clear, professional language without markdown formatting
- Never use asterisks for bold or italics
- Structure responses with clear paragraphs and proper spacing
- Use "quotation marks" when quoting from resumes
- Create lists with simple dashes or numbers

INPUTS: You receive candidate information including:
- Full parsed resume text
- Evaluation results (score 0-100, tier, gaps, summary, qualification status)
- Quartile ranking (Q1-Q4) and rank within all candidates
- Job type (entry-level, technical, or general)
- Job description and must-have attributes

RESPONSE GUIDELINES:
1. Start with a direct answer to the question
2. Explain quartile rankings when relevant
3. Provide scoring rationale based on job type
4. Quote evidence from the resume when applicable
5. End with actionable insights when appropriate

TONE:
- Professional yet conversational
- Confident but not overly formal
- Helpful and constructive
- Clear and easy to understand

EXPECTATIONS:
- Explain the ranking system clearly when asked
- Provide job type-specific scoring context
- Be transparent about scoring methodology
- Quote relevant resume sections using quotation marks
- Never fabricate qualifications
- Help users understand why candidates received specific scores
`;

  static async classifyIntent(query: string): Promise<IntentClassificationResult> {
    const intentPatterns: Record<ChatIntent, RegExp[]> = {
      resume_detail_inquiry: [
        /did they mention|do they have|where.*show|what.*experience/i,
        /background in|skilled in|familiar with/i
      ],
      evaluation_challenge: [
        /why.*qualified|why.*score|why.*ranked|what.*wrong/i,
        /reason.*failed|explanation.*tier/i
      ],
      candidate_comparison: [
        /stronger than|better than|compare.*to|versus|vs\./i,
        /who.*better|which.*candidate/i
      ],
      skill_verification: [
        /where.*leadership|demonstrate.*skills|show.*ability/i,
        /evidence.*of|proof.*of/i
      ],
      experience_analysis: [
        /years.*experience|how long|duration.*work/i,
        /career.*length|time.*in/i
      ],
      ambiguity_check: [
        /justified|reasonable|fair.*assessment|accurate/i,
        /should.*be.*higher|seems.*low/i
      ],
      ranking_explanation: [
        /what.*(?:Q1|Q2|Q3|Q4|quartile)|quartile.*mean|how.*ranked/i,
        /explain.*ranking|ranking.*system|what.*top.*25/i,
        /bottom.*25|how.*calculate.*quartile/i
      ],
      scoring_rationale: [
        /why.*score.*\d+|explain.*score|scoring.*methodology/i,
        /how.*scored|scoring.*criteria|why.*\d+.*percent/i,
        /score.*rationale|scoring.*range/i
      ],
      unknown: []
    };

    for (const [intent, patterns] of Object.entries(intentPatterns)) {
      for (const pattern of patterns) {
        if (pattern.test(query)) {
          return {
            intent: intent as ChatIntent,
            confidence: 0.8,
            entities: this.extractEntities(query)
          };
        }
      }
    }

    return {
      intent: 'unknown',
      confidence: 0.3,
      entities: this.extractEntities(query)
    };
  }

  private static extractEntities(query: string): Record<string, string> {
    const entities: Record<string, string> = {};
    
    // Extract potential technology mentions
    const techTerms = query.match(/\b(?:JavaScript|Python|React|Node\.js|AWS|Azure|Docker|Kubernetes|SQL|MongoDB|Git|Java|C\+\+|HTML|CSS|API|REST|GraphQL|TypeScript|Vue|Angular|PHP|Ruby|Go|Rust|Swift|Kotlin|Android|iOS|Linux|Windows|macOS|Jenkins|CI\/CD|DevOps|Agile|Scrum|Machine Learning|AI|Data Science|Analytics|Cloud|Database|Security|Testing|QA|UI\/UX|Design|Marketing|Sales|Management|Leadership|Communication|Project Management|Certification|Degree|Bachelor|Master|PhD|PMP|Scrum Master|AWS Certified|Microsoft Certified)\b/gi);
    
    if (techTerms) {
      entities.technologies = techTerms.join(', ');
    }

    // Extract years of experience mentions
    const experienceMatch = query.match(/(\d+)\s*(?:years?|yrs?)\s*(?:of\s*)?(?:experience|exp)/i);
    if (experienceMatch) {
      entities.experience_years = experienceMatch[1];
    }

    return entities;
  }

  static async searchResume(resumeText: string, query: string): Promise<EvidenceSource[]> {
    if (!resumeText) return [];

    const evidence: EvidenceSource[] = [];
    const sentences = resumeText.split(/[.!?]+/).filter(s => s.trim().length > 0);
    
    // Simple semantic search - in production, use embeddings
    const queryTerms = query.toLowerCase().split(/\s+/);
    
    for (let i = 0; i < sentences.length; i++) {
      const sentence = sentences[i].trim();
      const sentenceLower = sentence.toLowerCase();
      
      let relevanceScore = 0;
      for (const term of queryTerms) {
        if (sentenceLower.includes(term)) {
          relevanceScore += 1;
        }
      }
      
      if (relevanceScore > 0) {
        evidence.push({
          type: 'resume',
          content: sentence,
          relevanceScore: relevanceScore / queryTerms.length,
          location: `Sentence ${i + 1}`
        });
      }
    }

    return evidence
      .sort((a, b) => b.relevanceScore - a.relevanceScore)
      .slice(0, 5); // Top 5 most relevant
  }

  static async generateResponse(
    query: string,
    context: ChatContext,
    intent: IntentClassificationResult,
    evidence: EvidenceSource[]
  ): Promise<string> {
    try {
      const client = getOpenAIClient();
      
      // Log debug info only in development
      if (process.env.NODE_ENV === 'development') {
        console.log('💬 Chat Service using: OpenAI API');
        console.log('Chat Service Debug:', {
          hasCandidate: !!context.candidateName,
          hasResumeText: !!context.resumeText,
          hasEvaluation: !!context.evaluationResult,
          intent: intent.intent,
          evidenceCount: evidence.length
        });
      }
      
      const contextInfo = [
        context.candidateName ? `Candidate: ${context.candidateName}` : '',
        context.jobDescription ? `Job Description: ${context.jobDescription.substring(0, 500)}...` : '',
        context.mustHaveAttributes ? `Must-Have Attributes: ${context.mustHaveAttributes}` : '',
        context.evaluationResult ? `Evaluation Score: ${context.evaluationResult.scores?.overall || 'N/A'}` : '',
        context.evaluationResult?.tier ? `Tier: ${context.evaluationResult.tier}` : '',
        context.quartileTier ? `Quartile Ranking: ${context.quartileTier}` : '',
        context.quartileRank && context.totalCandidates ? `Rank: ${context.quartileRank} of ${context.totalCandidates} candidates` : '',
        context.jobType ? `Job Type: ${context.jobType}` : '',
        context.evaluationResult?.explanation ? `Evaluation Summary: ${context.evaluationResult.explanation}` : ''
      ].filter(Boolean).join('\n');

      const evidenceText = evidence.length > 0 
        ? `\nRelevant Evidence:\n${evidence.map(e => `- ${e.content}`).join('\n')}`
        : '\nNo specific evidence found in resume.';

      // Add warning if no resume text in development
      if (!context.resumeText && process.env.NODE_ENV === 'development') {
        console.warn('No resume text provided - chat responses will be limited');
      }

      // Only log API details in development
      if (process.env.NODE_ENV === 'development') {
        console.log('Attempting OpenAI API call with model: gpt-4o-mini');
        console.log('API Key present:', !!process.env.OPENAI_API_KEY);
      }
      
      const startTime = Date.now();
      const completion = await client.chat.completions.create({
        model: 'gpt-4o-mini',
        messages: [
          {
            role: 'system',
            content: this.RISEN_SYSTEM_PROMPT
          },
          {
            role: 'user',
            content: `Context:\n${contextInfo}\n\nQuery: ${query}\n\nIntent: ${intent.intent} (confidence: ${intent.confidence})${evidenceText}\n\nPlease provide a helpful, evidence-based response.`
          }
        ],
        temperature: 0.2, // Low temperature for consistent, reliable HR evaluations
        top_p: 0.90, // Moderate-high top_p for natural language while maintaining focus
        max_tokens: 4096
      });

      const endTime = Date.now();
      const response = completion.choices[0]?.message?.content || 'I apologize, but I cannot provide a response at this time.';
      
      // Log performance metrics only in development
      if (process.env.NODE_ENV === 'development') {
        console.log('OpenAI API call successful - Response time:', endTime - startTime, 'ms');
      }
      
      return response;
    } catch (error) {
      // Log error details only in development
      if (process.env.NODE_ENV === 'development') {
        console.error('OpenAI API error:', {
          error: error instanceof Error ? error.message : 'Unknown error',
          stack: error instanceof Error ? error.stack : undefined
        });
      }
      
      // Provide more specific error messages
      if (error instanceof Error) {
        if (error.message.includes('401') || error.message.includes('Incorrect API key')) {
          return 'Authentication failed. Please check that the OpenAI API key is correctly configured.';
        }
        if (error.message.includes('429')) {
          return 'Rate limit exceeded. Please wait a moment and try again.';
        }
        if (error.message.includes('insufficient_quota') || error.message.includes('exceeded your current quota')) {
          return 'OpenAI API quota exceeded. Please check your OpenAI account.';
        }
        if (error.message.includes('model')) {
          return 'Model access error. The API key may not have access to gpt-4o-mini.';
        }
      }
      
      return 'I apologize, but I encountered an error while processing your request. Please check the server logs for more details.';
    }
  }

  static validateEnvironment(): { isValid: boolean; error?: string } {
    const apiKey = process.env.OPENAI_API_KEY;
    
    if (!apiKey) {
      return {
        isValid: false,
        error: 'OPENAI_API_KEY environment variable is not set'
      };
    }

    if (!apiKey.startsWith('sk-')) {
      return {
        isValid: false,
        error: 'OPENAI_API_KEY appears to be invalid (should start with sk-)'
      };
    }

    return { isValid: true };
  }
}
