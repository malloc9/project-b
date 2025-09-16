import { createContext, useContext, useState, useEffect, type ReactNode } from 'react';
import { useAuth } from './AuthContext';
import { 
  initializeCalendarAuth, 
  completeCalendarAuth 
} from '../services/calendarService';
import { doc, getDoc, updateDoc } from 'firebase/firestore';
import { db } from '../config/firebase';

interface CalendarContextType {
  isConnected: boolean;
  isLoading: boolean;
  error: string | null;
  connectCalendar: () => Promise<void>;
  completeConnection: (code: string) => Promise<void>;
  disconnectCalendar: () => Promise<void>;
  refreshConnectionStatus: () => Promise<void>;
}

const CalendarContext = createContext<CalendarContextType | undefined>(undefined);

interface CalendarProviderProps {
  children: ReactNode;
}

export function CalendarProvider({ children }: CalendarProviderProps) {
  const { user } = useAuth();
  const [isConnected, setIsConnected] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Check calendar connection status when user changes
  useEffect(() => {
    if (user) {
      refreshConnectionStatus();
    } else {
      setIsConnected(false);
    }
  }, [user]);

  const refreshConnectionStatus = async () => {
    if (!user) return;

    try {
      setIsLoading(true);
      setError(null);

      const userDoc = await getDoc(doc(db, 'users', user.uid));
      const userData = userDoc.data();
      
      setIsConnected(!!userData?.calendarConnected);
    } catch (err) {
      console.error('Error checking calendar connection status:', err);
      setError('Failed to check calendar connection status');
      setIsConnected(false);
    } finally {
      setIsLoading(false);
    }
  };

  const connectCalendar = async () => {
    if (!user) {
      setError('User must be logged in to connect calendar');
      return;
    }

    try {
      setIsLoading(true);
      setError(null);

      const { authUrl } = await initializeCalendarAuth();
      
      // Open Google OAuth in a new window
      const popup = window.open(
        authUrl,
        'google-calendar-auth',
        'width=500,height=600,scrollbars=yes,resizable=yes'
      );

      if (!popup) {
        throw new Error('Failed to open authentication popup. Please allow popups for this site.');
      }

      // Listen for the popup to close or send a message
      const checkClosed = setInterval(() => {
        if (popup.closed) {
          clearInterval(checkClosed);
          setIsLoading(false);
          // Check if connection was successful
          refreshConnectionStatus();
        }
      }, 1000);

      // Listen for messages from the popup (if we implement a callback page)
      const messageListener = (event: MessageEvent) => {
        if (event.origin !== window.location.origin) return;
        
        if (event.data.type === 'CALENDAR_AUTH_SUCCESS') {
          clearInterval(checkClosed);
          popup.close();
          window.removeEventListener('message', messageListener);
          completeConnection(event.data.code);
        } else if (event.data.type === 'CALENDAR_AUTH_ERROR') {
          clearInterval(checkClosed);
          popup.close();
          window.removeEventListener('message', messageListener);
          setError(event.data.error || 'Authentication failed');
          setIsLoading(false);
        }
      };

      window.addEventListener('message', messageListener);

    } catch (err) {
      console.error('Error connecting calendar:', err);
      setError(err instanceof Error ? err.message : 'Failed to connect calendar');
      setIsLoading(false);
    }
  };

  const completeConnection = async (code: string) => {
    if (!user) {
      setError('User must be logged in');
      return;
    }

    try {
      setIsLoading(true);
      setError(null);

      await completeCalendarAuth(code);
      setIsConnected(true);
      
    } catch (err) {
      console.error('Error completing calendar connection:', err);
      setError(err instanceof Error ? err.message : 'Failed to complete calendar connection');
    } finally {
      setIsLoading(false);
    }
  };

  const disconnectCalendar = async () => {
    if (!user) return;

    try {
      setIsLoading(true);
      setError(null);

      // Remove calendar configuration from user document
      await updateDoc(doc(db, 'users', user.uid), {
        calendarConfig: null,
        calendarConnected: false
      });

      setIsConnected(false);
      
    } catch (err) {
      console.error('Error disconnecting calendar:', err);
      setError(err instanceof Error ? err.message : 'Failed to disconnect calendar');
    } finally {
      setIsLoading(false);
    }
  };

  const value: CalendarContextType = {
    isConnected,
    isLoading,
    error,
    connectCalendar,
    completeConnection,
    disconnectCalendar,
    refreshConnectionStatus
  };

  return (
    <CalendarContext.Provider value={value}>
      {children}
    </CalendarContext.Provider>
  );
}

export function useCalendar() {
  const context = useContext(CalendarContext);
  if (context === undefined) {
    throw new Error('useCalendar must be used within a CalendarProvider');
  }
  return context;
}