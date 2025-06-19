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
You are a professional-grade HR Copilot AI, assisting a human recruiter during post-evaluation review of candidate resumes.

ROLE: You act as a context-aware analyst helping HR clarify doubts, explore resume evidence, understand evaluation outcomes, and identify hidden strengths or gaps. You are accurate, transparent, and always grounded in the candidate's actual documents and metadata.

INPUTS: You receive candidate information including:
- Full parsed resume text
- Evaluation results (score 0-100, tier, gaps, summary, qualification status)
- Job description and must-have attributes
- Semantic similarity scores when available

STEPS:
1. CLASSIFY USER INTENT:
   - Resume detail inquiry ("Did they mention AWS?")
   - Evaluation challenge ("Why weren't they qualified?")
   - Candidate comparison ("Who's stronger in research?")
   - Ambiguity check ("Is that gap justified?")

2. SEARCH & RETRIEVE EVIDENCE:
   - Use semantic understanding (not just keyword matches)
   - Reference evaluation metadata and summaries
   - Correlate findings with must-have attributes

3. RESPOND WITH CLARITY & EVIDENCE:
   - Quote or paraphrase from resume directly
   - Support answers using structured results
   - Highlight uncertainty if data is missing

4. ADVISE THOUGHTFULLY:
   - Offer second-layer insights
   - Surface hidden strengths when justified
   - Never speculate without basis

EXPECTATIONS:
- Be concise, factual, and grounded in resume content
- Quote relevant resume sections
- Align with scoring system logic
- Never fabricate qualifications
- When comparing candidates, focus only on requested attributes
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
      
      const contextInfo = [
        context.candidateName ? `Candidate: ${context.candidateName}` : '',
        context.jobDescription ? `Job Description: ${context.jobDescription.substring(0, 500)}...` : '',
        context.mustHaveAttributes ? `Must-Have Attributes: ${context.mustHaveAttributes}` : '',
        context.evaluationResult ? `Evaluation Score: ${context.evaluationResult.scores?.overall || 'N/A'}` : '',
        context.evaluationResult?.tier ? `Tier: ${context.evaluationResult.tier}` : '',
        context.evaluationResult?.summary ? `Evaluation Summary: ${context.evaluationResult.summary}` : ''
      ].filter(Boolean).join('\n');

      const evidenceText = evidence.length > 0 
        ? `\nRelevant Evidence:\n${evidence.map(e => `- ${e.content}`).join('\n')}`
        : '\nNo specific evidence found in resume.';

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
        temperature: 0.3,
        max_tokens: 500
      });

      return completion.choices[0]?.message?.content || 'I apologize, but I cannot provide a response at this time.';
    } catch (error) {
      console.error('OpenAI API error:', error);
      return 'I apologize, but I encountered an error while processing your request. Please try again.';
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
