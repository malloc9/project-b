import { ErrorCode } from '../types/errors';

export interface CalendarError {
  code: string;
  message: string;
  retryable: boolean;
  retryAfter?: number; // seconds
}

export interface RetryOptions {
  maxRetries: number;
  baseDelay: number; // milliseconds
  maxDelay: number; // milliseconds
  backoffFactor: number;
}

const DEFAULT_RETRY_OPTIONS: RetryOptions = {
  maxRetries: 3,
  baseDelay: 1000,
  maxDelay: 30000,
  backoffFactor: 2,
};

/**
 * Parse calendar API errors and determine retry strategy
 */
export function parseCalendarError(error: any): CalendarError {
  // Handle Firebase Functions errors
  if (error?.code) {
    switch (error.code) {
      case 'functions/unauthenticated':
        return {
          code: ErrorCode.CALENDAR_AUTH_ERROR,
          message: 'Calendar authentication required. Please reconnect your Google Calendar.',
          retryable: false,
        };
      
      case 'functions/permission-denied':
        return {
          code: ErrorCode.CALENDAR_AUTH_ERROR,
          message: 'Permission denied. Please check your calendar permissions.',
          retryable: false,
        };
      
      case 'functions/resource-exhausted':
        return {
          code: ErrorCode.CALENDAR_QUOTA_EXCEEDED,
          message: 'Calendar API quota exceeded. Please try again later.',
          retryable: true,
          retryAfter: 3600, // 1 hour
        };
      
      case 'functions/deadline-exceeded':
      case 'functions/unavailable':
        return {
          code: ErrorCode.CALENDAR_NETWORK_ERROR,
          message: 'Calendar service temporarily unavailable. Please try again.',
          retryable: true,
          retryAfter: 60, // 1 minute
        };
      
      case 'functions/invalid-argument':
        return {
          code: ErrorCode.CALENDAR_INVALID_EVENT,
          message: 'Invalid calendar event data. Please check your input.',
          retryable: false,
        };
      
      default:
        return {
          code: ErrorCode.CALENDAR_NETWORK_ERROR,
          message: error.message || 'Unknown calendar error occurred.',
          retryable: true,
        };
    }
  }

  // Handle Google Calendar API errors
  if (error?.status) {
    switch (error.status) {
      case 401:
        return {
          code: ErrorCode.CALENDAR_AUTH_ERROR,
          message: 'Calendar authentication expired. Please reconnect your Google Calendar.',
          retryable: false,
        };
      
      case 403:
        if (error.message?.includes('quota')) {
          return {
            code: ErrorCode.CALENDAR_QUOTA_EXCEEDED,
            message: 'Calendar API quota exceeded. Please try again later.',
            retryable: true,
            retryAfter: 3600,
          };
        }
        return {
          code: ErrorCode.CALENDAR_AUTH_ERROR,
          message: 'Calendar access forbidden. Please check your permissions.',
          retryable: false,
        };
      
      case 404:
        return {
          code: ErrorCode.CALENDAR_INVALID_EVENT,
          message: 'Calendar event not found. It may have been deleted.',
          retryable: false,
        };
      
      case 409:
        return {
          code: ErrorCode.CALENDAR_INVALID_EVENT,
          message: 'Calendar event conflict. Please try again with different data.',
          retryable: false,
        };
      
      case 429:
        return {
          code: ErrorCode.CALENDAR_QUOTA_EXCEEDED,
          message: 'Too many calendar requests. Please try again later.',
          retryable: true,
          retryAfter: parseInt(error.headers?.['retry-after']) || 60,
        };
      
      case 500:
      case 502:
      case 503:
      case 504:
        return {
          code: ErrorCode.CALENDAR_NETWORK_ERROR,
          message: 'Calendar service temporarily unavailable. Please try again.',
          retryable: true,
          retryAfter: 60,
        };
      
      default:
        return {
          code: ErrorCode.CALENDAR_NETWORK_ERROR,
          message: error.message || 'Unknown calendar error occurred.',
          retryable: true,
        };
    }
  }

  // Handle network errors
  if (error?.name === 'NetworkError' || error?.code === 'NETWORK_ERROR') {
    return {
      code: ErrorCode.CALENDAR_NETWORK_ERROR,
      message: 'Network error occurred. Please check your connection and try again.',
      retryable: true,
    };
  }

  // Default error
  return {
    code: ErrorCode.CALENDAR_NETWORK_ERROR,
    message: error?.message || 'Unknown calendar error occurred.',
    retryable: true,
  };
}

/**
 * Calculate delay for exponential backoff
 */
function calculateDelay(attempt: number, options: RetryOptions): number {
  const delay = options.baseDelay * Math.pow(options.backoffFactor, attempt - 1);
  return Math.min(delay, options.maxDelay);
}

/**
 * Sleep for specified milliseconds
 */
function sleep(ms: number): Promise<void> {
  return new Promise(resolve => setTimeout(resolve, ms));
}

/**
 * Retry a calendar operation with exponential backoff
 */
export async function retryCalendarOperation<T>(
  operation: () => Promise<T>,
  options: Partial<RetryOptions> = {}
): Promise<T> {
  const retryOptions = { ...DEFAULT_RETRY_OPTIONS, ...options };
  let lastError: any;

  for (let attempt = 1; attempt <= retryOptions.maxRetries + 1; attempt++) {
    try {
      return await operation();
    } catch (error) {
      lastError = error;
      
      const calendarError = parseCalendarError(error);
      
      // Don't retry if error is not retryable
      if (!calendarError.retryable) {
        throw error;
      }
      
      // Don't retry if we've exhausted attempts
      if (attempt > retryOptions.maxRetries) {
        throw error;
      }
      
      // Calculate delay
      let delay: number;
      if (calendarError.retryAfter) {
        delay = calendarError.retryAfter * 1000; // Convert to milliseconds
      } else {
        delay = calculateDelay(attempt, retryOptions);
      }
      
      console.warn(`Calendar operation failed (attempt ${attempt}/${retryOptions.maxRetries + 1}). Retrying in ${delay}ms...`, error);
      
      await sleep(delay);
    }
  }

  throw lastError;
}

/**
 * Wrapper for calendar operations with automatic retry and error handling
 */
export async function executeCalendarOperation<T>(
  operation: () => Promise<T>,
  operationName: string,
  options: Partial<RetryOptions> = {}
): Promise<T | null> {
  try {
    return await retryCalendarOperation(operation, options);
  } catch (error) {
    const calendarError = parseCalendarError(error);
    
    console.error(`Calendar operation '${operationName}' failed:`, {
      code: calendarError.code,
      message: calendarError.message,
      retryable: calendarError.retryable,
      originalError: error,
    });
    
    // For non-critical operations, return null instead of throwing
    // This allows the main operation to continue even if calendar sync fails
    if (calendarError.code === ErrorCode.CALENDAR_NETWORK_ERROR || 
        calendarError.code === ErrorCode.CALENDAR_QUOTA_EXCEEDED) {
      return null;
    }
    
    // For auth errors and invalid data, throw to let the caller handle
    throw error;
  }
}

/**
 * Check if calendar is available and connected
 */
export async function isCalendarAvailable(): Promise<boolean> {
  try {
    // This would check if the user has calendar connected
    // For now, return true as a placeholder
    return true;
  } catch (error) {
    console.warn('Calendar availability check failed:', error);
    return false;
  }
}

/**
 * Queue calendar operations for batch processing
 */
export class CalendarOperationQueue {
  private queue: Array<{
    id: string;
    operation: () => Promise<any>;
    retries: number;
    maxRetries: number;
  }> = [];
  
  private processing = false;
  private processingInterval: NodeJS.Timeout | null = null;

  private processIntervalMs: number;
  
  constructor(processIntervalMs: number = 5000) {
    this.processIntervalMs = processIntervalMs;
    this.startProcessing();
  }

  /**
   * Add operation to queue
   */
  enqueue(id: string, operation: () => Promise<any>, maxRetries: number = 3): void {
    // Remove existing operation with same ID
    this.queue = this.queue.filter(item => item.id !== id);
    
    // Add new operation
    this.queue.push({
      id,
      operation,
      retries: 0,
      maxRetries,
    });
  }

  /**
   * Remove operation from queue
   */
  dequeue(id: string): void {
    this.queue = this.queue.filter(item => item.id !== id);
  }

  /**
   * Start processing queue
   */
  private startProcessing(): void {
    if (this.processingInterval) return;
    
    this.processingInterval = setInterval(async () => {
      await this.processQueue();
    }, this.processIntervalMs);
  }

  /**
   * Stop processing queue
   */
  stopProcessing(): void {
    if (this.processingInterval) {
      clearInterval(this.processingInterval);
      this.processingInterval = null;
    }
  }

  /**
   * Process queued operations
   */
  private async processQueue(): Promise<void> {
    if (this.processing || this.queue.length === 0) return;
    
    this.processing = true;
    
    try {
      const item = this.queue[0];
      
      try {
        await item.operation();
        // Success - remove from queue
        this.queue.shift();
      } catch (error) {
        const calendarError = parseCalendarError(error);
        
        if (calendarError.retryable && item.retries < item.maxRetries) {
          // Increment retry count and keep in queue
          item.retries++;
          console.warn(`Calendar operation ${item.id} failed, will retry (${item.retries}/${item.maxRetries}):`, error);
        } else {
          // Max retries reached or not retryable - remove from queue
          console.error(`Calendar operation ${item.id} failed permanently:`, error);
          this.queue.shift();
        }
      }
    } finally {
      this.processing = false;
    }
  }

  /**
   * Get queue status
   */
  getStatus(): { pending: number; processing: boolean } {
    return {
      pending: this.queue.length,
      processing: this.processing,
    };
  }
}

// Global calendar operation queue
export const calendarQueue = new CalendarOperationQueue();