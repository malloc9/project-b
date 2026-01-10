import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { describe, it, beforeEach, vi } from 'vitest';
import { UpdateNotification } from '../UpdateNotification';

describe('UpdateNotification', () => {
  const mockOnUpdate = vi.fn();
  const mockOnDismiss = vi.fn();

  beforeEach(() => {
    mockOnUpdate.mockReset();
    mockOnDismiss.mockReset();
  });

  it('renders nothing when not visible', () => {
    const { container } = render(
      <UpdateNotification isVisible={false} onUpdate={mockOnUpdate} onDismiss={mockOnDismiss} />
    );
    expect(container.firstChild).toBeNull();
  });

  it('renders update notification when visible', () => {
    render(
      <UpdateNotification isVisible={true} onUpdate={mockOnUpdate} onDismiss={mockOnDismiss} />
    );

    // Text may be English or Hungarian depending on i18n language in tests
    expect(screen.getByText(/Update Available|Frissítés Elérhető/)).toBeInTheDocument();
    expect(screen.getByText(/Update Now|Frissítés Most/)).toBeInTheDocument();
    expect(screen.getByText(/Later|Később/)).toBeInTheDocument();
  });

  it('calls onUpdate when Update Now button is clicked', () => {
    mockOnUpdate.mockClear();

    render(
      <UpdateNotification isVisible={true} onUpdate={mockOnUpdate} onDismiss={mockOnDismiss} />
    );

    const updateButton = screen.getByRole('button', { name: /Update Now|Frissítés Most/i });
    fireEvent.click(updateButton);

    expect(mockOnUpdate).toHaveBeenCalledTimes(1);
  });

  it('shows loading state during update', async () => {
    let resolveUpdate: (() => void) | undefined;
    const updatePromise = new Promise<void>((resolve) => {
      resolveUpdate = resolve;
    });
    (mockOnUpdate as any).mockReturnValue(updatePromise);

    render(
      <UpdateNotification isVisible={true} onUpdate={mockOnUpdate} onDismiss={mockOnDismiss} />
    );

    const updateButton = screen.getByRole('button', { name: /Update Now|Frissítés Most/i });
    fireEvent.click(updateButton);

    // Ensure the button becomes disabled when updating starts
    await waitFor(() => {
      const buttons = screen.getAllByRole('button');
      const updateBtn = buttons[0] as HTMLButtonElement;
      expect(updateBtn.disabled).toBe(true);
    });

    // Resolve the update to finish
    resolveUpdate && resolveUpdate();
  });

  it('applies custom className', () => {
    const { container } = render(
      <UpdateNotification isVisible={true} onUpdate={mockOnUpdate} onDismiss={mockOnDismiss} className="custom-class" />
    );
    expect(container.firstChild).toHaveClass('custom-class');
  });
});
