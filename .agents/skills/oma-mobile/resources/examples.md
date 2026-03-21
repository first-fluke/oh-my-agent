# Mobile Agent - Examples

## Example 1: List Screen with CRUD

**Input**: "Create a todo list screen with add, toggle, and swipe-to-delete"

**Output**:
```
## Task: Todo List Screen

### Implementation
- Screens: TodoListScreen, AddTodoSheet (bottom sheet)
- State: Riverpod with AsyncNotifier for todo list
- API: Dio with auth interceptor -> /api/todos

### Platform Support
- [x] iOS (14.0+) - Cupertino swipe actions
- [x] Android (API 24+) - Material Dismissible
- [x] Dark mode

### Files Created
- lib/features/todo/domain/entities/todo.dart
- lib/features/todo/domain/repositories/todo_repository.dart
- lib/features/todo/data/models/todo_model.dart
- lib/features/todo/data/repositories/todo_repository_impl.dart
- lib/features/todo/presentation/providers/todo_provider.dart
- lib/features/todo/presentation/screens/todo_list_screen.dart
- lib/features/todo/presentation/widgets/todo_item.dart
- test/features/todo/todo_provider_test.dart
- test/features/todo/todo_list_screen_test.dart
```

## Example 2: Authentication Flow

**Input**: "Create login and register screens with JWT auth"

**Output**:
```
## Task: Authentication Screens

### Implementation
- Screens: LoginScreen, RegisterScreen
- State: Riverpod AuthNotifier (token storage via flutter_secure_storage)
- Navigation: GoRouter redirect guard for unauthenticated users
- Validation: Form validation for email + password

### Files Created
- lib/core/auth/auth_provider.dart
- lib/core/auth/auth_interceptor.dart (Dio interceptor)
- lib/features/auth/presentation/screens/login_screen.dart
- lib/features/auth/presentation/screens/register_screen.dart
- lib/features/auth/presentation/widgets/auth_form.dart
- test/core/auth/auth_provider_test.dart
```

## Example 3: Offline-First Feature

**Input**: "Make the notes feature work offline with sync"

**Output**:
```
## Task: Offline Notes with Sync

### Implementation
- Local DB: Drift (SQLite) for offline storage
- Sync: Queue-based sync on connectivity change
- UI: Sync status indicator (synced/pending/error)

### Architecture
- NoteLocalDataSource (Drift) + NoteRemoteDataSource (Dio)
- NoteRepository merges local + remote with conflict resolution
- ConnectivityProvider triggers sync on reconnect

### Files Created
- lib/features/notes/data/local/note_dao.dart
- lib/features/notes/data/local/note_database.dart
- lib/features/notes/data/repositories/note_sync_repository.dart
- lib/core/sync/sync_queue.dart
```
