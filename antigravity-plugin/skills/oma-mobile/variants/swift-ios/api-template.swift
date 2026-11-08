/**
 * API Service Template for Mobile Agent (Swift iOS Native)
 *
 * This file wraps the generated `Client` produced by `swift-openapi-generator`
 * from `Core/Networking/openapi.yaml`. It is the **only** place that calls the
 * backend API — never construct `URLRequest` or decode `Data` manually for
 * endpoints that exist in the OpenAPI spec.
 *
 * Dependencies (all auto-generated at `swift build` time):
 *   - `Client`       — generated root type; one instance per app
 *   - `Operations`   — one namespace per operation (e.g., `Operations.listTodos`)
 *   - `Components`   — shared schema types (e.g., `Components.Schemas.Todo`)
 *
 * Caching: read-through is MANDATORY at this Repository layer via a
 * `ResponseCache` actor over `hyperoslo/Cache` (see Core/Cache/ResponseCache.swift
 * and snippets.md §10). It caches DECODED models — never `HTTPBody`. Reads use
 * stale-while-revalidate; writes invalidate the affected keys.
 *
 * File layout (split into real files in production):
 *   Core/Networking/
 *     openapi.yaml                      <- vendored OpenAPI spec (source of truth)
 *     openapi-generator-config.yaml     <- generator config (types + client, public)
 *     APIClient.swift                   <- URLSession transport + auth middleware wiring
 *     TodoService.swift                 <- this file
 *   Core/Cache/
 *     ResponseCache.swift               <- actor wrapping hyperoslo/Cache Storage
 */

// ---------------------------------------------------------------------------
// Core/Networking/TodoService.swift
// ---------------------------------------------------------------------------

import Foundation
import OpenAPIRuntime

/// Typed errors surfaced by `TodoService`.
public enum TodoServiceError: Error, LocalizedError {
    case notFound
    case conflict
    case undocumented(statusCode: Int)

    public var errorDescription: String? {
        switch self {
        case .notFound:          return "The requested todo was not found."
        case .conflict:          return "A todo with that title already exists."
        case .undocumented(let code): return "Unexpected server response: HTTP \(code)."
        }
    }
}

/// Protocol seam the view models depend on, so the cached `TodoService` is
/// swappable for a protocol-based mock in tests (no third-party mock lib).
public protocol TodoProviding: Sendable {
    func todosStream() -> AsyncThrowingStream<[Components.Schemas.Todo], Error>
    func createTodo(title: String) async throws -> Components.Schemas.Todo
    func toggleTodo(id: String) async throws -> Components.Schemas.Todo
    func deleteTodo(id: String) async throws
}

/// CRUD service for the `/todos` resource.
///
/// Depends on `Client` (generated from `Core/Networking/openapi.yaml`) and a
/// `ResponseCache` (Core/Cache/ResponseCache.swift, an actor over `hyperoslo/Cache`).
/// Inject via `AppDependencies` at app startup; never instantiate directly in views.
///
/// Caching contract:
///   - Reads cache DECODED models (never `HTTPBody`) and serve stale-while-revalidate.
///   - Writes invalidate the affected cache keys so the next read repopulates.
public final class TodoService: TodoProviding {
    private let client: Client
    private let cache: ResponseCache<[Components.Schemas.Todo]>

    /// Cache key for the list endpoint. Key on `operationID` + params, never URLs.
    private static let listKey = "listTodos"

    public init(client: Client, cache: ResponseCache<[Components.Schemas.Todo]>) {
        self.client = client
        self.cache = cache
    }

    // MARK: - List (stale-while-revalidate)

    /// Yields the cached list first (if present), then the freshly-fetched list.
    /// The view model iterates with `for try await` and updates state per yield.
    /// On a network failure with a warm cache, the stale value stands and the
    /// error is swallowed; with no cache, the error surfaces to the caller.
    public func todosStream() -> AsyncThrowingStream<[Components.Schemas.Todo], Error> {
        AsyncThrowingStream { continuation in
            let task = Task {
                let cached = await cache.value(forKey: Self.listKey)
                if let cached { continuation.yield(cached) }
                do {
                    let fresh = try await fetchTodos()
                    await cache.store(fresh, forKey: Self.listKey)
                    continuation.yield(fresh)
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

    // MARK: - Create

    /// Creates a new todo with the given title, then invalidates the list cache.
    public func createTodo(title: String) async throws -> Components.Schemas.Todo {
        let body = Components.Schemas.CreateTodoRequest(title: title)
        let response = try await client.createTodo(.init(body: .json(body)))
        switch response {
        case .created(let created):
            await cache.invalidate(Self.listKey)
            return try created.body.json
        case .conflict:
            throw TodoServiceError.conflict
        case .undocumented(let statusCode, _):
            throw TodoServiceError.undocumented(statusCode: statusCode)
        }
    }

    // MARK: - Toggle

    /// Toggles the `completed` flag on the todo with the given ID, then invalidates
    /// the list cache.
    public func toggleTodo(id: String) async throws -> Components.Schemas.Todo {
        let response = try await client.toggleTodo(.init(path: .init(id: id)))
        switch response {
        case .ok(let ok):
            await cache.invalidate(Self.listKey)
            return try ok.body.json
        case .notFound:
            throw TodoServiceError.notFound
        case .undocumented(let statusCode, _):
            throw TodoServiceError.undocumented(statusCode: statusCode)
        }
    }

    // MARK: - Delete

    /// Permanently deletes the todo with the given ID, then invalidates the list cache.
    public func deleteTodo(id: String) async throws {
        let response = try await client.deleteTodo(.init(path: .init(id: id)))
        switch response {
        case .noContent:
            await cache.invalidate(Self.listKey)
            return
        case .notFound:
            throw TodoServiceError.notFound
        case .undocumented(let statusCode, _):
            throw TodoServiceError.undocumented(statusCode: statusCode)
        }
    }
}
