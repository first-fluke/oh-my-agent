# Mobile Agent - Tech Stack Reference (Flutter)

## Framework + State Management

- **Language**: Dart 3.3+
- **UI Framework**: Flutter 3.19+
- **UI Toolkit**: Material Design 3 (Android) + iOS HIG adaptations via `CupertinoAdaptiveTheme` or `Platform.isIOS` guards
- **State Management**: Riverpod 2.x with `@riverpod` code generation (`AsyncNotifier`, `Notifier`, `StreamNotifier`)
- **Concurrency**: Dart async/await, `Stream`, `StreamController`, structured cancellation via `ref.onDispose`
- **Minimum SDK**: Flutter 3.19 / Dart 3.3 / Android API 24 / iOS 16

Riverpod 2.x with `@riverpod` codegen replaces manual `StateNotifierProvider` and hand-written provider constants. The code generator emits typed, cancellation-safe `AsyncNotifier` subclasses at build time. Provider state is disposed automatically when the last listener is removed; side-effectful providers use `ref.onDispose` to cancel in-flight requests.

## HTTP / API Client: Dio with Interceptors

| Component | Package |
|-----------|---------|
| HTTP transport | `dio` |
| Auth interceptor | custom `AuthInterceptor` (injects Bearer token) |
| Retry interceptor | custom `RetryInterceptor` (exponential back-off) |
| Logging interceptor | `pretty_dio_logger` (debug builds only) |

Dio is the **transport layer only**. Interceptors handle cross-cutting concerns (auth injection, retry, logging) — they must never cache or interpret domain objects. All Dio interceptors operate on raw `RequestOptions` / `Response` bytes. Domain-level caching belongs exclusively at the Repository layer (see below).

```
Presentation (Riverpod provider)
  |  calls
  v
Repository (data layer)  ──reads/writes──►  Local Cache (Drift table)
  |  on miss / revalidate
  v
RemoteDataSource  (Dio)  ──HTTP──►  Backend REST API
```

## Response Cache: Offline-First Repository (Drift)

Read-through caching of API responses is **mandatory at the Repository (data) layer**, using a Drift database table as the local cache. The cache stores **decoded domain entities** — never raw HTTP bytes or JSON strings. The Dio client and its interceptors are never cache-aware.

**Placement rule — Repository layer, not transport.** Do **not** add a Dio cache interceptor (e.g. `dio_http_cache`, `dio_cache_interceptor`) as the system of record for domain reads. Such interceptors operate on raw bytes, making them invisible to the domain and untestable at the business-logic level. Cache the typed result *after* decoding instead.

```
View (Flutter Widget)
  |  watches
  v
Riverpod AsyncNotifier  (features/<feature>/presentation/)
  |  calls
  v
Repository interface    (features/<feature>/domain/)
  |  reads/writes (stale-while-revalidate)
  +──────────────────►  Drift table (local cache of decoded entities)
  |  on miss / revalidate
  v
RemoteDataSource / Dio  (features/<feature>/data/)
  |  HTTP
  v
Backend REST API
```

**Mandatory rules:**

1. Every read operation goes through the Repository, which queries Drift first and returns a `Stream` (or `Future`) of cached entities. The Repository then triggers a background network revalidation and upserts the result back into Drift — the stream re-emits automatically.
2. Cache **key** = logical operation ID + a stable hash of its parameters (e.g., `"todos"`, `"todo:$id"`). Never key on URLs or raw path strings.
3. Apply a **stale-while-revalidate** policy: emit the locally-cached rows immediately (instant render), then fetch from the network, upsert into Drift, and let the stream re-emit the fresh rows. Store an explicit `cachedAt` timestamp column; check it against a per-resource TTL before deciding to revalidate.
4. Any **write** (create / update / delete) must upsert or delete the affected Drift rows after a successful network response, so the next stream emission reflects the change immediately without a separate read round-trip.
5. Drift is for transient **server-owned** data caches (and optionally durable user-owned data). **Secrets** (tokens, credentials) still belong in `flutter_secure_storage`. Do not use the cache table as a system of record for user-authored drafts — use a separate Drift table with a different retention policy.

See `snippets.md §3` for the canonical offline-first repository and `snippets.md §4` for the Riverpod `AsyncNotifier` consuming it.

## Local Storage

| Library | Purpose |
|---------|---------|
| `drift` | Durable structured persistence (system-of-record user data **and** the offline response cache table) |
| `flutter_secure_storage` | Tokens, credentials, and secrets |
| `shared_preferences` | Lightweight key-value preferences (theme, locale, flags) |
| `hive` / `hive_flutter` | Lightweight alternative to Drift for simple caches where SQL is unnecessary |

**Drift vs Hive for the cache table:** Drift is the default because it provides SQL queries, type-safe DAOs, and Dart `Stream`s that auto-emit on row changes — exactly what the stale-while-revalidate pattern needs. Use Hive when the cached type is a simple flat object and you want to avoid the Drift codegen dependency. Either way, the Repository interface is unchanged; only the impl swaps out. This stack uses Drift (`response_cache: drift-offline-repo`).

## Testing

| Layer | Framework |
|-------|-----------|
| Unit (domain + repository) | `flutter_test` + `mocktail` |
| Widget | `flutter_test` (`WidgetTester`) |
| Integration | `integration_test` package |
| E2E | Maestro (`maestro test`) |

Mock the `Repository` **interface** (abstract class), not the concrete implementation or Dio. `mocktail` stubs are preferred over hand-written fakes for brevity, but both are acceptable. Never mock Drift internals — test the real Drift DB in-memory (`NativeDatabase.memory()`) for repository-layer tests.

Run tests with `flutter test` (unit + widget) and `flutter test integration_test/` (integration). Maestro `.yaml` flow files live in `maestro/` at the project root.

## Project Layout

```
my_app/
  pubspec.yaml                            # deps + build_runner config
  pubspec.lock
  build.yaml                              # build_runner options (riverpod_generator, drift)
  maestro/                                # Maestro E2E flow files
    todos_flow.yaml
  lib/
    main.dart                             # runApp entry; ProviderScope at root
    core/
      di/
        providers.dart                    # App-wide singleton providers (Dio, DB, SecureStorage)
      network/
        dio_client.dart                   # Dio factory + interceptor wiring
        auth_interceptor.dart             # Injects Bearer token
        retry_interceptor.dart            # Exponential back-off
      database/
        app_database.dart                 # Drift @DriftDatabase definition
        app_database.g.dart               # generated
      router/
        app_router.dart                   # GoRouter typed routes
        app_router.g.dart                 # generated (go_router_builder)
      theme/
        app_theme.dart
    features/
      todos/
        domain/
          todo.dart                       # Domain entity (freezed or plain Dart)
          todo_repository.dart            # Abstract repository interface
          usecases/
            create_todo_usecase.dart
        data/
          dtos/
            todo_dto.dart                 # JSON <-> entity mapping
          local/
            todos_dao.dart                # Drift DAO for todos cache table
            todos_dao.g.dart              # generated
          remote/
            todos_remote_data_source.dart # Dio calls
          todo_repository_impl.dart       # Offline-first impl; cache + remote
        presentation/
          providers/
            todos_provider.dart           # @riverpod AsyncNotifier
            todos_provider.g.dart         # generated
          screens/
            todos_screen.dart
            todo_detail_screen.dart
          widgets/
            todo_list_item.dart
    shared/
      widgets/
        loading_indicator.dart
        empty_state.dart
        error_view.dart
      extensions/
        async_value_ext.dart
  test/
    features/
      todos/
        todo_repository_impl_test.dart    # in-memory Drift DB
        todos_provider_test.dart          # mocked repository interface
        todos_screen_test.dart            # WidgetTester
  integration_test/
    todos_integration_test.dart
```

## Architecture Pattern

```
todos_screen.dart  (ConsumerWidget)
  |  ref.watch(todosProvider)
  v
todosProvider  (@riverpod AsyncNotifier<List<Todo>>)
  |  ref.watch(todoRepositoryProvider)
  v
TodoRepository  (abstract interface in domain/)
  |  implemented by TodoRepositoryImpl (data/)
  |
  +──── TodosDao (Drift)  ◄──────── local cache of decoded Todo entities
  |       Stream<List<TodoEntry>> watchAll()
  |       Future<void> upsertAll(List<TodoEntry>)
  |       Future<void> deleteById(int id)
  |
  +──── TodosRemoteDataSource (Dio)
          Future<List<TodoDto>> fetchAll()
          Future<TodoDto> create(String title)
          Future<TodoDto> toggle(int id)
          Future<void> delete(int id)
```

Each `features/<name>/` folder is a vertical slice owning its domain, data, and presentation sub-layers. `shared/` holds stateless reusable widgets with no feature knowledge. `core/` holds app-wide infrastructure (Dio, Drift DB, GoRouter, DI providers).

## Navigation: GoRouter with Typed Routes

`go_router` with `go_router_builder` (typed route classes generated at build time via `build_runner`) is the navigation layer. Define route classes annotated with `@TypedGoRoute`; the generator emits `.g.dart` files with `push()` / `go()` helpers.

Route guards (auth checks, onboarding redirects) are handled by `GoRouter.redirect` callbacks, not inside screens. Deep links are declared in `GoRoute.path` and handled by the platform-level `AndroidManifest.xml` / `Info.plist` intent filters.

See `snippets.md §2` for the typed GoRouter setup.
