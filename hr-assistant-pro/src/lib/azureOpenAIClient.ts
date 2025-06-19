import { AzureOpenAI } from 'openai';

// Azure OpenAI configuration - matching your example exactly
export const AZURE_CONFIG = {
  endpoint: process.env.AZURE_OPENAI_ENDPOINT || 'https://prodkmnlpopenaieastus.openai.azure.com/',
  apiKey: process.env.AZURE_OPENAI_API_KEY || '',
  apiVersion: process.env.AZURE_OPENAI_API_VERSION || '2024-12-01-preview',
  deploymentName: process.env.AZURE_OPENAI_DEPLOYMENT || 'gpt-4o-2',
  modelName: process.env.AZURE_OPENAI_MODEL_NAME || 'gpt-4o',
  useAzure: process.env.USE_AZURE_OPENAI === 'true'
};

let azureClient: AzureOpenAI | null = null;

export function getAzureOpenAIClient(): AzureOpenAI {
  if (!azureClient) {
    if (!AZURE_CONFIG.apiKey) {
      throw new Error('AZURE_OPENAI_API_KEY environment variable is not set');
    }
    
    // Create client exactly as in your Python example
    azureClient = new AzureOpenAI({
      apiVersion: AZURE_CONFIG.apiVersion,
      azureEndpoint: AZURE_CONFIG.endpoint, // Note: changed from 'endpoint' to 'azureEndpoint'
      apiKey: AZURE_CONFIG.apiKey,
    });
  }
  
  return azureClient;
}

export function isUsingAzure(): boolean {
  return AZURE_CONFIG.useAzure;
}