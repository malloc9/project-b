import { useState, useEffect } from 'react';
import { useTasks } from './useTasks';
import { useProjects } from './useProjects';
import { isWithinNextNDays } from '../utils/dateUtils'; // Assuming isWithinNextNDays is in dateUtils

interface DashboardStats {
  thisWeekCount: number;
  loading: boolean;
  error: string | null;
}

export function useDashboardStats(): DashboardStats {
  const { tasks, loading: tasksLoading, error: tasksError } = useTasks();
  const { projects, loading: projectsLoading, error: projectsError } = useProjects();

  const [thisWeekCount, setThisWeekCount] = useState(0);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (tasksLoading || projectsLoading) {
      setLoading(true);
      return;
    }

    if (tasksError) {
      setError(`Failed to load tasks: ${tasksError}`);
      setLoading(false);
      return;
    }

    if (projectsError) {
      setError(`Failed to load projects: ${projectsError}`);
      setLoading(false);
      return;
    }

    setLoading(false);
    setError(null);

    let count = 0;
    tasks.forEach(task => {
      if (task.dueDate && isWithinNextNDays(task.dueDate instanceof Date ? task.dueDate : new Date(task.dueDate), 7)) {
        count++;
      }
    });

    projects.forEach(project => {
      if (project.dueDate && isWithinNextNDays(project.dueDate instanceof Date ? project.dueDate : new Date(project.dueDate), 7)) {
        count++;
      }
    });

    setThisWeekCount(count);

  }, [tasks, projects, tasksLoading, projectsLoading, tasksError, projectsError]);

  return { thisWeekCount, loading, error };
}