import { useState, useEffect } from 'react';
import type { Plant, PlantCareTask } from '../../types';
import { PlantService } from '../../services/plantService';
import { useAuth } from '../../contexts/AuthContext';
import { useTranslation } from 'react-i18next';
import { PhotoTimeline } from './PhotoTimeline';
import { CareTaskList } from './CareTaskList';
import { LoadingSpinner } from '../common/LoadingSpinner';
import { ErrorMessage } from '../common/ErrorMessage';
import { MarkdownRenderer } from '../common/MarkdownRenderer';
import { formatDistanceToNow, format } from 'date-fns';

interface PlantDetailProps {
  plantId: string;
  onEdit?: (plant: Plant) => void;
  onDelete?: (plantId: string) => void;
  onBack?: () => void;
}

export function PlantDetail({ plantId, onEdit, onDelete, onBack }: PlantDetailProps) {
  const { user } = useAuth();
  const { t } = useTranslation('plants');
  const [plant, setPlant] = useState<Plant | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [activeTab, setActiveTab] = useState<'overview' | 'photos' | 'care'>('overview');

  useEffect(() => {
    if (user && plantId) {
      loadPlant();
    }
  }, [user, plantId]);

  const loadPlant = async () => {
    if (!user) return;

    try {
      setLoading(true);
      setError(null);
      const plantData = await PlantService.getPlant(user.uid, plantId);
      if (plantData) {
        setPlant(plantData);
      } else {
        setError('Plant not found');
      }
    } catch (err) {
      console.error('Error loading plant:', err);
      setError(err instanceof Error ? err.message : 'Failed to load plant');
    } finally {
      setLoading(false);
    }
  };

  const handleDelete = async () => {
    if (!user || !plant) return;

    if (window.confirm(t('detail.deleteConfirm', { name: plant.name }))) {
      try {
        await PlantService.deletePlant(user.uid, plant.id);
        onDelete?.(plant.id);
      } catch (err) {
        console.error('Error deleting plant:', err);
        setError(err instanceof Error ? err.message : 'Failed to delete plant');
      }
    }
  };

  const handleCareTaskUpdate = (updatedTask: PlantCareTask) => {
    if (!plant) return;
    
    const updatedCareTasks = plant.careTasks.map(task => 
      task.id === updatedTask.id ? updatedTask : task
    );
    
    setPlant({ ...plant, careTasks: updatedCareTasks });
  };

  const handleCareTaskAdd = (newTask: PlantCareTask) => {
    if (!plant) return;
    
    setPlant({ ...plant, careTasks: [...plant.careTasks, newTask] });
  };

  const handleCareTaskDelete = (taskId: string) => {
    if (!plant) return;
    
    const updatedCareTasks = plant.careTasks.filter(task => task.id !== taskId);
    setPlant({ ...plant, careTasks: updatedCareTasks });
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
        onRetry={loadPlant}
      />
    );
  }

  if (!plant) {
    return (
      <div className="text-center py-12">
        <span className="text-6xl mb-4 block">🌱</span>
        <h3 className="text-lg font-medium text-gray-900 mb-2">
          {t('detail.notFound.title')}
        </h3>
        <p className="text-gray-600 mb-4">
          {t('detail.notFound.message')}
        </p>
        <button
          onClick={onBack}
          className="text-green-600 hover:text-green-700 font-medium"
        >
          {t('detail.actions.backToPlants')}
        </button>
      </div>
    );
  }

  const latestPhoto = plant.photos.length > 0 
    ? plant.photos.sort((a, b) => b.uploadedAt.getTime() - a.uploadedAt.getTime())[0]
    : null;

  const upcomingTasks = plant.careTasks
    .filter(task => !task.completed && task.dueDate > new Date())
    .sort((a, b) => a.dueDate.getTime() - b.dueDate.getTime());

  const overdueTasks = plant.careTasks
    .filter(task => !task.completed && task.dueDate <= new Date());

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="bg-white border border-gray-200 rounded-lg p-6">
        <div className="flex items-start justify-between">
          <div className="flex items-start space-x-4">
            {/* Plant image */}
            <div className="w-24 h-24 bg-gray-100 rounded-lg overflow-hidden flex-shrink-0">
              {latestPhoto ? (
                <img
                  src={latestPhoto.thumbnailUrl || latestPhoto.url}
                  alt={plant.name}
                  className="w-full h-full object-cover"
                />
              ) : (
                <div className="w-full h-full flex items-center justify-center">
                  <span className="text-3xl">🌱</span>
                </div>
              )}
            </div>

            {/* Plant info */}
            <div className="flex-1">
              <div className="flex items-center space-x-2 mb-2">
                {onBack && (
                  <button
                    onClick={onBack}
                    className="text-gray-400 hover:text-gray-600 transition-colors"
                    title="Back to plants"
                  >
                    <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
                    </svg>
                  </button>
                )}
                <h1 className="text-2xl font-bold text-gray-900">{plant.name}</h1>
              </div>
              
              {plant.species && (
                <p className="text-lg text-gray-600 italic mb-2">{plant.species}</p>
              )}
              
              <div className="text-gray-700 mb-4">
                <MarkdownRenderer content={plant.description} />
              </div>
              
              <div className="flex flex-wrap gap-4 text-sm text-gray-600">
                <span>📸 {plant.photos.length} {t('detail.stats.photosUploaded')}</span>
                <span>💧 {plant.careTasks.length} {t('detail.stats.careTasks')}</span>
                <span>📅 {t('detail.fields.added')} {format(plant.createdAt, 'MMM d, yyyy')}</span>
              </div>
            </div>
          </div>

          {/* Actions */}
          <div className="flex space-x-2">
            <button
              onClick={() => onEdit?.(plant)}
              className="inline-flex items-center px-3 py-2 border border-gray-300 rounded-md text-sm font-medium text-gray-700 bg-white hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-green-500"
            >
              <svg className="w-4 h-4 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
              </svg>
              {t('detail.actions.edit')}
            </button>
            <button
              onClick={handleDelete}
              className="inline-flex items-center px-3 py-2 border border-red-300 rounded-md text-sm font-medium text-red-700 bg-white hover:bg-red-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-red-500"
            >
              <svg className="w-4 h-4 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
              </svg>
              {t('detail.actions.delete')}
            </button>
          </div>
        </div>

        {/* Task alerts */}
        {(overdueTasks.length > 0 || upcomingTasks.length > 0) && (
          <div className="mt-4 pt-4 border-t border-gray-200 space-y-2">
            {overdueTasks.length > 0 && (
              <div className="flex items-center text-sm text-red-600 bg-red-50 px-3 py-2 rounded-md">
                <svg className="w-4 h-4 mr-2" fill="currentColor" viewBox="0 0 20 20">
                  <path fillRule="evenodd" d="M8.257 3.099c.765-1.36 2.722-1.36 3.486 0l5.58 9.92c.75 1.334-.213 2.98-1.742 2.98H4.42c-1.53 0-2.493-1.646-1.743-2.98l5.58-9.92zM11 13a1 1 0 11-2 0 1 1 0 012 0zm-1-8a1 1 0 00-1 1v3a1 1 0 002 0V6a1 1 0 00-1-1z" clipRule="evenodd" />
                </svg>
                {overdueTasks.length} {overdueTasks.length === 1 ? t('detail.alerts.overdueTasks') : t('detail.alerts.overdueTasksPlural')}
              </div>
            )}
            
            {upcomingTasks.length > 0 && (
              <div className="flex items-center text-sm text-blue-600 bg-blue-50 px-3 py-2 rounded-md">
                <svg className="w-4 h-4 mr-2" fill="currentColor" viewBox="0 0 20 20">
                  <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm1-12a1 1 0 10-2 0v4a1 1 0 00.293.707l2.828 2.829a1 1 0 101.415-1.415L11 9.586V6z" clipRule="evenodd" />
                </svg>
                {t('detail.alerts.nextTask')} {upcomingTasks[0].title} ({formatDistanceToNow(upcomingTasks[0].dueDate, { addSuffix: true })})
              </div>
            )}
          </div>
        )}
      </div>

      {/* Tabs */}
      <div className="bg-white border border-gray-200 rounded-lg">
        <div className="border-b border-gray-200">
          <nav className="-mb-px flex space-x-8 px-6">
            {[
              { id: 'overview', label: t('detail.tabs.overview'), icon: '📋' },
              { id: 'photos', label: t('detail.tabs.photos'), icon: '📸', count: plant.photos.length },
              { id: 'care', label: t('detail.tabs.careTasks'), icon: '💧', count: plant.careTasks.length },
            ].map((tab) => (
              <button
                key={tab.id}
                onClick={() => setActiveTab(tab.id as typeof activeTab)}
                className={`py-4 px-1 border-b-2 font-medium text-sm whitespace-nowrap flex items-center space-x-2 ${
                  activeTab === tab.id
                    ? 'border-green-500 text-green-600'
                    : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
                }`}
              >
                <span>{tab.icon}</span>
                <span>{tab.label}</span>
                {tab.count !== undefined && (
                  <span className={`inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium ${
                    activeTab === tab.id
                      ? 'bg-green-100 text-green-800'
                      : 'bg-gray-100 text-gray-800'
                  }`}>
                    {tab.count}
                  </span>
                )}
              </button>
            ))}
          </nav>
        </div>

        {/* Tab content */}
        <div className="p-6">
          {activeTab === 'overview' && (
            <div className="space-y-6">
              <div>
                <h3 className="text-lg font-medium text-gray-900 mb-3">{t('detail.plantInformation')}</h3>
                <dl className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div>
                    <dt className="text-sm font-medium text-gray-500">{t('detail.fields.name')}</dt>
                    <dd className="mt-1 text-sm text-gray-900">{plant.name}</dd>
                  </div>
                  {plant.species && (
                    <div>
                      <dt className="text-sm font-medium text-gray-500">{t('detail.fields.species')}</dt>
                      <dd className="mt-1 text-sm text-gray-900">{plant.species}</dd>
                    </div>
                  )}
                  <div>
                    <dt className="text-sm font-medium text-gray-500">{t('detail.fields.description')}</dt>
                    <dd className="mt-1 text-sm text-gray-900">{plant.description}</dd>
                  </div>
                  <div>
                    <dt className="text-sm font-medium text-gray-500">{t('detail.fields.added')}</dt>
                    <dd className="mt-1 text-sm text-gray-900">
                      {format(plant.createdAt, 'MMMM d, yyyy')} ({formatDistanceToNow(plant.createdAt, { addSuffix: true })})
                    </dd>
                  </div>
                  <div>
                    <dt className="text-sm font-medium text-gray-500">{t('detail.fields.lastUpdated')}</dt>
                    <dd className="mt-1 text-sm text-gray-900">
                      {format(plant.updatedAt, 'MMMM d, yyyy')} ({formatDistanceToNow(plant.updatedAt, { addSuffix: true })})
                    </dd>
                  </div>
                </dl>
              </div>

              {/* Quick stats */}
              <div>
                <h3 className="text-lg font-medium text-gray-900 mb-3">{t('detail.quickStats')}</h3>
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                  <div className="bg-gray-50 p-4 rounded-lg">
                    <div className="text-2xl font-bold text-gray-900">{plant.photos.length}</div>
                    <div className="text-sm text-gray-600">{t('detail.stats.photosUploaded')}</div>
                  </div>
                  <div className="bg-gray-50 p-4 rounded-lg">
                    <div className="text-2xl font-bold text-gray-900">{plant.careTasks.length}</div>
                    <div className="text-sm text-gray-600">{t('detail.stats.careTasks')}</div>
                  </div>
                  <div className="bg-gray-50 p-4 rounded-lg">
                    <div className="text-2xl font-bold text-gray-900">
                      {plant.careTasks.filter(task => task.completed).length}
                    </div>
                    <div className="text-sm text-gray-600">{t('detail.stats.completedTasks')}</div>
                  </div>
                </div>
              </div>
            </div>
          )}

          {activeTab === 'photos' && (
            <PhotoTimeline 
              plantId={plant.id}
              photos={plant.photos}
              onPhotosChange={(photos) => setPlant({ ...plant, photos })}
            />
          )}

          {activeTab === 'care' && (
            <CareTaskList
              plantId={plant.id}
              careTasks={plant.careTasks}
              onTaskUpdate={handleCareTaskUpdate}
              onTaskAdd={handleCareTaskAdd}
              onTaskDelete={handleCareTaskDelete}
            />
          )}
        </div>
      </div>
    </div>
  );
}