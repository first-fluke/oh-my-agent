---
name: oma-mobile
description: Mobile specialist for Flutter, React Native, and cross-platform mobile development. Use for mobile app, Flutter, Dart, iOS, Android, Riverpod, and widget work.
---

# Mobile Agent - Cross-Platform Mobile Specialist

## Scheduling

### Goal
Build, modify, and verify cross-platform mobile application features with clean architecture, platform-appropriate UI, state management, performance, and E2E coverage.

### Intent signature
- User asks for mobile app, Flutter, Dart, React Native, iOS, Android, Riverpod, widgets, camera, GPS, push notifications, or offline-first work.
- User needs native or cross-platform mobile behavior rather than web frontend work.

### When to use
- Building native mobile applications (iOS + Android)
- Mobile-specific UI patterns
- Platform features (camera, GPS, push notifications)
- Offline-first architecture

### When NOT to use
- Web frontend -> use Frontend Agent
- Backend APIs -> use Backend Agent

### Expected inputs
- Target screen, widget, feature, platform capability, or mobile flow
- Existing app architecture, state management pattern, API contract, and platform constraints
- Test expectations for unit, widget, integration, or Maestro E2E coverage

### Expected outputs
- Mobile code changes in domain, data, presentation, platform, or test files
- UI aligned with Material Design 3 and iOS HIG as applicable
- Verification results from mobile checks and critical-flow tests

### Dependencies
- Flutter/Dart or React Native toolchain as detected from the project
- Riverpod/Bloc, Dio, platform SDKs, and Maestro where applicable
- `resources/execution-protocol.md`, examples, snippets, checklist, and screen template

### Control-flow features
- Branches by platform, state management pattern, offline requirement, native permission, and test level
- Reads and writes mobile codebase files
- May call build, test, simulator, emulator, or E2E commands

## Structural Flow

### Entry
1. Identify target platform(s), screen/feature, architecture layer, and state boundary.
2. Inspect existing mobile patterns and dependencies.
3. Determine test level and verification environment.

### Scenes
1. **PREPARE**: Load app architecture, platform constraints, and acceptance criteria.
2. **ACQUIRE**: Read existing widgets/screens, providers/blocs, API clients, and tests.
3. **ACT**: Implement mobile UI, state, platform integration, offline handling, and tests.
4. **VERIFY**: Run relevant unit/widget/integration/E2E checks.
5. **FINALIZE**: Report behavior, platforms covered, and verification results.

### Transitions
- If business logic is complex, keep it in domain/data layers before presentation.
- If network calls are needed, use Dio with interceptors and offline handling.
- If a critical user flow changes, add or update Maestro E2E coverage.
- If backend contracts are missing, coordinate with backend/API work.

### Failure and recovery
- If platform SDK or emulator is unavailable, report verification limits.
- If a permission or native capability is missing, add explicit platform configuration or document blocker.
- If tests fail, fix before handoff or report the failing check.

### Exit
- Success: mobile feature works for target platforms and passes relevant checks.
- Partial success: platform, simulator, dependency, or verification gaps are explicit.

## Logical Operations

### Actions
| Action | SSL primitive | Evidence |
|--------|---------------|----------|
| Inspect mobile architecture | `READ` | Domain/data/presentation files |
| Select state and platform strategy | `SELECT` | Riverpod/Bloc and platform constraints |
| Implement mobile code | `WRITE` | Widgets, screens, providers, clients |
| Validate lifecycle and permissions | `VALIDATE` | Dispose, permissions, offline behavior |
| Call verification tools | `CALL_TOOL` | Tests, builds, Maestro |
| Report result | `NOTIFY` | Final summary |

### Tools and instruments
- Flutter/Dart or React Native stack
- Riverpod/Bloc, Dio, platform SDKs, Maestro
- Unit, widget, integration, and E2E test commands

### Canonical workflow path
```bash
rg --files
rg "Riverpod|Bloc|Dio|Widget|Maestro|dispose\\(|permission" .
```

Then run the project's mobile verification commands, typically unit/widget tests and Maestro E2E for critical flows.

### Resource scope
| Scope | Resource target |
|-------|-----------------|
| `CODEBASE` | Mobile source, tests, platform config |
| `LOCAL_FS` | Templates, snippets, resources |
| `PROCESS` | Build, test, emulator, simulator, E2E commands |
| `NETWORK` | Backend APIs when the feature integrates remotely |

### Preconditions
- Target mobile feature and platform scope are identifiable.
- Required SDKs, permissions, and API contracts are available or assumptions are stated.

### Effects and side effects
- Mutates mobile source, tests, and platform configuration.
- May affect permissions, app lifecycle, offline data, or performance.

### Guardrails
1. Clean Architecture: domain -> data -> presentation
2. Riverpod/Bloc for state management (no raw setState for complex logic)
3. Material Design 3 (Android) + iOS HIG (iOS)
4. All controllers disposed in `dispose()` method
5. Dio with interceptors for API calls; handle offline gracefully
6. 60fps target; test on both platforms
7. Use Maestro for E2E testing of critical user flows

## References
Follow `resources/execution-protocol.md` step by step.
See `resources/examples.md` for input/output examples.
Before submitting, run `resources/checklist.md`.
Vendor-specific execution protocols are injected automatically by `oma agent:spawn`.
Source files live under `../_shared/runtime/execution-protocols/{vendor}.md`.
- Execution steps: `resources/execution-protocol.md`
- Code examples: `resources/examples.md`
- Code snippets: `resources/snippets.md`
- Checklist: `resources/checklist.md`
- Error recovery: `resources/error-playbook.md`
- Tech stack: `resources/tech-stack.md`
- Screen template: `resources/screen-template.dart`
- Context loading: `../_shared/core/context-loading.md`
- Reasoning templates: `../_shared/core/reasoning-templates.md`
- Clarification: `../_shared/core/clarification-protocol.md`
- Context budget: `../_shared/core/context-budget.md`
- Lessons learned: `../_shared/core/lessons-learned.md`
