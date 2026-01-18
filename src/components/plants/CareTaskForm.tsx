import { useState, useEffect } from 'react';
import type { PlantCareTask, RecurrencePattern } from '../../types';
import { LoadingSpinner } from '../common/LoadingSpinner';
import { RichTextEditor } from '../common/RichTextEditor';
import { format } from 'date-fns';
import { useTranslation } from '../../hooks/useTranslation';

interface CareTaskFormProps {
  task?: PlantCareTask | null;
  onSave: (taskData: Omit<PlantCareTask, 'id' | 'plantId'>) => Promise<void>;
  onCancel: () => void;
  isLoading: boolean;
}

interface FormData {
  title: string;
  description: string;
  dueDate: string; // ISO date string for input
  completed: boolean;
  recurrence?: RecurrencePattern;
}

interface FormErrors {
  title?: string;
  description?: string;
  dueDate?: string;
  completed?: string;
  recurrence?: string;
}

export function CareTaskForm({ task, onSave, onCancel, isLoading }: CareTaskFormProps) {
  const { t } = useTranslation();
  const [formData, setFormData] = useState<FormData>({
    title: '',
    description: '',
    dueDate: format(new Date(), 'yyyy-MM-dd'),
    completed: false,
  });
  const [hasRecurrence, setHasRecurrence] = useState(false);
  const [recurrenceData, setRecurrenceData] = useState<RecurrencePattern>({
    type: 'weekly',
    interval: 1,
  });
  const [errors, setErrors] = useState<FormErrors>({});
  const [isDirty, setIsDirty] = useState(false);

  const isEditing = !!task;

  useEffect(() => {
    if (task) {
      setFormData({
        title: task.title,
        description: task.description || '',
        dueDate: format(task.dueDate, 'yyyy-MM-dd'),
        completed: task.completed,
      });
      
      if (task.recurrence) {
        setHasRecurrence(true);
        setRecurrenceData(task.recurrence);
      }
    }
  }, [task]);

  const handleInputChange = (field: keyof FormData, value: string | boolean) => {
    setFormData(prev => ({ ...prev, [field]: value }));
    setIsDirty(true);
    
    // Clear field error when user starts typing
    if (errors[field]) {
      setErrors(prev => ({ ...prev, [field]: undefined }));
    }
  };

  const handleRecurrenceChange = (field: keyof RecurrencePattern, value: any) => {
    setRecurrenceData(prev => ({ ...prev, [field]: value }));
    setIsDirty(true);
  };

  const validateForm = (): boolean => {
    const newErrors: FormErrors = {};

    if (!formData.title.trim()) {
      newErrors.title = t('forms:validation.taskTitleRequired');
    } else if (formData.title.length > 100) {
      newErrors.title = t('forms:validation.titleTooLong', { max: 100 });
    }

    if (!formData.dueDate) {
      newErrors.dueDate = t('forms:validation.dueDateRequired');
    } else {
      const dueDate = new Date(formData.dueDate);
      if (isNaN(dueDate.getTime())) {
        newErrors.dueDate = t('forms:validation.invalidDueDate');
      }
    }

    if (hasRecurrence) {
      if (recurrenceData.interval < 1 || recurrenceData.interval > 365) {
        newErrors.recurrence = t('forms:validation.intervalRange', { min: 1, max: 365 });
      }
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!validateForm()) {
      return;
    }

    const taskData: Omit<PlantCareTask, 'id' | 'plantId'> = {
      title: formData.title.trim(),
      description: formData.description || undefined,
      dueDate: new Date(formData.dueDate),
      completed: formData.completed,
      recurrence: hasRecurrence ? recurrenceData : undefined,
      createdAt: new Date(),
      updatedAt: new Date(),
    };

    try {
      await onSave(taskData);
      setIsDirty(false);
    } catch (error) {
      // Error handling is done in the parent component
    }
  };

  const handleCancel = () => {
    if (isDirty) {
      if (window.confirm(t('forms:messages.unsavedChanges'))) {
        onCancel();
      }
    } else {
      onCancel();
    }
  };

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
      <div className="bg-white rounded-lg max-w-2xl w-full max-h-[90vh] overflow-y-auto">
        <div className="p-6">
          <div className="flex justify-between items-center mb-6">
            <h2 className="text-xl font-semibold text-gray-900">
              {isEditing ? t('forms:titles.editCareTask') : t('forms:titles.addCareTask')}
            </h2>
            <button
              onClick={handleCancel}
              disabled={isLoading}
              className="text-gray-400 hover:text-gray-600 transition-colors disabled:cursor-not-allowed"
            >
              <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
              </svg>
            </button>
          </div>

          <form onSubmit={handleSubmit} className="space-y-6">
            {/* Task Title */}
            <div>
              <label htmlFor="task-title" className="block text-sm font-medium text-gray-700 mb-1">
                {t('forms:labels.taskTitle')} *
              </label>
              <input
                id="task-title"
                type="text"
                value={formData.title}
                onChange={(e) => handleInputChange('title', e.target.value)}
                placeholder={t('forms:placeholders.careTaskExample')}
                className={`block w-full px-3 py-2 border rounded-md shadow-sm focus:outline-none focus:ring-1 ${
                  errors.title
                    ? 'border-red-300 focus:ring-red-500 focus:border-red-500'
                    : 'border-gray-300 focus:ring-green-500 focus:border-green-500'
                }`}
                disabled={isLoading}
              />
              {errors.title && (
                <p className="mt-1 text-sm text-red-600">{errors.title}</p>
              )}
            </div>

            {/* Description */}
            <div>
              <label htmlFor="task-description" className="block text-sm font-medium text-gray-700 mb-1">
                {t('forms:labels.description')}
              </label>
              <RichTextEditor
                value={formData.description}
                onChange={(value) => handleInputChange('description', value)}
                placeholder={t('forms:placeholders.careTaskDescription')}
                disabled={isLoading}
                minHeight="150px"
              />
            </div>

            {/* Due Date */}
            <div>
              <label htmlFor="task-due-date" className="block text-sm font-medium text-gray-700 mb-1">
                {t('forms:labels.dueDate')} *
              </label>
              <input
                id="task-due-date"
                type="date"
                value={formData.dueDate}
                onChange={(e) => handleInputChange('dueDate', e.target.value)}
                className={`block w-full px-3 py-2 border rounded-md shadow-sm focus:outline-none focus:ring-1 ${
                  errors.dueDate
                    ? 'border-red-300 focus:ring-red-500 focus:border-red-500'
                    : 'border-gray-300 focus:ring-green-500 focus:border-green-500'
                }`}
                disabled={isLoading}
              />
              {errors.dueDate && (
                <p className="mt-1 text-sm text-red-600">{errors.dueDate}</p>
              )}
            </div>

            {/* Completed Status (only for editing) */}
            {isEditing && (
              <div>
                <label className="flex items-center">
                  <input
                    type="checkbox"
                    checked={formData.completed}
                    onChange={(e) => handleInputChange('completed', e.target.checked)}
                    className="rounded border-gray-300 text-green-600 shadow-sm focus:border-green-300 focus:ring focus:ring-green-200 focus:ring-opacity-50"
                    disabled={isLoading}
                  />
                  <span className="ml-2 text-sm text-gray-700">{t('forms:labels.markAsCompleted')}</span>
                </label>
              </div>
            )}

            {/* Recurrence */}
            <div>
              <label className="flex items-center mb-3">
                <input
                  type="checkbox"
                  checked={hasRecurrence}
                  onChange={(e) => setHasRecurrence(e.target.checked)}
                  className="rounded border-gray-300 text-green-600 shadow-sm focus:border-green-300 focus:ring focus:ring-green-200 focus:ring-opacity-50"
                  disabled={isLoading}
                />
                <span className="ml-2 text-sm font-medium text-gray-700">{t('forms:labels.repeatThisTask')}</span>
              </label>

              {hasRecurrence && (
                <div className="ml-6 space-y-4 p-4 bg-gray-50 rounded-lg">
                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <label htmlFor="recurrence-interval" className="block text-sm font-medium text-gray-700 mb-1">
                        {t('forms:labels.every')}
                      </label>
                      <input
                        id="recurrence-interval"
                        type="number"
                        min="1"
                        max="365"
                        value={recurrenceData.interval}
                        onChange={(e) => handleRecurrenceChange('interval', parseInt(e.target.value) || 1)}
                        className="block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-1 focus:ring-green-500 focus:border-green-500"
                        disabled={isLoading}
                      />
                    </div>

                    <div>
                      <label htmlFor="recurrence-type" className="block text-sm font-medium text-gray-700 mb-1">
                        {t('forms:labels.period')}
                      </label>
                      <select
                        id="recurrence-type"
                        value={recurrenceData.type}
                        onChange={(e) => handleRecurrenceChange('type', e.target.value as RecurrencePattern['type'])}
                        className="block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-1 focus:ring-green-500 focus:border-green-500"
                        disabled={isLoading}
                      >
                        <option value="daily">{t('forms:recurrence.days')}</option>
                        <option value="weekly">{t('forms:recurrence.weeks')}</option>
                        <option value="monthly">{t('forms:recurrence.months')}</option>
                        <option value="yearly">{t('forms:recurrence.years')}</option>
                      </select>
                    </div>
                  </div>

                  <div>
                    <label htmlFor="recurrence-end-date" className="block text-sm font-medium text-gray-700 mb-1">
                      {t('forms:labels.endDate')}
                    </label>
                    <input
                      id="recurrence-end-date"
                      type="date"
                      value={recurrenceData.endDate ? format(recurrenceData.endDate, 'yyyy-MM-dd') : ''}
                      onChange={(e) => handleRecurrenceChange('endDate', e.target.value ? new Date(e.target.value) : undefined)}
                      className="block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-1 focus:ring-green-500 focus:border-green-500"
                      disabled={isLoading}
                    />
                    <p className="mt-1 text-xs text-gray-500">
                      {t('forms:messages.leaveEmptyToRepeat')}
                    </p>
                  </div>

                  {errors.recurrence && (
                    <p className="text-sm text-red-600">{errors.recurrence}</p>
                  )}
                </div>
              )}
            </div>

            {/* Actions */}
            <div className="flex justify-end space-x-3 pt-6 border-t border-gray-200">
              <button
                type="button"
                onClick={handleCancel}
                disabled={isLoading}
                className="px-4 py-2 border border-gray-300 rounded-md text-sm font-medium text-gray-700 bg-white hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-green-500 disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {t('forms:buttons.cancel')}
              </button>
              <button
                type="submit"
                disabled={isLoading}
                className="inline-flex items-center px-4 py-2 border border-transparent rounded-md shadow-sm text-sm font-medium text-white bg-green-600 hover:bg-green-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-green-500 disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {isLoading && <LoadingSpinner size="sm" className="mr-2" />}
                {isLoading 
                  ? (isEditing ? t('forms:messages.updating') : t('forms:messages.creating')) 
                  : (isEditing ? t('forms:titles.updateTask') : t('forms:titles.createTask'))
                }
              </button>
            </div>
          </form>
        </div>
      </div>
    </div>
  );
}