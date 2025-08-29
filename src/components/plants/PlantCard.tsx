import type { Plant } from '../../types';
import { formatDistanceToNow } from 'date-fns';
import { LazyImage } from '../common/LazyImage';

interface PlantCardProps {
  plant: Plant;
  onClick?: () => void;
  onEdit?: () => void;
  onDelete?: () => void;
}

export function PlantCard({ plant, onClick, onEdit, onDelete }: PlantCardProps) {
  const latestPhoto = plant.photos.length > 0 
    ? plant.photos.sort((a, b) => b.uploadedAt.getTime() - a.uploadedAt.getTime())[0]
    : null;

  const upcomingTasks = plant.careTasks
    .filter(task => !task.completed && task.dueDate > new Date())
    .sort((a, b) => a.dueDate.getTime() - b.dueDate.getTime());

  const overdueTasks = plant.careTasks
    .filter(task => !task.completed && task.dueDate <= new Date());

  return (
    <div className="bg-white rounded-lg shadow-sm border border-gray-200 overflow-hidden hover:shadow-md transition-shadow">
      {/* Plant image */}
      <div 
        className="h-48 bg-gray-100 cursor-pointer relative overflow-hidden"
        onClick={onClick}
      >
        {latestPhoto ? (
          <LazyImage
            src={latestPhoto.thumbnailUrl || latestPhoto.url}
            alt={plant.name}
            className="w-full h-full object-cover"
            placeholder="data:image/svg+xml;base64,PHN2ZyB3aWR0aD0iMzAwIiBoZWlnaHQ9IjIwMCIgeG1sbnM9Imh0dHA6Ly93d3cudzMub3JnLzIwMDAvc3ZnIj48cmVjdCB3aWR0aD0iMTAwJSIgaGVpZ2h0PSIxMDAlIiBmaWxsPSIjZjNmNGY2Ii8+PHRleHQgeD0iNTAlIiB5PSI1MCUiIGZvbnQtZmFtaWx5PSJBcmlhbCIgZm9udC1zaXplPSI0OCIgZmlsbD0iIzY4ZDM5MSIgdGV4dC1hbmNob3I9Im1pZGRsZSIgZHk9Ii4zZW0iPvCfjbE8L3RleHQ+PC9zdmc+"
          />
        ) : (
          <div className="w-full h-full flex items-center justify-center">
            <span className="text-6xl">🌱</span>
          </div>
        )}
        
        {/* Photo count badge */}
        {plant.photos.length > 0 && (
          <div className="absolute top-2 right-2 bg-black bg-opacity-60 text-white text-xs px-2 py-1 rounded">
            📸 {plant.photos.length}
          </div>
        )}
      </div>

      {/* Plant info */}
      <div className="p-4">
        <div className="flex justify-between items-start mb-2">
          <h3 
            className="font-semibold text-gray-900 cursor-pointer hover:text-green-600 transition-colors"
            onClick={onClick}
          >
            {plant.name}
          </h3>
          
          {/* Action menu */}
          <div className="flex space-x-1">
            <button
              onClick={onEdit}
              className="p-1 text-gray-400 hover:text-gray-600 transition-colors"
              title="Edit plant"
            >
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
              </svg>
            </button>
            <button
              onClick={onDelete}
              className="p-1 text-gray-400 hover:text-red-600 transition-colors"
              title="Delete plant"
            >
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
              </svg>
            </button>
          </div>
        </div>

        {/* Species */}
        {plant.species && (
          <p className="text-sm text-gray-600 mb-2 italic">{plant.species}</p>
        )}

        {/* Description */}
        <p className="text-sm text-gray-700 mb-3 line-clamp-2">
          {plant.description}
        </p>

        {/* Task status */}
        <div className="space-y-2">
          {overdueTasks.length > 0 && (
            <div className="flex items-center text-xs text-red-600 bg-red-50 px-2 py-1 rounded">
              <svg className="w-3 h-3 mr-1" fill="currentColor" viewBox="0 0 20 20">
                <path fillRule="evenodd" d="M8.257 3.099c.765-1.36 2.722-1.36 3.486 0l5.58 9.92c.75 1.334-.213 2.98-1.742 2.98H4.42c-1.53 0-2.493-1.646-1.743-2.98l5.58-9.92zM11 13a1 1 0 11-2 0 1 1 0 012 0zm-1-8a1 1 0 00-1 1v3a1 1 0 002 0V6a1 1 0 00-1-1z" clipRule="evenodd" />
              </svg>
              {overdueTasks.length} overdue task{overdueTasks.length !== 1 ? 's' : ''}
            </div>
          )}
          
          {upcomingTasks.length > 0 && (
            <div className="flex items-center text-xs text-blue-600 bg-blue-50 px-2 py-1 rounded">
              <svg className="w-3 h-3 mr-1" fill="currentColor" viewBox="0 0 20 20">
                <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm1-12a1 1 0 10-2 0v4a1 1 0 00.293.707l2.828 2.829a1 1 0 101.415-1.415L11 9.586V6z" clipRule="evenodd" />
              </svg>
              Next: {formatDistanceToNow(upcomingTasks[0].dueDate, { addSuffix: true })}
            </div>
          )}
          
          {plant.careTasks.length === 0 && (
            <div className="text-xs text-gray-500">
              No care tasks scheduled
            </div>
          )}
        </div>

        {/* Last updated */}
        <div className="mt-3 pt-3 border-t border-gray-100">
          <p className="text-xs text-gray-500">
            Updated {formatDistanceToNow(plant.updatedAt, { addSuffix: true })}
          </p>
        </div>
      </div>
    </div>
  );
}