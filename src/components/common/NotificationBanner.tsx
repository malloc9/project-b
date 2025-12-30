import React, { useEffect, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { NotificationService, InAppNotification } from '../../services/notificationService';

interface NotificationBannerProps {
  className?: string;
}

const NotificationBanner: React.FC<NotificationBannerProps> = ({ className = '' }) => {
  const { t } = useTranslation('accessibility');
  const [notifications, setNotifications] = useState<InAppNotification[]>([]);

  useEffect(() => {
    // Load initial notifications
    setNotifications(NotificationService.getInAppNotifications());

    // Listen for new notifications
    const unsubscribeAdded = NotificationService.onInAppNotificationAdded((notification) => {
      setNotifications(prev => [notification, ...prev]);
    });

    const unsubscribeRemoved = NotificationService.onInAppNotificationRemoved((id) => {
      setNotifications(prev => prev.filter(n => n.id !== id));
    });

    return () => {
      unsubscribeAdded();
      unsubscribeRemoved();
    };
  }, []);

  const handleDismiss = (id: string) => {
    NotificationService.clearNotification(id);
  };

  const handleMarkAsRead = (id: string) => {
    NotificationService.markNotificationAsRead(id);
    setNotifications(prev => 
      prev.map(n => n.id === id ? { ...n, read: true } : n)
    );
  };

  if (notifications.length === 0) {
    return null;
  }

  const getNotificationStyles = (type: InAppNotification['type']) => {
    const baseStyles = 'border-l-4 p-4 mb-2 rounded-r-md shadow-sm';
    
    switch (type) {
      case 'error':
        return `${baseStyles} bg-red-50 border-red-400 text-red-800`;
      case 'warning':
        return `${baseStyles} bg-yellow-50 border-yellow-400 text-yellow-800`;
      case 'success':
        return `${baseStyles} bg-green-50 border-green-400 text-green-800`;
      case 'info':
      default:
        return `${baseStyles} bg-blue-50 border-blue-400 text-blue-800`;
    }
  };

  const getIcon = (type: InAppNotification['type']) => {
    switch (type) {
      case 'error':
        return (
          <svg className="w-5 h-5 text-red-400" fill="currentColor" viewBox="0 0 20 20">
            <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zM8.707 7.293a1 1 0 00-1.414 1.414L8.586 10l-1.293 1.293a1 1 0 101.414 1.414L10 11.414l1.293 1.293a1 1 0 001.414-1.414L11.414 10l1.293-1.293a1 1 0 00-1.414-1.414L10 8.586 8.707 7.293z" clipRule="evenodd" />
          </svg>
        );
      case 'warning':
        return (
          <svg className="w-5 h-5 text-yellow-400" fill="currentColor" viewBox="0 0 20 20">
            <path fillRule="evenodd" d="M8.257 3.099c.765-1.36 2.722-1.36 3.486 0l5.58 9.92c.75 1.334-.213 2.98-1.742 2.98H4.42c-1.53 0-2.493-1.646-1.743-2.98l5.58-9.92zM11 13a1 1 0 11-2 0 1 1 0 012 0zm-1-8a1 1 0 00-1 1v3a1 1 0 002 0V6a1 1 0 00-1-1z" clipRule="evenodd" />
          </svg>
        );
      case 'success':
        return (
          <svg className="w-5 h-5 text-green-400" fill="currentColor" viewBox="0 0 20 20">
            <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" />
          </svg>
        );
      case 'info':
      default:
        return (
          <svg className="w-5 h-5 text-blue-400" fill="currentColor" viewBox="0 0 20 20">
            <path fillRule="evenodd" d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7-4a1 1 0 11-2 0 1 1 0 012 0zM9 9a1 1 0 000 2v3a1 1 0 001 1h1a1 1 0 100-2v-3a1 1 0 00-1-1H9z" clipRule="evenodd" />
          </svg>
        );
    }
  };

  return (
    <div className={`fixed top-4 right-4 z-50 max-w-md space-y-2 ${className}`}>
      {notifications.slice(0, 5).map((notification) => (
        <div
          key={notification.id}
          className={`${getNotificationStyles(notification.type)} ${
            notification.read ? 'opacity-75' : ''
          }`}
          role="alert"
          aria-live="polite"
        >
          <div className="flex items-start">
            <div className="flex-shrink-0">
              {getIcon(notification.type)}
            </div>
            <div className="ml-3 flex-1">
              <p className="text-sm font-medium">
                {notification.message}
              </p>
              {notification.timestamp && (
                <p className="text-xs mt-1 opacity-75">
                  {notification.timestamp.toLocaleTimeString()}
                </p>
              )}
            </div>
            <div className="ml-4 flex-shrink-0 flex space-x-1">
              {!notification.read && (
                <button
                  type="button"
                  className="inline-flex text-xs underline hover:no-underline focus:outline-none focus:underline"
                  onClick={() => handleMarkAsRead(notification.id)}
                  aria-label={t('markAsRead')}
                >
                  Mark read
                </button>
              )}
              <button
                type="button"
                className="inline-flex rounded-md p-1.5 hover:bg-black hover:bg-opacity-10 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-offset-transparent focus:ring-current"
                onClick={() => handleDismiss(notification.id)}
                aria-label={t('dismissNotification')}
              >
                <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 20 20">
                  <path fillRule="evenodd" d="M4.293 4.293a1 1 0 011.414 0L10 8.586l4.293-4.293a1 1 0 111.414 1.414L11.414 10l4.293 4.293a1 1 0 01-1.414 1.414L10 11.414l-4.293 4.293a1 1 0 01-1.414-1.414L8.586 10 4.293 5.707a1 1 0 010-1.414z" clipRule="evenodd" />
                </svg>
              </button>
            </div>
          </div>
        </div>
      ))}
      {notifications.length > 5 && (
        <div className="text-center">
          <button
            type="button"
            className="text-sm text-gray-600 hover:text-gray-800 underline"
            onClick={() => NotificationService.clearAllNotifications()}
          >
            Clear all ({notifications.length} total)
          </button>
        </div>
      )}
    </div>
  );
};

export default NotificationBanner;