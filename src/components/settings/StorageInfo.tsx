import { UnifiedStorageService } from '../../services/unifiedStorageService';

export function StorageInfo() {
  const providerInfo = UnifiedStorageService.getProviderInfo();
  const currentProvider = UnifiedStorageService.getProvider();

  return (
    <div className="bg-white rounded-lg shadow p-6">
      <h3 className="text-lg font-semibold text-gray-900 mb-4">Photo Storage</h3>
      
      <div className="space-y-4">
        <div>
          <div className="flex items-center justify-between">
            <span className="text-sm font-medium text-gray-700">Current Provider</span>
            <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-blue-100 text-blue-800">
              {providerInfo.name}
            </span>
          </div>
          <p className="text-sm text-gray-600 mt-1">{providerInfo.description}</p>
        </div>

        <div>
          <span className="text-sm font-medium text-gray-700">Free Tier Limit</span>
          <p className="text-sm text-gray-600">{providerInfo.freeLimit}</p>
        </div>

        <div>
          <span className="text-sm font-medium text-gray-700">Features</span>
          <ul className="text-sm text-gray-600 mt-1 space-y-1">
            {providerInfo.features.map((feature, index) => (
              <li key={index} className="flex items-center">
                <svg className="w-4 h-4 text-green-500 mr-2" fill="currentColor" viewBox="0 0 20 20">
                  <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" />
                </svg>
                {feature}
              </li>
            ))}
          </ul>
        </div>

        {currentProvider === 'base64' && (
          <div className="bg-blue-50 border border-blue-200 rounded-md p-3">
            <div className="flex">
              <svg className="w-5 h-5 text-blue-400 mr-2" fill="currentColor" viewBox="0 0 20 20">
                <path fillRule="evenodd" d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7-4a1 1 0 11-2 0 1 1 0 012 0zM9 9a1 1 0 000 2v3a1 1 0 001 1h1a1 1 0 100-2v-3a1 1 0 00-1-1H9z" clipRule="evenodd" />
              </svg>
              <div>
                <h4 className="text-sm font-medium text-blue-800">Using Free Storage</h4>
                <p className="text-sm text-blue-700 mt-1">
                  You're using Base64 storage which is completely free but has size limitations. 
                  For production use with many photos, consider upgrading to Cloudinary or another provider.
                </p>
              </div>
            </div>
          </div>
        )}

        <div className="text-xs text-gray-500">
          <p>
            To change storage providers, update the <code className="bg-gray-100 px-1 rounded">VITE_STORAGE_PROVIDER</code> environment variable.
            See <code className="bg-gray-100 px-1 rounded">FREE_STORAGE_SETUP.md</code> for setup instructions.
          </p>
        </div>
      </div>
    </div>
  );
}