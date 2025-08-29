#!/usr/bin/env node

/**
 * Firebase Setup Helper Script
 * Helps users set up Firebase configuration correctly
 */

import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const rootDir = path.join(__dirname, '..');

// Colors for console output
const colors = {
  green: '\x1b[32m',
  red: '\x1b[31m',
  yellow: '\x1b[33m',
  blue: '\x1b[34m',
  cyan: '\x1b[36m',
  reset: '\x1b[0m',
  bold: '\x1b[1m'
};

function log(message, color = 'reset') {
  console.log(`${colors[color]}${message}${colors.reset}`);
}

function createEnvTemplate() {
  const envTemplate = `# Firebase Configuration
# Get these values from https://console.firebase.google.com
# Go to Project Settings → Your apps → Web app

VITE_FIREBASE_API_KEY=your-api-key-here
VITE_FIREBASE_AUTH_DOMAIN=your-project-id.firebaseapp.com
VITE_FIREBASE_PROJECT_ID=your-project-id
VITE_FIREBASE_STORAGE_BUCKET=your-project-id.appspot.com
VITE_FIREBASE_MESSAGING_SENDER_ID=your-sender-id
VITE_FIREBASE_APP_ID=your-app-id

# Application Settings
VITE_APP_NAME=Household Management
VITE_APP_VERSION=1.0.0
VITE_APP_ENVIRONMENT=development

# Feature Flags
VITE_ENABLE_ANALYTICS=false
VITE_ENABLE_PERFORMANCE_MONITORING=true
VITE_ENABLE_OFFLINE_MODE=true

# Storage Configuration (Base64 is completely free)
VITE_STORAGE_PROVIDER=base64

# Optional: Other storage providers (uncomment to use)
# VITE_CLOUDINARY_CLOUD_NAME=your-cloud-name
# VITE_CLOUDINARY_UPLOAD_PRESET=your-upload-preset
# VITE_IMGBB_API_KEY=your-imgbb-api-key
# VITE_SUPABASE_URL=https://your-project.supabase.co
# VITE_SUPABASE_ANON_KEY=your-anon-key
`;

  const envPath = path.join(rootDir, '.env.local');
  
  if (fs.existsSync(envPath)) {
    log('⚠️  .env.local already exists. Creating .env.local.template instead.', 'yellow');
    fs.writeFileSync(path.join(rootDir, '.env.local.template'), envTemplate);
    log('✅ Created .env.local.template', 'green');
  } else {
    fs.writeFileSync(envPath, envTemplate);
    log('✅ Created .env.local', 'green');
  }
}

function printInstructions() {
  log('\n🔥 Firebase Setup Instructions', 'bold');
  log('================================', 'blue');
  
  log('\n📋 Step 1: Create Firebase Project', 'cyan');
  log('1. Go to https://console.firebase.google.com');
  log('2. Click "Create a project"');
  log('3. Enter project name (e.g., "household-management")');
  log('4. Disable Google Analytics (optional)');
  log('5. Click "Create project"');

  log('\n🔐 Step 2: Enable Authentication', 'cyan');
  log('1. In Firebase Console, go to Authentication');
  log('2. Click "Get started"');
  log('3. Go to "Sign-in method" tab');
  log('4. Enable "Email/Password"');
  log('5. Click "Save"');

  log('\n🗄️  Step 3: Create Firestore Database', 'cyan');
  log('1. In Firebase Console, go to Firestore Database');
  log('2. Click "Create database"');
  log('3. Choose "Start in test mode"');
  log('4. Select your preferred location');
  log('5. Click "Done"');

  log('\n⚙️  Step 4: Get Web App Configuration', 'cyan');
  log('1. In Firebase Console, go to Project Settings (gear icon)');
  log('2. Scroll to "Your apps" section');
  log('3. Click the Web app icon (</>)');
  log('4. Enter app nickname (e.g., "household-management-web")');
  log('5. Click "Register app"');
  log('6. Copy the configuration object');

  log('\n📝 Step 5: Update Environment Variables', 'cyan');
  log('1. Open .env.local in your project root');
  log('2. Replace the placeholder values with your Firebase config:');
  log('   - VITE_FIREBASE_API_KEY');
  log('   - VITE_FIREBASE_AUTH_DOMAIN');
  log('   - VITE_FIREBASE_PROJECT_ID');
  log('   - VITE_FIREBASE_STORAGE_BUCKET');
  log('   - VITE_FIREBASE_MESSAGING_SENDER_ID');
  log('   - VITE_FIREBASE_APP_ID');

  log('\n🚀 Step 6: Start Development Server', 'cyan');
  log('1. Save your .env.local file');
  log('2. Restart your development server: npm run dev');
  log('3. Check the Firebase Debug panel in the bottom-right corner');
  log('4. Look for validation results in the browser console');

  log('\n🆘 Troubleshooting', 'yellow');
  log('- If you see "auth/invalid-api-key", double-check your API key');
  log('- If variables aren\'t loading, restart the dev server');
  log('- Check FIREBASE_TROUBLESHOOTING.md for detailed help');
  log('- The Firebase Debug panel shows real-time validation');

  log('\n💡 Tips', 'green');
  log('- Base64 storage is completely free and works immediately');
  log('- You can upgrade to Cloudinary later for better features');
  log('- Keep your .env.local file private (it\'s in .gitignore)');
  log('- Use different projects for development and production');
}

function checkCurrentConfig() {
  const envPath = path.join(rootDir, '.env.local');
  
  if (!fs.existsSync(envPath)) {
    log('❌ No .env.local file found', 'red');
    return false;
  }

  const envContent = fs.readFileSync(envPath, 'utf8');
  const hasPlaceholders = envContent.includes('your-api-key-here') || 
                         envContent.includes('your-project-id') ||
                         envContent.includes('your-sender-id');

  if (hasPlaceholders) {
    log('⚠️  .env.local contains placeholder values', 'yellow');
    return false;
  }

  log('✅ .env.local exists and appears configured', 'green');
  return true;
}

async function main() {
  log('🔥 Firebase Setup Helper', 'bold');
  log('========================', 'blue');

  const isConfigured = checkCurrentConfig();

  if (!isConfigured) {
    log('\n📝 Creating environment template...', 'cyan');
    createEnvTemplate();
  }

  printInstructions();

  if (isConfigured) {
    log('\n✅ Your Firebase configuration appears to be set up!', 'green');
    log('If you\'re still seeing errors, check the browser console and Firebase Debug panel.', 'green');
  } else {
    log('\n🎯 Next Steps:', 'bold');
    log('1. Follow the instructions above to create your Firebase project', 'yellow');
    log('2. Update the .env.local file with your actual Firebase configuration', 'yellow');
    log('3. Restart your development server: npm run dev', 'yellow');
  }
}

main().catch(error => {
  log(`Error: ${error.message}`, 'red');
  process.exit(1);
});