# Design Document

## Overview

This design outlines the approach to identify and fix missing translations throughout the household management application. The solution involves systematically auditing all components for hardcoded text, creating comprehensive translation keys, and implementing proper internationalization patterns.

## Architecture

### Translation System Analysis

The application already has a solid i18n foundation:
- React i18next integration via `useTranslation` hook
- Organized translation files by namespace (auth, common, dashboard, errors, forms, navigation)
- Language switching functionality
- Fallback mechanisms

### Current Translation Coverage

**Existing Namespaces:**
- `auth` - Authentication related text
- `common` - General UI elements and actions
- `dashboard` - Dashboard specific content
- `errors` - Error messages and validation
- `forms` - Form labels, placeholders, validation
- `navigation` - Navigation menu items

**Missing Coverage Areas:**
- Calendar components (dates, events, statuses)
- Loading states and system feedback
- Accessibility text (sr-only content)
- Component-specific labels and descriptions
- Error boundary and system messages

## Components and Interfaces

### Translation Key Structure

```typescript
interface TranslationKeys {
  calendar: {
    summary: string;
    viewCalendar: string;
    allDay: string;
    today: string;
    tomorrow: string;
    overdue: string;
    upcoming: string;
    noUpcomingEvents: string;
    calendarClearForNow: string;
    eventTypes: {
      task: string;
      project: string;
      plantCare: string;
      custom: string;
    };
  };
  loading: {
    loading: string;
    loadingData: string;
    pleaseWait: string;
  };
  accessibility: {
    close: string;
    openMenu: string;
    loading: string;
    error: string;
  };
  system: {
    retry: string;
    healthCheck: string;
    fullRecovery: string;
    clearErrorHistory: string;
    updateNow: string;
    retryWithSmartBackoff: string;
  };
}
```

### Component Modification Strategy

1. **Audit Phase**: Systematically review all components for hardcoded strings
2. **Key Creation**: Create translation keys following existing namespace patterns
3. **Implementation**: Replace hardcoded strings with `t()` function calls
4. **Validation**: Ensure fallback values are provided for all keys

### Translation File Organization

```
src/i18n/resources/
├── en/
│   ├── auth.json (existing)
│   ├── common.json (existing)
│   ├── dashboard.json (existing)
│   ├── errors.json (existing)
│   ├── forms.json (existing)
│   ├── navigation.json (existing)
│   ├── calendar.json (new)
│   ├── loading.json (new)
│   ├── accessibility.json (new)
│   └── system.json (new)
└── hu/
    ├── (same structure as en/)
```

## Data Models

### Translation Audit Results

Based on code analysis, the following hardcoded strings were identified:

**Calendar Components:**
- "Calendar Summary"
- "View Calendar" 
- "All day"
- "Today"
- "Tomorrow"
- "Overdue"
- "Upcoming"
- "No upcoming events"
- "Your calendar is clear for now"

**System Messages:**
- "Loading..."
- "Error"
- "Retry"
- "Health Check"
- "Update Now"
- "Retry with Smart Backoff"
- "Full Recovery"
- "Clear Error History"

**Accessibility Text:**
- "Close"
- "Open main menu"
- Various sr-only labels

**Form Elements:**
- "All Types"
- "All Statuses"
- Various option labels

## Error Handling

### Translation Error Handling

1. **Missing Keys**: Use fallback values when translation keys don't exist
2. **Loading States**: Show English text while translations load
3. **Namespace Errors**: Gracefully handle missing translation namespaces
4. **Language Switching**: Ensure smooth transitions between languages

### Implementation Pattern

```typescript
const safeT = (key: string, fallback: string) => {
  if (isLoading) return fallback;
  return t(key, { defaultValue: fallback });
};
```

## Testing Strategy

### Translation Testing Approach

1. **Unit Tests**: Test translation key usage in components
2. **Integration Tests**: Verify language switching functionality
3. **Visual Testing**: Ensure UI layout works with different text lengths
4. **Accessibility Testing**: Verify translated screen reader content

### Test Categories

1. **Key Coverage Tests**: Ensure all hardcoded strings are replaced
2. **Fallback Tests**: Verify fallback behavior when keys are missing
3. **Language Switch Tests**: Test switching between English and Hungarian
4. **Layout Tests**: Ensure translated text doesn't break UI layouts

### Testing Tools

- Vitest for unit tests
- React Testing Library for component tests
- Manual testing for visual verification
- Accessibility testing tools for screen reader content

## Implementation Phases

### Phase 1: Calendar Components
- CalendarSummary component
- CalendarFilters component
- Date formatting functions

### Phase 2: System Messages
- Loading states
- Error messages
- System feedback

### Phase 3: Accessibility
- Screen reader text
- ARIA labels
- Focus management text

### Phase 4: Forms and Validation
- Missing form labels
- Validation messages
- Option labels

## Quality Assurance

### Translation Quality Checks

1. **Consistency**: Ensure consistent terminology across components
2. **Context**: Verify translations make sense in context
3. **Length**: Check that translated text fits in UI layouts
4. **Cultural**: Ensure translations are culturally appropriate

### Code Quality Standards

1. **No Hardcoded Strings**: All user-facing text must use translation system
2. **Fallback Values**: All translation calls must include fallback values
3. **Namespace Organization**: Follow established namespace patterns
4. **Key Naming**: Use descriptive, hierarchical key names