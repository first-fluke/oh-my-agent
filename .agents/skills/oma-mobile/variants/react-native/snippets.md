# Mobile Agent - Code Snippets (React Native)

Copy-paste ready patterns. Use these as starting points; adapt to the specific task.
Screens and components **never** call axios directly — they consume hooks built on TanStack Query.

---

## 1. Package Dependencies

```json
// package.json (relevant dependencies)
{
  "dependencies": {
    // Core
    "react": "18.3.1",
    "react-native": "0.75.x",

    // Navigation
    "@react-navigation/native": "^6.1.18",
    "@react-navigation/native-stack": "^6.11.0",
    "@react-navigation/bottom-tabs": "^6.6.1",
    "react-native-screens": "^3.34.0",
    "react-native-safe-area-context": "^4.10.0",

    // HTTP transport
    "axios": "^1.7.7",
    "axios-retry": "^4.5.0",

    // Server-state cache
    "@tanstack/react-query": "^5.56.2",
    "@tanstack/query-persist-client-core": "^5.56.2",

    // Local storage
    "react-native-mmkv": "^3.1.0",

    // Secrets (choose one)
    "expo-secure-store": "^13.0.0",
    // -- OR (bare RN) --
    "react-native-keychain": "^8.2.0",

    // Client-state
    "zustand": "^5.0.0"
  },
  "devDependencies": {
    "typescript": "^5.5.4",
    "@types/react": "^18.3.5",
    "@types/react-native": "^0.73.0",
    "jest": "^29.7.0",
    "@testing-library/react-native": "^12.7.2",
    "@testing-library/jest-native": "^5.4.3",
    "babel-jest": "^29.7.0"
  }
}
```

```json
// tsconfig.json (strict baseline)
{
  "compilerOptions": {
    "strict": true,
    "target": "ES2022",
    "lib": ["ES2022"],
    "jsx": "react-native",
    "moduleResolution": "bundler",
    "baseUrl": ".",
    "paths": {
      "@api/*": ["src/api/*"],
      "@features/*": ["src/features/*"],
      "@shared/*": ["src/shared/*"],
      "@navigation/*": ["src/navigation/*"],
      "@store/*": ["src/store/*"]
    },
    "skipLibCheck": true
  }
}
```

---

## 2. QueryClient + MMKV Persister Setup

```typescript
// src/api/queryClient.ts
// Creates the single QueryClient and wires MMKV offline persistence.
// Import this module once in App.tsx — never create per-component QueryClients.

import { QueryClient } from '@tanstack/react-query';
import { createSyncStoragePersister } from '@tanstack/query-persist-client-core';
import { MMKV } from 'react-native-mmkv';

// Shared MMKV instance — re-export so other modules (store, utils) can reuse it.
export const storage = new MMKV({ id: 'app-storage' });

// Separate MMKV instance namespaced for the query cache to avoid key collisions.
const queryStorage = new MMKV({ id: 'query-cache' });

// Persister adapter: TanStack Query serialises/deserialises its cache as a
// single JSON string under the key below. MMKV provides synchronous access so
// the cache hydrates before the first render, enabling true offline-first UX.
export const mmkvPersister = createSyncStoragePersister({
  storage: {
    getItem: (key) => queryStorage.getString(key) ?? null,
    setItem: (key, value) => queryStorage.set(key, value),
    removeItem: (key) => queryStorage.delete(key),
  },
});

export const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      // Data older than 60 s triggers a background revalidation on next mount.
      staleTime: 60_000,
      // Remove unused cache entries from memory after 5 minutes.
      gcTime: 5 * 60_000,
      // Retry failed queries up to 3 times with exponential back-off.
      retry: 3,
      // Do not refetch when the window regains focus (mobile has no browser focus).
      refetchOnWindowFocus: false,
    },
    mutations: {
      retry: 0,
    },
  },
});
```

```typescript
// src/App.tsx  (provider wiring — abridged)
import React from 'react';
import { PersistQueryClientProvider } from '@tanstack/react-query/persist-client';
import { NavigationContainer } from '@react-navigation/native';
import { queryClient, mmkvPersister } from '@api/queryClient';
import { RootNavigator } from '@navigation/RootNavigator';

export default function App() {
  return (
    // PersistQueryClientProvider restores the MMKV-persisted cache before
    // the first render, so screens show stale data instantly while revalidating.
    <PersistQueryClientProvider
      client={queryClient}
      persistOptions={{ persister: mmkvPersister }}
    >
      <NavigationContainer>
        <RootNavigator />
      </NavigationContainer>
    </PersistQueryClientProvider>
  );
}
```

---

## 3. Axios Instance with Auth Interceptor

```typescript
// src/api/client.ts
// Singleton axios instance — the ONLY place in the codebase that creates an
// axios instance. All src/api/*.ts functions import from here.

import axios, {
  type AxiosInstance,
  type InternalAxiosRequestConfig,
  type AxiosResponse,
  type AxiosError,
} from 'axios';
import axiosRetry from 'axios-retry';
import { storage } from './queryClient';

const BASE_URL = process.env.EXPO_PUBLIC_API_BASE_URL ?? 'https://api.example.com';

export const apiClient: AxiosInstance = axios.create({
  baseURL: BASE_URL,
  timeout: 15_000,
  headers: { 'Content-Type': 'application/json' },
});

// --- Request interceptor: inject bearer token ---
apiClient.interceptors.request.use((config: InternalAxiosRequestConfig) => {
  const token = storage.getString('accessToken');
  if (token) {
    config.headers.set('Authorization', `Bearer ${token}`);
  }
  return config;
});

// --- Response interceptor: surface typed API errors ---
apiClient.interceptors.response.use(
  (response: AxiosResponse) => response,
  async (error: AxiosError) => {
    if (error.response?.status === 401) {
      // Clear stale token — auth store / navigation will redirect to login.
      storage.delete('accessToken');
    }
    return Promise.reject(error);
  },
);

// --- Retry: idempotent requests only, 3 attempts, exponential back-off ---
axiosRetry(apiClient, {
  retries: 3,
  retryCondition: (error) =>
    axiosRetry.isNetworkOrIdempotentRequestError(error) &&
    error.response?.status !== 401,
  retryDelay: axiosRetry.exponentialDelay,
});
```

---

## 4. Typed API Data Module (src/api/todos.ts)

```typescript
// src/api/todos.ts
// Typed axios functions for the /todos resource.
// These are PURE DATA FUNCTIONS — they return decoded TypeScript objects and
// know nothing about React, hooks, or the query cache. They are the transport
// seam: screens never import from this file directly, only through query/mutation
// hooks (src/features/todos/queries.ts and mutations.ts).

import { apiClient } from './client';

// ---------------------------------------------------------------------------
// Domain types
// ---------------------------------------------------------------------------

export interface Todo {
  id: string;
  title: string;
  completed: boolean;
  createdAt: string;
}

export interface CreateTodoInput {
  title: string;
}

// ---------------------------------------------------------------------------
// API functions
// ---------------------------------------------------------------------------

/** Fetch all todos for the authenticated user. */
export async function fetchTodos(): Promise<Todo[]> {
  const { data } = await apiClient.get<Todo[]>('/todos');
  return data;
}

/** Fetch a single todo by ID. */
export async function fetchTodo(id: string): Promise<Todo> {
  const { data } = await apiClient.get<Todo>(`/todos/${id}`);
  return data;
}

/** Create a new todo. */
export async function createTodo(input: CreateTodoInput): Promise<Todo> {
  const { data } = await apiClient.post<Todo>('/todos', input);
  return data;
}

/** Toggle the completed flag on a todo. */
export async function toggleTodo(id: string): Promise<Todo> {
  const { data } = await apiClient.patch<Todo>(`/todos/${id}/toggle`);
  return data;
}

/** Permanently delete a todo. */
export async function deleteTodo(id: string): Promise<void> {
  await apiClient.delete(`/todos/${id}`);
}
```

---

## 5. Feature Query and Mutation Hooks

```typescript
// src/features/todos/queries.ts
// Read hooks — wrap src/api/todos.ts functions with TanStack Query.
// Explicit staleTime / gcTime on every query; never rely on defaults alone.

import { useQuery, useQueryClient } from '@tanstack/react-query';
import { fetchTodos, fetchTodo } from '@api/todos';

// Centralise query key definitions so mutations can reference them without
// string duplication. Key shape: [operation, ...params].
export const todoKeys = {
  all: ['todos'] as const,
  lists: () => [...todoKeys.all, 'list'] as const,
  detail: (id: string) => [...todoKeys.all, 'detail', id] as const,
};

/** Fetch and cache the todo list. Returns stale data instantly, revalidates in
 *  the background when data is older than staleTime. */
export function useTodosQuery() {
  return useQuery({
    queryKey: todoKeys.lists(),
    queryFn: fetchTodos,
    staleTime: 60_000,   // 1 minute — adjust per resource freshness requirement
    gcTime: 5 * 60_000,  // 5 minutes idle before memory GC
  });
}

/** Fetch and cache a single todo. */
export function useTodoDetailQuery(id: string) {
  return useQuery({
    queryKey: todoKeys.detail(id),
    queryFn: () => fetchTodo(id),
    staleTime: 60_000,
    gcTime: 5 * 60_000,
    enabled: Boolean(id),
  });
}
```

```typescript
// src/features/todos/mutations.ts
// Write hooks — wrap src/api/todos.ts functions with useMutation.
// Every mutation MUST call invalidateQueries for affected keys on onSuccess
// so the cache repopulates from the server on the next read.

import { useMutation, useQueryClient } from '@tanstack/react-query';
import { createTodo, toggleTodo, deleteTodo, type CreateTodoInput } from '@api/todos';
import { todoKeys } from './queries';

/** Create a new todo then invalidate the list cache. */
export function useCreateTodo() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (input: CreateTodoInput) => createTodo(input),
    onSuccess: () => {
      // Invalidate the list so the next useTodosQuery fetches fresh data.
      queryClient.invalidateQueries({ queryKey: todoKeys.lists() });
    },
  });
}

/** Toggle a todo's completed flag then invalidate list + detail caches. */
export function useToggleTodo() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (id: string) => toggleTodo(id),
    // Optimistic update: flip the flag in the cache immediately for instant UI
    // feedback; roll back if the mutation fails.
    onMutate: async (id) => {
      await queryClient.cancelQueries({ queryKey: todoKeys.lists() });
      const previous = queryClient.getQueryData(todoKeys.lists());
      queryClient.setQueryData(todoKeys.lists(), (old: any[] | undefined) =>
        old?.map((todo) =>
          todo.id === id ? { ...todo, completed: !todo.completed } : todo,
        ) ?? [],
      );
      return { previous };
    },
    onError: (_err, _id, context) => {
      // Roll back on error.
      if (context?.previous) {
        queryClient.setQueryData(todoKeys.lists(), context.previous);
      }
    },
    onSuccess: (_data, id) => {
      // Invalidate both list and detail to ensure consistency.
      queryClient.invalidateQueries({ queryKey: todoKeys.lists() });
      queryClient.invalidateQueries({ queryKey: todoKeys.detail(id) });
    },
  });
}

/** Delete a todo then invalidate the list cache. */
export function useDeleteTodo() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (id: string) => deleteTodo(id),
    onSuccess: (_data, id) => {
      queryClient.invalidateQueries({ queryKey: todoKeys.lists() });
      // Remove the detail cache entry immediately — it is no longer valid.
      queryClient.removeQueries({ queryKey: todoKeys.detail(id) });
    },
  });
}
```

---

## 6. Screen Consuming the Hooks

```typescript
// src/features/todos/ui/TodosScreen.tsx
// Consumes useTodosQuery and useDeleteTodo. Note: no axios import here.

import React from 'react';
import {
  View,
  Text,
  FlatList,
  ActivityIndicator,
  TouchableOpacity,
  RefreshControl,
  StyleSheet,
} from 'react-native';
import type { NativeStackScreenProps } from '@react-navigation/native-stack';
import type { RootStackParamList } from '@navigation/types';
import { useTodosQuery } from '../queries';
import { useDeleteTodo, useToggleTodo } from '../mutations';

type Props = NativeStackScreenProps<RootStackParamList, 'TodoList'>;

export function TodosScreen({ navigation }: Props) {
  const { data: todos, isLoading, isError, error, refetch, isRefetching } = useTodosQuery();
  const toggleMutation = useToggleTodo();
  const deleteMutation = useDeleteTodo();

  // --- Loading state ---
  if (isLoading) {
    return (
      <View style={styles.center}>
        <ActivityIndicator size="large" accessibilityLabel="Loading todos" />
      </View>
    );
  }

  // --- Error state ---
  if (isError) {
    return (
      <View style={styles.center}>
        <Text style={styles.errorText}>
          {error instanceof Error ? error.message : 'Something went wrong.'}
        </Text>
        <TouchableOpacity style={styles.retryButton} onPress={() => refetch()}>
          <Text style={styles.retryText}>Retry</Text>
        </TouchableOpacity>
      </View>
    );
  }

  // --- Empty state ---
  if (!todos || todos.length === 0) {
    return (
      <View style={styles.center}>
        <Text style={styles.emptyText}>No todos yet. Add your first one!</Text>
      </View>
    );
  }

  // --- Data state ---
  return (
    <FlatList
      data={todos}
      keyExtractor={(item) => item.id}
      refreshControl={
        <RefreshControl refreshing={isRefetching} onRefresh={refetch} />
      }
      renderItem={({ item }) => (
        <View style={styles.row}>
          <TouchableOpacity
            style={styles.checkbox}
            onPress={() => toggleMutation.mutate(item.id)}
            accessibilityRole="checkbox"
            accessibilityState={{ checked: item.completed }}
          >
            <Text>{item.completed ? '☑' : '☐'}</Text>
          </TouchableOpacity>

          <TouchableOpacity
            style={styles.titleContainer}
            onPress={() => navigation.navigate('TodoDetail', { id: item.id })}
          >
            <Text style={[styles.title, item.completed && styles.completed]}>
              {item.title}
            </Text>
          </TouchableOpacity>

          <TouchableOpacity
            onPress={() => deleteMutation.mutate(item.id)}
            accessibilityLabel={`Delete ${item.title}`}
          >
            <Text style={styles.deleteIcon}>✕</Text>
          </TouchableOpacity>
        </View>
      )}
    />
  );
}

const styles = StyleSheet.create({
  center: { flex: 1, justifyContent: 'center', alignItems: 'center', padding: 24 },
  errorText: { color: '#d32f2f', textAlign: 'center', marginBottom: 12 },
  emptyText: { color: '#757575', textAlign: 'center' },
  retryButton: { backgroundColor: '#1976d2', borderRadius: 8, paddingHorizontal: 20, paddingVertical: 10 },
  retryText: { color: '#fff', fontWeight: '600' },
  row: { flexDirection: 'row', alignItems: 'center', paddingHorizontal: 16, paddingVertical: 12, borderBottomWidth: StyleSheet.hairlineWidth, borderBottomColor: '#e0e0e0' },
  checkbox: { marginRight: 12 },
  titleContainer: { flex: 1 },
  title: { fontSize: 16, color: '#212121' },
  completed: { textDecorationLine: 'line-through', color: '#9e9e9e' },
  deleteIcon: { color: '#9e9e9e', fontSize: 16, paddingLeft: 12 },
});
```

---

## 7. Navigation Setup with Typed Param List

```typescript
// src/navigation/types.ts
export type RootStackParamList = {
  TodoList: undefined;
  TodoDetail: { id: string };
  Login: undefined;
};
```

```typescript
// src/navigation/RootNavigator.tsx
import React from 'react';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import type { RootStackParamList } from './types';
import { TodosScreen } from '@features/todos/ui/TodosScreen';
import { TodoDetailScreen } from '@features/todos/ui/TodoDetailScreen';
import { LoginScreen } from '@features/auth/ui/LoginScreen';
import { useAuthStore } from '@store/authStore';

const Stack = createNativeStackNavigator<RootStackParamList>();

export function RootNavigator() {
  const isAuthenticated = useAuthStore((s) => s.isAuthenticated);

  return (
    <Stack.Navigator>
      {isAuthenticated ? (
        <>
          <Stack.Screen
            name="TodoList"
            component={TodosScreen}
            options={{ title: 'My Todos' }}
          />
          <Stack.Screen
            name="TodoDetail"
            component={TodoDetailScreen}
            options={{ title: 'Todo Detail' }}
          />
        </>
      ) : (
        <Stack.Screen
          name="Login"
          component={LoginScreen}
          options={{ headerShown: false }}
        />
      )}
    </Stack.Navigator>
  );
}
```

---

## 8. Jest Test: Component with QueryClientProvider

```typescript
// src/features/todos/__tests__/TodosScreen.test.tsx
// Wraps the component in a QueryClientProvider with a no-retry, zero-staleTime
// QueryClient. The api module is mocked at the Jest boundary — tests assert on
// component output, not axios internals.

import React from 'react';
import { render, screen, fireEvent, waitFor } from '@testing-library/react-native';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { NavigationContainer } from '@react-navigation/native';
import { TodosScreen } from '../ui/TodosScreen';

// Mock the entire api/todos module — the seam between hooks and transport.
jest.mock('@api/todos', () => ({
  fetchTodos: jest.fn(),
  toggleTodo: jest.fn(),
  deleteTodo: jest.fn(),
}));

import * as todosApi from '@api/todos';

// Helper: create a fresh QueryClient per test to avoid state bleed.
function createTestQueryClient() {
  return new QueryClient({
    defaultOptions: {
      queries: {
        retry: false,      // Surface errors immediately in tests
        staleTime: 0,      // Always fetch in tests; no stale cache reads
        gcTime: Infinity,  // Keep data for the test duration
      },
      mutations: { retry: false },
    },
  });
}

// Helper: wrap the component with required providers.
function renderWithProviders(ui: React.ReactElement) {
  const testQueryClient = createTestQueryClient();
  return render(
    <QueryClientProvider client={testQueryClient}>
      <NavigationContainer>
        {ui}
      </NavigationContainer>
    </QueryClientProvider>,
  );
}

const mockNavigation = { navigate: jest.fn() } as any;

describe('TodosScreen', () => {
  afterEach(() => {
    jest.clearAllMocks();
  });

  it('shows a loading indicator while fetching', async () => {
    // Delay resolution so we can catch the loading state.
    (todosApi.fetchTodos as jest.Mock).mockReturnValue(new Promise(() => {}));
    renderWithProviders(<TodosScreen navigation={mockNavigation} route={{} as any} />);

    expect(screen.getByLabelText('Loading todos')).toBeTruthy();
  });

  it('renders todo titles after successful fetch', async () => {
    (todosApi.fetchTodos as jest.Mock).mockResolvedValue([
      { id: '1', title: 'Buy milk', completed: false, createdAt: '' },
      { id: '2', title: 'Walk the dog', completed: true, createdAt: '' },
    ]);

    renderWithProviders(<TodosScreen navigation={mockNavigation} route={{} as any} />);

    expect(await screen.findByText('Buy milk')).toBeTruthy();
    expect(screen.getByText('Walk the dog')).toBeTruthy();
  });

  it('shows empty state when the list is empty', async () => {
    (todosApi.fetchTodos as jest.Mock).mockResolvedValue([]);

    renderWithProviders(<TodosScreen navigation={mockNavigation} route={{} as any} />);

    expect(await screen.findByText(/No todos yet/i)).toBeTruthy();
  });

  it('shows an error message and retry button on fetch failure', async () => {
    (todosApi.fetchTodos as jest.Mock).mockRejectedValue(new Error('Network error'));

    renderWithProviders(<TodosScreen navigation={mockNavigation} route={{} as any} />);

    expect(await screen.findByText('Network error')).toBeTruthy();
    expect(screen.getByText('Retry')).toBeTruthy();
  });

  it('calls deleteTodo when the delete button is pressed', async () => {
    (todosApi.fetchTodos as jest.Mock).mockResolvedValue([
      { id: '42', title: 'Delete me', completed: false, createdAt: '' },
    ]);
    (todosApi.deleteTodo as jest.Mock).mockResolvedValue(undefined);

    renderWithProviders(<TodosScreen navigation={mockNavigation} route={{} as any} />);

    const deleteButton = await screen.findByLabelText('Delete Delete me');
    fireEvent.press(deleteButton);

    await waitFor(() => {
      expect(todosApi.deleteTodo).toHaveBeenCalledWith('42');
    });
  });
});
```

---

## 9. Cache Rules Recap

> These rules apply to every `useQuery` and `useMutation` in the codebase.
> They mirror the swift-ios `hyperoslo/Cache` mandatory contract, adapted for TanStack Query.

1. **Cache decoded objects, not bytes.** TanStack Query stores the return value of `queryFn` — a decoded TypeScript object. Never cache raw `AxiosResponse` or `ArrayBuffer`.
2. **Explicit `staleTime` and `gcTime` on every `useQuery`.** No implicit infinite TTL. `staleTime` governs background revalidation; `gcTime` governs memory reclamation.
3. **Query keys = `[operation, ...params]`.** Never key on URLs. Centralise key definitions in a `todoKeys` (or `<resource>Keys`) object so mutations and queries share the same reference.
4. **Invalidate on write.** Every `useMutation` calls `queryClient.invalidateQueries({ queryKey })` for all affected list and detail keys in `onSuccess`. Optimistic updates (optional) must pair a rollback in `onError`.
5. **MMKV persistence for offline-first.** The `PersistQueryClientProvider` + MMKV persister hydrates the cache before the first render. Stale data renders immediately; revalidation runs in the background.
6. **Repository seam.** `src/api/*.ts` functions are the only axis callers. Screens and components never import from `axios` or from `src/api/` directly — they consume query/mutation hooks.
7. **Query cache = transient server-owned data.** Durable user data belongs in MMKV; secrets belong in `expo-secure-store` / `react-native-keychain`. Never use TanStack Query as a system of record.
