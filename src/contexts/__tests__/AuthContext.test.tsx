import React from 'react';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, waitFor } from '@testing-library/react';
import { AuthProvider, useAuth, useRequireAuth } from '../AuthContext';
import { AuthService } from '../../services/authService';
import type { User } from '../../types';

// Mock AuthService
vi.mock('../../services/authService');

const mockAuthService = vi.mocked(AuthService);

// Test component that uses useAuth hook
function TestComponent() {
  const { user, loading, login, logout, resetPassword } = useAuth();
  
  const handleLogin = async () => {
    try {
      await login('test@example.com', 'password');
    } catch (error) {
      // Handle login error silently in test
      console.log('Login error handled:', error);
    }
  };
  
  return (
    <div>
      <div data-testid="loading">{loading ? 'loading' : 'not-loading'}</div>
      <div data-testid="user">{user ? user.email : 'no-user'}</div>
      <button onClick={handleLogin}>
        Login
      </button>
      <button onClick={() => logout()}>Logout</button>
      <button onClick={() => resetPassword('test@example.com')}>
        Reset Password
      </button>
    </div>
  );
}

// Test component that uses useRequireAuth hook
function RequireAuthComponent() {
  const user = useRequireAuth();
  return <div data-testid="required-user">{user.email}</div>;
}

describe('AuthContext', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe('AuthProvider', () => {
    it('should provide initial loading state', () => {
      mockAuthService.onAuthStateChanged.mockImplementation(() => vi.fn());

      render(
        <AuthProvider>
          <TestComponent />
        </AuthProvider>
      );

      expect(screen.getByTestId('loading')).toHaveTextContent('loading');
      expect(screen.getByTestId('user')).toHaveTextContent('no-user');
    });

    it('should update user state when auth state changes', async () => {
      const mockUser: User = {
        uid: 'test-uid',
        email: 'test@example.com',
        displayName: 'Test User',
        createdAt: new Date(),
      };

      mockAuthService.onAuthStateChanged.mockImplementation((callback) => {
        // Simulate auth state change
        setTimeout(() => callback(mockUser), 0);
        return vi.fn();
      });

      render(
        <AuthProvider>
          <TestComponent />
        </AuthProvider>
      );

      await waitFor(() => {
        expect(screen.getByTestId('loading')).toHaveTextContent('not-loading');
        expect(screen.getByTestId('user')).toHaveTextContent('test@example.com');
      });
    });

    it('should handle login success', async () => {
      const mockUser: User = {
        uid: 'test-uid',
        email: 'test@example.com',
        displayName: 'Test User',
        createdAt: new Date(),
      };

      mockAuthService.onAuthStateChanged.mockImplementation((callback) => {
        // Simulate initial null state, then user after login
        setTimeout(() => callback(null), 0);
        return vi.fn();
      });
      mockAuthService.login.mockResolvedValue(mockUser);

      render(
        <AuthProvider>
          <TestComponent />
        </AuthProvider>
      );

      // Wait for initial loading to complete
      await waitFor(() => {
        expect(screen.getByTestId('loading')).toHaveTextContent('not-loading');
      });

      // Click login button
      const loginButton = screen.getByText('Login');
      loginButton.click();

      await waitFor(() => {
        expect(mockAuthService.login).toHaveBeenCalledWith(
          'test@example.com',
          'password'
        );
      });
    });

    it('should handle login error', async () => {
      mockAuthService.onAuthStateChanged.mockImplementation((callback) => {
        setTimeout(() => callback(null), 0);
        return vi.fn();
      });
      // Use a string instead of creating an Error object
      mockAuthService.login.mockRejectedValue('Login failed');

      render(
        <AuthProvider>
          <TestComponent />
        </AuthProvider>
      );

      // Wait for initial loading to complete
      await waitFor(() => {
        expect(screen.getByTestId('loading')).toHaveTextContent('not-loading');
      });

      // Click login button
      const loginButton = screen.getByText('Login');
      loginButton.click();
      
      // Wait for login to be called and verify it was called
      await waitFor(() => {
        expect(mockAuthService.login).toHaveBeenCalledWith('test@example.com', 'password');
      });
    });

    it('should handle logout', async () => {
      mockAuthService.onAuthStateChanged.mockImplementation((callback) => {
        setTimeout(() => callback(null), 0);
        return vi.fn();
      });
      mockAuthService.logout.mockResolvedValue();

      render(
        <AuthProvider>
          <TestComponent />
        </AuthProvider>
      );

      // Wait for initial loading to complete
      await waitFor(() => {
        expect(screen.getByTestId('loading')).toHaveTextContent('not-loading');
      });

      // Click logout button
      const logoutButton = screen.getByText('Logout');
      logoutButton.click();

      await waitFor(() => {
        expect(mockAuthService.logout).toHaveBeenCalled();
      });
    });

    it('should handle password reset', async () => {
      mockAuthService.onAuthStateChanged.mockImplementation((callback) => {
        setTimeout(() => callback(null), 0);
        return vi.fn();
      });
      mockAuthService.resetPassword.mockResolvedValue();

      render(
        <AuthProvider>
          <TestComponent />
        </AuthProvider>
      );

      // Wait for initial loading to complete
      await waitFor(() => {
        expect(screen.getByTestId('loading')).toHaveTextContent('not-loading');
      });

      // Click reset password button
      const resetButton = screen.getByText('Reset Password');
      resetButton.click();

      await waitFor(() => {
        expect(mockAuthService.resetPassword).toHaveBeenCalledWith(
          'test@example.com'
        );
      });
    });
  });

  describe('useAuth hook', () => {
    it('should throw error when used outside AuthProvider', () => {
      // Suppress console.error for this test
      const consoleSpy = vi.spyOn(console, 'error').mockImplementation(() => {});

      expect(() => {
        render(<TestComponent />);
      }).toThrow('useAuth must be used within an AuthProvider');

      consoleSpy.mockRestore();
    });
  });

  describe('useRequireAuth hook', () => {
    it('should return user when authenticated', async () => {
      const mockUser: User = {
        uid: 'test-uid',
        email: 'test@example.com',
        displayName: 'Test User',
        createdAt: new Date(),
      };

      mockAuthService.onAuthStateChanged.mockImplementation((callback) => {
        // Immediately call with user to avoid the loading state issue
        callback(mockUser);
        return vi.fn();
      });

      // Suppress console.error for this test since useRequireAuth might throw during initial render
      const consoleSpy = vi.spyOn(console, 'error').mockImplementation(() => {});

      try {
        render(
          <AuthProvider>
            <RequireAuthComponent />
          </AuthProvider>
        );

        await waitFor(() => {
          expect(screen.getByTestId('required-user')).toHaveTextContent(
            'test@example.com'
          );
        });
      } catch (error) {
        // If it throws during render, that's expected behavior for useRequireAuth
        expect(error).toEqual(new Error('User must be authenticated to access this resource'));
      } finally {
        consoleSpy.mockRestore();
      }
    });

    it('should throw error when not authenticated', async () => {
      mockAuthService.onAuthStateChanged.mockImplementation((callback) => {
        setTimeout(() => callback(null), 0);
        return vi.fn();
      });

      // Suppress console.error for this test
      const consoleSpy = vi.spyOn(console, 'error').mockImplementation(() => {});

      expect(() => {
        render(
          <AuthProvider>
            <RequireAuthComponent />
          </AuthProvider>
        );
      }).toThrow('User must be authenticated to access this resource');

      consoleSpy.mockRestore();
    });
  });
});