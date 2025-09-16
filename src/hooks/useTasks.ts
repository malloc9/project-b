import { useEffect, useState } from 'react';
import type { SimpleTask } from '../types'; // Assuming a SimpleTask type exists
import { getUserSimpleTasks } from '../services/simpleTaskService'; // Assuming SimpleTaskService exists
import { useAuth } from '../contexts/AuthContext';

export function useTasks() {
  const [tasks, setTasks] = useState<SimpleTask[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const { user, loading: authLoading } = useAuth();

  useEffect(() => {
    if (!user?.uid || authLoading) {
      setTasks([]);
      setLoading(false);
      return;
    }

    setLoading(true);
    setError(null);

    const fetchTasks = async () => {
      try {
        const fetchedTasks = await getUserSimpleTasks(user.uid);
        setTasks(fetchedTasks);
      } catch (err) {
        console.error("Failed to fetch tasks:", err);
        setError("Failed to load tasks.");
      } finally {
        setLoading(false);
      }
    };

    fetchTasks();

    // TODO: Implement real-time listener if needed
    // const unsubscribe = SimpleTaskService.onTasksChange(userId, (updatedTasks) => {
    //   setTasks(updatedTasks);
    // });
    // return () => unsubscribe();

  }, [user?.uid, authLoading]);

  return { tasks, loading, error };
}