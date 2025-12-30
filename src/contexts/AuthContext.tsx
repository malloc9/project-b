import { createContext, useContext, useEffect, useReducer } from 'react';
import type { ReactNode } from 'react';
import type { User, AuthContextType } from '../types';
import { AuthService } from '../services/authService';

// Auth state type
interface AuthState {
  user: User | null;
  loading: boolean;
  error: string | null;
}

// Auth actions
type AuthAction =
  | { type: 'AUTH_LOADING' }
  | { type: 'AUTH_SUCCESS'; payload: User | null }
  | { type: 'AUTH_ERROR'; payload: string }
  | { type: 'AUTH_RESET_ERROR' };

// Initial state
const initialState: AuthState = {
  user: null,
  loading: true,
  error: null,
};

// Auth reducer
function authReducer(state: AuthState, action: AuthAction): AuthState {
  switch (action.type) {
    case 'AUTH_LOADING':
      return {
        ...state,
        loading: true,
        error: null,
      };
    case 'AUTH_SUCCESS':
      return {
        ...state,
        user: action.payload,
        loading: false,
        error: null,
      };
    case 'AUTH_ERROR':
      return {
        ...state,
        loading: false,
        error: action.payload,
      };
    case 'AUTH_RESET_ERROR':
      return {
        ...state,
        error: null,
      };
    default:
      return state;
  }
}

// Create context
const AuthContext = createContext<AuthContextType | undefined>(undefined);

// Auth provider props
interface AuthProviderProps {
  children: ReactNode;
}

/**
 * Authentication context provider
 */
export function AuthProvider({ children }: AuthProviderProps) {
  const [state, dispatch] = useReducer(authReducer, initialState);

  // Login function
  const login = async (email: string, password: string): Promise<void> => {
    dispatch({ type: 'AUTH_LOADING' });
    try {
      const user = await AuthService.login(email, password);
      dispatch({ type: 'AUTH_SUCCESS', payload: user });
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Login failed';
      dispatch({ type: 'AUTH_ERROR', payload: errorMessage });
      throw error;
    }
  };

  // Logout function
  const logout = async (): Promise<void> => {
    dispatch({ type: 'AUTH_LOADING' });
    try {
      await AuthService.logout();
      dispatch({ type: 'AUTH_SUCCESS', payload: null });
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Logout failed';
      dispatch({ type: 'AUTH_ERROR', payload: errorMessage });
      throw error;
    }
  };

  // Reset password function
  const resetPassword = async (email: string): Promise<void> => {
    dispatch({ type: 'AUTH_RESET_ERROR' });
    try {
      await AuthService.resetPassword(email);
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Password reset failed';
      dispatch({ type: 'AUTH_ERROR', payload: errorMessage });
      throw error;
    }
  };

  // Listen to auth state changes
  useEffect(() => {
    const unsubscribe = AuthService.onAuthStateChanged((user) => {
      dispatch({ type: 'AUTH_SUCCESS', payload: user });
    });

    return unsubscribe;
  }, []);

  // Context value
  const value: AuthContextType = {
    user: state.user,
    loading: state.loading,
    login,
    logout,
    resetPassword,
  };

  return (
    <AuthContext.Provider value={value}>
      {children}
    </AuthContext.Provider>
  );
}

/**
 * Hook to use authentication context
 */
// eslint-disable-next-line react-refresh/only-export-components
export function useAuth(): AuthContextType {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
}

/**
 * Hook to get current user (throws if not authenticated)
 */
// eslint-disable-next-line react-refresh/only-export-components
export function useRequireAuth(): User {
  const { user } = useAuth();
  if (!user) {
    throw new Error('User must be authenticated to access this resource');
  }
  return user;
}