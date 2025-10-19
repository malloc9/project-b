import { useState, useEffect } from 'react';
import type { Plant } from '../../types';
import { PlantService } from '../../services/plantService';
import { useAuth } from '../../contexts/AuthContext';
import { LoadingSpinner } from '../common/LoadingSpinner';
import { ErrorMessage } from '../common/ErrorMessage';
import { useTranslation } from '../../hooks/useTranslation';

interface PlantFormProps {
  plant?: Plant | null; // null for create, Plant for edit
  onSave?: (plant: Plant) => void;
  onCancel?: () => void;
}

interface FormData {
  name: string;
  species: string;
  description: string;
}

interface FormErrors {
  name?: string;
  description?: string;
  species?: string;
  general?: string;
}

export function PlantForm({ plant, onSave, onCancel }: PlantFormProps) {
  const { user } = useAuth();
  const { t } = useTranslation();
  const [formData, setFormData] = useState<FormData>({
    name: plant?.name || '',
    species: plant?.species || '',
    description: plant?.description || '',
  });
  const [errors, setErrors] = useState<FormErrors>({});
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isDirty, setIsDirty] = useState(false);

  const isEditing = !!plant;

  useEffect(() => {
    if (plant) {
      setFormData({
        name: plant.name,
        species: plant.species || '',
        description: plant.description,
      });
    }
  }, [plant]);

  const handleInputChange = (field: keyof FormData, value: string) => {
    setFormData(prev => ({ ...prev, [field]: value }));
    setIsDirty(true);
    
    // Clear field error when user starts typing
    if (errors[field]) {
      setErrors(prev => ({ ...prev, [field]: undefined }));
    }
  };

  const validateForm = (): boolean => {
    const newErrors: FormErrors = {};

    // Validate using PlantService validation
    const validation = PlantService.validatePlantData(formData);
    if (!validation.isValid) {
      validation.errors.forEach(error => {
        if (error.includes('name')) {
          newErrors.name = error;
        } else if (error.includes('description')) {
          newErrors.description = error;
        } else if (error.includes('species')) {
          newErrors.species = error;
        }
      });
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!user) {
      setErrors({ general: t('forms:messages.mustBeLoggedIn') });
      return;
    }

    if (!validateForm()) {
      return;
    }

    setIsSubmitting(true);
    setErrors({});

    try {
      if (isEditing && plant) {
        // Update existing plant
        await PlantService.updatePlant(user.uid, plant.id, {
          name: formData.name,
          species: formData.species || undefined,
          description: formData.description,
        });

        // Get updated plant data
        const updatedPlant = await PlantService.getPlant(user.uid, plant.id);
        if (updatedPlant) {
          onSave?.(updatedPlant);
        }
      } else {
        // Create new plant
        const plantId = await PlantService.createPlant({
          userId: user.uid,
          name: formData.name,
          species: formData.species || undefined,
          description: formData.description,
          photos: [],
          careTasks: [],
        });

        // Get the created plant data
        const newPlant = await PlantService.getPlant(user.uid, plantId);
        if (newPlant) {
          onSave?.(newPlant);
        }
      }

      setIsDirty(false);
    } catch (err) {
      console.error('Error saving plant:', err);
      setErrors({ 
        general: err instanceof Error ? err.message : t('forms:messages.failedToSavePlant') 
      });
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleCancel = () => {
    if (isDirty) {
      if (window.confirm(t('forms:messages.unsavedChanges'))) {
        onCancel?.();
      }
    } else {
      onCancel?.();
    }
  };

  return (
    <div className="bg-white border border-gray-200 rounded-lg p-6">
      <div className="mb-6">
        <h2 className="text-xl font-semibold text-gray-900">
          {isEditing ? t('forms:titles.editPlant') : t('forms:titles.addNewPlant')}
        </h2>
        <p className="mt-1 text-sm text-gray-600">
          {isEditing 
            ? t('forms:messages.updatePlantInfo')
            : t('forms:messages.addPlantInfo')
          }
        </p>
      </div>

      {errors.general && (
        <div className="mb-6">
          <ErrorMessage message={errors.general} />
        </div>
      )}

      <form onSubmit={handleSubmit} className="space-y-6">
        {/* Plant Name */}
        <div>
          <label htmlFor="plant-name" className="block text-sm font-medium text-gray-700 mb-1">
            {t('forms:labels.plantName')} *
          </label>
          <input
            id="plant-name"
            type="text"
            value={formData.name}
            onChange={(e) => handleInputChange('name', e.target.value)}
            placeholder={t('forms:placeholders.enterPlantName')}
            className={`block w-full px-3 py-2 border rounded-md shadow-sm focus:outline-none focus:ring-1 ${
              errors.name
                ? 'border-red-300 focus:ring-red-500 focus:border-red-500'
                : 'border-gray-300 focus:ring-green-500 focus:border-green-500'
            }`}
            disabled={isSubmitting}
          />
          {errors.name && (
            <p className="mt-1 text-sm text-red-600">{errors.name}</p>
          )}
        </div>

        {/* Species */}
        <div>
          <label htmlFor="plant-species" className="block text-sm font-medium text-gray-700 mb-1">
            {t('forms:labels.species')}
          </label>
          <input
            id="plant-species"
            type="text"
            value={formData.species}
            onChange={(e) => handleInputChange('species', e.target.value)}
            placeholder={t('forms:placeholders.enterSpecies') + ' (' + t('forms:placeholders.optional') + ')'}
            className={`block w-full px-3 py-2 border rounded-md shadow-sm focus:outline-none focus:ring-1 ${
              errors.species
                ? 'border-red-300 focus:ring-red-500 focus:border-red-500'
                : 'border-gray-300 focus:ring-green-500 focus:border-green-500'
            }`}
            disabled={isSubmitting}
          />
          {errors.species && (
            <p className="mt-1 text-sm text-red-600">{errors.species}</p>
          )}
          <p className="mt-1 text-xs text-gray-500">
            {t('forms:messages.speciesOptional')}
          </p>
        </div>

        {/* Description */}
        <div>
          <label htmlFor="plant-description" className="block text-sm font-medium text-gray-700 mb-1">
            {t('forms:labels.description')} *
          </label>
          <textarea
            id="plant-description"
            rows={4}
            value={formData.description}
            onChange={(e) => handleInputChange('description', e.target.value)}
            placeholder={t('forms:placeholders.enterDescription')}
            className={`block w-full px-3 py-2 border rounded-md shadow-sm focus:outline-none focus:ring-1 ${
              errors.description
                ? 'border-red-300 focus:ring-red-500 focus:border-red-500'
                : 'border-gray-300 focus:ring-green-500 focus:border-green-500'
            }`}
            disabled={isSubmitting}
          />
          {errors.description && (
            <p className="mt-1 text-sm text-red-600">{errors.description}</p>
          )}
          <p className="mt-1 text-xs text-gray-500">
            {t('forms:messages.describeYourPlant')}
          </p>
        </div>

        {/* Form Actions */}
        <div className="flex justify-end space-x-3 pt-6 border-t border-gray-200">
          <button
            type="button"
            onClick={handleCancel}
            className="px-4 py-2 border border-gray-300 rounded-md text-sm font-medium text-gray-700 bg-white hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-green-500 disabled:opacity-50 disabled:cursor-not-allowed"
            disabled={isSubmitting}
          >
            {t('forms:buttons.cancel')}
          </button>
          <button
            type="submit"
            className="inline-flex items-center px-4 py-2 border border-transparent rounded-md shadow-sm text-sm font-medium text-white bg-green-600 hover:bg-green-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-green-500 disabled:opacity-50 disabled:cursor-not-allowed"
            disabled={isSubmitting}
          >
            {isSubmitting && <LoadingSpinner size="sm" className="mr-2" />}
            {isSubmitting 
              ? (isEditing ? t('forms:messages.updating') : t('forms:messages.creating')) 
              : (isEditing ? t('forms:titles.updatePlant') : t('forms:titles.createPlant'))
            }
          </button>
        </div>
      </form>
    </div>
  );
}