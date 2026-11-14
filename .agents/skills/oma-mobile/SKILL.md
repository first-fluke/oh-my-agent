---
name: oma-mobile
description: "Implement Flutter, React Native, native Swift, or native Kotlin Android apps. Use for mobile screens, widgets, platform integrations, and application data flows."
---

# Mobile Agent - Cross-Platform Mobile Specialist

## Scheduling

### Goal
Build, modify, and verify cross-platform mobile application features with clean architecture, platform-appropriate UI, state management, performance, and E2E coverage.

### Intent signature
- User asks for mobile app, Flutter, Dart, React Native, iOS, Android, Jetpack Compose, Kotlin, Riverpod, widgets, camera, GPS, push notifications, or offline-first work.
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
- The checks selected for the change, which of them ran, and what was not verified

### Dependencies
- Flutter/Dart, React Native, Swift, or Kotlin/Gradle toolchain as detected from the project
- Riverpod/Bloc, Dio, Hilt, Ktor, platform SDKs, and Maestro where applicable
- `resources/execution-protocol.md`, `resources/checklist.md`, and the stack reference (`stack/` when it exists, otherwise the matching `variants/<platform>/`)

### Control-flow features
- Branches by platform, state management pattern, offline requirement, native permission, and test level
- Reads and writes mobile codebase files
- Selects test, simulator, emulator, or E2E checks and runs them only when the user or the active workflow requires it; builds only when the user asked for one

## Structural Flow

### Entry
1. Identify target platform(s), screen/feature, architecture layer, and state boundary.
2. Inspect existing mobile patterns and dependencies.
3. Determine test level and verification environment.

### Scenes
1. **PREPARE**: Load app architecture, platform constraints, and acceptance criteria.
2. **ACQUIRE**: Read existing widgets/screens, providers/blocs, API clients, and tests.
3. **ACT**: Implement mobile UI, state, platform integration, offline handling, and tests.
4. **VERIFY**: Select the relevant unit/widget/integration/E2E checks; run them only when the user or the active workflow requires it.
5. **FINALIZE**: Report behavior, platforms covered, what was verified, and what was not.

### Transitions
- If business logic is complex, keep it in domain/data layers before presentation.
- If network calls are needed, use the variant transport (Dio / axios / generated Swift `Client` / generated Kotlin `*Api` over Ktor) with interceptors and offline handling.
- If a critical user flow changes, add or update its E2E coverage (Maestro; XCUITest on Swift native).
- If backend contracts are missing, coordinate with backend/API work.

### Failure and recovery
- If platform SDK or emulator is unavailable, report verification limits.
- If a permission or native capability is missing, add explicit platform configuration or document blocker.
- If a check that ran fails, fix it before handoff or report the failing check.

### Exit
- Success: mobile feature is implemented for the target platforms; required checks that ran pass and unrun checks are reported.
- Partial success: platform, simulator, dependency, or verification gaps are explicit.

## Logical Operations

### Actions
| Action | SSL primitive | Evidence |
|--------|---------------|----------|
| Inspect mobile architecture | `READ` | Domain/data/presentation files |
| Select state and platform strategy | `SELECT` | Riverpod/Bloc and platform constraints |
| Implement mobile code | `WRITE` | Widgets, screens, providers, clients |
| Validate lifecycle and permissions | `VALIDATE` | Dispose, permissions, offline behavior |
| Call required verification tools | `CALL_TOOL` | Tests or E2E the user or workflow required; builds only on explicit request |
| Report result | `NOTIFY` | Final summary |

### Tools and instruments
- Flutter/Dart, React Native, Swift, or Kotlin Android stack
- Riverpod/Bloc, Dio, Hilt, Ktor, platform SDKs, Maestro
- Unit, widget, integration, and E2E test commands

### Canonical workflow path
Use the configured code-intelligence provider to locate files and inspect symbols
or content. For Serena, use `find_file`, `search_for_pattern`,
`get_symbols_overview`, and `find_symbol`. Native search is limited to the
provider exclusions and non-code paths permitted by the project's search policy.

<!-- oma-docs:ignore-start -->
Then select the project's mobile verification commands (the `verify:` block of `stack/stack.yaml` when present, otherwise the variant's): typically unit/widget tests and E2E for critical flows. Run them only when the user or the active workflow requires it, never build unless the user asked for a build, and report what was not verified.
<!-- oma-docs:ignore-end -->

### Resource scope
| Scope | Resource target |
|-------|-----------------|
| `CODEBASE` | Mobile source, tests, platform config |
| `LOCAL_FS` | Snippets, stack reference, resources |
| `PROCESS` | Test, emulator, simulator, E2E commands when required; builds only on explicit request |
| `NETWORK` | Backend APIs when the feature integrates remotely |

### Preconditions
- Target mobile feature and platform scope are identifiable.
- Required SDKs, permissions, and API contracts are available or assumptions are stated.

### Effects and side effects
- Mutates mobile source, tests, and platform configuration.
- May affect permissions, app lifecycle, offline data, or performance.

### Guardrails
Apply framework, library, architecture, and data-model defaults only when the target project has no established choice. Scoped edits do not authorize a stack migration or unrelated infrastructure.
1. Clean Architecture: domain -> data -> presentation (Swift native: `App/Core/Features/Shared`; Kotlin native: `app/{ui,data,di}` + `api-client`); business logic never lives in widgets, views, or composables
2. State management is the variant's solution — Flutter: Riverpod/Bloc; React Native: Zustand + TanStack Query; Swift: `@MainActor @Observable`; Kotlin: `@HiltViewModel` + `StateFlow`. No raw setState or ad-hoc state for complex logic
3. Material Design 3 (Android) + iOS HIG (iOS)
4. Release resources with the platform's lifecycle: Flutter controllers in `dispose()`; React Native effect cleanups; Swift structured `.task {}`; Kotlin `viewModelScope`
5. Use the platform transport with auth/retry/logging interception and offline handling: Flutter uses Dio, React Native uses axios behind TanStack Query, Swift uses generated `Client` middleware, and Kotlin uses Ktor plugins on the generated `*Api` client.
6. 60fps target; cover the supported target platforms (Swift iOS needs iOS only; Kotlin Android needs Android only). Secrets live in secure storage only (flutter_secure_storage / Keychain / react-native-keychain / Android Keystore-backed storage) — never plain prefs or MMKV
7. E2E for critical user flows: Maestro (Flutter / React Native / Kotlin) or XCUITest (Swift native)
8. Swift native: SwiftUI + `@MainActor @Observable` view models (Observation framework, iOS 17+) — non-isolated VMs mutating observed state from a `Task` are a Swift 6 strict-concurrency error
9. Swift native: use the existing API layer. When the project adopts OpenAPI generation, use its generated Client for covered endpoints; a UI-only edit does not introduce a generator.
10. Swift native: when response caching is required, use the existing Repository cache; for a new hyperoslo/Cache implementation, use a ResponseCache actor — cache DECODED models (never `HTTPBody`), serve stale-while-revalidate on reads, invalidate keys on writes; view models depend on a protocol seam, not the concrete service (see `variants/swift-ios/snippets.md` §10)
11. Swift native: follow `App/Core/Features/Shared` project layout
12. Swift native: iOS Human Interface Guidelines for all UI decisions
13. Swift native: XCTest or Swift Testing for units, XCUITest for critical flows; cancel work via structured `.task {}` (auto-cancels on disappear) — never in `deinit`, which is nonisolated and cannot touch `@MainActor` state under Swift 6 (isolated deinit requires Swift 6.2+)
14. Swift native: restore edge swipe-back at the route layer — nav-bar-hidden screens (`.toolbar(.hidden, for: .navigationBar)`) lose it, so register push routes via a `swipeBackDestination` wrapper, not per-screen (see `variants/swift-ios/snippets.md` §9)
15. Flutter: when offline response caching is required, use the existing repository cache; if adding Drift, read cached entities then revalidate (stale-while-revalidate), and invalidate/refresh affected rows on every write; cache decoded entities at the data layer, never at the Dio transport (see `variants/flutter/snippets.md` §3 and the Response Cache rules in `variants/flutter/tech-stack.md`)
16. React Native: preserve the existing server-state layer; for TanStack Query with explicit `staleTime`/`gcTime` — invalidate affected query keys on every mutation, persist account-scoped cache to MMKV only when offline persistence is required; screens consume query/mutation hooks, never call axios directly (see `variants/react-native/snippets.md`)
17. Kotlin native: Jetpack Compose + `@HiltViewModel` exposing one `StateFlow<UiState>` collected with `collectAsStateWithLifecycle`; network work in `viewModelScope`, `CancellationException` always rethrown
18. Kotlin native: use the existing API layer. When the project adopts OpenAPI generation (`org.openapi.generator`, `kotlin` / `jvm-ktor`), call the generated `*Api` for covered endpoints and keep the Ktor engine (OkHttp on device, `MockEngine` in tests) injected where the client is constructed — Ktor is an engine-agnostic layer, not an OkHttp replacement; a UI-only edit does not introduce a generator (see `variants/kotlin-android/snippets.md` §1, §3)
19. Kotlin native: when response caching is required, use the existing repository cache; for a new Room implementation cache DECODED models with explicit TTL, stale-while-revalidate on reads, upsert/delete on writes — never OkHttp `Cache` or Ktor `HttpCache`; view models depend on an interface seam, not the concrete repository (see `variants/kotlin-android/snippets.md` §4, §8)
20. Kotlin native: follow the `app/{ui,data,di}` + `api-client` layout; type-safe Navigation Compose routes; Material Design 3; JUnit + `ktor-client-mock` contract tests, Compose UI tests or Maestro for critical flows

### Stack Detection

<!-- oma-docs:ignore-start -->
1. **Project files first**: detect the platform from `Package.swift` (Swift iOS), `settings.gradle.kts` + `com.android.application` (Kotlin Android), `pubspec.yaml` (Flutter), or `package.json` + `react-native` (React Native), and read the existing code.
2. **Stack reference second**: use `stack/` when it exists; otherwise the matching `variants/<platform>/`. `/stack-set` writes `stack/` from the detected project, seeded from the variant, and `oma verify agent mobile` reads `stack/stack.yaml`. Treat either as supplementary reference for conventions and snippets — the project's own code wins.
3. **Neither applies**: ask the user or suggest running `/stack-set`.
<!-- oma-docs:ignore-end -->

### Stack-Specific Reference

File names are relative to the stack reference directory selected above. Load only the selected platform's files.

<!-- oma-docs:ignore-start -->
- **Stack manifest**: `stack.yaml`: structured declaration (`language`, `framework`, `state`, `navigation`, `http_client`, …) and the `verify:` contract. Schema: `variants/stack.schema.json`.
- Tech stack narrative: `tech-stack.md`: human-readable reference only; `stack.yaml` wins on conflict.
- Code snippets (data layer, state, screen, tests): `snippets.md`
<!-- oma-docs:ignore-end -->

## References
- Execution steps (follow for the selected task): `resources/execution-protocol.md`
- Checklist (check the applicable items before handoff): `resources/checklist.md`
- Error recovery (on an observed failure): `resources/error-playbook.md`
- Tech stack index (platform selection, shared response-cache contract): `resources/tech-stack.md`
- Variant registry: `variants/README.md`
- Swift iOS variant: `variants/swift-ios/tech-stack.md`, `variants/swift-ios/snippets.md`
- Kotlin Android variant: `variants/kotlin-android/tech-stack.md`, `variants/kotlin-android/snippets.md`
- Flutter variant: `variants/flutter/tech-stack.md`, `variants/flutter/snippets.md`
- React Native variant: `variants/react-native/tech-stack.md`, `variants/react-native/snippets.md`
- Context loading: `../_shared/core/context-loading.md`
- Clarification: `../_shared/core/clarification-protocol.md`
- Context budget: `../_shared/core/context-budget.md`
- Lessons learned: `../_shared/core/lessons-learned.md` (matching prior failure or requested retrospective)
- Observability handoff: `../oma-observability/SKILL.md` §Integrations — offline queuing, crash analytics, battery-aware sampling
