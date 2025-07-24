import { NextResponse } from 'next/server';

/**
 * Validates that required environment variables are present
 * Returns early error response if validation fails
 */
export function validateEnvironment() {
  const requiredVars = ['OPENAI_API_KEY'];
  const missing: string[] = [];

  for (const varName of requiredVars) {
    if (!process.env[varName]) {
      missing.push(varName);
    }
  }

  if (missing.length > 0) {
    return NextResponse.json(
      {
        error: 'Configuration Error',
        message: 'The application is not properly configured. Please contact the administrator.',
        details: process.env.NODE_ENV === 'development' 
          ? `Missing environment variables: ${missing.join(', ')}`
          : undefined
      },
      { status: 503 } // Service Unavailable
    );
  }

  return null; // All validations passed
}

/**
 * Wraps API route handlers with environment validation
 */
export function withEnvValidation(
  handler: (req: Request) => Promise<Response>
) {
  return async (req: Request) => {
    const validationError = validateEnvironment();
    if (validationError) {
      return validationError;
    }
    
    try {
      return await handler(req);
    } catch (error) {
      console.error('API route error:', error);
      
      // Check if it's an environment-related error
      if (error instanceof Error && error.message.includes('API_KEY')) {
        return NextResponse.json(
          {
            error: 'Configuration Error',
            message: 'The application is not properly configured. Please contact the administrator.'
          },
          { status: 503 }
        );
      }
      
      // Re-throw other errors to be handled by the route
      throw error;
    }
  };
}