/**
 * Firebase Configuration Validator
 * Helps debug Firebase setup issues
 */

export interface FirebaseConfigValidation {
  isValid: boolean;
  errors: string[];
  warnings: string[];
  config: Record<string, string | undefined>;
}

/**
 * Validate Firebase configuration
 */
export function validateFirebaseConfig(): FirebaseConfigValidation {
  const config = {
    apiKey: import.meta.env.VITE_FIREBASE_API_KEY,
    authDomain: import.meta.env.VITE_FIREBASE_AUTH_DOMAIN,
    projectId: import.meta.env.VITE_FIREBASE_PROJECT_ID,
    storageBucket: import.meta.env.VITE_FIREBASE_STORAGE_BUCKET,
    messagingSenderId: import.meta.env.VITE_FIREBASE_MESSAGING_SENDER_ID,
    appId: import.meta.env.VITE_FIREBASE_APP_ID,
  };

  const errors: string[] = [];
  const warnings: string[] = [];

  // Check required fields
  if (!config.apiKey) {
    errors.push('VITE_FIREBASE_API_KEY is missing');
  } else if (config.apiKey.includes('your-') || config.apiKey === 'your-actual-api-key-here') {
    errors.push('VITE_FIREBASE_API_KEY appears to be a placeholder value');
  }

  if (!config.authDomain) {
    errors.push('VITE_FIREBASE_AUTH_DOMAIN is missing');
  } else if (!config.authDomain.includes('.firebaseapp.com')) {
    warnings.push('VITE_FIREBASE_AUTH_DOMAIN should end with .firebaseapp.com');
  }

  if (!config.projectId) {
    errors.push('VITE_FIREBASE_PROJECT_ID is missing');
  } else if (config.projectId.includes('your-') || config.projectId === 'your-project-id') {
    errors.push('VITE_FIREBASE_PROJECT_ID appears to be a placeholder value');
  }

  if (!config.storageBucket) {
    errors.push('VITE_FIREBASE_STORAGE_BUCKET is missing');
  } else if (!config.storageBucket.includes('.appspot.com') && !config.storageBucket.includes('.firebasestorage.app')) {
    warnings.push('VITE_FIREBASE_STORAGE_BUCKET should end with .appspot.com or .firebasestorage.app');
  }

  if (!config.messagingSenderId) {
    errors.push('VITE_FIREBASE_MESSAGING_SENDER_ID is missing');
  } else if (config.messagingSenderId === '123456789') {
    errors.push('VITE_FIREBASE_MESSAGING_SENDER_ID appears to be a placeholder value');
  }

  if (!config.appId) {
    errors.push('VITE_FIREBASE_APP_ID is missing');
  } else if (config.appId.includes('your-') || config.appId === '1:123456789:web:abcdef123456') {
    errors.push('VITE_FIREBASE_APP_ID appears to be a placeholder value');
  }

  // Check consistency
  if (config.projectId && config.authDomain && !config.authDomain.startsWith(config.projectId)) {
    warnings.push('Project ID and Auth Domain don\'t match');
  }

  if (config.projectId && config.storageBucket && !config.storageBucket.startsWith(config.projectId)) {
    warnings.push('Project ID and Storage Bucket don\'t match');
  }

  return {
    isValid: errors.length === 0,
    errors,
    warnings,
    config
  };
}

/**
 * Log Firebase configuration validation results
 */
export function logFirebaseValidation(): void {
  const validation = validateFirebaseConfig();
  
  console.group('🔥 Firebase Configuration Validation');
  
  if (validation.isValid) {
    console.log('✅ Configuration is valid');
  } else {
    console.log('❌ Configuration has errors');
  }

  if (validation.errors.length > 0) {
    console.group('❌ Errors:');
    validation.errors.forEach(error => console.error(`  • ${error}`));
    console.groupEnd();
  }

  if (validation.warnings.length > 0) {
    console.group('⚠️ Warnings:');
    validation.warnings.forEach(warning => console.warn(`  • ${warning}`));
    console.groupEnd();
  }

  console.group('📋 Current Configuration:');
  Object.entries(validation.config).forEach(([key, value]) => {
    if (value) {
      // Mask sensitive values
      const maskedValue = key === 'apiKey' ? 
        `${value.substring(0, 8)}...${value.substring(value.length - 4)}` : 
        value;
      console.log(`  ${key}: ${maskedValue}`);
    } else {
      console.error(`  ${key}: ❌ MISSING`);
    }
  });
  console.groupEnd();

  if (!validation.isValid) {
    console.group('🔧 How to fix:');
    console.log('1. Go to https://console.firebase.google.com');
    console.log('2. Create a new project or select existing one');
    console.log('3. Go to Project Settings (gear icon)');
    console.log('4. Scroll to "Your apps" and click Web app icon');
    console.log('5. Copy the configuration values to your .env.local file');
    console.log('6. Restart your development server');
    console.groupEnd();
  }

  console.groupEnd();
}

/**
 * Test Firebase connection
 */
export async function testFirebaseConnection(): Promise<{
  success: boolean;
  error?: string;
}> {
  try {
    const validation = validateFirebaseConfig();
    
    if (!validation.isValid) {
      return {
        success: false,
        error: `Configuration invalid: ${validation.errors.join(', ')}`
      };
    }

    // Try to initialize Firebase (this will throw if config is wrong)
    const { initializeApp } = await import('firebase/app');
    const { getAuth } = await import('firebase/auth');
    
    const app = initializeApp({
      apiKey: validation.config.apiKey!,
      authDomain: validation.config.authDomain!,
      projectId: validation.config.projectId!,
      storageBucket: validation.config.storageBucket!,
      messagingSenderId: validation.config.messagingSenderId!,
      appId: validation.config.appId!,
    });

    const auth = getAuth(app);
    
    // If we get here, Firebase initialized successfully
    return { success: true };
    
  } catch (error) {
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error'
    };
  }
}

/**
 * Development helper - run validation on app start
 */
if (import.meta.env.DEV) {
  // Run validation in development mode
  setTimeout(() => {
    logFirebaseValidation();
  }, 1000);
}