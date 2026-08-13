# Mobile Agent - Self-Verification Checklist

Run through every item before submitting your work.

## Architecture
- [ ] Clean Architecture layers: domain -> data -> presentation (or App/Core/Features/Shared on Swift)
- [ ] Entities/models are framework-free (pure Dart / plain TS types / plain Swift structs)
- [ ] Repository pattern with interface + implementation (RN: TanStack Query hooks are the repository layer)
- [ ] Variant state solution used (Flutter: Riverpod/Bloc; RN: Zustand + TanStack Query; Swift: `@MainActor @Observable`) — no ad-hoc state for complex logic

## Platform
- [ ] Material Design 3 for Android
- [ ] iOS Human Interface Guidelines followed
- [ ] Platform-specific code guarded (Flutter: `Platform.isIOS`/`Platform.isAndroid`; RN: `Platform.OS`)
- [ ] Tested on both iOS and Android (emulator or device)
- [ ] Dark mode supported

## Performance
- [ ] 60fps scrolling (no jank)
- [ ] Controllers disposed in `dispose()` method
- [ ] No memory leaks (listeners, subscriptions cleaned up)
- [ ] Images cached and sized appropriately
- [ ] Cold start < 2s

## API Integration
- [ ] Transport client with interceptors for auth/error handling (Flutter: Dio; RN: axios; Swift: generated Client middleware)
- [ ] Loading states shown during API calls
- [ ] Error states with retry action
- [ ] Offline handling (graceful degradation or offline-first)
- [ ] Tokens/secrets in secure storage (flutter_secure_storage / Keychain / react-native-keychain) — never plain prefs or MMKV

## Testing
- [ ] Unit tests for domain logic and providers
- [ ] Widget tests for key screens
- [ ] E2E tests with Maestro for critical user flows
- [ ] Edge cases: empty lists, error states, offline mode
- [ ] Tests pass on both platforms

## React Native
> Applies when `package.json` declares a `react-native` dependency. Skip for Flutter/Swift native.
- [ ] Server state via TanStack Query hooks (query key factory shared between queries and mutations); screens never import axios directly
- [ ] Explicit `staleTime`/`gcTime` on queries; `gcTime` >= persister `maxAge` so the MMKV-persisted cache survives restarts
- [ ] Every mutation invalidates affected query keys (list AND detail); optimistic updates roll back on error and never fabricate cache entries
- [ ] `onlineManager` wired to NetInfo so offline pause/resume works
- [ ] Client state (auth/UI) in Zustand stores under `src/store/`; tokens hydrated from `react-native-keychain`, held in memory — never plain MMKV
- [ ] Typed React Navigation v7 routes (`RootStackParamList`); no `any` in navigation props
- [ ] `npx tsc --noEmit` and `npx jest --ci` pass
- [ ] Maestro flow updated for critical user flows (`e2e/`)

## Swift Native (iOS)
> Applies when the project is Swift native (`Package.swift` / `.xcodeproj` present). Skip for Flutter/RN.
- [ ] `App/Core/Features/Shared` layout respected (App = entry/DI, Core = networking/generated client, Features = view+`@Observable` VM slices, Shared = reusable UI/util)
- [ ] API access goes through the generated `Client` from `swift-openapi-generator` — no hand-rolled `URLRequest`/`JSONDecoder` for spec-covered endpoints
<!-- oma-docs:ignore-start -->
- [ ] OpenAPI document present at `Core/Networking/openapi.yaml` and synced from the backend before build
<!-- oma-docs:ignore-end -->
- [ ] SwiftUI state via `@MainActor @Observable` (Observation framework); async work cancelled via structured `.task {}` (not `deinit` — see `variants/swift-ios/snippets.md`)
- [ ] Loading / error (with retry) / empty / data states handled in views
- [ ] iOS Human Interface Guidelines followed
- [ ] Push routes registered via a `swipeBackDestination` wrapper (not bare `navigationDestination`), so nav-bar-hidden screens keep edge swipe-back; guarded pops (unsaved edits) override explicitly — see `variants/swift-ios/snippets.md` §9
- [ ] `swift build` succeeds (runs the generator plugin) and `swift test` passes
- [ ] XCTest/XCUITest coverage for critical flows
