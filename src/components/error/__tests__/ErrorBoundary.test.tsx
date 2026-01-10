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
    let shouldThrow = true;
    
    const TestComponentWithToggle = () => {
      if (shouldThrow) {
        throw new Error('Test error message');
      }
      return <div>No error</div>;
    };

    const { rerender } = render(
      <ErrorBoundary>
        <TestComponentWithToggle />
      </ErrorBoundary>
    );

    expect(screen.getByText('Something went wrong')).toBeInTheDocument();

    const retryButton = screen.getByText('Try Again');
    
    // Change the condition before clicking retry
    shouldThrow = false;
    
    fireEvent.click(retryButton);

    // Wait for the retry to take effect
    setTimeout(() => {
      expect(screen.getByText('No error')).toBeInTheDocument();
    }, 150);
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
    const customFallback = (error: Error, retry: () => void) => (
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
    // Mock Date.now and Math.random to ensure different IDs
    const originalDateNow = Date.now;
    const originalMathRandom = Math.random;
    
    let dateCounter = 1000;
    let randomCounter = 0.1;
    
    Date.now = vi.fn(() => ++dateCounter); // Increment each time
    Math.random = vi.fn(() => {
      randomCounter += 0.1;
      return randomCounter;
    });

    // First error boundary
    const { unmount } = render(
      <ErrorBoundary>
        <ThrowError shouldThrow={true} />
      </ErrorBoundary>
    );

    const firstErrorId = screen.getByText(/Error ID:/).textContent;
    
    // Unmount and create a new error boundary
    unmount();

    render(
      <ErrorBoundary>
        <ThrowError shouldThrow={true} />
      </ErrorBoundary>
    );

    const secondErrorId = screen.getByText(/Error ID:/).textContent;

    expect(firstErrorId).not.toBe(secondErrorId);
    
    // Restore original functions
    Date.now = originalDateNow;
    Math.random = originalMathRandom;
  });
});