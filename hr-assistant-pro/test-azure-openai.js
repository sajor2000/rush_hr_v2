// Test script for Azure OpenAI
const https = require('https');

// Azure OpenAI Configuration
const AZURE_ENDPOINT = 'https://prodkmnlpopenaieastus.openai.azure.com';
const AZURE_API_KEY = 'YOUR_API_KEY_HERE'; // Replace with your actual API key
const DEPLOYMENT_NAME = 'gpt-4'; // Replace with your actual deployment name
const API_VERSION = '2024-02-15-preview';

// Test message
const testPayload = {
  messages: [
    {
      role: 'system',
      content: 'You are a helpful assistant.'
    },
    {
      role: 'user',
      content: 'Say hello and confirm you are working.'
    }
  ],
  temperature: 0.7,
  max_tokens: 100
};

// Construct the URL
const url = `${AZURE_ENDPOINT}/openai/deployments/${DEPLOYMENT_NAME}/chat/completions?api-version=${API_VERSION}`;

console.log('Testing Azure OpenAI connection...');
console.log('Endpoint:', url);

// Parse URL
const urlParts = new URL(url);

const options = {
  hostname: urlParts.hostname,
  port: 443,
  path: urlParts.pathname + urlParts.search,
  method: 'POST',
  headers: {
    'Content-Type': 'application/json',
    'api-key': AZURE_API_KEY
  }
};

const req = https.request(options, (res) => {
  let data = '';

  res.on('data', (chunk) => {
    data += chunk;
  });

  res.on('end', () => {
    console.log('\nStatus Code:', res.statusCode);
    console.log('Response:', data);
    
    if (res.statusCode === 200) {
      const response = JSON.parse(data);
      console.log('\n✅ Success! Azure OpenAI is working.');
      console.log('Assistant response:', response.choices[0].message.content);
    } else {
      console.log('\n❌ Error:', data);
      console.log('\nPossible issues:');
      console.log('1. Check if the deployment name is correct');
      console.log('2. Verify the API key is valid');
      console.log('3. Ensure the model is deployed in your Azure resource');
    }
  });
});

req.on('error', (error) => {
  console.error('\n❌ Connection error:', error.message);
});

req.write(JSON.stringify(testPayload));
req.end();