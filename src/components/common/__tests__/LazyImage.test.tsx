import { render, screen, waitFor } from '@testing-library/react';
import { vi } from 'vitest';
import { LazyImage } from '../LazyImage';
import { it } from 'node:test';
import { it } from 'node:test';
import { it } from 'node:test';
import { it } from 'node:test';
import { it } from 'node:test';
import { it } from 'node:test';
import { beforeEach } from 'node:test';
import { describe } from 'node:test';

// Mock IntersectionObserver
const mockIntersectionObserver = vi.fn();
mockIntersectionObserver.mockReturnValue({
  observe: vi.fn(),
  unobserve: vi.fn(),
  disconnect: vi.fn(),
});

Object.defineProperty(window, 'IntersectionObserver', {
  writable: true,
  configurable: true,
  value: mockIntersectionObserver,
});

// Mock Image constructor
let mockImage: any;

Object.defineProperty(global, 'Image', {
  writable: true,
  value: vi.fn(() => {
    mockImage = {
      onload: null,
      onerror: null,
      src: '',
    };
    return mockImage;
  }),
});

describe('LazyImage', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('renders with placeholder initially', () => {
    render(
      <LazyImage
        src="test-image.jpg"
        alt="Test image"
        placeholder="placeholder.jpg"
      />
    );

    const img = screen.getByAltText('Test image');
    expect(img).toHaveAttribute('src', 'placeholder.jpg');
  });

  it('sets up intersection observer on mount', () => {
    render(
      <LazyImage
        src="test-image.jpg"
        alt="Test image"
      />
    );

    expect(mockIntersectionObserver).toHaveBeenCalledWith(
      expect.any(Function),
      expect.objectContaining({
        root: null,
        rootMargin: '50px',
        threshold: 0.1,
      })
    );
  });

  it('loads actual image when in view', async () => {
    const onLoad = vi.fn();
    
    render(
      <LazyImage
        src="test-image.jpg"
        alt="Test image"
        onLoad={onLoad}
      />
    );

    // Simulate intersection observer callback
    const observerCallback = mockIntersectionObserver.mock.calls[0][0];
    observerCallback([{ isIntersecting: true, target: {} }]);

    // Simulate image load
    if (mockImage && mockImage.onload) {
      mockImage.onload();
    }

    await waitFor(() => {
      expect(onLoad).toHaveBeenCalled();
    });
  });

  it('handles image load error', async () => {
    const onError = vi.fn();
    
    render(
      <LazyImage
        src="invalid-image.jpg"
        alt="Test image"
        onError={onError}
      />
    );

    // Simulate intersection observer callback
    const observerCallback = mockIntersectionObserver.mock.calls[0][0];
    observerCallback([{ isIntersecting: true, target: {} }]);

    // Simulate image error
    if (mockImage && mockImage.onerror) {
      mockImage.onerror();
    }

    await waitFor(() => {
      expect(onError).toHaveBeenCalled();
    });
  });

  it('applies custom className', () => {
    render(
      <LazyImage
        src="test-image.jpg"
        alt="Test image"
        className="custom-class"
      />
    );

    const img = screen.getByAltText('Test image');
    expect(img).toHaveClass('custom-class');
  });

  it('uses default placeholder when none provided', () => {
    render(
      <LazyImage
        src="test-image.jpg"
        alt="Test image"
      />
    );

    const img = screen.getByAltText('Test image');
    expect(img.src).toContain('data:image/svg+xml');
  });
});