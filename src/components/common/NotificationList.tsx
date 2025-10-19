import React, { useEffect, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { NotificationService, InAppNotification } from '../../services/notificationService';

interface NotificationListProps {
  className?: string;
  maxItems?: number;
  showTimestamp?: boolean;
  onNotificationClick?: (notification: InAppNotification) => void;
}

const NotificationList: React.FC<NotificationListProps> = ({
  className = '',
  maxItems,
  showTimestamp = true,
  onNotificationClick
}) => {
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

  const handleNotificationClick = (notification: InAppNotification) => {
    if (!notification.read) {
      NotificationService.markNotificationAsRead(notification.id);
      setNotifications(prev => 
        prev.map(n => n.id === notification.id ? { ...n, read: true } : n)
      );
    }
    onNotificationClick?.(notification);
  };

  const handleDismiss = (e: React.MouseEvent, id: string) => {
    e.stopPropagation();
    NotificationService.clearNotification(id);
  };

  const getNotificationIcon = (type: InAppNotification['type']) => {
    const iconClass = "w-4 h-4";
    
    switch (type) {
      case 'error':
        return (
          <svg className={`${iconClass} text-red-500`} fill="currentColor" viewBox="0 0 20 20">
            <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zM8.707 7.293a1 1 0 00-1.414 1.414L8.586 10l-1.293 1.293a1 1 0 101.414 1.414L10 11.414l1.293 1.293a1 1 0 001.414-1.414L11.414 10l1.293-1.293a1 1 0 00-1.414-1.414L10 8.586 8.707 7.293z" clipRule="evenodd" />
          </svg>
        );
      case 'warning':
        return (
          <svg className={`${iconClass} text-yellow-500`} fill="currentColor" viewBox="0 0 20 20">
            <path fillRule="evenodd" d="M8.257 3.099c.765-1.36 2.722-1.36 3.486 0l5.58 9.92c.75 1.334-.213 2.98-1.742 2.98H4.42c-1.53 0-2.493-1.646-1.743-2.98l5.58-9.92zM11 13a1 1 0 11-2 0 1 1 0 012 0zm-1-8a1 1 0 00-1 1v3a1 1 0 002 0V6a1 1 0 00-1-1z" clipRule="evenodd" />
          </svg>
        );
      case 'success':
        return (
          <svg className={`${iconClass} text-green-500`} fill="currentColor" viewBox="0 0 20 20">
            <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" />
          </svg>
        );
      case 'info':
      default:
        return (
          <svg className={`${iconClass} text-blue-500`} fill="currentColor" viewBox="0 0 20 20">
            <path fillRule="evenodd" d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7-4a1 1 0 11-2 0 1 1 0 012 0zM9 9a1 1 0 000 2v3a1 1 0 001 1h1a1 1 0 100-2v-3a1 1 0 00-1-1H9z" clipRule="evenodd" />
          </svg>
        );
    }
  };

  const displayedNotifications = maxItems 
    ? notifications.slice(0, maxItems) 
    : notifications;

  if (notifications.length === 0) {
    return (
      <div className={`text-center py-8 text-gray-500 ${className}`}>
        <svg className="w-12 h-12 mx-auto mb-4 text-gray-300" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 17h5l-5 5v-5zM11 19H6a2 2 0 01-2-2V7a2 2 0 012-2h5m5 0v5" />
        </svg>
        <p>No notifications</p>
      </div>
    );
  }

  return (
    <div className={`space-y-2 ${className}`}>
      {displayedNotifications.map((notification) => (
        <div
          key={notification.id}
          className={`
            flex items-start p-3 rounded-lg border cursor-pointer transition-colors
            ${notification.read 
              ? 'bg-gray-50 border-gray-200 hover:bg-gray-100' 
              : 'bg-white border-blue-200 hover:bg-blue-50'
            }
          `}
          onClick={() => handleNotificationClick(notification)}
          role="button"
          tabIndex={0}
          onKeyDown={(e) => {
            if (e.key === 'Enter' || e.key === ' ') {
              e.preventDefault();
              handleNotificationClick(notification);
            }
          }}
        >
          <div className="flex-shrink-0 mt-0.5">
            {getNotificationIcon(notification.type)}
          </div>
          
          <div className="ml-3 flex-1 min-w-0">
            <p className={`text-sm ${notification.read ? 'text-gray-600' : 'text-gray-900 font-medium'}`}>
              {notification.message}
            </p>
            {showTimestamp && (
              <p className="text-xs text-gray-500 mt-1">
                {notification.timestamp.toLocaleString()}
              </p>
            )}
          </div>

          {!notification.read && (
            <div className="flex-shrink-0 ml-2">
              <div className="w-2 h-2 bg-blue-500 rounded-full"></div>
            </div>
          )}

          <button
            type="button"
            className="flex-shrink-0 ml-2 p-1 rounded-full hover:bg-gray-200 focus:outline-none focus:ring-2 focus:ring-gray-300"
            onClick={(e) => handleDismiss(e, notification.id)}
            aria-label={t('dismissNotification')}
          >
            <svg className="w-4 h-4 text-gray-400" fill="currentColor" viewBox="0 0 20 20">
              <path fillRule="evenodd" d="M4.293 4.293a1 1 0 011.414 0L10 8.586l4.293-4.293a1 1 0 111.414 1.414L11.414 10l4.293 4.293a1 1 0 01-1.414 1.414L10 11.414l-4.293 4.293a1 1 0 01-1.414-1.414L8.586 10 4.293 5.707a1 1 0 010-1.414z" clipRule="evenodd" />
            </svg>
          </button>
        </div>
      ))}

      {maxItems && notifications.length > maxItems && (
        <div className="text-center pt-2">
          <p className="text-sm text-gray-500">
            Showing {maxItems} of {notifications.length} notifications
          </p>
        </div>
      )}
    </div>
  );
};

export default NotificationList;