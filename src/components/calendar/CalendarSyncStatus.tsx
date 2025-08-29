import React, { useState, useEffect } from 'react';
import { getCalendarSyncStatus, manualSyncCalendar } from '../../services/calendarService';
import { useCalendar } from '../../contexts/CalendarContext';

export function CalendarSyncStatus() {
  const { isConnected } = useCalendar();
  const [syncStatus, setSyncStatus] = useState({
    connected: false,
    pendingOperations: 0,
    processing: false,
  });
  const [isManualSyncing, setIsManualSyncing] = useState(false);
  const [lastSyncResult, setLastSyncResult] = useState<string | null>(null);

  // Update sync status periodically
  useEffect(() => {
    const updateStatus = () => {
      if (isConnected) {
        const status = getCalendarSyncStatus();
        setSyncStatus(status);
      }
    };

    updateStatus();
    const interval = setInterval(updateStatus, 5000); // Update every 5 seconds

    return () => clearInterval(interval);
  }, [isConnected]);

  const handleManualSync = async () => {
    setIsManualSyncing(true);
    setLastSyncResult(null);

    try {
      const result = await manualSyncCalendar();
      setLastSyncResult(result.message);
      
      // Update status after sync
      const status = getCalendarSyncStatus();
      setSyncStatus(status);
    } catch (error) {
      setLastSyncResult('Failed to sync calendar. Please try again later.');
    } finally {
      setIsManualSyncing(false);
    }
  };

  if (!isConnected) {
    return null;
  }

  const hasIssues = syncStatus.pendingOperations > 0;

  return (
    <div className={`p-4 rounded-lg border ${
      hasIssues ? 'bg-yellow-50 border-yellow-200' : 'bg-green-50 border-green-200'
    }`}>
      <div className="flex items-center justify-between">
        <div className="flex items-center space-x-3">
          <div className={`w-3 h-3 rounded-full ${
            syncStatus.processing 
              ? 'bg-blue-500 animate-pulse' 
              : hasIssues 
                ? 'bg-yellow-500' 
                : 'bg-green-500'
          }`} />
          
          <div>
            <h3 className={`font-medium ${
              hasIssues ? 'text-yellow-900' : 'text-green-900'
            }`}>
              Calendar Sync Status
            </h3>
            
            <p className={`text-sm ${
              hasIssues ? 'text-yellow-700' : 'text-green-700'
            }`}>
              {syncStatus.processing ? (
                'Syncing calendar events...'
              ) : hasIssues ? (
                `${syncStatus.pendingOperations} operations pending retry`
              ) : (
                'All calendar events are synchronized'
              )}
            </p>
          </div>
        </div>

        {hasIssues && (
          <button
            onClick={handleManualSync}
            disabled={isManualSyncing || syncStatus.processing}
            className="flex items-center px-3 py-2 bg-yellow-600 text-white rounded-md hover:bg-yellow-700 disabled:opacity-50 disabled:cursor-not-allowed text-sm font-medium"
          >
            {isManualSyncing ? (
              <>
                <svg className="animate-spin -ml-1 mr-2 h-4 w-4 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                  <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                  <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                </svg>
                Syncing...
              </>
            ) : (
              <>
                <svg className="w-4 h-4 mr-2" fill="currentColor" viewBox="0 0 20 20">
                  <path fillRule="evenodd" d="M4 2a1 1 0 011 1v2.101a7.002 7.002 0 0111.601 2.566 1 1 0 11-1.885.666A5.002 5.002 0 005.999 7H9a1 1 0 010 2H4a1 1 0 01-1-1V3a1 1 0 011-1zm.008 9.057a1 1 0 011.276.61A5.002 5.002 0 0014.001 13H11a1 1 0 110-2h5a1 1 0 011 1v5a1 1 0 11-2 0v-2.101a7.002 7.002 0 01-11.601-2.566 1 1 0 01.61-1.276z" clipRule="evenodd" />
                </svg>
                Retry Sync
              </>
            )}
          </button>
        )}
      </div>

      {lastSyncResult && (
        <div className="mt-3 p-3 bg-white rounded border">
          <p className="text-sm text-gray-700">{lastSyncResult}</p>
        </div>
      )}

      {hasIssues && (
        <div className="mt-3 text-xs text-yellow-600">
          <p>
            Some calendar events couldn't be synced. This can happen due to network issues or API limits. 
            Click "Retry Sync" to attempt syncing again, or wait for automatic retry.
          </p>
        </div>
      )}
    </div>
  );
}