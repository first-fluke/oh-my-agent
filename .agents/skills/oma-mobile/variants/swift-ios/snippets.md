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
    ],
    targets: [
        .target(
            name: "MyApp",
            dependencies: [
                .product(name: "OpenAPIRuntime",  package: "swift-openapi-runtime"),
                .product(name: "OpenAPIURLSession", package: "swift-openapi-urlsession"),
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

@Observable
final class TodosViewModel {
    // MARK: - Published state (observed by the View automatically)
    var viewState: TodosViewState = .idle

    // MARK: - Private
    private let service: TodoService
    private var loadTask: Task<Void, Never>?

    init(service: TodoService) {
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
                let todos = try await self.service.listTodos()
                guard !Task.isCancelled else { return }
                self.viewState = todos.isEmpty ? .empty : .loaded(todos)
            } catch is CancellationError {
                // Silently ignore — another load will follow.
            } catch {
                self.viewState = .error(error.localizedDescription)
            }
        }
    }

    func retry() { load() }

    // Cancel the in-flight task when the view model is deallocated.
    deinit { loadTask?.cancel() }
}
```

---

## 4. SwiftUI Feature View

```swift
// Features/Todos/TodosView.swift
import SwiftUI

struct TodosView: View {
    // @State owns the view model; the View is the allocation site.
    @State private var viewModel: TodosViewModel

    init(service: TodoService) {
        _viewModel = State(wrappedValue: TodosViewModel(service: service))
    }

    var body: some View {
        NavigationStack {
            content
                .navigationTitle("Todos")
                .task { viewModel.load() }         // runs on appear, cancelled on disappear
        }
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
        self.client = try! Client(
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

```swift
// Core/Networking/TodoService.swift  (excerpt showing call + response handling)
import OpenAPIRuntime

public final class TodoService {
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
        case notFound
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
// App/AppDependencies.swift
// ---------------------------------------------------------------------------
import Foundation

/// Builds and owns shared singletons. Constructed once in @main.
final class AppDependencies {
    let todoService: TodoService

    init() {
        let serverURL = URL(string: ProcessInfo.processInfo.environment["API_BASE_URL"]
                           ?? "https://api.example.com")!
        let apiClient = APIClient(serverURL: serverURL, tokenProvider: {
            // TODO: replace with real keychain / token store lookup
            UserDefaults.standard.string(forKey: "accessToken")
        })
        self.todoService = TodoService(client: apiClient.client)
    }
}
```

---

## 8. XCTest Unit Test for the View Model

```swift
// Tests/TodosViewModelTests.swift
import XCTest
@testable import MyApp

// MARK: - Mock

final class MockTodoService: TodoService {
    var stubbedTodos: [Components.Schemas.Todo] = []
    var shouldThrow: Error?

    override func listTodos() async throws -> [Components.Schemas.Todo] {
        if let error = shouldThrow { throw error }
        return stubbedTodos
    }
}

// MARK: - Tests

final class TodosViewModelTests: XCTestCase {
    // Test that a successful response transitions to .loaded.
    func testLoad_success_transitionsToLoaded() async {
        let mock = MockTodoService(client: .mock)
        mock.stubbedTodos = [
            .init(id: "1", title: "Buy milk", completed: false),
        ]
        let sut = TodosViewModel(service: mock)

        sut.load()
        // Give the Task a tick to complete.
        try? await Task.sleep(nanoseconds: 50_000_000)

        guard case .loaded(let todos) = sut.viewState else {
            return XCTFail("Expected .loaded, got \(sut.viewState)")
        }
        XCTAssertEqual(todos.count, 1)
        XCTAssertEqual(todos[0].title, "Buy milk")
    }

    // Test that an empty response transitions to .empty.
    func testLoad_emptyResponse_transitionsToEmpty() async {
        let mock = MockTodoService(client: .mock)
        mock.stubbedTodos = []
        let sut = TodosViewModel(service: mock)

        sut.load()
        try? await Task.sleep(nanoseconds: 50_000_000)

        guard case .empty = sut.viewState else {
            return XCTFail("Expected .empty, got \(sut.viewState)")
        }
    }

    // Test that a thrown error transitions to .error.
    func testLoad_networkError_transitionsToError() async {
        let mock = MockTodoService(client: .mock)
        mock.shouldThrow = URLError(.notConnectedToInternet)
        let sut = TodosViewModel(service: mock)

        sut.load()
        try? await Task.sleep(nanoseconds: 50_000_000)

        guard case .error = sut.viewState else {
            return XCTFail("Expected .error, got \(sut.viewState)")
        }
    }
}
```

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
