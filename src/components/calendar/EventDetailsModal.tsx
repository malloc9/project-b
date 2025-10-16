import React, { useState } from 'react';
import { 
  XMarkIcon, 
  PencilIcon, 
  TrashIcon, 
  ArrowTopRightOnSquareIcon,
  CalendarIcon,
  ClockIcon,
  TagIcon,
  CheckCircleIcon,
  ExclamationCircleIcon
} from '@heroicons/react/24/outline';
import type { CalendarEvent } from '../../types';
import { deleteEvent, updateEvent } from '../../services/calendarService';
import { useAuth } from '../../contexts/AuthContext';

interface EventDetailsModalProps {
  event: CalendarEvent | null;
  isOpen: boolean;
  onClose: () => void;
  onEdit?: (event: CalendarEvent) => void;
  onEventUpdated?: () => void;
}

export function EventDetailsModal({ 
  event, 
  isOpen, 
  onClose, 
  onEdit,
  onEventUpdated 
}: EventDetailsModalProps) {
  const { user } = useAuth();
  const [isDeleting, setIsDeleting] = useState(false);
  const [isUpdatingStatus, setIsUpdatingStatus] = useState(false);
  const [error, setError] = useState<string | null>(null);

  if (!isOpen || !event) return null;

  const handleDelete = async () => {
    if (!user || !event) return;
    
    const confirmed = window.confirm('Are you sure you want to delete this event?');
    if (!confirmed) return;

    setIsDeleting(true);
    setError(null);

    try {
      await deleteEvent(user.uid, event.id);
      onEventUpdated?.();
      onClose();
    } catch (err) {
      console.error('Error deleting event:', err);
      setError('Failed to delete event');
    } finally {
      setIsDeleting(false);
    }
  };

  const handleStatusToggle = async () => {
    if (!user || !event) return;

    setIsUpdatingStatus(true);
    setError(null);

    try {
      const newStatus = event.status === 'completed' ? 'pending' : 'completed';
      await updateEvent(user.uid, event.id, { status: newStatus });
      onEventUpdated?.();
    } catch (err) {
      console.error('Error updating event status:', err);
      setError('Failed to update event status');
    } finally {
      setIsUpdatingStatus(false);
    }
  };

  const handleEdit = () => {
    onEdit?.(event);
    onClose();
  };

  const getSourceLink = () => {
    if (!event.sourceId) return null;

    switch (event.type) {
      case 'task':
        return `/tasks`;
      case 'project':
        return `/projects`;
      case 'plant_care':
        return `/plants`;
      default:
        return null;
    }
  };

  const getEventTypeLabel = (type: CalendarEvent['type']) => {
    switch (type) {
      case 'task':
        return 'Task';
      case 'project':
        return 'Project';
      case 'plant_care':
        return 'Plant Care';
      case 'custom':
        return 'Custom Event';
      default:
        return 'Event';
    }
  };

  const getEventTypeColor = (type: CalendarEvent['type']) => {
    switch (type) {
      case 'task':
        return 'bg-blue-100 text-blue-800';
      case 'project':
        return 'bg-green-100 text-green-800';
      case 'plant_care':
        return 'bg-yellow-100 text-yellow-800';
      case 'custom':
        return 'bg-purple-100 text-purple-800';
      default:
        return 'bg-gray-100 text-gray-800';
    }
  };

  const getStatusColor = (status: CalendarEvent['status']) => {
    switch (status) {
      case 'completed':
        return 'text-green-600';
      case 'cancelled':
        return 'text-red-600';
      case 'pending':
      default:
        return 'text-yellow-600';
    }
  };

  const formatDate = (date: Date) => {
    return new Intl.DateTimeFormat('en-US', {
      weekday: 'long',
      year: 'numeric',
      month: 'long',
      day: 'numeric'
    }).format(date);
  };

  const formatTime = (date: Date) => {
    return new Intl.DateTimeFormat('en-US', {
      hour: 'numeric',
      minute: '2-digit',
      hour12: true
    }).format(date);
  };

  const sourceLink = getSourceLink();

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
      <div className="bg-white rounded-lg shadow-xl max-w-md w-full max-h-[90vh] overflow-y-auto">
        {/* Header */}
        <div className="flex items-center justify-between p-6 border-b">
          <h2 className="text-lg font-semibold text-gray-900">Event Details</h2>
          <button
            onClick={onClose}
            className="p-2 hover:bg-gray-100 rounded-full transition-colors"
            aria-label="Close modal"
          >
            <XMarkIcon className="h-5 w-5 text-gray-500" />
          </button>
        </div>

        {/* Content */}
        <div className="p-6 space-y-4">
          {/* Error Message */}
          {error && (
            <div className="bg-red-50 border border-red-200 rounded-md p-3">
              <div className="flex">
                <ExclamationCircleIcon className="h-5 w-5 text-red-400" />
                <div className="ml-3">
                  <p className="text-sm text-red-800">{error}</p>
                </div>
              </div>
            </div>
          )}

          {/* Event Title */}
          <div>
            <h3 className="text-xl font-semibold text-gray-900 mb-2">
              {event.title}
            </h3>
            
            {/* Event Type and Status */}
            <div className="flex items-center gap-2 mb-3">
              <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${getEventTypeColor(event.type)}`}>
                <TagIcon className="h-3 w-3 mr-1" />
                {getEventTypeLabel(event.type)}
              </span>
              
              <span className={`inline-flex items-center text-sm font-medium ${getStatusColor(event.status)}`}>
                {event.status === 'completed' && <CheckCircleIcon className="h-4 w-4 mr-1" />}
                {event.status.charAt(0).toUpperCase() + event.status.slice(1)}
              </span>
            </div>
          </div>

          {/* Description */}
          {event.description && (
            <div>
              <h4 className="text-sm font-medium text-gray-700 mb-1">Description</h4>
              <p className="text-sm text-gray-600">{event.description}</p>
            </div>
          )}

          {/* Date and Time */}
          <div className="space-y-2">
            <div className="flex items-center text-sm text-gray-600">
              <CalendarIcon className="h-4 w-4 mr-2" />
              <span>{formatDate(event.startDate)}</span>
            </div>
            
            {!event.allDay && (
              <div className="flex items-center text-sm text-gray-600">
                <ClockIcon className="h-4 w-4 mr-2" />
                <span>
                  {formatTime(event.startDate)}
                  {event.startDate.getTime() !== event.endDate.getTime() && 
                    ` - ${formatTime(event.endDate)}`
                  }
                </span>
              </div>
            )}
          </div>

          {/* Recurrence Info */}
          {event.recurrence && (
            <div>
              <h4 className="text-sm font-medium text-gray-700 mb-1">Recurrence</h4>
              <p className="text-sm text-gray-600">
                Repeats {event.recurrence.type} 
                {event.recurrence.interval > 1 && ` every ${event.recurrence.interval}`}
                {event.recurrence.endDate && ` until ${formatDate(event.recurrence.endDate)}`}
              </p>
            </div>
          )}

          {/* Notifications */}
          {event.notifications && event.notifications.length > 0 && (
            <div>
              <h4 className="text-sm font-medium text-gray-700 mb-1">Notifications</h4>
              <div className="space-y-1">
                {event.notifications.map((notification) => (
                  <p key={notification.id} className="text-sm text-gray-600">
                    {notification.type === 'browser' ? 'Browser' : 'In-app'} notification 
                    {notification.timing > 0 && ` ${notification.timing} minutes before`}
                    {!notification.enabled && ' (disabled)'}
                  </p>
                ))}
              </div>
            </div>
          )}

          {/* Source Link */}
          {sourceLink && (
            <div>
              <a
                href={sourceLink}
                className="inline-flex items-center text-sm text-blue-600 hover:text-blue-800"
              >
                <ArrowTopRightOnSquareIcon className="h-4 w-4 mr-1" />
                View source {getEventTypeLabel(event.type).toLowerCase()}
              </a>
            </div>
          )}
        </div>

        {/* Actions */}
        <div className="flex items-center justify-between p-6 border-t bg-gray-50">
          <div className="flex items-center gap-2">
            {/* Status Toggle */}
            <button
              onClick={handleStatusToggle}
              disabled={isUpdatingStatus}
              className={`
                inline-flex items-center px-3 py-2 border border-transparent text-sm leading-4 font-medium rounded-md
                ${event.status === 'completed' 
                  ? 'text-yellow-700 bg-yellow-100 hover:bg-yellow-200' 
                  : 'text-green-700 bg-green-100 hover:bg-green-200'
                }
                disabled:opacity-50 disabled:cursor-not-allowed
              `}
            >
              {isUpdatingStatus ? (
                <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-current mr-2" />
              ) : (
                <CheckCircleIcon className="h-4 w-4 mr-2" />
              )}
              {event.status === 'completed' ? 'Mark Pending' : 'Mark Complete'}
            </button>
          </div>

          <div className="flex items-center gap-2">
            {/* Edit Button */}
            {event.type === 'custom' && (
              <button
                onClick={handleEdit}
                className="inline-flex items-center px-3 py-2 border border-gray-300 shadow-sm text-sm leading-4 font-medium rounded-md text-gray-700 bg-white hover:bg-gray-50"
              >
                <PencilIcon className="h-4 w-4 mr-2" />
                Edit
              </button>
            )}

            {/* Delete Button */}
            <button
              onClick={handleDelete}
              disabled={isDeleting}
              className="inline-flex items-center px-3 py-2 border border-transparent text-sm leading-4 font-medium rounded-md text-red-700 bg-red-100 hover:bg-red-200 disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {isDeleting ? (
                <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-current mr-2" />
              ) : (
                <TrashIcon className="h-4 w-4 mr-2" />
              )}
              Delete
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}