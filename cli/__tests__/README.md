# Test Layout

Use this directory for tests that span multiple modules, commands, or generated artifacts.

Preferred placement:
- Put pure module tests next to the implementation file in `cli/lib/**` or `cli/utils/**`.
- Keep command-focused tests here because they usually mock several modules and exercise CLI-facing behavior.
- Keep smoke tests here when they validate generated output or end-to-end compatibility across modules.

Current subfolders:
- `smoke/` — generated artifact and compatibility checks
