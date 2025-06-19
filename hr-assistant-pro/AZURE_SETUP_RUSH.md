# Azure OpenAI Setup for Rush University

## Your Azure OpenAI Details

- **Resource Name**: prodkmnlpopenaieastus
- **Endpoint**: https://prodkmnlpopenaieastus.openai.azure.com/
- **Location**: eastus2
- **Deployment**: gpt-4o-2 (based on your example)

## Setup Instructions

### 1. Create/Update your `.env.local` file

Add the following lines to your `.env.local` file:

```env
# Enable Azure OpenAI
USE_AZURE_OPENAI=true

# Azure OpenAI Configuration
AZURE_OPENAI_API_KEY=your_actual_api_key_here
AZURE_OPENAI_ENDPOINT=https://prodkmnlpopenaieastus.openai.azure.com/
AZURE_OPENAI_DEPLOYMENT=gpt-4o-2
AZURE_OPENAI_API_VERSION=2024-12-01-preview

# Keep the OpenAI key commented out or removed
# OPENAI_API_KEY=not_needed_when_using_azure
```

### 2. Test Your Azure Connection

Run the test script to verify your setup:

```bash
node test-azure-integration.js
```

You should see:
- ✅ Success! Response: Azure OpenAI connection successful!

### 3. Run the Application

```bash
npm run dev
```

The application will now use Azure OpenAI for:
- Resume evaluation
- Chat functionality
- Job type detection
- Requirement extraction

## Important Notes

1. **Model Deployment**: The application uses your `gpt-4o-2` deployment for all AI operations.

2. **Cost Considerations**: Azure OpenAI pricing may differ from standard OpenAI. Monitor your usage in the Azure portal.

3. **Regional Availability**: Your resource is in eastus2, which should provide good performance.

4. **API Limits**: Check your Azure subscription for any rate limits or quotas.

## Troubleshooting

If you encounter issues:

1. **401 Unauthorized**: Check your API key is correct
2. **404 Not Found**: Verify the deployment name `gpt-4o-2` exists
3. **Connection Timeout**: Check network/firewall settings
4. **Rate Limits**: Azure has different rate limits than OpenAI

## Switching Back to OpenAI

To switch back to standard OpenAI, simply change in `.env.local`:
```env
USE_AZURE_OPENAI=false
OPENAI_API_KEY=your_openai_key_here
```

## Security Note

Never commit your `.env.local` file with API keys to git. The `.gitignore` file should already exclude it.