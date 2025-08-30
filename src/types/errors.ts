// Error handling utility functions

// Define error types locally to avoid circular dependencies
export const ErrorCode = {
  // Authentication errors
  AUTH_INVALID_CREDENTIALS: 'auth/invalid-credentials',
  AUTH_USER_NOT_FOUND: 'auth/user-not-found',
  AUTH_WRONG_PASSWORD: 'auth/wrong-password',
  AUTH_EMAIL_ALREADY_IN_USE: 'auth/email-already-in-use',
  AUTH_WEAK_PASSWORD: 'auth/weak-password',
  AUTH_NETWORK_ERROR: 'auth/network-request-failed',
  AUTH_TOO_MANY_REQUESTS: 'auth/too-many-requests',

  // Database errors
  DB_PERMISSION_DENIED: 'db/permission-denied',
  DB_NOT_FOUND: 'db/not-found',
  DB_NETWORK_ERROR: 'db/network-error',
  DB_QUOTA_EXCEEDED: 'db/quota-exceeded',
  DB_VALIDATION_ERROR: 'db/validation-error',

  // Storage errors
  STORAGE_UNAUTHORIZED: 'storage/unauthorized',
  STORAGE_QUOTA_EXCEEDED: 'storage/quota-exceeded',
  STORAGE_INVALID_FORMAT: 'storage/invalid-format',
  STORAGE_FILE_TOO_LARGE: 'storage/file-too-large',
  STORAGE_NETWORK_ERROR: 'storage/network-error',

  // Calendar errors
  CALENDAR_AUTH_ERROR: 'calendar/auth-error',
  CALENDAR_QUOTA_EXCEEDED: 'calendar/quota-exceeded',
  CALENDAR_NETWORK_ERROR: 'calendar/network-error',
  CALENDAR_INVALID_EVENT: 'calendar/invalid-event',

  // General errors
  UNKNOWN_ERROR: 'unknown-error',
  VALIDATION_ERROR: 'validation-error',
  NETWORK_ERROR: 'network-error'
} as const;

export type ErrorCode = typeof ErrorCode[keyof typeof ErrorCode];

export interface AppError {
  code: ErrorCode;
  message: string;
  details?: Record<string, any>;
  timestamp: Date;
  userId?: string;
}

export interface ValidationError {
  field: string;
  message: string;
  value?: any;
}

export interface FormErrors {
  [fieldName: string]: string[];
}

/**
 * Creates a standardized AppError object
 */
export function createAppError(
  code: ErrorCode,
  message: string,
  details?: Record<string, any>,
  userId?: string
): AppError {
  return {
    code,
    message,
    details,
    timestamp: new Date(),
    userId
  };
}

/**
 * Converts Firebase errors to standardized AppError format
 */
export function handleFirebaseError(error: any): AppError {
  const errorCode = error.code || 'unknown-error';
  
  // Map Firebase error codes to our ErrorCode enum
  const codeMapping: Record<string, ErrorCode> = {
    'auth/invalid-email': ErrorCode.AUTH_INVALID_CREDENTIALS,
    'auth/user-disabled': ErrorCode.AUTH_INVALID_CREDENTIALS,
    'auth/user-not-found': ErrorCode.AUTH_USER_NOT_FOUND,
    'auth/wrong-password': ErrorCode.AUTH_WRONG_PASSWORD,
    'auth/email-already-in-use': ErrorCode.AUTH_EMAIL_ALREADY_IN_USE,
    'auth/weak-password': ErrorCode.AUTH_WEAK_PASSWORD,
    'auth/network-request-failed': ErrorCode.AUTH_NETWORK_ERROR,
    'auth/too-many-requests': ErrorCode.AUTH_TOO_MANY_REQUESTS,
    'permission-denied': ErrorCode.DB_PERMISSION_DENIED,
    'not-found': ErrorCode.DB_NOT_FOUND,
    'unavailable': ErrorCode.DB_NETWORK_ERROR,
    'resource-exhausted': ErrorCode.DB_QUOTA_EXCEEDED,
    'storage/unauthorized': ErrorCode.STORAGE_UNAUTHORIZED,
    'storage/quota-exceeded': ErrorCode.STORAGE_QUOTA_EXCEEDED,
    'storage/invalid-format': ErrorCode.STORAGE_INVALID_FORMAT,
    'storage/file-too-large': ErrorCode.STORAGE_FILE_TOO_LARGE
  };

  const mappedCode = codeMapping[errorCode] || ErrorCode.UNKNOWN_ERROR;
  
  return createAppError(
    mappedCode,
    error.message || 'An unexpected error occurred',
    { originalError: errorCode }
  );
}

/**
 * Gets user-friendly error message for display
 */
export function getErrorMessage(error: AppError): string {
  const userFriendlyMessages: Record<ErrorCode, string> = {
    [ErrorCode.AUTH_INVALID_CREDENTIALS]: 'Invalid email or password. Please try again.',
    [ErrorCode.AUTH_USER_NOT_FOUND]: 'No account found with this email address.',
    [ErrorCode.AUTH_WRONG_PASSWORD]: 'Incorrect password. Please try again.',
    [ErrorCode.AUTH_EMAIL_ALREADY_IN_USE]: 'An account with this email already exists.',
    [ErrorCode.AUTH_WEAK_PASSWORD]: 'Password is too weak. Please choose a stronger password.',
    [ErrorCode.AUTH_NETWORK_ERROR]: 'Network error. Please check your connection and try again.',
    [ErrorCode.AUTH_TOO_MANY_REQUESTS]: 'Too many failed attempts. Please try again later.',
    [ErrorCode.DB_PERMISSION_DENIED]: 'You do not have permission to perform this action.',
    [ErrorCode.DB_NOT_FOUND]: 'The requested item was not found.',
    [ErrorCode.DB_NETWORK_ERROR]: 'Network error. Please check your connection and try again.',
    [ErrorCode.DB_QUOTA_EXCEEDED]: 'Storage quota exceeded. Please contact support.',
    [ErrorCode.DB_VALIDATION_ERROR]: 'Invalid data provided. Please check your input.',
    [ErrorCode.STORAGE_UNAUTHORIZED]: 'You do not have permission to upload files.',
    [ErrorCode.STORAGE_QUOTA_EXCEEDED]: 'Storage quota exceeded. Please contact support.',
    [ErrorCode.STORAGE_INVALID_FORMAT]: 'Invalid file format. Please use JPEG, PNG, or WebP.',
    [ErrorCode.STORAGE_FILE_TOO_LARGE]: 'File is too large. Please choose a smaller file.',
    [ErrorCode.STORAGE_NETWORK_ERROR]: 'Network error during upload. Please try again.',
    [ErrorCode.CALENDAR_AUTH_ERROR]: 'Calendar authentication failed. Please reconnect your calendar.',
    [ErrorCode.CALENDAR_QUOTA_EXCEEDED]: 'Calendar API quota exceeded. Please try again later.',
    [ErrorCode.CALENDAR_NETWORK_ERROR]: 'Network error connecting to calendar. Please try again.',
    [ErrorCode.CALENDAR_INVALID_EVENT]: 'Invalid calendar event data.',
    [ErrorCode.UNKNOWN_ERROR]: 'An unexpected error occurred. Please try again.',
    [ErrorCode.VALIDATION_ERROR]: 'Please check your input and try again.',
    [ErrorCode.NETWORK_ERROR]: 'Network error. Please check your connection and try again.'
  };

  return userFriendlyMessages[error.code] || error.message || 'An unexpected error occurred.';
}

/**
 * Validates email format
 */
export function validateEmail(email: string): ValidationError | null {
  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  
  if (!email) {
    return { field: 'email', message: 'Email is required' };
  }
  
  if (!emailRegex.test(email)) {
    return { field: 'email', message: 'Please enter a valid email address' };
  }
  
  return null;
}

/**
 * Validates password strength
 */
export function validatePassword(password: string): ValidationError | null {
  if (!password) {
    return { field: 'password', message: 'Password is required' };
  }
  
  if (password.length < 6) {
    return { field: 'password', message: 'Password must be at least 6 characters long' };
  }
  
  return null;
}

/**
 * Validates required string fields
 */
export function validateRequired(value: string, fieldName: string): ValidationError | null {
  if (!value || value.trim().length === 0) {
    return { 
      field: fieldName, 
      message: `${fieldName.charAt(0).toUpperCase() + fieldName.slice(1)} is required` 
    };
  }
  
  return null;
}

/**
 * Validates date fields
 */
export function validateDate(date: Date | string | null, fieldName: string, required = false): ValidationError | null {
  if (!date && required) {
    return { 
      field: fieldName, 
      message: `${fieldName.charAt(0).toUpperCase() + fieldName.slice(1)} is required` 
    };
  }
  
  if (date) {
    const dateObj = typeof date === 'string' ? new Date(date) : date;
    if (isNaN(dateObj.getTime())) {
      return { 
        field: fieldName, 
        message: `Please enter a valid ${fieldName}` 
      };
    }
  }
  
  return null;
}

/**
 * Validates file uploads
 */
export function validateFile(
  file: File, 
  maxSizeBytes: number = 5 * 1024 * 1024, // 5MB default
  allowedTypes: string[] = ['image/jpeg', 'image/png', 'image/webp']
): ValidationError | null {
  if (!file) {
    return { field: 'file', message: 'File is required' };
  }
  
  if (file.size > maxSizeBytes) {
    const maxSizeMB = maxSizeBytes / (1024 * 1024);
    return { 
      field: 'file', 
      message: `File size must be less than ${maxSizeMB}MB` 
    };
  }
  
  if (!allowedTypes.includes(file.type)) {
    return { 
      field: 'file', 
      message: `File type must be one of: ${allowedTypes.join(', ')}` 
    };
  }
  
  return null;
}

/**
 * Converts validation errors array to FormErrors object
 */
export function validationErrorsToFormErrors(errors: ValidationError[]): FormErrors {
  const formErrors: FormErrors = {};
  
  errors.forEach(error => {
    if (!formErrors[error.field]) {
      formErrors[error.field] = [];
    }
    formErrors[error.field].push(error.message);
  });
  
  return formErrors;
}

/**
 * Checks if form has any errors
 */
export function hasFormErrors(errors: FormErrors): boolean {
  return Object.keys(errors).some(field => errors[field].length > 0);
}

/**
 * Clears errors for a specific field
 */
export function clearFieldErrors(errors: FormErrors, fieldName: string): FormErrors {
  const newErrors = { ...errors };
  delete newErrors[fieldName];
  return newErrors;
}