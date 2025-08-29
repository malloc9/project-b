import {
  collection,
  doc,
  addDoc,
  getDoc,
  getDocs,
  updateDoc,
  deleteDoc,
  query,
  where,
  orderBy,
  Timestamp
} from 'firebase/firestore';
import { db } from '../config/firebase';
import type { SimpleTask } from '../types';
import { ErrorCode } from '../types';
import { createAppError } from '../types/errors';
import { createSimpleTaskCalendarEvent, updateCalendarEvent, deleteCalendarEvent } from './calendarService';

// ============================================================================
// SIMPLE TASK CRUD OPERATIONS
// ============================================================================

export const createSimpleTask = async (
  taskData: Omit<SimpleTask, 'id' | 'createdAt' | 'updatedAt'>
): Promise<string> => {
  try {
    const now = new Date();
    
    // Create calendar event if due date is provided
    let calendarEventId: string | undefined;
    if (taskData.dueDate) {
      try {
        calendarEventId = await createSimpleTaskCalendarEvent(
          taskData.title,
          taskData.description || '',
          taskData.dueDate
        );
      } catch (calendarError) {
        console.warn('Failed to create calendar event for simple task:', calendarError);
        // Continue without calendar sync
      }
    }
    
    const docRef = await addDoc(collection(db, 'simpleTasks'), {
      ...taskData,
      calendarEventId,
      createdAt: Timestamp.fromDate(now),
      updatedAt: Timestamp.fromDate(now),
      dueDate: taskData.dueDate ? Timestamp.fromDate(taskData.dueDate) : null
    });
    return docRef.id;
  } catch (error) {
    console.error('Error creating simple task:', error);
    throw createAppError(
      ErrorCode.DB_NETWORK_ERROR,
      'Failed to create simple task'
    );
  }
};

export const getSimpleTask = async (taskId: string): Promise<SimpleTask | null> => {
  try {
    const docRef = doc(db, 'simpleTasks', taskId);
    const docSnap = await getDoc(docRef);
    
    if (!docSnap.exists()) {
      return null;
    }
    
    const data = docSnap.data();
    return {
      id: docSnap.id,
      ...data,
      createdAt: data.createdAt.toDate(),
      updatedAt: data.updatedAt.toDate(),
      dueDate: data.dueDate ? data.dueDate.toDate() : undefined
    } as SimpleTask;
  } catch (error) {
    console.error('Error getting simple task:', error);
    throw createAppError(
      ErrorCode.DB_NETWORK_ERROR,
      'Failed to get simple task'
    );
  }
};

export const getUserSimpleTasks = async (userId: string): Promise<SimpleTask[]> => {
  try {
    const q = query(
      collection(db, 'simpleTasks'),
      where('userId', '==', userId),
      orderBy('dueDate', 'asc')
    );
    
    const querySnapshot = await getDocs(q);
    const tasks: SimpleTask[] = [];
    
    querySnapshot.forEach((doc) => {
      const data = doc.data();
      tasks.push({
        id: doc.id,
        ...data,
        createdAt: data.createdAt.toDate(),
        updatedAt: data.updatedAt.toDate(),
        dueDate: data.dueDate ? data.dueDate.toDate() : undefined
      } as SimpleTask);
    });
    
    return tasks;
  } catch (error) {
    console.error('Error getting user simple tasks:', error);
    throw createAppError(
      ErrorCode.DB_NETWORK_ERROR,
      'Failed to get simple tasks'
    );
  }
};

export const updateSimpleTask = async (
  taskId: string,
  updates: Partial<SimpleTask>
): Promise<void> => {
  try {
    // Get current task for calendar sync
    const currentTask = await getSimpleTask(taskId);
    
    // Handle calendar sync for completed tasks
    if (updates.completed && currentTask?.calendarEventId) {
      try {
        await deleteCalendarEvent(currentTask.calendarEventId);
        updates.calendarEventId = undefined; // Remove calendar event ID
      } catch (calendarError) {
        console.warn('Failed to delete calendar event:', calendarError);
      }
    }

    // Handle calendar sync for due date changes
    if (updates.dueDate && currentTask?.calendarEventId && updates.dueDate !== currentTask.dueDate) {
      try {
        await updateCalendarEvent(currentTask.calendarEventId, {
          title: `Task: ${updates.title || currentTask.title}`,
          description: updates.description || currentTask.description || 'Household task',
          startDate: updates.dueDate,
          endDate: new Date(updates.dueDate.getTime() + 30 * 60000), // 30 minutes
        });
      } catch (calendarError) {
        console.warn('Failed to update calendar event:', calendarError);
      }
    }
    
    const docRef = doc(db, 'simpleTasks', taskId);
    const updateData: any = {
      ...updates,
      updatedAt: Timestamp.fromDate(new Date())
    };
    
    // Convert Date objects to Timestamps
    if (updates.dueDate) {
      updateData.dueDate = Timestamp.fromDate(updates.dueDate);
    }
    
    await updateDoc(docRef, updateData);
  } catch (error) {
    console.error('Error updating simple task:', error);
    throw createAppError(
      ErrorCode.DB_NETWORK_ERROR,
      'Failed to update simple task'
    );
  }
};

export const deleteSimpleTask = async (taskId: string): Promise<void> => {
  try {
    // Get task for calendar cleanup
    const task = await getSimpleTask(taskId);
    
    // Delete calendar event if it exists
    if (task?.calendarEventId) {
      try {
        await deleteCalendarEvent(task.calendarEventId);
      } catch (calendarError) {
        console.warn('Failed to delete calendar event:', calendarError);
      }
    }
    
    const docRef = doc(db, 'simpleTasks', taskId);
    await deleteDoc(docRef);
  } catch (error) {
    console.error('Error deleting simple task:', error);
    throw createAppError(
      ErrorCode.DB_NETWORK_ERROR,
      'Failed to delete simple task'
    );
  }
};

// ============================================================================
// SIMPLE TASK UTILITY FUNCTIONS
// ============================================================================

/**
 * Filter tasks by completion status
 */
export const filterTasksByCompletion = (tasks: SimpleTask[], completed?: boolean): SimpleTask[] => {
  if (completed === undefined) return tasks;
  return tasks.filter(task => task.completed === completed);
};

/**
 * Filter tasks by due date range
 */
export const filterTasksByDueDate = (
  tasks: SimpleTask[],
  startDate?: Date,
  endDate?: Date
): SimpleTask[] => {
  return tasks.filter(task => {
    if (!task.dueDate) return false;
    
    if (startDate && task.dueDate < startDate) return false;
    if (endDate && task.dueDate > endDate) return false;
    
    return true;
  });
};

/**
 * Search tasks by title or description
 */
export const searchTasks = (tasks: SimpleTask[], searchTerm: string): SimpleTask[] => {
  if (!searchTerm.trim()) return tasks;
  
  const term = searchTerm.toLowerCase();
  return tasks.filter(task =>
    task.title.toLowerCase().includes(term) ||
    (task.description && task.description.toLowerCase().includes(term))
  );
};

/**
 * Sort tasks by due date (null dates go to end)
 */
export const sortTasksByDueDate = (tasks: SimpleTask[], ascending: boolean = true): SimpleTask[] => {
  return [...tasks].sort((a, b) => {
    // Handle null due dates - put them at the end
    if (!a.dueDate && !b.dueDate) return 0;
    if (!a.dueDate) return 1;
    if (!b.dueDate) return -1;
    
    const comparison = a.dueDate.getTime() - b.dueDate.getTime();
    return ascending ? comparison : -comparison;
  });
};

/**
 * Sort tasks by creation date
 */
export const sortTasksByCreatedDate = (tasks: SimpleTask[], ascending: boolean = true): SimpleTask[] => {
  return [...tasks].sort((a, b) => {
    const comparison = a.createdAt.getTime() - b.createdAt.getTime();
    return ascending ? comparison : -comparison;
  });
};

/**
 * Get tasks that are due soon (within specified days)
 */
export const getTasksDueSoon = (tasks: SimpleTask[], daysAhead: number = 7): SimpleTask[] => {
  const now = new Date();
  const futureDate = new Date();
  futureDate.setDate(now.getDate() + daysAhead);

  return tasks.filter(task => 
    task.dueDate && 
    task.dueDate >= now && 
    task.dueDate <= futureDate &&
    !task.completed
  );
};

/**
 * Get overdue tasks
 */
export const getOverdueTasks = (tasks: SimpleTask[]): SimpleTask[] => {
  const now = new Date();
  return tasks.filter(task => 
    task.dueDate && 
    task.dueDate < now && 
    !task.completed
  );
};

/**
 * Get task statistics
 */
export const getTaskStatistics = (tasks: SimpleTask[]): {
  total: number;
  completed: number;
  pending: number;
  overdue: number;
  dueSoon: number;
  completionRate: number;
} => {
  const now = new Date();
  const dueSoonDate = new Date();
  dueSoonDate.setDate(now.getDate() + 7);
  
  const stats = {
    total: tasks.length,
    completed: 0,
    pending: 0,
    overdue: 0,
    dueSoon: 0,
    completionRate: 0
  };

  tasks.forEach(task => {
    if (task.completed) {
      stats.completed++;
    } else {
      stats.pending++;
      
      if (task.dueDate) {
        if (task.dueDate < now) {
          stats.overdue++;
        } else if (task.dueDate <= dueSoonDate) {
          stats.dueSoon++;
        }
      }
    }
  });

  stats.completionRate = stats.total > 0 ? Math.round((stats.completed / stats.total) * 100) : 0;

  return stats;
};

/**
 * Mark task as completed
 */
export const completeTask = async (taskId: string): Promise<void> => {
  try {
    await updateSimpleTask(taskId, { completed: true });
  } catch (error) {
    console.error('Error completing task:', error);
    throw error;
  }
};

/**
 * Mark task as incomplete
 */
export const uncompleteTask = async (taskId: string): Promise<void> => {
  try {
    await updateSimpleTask(taskId, { completed: false });
  } catch (error) {
    console.error('Error uncompleting task:', error);
    throw error;
  }
};

/**
 * Toggle task completion status
 */
export const toggleTaskCompletion = async (taskId: string): Promise<void> => {
  try {
    const task = await getSimpleTask(taskId);
    if (!task) {
      throw new Error('Task not found');
    }
    
    await updateSimpleTask(taskId, { completed: !task.completed });
  } catch (error) {
    console.error('Error toggling task completion:', error);
    throw error;
  }
};

/**
 * Bulk update multiple tasks
 */
export const bulkUpdateTasks = async (
  updates: Array<{ id: string; updates: Partial<SimpleTask> }>
): Promise<void> => {
  try {
    await Promise.all(
      updates.map(({ id, updates: taskUpdates }) => 
        updateSimpleTask(id, taskUpdates)
      )
    );
  } catch (error) {
    console.error('Error bulk updating tasks:', error);
    throw error;
  }
};

/**
 * Bulk complete multiple tasks
 */
export const bulkCompleteTasks = async (taskIds: string[]): Promise<void> => {
  try {
    const updates = taskIds.map(id => ({
      id,
      updates: { completed: true }
    }));
    
    await bulkUpdateTasks(updates);
  } catch (error) {
    console.error('Error bulk completing tasks:', error);
    throw error;
  }
};

/**
 * Bulk delete multiple tasks
 */
export const bulkDeleteTasks = async (taskIds: string[]): Promise<void> => {
  try {
    await Promise.all(taskIds.map(id => deleteSimpleTask(id)));
  } catch (error) {
    console.error('Error bulk deleting tasks:', error);
    throw error;
  }
};

/**
 * Get tasks with advanced filtering and sorting
 */
export const getFilteredAndSortedTasks = async (
  userId: string,
  filters: {
    completed?: boolean;
    dueDateBefore?: Date;
    dueDateAfter?: Date;
    searchTerm?: string;
  } = {},
  sortBy: 'dueDate' | 'createdAt' | 'title' = 'dueDate',
  sortOrder: 'asc' | 'desc' = 'asc'
): Promise<SimpleTask[]> => {
  try {
    let tasks = await getUserSimpleTasks(userId);
    
    // Apply filters
    if (filters.completed !== undefined) {
      tasks = filterTasksByCompletion(tasks, filters.completed);
    }
    
    if (filters.dueDateBefore || filters.dueDateAfter) {
      tasks = filterTasksByDueDate(tasks, filters.dueDateAfter, filters.dueDateBefore);
    }
    
    if (filters.searchTerm) {
      tasks = searchTasks(tasks, filters.searchTerm);
    }
    
    // Apply sorting
    switch (sortBy) {
      case 'dueDate':
        tasks = sortTasksByDueDate(tasks, sortOrder === 'asc');
        break;
      case 'createdAt':
        tasks = sortTasksByCreatedDate(tasks, sortOrder === 'asc');
        break;
      case 'title':
        tasks = tasks.sort((a, b) => {
          const comparison = a.title.localeCompare(b.title);
          return sortOrder === 'asc' ? comparison : -comparison;
        });
        break;
    }
    
    return tasks;
  } catch (error) {
    console.error('Error getting filtered and sorted tasks:', error);
    throw error;
  }
};