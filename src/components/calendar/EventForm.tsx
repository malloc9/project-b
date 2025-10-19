import React, { useState, useEffect } from 'react';
import { XMarkIcon, PlusIcon, TrashIcon } from '@heroicons/react/24/outline';
import { useTranslation } from '../../hooks/useTranslation';
import type { CalendarEvent, CreateCalendarEventData, NotificationSettings } from '../../types';
import { createEvent, updateEvent, validateEventData } from '../../services/calendarService';
import { useAuth } from '../../contexts/AuthContext';

interface EventFormProps {
  event?: CalendarEvent | null;
  isOpen: boolean;
  onClose: () => void;
  onEventSaved?: () => void;
  initialDate?: Date;
}

interface FormData {
  title: string;
  description: string;
  startDate: string;
  startTime: string;
  endDate: string;
  endTime: string;
  allDay: boolean;
  notifications: NotificationSettings[];
}

export function EventForm({ 
  event, 
  isOpen, 
  onClose, 
  onEventSaved,
  initialDate 
}: EventFormProps) {
  const { t } = useTranslation();
  const { user } = useAuth();
  const [formData, setFormData] = useState<FormData>({
    title: '',
    description: '',
    startDate: '',
    startTime: '09:00',
    endDate: '',
    endTime: '10:00',
    allDay: false,
    notifications: []
  });
  const [errors, setErrors] = useState<Record<string, string[]>>({});
  const [isSubmitting, setIsSubmitting] = useState(false);

  // Initialize form data when modal opens or event changes
  useEffect(() => {
    if (isOpen) {
      if (event) {
        // Editing existing event
        const startDate = new Date(event.startDate);
        const endDate = new Date(event.endDate);
        
        setFormData({
          title: event.title,
          description: event.description || '',
          startDate: startDate.toISOString().split('T')[0],
          startTime: event.allDay ? '09:00' : startDate.toTimeString().slice(0, 5),
          endDate: endDate.toISOString().split('T')[0],
          endTime: event.allDay ? '10:00' : endDate.toTimeString().slice(0, 5),
          allDay: event.allDay,
          notifications: event.notifications || []
        });
      } else {
        // Creating new event
        const defaultDate = initialDate || new Date();
        const dateStr = defaultDate.toISOString().split('T')[0];
        
        setFormData({
          title: '',
          description: '',
          startDate: dateStr,
          startTime: '09:00',
          endDate: dateStr,
          endTime: '10:00',
          allDay: false,
          notifications: []
        });
      }
      setErrors({});
    }
  }, [isOpen, event, initialDate]);

  const handleInputChange = (field: keyof FormData, value: string | boolean) => {
    setFormData(prev => ({
      ...prev,
      [field]: value
    }));
    
    // Clear errors for this field
    if (errors[field]) {
      setErrors(prev => ({
        ...prev,
        [field]: []
      }));
    }
  };

  const addNotification = () => {
    const newNotification: NotificationSettings = {
      id: Date.now().toString(),
      type: 'in_app',
      timing: 15, // 15 minutes before
      enabled: true
    };
    
    setFormData(prev => ({
      ...prev,
      notifications: [...prev.notifications, newNotification]
    }));
  };

  const updateNotification = (index: number, field: keyof NotificationSettings, value: any) => {
    setFormData(prev => ({
      ...prev,
      notifications: prev.notifications.map((notification, i) => 
        i === index ? { ...notification, [field]: value } : notification
      )
    }));
  };

  const removeNotification = (index: number) => {
    setFormData(prev => ({
      ...prev,
      notifications: prev.notifications.filter((_, i) => i !== index)
    }));
  };

  const validateForm = (): boolean => {
    const newErrors: Record<string, string[]> = {};

    // Title validation
    if (!formData.title.trim()) {
      newErrors.title = ['Title is required'];
    }

    // Date validation
    if (!formData.startDate) {
      newErrors.startDate = ['Start date is required'];
    }
    
    if (!formData.endDate) {
      newErrors.endDate = ['End date is required'];
    }

    // Date logic validation
    if (formData.startDate && formData.endDate) {
      const startDateTime = new Date(`${formData.startDate}T${formData.allDay ? '00:00' : formData.startTime}`);
      const endDateTime = new Date(`${formData.endDate}T${formData.allDay ? '23:59' : formData.endTime}`);
      
      if (startDateTime >= endDateTime) {
        newErrors.endDate = ['End date/time must be after start date/time'];
      }
    }

    // Notification validation
    formData.notifications.forEach((notification, index) => {
      if (notification.timing < 0) {
        newErrors[`notification_${index}`] = ['Notification timing must be positive'];
      }
    });

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!user || !validateForm()) return;

    setIsSubmitting(true);

    try {
      // Prepare event data
      const startDateTime = new Date(`${formData.startDate}T${formData.allDay ? '00:00' : formData.startTime}`);
      const endDateTime = new Date(`${formData.endDate}T${formData.allDay ? '23:59' : formData.endTime}`);

      const eventData: CreateCalendarEventData = {
        userId: user.uid,
        title: formData.title.trim(),
        description: formData.description.trim() || undefined,
        startDate: startDateTime,
        endDate: endDateTime,
        allDay: formData.allDay,
        type: 'custom',
        status: 'pending',
        notifications: formData.notifications
      };

      // Validate with service layer
      const validationErrors = validateEventData(eventData);
      if (validationErrors.length > 0) {
        setErrors({ form: validationErrors });
        return;
      }

      if (event) {
        // Update existing event
        await updateEvent(user.uid, event.id, eventData);
      } else {
        // Create new event
        await createEvent(user.uid, eventData);
      }

      onEventSaved?.();
      onClose();
    } catch (err) {
      console.error('Error saving event:', err);
      setErrors({ form: [t('forms:messages.failedToSaveEvent')] });
    } finally {
      setIsSubmitting(false);
    }
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
      <div className="bg-white rounded-lg shadow-xl max-w-md w-full max-h-[90vh] overflow-y-auto">
        {/* Header */}
        <div className="flex items-center justify-between p-6 border-b">
          <h2 className="text-lg font-semibold text-gray-900">
            {event ? t('forms:titles.editEvent') : t('forms:titles.createEvent')}
          </h2>
          <button
            onClick={onClose}
            className="p-2 hover:bg-gray-100 rounded-full transition-colors"
            aria-label={t('accessibility:close')}
          >
            <XMarkIcon className="h-5 w-5 text-gray-500" />
          </button>
        </div>

        {/* Form */}
        <form onSubmit={handleSubmit} className="p-6 space-y-4">
          {/* Form-level errors */}
          {errors.form && (
            <div className="bg-red-50 border border-red-200 rounded-md p-3">
              <ul className="text-sm text-red-800 space-y-1">
                {errors.form.map((error, index) => (
                  <li key={index}>{error}</li>
                ))}
              </ul>
            </div>
          )}

          {/* Title */}
          <div>
            <label htmlFor="title" className="block text-sm font-medium text-gray-700 mb-1">
              {t('forms:labels.title')} *
            </label>
            <input
              type="text"
              id="title"
              value={formData.title}
              onChange={(e) => handleInputChange('title', e.target.value)}
              className={`
                w-full px-3 py-2 border rounded-md shadow-sm focus:outline-none focus:ring-1 focus:ring-blue-500 focus:border-blue-500
                ${errors.title ? 'border-red-300' : 'border-gray-300'}
              `}
              placeholder={t('forms:placeholders.enterEventTitle')}
            />
            {errors.title && (
              <p className="mt-1 text-sm text-red-600">{errors.title[0]}</p>
            )}
          </div>

          {/* Description */}
          <div>
            <label htmlFor="description" className="block text-sm font-medium text-gray-700 mb-1">
              {t('forms:labels.description')}
            </label>
            <textarea
              id="description"
              rows={3}
              value={formData.description}
              onChange={(e) => handleInputChange('description', e.target.value)}
              className="w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-1 focus:ring-blue-500 focus:border-blue-500"
              placeholder={t('forms:placeholders.enterEventDescription')}
            />
          </div>

          {/* All Day Toggle */}
          <div className="flex items-center">
            <input
              type="checkbox"
              id="allDay"
              checked={formData.allDay}
              onChange={(e) => handleInputChange('allDay', e.target.checked)}
              className="h-4 w-4 text-blue-600 focus:ring-blue-500 border-gray-300 rounded"
            />
            <label htmlFor="allDay" className="ml-2 block text-sm text-gray-700">
              {t('forms:labels.allDayEvent')}
            </label>
          </div>

          {/* Start Date/Time */}
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label htmlFor="startDate" className="block text-sm font-medium text-gray-700 mb-1">
                {t('forms:labels.startDate')} *
              </label>
              <input
                type="date"
                id="startDate"
                value={formData.startDate}
                onChange={(e) => handleInputChange('startDate', e.target.value)}
                className={`
                  w-full px-3 py-2 border rounded-md shadow-sm focus:outline-none focus:ring-1 focus:ring-blue-500 focus:border-blue-500
                  ${errors.startDate ? 'border-red-300' : 'border-gray-300'}
                `}
              />
              {errors.startDate && (
                <p className="mt-1 text-sm text-red-600">{errors.startDate[0]}</p>
              )}
            </div>
            
            {!formData.allDay && (
              <div>
                <label htmlFor="startTime" className="block text-sm font-medium text-gray-700 mb-1">
                  {t('forms:labels.startTime')}
                </label>
                <input
                  type="time"
                  id="startTime"
                  value={formData.startTime}
                  onChange={(e) => handleInputChange('startTime', e.target.value)}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-1 focus:ring-blue-500 focus:border-blue-500"
                />
              </div>
            )}
          </div>

          {/* End Date/Time */}
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label htmlFor="endDate" className="block text-sm font-medium text-gray-700 mb-1">
                {t('forms:labels.endDate')} *
              </label>
              <input
                type="date"
                id="endDate"
                value={formData.endDate}
                onChange={(e) => handleInputChange('endDate', e.target.value)}
                className={`
                  w-full px-3 py-2 border rounded-md shadow-sm focus:outline-none focus:ring-1 focus:ring-blue-500 focus:border-blue-500
                  ${errors.endDate ? 'border-red-300' : 'border-gray-300'}
                `}
              />
              {errors.endDate && (
                <p className="mt-1 text-sm text-red-600">{errors.endDate[0]}</p>
              )}
            </div>
            
            {!formData.allDay && (
              <div>
                <label htmlFor="endTime" className="block text-sm font-medium text-gray-700 mb-1">
                  {t('forms:labels.endTime')}
                </label>
                <input
                  type="time"
                  id="endTime"
                  value={formData.endTime}
                  onChange={(e) => handleInputChange('endTime', e.target.value)}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-1 focus:ring-blue-500 focus:border-blue-500"
                />
              </div>
            )}
          </div>

          {/* Notifications */}
          <div>
            <div className="flex items-center justify-between mb-2">
              <label className="block text-sm font-medium text-gray-700">
                {t('forms:labels.notifications')}
              </label>
              <button
                type="button"
                onClick={addNotification}
                className="inline-flex items-center px-2 py-1 border border-transparent text-xs font-medium rounded text-blue-700 bg-blue-100 hover:bg-blue-200"
              >
                <PlusIcon className="h-3 w-3 mr-1" />
                {t('forms:buttons.add')}
              </button>
            </div>
            
            {formData.notifications.length === 0 ? (
              <p className="text-sm text-gray-500">{t('forms:messages.noNotificationsSet')}</p>
            ) : (
              <div className="space-y-2">
                {formData.notifications.map((notification, index) => (
                  <div key={notification.id} className="flex items-center gap-2 p-2 border border-gray-200 rounded">
                    <select
                      value={notification.type}
                      onChange={(e) => updateNotification(index, 'type', e.target.value)}
                      className="text-sm border-gray-300 rounded"
                    >
                      <option value="in_app">{t('forms:notifications.inApp')}</option>
                      <option value="browser">{t('forms:notifications.browser')}</option>
                    </select>
                    
                    <input
                      type="number"
                      min="0"
                      value={notification.timing}
                      onChange={(e) => updateNotification(index, 'timing', parseInt(e.target.value))}
                      className="w-16 text-sm border-gray-300 rounded"
                    />
                    <span className="text-sm text-gray-600">{t('forms:messages.minBefore')}</span>
                    
                    <input
                      type="checkbox"
                      checked={notification.enabled}
                      onChange={(e) => updateNotification(index, 'enabled', e.target.checked)}
                      className="h-4 w-4 text-blue-600 border-gray-300 rounded"
                    />
                    
                    <button
                      type="button"
                      onClick={() => removeNotification(index)}
                      className="p-1 text-red-600 hover:text-red-800"
                    >
                      <TrashIcon className="h-4 w-4" />
                    </button>
                    
                    {errors[`notification_${index}`] && (
                      <p className="text-xs text-red-600">{errors[`notification_${index}`][0]}</p>
                    )}
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* Actions */}
          <div className="flex items-center justify-end gap-3 pt-4 border-t">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 border border-gray-300 rounded-md text-sm font-medium text-gray-700 bg-white hover:bg-gray-50"
            >
              {t('forms:buttons.cancel')}
            </button>
            <button
              type="submit"
              disabled={isSubmitting}
              className="px-4 py-2 border border-transparent rounded-md shadow-sm text-sm font-medium text-white bg-blue-600 hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {isSubmitting ? (
                <div className="flex items-center">
                  <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white mr-2" />
                  {t('forms:messages.saving')}
                </div>
              ) : (
                event ? t('forms:titles.updateEvent') : t('forms:titles.createEvent')
              )}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}