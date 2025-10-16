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
  seriesId?: string; // For managing recurring event series
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
  createdAt: Date;
  updatedAt: Date;
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
  userId: string; // Added userId
  title: string;
  description?: string;
  status: TaskStatus;
  dueDate?: Date;
  createdAt: Date;
  updatedAt: Date;
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
}

// ============================================================================
// CALENDAR TYPES
// ============================================================================

export interface NotificationSettings {
  id: string;
  type: 'browser' | 'in_app';
  timing: number; // minutes before event
  enabled: boolean;
}

export interface CalendarEvent {
  id: string;
  userId: string;
  title: string;
  description?: string;
  startDate: Date;
  endDate: Date;
  allDay: boolean;
  type: 'task' | 'project' | 'plant_care' | 'custom';
  sourceId?: string; // ID of the source task/project/plant
  status: 'pending' | 'completed' | 'cancelled';
  recurrence?: RecurrencePattern;
  notifications: NotificationSettings[];
  createdAt: Date;
  updatedAt: Date;
}

export interface CalendarView {
  type: 'month' | 'week' | 'day';
  currentDate: Date;
  events: CalendarEvent[];
  selectedDate?: Date;
}

// Type for creating new calendar events (without generated fields)
export type CreateCalendarEventData = Omit<CalendarEvent, 'id' | 'createdAt' | 'updatedAt'>;

// Type for updating calendar events (all fields optional except id)
export type UpdateCalendarEventData = Partial<Omit<CalendarEvent, 'id' | 'userId' | 'createdAt'>> & {
  id: string;
};

// Storage Service Interface (for plant photos)
export interface StorageService {
  uploadPhoto: (file: File, path: string) => Promise<string>;
  deletePhoto: (url: string) => Promise<void>;
  generateThumbnail: (originalUrl: string) => Promise<string>;
}

// ============================================================================
// ERROR HANDLING TYPES
// ============================================================================

// Error types are defined in './errors' to avoid circular dependencies
// Import them directly: import { ErrorCode, AppError, ValidationError, FormErrors } from '../types/errors'

// ============================================================================
// UTILITY TYPES
// ============================================================================

// API Response wrapper
export interface ApiResponse<T> {
  data?: T;
  error?: any; // Use any to avoid circular dependency - cast to AppError when needed
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

export interface CalendarFilters {
  type?: 'task' | 'project' | 'plant_care' | 'custom';
  status?: 'pending' | 'completed' | 'cancelled';
  startDate?: Date;
  endDate?: Date;
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
  errors: Record<string, string[]>; // Use generic type to avoid circular dependency
  isSubmitting: boolean;
  isDirty: boolean;
}

// Async operation states
export type AsyncState<T> = {
  data: T | null;
  loading: boolean;
  error: any | null; // Use any to avoid circular dependency - cast to AppError when needed
};

// File upload types
export interface FileUploadProgress {
  fileName: string;
  progress: number; // 0-100
  status: 'pending' | 'uploading' | 'completed' | 'error';
  error?: string;
}

// Note: Error utilities are available in './errors' - import directly to avoid circular dependencies