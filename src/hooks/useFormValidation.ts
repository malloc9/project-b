import { useState, useCallback, useMemo } from 'react';
import { FormErrors, ValidationError, validationErrorsToFormErrors, hasFormErrors } from '../types/errors';

interface ValidationRule<T> {
  field: keyof T;
  validator: (value: any, formData: T) => ValidationError | null;
}

interface UseFormValidationOptions<T> {
  initialData: T;
  validationRules: ValidationRule<T>[];
  validateOnChange?: boolean;
  validateOnBlur?: boolean;
}

interface UseFormValidationReturn<T> {
  data: T;
  errors: FormErrors;
  isValid: boolean;
  isDirty: boolean;
  isSubmitting: boolean;
  setFieldValue: (field: keyof T, value: any) => void;
  setFieldError: (field: keyof T, error: string) => void;
  clearFieldError: (field: keyof T) => void;
  validateField: (field: keyof T) => boolean;
  validateForm: () => boolean;
  resetForm: (newData?: T) => void;
  setSubmitting: (submitting: boolean) => void;
  handleSubmit: (onSubmit: (data: T) => Promise<void> | void) => (event?: React.FormEvent) => Promise<void>;
}

/**
 * Hook for comprehensive form validation and state management
 */
export function useFormValidation<T extends Record<string, any>>({
  initialData,
  validationRules,
  validateOnChange = false,
  validateOnBlur = true
}: UseFormValidationOptions<T>): UseFormValidationReturn<T> {
  const [data, setData] = useState<T>(initialData);
  const [errors, setErrors] = useState<FormErrors>({});
  const [touchedFields, setTouchedFields] = useState<Set<keyof T>>(new Set());
  const [isSubmitting, setIsSubmitting] = useState(false);

  // Create a map of validation rules for quick lookup
  const validationMap = useMemo(() => {
    const map = new Map<keyof T, ValidationRule<T>[]>();
    validationRules.forEach(rule => {
      const existing = map.get(rule.field) || [];
      map.set(rule.field, [...existing, rule]);
    });
    return map;
  }, [validationRules]);

  const isDirty = useMemo(() => {
    return JSON.stringify(data) !== JSON.stringify(initialData);
  }, [data, initialData]);

  const isValid = useMemo(() => {
    return !hasFormErrors(errors);
  }, [errors]);

  const validateField = useCallback((field: keyof T): boolean => {
    const fieldRules = validationMap.get(field) || [];
    const fieldErrors: string[] = [];

    fieldRules.forEach(rule => {
      const error = rule.validator(data[field], data);
      if (error) {
        fieldErrors.push(error.message);
      }
    });

    setErrors(prevErrors => ({
      ...prevErrors,
      [field]: fieldErrors
    }));

    return fieldErrors.length === 0;
  }, [data, validationMap]);

  const validateForm = useCallback((): boolean => {
    const allErrors: FormErrors = {};
    let isFormValid = true;

    validationRules.forEach(rule => {
      const error = rule.validator(data[rule.field], data);
      if (error) {
        if (!allErrors[rule.field as string]) {
          allErrors[rule.field as string] = [];
        }
        allErrors[rule.field as string].push(error.message);
        isFormValid = false;
      }
    });

    setErrors(allErrors);
    return isFormValid;
  }, [data, validationRules]);

  const setFieldValue = useCallback((field: keyof T, value: any) => {
    setData(prevData => ({
      ...prevData,
      [field]: value
    }));

    // Mark field as touched
    setTouchedFields(prev => new Set(prev).add(field));

    // Validate on change if enabled
    if (validateOnChange) {
      setTimeout(() => validateField(field), 0);
    } else {
      // Clear existing errors for this field when typing
      setErrors(prevErrors => {
        const newErrors = { ...prevErrors };
        delete newErrors[field as string];
        return newErrors;
      });
    }
  }, [validateOnChange, validateField]);

  const setFieldError = useCallback((field: keyof T, error: string) => {
    setErrors(prevErrors => ({
      ...prevErrors,
      [field as string]: [error]
    }));
  }, []);

  const clearFieldError = useCallback((field: keyof T) => {
    setErrors(prevErrors => {
      const newErrors = { ...prevErrors };
      delete newErrors[field as string];
      return newErrors;
    });
  }, []);

  const resetForm = useCallback((newData?: T) => {
    const resetData = newData || initialData;
    setData(resetData);
    setErrors({});
    setTouchedFields(new Set());
    setIsSubmitting(false);
  }, [initialData]);

  const setSubmitting = useCallback((submitting: boolean) => {
    setIsSubmitting(submitting);
  }, []);

  const handleSubmit = useCallback((onSubmit: (data: T) => Promise<void> | void) => {
    return async (event?: React.FormEvent) => {
      if (event) {
        event.preventDefault();
      }

      setIsSubmitting(true);

      try {
        // Validate entire form
        const isFormValid = validateForm();
        
        if (!isFormValid) {
          return;
        }

        // Call the submit handler
        await onSubmit(data);
      } catch (error) {
        // Handle submission errors
        console.error('Form submission error:', error);
        
        // If it's a validation error from the server, set field errors
        if (error && typeof error === 'object' && 'fieldErrors' in error) {
          setErrors(error.fieldErrors as FormErrors);
        }
      } finally {
        setIsSubmitting(false);
      }
    };
  }, [data, validateForm]);

  return {
    data,
    errors,
    isValid,
    isDirty,
    isSubmitting,
    setFieldValue,
    setFieldError,
    clearFieldError,
    validateField,
    validateForm,
    resetForm,
    setSubmitting,
    handleSubmit
  };
}

/**
 * Common validation rules that can be reused across forms
 */
export const commonValidationRules = {
  required: <T>(fieldName: string) => ({
    field: fieldName as keyof T,
    validator: (value: any) => {
      if (!value || (typeof value === 'string' && value.trim().length === 0)) {
        return {
          field: fieldName,
          message: `${fieldName.charAt(0).toUpperCase() + fieldName.slice(1)} is required`
        };
      }
      return null;
    }
  }),

  email: <T>(fieldName: string) => ({
    field: fieldName as keyof T,
    validator: (value: string) => {
      if (value && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(value)) {
        return {
          field: fieldName,
          message: 'Please enter a valid email address'
        };
      }
      return null;
    }
  }),

  minLength: <T>(fieldName: string, minLength: number) => ({
    field: fieldName as keyof T,
    validator: (value: string) => {
      if (value && value.length < minLength) {
        return {
          field: fieldName,
          message: `${fieldName.charAt(0).toUpperCase() + fieldName.slice(1)} must be at least ${minLength} characters long`
        };
      }
      return null;
    }
  }),

  maxLength: <T>(fieldName: string, maxLength: number) => ({
    field: fieldName as keyof T,
    validator: (value: string) => {
      if (value && value.length > maxLength) {
        return {
          field: fieldName,
          message: `${fieldName.charAt(0).toUpperCase() + fieldName.slice(1)} must be no more than ${maxLength} characters long`
        };
      }
      return null;
    }
  }),

  url: <T>(fieldName: string) => ({
    field: fieldName as keyof T,
    validator: (value: string) => {
      if (value) {
        try {
          new URL(value);
        } catch {
          return {
            field: fieldName,
            message: 'Please enter a valid URL'
          };
        }
      }
      return null;
    }
  }),

  date: <T>(fieldName: string) => ({
    field: fieldName as keyof T,
    validator: (value: string | Date) => {
      if (value) {
        const date = typeof value === 'string' ? new Date(value) : value;
        if (isNaN(date.getTime())) {
          return {
            field: fieldName,
            message: 'Please enter a valid date'
          };
        }
      }
      return null;
    }
  }),

  futureDate: <T>(fieldName: string) => ({
    field: fieldName as keyof T,
    validator: (value: string | Date) => {
      if (value) {
        const date = typeof value === 'string' ? new Date(value) : value;
        if (date <= new Date()) {
          return {
            field: fieldName,
            message: 'Date must be in the future'
          };
        }
      }
      return null;
    }
  }),

  number: <T>(fieldName: string, min?: number, max?: number) => ({
    field: fieldName as keyof T,
    validator: (value: string | number) => {
      if (value !== undefined && value !== null && value !== '') {
        const num = typeof value === 'string' ? parseFloat(value) : value;
        
        if (isNaN(num)) {
          return {
            field: fieldName,
            message: 'Please enter a valid number'
          };
        }
        
        if (min !== undefined && num < min) {
          return {
            field: fieldName,
            message: `Value must be at least ${min}`
          };
        }
        
        if (max !== undefined && num > max) {
          return {
            field: fieldName,
            message: `Value must be no more than ${max}`
          };
        }
      }
      return null;
    }
  })
};