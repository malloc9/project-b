# Spec: Implement a Dynamic and Actionable Dashboard

## 1. Overview

This track will enhance the existing Dashboard page to provide users with a dynamic and actionable overview of their household information. The goal is to replace the current placeholder content with real, timely data from the user's tasks, projects, and plant care schedules.

## 2. Key Features

### 2.1. "This Week" Stat

- **Description:** The "This Week" statistics card on the dashboard will display a count of all tasks and projects with a due date within the next 7 days.
- **Data Source:**
    - Tasks from the `tasks` collection in Firestore.
    - Projects from the `projects` collection in Firestore.
- **Logic:**
    - Fetch all tasks and projects for the current user.
    - Filter the items to include only those with a `dueDate` that falls between today and 7 days from now.
    - The value displayed on the card will be the total count of these items.

### 2.2. "Recent Activity" Feed

- **Description:** A new "Recent Activity" section will be added to the dashboard to display a chronological list of recent user actions.
- **Data Source:** This will likely require a new top-level `activity` collection in Firestore to log events. Each document in this collection should contain:
    - `userId`
    - `timestamp`
    - `type` (e.g., 'TASK_COMPLETED', 'PLANT_ADDED', 'PROJECT_UPDATED')
    - `relatedId` (e.g., the ID of the task, plant, or project)
    - `description` (a human-readable string, e.g., "You completed the task 'Water the plants'.")
- **Logic:**
    - The feed will display the last 5-10 activity items for the current user, sorted in descending order by `timestamp`.
    - The UI should be designed to clearly present the type and description of each activity.

### 2.3. "Upcoming Items" View

- **Description:** This section will provide a consolidated list of upcoming deadlines and reminders.
- **Data Source:**
    - Tasks with a `dueDate`.
    - Projects with a `dueDate`.
    - Plant care tasks with a `nextDueDate`.
- **Logic:**
    - Fetch all tasks, projects, and plant care tasks for the user.
    - Combine these items into a single list, and sort them by their upcoming due dates.
    - The view should display the title of the item, its due date, and what type of item it is (e.g., Task, Project, Plant Care).
    - Only items with a due date in the future should be displayed.

## 3. UI/UX Considerations

- The dashboard should remain clean and uncluttered, adhering to the "professional and understated" design guideline.
- Loading states should be implemented for each new dynamic section to provide a smooth user experience.
- Error states should be handled gracefully, with clear messages if data cannot be loaded.

## 4. Acceptance Criteria

- The "This Week" stat accurately reflects the number of items due in the next 7 days.
- The "Recent Activity" feed displays a list of recent actions taken by the user.
- The "Upcoming Items" view shows a sorted list of future deadlines and reminders.
- All new sections are responsive and display correctly on different screen sizes.
- The dashboard remains performant and does not introduce significant load times.
