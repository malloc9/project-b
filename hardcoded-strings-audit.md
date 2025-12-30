# Hardcoded Strings Audit Report

## Overview
This document lists all hardcoded strings found in the component files that should be using the translation system.

## Calendar Components

### EventDetailsModal.tsx
- "Event Details" (modal title)
- "Description" (section header)
- "Recurrence" (section header)
- "Notifications" (section header)
- "Task", "Project", "Plant Care", "Custom Event", "Event" (event type labels)
- "Repeats" (recurrence text)
- "Browser", "In-app" (notification types)
- "notification", "minutes before", "(disabled)" (notification text)
- "View source" (link text)
- "Mark Pending", "Mark Complete" (status toggle buttons)
- "Edit", "Delete" (action buttons)
- "Are you sure you want to delete this event?" (confirmation dialog)
- "Failed to delete event", "Failed to update event status" (error messages)

### VirtualEventList.tsx
- "No events" (empty state title)
- "No events found for the selected criteria." (empty state description)
- "Total Events:", "Visible:", "Render Time:", "Performance:" (debug info)
- "Virtual scrolling active", "Standard rendering" (performance text)

### DayView.tsx
- "Error loading day view" (error message)
- "Retry" (retry button)
- "All Day" (all-day events section header)

### CalendarView.tsx
- "Error loading calendar" (error message)

## Plant Components

### PlantDetail.tsx
- "Plant Information" (section header)
- "Name", "Species", "Description", "Added", "Last Updated" (field labels)
- "Quick Stats" (section header)
- "Photos uploaded", "Care tasks", "Completed tasks" (stats labels)

### CareTaskList.tsx
- "Care Tasks" (section header)
- "No care tasks scheduled" (empty state title)
- "Add care tasks like watering, fertilizing, or repotting to keep your plant healthy" (empty state description)
- "Add First Task" (button text)
- "Edit task", "Delete task" (button titles)

### PhotoTimeline.tsx
- "Photo Timeline" (section header)
- "Upload with Details" (button text)
- "No photos yet" (empty state title)
- "Upload photos to track your plant's growth over time" (empty state description)
- "Detailed Timeline" (section header)
- "No description" (placeholder text)

## Debug Components

### FirebaseDebug.tsx
- "Status:", "Valid", "Invalid" (status labels)
- "Errors:", "Warnings:" (section headers)
- "Testing...", "Test Connection" (button text)
- "✅ Connection successful!", "❌" (test result messages)
- "Check browser console for detailed logs" (help text)
- "See FIREBASE_TROUBLESHOOTING.md for setup help" (help text)

## Layout Components

### QuickActionCard.tsx
- "Click to access" (action hint)

### NavigationBar.tsx
- Uses translation system correctly with `safeT('navigation:openMainMenu', 'Open main menu')`

### Sidebar.tsx
- Uses translation system correctly

## Task Components

### TaskDetail.tsx
- "Error" (error header)
- "Task not found" (error message)

## Common Components

### NotificationList.tsx
- "No notifications" (empty state)

### UpdateNotification.example.tsx
- "Update Notification Demo" (demo title)
- "Features demonstrated:" (demo description)
- Various feature descriptions (demo content)

## Form Components
Most form components appear to be using the translation system correctly.

## Authentication Components
Most authentication components appear to be using the translation system correctly with proper fallbacks.

## Summary

### Critical Issues Found:
1. **Calendar Components**: Multiple hardcoded strings in EventDetailsModal, VirtualEventList, DayView
2. **Plant Components**: Extensive hardcoded strings in PlantDetail, CareTaskList, PhotoTimeline
3. **Debug Components**: All strings in FirebaseDebug are hardcoded
4. **Layout Components**: Some hardcoded strings in QuickActionCard

### Components Using Translation System Correctly:
- Authentication components (LoginForm, PasswordResetForm, etc.)
- Navigation components (NavigationBar, Sidebar)
- Most form components

### Recommended Actions:
1. Create missing translation keys for all identified hardcoded strings
2. Update components to use translation system with proper fallbacks
3. Add comprehensive tests to ensure no new hardcoded strings are introduced
4. Implement linting rules to catch hardcoded strings in the future