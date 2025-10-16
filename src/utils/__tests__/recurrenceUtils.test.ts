import { describe, it, expect } from 'vitest';
import {
  validateRecurrencePattern,
  calculateNextOccurrence,
  generateOccurrencesInRange,
  calculateTotalOccurrences,
  isDateInRecurrence,
  generateSeriesId,
  formatRecurrencePattern
} from '../recurrenceUtils';
import { RecurrencePattern } from '../../types';

describe('recurrenceUtils', () => {
  describe('validateRecurrencePattern', () => {
    it('should validate a correct daily pattern', () => {
      const pattern: RecurrencePattern = {
        type: 'daily',
        interval: 1
      };
      
      const result = validateRecurrencePattern(pattern);
      expect(result.isValid).toBe(true);
      expect(result.errors).toHaveLength(0);
    });

    it('should validate a correct weekly pattern with end date', () => {
      const futureDate = new Date();
      futureDate.setMonth(futureDate.getMonth() + 1);
      
      const pattern: RecurrencePattern = {
        type: 'weekly',
        interval: 2,
        endDate: futureDate
      };
      
      const result = validateRecurrencePattern(pattern);
      expect(result.isValid).toBe(true);
      expect(result.errors).toHaveLength(0);
    });

    it('should reject invalid recurrence type', () => {
      const pattern = {
        type: 'invalid' as any,
        interval: 1
      };
      
      const result = validateRecurrencePattern(pattern);
      expect(result.isValid).toBe(false);
      expect(result.errors).toHaveLength(1);
      expect(result.errors[0].field).toBe('type');
    });

    it('should reject non-integer interval', () => {
      const pattern: RecurrencePattern = {
        type: 'daily',
        interval: 1.5
      };
      
      const result = validateRecurrencePattern(pattern);
      expect(result.isValid).toBe(false);
      expect(result.errors).toHaveLength(1);
      expect(result.errors[0].field).toBe('interval');
    });

    it('should reject zero or negative interval', () => {
      const pattern: RecurrencePattern = {
        type: 'daily',
        interval: 0
      };
      
      const result = validateRecurrencePattern(pattern);
      expect(result.isValid).toBe(false);
      expect(result.errors).toHaveLength(1);
      expect(result.errors[0].field).toBe('interval');
    });

    it('should reject interval greater than 365', () => {
      const pattern: RecurrencePattern = {
        type: 'daily',
        interval: 400
      };
      
      const result = validateRecurrencePattern(pattern);
      expect(result.isValid).toBe(false);
      expect(result.errors).toHaveLength(1);
      expect(result.errors[0].field).toBe('interval');
    });

    it('should reject past end date', () => {
      const pastDate = new Date();
      pastDate.setMonth(pastDate.getMonth() - 1);
      
      const pattern: RecurrencePattern = {
        type: 'daily',
        interval: 1,
        endDate: pastDate
      };
      
      const result = validateRecurrencePattern(pattern);
      expect(result.isValid).toBe(false);
      expect(result.errors).toHaveLength(1);
      expect(result.errors[0].field).toBe('endDate');
    });

    it('should return multiple errors for multiple invalid fields', () => {
      const pastDate = new Date();
      pastDate.setMonth(pastDate.getMonth() - 1);
      
      const pattern = {
        type: 'invalid' as any,
        interval: -1,
        endDate: pastDate
      };
      
      const result = validateRecurrencePattern(pattern);
      expect(result.isValid).toBe(false);
      expect(result.errors).toHaveLength(3);
    });
  });

  describe('calculateNextOccurrence', () => {
    const baseDate = new Date('2024-01-01T10:00:00Z');

    it('should calculate next daily occurrence', () => {
      const pattern: RecurrencePattern = {
        type: 'daily',
        interval: 1
      };
      
      const nextDate = calculateNextOccurrence(baseDate, pattern);
      expect(nextDate).toEqual(new Date('2024-01-02T10:00:00Z'));
    });

    it('should calculate next weekly occurrence', () => {
      const pattern: RecurrencePattern = {
        type: 'weekly',
        interval: 2
      };
      
      const nextDate = calculateNextOccurrence(baseDate, pattern);
      expect(nextDate).toEqual(new Date('2024-01-15T10:00:00Z'));
    });

    it('should calculate next monthly occurrence', () => {
      const pattern: RecurrencePattern = {
        type: 'monthly',
        interval: 1
      };
      
      const nextDate = calculateNextOccurrence(baseDate, pattern);
      expect(nextDate).toEqual(new Date('2024-02-01T10:00:00Z'));
    });

    it('should calculate next yearly occurrence', () => {
      const pattern: RecurrencePattern = {
        type: 'yearly',
        interval: 1
      };
      
      const nextDate = calculateNextOccurrence(baseDate, pattern);
      expect(nextDate).toEqual(new Date('2025-01-01T10:00:00Z'));
    });

    it('should return null when end date is reached', () => {
      const endDate = new Date('2024-01-01T10:00:00Z');
      const pattern: RecurrencePattern = {
        type: 'daily',
        interval: 1,
        endDate
      };
      
      const nextDate = calculateNextOccurrence(baseDate, pattern, baseDate);
      expect(nextDate).toBeNull();
    });

    it('should return null when calculated date exceeds end date', () => {
      const endDate = new Date('2024-01-01T23:59:59Z');
      const pattern: RecurrencePattern = {
        type: 'daily',
        interval: 1,
        endDate
      };
      
      const nextDate = calculateNextOccurrence(baseDate, pattern);
      expect(nextDate).toBeNull();
    });

    it('should calculate from current occurrence when provided', () => {
      const pattern: RecurrencePattern = {
        type: 'daily',
        interval: 3
      };
      
      const currentOccurrence = new Date('2024-01-04T10:00:00Z');
      const nextDate = calculateNextOccurrence(baseDate, pattern, currentOccurrence);
      expect(nextDate).toEqual(new Date('2024-01-07T10:00:00Z'));
    });
  });

  describe('generateOccurrencesInRange', () => {
    const baseDate = new Date('2024-01-01T10:00:00Z');
    const rangeStart = new Date('2024-01-01T00:00:00Z');
    const rangeEnd = new Date('2024-01-31T23:59:59Z');

    it('should generate daily occurrences in range', () => {
      const pattern: RecurrencePattern = {
        type: 'daily',
        interval: 7
      };
      
      const occurrences = generateOccurrencesInRange(baseDate, pattern, rangeStart, rangeEnd);
      expect(occurrences).toHaveLength(5); // Jan 1, 8, 15, 22, 29
      expect(occurrences[0]).toEqual(baseDate);
      expect(occurrences[1]).toEqual(new Date('2024-01-08T10:00:00Z'));
    });

    it('should generate weekly occurrences in range', () => {
      const pattern: RecurrencePattern = {
        type: 'weekly',
        interval: 2
      };
      
      const occurrences = generateOccurrencesInRange(baseDate, pattern, rangeStart, rangeEnd);
      expect(occurrences).toHaveLength(3); // Jan 1, 15, 29
    });

    it('should respect end date in pattern', () => {
      const endDate = new Date('2024-01-15T10:00:00Z');
      const pattern: RecurrencePattern = {
        type: 'daily',
        interval: 7,
        endDate
      };
      
      const occurrences = generateOccurrencesInRange(baseDate, pattern, rangeStart, rangeEnd);
      expect(occurrences).toHaveLength(3); // Jan 1, 8, 15
    });

    it('should not include base date if outside range', () => {
      const laterRangeStart = new Date('2024-01-10T00:00:00Z');
      const pattern: RecurrencePattern = {
        type: 'daily',
        interval: 7
      };
      
      const occurrences = generateOccurrencesInRange(baseDate, pattern, laterRangeStart, rangeEnd);
      expect(occurrences).toHaveLength(3); // Jan 15, 22, 29 (not Jan 1, 8)
    });

    it('should respect max occurrences limit', () => {
      const pattern: RecurrencePattern = {
        type: 'daily',
        interval: 1
      };
      
      const occurrences = generateOccurrencesInRange(baseDate, pattern, rangeStart, rangeEnd, 5);
      expect(occurrences).toHaveLength(5);
    });
  });

  describe('calculateTotalOccurrences', () => {
    const baseDate = new Date('2024-01-01T10:00:00Z');

    it('should return Infinity for patterns without end date', () => {
      const pattern: RecurrencePattern = {
        type: 'daily',
        interval: 1
      };
      
      const total = calculateTotalOccurrences(baseDate, pattern);
      expect(total).toBe(Infinity);
    });

    it('should calculate total occurrences with end date', () => {
      const endDate = new Date('2024-01-08T10:00:00Z');
      const pattern: RecurrencePattern = {
        type: 'daily',
        interval: 1,
        endDate
      };
      
      const total = calculateTotalOccurrences(baseDate, pattern);
      expect(total).toBe(8); // Jan 1-8 inclusive
    });

    it('should calculate total occurrences with max calculation date', () => {
      const maxDate = new Date('2024-01-15T10:00:00Z');
      const pattern: RecurrencePattern = {
        type: 'daily',
        interval: 2
      };
      
      const total = calculateTotalOccurrences(baseDate, pattern, maxDate);
      expect(total).toBe(8); // Jan 1, 3, 5, 7, 9, 11, 13, 15
    });
  });

  describe('isDateInRecurrence', () => {
    const baseDate = new Date('2024-01-01T10:00:00Z');

    it('should return true for base date', () => {
      const pattern: RecurrencePattern = {
        type: 'daily',
        interval: 1
      };
      
      const result = isDateInRecurrence(baseDate, baseDate, pattern);
      expect(result).toBe(true);
    });

    it('should return false for date before base date', () => {
      const pattern: RecurrencePattern = {
        type: 'daily',
        interval: 1
      };
      
      const beforeDate = new Date('2023-12-31T10:00:00Z');
      const result = isDateInRecurrence(beforeDate, baseDate, pattern);
      expect(result).toBe(false);
    });

    it('should return false for date after end date', () => {
      const endDate = new Date('2024-01-05T10:00:00Z');
      const pattern: RecurrencePattern = {
        type: 'daily',
        interval: 1,
        endDate
      };
      
      const afterDate = new Date('2024-01-10T10:00:00Z');
      const result = isDateInRecurrence(afterDate, baseDate, pattern);
      expect(result).toBe(false);
    });

    it('should correctly identify daily recurrence matches', () => {
      const pattern: RecurrencePattern = {
        type: 'daily',
        interval: 3
      };
      
      const matchDate = new Date('2024-01-04T10:00:00Z'); // 3 days after base
      const nonMatchDate = new Date('2024-01-03T10:00:00Z'); // 2 days after base
      
      expect(isDateInRecurrence(matchDate, baseDate, pattern)).toBe(true);
      expect(isDateInRecurrence(nonMatchDate, baseDate, pattern)).toBe(false);
    });

    it('should correctly identify weekly recurrence matches', () => {
      const pattern: RecurrencePattern = {
        type: 'weekly',
        interval: 2
      };
      
      const matchDate = new Date('2024-01-15T10:00:00Z'); // 2 weeks after base
      const nonMatchDate = new Date('2024-01-08T10:00:00Z'); // 1 week after base
      
      expect(isDateInRecurrence(matchDate, baseDate, pattern)).toBe(true);
      expect(isDateInRecurrence(nonMatchDate, baseDate, pattern)).toBe(false);
    });

    it('should correctly identify monthly recurrence matches', () => {
      const pattern: RecurrencePattern = {
        type: 'monthly',
        interval: 1
      };
      
      const matchDate = new Date('2024-02-01T10:00:00Z'); // Same day, next month
      const nonMatchDate = new Date('2024-02-02T10:00:00Z'); // Different day, next month
      
      expect(isDateInRecurrence(matchDate, baseDate, pattern)).toBe(true);
      expect(isDateInRecurrence(nonMatchDate, baseDate, pattern)).toBe(false);
    });

    it('should correctly identify yearly recurrence matches', () => {
      const pattern: RecurrencePattern = {
        type: 'yearly',
        interval: 1
      };
      
      const matchDate = new Date('2025-01-01T10:00:00Z'); // Same date, next year
      const nonMatchDate = new Date('2025-01-02T10:00:00Z'); // Different date, next year
      
      expect(isDateInRecurrence(matchDate, baseDate, pattern)).toBe(true);
      expect(isDateInRecurrence(nonMatchDate, baseDate, pattern)).toBe(false);
    });
  });

  describe('generateSeriesId', () => {
    it('should generate unique series IDs', () => {
      const id1 = generateSeriesId();
      const id2 = generateSeriesId();
      
      expect(id1).not.toBe(id2);
      expect(id1).toMatch(/^series_\d+_[a-z0-9]+$/);
      expect(id2).toMatch(/^series_\d+_[a-z0-9]+$/);
    });
  });

  describe('formatRecurrencePattern', () => {
    it('should format daily pattern with interval 1', () => {
      const pattern: RecurrencePattern = {
        type: 'daily',
        interval: 1
      };
      
      const formatted = formatRecurrencePattern(pattern);
      expect(formatted).toBe('Daily');
    });

    it('should format weekly pattern with interval > 1', () => {
      const pattern: RecurrencePattern = {
        type: 'weekly',
        interval: 2
      };
      
      const formatted = formatRecurrencePattern(pattern);
      expect(formatted).toBe('Every 2 weeks');
    });

    it('should format monthly pattern with end date', () => {
      const endDate = new Date('2024-12-31');
      const pattern: RecurrencePattern = {
        type: 'monthly',
        interval: 1,
        endDate
      };
      
      const formatted = formatRecurrencePattern(pattern);
      expect(formatted).toBe(`Monthly until ${endDate.toLocaleDateString()}`);
    });

    it('should format yearly pattern with interval and end date', () => {
      const endDate = new Date('2030-01-01');
      const pattern: RecurrencePattern = {
        type: 'yearly',
        interval: 2,
        endDate
      };
      
      const formatted = formatRecurrencePattern(pattern);
      expect(formatted).toBe(`Every 2 years until ${endDate.toLocaleDateString()}`);
    });
  });
});