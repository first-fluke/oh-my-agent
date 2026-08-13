/**
 * Screen Template for Mobile Agent (Flutter)
 *
 * Demonstrates the stack's canonical screen patterns:
 *   - A `@riverpod` codegen notifier (StreamNotifier) consuming a repository
 *     interface — never a hand-written global FutureProvider with an inline API call.
 *   - GoRouter typed-route navigation (`GoRouteData` subclass `.push(context)`),
 *     never Navigator 1.0 named routes (`pushNamed` / `static routeName`).
 *   - AsyncValue.when → loading / data / empty / error(retry) states.
 *   - Controller lifecycle (create in field/initState, dispose in dispose()).
 *   - Dark-mode-safe colors via `Theme.of(context).colorScheme` and
 *     `withValues(alpha:)` (NOT the deprecated `withOpacity`).
 *
 * This is a reference: the notifier, repository, and routes normally live in
 * separate files (see variants/flutter/snippets.md §2/§3/§4/§6). Shown together
 * here for readability; the `part` directive pulls in build_runner output.
 */

import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:go_router/go_router.dart';
import 'package:riverpod_annotation/riverpod_annotation.dart';

part 'example_screen.g.dart';

// ---------------------------------------------------------------------------
// DOMAIN — entity + repository interface (normally under features/example/domain/)
// ---------------------------------------------------------------------------

/// Minimal domain entity. In a real feature use freezed (see snippets §3a).
class Example {
  const Example({required this.id, required this.title, this.description});
  final int id;
  final String title;
  final String? description;
}

/// The presentation layer depends on this interface, never on a concrete impl.
/// Swap the offline-first impl, a stub, or a mock behind this seam.
abstract interface class ExampleRepository {
  /// Emits the cached list immediately, then re-emits after network revalidation.
  Stream<List<Example>> watchAll();
}

/// DI seam. Override this in `ProviderScope(overrides: [...])` (or a codegen
/// provider that returns the real `ExampleRepositoryImpl`) at app startup.
@riverpod
ExampleRepository exampleRepository(Ref ref) =>
    throw UnimplementedError('Override exampleRepositoryProvider with a real impl.');

// ---------------------------------------------------------------------------
// STATE — @riverpod StreamNotifier consuming the repository (features/example/presentation/)
// ---------------------------------------------------------------------------

/// Exposes the example list as `AsyncValue<List<Example>>`.
///
/// Riverpod converts the repository's `Stream` into an `AsyncValue`: loading on
/// first subscription, data(cachedList) on the first emission, then data(freshList)
/// after revalidation — no loading flicker when the cache is warm.
@riverpod
class ExamplesNotifier extends _$ExamplesNotifier {
  @override
  Stream<List<Example>> build() {
    final repo = ref.watch(exampleRepositoryProvider);
    return repo.watchAll();
  }
}

// ---------------------------------------------------------------------------
// NAVIGATION — typed routes (features/example/... registered on the app router)
// ---------------------------------------------------------------------------

/// Typed detail route. `go_router_builder` generates the `.push()` / `.go()`
/// helpers from `@TypedGoRoute`; the annotation and `GoRouteData` come from
/// `package:go_router/go_router.dart`. Navigate with:
///   `const ExampleDetailRoute(id: 42).push(context);`
class ExampleDetailRoute extends GoRouteData {
  const ExampleDetailRoute({required this.id});
  final int id;

  @override
  Widget build(BuildContext context, GoRouterState state) =>
      // Replace with the real detail screen.
      Scaffold(appBar: AppBar(title: Text('Example $id')));
}

// ---------------------------------------------------------------------------
// SCREEN
// ---------------------------------------------------------------------------

/// Example screen demonstrating common patterns.
class ExampleScreen extends ConsumerStatefulWidget {
  const ExampleScreen({super.key});

  @override
  ConsumerState<ExampleScreen> createState() => _ExampleScreenState();
}

class _ExampleScreenState extends ConsumerState<ExampleScreen> {
  // Local UI state and controllers.
  final _scrollController = ScrollController();
  bool _showScrollToTop = false;

  @override
  void initState() {
    super.initState();
    _setupScrollListener();
  }

  @override
  void dispose() {
    _scrollController.dispose(); // always dispose controllers
    super.dispose();
  }

  void _setupScrollListener() {
    _scrollController.addListener(() {
      final shouldShow = _scrollController.offset > 200;
      if (shouldShow != _showScrollToTop) {
        setState(() => _showScrollToTop = shouldShow);
      }
    });
  }

  @override
  Widget build(BuildContext context) {
    // Watch the notifier — rebuilds on every AsyncValue transition.
    final examplesAsync = ref.watch(examplesNotifierProvider);

    return Scaffold(
      appBar: AppBar(
        title: const Text('Example Screen'),
        actions: [
          IconButton(
            icon: const Icon(Icons.refresh),
            // Invalidate re-subscribes build() → fresh revalidation cycle.
            onPressed: () => ref.invalidate(examplesNotifierProvider),
            tooltip: 'Refresh',
          ),
          IconButton(
            icon: const Icon(Icons.settings),
            // GoRouter imperative push; prefer a typed route when the
            // destination is in the typed route graph.
            onPressed: () => context.push('/settings'),
            tooltip: 'Settings',
          ),
        ],
      ),
      body: examplesAsync.when(
        // Warm cache renders immediately; a background revalidation does not
        // re-show the spinner (skipLoadingOnRefresh is on by default).
        data: (items) =>
            items.isEmpty ? _buildEmptyState() : _buildContent(items),
        loading: () => const Center(child: CircularProgressIndicator()),
        error: (error, _) => _buildErrorState(error),
      ),
      floatingActionButton: _showScrollToTop
          ? FloatingActionButton(
              onPressed: _scrollToTop,
              tooltip: 'Scroll to top',
              child: const Icon(Icons.arrow_upward),
            )
          : null,
    );
  }

  /// Builds main content.
  Widget _buildContent(List<Example> items) {
    return RefreshIndicator(
      // Await the next stream value so the spinner stays until fresh data
      // arrives — `ref.invalidate` returns synchronously and dismisses early.
      onRefresh: () => ref.refresh(examplesNotifierProvider.future),
      child: CustomScrollView(
        controller: _scrollController,
        slivers: [
          SliverToBoxAdapter(
            child: Padding(
              padding: const EdgeInsets.all(16),
              child: Text(
                '${items.length} Items',
                style: Theme.of(context).textTheme.titleMedium,
              ),
            ),
          ),
          SliverList(
            delegate: SliverChildBuilderDelegate(
              (context, index) => _buildListItem(items[index], index),
              childCount: items.length,
            ),
          ),
        ],
      ),
    );
  }

  /// Builds an individual list item.
  Widget _buildListItem(Example item, int index) {
    return Card(
      margin: const EdgeInsets.symmetric(horizontal: 16, vertical: 8),
      child: ListTile(
        leading: CircleAvatar(child: Text('${index + 1}')),
        title: Text(item.title),
        subtitle: item.description != null ? Text(item.description!) : null,
        trailing: const Icon(Icons.chevron_right),
        // Typed-route navigation — no Navigator.pushNamed.
        onTap: () => ExampleDetailRoute(id: item.id).push(context),
      ),
    );
  }

  /// Builds the empty state.
  Widget _buildEmptyState() {
    final theme = Theme.of(context);
    return Center(
      child: Column(
        mainAxisAlignment: MainAxisAlignment.center,
        children: [
          Icon(Icons.inbox, size: 64, color: theme.colorScheme.secondary),
          const SizedBox(height: 16),
          Text('No items yet', style: theme.textTheme.titleLarge),
          const SizedBox(height: 8),
          Text(
            'Add your first item to get started',
            style: theme.textTheme.bodyMedium?.copyWith(
              color: theme.colorScheme.onSurface.withValues(alpha: 0.6),
            ),
          ),
          const SizedBox(height: 24),
          FilledButton.icon(
            onPressed: _showAddDialog,
            icon: const Icon(Icons.add),
            label: const Text('Add Item'),
          ),
        ],
      ),
    );
  }

  /// Builds the error state with a retry affordance.
  Widget _buildErrorState(Object error) {
    final theme = Theme.of(context);
    return Center(
      child: Padding(
        padding: const EdgeInsets.all(24),
        child: Column(
          mainAxisAlignment: MainAxisAlignment.center,
          children: [
            Icon(Icons.error_outline, size: 64, color: theme.colorScheme.error),
            const SizedBox(height: 16),
            Text(
              'Oops! Something went wrong',
              style: theme.textTheme.titleLarge,
              textAlign: TextAlign.center,
            ),
            const SizedBox(height: 8),
            Text(
              error.toString(),
              style: theme.textTheme.bodyMedium?.copyWith(
                color: theme.colorScheme.onSurface.withValues(alpha: 0.6),
              ),
              textAlign: TextAlign.center,
            ),
            const SizedBox(height: 24),
            FilledButton.icon(
              onPressed: () => ref.invalidate(examplesNotifierProvider),
              icon: const Icon(Icons.refresh),
              label: const Text('Try Again'),
            ),
          ],
        ),
      ),
    );
  }

  // Event handlers

  void _scrollToTop() {
    _scrollController.animateTo(
      0,
      duration: const Duration(milliseconds: 500),
      curve: Curves.easeOut,
    );
  }

  void _showAddDialog() {
    // Controller is local to the dialog and disposed when it closes.
    final controller = TextEditingController();
    showDialog<void>(
      context: context,
      builder: (ctx) => AlertDialog(
        title: const Text('Add Item'),
        content: TextField(
          controller: controller,
          autofocus: true,
          decoration: const InputDecoration(
            labelText: 'Title',
            hintText: 'Enter title',
          ),
          onSubmitted: (_) => Navigator.of(ctx).pop(),
        ),
        actions: [
          TextButton(
            onPressed: () => Navigator.of(ctx).pop(),
            child: const Text('Cancel'),
          ),
          FilledButton(
            onPressed: () {
              // In a real screen: await ref.read(examplesNotifierProvider.notifier).create(...)
              Navigator.of(ctx).pop();
            },
            child: const Text('Add'),
          ),
        ],
      ),
    ).whenComplete(controller.dispose);
  }
}
