import React, { useState } from 'react';
import { useNotifications } from '../../hooks/useNotifications';

interface NotificationPermissionBannerProps {
  className?: string;
  onDismiss?: () => void;
}

const NotificationPermissionBanner: React.FC<NotificationPermissionBannerProps> = ({
  className = '',
  onDismiss
}) => {
  const { hasBrowserPermission, requestBrowserPermission } = useNotifications();
  const [isRequesting, setIsRequesting] = useState(false);
  const [isDismissed, setIsDismissed] = useState(false);

  // Don't show if permission is already granted or banner is dismissed
  if (hasBrowserPermission || isDismissed) {
    return null;
  }

  // Don't show if browser doesn't support notifications
  if (!('Notification' in window)) {
    return null;
  }

  const handleRequestPermission = async () => {
    setIsRequesting(true);
    try {
      const granted = await requestBrowserPermission();
      if (!granted) {
        // Show info about enabling notifications manually
        console.log('Browser notifications were not granted');
      }
    } catch (error) {
      console.error('Error requesting notification permission:', error);
    } finally {
      setIsRequesting(false);
    }
  };

  const handleDismiss = () => {
    setIsDismissed(true);
    onDismiss?.();
  };

  return (
    <div className={`bg-blue-50 border border-blue-200 rounded-lg p-4 ${className}`}>
      <div className="flex items-start">
        <div className="flex-shrink-0">
          <svg className="w-5 h-5 text-blue-400" fill="currentColor" viewBox="0 0 20 20">
            <path fillRule="evenodd" d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7-4a1 1 0 11-2 0 1 1 0 012 0zM9 9a1 1 0 000 2v3a1 1 0 001 1h1a1 1 0 100-2v-3a1 1 0 00-1-1H9z" clipRule="evenodd" />
          </svg>
        </div>
        <div className="ml-3 flex-1">
          <h3 className="text-sm font-medium text-blue-800">
            Enable Browser Notifications
          </h3>
          <p className="mt-1 text-sm text-blue-700">
            Get notified about upcoming tasks, deadlines, and plant care reminders even when the app is closed.
          </p>
          <div className="mt-3 flex space-x-3">
            <button
              type="button"
              onClick={handleRequestPermission}
              disabled={isRequesting}
              className="inline-flex items-center px-3 py-2 border border-transparent text-sm leading-4 font-medium rounded-md text-white bg-blue-600 hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {isRequesting ? (
                <>
                  <svg className="animate-spin -ml-1 mr-2 h-4 w-4 text-white" fill="none" viewBox="0 0 24 24">
                    <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                    <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                  </svg>
                  Requesting...
                </>
              ) : (
                'Enable Notifications'
              )}
            </button>
            <button
              type="button"
              onClick={handleDismiss}
              className="inline-flex items-center px-3 py-2 border border-blue-300 text-sm leading-4 font-medium rounded-md text-blue-700 bg-white hover:bg-blue-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500"
            >
              Maybe Later
            </button>
          </div>
        </div>
        <div className="ml-4 flex-shrink-0">
          <button
            type="button"
            onClick={handleDismiss}
            className="inline-flex rounded-md p-1.5 text-blue-400 hover:bg-blue-100 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-offset-blue-50 focus:ring-blue-600"
            aria-label="Dismiss notification permission banner"
          >
            <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 20 20">
              <path fillRule="evenodd" d="M4.293 4.293a1 1 0 011.414 0L10 8.586l4.293-4.293a1 1 0 111.414 1.414L11.414 10l4.293 4.293a1 1 0 01-1.414 1.414L10 11.414l-4.293 4.293a1 1 0 01-1.414-1.414L8.586 10 4.293 5.707a1 1 0 010-1.414z" clipRule="evenodd" />
            </svg>
          </button>
        </div>
      </div>
    </div>
  );
};

export default NotificationPermissionBanner;