import { describe, it, expect } from 'vitest';
import { getBuildTimestamp, getFormattedBuildTime } from '../buildInfo';
import { formatDateTime } from '../dateUtils';

describe('buildInfo utility', () => {
  it('should return the build timestamp', () => {
    // In vitest.config.ts we defined __BUILD_TIME__ as '2026-01-11T14:30:00Z'
    expect(getBuildTimestamp()).toBe('2026-01-11T14:30:00Z');
  });

  it('should return the formatted build time', () => {
    const timestamp = '2026-01-11T14:30:00Z';
    const expected = formatDateTime(new Date(timestamp));
    expect(getFormattedBuildTime()).toBe(expected);
  });
});
