import React from 'react';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { vi, describe, it, expect, beforeEach } from 'vitest';
import { CalendarFilters } from '../CalendarFilters';
import { CalendarFilters as CalendarFiltersType } from '../../../types';

// Mock Heroicons
vi.mock('@heroicons/react/24/outline', () => ({
  MagnifyingGlassIcon: () => <div data-testid="search-icon" />,
  FunnelIcon: () => <div data-testid="funnel-icon" />,
  XMarkIcon: () => <div data-testid="x-mark-icon" />
}));

// Mock useTranslation hook
vi.mock('../../../hooks/useTranslation', () => ({
  useTranslation: () => ({
    t: (key: string, fallback?: string) => {
      // Return fallback or key for testing
      if (fallback) return fallback;
      
      // Map some common keys to expected values
      const translations: Record<string, string> = {
        'calendar:filters.searchPlaceholder': 'Search events by title or description...',
        'calendar:filters.filters': 'Filters',
        'calendar:filters.clearAll': 'Clear All',
        'calendar:filters.advancedFilters': 'Advanced Filters',
        'calendar:filters.startDate': 'Start Date',
        'calendar:filters.endDate': 'End Date',
        'calendar:filters.eventType': 'Event Type',
        'calendar:filters.status': 'Status',
        'calendar:filters.allTypes': 'All Types',
        'calendar:filters.allStatuses': 'All Statuses',
        'calendar:filters.tasks': 'Tasks',
        'calendar:filters.projects': 'Projects',
        'calendar:filters.plantCare': 'Plant Care',
        'calendar:filters.customEvents': 'Custom Events',
        'calendar:filters.pending': 'Pending',
        'calendar:filters.completed': 'Completed',
        'calendar:filters.cancelled': 'Cancelled',
        'calendar:filters.filtersActive': 'filter',
        'calendar:filters.filtersActiveMultiple': 'filters',
        'calendar:filters.active': 'active',
        'calendar:filters.clearAllFilters': 'Clear all filters',
        'common:unknown': 'Unknown'
      };
      
      return translations[key] || key;
    }
  })
}));

const mockOnFiltersChange = vi.fn();

const renderCalendarFilters = (props = {}) => {
  const defaultProps = {
    onFiltersChange: mockOnFiltersChange,
    initialFilters: {},
    ...props
  };

  return render(<CalendarFilters {...defaultProps} />);
};

describe('CalendarFilters', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('renders search input', () => {
    renderCalendarFilters();
    
    expect(screen.getByPlaceholderText('Search events by title or description...')).toBeInTheDocument();
  });

  it('renders filter toggle button', () => {
    renderCalendarFilters();
    
    expect(screen.getByText('Filters')).toBeInTheDocument();
  });

  it('renders event type filter buttons', () => {
    renderCalendarFilters();
    
    expect(screen.getByText('Tasks')).toBeInTheDocument();
    expect(screen.getByText('Projects')).toBeInTheDocument();
    expect(screen.getByText('Plant Care')).toBeInTheDocument();
    expect(screen.getByText('Custom Events')).toBeInTheDocument();
  });

  it('renders status filter buttons', () => {
    renderCalendarFilters();
    
    expect(screen.getByText('Pending')).toBeInTheDocument();
    expect(screen.getByText('Completed')).toBeInTheDocument();
    expect(screen.getByText('Cancelled')).toBeInTheDocument();
  });

  it('calls onFiltersChange when search term changes', async () => {
    renderCalendarFilters();
    
    const searchInput = screen.getByPlaceholderText('Search events by title or description...');
    fireEvent.change(searchInput, { target: { value: 'test search' } });
    
    // Wait for debounce
    await waitFor(() => {
      expect(mockOnFiltersChange).toHaveBeenCalledWith({
        searchTerm: 'test search'
      });
    }, { timeout: 500 });
  });

  it('debounces search input changes', async () => {
    renderCalendarFilters();
    
    const searchInput = screen.getByPlaceholderText('Search events by title or description...');
    
    // Type multiple characters quickly
    fireEvent.change(searchInput, { target: { value: 't' } });
    fireEvent.change(searchInput, { target: { value: 'te' } });
    fireEvent.change(searchInput, { target: { value: 'test' } });
    
    // Should call with final value after debounce
    await waitFor(() => {
      expect(mockOnFiltersChange).toHaveBeenCalledWith({
        searchTerm: 'test'
      });
    }, { timeout: 500 });
  });

  it('filters by event type when type button is clicked', () => {
    renderCalendarFilters();
    
    fireEvent.click(screen.getByText('Tasks'));
    
    expect(mockOnFiltersChange).toHaveBeenCalledWith({
      type: 'task'
    });
  });

  it('toggles event type filter when clicked twice', () => {
    renderCalendarFilters();
    
    const tasksButton = screen.getByText('Tasks');
    
    // First click - select
    fireEvent.click(tasksButton);
    expect(mockOnFiltersChange).toHaveBeenCalledWith({
      type: 'task'
    });
    
    // Second click - deselect
    fireEvent.click(tasksButton);
    expect(mockOnFiltersChange).toHaveBeenCalledWith({
      type: undefined
    });
  });

  it('filters by status when status button is clicked', () => {
    renderCalendarFilters();
    
    fireEvent.click(screen.getByText('Completed'));
    
    expect(mockOnFiltersChange).toHaveBeenCalledWith({
      status: 'completed'
    });
  });

  it('shows advanced filters when filter button is clicked', () => {
    renderCalendarFilters();
    
    fireEvent.click(screen.getByText('Filters'));
    
    expect(screen.getByText('Advanced Filters')).toBeInTheDocument();
    expect(screen.getByText('Start Date')).toBeInTheDocument();
    expect(screen.getByText('End Date')).toBeInTheDocument();
  });

  it('hides advanced filters when filter button is clicked again', () => {
    renderCalendarFilters();
    
    const filtersButton = screen.getByText('Filters');
    
    // Show advanced filters
    fireEvent.click(filtersButton);
    expect(screen.getByText('Advanced Filters')).toBeInTheDocument();
    
    // Hide advanced filters
    fireEvent.click(filtersButton);
    expect(screen.queryByText('Advanced Filters')).not.toBeInTheDocument();
  });

  it('handles date range filters in advanced mode', () => {
    renderCalendarFilters();
    
    // Show advanced filters
    fireEvent.click(screen.getByText('Filters'));
    
    const startDateInput = screen.getByLabelText('Start Date');
    const endDateInput = screen.getByLabelText('End Date');
    
    fireEvent.change(startDateInput, { target: { value: '2024-01-01' } });
    expect(mockOnFiltersChange).toHaveBeenCalledWith({
      startDate: new Date('2024-01-01')
    });
    
    fireEvent.change(endDateInput, { target: { value: '2024-01-31' } });
    expect(mockOnFiltersChange).toHaveBeenCalledWith({
      startDate: new Date('2024-01-01'),
      endDate: new Date('2024-01-31')
    });
  });

  it('handles dropdown filters in advanced mode', () => {
    renderCalendarFilters();
    
    // Show advanced filters
    fireEvent.click(screen.getByText('Filters'));
    
    const typeSelect = screen.getByDisplayValue('All Types');
    const statusSelect = screen.getByDisplayValue('All Statuses');
    
    fireEvent.change(typeSelect, { target: { value: 'project' } });
    expect(mockOnFiltersChange).toHaveBeenCalledWith({
      type: 'project'
    });
    
    fireEvent.change(statusSelect, { target: { value: 'pending' } });
    expect(mockOnFiltersChange).toHaveBeenCalledWith({
      type: 'project',
      status: 'pending'
    });
  });

  it('shows clear all button when filters are active', () => {
    const initialFilters: CalendarFiltersType = {
      type: 'task',
      status: 'pending'
    };
    
    renderCalendarFilters({ initialFilters });
    
    expect(screen.getByText('Clear All')).toBeInTheDocument();
  });

  it('clears all filters when clear all button is clicked', () => {
    const initialFilters: CalendarFiltersType = {
      type: 'task',
      status: 'pending',
      searchTerm: 'test'
    };
    
    renderCalendarFilters({ initialFilters });
    
    fireEvent.click(screen.getByText('Clear All'));
    
    expect(mockOnFiltersChange).toHaveBeenCalledWith({});
  });

  it('shows active filters summary', () => {
    const initialFilters: CalendarFiltersType = {
      type: 'task',
      status: 'pending'
    };
    
    renderCalendarFilters({ initialFilters });
    
    expect(screen.getByText('2 filters active')).toBeInTheDocument();
  });

  it('shows singular filter text for one active filter', () => {
    const initialFilters: CalendarFiltersType = {
      type: 'task'
    };
    
    renderCalendarFilters({ initialFilters });
    
    expect(screen.getByText('1 filter active')).toBeInTheDocument();
  });

  it('applies initial filters correctly', () => {
    const initialFilters: CalendarFiltersType = {
      type: 'project',
      status: 'completed',
      searchTerm: 'initial search'
    };
    
    renderCalendarFilters({ initialFilters });
    
    // Check that initial filters are applied
    expect(screen.getByDisplayValue('initial search')).toBeInTheDocument();
    
    // Check that filter buttons show active state
    const projectsButton = screen.getByText('Projects');
    const completedButton = screen.getByText('Completed');
    
    expect(projectsButton).toHaveClass('bg-blue-100');
    expect(completedButton).toHaveClass('bg-green-100');
  });

  it('handles empty search term correctly', async () => {
    renderCalendarFilters();
    
    const searchInput = screen.getByPlaceholderText('Search events by title or description...');
    
    // Enter search term
    fireEvent.change(searchInput, { target: { value: 'test' } });
    
    await waitFor(() => {
      expect(mockOnFiltersChange).toHaveBeenCalledWith({
        searchTerm: 'test'
      });
    });
    
    // Clear search term
    fireEvent.change(searchInput, { target: { value: '' } });
    
    await waitFor(() => {
      expect(mockOnFiltersChange).toHaveBeenCalledWith({
        searchTerm: undefined
      });
    });
  });

  it('handles whitespace-only search term correctly', async () => {
    renderCalendarFilters();
    
    const searchInput = screen.getByPlaceholderText('Search events by title or description...');
    
    fireEvent.change(searchInput, { target: { value: '   ' } });
    
    await waitFor(() => {
      expect(mockOnFiltersChange).toHaveBeenCalledWith({
        searchTerm: undefined
      });
    });
  });

  it('applies custom className', () => {
    const { container } = renderCalendarFilters({ className: 'custom-class' });
    
    expect(container.firstChild).toHaveClass('custom-class');
  });

  it('shows correct type colors', () => {
    renderCalendarFilters();
    
    const tasksButton = screen.getByText('Tasks');
    const projectsButton = screen.getByText('Projects');
    const plantCareButton = screen.getByText('Plant Care');
    const customButton = screen.getByText('Custom Events');
    
    // Check that each button has the correct color indicator
    expect(tasksButton.querySelector('.bg-blue-500')).toBeInTheDocument();
    expect(projectsButton.querySelector('.bg-green-500')).toBeInTheDocument();
    expect(plantCareButton.querySelector('.bg-yellow-500')).toBeInTheDocument();
    expect(customButton.querySelector('.bg-purple-500')).toBeInTheDocument();
  });

  it('shows correct status indicators', () => {
    renderCalendarFilters();
    
    const pendingButton = screen.getByText('Pending');
    const completedButton = screen.getByText('Completed');
    const cancelledButton = screen.getByText('Cancelled');
    
    // Check that each button has a status indicator
    expect(pendingButton.querySelector('.bg-yellow-500')).toBeInTheDocument();
    expect(completedButton.querySelector('.bg-green-500')).toBeInTheDocument();
    expect(cancelledButton.querySelector('.bg-red-500')).toBeInTheDocument();
  });
});