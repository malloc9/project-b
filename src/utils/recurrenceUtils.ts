import type { RecurrencePattern } from '../types';

// ============================================================================
// RECURRENCE PATTERN VALIDATION
// ============================================================================

export interface RecurrenceValidationError {
  field: string;
  message: string;
}

export interface RecurrenceValidationResult {
  isValid: boolean;
  errors: RecurrenceValidationError[];
}

/**
 * Validates a recurrence pattern for correctness
 */
export function validateRecurrencePattern(pattern: RecurrencePattern): RecurrenceValidationResult {
  const errors: RecurrenceValidationError[] = [];

  // Validate type
  const validTypes = ['daily', 'weekly', 'monthly', 'yearly'];
  if (!validTypes.includes(pattern.type)) {
    errors.push({
      field: 'type',
      message: `Recurrence type must be one of: ${validTypes.join(', ')}`
    });
  }

  // Validate interval
  if (!Number.isInteger(pattern.interval) || pattern.interval < 1) {
    errors.push({
      field: 'interval',
      message: 'Interval must be a positive integer'
    });
  }

  if (pattern.interval > 365) {
    errors.push({
      field: 'interval',
      message: 'Interval cannot exceed 365'
    });
  }

  // Validate end date if provided
  if (pattern.endDate) {
    const now = new Date();
    if (pattern.endDate <= now) {
      errors.push({
        field: 'endDate',
        message: 'End date must be in the future'
      });
    }
  }

  return {
    isValid: errors.length === 0,
    errors
  };
}

// ============================================================================
// RECURRENCE CALCULATION UTILITIES
// ============================================================================

/**
 * Calculates the next occurrence date based on a recurrence pattern
 */
export function calculateNextOccurrence(
  baseDate: Date,
  pattern: RecurrencePattern,
  currentOccurrence?: Date
): Date | null {
  const startDate = currentOccurrence || baseDate;
  
  // Check if we've reached the end date
  if (pattern.endDate && startDate >= pattern.endDate) {
    return null;
  }

  const nextDate = new Date(startDate);

  switch (pattern.type) {
    case 'daily':
      nextDate.setDate(nextDate.getDate() + pattern.interval);
      break;
    
    case 'weekly':
      nextDate.setDate(nextDate.getDate() + (pattern.interval * 7));
      break;
    
    case 'monthly':
      nextDate.setMonth(nextDate.getMonth() + pattern.interval);
      break;
    
    case 'yearly':
      nextDate.setFullYear(nextDate.getFullYear() + pattern.interval);
      break;
    
    default:
      return null;
  }

  // Check if the calculated date exceeds the end date
  if (pattern.endDate && nextDate > pattern.endDate) {
    return null;
  }

  return nextDate;
}

/**
 * Generates all occurrence dates within a date range
 */
export function generateOccurrencesInRange(
  baseDate: Date,
  pattern: RecurrencePattern,
  rangeStart: Date,
  rangeEnd: Date,
  maxOccurrences: number = 100
): Date[] {
  const occurrences: Date[] = [];
  let currentDate = new Date(baseDate);
  let count = 0;

  // If base date is within range, include it
  if (currentDate >= rangeStart && currentDate <= rangeEnd) {
    occurrences.push(new Date(currentDate));
    count++;
  }

  // Generate subsequent occurrences
  while (count < maxOccurrences) {
    const nextDate = calculateNextOccurrence(baseDate, pattern, currentDate);
    
    if (!nextDate) {
      break; // No more occurrences (reached end date or invalid pattern)
    }

    if (nextDate > rangeEnd) {
      break; // Exceeded the requested range
    }

    if (nextDate >= rangeStart) {
      occurrences.push(new Date(nextDate));
      count++;
    }

    currentDate = nextDate;
  }

  return occurrences;
}

/**
 * Calculates the total number of occurrences for a recurrence pattern
 */
export function calculateTotalOccurrences(
  baseDate: Date,
  pattern: RecurrencePattern,
  maxCalculationDate?: Date
): number {
  if (!pattern.endDate && !maxCalculationDate) {
    return Infinity; // Infinite recurrence
  }

  const endDate = pattern.endDate || maxCalculationDate!;
  let count = 1; // Include the base occurrence
  let currentDate = new Date(baseDate);

  while (true) {
    const nextDate = calculateNextOccurrence(baseDate, pattern, currentDate);
    
    if (!nextDate || nextDate > endDate) {
      break;
    }

    count++;
    currentDate = nextDate;
  }

  return count;
}

/**
 * Checks if a given date matches a recurrence pattern
 */
export function isDateInRecurrence(
  targetDate: Date,
  baseDate: Date,
  pattern: RecurrencePattern
): boolean {
  // Check if target date is before base date
  if (targetDate < baseDate) {
    return false;
  }

  // Check if target date is after end date
  if (pattern.endDate && targetDate > pattern.endDate) {
    return false;
  }

  // Check if target date matches the base date
  if (targetDate.getTime() === baseDate.getTime()) {
    return true;
  }

  const timeDiff = targetDate.getTime() - baseDate.getTime();
  const daysDiff = Math.floor(timeDiff / (1000 * 60 * 60 * 24));

  switch (pattern.type) {
    case 'daily':
      return daysDiff % pattern.interval === 0;
    
    case 'weekly':
      return daysDiff % (pattern.interval * 7) === 0;
    
    case 'monthly':
      // For monthly recurrence, we need to check if the day of month matches
      // and the month difference is a multiple of the interval
      const baseMonth = baseDate.getMonth();
      const baseYear = baseDate.getFullYear();
      const targetMonth = targetDate.getMonth();
      const targetYear = targetDate.getFullYear();
      
      const monthsDiff = (targetYear - baseYear) * 12 + (targetMonth - baseMonth);
      
      return monthsDiff % pattern.interval === 0 && 
             targetDate.getDate() === baseDate.getDate();
    
    case 'yearly':
      // For yearly recurrence, check if the date and month match
      // and the year difference is a multiple of the interval
      const yearsDiff = targetDate.getFullYear() - baseDate.getFullYear();
      
      return yearsDiff % pattern.interval === 0 &&
             targetDate.getMonth() === baseDate.getMonth() &&
             targetDate.getDate() === baseDate.getDate();
    
    default:
      return false;
  }
}

/**
 * Creates a series ID for managing recurring event groups
 */
export function generateSeriesId(): string {
  return `series_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
}

/**
 * Formats a recurrence pattern for display
 */
export function formatRecurrencePattern(pattern: RecurrencePattern): string {
  const { type, interval, endDate } = pattern;
  
  let description = '';
  
  if (interval === 1) {
    switch (type) {
      case 'daily':
        description = 'Daily';
        break;
      case 'weekly':
        description = 'Weekly';
        break;
      case 'monthly':
        description = 'Monthly';
        break;
      case 'yearly':
        description = 'Yearly';
        break;
    }
  } else {
    switch (type) {
      case 'daily':
        description = `Every ${interval} days`;
        break;
      case 'weekly':
        description = `Every ${interval} weeks`;
        break;
      case 'monthly':
        description = `Every ${interval} months`;
        break;
      case 'yearly':
        description = `Every ${interval} years`;
        break;
    }
  }
  
  if (endDate) {
    description += ` until ${endDate.toLocaleDateString()}`;
  }
  
  return description;
}