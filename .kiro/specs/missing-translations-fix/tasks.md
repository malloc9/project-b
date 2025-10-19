# Implementation Plan

- [x] 1. Create new translation namespace files
  - Create calendar.json translation files for English and Hungarian
  - Create loading.json translation files for English and Hungarian  
  - Create accessibility.json translation files for English and Hungarian
  - Create system.json translation files for English and Hungarian
  - _Requirements: 1.1, 1.2, 2.1, 2.2_

- [x] 2. Implement calendar component translations
  - [x] 2.1 Update CalendarSummary component with translation keys
    - Replace hardcoded strings like "Calendar Summary", "View Calendar", "All day", "Today", "Tomorrow", "Overdue", "Upcoming"
    - Add translation keys for "No upcoming events" and "Your calendar is clear for now"
    - Implement proper date formatting with locale support
    - _Requirements: 1.1, 3.1, 3.3_

  - [x] 2.2 Update CalendarFilters component with translation keys
    - Replace hardcoded option labels like "All Types", "All Statuses"
    - Add translation keys for filter labels and advanced filter headers
    - Update event type options (task, project, plant_care, custom) with translations
    - _Requirements: 1.1, 3.1, 4.1_

- [x] 3. Implement system message translations
  - [x] 3.1 Update loading states across components
    - Replace hardcoded "Loading..." text in components
    - Add translation keys for various loading messages
    - Update ProtectedRoute and PublicRoute loading spinners
    - _Requirements: 1.1, 5.2_

  - [x] 3.2 Update error handling components
    - Replace hardcoded "Error" text in ErrorMessage component
    - Update UpdateNotification component system messages
    - Add translation keys for retry, health check, and recovery actions
    - _Requirements: 1.1, 5.1, 5.2_

- [x] 4. Implement accessibility translations
  - [x] 4.1 Update screen reader text
    - Replace hardcoded sr-only text like "Close", "Open main menu"
    - Add translation keys for ARIA labels and descriptions
    - Update focus management and navigation accessibility text
    - _Requirements: 1.1, 5.4_

  - [x] 4.2 Fix CalendarPage component translations
    - Replace hardcoded strings in CalendarPage: "Calendar", "Manage your events and schedule", "Month", "Day", "New Event", "Please log in to view your calendar."
    - Update view toggle buttons and header text to use translation keys
    - Add missing translation keys to calendar.json files
    - _Requirements: 1.1, 3.1, 4.1_

- [x] 5. Update form and validation translations
  - [x] 5.1 Add missing form element translations
    - Update any remaining hardcoded form labels and placeholders
    - Add translation keys for form instructions and help text
    - Ensure all form validation messages use translation system
    - _Requirements: 1.1, 4.1, 4.2, 4.4_

  - [ ] 5.2 Implement Plant Codex page translations
    - Create plants.json translation files for English and Hungarian
    - Replace hardcoded strings in PlantsPage component: "Plant Codex", "Manage your plant collection...", "Add Plant", "Back to Plants"
    - Add translation keys for plant statistics: "Total Plants", "Photos Uploaded", "Care Tasks", descriptions
    - Update plant-related components with proper translation keys
    - _Requirements: 1.1, 1.4, 4.1_

  - [x] 5.4 Implement Tasks page translations
    - Create tasks.json translation files for English and Hungarian
    - Replace hardcoded strings in TaskList component: "Tasks", "New Task", "Search tasks...", filter options, status labels, empty states
    - Replace hardcoded strings in TaskDetail component: "Task Details", "Edit", "Delete", "Description", "Due Date", "Created", "Last Updated", status labels
    - Update confirmation dialogs and error messages with proper translation keys
    - Add translation keys for task-related status labels and action buttons
    - _Requirements: 1.1, 1.4, 4.1, 4.2_

  - [x] 5.3 Implement Projects page translations
    - Create projects.json translation files for English and Hungarian
    - Replace hardcoded strings in ProjectList component: "Projects", "New Project", "Search projects...", "All Status", status labels, empty states
    - Replace hardcoded strings in ProjectDetail component: "Description", "Due Date", "Progress", "Status", "Subtasks", "Add Subtask", "Edit", "Delete"
    - Replace hardcoded strings in ProjectForm component: "Create New Project", "Edit Project", "Project Title", form labels, validation messages
    - Replace hardcoded strings in ProjectProgressTracker component: "Project Overview", "Total Projects", "Completed", "In Progress", "Overdue", progress labels
    - Update all project-related status labels and action buttons with proper translation keys
    - _Requirements: 1.1, 1.4, 4.1, 4.2_

- [x] 6. Implement date and time localization
  - [x] 6.1 Update date formatting functions
    - Modify formatEventDate function to use localized date formats
    - Update time formatting to respect locale preferences
    - Ensure relative date terms (Today, Tomorrow) are translated
    - _Requirements: 3.2, 3.3_

- [x] 7. Add translation tests
  - [x] 7.1 Create unit tests for translation coverage
    - Write tests to verify all components use translation keys
    - Test fallback behavior when translation keys are missing
    - Verify language switching functionality works correctly
    - _Requirements: 1.3, 2.3_

  - [x] 7.2 Create integration tests for translation system
    - Test complete language switching workflow
    - Verify translated text doesn't break UI layouts
    - Test accessibility features with translated content
    - _Requirements: 1.1, 1.2, 5.4_

- [x] 8. Update I18nContext error handling
  - Replace hardcoded error messages in I18nContext component
  - Add proper translation keys for language loading failures
  - Implement better fallback mechanisms for translation errors
  - _Requirements: 1.3, 2.3, 5.1_

- [x] 9. Validate translation completeness
  - [x] 9.1 Audit all components for remaining hardcoded strings
    - Systematically review each component file for untranslated text
    - Create comprehensive list of any remaining hardcoded strings
    - Verify all user-facing text uses the translation system
    - _Requirements: 1.1, 1.4, 2.1_

  - [x] 9.2 Test language switching across all components
    - Manually test switching between English and Hungarian
    - Verify all translated text displays correctly in both languages
    - Check that UI layouts accommodate different text lengths
    - _Requirements: 1.1, 1.2_