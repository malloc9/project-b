import { useState, useEffect, useMemo } from 'react';
import type { Plant, PlantFilters } from '../../types';
import { PlantService } from '../../services/plantService';
import { useAuth } from '../../contexts/AuthContext';
import { PlantCard } from './PlantCard';
import { PlantFiltersComponent } from './PlantFilters';
import { LoadingSpinner } from '../common/LoadingSpinner';
import { ErrorMessage } from '../common/ErrorMessage';
import { VirtualList } from '../common/VirtualList';
import { usePerformanceTimer } from '../../utils/performanceMonitor';

interface PlantListProps {
  onPlantSelect?: (plant: Plant) => void;
  onPlantEdit?: (plant: Plant) => void;
  onPlantDelete?: (plantId: string) => void;
}

export function PlantList({ onPlantSelect, onPlantEdit, onPlantDelete }: PlantListProps) {
  const { user } = useAuth();
  const [plants, setPlants] = useState<Plant[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [filters, setFilters] = useState<PlantFilters>({});
  const [useVirtualScrolling, setUseVirtualScrolling] = useState(false);
  const { startTimer, endTimer } = usePerformanceTimer('plant-list-render');

  // Enable virtual scrolling for large datasets
  const shouldUseVirtualScrolling = useMemo(() => {
    return plants.length > 50; // Use virtual scrolling for more than 50 plants
  }, [plants.length]);

  useEffect(() => {
    if (user) {
      loadPlants();
    }
  }, [user, filters]);

  const loadPlants = async () => {
    if (!user) return;

    try {
      setLoading(true);
      setError(null);
      startTimer();
      const userPlants = await PlantService.getUserPlants(user.uid, filters);
      setPlants(userPlants);
      setUseVirtualScrolling(shouldUseVirtualScrolling);
      endTimer();
    } catch (err) {
      console.error('Error loading plants:', err);
      setError(err instanceof Error ? err.message : 'Failed to load plants');
    } finally {
      setLoading(false);
    }
  };

  const handlePlantDelete = async (plantId: string) => {
    if (!user) return;

    try {
      await PlantService.deletePlant(user.uid, plantId);
      setPlants(plants.filter(plant => plant.id !== plantId));
      onPlantDelete?.(plantId);
    } catch (err) {
      console.error('Error deleting plant:', err);
      setError(err instanceof Error ? err.message : 'Failed to delete plant');
    }
  };

  const handleFiltersChange = (newFilters: PlantFilters) => {
    setFilters(newFilters);
  };

  if (loading) {
    return (
      <div className="flex justify-center items-center py-12">
        <LoadingSpinner size="lg" />
      </div>
    );
  }

  if (error) {
    return (
      <ErrorMessage 
        message={error} 
        onRetry={loadPlants}
      />
    );
  }

  return (
    <div className="space-y-6">
      {/* Filters */}
      <PlantFiltersComponent 
        filters={filters}
        onFiltersChange={handleFiltersChange}
      />

      {/* Plant count */}
      <div className="flex justify-between items-center">
        <p className="text-sm text-gray-600">
          {plants.length} {plants.length === 1 ? 'plant' : 'plants'} found
        </p>
      </div>

      {/* Plants grid */}
      {plants.length === 0 ? (
        <div className="text-center py-12">
          <span className="text-6xl mb-4 block">🌱</span>
          <h3 className="text-lg font-medium text-gray-900 mb-2">
            No plants found
          </h3>
          <p className="text-gray-600 mb-4">
            {Object.keys(filters).length > 0 
              ? 'Try adjusting your filters or add your first plant to get started.'
              : 'Add your first plant to start building your collection.'
            }
          </p>
        </div>
      ) : shouldUseVirtualScrolling ? (
        <VirtualList
          items={plants}
          itemHeight={280} // Approximate height of PlantCard
          containerHeight={600} // Fixed container height for virtual scrolling
          className="border rounded-lg"
          renderItem={(plant, index) => (
            <div className="p-3">
              <PlantCard
                key={plant.id}
                plant={plant}
                onClick={() => onPlantSelect?.(plant)}
                onEdit={() => onPlantEdit?.(plant)}
                onDelete={() => handlePlantDelete(plant.id)}
              />
            </div>
          )}
        />
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {plants.map((plant) => (
            <PlantCard
              key={plant.id}
              plant={plant}
              onClick={() => onPlantSelect?.(plant)}
              onEdit={() => onPlantEdit?.(plant)}
              onDelete={() => handlePlantDelete(plant.id)}
            />
          ))}
        </div>
      )}
    </div>
  );
}