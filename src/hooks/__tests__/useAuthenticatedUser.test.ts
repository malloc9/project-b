import { renderHook } from '@testing-library/react';
import { vi } from 'vitest';
import { useAuthenticatedUser, useRequireAuthenticatedUser } from '../useAuthenticatedUser';
import { useAuth } from '../../contexts/AuthContext';
import type { User } from '../../types';

// Mock the useAuth hook
vi.mock('../../contexts/AuthContext');
const mockUseAuth = vi.mocked(useAuth);

describe('useAuthenticatedUser', () => {
  const mockUser: User = {
    uid: 'test-uid',
    email: 'test@example.com',
    displayName: 'Test User',
    createdAt: new Date(),
  };

  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('should return null user when loading', () => {
    mockUseAuth.mockReturnValue({
      user: mockUser,
      loading: true,
      login: vi.fn(),
      logout: vi.fn(),
      resetPassword: vi.fn(),
    });

    const { result } = renderHook(() => useAuthenticatedUser());

    expect(result.current.user).toBeNull();
    expect(result.current.isAuthenticated).toBe(false);
    expect(result.current.isLoading).toBe(true);
    expect(result.current.error).toBeNull();
  });

  it('should return user when authenticated and not loading', () => {
    mockUseAuth.mockReturnValue({
      user: mockUser,
      loading: false,
      login: vi.fn(),
      logout: vi.fn(),
      resetPassword: vi.fn(),
    });

    const { result } = renderHook(() => useAuthenticatedUser());

    expect(result.current.user).toEqual(mockUser);
    expect(result.current.isAuthenticated).toBe(true);
    expect(result.current.isLoading).toBe(false);
    expect(result.current.error).toBeNull();
  });

  it('should return null user when not authenticated and not loading', () => {
    mockUseAuth.mockReturnValue({
      user: null,
      loading: false,
      login: vi.fn(),
      logout: vi.fn(),
      resetPassword: vi.fn(),
    });

    const { result } = renderHook(() => useAuthenticatedUser());

    expect(result.current.user).toBeNull();
    expect(result.current.isAuthenticated).toBe(false);
    expect(result.current.isLoading).toBe(false);
    expect(result.current.error).toBeNull();
  });
});

describe('useRequireAuthenticatedUser', () => {
  const mockUser: User = {
    uid: 'test-uid',
    email: 'test@example.com',
    displayName: 'Test User',
    createdAt: new Date(),
  };

  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('should return user when authenticated', () => {
    mockUseAuth.mockReturnValue({
      user: mockUser,
      loading: false,
      login: vi.fn(),
      logout: vi.fn(),
      resetPassword: vi.fn(),
    });

    const { result } = renderHook(() => useRequireAuthenticatedUser());

    expect(result.current).toEqual(mockUser);
  });

  it.skip('should throw error when loading', () => {
    mockUseAuth.mockReturnValue({
      user: mockUser,
      loading: true,
      login: vi.fn(),
      logout: vi.fn(),
      resetPassword: vi.fn(),
    });

    const { result } = renderHook(() => useRequireAuthenticatedUser());

    expect(result.error).toEqual(Error('Authentication is still loading'));
  });

  it.skip('should throw error when not authenticated', () => {
    mockUseAuth.mockReturnValue({
      user: null,
      loading: false,
      login: vi.fn(),
      logout: vi.fn(),
      resetPassword: vi.fn(),
    });

    const { result } = renderHook(() => useRequireAuthenticatedUser());

    expect(result.error).toEqual(Error('User must be authenticated to access this resource'));
  });
});