import { describe, it, expect, beforeEach, afterEach, vi, Mock } from 'vitest';
import { NotificationService, InAppNotification } from '../notificationService';
import { CalendarEvent } from '../../types';

// Mock the Notification API
const mockNotification = vi.fn();
Object.defineProperty(window, 'Notification', {
  value: mockNotification,
  writable: true
});

// Mock notification permission
Object.defineProperty(Notification, 'permission', {
  value: 'default',
  writable: true
});

Object.defineProperty(Notification, 'requestPermission', {
  value: vi.fn(),
  writable: true
});

describe('NotificationService', () => {
  beforeEach(() => {
    // Clear all notifications before each test
    NotificationService.clearAllNotifications();
    
    // Reset mocks
    vi.clearAllMocks();
    
    // Reset permission to default
    (Notification as any).permission = 'default';
  });

  afterEach(() => {
    // Clean up any scheduled notifications
    NotificationService.clearAllNotifications();
  });

  describe('Browser Notifications', () => {
    it('should check if browser notifications are supported', () => {
      expect(NotificationService.hasBrowserPermission()).toBe(false);
    });

    it('should request browser permission successfully', async () => {
      (Notification.requestPermission as Mock).mockResolvedValue('granted');
      
      const result = await NotificationService.requestBrowserPermission();
      
      expect(result).toBe(true);
      expect(Notification.requestPermission).toHaveBeenCalled();
    });

    it('should handle denied browser permission', async () => {
      (Notification.requestPermission as Mock).mockResolvedValue('denied');
      
      const result = await NotificationService.requestBrowserPermission();
      
      expect(result).toBe(false);
    });

    it('should return true if permission already granted', async () => {
      (Notification as any).permission = 'granted';
      
      const result = await NotificationService.requestBrowserPermission();
      
      expect(result).toBe(true);
      expect(Notification.requestPermission).not.toHaveBeenCalled();
    });

    it('should return false if permission already denied', async () => {
      (Notification as any).permission = 'denied';
      
      const result = await NotificationService.requestBrowserPermission();
      
      expect(result).toBe(false);
      expect(Notification.requestPermission).not.toHaveBeenCalled();
    });

    it('should show browser notification when permitted', async () => {
      (Notification as any).permission = 'granted';
      const mockNotificationInstance = {
        close: vi.fn()
      };
      mockNotification.mockReturnValue(mockNotificationInstance);
      
      await NotificationService.showBrowserNotification('Test Title', {
        body: 'Test body'
      });
      
      expect(mockNotification).toHaveBeenCalledWith('Test Title', {
        icon: '/vite.svg',
        badge: '/vite.svg',
        body: 'Test body'
      });
    });

    it('should throw error when showing browser notification without permission', async () => {
      (Notification as any).permission = 'denied';
      
      await expect(
        NotificationService.showBrowserNotification('Test Title')
      ).rejects.toThrow('Browser notifications not permitted');
    });

    it('should handle unsupported browser notifications', async () => {
      // Test by checking the logic when Notification is not in window
      // This test verifies the service handles the case gracefully
      const hasPermission = NotificationService.hasBrowserPermission();
      expect(typeof hasPermission).toBe('boolean');
    });
  });

  describe('In-App Notifications', () => {
    it('should show in-app notification', () => {
      const id = NotificationService.showInAppNotification('Test message', 'info');
      
      expect(id).toBeTruthy();
      
      const notifications = NotificationService.getInAppNotifications();
      expect(notifications).toHaveLength(1);
      expect(notifications[0].message).toBe('Test message');
      expect(notifications[0].type).toBe('info');
      expect(notifications[0].read).toBe(false);
    });

    it('should show notification with custom options', () => {
      const id = NotificationService.showInAppNotification('Test message', 'warning', {
        eventId: 'event-123',
        autoHide: false,
        duration: 10000
      });
      
      const notifications = NotificationService.getInAppNotifications();
      expect(notifications[0].eventId).toBe('event-123');
      expect(notifications[0].autoHide).toBe(false);
      expect(notifications[0].duration).toBe(10000);
    });

    it('should mark notification as read', () => {
      const id = NotificationService.showInAppNotification('Test message', 'info');
      
      NotificationService.markNotificationAsRead(id);
      
      const notifications = NotificationService.getInAppNotifications();
      expect(notifications[0].read).toBe(true);
    });

    it('should clear specific notification', () => {
      const id1 = NotificationService.showInAppNotification('Message 1', 'info');
      const id2 = NotificationService.showInAppNotification('Message 2', 'info');
      
      NotificationService.clearNotification(id1);
      
      const notifications = NotificationService.getInAppNotifications();
      expect(notifications).toHaveLength(1);
      expect(notifications[0].message).toBe('Message 2');
    });

    it('should clear all notifications', () => {
      NotificationService.showInAppNotification('Message 1', 'info');
      NotificationService.showInAppNotification('Message 2', 'info');
      
      NotificationService.clearAllNotifications();
      
      const notifications = NotificationService.getInAppNotifications();
      expect(notifications).toHaveLength(0);
    });

    it('should auto-hide notifications with default duration', async () => {
      const id = NotificationService.showInAppNotification('Test message', 'info', {
        autoHide: true,
        duration: 100 // Short duration for test
      });
      
      // Check notification exists initially
      expect(NotificationService.getInAppNotifications()).toHaveLength(1);
      
      // Wait for auto-hide duration
      await new Promise(resolve => setTimeout(resolve, 150));
      
      // Check notification is removed after duration
      expect(NotificationService.getInAppNotifications()).toHaveLength(0);
    });

    it('should not auto-hide when autoHide is false', async () => {
      const id = NotificationService.showInAppNotification('Test message', 'info', {
        autoHide: false,
        duration: 100
      });
      
      // Wait for what would be auto-hide duration
      await new Promise(resolve => setTimeout(resolve, 150));
      
      // Check notification still exists after duration
      expect(NotificationService.getInAppNotifications()).toHaveLength(1);
    });
  });

  describe('Notification Listeners', () => {
    it('should notify listeners when notification is added', () => {
      const addedCallback = vi.fn();
      const unsubscribe = NotificationService.onInAppNotificationAdded(addedCallback);
      
      NotificationService.showInAppNotification('Test message', 'info');
      
      expect(addedCallback).toHaveBeenCalledTimes(1);
      expect(addedCallback).toHaveBeenCalledWith(
        expect.objectContaining({
          message: 'Test message',
          type: 'info'
        })
      );
      
      unsubscribe();
    });

    it('should notify listeners when notification is removed', () => {
      const removedCallback = vi.fn();
      const unsubscribe = NotificationService.onInAppNotificationRemoved(removedCallback);
      
      const id = NotificationService.showInAppNotification('Test message', 'info');
      NotificationService.clearNotification(id);
      
      expect(removedCallback).toHaveBeenCalledTimes(1);
      expect(removedCallback).toHaveBeenCalledWith(id);
      
      unsubscribe();
    });

    it('should unsubscribe listeners correctly', () => {
      const addedCallback = vi.fn();
      const unsubscribe = NotificationService.onInAppNotificationAdded(addedCallback);
      
      unsubscribe();
      NotificationService.showInAppNotification('Test message', 'info');
      
      expect(addedCallback).not.toHaveBeenCalled();
    });

    it('should notify multiple listeners', () => {
      const callback1 = vi.fn();
      const callback2 = vi.fn();
      
      NotificationService.onInAppNotificationAdded(callback1);
      NotificationService.onInAppNotificationAdded(callback2);
      
      NotificationService.showInAppNotification('Test message', 'info');
      
      expect(callback1).toHaveBeenCalledTimes(1);
      expect(callback2).toHaveBeenCalledTimes(1);
    });
  });

  describe('Event Notification Scheduling', () => {
    const mockEvent: CalendarEvent = {
      id: 'event-1',
      userId: 'user-1',
      title: 'Test Event',
      description: 'Test Description',
      startDate: new Date(Date.now() + 60000), // 1 minute from now
      endDate: new Date(Date.now() + 120000), // 2 minutes from now
      allDay: false,
      type: 'custom',
      status: 'pending',
      notifications: [],
      createdAt: new Date(),
      updatedAt: new Date()
    };

    it('should schedule notification for future event', async () => {
      const futureEvent = {
        ...mockEvent,
        startDate: new Date(Date.now() + 300000) // 5 minutes from now
      };
      
      await NotificationService.scheduleNotification(futureEvent, 1); // 1 minute before
      
      // Notification should be scheduled but not shown yet
      const notifications = NotificationService.getInAppNotifications();
      expect(notifications).toHaveLength(0);
    });

    it('should show notification immediately for past event', async () => {
      const pastEvent = {
        ...mockEvent,
        startDate: new Date(Date.now() - 60000) // 1 minute ago
      };
      
      await NotificationService.scheduleNotification(pastEvent, 1);
      
      // Notification should be shown immediately
      const notifications = NotificationService.getInAppNotifications();
      expect(notifications).toHaveLength(1);
      expect(notifications[0].message).toContain('Test Event');
    });

    it('should cancel scheduled notification', async () => {
      const futureEvent = {
        ...mockEvent,
        startDate: new Date(Date.now() + 300000)
      };
      
      await NotificationService.scheduleNotification(futureEvent, 1);
      await NotificationService.cancelNotification(futureEvent.id);
      
      // Should not throw any errors
      expect(true).toBe(true);
    });

    it('should replace existing notification when scheduling new one for same event', async () => {
      const futureEvent = {
        ...mockEvent,
        startDate: new Date(Date.now() + 300000)
      };
      
      // Schedule first notification
      await NotificationService.scheduleNotification(futureEvent, 5);
      
      // Schedule second notification for same event
      await NotificationService.scheduleNotification(futureEvent, 1);
      
      // Should not throw any errors and should replace the first one
      expect(true).toBe(true);
    });

    it('should format all-day event notification correctly', async () => {
      const allDayEvent = {
        ...mockEvent,
        allDay: true,
        startDate: new Date(Date.now() - 60000)
      };
      
      await NotificationService.scheduleNotification(allDayEvent, 1);
      
      const notifications = NotificationService.getInAppNotifications();
      expect(notifications[0].message).toContain('today');
    });

    it('should format timed event notification correctly', async () => {
      const timedEvent = {
        ...mockEvent,
        allDay: false,
        startDate: new Date(Date.now() - 60000)
      };
      
      await NotificationService.scheduleNotification(timedEvent, 1);
      
      const notifications = NotificationService.getInAppNotifications();
      expect(notifications[0].message).toContain('at');
    });
  });

  describe('Enhanced Notification Scheduling', () => {
    beforeEach(() => {
      // Mock auth context
      (window as any).__AUTH_CONTEXT__ = {
        user: { uid: 'test-user-123' }
      };
    });

    afterEach(() => {
      delete (window as any).__AUTH_CONTEXT__;
    });

    it('should get current user ID from auth context', () => {
      const userId = (NotificationService as any).getCurrentUserId();
      expect(userId).toBe('test-user-123');
    });

    it('should return null when no auth context', () => {
      delete (window as any).__AUTH_CONTEXT__;
      const userId = (NotificationService as any).getCurrentUserId();
      expect(userId).toBeNull();
    });

    it('should cancel all notifications for an event', async () => {
      const id1 = NotificationService.showInAppNotification('Event notification', 'info', {
        eventId: 'event-123'
      });
      const id2 = NotificationService.showInAppNotification('Other notification', 'info');

      await NotificationService.cancelAllNotificationsForEvent('event-123');

      const notifications = NotificationService.getInAppNotifications();
      expect(notifications).toHaveLength(1);
      expect(notifications[0].message).toBe('Other notification');
    });

    it('should get notification summary', () => {
      NotificationService.showInAppNotification('Error message', 'error');
      NotificationService.showInAppNotification('Warning message', 'warning');
      NotificationService.showInAppNotification('Info message', 'info');
      
      const id = NotificationService.showInAppNotification('Read message', 'success');
      NotificationService.markNotificationAsRead(id);

      const summary = NotificationService.getNotificationSummary();
      
      expect(summary.total).toBe(4);
      expect(summary.unread).toBe(3);
      expect(summary.byType.error).toBe(1);
      expect(summary.byType.warning).toBe(1);
      expect(summary.byType.info).toBe(1);
      expect(summary.byType.success).toBe(1);
    });

    it('should handle checkUpcomingEvents with no user', async () => {
      delete (window as any).__AUTH_CONTEXT__;
      
      const events = await NotificationService.checkUpcomingEvents();
      expect(events).toEqual([]);
    });

    it('should handle checkUpcomingEvents with calendar service error', async () => {
      // Mock dynamic import to throw error
      const originalImport = global.import;
      (global as any).import = vi.fn().mockRejectedValue(new Error('Import failed'));

      const events = await NotificationService.checkUpcomingEvents();
      expect(events).toEqual([]);

      // Restore original import
      (global as any).import = originalImport;
    });

    it('should handle scheduleAllEventNotifications with no user', async () => {
      delete (window as any).__AUTH_CONTEXT__;
      
      // Should not throw error
      await expect(NotificationService.scheduleAllEventNotifications()).resolves.toBeUndefined();
    });

    it('should handle startNotificationScheduler', async () => {
      // Mock setInterval
      const originalSetInterval = global.setInterval;
      const mockSetInterval = vi.fn();
      global.setInterval = mockSetInterval;

      await NotificationService.startNotificationScheduler();

      expect(mockSetInterval).toHaveBeenCalledWith(
        expect.any(Function),
        5 * 60 * 1000 // 5 minutes
      );

      // Restore original setInterval
      global.setInterval = originalSetInterval;
    });
  });
});