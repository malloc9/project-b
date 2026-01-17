// Utility types and helper functions

import type { Plant, Project, SimpleTask, PlantCareTask, TaskStatus, Priority } from './index';

/**
 * Generic utility types
 */
export type Optional<T, K extends keyof T> = Omit<T, K> & Partial<Pick<T, K>>;
export type RequiredFields<T, K extends keyof T> = T & Required<Pick<T, K>>;
export type DeepPartial<T> = {
  [P in keyof T]?: T[P] extends object ? DeepPartial<T[P]> : T[P];
};

/**
 * Entity creation types (omitting auto-generated fields)
 */
export type CreatePlantData = Omit<Plant, 'id' | 'createdAt' | 'updatedAt' | 'photos' | 'careTasks'>;
export type CreateProjectData = Omit<Project, 'id' | 'createdAt' | 'updatedAt' | 'subtasks'>;
export type CreateSimpleTaskData = Omit<SimpleTask, 'id' | 'createdAt' | 'updatedAt'>;
export type CreatePlantCareTaskData = Omit<PlantCareTask, 'id'>;

/**
 * Update types (partial updates)
 */
export type UpdatePlantData = Partial<Omit<Plant, 'id' | 'userId' | 'createdAt'>>;
export type UpdateProjectData = Partial<Omit<Project, 'id' | 'userId' | 'createdAt'>>;
export type UpdateSimpleTaskData = Partial<Omit<SimpleTask, 'id' | 'userId' | 'createdAt'>>;
export type UpdatePlantCareTaskData = Partial<Omit<PlantCareTask, 'id' | 'plantId'>>;

/**
 * Sort options for different entities
 */
export interface SortOptions {
  field: string;
  direction: 'asc' | 'desc';
}

export interface PlantSortOptions extends SortOptions {
  field: 'name' | 'species' | 'createdAt' | 'updatedAt';
}

export interface ProjectSortOptions extends SortOptions {
  field: 'title' | 'status' | 'dueDate' | 'createdAt' | 'updatedAt';
}

export interface TaskSortOptions extends SortOptions {
  field: 'title' | 'dueDate' | 'completed' | 'createdAt' | 'updatedAt';
}

/**
 * Dashboard summary types
 */
export interface DashboardStats {
  totalPlants: number;
  totalProjects: number;
  totalSimpleTasks: number;
  overdueTasks: number;
  upcomingTasks: number;
  completedTasksThisWeek: number;
}

export interface TaskSummary {
  id: string;
  title: string;
  type: 'plant-care' | 'project' | 'subtask' | 'simple-task';
  dueDate?: Date;
  status: TaskStatus | 'completed';
  entityId: string; // ID of the parent plant/project
  entityName: string; // Name of the parent plant/project
}

/**
 * Search and filter utility functions
 */
export function createSearchFilter<T>(
  items: T[],
  searchTerm: string,
  searchFields: (keyof T)[]
): T[] {
  if (!searchTerm.trim()) {
    return items;
  }

  const lowercaseSearch = searchTerm.toLowerCase();
  
  return items.filter(item =>
    searchFields.some(field => {
      const value = item[field];
      if (typeof value === 'string') {
        return value.toLowerCase().includes(lowercaseSearch);
      }
      return false;
    })
  );
}

/**
 * Date utility functions
 */
export function isOverdue(date: Date): boolean {
  return date < new Date();
}

export function isUpcoming(date: Date, daysAhead: number = 7): boolean {
  const now = new Date();
  const futureDate = new Date();
  futureDate.setDate(now.getDate() + daysAhead);
  
  return date >= now && date <= futureDate;
}

export function formatRelativeDate(
  date: Date, 
  t?: (key: string, options?: any) => string,
  locale: string = 'en-US'
): string {
  const now = new Date();
  const diffInMs = date.getTime() - now.getTime();
  const diffInDays = Math.ceil(diffInMs / (1000 * 60 * 60 * 24));

  if (diffInDays === 0) {
    return t ? t('calendar:today', { defaultValue: 'Today' }) : 'Today';
  } else if (diffInDays === 1) {
    return t ? t('calendar:tomorrow', { defaultValue: 'Tomorrow' }) : 'Tomorrow';
  } else if (diffInDays === -1) {
    return t ? t('calendar:yesterday', { defaultValue: 'Yesterday' }) : 'Yesterday';
  } else if (diffInDays > 1 && diffInDays <= 7) {
    const count = diffInDays;
    return t ? t('calendar:relativeTime.inDays', { count, defaultValue: `In ${count} days` }) : `In ${count} days`;
  } else if (diffInDays < -1 && diffInDays >= -7) {
    const count = Math.abs(diffInDays);
    return t ? t('calendar:relativeTime.daysAgo', { count, defaultValue: `${count} days ago` }) : `${count} days ago`;
  } else {
    return date.toLocaleDateString(locale);
  }
}

/**
 * Task status utility functions
 */
export function getTaskStatusColor(status: TaskStatus): string {
  switch (status) {
    case 'todo':
      return 'gray';
    case 'in_progress':
      return 'blue';
    case 'finished':
      return 'green';
    default:
      return 'gray';
  }
}

export function getTaskStatusLabel(status: TaskStatus): string {
  switch (status) {
    case 'todo':
      return 'To Do';
    case 'in_progress':
      return 'In Progress';
    case 'finished':
      return 'Finished';
    default:
      return 'Unknown';
  }
}

export function getPriorityColor(priority: Priority): string {
  const colors = {
    low: 'bg-gray-500 text-white',
    medium: 'bg-blue-500 text-white',
    high: 'bg-orange-500 text-white',
    critical: 'bg-red-500 text-white',
  };
  return colors[priority];
}

export function getPriorityLabel(priority: Priority): string {
  const labels = {
    low: 'Low',
    medium: 'Medium',
    high: 'High',
    critical: 'Critical',
  };
  return labels[priority];
}

export function getPriorityOrder(priority: Priority): number {
  const order = {
    low: 0,
    medium: 1,
    high: 2,
    critical: 3,
  };
  return order[priority];
}

/**
 * Project completion utility
 */
export function calculateProjectCompletion(project: Project): number {
  if (!project.subtasks || project.subtasks.length === 0) {
    return project.status === 'finished' ? 100 : 0;
  }

  const completedSubtasks = project.subtasks.filter(subtask => subtask.status === 'finished').length;
  return Math.round((completedSubtasks / project.subtasks.length) * 100);
}

/**
 * File size utility
 */
export function formatFileSize(bytes: number): string {
  if (bytes === 0) return '0 Bytes';

  const k = 1024;
  const sizes = ['Bytes', 'KB', 'MB', 'GB'];
  const i = Math.floor(Math.log(bytes) / Math.log(k));

  return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
}

/**
 * ID generation utility
 */
export function generateId(): string {
  return Date.now().toString(36) + Math.random().toString(36).substr(2);
}