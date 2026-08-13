# Mobile Agent - Tech Stack Reference (Swift iOS Native)

## Framework: SwiftUI + Observation

- **Language**: Swift 6.0+ floor, strict-concurrency clean (current stable is Swift 6.3, July 2026)
- **UI Framework**: SwiftUI
- **State Management**: Observation framework (`@Observable`, iOS 17+)
- **Concurrency**: Swift async/await + structured concurrency (`Task`, `TaskGroup`, `AsyncStream`)
- **Minimum Deployment**: iOS 17.0
- **Tooling**: Xcode 16+ floor (current stable is Xcode 26, July 2026), Swift Package Manager (SwiftPM)

`@Observable` replaces `ObservableObject`/`@Published` for SwiftUI view models. The macro synthesizes observation tracking at compile time with zero boilerplate and no Combine dependency.

## API Client: swift-openapi-generator

| Component | Package |
|-----------|---------|
| Code generator | `apple/swift-openapi-generator` |
| Runtime types | `apple/swift-openapi-runtime` |
| URLSession transport | `apple/swift-openapi-urlsession` |

The generated `Client` is the **only** way to call the backend API; never hand-roll
`URLRequest`/`JSONDecoder` for endpoints covered by the spec. **Regenerate, don't hand-edit**
generated sources.

### Two codegen modes — both valid; `/stack-set` records the project's choice

`swift-openapi-generator` runs in one of two modes — **both build a real app**; the choice is
a workflow trade-off, not a capability one. This variant is the baseline default; the
<!-- oma-docs:ignore-start -->
per-project `stack/stack.yaml` (seeded by `/stack-set`) pins which mode the repo uses.

| Mode | Mechanics | Trade-off |
|------|-----------|-----------|
| **Build plugin** (Apple-recommended default) | Generator runs during the build; output is ephemeral (not committed). Declared in `Package.swift` `plugins:` for SwiftPM targets, **and works in Xcode app targets too** — Xcode requires "trust & enable" for the plugin (Xcode Cloud needs a post-clone script to bypass fingerprint validation). Spec vendored at `Core/Networking/openapi.yaml`. | Zero commit noise, always in sync; but extra Xcode/CI setup, generated diffs invisible in review, regen on every clean build. |
| **Committed (command plugin / CLI)** | Apple's documented fallback "if the build plugin cannot be used". Run `swift package generate-code-from-openapi` (or a task: `mise` / `make` / script) → write `Core/Networking/Generated/` → **commit** it; the build sees plain checked-in source. | Generated code is reviewable and CI is simpler; but a human must remember to regenerate + commit on spec changes. |
<!-- oma-docs:ignore-end -->

### Where the API contract comes from

The backend owns the contract; the iOS app is purely a **consumer** and never edits the spec.
The spec is produced upstream (FastAPI, NestJS Swagger, or hand-maintained) and fed to the
generator. In a monorepo a single task (e.g. `mise gen:api`) often chains the backend export
and the mobile generation so the spec stays linked end-to-end. Either way, breaking schema
changes surface as Swift compile errors after regeneration, not at runtime.

> **3.0 vs 3.1 gotcha.** `swift-openapi-generator` drops OpenAPI **3.1** `anyOf:[X,{type:null}]`
> nullable fields. If the backend emits 3.1 (FastAPI does), down-convert to **3.0.3** before
> generating — 3.0's `nullable:true` round-trips correctly. Don't "upgrade" it back.

## Response Cache: hyperoslo/Cache

| Component | Package |
|-----------|---------|
| Hybrid (memory + disk) cache | `hyperoslo/Cache` |

Read-through caching of API responses is **mandatory at the Repository (Service) layer**, backed by `hyperoslo/Cache`. The generated `Components.Schemas.*` types are `Codable`, so they are cached directly through `Cache`'s `Storage<Key, Value>` with `TransformerFactory.forCodable`. This memoizes **decoded models**, not raw bytes — the cache sits between the `@Observable` view model and the generated `Client`, never inside a `ClientMiddleware`.

**Placement rule — Repository layer, not transport.** Do **not** intercept `HTTPBody` in a `ClientMiddleware` to cache responses: `HTTPBody` is a single-consumption async stream, so capturing it for replay corrupts the request/response lifecycle. Cache the typed result *after* the generated `Client` call returns instead.

```
@Observable ViewModel
  |  calls
  v
Core Service (Repository)  ──reads/writes──►  ResponseCache (hyperoslo/Cache)
  |  on miss / revalidate
  v
Generated Client → URLSession → Backend
```

**Mandatory rules:**

1. Every read endpoint (`GET`-shaped operation) goes through a `ResponseCache` actor that wraps `hyperoslo/Cache`'s `Storage`. The `Storage` type is not `Sendable`, so it is **always** owned by an `actor` to stay Swift 6 strict-concurrency clean.
2. Cache **key** = `operationID` + a stable encoding of its path/query params (e.g. `"listTodos"`, `"getTodo:\(id)"`). Never key on URLs.
3. Apply a **stale-while-revalidate** policy: return the cached value immediately when present, then refresh in the background and update state. Memory expiry and disk expiry are set explicitly per resource via `MemoryConfig` / `DiskConfig` — no implicit infinite TTL.
4. Any **write** endpoint (`POST`/`PATCH`/`DELETE`) must `removeObject`/`removeAll` the affected keys after success so the next read repopulates.
5. `Cache` is for transient/server-owned data. **Durable, user-owned** state (drafts, offline records) still belongs in **SwiftData**; **secrets** still belong in **Keychain**. Do not use `hyperoslo/Cache` as a system of record.

See `snippets.md` §10 for the canonical `ResponseCache` actor and cached `TodoService`.

## Local Storage

- **hyperoslo/Cache** — hybrid memory+disk cache for **API response memoization** at the Repository layer (see above). Transient, server-owned data only.
- **SwiftData** (iOS 17+) — Swift-native ORM built on Core Data; preferred for **durable, user-owned** structured persistence (system of record). See `snippets.md` §11 for a compact `@Model` + `ModelContainer` + repository-fetch example.
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

This is **not a Swift-specific standard** — it is the idiomatic Swift expression of
the same *feature-first* principle the Frontend Agent applies (`../../../../rules/frontend.md`
§Architecture). Apple's own SwiftUI samples and the 2025+ community consensus both say
**group by feature, not by type** (no flat `Views/` `Models/` `ViewModels/`). The shared
rules across platforms are: feature slices own their UI + state, **no cross-feature
imports** (unidirectional), and self-describing file names. Only the folder *vocabulary*
differs from frontend FSD — do **not** import FSD layer names (`entities/`, `widgets/`,
`pages/`) into Swift; `widgets/` in particular collides with WidgetKit.

```
<AppName>/                       # SwiftPM package or Xcode project
├── <AppName>App.swift           # @main entry point (top-level)
├── Assets.xcassets/             # design tokens — color sets (top-level)
│
├── App/                         # app shell: composition root + routing (not a feature)
├── Core/                        # feature-agnostic domain + infrastructure
│   ├── Models/                  #   pure domain models
│   ├── Networking/              #   API client · Mock · Generated/ (openapi-generator output; never hand-edit)
│   ├── Cache/                   #   ResponseCache actor over hyperoslo/Cache (read-through, stale-while-revalidate)
│   └── Services/                #   Repository/Store layer (DI, @Observable stores)
│
├── Features/<Feature>/          # vertical slice: owns its View + ViewModel
│   ├── <Feature>View.swift      #   nest a sub-slice folder when a screen grows complex
│   └── <Feature>ViewModel.swift #   @MainActor @Observable, dependencies via init(client:)
│
└── Shared/                      # stateless, reusable UI + extensions (zero feature knowledge)
    ├── Components/
    └── DesignSystem/            #   Typography, etc.
```

**Dependency direction (the principle, not the tree):**

```
Features ──→ Core ←── Shared        Features never import each other.
   └─────────┐                      Core / Shared never import Features.
App ──→ assembles (Features, Core, Shared)
```

**Scaling beyond folders.** The Swift-idiomatic graduation path for a growing codebase is
**Swift Package Manager modules** — promote `Core` and stable `Features/<Feature>` slices to
local SwiftPM packages for build-time isolation and enforced boundaries. This is the 2026
modular-iOS convention; reach for it before inventing deeper folder hierarchies.

## Naming Conventions

Self-describing names, same principle as the Frontend Agent — the basename alone must
answer "what domain + what role". Swift specifics:

1. **No `+` in file names.** Use a descriptive suffix instead: `ProfileViewSections.swift`,
   not `ProfileView+Sections.swift`. (`+` reads as an extension-file convention but breaks
   some tooling and is banned here.)
2. **Types `PascalCase`, members `camelCase`, one primary type per file**; filename = that type
   (`SettingsViewModel.swift` → `SettingsViewModel`).
3. **No grab-bag names** (`Utils.swift`, `Helpers.swift`, `Misc.swift`) and no version/status
   suffixes (`*V2`, `*Old`, `*Final`) — git owns history.
4. **Design-token symbols name the full family** to avoid colliding with built-ins. When color
   sets shadow SwiftUI symbols (`Color.secondary`, `AccentColor`), prefix the family
   (`SecondaryBlue*`, `AccentYellow*`) rather than the bare `Secondary*` / `Accent*`, which
   reintroduce build warnings.

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
