import React from 'react';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { vi, describe, it, beforeEach, expect } from 'vitest';
import { UpdateNotification } from '../UpdateNotification';

describe('UpdateNotification', () => {
  const mockOnUpdate = vi.fn();
  const mockOnDismiss = vi.fn();

  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('renders nothing when not visible', () => {
    const { container } = render(
      <UpdateNotification
        isVisible={false}
        onUpdate={mockOnUpdate}
        onDismiss={mockOnDismiss}
      />
    );
    
    expect(container.firstChild).toBeNull();
  });

  it('renders update notification when visible', () => {
    render(
      <UpdateNotification
        isVisible={true}
        onUpdate={mockOnUpdate}
        onDismiss={mockOnDismiss}
      />
    );
    
    expect(screen.getByText('App Update Available')).toBeInTheDocument();
    expect(screen.getByText('A new version is ready to install')).toBeInTheDocument();
    expect(screen.getByText('Update Now')).toBeInTheDocument();
  });

  it('calls onUpdate when Update Now button is clicked', async () => {
    mockOnUpdate.mockResolvedValue(undefined);
    
    render(
      <UpdateNotification
        isVisible={true}
        onUpdate={mockOnUpdate}
        onDismiss={mockOnDismiss}
      />
    );
    
    const updateButton = screen.getByText('Update Now');
    fireEvent.click(updateButton);
    
    expect(mockOnUpdate).toHaveBeenCalledTimes(1);
  });

  it('shows loading state during update', async () => {
    let resolveUpdate: () => void;
    const updatePromise = new Promise<void>((resolve) => {
      resolveUpdate = resolve;
    });
    mockOnUpdate.mockReturnValue(updatePromise);
    
    render(
      <UpdateNotification
        isVisible={true}
        onUpdate={mockOnUpdate}
        onDismiss={mockOnDismiss}
      />
    );
    
    const updateButton = screen.getByText('Update Now');
    fireEvent.click(updateButton);
    
    // Should show loading state
    expect(screen.getByText('Updating...')).toBeInTheDocument();
    expect(screen.getByText('Installing update...')).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /updating/i })).toBeDisabled();
    
    // Resolve the update
    resolveUpdate!();
    await waitFor(() => {
      expect(mockOnUpdate).toHaveBeenCalledTimes(1);
    });
  });

  it('shows error message when update fails', async () => {
    mockOnUpdate.mockRejectedValue(new Error('Update failed'));
    
    render(
      <UpdateNotification
        isVisible={true}
        onUpdate={mockOnUpdate}
        onDismiss={mockOnDismiss}
      />
    );
    
    const updateButton = screen.getByText('Update Now');
    fireEvent.click(updateButton);
    
    await waitFor(() => {
      expect(screen.getByText('Update failed. Please try again.')).toBeInTheDocument();
    });
    
    // Should be able to try again
    expect(screen.getByText('Update Now')).toBeInTheDocument();
    expect(updateButton).not.toBeDisabled();
  });

  it('calls onDismiss when dismiss button is clicked', () => {
    render(
      <UpdateNotification
        isVisible={true}
        onUpdate={mockOnUpdate}
        onDismiss={mockOnDismiss}
      />
    );
    
    const dismissButton = screen.getByLabelText('Dismiss notification');
    fireEvent.click(dismissButton);
    
    expect(mockOnDismiss).toHaveBeenCalledTimes(1);
  });

  it('does not show dismiss button when onDismiss is not provided', () => {
    render(
      <UpdateNotification
        isVisible={true}
        onUpdate={mockOnUpdate}
      />
    );
    
    expect(screen.queryByLabelText('Dismiss notification')).not.toBeInTheDocument();
  });

  it('prevents dismissal during update', async () => {
    let resolveUpdate: () => void;
    const updatePromise = new Promise<void>((resolve) => {
      resolveUpdate = resolve;
    });
    mockOnUpdate.mockReturnValue(updatePromise);
    
    render(
      <UpdateNotification
        isVisible={true}
        onUpdate={mockOnUpdate}
        onDismiss={mockOnDismiss}
      />
    );
    
    const updateButton = screen.getByText('Update Now');
    fireEvent.click(updateButton);
    
    // Dismiss button should not be visible during update
    expect(screen.queryByLabelText('Dismiss notification')).not.toBeInTheDocument();
    
    resolveUpdate!();
    await waitFor(() => {
      expect(mockOnUpdate).toHaveBeenCalledTimes(1);
    });
  });

  it('applies custom className', () => {
    const { container } = render(
      <UpdateNotification
        isVisible={true}
        onUpdate={mockOnUpdate}
        className="custom-class"
      />
    );
    
    expect(container.firstChild).toHaveClass('custom-class');
  });
});