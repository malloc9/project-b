import React from 'react';
import { renderHook, act } from '@testing-library/react';
import { describe, it, expect, beforeEach, vi, Mock } from 'vitest';
import { useNotifications } from '../useNotifications';
import { NotificationService } from '../../services/notificationService';

// Mock the NotificationService
vi.mock('../../services/notificationService', () => ({
  NotificationService: {
    getInAppNotifications: vi.fn(),
    onInAppNotificationAdded: vi.fn(),
    onInAppNotificationRemoved: vi.fn(),
    showInAppNotification: vi.fn(),
    markNotificationAsRead: vi.fn(),
    clearNotification: vi.fn(),
    clearAllNotifications: vi.fn(),
    requestBrowserPermission: vi.fn(),
    hasBrowserPermission: vi.fn(),
    startNotificationScheduler: vi.fn(),
    scheduleAllEventNotifications: vi.fn(),
    getNotificationSummary: vi.fn()
  }
}));

// Mock the AuthContext
const mockAuthContext = {
  user: { uid: 'test-user-123', email: 'test@example.com' },
  loading: false,
  login: vi.fn(),
  logout: vi.fn(),
  resetPassword: vi.fn()
};

vi.mock('../../contexts/AuthContext', () => ({
  useAuth: () => mockAuthContext
}));

const mockNotificationService = NotificationService as any;

describe('useNotifications', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    
    // Default mock implementations
    mockNotificationService.getInAppNotifications.mockReturnValue([]);
    mockNotificationService.onInAppNotificationAdded.mockReturnValue(() => {});
    mockNotificationService.onInAppNotificationRemoved.mockReturnValue(() => {});
    mockNotificationService.hasBrowserPermission.mockReturnValue(false);
    mockNotificationService.showInAppNotification.mockReturnValue('notification-id');
    mockNotificationService.requestBrowserPermission.mockResolvedValue(true);
    mockNotificationService.startNotificationScheduler.mockResolvedValue(undefined);
    mockNotificationService.scheduleAllEventNotifications.mockResolvedValue(undefined);
    mockNotificationService.getNotificationSummary.mockReturnValue({
      total: 0,
      unread: 0,
      byType: {}
    });
  });

  it('should initialize with empty notifications', () => {
    const { result } = renderHook(() => useNotifications());
    
    expect(result.current.notifications).toEqual([]);
    expect(result.current.hasBrowserPermission).toBe(false);
  });

  it('should load initial notifications on mount', () => {
    const mockNotifications = [
      {
        id: '1',
        message: 'Test notification',
        type: 'info' as const,
        timestamp: new Date(),
        read: false
      }
    ];
    
    mockNotificationService.getInAppNotifications.mockReturnValue(mockNotifications);
    
    const { result } = renderHook(() => useNotifications());
    
    expect(result.current.notifications).toEqual(mockNotifications);
  });

  it('should set up notification listeners', () => {
    renderHook(() => useNotifications());
    
    expect(mockNotificationService.onInAppNotificationAdded).toHaveBeenCalled();
    expect(mockNotificationService.onInAppNotificationRemoved).toHaveBeenCalled();
  });

  it('should handle new notifications from listener', () => {
    let addedCallback: (notification: any) => void = () => {};
    
    mockNotificationService.onInAppNotificationAdded.mockImplementation((callback) => {
      addedCallback = callback;
      return () => {};
    });
    
    const { result } = renderHook(() => useNotifications());
    
    const newNotification = {
      id: '1',
      message: 'New notification',
      type: 'info' as const,
      timestamp: new Date(),
      read: false
    };
    
    act(() => {
      addedCallback(newNotification);
    });
    
    expect(result.current.notifications).toContainEqual(newNotification);
  });

  it('should handle removed notifications from listener', () => {
    let removedCallback: (id: string) => void = () => {};
    
    mockNotificationService.onInAppNotificationRemoved.mockImplementation((callback) => {
      removedCallback = callback;
      return () => {};
    });
    
    const initialNotifications = [
      {
        id: '1',
        message: 'Test notification',
        type: 'info' as const,
        timestamp: new Date(),
        read: false
      }
    ];
    
    mockNotificationService.getInAppNotifications.mockReturnValue(initialNotifications);
    
    const { result } = renderHook(() => useNotifications());
    
    act(() => {
      removedCallback('1');
    });
    
    expect(result.current.notifications).toEqual([]);
  });

  it('should show notification', () => {
    const { result } = renderHook(() => useNotifications());
    
    act(() => {
      result.current.showNotification('Test message', 'info', {
        eventId: 'event-123',
        autoHide: false
      });
    });
    
    expect(mockNotificationService.showInAppNotification).toHaveBeenCalledWith(
      'Test message',
      'info',
      {
        eventId: 'event-123',
        autoHide: false
      }
    );
  });

  it('should mark notification as read', () => {
    const initialNotifications = [
      {
        id: '1',
        message: 'Test notification',
        type: 'info' as const,
        timestamp: new Date(),
        read: false
      }
    ];
    
    mockNotificationService.getInAppNotifications.mockReturnValue(initialNotifications);
    
    const { result } = renderHook(() => useNotifications());
    
    act(() => {
      result.current.markAsRead('1');
    });
    
    expect(mockNotificationService.markNotificationAsRead).toHaveBeenCalledWith('1');
    expect(result.current.notifications[0].read).toBe(true);
  });

  it('should clear notification', () => {
    const { result } = renderHook(() => useNotifications());
    
    act(() => {
      result.current.clearNotification('1');
    });
    
    expect(mockNotificationService.clearNotification).toHaveBeenCalledWith('1');
  });

  it('should clear all notifications', () => {
    const { result } = renderHook(() => useNotifications());
    
    act(() => {
      result.current.clearAllNotifications();
    });
    
    expect(mockNotificationService.clearAllNotifications).toHaveBeenCalled();
  });

  it('should request browser permission', async () => {
    const { result } = renderHook(() => useNotifications());
    
    let permissionResult;
    await act(async () => {
      permissionResult = await result.current.requestBrowserPermission();
    });
    
    expect(mockNotificationService.requestBrowserPermission).toHaveBeenCalled();
    expect(permissionResult).toBe(true);
    expect(result.current.hasBrowserPermission).toBe(true);
  });

  it('should get notification summary', () => {
    const mockSummary = {
      total: 5,
      unread: 3,
      byType: {
        info: 2,
        warning: 1,
        error: 1,
        success: 1
      }
    };
    
    mockNotificationService.getNotificationSummary.mockReturnValue(mockSummary);
    
    const { result } = renderHook(() => useNotifications());
    
    expect(result.current.notificationSummary).toEqual(mockSummary);
  });

  it('should start notification scheduler when user is authenticated', () => {
    renderHook(() => useNotifications());
    
    expect(mockNotificationService.startNotificationScheduler).toHaveBeenCalled();
    expect(mockNotificationService.scheduleAllEventNotifications).toHaveBeenCalled();
    expect((window as any).__AUTH_CONTEXT__).toEqual({
      user: mockAuthContext.user
    });
  });

  it('should clear auth context when user logs out', () => {
    // Start with authenticated user
    const { rerender } = renderHook(() => useNotifications());
    
    // Mock user logout
    mockAuthContext.user = null;
    
    rerender();
    
    expect((window as any).__AUTH_CONTEXT__).toBeUndefined();
  });

  it('should handle notification scheduler errors gracefully', () => {
    mockNotificationService.startNotificationScheduler.mockRejectedValue(new Error('Scheduler error'));
    mockNotificationService.scheduleAllEventNotifications.mockRejectedValue(new Error('Schedule error'));
    
    // Should not throw error
    expect(() => {
      renderHook(() => useNotifications());
    }).not.toThrow();
  });

  it('should clean up listeners on unmount', () => {
    const unsubscribeAdded = vi.fn();
    const unsubscribeRemoved = vi.fn();
    
    mockNotificationService.onInAppNotificationAdded.mockReturnValue(unsubscribeAdded);
    mockNotificationService.onInAppNotificationRemoved.mockReturnValue(unsubscribeRemoved);
    
    const { unmount } = renderHook(() => useNotifications());
    
    unmount();
    
    expect(unsubscribeAdded).toHaveBeenCalled();
    expect(unsubscribeRemoved).toHaveBeenCalled();
  });
});