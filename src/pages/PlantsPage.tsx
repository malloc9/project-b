import { useState, useEffect } from 'react';
import type { Plant } from '../types';
import { PlantService } from '../services/plantService';
import { useAuth } from '../contexts/AuthContext';
import { useTranslation } from 'react-i18next';
import { ContentArea, GridLayout, StatsCard } from '../components/layout';
import { PlantList, PlantDetail, PlantForm } from '../components/plants';

type ViewMode = 'list' | 'detail' | 'create' | 'edit';

export function PlantsPage() {
  const { user } = useAuth();
  const { t } = useTranslation('plants');
  const [viewMode, setViewMode] = useState<ViewMode>('list');
  const [selectedPlant, setSelectedPlant] = useState<Plant | null>(null);
  const [plants, setPlants] = useState<Plant[]>([]);
  const [stats, setStats] = useState({
    totalPlants: 0,
    totalPhotos: 0,
    totalCareTasks: 0,
  });

  useEffect(() => {
    if (user) {
      loadPlants();
    }
  }, [user]);

  const loadPlants = async () => {
    if (!user) return;

    try {
      const userPlants = await PlantService.getUserPlants(user.uid);
      setPlants(userPlants);
      
      // Calculate stats
      const totalPhotos = userPlants.reduce((sum, plant) => sum + plant.photos.length, 0);
      const totalCareTasks = userPlants.reduce((sum, plant) => sum + plant.careTasks.length, 0);
      
      setStats({
        totalPlants: userPlants.length,
        totalPhotos,
        totalCareTasks,
      });
    } catch (error) {
      console.error('Error loading plants:', error);
    }
  };

  const handlePlantSelect = (plant: Plant) => {
    setSelectedPlant(plant);
    setViewMode('detail');
  };

  const handlePlantEdit = (plant: Plant) => {
    setSelectedPlant(plant);
    setViewMode('edit');
  };

  const handlePlantDelete = (plantId: string) => {
    setPlants(plants.filter(plant => plant.id !== plantId));
    if (selectedPlant?.id === plantId) {
      setViewMode('list');
      setSelectedPlant(null);
    }
    // Recalculate stats
    const updatedPlants = plants.filter(plant => plant.id !== plantId);
    const totalPhotos = updatedPlants.reduce((sum, plant) => sum + plant.photos.length, 0);
    const totalCareTasks = updatedPlants.reduce((sum, plant) => sum + plant.careTasks.length, 0);
    setStats({
      totalPlants: updatedPlants.length,
      totalPhotos,
      totalCareTasks,
    });
  };

  const handlePlantSave = (plant: Plant) => {
    const existingIndex = plants.findIndex(p => p.id === plant.id);
    if (existingIndex >= 0) {
      // Update existing plant
      const updatedPlants = [...plants];
      updatedPlants[existingIndex] = plant;
      setPlants(updatedPlants);
    } else {
      // Add new plant
      setPlants([...plants, plant]);
    }
    
    setSelectedPlant(plant);
    setViewMode('detail');
    loadPlants(); // Refresh to get updated stats
  };

  const handleBack = () => {
    setViewMode('list');
    setSelectedPlant(null);
  };

  const plantStatsData = [
    {
      title: t('stats.totalPlants'),
      value: stats.totalPlants.toString(),
      icon: '🌱',
      description: t('stats.plantsInCollection'),
      color: 'green' as const,
    },
    {
      title: t('stats.photosUploaded'),
      value: stats.totalPhotos.toString(),
      icon: '📸',
      description: t('stats.growthPhotosCaptured'),
      color: 'blue' as const,
    },
    {
      title: t('stats.careTasks'),
      value: stats.totalCareTasks.toString(),
      icon: '💧',
      description: t('stats.scheduledCareReminders'),
      color: 'indigo' as const,
    },
  ];

  return (
    <div className="space-y-6">
      {/* Page header */}
      <ContentArea
        title={t('pageTitle')}
        subtitle={t('pageSubtitle')}
        actions={
          viewMode === 'list' ? (
            <button 
              onClick={() => setViewMode('create')}
              className="bg-green-600 hover:bg-green-700 text-white px-4 py-2 rounded-md text-sm font-medium transition-colors focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-green-500"
            >
              {t('addPlant')}
            </button>
          ) : (
            <button 
              onClick={handleBack}
              className="bg-gray-600 hover:bg-gray-700 text-white px-4 py-2 rounded-md text-sm font-medium transition-colors focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-gray-500"
            >
              {t('backToPlants')}
            </button>
          )
        }
      >
        <div></div>
      </ContentArea>

      {/* Stats - only show on list view */}
      {viewMode === 'list' && (
        <GridLayout columns={3} gap="md">
          {plantStatsData.map((stat) => (
            <StatsCard
              key={stat.title}
              title={stat.title}
              value={stat.value}
              icon={stat.icon}
              description={stat.description}
              color={stat.color}
            />
          ))}
        </GridLayout>
      )}
      
      {/* Main content */}
      <ContentArea>
        {viewMode === 'list' && (
          <PlantList
            onPlantSelect={handlePlantSelect}
            onPlantEdit={handlePlantEdit}
            onPlantDelete={handlePlantDelete}
          />
        )}

        {viewMode === 'detail' && selectedPlant && (
          <PlantDetail
            plantId={selectedPlant.id}
            onEdit={handlePlantEdit}
            onDelete={handlePlantDelete}
            onBack={handleBack}
          />
        )}

        {viewMode === 'create' && (
          <PlantForm
            onSave={handlePlantSave}
            onCancel={handleBack}
          />
        )}

        {viewMode === 'edit' && selectedPlant && (
          <PlantForm
            plant={selectedPlant}
            onSave={handlePlantSave}
            onCancel={handleBack}
          />
        )}
      </ContentArea>
    </div>
  );
}