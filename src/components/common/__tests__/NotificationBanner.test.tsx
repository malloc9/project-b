import React from 'react';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { describe, it, expect, beforeEach, vi } from 'vitest';
import NotificationBanner from '../NotificationBanner';
import { NotificationService, InAppNotification } from '../../../services/notificationService';

// Mock the NotificationService
vi.mock('../../../services/notificationService', () => ({
  NotificationService: {
    getInAppNotifications: vi.fn(),
    onInAppNotificationAdded: vi.fn(),
    onInAppNotificationRemoved: vi.fn(),
    clearNotification: vi.fn(),
    markNotificationAsRead: vi.fn()
  }
}));

const mockNotificationService = vi.mocked(NotificationService, true);

describe('NotificationBanner', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    
    // Default mock implementations
    mockNotificationService.getInAppNotifications.mockReturnValue([]);
    mockNotificationService.onInAppNotificationAdded.mockReturnValue(() => {});
    mockNotificationService.onInAppNotificationRemoved.mockReturnValue(() => {});
  });

  it('should render nothing when no notifications', () => {
    const { container } = render(<NotificationBanner />);
    expect(container.firstChild).toBeNull();
  });

  it('should render notifications when they exist', () => {
    const mockNotifications: InAppNotification[] = [
      {
        id: '1',
        message: 'Test notification',
        type: 'info' as const,
        timestamp: new Date(),
        read: false
      }
    ];
    
    mockNotificationService.getInAppNotifications.mockReturnValue(mockNotifications);
    
    render(<NotificationBanner />);
    
    expect(screen.getByText('Test notification')).toBeInTheDocument();
  });

  it('should display different notification types with correct styling', () => {
    const mockNotifications: InAppNotification[] = [
      {
        id: '1',
        message: 'Error message',
        type: 'error' as const,
        timestamp: new Date(),
        read: false
      },
      {
        id: '2',
        message: 'Warning message',
        type: 'warning' as const,
        timestamp: new Date(),
        read: false
      },
      {
        id: '3',
        message: 'Success message',
        type: 'success' as const,
        timestamp: new Date(),
        read: false
      },
      {
        id: '4',
        message: 'Info message',
        type: 'info' as const,
        timestamp: new Date(),
        read: false
      }
    ];
    
    mockNotificationService.getInAppNotifications.mockReturnValue(mockNotifications);
    
    render(<NotificationBanner />);
    
    expect(screen.getByText('Error message')).toBeInTheDocument();
    expect(screen.getByText('Warning message')).toBeInTheDocument();
    expect(screen.getByText('Success message')).toBeInTheDocument();
    expect(screen.getByText('Info message')).toBeInTheDocument();
  });

  it('should show timestamp for notifications', () => {
    const timestamp = new Date('2023-01-01T12:00:00Z');
    const mockNotifications: InAppNotification[] = [
      {
        id: '1',
        message: 'Test notification',
        type: 'info' as const,
        timestamp,
        read: false
      }
    ];
    
    mockNotificationService.getInAppNotifications.mockReturnValue(mockNotifications);
    
    render(<NotificationBanner />);
    
    expect(screen.getByText(timestamp.toLocaleTimeString())).toBeInTheDocument();
  });

  it('should handle dismiss button click', () => {
    const mockNotifications: InAppNotification[] = [
      {
        id: '1',
        message: 'Test notification',
        type: 'info' as const,
        timestamp: new Date(),
        read: false
      }
    ];
    
    mockNotificationService.getInAppNotifications.mockReturnValue(mockNotifications);
    
    render(<NotificationBanner />);
    
    const dismissButton = screen.getByLabelText('Dismiss notification');
    fireEvent.click(dismissButton);
    
    expect(mockNotificationService.clearNotification).toHaveBeenCalledWith('1');
  });

  it('should handle mark as read button click', () => {
    const mockNotifications: InAppNotification[] = [
      {
        id: '1',
        message: 'Test notification',
        type: 'info' as const,
        timestamp: new Date(),
        read: false
      }
    ];
    
    mockNotificationService.getInAppNotifications.mockReturnValue(mockNotifications);
    
    render(<NotificationBanner />);
    
    const markReadButton = screen.getByText('Mark read');
    fireEvent.click(markReadButton);
    
    expect(mockNotificationService.markNotificationAsRead).toHaveBeenCalledWith('1');
  });

  it('should not show mark as read button for read notifications', () => {
    const mockNotifications: InAppNotification[] = [
      {
        id: '1',
        message: 'Test notification',
        type: 'info' as const,
        timestamp: new Date(),
        read: true
      }
    ];
    
    mockNotificationService.getInAppNotifications.mockReturnValue(mockNotifications);
    
    render(<NotificationBanner />);
    
    expect(screen.queryByText('Mark read')).not.toBeInTheDocument();
  });

  it('should apply opacity to read notifications', () => {
    const mockNotifications: InAppNotification[] = [
      {
        id: '1',
        message: 'Read notification',
        type: 'info' as const,
        timestamp: new Date(),
        read: true
      }
    ];
    
    mockNotificationService.getInAppNotifications.mockReturnValue(mockNotifications);
    
    render(<NotificationBanner />);
    
    const notification = screen.getByText('Read notification').closest('[role="alert"]');
    expect(notification).toHaveClass('opacity-75');
  });

  it('should limit displayed notifications to 5', () => {
    const mockNotifications: InAppNotification[] = Array.from({ length: 10 }, (_, i) => ({
      id: `${i + 1}`,
      message: `Notification ${i + 1}`,
      type: 'info' as const,
      timestamp: new Date(),
      read: false
    }));
    
    mockNotificationService.getInAppNotifications.mockReturnValue(mockNotifications);
    
    render(<NotificationBanner />);
    
    // Should only show first 5 notifications
    expect(screen.getByText('Notification 1')).toBeInTheDocument();
    expect(screen.getByText('Notification 5')).toBeInTheDocument();
    expect(screen.queryByText('Notification 6')).not.toBeInTheDocument();
    
    // Should show clear all button with count
    expect(screen.getByText('Clear all (10 total)')).toBeInTheDocument();
  });

  it('should handle clear all button click', () => {
    const mockNotifications: InAppNotification[] = Array.from({ length: 10 }, (_, i) => ({
      id: `${i + 1}`,
      message: `Notification ${i + 1}`,
      type: 'info' as const,
      timestamp: new Date(),
      read: false
    }));
    
    mockNotificationService.getInAppNotifications.mockReturnValue(mockNotifications);
    mockNotificationService.clearAllNotifications = vi.fn();
    
    render(<NotificationBanner />);
    
    const clearAllButton = screen.getByText('Clear all (10 total)');
    fireEvent.click(clearAllButton);
    
    expect(mockNotificationService.clearAllNotifications).toHaveBeenCalled();
  });

  it('should listen for new notifications', async () => {
    let addedCallback: (notification: InAppNotification) => void = () => {};
    
    mockNotificationService.onInAppNotificationAdded.mockImplementation((callback) => {
      addedCallback = callback;
      return () => {};
    });
    
    mockNotificationService.getInAppNotifications.mockReturnValue([]);
    
    render(<NotificationBanner />);
    
    // Simulate new notification added
    const newNotification: InAppNotification = {
      id: '1',
      message: 'New notification',
      type: 'info' as const,
      timestamp: new Date(),
      read: false
    };
    
    addedCallback(newNotification);
    
    await waitFor(() => {
      expect(screen.getByText('New notification')).toBeInTheDocument();
    });
  });

  it('should listen for removed notifications', async () => {
    let removedCallback: (id: string) => void = () => {};
    
    mockNotificationService.onInAppNotificationRemoved.mockImplementation((callback) => {
      removedCallback = callback;
      return () => {};
    });
    
    const mockNotifications: InAppNotification[] = [
      {
        id: '1',
        message: 'Test notification',
        type: 'info' as const,
        timestamp: new Date(),
        read: false
      }
    ];
    
    mockNotificationService.getInAppNotifications.mockReturnValue(mockNotifications);
    
    render(<NotificationBanner />);
    
    expect(screen.getByText('Test notification')).toBeInTheDocument();
    
    // Simulate notification removed
    removedCallback('1');
    
    await waitFor(() => {
      expect(screen.queryByText('Test notification')).not.toBeInTheDocument();
    });
  });

  it('should apply custom className', () => {
    const mockNotifications: InAppNotification[] = [
      {
        id: '1',
        message: 'Test notification',
        type: 'info' as const,
        timestamp: new Date(),
        read: false
      }
    ];
    
    mockNotificationService.getInAppNotifications.mockReturnValue(mockNotifications);
    
    const { container } = render(<NotificationBanner className="custom-class" />);
    
    expect(container.firstChild).toHaveClass('custom-class');
  });
});