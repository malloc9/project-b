import { 
  Query, 
  QueryConstraint, 
  limit, 
  orderBy, 
  where, 
  startAfter, 
  QueryDocumentSnapshot,
  query
} from 'firebase/firestore';

/**
 * Pagination helper for Firestore queries
 */
export interface PaginationOptions {
  pageSize: number;
  lastDoc?: QueryDocumentSnapshot;
}

/**
 * Create optimized query with pagination
 */
export function createPaginatedQuery(
  baseQuery: Query,
  options: PaginationOptions,
  constraints: QueryConstraint[] = []
): Query {
  let finalQuery = query(baseQuery, ...constraints);

  if (options.lastDoc) {
    finalQuery = query(finalQuery, startAfter(options.lastDoc));
  }

  return query(finalQuery, limit(options.pageSize));
}

/**
 * Query optimization patterns
 */
export const QueryPatterns = {
  /**
   * Optimize queries for plant lists with filtering
   */
  plantsWithFilters: (userId: string, filters: {
    searchTerm?: string;
    hasPhotos?: boolean;
    hasTasks?: boolean;
  }) => {
    const constraints: QueryConstraint[] = [
      where('userId', '==', userId),
      orderBy('updatedAt', 'desc')
    ];

    // Note: For text search, we'd typically use a search service like Algolia
    // For now, we'll rely on client-side filtering for search terms
    
    if (filters.hasPhotos) {
      constraints.push(where('photoCount', '>', 0));
    }

    if (filters.hasTasks) {
      constraints.push(where('activeTaskCount', '>', 0));
    }

    return constraints;
  },

  /**
   * Optimize queries for project lists
   */
  projectsWithStatus: (userId: string, status?: string) => {
    const constraints: QueryConstraint[] = [
      where('userId', '==', userId),
      orderBy('updatedAt', 'desc')
    ];

    if (status && status !== 'all') {
      constraints.push(where('status', '==', status));
    }

    return constraints;
  },

  /**
   * Optimize queries for tasks by due date
   */
  tasksByDueDate: (userId: string, upcoming: boolean = false) => {
    const constraints: QueryConstraint[] = [
      where('userId', '==', userId)
    ];

    if (upcoming) {
      const now = new Date();
      const nextWeek = new Date(now.getTime() + 7 * 24 * 60 * 60 * 1000);
      constraints.push(
        where('dueDate', '>=', now),
        where('dueDate', '<=', nextWeek),
        orderBy('dueDate', 'asc')
      );
    } else {
      constraints.push(orderBy('dueDate', 'desc'));
    }

    return constraints;
  }
};

/**
 * Batch operation helper
 */
export interface BatchOperation<T> {
  type: 'create' | 'update' | 'delete';
  id: string;
  data?: T;
}

/**
 * Execute operations in batches to avoid Firestore limits
 */
export function createBatchOperations<T>(
  operations: BatchOperation<T>[],
  batchSize: number = 500
): BatchOperation<T>[][] {
  const batches: BatchOperation<T>[][] = [];
  
  for (let i = 0; i < operations.length; i += batchSize) {
    batches.push(operations.slice(i, i + batchSize));
  }
  
  return batches;
}

/**
 * Cache management for frequently accessed data
 */
export class QueryCache {
  private cache = new Map<string, { data: any; timestamp: number; ttl: number }>();

  set(key: string, data: any, ttlMs: number = 5 * 60 * 1000) {
    this.cache.set(key, {
      data,
      timestamp: Date.now(),
      ttl: ttlMs
    });
  }

  get(key: string): any | null {
    const cached = this.cache.get(key);
    
    if (!cached) {
      return null;
    }

    if (Date.now() - cached.timestamp > cached.ttl) {
      this.cache.delete(key);
      return null;
    }

    return cached.data;
  }

  clear() {
    this.cache.clear();
  }

  delete(key: string) {
    this.cache.delete(key);
  }
}

// Global cache instance
export const queryCache = new QueryCache();

/**
 * Debounce utility for search queries
 */
export function debounce<T extends (...args: any[]) => any>(
  func: T,
  wait: number
): (...args: Parameters<T>) => void {
  let timeout: NodeJS.Timeout;
  
  return (...args: Parameters<T>) => {
    clearTimeout(timeout);
    timeout = setTimeout(() => func(...args), wait);
  };
}

/**
 * Create cache key for queries
 */
export function createQueryCacheKey(
  collection: string,
  userId: string,
  filters: Record<string, any> = {}
): string {
  const filterString = Object.keys(filters)
    .sort()
    .map(key => `${key}:${filters[key]}`)
    .join('|');
  
  return `${collection}:${userId}:${filterString}`;
}