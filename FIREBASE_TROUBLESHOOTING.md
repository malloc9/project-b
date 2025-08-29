# Firebase Setup & Troubleshooting Guide

## 🚨 Error: `auth/invalid-api-key`

This error occurs when Firebase cannot authenticate with your project. Here's how to fix it:

## 🔧 Step-by-Step Firebase Setup

### 1. Create a Firebase Project

1. **Go to Firebase Console**: https://console.firebase.google.com
2. **Click "Create a project"**
3. **Enter project name**: `household-management` (or your preferred name)
4. **Disable Google Analytics** (optional for free tier)
5. **Click "Create project"**

### 2. Enable Authentication

1. **In Firebase Console**, go to **Authentication**
2. **Click "Get started"**
3. **Go to "Sign-in method" tab**
4. **Enable "Email/Password"**
5. **Click "Save"**

### 3. Create Firestore Database

1. **In Firebase Console**, go to **Firestore Database**
2. **Click "Create database"**
3. **Choose "Start in test mode"** (we'll add security rules later)
4. **Select your preferred location**
5. **Click "Done"**

### 4. Get Firebase Configuration

1. **In Firebase Console**, go to **Project Settings** (gear icon)
2. **Scroll down to "Your apps"**
3. **Click "Web app" icon** (`</>`)
4. **Enter app nickname**: `household-management-web`
5. **Don't check "Firebase Hosting"** (we'll set it up separately)
6. **Click "Register app"**
7. **Copy the configuration object**

### 5. Update Environment Variables

Replace your `.env.local` file with the correct values:

```env
# Firebase Configuration (replace with your actual values)
VITE_FIREBASE_API_KEY=your-actual-api-key-here
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
```

## 🔍 Troubleshooting Steps

### Check 1: Verify Environment Variables

Run this command to check if your environment variables are loaded:

```bash
npm run dev
```

Then open browser console and run:
```javascript
console.log('Firebase Config:', {
  apiKey: import.meta.env.VITE_FIREBASE_API_KEY,
  authDomain: import.meta.env.VITE_FIREBASE_AUTH_DOMAIN,
  projectId: import.meta.env.VITE_FIREBASE_PROJECT_ID
});
```

### Check 2: Validate Firebase Project

1. **Go to Firebase Console**
2. **Select your project**
3. **Go to Project Settings**
4. **Verify the configuration matches your `.env.local`**

### Check 3: Test Firebase Connection

Create a simple test file to verify Firebase connection:

```javascript
// test-firebase.js
import { initializeApp } from 'firebase/app';
import { getAuth } from 'firebase/auth';

const firebaseConfig = {
  apiKey: "your-api-key",
  authDomain: "your-project.firebaseapp.com",
  projectId: "your-project-id",
  // ... other config
};

try {
  const app = initializeApp(firebaseConfig);
  const auth = getAuth(app);
  console.log('Firebase initialized successfully!', auth);
} catch (error) {
  console.error('Firebase initialization failed:', error);
}
```

### Check 4: Verify Project Status

1. **In Firebase Console**, check if your project shows as **Active**
2. **Check billing status** (should be Spark plan for free tier)
3. **Verify no quota exceeded warnings**

## 🆘 Common Issues & Solutions

### Issue 1: "Project not found"
**Solution**: 
- Double-check the `projectId` in your config
- Ensure the project exists in Firebase Console
- Make sure you're logged into the correct Google account

### Issue 2: "API key invalid"
**Solution**:
- Regenerate the API key in Firebase Console
- Go to Project Settings → General → Web API Key
- Click "Regenerate" and update your `.env.local`

### Issue 3: "Domain not authorized"
**Solution**:
- Go to Authentication → Settings → Authorized domains
- Add `localhost` and your domain to the list

### Issue 4: Environment variables not loading
**Solution**:
- Restart your development server: `npm run dev`
- Check file name is exactly `.env.local`
- Ensure no spaces around the `=` sign
- Variables must start with `VITE_` for Vite to load them

## 🔄 Quick Fix: Use Firebase Emulator (Development Only)

If you want to test without setting up a real Firebase project:

1. **Install Firebase CLI**:
   ```bash
   npm install -g firebase-tools
   ```

2. **Login to Firebase**:
   ```bash
   firebase login
   ```

3. **Initialize Firebase in your project**:
   ```bash
   firebase init
   ```
   - Select: Firestore, Authentication, Hosting
   - Use existing project or create new one

4. **Start emulators**:
   ```bash
   firebase emulators:start
   ```

5. **Update your `.env.local` for emulator**:
   ```env
   VITE_FIREBASE_API_KEY=demo-api-key
   VITE_FIREBASE_AUTH_DOMAIN=demo-project.firebaseapp.com
   VITE_FIREBASE_PROJECT_ID=demo-project
   VITE_FIREBASE_STORAGE_BUCKET=demo-project.appspot.com
   VITE_FIREBASE_MESSAGING_SENDER_ID=123456789
   VITE_FIREBASE_APP_ID=1:123456789:web:demo
   ```

## 🎯 Minimal Working Configuration

Here's a minimal `.env.local` that should work with a new Firebase project:

```env
# Replace 'your-project-id' with your actual Firebase project ID
VITE_FIREBASE_API_KEY=AIzaSyExample-Replace-With-Your-Actual-API-Key
VITE_FIREBASE_AUTH_DOMAIN=your-project-id.firebaseapp.com
VITE_FIREBASE_PROJECT_ID=your-project-id
VITE_FIREBASE_STORAGE_BUCKET=your-project-id.appspot.com
VITE_FIREBASE_MESSAGING_SENDER_ID=123456789
VITE_FIREBASE_APP_ID=1:123456789:web:abcdef123456

# Storage (Base64 is completely free and works immediately)
VITE_STORAGE_PROVIDER=base64

# App settings
VITE_APP_NAME=Household Management
VITE_APP_ENVIRONMENT=development
```

## 📞 Still Having Issues?

1. **Check Firebase Status**: https://status.firebase.google.com
2. **Firebase Documentation**: https://firebase.google.com/docs/web/setup
3. **Firebase Support**: https://firebase.google.com/support

## ✅ Verification Checklist

- [ ] Firebase project created and active
- [ ] Authentication enabled (Email/Password)
- [ ] Firestore database created
- [ ] Web app registered in Firebase project
- [ ] Configuration copied to `.env.local`
- [ ] Development server restarted
- [ ] No console errors about missing environment variables
- [ ] Firebase initialization successful

Once you complete these steps, the `auth/invalid-api-key` error should be resolved!