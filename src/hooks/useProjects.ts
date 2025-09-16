import { useEffect, useState } from "react";
import type { Project } from "../types"; // Assuming a Project type exists
// Assuming a Project type exists
import { getUserProjects } from '../services/projectService'; // Import getUserProjects directly
import { useAuth } from '../contexts/AuthContext';

export function useProjects() {
  const [projects, setProjects] = useState<Project[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const { user, loading: authLoading } = useAuth();

  useEffect(() => {
    if (!user?.uid || authLoading) {
      setProjects([]);
      setLoading(false);
      return;
    }

    setLoading(true);
    setError(null);

    const fetchProjects = async () => {
      try {
        const fetchedProjects = await getUserProjects(user.uid);
        setProjects(fetchedProjects);
      } catch (err) {
        console.error("Failed to fetch projects:", err);
        setError("Failed to load projects.");
      } finally {
        setLoading(false);
      }
    };

    fetchProjects();

    // TODO: Implement real-time listener if needed
    // const unsubscribe = ProjectService.onProjectsChange(userId, (updatedProjects) => {
    //   setProjects(updatedProjects);
    // });
    // return () => unsubscribe();
  }, [user?.uid, authLoading]);

  return { projects, loading, error };
}
