/**
 * Screen Template for Mobile Agent (Swift iOS Native)
 *
 * Demonstrates best practices for SwiftUI screens:
 *   - @Observable view model with explicit loading/error/empty/data states
 *   - .task modifier for async data loading (auto-cancelled on disappear)
 *   - Retry action wired to the view model
 *   - NavigationStack integration
 *   - iOS HIG-aligned layout
 */

import SwiftUI
import Observation

// MARK: - View Model

/// All possible display states for the example screen.
enum ExampleViewState {
    case idle
    case loading
    case loaded([ExampleItem])
    case empty
    case error(String)
}

/// A plain value type representing one row in the list.
struct ExampleItem: Identifiable {
    let id: String
    let title: String
    let subtitle: String
}

/// Protocol-backed so the view model is testable with a mock service.
/// A real conformer is a Repository over the generated `swift-openapi-generator`
/// `Client` fronted by a `ResponseCache` (read-through, stale-while-revalidate) —
/// see variants/swift-ios/snippets.md §10 and variants/swift-ios/api-template.swift.
/// Never hand-roll `URLRequest`/`JSONDecoder` for endpoints in the OpenAPI spec.
protocol ExampleServiceProtocol {
    func fetchItems() async throws -> [ExampleItem]
}

@MainActor
@Observable
final class ExampleViewModel {
    // MARK: - State observed by the View

    /// Current display state. The View switches on this value.
    var viewState: ExampleViewState = .idle

    // MARK: - Private

    private let service: ExampleServiceProtocol
    /// Retained so it can be cancelled before re-triggering a load, and so tests can
    /// `await viewModel.loadTask?.value` instead of sleeping.
    private(set) var loadTask: Task<Void, Never>?

    init(service: ExampleServiceProtocol) {
        self.service = service
    }

    // MARK: - Intents (called by the View)

    /// Starts (or restarts) data loading. Safe to call multiple times.
    func load() {
        // Cancel any in-flight request before starting a fresh one.
        loadTask?.cancel()
        viewState = .loading

        loadTask = Task { [weak self] in
            guard let self else { return }
            do {
                let items = try await service.fetchItems()
                guard !Task.isCancelled else { return }
                viewState = items.isEmpty ? .empty : .loaded(items)
            } catch is CancellationError {
                // Ignore — another load is replacing this one.
            } catch {
                viewState = .error(error.localizedDescription)
            }
        }
    }

    /// Convenience retry; identical to load() but named for the error-state button.
    func retry() { load() }

    /// Cancel the in-flight load explicitly. `.task` already cancels its structured
    /// child on view disappear; this only stops the unstructured `loadTask` sooner.
    func cancelLoad() { loadTask?.cancel() }

    // Pitfall — do NOT cancel in `deinit`. A `deinit` is nonisolated under Swift 6
    // strict concurrency, so it cannot touch `@MainActor`-isolated state like
    // `loadTask` (isolated deinit / SE-0371 landed only in Swift 6.2). It is moot
    // anyway: the `Task { [weak self] }` captures `self` weakly, so `deinit` cannot
    // fire while a load is in flight. Rely on `.task`'s auto-cancel on disappear.
}

// MARK: - View

struct ExampleScreen: View {
    // The View owns the view model via @State so it is scoped to this screen.
    @State private var viewModel: ExampleViewModel

    init(service: ExampleServiceProtocol) {
        // Wrap in State so @Observable tracking works correctly in SwiftUI.
        _viewModel = State(wrappedValue: ExampleViewModel(service: service))
    }

    var body: some View {
        // The router owns the enclosing NavigationStack(path:); a feature view
        // assumes it is already inside one and never wraps itself in a stack.
        content
            .navigationTitle("Example")
            .toolbar {
                // .topBarTrailing (iOS 17+) replaces .navigationBarTrailing, which
                // is formally deprecated at iOS 27.
                ToolbarItem(placement: .topBarTrailing) {
                    Button {
                        viewModel.load()
                    } label: {
                        Label("Refresh", systemImage: "arrow.clockwise")
                    }
                    // Disable the button while a load is in progress.
                    .disabled({
                        if case .loading = viewModel.viewState { return true }
                        return false
                    }())
                }
            }
            // .task is preferred over .onAppear for async work:
            // it creates a structured Task that is cancelled when the View disappears.
            .task { viewModel.load() }
    }

    // MARK: - Content switch

    /// Switches over the view model's state and renders the appropriate sub-view.
    @ViewBuilder
    private var content: some View {
        switch viewModel.viewState {
        case .idle, .loading:
            loadingView

        case .loaded(let items):
            listView(items)

        case .empty:
            emptyView

        case .error(let message):
            errorView(message: message)
        }
    }

    // MARK: - State sub-views

    /// Shown while the first load is in progress.
    private var loadingView: some View {
        ProgressView("Loading…")
            .frame(maxWidth: .infinity, maxHeight: .infinity)
    }

    /// Shown when data is available.
    private func listView(_ items: [ExampleItem]) -> some View {
        List(items) { item in
            // Value-based navigation: push a route value, not an inline destination.
            // The route layer registers the destination for `ExampleItem.ID` via
            // `swipeBackDestination(for:)` on the router's NavigationStack — see
            // variants/swift-ios/snippets.md §9.
            NavigationLink(value: item.id) {
                VStack(alignment: .leading, spacing: 4) {
                    Text(item.title)
                        .font(.headline)
                    Text(item.subtitle)
                        .font(.subheadline)
                        .foregroundStyle(.secondary)
                }
                .padding(.vertical, 4)
            }
        }
        // Pull-to-refresh triggers a fresh load.
        .refreshable { viewModel.load() }
    }

    /// Shown when the API returns an empty collection.
    private var emptyView: some View {
        ContentUnavailableView(
            "Nothing Here",
            systemImage: "tray",
            description: Text("There are no items yet. Create one to get started.")
        )
    }

    /// Shown when the load fails. Includes a labelled retry button.
    private func errorView(message: String) -> some View {
        VStack(spacing: 20) {
            Image(systemName: "exclamationmark.triangle.fill")
                .font(.system(size: 48))
                .foregroundStyle(.red)

            Text("Something went wrong")
                .font(.title2)
                .bold()

            Text(message)
                .font(.body)
                .foregroundStyle(.secondary)
                .multilineTextAlignment(.center)
                .padding(.horizontal, 32)

            Button {
                viewModel.retry()
            } label: {
                Label("Try Again", systemImage: "arrow.clockwise")
                    .padding(.horizontal, 8)
            }
            .buttonStyle(.borderedProminent)
        }
        .frame(maxWidth: .infinity, maxHeight: .infinity)
        .padding()
    }
}

// MARK: - Preview

#Preview {
    // Provide a lightweight stub for canvas previews.
    struct PreviewService: ExampleServiceProtocol {
        func fetchItems() async throws -> [ExampleItem] {
            try? await Task.sleep(nanoseconds: 500_000_000)
            return [
                ExampleItem(id: "1", title: "First Item",  subtitle: "Detail about the first item"),
                ExampleItem(id: "2", title: "Second Item", subtitle: "Detail about the second item"),
            ]
        }
    }
    return ExampleScreen(service: PreviewService())
}
