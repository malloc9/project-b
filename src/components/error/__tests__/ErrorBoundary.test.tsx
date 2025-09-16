import React from 'react';
import { render, screen, fireEvent } from '@testing-library/react';
import { vi, describe, it, expect, beforeEach, afterEach } from 'vitest';
import { ErrorBoundary } from '../ErrorBoundary';
import { ErrorLogger } from '../../../utils/errorLogger';

// Mock the ErrorLogger
vi.mock('../../../utils/errorLogger', () => ({
  ErrorLogger: {
    logError: vi.fn()
  }
}));

// Component that throws an error for testing
const ThrowError: React.FC<{ shouldThrow: boolean }> = ({ shouldThrow }) => {
  if (shouldThrow) {
    throw new Error('Test error message');
  }
  return <div>No error</div>;
};

describe('ErrorBoundary', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    // Suppress console.error for cleaner test output
    vi.spyOn(console, 'error').mockImplementation(() => {});
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  it('renders children when there is no error', () => {
    render(
      <ErrorBoundary>
        <ThrowError shouldThrow={false} />
      </ErrorBoundary>
    );

    expect(screen.getByText('No error')).toBeInTheDocument();
  });

  it('renders error display when child component throws', () => {
    render(
      <ErrorBoundary>
        <ThrowError shouldThrow={true} />
      </ErrorBoundary>
    );

    expect(screen.getByText('Something went wrong')).toBeInTheDocument();
    expect(screen.getByText(/Test error message/)).toBeInTheDocument();
  });

  it('logs error when component throws', () => {
    render(
      <ErrorBoundary>
        <ThrowError shouldThrow={true} />
      </ErrorBoundary>
    );

    expect(ErrorLogger.logError).toHaveBeenCalledWith(
      expect.objectContaining({
        code: 'unknown-error',
        message: 'Test error message'
      }),
      expect.any(String)
    );
  });

  it('provides retry functionality', () => {
    const { rerender } = render(
      <ErrorBoundary>
        <ThrowError shouldThrow={true} />
      </ErrorBoundary>
    );

    expect(screen.getByText('Something went wrong')).toBeInTheDocument();

    const retryButton = screen.getByText('Try Again');
    fireEvent.click(retryButton);

    // Re-render with no error
    rerender(
      <ErrorBoundary>
        <ThrowError shouldThrow={false} />
      </ErrorBoundary>
    );

    expect(screen.getByText('No error')).toBeInTheDocument();
  });

  it('provides reload functionality', () => {
    // Mock window.location.reload
    const mockReload = vi.fn();
    Object.defineProperty(window, 'location', {
      value: { reload: mockReload },
      writable: true
    });

    render(
      <ErrorBoundary>
        <ThrowError shouldThrow={true} />
      </ErrorBoundary>
    );

    const reloadButton = screen.getByText('Reload Page');
    fireEvent.click(reloadButton);

    expect(mockReload).toHaveBeenCalled();
  });

  it('uses custom fallback when provided', () => {
    const customFallback = (error: any, retry: () => void) => (
      <div>
        <h1>Custom Error Display</h1>
        <p>{error.message}</p>
        <button onClick={retry}>Custom Retry</button>
      </div>
    );

    render(
      <ErrorBoundary fallback={customFallback}>
        <ThrowError shouldThrow={true} />
      </ErrorBoundary>
    );

    expect(screen.getByText('Custom Error Display')).toBeInTheDocument();
    expect(screen.getByText('Custom Retry')).toBeInTheDocument();
  });

  it('shows error details in development mode', () => {
    const originalEnv = process.env.NODE_ENV;
    process.env.NODE_ENV = 'development';

    render(
      <ErrorBoundary>
        <ThrowError shouldThrow={true} />
      </ErrorBoundary>
    );

    expect(screen.getByText('Show Error Details')).toBeInTheDocument();

    process.env.NODE_ENV = originalEnv;
  });

  it('generates unique error IDs', () => {
    const { rerender } = render(
      <ErrorBoundary>
        <ThrowError shouldThrow={true} />
      </ErrorBoundary>
    );

    const firstErrorId = screen.getByText(/Error ID:/).textContent;

    // Reset and throw another error
    rerender(
      <ErrorBoundary>
        <ThrowError shouldThrow={false} />
      </ErrorBoundary>
    );

    rerender(
      <ErrorBoundary>
        <ThrowError shouldThrow={true} />
      </ErrorBoundary>
    );

    const secondErrorId = screen.getByText(/Error ID:/).textContent;

    expect(firstErrorId).not.toBe(secondErrorId);
  });
});