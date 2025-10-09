import { useEffect, useCallback, useState } from 'react';

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
    
    // For single-page apps, we might need to listen for pushstate/replacestate
    const originalPushState = history.pushState;
    const originalReplaceState = history.replaceState;
    
    history.pushState = function(...args) {
      originalPushState.apply(history, args);
      handleLocationChange();
    };
    
    history.replaceState = function(...args) {
      originalReplaceState.apply(history, args);
      handleLocationChange();
    };
    
    return () => {
      window.removeEventListener('popstate', handleLocationChange);
      history.pushState = originalPushState;
      history.replaceState = originalReplaceState;
    };
  }, []);
  
  return { pathname };
};

// Interface for metadata configuration
interface MetadataConfig {
  title?: string;
  description?: string;
  keywords?: string;
  language?: string;
  direction?: 'ltr' | 'rtl';
  ogTitle?: string;
  ogDescription?: string;
  ogLocale?: string;
}

// Default metadata values
const DEFAULT_METADATA = {
  title: 'Household Management',
  description: 'Household management application for tracking plants, projects and tasks',
  keywords: 'household, management, plants, projects, tasks, home',
  language: 'hu',
  direction: 'ltr' as const,
};

/**
 * Hook to manage document metadata (title, meta tags, lang attribute)
 * Updates metadata when language changes or page navigation occurs
 */
export const useDocumentMetadata = () => {
  const location = useSafeLocation();

  // Update document title
  const updateTitle = useCallback((title: string) => {
    try {
      document.title = title;
    } catch (err) {
      console.warn('Error updating document title:', err);
    }
  }, []);

  // Update or create meta tag
  const updateMetaTag = useCallback((name: string, content: string, isProperty?: boolean) => {
    try {
      // Try to find existing meta tag
      let metaTag = document.querySelector(`meta[${isProperty ? 'property' : 'name'}="${name}"]`) as HTMLMetaElement;
      
      if (!metaTag) {
        // Create new meta tag if it doesn't exist
        metaTag = document.createElement('meta');
        if (isProperty) {
          metaTag.setAttribute('property', name);
        } else {
          metaTag.setAttribute('name', name);
        }
        document.head.appendChild(metaTag);
      }
      
      metaTag.setAttribute('content', content);
    } catch (err) {
      console.warn(`Error updating meta tag ${name}:`, err);
    }
  }, []);

  // Update document language and direction
  const updateLanguageAttributes = useCallback((language: string, direction: 'ltr' | 'rtl' = 'ltr') => {
    try {
      const htmlElement = document.documentElement;
      
      // Update lang attribute
      htmlElement.setAttribute('lang', language);
      
      // Update dir attribute
      htmlElement.setAttribute('dir', direction);
      
      // Update locale meta tags
      updateMetaTag('og:locale', language === 'hu' ? 'hu_HU' : 'en_US', true);
      
    } catch (err) {
      console.warn('Error updating language attributes:', err);
    }
  }, [updateMetaTag]);

  // Update all metadata
  const updateMetadata = useCallback((config: MetadataConfig) => {
    try {
      // Update title
      if (config.title) {
        updateTitle(config.title);
      }
      
      // Update description
      if (config.description) {
        updateMetaTag('description', config.description);
        updateMetaTag('og:description', config.ogDescription || config.description, true);
      }
      
      // Update keywords
      if (config.keywords) {
        updateMetaTag('keywords', config.keywords);
      }
      
      // Update language and direction
      if (config.language) {
        updateLanguageAttributes(config.language, config.direction);
      }
      
      // Update Open Graph title
      if (config.ogTitle || config.title) {
        updateMetaTag('og:title', config.ogTitle || config.title || '', true);
      }
      
      // Update Open Graph locale
      if (config.ogLocale) {
        updateMetaTag('og:locale', config.ogLocale, true);
      }
      
    } catch (err) {
      console.warn('Error updating metadata:', err);
    }
  }, [updateTitle, updateMetaTag, updateLanguageAttributes]);

  // Get page-specific metadata based on current route
  const getPageMetadata = useCallback((baseMeta: MetadataConfig, t: (key: string, options?: any) => string): MetadataConfig => {
    const pathname = location.pathname;
    
    try {
      // Base metadata
      const metadata: MetadataConfig = {
        ...baseMeta,
      };
      
      // Page-specific metadata
      switch (pathname) {
        case '/':
        case '/dashboard':
          metadata.title = `${t('dashboard.title', { defaultValue: 'Dashboard' })} - ${baseMeta.title}`;
          metadata.description = t('dashboard.description', { 
            defaultValue: 'View your household management dashboard with plants, projects and tasks overview' 
          });
          break;
          
        case '/plants':
          metadata.title = `${t('navigation.plants', { defaultValue: 'Plants' })} - ${baseMeta.title}`;
          metadata.description = t('plants.description', { 
            defaultValue: 'Manage and track your household plants' 
          });
          break;
          
        case '/projects':
          metadata.title = `${t('navigation.projects', { defaultValue: 'Projects' })} - ${baseMeta.title}`;
          metadata.description = t('projects.description', { 
            defaultValue: 'Manage your household projects and track progress' 
          });
          break;
          
        case '/tasks':
          metadata.title = `${t('navigation.tasks', { defaultValue: 'Tasks' })} - ${baseMeta.title}`;
          metadata.description = t('tasks.description', { 
            defaultValue: 'Manage and track your household tasks' 
          });
          break;
          
        case '/calendar':
          metadata.title = `${t('navigation.calendar', { defaultValue: 'Calendar' })} - ${baseMeta.title}`;
          metadata.description = t('calendar.description', { 
            defaultValue: 'View your household tasks and projects in calendar format' 
          });
          break;
          
        case '/login':
          metadata.title = `${t('auth.login', { defaultValue: 'Login' })} - ${baseMeta.title}`;
          metadata.description = t('auth.loginDescription', { 
            defaultValue: 'Sign in to your household management account' 
          });
          break;
          
        default:
          // For dynamic routes or unknown pages, keep base metadata
          break;
      }
      
      return metadata;
    } catch (err) {
      console.warn('Error generating page metadata:', err);
      return baseMeta;
    }
  }, [location.pathname]);

  // Initialize metadata with defaults
  const initializeMetadata = useCallback(() => {
    try {
      // Set initial metadata
      updateMetadata(DEFAULT_METADATA);
      
      // Add viewport meta tag if it doesn't exist
      if (!document.querySelector('meta[name="viewport"]')) {
        const viewportMeta = document.createElement('meta');
        viewportMeta.setAttribute('name', 'viewport');
        viewportMeta.setAttribute('content', 'width=device-width, initial-scale=1.0');
        document.head.appendChild(viewportMeta);
      }
      
      // Add charset meta tag if it doesn't exist
      if (!document.querySelector('meta[charset]')) {
        const charsetMeta = document.createElement('meta');
        charsetMeta.setAttribute('charset', 'UTF-8');
        document.head.insertBefore(charsetMeta, document.head.firstChild);
      }
      
      // Add Open Graph type
      updateMetaTag('og:type', 'website', true);
      
    } catch (err) {
      console.warn('Error initializing metadata:', err);
    }
  }, [updateMetadata, updateMetaTag]);

  // Initialize metadata on mount
  useEffect(() => {
    initializeMetadata();
  }, [initializeMetadata]);

  return {
    updateMetadata,
    updateTitle,
    updateMetaTag,
    updateLanguageAttributes,
    getPageMetadata,
    initializeMetadata,
  };
};

export default useDocumentMetadata;