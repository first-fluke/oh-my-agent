# Mobile Agent - Tech Stack Reference (Kotlin Android Native)

Starter reference for the selected platform. Preserve existing project choices. The caching implementation below applies only when caching is required; do not add it for an unrelated screen or composable change.

## Framework: Jetpack Compose + Material 3

- **Language**: Kotlin 2.1+ floor (K2 compiler), JDK 17 toolchain
- **UI Framework**: Jetpack Compose via the Compose BOM; Material 3 components
- **State Management**: `ViewModel` + `StateFlow` (`androidx.lifecycle:lifecycle-viewmodel-compose`), collected with `collectAsStateWithLifecycle`
- **Dependency Injection**: Hilt (`@HiltAndroidApp`, `@AndroidEntryPoint`, `@HiltViewModel`); KSP processor preferred, kapt acceptable on existing projects
- **Concurrency**: Kotlin coroutines + `Flow`; `viewModelScope` owns every network call
- **Minimum SDK**: API 26 (Android 8.0); `compileSdk`/`targetSdk` track the latest stable
- **Tooling**: Gradle Kotlin DSL (`*.gradle.kts`), Android Gradle Plugin 8.x, Compose compiler plugin (`org.jetbrains.kotlin.plugin.compose`)

A `@HiltViewModel` exposes a single immutable `UiState` through `StateFlow`; composables never hold business state. `collectAsStateWithLifecycle` stops collection when the screen leaves `STARTED`, so no manual lifecycle plumbing is needed.

## API Client: OpenAPI Generator (`kotlin` / `jvm-ktor`)

| Component | Artifact |
|-----------|----------|
| Code generator | Gradle plugin `org.openapi.generator` (pin an exact 7.x version) |
| Generator target | `generatorName = "kotlin"`, `library = "jvm-ktor"` |
| Serialization option | `serializationLibrary = "kotlinx_serialization"` |
| HTTP API the generated code calls | `io.ktor:ktor-client-core` |
| HTTP engine on device | `io.ktor:ktor-client-okhttp` |
| HTTP engine in tests | `io.ktor:ktor-client-mock` |
| JSON | `io.ktor:ktor-client-content-negotiation` + `io.ktor:ktor-serialization-kotlinx-json` + `org.jetbrains.kotlinx:kotlinx-serialization-json` |

The generated API classes (`*Api` per OpenAPI tag, `DefaultApi` when the spec has no tags) are the **only** way to call the backend; never hand-assemble URL paths or JSON bodies for endpoints covered by the spec. **Regenerate, don't hand-edit** generated sources — they live under `build/generated/openapi` and are never committed.

### Ktor is a layer, not an engine

Ktor Client is an engine-agnostic API. The generated client depends only on `ktor-client-core`; the engine that performs socket I/O is a plug-in chosen by the module that constructs the client:

```
Generated *Api (camp.example.generated.api)
  → Ktor HttpClient  (core + ContentNegotiation + kotlinx-json)
    → engine: OkHttp (app module)   |   MockEngine (tests)
      → network
```

OkHttp is the default Android engine because it brings HTTP/2, connection pooling, and a mature interceptor ecosystem. `ktor-client-android` and `ktor-client-cio` are valid alternatives when a project already standardises on them; keep whatever the project uses. Because the engine is injected, the same generated code is exercised in unit tests with `MockEngine` and no network.

### Gradle wiring (two-module layout)

| Module | Role |
|--------|------|
| `:app` | Android application. Owns the `openApiGenerate` task; `preBuild` depends on it so generation always precedes compilation. Provides the Ktor client with the OkHttp engine through a Hilt module. |
| `:api-client` | Plain JVM Kotlin module. Adds `../app/build/generated/openapi/src/main/kotlin` as a `srcDir`, depends on `:app:openApiGenerate`, and hosts the shared `Json` codec plus contract tests that run against `MockEngine`. |

Keeping the contract tests in a JVM module means they run with `./gradlew :api-client:test` and no Android emulator.

### Generator options that matter

- `apiPackage`, `modelPackage`, `invokerPackage` — fix the package names so app code imports stable symbols (`…generated.api`, `…generated.model`, `…generated.infrastructure`).
- `dateLibrary = "string"` — keep dates as ISO strings at the boundary and parse them in the repository; avoids pulling `java.time` serializers into every DTO.
- `enumPropertyNaming = "UPPERCASE"` — enum constants read as Kotlin constants.
- `schemaMappings` — OpenAPI primitive unions (`anyOf: [string, number, boolean]`) otherwise generate empty classes or `Any`. Map them to `kotlinx.serialization.json.JsonPrimitive` so `true` stays `true` on the wire instead of `{}`.
- `globalProperties` `apiDocs=false`, `modelDocs=false`, `apiTests=false`, `modelTests=false` — do not generate Markdown docs or placeholder tests into the build tree.

> **BigDecimal gotcha.** The `jvm-ktor` generator marks OpenAPI `number` fields `@Contextual BigDecimal`. kotlinx-serialization has no built-in `BigDecimal` serializer, so the shared `Json` codec must register one in its `serializersModule` (see `snippets.md` §2). Without it the first decode of a decimal field throws at runtime, not at compile time.

### Where the API contract comes from

The backend owns the contract; the Android app is purely a **consumer** and never edits the spec. The spec is produced upstream (FastAPI, NestJS Swagger, or hand-maintained) and committed where both sides can read it (`api/openapi.json` in a monorepo). A backend check task (`export_openapi.py --check` or equivalent) keeps the committed file honest, and `openApiGenerate` reads it by path, so breaking schema changes surface as Kotlin compile errors after regeneration, not at runtime.

## Response Cache: Room repository (stale-while-revalidate)

| Component | Artifact |
|-----------|----------|
| Local relational cache | `androidx.room:room-runtime` + `room-ktx` (KSP compiler) |

When response caching is required, implement it at the Repository layer, backed by a Room table that stores **decoded domain models**, never raw bytes. The cache sits between the `ViewModel` and the generated `*Api`; it is never a Ktor plugin or an OkHttp interceptor.

**Placement rule — Repository layer, not transport.** Do **not** add OkHttp's `Cache` or a Ktor `HttpCache` plugin as the system of record for domain reads: they key on URLs and headers, are invisible to the domain, and cannot be asserted in business-logic tests. Cache the typed result *after* the generated call returns instead.

```
@HiltViewModel ViewModel
  |  collects Flow<UiState>
  v
Repository  ──reads/writes──►  Room DAO (decoded entities, explicit TTL)
  |  on miss / revalidate
  v
Generated *Api → Ktor HttpClient → OkHttp → Backend
```

**Mandatory rules:**

1. Every read endpoint goes through a repository `Flow` that emits the Room rows first (instant render), then revalidates from the network and upserts, letting Room's reactive query re-emit.
2. Cache **key** = operation + stable params (`"listTodos"`, `"getTodo:$id"`), stored alongside a `fetchedAt` column. Never key on URLs.
3. Explicit TTL per resource; a stale row is served immediately and triggers revalidation. No implicit infinite TTL.
4. Every **write** (`POST`/`PATCH`/`DELETE`) upserts or deletes the affected rows after the server confirms, so the next read repopulates without a separate round-trip.
5. Room cache is for transient, server-owned data. **Durable, user-owned** state (drafts, offline records) lives in its own Room tables as the system of record; **secrets** live in Keystore-backed storage. Never use the cache table as a system of record.

See `snippets.md` §8 for the canonical cached repository.

## Local Storage

- **Room** — relational persistence; the response cache (above) and durable user-owned data in separate tables.
- **DataStore (Preferences / Proto)** — typed key-value preferences; replaces `SharedPreferences`.
- **Keystore-backed storage** — tokens and credentials via `EncryptedSharedPreferences` (security-crypto) or a `DataStore` encrypted with an Android Keystore key. Never plain `SharedPreferences`.

## Testing

| Layer | Framework |
|-------|-----------|
| Unit (repository, view model) | JUnit 4/5 + `kotlinx-coroutines-test` (`runTest`) + Turbine for `Flow` assertions |
| Generated-client contract | `ktor-client-mock` `MockEngine` in `:api-client` (no network, no Android) |
| Compose UI | `androidx.compose.ui:ui-test-junit4` + `createAndroidComposeRule` |
| E2E | Maestro flows for critical user journeys |

Run unit and contract tests with `./gradlew :app:testDebugUnitTest :api-client:test`; the CI pass signal is `BUILD SUCCESSFUL`. These tasks compile Kotlin, so under the execution policy run them only when the user has authorised test execution or a build.

## Project Layout: `app/{ui,data,di}` + `api-client`

Group by **feature inside `ui/`, by responsibility inside `data/`**. The same feature-first principle the Frontend and Swift variants apply: feature slices own their screen and view model, repositories are shared, and generated code is never imported by composables.

```
<project>/
├── settings.gradle.kts            # include(":app", ":api-client")
├── build.gradle.kts               # plugin versions, apply false
├── api-client/                    # JVM module: generated srcDir + shared Json codec + contract tests
│   ├── build.gradle.kts
│   └── src/{main,test}/kotlin/<pkg>/client/
└── app/
    ├── build.gradle.kts           # android {}, openApiGenerate {}, preBuild dependsOn
    └── src/main/java/<pkg>/
        ├── <App>Application.kt    # @HiltAndroidApp
        ├── MainActivity.kt        # @AndroidEntryPoint, setContent { AppNavHost() }
        ├── di/                    # Hilt modules: NetworkModule (Ktor+OkHttp → *Api), DatabaseModule (Room)
        ├── data/                  # repositories, Room entities/DAOs, DTO→domain mappers, failures
        └── ui/
            ├── navigation/        # @Serializable routes + NavHost
            ├── theme/             # Material 3 theme, color scheme, typography
            ├── components/        # stateless reusable composables
            └── <feature>/         # <Feature>Screen.kt + <Feature>ViewModel.kt + UiState
```

**Dependency direction:**

```
ui/<feature> ──→ data ──→ generated *Api (via :api-client)
ui/<feature> never imports another feature or the generated model package.
di/ assembles everything; nothing imports di/.
```

**Scaling beyond folders.** Promote `data/` and stable `ui/<feature>` slices to Gradle library modules (`:core:data`, `:feature:<name>`) when build time or ownership boundaries demand it. Reach for modules before inventing deeper package hierarchies.

## Naming Conventions

1. **Types `PascalCase`, members `camelCase`, one primary type per file**; filename = that type (`TodoViewModel.kt` → `TodoViewModel`).
2. **Composable functions are `PascalCase` nouns** (`TodoListScreen`, `TodoRow`); state holders end in `UiState`; one-shot events are modelled as state, not channels, unless the project already uses an event bus.
3. **Generated symbols stay in their generated package.** Map `…generated.model.Todo` to a domain `Todo` in `data/` when UI needs stability across spec changes; otherwise expose the generated model directly and accept the coupling consciously.
4. **No grab-bag names** (`Utils.kt`, `Helpers.kt`) and no version suffixes (`*V2`, `*Old`) — git owns history.
5. **Hilt modules are named by what they provide** (`NetworkModule`, `DatabaseModule`), installed in `SingletonComponent` unless a narrower scope is required.

## Navigation: Navigation Compose with type-safe routes

Routes are `@Serializable` objects/data classes passed to `NavHost` (`composable<Route>`), not string templates. Arguments arrive typed through `toRoute<Route>()`. Navigation lives in `ui/navigation/`; screens receive callbacks (`onOpenDetail: (String) -> Unit`) and never hold a `NavController`, which keeps every screen previewable and testable in isolation. Predictive back is enabled in the manifest (`android:enableOnBackInvokedCallback="true"`) and handled by the `NavHost`, not per screen.
