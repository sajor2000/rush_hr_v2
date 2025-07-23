/**
 * Validates required environment variables at startup
 */
export function validateEnvironment(): void {
  const requiredEnvVars = [
    'OPENAI_API_KEY'
  ];

  const missingVars = requiredEnvVars.filter(
    varName => !process.env[varName]
  );

  if (missingVars.length > 0) {
    console.error('❌ Missing required environment variables:');
    missingVars.forEach(varName => {
      console.error(`   - ${varName}`);
    });
    console.error('\n📄 Please check your .env.local file or Vercel environment settings.');
    console.error('💡 Copy .env.example to .env.local and fill in the values.\n');
    
    // In development, throw error to stop the server
    if (process.env.NODE_ENV === 'development') {
      throw new Error(`Missing required environment variables: ${missingVars.join(', ')}`);
    }
  }

  // Validate OpenAI API key format
  const apiKey = process.env.OPENAI_API_KEY;
  if (apiKey && !apiKey.startsWith('sk-')) {
    console.warn('⚠️  Warning: OPENAI_API_KEY should start with "sk-"');
    console.warn('   Please verify you\'re using a valid OpenAI API key.\n');
  }

  // Log success in development
  if (process.env.NODE_ENV === 'development') {
    console.log('✅ Environment variables validated successfully');
  }
}

// Helper to safely get environment variables with fallback
export function getEnvVar(name: string, fallback?: string): string {
  const value = process.env[name];
  
  if (!value && !fallback) {
    throw new Error(`Environment variable ${name} is not defined`);
  }
  
  return value || fallback || '';
}