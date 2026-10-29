# Mobile Agent - Self-Verification Checklist

Run through every item before submitting your work.

## Architecture
- [ ] Clean Architecture layers: domain -> data -> presentation (App/Core/Features/Shared on Swift; `app/{ui,data,di}` + `api-client` on Kotlin)
- [ ] Entities/models are framework-free (pure Dart / plain TS types / plain Swift structs / plain Kotlin data classes)
- [ ] Repository pattern with interface + implementation (RN: TanStack Query hooks are the repository layer)
- [ ] Variant state solution used (Flutter: Riverpod/Bloc; RN: Zustand + TanStack Query; Swift: `@MainActor @Observable`; Kotlin: `@HiltViewModel` + `StateFlow`) — no ad-hoc state for complex logic

## Platform
- [ ] Material Design 3 for Android
- [ ] iOS Human Interface Guidelines followed
- [ ] Platform-specific code guarded (Flutter: `Platform.isIOS`/`Platform.isAndroid`; RN: `Platform.OS`)
- [ ] Tested on supported target platforms (iOS only for native Swift; Android only for native Kotlin)
- [ ] Dark mode supported

## Performance
- [ ] 60fps scrolling (no jank)
- [ ] Controllers disposed in `dispose()` method
- [ ] No memory leaks (listeners, subscriptions cleaned up)
- [ ] Images cached and sized appropriately
- [ ] Cold start < 2s

## API Integration
- [ ] Transport client with interceptors for auth/error handling (Flutter: Dio; RN: axios; Swift: generated Client middleware; Kotlin: Ktor plugins on the generated `*Api` client)
- [ ] Loading states shown during API calls
- [ ] Error states with retry action
- [ ] Offline handling (graceful degradation or offline-first)
- [ ] Tokens/secrets in secure storage (flutter_secure_storage / Keychain / react-native-keychain / Android Keystore-backed storage) — never plain prefs or MMKV

## Testing
- [ ] Unit tests for domain logic and providers
- [ ] Widget tests for key screens
- [ ] E2E tests with Maestro for critical user flows
- [ ] Edge cases: empty lists, error states, offline mode
- [ ] Applicable tests pass on supported target platforms

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
- [ ] Run build/generation only when the user explicitly requested a build. Otherwise perform authorized checks without triggering compilation and report verification limits; do not run swift test when it would require a prohibited build.
- [ ] XCTest/XCUITest coverage for critical flows

## Kotlin Native (Android)
> Applies when the project is Kotlin native (`settings.gradle.kts` + `com.android.application` plugin, no `pubspec.yaml` / `react-native`). Skip for Flutter/RN/Swift.
- [ ] `app/{ui,data,di}` + `api-client` layout respected (ui = Compose screens + `@HiltViewModel` slices, data = repositories/Room/failures, di = Hilt modules, api-client = generated srcDir + shared `Json` + contract tests)
- [ ] API access goes through the generated `*Api` from `openapi-generator` (`kotlin` / `jvm-ktor`) — no hand-assembled URL paths or JSON bodies for spec-covered endpoints
- [ ] Ktor engine is injected where the `*Api` is constructed (OkHttp in the app's Hilt module, `MockEngine` in tests) — repositories and composables never reference an engine
- [ ] Shared `Json` codec registers the `BigDecimal` contextual serializer and is the same instance in DI and contract tests
- [ ] `preBuild` depends on `openApiGenerate`; generated sources under `build/generated/openapi` are never committed or hand-edited
- [ ] Compose state via `collectAsStateWithLifecycle` on a single `StateFlow<UiState>`; network work lives in `viewModelScope`, never `GlobalScope`
- [ ] Loading / error (with retry) / empty / data states handled in composables; `CancellationException` is rethrown, never swallowed
- [ ] Material Design 3 followed; dark theme and dynamic color honoured
- [ ] Type-safe Navigation Compose routes (`@Serializable` + `composable<Route>`); screens receive callbacks, not the `NavController`
- [ ] When caching is required: Room repository caches DECODED models with explicit TTL, stale-while-revalidate on reads, upsert/delete on writes — never OkHttp `Cache` or Ktor `HttpCache` (see `variants/kotlin-android/snippets.md` §8)
- [ ] Run Gradle test/compile tasks only when the user explicitly authorised a build or test run; otherwise report the verification limit
- [ ] `:api-client:test` contract test exercises the generated client against `MockEngine`; Compose UI test or Maestro flow for critical flows
