import { useState, useEffect } from 'react';
import type { PlantCareTask, RecurrencePattern } from '../../types';
import { LoadingSpinner } from '../common/LoadingSpinner';
import { format } from 'date-fns';

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
  dueDate?: string;
  recurrence?: string;
}

export function CareTaskForm({ task, onSave, onCancel, isLoading }: CareTaskFormProps) {
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
      newErrors.title = 'Task title is required';
    } else if (formData.title.length > 100) {
      newErrors.title = 'Title must be less than 100 characters';
    }

    if (!formData.dueDate) {
      newErrors.dueDate = 'Due date is required';
    } else {
      const dueDate = new Date(formData.dueDate);
      if (isNaN(dueDate.getTime())) {
        newErrors.dueDate = 'Invalid due date';
      }
    }

    if (hasRecurrence) {
      if (recurrenceData.interval < 1 || recurrenceData.interval > 365) {
        newErrors.recurrence = 'Interval must be between 1 and 365';
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
      description: formData.description.trim() || undefined,
      dueDate: new Date(formData.dueDate),
      completed: formData.completed,
      recurrence: hasRecurrence ? recurrenceData : undefined,
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
      if (window.confirm('You have unsaved changes. Are you sure you want to cancel?')) {
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
              {isEditing ? 'Edit Care Task' : 'Add Care Task'}
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
                Task Title *
              </label>
              <input
                id="task-title"
                type="text"
                value={formData.title}
                onChange={(e) => handleInputChange('title', e.target.value)}
                placeholder="e.g., Water plant, Fertilize, Repot"
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
                Description
              </label>
              <textarea
                id="task-description"
                rows={3}
                value={formData.description}
                onChange={(e) => handleInputChange('description', e.target.value)}
                placeholder="Optional: Add details about this care task..."
                className="block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-1 focus:ring-green-500 focus:border-green-500"
                disabled={isLoading}
              />
            </div>

            {/* Due Date */}
            <div>
              <label htmlFor="task-due-date" className="block text-sm font-medium text-gray-700 mb-1">
                Due Date *
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
                  <span className="ml-2 text-sm text-gray-700">Mark as completed</span>
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
                <span className="ml-2 text-sm font-medium text-gray-700">Repeat this task</span>
              </label>

              {hasRecurrence && (
                <div className="ml-6 space-y-4 p-4 bg-gray-50 rounded-lg">
                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <label htmlFor="recurrence-interval" className="block text-sm font-medium text-gray-700 mb-1">
                        Every
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
                        Period
                      </label>
                      <select
                        id="recurrence-type"
                        value={recurrenceData.type}
                        onChange={(e) => handleRecurrenceChange('type', e.target.value as RecurrencePattern['type'])}
                        className="block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-1 focus:ring-green-500 focus:border-green-500"
                        disabled={isLoading}
                      >
                        <option value="daily">Day(s)</option>
                        <option value="weekly">Week(s)</option>
                        <option value="monthly">Month(s)</option>
                        <option value="yearly">Year(s)</option>
                      </select>
                    </div>
                  </div>

                  <div>
                    <label htmlFor="recurrence-end-date" className="block text-sm font-medium text-gray-700 mb-1">
                      End Date (optional)
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
                      Leave empty to repeat indefinitely
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
                Cancel
              </button>
              <button
                type="submit"
                disabled={isLoading}
                className="inline-flex items-center px-4 py-2 border border-transparent rounded-md shadow-sm text-sm font-medium text-white bg-green-600 hover:bg-green-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-green-500 disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {isLoading && <LoadingSpinner size="sm" className="mr-2" />}
                {isLoading 
                  ? (isEditing ? 'Updating...' : 'Creating...') 
                  : (isEditing ? 'Update Task' : 'Create Task')
                }
              </button>
            </div>
          </form>
        </div>
      </div>
    </div>
  );
}