import { formatDateTime } from './dateUtils';

/**
 * Returns the raw build timestamp injected by Vite.
 */
export const getBuildTimestamp = (): string => {
  // __BUILD_TIME__ is injected by Vite's define plugin
  return typeof __BUILD_TIME__ !== 'undefined' ? __BUILD_TIME__ : new Date().toISOString();
};

/**
 * Returns the formatted build time based on the locale.
 */
export const getFormattedBuildTime = (locale: string = 'en-US'): string => {
  const timestamp = getBuildTimestamp();
  return formatDateTime(new Date(timestamp), locale);
};
