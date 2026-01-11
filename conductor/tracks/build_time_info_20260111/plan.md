# Plan: Display Build Time in Sidebar

## Phase 1: Infrastructure and Configuration
*   [x] Task: Configure Vite to inject the build timestamp as a global constant using `define`. (3a57ee2)
*   [x] Task: Create a utility or hook to retrieve and format the build timestamp. (c1e151b)
*   [~] Task: Conductor - User Manual Verification 'Infrastructure and Configuration' (Protocol in workflow.md)

## Phase 2: UI Component Development (TDD)
*   [ ] Task: Write failing tests for the `BuildInfo` component (icon and popover logic).
*   [ ] Task: Implement the `BuildInfo` component using Heroicons and Headless UI (or similar) for the popover.
*   [ ] Task: Integrate the `BuildInfo` component into the `Sidebar` at the bottom.
*   [ ] Task: Conductor - User Manual Verification 'UI Component Development' (Protocol in workflow.md)

## Phase 3: Localization and Final Polish
*   [ ] Task: Add translation keys for accessibility labels and build time prefixes.
*   [ ] Task: Verify the build time display in different locales (English and Hungarian).
*   [ ] Task: Conductor - User Manual Verification 'Localization and Final Polish' (Protocol in workflow.md)
