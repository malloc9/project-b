import { useState, useRef } from 'react';
import type { PlantPhoto } from '../../types';
import { PlantService } from '../../services/plantService';
import { useAuth } from '../../contexts/AuthContext';
import { PhotoUploadModal } from './PhotoUploadModal';
import { PhotoViewer } from './PhotoViewer';
import { LoadingSpinner } from '../common/LoadingSpinner';
import { ErrorMessage } from '../common/ErrorMessage';
import { format, formatDistanceToNow } from 'date-fns';
import { useTranslation } from 'react-i18next';

interface PhotoTimelineProps {
  plantId: string;
  photos: PlantPhoto[];
  onPhotosChange?: (photos: PlantPhoto[]) => void;
}

export function PhotoTimeline({ plantId, photos, onPhotosChange }: PhotoTimelineProps) {
  const { user } = useAuth();
  const { t } = useTranslation(['loading', 'common', 'accessibility']);
  const [showUploadModal, setShowUploadModal] = useState(false);
  const [selectedPhoto, setSelectedPhoto] = useState<PlantPhoto | null>(null);
  const [isUploading, setIsUploading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleFileSelect = () => {
    fileInputRef.current?.click();
  };

  const handleFileChange = (event: React.ChangeEvent<HTMLInputElement>) => {
    const files = event.target.files;
    if (files && files.length > 0) {
      const file = files[0];
      handlePhotoUpload(file);
    }
  };

  const handlePhotoUpload = async (file: File, description?: string) => {
    if (!user) {
      setError('You must be logged in to upload photos');
      return;
    }

    // Validate file type
    if (!file.type.startsWith('image/')) {
      setError('Please select a valid image file');
      return;
    }

    // Validate file size (max 10MB)
    const maxSize = 10 * 1024 * 1024; // 10MB
    if (file.size > maxSize) {
      setError('File size must be less than 10MB');
      return;
    }

    setIsUploading(true);
    setError(null);

    try {
      const newPhoto = await PlantService.addPhotoToPlant(user.uid, plantId, file, description);
      
      // Update the photos list
      const updatedPhotos = [...photos, newPhoto];
      onPhotosChange?.(updatedPhotos);
      
      setShowUploadModal(false);
    } catch (err) {
      console.error('Error uploading photo:', err);
      setError(err instanceof Error ? err.message : 'Failed to upload photo');
    } finally {
      setIsUploading(false);
    }
  };

  const handlePhotoDelete = async (photoId: string) => {
    if (!user) return;

    if (window.confirm('Are you sure you want to delete this photo? This action cannot be undone.')) {
      try {
        await PlantService.removePhotoFromPlant(user.uid, plantId, photoId);
        
        // Update the photos list
        const updatedPhotos = photos.filter(photo => photo.id !== photoId);
        onPhotosChange?.(updatedPhotos);
        
        // Close photo viewer if the deleted photo was selected
        if (selectedPhoto?.id === photoId) {
          setSelectedPhoto(null);
        }
      } catch (err) {
        console.error('Error deleting photo:', err);
        setError(err instanceof Error ? err.message : 'Failed to delete photo');
      }
    }
  };

  const sortedPhotos = photos.sort((a, b) => b.uploadedAt.getTime() - a.uploadedAt.getTime());

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <h3 className="text-lg font-medium text-gray-900">Photo Timeline</h3>
        <div className="flex space-x-2">
          <button
            onClick={handleFileSelect}
            disabled={isUploading}
            className="bg-green-600 hover:bg-green-700 disabled:bg-green-400 text-white px-4 py-2 rounded-md text-sm font-medium transition-colors focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-green-500 disabled:cursor-not-allowed"
          >
            {isUploading ? (
              <>
                <LoadingSpinner size="sm" className="mr-2" />
                {t('loading:processing', { defaultValue: 'Uploading...' })}
              </>
            ) : (
              'Quick Upload'
            )}
          </button>
          <button
            onClick={() => setShowUploadModal(true)}
            disabled={isUploading}
            className="bg-blue-600 hover:bg-blue-700 disabled:bg-blue-400 text-white px-4 py-2 rounded-md text-sm font-medium transition-colors focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 disabled:cursor-not-allowed"
          >
            Upload with Details
          </button>
        </div>
      </div>

      {/* Hidden file input for quick upload */}
      <input
        ref={fileInputRef}
        type="file"
        accept="image/*"
        onChange={handleFileChange}
        className="hidden"
      />

      {error && (
        <ErrorMessage 
          message={error} 
          onRetry={() => setError(null)}
        />
      )}

      {photos.length === 0 ? (
        <div className="text-center py-12 border-2 border-dashed border-gray-300 rounded-lg">
          <span className="text-6xl mb-4 block">📸</span>
          <h3 className="text-lg font-medium text-gray-900 mb-2">
            No photos yet
          </h3>
          <p className="text-gray-600 mb-4">
            Upload photos to track your plant's growth over time
          </p>
          <button
            onClick={() => setShowUploadModal(true)}
            className="bg-green-600 hover:bg-green-700 text-white px-4 py-2 rounded-md text-sm font-medium transition-colors"
          >
            Upload First Photo
          </button>
        </div>
      ) : (
        <div className="space-y-4">
          {/* Photo grid for recent photos */}
          <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-6 gap-4">
            {sortedPhotos.slice(0, 12).map((photo) => (
              <div
                key={photo.id}
                className="relative group cursor-pointer"
                onClick={() => setSelectedPhoto(photo)}
              >
                <div className="aspect-square bg-gray-100 rounded-lg overflow-hidden">
                  <img
                    src={photo.thumbnailUrl || photo.url}
                    alt={photo.description || 'Plant photo'}
                    className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-200"
                  />
                </div>
                
                {/* Photo overlay */}
                <div className="absolute inset-0 bg-black bg-opacity-0 group-hover:bg-opacity-20 transition-opacity duration-200 rounded-lg flex items-center justify-center">
                  <div className="opacity-0 group-hover:opacity-100 transition-opacity duration-200">
                    <svg className="w-8 h-8 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z" />
                    </svg>
                  </div>
                </div>

                {/* Date badge */}
                <div className="absolute bottom-2 left-2 bg-black bg-opacity-60 text-white text-xs px-2 py-1 rounded">
                  {format(photo.uploadedAt, 'MMM d')}
                </div>
              </div>
            ))}
          </div>

          {/* Show more button if there are more photos */}
          {photos.length > 12 && (
            <div className="text-center">
              <button className="text-green-600 hover:text-green-700 font-medium text-sm">
                View all {photos.length} photos
              </button>
            </div>
          )}

          {/* Timeline view for detailed photos */}
          <div className="space-y-6 mt-8">
            <h4 className="text-md font-medium text-gray-900">Detailed Timeline</h4>
            {sortedPhotos.map((photo) => (
              <div key={`timeline-${photo.id}`} className="bg-white border border-gray-200 rounded-lg p-4">
                <div className="flex items-start space-x-4">
                  <div 
                    className="w-32 h-32 bg-gray-100 rounded-lg overflow-hidden flex-shrink-0 cursor-pointer"
                    onClick={() => setSelectedPhoto(photo)}
                  >
                    <img
                      src={photo.thumbnailUrl || photo.url}
                      alt={photo.description || 'Plant photo'}
                      className="w-full h-full object-cover hover:scale-105 transition-transform duration-200"
                    />
                  </div>
                  
                  <div className="flex-1">
                    <div className="flex justify-between items-start mb-2">
                      <div>
                        <p className="text-sm font-medium text-gray-900">
                          {format(photo.uploadedAt, 'MMMM d, yyyy')}
                        </p>
                        <p className="text-xs text-gray-500">
                          {formatDistanceToNow(photo.uploadedAt, { addSuffix: true })}
                        </p>
                      </div>
                      
                      <button
                        onClick={() => handlePhotoDelete(photo.id)}
                        className="text-gray-400 hover:text-red-600 transition-colors p-1"
                        title={t('deletePhoto')}
                      >
                        <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                        </svg>
                      </button>
                    </div>
                    
                    {photo.description ? (
                      <p className="text-gray-700 text-sm">{photo.description}</p>
                    ) : (
                      <p className="text-gray-500 text-sm italic">No description</p>
                    )}
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Photo Upload Modal */}
      {showUploadModal && (
        <PhotoUploadModal
          onUpload={handlePhotoUpload}
          onClose={() => setShowUploadModal(false)}
          isUploading={isUploading}
        />
      )}

      {/* Photo Viewer Modal */}
      {selectedPhoto && (
        <PhotoViewer
          photo={selectedPhoto}
          photos={sortedPhotos}
          onClose={() => setSelectedPhoto(null)}
          onDelete={handlePhotoDelete}
          onNavigate={setSelectedPhoto}
        />
      )}
    </div>
  );
}