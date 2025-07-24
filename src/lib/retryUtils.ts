import { logger } from './logger';

// Retry utility for API calls with exponential backoff
export async function withRetry<T>(
  fn: () => Promise<T>,
  options: {
    maxRetries?: number;
    initialDelay?: number;
    maxDelay?: number;
    factor?: number;
    onRetry?: (error: Error, attempt: number) => void;
  } = {}
): Promise<T> {
  const {
    maxRetries = 3,
    initialDelay = 1000,
    maxDelay = 10000,
    factor = 2,
    onRetry
  } = options;

  let lastError: Error;
  
  for (let attempt = 0; attempt < maxRetries; attempt++) {
    try {
      return await fn();
    } catch (error) {
      lastError = error instanceof Error ? error : new Error(String(error));
      
      // Don't retry on certain errors
      if (lastError.message.includes('OPENAI_API_KEY') || 
          lastError.message.includes('401') ||
          lastError.message.includes('Invalid API key')) {
        throw lastError;
      }
      
      if (attempt < maxRetries - 1) {
        const delay = Math.min(initialDelay * Math.pow(factor, attempt), maxDelay);
        
        if (onRetry) {
          onRetry(lastError, attempt + 1);
        }
        
        logger.debug(`Retry attempt ${attempt + 1}/${maxRetries} after ${delay}ms`);
        
        await new Promise(resolve => setTimeout(resolve, delay));
      }
    }
  }
  
  throw lastError!;
}

// Specific retry for OpenAI API calls
export async function retryOpenAICall<T>(
  apiCall: () => Promise<T>,
  context?: string
): Promise<T> {
  return withRetry(apiCall, {
    maxRetries: 3,
    initialDelay: 2000,
    onRetry: (error, attempt) => {
      logger.debug(`OpenAI API retry ${attempt}/3 for ${context || 'API call'}: ${error.message}`);
    }
  });
}