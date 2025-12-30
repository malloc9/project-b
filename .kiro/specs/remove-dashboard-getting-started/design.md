# Design Document

## Overview

This design outlines the removal of the "Getting Started" section from the DashboardPage component. The change involves removing the ContentArea component that contains the getting started tips while preserving the existing stats overview and recent activity sections.

## Architecture

The dashboard currently has three main sections:
1. Stats overview (4 cards in a grid)
2. Recent activity and calendar summary (2-column grid)
3. Getting started tips (3-column grid) - **TO BE REMOVED**

After the change, the dashboard will have two main sections with proper spacing maintained.

## Components and Interfaces

### DashboardPage Component Changes

**Current Structure:**
```tsx
<div className="space-y-6">
  {/* Stats overview */}
  <div>...</div>
  
  {/* Recent activity and calendar summary */}
  <GridLayout columns={2}>...</GridLayout>
  
  {/* Tips and getting started - TO BE REMOVED */}
  <ContentArea title="Getting Started">...</ContentArea>
</div>
```

**New Structure:**
```tsx
<div className="space-y-6">
  {/* Stats overview */}
  <div>...</div>
  
  {/* Recent activity and calendar summary */}
  <GridLayout columns={2}>...</GridLayout>
</div>
```

### Translation Keys to Remove

The following translation keys will no longer be needed:
- `dashboard:gettingStarted`
- `dashboard:gettingStartedSubtitle`
- `dashboard:tips.addFirstPlant`
- `dashboard:tips.addFirstPlantDescription`
- `dashboard:tips.createProject`
- `dashboard:tips.createProjectDescription`
- `dashboard:tips.syncCalendar`
- `dashboard:tips.syncCalendarDescription`

## Data Models

No data model changes are required as this is purely a UI modification.

## Error Handling

No additional error handling is needed. The existing error handling for stats and calendar data remains unchanged.

## Testing Strategy

### Unit Tests
- Verify that the DashboardPage component renders without the getting started section
- Ensure that stats overview and recent activity sections continue to render correctly
- Test that the component maintains proper spacing and layout

### Integration Tests
- Verify that dashboard functionality remains intact after removing the getting started section
- Test responsive behavior across different screen sizes
- Ensure no broken translation keys or missing content

### Visual Regression Tests
- Compare dashboard layout before and after the change
- Verify proper spacing between remaining sections
- Test mobile and desktop layouts