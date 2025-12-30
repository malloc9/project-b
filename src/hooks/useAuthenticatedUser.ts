import { useAuth } from '../contexts/AuthContext';
import type { User } from '../types';

/**
 * Enhanced authentication hook that provides user data only when fully authenticated
 * and handles loading states properly to prevent premature data queries
 */
export interface UseAuthenticatedUserReturn {
  user: User | null;
  isAuthenticated: boolean;
  isLoading: boolean;
  error: string | null;
}

/**
 * Hook that provides authenticated user data with proper loading state handling
 * This prevents race conditions where components try to access data before authentication is complete
 */
export const useAuthenticatedUser = (): UseAuthenticatedUserReturn => {
  const { user, loading } = useAuth();

  return {
    user: loading ? null : user, // Only return user when not loading
    isAuthenticated: !loading && user !== null,
    isLoading: loading,
    error: null, // TODO: Add error handling from auth context if needed
  };
};

/**
 * Hook that returns the authenticated user or throws an error
 * Use this when you need to ensure the user is authenticated
 */
export const useRequireAuthenticatedUser = (): User => {
  const { user, isAuthenticated, isLoading } = useAuthenticatedUser();
  
  if (isLoading) {
    throw new Error('Authentication is still loading');
  }
  
  if (!isAuthenticated || !user) {
    throw new Error('User must be authenticated to access this resource');
  }
  
  return user;
};