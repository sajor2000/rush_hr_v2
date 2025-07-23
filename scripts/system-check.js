#!/usr/bin/env node

/**
 * Azure OpenAI System Check CLI
 * Run with: npm run system:check
 */

require('dotenv').config({ path: '.env.local' });
const https = require('https');
const { AzureOpenAI } = require('openai');
const OpenAI = require('openai').default;

// Colors for terminal output
const colors = {
  reset: '\x1b[0m',
  bright: '\x1b[1m',
  red: '\x1b[31m',
  green: '\x1b[32m',
  yellow: '\x1b[33m',
  blue: '\x1b[34m',
  cyan: '\x1b[36m'
};

const log = {
  info: (msg) => console.log(`${colors.blue}ℹ${colors.reset} ${msg}`),
  success: (msg) => console.log(`${colors.green}✓${colors.reset} ${msg}`),
  warning: (msg) => console.log(`${colors.yellow}⚠${colors.reset} ${msg}`),
  error: (msg) => console.log(`${colors.red}✗${colors.reset} ${msg}`),
  header: (msg) => console.log(`\n${colors.bright}${colors.cyan}${msg}${colors.reset}\n`)
};

async function checkEnvironment() {
  log.header('🔍 Environment Configuration');
  
  const isAzure = process.env.USE_AZURE_OPENAI === 'true';
  const checks = [];
  
  if (isAzure) {
    log.info('Mode: Azure OpenAI');
    checks.push({
      name: 'Azure API Key',
      value: process.env.AZURE_OPENAI_API_KEY,
      required: true
    });
    checks.push({
      name: 'Azure Endpoint',
      value: process.env.AZURE_OPENAI_ENDPOINT,
      required: true
    });
    checks.push({
      name: 'Azure Deployment',
      value: process.env.AZURE_OPENAI_DEPLOYMENT || 'gpt-4o-2',
      required: false
    });
    checks.push({
      name: 'API Version',
      value: process.env.AZURE_OPENAI_API_VERSION || '2024-12-01-preview',
      required: false
    });
  } else {
    log.info('Mode: Standard OpenAI');
    checks.push({
      name: 'OpenAI API Key',
      value: process.env.OPENAI_API_KEY,
      required: true
    });
  }
  
  let allValid = true;
  checks.forEach(check => {
    if (check.value) {
      log.success(`${check.name}: ${check.name.includes('Key') ? '***' + check.value.slice(-4) : check.value}`);
    } else if (check.required) {
      log.error(`${check.name}: Not set`);
      allValid = false;
    } else {
      log.warning(`${check.name}: Using default`);
    }
  });
  
  return allValid;
}

async function testAzureConnection() {
  log.header('🔌 Testing Azure OpenAI Connection');
  
  try {
    const client = new AzureOpenAI({
      apiVersion: process.env.AZURE_OPENAI_API_VERSION || '2024-12-01-preview',
      azureEndpoint: process.env.AZURE_OPENAI_ENDPOINT,
      apiKey: process.env.AZURE_OPENAI_API_KEY,
    });
    
    const startTime = Date.now();
    const response = await client.chat.completions.create({
      model: process.env.AZURE_OPENAI_DEPLOYMENT || 'gpt-4o-2',
      messages: [
        { role: 'system', content: 'Reply with exactly: "Connection successful"' },
        { role: 'user', content: 'Test' }
      ],
      temperature: 0.2,
      top_p: 0.90,
      max_tokens: 10
    });
    
    const responseTime = Date.now() - startTime;
    log.success(`Connection successful (${responseTime}ms)`);
    log.info(`Response: ${response.choices[0].message.content}`);
    
    return { success: true, responseTime };
  } catch (error) {
    log.error(`Connection failed: ${error.message}`);
    return { success: false, error: error.message };
  }
}

async function testOpenAIConnection() {
  log.header('🔌 Testing OpenAI Connection');
  
  try {
    const client = new OpenAI({
      apiKey: process.env.OPENAI_API_KEY,
    });
    
    const startTime = Date.now();
    const response = await client.chat.completions.create({
      model: 'gpt-4o',
      messages: [
        { role: 'system', content: 'Reply with exactly: "Connection successful"' },
        { role: 'user', content: 'Test' }
      ],
      temperature: 0.2,
      top_p: 0.90,
      max_tokens: 10
    });
    
    const responseTime = Date.now() - startTime;
    log.success(`Connection successful (${responseTime}ms)`);
    log.info(`Response: ${response.choices[0].message.content}`);
    
    return { success: true, responseTime };
  } catch (error) {
    log.error(`Connection failed: ${error.message}`);
    return { success: false, error: error.message };
  }
}

async function estimateCosts() {
  log.header('💰 Cost Estimation');
  
  const isAzure = process.env.USE_AZURE_OPENAI === 'true';
  
  // Average tokens per operation (estimates)
  const operations = {
    'Resume Evaluation': { input: 3000, output: 500, count: 100 }, // per day estimate
    'Chat Message': { input: 500, output: 300, count: 500 },
    'Job Classification': { input: 800, output: 50, count: 50 },
    'Requirement Extraction': { input: 1000, output: 400, count: 50 }
  };
  
  // Pricing per 1K tokens (GPT-4o estimates)
  const pricing = {
    input: 0.03,   // $30 per 1M tokens
    output: 0.06   // $60 per 1M tokens
  };
  
  let totalDailyCost = 0;
  
  console.log('\nEstimated Daily Usage:');
  console.log('─'.repeat(60));
  
  Object.entries(operations).forEach(([name, op]) => {
    const inputCost = (op.input * op.count * pricing.input) / 1000;
    const outputCost = (op.output * op.count * pricing.output) / 1000;
    const opCost = inputCost + outputCost;
    totalDailyCost += opCost;
    
    console.log(`${name.padEnd(25)} ${op.count.toString().padStart(5)} ops/day   $${opCost.toFixed(2)}`);
  });
  
  console.log('─'.repeat(60));
  console.log(`${'Total Daily Cost'.padEnd(25)} ${' '.repeat(13)}   $${totalDailyCost.toFixed(2)}`);
  console.log(`${'Monthly Estimate (30d)'.padEnd(25)} ${' '.repeat(13)}   $${(totalDailyCost * 30).toFixed(2)}`);
  
  if (isAzure) {
    log.info('\nNote: Azure pricing may vary by region and agreement');
  }
}

async function performanceTest() {
  log.header('⚡ Performance Test');
  
  const isAzure = process.env.USE_AZURE_OPENAI === 'true';
  const client = isAzure ? 
    new AzureOpenAI({
      apiVersion: process.env.AZURE_OPENAI_API_VERSION || '2024-12-01-preview',
      azureEndpoint: process.env.AZURE_OPENAI_ENDPOINT,
      apiKey: process.env.AZURE_OPENAI_API_KEY,
    }) :
    new OpenAI({
      apiKey: process.env.OPENAI_API_KEY,
    });
  
  const tests = [
    { name: 'Simple Query', tokens: 50 },
    { name: 'Medium Query', tokens: 500 },
    { name: 'Complex Query', tokens: 2000 }
  ];
  
  for (const test of tests) {
    try {
      const startTime = Date.now();
      await client.chat.completions.create({
        model: isAzure ? (process.env.AZURE_OPENAI_DEPLOYMENT || 'gpt-4o-2') : 'gpt-4o',
        messages: [
          { role: 'system', content: 'You are a test assistant.' },
          { role: 'user', content: 'Generate a response.' }
        ],
        temperature: 0.2,
        top_p: 0.90,
        max_tokens: test.tokens
      });
      
      const responseTime = Date.now() - startTime;
      log.success(`${test.name}: ${responseTime}ms`);
    } catch (error) {
      log.error(`${test.name}: Failed - ${error.message}`);
    }
  }
}

async function main() {
  console.log(`${colors.bright}${colors.cyan}
╔═══════════════════════════════════════════╗
║     Azure OpenAI System Check Tool        ║
╚═══════════════════════════════════════════╝${colors.reset}`);
  
  // Check environment
  const envValid = await checkEnvironment();
  if (!envValid) {
    log.error('\nEnvironment configuration incomplete. Please check your .env.local file.');
    process.exit(1);
  }
  
  // Test connection
  const isAzure = process.env.USE_AZURE_OPENAI === 'true';
  const connectionResult = isAzure ? 
    await testAzureConnection() : 
    await testOpenAIConnection();
  
  if (!connectionResult.success) {
    log.error('\nConnection test failed. Please check your configuration.');
    process.exit(1);
  }
  
  // Performance test
  await performanceTest();
  
  // Cost estimation
  await estimateCosts();
  
  log.header('✅ System Check Complete');
  log.success('All systems operational');
  
  // Recommendations
  console.log(`\n${colors.bright}Recommendations:${colors.reset}`);
  log.info('1. Monitor your Azure portal for actual usage and costs');
  log.info('2. Set up usage alerts in Azure to prevent overspending');
  log.info('3. Consider implementing request caching for repeated queries');
  log.info('4. Use the /system-check page for real-time monitoring');
}

// Run the system check
main().catch(error => {
  log.error(`System check failed: ${error.message}`);
  process.exit(1);
});