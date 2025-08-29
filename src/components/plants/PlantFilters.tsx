import { useState } from 'react';
import type { PlantFilters } from '../../types';

interface PlantFiltersComponentProps {
  filters: PlantFilters;
  onFiltersChange: (filters: PlantFilters) => void;
}

export function PlantFiltersComponent({ filters, onFiltersChange }: PlantFiltersComponentProps) {
  const [searchTerm, setSearchTerm] = useState(filters.searchTerm || '');
  const [isExpanded, setIsExpanded] = useState(false);

  const handleSearchChange = (value: string) => {
    setSearchTerm(value);
    onFiltersChange({ ...filters, searchTerm: value || undefined });
  };

  const handleSpeciesChange = (value: string) => {
    onFiltersChange({ ...filters, species: value || undefined });
  };

  const handleCareTasksChange = (value: string) => {
    const hasCareTasks = value === 'with-tasks' ? true : value === 'without-tasks' ? false : undefined;
    onFiltersChange({ ...filters, hasCareTasks });
  };

  const clearFilters = () => {
    setSearchTerm('');
    onFiltersChange({});
  };

  const hasActiveFilters = Object.keys(filters).some(key => filters[key as keyof PlantFilters] !== undefined);

  return (
    <div className="bg-white border border-gray-200 rounded-lg p-4">
      <div className="flex flex-col sm:flex-row gap-4">
        {/* Search */}
        <div className="flex-1">
          <div className="relative">
            <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
              <svg className="h-5 w-5 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
              </svg>
            </div>
            <input
              type="text"
              placeholder="Search plants by name, species, or description..."
              value={searchTerm}
              onChange={(e) => handleSearchChange(e.target.value)}
              className="block w-full pl-10 pr-3 py-2 border border-gray-300 rounded-md leading-5 bg-white placeholder-gray-500 focus:outline-none focus:placeholder-gray-400 focus:ring-1 focus:ring-green-500 focus:border-green-500"
            />
          </div>
        </div>

        {/* Filter toggle */}
        <button
          onClick={() => setIsExpanded(!isExpanded)}
          className="inline-flex items-center px-3 py-2 border border-gray-300 rounded-md text-sm font-medium text-gray-700 bg-white hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-green-500"
        >
          <svg className="w-4 h-4 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 4a1 1 0 011-1h16a1 1 0 011 1v2.586a1 1 0 01-.293.707l-6.414 6.414a1 1 0 00-.293.707V17l-4 4v-6.586a1 1 0 00-.293-.707L3.293 7.207A1 1 0 013 6.5V4z" />
          </svg>
          Filters
          {hasActiveFilters && (
            <span className="ml-2 inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium bg-green-100 text-green-800">
              {Object.keys(filters).filter(key => filters[key as keyof PlantFilters] !== undefined).length}
            </span>
          )}
        </button>

        {/* Clear filters */}
        {hasActiveFilters && (
          <button
            onClick={clearFilters}
            className="inline-flex items-center px-3 py-2 text-sm font-medium text-gray-600 hover:text-gray-800 focus:outline-none"
          >
            Clear all
          </button>
        )}
      </div>

      {/* Expanded filters */}
      {isExpanded && (
        <div className="mt-4 pt-4 border-t border-gray-200">
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            {/* Species filter */}
            <div>
              <label htmlFor="species-filter" className="block text-sm font-medium text-gray-700 mb-1">
                Species
              </label>
              <input
                id="species-filter"
                type="text"
                placeholder="Filter by species..."
                value={filters.species || ''}
                onChange={(e) => handleSpeciesChange(e.target.value)}
                className="block w-full px-3 py-2 border border-gray-300 rounded-md text-sm focus:outline-none focus:ring-1 focus:ring-green-500 focus:border-green-500"
              />
            </div>

            {/* Care tasks filter */}
            <div>
              <label htmlFor="care-tasks-filter" className="block text-sm font-medium text-gray-700 mb-1">
                Care Tasks
              </label>
              <select
                id="care-tasks-filter"
                value={
                  filters.hasCareTasks === true 
                    ? 'with-tasks' 
                    : filters.hasCareTasks === false 
                    ? 'without-tasks' 
                    : 'all'
                }
                onChange={(e) => handleCareTasksChange(e.target.value)}
                className="block w-full px-3 py-2 border border-gray-300 rounded-md text-sm focus:outline-none focus:ring-1 focus:ring-green-500 focus:border-green-500"
              >
                <option value="all">All plants</option>
                <option value="with-tasks">With care tasks</option>
                <option value="without-tasks">Without care tasks</option>
              </select>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}