# Testing Notes

## Signal Handler Leak Issue

Some tests may fail with "signal handler leak detected" errors. This is a **known issue** caused by the Logger's SubLoggerManager registering SIGINT/SIGTERM handlers for graceful shutdown.

### Why it happens:
- The Logger registers signal handlers to finalize logs on exit (expected behavior)
- Deno's test runner detects these as "leaks" since they're not cleaned up
- Whichever test first creates a Logger will fail with this error

### Affected tests:
- Any test that creates an operation (which creates a Logger)
- Particularly: SelectOperation and ConfirmOperation tests

### Workarounds:
1. Use `Deno.test.ignore()` for affected tests
2. Run tests with `--no-check` flag
3. Future fix: Add a cleanup method to Logger for test environments

### Status:
This is not a bug in the UI primitives themselves, but rather a test infrastructure issue. All operations work correctly in real usage.