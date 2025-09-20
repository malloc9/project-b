#!/usr/bin/env node

/**
 * Pre-deployment verification script
 * Checks that all required configurations are in place before deployment
 */

import fs from 'fs';
import path from 'path';
import dotenv from 'dotenv';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const rootDir = path.join(__dirname, '..');

dotenv.config({ path: path.resolve(rootDir, '.env.local') });

// Colors for console output
const colors = {
  green: '\x1b[32m',
  red: '\x1b[31m',
  yellow: '\x1b[33m',
  blue: '\x1b[34m',
  reset: '\x1b[0m'
};

function log(message, color = 'reset') {
  console.log(`${colors[color]}${message}${colors.reset}`);
}

function checkFile(filePath, description) {
  const fullPath = path.join(rootDir, filePath);
  if (fs.existsSync(fullPath)) {
    log(`✓ ${description}`, 'green');
    return true;
  } else {
    log(`✗ ${description} (${filePath} not found)`, 'red');
    return false;
  }
}

function checkEnvVar(varName, description) {
  if (process.env[varName]) {
    log(`✓ ${description}`, 'green');
    return true;
  } else {
    log(`✗ ${description} (${varName} not set)`, 'red');
    return false;
  }
}

function checkPackageScript(scriptName, description) {
  const packagePath = path.join(rootDir, 'package.json');
  if (fs.existsSync(packagePath)) {
    const packageJson = JSON.parse(fs.readFileSync(packagePath, 'utf8'));
    if (packageJson.scripts && packageJson.scripts[scriptName]) {
      log(`✓ ${description}`, 'green');
      return true;
    }
  }
  log(`✗ ${description} (${scriptName} script not found)`, 'red');
  return false;
}

async function main() {
  log('🚀 Pre-deployment Verification', 'blue');
  log('================================', 'blue');
  console.log('VITE_FIREBASE_API_KEY:', process.env.VITE_FIREBASE_API_KEY);
  
  let allChecks = true;
  
  // Check required files
  log('\n📁 Required Files:', 'yellow');
  allChecks &= checkFile('firebase.json', 'Firebase configuration');
  allChecks &= checkFile('firestore.rules', 'Firestore security rules');
  allChecks &= checkFile('firestore.indexes.json', 'Firestore indexes');
  allChecks &= checkFile('functions/package.json', 'Functions package.json');
  allChecks &= checkFile('functions/src/index.ts', 'Functions source code');
  
  // Check build files
  log('\n🔧 Build Configuration:', 'yellow');
  allChecks &= checkFile('vite.config.ts', 'Vite configuration');
  allChecks &= checkFile('tsconfig.json', 'TypeScript configuration');
  allChecks &= checkFile('tailwind.config.js', 'Tailwind configuration');
  
  // Check package scripts
  log('\n📦 Package Scripts:', 'yellow');
  allChecks &= checkPackageScript('build', 'Build script');
  allChecks &= checkPackageScript('firebase:deploy', 'Firebase deploy script');
  allChecks &= checkPackageScript('firebase:deploy:hosting', 'Hosting deploy script');
  
  // Check environment variables
  log('\n🔐 Environment Variables:', 'yellow');
  allChecks &= checkEnvVar('VITE_FIREBASE_API_KEY', 'Firebase API Key');
  allChecks &= checkEnvVar('VITE_FIREBASE_AUTH_DOMAIN', 'Firebase Auth Domain');
  allChecks &= checkEnvVar('VITE_FIREBASE_PROJECT_ID', 'Firebase Project ID');
  allChecks &= checkEnvVar('VITE_FIREBASE_MESSAGING_SENDER_ID', 'Firebase Messaging Sender ID');
  allChecks &= checkEnvVar('VITE_FIREBASE_APP_ID', 'Firebase App ID');
  
  // Check source files structure
  log('\n📂 Source Structure:', 'yellow');
  allChecks &= checkFile('src/App.tsx', 'Main App component');
  allChecks &= checkFile('src/main.tsx', 'Main entry point');
  allChecks &= checkFile('src/config/firebase.ts', 'Firebase configuration');
  allChecks &= checkFile('src/contexts/AuthContext.tsx', 'Auth context');
  
  
  // Check service files
  log('\n🔧 Service Files:', 'yellow');
  allChecks &= checkFile('src/services/authService.ts', 'Auth service');
  allChecks &= checkFile('src/services/plantService.ts', 'Plant service');
  allChecks &= checkFile('src/services/projectService.ts', 'Project service');
  allChecks &= checkFile('src/services/simpleTaskService.ts', 'Task service');
  
  
  // Check component structure
  log('\n🧩 Component Structure:', 'yellow');
  allChecks &= checkFile('src/components/auth', 'Auth components directory');
  allChecks &= checkFile('src/components/layout', 'Layout components directory');
  allChecks &= checkFile('src/components/plants', 'Plant components directory');
  allChecks &= checkFile('src/components/projects', 'Project components directory');
  allChecks &= checkFile('src/components/tasks', 'Task components directory');
  
  // Summary
  log('\n📊 Verification Summary:', 'blue');
  log('========================', 'blue');
  
  if (allChecks) {
    log('✅ All checks passed! Ready for deployment.', 'green');
    process.exit(0);
  } else {
    log('❌ Some checks failed. Please fix the issues before deploying.', 'red');
    log('\n💡 Tips:', 'yellow');
    log('- Make sure all environment variables are set in .env.local', 'yellow');
    log('- Run "npm install" to ensure all dependencies are installed', 'yellow');
    log('- Check that Firebase is properly initialized', 'yellow');
    log('- Verify all source files are present and properly structured', 'yellow');
    process.exit(1);
  }
}

main().catch(error => {
  log(`Error during verification: ${error.message}`, 'red');
  process.exit(1);
});