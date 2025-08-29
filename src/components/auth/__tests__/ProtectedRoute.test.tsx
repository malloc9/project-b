
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen } from '@testing-library/react';
import { BrowserRouter } from 'react-router-dom';
import { ProtectedRoute, PublicRoute } from '../ProtectedRoute';
import { useAuth } from '../../../contexts/AuthContext';
import type { User } from '../../../types';

// Mock the useAuth hook
vi.mock('../../../contexts/AuthContext');

// Mock react-router-dom Navigate component
vi.mock('react-router-dom', async () => {
  const actual = await vi.importActual('react-router-dom');
  return {
    ...actual,
    Navigate: ({ to }: { to: string }) => <div data-testid="navigate-to">{to}</div>,
    useLocation: () => ({ pathname: '/dashboard' }),
  };
});

const mockUseAuth = vi.mocked(useAuth);

const TestComponent = () => <div data-testid="test-component">Protected Content</div>;

describe('ProtectedRoute', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('should show loading spinner when loading', () => {
    mockUseAuth.mockReturnValue({
      user: null,
      loading: true,
      login: vi.fn(),
      logout: vi.fn(),
      resetPassword: vi.fn(),
    });

    render(
      <BrowserRouter>
        <ProtectedRoute>
          <TestComponent />
        </ProtectedRoute>
      </BrowserRouter>
    );

    expect(screen.getByRole('status', { hidden: true })).toBeInTheDocument(); // Loading spinner
    expect(screen.queryByTestId('test-component')).not.toBeInTheDocument();
  });

  it('should redirect to login when not authenticated', () => {
    mockUseAuth.mockReturnValue({
      user: null,
      loading: false,
      login: vi.fn(),
      logout: vi.fn(),
      resetPassword: vi.fn(),
    });

    render(
      <BrowserRouter>
        <ProtectedRoute>
          <TestComponent />
        </ProtectedRoute>
      </BrowserRouter>
    );

    expect(screen.getByTestId('navigate-to')).toHaveTextContent('/login');
    expect(screen.queryByTestId('test-component')).not.toBeInTheDocument();
  });

  it('should render children when authenticated', () => {
    const mockUser: User = {
      uid: 'test-uid',
      email: 'test@example.com',
      displayName: 'Test User',
      createdAt: new Date(),
    };

    mockUseAuth.mockReturnValue({
      user: mockUser,
      loading: false,
      login: vi.fn(),
      logout: vi.fn(),
      resetPassword: vi.fn(),
    });

    render(
      <BrowserRouter>
        <ProtectedRoute>
          <TestComponent />
        </ProtectedRoute>
      </BrowserRouter>
    );

    expect(screen.getByTestId('test-component')).toBeInTheDocument();
    expect(screen.queryByTestId('navigate-to')).not.toBeInTheDocument();
  });

  it('should redirect to custom path when specified', () => {
    mockUseAuth.mockReturnValue({
      user: null,
      loading: false,
      login: vi.fn(),
      logout: vi.fn(),
      resetPassword: vi.fn(),
    });

    render(
      <BrowserRouter>
        <ProtectedRoute redirectTo="/custom-login">
          <TestComponent />
        </ProtectedRoute>
      </BrowserRouter>
    );

    expect(screen.getByTestId('navigate-to')).toHaveTextContent('/custom-login');
  });
});

describe('PublicRoute', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('should show loading spinner when loading', () => {
    mockUseAuth.mockReturnValue({
      user: null,
      loading: true,
      login: vi.fn(),
      logout: vi.fn(),
      resetPassword: vi.fn(),
    });

    render(
      <BrowserRouter>
        <PublicRoute>
          <TestComponent />
        </PublicRoute>
      </BrowserRouter>
    );

    expect(screen.getByRole('status', { hidden: true })).toBeInTheDocument(); // Loading spinner
    expect(screen.queryByTestId('test-component')).not.toBeInTheDocument();
  });

  it('should render children when not authenticated', () => {
    mockUseAuth.mockReturnValue({
      user: null,
      loading: false,
      login: vi.fn(),
      logout: vi.fn(),
      resetPassword: vi.fn(),
    });

    render(
      <BrowserRouter>
        <PublicRoute>
          <TestComponent />
        </PublicRoute>
      </BrowserRouter>
    );

    expect(screen.getByTestId('test-component')).toBeInTheDocument();
    expect(screen.queryByTestId('navigate-to')).not.toBeInTheDocument();
  });

  it('should redirect to dashboard when authenticated', () => {
    const mockUser: User = {
      uid: 'test-uid',
      email: 'test@example.com',
      displayName: 'Test User',
      createdAt: new Date(),
    };

    mockUseAuth.mockReturnValue({
      user: mockUser,
      loading: false,
      login: vi.fn(),
      logout: vi.fn(),
      resetPassword: vi.fn(),
    });

    render(
      <BrowserRouter>
        <PublicRoute>
          <TestComponent />
        </PublicRoute>
      </BrowserRouter>
    );

    expect(screen.getByTestId('navigate-to')).toHaveTextContent('/');
    expect(screen.queryByTestId('test-component')).not.toBeInTheDocument();
  });

  it('should redirect to custom path when specified', () => {
    const mockUser: User = {
      uid: 'test-uid',
      email: 'test@example.com',
      displayName: 'Test User',
      createdAt: new Date(),
    };

    mockUseAuth.mockReturnValue({
      user: mockUser,
      loading: false,
      login: vi.fn(),
      logout: vi.fn(),
      resetPassword: vi.fn(),
    });

    render(
      <BrowserRouter>
        <PublicRoute redirectTo="/custom-dashboard">
          <TestComponent />
        </PublicRoute>
      </BrowserRouter>
    );

    expect(screen.getByTestId('navigate-to')).toHaveTextContent('/custom-dashboard');
  });
});