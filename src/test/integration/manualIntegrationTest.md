# Manual Integration Test Checklist

This document provides a checklist for manually testing the complete integration of the Household Management application.

## Prerequisites
1. Firebase project configured with valid environment variables
2. Application built and running locally
3. Test user account available

## Test Scenarios

### 1. Authentication Flow
- [ ] Navigate to application URL
- [ ] Verify login page displays correctly
- [ ] Enter valid credentials and login
- [ ] Verify redirect to dashboard
- [ ] Test logout functionality
- [ ] Test password reset flow

### 2. Navigation and Layout
- [ ] Verify responsive navigation bar displays
- [ ] Test mobile hamburger menu (resize to mobile viewport)
- [ ] Navigate to each main section:
  - [ ] Dashboard
  - [ ] Plant Codex
  - [ ] Projects
  - [ ] Tasks
  - [ ] Calendar
- [ ] Verify proper page transitions
- [ ] Test browser back/forward navigation

### 3. Plant Management Workflow
- [ ] Navigate to Plant Codex
- [ ] Create a new plant entry
- [ ] Upload photos to the plant
- [ ] View photo timeline
- [ ] Create care tasks for the plant
- [ ] Verify care tasks appear in calendar
- [ ] Edit plant information
- [ ] Delete a plant (test confirmation)

### 4. Project Management Workflow
- [ ] Navigate to Projects page
- [ ] Create a new project with due date
- [ ] Add subtasks to the project
- [ ] Update subtask status (todo → in progress → finished)
- [ ] Verify project completion when all subtasks done
- [ ] Check calendar integration for project deadlines
- [ ] Test project filtering and search

### 5. Simple Task Management
- [ ] Navigate to Tasks page
- [ ] Create a simple task with due date
- [ ] Mark task as completed
- [ ] Verify calendar synchronization
- [ ] Test task sorting by due date
- [ ] Delete completed tasks

### 6. Calendar Integration
- [ ] Navigate to Calendar page
- [ ] Verify plant care tasks appear
- [ ] Verify project deadlines appear
- [ ] Verify simple tasks appear
- [ ] Test calendar event updates when tasks change
- [ ] Check calendar sync status indicators

### 7. Responsive Design Testing
- [ ] Test on mobile viewport (375px width)
  - [ ] Navigation collapses to hamburger menu
  - [ ] Forms are single-column
  - [ ] Tables scroll horizontally if needed
  - [ ] Touch targets are appropriately sized
- [ ] Test on tablet viewport (768px width)
  - [ ] Layout adapts appropriately
  - [ ] Navigation remains accessible
- [ ] Test on desktop viewport (1024px+ width)
  - [ ] Full sidebar navigation visible
  - [ ] Multi-column layouts where appropriate
  - [ ] Optimal use of screen space

### 8. Error Handling
- [ ] Test with network disconnected (offline mode)
- [ ] Verify error boundaries catch component errors
- [ ] Test form validation errors
- [ ] Test file upload errors (wrong format, too large)
- [ ] Verify user-friendly error messages

### 9. Performance and Loading
- [ ] Verify loading spinners during data fetch
- [ ] Test lazy loading of images
- [ ] Check for smooth transitions and animations
- [ ] Verify no console errors in browser dev tools
- [ ] Test with large datasets (many plants/projects/tasks)

### 10. Data Persistence
- [ ] Create data, refresh page, verify data persists
- [ ] Test offline data caching
- [ ] Verify data sync when coming back online
- [ ] Test concurrent editing scenarios

## Success Criteria
- All checklist items pass without critical issues
- Application is responsive across all tested viewports
- No JavaScript errors in browser console
- All user workflows complete successfully
- Data persists correctly across sessions
- Calendar integration works as expected

## Notes
Record any issues found during testing:

1. Issue: [Description]
   - Steps to reproduce: [Steps]
   - Expected: [Expected behavior]
   - Actual: [Actual behavior]
   - Severity: [Critical/High/Medium/Low]

2. [Additional issues...]

## Test Completion
- [ ] All critical workflows tested
- [ ] Responsive design verified
- [ ] Error handling confirmed
- [ ] Performance acceptable
- [ ] Integration complete and functional