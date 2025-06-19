# Azure OpenAI Setup Guide

## Your Azure OpenAI Configuration

- **Resource Name**: prodkmnlpopenaieastus
- **Endpoint**: https://prodkmnlpopenaieastus.openai.azure.com/
- **Location**: eastus2
- **Subscription ID**: 74255f3b-7032-489d-91fe-66dd653448f5

## Prerequisites

Before you can use Azure OpenAI with this application, you need:

1. **Deploy Models** in your Azure OpenAI resource:
   - Deploy `gpt-4` (or `gpt-4-turbo`) for evaluation
   - Deploy `gpt-4` or `gpt-3.5-turbo` for chat (as gpt-4o-mini might not be available)

2. **Get Deployment Names** from Azure Portal:
   - Go to your Azure OpenAI resource
   - Navigate to "Model deployments"
   - Note the deployment names you've created

## Testing Your Azure OpenAI Connection

1. First, test if your Azure setup works:
   ```bash
   # Edit the test file to add your API key and deployment name
   # Then run:
   node test-azure-openai.js
   ```

2. If successful, you'll see a response from the AI.

## Modifying the Application for Azure OpenAI

Since Azure OpenAI has a different API structure than OpenAI, we need to modify the application:

### Option 1: Use Azure OpenAI Node.js Library (Recommended)

```bash
npm install @azure/openai
```

### Option 2: Modify Existing OpenAI Client

The current application uses the standard OpenAI client. To use Azure OpenAI, you'll need to:

1. Update environment variables
2. Modify the OpenAI client initialization
3. Update API calls to use deployment names

## Environment Variables for Azure

Add these to your `.env.local`:

```env
# Azure OpenAI Configuration
AZURE_OPENAI_API_KEY=your_azure_api_key_here
AZURE_OPENAI_ENDPOINT=https://prodkmnlpopenaieastus.openai.azure.com
AZURE_OPENAI_API_VERSION=2024-02-15-preview
AZURE_OPENAI_DEPLOYMENT_NAME_GPT4=your-gpt4-deployment-name
AZURE_OPENAI_DEPLOYMENT_NAME_CHAT=your-chat-deployment-name
```

## Important Differences

1. **Authentication**: Azure uses `api-key` header instead of `Authorization: Bearer`
2. **Endpoints**: Azure uses deployment-specific endpoints
3. **Models**: You must use your deployment names, not model names
4. **API Version**: Azure requires an API version parameter

## Would You Like Me To:

1. Create an Azure-compatible version of the application?
2. Add a configuration toggle to switch between OpenAI and Azure OpenAI?
3. Create wrapper functions that work with both services?

Let me know which approach you'd prefer!