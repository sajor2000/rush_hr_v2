// Test Azure OpenAI Integration
require('dotenv').config({ path: '.env.local' });

async function testAzureIntegration() {
  console.log('Testing Azure OpenAI Integration...\n');
  
  // Show current configuration
  console.log('Configuration:');
  console.log('USE_AZURE_OPENAI:', process.env.USE_AZURE_OPENAI);
  console.log('AZURE_OPENAI_ENDPOINT:', process.env.AZURE_OPENAI_ENDPOINT);
  console.log('AZURE_OPENAI_DEPLOYMENT:', process.env.AZURE_OPENAI_DEPLOYMENT);
  console.log('AZURE_OPENAI_API_KEY:', process.env.AZURE_OPENAI_API_KEY ? '✓ Set' : '✗ Not set');
  console.log('AZURE_OPENAI_API_VERSION:', process.env.AZURE_OPENAI_API_VERSION || '2024-12-01-preview');
  console.log('\n');

  if (process.env.USE_AZURE_OPENAI !== 'true') {
    console.log('❌ Azure OpenAI is not enabled. Set USE_AZURE_OPENAI=true in .env.local');
    return;
  }

  if (!process.env.AZURE_OPENAI_API_KEY) {
    console.log('❌ AZURE_OPENAI_API_KEY is not set in .env.local');
    return;
  }

  // Test the Azure OpenAI connection
  try {
    const { AzureOpenAI } = require('openai');
    
    const client = new AzureOpenAI({
      apiVersion: process.env.AZURE_OPENAI_API_VERSION || '2024-12-01-preview',
      endpoint: process.env.AZURE_OPENAI_ENDPOINT || 'https://prodkmnlpopenaieastus.openai.azure.com/',
      apiKey: process.env.AZURE_OPENAI_API_KEY,
    });

    console.log('🔄 Testing Azure OpenAI connection...\n');

    const response = await client.chat.completions.create({
      model: process.env.AZURE_OPENAI_DEPLOYMENT || 'gpt-4o-2',
      messages: [
        {
          role: 'system',
          content: 'You are a helpful assistant. Reply with exactly: "Azure OpenAI connection successful!"'
        },
        {
          role: 'user',
          content: 'Test connection'
        }
      ],
      max_tokens: 50,
      temperature: 0
    });

    console.log('✅ Success! Response:', response.choices[0].message.content);
    console.log('\nYour Azure OpenAI setup is working correctly!');
    console.log('\nNext steps:');
    console.log('1. Run the application with: npm run dev');
    console.log('2. Test resume evaluation and chat features');
    console.log('3. Both should now use Azure OpenAI instead of standard OpenAI');
    
  } catch (error) {
    console.error('❌ Error:', error.message);
    console.log('\nTroubleshooting:');
    console.log('1. Verify your API key is correct');
    console.log('2. Check if the deployment name "' + (process.env.AZURE_OPENAI_DEPLOYMENT || 'gpt-4o-2') + '" exists in your Azure resource');
    console.log('3. Ensure your Azure resource is in the eastus2 region');
    console.log('4. Check if your API key has the necessary permissions');
  }
}

testAzureIntegration();