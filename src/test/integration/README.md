Integration Tests (for project-b) - status: inert by default

What this means
- All integration tests in src/test/integration are currently inert (no tests run).
- They won’t affect the default test suite until re-enabled.

How to re-enable later
1) Restore original test contents from version control or backup for the desired integration test files.
2) Alternatively, checkout a previous commit where integration tests were enabled and copy back the files.
3) Run npm test to verify the integration tests pass.
4) If you want a toggle instead of full re-enable, consider wrapping tests in describe.skip/describe.only or gating with a feature flag, then wire a short script to enable them.
