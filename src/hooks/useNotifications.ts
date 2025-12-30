import { useEffect, useState, useCallback } from 'react';
import { NotificationService, InAppNotification } from '../services/notificationService';
import { useAuth } from '../contexts/AuthContext';

export interface UseNotificationsReturn {
  notifications: InAppNotification[];
  notificationSummary: {
    total: number;
    unread: number;
    byType: Record<InAppNotification['type'], number>;
  };
  showNotification: (message: string, type: InAppNotification['type'], options?: {
    eventId?: string;
    autoHide?: boolean;
    duration?: number;
  }) => string;
  markAsRead: (id: string) => void;
  clearNotification: (id: string) => void;
  clearAllNotifications: () => void;
  requestBrowserPermission: () => Promise<boolean>;
  hasBrowserPermission: boolean;
}

export const useNotifications = (): UseNotificationsReturn => {
  const [notifications, setNotifications] = useState<InAppNotification[]>([]);
  const [hasBrowserPermission, setHasBrowserPermission] = useState(false);
  const { user } = useAuth();

  // Initialize notifications and listeners
  useEffect(() => {
    // Load initial notifications
    setNotifications(NotificationService.getInAppNotifications());
    setHasBrowserPermission(NotificationService.hasBrowserPermission());

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

  // Start notification scheduler when user is authenticated
  useEffect(() => {
    if (user) {
      // Set up the auth context for the notification service
      (window as any).__AUTH_CONTEXT__ = { user };
      
      // Start the notification scheduler
      NotificationService.startNotificationScheduler().catch(error => {
        console.error('Failed to start notification scheduler:', error);
      });

      // Schedule notifications for existing events
      NotificationService.scheduleAllEventNotifications().catch(error => {
        console.error('Failed to schedule existing event notifications:', error);
      });
    } else {
      // Clear auth context when user logs out
      delete (window as any).__AUTH_CONTEXT__;
    }
  }, [user]);

  const showNotification = useCallback((
    message: string, 
    type: InAppNotification['type'], 
    options?: {
      eventId?: string;
      autoHide?: boolean;
      duration?: number;
    }
  ) => {
    return NotificationService.showInAppNotification(message, type, options);
  }, []);

  const markAsRead = useCallback((id: string) => {
    NotificationService.markNotificationAsRead(id);
    setNotifications(prev => 
      prev.map(n => n.id === id ? { ...n, read: true } : n)
    );
  }, []);

  const clearNotification = useCallback((id: string) => {
    NotificationService.clearNotification(id);
  }, []);

  const clearAllNotifications = useCallback(() => {
    NotificationService.clearAllNotifications();
  }, []);

  const requestBrowserPermission = useCallback(async () => {
    const granted = await NotificationService.requestBrowserPermission();
    setHasBrowserPermission(granted);
    return granted;
  }, []);

  const notificationSummary = NotificationService.getNotificationSummary();

  return {
    notifications,
    notificationSummary,
    showNotification,
    markAsRead,
    clearNotification,
    clearAllNotifications,
    requestBrowserPermission,
    hasBrowserPermission
  };
};