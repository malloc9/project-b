# Specification: Display Build Time in Sidebar

## 1. Overview
Add an information icon to the bottom of the sidebar that, when clicked, displays the timestamp of when the application was built. This provides users and developers with a quick way to verify the current version's deployment time.

## 2. Functional Requirements
*   **Info Icon:** An `InformationCircleIcon` (from Heroicons) shall be placed at the very bottom of the `Sidebar` component.
*   **Build Time Detection:** The application shall capture the build timestamp during the build process (e.g., via Vite's `define` or an environment variable).
*   **Display Mechanism:** Clicking the icon shall trigger a small popover or persistent tooltip pointing to the icon.
*   **Content:** The popover shall display the build time formatted as a full localized date and time (e.g., "January 11, 2026 at 2:30 PM").
*   **Persistence:** The popover should close when the user clicks outside of it or clicks the icon again.

## 3. Non-Functional Requirements
*   **Visual Style:** The icon should use a subtle color (e.g., `text-gray-400` or `text-gray-500`) to remain unobtrusive.
*   **Internationalization:** The build time string and any labels should be localized using the existing i18next setup.
*   **Accessibility:** The button should have an appropriate `aria-label` for screen readers.

## 4. Acceptance Criteria
*   [ ] The info icon is visible at the bottom of the sidebar.
*   [ ] Clicking the icon opens a popover showing the build time.
*   [ ] The build time is formatted correctly according to the current locale.
*   [ ] The popover closes when clicking elsewhere.
*   [ ] The build time accurately reflects the latest build (mocked during development).

## 5. Out of Scope
*   Displaying a version number (e.g., 1.0.1).
*   Displaying git commit hashes.
*   Linking to a full "About" page.
