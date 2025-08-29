# Firebase Setup Instructions

This document provides step-by-step instructions for setting up Firebase for the Household Management application.

## Prerequisites

1. Node.js and npm installed
2. Firebase CLI installed (`npm install -g firebase-tools`)
3. A Google account

## Firebase Project Setup

### 1. Create a Firebase Project

1. Go to the [Firebase Console](https://console.firebase.google.com/)
2. Click "Create a project"
3. Enter a project name (e.g., "household-management")
4. Choose whether to enable Google Analytics (optional)
5. Click "Create project"

### 2. Enable Firebase Services

#### Authentication
1. In the Firebase Console, go to "Authentication"
2. Click "Get started"
3. Go to the "Sign-in method" tab
4. Enable "Email/Password" authentication
5. Optionally enable "Email link (passwordless sign-in)"

#### Firestore Database
1. Go to "Firestore Database"
2. Click "Create database"
3. Choose "Start in test mode" (we'll deploy security rules later)
4. Select a location for your database

#### Storage
1. Go to "Storage"
2. Click "Get started"
3. Choose "Start in test mode" (we'll deploy security rules later)
4. Select a location for your storage

#### Functions (Optional for Calendar Integration)
1. Go to "Functions"
2. Click "Get started"
3. Follow the setup instructions if you plan to use calendar integration

### 3. Get Firebase Configuration

1. In the Firebase Console, go to "Project settings" (gear icon)
2. Scroll down to "Your apps" section
3. Click "Add app" and select the web icon (</>)
4. Register your app with a nickname
5. Copy the Firebase configuration object

### 4. Configure Environment Variables

1. Copy `.env.example` to `.env.local`
2. Fill in the Firebase configuration values:

```env
VITE_FIREBASE_API_KEY=your_api_key_here
VITE_FIREBASE_AUTH_DOMAIN=your_project_id.firebaseapp.com
VITE_FIREBASE_PROJECT_ID=your_project_id
VITE_FIREBASE_STORAGE_BUCKET=your_project_id.appspot.com
VITE_FIREBASE_MESSAGING_SENDER_ID=your_messaging_sender_id
VITE_FIREBASE_APP_ID=your_app_id
```

## Firebase CLI Setup

### 1. Login to Firebase

```bash
firebase login
```

### 2. Initialize Firebase in Your Project

```bash
firebase init
```

Select the following services:
- Firestore
- Storage
- Hosting
- Functions (if needed for calendar integration)

Choose your existing Firebase project when prompted.

### 3. Deploy Security Rules

```bash
# Deploy Firestore rules
firebase deploy --only firestore:rules

# Deploy Storage rules
firebase deploy --only storage
```

### 4. Deploy Firestore Indexes

```bash
firebase deploy --only firestore:indexes
```

## Development with Emulators

For local development, you can use Firebase emulators:

### 1. Start Emulators

```bash
firebase emulators:start
```

This will start:
- Authentication Emulator (port 9099)
- Firestore Emulator (port 8080)
- Storage Emulator (port 9199)
- Functions Emulator (port 5001)
- Hosting Emulator (port 5000)
- Emulator UI (port 4000)

### 2. Configure App for Emulators

The app will automatically detect development mode and connect to emulators when running `npm run dev`.

## Security Rules

### Firestore Rules
The Firestore security rules ensure that:
- Users can only access their own data
- All collections are properly isolated by user ID
- Proper authentication is required for all operations

### Storage Rules
The Storage security rules ensure that:
- Users can only upload/access files in their own directories
- Only image files are allowed for plant photos
- File size is limited to 10MB
- Proper authentication is required for all operations

## Deployment

### 1. Build the Application

```bash
npm run build
```

### 2. Deploy to Firebase Hosting

```bash
firebase deploy --only hosting
```

### 3. Deploy All Services

```bash
firebase deploy
```

## Troubleshooting

### Common Issues

1. **Permission Denied Errors**
   - Ensure security rules are deployed
   - Check that user is properly authenticated
   - Verify user ID matches in security rules

2. **Environment Variables Not Loading**
   - Ensure `.env.local` file exists
   - Restart the development server after adding environment variables
   - Check that variable names start with `VITE_`

3. **Emulator Connection Issues**
   - Ensure emulators are running before starting the app
   - Check that ports are not in use by other applications
   - Clear browser cache and local storage

### Getting Help

- [Firebase Documentation](https://firebase.google.com/docs)
- [Firebase Console](https://console.firebase.google.com/)
- [Firebase CLI Reference](https://firebase.google.com/docs/cli)