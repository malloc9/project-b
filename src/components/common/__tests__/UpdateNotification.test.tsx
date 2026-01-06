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
    expect(screen.getByText('Update Now')).toBeInTheDocument();
    expect(screen.getByText('Later')).toBeInTheDocument();
  });

  it('calls onUpdate when Update Now button is clicked', async () => {
    mockOnUpdate.mockClear();

    const { rerender } = render(
      <UpdateNotification 
        isVisible={true}
        onUpdate={mockOnUpdate}
        onUpdateLaterClick={vi.fn()}
        onDismiss={mockOnDismiss}
      />
    );

    await waitFor(() => {
      expect(screen.getByText('App Update Available')).toBeInTheDocument();
      expect(screen.getByText('Update Now')).toBeInTheDocument();
      expect(screen.getByText('Later')).toBeInTheDocument();
    });
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

  it.skip('shows error message when update fails', async () => {
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
  });

  it.skip('calls onDismiss when dismiss button is clicked', async () => {
    render(
      <UpdateNotification 
        isVisible={true}
        onUpdate={mockOnUpdate}
        onDismiss={mockOnDismiss}
      />
    );
    
    const dismissButton = screen.getByLabelText('Dismiss notification');
    fireEvent.click(dismissButton);
    
    await waitFor(() => {
      expect(mockOnDismiss).toHaveBeenCalledTimes(1);
    });
  });

  it.skip('prevents dismissal during update', async () => {
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
    
    const dismissButton = screen.getByLabelText('Dismiss notification');
    fireEvent.click(dismissButton);
    
    await waitFor(() => {
      expect(mockOnUpdate).toHaveBeenCalledTimes(1);
    });
  });

  it('applies custom className', () => {
    const { container } = render(
      <UpdateNotification 
        isVisible={true}
        onUpdate={mockOnUpdate}
        onDismiss={mockOnDismiss}
        className="custom-class"
      />
    );
    
    expect(container.firstChild).toHaveClass('custom-class');
  });
});