# Mobile Agent - Tech Stack Index

Per-platform tech stacks live under `variants/{platform}/`, mirroring
`oma-backend/variants/`. Each variant owns its own `stack.yaml`,
`tech-stack.md`, and `snippets.md`. This file holds only the cross-platform
index and the shared response-cache contract; the cross-platform rules
themselves are the SKILL.md guardrails.

## Platform Variants

| Platform | Stack manifest | Tech stack | Snippets |
|----------|----------------|-----------|----------|
| Swift (iOS native) | `../variants/swift-ios/stack.yaml` | `../variants/swift-ios/tech-stack.md` | `../variants/swift-ios/snippets.md` |
| Kotlin (Android native) | `../variants/kotlin-android/stack.yaml` | `../variants/kotlin-android/tech-stack.md` | `../variants/kotlin-android/snippets.md` |
| Flutter | `../variants/flutter/stack.yaml` | `../variants/flutter/tech-stack.md` | `../variants/flutter/snippets.md` |
| React Native | `../variants/react-native/stack.yaml` | `../variants/react-native/tech-stack.md` | `../variants/react-native/snippets.md` |

Stack selection: when the skill has a `stack/` directory, it is the project's
stack — `/stack-set` generates it from the detected codebase, seeded from the
matching variant, and `oma verify agent mobile` reads its `stack.yaml`. Without
`stack/`, detect the platform from project files (`Package.swift` /
`settings.gradle.kts` + `com.android.application` / `pubspec.yaml` /
`package.json` + `react-native`) and read the matching variant directly.

## Stack at a glance

| | Swift iOS | Kotlin Android | Flutter | React Native |
|---|---|---|---|---|
| Language | Swift 6+ | Kotlin 2.2.10+ | Dart 3.13+ | TypeScript (strict) |
| UI | SwiftUI | Jetpack Compose / Material 3 | Flutter / Material 3 | React Native |
| State | Observation (`@MainActor @Observable`) | `ViewModel` + `StateFlow` (Hilt) | Riverpod 3 | Zustand 5 (client) + TanStack Query 5 (server) |
| Navigation | NavigationStack | Navigation Compose (type-safe routes) | GoRouter 17 | React Navigation v7 |
| HTTP transport | URLSession | Ktor Client (OkHttp engine; MockEngine in tests) | Dio | Axios |
| API/data layer | swift-openapi-generator | openapi-generator `kotlin`/`jvm-ktor` | Repository (Dio) | TanStack Query + `api/` |
| Response cache (when required) | hyperoslo/Cache | Room repository | Drift offline-first repo | TanStack Query |
| Durable storage | SwiftData / Keychain | Room / DataStore / Keystore-backed token storage | Drift / flutter_secure_storage | MMKV / Keychain-backed secure storage |
| Unit test | XCTest / Swift Testing | JUnit + coroutines-test + ktor-client-mock | flutter_test + mocktail | jest + RNTL (matchers built in ≥12.4) |
| E2E | XCUITest | Maestro | Maestro | Maestro |

## Repository-layer response cache when required

When offline behavior, latency, or repeated reads justify caching, use the selected variant's Repository / data-layer cache — the
same philosophy across platforms, different idiomatic tooling:

- Cache **decoded domain models**, never raw transport bytes / `HTTPBody` /
  raw HTTP responses.
- **Stale-while-revalidate** on reads: serve cached immediately, revalidate in
  the background, update state.
- **Invalidate on write**: every create/update/delete drops the affected cache
  keys so the next read repopulates.
- Cache key = operation + params (never URLs); explicit TTL (never infinite).
- The cache is for transient, server-owned data only. Durable user-owned data
  and secrets stay in the platform's durable store / secure store.

See each variant's `tech-stack.md` "Response Cache" section and `snippets.md`
for the platform-specific implementation.
