import { vi } from 'vitest';
import { 
  createPaginatedQuery, 
  QueryPatterns, 
  createBatchOperations, 
  QueryCache, 
  debounce, 
  createQueryCacheKey 
} from '../firestoreOptimization';

// Mock Firestore functions
const mockQuery = {
  withConverter: vi.fn().mockReturnThis(),
  startAfter: vi.fn().mockReturnThis(),
  limit: vi.fn().mockReturnThis(),
};

const mockConstraints = [
  { type: 'where' },
  { type: 'orderBy' },
];

describe('Firestore Optimization Utils', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe('createPaginatedQuery', () => {
    it('creates query with pagination', () => {
      const options = { pageSize: 10 };
      
      createPaginatedQuery(mockQuery as any, options);
      
      expect(mockQuery.limit).toHaveBeenCalledWith(10);
    });

    it('adds startAfter when lastDoc provided', () => {
      const mockDoc = { id: 'last-doc' } as any;
      const options = { pageSize: 10, lastDoc: mockDoc };
      
      createPaginatedQuery(mockQuery as any, options);
      
      expect(mockQuery.startAfter).toHaveBeenCalledWith(mockDoc);
      expect(mockQuery.limit).toHaveBeenCalledWith(10);
    });

    it('applies additional constraints', () => {
      const options = { pageSize: 10 };
      
      createPaginatedQuery(mockQuery as any, options, mockConstraints as any);
      
      expect(mockQuery.limit).toHaveBeenCalledWith(10);
    });
  });

  describe('QueryPatterns', () => {
    describe('plantsWithFilters', () => {
      it('creates basic constraints for user plants', () => {
        const constraints = QueryPatterns.plantsWithFilters('user123', {});
        
        expect(constraints).toHaveLength(2); // userId and orderBy
        expect(constraints[0]).toEqual(expect.objectContaining({
          type: 'where',
        }));
      });

      it('adds photo filter when specified', () => {
        const constraints = QueryPatterns.plantsWithFilters('user123', { hasPhotos: true });
        
        expect(constraints).toHaveLength(3); // userId, orderBy, photoCount
      });

      it('adds task filter when specified', () => {
        const constraints = QueryPatterns.plantsWithFilters('user123', { hasTasks: true });
        
        expect(constraints).toHaveLength(3); // userId, orderBy, activeTaskCount
      });

      it('adds both filters when specified', () => {
        const constraints = QueryPatterns.plantsWithFilters('user123', { 
          hasPhotos: true, 
          hasTasks: true 
        });
        
        expect(constraints).toHaveLength(4); // userId, orderBy, photoCount, activeTaskCount
      });
    });

    describe('projectsWithStatus', () => {
      it('creates basic constraints without status filter', () => {
        const constraints = QueryPatterns.projectsWithStatus('user123');
        
        expect(constraints).toHaveLength(2); // userId and orderBy
      });

      it('adds status filter when specified', () => {
        const constraints = QueryPatterns.projectsWithStatus('user123', 'in_progress');
        
        expect(constraints).toHaveLength(3); // userId, orderBy, status
      });

      it('ignores "all" status filter', () => {
        const constraints = QueryPatterns.projectsWithStatus('user123', 'all');
        
        expect(constraints).toHaveLength(2); // userId and orderBy only
      });
    });

    describe('tasksByDueDate', () => {
      it('creates basic constraints for all tasks', () => {
        const constraints = QueryPatterns.tasksByDueDate('user123', false);
        
        expect(constraints).toHaveLength(2); // userId and orderBy
      });

      it('adds date range for upcoming tasks', () => {
        const constraints = QueryPatterns.tasksByDueDate('user123', true);
        
        expect(constraints).toHaveLength(4); // userId, dueDate >=, dueDate <=, orderBy
      });
    });
  });

  describe('createBatchOperations', () => {
    it('splits operations into batches', () => {
      const operations = Array.from({ length: 1200 }, (_, i) => ({
        type: 'create' as const,
        id: `item-${i}`,
        data: { name: `Item ${i}` },
      }));

      const batches = createBatchOperations(operations, 500);
      
      expect(batches).toHaveLength(3); // 1200 / 500 = 2.4, rounded up to 3
      expect(batches[0]).toHaveLength(500);
      expect(batches[1]).toHaveLength(500);
      expect(batches[2]).toHaveLength(200);
    });

    it('handles single batch', () => {
      const operations = Array.from({ length: 100 }, (_, i) => ({
        type: 'update' as const,
        id: `item-${i}`,
        data: { name: `Updated Item ${i}` },
      }));

      const batches = createBatchOperations(operations, 500);
      
      expect(batches).toHaveLength(1);
      expect(batches[0]).toHaveLength(100);
    });

    it('handles empty operations', () => {
      const batches = createBatchOperations([], 500);
      
      expect(batches).toHaveLength(0);
    });
  });

  describe('QueryCache', () => {
    let cache: QueryCache;

    beforeEach(() => {
      cache = new QueryCache();
      vi.useFakeTimers();
    });

    afterEach(() => {
      vi.useRealTimers();
    });

    it('stores and retrieves data', () => {
      const data = { id: 1, name: 'Test' };
      
      cache.set('test-key', data);
      const retrieved = cache.get('test-key');
      
      expect(retrieved).toEqual(data);
    });

    it('returns null for non-existent key', () => {
      const result = cache.get('non-existent');
      expect(result).toBeNull();
    });

    it('expires data after TTL', () => {
      const data = { id: 1, name: 'Test' };
      
      cache.set('test-key', data, 1000); // 1 second TTL
      
      // Advance time beyond TTL
      vi.advanceTimersByTime(1001);
      
      const result = cache.get('test-key');
      expect(result).toBeNull();
    });

    it('clears all data', () => {
      cache.set('key1', 'data1');
      cache.set('key2', 'data2');
      
      cache.clear();
      
      expect(cache.get('key1')).toBeNull();
      expect(cache.get('key2')).toBeNull();
    });

    it('deletes specific key', () => {
      cache.set('key1', 'data1');
      cache.set('key2', 'data2');
      
      cache.delete('key1');
      
      expect(cache.get('key1')).toBeNull();
      expect(cache.get('key2')).toBe('data2');
    });
  });

  describe('debounce', () => {
    beforeEach(() => {
      vi.useFakeTimers();
    });

    afterEach(() => {
      vi.useRealTimers();
    });

    it('delays function execution', () => {
      const fn = vi.fn();
      const debouncedFn = debounce(fn, 1000);
      
      debouncedFn('arg1', 'arg2');
      
      expect(fn).not.toHaveBeenCalled();
      
      vi.advanceTimersByTime(1000);
      
      expect(fn).toHaveBeenCalledWith('arg1', 'arg2');
    });

    it('cancels previous calls', () => {
      const fn = vi.fn();
      const debouncedFn = debounce(fn, 1000);
      
      debouncedFn('first');
      vi.advanceTimersByTime(500);
      
      debouncedFn('second');
      vi.advanceTimersByTime(1000);
      
      expect(fn).toHaveBeenCalledTimes(1);
      expect(fn).toHaveBeenCalledWith('second');
    });
  });

  describe('createQueryCacheKey', () => {
    it('creates consistent cache keys', () => {
      const key1 = createQueryCacheKey('plants', 'user123', { status: 'active' });
      const key2 = createQueryCacheKey('plants', 'user123', { status: 'active' });
      
      expect(key1).toBe(key2);
    });

    it('creates different keys for different parameters', () => {
      const key1 = createQueryCacheKey('plants', 'user123', { status: 'active' });
      const key2 = createQueryCacheKey('plants', 'user123', { status: 'inactive' });
      
      expect(key1).not.toBe(key2);
    });

    it('sorts filter keys consistently', () => {
      const key1 = createQueryCacheKey('plants', 'user123', { b: 2, a: 1 });
      const key2 = createQueryCacheKey('plants', 'user123', { a: 1, b: 2 });
      
      expect(key1).toBe(key2);
    });

    it('handles empty filters', () => {
      const key = createQueryCacheKey('plants', 'user123');
      
      expect(key).toBe('plants:user123:');
    });
  });
});