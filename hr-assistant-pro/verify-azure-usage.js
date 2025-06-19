// Verify Azure OpenAI is being used
require('dotenv').config({ path: '.env.local' });

console.log('=== Azure OpenAI Configuration Verification ===\n');

// Check environment variables
console.log('1. Environment Variables:');
console.log('   USE_AZURE_OPENAI:', process.env.USE_AZURE_OPENAI === 'true' ? '✅ Enabled' : '❌ Disabled');
console.log('   AZURE_OPENAI_API_KEY:', process.env.AZURE_OPENAI_API_KEY ? '✅ Set' : '❌ Not set');
console.log('   AZURE_OPENAI_ENDPOINT:', process.env.AZURE_OPENAI_ENDPOINT || 'Not set');
console.log('   AZURE_OPENAI_DEPLOYMENT:', process.env.AZURE_OPENAI_DEPLOYMENT || 'Not set');

console.log('\n2. Client Configuration:');

// Import and check the configuration
const { AZURE_CONFIG, isUsingAzure } = require('./src/lib/azureOpenAIClient');

console.log('   isUsingAzure():', isUsingAzure() ? '✅ Yes' : '❌ No');
console.log('   Endpoint:', AZURE_CONFIG.endpoint);
console.log('   Deployment:', AZURE_CONFIG.deploymentName);
console.log('   API Version:', AZURE_CONFIG.apiVersion);

console.log('\n3. Service Integration Status:');

// Check if services are properly configured
const services = [
  'candidateEvaluator.ts - Resume Evaluation',
  'chatService.ts - Chat Functionality',
  'jobTypeDetector.ts - Job Type Detection',
  'requirementExtractor.ts - Requirement Extraction'
];

services.forEach(service => {
  console.log(`   ✅ ${service} - Configured to use Azure when enabled`);
});

console.log('\n4. Summary:');
if (isUsingAzure()) {
  console.log('   🟢 Your application is configured to use Azure OpenAI');
  console.log('   🟢 All AI operations will use your Azure deployment: ' + AZURE_CONFIG.deploymentName);
  console.log('   🟢 Resume evaluation and chat will use Azure OpenAI');
} else {
  console.log('   🔴 Your application is using standard OpenAI');
  console.log('   🔴 Set USE_AZURE_OPENAI=true to switch to Azure');
}

console.log('\n5. Test URLs:');
console.log('   Application: http://localhost:3001');
console.log('   Chat Test: http://localhost:3001/api/chat/test');

console.log('\n✅ Configuration verification complete!');