import { CalendarEvent, NotificationSettings } from '../types';

export interface InAppNotification {
  id: string;
  message: string;
  type: 'info' | 'warning' | 'error' | 'success';
  eventId?: string;
  timestamp: Date;
  read: boolean;
  autoHide?: boolean;
  duration?: number; // milliseconds
}

export interface NotificationServiceInterface {
  // Browser notification methods
  requestBrowserPermission(): Promise<boolean>;
  hasBrowserPermission(): boolean;
  showBrowserNotification(title: string, options?: NotificationOptions): Promise<void>;
  
  // In-app notification methods
  showInAppNotification(message: string, type: InAppNotification['type'], options?: {
    eventId?: string;
    autoHide?: boolean;
    duration?: number;
  }): string;
  getInAppNotifications(): InAppNotification[];
  markNotificationAsRead(id: string): void;
  clearNotification(id: string): void;
  clearAllNotifications(): void;
  
  // Event-based notification scheduling
  scheduleNotification(event: CalendarEvent, timing: number): Promise<void>;
  cancelNotification(eventId: string): Promise<void>;
  checkUpcomingEvents(): Promise<CalendarEvent[]>;
  
  // Notification listeners
  onInAppNotificationAdded(callback: (notification: InAppNotification) => void): () => void;
  onInAppNotificationRemoved(callback: (id: string) => void): () => void;
}

class NotificationServiceImpl implements NotificationServiceInterface {
  private inAppNotifications: InAppNotification[] = [];
  private scheduledNotifications = new Map<string, number>(); // eventId -> timeoutId
  private notificationListeners: {
    added: ((notification: InAppNotification) => void)[];
    removed: ((id: string) => void)[];
  } = {
    added: [],
    removed: []
  };

  // Browser notification methods
  async requestBrowserPermission(): Promise<boolean> {
    if (!('Notification' in window)) {
      console.warn('Browser notifications not supported');
      return false;
    }

    if (Notification.permission === 'granted') {
      return true;
    }

    if (Notification.permission === 'denied') {
      return false;
    }

    try {
      const permission = await Notification.requestPermission();
      return permission === 'granted';
    } catch (error) {
      console.error('Error requesting notification permission:', error);
      return false;
    }
  }

  hasBrowserPermission(): boolean {
    return 'Notification' in window && Notification.permission === 'granted';
  }

  async showBrowserNotification(title: string, options?: NotificationOptions): Promise<void> {
    if (!this.hasBrowserPermission()) {
      throw new Error('Browser notifications not permitted');
    }

    try {
      const notification = new Notification(title, {
        icon: '/vite.svg', // Default app icon
        badge: '/vite.svg',
        ...options
      });

      // Auto-close after 5 seconds if not specified
      if (!options?.requireInteraction) {
        setTimeout(() => {
          notification.close();
        }, 5000);
      }
    } catch (error) {
      console.error('Error showing browser notification:', error);
      throw error;
    }
  }

  // In-app notification methods
  showInAppNotification(
    message: string, 
    type: InAppNotification['type'], 
    options?: {
      eventId?: string;
      autoHide?: boolean;
      duration?: number;
    }
  ): string {
    const notification: InAppNotification = {
      id: `notification-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
      message,
      type,
      eventId: options?.eventId,
      timestamp: new Date(),
      read: false,
      autoHide: options?.autoHide ?? true,
      duration: options?.duration ?? 5000
    };

    this.inAppNotifications.unshift(notification);
    
    // Notify listeners
    this.notificationListeners.added.forEach(callback => callback(notification));

    // Auto-hide if specified
    if (notification.autoHide && notification.duration) {
      setTimeout(() => {
        this.clearNotification(notification.id);
      }, notification.duration);
    }

    return notification.id;
  }

  getInAppNotifications(): InAppNotification[] {
    return [...this.inAppNotifications];
  }

  markNotificationAsRead(id: string): void {
    const notification = this.inAppNotifications.find(n => n.id === id);
    if (notification) {
      notification.read = true;
    }
  }

  clearNotification(id: string): void {
    const index = this.inAppNotifications.findIndex(n => n.id === id);
    if (index !== -1) {
      this.inAppNotifications.splice(index, 1);
      this.notificationListeners.removed.forEach(callback => callback(id));
    }
  }

  clearAllNotifications(): void {
    const ids = this.inAppNotifications.map(n => n.id);
    this.inAppNotifications = [];
    ids.forEach(id => {
      this.notificationListeners.removed.forEach(callback => callback(id));
    });
  }

  // Event-based notification scheduling
  async scheduleNotification(event: CalendarEvent, timing: number): Promise<void> {
    // Cancel existing notification for this event
    await this.cancelNotification(event.id);

    const notificationTime = new Date(event.startDate.getTime() - (timing * 60 * 1000));
    const now = new Date();

    if (notificationTime <= now) {
      // Event is too soon or has passed, show notification immediately
      this.showEventNotification(event);
      return;
    }

    const delay = notificationTime.getTime() - now.getTime();
    const timeoutId = window.setTimeout(() => {
      this.showEventNotification(event);
      this.scheduledNotifications.delete(event.id);
    }, delay);

    this.scheduledNotifications.set(event.id, timeoutId);
  }

  async cancelNotification(eventId: string): Promise<void> {
    const timeoutId = this.scheduledNotifications.get(eventId);
    if (timeoutId) {
      clearTimeout(timeoutId);
      this.scheduledNotifications.delete(eventId);
    }
  }

  async checkUpcomingEvents(): Promise<CalendarEvent[]> {
    try {
      // Import CalendarService dynamically to avoid circular dependencies
      const { getUpcomingEvents } = await import('./calendarService');
      
      // Get current user from auth context
      const userId = this.getCurrentUserId();
      if (!userId) {
        return [];
      }

      // Get upcoming events for the next 24 hours
      const upcomingEvents = await getUpcomingEvents(userId, 50);
      const now = new Date();
      const next24Hours = new Date(now.getTime() + (24 * 60 * 60 * 1000));

      // Filter events that are within the next 24 hours
      return upcomingEvents.filter(event => 
        event.startDate <= next24Hours && event.status === 'pending'
      );
    } catch (error) {
      console.error('Error checking upcoming events:', error);
      return [];
    }
  }

  // Background process for checking and scheduling notifications
  async startNotificationScheduler(): Promise<void> {
    // Check for upcoming events every 5 minutes
    const checkInterval = 5 * 60 * 1000; // 5 minutes

    const scheduleUpcomingNotifications = async () => {
      try {
        const upcomingEvents = await this.checkUpcomingEvents();
        
        for (const event of upcomingEvents) {
          // Schedule notifications for each notification setting
          for (const notificationSetting of event.notifications) {
            if (notificationSetting.enabled) {
              await this.scheduleNotification(event, notificationSetting.timing);
            }
          }
        }
      } catch (error) {
        console.error('Error in notification scheduler:', error);
      }
    };

    // Run initial check
    await scheduleUpcomingNotifications();

    // Set up recurring checks
    setInterval(scheduleUpcomingNotifications, checkInterval);
  }

  // Schedule notifications for all events with notification settings
  async scheduleAllEventNotifications(): Promise<void> {
    try {
      const userId = this.getCurrentUserId();
      if (!userId) {
        return;
      }

      // Import CalendarService dynamically
      const { getUpcomingEvents } = await import('./calendarService');
      
      // Get all upcoming events
      const upcomingEvents = await getUpcomingEvents(userId, 100);
      
      for (const event of upcomingEvents) {
        // Schedule notifications for each notification setting
        for (const notificationSetting of event.notifications) {
          if (notificationSetting.enabled) {
            await this.scheduleNotification(event, notificationSetting.timing);
          }
        }
      }
    } catch (error) {
      console.error('Error scheduling all event notifications:', error);
    }
  }

  // Cancel all notifications for a specific event
  async cancelAllNotificationsForEvent(eventId: string): Promise<void> {
    await this.cancelNotification(eventId);
    
    // Also remove any in-app notifications for this event
    const notifications = this.inAppNotifications.filter(n => n.eventId === eventId);
    for (const notification of notifications) {
      this.clearNotification(notification.id);
    }
  }

  // Get notification summary for dashboard
  getNotificationSummary(): {
    total: number;
    unread: number;
    byType: Record<InAppNotification['type'], number>;
  } {
    const notifications = this.getInAppNotifications();
    const unread = notifications.filter(n => !n.read);
    
    const byType = notifications.reduce((acc, notification) => {
      acc[notification.type] = (acc[notification.type] || 0) + 1;
      return acc;
    }, {} as Record<InAppNotification['type'], number>);

    return {
      total: notifications.length,
      unread: unread.length,
      byType
    };
  }

  // Helper method to get current user ID (would integrate with auth context)
  private getCurrentUserId(): string | null {
    // This would typically get the user ID from the auth context
    // For now, return null - this will be properly implemented when integrated
    try {
      // Try to get from auth context if available
      const authContext = (window as any).__AUTH_CONTEXT__;
      return authContext?.user?.uid || null;
    } catch {
      return null;
    }
  }

  // Notification listeners
  onInAppNotificationAdded(callback: (notification: InAppNotification) => void): () => void {
    this.notificationListeners.added.push(callback);
    return () => {
      const index = this.notificationListeners.added.indexOf(callback);
      if (index !== -1) {
        this.notificationListeners.added.splice(index, 1);
      }
    };
  }

  onInAppNotificationRemoved(callback: (id: string) => void): () => void {
    this.notificationListeners.removed.push(callback);
    return () => {
      const index = this.notificationListeners.removed.indexOf(callback);
      if (index !== -1) {
        this.notificationListeners.removed.splice(index, 1);
      }
    };
  }

  private showEventNotification(event: CalendarEvent): void {
    const message = `${event.title} is starting${event.allDay ? ' today' : ` at ${event.startDate.toLocaleTimeString()}`}`;
    
    // Show in-app notification
    this.showInAppNotification(message, 'info', {
      eventId: event.id,
      autoHide: false // Don't auto-hide event notifications
    });

    // Show browser notification if permitted
    if (this.hasBrowserPermission()) {
      this.showBrowserNotification(event.title, {
        body: message,
        tag: `event-${event.id}`, // Prevent duplicate notifications
        requireInteraction: true
      }).catch(error => {
        console.error('Failed to show browser notification:', error);
      });
    }
  }
}

// Export singleton instance
export const NotificationService = new NotificationServiceImpl();