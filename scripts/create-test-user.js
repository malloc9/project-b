#!/usr/bin/env node

/**
 * Script to create a test user for development
 * Run with: node scripts/create-test-user.js
 */

import { initializeApp } from 'firebase/app';
import { getAuth, createUserWithEmailAndPassword } from 'firebase/auth';
import { getFirestore, doc, setDoc } from 'firebase/firestore';

// Firebase configuration - using environment variables
const firebaseConfig = {
  apiKey: process.env.VITE_FIREBASE_API_KEY,
  authDomain: process.env.VITE_FIREBASE_AUTH_DOMAIN,
  projectId: process.env.VITE_FIREBASE_PROJECT_ID,
  storageBucket: process.env.VITE_FIREBASE_STORAGE_BUCKET,
  messagingSenderId: process.env.VITE_FIREBASE_MESSAGING_SENDER_ID,
  appId: process.env.VITE_FIREBASE_APP_ID,
};

// Test user credentials
const TEST_EMAIL = 'test@example.com';
const TEST_PASSWORD = 'testpassword123';

async function createTestUser() {
  try {
    console.log('🔥 Initializing Firebase...');
    const app = initializeApp(firebaseConfig);
    const auth = getAuth(app);
    const db = getFirestore(app);

    console.log('👤 Creating test user...');
    const userCredential = await createUserWithEmailAndPassword(auth, TEST_EMAIL, TEST_PASSWORD);
    const user = userCredential.user;

    console.log('📝 Creating user document...');
    await setDoc(doc(db, 'users', user.uid), {
      email: user.email,
      displayName: 'Test User',
      createdAt: new Date(),
      updatedAt: new Date(),
    });

    console.log('✅ Test user created successfully!');
    console.log(`📧 Email: ${TEST_EMAIL}`);
    console.log(`🔑 Password: ${TEST_PASSWORD}`);
    console.log(`🆔 User ID: ${user.uid}`);
    
    process.exit(0);
  } catch (error) {
    console.error('❌ Error creating test user:', error.message);
    
    if (error.code === 'auth/email-already-in-use') {
      console.log('ℹ️  Test user already exists. You can use:');
      console.log(`📧 Email: ${TEST_EMAIL}`);
      console.log(`🔑 Password: ${TEST_PASSWORD}`);
    }
    
    process.exit(1);
  }
}

// Load environment variables from .env.local
import { config } from 'dotenv';
config({ path: '.env.local' });

createTestUser();