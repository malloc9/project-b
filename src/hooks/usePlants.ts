import { useEffect, useState } from "react";
import type { Plant } from "../types";
import { OfflineAwarePlantService } from "../services/offlineAwarePlantService";

export function usePlants(userId: string | undefined) {
  const [plants, setPlants] = useState<Plant[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!userId) {
      setPlants([]);
      setLoading(false);
      return;
    }

    setLoading(true);
    setError(null);

    const fetchPlants = async () => {
      try {
        const fetchedPlants = await OfflineAwarePlantService.getUserPlants(
          userId
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
  }, [userId]);

  return { plants, loading, error };
}
