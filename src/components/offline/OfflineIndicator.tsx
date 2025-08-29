import React, { useState, useEffect } from 'react';
import { useOffline } from '../../hooks/useOffline';
import { serviceWorkerManager } from '../../utils/serviceWorkerManager';

interface OfflineIndicatorProps {
  className?: string;
}

export const OfflineIndicator: React.FC<OfflineIndicatorProps> = ({ className = '' }) => {
  const {
    isOnline,
    isSyncing,
    lastSync,
    pendingOperations,
    sync,
    storageInfo
  } = useOffline();

  const [showDetails, setShowDetails] = useState(false);
  const [updateAvailable, setUpdateAvailable] = useState(false);

  // Listen for service worker updates
  useEffect(() => {
    const handleUpdateAvailable = () => {
      setUpdateAvailable(true);
    };

    const handleSyncRequest = () => {
      // Auto-sync when service worker requests it
      sync().catch(error => {
        console.error('Auto-sync failed:', error);
      });
    };

    window.addEventListener('sw-update-available', handleUpdateAvailable);
    window.addEventListener('sw-sync-request', handleSyncRequest);

    return () => {
      window.removeEventListener('sw-update-available', handleUpdateAvailable);
      window.removeEventListener('sw-sync-request', handleSyncRequest);
    };
  }, [sync]);

  const handleSync = async () => {
    try {
      const result = await sync();
      if (result.success) {
        console.log('Sync completed successfully');
      } else {
        console.error('Sync failed:', result.errors);
      }
    } catch (error) {
      console.error('Sync error:', error);
    }
  };

  const handleUpdateApp = () => {
    serviceWorkerManager.activateWaitingServiceWorker();
    window.location.reload();
  };

  const formatStorageSize = (bytes: number): string => {
    const kb = bytes / 1024;
    const mb = kb / 1024;
    
    if (mb >= 1) {
      return `${mb.toFixed(1)} MB`;
    } else if (kb >= 1) {
      return `${kb.toFixed(1)} KB`;
    } else {
      return `${bytes} bytes`;
    }
  };

  const getStatusColor = () => {
    if (!isOnline) return 'bg-red-500';
    if (isSyncing) return 'bg-yellow-500';
    if (pendingOperations > 0) return 'bg-orange-500';
    return 'bg-green-500';
  };

  const getStatusText = () => {
    if (!isOnline) return 'Offline';
    if (isSyncing) return 'Syncing...';
    if (pendingOperations > 0) return `${pendingOperations} pending`;
    return 'Online';
  };

  return (
    <div className={`relative ${className}`}>
      {/* Update notification */}
      {updateAvailable && (
        <div className="fixed top-4 right-4 bg-blue-500 text-white p-4 rounded-lg shadow-lg z-50">
          <div className="flex items-center justify-between">
            <div>
              <p className="font-medium">App Update Available</p>
              <p className="text-sm opacity-90">Refresh to get the latest version</p>
            </div>
            <button
              onClick={handleUpdateApp}
              className="ml-4 bg-white text-blue-500 px-3 py-1 rounded text-sm font-medium hover:bg-gray-100"
            >
              Update
            </button>
          </div>
        </div>
      )}

      {/* Status indicator */}
      <div className="flex items-center space-x-2">
        <div
          className={`w-3 h-3 rounded-full ${getStatusColor()} ${
            isSyncing ? 'animate-pulse' : ''
          }`}
          title={getStatusText()}
        />
        
        <button
          onClick={() => setShowDetails(!showDetails)}
          className="text-sm text-gray-600 hover:text-gray-800 focus:outline-none"
        >
          {getStatusText()}
        </button>

        {pendingOperations > 0 && isOnline && !isSyncing && (
          <button
            onClick={handleSync}
            className="text-xs bg-blue-500 text-white px-2 py-1 rounded hover:bg-blue-600 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-1"
            disabled={isSyncing}
          >
            Sync Now
          </button>
        )}
      </div>

      {/* Details panel */}
      {showDetails && (
        <div className="absolute top-full right-0 mt-2 w-80 bg-white border border-gray-200 rounded-lg shadow-lg z-40">
          <div className="p-4">
            <h3 className="font-medium text-gray-900 mb-3">Sync Status</h3>
            
            <div className="space-y-2 text-sm">
              <div className="flex justify-between">
                <span className="text-gray-600">Connection:</span>
                <span className={isOnline ? 'text-green-600' : 'text-red-600'}>
                  {isOnline ? 'Online' : 'Offline'}
                </span>
              </div>
              
              <div className="flex justify-between">
                <span className="text-gray-600">Pending operations:</span>
                <span className="text-gray-900">{pendingOperations}</span>
              </div>
              
              <div className="flex justify-between">
                <span className="text-gray-600">Last sync:</span>
                <span className="text-gray-900">
                  {lastSync ? lastSync.toLocaleString() : 'Never'}
                </span>
              </div>
              
              <div className="flex justify-between">
                <span className="text-gray-600">Storage used:</span>
                <span className="text-gray-900">
                  {formatStorageSize(storageInfo.used)}
                </span>
              </div>
              
              <div className="flex justify-between">
                <span className="text-gray-600">Storage available:</span>
                <span className="text-gray-900">
                  {formatStorageSize(storageInfo.available)}
                </span>
              </div>
            </div>

            <div className="mt-4 pt-3 border-t border-gray-200 space-y-2">
              <button
                onClick={handleSync}
                disabled={!isOnline || isSyncing}
                className="w-full bg-blue-500 text-white py-2 px-3 rounded text-sm font-medium hover:bg-blue-600 disabled:bg-gray-300 disabled:cursor-not-allowed"
              >
                {isSyncing ? 'Syncing...' : 'Force Sync'}
              </button>
              
              <button
                onClick={() => serviceWorkerManager.clearCache()}
                className="w-full bg-gray-500 text-white py-2 px-3 rounded text-sm font-medium hover:bg-gray-600"
              >
                Clear Cache
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};