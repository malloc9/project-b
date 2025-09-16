import { useEffect, useState } from "react";
import type { Project } from "../types"; // Assuming a Project type exists
// Assuming a Project type exists
import { getUserProjects } from '../services/projectService'; // Import getUserProjects directly

export function useProjects(userId: string | undefined) {
  const [projects, setProjects] = useState<Project[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!userId) {
      setProjects([]);
      setLoading(false);
      return;
    }

    setLoading(true);
    setError(null);

    const fetchProjects = async () => {
      try {
        const fetchedProjects = await getUserProjects(userId);
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
  }, [userId]);

  return { projects, loading, error };
}
