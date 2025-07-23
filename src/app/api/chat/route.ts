// src/app/api/chat/route.ts
import { NextRequest, NextResponse } from 'next/server';
import { ChatService } from '@/lib/chatService';
import { ChatRequest, ChatResponse, ChatContext } from '@/types/chat';
import { chatRateLimiter } from '@/lib/rateLimiter';

// CORS headers configuration
const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Methods': 'GET, POST, PUT, DELETE, OPTIONS',
  'Access-Control-Allow-Headers': 'Content-Type, Authorization',
  'Access-Control-Max-Age': '86400',
};

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
            ...corsHeaders,
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
        { 
          status: 500,
          headers: corsHeaders
        }
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
    
    const { 
      query,
      candidateId,
      resumeText,
      evaluationResult,
      jobDescription,
      mustHaveAttributes,
      jobType 
    } = body;

    // Input sanitization
    const sanitizedQuery = sanitizeInput(query);

    // Input validation
    if (!sanitizedQuery || typeof sanitizedQuery !== 'string' || sanitizedQuery.trim().length === 0) {
      return NextResponse.json(
        { error: 'Query is required and must be a non-empty string' }, 
        { 
          status: 400,
          headers: corsHeaders
        }
      );
    }

    if (sanitizedQuery.length > 1000) {
      return NextResponse.json(
        { error: 'Query is too long. Please limit to 1000 characters.' }, 
        { 
          status: 400,
          headers: corsHeaders
        }
      );
    }

    // Build context with enhanced ranking information
    const context: ChatContext = {
      candidateId,
      resumeText,
      evaluationResult,
      jobDescription,
      mustHaveAttributes,
      candidateName: evaluationResult?.candidateName,
      quartileTier: evaluationResult?.quartileTier,
      quartileRank: evaluationResult?.quartileRank,
      totalCandidates: evaluationResult?.totalQualifiedForQuartile,
      jobType: jobType || evaluationResult?.jobType || 'general'
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

    return NextResponse.json(chatResponse, {
      status: 200,
      headers: corsHeaders
    });

  } catch (error) {
    if (process.env.NODE_ENV === 'development') {
      console.error('Chat API error:', error);
    }
    
    // Return appropriate error response
    if (error instanceof Error) {
      if (error.message.includes('API key')) {
        return NextResponse.json(
          { error: 'Authentication failed. Please check API configuration.' },
          { 
            status: 401,
            headers: corsHeaders
          }
        );
      }
      
      if (error.message.includes('rate limit')) {
        return NextResponse.json(
          { error: 'Rate limit exceeded. Please try again in a moment.' },
          { 
            status: 429,
            headers: corsHeaders
          }
        );
      }
    }

    return NextResponse.json(
      { 
        error: 'An unexpected error occurred while processing your request.',
        details: process.env.NODE_ENV === 'development' ? error instanceof Error ? error.message : 'Unknown error' : undefined
      }, 
      { 
        status: 500,
        headers: corsHeaders
      }
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
      if (context.quartileTier) {
        suggestions.push(`Why is this candidate in ${context.quartileTier}?`);
      }
      break;
      
    case 'candidate_comparison':
      suggestions.push('Compare their technical skills');
      suggestions.push('Who has more relevant experience?');
      break;
      
    case 'ranking_explanation':
      suggestions.push('How are quartiles calculated?');
      suggestions.push(`What's the scoring range for ${context.jobType || 'this'} job type?`);
      suggestions.push('Are all candidates ranked or just qualified ones?');
      break;
      
    case 'scoring_rationale':
      suggestions.push(`Why did they score ${context.evaluationResult?.scores?.overall || 'this'}?`);
      suggestions.push('What factors influenced this score most?');
      suggestions.push('How does job type affect scoring?');
      break;
      
    default:
      if (context.candidateName) {
        suggestions.push(`Tell me about ${context.candidateName}'s background`);
      }
      if (context.quartileTier) {
        suggestions.push(`What does ${context.quartileTier} ranking mean?`);
      }
      suggestions.push('Explain the scoring methodology');
      suggestions.push('How was this candidate ranked?');
  }
  
  return suggestions.slice(0, 3); // Limit to 3 suggestions
}

// OPTIONS handler for CORS preflight requests
export async function OPTIONS() {
  return new NextResponse(null, { 
    status: 200,
    headers: corsHeaders
  });
}
