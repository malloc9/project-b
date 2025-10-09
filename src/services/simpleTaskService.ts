import {
  collection,
  doc,
  addDoc,
  getDoc,
  getDocs,
  updateDoc,
  deleteDoc,
  query,
  orderBy,
  Timestamp,
} from "firebase/firestore";
import { db } from "../config/firebase";
import type { SimpleTask } from "../types";
import { ErrorCode, createAppError } from "../types/errors";


// ============================================================================
// SIMPLE TASK CRUD OPERATIONS
// ============================================================================

export const createSimpleTask = async (
  userId: string | undefined,
  taskData: Omit<SimpleTask, "id" | "createdAt" | "updatedAt">
): Promise<string> => {
  if (!userId) {
    throw createAppError(
      ErrorCode.DB_PERMISSION_DENIED,
      "Cannot create simple task: User not authenticated."
    );
  }
  try {
    const now = new Date();

    const taskToSave = {
      ...taskData,
      description: taskData.description || null, // Convert undefined or empty string to null
      createdAt: Timestamp.fromDate(now),
      updatedAt: Timestamp.fromDate(now),
      dueDate: taskData.dueDate ? Timestamp.fromDate(taskData.dueDate) : null,
    };

    const docRef = await addDoc(
      collection(db, "users", userId, "simpleTasks"),
      taskToSave
    );
    return docRef.id;
  } catch (error) {
    console.error("Error creating simple task:", error);
    throw createAppError(
      ErrorCode.DB_NETWORK_ERROR,
      "Failed to create simple task"
    );
  }
};

export const getSimpleTask = async (
  userId: string | undefined,
  taskId: string
): Promise<SimpleTask | null> => {
  if (!userId) {
    throw createAppError(
      ErrorCode.DB_PERMISSION_DENIED,
      "Cannot get simple task: User not authenticated."
    );
  }
  try {
    const docRef = doc(db, "users", userId, "simpleTasks", taskId);
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
      dueDate: data.dueDate ? data.dueDate.toDate() : undefined,
    } as SimpleTask;
  } catch (error) {
    console.error("Error getting simple task:", error);
    throw createAppError(
      ErrorCode.DB_NETWORK_ERROR,
      "Failed to get simple task"
    );
  }
};

export const getUserSimpleTasks = async (
  userId: string | undefined
): Promise<SimpleTask[]> => {
  console.log("getUserSimpleTasks called with userId:", userId);
  if (!userId || userId === '') {
    console.warn("getUserSimpleTasks called with undefined or empty userId.");
    return [];
  }
  try {
    const q = query(
      collection(db, "users", userId, "simpleTasks"),
      orderBy("dueDate", "asc")
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
        dueDate: data.dueDate ? data.dueDate.toDate() : undefined,
      } as SimpleTask);
    });

    return tasks;
  } catch (error) {
    console.error("Error getting user simple tasks:", error);
    throw createAppError(
      ErrorCode.DB_NETWORK_ERROR,
      "Failed to get simple tasks"
    );
  }
};

export const updateSimpleTask = async (
  userId: string | undefined,
  taskId: string,
  updates: Partial<SimpleTask>
): Promise<void> => {
  if (!userId) {
    throw createAppError(
      ErrorCode.DB_PERMISSION_DENIED,
      "Cannot update simple task: User not authenticated."
    );
  }
  try {
    const docRef = doc(db, "users", userId, "simpleTasks", taskId);
    const updateData: any = {
      ...updates,
      updatedAt: Timestamp.fromDate(new Date()),
    };

    // Convert Date objects to Timestamps
    if (updates.dueDate) {
      updateData.dueDate = Timestamp.fromDate(updates.dueDate);
    } else if (updates.dueDate === undefined) {
      updateData.dueDate = null;
    }

    await updateDoc(docRef, updateData);
  } catch (error) {
    console.error("Error updating simple task:", error);
    throw createAppError(
      ErrorCode.DB_NETWORK_ERROR,
      "Failed to update simple task"
    );
  }
};

export const deleteSimpleTask = async (
  userId: string | undefined,
  taskId: string
): Promise<void> => {
  if (!userId) {
    throw createAppError(
      ErrorCode.DB_PERMISSION_DENIED,
      "Cannot delete simple task: User not authenticated."
    );
  }
  try {
    const docRef = doc(db, "users", userId, "simpleTasks", taskId);
    await deleteDoc(docRef);
  } catch (error) {
    console.error("Error deleting simple task:", error);
    throw createAppError(
      ErrorCode.DB_NETWORK_ERROR,
      "Failed to delete simple task"
    );
  }
};

// ============================================================================
// SIMPLE TASK UTILITY FUNCTIONS
// ============================================================================

/**
 * Filter tasks by completion status
 */
export const filterTasksByCompletion = (
  tasks: SimpleTask[],
  completed?: boolean
): SimpleTask[] => {
  if (completed === undefined) return tasks;
  return tasks.filter((task) => task.completed === completed);
};

/**
 * Filter tasks by due date range
 */
export const filterTasksByDueDate = (
  tasks: SimpleTask[],
  startDate?: Date,
  endDate?: Date
): SimpleTask[] => {
  return tasks.filter((task) => {
    if (!task.dueDate) return false;

    if (startDate && task.dueDate < startDate) return false;
    if (endDate && task.dueDate > endDate) return false;

    return true;
  });
};

/**
 * Search tasks by title or description
 */
export const searchTasks = (
  tasks: SimpleTask[],
  searchTerm: string
): SimpleTask[] => {
  if (!searchTerm.trim()) return tasks;

  const term = searchTerm.toLowerCase();
  return tasks.filter(
    (task) =>
      task.title.toLowerCase().includes(term) ||
      (task.description && task.description.toLowerCase().includes(term))
  );
};

/**
 * Sort tasks by due date (null dates go to end)
 */
export const sortTasksByDueDate = (
  tasks: SimpleTask[],
  ascending: boolean = true
): SimpleTask[] => {
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
export const sortTasksByCreatedDate = (
  tasks: SimpleTask[],
  ascending: boolean = true
): SimpleTask[] => {
  return [...tasks].sort((a, b) => {
    const comparison = a.createdAt.getTime() - b.createdAt.getTime();
    return ascending ? comparison : -comparison;
  });
};

/**
 * Get tasks that are due soon (within specified days)
 */
export const getTasksDueSoon = (
  tasks: SimpleTask[],
  daysAhead: number = 7
): SimpleTask[] => {
  const now = new Date();
  const futureDate = new Date();
  futureDate.setDate(now.getDate() + daysAhead);

  return tasks.filter(
    (task) =>
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
  return tasks.filter(
    (task) => task.dueDate && task.dueDate < now && !task.completed
  );
};

/**
 * Get task statistics
 */
export const getTaskStatistics = (
  tasks: SimpleTask[]
): {
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
    completionRate: 0,
  };

  tasks.forEach((task) => {
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

  stats.completionRate =
    stats.total > 0 ? Math.round((stats.completed / stats.total) * 100) : 0;

  return stats;
};

/**
 * Mark task as completed
 */
export const completeTask = async (
  userId: string | undefined,
  taskId: string
): Promise<void> => {
  if (!userId) {
    throw createAppError(
      ErrorCode.DB_PERMISSION_DENIED,
      "Cannot complete task: User not authenticated."
    );
  }
  try {
    await updateSimpleTask(userId, taskId, { completed: true });
  } catch (error) {
    console.error("Error completing task:", error);
    throw error;
  }
};

/**
 * Mark task as incomplete
 */
export const uncompleteTask = async (
  userId: string | undefined,
  taskId: string
): Promise<void> => {
  if (!userId) {
    throw createAppError(
      ErrorCode.DB_PERMISSION_DENIED,
      "Cannot uncomplete task: User not authenticated."
    );
  }
  try {
    await updateSimpleTask(userId, taskId, { completed: false });
  } catch (error) {
    console.error("Error uncompleting task:", error);
    throw error;
  }
};

/**
 * Toggle task completion status
 */
export const toggleTaskCompletion = async (
  userId: string | undefined,
  taskId: string
): Promise<void> => {
  if (!userId) {
    throw createAppError(
      ErrorCode.DB_PERMISSION_DENIED,
      "Cannot toggle task completion: User not authenticated."
    );
  }
  try {
    const task = await getSimpleTask(userId, taskId);
    if (!task) {
      throw new Error("Task not found");
    }

    await updateSimpleTask(userId, taskId, { completed: !task.completed });
  } catch (error) {
    console.error("Error toggling task completion:", error);
    throw error;
  }
};

/**
 * Bulk update multiple tasks
 */
export const bulkUpdateTasks = async (
  userId: string | undefined,
  updates: Array<{ id: string; updates: Partial<SimpleTask> }>
): Promise<void> => {
  if (!userId) {
    throw createAppError(
      ErrorCode.DB_PERMISSION_DENIED,
      "Cannot bulk update tasks: User not authenticated."
    );
  }
  try {
    await Promise.all(
      updates.map(({ id, updates: taskUpdates }) =>
        updateSimpleTask(userId, id, taskUpdates)
      )
    );
  } catch (error) {
    console.error("Error bulk updating tasks:", error);
    throw error;
  }
};

/**
 * Bulk complete multiple tasks
 */
export const bulkCompleteTasks = async (
  userId: string | undefined,
  taskIds: string[]
): Promise<void> => {
  if (!userId) {
    throw createAppError(
      ErrorCode.DB_PERMISSION_DENIED,
      "Cannot bulk complete tasks: User not authenticated."
    );
  }
  try {
    const updates = taskIds.map((id) => ({
      id,
      updates: { completed: true },
    }));

    await bulkUpdateTasks(userId, updates);
  } catch (error) {
    console.error("Error bulk completing tasks:", error);
    throw error;
  }
};

/**
 * Bulk delete multiple tasks
 */
export const bulkDeleteTasks = async (
  userId: string | undefined,
  taskIds: string[]
): Promise<void> => {
  if (!userId) {
    throw createAppError(
      ErrorCode.DB_PERMISSION_DENIED,
      "Cannot bulk delete tasks: User not authenticated."
    );
  }
  try {
    await Promise.all(taskIds.map((id) => deleteSimpleTask(userId, id)));
  } catch (error) {
    console.error("Error bulk deleting tasks:", error);
    throw error;
  }
};

/**
 * Get tasks with advanced filtering and sorting
 */
export const getFilteredAndSortedTasks = async (
  userId: string | undefined,
  filters: {
    completed?: boolean;
    dueDateBefore?: Date;
    dueDateAfter?: Date;
    searchTerm?: string;
  } = {},
  sortBy: "dueDate" | "createdAt" | "title" = "dueDate",
  sortOrder: "asc" | "desc" = "asc"
): Promise<SimpleTask[]> => {
  if (!userId) {
    throw createAppError(
      ErrorCode.DB_PERMISSION_DENIED,
      "Cannot get filtered and sorted tasks: User not authenticated."
    );
  }
  try {
    let tasks = await getUserSimpleTasks(userId);

    // Apply filters
    if (filters.completed !== undefined) {
      tasks = filterTasksByCompletion(tasks, filters.completed);
    }

    if (filters.dueDateBefore || filters.dueDateAfter) {
      tasks = filterTasksByDueDate(
        tasks,
        filters.dueDateAfter,
        filters.dueDateBefore
      );
    }

    if (filters.searchTerm) {
      tasks = searchTasks(tasks, filters.searchTerm);
    }

    // Apply sorting
    switch (sortBy) {
      case "dueDate":
        tasks = sortTasksByDueDate(tasks, sortOrder === "asc");
        break;
      case "createdAt":
        tasks = sortTasksByCreatedDate(tasks, sortOrder === "asc");
        break;
      case "title":
        tasks = tasks.sort((a, b) => {
          const comparison = a.title.localeCompare(b.title);
          return sortOrder === "asc" ? comparison : -comparison;
        });
        break;
    }

    return tasks;
  } catch (error) {
    console.error("Error getting filtered and sorted tasks:", error);
    throw error;
  }
};
