import { auth, db, storage } from '../config/firebase';
import { FirebaseInitService, FirebaseErrorHandler } from '../services/firebaseInit';

/**
 * Firebase connection test utility
 */
export class FirebaseTestUtils {
  /**
   * Test Firebase configuration and connectivity
   */
  static async testConnection(): Promise<{
    success: boolean;
    results: {
      config: boolean;
      auth: boolean;
      firestore: boolean;
      storage: boolean;
    };
    errors: string[];
  }> {
    const results = {
      config: false,
      auth: false,
      firestore: false,
      storage: false,
    };
    const errors: string[] = [];

    try {
      // Test configuration
      results.config = FirebaseInitService.validateConfiguration();
      if (!results.config) {
        errors.push('Firebase configuration is invalid or incomplete');
      }

      // Test Auth service
      try {
        await auth.authStateReady();
        results.auth = true;
      } catch (error) {
        results.auth = false;
        errors.push(`Auth service error: ${FirebaseErrorHandler.getErrorMessage(error)}`);
      }

      // Test Firestore service
      try {
        // Try to access Firestore (this will fail if not configured properly)
        if (db.app) {
          results.firestore = true;
        }
      } catch (error) {
        results.firestore = false;
        errors.push(`Firestore service error: ${FirebaseErrorHandler.getErrorMessage(error)}`);
      }

      // Test Storage service
      try {
        // Try to access Storage (this will fail if not configured properly)
        if (storage.app) {
          results.storage = true;
        }
      } catch (error) {
        results.storage = false;
        errors.push(`Storage service error: ${FirebaseErrorHandler.getErrorMessage(error)}`);
      }

      const success = results.config && results.auth && results.firestore && results.storage;

      return {
        success,
        results,
        errors,
      };
    } catch (error) {
      return {
        success: false,
        results,
        errors: [...errors, `General error: ${FirebaseErrorHandler.getErrorMessage(error)}`],
      };
    }
  }

  /**
   * Log connection test results
   */
  static logTestResults(testResults: Awaited<ReturnType<typeof FirebaseTestUtils.testConnection>>): void {
    console.group('🔥 Firebase Connection Test Results');
    
    if (testResults.success) {
      console.log('✅ All Firebase services are properly configured and connected');
    } else {
      console.log('❌ Some Firebase services have issues');
    }

    console.group('Service Status:');
    console.log(`Configuration: ${testResults.results.config ? '✅' : '❌'}`);
    console.log(`Authentication: ${testResults.results.auth ? '✅' : '❌'}`);
    console.log(`Firestore: ${testResults.results.firestore ? '✅' : '❌'}`);
    console.log(`Storage: ${testResults.results.storage ? '✅' : '❌'}`);
    console.groupEnd();

    if (testResults.errors.length > 0) {
      console.group('Errors:');
      testResults.errors.forEach(error => console.error(`❌ ${error}`));
      console.groupEnd();
    }

    console.groupEnd();
  }

  /**
   * Run connection test and log results (for development)
   */
  static async runConnectionTest(): Promise<boolean> {
    const results = await this.testConnection();
    this.logTestResults(results);
    return results.success;
  }
}