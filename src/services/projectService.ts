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
import type { Project, Subtask, TaskStatus, CreateCalendarEventData, CalendarEvent } from '../types';

import { ErrorCode } from '../types/errors';
import { createAppError } from '../types/errors';

// ============================================================================
// CALENDAR INTEGRATION HELPER FUNCTIONS
// ============================================================================

/**
 * Get calendar events by source type and ID for projects
 */
const getProjectCalendarEvents = async (
  userId: string,
  projectId: string
): Promise<CalendarEvent[]> => {
  try {
    const q = query(
      collection(db, "users", userId, "calendarEvents"),
      where("type", "==", "project"),
      where("sourceId", "==", projectId)
    );

    const querySnapshot = await getDocs(q);
    const events: CalendarEvent[] = [];

    querySnapshot.forEach((doc) => {
      const data = doc.data();
      events.push({
        id: doc.id,
        ...data,
        createdAt: data.createdAt.toDate(),
        updatedAt: data.updatedAt.toDate(),
        startDate: data.startDate.toDate(),
        endDate: data.endDate.toDate(),
      } as CalendarEvent);
    });

    return events;
  } catch (error) {
    console.error("Error getting project calendar events:", error);
    return [];
  }
};

/**
 * Get calendar events for subtasks
 */
const getSubtaskCalendarEvents = async (
  userId: string,
  projectId: string,
  subtaskId: string
): Promise<CalendarEvent[]> => {
  try {
    const sourceId = `${projectId}-${subtaskId}`;
    const q = query(
      collection(db, "users", userId, "calendarEvents"),
      where("type", "==", "project"),
      where("sourceId", "==", sourceId)
    );

    const querySnapshot = await getDocs(q);
    const events: CalendarEvent[] = [];

    querySnapshot.forEach((doc) => {
      const data = doc.data();
      events.push({
        id: doc.id,
        ...data,
        createdAt: data.createdAt.toDate(),
        updatedAt: data.updatedAt.toDate(),
        startDate: data.startDate.toDate(),
        endDate: data.endDate.toDate(),
      } as CalendarEvent);
    });

    return events;
  } catch (error) {
    console.error("Error getting subtask calendar events:", error);
    return [];
  }
};

/**
 * Create calendar event for a project
 */
const createProjectCalendarEvent = async (
  userId: string,
  project: Project
): Promise<void> => {
  if (!project.dueDate) return; // Skip projects without due dates

  try {
    const { createEvent } = await import('./calendarService');
    
    const eventData: CreateCalendarEventData = {
      userId,
      title: `Project: ${project.title}`,
      description: project.description,
      startDate: project.dueDate,
      endDate: project.dueDate,
      allDay: true,
      type: 'project',
      sourceId: project.id,
      status: project.status === 'finished' ? 'completed' : 'pending',
      notifications: []
    };

    await createEvent(userId, eventData);
  } catch (error) {
    console.error("Error creating project calendar event:", error);
    // Don't throw - calendar event creation should not fail project creation
  }
};

/**
 * Create calendar event for a subtask
 */
const createSubtaskCalendarEvent = async (
  userId: string,
  subtask: Subtask,
  projectTitle: string
): Promise<void> => {
  if (!subtask.dueDate) return; // Skip subtasks without due dates

  try {
    const { createEvent } = await import('./calendarService');
    
    const eventData: CreateCalendarEventData = {
      userId,
      title: `${projectTitle}: ${subtask.title}`,
      description: subtask.description,
      startDate: subtask.dueDate,
      endDate: subtask.dueDate,
      allDay: true,
      type: 'project',
      sourceId: `${subtask.projectId}-${subtask.id}`,
      status: subtask.status === 'finished' ? 'completed' : 'pending',
      notifications: []
    };

    await createEvent(userId, eventData);
  } catch (error) {
    console.error("Error creating subtask calendar event:", error);
    // Don't throw - calendar event creation should not fail subtask creation
  }
};

/**
 * Update calendar event for a project
 */
const updateProjectCalendarEvent = async (
  userId: string,
  project: Project
): Promise<void> => {
  try {
    const { updateEvent, deleteEvent } = await import('./calendarService');
    const events = await getProjectCalendarEvents(userId, project.id);
    
    if (events.length === 0) {
      // Create event if it doesn't exist and project has due date
      if (project.dueDate) {
        await createProjectCalendarEvent(userId, project);
      }
      return;
    }

    // Update existing event
    const event = events[0]; // Should only be one event per project
    
    if (!project.dueDate) {
      // Remove event if project no longer has due date
      await deleteEvent(userId, event.id);
      return;
    }

    // Update event with project changes
    await updateEvent(userId, event.id, {
      title: `Project: ${project.title}`,
      description: project.description,
      startDate: project.dueDate,
      endDate: project.dueDate,
      status: project.status === 'finished' ? 'completed' : 'pending'
    });
  } catch (error) {
    console.error("Error updating project calendar event:", error);
    // Don't throw - calendar event update should not fail project update
  }
};

/**
 * Update calendar event for a subtask
 */
const updateSubtaskCalendarEvent = async (
  userId: string,
  subtask: Subtask,
  projectTitle: string
): Promise<void> => {
  try {
    const { updateEvent, deleteEvent } = await import('./calendarService');
    const events = await getSubtaskCalendarEvents(userId, subtask.projectId, subtask.id);
    
    if (events.length === 0) {
      // Create event if it doesn't exist and subtask has due date
      if (subtask.dueDate) {
        await createSubtaskCalendarEvent(userId, subtask, projectTitle);
      }
      return;
    }

    // Update existing event
    const event = events[0]; // Should only be one event per subtask
    
    if (!subtask.dueDate) {
      // Remove event if subtask no longer has due date
      await deleteEvent(userId, event.id);
      return;
    }

    // Update event with subtask changes
    await updateEvent(userId, event.id, {
      title: `${projectTitle}: ${subtask.title}`,
      description: subtask.description,
      startDate: subtask.dueDate,
      endDate: subtask.dueDate,
      status: subtask.status === 'finished' ? 'completed' : 'pending'
    });
  } catch (error) {
    console.error("Error updating subtask calendar event:", error);
    // Don't throw - calendar event update should not fail subtask update
  }
};

/**
 * Delete calendar event for a project
 */
const deleteProjectCalendarEvent = async (
  userId: string,
  projectId: string
): Promise<void> => {
  try {
    const { deleteEvent } = await import('./calendarService');
    const events = await getProjectCalendarEvents(userId, projectId);
    
    // Delete all calendar events for this project
    await Promise.all(events.map(event => deleteEvent(userId, event.id)));
  } catch (error) {
    console.error("Error deleting project calendar event:", error);
    // Don't throw - calendar event deletion should not fail project deletion
  }
};

/**
 * Delete calendar event for a subtask
 */
const deleteSubtaskCalendarEvent = async (
  userId: string,
  projectId: string,
  subtaskId: string
): Promise<void> => {
  try {
    const { deleteEvent } = await import('./calendarService');
    const events = await getSubtaskCalendarEvents(userId, projectId, subtaskId);
    
    // Delete all calendar events for this subtask
    await Promise.all(events.map(event => deleteEvent(userId, event.id)));
  } catch (error) {
    console.error("Error deleting subtask calendar event:", error);
    // Don't throw - calendar event deletion should not fail subtask deletion
  }
};

// ============================================================================
// PROJECT CRUD OPERATIONS
// ============================================================================

export const createProject = async (
  projectData: Omit<Project, 'id' | 'createdAt' | 'updatedAt'>
): Promise<string> => {
  try {
    const now = new Date();
    
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
    
    const docRef = await addDoc(userProjectsCollection, firestoreData);

    // Create calendar event for the new project
    const createdProject: Project = {
      id: docRef.id,
      userId: projectData.userId,
      title: projectData.title,
      description: projectData.description,
      status: projectData.status,
      dueDate: projectData.dueDate,
      subtasks: projectData.subtasks || [],
      createdAt: now,
      updatedAt: now,
    };

    await createProjectCalendarEvent(projectData.userId, createdProject);

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
    const docRef = doc(db, 'users', userId, 'projects', projectId);
    const updateData: any = {
      ...updates,
      updatedAt: Timestamp.fromDate(new Date())
    };

    // Explicitly handle dueDate to ensure it's null if undefined
    if (updates.dueDate === undefined) {
      updateData.dueDate = null;
    } else if (updates.dueDate !== undefined) {
      updateData.dueDate = Timestamp.fromDate(updates.dueDate);
    }

    // Filter out undefined values (Firestore doesn't accept them)
    const cleanData = Object.fromEntries(
      Object.entries(updateData).filter(([_, value]) => value !== undefined)
    ) as Record<string, any>;

    await updateDoc(docRef, cleanData);

    // Update calendar event for the project
    const updatedProject = await getProject(projectId, userId);
    if (updatedProject) {
      await updateProjectCalendarEvent(userId, updatedProject);
    }
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
    // Delete calendar events for project and all subtasks first
    await deleteProjectCalendarEvent(userId, projectId);
    
    // Get all subtasks to delete their calendar events
    const subtasks = await getProjectSubtasks(projectId, userId);
    await Promise.all(
      subtasks.map(subtask => 
        deleteSubtaskCalendarEvent(userId, projectId, subtask.id)
      )
    );

    const batch = writeBatch(db);
    
    // Delete the project
    const projectRef = doc(db, 'users', userId, 'projects', projectId);
    batch.delete(projectRef);
    
    // Delete all associated subtasks
    const subtasksQuery = query(
      collection(db, 'users', userId, 'subtasks'),
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

    // Create calendar event for the new subtask
    const createdSubtask: Subtask = {
      id: docRef.id,
      projectId: subtaskData.projectId,
      userId: subtaskData.userId,
      title: subtaskData.title,
      description: subtaskData.description,
      status: subtaskData.status,
      dueDate: subtaskData.dueDate,
      createdAt: now,
      updatedAt: now,
    };

    // Get project title for calendar event
    const project = await getProject(subtaskData.projectId, userId);
    if (project) {
      await createSubtaskCalendarEvent(userId, createdSubtask, project.title);
    }

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
    } else if (updates.dueDate === undefined) {
      updateData.dueDate = null;
    }

    // Filter out undefined values (Firestore doesn't accept them)
    const cleanData = Object.fromEntries(
      Object.entries(updateData).filter(([_, value]) => value !== undefined)
    ) as Record<string, any>;

    await updateDoc(docRef, cleanData);

    // Update calendar event for the subtask
    const updatedSubtask = await getSubtask(subtaskId, userId);
    if (updatedSubtask) {
      const project = await getProject(updatedSubtask.projectId, userId);
      if (project) {
        await updateSubtaskCalendarEvent(userId, updatedSubtask, project.title);
      }
    }
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
    // Get subtask to find project ID for calendar event deletion
    const subtask = await getSubtask(subtaskId, userId);
    
    // Delete calendar event first
    if (subtask) {
      await deleteSubtaskCalendarEvent(userId, subtask.projectId, subtaskId);
    }

    // Then delete the subtask
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