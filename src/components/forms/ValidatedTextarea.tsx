import React, { useState, useCallback, forwardRef } from 'react';
import { sanitizeInput } from '../../utils/inputSanitizer';
import { ValidationError } from '../../types/errors';

interface ValidatedTextareaProps extends Omit<React.TextareaHTMLAttributes<HTMLTextAreaElement>, 'onChange'> {
  value: string;
  onChange: (value: string) => void;
  onValidate?: (value: string) => ValidationError | null;
  sanitize?: boolean;
  sanitizeOptions?: {
    allowHtml?: boolean;
    maxLength?: number;
    trimWhitespace?: boolean;
  };
  validateOnBlur?: boolean;
  validateOnChange?: boolean;
  debounceMs?: number;
  showCharacterCount?: boolean;
  maxLength?: number;
}

/**
 * Textarea component with built-in validation and sanitization
 */
export const ValidatedTextarea = forwardRef<HTMLTextAreaElement, ValidatedTextareaProps>(({
  value,
  onChange,
  onValidate,
  sanitize = true,
  sanitizeOptions = {},
  validateOnBlur = true,
  validateOnChange = false,
  debounceMs = 300,
  showCharacterCount = false,
  maxLength,
  className = '',
  ...props
}, ref) => {
  const [validationError, setValidationError] = useState<ValidationError | null>(null);
  const [debounceTimeout, setDebounceTimeout] = useState<NodeJS.Timeout | null>(null);

  const validate = useCallback((inputValue: string) => {
    if (onValidate) {
      const error = onValidate(inputValue);
      setValidationError(error);
      return error;
    }
    return null;
  }, [onValidate]);

  const handleChange = useCallback((event: React.ChangeEvent<HTMLTextAreaElement>) => {
    let newValue = event.target.value;
    
    // Apply sanitization if enabled
    if (sanitize) {
      newValue = sanitizeInput(newValue, sanitizeOptions);
    }
    
    onChange(newValue);
    
    // Validate on change if enabled
    if (validateOnChange) {
      if (debounceMs > 0) {
        // Clear existing timeout
        if (debounceTimeout) {
          clearTimeout(debounceTimeout);
        }
        
        // Set new timeout for validation
        const timeout = setTimeout(() => {
          validate(newValue);
        }, debounceMs);
        
        setDebounceTimeout(timeout);
      } else {
        validate(newValue);
      }
    } else {
      // Clear validation error when typing if not validating on change
      setValidationError(null);
    }
  }, [onChange, sanitize, sanitizeOptions, validateOnChange, validate, debounceMs, debounceTimeout]);

  const handleBlur = useCallback((event: React.FocusEvent<HTMLTextAreaElement>) => {
    if (validateOnBlur) {
      validate(event.target.value);
    }
    
    // Call original onBlur if provided
    if (props.onBlur) {
      props.onBlur(event);
    }
  }, [validateOnBlur, validate, props.onBlur]);

  const hasError = validationError !== null;
  const characterCount = value.length;
  const isNearLimit = maxLength && characterCount > maxLength * 0.8;
  const isOverLimit = maxLength && characterCount > maxLength;

  return (
    <div className="relative">
      <textarea
        {...props}
        ref={ref}
        value={value}
        onChange={handleChange}
        onBlur={handleBlur}
        maxLength={maxLength}
        className={`
          block w-full px-3 py-2 border rounded-md shadow-sm 
          focus:outline-none focus:ring-1 sm:text-sm resize-vertical
          ${hasError || isOverLimit
            ? 'border-red-300 focus:border-red-500 focus:ring-red-500' 
            : 'border-gray-300 focus:border-blue-500 focus:ring-blue-500'
          }
          ${className}
        `}
        aria-invalid={hasError || isOverLimit}
        aria-describedby={
          hasError 
            ? `${props.name}-error` 
            : showCharacterCount 
              ? `${props.name}-count` 
              : undefined
        }
      />
      
      {(hasError || isOverLimit) && (
        <div className="absolute top-2 right-2 pointer-events-none">
          <svg 
            className="h-5 w-5 text-red-500" 
            fill="currentColor" 
            viewBox="0 0 20 20"
            aria-hidden="true"
          >
            <path 
              fillRule="evenodd" 
              d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7 4a1 1 0 11-2 0 1 1 0 012 0zm-1-9a1 1 0 00-1 1v4a1 1 0 102 0V6a1 1 0 00-1-1z" 
              clipRule="evenodd" 
            />
          </svg>
        </div>
      )}
      
      {/* Character count display */}
      {showCharacterCount && maxLength && (
        <div className="flex justify-between items-center mt-1">
          <div></div>
          <span 
            id={`${props.name}-count`}
            className={`text-xs ${
              isOverLimit 
                ? 'text-red-600' 
                : isNearLimit 
                  ? 'text-yellow-600' 
                  : 'text-gray-500'
            }`}
          >
            {characterCount}/{maxLength}
          </span>
        </div>
      )}
      
      {hasError && (
        <p id={`${props.name}-error`} className="mt-2 text-sm text-red-600">
          {validationError.message}
        </p>
      )}
      
      {isOverLimit && !hasError && (
        <p className="mt-2 text-sm text-red-600">
          Text exceeds maximum length of {maxLength} characters
        </p>
      )}
    </div>
  );
});

ValidatedTextarea.displayName = 'ValidatedTextarea';