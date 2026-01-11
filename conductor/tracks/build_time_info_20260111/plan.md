# Plan: Display Build Time in Sidebar

## Phase 1: Infrastructure and Configuration [checkpoint: dffce33]
*   [x] Task: Configure Vite to inject the build timestamp as a global constant using `define`. (3a57ee2)
*   [x] Task: Create a utility or hook to retrieve and format the build timestamp. (c1e151b)
*   [x] Task: Conductor - User Manual Verification 'Infrastructure and Configuration' (Protocol in workflow.md) (dffce33)

## Phase 2: UI Component Development (TDD) [checkpoint: db94c81]
*   [x] Task: Write failing tests for the `BuildInfo` component (icon and popover logic). (cc19cdb)
*   [x] Task: Implement the `BuildInfo` component using Heroicons and Headless UI (or similar) for the popover. (a969edc)
*   [x] Task: Integrate the `BuildInfo` component into the `Sidebar` at the bottom. (144a77d)
*   [x] Task: Conductor - User Manual Verification 'UI Component Development' (Protocol in workflow.md) (db94c81)

## Phase 3: Localization and Final Polish
*   [x] Task: Add translation keys for accessibility labels and build time prefixes. (d20c188)
*   [~] Task: Verify the build time display in different locales (English and Hungarian).
*   [ ] Task: Conductor - User Manual Verification 'Localization and Final Polish' (Protocol in workflow.md)
