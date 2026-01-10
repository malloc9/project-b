import React, { useState, useEffect } from 'react';
import { MagnifyingGlassIcon, FunnelIcon, XMarkIcon } from '@heroicons/react/24/outline';
import type { CalendarEvent, CalendarFilters as CalendarFiltersType } from '../../types';
import { useTranslation } from '../../hooks/useTranslation';
import type { TFunction } from 'i18next';

interface CalendarFiltersProps {
  onFiltersChange: (filters: CalendarFiltersType) => void;
  initialFilters?: CalendarFiltersType;
  className?: string;
}

export function CalendarFilters({
  onFiltersChange,
  initialFilters = {},
  className = ''
}: CalendarFiltersProps) {
  const { t } = useTranslation();
  const [filters, setFilters] = useState<CalendarFiltersType>(initialFilters);
  const [showAdvancedFilters, setShowAdvancedFilters] = useState(false);
  const [searchTerm, setSearchTerm] = useState(initialFilters.searchTerm || '');

  // Debounce search term updates
  useEffect(() => {
    const timeoutId = setTimeout(() => {
      setFilters(prev => ({
        ...prev,
        searchTerm: searchTerm.trim() || undefined
      }));
    }, 300);

    return () => clearTimeout(timeoutId);
  }, [searchTerm]);

  // Notify parent when filters change
  useEffect(() => {
    onFiltersChange(filters);
  }, [filters, onFiltersChange]);

  const handleFilterChange = (key: keyof CalendarFiltersType, value: CalendarFiltersType[keyof CalendarFiltersType]) => {
    setFilters(prev => ({
      ...prev,
      [key]: value === '' ? undefined : value
    }));
  };

  const clearFilters = () => {
    setFilters({});
    setSearchTerm('');
    setShowAdvancedFilters(false);
  };

  const hasActiveFilters = () => {
    return Object.values(filters).some(value => value !== undefined);
  };

  const formatDateForInput = (date?: Date) => {
    if (!date) return '';
    return date.toISOString().split('T')[0];
  };

  const handleDateChange = (key: 'startDate' | 'endDate', value: string) => {
    const date = value ? new Date(value) : undefined;
    handleFilterChange(key, date);
  };

  return (
    <div className={`bg-white border border-gray-200 rounded-lg p-4 ${className}`}>
      {/* Search Bar */}
      <div className="relative mb-4">
        <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
          <MagnifyingGlassIcon className="h-5 w-5 text-gray-400" />
        </div>
        <input
          type="text"
          placeholder={t('calendar:filters.searchPlaceholder', 'Search events by title or description...')}
          value={searchTerm}
          onChange={(e) => setSearchTerm(e.target.value)}
          className="block w-full pl-10 pr-3 py-2 border border-gray-300 rounded-md leading-5 bg-white placeholder-gray-500 focus:outline-none focus:placeholder-gray-400 focus:ring-1 focus:ring-blue-500 focus:border-blue-500"
        />
      </div>

      {/* Quick Filters */}
      <div className="flex flex-wrap gap-2 mb-4">
        <button
          onClick={() => setShowAdvancedFilters(!showAdvancedFilters)}
          className={`
            inline-flex items-center px-3 py-1 rounded-full text-sm font-medium transition-colors
            ${showAdvancedFilters 
              ? 'bg-blue-100 text-blue-800 border border-blue-200' 
              : 'bg-gray-100 text-gray-700 border border-gray-200 hover:bg-gray-200'
            }
          `}
        >
          <FunnelIcon className="h-4 w-4 mr-1" />
          {t('calendar:filters.filters', 'Filters')}
        </button>

        {/* Event Type Quick Filters */}
        {(['task', 'project', 'plant_care', 'custom'] as const).map(type => (
          <button
            key={type}
            onClick={() => handleFilterChange('type', filters.type === type ? undefined : type)}
            className={`
              inline-flex items-center px-3 py-1 rounded-full text-sm font-medium transition-colors
              ${filters.type === type
                ? 'bg-blue-100 text-blue-800 border border-blue-200'
                : 'bg-gray-100 text-gray-700 border border-gray-200 hover:bg-gray-200'
              }
            `}
          >
            <div className={`w-2 h-2 rounded-full mr-2 ${getTypeColor(type)}`} />
            {getTypeLabel(type, t)}
          </button>
        ))}

        {/* Status Quick Filters */}
        {(['pending', 'completed', 'cancelled'] as const).map(status => (
          <button
            key={status}
            onClick={() => handleFilterChange('status', filters.status === status ? undefined : status)}
            className={`
              inline-flex items-center px-3 py-1 rounded-full text-sm font-medium transition-colors
              ${filters.status === status
                ? 'bg-green-100 text-green-800 border border-green-200'
                : 'bg-gray-100 text-gray-700 border border-gray-200 hover:bg-gray-200'
              }
            `}
          >
            {getStatusIcon(status)}
            {getStatusLabel(status, t)}
          </button>
        ))}

        {/* Clear Filters */}
        {hasActiveFilters() && (
          <button
            onClick={clearFilters}
            className="inline-flex items-center px-3 py-1 rounded-full text-sm font-medium bg-red-100 text-red-800 border border-red-200 hover:bg-red-200 transition-colors"
          >
            <XMarkIcon className="h-4 w-4 mr-1" />
            {t('calendar:filters.clearAll', 'Clear All')}
          </button>
        )}
      </div>

      {/* Advanced Filters */}
      {showAdvancedFilters && (
        <div className="border-t border-gray-200 pt-4">
          <h4 className="text-sm font-medium text-gray-900 mb-3">{t('calendar:filters.advancedFilters', 'Advanced Filters')}</h4>
          
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {/* Date Range */}
            <div>
              <label htmlFor="start-date" className="block text-sm font-medium text-gray-700 mb-1">
                {t('calendar:filters.startDate', 'Start Date')}
              </label>
              <input
                id="start-date"
                type="date"
                value={formatDateForInput(filters.startDate)}
                onChange={(e) => handleDateChange('startDate', e.target.value)}
                className="block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-1 focus:ring-blue-500 focus:border-blue-500"
              />
            </div>

            <div>
              <label htmlFor="end-date" className="block text-sm font-medium text-gray-700 mb-1">
                {t('calendar:filters.endDate', 'End Date')}
              </label>
              <input
                id="end-date"
                type="date"
                value={formatDateForInput(filters.endDate)}
                onChange={(e) => handleDateChange('endDate', e.target.value)}
                className="block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-1 focus:ring-blue-500 focus:border-blue-500"
              />
            </div>

            {/* Event Type Dropdown */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                {t('calendar:filters.eventType', 'Event Type')}
              </label>
              <select
                value={filters.type || ''}
                onChange={(e) => handleFilterChange('type', e.target.value as CalendarEvent['type'])}
                className="block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-1 focus:ring-blue-500 focus:border-blue-500"
              >
                <option value="">{t('calendar:filters.allTypes', 'All Types')}</option>
                <option value="task">{t('calendar:filters.tasks', 'Tasks')}</option>
                <option value="project">{t('calendar:filters.projects', 'Projects')}</option>
                <option value="plant_care">{t('calendar:filters.plantCare', 'Plant Care')}</option>
                <option value="custom">{t('calendar:filters.customEvents', 'Custom Events')}</option>
              </select>
            </div>

            {/* Status Dropdown */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                {t('calendar:filters.status', 'Status')}
              </label>
              <select
                value={filters.status || ''}
                onChange={(e) => handleFilterChange('status', e.target.value as CalendarEvent['status'])}
                className="block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-1 focus:ring-blue-500 focus:border-blue-500"
              >
                <option value="">{t('calendar:filters.allStatuses', 'All Statuses')}</option>
                <option value="pending">{t('calendar:filters.pending', 'Pending')}</option>
                <option value="completed">{t('calendar:filters.completed', 'Completed')}</option>
                <option value="cancelled">{t('calendar:filters.cancelled', 'Cancelled')}</option>
              </select>
            </div>
          </div>
        </div>
      )}

      {/* Active Filters Summary */}
      {hasActiveFilters() && (
        <div className="mt-4 pt-4 border-t border-gray-200">
          <div className="flex items-center justify-between">
            <span className="text-sm text-gray-600">
              {getActiveFiltersCount()} {getActiveFiltersCount() === 1 
                ? t('calendar:filters.filtersActive', 'filter') 
                : t('calendar:filters.filtersActiveMultiple', 'filters')
              } {t('calendar:filters.active', 'active')}
            </span>
            <button
              onClick={clearFilters}
              className="text-sm text-blue-600 hover:text-blue-800 font-medium"
            >
              {t('calendar:filters.clearAllFilters', 'Clear all filters')}
            </button>
          </div>
        </div>
      )}
    </div>
  );

  function getActiveFiltersCount(): number {
    return Object.values(filters).filter(value => value !== undefined).length;
  }
}

// Helper functions for styling and labels
function getTypeColor(type: CalendarEvent['type']): string {
  switch (type) {
    case 'task':
      return 'bg-blue-500';
    case 'project':
      return 'bg-green-500';
    case 'plant_care':
      return 'bg-yellow-500';
    case 'custom':
      return 'bg-purple-500';
    default:
      return 'bg-gray-500';
  }
}

function getTypeLabel(type: CalendarEvent['type'], t: TFunction): string {
  switch (type) {
    case 'task':
      return t('calendar:filters.tasks', 'Tasks');
    case 'project':
      return t('calendar:filters.projects', 'Projects');
    case 'plant_care':
      return t('calendar:filters.plantCare', 'Plant Care');
    case 'custom':
      return t('calendar:filters.customEvents', 'Custom Events');
    default:
      return t('common:unknown', 'Unknown');
  }
}

function getStatusIcon(status: CalendarEvent['status']): React.ReactNode {
  switch (status) {
    case 'pending':
      return <div className="w-2 h-2 rounded-full bg-yellow-500 mr-2" />;
    case 'completed':
      return <div className="w-2 h-2 rounded-full bg-green-500 mr-2" />;
    case 'cancelled':
      return <div className="w-2 h-2 rounded-full bg-red-500 mr-2" />;
    default:
      return <div className="w-2 h-2 rounded-full bg-gray-500 mr-2" />;
  }
}

function getStatusLabel(status: CalendarEvent['status'], t: TFunction): string {
  switch (status) {
    case 'pending':
      return t('calendar:filters.pending', 'Pending');
    case 'completed':
      return t('calendar:filters.completed', 'Completed');
    case 'cancelled':
      return t('calendar:filters.cancelled', 'Cancelled');
    default:
      return t('common:unknown', 'Unknown');
  }
}