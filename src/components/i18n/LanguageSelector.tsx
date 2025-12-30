import React, { useState, useRef, useEffect, useCallback } from 'react';
import { useTranslation } from '../../hooks/useTranslation';
import { SUPPORTED_LANGUAGES, type LanguageConfig } from '../../i18n/types';

// Component props interface
export interface LanguageSelectorProps {
  className?: string;
  variant?: 'dropdown' | 'toggle';
  showLabel?: boolean;
  showFlag?: boolean;
  showNativeName?: boolean;
  isMobile?: boolean;
  compact?: boolean;
}

/**
 * LanguageSelector component for switching between supported languages
 * Provides dropdown interface with Hungarian and English options
 */
export const LanguageSelector: React.FC<LanguageSelectorProps> = ({
  className = '',
  variant = 'dropdown',
  showLabel = true,
  showFlag = true,
  showNativeName = true,
  isMobile,
  compact = false,
}) => {
  const { language, changeLanguage, currentLanguageConfig, t, isLoading } = useTranslation();
  
  // Don't render if translations are still loading
  if (isLoading) {
    return (
      <div className={`inline-flex items-center ${compact ? 'px-2 py-1' : 'px-3 py-2'}`}>
        <div className={`animate-spin rounded-full border-b-2 border-gray-400 ${compact ? 'h-3 w-3' : 'h-4 w-4'}`} />
      </div>
    );
  }
  const [isOpen, setIsOpen] = useState(false);
  const [isChanging, setIsChanging] = useState(false);
  const [focusedOptionIndex, setFocusedOptionIndex] = useState(-1);
  const [detectedMobile, setDetectedMobile] = useState(false);
  const dropdownRef = useRef<HTMLDivElement>(null);
  const buttonRef = useRef<HTMLButtonElement>(null);
  const optionRefs = useRef<(HTMLDivElement | null)[]>([]);

  // Detect mobile device
  useEffect(() => {
    const checkMobile = () => {
      const isMobileDevice = window.innerWidth < 768 || 
        /Android|webOS|iPhone|iPad|iPod|BlackBerry|IEMobile|Opera Mini/i.test(navigator.userAgent);
      setDetectedMobile(isMobileDevice);
    };

    checkMobile();
    window.addEventListener('resize', checkMobile);
    return () => window.removeEventListener('resize', checkMobile);
  }, []);

  // Determine if we should use mobile layout
  const useMobileLayout = isMobile !== undefined ? isMobile : detectedMobile;

  // Close dropdown when clicking outside or on mobile backdrop
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
        setIsOpen(false);
      }
    };

    const handleTouchStart = (event: TouchEvent) => {
      if (useMobileLayout && dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
        setIsOpen(false);
      }
    };

    if (isOpen) {
      document.addEventListener('mousedown', handleClickOutside);
      document.addEventListener('touchstart', handleTouchStart);
      
      // Prevent body scroll on mobile when dropdown is open
      if (useMobileLayout) {
        document.body.style.overflow = 'hidden';
      }
      
      return () => {
        document.removeEventListener('mousedown', handleClickOutside);
        document.removeEventListener('touchstart', handleTouchStart);
        document.body.style.overflow = '';
      };
    }
  }, [isOpen, useMobileLayout]);

  // Safe translation function that handles loading state
  const safeT = useCallback((key: string, fallback: string, options?: any) => {
    if (isLoading) return fallback;
    return t(key, { defaultValue: fallback, ...options });
  }, [isLoading, t]);

  // Announce language change to screen readers
  const announceLanguageChange = useCallback((newLanguage: string) => {
    const langConfig = SUPPORTED_LANGUAGES.find(lang => lang.code === newLanguage);
    if (langConfig) {
      const announcement = safeT('common.languageChanged', 'Language changed to {{language}}', {
        language: langConfig.nativeName 
      });
      
      // Create a temporary element for screen reader announcement
      const announcement_element = document.createElement('div');
      announcement_element.setAttribute('aria-live', 'polite');
      announcement_element.setAttribute('aria-atomic', 'true');
      announcement_element.className = 'sr-only';
      announcement_element.textContent = announcement;
      
      document.body.appendChild(announcement_element);
      
      // Remove the element after announcement
      setTimeout(() => {
        document.body.removeChild(announcement_element);
      }, 1000);
    }
  }, [safeT]);

  // Handle language change
  const handleLanguageChange = async (newLanguage: string) => {
    if (newLanguage === language || isChanging) return;

    try {
      setIsChanging(true);
      await changeLanguage(newLanguage);
      setIsOpen(false);
      setFocusedOptionIndex(-1);
      
      // Announce the change to screen readers
      announceLanguageChange(newLanguage);
      
      // Return focus to the button
      setTimeout(() => {
        buttonRef.current?.focus();
      }, 100);
    } catch (error) {
      console.error('Failed to change language:', error);
    } finally {
      setIsChanging(false);
    }
  };

  // Focus management for options
  const focusOption = useCallback((index: number) => {
    if (index >= 0 && index < SUPPORTED_LANGUAGES.length) {
      setFocusedOptionIndex(index);
      optionRefs.current[index]?.focus();
    }
  }, []);

  // Handle keyboard navigation
  const handleKeyDown = (event: React.KeyboardEvent) => {
    switch (event.key) {
      case 'Enter':
      case ' ':
        event.preventDefault();
        if (!isOpen) {
          setIsOpen(true);
          setFocusedOptionIndex(SUPPORTED_LANGUAGES.findIndex(lang => lang.code === language));
        } else {
          setIsOpen(false);
        }
        break;
      case 'Escape':
        event.preventDefault();
        setIsOpen(false);
        setFocusedOptionIndex(-1);
        buttonRef.current?.focus();
        break;
      case 'ArrowDown':
        event.preventDefault();
        if (!isOpen) {
          setIsOpen(true);
          const currentIndex = SUPPORTED_LANGUAGES.findIndex(lang => lang.code === language);
          setFocusedOptionIndex(currentIndex);
          setTimeout(() => focusOption(currentIndex), 50);
        } else {
          const nextIndex = focusedOptionIndex < SUPPORTED_LANGUAGES.length - 1 ? focusedOptionIndex + 1 : 0;
          focusOption(nextIndex);
        }
        break;
      case 'ArrowUp':
        event.preventDefault();
        if (!isOpen) {
          setIsOpen(true);
          const currentIndex = SUPPORTED_LANGUAGES.findIndex(lang => lang.code === language);
          setFocusedOptionIndex(currentIndex);
          setTimeout(() => focusOption(currentIndex), 50);
        } else {
          const prevIndex = focusedOptionIndex > 0 ? focusedOptionIndex - 1 : SUPPORTED_LANGUAGES.length - 1;
          focusOption(prevIndex);
        }
        break;
      case 'Home':
        event.preventDefault();
        if (isOpen) {
          focusOption(0);
        }
        break;
      case 'End':
        event.preventDefault();
        if (isOpen) {
          focusOption(SUPPORTED_LANGUAGES.length - 1);
        }
        break;
    }
  };

  // Handle option keyboard navigation
  const handleOptionKeyDown = (event: React.KeyboardEvent, langCode: string, index: number) => {
    switch (event.key) {
      case 'Enter':
      case ' ':
        event.preventDefault();
        handleLanguageChange(langCode);
        break;
      case 'Escape':
        event.preventDefault();
        setIsOpen(false);
        setFocusedOptionIndex(-1);
        buttonRef.current?.focus();
        break;
      case 'ArrowDown':
        event.preventDefault();
        const nextIndex = index < SUPPORTED_LANGUAGES.length - 1 ? index + 1 : 0;
        focusOption(nextIndex);
        break;
      case 'ArrowUp':
        event.preventDefault();
        const prevIndex = index > 0 ? index - 1 : SUPPORTED_LANGUAGES.length - 1;
        focusOption(prevIndex);
        break;
      case 'Home':
        event.preventDefault();
        focusOption(0);
        break;
      case 'End':
        event.preventDefault();
        focusOption(SUPPORTED_LANGUAGES.length - 1);
        break;
      case 'Tab':
        // Allow tab to close dropdown and move to next element
        setIsOpen(false);
        setFocusedOptionIndex(-1);
        break;
    }
  };

  // Get current language display info
  const getCurrentLanguageDisplay = () => {
    if (!currentLanguageConfig) return { flag: '🌐', name: 'Unknown', nativeName: 'Unknown' };
    return {
      flag: currentLanguageConfig.flag,
      name: currentLanguageConfig.name,
      nativeName: currentLanguageConfig.nativeName,
    };
  };

  const currentDisplay = getCurrentLanguageDisplay();

  // Base classes for styling
  const baseClasses = `
    relative inline-block text-left
    ${className}
  `.trim();

  // Add screen reader only styles to the document if not already present
  useEffect(() => {
    const styleId = 'language-selector-sr-styles';
    if (!document.getElementById(styleId)) {
      const style = document.createElement('style');
      style.id = styleId;
      style.textContent = `
        .sr-only {
          position: absolute;
          width: 1px;
          height: 1px;
          padding: 0;
          margin: -1px;
          overflow: hidden;
          clip: rect(0, 0, 0, 0);
          white-space: nowrap;
          border: 0;
        }
      `;
      document.head.appendChild(style);
    }
  }, []);

  const buttonClasses = `
    inline-flex items-center justify-between
    ${compact ? 'px-2 py-1 text-xs' : useMobileLayout ? 'px-3 py-2 text-sm' : 'px-3 py-2 text-sm'} 
    font-medium text-gray-700 bg-white border border-gray-300 rounded-md
    hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500
    active:bg-gray-100 disabled:opacity-50 disabled:cursor-not-allowed
    transition-all duration-200
    ${compact ? 'min-w-[80px]' : useMobileLayout ? 'min-w-[100px] touch-manipulation' : 'min-w-[120px]'}
    ${useMobileLayout ? 'text-base' : ''}
  `.trim();

  const dropdownClasses = useMobileLayout ? `
    fixed inset-x-0 bottom-0 z-50
    bg-white border-t border-gray-300 rounded-t-lg shadow-2xl
    focus:outline-none max-h-[50vh] overflow-y-auto
    transform transition-all duration-300 ease-out
    ${isOpen 
      ? 'opacity-100 translate-y-0' 
      : 'opacity-0 translate-y-full pointer-events-none'
    }
  `.trim() : `
    absolute right-0 z-50 mt-2 
    ${compact ? 'w-40' : 'w-48'}
    bg-white border border-gray-300 rounded-md shadow-lg
    focus:outline-none max-h-60 overflow-y-auto
    transform transition-all duration-200 ease-out
    ${isOpen 
      ? 'opacity-100 scale-100 translate-y-0' 
      : 'opacity-0 scale-95 -translate-y-2 pointer-events-none'
    }
  `.trim();

  const optionClasses = `
    flex items-center 
    ${compact ? 'px-3 py-2 text-xs' : useMobileLayout ? 'px-4 py-4 text-base' : 'px-4 py-2 text-sm'}
    text-gray-700 hover:bg-gray-100 hover:text-gray-900
    focus:bg-gray-100 focus:text-gray-900 focus:outline-none
    active:bg-gray-200 cursor-pointer transition-colors duration-150
    ${useMobileLayout ? 'touch-manipulation min-h-[48px]' : ''}
  `.trim();

  return (
    <>
      {/* Mobile backdrop */}
      {useMobileLayout && isOpen && (
        <div 
          className="fixed inset-0 bg-black bg-opacity-50 z-40"
          onClick={() => setIsOpen(false)}
          aria-hidden="true"
        />
      )}
      
      <div className={baseClasses} ref={dropdownRef}>
        {/* Language selector button */}
      <button
        ref={buttonRef}
        type="button"
        className={buttonClasses}
        onClick={() => setIsOpen(!isOpen)}
        onKeyDown={handleKeyDown}
        disabled={isChanging}
        aria-haspopup="listbox"
        aria-expanded={isOpen}
        aria-label={safeT('common.selectLanguage', 'Select language')}
        title={safeT('common.currentLanguage', `Current language: ${currentDisplay.nativeName}`, {
          language: currentDisplay.nativeName 
        })}
      >
        <div className={`flex items-center ${compact ? 'space-x-1' : 'space-x-2'}`}>
          {showFlag && (
            <span className={`${compact ? 'text-base' : 'text-lg'}`} role="img" aria-hidden="true">
              {currentDisplay.flag}
            </span>
          )}
          {showNativeName && !compact && (
            <span className="font-medium">
              {currentDisplay.nativeName}
            </span>
          )}
          {compact && showNativeName && (
            <span className="font-medium text-xs">
              {currentDisplay.nativeName.slice(0, 2).toUpperCase()}
            </span>
          )}
          {showLabel && !showNativeName && (
            <span className="font-medium">
              {compact ? safeT('common.lang', 'Lang') : safeT('common.language', 'Language')}
            </span>
          )}
          {isChanging && (
            <div className={`animate-spin rounded-full border-b-2 border-blue-600 ${compact ? 'h-3 w-3' : 'h-4 w-4'}`} />
          )}
        </div>
        
        {/* Dropdown arrow */}
        <svg
          className={`${compact ? 'ml-1 h-3 w-3' : 'ml-2 h-4 w-4'} transition-transform duration-200 ${
            isOpen ? 'rotate-180' : ''
          }`}
          fill="none"
          stroke="currentColor"
          viewBox="0 0 24 24"
          aria-hidden="true"
        >
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
        </svg>
      </button>

      {/* Dropdown menu */}
      <div
        className={dropdownClasses}
        role="listbox"
        aria-label={safeT('common.availableLanguages', 'Available languages')}
        aria-activedescendant={focusedOptionIndex >= 0 ? `language-option-${SUPPORTED_LANGUAGES[focusedOptionIndex]?.code}` : undefined}
      >
        {/* Mobile header */}
        {useMobileLayout && (
          <div className="px-4 py-3 border-b border-gray-200 bg-gray-50">
            <div className="flex items-center justify-between">
              <h3 className="text-lg font-medium text-gray-900">
                {safeT('common.selectLanguage', 'Select Language')}
              </h3>
              <button
                onClick={() => setIsOpen(false)}
                className="p-1 rounded-full hover:bg-gray-200 focus:outline-none focus:ring-2 focus:ring-blue-500"
                aria-label={safeT('common.close', 'Close')}
              >
                <svg className="h-5 w-5 text-gray-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
            </div>
          </div>
        )}
        {SUPPORTED_LANGUAGES.map((lang: LanguageConfig, index: number) => {
          const isSelected = lang.code === language;
          const isFocused = index === focusedOptionIndex;
          
          return (
            <div
              key={lang.code}
              ref={(el) => {
                optionRefs.current[index] = el;
              }}
              id={`language-option-${lang.code}`}
              role="option"
              tabIndex={-1}
              className={`${optionClasses} ${
                isSelected 
                  ? 'bg-blue-50 text-blue-700' 
                  : isFocused 
                    ? 'bg-gray-100 text-gray-900' 
                    : ''
              }`}
              onClick={() => handleLanguageChange(lang.code)}
              onKeyDown={(e) => handleOptionKeyDown(e, lang.code, index)}
              onMouseEnter={() => setFocusedOptionIndex(index)}
              aria-selected={isSelected}
              aria-label={safeT('common.selectLanguageOption', 'Select {{nativeName}} ({{name}})', {
                nativeName: lang.nativeName,
                name: lang.name
              })}
            >
              <span 
                className={`${compact ? 'text-base mr-2' : useMobileLayout ? 'text-xl mr-3' : 'text-lg mr-3'}`} 
                role="img" 
                aria-label={`${lang.name} flag`}
              >
                {lang.flag}
              </span>
              <div className="flex flex-col flex-1">
                <span className={`font-medium ${useMobileLayout ? 'text-base' : compact ? 'text-xs' : 'text-sm'}`}>
                  {lang.nativeName}
                </span>
                {!compact && (
                  <span className={`text-gray-500 ${useMobileLayout ? 'text-sm' : 'text-xs'}`}>
                    {lang.name}
                  </span>
                )}
              </div>
              {isSelected && (
                <svg
                  className={`ml-auto text-blue-600 ${compact ? 'h-3 w-3' : useMobileLayout ? 'h-5 w-5' : 'h-4 w-4'}`}
                  fill="currentColor"
                  viewBox="0 0 20 20"
                  aria-label={safeT('common.selectedLanguage', 'Selected language')}
                >
                  <path
                    fillRule="evenodd"
                    d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z"
                    clipRule="evenodd"
                  />
                </svg>
              )}
            </div>
          );
        })}
      </div>
      </div>
    </>
  );
};

export default LanguageSelector;