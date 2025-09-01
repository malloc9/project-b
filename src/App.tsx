import { BrowserRouter as Router, Routes, Route } from 'react-router-dom';
import { Suspense, lazy } from 'react';
import { AuthProvider } from './contexts/AuthContext';
import { CalendarProvider } from './contexts/CalendarContext';
import { AuthLayout, ProtectedRoute, PublicRoute } from './components/auth';
import { AppLayout } from './components/layout';
import { ErrorBoundary } from './components/error/ErrorBoundary';
import { ErrorToastProvider } from './components/error/ErrorToastContainer';
import { FirebaseDebug } from './components/debug/FirebaseDebug';

// Lazy load pages for code splitting
const LoginPage = lazy(() => import('./pages/LoginPage').then(module => ({ default: module.LoginPage })));
const DashboardPage = lazy(() => import('./pages/DashboardPage').then(module => ({ default: module.DashboardPage })));
const PlantsPage = lazy(() => import('./pages/PlantsPage').then(module => ({ default: module.PlantsPage })));
const ProjectsPage = lazy(() => import('./pages/ProjectsPage').then(module => ({ default: module.ProjectsPage })));
const TasksPage = lazy(() => import('./pages/TasksPage').then(module => ({ default: module.TasksPage })));
const CalendarPage = lazy(() => import('./pages/CalendarPage').then(module => ({ default: module.CalendarPage })));

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
        <AuthProvider>
          <CalendarProvider>
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
          </CalendarProvider>
        </AuthProvider>
      </ErrorToastProvider>
      <FirebaseDebug />
    </ErrorBoundary>
  );
}

export default App;
