# Design Document

## Overview

This design implements internationalization (i18n) for the household management application using React i18next, a popular and robust internationalization framework for React applications. The solution provides a language selection dropdown, complete translation support for Hungarian and English languages, and maintains Hungarian as the default language.

The design follows React best practices by using context for language state management, hooks for translation access, and a structured approach to translation key organization. The implementation ensures accessibility compliance and seamless user experience during language switching.

## Architecture

### Core Components

1. **I18nProvider Context**: Manages language state and provides translation functions
2. **LanguageSelector Component**: Dropdown component for language selection
3. **Translation Hook (useTranslation)**: Custom hook for accessing translations
4. **Translation Files**: JSON files containing language-specific translations
5. **Language Detection**: Browser language detection with Hungarian fallback

### Technology Stack

- **react-i18next**: Primary internationalization library
- **i18next**: Core internationalization framework
- **i18next-browser-languagedetector**: Browser language detection
- **TypeScript**: Type safety for translation keys
- **Local Storage**: Persistence of language preferences

### Integration Points

- **AppLayout**: Language selector integration in header
- **App.tsx**: I18nProvider wrapper around the entire application
- **All Components**: Translation hook usage for text content
- **Error Handling**: Translated error messages and validation

## Components and Interfaces

### I18nProvider Context

```typescript
interface I18nContextType {
  language: string;
  changeLanguage: (lang: string) => Promise<void>;
  t: (key: string, options?: any) => string;
  isLoading: boolean;
}

interface I18nProviderProps {
  children: React.ReactNode;
}
```

**Responsibilities:**
- Initialize i18next with configuration
- Manage current language state
- Provide translation function to components
- Handle language switching logic
- Persist language preference in localStorage

### LanguageSelector Component

```typescript
interface LanguageSelectorProps {
  className?: string;
  variant?: 'dropdown' | 'toggle';
}

interface Language {
  code: string;
  name: string;
  nativeName: string;
  flag: string;
}
```

**Responsibilities:**
- Display current language with flag/icon
- Provide dropdown menu for language selection
- Handle language change events
- Maintain accessibility standards (ARIA labels, keyboard navigation)
- Support both desktop and mobile layouts

### Translation Hook

```typescript
interface UseTranslationReturn {
  t: (key: string, options?: any) => string;
  language: string;
  changeLanguage: (lang: string) => Promise<void>;
  isLoading: boolean;
}
```

**Responsibilities:**
- Provide easy access to translation function
- Return current language state
- Expose language change functionality
- Handle loading states during language switching

### Translation Key Types

```typescript
// Auto-generated types from translation files
interface TranslationKeys {
  common: {
    save: string;
    cancel: string;
    delete: string;
    edit: string;
    // ... more common keys
  };
  navigation: {
    dashboard: string;
    plants: string;
    projects: string;
    tasks: string;
    calendar: string;
  };
  // ... more namespaces
}
```

## Data Models

### Translation File Structure

```json
{
  "common": {
    "save": "Save",
    "cancel": "Cancel",
    "delete": "Delete",
    "edit": "Edit",
    "loading": "Loading...",
    "error": "An error occurred",
    "success": "Operation completed successfully"
  },
  "navigation": {
    "dashboard": "Dashboard",
    "plants": "Plants",
    "projects": "Projects",
    "tasks": "Tasks",
    "calendar": "Calendar"
  },
  "auth": {
    "login": "Login",
    "logout": "Logout",
    "email": "Email",
    "password": "Password",
    "signIn": "Sign In"
  },
  "dashboard": {
    "welcome": "Welcome to your household management dashboard",
    "stats": {
      "totalPlants": "Total Plants",
      "activeTasks": "Active Tasks",
      "completedProjects": "Completed Projects"
    }
  },
  "forms": {
    "validation": {
      "required": "This field is required",
      "email": "Please enter a valid email address",
      "minLength": "Minimum {{count}} characters required"
    }
  }
}
```

### Language Configuration

```typescript
interface LanguageConfig {
  code: string;
  name: string;
  nativeName: string;
  flag: string;
  dateFormat: string;
  timeFormat: string;
  rtl: boolean;
}

const SUPPORTED_LANGUAGES: LanguageConfig[] = [
  {
    code: 'hu',
    name: 'Hungarian',
    nativeName: 'Magyar',
    flag: '🇭🇺',
    dateFormat: 'yyyy.MM.dd',
    timeFormat: 'HH:mm',
    rtl: false
  },
  {
    code: 'en',
    name: 'English',
    nativeName: 'English',
    flag: '🇺🇸',
    dateFormat: 'MM/dd/yyyy',
    timeFormat: 'h:mm a',
    rtl: false
  }
];
```

## Error Handling

### Translation Key Fallbacks

1. **Missing Translation**: Display English translation if Hungarian is missing
2. **Missing Key**: Display the translation key itself with warning in development
3. **Loading Errors**: Show fallback content while translations load
4. **Network Errors**: Cache translations in localStorage for offline access

### Error Boundaries

- Wrap language selector in error boundary to prevent app crashes
- Graceful degradation when i18next fails to initialize
- Fallback to English if Hungarian translations fail to load

### Validation Messages

```typescript
// Translated validation messages
const validationMessages = {
  required: t('forms.validation.required'),
  email: t('forms.validation.email'),
  minLength: t('forms.validation.minLength', { count: minLength })
};
```

## Testing Strategy

### Unit Tests

1. **I18nProvider Tests**
   - Language initialization with Hungarian default
   - Language switching functionality
   - localStorage persistence
   - Error handling for missing translations

2. **LanguageSelector Tests**
   - Dropdown rendering and interaction
   - Language change events
   - Accessibility compliance (ARIA labels, keyboard navigation)
   - Mobile responsive behavior

3. **Translation Hook Tests**
   - Translation function accuracy
   - Interpolation with variables
   - Fallback behavior for missing keys
   - Loading state management

### Integration Tests

1. **Full App Translation Tests**
   - Complete language switching across all pages
   - Form validation message translations
   - Navigation menu translations
   - Error message translations

2. **Accessibility Tests**
   - Screen reader compatibility
   - Keyboard navigation
   - Focus management during language changes
   - ARIA announcements for language switches

### End-to-End Tests

1. **User Journey Tests**
   - First-time user sees Hungarian by default
   - Language preference persistence across sessions
   - Language switching maintains page context
   - Mobile and desktop language selector behavior

### Performance Tests

1. **Translation Loading**
   - Initial load time with Hungarian translations
   - Language switching performance
   - Bundle size impact of translation files
   - Lazy loading of translation resources

## Implementation Approach

### Phase 1: Core Infrastructure
- Install and configure react-i18next
- Create I18nProvider context and hook
- Set up translation file structure
- Implement Hungarian as default language

### Phase 2: Language Selector
- Create LanguageSelector component
- Integrate into AppLayout header
- Implement accessibility features
- Add mobile-responsive design

### Phase 3: Translation Implementation
- Translate all existing UI text
- Create comprehensive translation files
- Implement form validation translations
- Add error message translations

### Phase 4: Testing and Polish
- Write comprehensive test suite
- Perform accessibility audit
- Optimize performance
- Add TypeScript types for translation keys

### File Organization

```
src/
├── i18n/
│   ├── index.ts                 # i18next configuration
│   ├── resources/
│   │   ├── hu/
│   │   │   ├── common.json
│   │   │   ├── navigation.json
│   │   │   ├── auth.json
│   │   │   ├── dashboard.json
│   │   │   ├── forms.json
│   │   │   └── errors.json
│   │   └── en/
│   │       ├── common.json
│   │       ├── navigation.json
│   │       ├── auth.json
│   │       ├── dashboard.json
│   │       ├── forms.json
│   │       └── errors.json
│   └── types.ts                 # Translation key types
├── contexts/
│   └── I18nContext.tsx          # I18n context provider
├── hooks/
│   └── useTranslation.ts        # Translation hook
└── components/
    └── i18n/
        └── LanguageSelector.tsx # Language selection component
```

This design ensures a robust, accessible, and maintainable internationalization system that meets all the specified requirements while following React and accessibility best practices.