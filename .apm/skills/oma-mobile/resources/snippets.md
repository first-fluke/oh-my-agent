# Mobile Agent - Code Snippets

Copy-paste ready patterns. Use these as starting points, adapt to the specific task.

---

## Riverpod AsyncNotifier

```dart
import 'package:riverpod_annotation/riverpod_annotation.dart';

part 'todo_provider.g.dart';

@riverpod
class TodoList extends _$TodoList {
  @override
  Future<List<Todo>> build() async {
    final repository = ref.watch(todoRepositoryProvider);
    return repository.fetchAll();
  }

  Future<void> add(String title) async {
    final repository = ref.read(todoRepositoryProvider);
    await repository.create(title);
    ref.invalidateSelf();
  }

  Future<void> toggle(String id) async {
    final repository = ref.read(todoRepositoryProvider);
    await repository.toggle(id);
    ref.invalidateSelf();
  }

  Future<void> delete(String id) async {
    final repository = ref.read(todoRepositoryProvider);
    await repository.delete(id);
    ref.invalidateSelf();
  }
}
```

---

## Screen with AsyncValue

```dart
import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';

class TodoListScreen extends ConsumerWidget {
  const TodoListScreen({super.key});

  @override
  Widget build(BuildContext context, WidgetRef ref) {
    final todosAsync = ref.watch(todoListProvider);

    return Scaffold(
      appBar: AppBar(title: const Text('Todos')),
      body: todosAsync.when(
        loading: () => const Center(child: CircularProgressIndicator()),
        error: (error, stack) => Center(
          child: Column(
            mainAxisSize: MainAxisSize.min,
            children: [
              Text('Error: $error'),
              const SizedBox(height: 8),
              ElevatedButton(
                onPressed: () => ref.invalidate(todoListProvider),
                child: const Text('Retry'),
              ),
            ],
          ),
        ),
        data: (todos) => todos.isEmpty
            ? const Center(child: Text('No todos yet'))
            : ListView.builder(
                itemCount: todos.length,
                itemBuilder: (context, index) => TodoItem(todo: todos[index]),
              ),
      ),
      floatingActionButton: FloatingActionButton(
        onPressed: () => _showAddDialog(context, ref),
        child: const Icon(Icons.add),
      ),
    );
  }
}
```

---

## Repository Pattern

```dart
abstract class TodoRepository {
  Future<List<Todo>> fetchAll();
  Future<Todo> create(String title);
  Future<void> toggle(String id);
  Future<void> delete(String id);
}

class TodoRepositoryImpl implements TodoRepository {
  final Dio _dio;

  TodoRepositoryImpl(this._dio);

  @override
  Future<List<Todo>> fetchAll() async {
    final response = await _dio.get('/api/todos');
    return (response.data as List).map((e) => Todo.fromJson(e)).toList();
  }

  @override
  Future<Todo> create(String title) async {
    final response = await _dio.post('/api/todos', data: {'title': title});
    return Todo.fromJson(response.data);
  }

  @override
  Future<void> toggle(String id) async {
    await _dio.patch('/api/todos/$id/toggle');
  }

  @override
  Future<void> delete(String id) async {
    await _dio.delete('/api/todos/$id');
  }
}
```

---

## Dio with Auth Interceptor

```dart
class AuthInterceptor extends Interceptor {
  final Ref _ref;

  AuthInterceptor(this._ref);

  @override
  void onRequest(RequestOptions options, RequestInterceptorHandler handler) {
    final token = _ref.read(authProvider).accessToken;
    if (token != null) {
      options.headers['Authorization'] = 'Bearer $token';
    }
    handler.next(options);
  }

  @override
  void onError(DioException err, ErrorInterceptorHandler handler) {
    if (err.response?.statusCode == 401) {
      _ref.read(authProvider.notifier).logout();
    }
    handler.next(err);
  }
}
```

---

## GoRouter Config

```dart
final routerProvider = Provider<GoRouter>((ref) {
  final auth = ref.watch(authProvider);

  return GoRouter(
    redirect: (context, state) {
      final isLoggedIn = auth.isAuthenticated;
      final isAuthRoute = state.matchedLocation.startsWith('/auth');

      if (!isLoggedIn && !isAuthRoute) return '/auth/login';
      if (isLoggedIn && isAuthRoute) return '/';
      return null;
    },
    routes: [
      GoRoute(path: '/', builder: (_, __) => const HomeScreen()),
      GoRoute(path: '/auth/login', builder: (_, __) => const LoginScreen()),
      GoRoute(path: '/todos', builder: (_, __) => const TodoListScreen()),
    ],
  );
});
```

---

## Entity (freezed)

```dart
import 'package:freezed_annotation/freezed_annotation.dart';

part 'todo.freezed.dart';
part 'todo.g.dart';

@freezed
class Todo with _$Todo {
  const factory Todo({
    required String id,
    required String title,
    @Default(false) bool completed,
    required DateTime createdAt,
  }) = _Todo;

  factory Todo.fromJson(Map<String, dynamic> json) => _$TodoFromJson(json);
}
```

---

## Widget Test

```dart
import 'package:flutter_test/flutter_test.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';

void main() {
  testWidgets('TodoListScreen shows loading then data', (tester) async {
    await tester.pumpWidget(
      ProviderScope(
        overrides: [
          todoListProvider.overrideWith(() => MockTodoList()),
        ],
        child: const MaterialApp(home: TodoListScreen()),
      ),
    );

    expect(find.byType(CircularProgressIndicator), findsOneWidget);

    await tester.pumpAndSettle();

    expect(find.text('Test Todo'), findsOneWidget);
  });
}
```
