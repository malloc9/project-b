# Deployment Guide

This guide covers deploying the Household Management application to Firebase Hosting.

## Prerequisites

1. **Firebase CLI**: Install the Firebase CLI globally
   ```bash
   npm install -g firebase-tools
   ```

2. **Firebase Project**: Create a Firebase project at https://console.firebase.google.com

3. **Firebase Authentication**: Enable Email/Password authentication in the Firebase console

4. **Firestore Database**: Create a Firestore database in production mode

5. **Photo Storage**: Configure photo storage (see FREE_STORAGE_SETUP.md for alternatives to Firebase Storage)

## Environment Setup

### 1. Configure Environment Variables

Copy the appropriate environment file and update with your Firebase project configuration:

**For Production:**
```bash
cp .env.production .env.local
```

**For Staging:**
```bash
cp .env.staging .env.local
```

Update the following variables in your `.env.local` file:
- `VITE_FIREBASE_API_KEY`
- `VITE_FIREBASE_AUTH_DOMAIN`
- `VITE_FIREBASE_PROJECT_ID`
- `VITE_FIREBASE_STORAGE_BUCKET`
- `VITE_FIREBASE_MESSAGING_SENDER_ID`
- `VITE_FIREBASE_APP_ID`
- `VITE_STORAGE_PROVIDER` (base64, cloudinary, imgbb, or supabase)

**Note**: For Firebase Spark (free) plan users, Firebase Storage is not available. Use one of the free alternatives documented in `FREE_STORAGE_SETUP.md`.

### 2. Firebase Project Configuration

Initialize Firebase in your project directory:
```bash
firebase login
firebase init
```

Select the following services:
- Firestore
- Functions
- Hosting
- Storage

## Build Process

### 1. Install Dependencies
```bash
npm install
```

### 2. Build the Application
```bash
npm run build
```

This command:
- Runs TypeScript compilation (`tsc -b`)
- Builds the Vite application
- Outputs to the `dist` directory

### 3. Preview Build Locally
```bash
npm run preview
```

## Deployment

### 1. Deploy Everything
```bash
npm run firebase:deploy
```

This deploys:
- Firestore rules
- Storage rules
- Cloud Functions
- Hosting

### 2. Deploy Only Hosting
```bash
npm run firebase:deploy:hosting
```

### 3. Deploy Only Rules
```bash
npm run firebase:deploy:rules
```

## Firebase Configuration

### 1. Firestore Security Rules

The application uses the following security rules (in `firestore.rules`):

```javascript
rules_version = '2';
service cloud.firestore {
  match /databases/{database}/documents {
    // Users can only access their own data
    match /users/{userId}/{document=**} {
      allow read, write: if request.auth != null && request.auth.uid == userId;
    }
  }
}
```

### 2. Photo Storage Configuration

**For Firebase Spark (Free) Plan Users**: Firebase Storage is not available. The application uses alternative storage solutions:

- **Base64 Storage** (default): Images stored in Firestore as base64 strings
- **Cloudinary**: 25GB free storage with CDN and optimization
- **ImgBB**: Unlimited storage with 32MB per image limit
- **Supabase**: 1GB free storage with modern features

See `FREE_STORAGE_SETUP.md` for detailed setup instructions.

**For Firebase Blaze Plan Users**: If you upgrade to a paid plan, you can use Firebase Storage with these rules (in `storage.rules`):

```javascript
rules_version = '2';
service firebase.storage {
  match /b/{bucket}/o {
    match /users/{userId}/{allPaths=**} {
      allow read, write: if request.auth != null && request.auth.uid == userId;
    }
  }
}
```

### 3. Firestore Indexes

Required indexes are defined in `firestore.indexes.json`. Deploy with:
```bash
firebase deploy --only firestore:indexes
```

## Cloud Functions Setup

### 1. Install Function Dependencies
```bash
cd functions
npm install
cd ..
```

### 2. Configure Function Environment Variables
```bash
# No additional configuration needed for basic functions
```

### 3. Deploy Functions
```bash
firebase deploy --only functions
```

## Environment-Specific Deployments

### Staging Deployment
```bash
# Use staging environment
cp .env.staging .env.local

# Deploy to staging project
firebase use staging-project-id
npm run firebase:deploy
```

### Production Deployment
```bash
# Use production environment
cp .env.production .env.local

# Deploy to production project
firebase use production-project-id
npm run firebase:deploy
```

## Custom Domain Setup

1. **Add Custom Domain** in Firebase Console:
   - Go to Hosting section
   - Click "Add custom domain"
   - Follow the verification steps

2. **SSL Certificate**: Firebase automatically provisions SSL certificates

3. **DNS Configuration**: Update your DNS records as instructed by Firebase

## Performance Optimization

### 1. Build Optimization

The build process includes:
- Code splitting with React.lazy()
- Tree shaking for unused code
- Asset optimization
- Compression

### 2. Caching Strategy

Firebase Hosting is configured with:
- Long-term caching for static assets (1 year)
- Proper cache headers for HTML files
- Service worker for offline functionality

### 3. CDN

Firebase Hosting automatically uses Google's global CDN for fast content delivery.

## Monitoring and Analytics

### 1. Firebase Analytics

Enable in Firebase Console and update environment variables:
```
VITE_FIREBASE_MEASUREMENT_ID=G-XXXXXXXXXX
VITE_ENABLE_ANALYTICS=true
```

### 2. Performance Monitoring

Enable Firebase Performance Monitoring:
```
VITE_ENABLE_PERFORMANCE_MONITORING=true
```

### 3. Error Tracking

The application includes built-in error logging and reporting.

## Rollback Strategy

### 1. Firebase Hosting Rollback
```bash
firebase hosting:clone source-site-id:version-id target-site-id
```

### 2. Function Rollback
```bash
# List previous versions
firebase functions:log

# Deploy previous version
git checkout previous-commit
firebase deploy --only functions
```

## Troubleshooting

### Common Issues

1. **Build Failures**
   - Check TypeScript errors: `npm run lint`
   - Verify environment variables are set
   - Clear node_modules and reinstall

2. **Deployment Failures**
   - Verify Firebase CLI is logged in: `firebase login`
   - Check project permissions
   - Verify Firebase project is selected: `firebase use --add`

3. **Runtime Errors**
   - Check browser console for errors
   - Verify Firebase configuration
   - Check Firestore security rules

### Debug Commands

```bash
# Check Firebase project status
firebase projects:list

# Test Firestore rules locally
firebase emulators:start --only firestore

# View deployment logs
firebase functions:log

# Test hosting locally
firebase serve --only hosting
```

## Security Checklist

- [ ] Environment variables are properly configured
- [ ] Firestore security rules are restrictive
- [ ] Storage security rules prevent unauthorized access
- [ ] API keys are restricted to specific domains
- [ ] HTTPS is enforced (automatic with Firebase Hosting)
- [ ] Input validation and sanitization is implemented
- [ ] User authentication is required for all protected routes

## Post-Deployment Verification

1. **Functionality Testing**
   - User registration and login
   - Plant management (CRUD operations)
   - Project management with subtasks
   - Task management
   - Calendar integration
   - Photo uploads

2. **Performance Testing**
   - Page load times
   - Image loading
   - Offline functionality
   - Mobile responsiveness

3. **Security Testing**
   - Authentication flows
   - Data access restrictions
   - File upload security

## Maintenance

### Regular Tasks

1. **Update Dependencies**
   ```bash
   npm update
   npm audit fix
   ```

2. **Monitor Usage**
   - Check Firebase usage quotas
   - Monitor function execution times
   - Review error logs

3. **Backup Strategy**
   - Firestore data export
   - Storage bucket backup
   - Code repository backup

### Updates and Patches

1. **Security Updates**: Apply immediately
2. **Feature Updates**: Test in staging first
3. **Dependency Updates**: Regular maintenance schedule

## Support

For deployment issues:
1. Check Firebase Console for error messages
2. Review application logs
3. Consult Firebase documentation
4. Contact Firebase support if needed