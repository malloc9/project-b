import React, { ReactNode } from 'react';
import type { ValidationError } from '../../types/errors';

interface FormFieldProps {
  label: string;
  name: string;
  required?: boolean;
  errors?: string[];
  children: ReactNode;
  helpText?: string;
  className?: string;
}

/**
 * Reusable form field wrapper with validation display
 */
export const FormField: React.FC<FormFieldProps> = ({
  label,
  name,
  required = false,
  errors = [],
  children,
  helpText,
  className = ''
}) => {
  const hasErrors = errors.length > 0;
  const fieldId = `field-${name}`;

  return (
    <div className={`mb-4 ${className}`}>
      <label 
        htmlFor={fieldId}
        className={`block text-sm font-medium mb-2 ${
          hasErrors ? 'text-red-700' : 'text-gray-700'
        }`}
      >
        {label}
        {required && <span className="text-red-500 ml-1">*</span>}
      </label>
      
      <div className="relative">
        {React.cloneElement(children as React.ReactElement, {
          id: fieldId,
          name,
          'aria-invalid': hasErrors,
          'aria-describedby': hasErrors ? `${fieldId}-error` : helpText ? `${fieldId}-help` : undefined,
          className: `${(children as React.ReactElement).props.className || ''} ${
            hasErrors 
              ? 'border-red-300 focus:border-red-500 focus:ring-red-500' 
              : 'border-gray-300 focus:border-blue-500 focus:ring-blue-500'
          }`
        })}
        
        {hasErrors && (
          <div className="absolute inset-y-0 right-0 pr-3 flex items-center pointer-events-none">
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
      </div>
      
      {hasErrors && (
        <div id={`${fieldId}-error`} className="mt-2">
          {errors.map((error, index) => (
            <p key={index} className="text-sm text-red-600">
              {error}
            </p>
          ))}
        </div>
      )}
      
      {helpText && !hasErrors && (
        <p id={`${fieldId}-help`} className="mt-2 text-sm text-gray-500">
          {helpText}
        </p>
      )}
    </div>
  );
};