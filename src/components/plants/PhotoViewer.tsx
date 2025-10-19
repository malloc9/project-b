import { useState, useEffect } from 'react';
import type { PlantPhoto } from '../../types';
import { format, formatDistanceToNow } from 'date-fns';
import { useTranslation } from 'react-i18next';

interface PhotoViewerProps {
  photo: PlantPhoto;
  photos: PlantPhoto[];
  onClose: () => void;
  onDelete: (photoId: string) => void;
  onNavigate: (photo: PlantPhoto) => void;
}

export function PhotoViewer({ photo, photos, onClose, onDelete, onNavigate }: PhotoViewerProps) {
  const { t } = useTranslation('accessibility');
  const [currentIndex, setCurrentIndex] = useState(0);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    const index = photos.findIndex(p => p.id === photo.id);
    setCurrentIndex(index);
  }, [photo, photos]);

  const handlePrevious = () => {
    if (currentIndex > 0) {
      const prevPhoto = photos[currentIndex - 1];
      onNavigate(prevPhoto);
    }
  };

  const handleNext = () => {
    if (currentIndex < photos.length - 1) {
      const nextPhoto = photos[currentIndex + 1];
      onNavigate(nextPhoto);
    }
  };

  const handleKeyDown = (e: KeyboardEvent) => {
    switch (e.key) {
      case 'Escape':
        onClose();
        break;
      case 'ArrowLeft':
        handlePrevious();
        break;
      case 'ArrowRight':
        handleNext();
        break;
    }
  };

  useEffect(() => {
    document.addEventListener('keydown', handleKeyDown);
    return () => document.removeEventListener('keydown', handleKeyDown);
  }, [currentIndex, photos.length]);

  const handleDelete = () => {
    if (window.confirm(t('deletePhotoConfirm', { defaultValue: 'Are you sure you want to delete this photo? This action cannot be undone.' }))) {
      onDelete(photo.id);
    }
  };

  const handleImageLoad = () => {
    setIsLoading(false);
  };

  return (
    <div className="fixed inset-0 bg-black bg-opacity-90 flex items-center justify-center z-50">
      {/* Header */}
      <div className="absolute top-0 left-0 right-0 bg-black bg-opacity-50 text-white p-4 z-10">
        <div className="flex justify-between items-center">
          <div>
            <h3 className="text-lg font-medium">
              {format(photo.uploadedAt, 'MMMM d, yyyy')}
            </h3>
            <p className="text-sm text-gray-300">
              {formatDistanceToNow(photo.uploadedAt, { addSuffix: true })} • 
              Photo {currentIndex + 1} of {photos.length}
            </p>
          </div>
          
          <div className="flex items-center space-x-2">
            <button
              onClick={handleDelete}
              className="p-2 text-gray-300 hover:text-red-400 transition-colors"
              title={t('deletePhoto')}
            >
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
              </svg>
            </button>
            <button
              onClick={onClose}
              className="p-2 text-gray-300 hover:text-white transition-colors"
              title={t('closeEsc')}
            >
              <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
              </svg>
            </button>
          </div>
        </div>
      </div>

      {/* Navigation buttons */}
      {currentIndex > 0 && (
        <button
          onClick={handlePrevious}
          className="absolute left-4 top-1/2 transform -translate-y-1/2 bg-black bg-opacity-50 text-white p-3 rounded-full hover:bg-opacity-70 transition-colors z-10"
          title={t('previousPhoto')}
        >
          <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
          </svg>
        </button>
      )}

      {currentIndex < photos.length - 1 && (
        <button
          onClick={handleNext}
          className="absolute right-4 top-1/2 transform -translate-y-1/2 bg-black bg-opacity-50 text-white p-3 rounded-full hover:bg-opacity-70 transition-colors z-10"
          title={t('nextPhoto')}
        >
          <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
          </svg>
        </button>
      )}

      {/* Main image */}
      <div className="relative max-w-full max-h-full p-16">
        {isLoading && (
          <div className="absolute inset-0 flex items-center justify-center">
            <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-white"></div>
          </div>
        )}
        
        <img
          src={photo.url}
          alt={photo.description || 'Plant photo'}
          className="max-w-full max-h-full object-contain"
          onLoad={handleImageLoad}
          style={{ display: isLoading ? 'none' : 'block' }}
        />
      </div>

      {/* Description */}
      {photo.description && (
        <div className="absolute bottom-0 left-0 right-0 bg-black bg-opacity-50 text-white p-4">
          <p className="text-center">{photo.description}</p>
        </div>
      )}

      {/* Thumbnail strip */}
      {photos.length > 1 && (
        <div className="absolute bottom-4 left-1/2 transform -translate-x-1/2 bg-black bg-opacity-50 rounded-lg p-2">
          <div className="flex space-x-2 max-w-md overflow-x-auto">
            {photos.map((p, _index) => (
              <button
                key={p.id}
                onClick={() => onNavigate(p)}
                className={`flex-shrink-0 w-12 h-12 rounded overflow-hidden border-2 transition-colors ${
                  p.id === photo.id
                    ? 'border-white'
                    : 'border-transparent hover:border-gray-300'
                }`}
              >
                <img
                  src={p.thumbnailUrl || p.url}
                  alt=""
                  className="w-full h-full object-cover"
                />
              </button>
            ))}
          </div>
        </div>
      )}

      {/* Click outside to close */}
      <div
        className="absolute inset-0 -z-10"
        onClick={onClose}
      />
    </div>
  );
}