# Mobile Agent - Code Snippets (Swift iOS Native)

Copy-paste ready patterns. Use these as starting points; adapt to the specific task.
Always use the generated `Client` — never hand-roll `URLRequest`/`JSONDecoder` for API calls.

---

## 1. Package.swift with OpenAPI Build Plugin

```swift
// swift-tools-version: 5.9
import PackageDescription

let package = Package(
    name: "MyApp",
    platforms: [.iOS(.v17)],
    dependencies: [
        // Code-generation build plugin (dev / build-time only)
        .package(
            url: "https://github.com/apple/swift-openapi-generator",
            from: "1.3.0"
        ),
        // Runtime types used by the generated Client
        .package(
            url: "https://github.com/apple/swift-openapi-runtime",
            from: "1.5.0"
        ),
        // URLSession transport
        .package(
            url: "https://github.com/apple/swift-openapi-urlsession",
            from: "1.0.2"
        ),
        // Repository-layer response cache (hybrid memory + disk)
        .package(
            url: "https://github.com/hyperoslo/Cache",
            from: "7.4.0"
        ),
    ],
    targets: [
        .target(
            name: "MyApp",
            dependencies: [
                .product(name: "OpenAPIRuntime",  package: "swift-openapi-runtime"),
                .product(name: "OpenAPIURLSession", package: "swift-openapi-urlsession"),
                .product(name: "Cache",            package: "Cache"),
            ],
            // The generator discovers openapi.yaml + openapi-generator-config.yaml
            // inside this target's source directory and runs at every `swift build`.
            plugins: [
                .plugin(name: "OpenAPIGenerator", package: "swift-openapi-generator"),
            ]
        ),
        .testTarget(
            name: "MyAppTests",
            dependencies: ["MyApp"]
        ),
    ]
)
```

---

## 2. openapi-generator-config.yaml

```yaml
# Core/Networking/openapi-generator-config.yaml
# Placed alongside openapi.yaml inside the target source directory.
generate:
  - types
  - client
accessModifier: public
```

---

## 3. @Observable View Model

```swift
// Features/Todos/TodosViewModel.swift
import Foundation
import Observation

/// Possible states for the Todos screen.
enum TodosViewState {
    case idle
    case loading
    case loaded([Components.Schemas.Todo])
    case empty
    case error(String)
}

@MainActor
@Observable
final class TodosViewModel {
    // MARK: - Published state (observed by the View automatically)
    var viewState: TodosViewState = .idle

    // MARK: - Private
    // Depend on the protocol seam, not the concrete service — enables protocol-based
    // mocking in tests without a third-party mock lib (see §8).
    private let service: any TodoProviding
    // `private(set)` so tests can `await viewModel.loadTask?.value` to observe the
    // load deterministically instead of sleeping (see §8).
    private(set) var loadTask: Task<Void, Never>?

    init(service: any TodoProviding) {
        self.service = service
    }

    // MARK: - Intent

    func load() {
        // Cancel any in-flight task before starting a new one.
        loadTask?.cancel()
        viewState = .loading

        loadTask = Task { [weak self] in
            guard let self else { return }
            do {
                // Stale-while-revalidate: the stream yields the cached list first
                // (instant render), then the revalidated list. State updates per yield.
                for try await todos in self.service.todosStream() {
                    guard !Task.isCancelled else { return }
                    self.viewState = todos.isEmpty ? .empty : .loaded(todos)
                }
            } catch is CancellationError {
                // Silently ignore — another load will follow.
            } catch {
                self.viewState = .error(error.localizedDescription)
            }
        }
    }

    func retry() { load() }

    /// Cancel the in-flight load explicitly (e.g. a "Cancel" button). The `.task`
    /// modifier already cancels its structured child on view disappear, so this is
    /// only needed for the unstructured `loadTask` handle kept above.
    func cancelLoad() { loadTask?.cancel() }
}
```

> **Pitfall — don't cancel in `deinit`.** Under Swift 6 strict concurrency a
> `deinit` is *nonisolated*, so it cannot touch `@MainActor`-isolated stored state
> like `loadTask` (isolated `deinit`, SE-0371, only shipped in Swift 6.2). The
> pattern is fragile for a second reason too: the `Task { [weak self] }` above
> captures `self` weakly, so an in-flight load holds no strong reference — `deinit`
> can only run *after* the task already finished, never mid-stream. Rely on `.task`'s
> automatic cancellation on disappear (structured), and expose `cancelLoad()` for the
> unstructured handle when you need to stop it sooner.

---

## 4. SwiftUI Feature View

```swift
// Features/Todos/TodosView.swift
import SwiftUI

struct TodosView: View {
    // @State owns the view model; the View is the allocation site.
    @State private var viewModel: TodosViewModel

    init(service: any TodoProviding) {
        _viewModel = State(wrappedValue: TodosViewModel(service: service))
    }

    var body: some View {
        // The router owns the enclosing NavigationStack(path:) (see §9); a feature
        // view assumes it is already inside one and never wraps itself in a stack.
        content
            .navigationTitle("Todos")
            .task { viewModel.load() }             // runs on appear, cancelled on disappear
    }

    // MARK: - Content switch

    @ViewBuilder
    private var content: some View {
        switch viewModel.viewState {
        case .idle, .loading:
            loadingView

        case .loaded(let todos):
            todoList(todos)

        case .empty:
            emptyView

        case .error(let message):
            errorView(message)
        }
    }

    // MARK: - State views

    private var loadingView: some View {
        ProgressView("Loading…")
            .frame(maxWidth: .infinity, maxHeight: .infinity)
    }

    private func todoList(_ todos: [Components.Schemas.Todo]) -> some View {
        List(todos, id: \.id) { todo in
            Label(todo.title, systemImage: todo.completed ? "checkmark.circle.fill" : "circle")
        }
        .refreshable { viewModel.load() }
    }

    private var emptyView: some View {
        ContentUnavailableView(
            "No Todos",
            systemImage: "tray",
            description: Text("Add your first todo to get started.")
        )
    }

    private func errorView(_ message: String) -> some View {
        VStack(spacing: 16) {
            Image(systemName: "exclamationmark.triangle")
                .font(.largeTitle)
                .foregroundStyle(.red)
            Text(message)
                .multilineTextAlignment(.center)
            Button("Retry") { viewModel.retry() }
                .buttonStyle(.borderedProminent)
        }
        .padding()
    }
}
```

---

## 5. Core/Networking API Service (wrapping the generated Client)

```swift
// Core/Networking/APIClient.swift
import Foundation
import OpenAPIRuntime
import OpenAPIURLSession

/// Configures the generated Client with the server URL and auth middleware.
/// Inject this as a singleton from App/AppDependencies.swift.
public final class APIClient {
    public let client: Client

    public init(serverURL: URL, tokenProvider: @escaping () -> String?) {
        let transport = URLSessionTransport()
        let authMiddleware = BearerAuthMiddleware(tokenProvider: tokenProvider)
        // The generated Client initialiser is non-throwing — no `try` needed.
        self.client = Client(
            serverURL: serverURL,
            transport: transport,
            middlewares: [authMiddleware]
        )
    }
}

// ---------------------------------------------------------------------------
// Core/Networking/BearerAuthMiddleware.swift
// ---------------------------------------------------------------------------

import OpenAPIRuntime
import HTTPTypes

/// Injects a bearer token into every outgoing request.
public struct BearerAuthMiddleware: ClientMiddleware {
    private let tokenProvider: () -> String?

    public init(tokenProvider: @escaping () -> String?) {
        self.tokenProvider = tokenProvider
    }

    public func intercept(
        _ request: HTTPRequest,
        body: HTTPBody?,
        baseURL: URL,
        operationID: String,
        next: @Sendable (HTTPRequest, HTTPBody?, URL) async throws -> (HTTPResponse, HTTPBody?)
    ) async throws -> (HTTPResponse, HTTPBody?) {
        var request = request
        if let token = tokenProvider() {
            request.headerFields[.authorization] = "Bearer \(token)"
        }
        return try await next(request, body, baseURL)
    }
}
```

---

## 6. Generated-Client Call Pattern

> Isolates the raw generated-`Client` call + response mapping — this is the **inner
> call shape** only. The **production** service is the cached `TodoService` in §10
> that wraps this shape with a `ResponseCache` (read-through + invalidation). Use the
> cached form for real features; this type is named `TodoServiceUncached` so it never
> collides with §10's `TodoService`.

```swift
// Core/Networking/TodoServiceUncached.swift  (excerpt showing call + response handling)
import OpenAPIRuntime

public final class TodoServiceUncached {
    private let client: Client

    public init(client: Client) {
        self.client = client
    }

    /// List all todos for the authenticated user.
    public func listTodos() async throws -> [Components.Schemas.Todo] {
        // Use the generated operation initialiser — never construct URLRequest by hand.
        let response = try await client.listTodos(.init())

        switch response {
        case .ok(let ok):
            // Decode the typed body; the generator guarantees the shape.
            return try ok.body.json
        case .undocumented(let statusCode, _):
            throw APIError.undocumented(statusCode: statusCode)
        }
    }

    public enum APIError: Error {
        case undocumented(statusCode: Int)
    }
}
```

---

## 7. App Entry Point and Dependency Injection

```swift
// App/MyApp.swift
import SwiftUI

@main
struct MyApp: App {
    // Composition root: build the dependency graph once at launch.
    private let dependencies = AppDependencies()

    var body: some Scene {
        WindowGroup {
            // Pass the concrete service down; Views never import Core directly.
            TodosView(service: dependencies.todoService)
        }
    }
}

// ---------------------------------------------------------------------------
// Core/Security/KeychainTokenStore.swift
// ---------------------------------------------------------------------------
import Foundation
import Security

/// Minimal Keychain-backed token store — no third-party dependency.
/// Secrets (access tokens, refresh tokens) belong in the Keychain, never in
/// `UserDefaults`, which is an unencrypted plist readable from a device backup.
struct KeychainTokenStore {
    let service: String   // e.g. Bundle.main.bundleIdentifier ?? "MyApp"

    /// Read a stored token, or nil if absent.
    func token(account: String = "accessToken") -> String? {
        let query: [String: Any] = [
            kSecClass as String: kSecClassGenericPassword,
            kSecAttrService as String: service,
            kSecAttrAccount as String: account,
            kSecReturnData as String: true,
            kSecMatchLimit as String: kSecMatchLimitOne,
        ]
        var result: AnyObject?
        guard SecItemCopyMatching(query as CFDictionary, &result) == errSecSuccess,
              let data = result as? Data else { return nil }
        return String(data: data, encoding: .utf8)
    }

    /// Insert or overwrite a token (delete-then-add keeps it idempotent).
    func setToken(_ value: String, account: String = "accessToken") {
        let base: [String: Any] = [
            kSecClass as String: kSecClassGenericPassword,
            kSecAttrService as String: service,
            kSecAttrAccount as String: account,
        ]
        SecItemDelete(base as CFDictionary)
        var add = base
        add[kSecValueData as String] = Data(value.utf8)
        add[kSecAttrAccessible as String] = kSecAttrAccessibleAfterFirstUnlock
        SecItemAdd(add as CFDictionary, nil)
    }

    /// Remove a stored token (e.g. on sign-out).
    func deleteToken(account: String = "accessToken") {
        let query: [String: Any] = [
            kSecClass as String: kSecClassGenericPassword,
            kSecAttrService as String: service,
            kSecAttrAccount as String: account,
        ]
        SecItemDelete(query as CFDictionary)
    }
}

// ---------------------------------------------------------------------------
// App/AppDependencies.swift
// ---------------------------------------------------------------------------
import Foundation

/// Builds and owns shared singletons. Constructed once in @main.
final class AppDependencies {
    let todoService: TodoService

    init() {
        let serverURL = URL(string: ProcessInfo.processInfo.environment["API_BASE_URL"]
                           ?? "https://api.example.com")!
        // Secrets come from the Keychain — never UserDefaults (see tech-stack.md).
        let tokens = KeychainTokenStore(service: Bundle.main.bundleIdentifier ?? "MyApp")
        let apiClient = APIClient(serverURL: serverURL, tokenProvider: {
            tokens.token()
        })
        // Repository-layer response cache (hyperoslo/Cache) — see snippets §10.
        let todoCache = try! ResponseCache<[Components.Schemas.Todo]>(name: "Todos")
        self.todoService = TodoService(client: apiClient.client, cache: todoCache)
    }
}
```

---

## 8. XCTest Unit Test for the View Model

```swift
// Tests/TodosViewModelTests.swift
import XCTest
@testable import MyApp

// MARK: - Mock (protocol-based — no subclassing, no third-party mock lib)

final class MockTodoService: TodoProviding, @unchecked Sendable {
    var stubbedTodos: [Components.Schemas.Todo] = []
    var shouldThrow: Error?

    func todosStream() -> AsyncThrowingStream<[Components.Schemas.Todo], Error> {
        AsyncThrowingStream { continuation in
            if let error = shouldThrow {
                continuation.finish(throwing: error)
            } else {
                continuation.yield(stubbedTodos)
                continuation.finish()
            }
        }
    }

    func createTodo(title: String) async throws -> Components.Schemas.Todo {
        if let shouldThrow { throw shouldThrow }
        return .init(id: "new", title: title, completed: false)
    }
    func toggleTodo(id: String) async throws -> Components.Schemas.Todo {
        if let shouldThrow { throw shouldThrow }
        return .init(id: id, title: "", completed: true)
    }
    func deleteTodo(id: String) async throws {
        if let shouldThrow { throw shouldThrow }
    }
}

// MARK: - Tests

// The view model is `@MainActor`, so the test methods are too. Instead of polling
// with `Task.sleep`, await the exposed `loadTask` handle — the assertion runs only
// once the load has actually finished, so the test is deterministic and fast.
@MainActor
final class TodosViewModelTests: XCTestCase {
    // Test that a successful response transitions to .loaded.
    func testLoad_success_transitionsToLoaded() async {
        let mock = MockTodoService()
        mock.stubbedTodos = [
            .init(id: "1", title: "Buy milk", completed: false),
        ]
        let sut = TodosViewModel(service: mock)

        sut.load()
        await sut.loadTask?.value          // wait for the load to complete

        guard case .loaded(let todos) = sut.viewState else {
            return XCTFail("Expected .loaded, got \(sut.viewState)")
        }
        XCTAssertEqual(todos.count, 1)
        XCTAssertEqual(todos[0].title, "Buy milk")
    }

    // Test that an empty response transitions to .empty.
    func testLoad_emptyResponse_transitionsToEmpty() async {
        let mock = MockTodoService()
        mock.stubbedTodos = []
        let sut = TodosViewModel(service: mock)

        sut.load()
        await sut.loadTask?.value

        guard case .empty = sut.viewState else {
            return XCTFail("Expected .empty, got \(sut.viewState)")
        }
    }

    // Test that a thrown error transitions to .error.
    func testLoad_networkError_transitionsToError() async {
        let mock = MockTodoService()
        mock.shouldThrow = URLError(.notConnectedToInternet)
        let sut = TodosViewModel(service: mock)

        sut.load()
        await sut.loadTask?.value

        guard case .error = sut.viewState else {
            return XCTFail("Expected .error, got \(sut.viewState)")
        }
    }
}
```

---

## 9. Navigation: interactive swipe-back on nav-bar-hidden routes

**Root cause.** `NavigationStack` is backed by UIKit's `UINavigationController`, and
the edge swipe-back is its `interactivePopGestureRecognizer`. UIKit ties that
recognizer to the system back button, so any screen that hides the nav bar
(`.toolbar(.hidden, for: .navigationBar)` — common with custom headers) loses the
swipe gesture, and UIKit re-disables it every time such a screen becomes top.

**Standard.** Swipe-back restoration is a navigation-layer concern, so restore it
once at the **route-registration layer** (`navigationDestination`), not per screen.
Pushed destinations always have something to pop to; tab roots aren't
`navigationDestination`s, so they're correctly excluded for free.

```swift
// Shared/InteractiveSwipeBack.swift
import SwiftUI
import UIKit

/// Reaches the enclosing UINavigationController, takes over the pop recognizer's
/// delegate, and re-enables the edge swipe — scoped to the screen that asks for
/// it (re-runs on every appear because UIKit re-disables it on nav-bar-hidden
/// transitions). `canPop`/`onBlocked` guard the pop (e.g. confirm unsaved edits).
private struct InteractiveSwipeBack: UIViewControllerRepresentable {
    var canPop: () -> Bool
    var onBlocked: () -> Void

    func makeUIViewController(context: Context) -> UIViewController {
        Controller(canPop: canPop, onBlocked: onBlocked)
    }
    func updateUIViewController(_ vc: UIViewController, context: Context) {
        guard let c = vc as? Controller else { return }
        c.canPop = canPop; c.onBlocked = onBlocked
    }

    final class Controller: UIViewController, UIGestureRecognizerDelegate {
        var canPop: () -> Bool
        var onBlocked: () -> Void
        init(canPop: @escaping () -> Bool, onBlocked: @escaping () -> Void) {
            self.canPop = canPop; self.onBlocked = onBlocked
            super.init(nibName: nil, bundle: nil)
        }
        @available(*, unavailable) required init?(coder: NSCoder) { fatalError() }

        override func didMove(toParent parent: UIViewController?) {
            super.didMove(toParent: parent)
            reassertSwipeBack()
        }
        // UIKit re-disables the recognizer on every nav-bar-hidden transition, so
        // re-assert on each appear — not just once at insertion (`didMove`).
        override func viewWillAppear(_ animated: Bool) {
            super.viewWillAppear(animated)
            reassertSwipeBack()
        }
        override func viewDidAppear(_ animated: Bool) {
            super.viewDidAppear(animated)
            reassertSwipeBack()
        }
        private func reassertSwipeBack() {
            guard let r = navigationController?.interactivePopGestureRecognizer else { return }
            r.delegate = self
            r.isEnabled = true
        }
        func gestureRecognizerShouldBegin(_ g: UIGestureRecognizer) -> Bool {
            guard (navigationController?.viewControllers.count ?? 0) > 1 else { return false }
            if canPop() { return true }
            onBlocked(); return false
        }
    }
}

extension View {
    /// Restore edge swipe-back on a nav-bar-hidden screen.
    func enableInteractiveSwipeBack() -> some View {
        background(InteractiveSwipeBack(canPop: { true }, onBlocked: {}).frame(width: 0, height: 0))
    }
    /// Guarded variant: swallow the swipe and run `onBlocked` when `canPop` is false.
    func interactiveSwipeBack(
        canPop: @escaping () -> Bool,
        onBlocked: @escaping () -> Void
    ) -> some View {
        background(InteractiveSwipeBack(canPop: canPop, onBlocked: onBlocked).frame(width: 0, height: 0))
    }

    /// PREFERRED registration: every pushed route gets swipe-back automatically.
    /// Use this instead of bare `navigationDestination(for:)` for push routes.
    func swipeBackDestination<D: Hashable, C: View>(
        for type: D.Type,
        @ViewBuilder destination: @escaping (D) -> C
    ) -> some View {
        navigationDestination(for: type) { value in
            destination(value).enableInteractiveSwipeBack()
        }
    }
}
```

```swift
// Usage — register routes through the wrapper, not bare navigationDestination:
NavigationStack(path: $router.path) {
    RootView()
        .swipeBackDestination(for: ProgramID.self) { ProgramDetailView(id: $0) }
        .swipeBackDestination(for: SettingsRoute.self) { _ in SettingsView() }
}

// Only screens with a custom pop policy override explicitly:
NewPostView()
    .interactiveSwipeBack(canPop: { viewModel.isSaved }, onBlocked: { showDiscardConfirm = true })
```

> Anti-pattern: sprinkling `.enableInteractiveSwipeBack()` on each `View` body. It
> compiles even when forgotten, so nav-bar-hidden routes silently lose the gesture.
> Enforce at the route layer; optionally add a SwiftLint rule that flags
> `.toolbar(.hidden, for: .navigationBar)` without a swipe-back modifier.

---

## 10. Repository-layer response cache (hyperoslo/Cache)

Read-through caching is **mandatory at the Repository (Service) layer**. Cache the
**decoded** `Components.Schemas.*` models returned by the generated `Client` — never
intercept `HTTPBody` in a middleware (it is a single-consumption stream). `hyperoslo/Cache`'s
`Storage` is not `Sendable`, so it is always owned by an `actor`.

```swift
// Core/Cache/ResponseCache.swift
import Foundation
import Cache

/// Actor wrapper over hyperoslo/Cache. One instance per cached value type.
/// Owns a non-Sendable `Storage`, so all access is actor-isolated → Swift 6 clean.
actor ResponseCache<Value: Codable & Sendable> {
    private let storage: Storage<String, Value>

    /// - Parameters:
    ///   - name: disk namespace (one folder per cache, e.g. "Todos").
    ///   - memoryExpiry: in-memory TTL — fast path, lost on app relaunch.
    ///   - diskExpiry: on-disk TTL — survives relaunch. Never use `.never`.
    init(
        name: String,
        memoryExpiry: Expiry = .seconds(120),
        diskExpiry: Expiry = .seconds(60 * 60)
    ) throws {
        // `fileManager:` is REQUIRED on the 7.4.0 release tag (last release, 2024-08).
        // The README shows the master signature where it defaults to `.default`, but
        // that default is unreleased — pass it explicitly and pin the exact version.
        self.storage = try Storage<String, Value>(
            diskConfig: DiskConfig(name: name, expiry: diskExpiry),
            memoryConfig: MemoryConfig(expiry: memoryExpiry, countLimit: 200, totalCostLimit: 0),
            fileManager: .default,
            transformer: TransformerFactory.forCodable(ofType: Value.self)
        )
    }

    /// Non-expired cached value, or nil on miss/expiry. Read errors degrade to nil.
    func value(forKey key: String) -> Value? {
        try? storage.object(forKey: key)
    }

    func store(_ value: Value, forKey key: String) {
        try? storage.setObject(value, forKey: key)
    }

    /// Drop affected keys after a write so the next read repopulates.
    func invalidate(_ key: String) { try? storage.removeObject(forKey: key) }
    func invalidateAll() { try? storage.removeAll() }
}
```

```swift
// Core/Networking/TodoProviding.swift
import Foundation

/// Protocol seam the view models depend on. Keeps the cached `TodoService`
/// swappable for a protocol-based mock in tests (no third-party mock lib).
public protocol TodoProviding: Sendable {
    func todosStream() -> AsyncThrowingStream<[Components.Schemas.Todo], Error>
    func createTodo(title: String) async throws -> Components.Schemas.Todo
    func toggleTodo(id: String) async throws -> Components.Schemas.Todo
    func deleteTodo(id: String) async throws
}
```

```swift
// Core/Networking/TodoService.swift  (cached repository)
import Foundation

public final class TodoService: TodoProviding {
    private let client: Client
    private let cache: ResponseCache<[Components.Schemas.Todo]>

    public init(client: Client, cache: ResponseCache<[Components.Schemas.Todo]>) {
        self.client = client
        self.cache = cache
    }

    private static let listKey = "listTodos"

    // MARK: - Read (stale-while-revalidate)

    /// Yields the cached list first (if any), then the freshly-fetched list.
    /// The View model iterates with `for try await` and updates state on each yield.
    /// If the network fails but a cached value exists, the stale value stands and
    /// the error is swallowed; with no cache, the error surfaces.
    public func todosStream() -> AsyncThrowingStream<[Components.Schemas.Todo], Error> {
        AsyncThrowingStream { continuation in
            let task = Task {
                let cached = await cache.value(forKey: Self.listKey)
                if let cached { continuation.yield(cached) }     // serve stale immediately
                do {
                    let fresh = try await fetchTodos()
                    await cache.store(fresh, forKey: Self.listKey)
                    continuation.yield(fresh)                     // then revalidate
                    continuation.finish()
                } catch {
                    cached == nil ? continuation.finish(throwing: error)
                                  : continuation.finish()
                }
            }
            continuation.onTermination = { _ in task.cancel() }
        }
    }

    private func fetchTodos() async throws -> [Components.Schemas.Todo] {
        let response = try await client.listTodos(.init())
        switch response {
        case .ok(let ok):
            return try ok.body.json
        case .undocumented(let statusCode, _):
            throw TodoServiceError.undocumented(statusCode: statusCode)
        }
    }

    // MARK: - Write (invalidate after success)

    public func createTodo(title: String) async throws -> Components.Schemas.Todo {
        let body = Components.Schemas.CreateTodoRequest(title: title)
        let response = try await client.createTodo(.init(body: .json(body)))
        switch response {
        case .created(let created):
            await cache.invalidate(Self.listKey)   // next read repopulates
            return try created.body.json
        case .conflict:
            throw TodoServiceError.conflict
        case .undocumented(let statusCode, _):
            throw TodoServiceError.undocumented(statusCode: statusCode)
        }
    }
}
```

The view model consumes the stream with `for try await` — see §3 `TodosViewModel.load()`
for the cancellation-safe consumer.

Wire the cache into the service at the composition root — see §7 `AppDependencies`:
`TodoService(client: apiClient.client, cache: try! ResponseCache(name: "Todos"))`.

> Rules recap: cache **decoded models** at the Repository layer (not `HTTPBody`);
> key on `operationID` + params; explicit memory/disk TTLs (never `.never`);
> invalidate affected keys after every write. Durable user-owned data → SwiftData;
> secrets → Keychain. `hyperoslo/Cache` is never a system of record.

---

## 11. Durable storage: SwiftData (system of record)

`hyperoslo/Cache` (§10) memoizes transient server-owned responses. **Durable,
user-owned** data (drafts, offline records) lives in **SwiftData** — the Swift-native
ORM on Core Data. Model with `@Model`, own one `ModelContainer`, and read/write
through a repository so features never touch a `ModelContext` directly.

```swift
// Core/Models/Draft.swift
import SwiftData

/// A user-owned draft persisted across launches. `@Model` makes the class a
/// SwiftData entity (schema inferred from stored properties).
@Model
final class Draft {
    @Attribute(.unique) var id: UUID
    var title: String
    var body: String
    var updatedAt: Date

    init(id: UUID = UUID(), title: String, body: String, updatedAt: Date = .now) {
        self.id = id
        self.title = title
        self.body = body
        self.updatedAt = updatedAt
    }
}
```

```swift
// Core/Services/DraftRepository.swift
import Foundation
import SwiftData

/// Repository over SwiftData. Owns a `ModelContext` bound to the app's container;
/// `@MainActor` because the default context is main-actor bound.
@MainActor
final class DraftRepository {
    private let context: ModelContext

    init(container: ModelContainer) {
        self.context = container.mainContext
    }

    /// Fetch newest-first, optionally filtered by a title substring.
    func drafts(matching query: String = "") throws -> [Draft] {
        let predicate = query.isEmpty ? nil : #Predicate<Draft> {
            $0.title.localizedStandardContains(query)
        }
        let descriptor = FetchDescriptor<Draft>(
            predicate: predicate,
            sortBy: [SortDescriptor(\.updatedAt, order: .reverse)]
        )
        return try context.fetch(descriptor)
    }

    func upsert(_ draft: Draft) throws {
        context.insert(draft)          // insert is idempotent on the unique id
        try context.save()
    }

    func delete(_ draft: Draft) throws {
        context.delete(draft)
        try context.save()
    }
}
```

```swift
// App/MyApp.swift — build one ModelContainer for the whole app.
import SwiftUI
import SwiftData

@main
struct MyApp: App {
    // One container per app; SwiftUI injects it into the environment.
    let container: ModelContainer = {
        do { return try ModelContainer(for: Draft.self) }
        catch { fatalError("Failed to create ModelContainer: \(error)") }
    }()

    var body: some Scene {
        WindowGroup { RootView() }
            .modelContainer(container)
    }
}
```

---

## 12. UI testing: XCUITest

Unit tests (§8) cover view models against protocol mocks. **XCUITest** drives the
real app through the accessibility layer for critical user flows — launch, interact,
assert on-screen. Give interactive views stable `.accessibilityIdentifier`s so the
queries don't depend on visible copy.

```swift
// UITests/TodosFlowUITests.swift
import XCTest

final class TodosFlowUITests: XCTestCase {
    override func setUp() {
        super.setUp()
        continueAfterFailure = false     // stop at the first failed assertion
    }

    func testTodosScreen_loadsAndShowsList() {
        let app = XCUIApplication()
        // Pass a launch argument the app reads to serve deterministic fixtures.
        app.launchArguments += ["-uiTestMode"]
        app.launch()

        // Wait for the navigation title to appear (async load).
        let title = app.navigationBars["Todos"]
        XCTAssertTrue(title.waitForExistence(timeout: 5))

        // Tap the first row and assert navigation happened.
        let firstCell = app.cells.element(boundBy: 0)
        XCTAssertTrue(firstCell.waitForExistence(timeout: 5))
        firstCell.tap()

        XCTAssertTrue(app.staticTexts["todoDetailTitle"].waitForExistence(timeout: 5))
    }
}
```
