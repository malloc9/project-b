import { render, screen, waitFor } from '@testing-library/react';
import { vi, describe, it, expect, beforeEach } from 'vitest';
import { LazyImage } from '../LazyImage';

// Mock the imageUtils module
vi.mock('../../../utils/imageUtils', () => ({
  createLazyImageObserver: vi.fn(),
  preloadImage: vi.fn()
}));

import { createLazyImageObserver, preloadImage } from '../../../utils/imageUtils';

const mockCreateLazyImageObserver = vi.mocked(createLazyImageObserver);
const mockPreloadImage = vi.mocked(preloadImage);

// Mock IntersectionObserver
const mockIntersectionObserver = vi.fn();
mockIntersectionObserver.mockReturnValue({
  observe: vi.fn(),
  unobserve: vi.fn(),
  disconnect: vi.fn(),
});

describe('LazyImage', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    
    // Setup the mock to return the mocked intersection observer
    mockCreateLazyImageObserver.mockReturnValue(mockIntersectionObserver());
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

    expect(mockCreateLazyImageObserver).toHaveBeenCalledWith(
      expect.any(Function)
    );
  });

  it('loads actual image when in view', async () => {
    const onLoad = vi.fn();
    mockPreloadImage.mockResolvedValue();
    
    render(
      <LazyImage
        src="test-image.jpg"
        alt="Test image"
        onLoad={onLoad}
      />
    );

    // Get the callback function passed to createLazyImageObserver
    const observerCallback = mockCreateLazyImageObserver.mock.calls[0][0];
    
    // Simulate intersection observer callback
    observerCallback([{ isIntersecting: true, target: {} }]);

    await waitFor(() => {
      expect(mockPreloadImage).toHaveBeenCalledWith('test-image.jpg');
      expect(onLoad).toHaveBeenCalled();
    });
  });

  it('handles image load error', async () => {
    const onError = vi.fn();
    mockPreloadImage.mockRejectedValue(new Error('Failed to load'));
    
    render(
      <LazyImage
        src="invalid-image.jpg"
        alt="Test image"
        onError={onError}
      />
    );

    // Get the callback function passed to createLazyImageObserver
    const observerCallback = mockCreateLazyImageObserver.mock.calls[0][0];
    
    // Simulate intersection observer callback
    observerCallback([{ isIntersecting: true, target: {} }]);

    await waitFor(() => {
      expect(mockPreloadImage).toHaveBeenCalledWith('invalid-image.jpg');
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
    expect((img as HTMLImageElement).src).toContain('data:image/svg+xml');
  });
});