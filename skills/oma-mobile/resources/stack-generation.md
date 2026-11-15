# Stack generation: mobile

The generation and verification spec `/stack-set` follows for a mobile project. `/stack-set` detects the stack, resolves the target skill, and writes the files below into that skill's `stack/` directory; this file says what each file must contain.

## Swift / iOS native

**Adapt, not copy (amendment E):** Seed from `variants/swift-ios/` as the baseline, then adapt every value to match the detected project. Specifically:

- Replace placeholder `Features/` module names with the actual feature module names found in the project (e.g., `Features/Auth`, `Features/Home`).
<!-- oma-docs:ignore-start -->
- Set `api_spec` to the actual path where the OpenAPI document lives in this project (default `Core/Networking/openapi.yaml` only when no other location is found).
<!-- oma-docs:ignore-end -->
- Set the minimum iOS deployment target to the value detected from `Package.swift` or `.xcodeproj`; default `17.0` when not specified.
- Populate the DI wiring in the App entry snippet with the real `Client` and service types from the project, not generic placeholders.

Do **not** blind-copy the variant files; the generated `stack/` must be project-specific.

### stack.yaml — mandatory fields
```yaml
language: swift
framework: swiftui           # or uikit — adapt to detected value
ui: swiftui                  # adapt to detected value
api_generator: swift-openapi-generator
api_spec: {actual_path_to_openapi_yaml}
structure: App/Core/Features/Shared
test: XCTest
source: detected
detected_from:
  - {manifest_file}          # e.g. Package.swift
verify:                      # consumed by `oma verify agent mobile` (see _shared/core/stack-verify.schema.json)
  detect: Package.swift
  syntax:
    cmd: "{non_emitting_syntax_check_cmd}" # detected project command; do not default to swift build
    skip_if_missing: "swift"
  tests:
    cmd: "swift test"
    skip_if_missing: "swift"
```

### tech-stack.md
Generate a Swift-specific tech stack reference with these MANDATORY sections:
- SwiftUI + Observation framework (`@Observable`, iOS 17+)
- `swift-openapi-generator` + `swift-openapi-runtime` + `swift-openapi-urlsession` — SwiftPM build plugin wiring
- `App/Core/Features/Shared` module layout (App = entry/composition root, Core = networking/generated client/DI, Features = screen + view-model verticals, Shared = reusable UI/utils)
- API spec provenance: where `{api_spec}` comes from, how it is kept in sync with the backend producer
- Test framework (XCTest / Swift Testing)
- Linter/formatter (SwiftLint if present)

### snippets.md — mandatory Swift snippet set (all required)
- [ ] `Package.swift` with the `OpenAPIGenerator` build plugin declared and `openapi.yaml` spec discovery configured
- [ ] `openapi-generator-config.yaml` — generator configuration (namespace, accessibility, etc.)
- [ ] `@Observable` view model (Observation framework, async data loading, error state)
- [ ] SwiftUI feature view consuming the view model
- [ ] `Core/Networking` service wrapping the generated `Client` (URLSession transport, bearer auth middleware)
- [ ] Generated-client call pattern (`Operations.listItems`, `Operations.createItem`, etc.)
- [ ] App entry point + DI composition root (wiring `Client` → service → view model)
- [ ] XCTest example for the service or view model

### API service snippet
Include in `snippets.md` a CRUD service built on the generated `Client` (using `Operations.*` call patterns from `swift-openapi-generator`). This is the Swift analogue of the backend `api-template.*`; the mobile stack keeps it in `snippets.md` rather than a separate file. The snippet must:
- Import and instantiate the generated `Client` (not a hand-rolled `URLSession` request builder).
- Implement list, get-by-id, create, update, and delete operations using `Operations.*` types.
- Handle transport errors and map them to domain error types.
- Use `async/await` throughout.

## Kotlin / Android native

**Adapt, not copy (amendment E):** Seed from `variants/kotlin-android/` as the baseline, then adapt every value to match the detected project. Specifically:

- Replace the `com.example.*` placeholder packages with the project's `namespace` / `applicationId` and the generated `apiPackage` / `modelPackage` / `invokerPackage` read from `openApiGenerate {}`.
- Set `api_spec` to the actual `inputSpec` path; set `http_client` to the detected client and note the detected Ktor engine artifact in a comment (`ktor-client-okhttp` / `ktor-client-android` / `ktor-client-cio`). If the project uses Retrofit or bare OkHttp instead of Ktor, record that and skip the Ktor snippets rather than inventing a migration.
- Set `structure` to the real Gradle module list from `settings.gradle.kts` (e.g. `app,api-client` or `app,core:data,feature:*`).
- Set `minSdk` / `compileSdk` / Kotlin / AGP / Compose BOM versions to the values detected in the Gradle files; default `minSdk 26` only when not specified.
- Populate the Hilt module snippet with the real generated `*Api` class names (per OpenAPI tag; `DefaultApi` when untagged).
- Product flavors: when `productFlavors {}` exists, `verify.tests.cmd` must name a real flavored task (e.g. `:app:testDemoDebugUnitTest`), not `testDebugUnitTest`.

Do **not** blind-copy the variant files; the generated `stack/` must be project-specific.

### stack.yaml — mandatory fields
```yaml
language: kotlin
framework: android
ui: compose                  # or views — adapt to detected value
di: hilt                     # or koin — adapt to detected value
http_client: ktor-client     # engine artifact noted in a comment; or retrofit / okhttp
serialization: kotlinx-serialization
api_generator: openapi-generator   # org.openapi.generator, kotlin / jvm-ktor; omit when the project has none
api_spec: {actual_inputSpec_path}
structure: {gradle_modules}
test: junit
source: detected
detected_from:
  - {manifest_file}          # e.g. settings.gradle.kts, app/build.gradle.kts
verify:                      # consumed by `oma verify agent mobile` (see _shared/core/stack-verify.schema.json)
  detect: settings.gradle.kts
  syntax:
    cmd: "{non_compiling_check_cmd}"   # e.g. ktlint / detekt; Gradle compile tasks are builds — do not default to them
    skip_if_missing: "{binary}"
  tests:
    cmd: "./gradlew --console=plain {detected_unit_test_task} :api-client:test"
    pass_signal: "BUILD SUCCESSFUL"
    skip_if_missing: "java"
```

### tech-stack.md
Generate a Kotlin-specific tech stack reference with these MANDATORY sections:
- Jetpack Compose + Material 3 + `ViewModel`/`StateFlow` + Hilt (detected versions)
- OpenAPI Generator Gradle plugin (`kotlin` / `jvm-ktor` / `kotlinx_serialization`) — `openApiGenerate {}` options, `preBuild` dependency, generated-package names, `schemaMappings` / `BigDecimal` gotchas
- Ktor Client as an engine-agnostic layer: which engine the app injects (OkHttp by default) and that tests inject `MockEngine`
- Module layout from `settings.gradle.kts` (app = Android + Hilt graph, api-client = generated srcDir + shared `Json` + contract tests, any detected feature/core modules)
- API spec provenance: where `{api_spec}` comes from and how it is kept in sync with the backend producer
- Test framework (JUnit + coroutines-test + `ktor-client-mock`; Compose UI tests; Maestro) and linter/formatter (ktlint / detekt if present)

### snippets.md — mandatory Kotlin snippet set (all required)
- [ ] Gradle wiring: `openApiGenerate {}` block, `preBuild` dependency, `:api-client` srcDir module
- [ ] Shared `Json` codec with the `BigDecimal` contextual serializer
- [ ] Hilt network module constructing the generated `*Api` with the detected Ktor engine and transport plugins (auth, timeout, headers, logging)
- [ ] Repository wrapping the generated `*Api` (`HttpResponse<T>` → domain, typed failures)
- [ ] `@HiltViewModel` with a sealed `UiState` on `StateFlow`
- [ ] Compose screen consuming the view model (loading / error-with-retry / empty / content)
- [ ] Type-safe Navigation Compose routes
- [ ] Generated-client contract test with `MockEngine` in `:api-client`
- [ ] ViewModel unit test (`runTest` + fake repository)

### API repository snippet
Include in `snippets.md` a CRUD repository built on the generated `*Api`. This is the Kotlin analogue of the backend `api-template.*`; the mobile stack keeps it in `snippets.md` rather than a separate file. The snippet must:
- Inject and call the generated `*Api` (not a hand-rolled Ktor `HttpClient` request builder or raw OkHttp calls).
- Implement list, get-by-id, create, update, and delete operations through generated methods and `HttpResponse<T>`.
- Map non-2xx statuses and `IOException` to typed domain failures; rethrow `CancellationException`.
- Use `suspend` / `Flow` throughout.

## Flutter / React Native

Seed from `variants/flutter/` or `variants/react-native/` respectively (same **adapt, not copy** rule as amendment E): generate `stack.yaml` (with a runnable `verify:` block, e.g. `flutter analyze` / `flutter test`, or `bunx tsc --noEmit` / `jest`), `tech-stack.md`, and `snippets.md` (including the API service or repository snippet in the detected idiom), replacing variant placeholders with the project's actual module names, SDK versions, and state-management library.

## Verify

### Swift
- [ ] `stack.yaml` has `language`, `api_generator`, `api_spec`, and `structure` fields populated with project-specific values (not variant defaults)
- [ ] `stack.yaml` has a `verify:` block with runnable `syntax.cmd` and `tests.cmd` (otherwise `oma verify agent mobile` cannot dispatch)
- [ ] `snippets.md` includes the generator configuration snippet (`openapi-generator-config.yaml`) and at least one snippet that uses the generated `Client` via `Operations.*`
- [ ] The API service snippet in `snippets.md` uses the generated client — not hand-rolled `URLSession` request construction
- [ ] `tech-stack.md` documents where `api_spec` originates and how it syncs from the backend producer
- [ ] Module names in snippets reflect real `Features/` modules detected in the project, not generic placeholders

### Kotlin
- [ ] `stack.yaml` has `language`, `ui`, `di`, `http_client`, `api_generator` (when present), `api_spec`, and `structure` fields populated with project-specific values (not variant defaults)
- [ ] `stack.yaml` has a `verify:` block with runnable `syntax.cmd` and `tests.cmd`; `tests.cmd` names a real Gradle task for the detected flavors
- [ ] `snippets.md` includes the `openApiGenerate {}` snippet and at least one snippet that calls a generated `*Api` method and unwraps `HttpResponse<T>`
- [ ] The Ktor engine appears only where the client is constructed (Hilt module) and as `MockEngine` in the contract test — never inside repositories or composables
- [ ] The API repository snippet in `snippets.md` uses the generated client — not hand-assembled URL paths or JSON bodies
- [ ] `tech-stack.md` documents where `api_spec` originates and how it syncs from the backend producer
- [ ] Package and module names in snippets reflect the real `namespace`, generated packages, and `settings.gradle.kts` modules, not `com.example.*` placeholders
