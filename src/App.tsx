import { BrowserRouter as Router, Routes, Route } from 'react-router-dom';
import { Suspense, lazy } from 'react';
import { AuthProvider } from './contexts/AuthContext';
import { I18nProvider } from './contexts/I18nContext';
import { AuthLayout, ProtectedRoute, PublicRoute } from './components/auth';
import { AppLayout } from './components/layout';
import { ErrorBoundary } from './components/error/ErrorBoundary';
import { ErrorToastProvider } from './components/error/ErrorToastContainer';
import { FirebaseDebug } from './components/debug/FirebaseDebug';

// Initialize i18n
import './i18n';

// Lazy load pages for code splitting
import { LoginPage } from './pages/LoginPage';
import { DashboardPage } from './pages/DashboardPage';
import { PlantsPage } from './pages/PlantsPage';
import { ProjectsPage } from './pages/ProjectsPage';
import { TasksPage } from './pages/TasksPage';
import { CalendarPage } from './pages/CalendarPage';

// Lazy load task components
const TaskForm = lazy(() => import('./components/tasks/TaskForm'));
const TaskDetail = lazy(() => import('./components/tasks/TaskDetail'));

// Lazy load project components
const ProjectForm = lazy(() => import('./components/projects/ProjectForm'));
const ProjectDetail = lazy(() => import('./components/projects/ProjectDetail'));

// Loading component for Suspense fallback
const LoadingSpinner = () => (
  <div className="flex items-center justify-center min-h-screen">
    <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600"></div>
  </div>
);

function App() {
  return (
    <ErrorBoundary>
      <ErrorToastProvider>
        <I18nProvider>
          <AuthProvider>
            <AuthLayout>
              <Router>
                <Suspense fallback={<LoadingSpinner />}>
                  <Routes>
                    {/* Public routes - redirect to dashboard if authenticated */}
                    <Route
                      path="/login"
                      element={
                        <PublicRoute>
                          <LoginPage />
                        </PublicRoute>
                      }
                    />

                    {/* Protected routes with app layout */}
                    <Route
                      path="/"
                      element={
                        <ProtectedRoute>
                          <AppLayout>
                            <DashboardPage />
                          </AppLayout>
                        </ProtectedRoute>
                      }
                    />

                    <Route
                      path="/plants"
                      element={
                        <ProtectedRoute>
                          <AppLayout>
                            <PlantsPage />
                          </AppLayout>
                        </ProtectedRoute>
                      }
                    />

                    <Route
                      path="/projects"
                      element={
                        <ProtectedRoute>
                          <AppLayout>
                            <ProjectsPage />
                          </AppLayout>
                        </ProtectedRoute>
                      }
                    />

                    <Route
                      path="/projects/new"
                      element={
                        <ProtectedRoute>
                          <AppLayout>
                            <ProjectForm />
                          </AppLayout>
                        </ProtectedRoute>
                      }
                    />

                    <Route
                      path="/projects/:projectId"
                      element={
                        <ProtectedRoute>
                          <AppLayout>
                            <ProjectDetail />
                          </AppLayout>
                        </ProtectedRoute>
                      }
                    />

                    <Route
                      path="/projects/:projectId/edit"
                      element={
                        <ProtectedRoute>
                          <AppLayout>
                            <ProjectForm />
                          </AppLayout>
                        </ProtectedRoute>
                      }
                    />

                    <Route
                      path="/tasks"
                      element={
                        <ProtectedRoute>
                          <AppLayout>
                            <TasksPage />
                          </AppLayout>
                        </ProtectedRoute>
                      }
                    />

                    <Route
                      path="/tasks/new"
                      element={
                        <ProtectedRoute>
                          <AppLayout>
                            <TaskForm />
                          </AppLayout>
                        </ProtectedRoute>
                      }
                    />

                    <Route
                      path="/tasks/:taskId"
                      element={
                        <ProtectedRoute>
                          <AppLayout>
                            <TaskDetail />
                          </AppLayout>
                        </ProtectedRoute>
                      }
                    />

                    <Route
                      path="/tasks/:taskId/edit"
                      element={
                        <ProtectedRoute>
                          <AppLayout>
                            <TaskForm />
                          </AppLayout>
                        </ProtectedRoute>
                      }
                    />

                    <Route
                      path="/calendar"
                      element={
                        <ProtectedRoute>
                          <AppLayout>
                            <CalendarPage />
                          </AppLayout>
                        </ProtectedRoute>
                      }
                    />

                    {/* Catch all route - redirect to dashboard */}
                    <Route
                      path="*"
                      element={
                        <ProtectedRoute>
                          <AppLayout>
                            <DashboardPage />
                          </AppLayout>
                        </ProtectedRoute>
                      }
                    />
                  </Routes>
                </Suspense>
              </Router>
            </AuthLayout>
          </AuthProvider>
        </I18nProvider>
        <FirebaseDebug />
      </ErrorToastProvider>
    </ErrorBoundary>
  );
}

export default App;