import { useEffect, useRef, useCallback, useState } from 'react';

// Safe hook to get location that works outside Router context
const useSafeLocation = () => {
  const [pathname, setPathname] = useState(window.location.pathname);
  
  useEffect(() => {
    // Update pathname when it changes
    const handleLocationChange = () => {
      setPathname(window.location.pathname);
    };
    
    // Listen for navigation events
    window.addEventListener('popstate', handleLocationChange);
    
    return () => {
      window.removeEventListener('popstate', handleLocationChange);
    };
  }, []);
  
  return { pathname };
};

// Interface for preserved context data
interface PreservedContext {
  scrollPosition: { x: number; y: number };
  formData: Record<string, any>;
  uiState: Record<string, any>;
  timestamp: number;
}

// Storage key for preserved context
const CONTEXT_STORAGE_KEY = 'i18n_preserved_context';

// Maximum age for preserved context (5 minutes)
const MAX_CONTEXT_AGE = 5 * 60 * 1000;

/**
 * Hook to preserve and restore context during language switching
 * Maintains scroll position, form data, and UI state
 */
export const useContextPreservation = () => {
  const location = useSafeLocation();
  const preservedDataRef = useRef<PreservedContext | null>(null);
  const isRestoringRef = useRef(false);

  // Get current scroll position
  const getCurrentScrollPosition = useCallback((): { x: number; y: number } => {
    return {
      x: window.scrollX || window.pageXOffset || 0,
      y: window.scrollY || window.pageYOffset || 0,
    };
  }, []);

  // Get form data from all forms on the page
  const getCurrentFormData = useCallback((): Record<string, any> => {
    const formData: Record<string, any> = {};
    
    try {
      // Get all forms on the page
      const forms = document.querySelectorAll('form');
      
      forms.forEach((form, formIndex) => {
        const formKey = form.id || `form_${formIndex}`;
        const formElements = form.elements;
        
        for (let i = 0; i < formElements.length; i++) {
          const element = formElements[i] as HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement;
          
          if (element.name || element.id) {
            const key = element.name || element.id;
            const fullKey = `${formKey}.${key}`;
            
            // Handle different input types
            if (element.type === 'checkbox') {
              formData[fullKey] = (element as HTMLInputElement).checked;
            } else if (element.type === 'radio') {
              if ((element as HTMLInputElement).checked) {
                formData[fullKey] = element.value;
              }
            } else if (element.type === 'file') {
              // Skip file inputs as they can't be restored
              continue;
            } else {
              formData[fullKey] = element.value;
            }
          }
        }
      });
      
      // Also capture input elements outside of forms
      const standaloneInputs = document.querySelectorAll('input:not(form input), textarea:not(form textarea), select:not(form select)');
      standaloneInputs.forEach((element) => {
        const input = element as HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement;
        if (input.name || input.id) {
          const key = input.name || input.id;
          
          if (input.type === 'checkbox') {
            formData[key] = (input as HTMLInputElement).checked;
          } else if (input.type === 'radio') {
            if ((input as HTMLInputElement).checked) {
              formData[key] = input.value;
            }
          } else if (input.type !== 'file') {
            formData[key] = input.value;
          }
        }
      });
    } catch (err) {
      console.warn('Error capturing form data:', err);
    }
    
    return formData;
  }, []);

  // Get UI state from elements with data-preserve attributes
  const getCurrentUIState = useCallback((): Record<string, any> => {
    const uiState: Record<string, any> = {};
    
    try {
      // Find elements with data-preserve attribute
      const preservableElements = document.querySelectorAll('[data-preserve]');
      
      preservableElements.forEach((element) => {
        const key = element.getAttribute('data-preserve');
        if (key) {
          // Preserve various element states
          const htmlElement = element as HTMLElement;
          
          uiState[key] = {
            className: htmlElement.className,
            style: htmlElement.getAttribute('style'),
            hidden: htmlElement.hidden,
            // Add more state properties as needed
          };
          
          // Preserve specific states for different element types
          if (element.tagName === 'DETAILS') {
            uiState[key].open = (element as HTMLDetailsElement).open;
          }
          
          if (element.hasAttribute('aria-expanded')) {
            uiState[key].ariaExpanded = element.getAttribute('aria-expanded');
          }
        }
      });
    } catch (err) {
      console.warn('Error capturing UI state:', err);
    }
    
    return uiState;
  }, []);

  // Preserve current context
  const preserveContext = useCallback(() => {
    try {
      const context: PreservedContext = {
        scrollPosition: getCurrentScrollPosition(),
        formData: getCurrentFormData(),
        uiState: getCurrentUIState(),
        timestamp: Date.now(),
      };
      
      preservedDataRef.current = context;
      
      // Also store in sessionStorage as backup
      sessionStorage.setItem(CONTEXT_STORAGE_KEY, JSON.stringify(context));
      
      console.log('Context preserved for language switching');
    } catch (err) {
      console.warn('Error preserving context:', err);
    }
  }, [getCurrentScrollPosition, getCurrentFormData, getCurrentUIState]);

  // Restore preserved context
  const restoreContext = useCallback(() => {
    if (isRestoringRef.current) {
      return; // Prevent recursive restoration
    }
    
    try {
      isRestoringRef.current = true;
      
      let context = preservedDataRef.current;
      
      // Try to get from sessionStorage if not in memory
      if (!context) {
        const stored = sessionStorage.getItem(CONTEXT_STORAGE_KEY);
        if (stored) {
          context = JSON.parse(stored);
        }
      }
      
      if (!context) {
        return;
      }
      
      // Check if context is not too old
      if (Date.now() - context.timestamp > MAX_CONTEXT_AGE) {
        console.log('Preserved context is too old, skipping restoration');
        return;
      }
      
      // Restore scroll position
      if (context.scrollPosition) {
        // Use requestAnimationFrame to ensure DOM is ready
        requestAnimationFrame(() => {
          window.scrollTo(context.scrollPosition.x, context.scrollPosition.y);
        });
      }
      
      // Restore form data
      if (context.formData && Object.keys(context.formData).length > 0) {
        // Wait a bit for forms to be rendered
        setTimeout(() => {
          Object.entries(context.formData).forEach(([key, value]) => {
            try {
              let element: HTMLElement | null = null;
              
              // Try to find element by form.name pattern
              if (key.includes('.')) {
                const [formKey, fieldKey] = key.split('.');
                const form = document.getElementById(formKey) || document.querySelector(`form[data-form="${formKey}"]`);
                if (form) {
                  element = form.querySelector(`[name="${fieldKey}"], [id="${fieldKey}"]`);
                }
              } else {
                // Try to find standalone element
                element = document.querySelector(`[name="${key}"], [id="${key}"]`);
              }
              
              if (element) {
                const input = element as HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement;
                
                if (input.type === 'checkbox') {
                  (input as HTMLInputElement).checked = Boolean(value);
                } else if (input.type === 'radio') {
                  if (input.value === value) {
                    (input as HTMLInputElement).checked = true;
                  }
                } else if (input.type !== 'file') {
                  input.value = String(value || '');
                }
                
                // Trigger change event to notify React
                const event = new Event('change', { bubbles: true });
                input.dispatchEvent(event);
              }
            } catch (err) {
              console.warn(`Error restoring form field ${key}:`, err);
            }
          });
        }, 100);
      }
      
      // Restore UI state
      if (context.uiState && Object.keys(context.uiState).length > 0) {
        setTimeout(() => {
          Object.entries(context.uiState).forEach(([key, state]) => {
            try {
              const element = document.querySelector(`[data-preserve="${key}"]`) as HTMLElement;
              if (element && state) {
                // Restore basic properties
                if (state.className) {
                  element.className = state.className;
                }
                if (state.style) {
                  element.setAttribute('style', state.style);
                }
                if (typeof state.hidden === 'boolean') {
                  element.hidden = state.hidden;
                }
                
                // Restore specific element states
                if (state.open !== undefined && element.tagName === 'DETAILS') {
                  (element as HTMLDetailsElement).open = state.open;
                }
                if (state.ariaExpanded) {
                  element.setAttribute('aria-expanded', state.ariaExpanded);
                }
              }
            } catch (err) {
              console.warn(`Error restoring UI state for ${key}:`, err);
            }
          });
        }, 150);
      }
      
      console.log('Context restored after language switching');
      
      // Clear preserved context after successful restoration
      preservedDataRef.current = null;
      sessionStorage.removeItem(CONTEXT_STORAGE_KEY);
      
    } catch (err) {
      console.warn('Error restoring context:', err);
    } finally {
      isRestoringRef.current = false;
    }
  }, []);

  // Clear preserved context
  const clearPreservedContext = useCallback(() => {
    preservedDataRef.current = null;
    try {
      sessionStorage.removeItem(CONTEXT_STORAGE_KEY);
    } catch (err) {
      console.warn('Error clearing preserved context:', err);
    }
  }, []);

  // Clear old preserved context on route change
  useEffect(() => {
    // Clear context when navigating to a different page
    clearPreservedContext();
  }, [location.pathname, clearPreservedContext]);

  // Clean up on unmount
  useEffect(() => {
    return () => {
      clearPreservedContext();
    };
  }, [clearPreservedContext]);

  return {
    preserveContext,
    restoreContext,
    clearPreservedContext,
  };
};

export default useContextPreservation;