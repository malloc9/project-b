/**
 * Utility functions for date formatting and manipulation
 */

/**
 * Format a date to a readable string with locale support
 */
export const formatDate = (date: Date, locale: string = "en-US"): string => {
  return new Intl.DateTimeFormat(locale, {
    year: "numeric",
    month: "short",
    day: "numeric",
  }).format(date);
};

/**
 * Format a date to include time with locale support
 */
export const formatDateTime = (
  date: Date,
  locale: string = "en-US"
): string => {
  const timeFormat = locale === "hu-HU" ? { hour12: false } : { hour12: true };

  return new Intl.DateTimeFormat(locale, {
    year: "numeric",
    month: "short",
    day: "numeric",
    hour: "2-digit",
    minute: "2-digit",
    ...timeFormat,
  }).format(date);
};

/**
 * Format a date for input fields (YYYY-MM-DD)
 */
export const formatDateForInput = (date: Date): string => {
  return date.toISOString().split("T")[0];
};

/**
 * Get relative time string with localization support
 * @param date - The date to compare
 * @param t - Translation function
 * @param locale - Locale for number formatting
 */
export const getRelativeTime = (
  date: Date,
  t?: (key: string, options?: any) => string,
  locale: string = "en-US"
): string => {
  const now = new Date();
  const diffInMs = date.getTime() - now.getTime();
  const diffInDays = Math.floor(diffInMs / (1000 * 60 * 60 * 24));
  const diffInHours = Math.floor(diffInMs / (1000 * 60 * 60));
  const diffInMinutes = Math.floor(diffInMs / (1000 * 60));

  // If translation function is not provided, fall back to English
  if (!t) {
    if (Math.abs(diffInDays) >= 1) {
      if (diffInDays > 0) {
        return `in ${diffInDays} day${diffInDays > 1 ? "s" : ""}`;
      } else {
        return `${Math.abs(diffInDays)} day${
          Math.abs(diffInDays) > 1 ? "s" : ""
        } ago`;
      }
    } else if (Math.abs(diffInHours) >= 1) {
      if (diffInHours > 0) {
        return `in ${diffInHours} hour${diffInHours > 1 ? "s" : ""}`;
      } else {
        return `${Math.abs(diffInHours)} hour${
          Math.abs(diffInHours) > 1 ? "s" : ""
        } ago`;
      }
    } else if (Math.abs(diffInMinutes) >= 1) {
      if (diffInMinutes > 0) {
        return `in ${diffInMinutes} minute${diffInMinutes > 1 ? "s" : ""}`;
      } else {
        return `${Math.abs(diffInMinutes)} minute${
          Math.abs(diffInMinutes) > 1 ? "s" : ""
        } ago`;
      }
    } else {
      return "just now";
    }
  }

  // Use translations when available
  if (Math.abs(diffInDays) >= 1) {
    const count = Math.abs(diffInDays);
    if (diffInDays > 0) {
      return t("calendar:relativeTime.inDays", {
        count,
        defaultValue: `in ${count} day${count > 1 ? "s" : ""}`,
      });
    } else {
      return t("calendar:relativeTime.daysAgo", {
        count,
        defaultValue: `${count} day${count > 1 ? "s" : ""} ago`,
      });
    }
  } else if (Math.abs(diffInHours) >= 1) {
    const count = Math.abs(diffInHours);
    if (diffInHours > 0) {
      return t("calendar:relativeTime.inHours", {
        count,
        defaultValue: `in ${count} hour${count > 1 ? "s" : ""}`,
      });
    } else {
      return t("calendar:relativeTime.hoursAgo", {
        count,
        defaultValue: `${count} hour${count > 1 ? "s" : ""} ago`,
      });
    }
  } else if (Math.abs(diffInMinutes) >= 1) {
    const count = Math.abs(diffInMinutes);
    if (diffInMinutes > 0) {
      return t("calendar:relativeTime.inMinutes", {
        count,
        defaultValue: `in ${count} minute${count > 1 ? "s" : ""}`,
      });
    } else {
      return t("calendar:relativeTime.minutesAgo", {
        count,
        defaultValue: `${count} minute${count > 1 ? "s" : ""} ago`,
      });
    }
  } else {
    return t("calendar:relativeTime.justNow", { defaultValue: "just now" });
  }
};

/**
 * Check if a date is today
 */
export const isToday = (date: Date): boolean => {
  const today = new Date();
  return date.toDateString() === today.toDateString();
};

/**
 * Check if a date is tomorrow
 */
export const isTomorrow = (date: Date): boolean => {
  const tomorrow = new Date();
  tomorrow.setDate(tomorrow.getDate() + 1);
  return date.toDateString() === tomorrow.toDateString();
};

/**
 * Check if a date is yesterday
 */
export const isYesterday = (date: Date): boolean => {
  const yesterday = new Date();
  yesterday.setDate(yesterday.getDate() - 1);
  return date.toDateString() === yesterday.toDateString();
};

/**
 * Check if a date is overdue (past current date)
 */
export const isOverdue = (date: Date): boolean => {
  const now = new Date();
  now.setHours(23, 59, 59, 999); // End of today
  return date < now;
};

/**
 * Get the start of day for a given date
 */
export const getStartOfDay = (date: Date): Date => {
  const startOfDay = new Date(date);
  startOfDay.setHours(0, 0, 0, 0);
  return startOfDay;
};

/**
 * Get the end of day for a given date
 */
export const getEndOfDay = (date: Date): Date => {
  const endOfDay = new Date(date);
  endOfDay.setHours(23, 59, 59, 999);
  return endOfDay;
};

/**
 * Add days to a date
 */
export const addDays = (date: Date, days: number): Date => {
  const result = new Date(date);
  result.setDate(result.getDate() + days);
  return result;
};

/**
 * Subtract days from a date
 */
export const subtractDays = (date: Date, days: number): Date => {
  return addDays(date, -days);
};

/**

 * Get days between two dates

 */

export const getDaysBetween = (startDate: Date, endDate: Date): number => {
  const diffInMs = endDate.getTime() - startDate.getTime();

  return Math.floor(diffInMs / (1000 * 60 * 60 * 24));
};

/**

 * Check if a given date falls within the next N days (inclusive of today).

 */

export const isWithinNextNDays = (date: Date, n: number): boolean => {
  const now = new Date(); // Capture current time once

  const nowStartOfDay = getStartOfDay(now);

  const targetStartOfDay = getStartOfDay(date);

  const endWindowStartOfDay = getStartOfDay(addDays(nowStartOfDay, n - 1));

  return (
    targetStartOfDay.getTime() >= nowStartOfDay.getTime() &&
    targetStartOfDay.getTime() <= endWindowStartOfDay.getTime()
  );
};

/**

 * Format date for display with relative context

 */

export const formatDateWithContext = (date: Date): string => {
  if (isToday(date)) {
    return "Today";
  } else if (isTomorrow(date)) {
    return "Tomorrow";
  } else if (isYesterday(date)) {
    return "Yesterday";
  } else {
    return formatDate(date);
  }
};
