import { useEffect, useState } from "react";
import type { Plant } from "../types";
import { OfflineAwarePlantService } from "../services/offlineAwarePlantService";
import { useAuth } from '../contexts/AuthContext';

export function usePlants() {
  const [plants, setPlants] = useState<Plant[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const { user, loading: authLoading } = useAuth();

  useEffect(() => {
    if (!user?.uid || authLoading) {
      setPlants([]);
      setLoading(false);
      return;
    }

    setLoading(true);
    setError(null);

    const fetchPlants = async () => {
      try {
        const fetchedPlants = await OfflineAwarePlantService.getUserPlants(
          user.uid
        );
        setPlants(fetchedPlants);
      } catch (err) {
        console.error("Failed to fetch plants:", err);
        setError("Failed to load plants.");
      } finally {
        setLoading(false);
      }
    };

    fetchPlants();

    // TODO: Implement real-time listener if needed
    // const unsubscribe = OfflineAwarePlantService.onPlantsChange(userId, (updatedPlants) => {
    //   setPlants(updatedPlants);
    // });
    // return () => unsubscribe();
  }, [user?.uid, authLoading]);

  return { plants, loading, error };
}
