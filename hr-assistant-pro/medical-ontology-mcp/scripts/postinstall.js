#!/usr/bin/env node

/**
 * Post-install script for Medical Ontology MCP
 * 
 * This script runs after NPM installation to provide setup guidance
 */

const chalk = require('chalk');
const fs = require('fs');
const path = require('path');

console.log(chalk.blue.bold('\\n🏥 Medical Ontology MCP Installed Successfully!'));
console.log(chalk.gray('Clinical terminology and coding assistance\\n'));

// Check if this is a global installation
const isGlobal = process.env.npm_config_global === 'true';

if (isGlobal) {
  console.log(chalk.green('✅ Global installation detected'));
  console.log('You can now use the following commands anywhere:');
  console.log(chalk.yellow('  medical-ontology-mcp'));
  console.log(chalk.yellow('  medical-mcp'));
  console.log(chalk.yellow('  mcp-medical'));
} else {
  console.log(chalk.green('✅ Local installation detected'));
  console.log('You can use NPX to run commands:');
  console.log(chalk.yellow('  npx medical-ontology-mcp'));
}

console.log('\\nNext steps:');
console.log(chalk.cyan('1. Set up your first project:'));
console.log('   ' + chalk.gray(isGlobal ? 'medical-ontology-mcp setup' : 'npx medical-ontology-mcp setup'));

console.log(chalk.cyan('\\n2. Get medical ontology data:'));
console.log('   • Download from official sources (see documentation)');
console.log('   • Or use sample data for testing');

console.log(chalk.cyan('\\n3. Start the MCP server:'));
console.log('   ' + chalk.gray(isGlobal ? 'medical-ontology-mcp serve' : 'npx medical-ontology-mcp serve'));

console.log(chalk.cyan('\\n4. Configure your editor:'));
console.log('   • Claude Desktop/Code: Automatic configuration');
console.log('   • VS Code: Install MCP extension');
console.log('   • Cursor: Automatic configuration');
console.log('   • Windsurf: Manual setup (see docs)');

console.log('\\n' + chalk.blue('📖 Documentation:'));
console.log('   https://medical-ontology-mcp.readthedocs.io/');

console.log('\\n' + chalk.blue('🐛 Issues & Support:'));
console.log('   https://github.com/sajor2000/mcp_medicalterminology/issues');

console.log('\\n' + chalk.green('Happy coding! 🚀'));

// Create a sample .mcp.json if in project directory
if (!isGlobal && fs.existsSync('package.json')) {
  const mcpConfigPath = '.mcp.json';
  
  if (!fs.existsSync(mcpConfigPath)) {
    const sampleConfig = {
      mcpServers: {
        'medical-ontology': {
          command: 'npx',
          args: ['medical-ontology-mcp', 'serve'],
          env: {
            DATA_PATH: './data',
            LOG_LEVEL: 'INFO'
          }
        }
      }
    };
    
    try {
      fs.writeFileSync(mcpConfigPath, JSON.stringify(sampleConfig, null, 2));
      console.log(chalk.green('\\n✅ Created sample .mcp.json configuration'));
    } catch (error) {
      // Ignore errors
    }
  }
}