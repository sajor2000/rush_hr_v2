// src/app/api/chat/route.ts
import { NextRequest, NextResponse } from 'next/server';
import { ChatService } from '@/lib/chatService';
import { ChatRequest, ChatResponse, ChatContext } from '@/types/chat';
import { chatRateLimiter } from '@/lib/rateLimiter';

// Input sanitization helper
function sanitizeInput(input: string): string {
  return input
    .replace(/[<>]/g, '') // Remove potential HTML tags
    .replace(/javascript:/gi, '') // Remove javascript: protocols
    .trim();
}

// Get client IP for rate limiting
function getClientIP(req: NextRequest): string {
  const forwarded = req.headers.get('x-forwarded-for');
  const realIP = req.headers.get('x-real-ip');
  
  if (forwarded) {
    return forwarded.split(',')[0].trim();
  }
  
  if (realIP) {
    return realIP;
  }
  
  return 'unknown';
}

export async function POST(req: NextRequest) {
  const clientIP = getClientIP(req);
  
  try {
    // Rate limiting check
    if (!chatRateLimiter.isAllowed(clientIP)) {
      const resetTime = chatRateLimiter.getResetTime(clientIP);
      const remainingTime = Math.ceil((resetTime - Date.now()) / 1000);
      
      if (process.env.NODE_ENV === 'development') {
        console.log('Rate limit exceeded for IP:', clientIP);
      }
      return NextResponse.json(
        { 
          error: 'Rate limit exceeded. Please try again later.',
          retryAfter: remainingTime
        }, 
        { 
          status: 429,
          headers: {
            'Retry-After': remainingTime.toString(),
            'X-RateLimit-Remaining': '0',
            'X-RateLimit-Reset': resetTime.toString()
          }
        }
      );
    }

    // Validate environment setup
    const envValidation = ChatService.validateEnvironment();
    if (!envValidation.isValid) {
      if (process.env.NODE_ENV === 'development') {
        console.error('Environment validation failed:', envValidation.error);
      }
      return NextResponse.json(
        { 
          error: 'Chat service is not properly configured. Please check server configuration.',
          details: process.env.NODE_ENV === 'development' ? envValidation.error : 'Configuration error'
        }, 
        { status: 500 }
      );
    }

    // Parse and validate request body
    const body = await req.json() as ChatRequest;
    
    if (process.env.NODE_ENV === 'development') {
      console.log('Request body received:', {
        hasQuery: !!body.query,
        queryLength: body.query?.length,
        hasCandidateId: !!body.candidateId,
        hasResumeText: !!body.resumeText,
        hasEvaluationResult: !!body.evaluationResult
      });
    }
    
    let { 
      query,
      candidateId,
      resumeText,
      evaluationResult,
      jobDescription,
      mustHaveAttributes 
    } = body;

    // Input sanitization
    const sanitizedQuery = sanitizeInput(query);

    // Input validation
    if (!sanitizedQuery || typeof sanitizedQuery !== 'string' || sanitizedQuery.trim().length === 0) {
      return NextResponse.json(
        { error: 'Query is required and must be a non-empty string' }, 
        { status: 400 }
      );
    }

    if (sanitizedQuery.length > 1000) {
      return NextResponse.json(
        { error: 'Query is too long. Please limit to 1000 characters.' }, 
        { status: 400 }
      );
    }

    // Build context
    const context: ChatContext = {
      candidateId,
      resumeText,
      evaluationResult,
      jobDescription,
      mustHaveAttributes,
      candidateName: evaluationResult?.candidateName
    };

    // Process chat request using RISEN methodology
    // Step 1: Classify Intent
    const intentResult = await ChatService.classifyIntent(sanitizedQuery);

    // Step 2: Search & Retrieve Evidence
    const evidence = await ChatService.searchResume(resumeText || '', sanitizedQuery);

    // Step 3: Generate Response
    const response = await ChatService.generateResponse(
      sanitizedQuery,
      context,
      intentResult,
      evidence
    );

    // Step 4: Prepare response
    const chatResponse: ChatResponse = {
      response,
      intent: intentResult.intent,
      confidence: intentResult.confidence,
      sources: evidence.map(e => e.content),
      suggestions: generateSuggestions(intentResult.intent, context)
    };

    return NextResponse.json(chatResponse);

  } catch (error) {
    if (process.env.NODE_ENV === 'development') {
      console.error('Chat API error:', error);
    }
    
    // Return appropriate error response
    if (error instanceof Error) {
      if (error.message.includes('API key')) {
        return NextResponse.json(
          { error: 'Authentication failed. Please check API configuration.' },
          { status: 401 }
        );
      }
      
      if (error.message.includes('rate limit')) {
        return NextResponse.json(
          { error: 'Rate limit exceeded. Please try again in a moment.' },
          { status: 429 }
        );
      }
    }

    return NextResponse.json(
      { 
        error: 'An unexpected error occurred while processing your request.',
        details: process.env.NODE_ENV === 'development' ? error instanceof Error ? error.message : 'Unknown error' : undefined
      }, 
      { status: 500 }
    );
  }
}

function generateSuggestions(intent: string, context: ChatContext): string[] {
  const suggestions: string[] = [];
  
  switch (intent) {
    case 'resume_detail_inquiry':
      if (context.candidateName) {
        suggestions.push(`What are ${context.candidateName}'s key strengths?`);
        suggestions.push(`Where does ${context.candidateName} show leadership experience?`);
      }
      suggestions.push('What technologies do they mention?');
      break;
      
    case 'evaluation_challenge':
      suggestions.push('What specific gaps led to this evaluation?');
      suggestions.push('How can this candidate improve their profile?');
      break;
      
    case 'candidate_comparison':
      suggestions.push('Compare their technical skills');
      suggestions.push('Who has more relevant experience?');
      break;
      
    default:
      if (context.candidateName) {
        suggestions.push(`Tell me about ${context.candidateName}'s background`);
      }
      suggestions.push('What are the evaluation criteria?');
      suggestions.push('How was this candidate scored?');
  }
  
  return suggestions.slice(0, 3); // Limit to 3 suggestions
}
