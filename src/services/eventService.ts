import { collection, getDocs, query, where } from 'firebase/firestore';
import { db } from '../config/firebase';
import type { SimpleTask, Project, PlantCareTask } from '../types';

export interface CalendarEvent {
  title: string;
  start: Date;
  end: Date;
  allDay?: boolean;
  resource?: any;
}

export const getEvents = async (userId: string): Promise<CalendarEvent[]> => {
  const events: CalendarEvent[] = [];

  // Get simple tasks
  const tasksQuery = query(
    collection(db, 'users', userId, 'simpleTasks'),
    where('dueDate', '!=', null)
  );
  const tasksSnapshot = await getDocs(tasksQuery);
  tasksSnapshot.forEach((doc) => {
    const task = doc.data() as SimpleTask;
    if (task.dueDate) {
      events.push({
        title: `Task: ${task.title}`,
        start: task.dueDate,
        end: task.dueDate,
        allDay: true,
        resource: { type: 'task', ...task },
      });
    }
  });

  // Get projects
  const projectsQuery = query(
    collection(db, 'users', userId, 'projects'),
    where('dueDate', '!=', null)
  );
  const projectsSnapshot = await getDocs(projectsQuery);
  projectsSnapshot.forEach((doc) => {
    const project = doc.data() as Project;
    if (project.dueDate) {
      events.push({
        title: `Project: ${project.title}`,
        start: project.dueDate,
        end: project.dueDate,
        allDay: true,
        resource: { type: 'project', ...project },
      });
    }
  });

  // Get plant care tasks
  const plantsQuery = query(collection(db, 'users', userId, 'plants'));
  const plantsSnapshot = await getDocs(plantsQuery);
  for (const plantDoc of plantsSnapshot.docs) {
    const plant = plantDoc.data() as any; // Firestore data is not strongly typed here
    if (plant.careTasks) {
        plant.careTasks.forEach((task: PlantCareTask) => {
            if (task.dueDate) {
                events.push({
                    title: `Plant Care: ${task.title}`,
                    start: task.dueDate,
                    end: task.dueDate,
                    allDay: true,
                    resource: { type: 'plant', ...task },
                });
            }
        });
    }
  }

  return events;
};
