// Core type definitions for the household management application

// ============================================================================
// USER TYPES
// ============================================================================

export interface User {
  uid: string;
  email: string;
  displayName?: string;
  createdAt: Date;
}

// ============================================================================
// COMMON TYPES
// ============================================================================

export type TaskStatus = 'todo' | 'in_progress' | 'finished';

export interface RecurrencePattern {
  type: 'daily' | 'weekly' | 'monthly' | 'yearly';
  interval: number; // Every N days/weeks/months/years
  endDate?: Date;
}

// ============================================================================
// PLANT TYPES
// ============================================================================

export interface PlantPhoto {
  id: string;
  url: string;
  thumbnailUrl: string;
  uploadedAt: Date;
  description?: string;
}

export interface PlantCareTask {
  id: string;
  plantId: string;
  title: string;
  description?: string;
  dueDate: Date;
  recurrence?: RecurrencePattern;
  completed: boolean;
  calendarEventId?: string;
}

export interface Plant {
  id: string;
  userId: string;
  name: string;
  species?: string;
  description: string;
  photos: PlantPhoto[];
  careTasks: PlantCareTask[];
  createdAt: Date;
  updatedAt: Date;
}

// ============================================================================
// PROJECT TYPES
// ============================================================================

export interface Subtask {
  id: string;
  projectId: string;
  title: string;
  description?: string;
  status: TaskStatus;
  dueDate?: Date;
  createdAt: Date;
  updatedAt: Date;
  calendarEventId?: string;
}

export interface Project {
  id: string;
  userId: string;
  title: string;
  description: string;
  status: TaskStatus;
  dueDate?: Date;
  subtasks: Subtask[];
  createdAt: Date;
  updatedAt: Date;
  calendarEventId?: string;
}

// ============================================================================
// SIMPLE TASK TYPES
// ============================================================================

export interface SimpleTask {
  id: string;
  userId: string;
  title: string;
  description?: string;
  dueDate?: Date;
  completed: boolean;
  createdAt: Date;
  updatedAt: Date;
  calendarEventId?: string;
}

// ============================================================================
// CALENDAR TYPES
// ============================================================================

export interface CalendarReminder {
  method: 'email' | 'popup';
  minutes: number;
}

export interface CalendarEvent {
  id: string;
  title: string;
  description?: string;
  startDate: Date;
  endDate: Date;
  reminders: CalendarReminder[];
}

// ============================================================================
// SERVICE INTERFACES
// ============================================================================

// Authentication Service Interface
export interface AuthService {
  login: (email: string, password: string) => Promise<User>;
  logout: () => Promise<void>;
  resetPassword: (email: string) => Promise<void>;
  getCurrentUser: () => User | null;
  onAuthStateChanged: (callback: (user: User | null) => void) => () => void;
}

// Database Service Interface
export interface DatabaseService {
  // Plant operations
  createPlant: (plant: Omit<Plant, 'id' | 'createdAt' | 'updatedAt'>) => Promise<string>;
  getPlant: (id: string) => Promise<Plant | null>;
  getUserPlants: (userId: string) => Promise<Plant[]>;
  updatePlant: (id: string, updates: Partial<Plant>) => Promise<void>;
  deletePlant: (id: string) => Promise<void>;

  // Project operations
  createProject: (project: Omit<Project, 'id' | 'createdAt' | 'updatedAt'>) => Promise<string>;
  getProject: (id: string) => Promise<Project | null>;
  getUserProjects: (userId: string) => Promise<Project[]>;
  updateProject: (id: string, updates: Partial<Project>) => Promise<void>;
  deleteProject: (id: string) => Promise<void>;

  // Subtask operations
  createSubtask: (subtask: Omit<Subtask, 'id' | 'createdAt' | 'updatedAt'>) => Promise<string>;
  getSubtask: (id: string) => Promise<Subtask | null>;
  getProjectSubtasks: (projectId: string) => Promise<Subtask[]>;
  updateSubtask: (id: string, updates: Partial<Subtask>) => Promise<void>;
  deleteSubtask: (id: string) => Promise<void>;

  // Simple task operations
  createSimpleTask: (task: Omit<SimpleTask, 'id' | 'createdAt' | 'updatedAt'>) => Promise<string>;
  getSimpleTask: (id: string) => Promise<SimpleTask | null>;
  getUserSimpleTasks: (userId: string) => Promise<SimpleTask[]>;
  updateSimpleTask: (id: string, updates: Partial<SimpleTask>) => Promise<void>;
  deleteSimpleTask: (id: string) => Promise<void>;

  // Plant care task operations
  createPlantCareTask: (task: Omit<PlantCareTask, 'id'>) => Promise<string>;
  getPlantCareTask: (id: string) => Promise<PlantCareTask | null>;
  getPlantCareTasks: (plantId: string) => Promise<PlantCareTask[]>;
  updatePlantCareTask: (id: string, updates: Partial<PlantCareTask>) => Promise<void>;
  deletePlantCareTask: (id: string) => Promise<void>;
}

// Calendar Service Interface
export interface CalendarService {
  createEvent: (event: Omit<CalendarEvent, 'id'>) => Promise<string>;
  updateEvent: (eventId: string, event: Partial<CalendarEvent>) => Promise<void>;
  deleteEvent: (eventId: string) => Promise<void>;
  getEvent: (eventId: string) => Promise<CalendarEvent | null>;
}

// Storage Service Interface (for plant photos)
export interface StorageService {
  uploadPhoto: (file: File, path: string) => Promise<string>;
  deletePhoto: (url: string) => Promise<void>;
  generateThumbnail: (originalUrl: string) => Promise<string>;
}

// ============================================================================
// ERROR HANDLING TYPES
// ============================================================================

export const ErrorCode = {
  // Authentication errors
  AUTH_INVALID_CREDENTIALS: 'auth/invalid-credentials',
  AUTH_USER_NOT_FOUND: 'auth/user-not-found',
  AUTH_WRONG_PASSWORD: 'auth/wrong-password',
  AUTH_EMAIL_ALREADY_IN_USE: 'auth/email-already-in-use',
  AUTH_WEAK_PASSWORD: 'auth/weak-password',
  AUTH_NETWORK_ERROR: 'auth/network-request-failed',
  AUTH_TOO_MANY_REQUESTS: 'auth/too-many-requests',

  // Database errors
  DB_PERMISSION_DENIED: 'db/permission-denied',
  DB_NOT_FOUND: 'db/not-found',
  DB_NETWORK_ERROR: 'db/network-error',
  DB_QUOTA_EXCEEDED: 'db/quota-exceeded',
  DB_VALIDATION_ERROR: 'db/validation-error',

  // Storage errors
  STORAGE_UNAUTHORIZED: 'storage/unauthorized',
  STORAGE_QUOTA_EXCEEDED: 'storage/quota-exceeded',
  STORAGE_INVALID_FORMAT: 'storage/invalid-format',
  STORAGE_FILE_TOO_LARGE: 'storage/file-too-large',
  STORAGE_NETWORK_ERROR: 'storage/network-error',

  // Calendar errors
  CALENDAR_AUTH_ERROR: 'calendar/auth-error',
  CALENDAR_QUOTA_EXCEEDED: 'calendar/quota-exceeded',
  CALENDAR_NETWORK_ERROR: 'calendar/network-error',
  CALENDAR_INVALID_EVENT: 'calendar/invalid-event',

  // General errors
  UNKNOWN_ERROR: 'unknown-error',
  VALIDATION_ERROR: 'validation-error',
  NETWORK_ERROR: 'network-error'
} as const;

export type ErrorCode = typeof ErrorCode[keyof typeof ErrorCode];

export interface AppError {
  code: ErrorCode;
  message: string;
  details?: Record<string, any>;
  timestamp: Date;
  userId?: string;
}

export interface ValidationError {
  field: string;
  message: string;
  value?: any;
}

export interface FormErrors {
  [fieldName: string]: string[];
}

// ============================================================================
// UTILITY TYPES
// ============================================================================

// API Response wrapper
export interface ApiResponse<T> {
  data?: T;
  error?: AppError;
  success: boolean;
}

// Pagination types
export interface PaginationOptions {
  limit: number;
  offset: number;
  orderBy?: string;
  orderDirection?: 'asc' | 'desc';
}

export interface PaginatedResponse<T> {
  items: T[];
  total: number;
  hasMore: boolean;
  nextOffset?: number;
}

// Filter types for queries
export interface PlantFilters {
  species?: string;
  hasCareTasks?: boolean;
  searchTerm?: string;
}

export interface ProjectFilters {
  status?: TaskStatus;
  dueDateBefore?: Date;
  dueDateAfter?: Date;
  searchTerm?: string;
}

export interface TaskFilters {
  completed?: boolean;
  dueDateBefore?: Date;
  dueDateAfter?: Date;
  searchTerm?: string;
}

// Context types for React contexts
export interface AuthContextType {
  user: User | null;
  loading: boolean;
  login: (email: string, password: string) => Promise<void>;
  logout: () => Promise<void>;
  resetPassword: (email: string) => Promise<void>;
}

// Form state types
export interface FormState<T> {
  data: T;
  errors: FormErrors;
  isSubmitting: boolean;
  isDirty: boolean;
}

// Async operation states
export type AsyncState<T> = {
  data: T | null;
  loading: boolean;
  error: AppError | null;
};

// File upload types
export interface FileUploadProgress {
  fileName: string;
  progress: number; // 0-100
  status: 'pending' | 'uploading' | 'completed' | 'error';
  error?: string;
}

// Re-export error utilities
export * from './errors';

// Re-export utility types and functions
export * from './utils';