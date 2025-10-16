import {
  collection,
  doc,
  getDocs,
  query,
  where,
  orderBy,
  limit,
  startAfter,
  QueryDocumentSnapshot,
  Timestamp,
} from "firebase/firestore";
import { db } from "../config/firebase";
import type { CalendarEvent } from "../types";
import { ErrorCode, createAppError } from "../types/errors";

// ============================================================================
// PERFORMANCE OPTIMIZATION UTILITIES
// ============================================================================

/**
 * Cache for storing frequently accessed calendar data
 */
class CalendarCache {
  private cache = new Map<string, { data: any; timestamp: number; ttl: number }>();
  private readonly DEFAULT_TTL = 5 * 60 * 1000; // 5 minutes

  set(key: string, data: any, ttl: number = this.DEFAULT_TTL): void {
    this.cache.set(key, {
      data,
      timestamp: Date.now(),
      ttl
    });
  }

  get(key: string): any | null {
    const entry = this.cache.get(key);
    if (!entry) return null;

    if (Date.now() - entry.timestamp > entry.ttl) {
      this.cache.delete(key);
      return null;
    }

    return entry.data;
  }

  clear(): void {
    this.cache.clear();
  }

  delete(key: string): void {
    this.cache.delete(key);
  }

  // Clear cache entries that match a pattern
  clearPattern(pattern: string): void {
    for (const key of this.cache.keys()) {
      if (key.includes(pattern)) {
        this.cache.delete(key);
      }
    }
  }
}

const calendarCache = new CalendarCache();

/**
 * Pagination cursor for efficient large dataset queries
 */
interface PaginationCursor {
  lastDoc?: QueryDocumentSnapshot;
  hasMore: boolean;
  pageSize: number;
}

/**
 * Paginated query result
 */
interface PaginatedResult<T> {
  data: T[];
  cursor: PaginationCursor;
  totalCount?: number;
}

/**
 * Memoized date range calculation
 */
const memoizedDateRanges = new Map<string, { start: Date; end: Date }>();

function getDateRangeKey(year: number, month: number): string {
  return `${year}-${month}`;
}

function getMemoizedMonthRange(year: number, month: number): { start: Date; end: Date } {
  const key = getDateRangeKey(year, month);
  
  if (memoizedDateRanges.has(key)) {
    return memoizedDateRanges.get(key)!;
  }

  const start = new Date(year, month, 1);
  const end = new Date(year, month + 1, 0, 23, 59, 59, 999);
  
  const range = { start, end };
  memoizedDateRanges.set(key, range);
  
  // Clean up old entries (keep only last 12 months)
  if (memoizedDateRanges.size > 12) {
    const oldestKey = memoizedDateRanges.keys().next().value;
    memoizedDateRanges.delete(oldestKey);
  }
  
  return range;
}

/**
 * Optimized calendar view range calculation
 */
function getCalendarViewRange(year: number, month: number): { start: Date; end: Date } {
  const key = `view-${year}-${month}`;
  
  if (memoizedDateRanges.has(key)) {
    return memoizedDateRanges.get(key)!;
  }

  // First day of the month
  const firstDay = new Date(year, month, 1);
  // Last day of the month
  const lastDay = new Date(year, month + 1, 0);
  
  // Start from the Sunday of the week containing the first day
  const start = new Date(firstDay);
  start.setDate(firstDay.getDate() - firstDay.getDay());
  start.setHours(0, 0, 0, 0);
  
  // End at the Saturday of the week containing the last day
  const end = new Date(lastDay);
  end.setDate(lastDay.getDate() + (6 - lastDay.getDay()));
  end.setHours(23, 59, 59, 999);
  
  const range = { start, end };
  memoizedDateRanges.set(key, range);
  
  return range;
}

// ============================================================================
// OPTIMIZED QUERY FUNCTIONS
// ============================================================================

/**
 * Get events for date range with pagination and caching
 */
export const getEventsForDateRangeOptimized = async (
  userId: string | undefined,
  startDate: Date,
  endDate: Date,
  pageSize: number = 50,
  cursor?: PaginationCursor
): Promise<PaginatedResult<CalendarEvent>> => {
  if (!userId) {
    throw createAppError(
      ErrorCode.DB_PERMISSION_DENIED,
      "Cannot get calendar events: User not authenticated."
    );
  }

  if (startDate > endDate) {
    throw createAppError(
      ErrorCode.VALIDATION_ERROR,
      "Start date must be before end date"
    );
  }

  // Create cache key
  const cacheKey = `events-${userId}-${startDate.getTime()}-${endDate.getTime()}-${pageSize}-${cursor?.lastDoc?.id || 'first'}`;
  
  // Check cache first
  const cached = calendarCache.get(cacheKey);
  if (cached) {
    return cached;
  }

  try {
    // Build optimized query
    let q = query(
      collection(db, "users", userId, "calendarEvents"),
      where("startDate", ">=", Timestamp.fromDate(startDate)),
      where("startDate", "<=", Timestamp.fromDate(endDate)),
      orderBy("startDate", "asc"),
      limit(pageSize)
    );

    // Add pagination cursor if provided
    if (cursor?.lastDoc) {
      q = query(q, startAfter(cursor.lastDoc));
    }

    const querySnapshot = await getDocs(q);
    const events: CalendarEvent[] = [];
    let lastDoc: QueryDocumentSnapshot | undefined;

    querySnapshot.forEach((doc) => {
      const data = doc.data();
      events.push({
        id: doc.id,
        ...data,
        createdAt: data.createdAt.toDate(),
        updatedAt: data.updatedAt.toDate(),
        startDate: data.startDate.toDate(),
        endDate: data.endDate.toDate(),
      } as CalendarEvent);
      lastDoc = doc;
    });

    const result: PaginatedResult<CalendarEvent> = {
      data: events,
      cursor: {
        lastDoc,
        hasMore: events.length === pageSize,
        pageSize
      }
    };

    // Cache the result
    calendarCache.set(cacheKey, result, 2 * 60 * 1000); // 2 minutes TTL for paginated results

    return result;
  } catch (error) {
    console.error("Error getting events for date range:", error);
    throw createAppError(
      ErrorCode.DB_NETWORK_ERROR,
      "Failed to get events for date range"
    );
  }
};

/**
 * Get events for a specific month with optimized caching
 */
export const getEventsForMonthOptimized = async (
  userId: string | undefined,
  year: number,
  month: number
): Promise<CalendarEvent[]> => {
  if (!userId) {
    throw createAppError(
      ErrorCode.DB_PERMISSION_DENIED,
      "Cannot get calendar events: User not authenticated."
    );
  }

  // Create cache key for the month
  const cacheKey = `month-${userId}-${year}-${month}`;
  
  // Check cache first
  const cached = calendarCache.get(cacheKey);
  if (cached) {
    return cached;
  }

  try {
    const { start, end } = getMemoizedMonthRange(year, month);
    
    const q = query(
      collection(db, "users", userId, "calendarEvents"),
      where("startDate", ">=", Timestamp.fromDate(start)),
      where("startDate", "<=", Timestamp.fromDate(end)),
      orderBy("startDate", "asc")
    );

    const querySnapshot = await getDocs(q);
    const events: CalendarEvent[] = [];

    querySnapshot.forEach((doc) => {
      const data = doc.data();
      events.push({
        id: doc.id,
        ...data,
        createdAt: data.createdAt.toDate(),
        updatedAt: data.updatedAt.toDate(),
        startDate: data.startDate.toDate(),
        endDate: data.endDate.toDate(),
      } as CalendarEvent);
    });

    // Cache the result for 5 minutes
    calendarCache.set(cacheKey, events, 5 * 60 * 1000);

    return events;
  } catch (error) {
    console.error("Error getting events for month:", error);
    throw createAppError(
      ErrorCode.DB_NETWORK_ERROR,
      "Failed to get events for month"
    );
  }
};

/**
 * Get events for calendar view (includes adjacent month days) with caching
 */
export const getEventsForCalendarViewOptimized = async (
  userId: string | undefined,
  year: number,
  month: number
): Promise<CalendarEvent[]> => {
  if (!userId) {
    throw createAppError(
      ErrorCode.DB_PERMISSION_DENIED,
      "Cannot get calendar events: User not authenticated."
    );
  }

  // Create cache key for the calendar view
  const cacheKey = `calendar-view-${userId}-${year}-${month}`;
  
  // Check cache first
  const cached = calendarCache.get(cacheKey);
  if (cached) {
    return cached;
  }

  try {
    const { start, end } = getCalendarViewRange(year, month);
    
    const q = query(
      collection(db, "users", userId, "calendarEvents"),
      where("startDate", ">=", Timestamp.fromDate(start)),
      where("startDate", "<=", Timestamp.fromDate(end)),
      orderBy("startDate", "asc")
    );

    const querySnapshot = await getDocs(q);
    const events: CalendarEvent[] = [];

    querySnapshot.forEach((doc) => {
      const data = doc.data();
      events.push({
        id: doc.id,
        ...data,
        createdAt: data.createdAt.toDate(),
        updatedAt: data.updatedAt.toDate(),
        startDate: data.startDate.toDate(),
        endDate: data.endDate.toDate(),
      } as CalendarEvent);
    });

    // Cache the result for 3 minutes (shorter TTL for view data)
    calendarCache.set(cacheKey, events, 3 * 60 * 1000);

    return events;
  } catch (error) {
    console.error("Error getting events for calendar view:", error);
    throw createAppError(
      ErrorCode.DB_NETWORK_ERROR,
      "Failed to get events for calendar view"
    );
  }
};

/**
 * Prefetch events for adjacent months to improve navigation performance
 */
export const prefetchAdjacentMonths = async (
  userId: string | undefined,
  currentYear: number,
  currentMonth: number
): Promise<void> => {
  if (!userId) return;

  try {
    // Calculate previous and next month
    const prevMonth = currentMonth === 0 ? 11 : currentMonth - 1;
    const prevYear = currentMonth === 0 ? currentYear - 1 : currentYear;
    const nextMonth = currentMonth === 11 ? 0 : currentMonth + 1;
    const nextYear = currentMonth === 11 ? currentYear + 1 : currentYear;

    // Prefetch in parallel (fire and forget)
    Promise.all([
      getEventsForCalendarViewOptimized(userId, prevYear, prevMonth),
      getEventsForCalendarViewOptimized(userId, nextYear, nextMonth)
    ]).catch(error => {
      console.warn("Error prefetching adjacent months:", error);
    });
  } catch (error) {
    console.warn("Error in prefetch setup:", error);
  }
};

// ============================================================================
// CACHE MANAGEMENT FUNCTIONS
// ============================================================================

/**
 * Invalidate cache when events are modified
 */
export const invalidateEventCache = (userId: string, eventDate?: Date): void => {
  if (eventDate) {
    // Invalidate specific month cache
    const year = eventDate.getFullYear();
    const month = eventDate.getMonth();
    calendarCache.delete(`month-${userId}-${year}-${month}`);
    calendarCache.delete(`calendar-view-${userId}-${year}-${month}`);
    
    // Also invalidate adjacent months in case of multi-day events
    const prevMonth = month === 0 ? 11 : month - 1;
    const prevYear = month === 0 ? year - 1 : year;
    const nextMonth = month === 11 ? 0 : month + 1;
    const nextYear = month === 11 ? year + 1 : year;
    
    calendarCache.delete(`month-${userId}-${prevYear}-${prevMonth}`);
    calendarCache.delete(`calendar-view-${userId}-${prevYear}-${prevMonth}`);
    calendarCache.delete(`month-${userId}-${nextYear}-${nextMonth}`);
    calendarCache.delete(`calendar-view-${userId}-${nextYear}-${nextMonth}`);
  } else {
    // Invalidate all cache entries for this user
    calendarCache.clearPattern(userId);
  }
};

/**
 * Clear all calendar cache
 */
export const clearCalendarCache = (): void => {
  calendarCache.clear();
};

/**
 * Get cache statistics for debugging
 */
export const getCacheStats = (): { size: number; keys: string[] } => {
  const keys: string[] = [];
  for (const key of calendarCache['cache'].keys()) {
    keys.push(key);
  }
  return {
    size: calendarCache['cache'].size,
    keys
  };
};

// ============================================================================
// BATCH OPERATIONS FOR PERFORMANCE
// ============================================================================

/**
 * Batch load events for multiple months
 */
export const batchLoadMonths = async (
  userId: string | undefined,
  monthSpecs: Array<{ year: number; month: number }>
): Promise<Map<string, CalendarEvent[]>> => {
  if (!userId) {
    throw createAppError(
      ErrorCode.DB_PERMISSION_DENIED,
      "Cannot batch load events: User not authenticated."
    );
  }

  const results = new Map<string, CalendarEvent[]>();
  
  // Load all months in parallel
  const promises = monthSpecs.map(async ({ year, month }) => {
    const key = getDateRangeKey(year, month);
    try {
      const events = await getEventsForMonthOptimized(userId, year, month);
      results.set(key, events);
    } catch (error) {
      console.error(`Error loading events for ${year}-${month}:`, error);
      results.set(key, []); // Set empty array on error
    }
  });

  await Promise.all(promises);
  return results;
};

// ============================================================================
// PERFORMANCE MONITORING
// ============================================================================

interface PerformanceMetrics {
  queryTime: number;
  cacheHits: number;
  cacheMisses: number;
  totalQueries: number;
}

class PerformanceMonitor {
  private metrics: PerformanceMetrics = {
    queryTime: 0,
    cacheHits: 0,
    cacheMisses: 0,
    totalQueries: 0
  };

  recordCacheHit(): void {
    this.metrics.cacheHits++;
  }

  recordCacheMiss(): void {
    this.metrics.cacheMisses++;
  }

  recordQuery(duration: number): void {
    this.metrics.totalQueries++;
    this.metrics.queryTime += duration;
  }

  getMetrics(): PerformanceMetrics & { avgQueryTime: number; cacheHitRate: number } {
    const totalCacheAccess = this.metrics.cacheHits + this.metrics.cacheMisses;
    return {
      ...this.metrics,
      avgQueryTime: this.metrics.totalQueries > 0 ? this.metrics.queryTime / this.metrics.totalQueries : 0,
      cacheHitRate: totalCacheAccess > 0 ? this.metrics.cacheHits / totalCacheAccess : 0
    };
  }

  reset(): void {
    this.metrics = {
      queryTime: 0,
      cacheHits: 0,
      cacheMisses: 0,
      totalQueries: 0
    };
  }
}

export const performanceMonitor = new PerformanceMonitor();