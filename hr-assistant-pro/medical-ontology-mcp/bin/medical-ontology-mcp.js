#!/usr/bin/env node

/**
 * Medical Ontology MCP - NPX Wrapper
 * 
 * This script provides a Node.js wrapper around the Python Medical Ontology MCP server
 * allowing for easy installation and execution via NPX.
 */

const { spawn } = require('cross-spawn');
const { program } = require('commander');
const chalk = require('chalk');
const ora = require('ora');
const fs = require('fs');
const path = require('path');

// Package information
const packageJson = require('../package.json');

// Configure commander
program
  .name('medical-ontology-mcp')
  .description('Medical Ontology MCP Server - Clinical terminology and coding assistance')
  .version(packageJson.version);

// Check Python installation
function checkPython() {
  const spinner = ora('Checking Python installation...').start();
  
  try {
    const result = spawn.sync('python3', ['--version'], { encoding: 'utf8' });
    if (result.status === 0) {
      spinner.succeed('Python 3 found');
      return true;
    }
  } catch (error) {
    // Try 'python' command
    try {
      const result = spawn.sync('python', ['--version'], { encoding: 'utf8' });
      if (result.status === 0 && result.stdout.includes('Python 3')) {
        spinner.succeed('Python 3 found');
        return true;
      }
    } catch (error2) {
      // Python not found
    }
  }
  
  spinner.fail('Python 3 not found');
  console.log(chalk.red('\\nPython 3 is required to run Medical Ontology MCP.'));
  console.log(chalk.yellow('Please install Python 3 from: https://python.org/downloads/'));
  return false;
}

// Install Python package
function installPythonPackage() {
  const spinner = ora('Installing Medical Ontology MCP Python package...').start();
  
  try {
    const result = spawn.sync('python3', ['-m', 'pip', 'install', 'medical-ontology-mcp'], {
      stdio: 'inherit'
    });
    
    if (result.status === 0) {
      spinner.succeed('Python package installed successfully');
      return true;
    } else {
      spinner.fail('Failed to install Python package');
      return false;
    }
  } catch (error) {
    spinner.fail(`Installation failed: ${error.message}`);
    return false;
  }
}

// Check if Python package is installed
function isPythonPackageInstalled() {
  try {
    const result = spawn.sync('python3', ['-c', 'import medical_ontology_mcp'], { 
      encoding: 'utf8',
      stdio: 'pipe'
    });
    return result.status === 0;
  } catch (error) {
    return false;
  }
}

// Run Python command
function runPythonCommand(args) {
  const pythonArgs = ['-m', 'medical_ontology_mcp.cli', ...args];
  
  const child = spawn('python3', pythonArgs, {
    stdio: 'inherit',
    env: { ...process.env }
  });
  
  child.on('close', (code) => {
    process.exit(code);
  });
  
  child.on('error', (error) => {
    console.error(chalk.red(`Error: ${error.message}`));
    process.exit(1);
  });
}

// Setup command
program
  .command('setup')
  .description('Set up Medical Ontology MCP for first time use')
  .option('--data-path <path>', 'Path to medical ontology data directory', './data')
  .action(async (options) => {
    console.log(chalk.blue.bold('🏥 Medical Ontology MCP Setup\\n'));
    
    // Check Python
    if (!checkPython()) {
      process.exit(1);
    }
    
    // Install Python package if not installed
    if (!isPythonPackageInstalled()) {
      console.log(chalk.yellow('Installing Python package...'));
      if (!installPythonPackage()) {
        process.exit(1);
      }
    }
    
    // Configure for detected editors
    console.log(chalk.blue('\\nConfiguring MCP for detected editors...'));
    runPythonCommand(['configure', '--project-root', process.cwd()]);
  });

// Serve command
program
  .command('serve')
  .description('Start the Medical Ontology MCP server')
  .option('--host <host>', 'Host to bind the server to', 'localhost')
  .option('--port <port>', 'Port to bind the server to', '8080')
  .option('--data-path <path>', 'Path to medical ontology data directory', './data')
  .option('--log-level <level>', 'Logging level', 'INFO')
  .action((options) => {
    const args = ['serve'];
    
    if (options.host) args.push('--host', options.host);
    if (options.port) args.push('--port', options.port);
    if (options.dataPath) args.push('--data-path', options.dataPath);
    if (options.logLevel) args.push('--log-level', options.logLevel);
    
    runPythonCommand(args);
  });

// Configure command
program
  .command('configure')
  .description('Auto-configure MCP for detected editors')
  .option('--project-root <path>', 'Root directory of the project', '.')
  .option('--editor <editor>', 'Configure for specific editor only')
  .action((options) => {
    const args = ['configure'];
    
    if (options.projectRoot) args.push('--project-root', options.projectRoot);
    if (options.editor) args.push('--editor', options.editor);
    
    runPythonCommand(args);
  });

// Preprocess command
program
  .command('preprocess')
  .description('Preprocess medical ontology data for optimal performance')
  .option('--data-path <path>', 'Path to medical ontology data directory', './data')
  .option('--ontology <ontology>', 'Which ontology to preprocess (snomed|icd10|rxnorm|loinc|all)', 'all')
  .option('--clean', 'Clean existing processed data before preprocessing')
  .action((options) => {
    const args = ['preprocess'];
    
    if (options.dataPath) args.push('--data-path', options.dataPath);
    if (options.ontology) args.push('--ontology', options.ontology);
    if (options.clean) args.push('--clean');
    
    runPythonCommand(args);
  });

// Search command
program
  .command('search <query>')
  .description('Search medical terms across ontologies')
  .option('--ontology <ontology>', 'Specific ontology to search (SNOMED|ICD10|RxNorm|LOINC)')
  .option('--limit <limit>', 'Maximum number of results', '5')
  .option('--data-path <path>', 'Path to medical ontology data directory', './data')
  .action((query, options) => {
    const args = ['search', '--query', query];
    
    if (options.ontology) args.push('--ontology', options.ontology);
    if (options.limit) args.push('--limit', options.limit);
    if (options.dataPath) args.push('--data-path', options.dataPath);
    
    runPythonCommand(args);
  });

// Lookup command
program
  .command('lookup <code>')
  .description('Look up detailed information for a specific medical code')
  .requiredOption('--ontology <ontology>', 'Ontology the code belongs to (SNOMED|ICD10|RxNorm|LOINC)')
  .option('--data-path <path>', 'Path to medical ontology data directory', './data')
  .action((code, options) => {
    const args = ['lookup', '--code', code, '--ontology', options.ontology];
    
    if (options.dataPath) args.push('--data-path', options.dataPath);
    
    runPythonCommand(args);
  });

// Info command
program
  .command('info')
  .description('Display information about the Medical Ontology MCP server')
  .action(() => {
    runPythonCommand(['info']);
  });

// Default action for no command
program
  .action(() => {
    console.log(chalk.blue.bold('🏥 Medical Ontology MCP'));
    console.log(chalk.gray('Clinical terminology and coding assistance\\n'));
    
    console.log('Quick start:');
    console.log(chalk.green('  npx medical-ontology-mcp setup    ') + '# First-time setup');
    console.log(chalk.green('  npx medical-ontology-mcp serve    ') + '# Start MCP server');
    console.log(chalk.green('  npx medical-ontology-mcp search   ') + '# Search medical terms');
    console.log('');
    
    console.log('For more commands, run:');
    console.log(chalk.yellow('  npx medical-ontology-mcp --help'));
    console.log('');
    
    console.log('Documentation: https://medical-ontology-mcp.readthedocs.io/');
  });

// Handle SIGINT and SIGTERM
process.on('SIGINT', () => {
  console.log(chalk.yellow('\\n🛑 Shutting down Medical Ontology MCP...'));
  process.exit(0);
});

process.on('SIGTERM', () => {
  console.log(chalk.yellow('\\n🛑 Shutting down Medical Ontology MCP...'));
  process.exit(0);
});

// Parse command line arguments
program.parse();

// If no arguments provided, show help
if (process.argv.length === 2) {
  program.outputHelp();
}