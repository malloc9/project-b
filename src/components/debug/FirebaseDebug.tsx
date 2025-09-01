import { useState } from 'react';
import { validateFirebaseConfig, testFirebaseConnection } from '../../utils/firebaseValidator';

export function FirebaseDebug() {
  const [testResult, setTestResult] = useState<{ success: boolean; error?: string } | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [isMinimized, setIsMinimized] = useState(true);

  const validation = validateFirebaseConfig();

  const handleTestConnection = async () => {
    setIsLoading(true);
    try {
      const result = await testFirebaseConnection();
      setTestResult(result);
    } catch (error) {
      setTestResult({
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error'
      });
    } finally {
      setIsLoading(false);
    }
  };

  // Only show in development
  if (import.meta.env.PROD) {
    return null;
  }

  return (
    <div className="fixed top-4 left-4 z-40">
      {isMinimized ? (
        // Minimized view - just a small indicator
        <button
          onClick={() => setIsMinimized(false)}
          className={`w-8 h-8 rounded-full shadow-lg flex items-center justify-center text-white text-xs font-bold ${
            validation.isValid ? 'bg-green-500 hover:bg-green-600' : 'bg-red-500 hover:bg-red-600'
          }`}
          title="Firebase Debug Info"
        >
          🔥
        </button>
      ) : (
        // Expanded view
        <div className="bg-white border border-gray-300 rounded-lg shadow-lg p-4 max-w-md">
          <div className="flex items-center justify-between mb-3">
            <h3 className="text-sm font-semibold text-gray-900">🔥 Firebase Debug</h3>
            <div className="flex items-center space-x-2">
              <div className={`w-3 h-3 rounded-full ${validation.isValid ? 'bg-green-500' : 'bg-red-500'}`}></div>
              <button
                onClick={() => setIsMinimized(true)}
                className="text-gray-400 hover:text-gray-600 text-xs"
                title="Minimize"
              >
                ✕
              </button>
            </div>
          </div>

          <div className="space-y-2 text-xs">
            <div>
              <span className="font-medium">Status: </span>
              <span className={validation.isValid ? 'text-green-600' : 'text-red-600'}>
                {validation.isValid ? 'Valid' : 'Invalid'}
              </span>
            </div>

            {validation.errors.length > 0 && (
              <div>
                <span className="font-medium text-red-600">Errors:</span>
                <ul className="list-disc list-inside text-red-600 ml-2">
                  {validation.errors.map((error, index) => (
                    <li key={index}>{error}</li>
                  ))}
                </ul>
              </div>
            )}

            {validation.warnings.length > 0 && (
              <div>
                <span className="font-medium text-yellow-600">Warnings:</span>
                <ul className="list-disc list-inside text-yellow-600 ml-2">
                  {validation.warnings.map((warning, index) => (
                    <li key={index}>{warning}</li>
                  ))}
                </ul>
              </div>
            )}

            <div className="pt-2 border-t border-gray-200">
              <button
                onClick={handleTestConnection}
                disabled={isLoading || !validation.isValid}
                className="w-full bg-blue-500 text-white px-3 py-1 rounded text-xs hover:bg-blue-600 disabled:bg-gray-300"
              >
                {isLoading ? 'Testing...' : 'Test Connection'}
              </button>
            </div>

            {testResult && (
              <div className={`p-2 rounded text-xs ${testResult.success ? 'bg-green-50 text-green-700' : 'bg-red-50 text-red-700'}`}>
                {testResult.success ? '✅ Connection successful!' : `❌ ${testResult.error}`}
              </div>
            )}

            <div className="pt-2 border-t border-gray-200 text-xs text-gray-500">
              <p>Check browser console for detailed logs</p>
              <p>See FIREBASE_TROUBLESHOOTING.md for setup help</p>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}