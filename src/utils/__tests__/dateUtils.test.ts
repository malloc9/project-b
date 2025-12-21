import {
  isWithinNextNDays,
  getStartOfDay,
  addDays
} from '../dateUtils';
import { vi } from 'vitest';

describe('isWithinNextNDays', () => {
  const realDate = Date;

  beforeAll(() => {
    // Mock the system time for consistent test results
    vi.useFakeTimers();
  });

  afterEach(() => {
    vi.runOnlyPendingTimers();
    vi.setSystemTime(vi.getRealSystemTime()); // Reset to real time after each test
  });

  afterAll(() => {
    vi.useRealTimers(); // Restore real timers
  });


  it('should return true for a date that is today', () => {
    const today = getStartOfDay(new realDate('2025-01-15T12:00:00.000Z'));
    vi.setSystemTime(today);
    expect(isWithinNextNDays(today, 7)).toBe(true);
  });

  it('should return true for a date that is within N days in the future', () => {
    const today = getStartOfDay(new realDate('2025-01-15T12:00:00.000Z'));
    vi.setSystemTime(today);
    const futureDate = addDays(today, 3); // 3 days from today
    expect(isWithinNextNDays(futureDate, 7)).toBe(true);
  });

  it('should return true for a date that is exactly N-1 days from today', () => {
    const today = getStartOfDay(new realDate('2025-01-15T12:00:00.000Z'));
    vi.setSystemTime(today);
    const boundaryDate = addDays(today, 6); // 7th day, inclusive
    expect(isWithinNextNDays(boundaryDate, 7)).toBe(true);
  });

  it('should return false for a date that is beyond N days in the future', () => {
    const today = getStartOfDay(new realDate('2025-01-15T12:00:00.000Z'));
    vi.setSystemTime(today);
    const farFutureDate = addDays(today, 7); // 8th day, beyond 7-day window
    expect(isWithinNextNDays(farFutureDate, 7)).toBe(false);
  });

  it('should return false for a date in the past', () => {
    const today = getStartOfDay(new realDate('2025-01-15T12:00:00.000Z'));
    vi.setSystemTime(today);
    const pastDate = addDays(today, -2); // 2 days ago
    expect(isWithinNextNDays(pastDate, 7)).toBe(false);
  });

  it('should handle N=1 (only today)', () => {
    const today = getStartOfDay(new realDate('2025-01-15T12:00:00.000Z'));
    vi.setSystemTime(today);
    const tomorrow = addDays(today, 1);
    expect(isWithinNextNDays(today, 1)).toBe(true);
    expect(isWithinNextNDays(tomorrow, 1)).toBe(false);
  });

  it('should return false for an invalid date', () => {
    const today = getStartOfDay(new realDate('2025-01-15T12:00:00.000Z'));
    vi.setSystemTime(today);
    const invalidDate = new realDate('not a date');
    expect(isWithinNextNDays(invalidDate, 7)).toBe(false);
  });

  it('should be true for a date on the edge of the range at the end of the day', () => {
    const today = getStartOfDay(new realDate('2025-01-15T12:00:00.000Z'));
    vi.setSystemTime(today);
    const endOfRangeDate = new realDate(2025, 0, 21); // Jan 21, 00:00:00 local time
    expect(isWithinNextNDays(endOfRangeDate, 7)).toBe(true);
  });

  it('should be false for a date just after the end of the range', () => {
    const today = getStartOfDay(new realDate('2025-01-15T12:00:00.000Z'));
    vi.setSystemTime(today);
    const justAfterRangeDate = new realDate('2025-01-22T00:00:00.000Z'); // 8 days from MOCK_DATE
    expect(isWithinNextNDays(justAfterRangeDate, 7)).toBe(false);
  });
});