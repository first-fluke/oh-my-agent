# Mobile Agent - Tech Stack Reference (Swift iOS Native)

## Framework: SwiftUI + Observation

- **Language**: Swift 5.9+ (Swift 6 compatible)
- **UI Framework**: SwiftUI
- **State Management**: Observation framework (`@Observable`, iOS 17+)
- **Concurrency**: Swift async/await + structured concurrency (`Task`, `TaskGroup`, `AsyncStream`)
- **Minimum Deployment**: iOS 17.0
- **Tooling**: Xcode 15+, Swift Package Manager (SwiftPM)

`@Observable` replaces `ObservableObject`/`@Published` for SwiftUI view models. The macro synthesizes observation tracking at compile time with zero boilerplate and no Combine dependency.

## API Client: swift-openapi-generator

| Component | Package |
|-----------|---------|
| Build plugin (code gen) | `apple/swift-openapi-generator` |
| Runtime types | `apple/swift-openapi-runtime` |
| URLSession transport | `apple/swift-openapi-urlsession` |

The generator is a **SwiftPM build plugin** — it runs automatically during `swift build` and produces Swift source from `Core/Networking/openapi.yaml` and `Core/Networking/openapi-generator-config.yaml`. No manual code generation step is needed. The generated `Client` is the **only** way to call the backend API; never hand-roll `URLRequest`/`JSONDecoder` for endpoints covered by the spec.

### Where the API contract comes from

The OpenAPI document is **vendored** at `Core/Networking/openapi.yaml`. Its source of truth is the backend service (typically emitted by the server-side OpenAPI generator or a hand-maintained spec). The sync workflow is:

1. Backend team publishes or exports `openapi.yaml` (e.g., from NestJS Swagger or a CI artifact).
2. iOS team copies or downloads the new spec into `Core/Networking/openapi.yaml` before starting feature work that touches the API surface.
3. Running `swift build` automatically regenerates the `Client`, `Operations`, and `Components` Swift types from the updated spec.
4. Any breaking schema changes surface as Swift compile errors at that point, not at runtime.

The iOS project is purely a **consumer** of the spec. It never modifies `openapi.yaml` directly. If the spec is missing, `swift build` fails with a generator error — ensure the sync step is complete before building.

## Local Storage

- **SwiftData** (iOS 17+) — Swift-native ORM built on Core Data; preferred for structured persistence.
- **UserDefaults / `@AppStorage`** — lightweight key-value preferences.
- **Keychain** (`Security` framework) — tokens and credentials.

## Testing

| Layer | Framework |
|-------|-----------|
| Unit (domain + services) | XCTest or Swift Testing (`@Test`) |
| UI / snapshot | XCUITest |
| Mocking | Protocol-based; no third-party mock lib required |

Run tests with `swift test` (SwiftPM projects) or via Xcode's test runner. Target pass signal for CI: `Test Suite 'All tests' passed`.

## Project Layout: App / Core / Features / Shared

```
MyApp/
  Package.swift                     # SwiftPM manifest; registers the OpenAPI build plugin
  Sources/
    App/
      MyApp.swift                   # @main entry point
      AppDependencies.swift         # Composition root — wires Core services into Feature VMs
    Core/
      Networking/
        openapi.yaml                # Vendored OpenAPI spec (source of truth for the generator)
        openapi-generator-config.yaml
        APIClient.swift             # Wraps the generated Client; adds URLSession transport + auth
        BearerAuthMiddleware.swift  # ClientMiddleware for bearer token injection
      Services/
        AuthService.swift
        TokenStore.swift
    Features/
      Todos/
        TodosView.swift             # SwiftUI View
        TodosViewModel.swift        # @Observable view model
        TodoDetailView.swift
        TodoDetailViewModel.swift
      Auth/
        LoginView.swift
        LoginViewModel.swift
    Shared/
      Components/
        LoadingView.swift
        ErrorView.swift
        EmptyStateView.swift
      Extensions/
        View+ErrorAlert.swift
      Utilities/
        Logger.swift
  Tests/
    TodosViewModelTests.swift
    APIClientTests.swift
```

## Architecture Pattern

```
View (SwiftUI)
  |  observes
  v
@Observable ViewModel  (Features/<Feature>/FeatureViewModel.swift)
  |  calls
  v
Core Service           (Core/Networking/APIClient.swift or Core/Services/…)
  |  calls
  v
Generated Client       (auto-generated from Core/Networking/openapi.yaml)
  |  HTTP via URLSession transport
  v
Backend REST API
```

Each `Features/<Name>/` folder is a vertical slice: it owns its own `View` + `ViewModel` and depends only on `Core` services injected at app startup. `Shared/` contains stateless, reusable UI components and Swift extensions with no feature knowledge.

## Navigation: NavigationStack + swipe-back

Path-based `NavigationStack(path:)` with typed routes registered via
`navigationDestination`. Swipe-back is a **navigation-layer** concern, not a
per-screen one.

Apps that hide the nav bar for custom headers (`.toolbar(.hidden, for: .navigationBar)`)
lose the system edge swipe-back, because UIKit ties `interactivePopGestureRecognizer`
to the system back button and re-disables it on every nav-bar-hidden transition.
Restore it at the **route-registration layer** with a `swipeBackDestination`
wrapper (see `snippets.md` §9) so every pushed route keeps the gesture and tab
roots are excluded for free. Never restore it ad-hoc per `View` body — that drifts
silently because forgetting it still compiles.
