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
  Timestamp,
  writeBatch
} from 'firebase/firestore';
import { db } from '../config/firebase';
import type { Project, Subtask, TaskStatus } from '../types';

import { ErrorCode } from '../types/errors';
import { createAppError } from '../types/errors';
import { createProjectCalendarEvent, updateCalendarEvent, deleteCalendarEvent } from './calendarService';

// ============================================================================
// PROJECT CRUD OPERATIONS
// ============================================================================

export const createProject = async (
  projectData: Omit<Project, 'id' | 'createdAt' | 'updatedAt'>
): Promise<string> => {
  try {
    const now = new Date();
    
    // Create calendar event if due date is provided
    let calendarEventId: string | undefined;
    if (projectData.dueDate) {
      try {
        calendarEventId = await createProjectCalendarEvent(
          projectData.title,
          projectData.description,
          projectData.dueDate
        );
      } catch (calendarError) {
        console.warn('Failed to create calendar event for project:', calendarError);
        // Continue without calendar sync
      }
    }
    
    // Use user subcollection structure to match security rules
    const userProjectsCollection = collection(db, `users/${projectData.userId}/projects`);
    
    // Filter out undefined values for Firestore
    const firestoreData: any = {
      userId: projectData.userId,
      title: projectData.title,
      description: projectData.description,
      status: projectData.status,
      subtasks: projectData.subtasks || [],
      createdAt: Timestamp.fromDate(now),
      updatedAt: Timestamp.fromDate(now)
    };
    
    // Only add dueDate if it's defined
    if (projectData.dueDate) {
      firestoreData.dueDate = Timestamp.fromDate(projectData.dueDate);
    }
    
    // Only add calendarEventId if it's defined
    if (calendarEventId) {
      firestoreData.calendarEventId = calendarEventId;
    }
    
    const docRef = await addDoc(userProjectsCollection, firestoreData);
    return docRef.id;
  } catch (error) {
    console.error('Error creating project:', error);
    throw createAppError(
      ErrorCode.DB_NETWORK_ERROR,
      'Failed to create project'
    );
  }
};

export const getProject = async (projectId: string, userId: string): Promise<Project | null> => {
  try {
    const docRef = doc(db, `users/${userId}/projects`, projectId);
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
    } as Project;
  } catch (error) {
    console.error('Error getting project:', error);
    throw createAppError(
      ErrorCode.DB_NETWORK_ERROR,
      'Failed to get project'
    );
  }
};

export const getUserProjects = async (userId: string): Promise<Project[]> => {
  try {
    const q = query(
      collection(db, 'users', userId, 'projects'),
      orderBy('updatedAt', 'desc')
    );
    
    const querySnapshot = await getDocs(q);
    const projects: Project[] = [];
    
    querySnapshot.forEach((doc) => {
      const data = doc.data();
      projects.push({
        id: doc.id,
        ...data,
        createdAt: data.createdAt.toDate(),
        updatedAt: data.updatedAt.toDate(),
        dueDate: data.dueDate ? data.dueDate.toDate() : undefined
      } as Project);
    });
    
    return projects;
  } catch (error) {
    console.error('Error getting user projects:', error);
    throw createAppError(
      ErrorCode.DB_NETWORK_ERROR,
      'Failed to get projects'
    );
  }
};

export const updateProject = async (
  projectId: string,
  userId: string,
  updates: Partial<Project>
): Promise<void> => {
  try {
    // Get current project for calendar sync
    const currentProject = await getProject(projectId, userId);
    
    // Handle calendar sync for completed projects
    if (updates.status === 'finished' && currentProject?.calendarEventId) {
      try {
        await deleteCalendarEvent(currentProject.calendarEventId);
        updates.calendarEventId = undefined; // Remove calendar event ID
      } catch (calendarError) {
        console.warn('Failed to delete calendar event:', calendarError);
      }
    }

    // Handle calendar sync for due date changes
    if (updates.dueDate && currentProject?.calendarEventId && updates.dueDate !== currentProject.dueDate) {
      try {
        await updateCalendarEvent(currentProject.calendarEventId, {
          title: `Project: ${updates.title || currentProject.title}`,
          description: updates.description || currentProject.description,
          startDate: updates.dueDate,
          endDate: new Date(updates.dueDate.getTime() + 60 * 60000), // 1 hour
        });
      } catch (calendarError) {
        console.warn('Failed to update calendar event:', calendarError);
      }
    }
    
    const docRef = doc(db, 'projects', projectId);
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
    console.error('Error updating project:', error);
    throw createAppError(
      ErrorCode.DB_NETWORK_ERROR,
      'Failed to update project'
    );
  }
};

export const deleteProject = async (projectId: string, userId: string): Promise<void> => {
  try {
    // Get project and subtasks for calendar cleanup
    const [project, subtasks] = await Promise.all([
      getProject(projectId, userId),
      getProjectSubtasks(projectId, userId)
    ]);
    
    // Delete calendar events
    const calendarDeletions = [];
    if (project?.calendarEventId) {
      calendarDeletions.push(deleteCalendarEvent(project.calendarEventId));
    }
    subtasks.forEach(subtask => {
      if (subtask.calendarEventId) {
        calendarDeletions.push(deleteCalendarEvent(subtask.calendarEventId));
      }
    });
    
    // Execute calendar deletions (don't block on failures)
    if (calendarDeletions.length > 0) {
      try {
        await Promise.allSettled(calendarDeletions);
      } catch (calendarError) {
        console.warn('Some calendar events failed to delete:', calendarError);
      }
    }
    
    const batch = writeBatch(db);
    
    // Delete the project
    const projectRef = doc(db, 'projects', projectId);
    batch.delete(projectRef);
    
    // Delete all associated subtasks
    const subtasksQuery = query(
      collection(db, 'subtasks'),
      where('projectId', '==', projectId)
    );
    const subtasksSnapshot = await getDocs(subtasksQuery);
    
    subtasksSnapshot.forEach((subtaskDoc) => {
      batch.delete(subtaskDoc.ref);
    });
    
    await batch.commit();
  } catch (error) {
    console.error('Error deleting project:', error);
    throw createAppError(
      ErrorCode.DB_NETWORK_ERROR,
      'Failed to delete project'
    );
  }
};

// ============================================================================
// SUBTASK CRUD OPERATIONS
// ============================================================================

export const createSubtask = async (
  subtaskData: Omit<Subtask, 'id' | 'createdAt' | 'updatedAt'>,
  userId: string
): Promise<string> => {
  try {
    const now = new Date();
    const subtaskToSave = {
      ...subtaskData,
      description: subtaskData.description || null, // Convert undefined or empty string to null
      createdAt: Timestamp.fromDate(now),
      updatedAt: Timestamp.fromDate(now),
      dueDate: subtaskData.dueDate ? Timestamp.fromDate(subtaskData.dueDate) : null
    };
    const docRef = await addDoc(collection(db, 'users', userId, 'subtasks'), subtaskToSave);
    return docRef.id;
  } catch (error) {
    console.error('Error creating subtask:', error);
    throw createAppError(
      ErrorCode.DB_NETWORK_ERROR,
      'Failed to create subtask'
    );
  }
};

export const getSubtask = async (subtaskId: string, userId: string): Promise<Subtask | null> => {
  try {
    const docRef = doc(db, 'users', userId, 'subtasks', subtaskId);
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
    } as Subtask;
  } catch (error) {
    console.error('Error getting subtask:', error);
    throw createAppError(
      ErrorCode.DB_NETWORK_ERROR,
      'Failed to get subtask'
    );
  }
};

export const getProjectSubtasks = async (projectId: string, userId: string): Promise<Subtask[]> => {
  try {
    const q = query(
      collection(db, 'users', userId, 'subtasks'),
      where('projectId', '==', projectId),
      orderBy('createdAt', 'asc')
    );
    
    const querySnapshot = await getDocs(q);
    const subtasks: Subtask[] = [];
    
    querySnapshot.forEach((doc) => {
      const data = doc.data();
      subtasks.push({
        id: doc.id,
        ...data,
        createdAt: data.createdAt.toDate(),
        updatedAt: data.updatedAt.toDate(),
        dueDate: data.dueDate ? data.dueDate.toDate() : undefined
      } as Subtask);
    });
    
    return subtasks;
  } catch (error) {
    console.error('Error getting project subtasks:', error);
    throw createAppError(
      ErrorCode.DB_NETWORK_ERROR,
      'Failed to get subtasks'
    );
  }
};

export const updateSubtask = async (
  subtaskId: string,
  userId: string,
  updates: Partial<Subtask>
): Promise<void> => {
  try {
    const docRef = doc(db, 'users', userId, 'subtasks', subtaskId);
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
    console.error('Error updating subtask:', error);
    throw createAppError(
      ErrorCode.DB_NETWORK_ERROR,
      'Failed to update subtask'
    );
  }
};

export const deleteSubtask = async (subtaskId: string, userId: string): Promise<void> => {
  try {
    const docRef = doc(db, 'users', userId, 'subtasks', subtaskId);
    await deleteDoc(docRef);
  } catch (error) {
    console.error('Error deleting subtask:', error);
    throw createAppError(
      ErrorCode.DB_NETWORK_ERROR,
      'Failed to delete subtask'
    );
  }
};

// ============================================================================
// PROJECT UTILITY FUNCTIONS
// ============================================================================

/**
 * Calculate project completion percentage based on subtask status
 */
export const calculateProjectProgress = (subtasks: Subtask[]): number => {
  if (subtasks.length === 0) return 0;
  
  const completedSubtasks = subtasks.filter(subtask => subtask.status === 'finished');
  return Math.round((completedSubtasks.length / subtasks.length) * 100);
};

/**
 * Check if project should be automatically marked as finished
 */
export const shouldAutoCompleteProject = (subtasks: Subtask[]): boolean => {
  if (subtasks.length === 0) return false;
  return subtasks.every(subtask => subtask.status === 'finished');
};

/**
 * Get projects with their subtasks populated
 */
export const getProjectsWithSubtasks = async (userId: string): Promise<Project[]> => {
  try {
    const projects = await getUserProjects(userId);
    
    // Fetch subtasks for each project
    const projectsWithSubtasks = await Promise.all(
      projects.map(async (project) => {
        const subtasks = await getProjectSubtasks(project.id, userId);
        return {
          ...project,
          subtasks
        };
      })
    );
    
    return projectsWithSubtasks;
  } catch (error) {
    console.error('Error getting projects with subtasks:', error);
    throw createAppError(
      ErrorCode.DB_NETWORK_ERROR,
      'Failed to get projects with subtasks'
    );
  }
};

/**
 * Update project status based on subtask completion
 */
export const updateProjectStatusFromSubtasks = async (projectId: string, userId: string): Promise<void> => {
  try {
    const subtasks = await getProjectSubtasks(projectId, userId);
    
    if (shouldAutoCompleteProject(subtasks)) {
      await updateProject(projectId, userId, { status: 'finished' });
    } else if (subtasks.some(subtask => subtask.status === 'in_progress')) {
      await updateProject(projectId, userId, { status: 'in_progress' });
    } else if (subtasks.some(subtask => subtask.status === 'todo')) {
      await updateProject(projectId, userId, { status: 'todo' });
    }
  } catch (error) {
    console.error('Error updating project status:', error);
    throw error;
  }
};

/**
 * Filter projects by status
 */
export const filterProjectsByStatus = (projects: Project[], status?: TaskStatus): Project[] => {
  if (!status) return projects;
  return projects.filter(project => project.status === status);
};

/**
 * Filter projects by due date range
 */
export const filterProjectsByDueDate = (
  projects: Project[],
  startDate?: Date,
  endDate?: Date
): Project[] => {
  return projects.filter(project => {
    if (!project.dueDate) return false;
    
    if (startDate && project.dueDate < startDate) return false;
    if (endDate && project.dueDate > endDate) return false;
    
    return true;
  });
};

/**
 * Search projects by title or description
 */
export const searchProjects = (projects: Project[], searchTerm: string): Project[] => {
  if (!searchTerm.trim()) return projects;
  
  const term = searchTerm.toLowerCase();
  return projects.filter(project =>
    project.title.toLowerCase().includes(term) ||
    project.description.toLowerCase().includes(term)
  );
};

// ============================================================================
// ADVANCED STATUS MANAGEMENT AND PROGRESS TRACKING
// ============================================================================

/**
 * Get project statistics including completion rates and overdue tasks
 */
export const getProjectStatistics = (projects: Project[]): {
  total: number;
  completed: number;
  inProgress: number;
  todo: number;
  overdue: number;
  completionRate: number;
} => {
  const now = new Date();
  
  const stats = {
    total: projects.length,
    completed: 0,
    inProgress: 0,
    todo: 0,
    overdue: 0,
    completionRate: 0
  };

  projects.forEach(project => {
    switch (project.status) {
      case 'finished':
        stats.completed++;
        break;
      case 'in_progress':
        stats.inProgress++;
        break;
      case 'todo':
        stats.todo++;
        break;
    }

    // Check if project is overdue
    if (project.dueDate && project.dueDate < now && project.status !== 'finished') {
      stats.overdue++;
    }
  });

  stats.completionRate = stats.total > 0 ? Math.round((stats.completed / stats.total) * 100) : 0;

  return stats;
};

/**
 * Get subtask statistics for a project
 */
export const getSubtaskStatistics = (subtasks: Subtask[]): {
  total: number;
  completed: number;
  inProgress: number;
  todo: number;
  overdue: number;
  completionRate: number;
} => {
  const now = new Date();
  
  const stats = {
    total: subtasks.length,
    completed: 0,
    inProgress: 0,
    todo: 0,
    overdue: 0,
    completionRate: 0
  };

  subtasks.forEach(subtask => {
    switch (subtask.status) {
      case 'finished':
        stats.completed++;
        break;
      case 'in_progress':
        stats.inProgress++;
        break;
      case 'todo':
        stats.todo++;
        break;
    }

    // Check if subtask is overdue
    if (subtask.dueDate && subtask.dueDate < now && subtask.status !== 'finished') {
      stats.overdue++;
    }
  });

  stats.completionRate = stats.total > 0 ? Math.round((stats.completed / stats.total) * 100) : 0;

  return stats;
};

/**
 * Get projects that are due soon (within specified days)
 */
export const getProjectsDueSoon = (projects: Project[], daysAhead: number = 7): Project[] => {
  const now = new Date();
  const futureDate = new Date();
  futureDate.setDate(now.getDate() + daysAhead);

  return projects.filter(project => 
    project.dueDate && 
    project.dueDate >= now && 
    project.dueDate <= futureDate &&
    project.status !== 'finished'
  );
};

/**
 * Get overdue projects
 */
export const getOverdueProjects = (projects: Project[]): Project[] => {
  const now = new Date();
  return projects.filter(project => 
    project.dueDate && 
    project.dueDate < now && 
    project.status !== 'finished'
  );
};

/**
 * Get subtasks that are due soon (within specified days)
 */
export const getSubtasksDueSoon = (subtasks: Subtask[], daysAhead: number = 7): Subtask[] => {
  const now = new Date();
  const futureDate = new Date();
  futureDate.setDate(now.getDate() + daysAhead);

  return subtasks.filter(subtask => 
    subtask.dueDate && 
    subtask.dueDate >= now && 
    subtask.dueDate <= futureDate &&
    subtask.status !== 'finished'
  );
};

/**
 * Get overdue subtasks
 */
export const getOverdueSubtasks = (subtasks: Subtask[]): Subtask[] => {
  const now = new Date();
  return subtasks.filter(subtask => 
    subtask.dueDate && 
    subtask.dueDate < now && 
    subtask.status !== 'finished'
  );
};

/**
 * Update subtask status and automatically update parent project status
 */
export const updateSubtaskWithProjectSync = async (
  subtaskId: string,
  userId: string,
  updates: Partial<Subtask>
): Promise<void> => {
  try {
    // Update the subtask
    await updateSubtask(subtaskId, userId, updates);
    
    // Get the subtask to find its project
    const subtask = await getSubtask(subtaskId, userId);
    if (!subtask) {
      throw new Error('Subtask not found');
    }

    // Update project status based on all subtasks
    await updateProjectStatusFromSubtasks(subtask.projectId, subtask.userId);
  } catch (error) {
    console.error('Error updating subtask with project sync:', error);
    throw error;
  }
};

/**
 * Bulk update multiple subtasks and sync project status
 */
export const bulkUpdateSubtasks = async (
  userId: string,
  updates: Array<{ id: string; updates: Partial<Subtask> }>
): Promise<void> => {
  try {
    const projectUserIds = new Map<string, string>();
    
    // Update all subtasks and collect project IDs and user IDs
    await Promise.all(
      updates.map(async ({ id, updates: subtaskUpdates }) => {
        await updateSubtask(id, userId, subtaskUpdates);
        const subtask = await getSubtask(id, userId);
        if (subtask) {
          projectUserIds.set(subtask.projectId, subtask.userId);
        }
      })
    );

    // Update all affected project statuses
    await Promise.all(
      Array.from(projectUserIds.entries()).map(([projectId, userId]) => 
        updateProjectStatusFromSubtasks(projectId, userId)
      )
    );
  } catch (error) {
    console.error('Error bulk updating subtasks:', error);
    throw error;
  }
};

/**
 * Get project progress details including subtask breakdown
 */
export const getProjectProgressDetails = async (projectId: string, userId: string): Promise<{
  project: Project;
  subtasks: Subtask[];
  progress: number;
  statistics: ReturnType<typeof getSubtaskStatistics>;
  dueSoon: Subtask[];
  overdue: Subtask[];
}> => {
  try {
    const [project, subtasks] = await Promise.all([
      getProject(projectId, userId),
      getProjectSubtasks(projectId, userId)
    ]);

    if (!project) {
      throw new Error('Project not found');
    }

    const progress = calculateProjectProgress(subtasks);
    const statistics = getSubtaskStatistics(subtasks);
    const dueSoon = getSubtasksDueSoon(subtasks);
    const overdue = getOverdueSubtasks(subtasks);

    return {
      project,
      subtasks,
      progress,
      statistics,
      dueSoon,
      overdue
    };
  } catch (error) {
    console.error('Error getting project progress details:', error);
    throw error;
  }
};

/**
 * Get dashboard data with project and subtask summaries
 */
export const getDashboardData = async (userId: string): Promise<{
  projects: Project[];
  projectStats: ReturnType<typeof getProjectStatistics>;
  projectsDueSoon: Project[];
  overdueProjects: Project[];
  recentActivity: Array<{
    type: 'project' | 'subtask';
    action: 'created' | 'updated' | 'completed';
    item: Project | Subtask;
    timestamp: Date;
  }>;
}> => {
  try {
    const projects = await getProjectsWithSubtasks(userId);
    const projectStats = getProjectStatistics(projects);
    const projectsDueSoon = getProjectsDueSoon(projects);
    const overdueProjects = getOverdueProjects(projects);

    // Get recent activity (simplified - in a real app, you'd track this separately)
    const recentActivity: Array<{
      type: 'project' | 'subtask';
      action: 'created' | 'updated' | 'completed';
      item: Project | Subtask;
      timestamp: Date;
    }> = [];

    // Add recently updated projects
    projects
      .sort((a, b) => b.updatedAt.getTime() - a.updatedAt.getTime())
      .slice(0, 5)
      .forEach(project => {
        recentActivity.push({
          type: 'project',
          action: project.status === 'finished' ? 'completed' : 'updated',
          item: project,
          timestamp: project.updatedAt
        });
      });

    // Add recently updated subtasks
    const allSubtasks = projects.flatMap(p => p.subtasks);
    allSubtasks
      .sort((a, b) => b.updatedAt.getTime() - a.updatedAt.getTime())
      .slice(0, 5)
      .forEach(subtask => {
        recentActivity.push({
          type: 'subtask',
          action: subtask.status === 'finished' ? 'completed' : 'updated',
          item: subtask,
          timestamp: subtask.updatedAt
        });
      });

    // Sort by timestamp and limit
    recentActivity.sort((a, b) => b.timestamp.getTime() - a.timestamp.getTime());
    recentActivity.splice(10); // Keep only top 10

    return {
      projects,
      projectStats,
      projectsDueSoon,
      overdueProjects,
      recentActivity
    };
  } catch (error) {
    console.error('Error getting dashboard data:', error);
    throw error;
  }
};