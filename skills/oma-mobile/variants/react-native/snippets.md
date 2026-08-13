# Mobile Agent - Code Snippets (React Native)

Copy-paste ready patterns. Use these as starting points; adapt to the specific task.
Screens and components **never** call axios directly — they consume hooks built on TanStack Query.

---

## 1. Package Dependencies

```json
// package.json (relevant dependencies)
{
  "dependencies": {
    // Core (RN 0.86 defaults to the New Architecture; 0.82+ is New-Arch only)
    "react": "^19.0.0",
    "react-native": "^0.86.0",

    // Navigation (v7 is the current stable line)
    "@react-navigation/native": "^7.3.10",
    "@react-navigation/native-stack": "^7.3.10",
    "@react-navigation/bottom-tabs": "^7.3.10",
    "react-native-screens": "^4.26.2",
    "react-native-safe-area-context": "^5.8.0",

    // HTTP transport
    "axios": "^1.7.7",
    "axios-retry": "^4.5.0",

    // Server-state cache + offline persistence
    "@tanstack/react-query": "^5.101.2",
    "@tanstack/query-sync-storage-persister": "^5.101.2",
    "@tanstack/react-query-persist-client": "^5.101.2",

    // Network status (drives onlineManager + useNetworkStatus)
    "@react-native-community/netinfo": "^11.4.1",

    // Local storage (v4 is the Nitro module; requires RN 0.76+)
    "react-native-mmkv": "^4.3.2",

    // Secrets (choose one)
    "expo-secure-store": "^13.0.0",
    // -- OR (bare RN) --
    "react-native-keychain": "^10.0.0",

    // Client-state
    "zustand": "^5.0.14"
  },
  "devDependencies": {
    "typescript": "^5.5.4",
    "@types/react": "^19.0.0",
    "jest": "^29.7.0",
    // Matchers (toBeVisible, etc.) ship inside @testing-library/react-native >=12.4,
    // so no separate matcher package is needed. React Native ships its own types too.
    "@testing-library/react-native": "^14.0.1",
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
// src/shared/utils/storage.ts
// Canonical MMKV singletons. Every module that needs MMKV imports from here —
// never call `new MMKV(...)` anywhere else. MMKV stores plain text unless an
// encryptionKey is passed, so it holds NON-SECRET data only (prefs, offline
// flags, the query cache). Secrets live in the Keychain-backed auth store (§10).

import { MMKV } from 'react-native-mmkv';

export const storage = new MMKV({ id: 'app-storage' });

// Separate instance namespaced for the query cache to avoid key collisions.
export const queryStorage = new MMKV({ id: 'query-cache' });
```

```typescript
// src/api/queryClient.ts
// Creates the single QueryClient, the MMKV cache persister, and wires
// onlineManager to NetInfo. Import this module once in App.tsx — never create
// per-component QueryClients.

import { QueryClient, onlineManager } from '@tanstack/react-query';
import { createSyncStoragePersister } from '@tanstack/query-sync-storage-persister';
import NetInfo from '@react-native-community/netinfo';
import { queryStorage } from '@shared/utils/storage';

// Drive TanStack Query's online state from the real network status so paused
// mutations resume and stale queries refetch the moment connectivity returns.
onlineManager.setEventListener((setOnline) =>
  NetInfo.addEventListener((state) => setOnline(!!state.isConnected)),
);

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
      // gcTime MUST be >= the persister's maxAge (see App.tsx below), or the
      // in-memory entry is garbage-collected before the persisted copy can be
      // restored — which silently defeats "survives app restart". 24h matches
      // persistQueryClient's default maxAge.
      gcTime: 1000 * 60 * 60 * 24,
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
import React, { useEffect } from 'react';
import { PersistQueryClientProvider } from '@tanstack/react-query-persist-client';
import { NavigationContainer } from '@react-navigation/native';
import { queryClient, mmkvPersister } from '@api/queryClient';
import { RootNavigator } from '@navigation/RootNavigator';
import { hydrateAuth } from '@store/authStore';

// Bump on breaking changes to any cached shape to discard the persisted cache.
// Keep it stable across a release (e.g. the app version string).
const CACHE_BUSTER = '1.0.0';

export default function App() {
  // Restore the access token from the Keychain into the in-memory auth store
  // before navigation reads `isAuthenticated`.
  useEffect(() => {
    hydrateAuth();
  }, []);

  return (
    // PersistQueryClientProvider restores the MMKV-persisted cache before the
    // first render, so screens show stale data instantly while revalidating.
    // maxAge caps how long a persisted cache is trusted; it must be <= the
    // QueryClient's gcTime (24h) or entries GC out before they can be restored.
    <PersistQueryClientProvider
      client={queryClient}
      persistOptions={{
        persister: mmkvPersister,
        maxAge: 1000 * 60 * 60 * 24,
        buster: CACHE_BUSTER,
      }}
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
import { useAuthStore } from '@store/authStore';

const BASE_URL = process.env.EXPO_PUBLIC_API_BASE_URL ?? 'https://api.example.com';

export const apiClient: AxiosInstance = axios.create({
  baseURL: BASE_URL,
  timeout: 15_000,
  headers: { 'Content-Type': 'application/json' },
});

// --- Request interceptor: inject bearer token ---
// Read synchronously from the in-memory auth store (hydrated from the Keychain
// at app start, §10). Secrets NEVER live in plain-text MMKV.
apiClient.interceptors.request.use((config: InternalAxiosRequestConfig) => {
  const token = useAuthStore.getState().accessToken;
  if (token) {
    config.headers.set('Authorization', `Bearer ${token}`);
  }
  return config;
});

// --- Single-flight token refresh ---
// Only one refresh is ever in flight; concurrent 401s await the same promise
// and then replay their original request exactly once.
let refreshPromise: Promise<string | null> | null = null;

async function refreshAccessToken(): Promise<string | null> {
  try {
    // Bare axios (no interceptors/retry) so the refresh can't recurse on itself.
    const { data } = await axios.post<{ accessToken: string }>(
      `${BASE_URL}/auth/refresh`,
      {},
      { withCredentials: true }, // refresh token rides as an httpOnly cookie
    );
    await useAuthStore.getState().setToken(data.accessToken);
    return data.accessToken;
  } catch {
    await useAuthStore.getState().clearToken(); // logout: clears Keychain + store
    return null;
  }
}

// --- Response interceptor: refresh once on 401, else logout ---
apiClient.interceptors.response.use(
  (response: AxiosResponse) => response,
  async (error: AxiosError) => {
    const original = error.config as
      | (InternalAxiosRequestConfig & { _retried?: boolean })
      | undefined;

    if (error.response?.status === 401 && original && !original._retried) {
      original._retried = true;
      refreshPromise ??= refreshAccessToken().finally(() => {
        refreshPromise = null;
      });
      const newToken = await refreshPromise;
      if (newToken) {
        original.headers.set('Authorization', `Bearer ${newToken}`);
        return apiClient(original); // replay the original request once
      }
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

import { useQuery } from '@tanstack/react-query';
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
    staleTime: 60_000,             // 1 minute — adjust per resource freshness requirement
    gcTime: 1000 * 60 * 60 * 24,  // 24h — must stay >= the persister maxAge (§2)
  });
}

/** Fetch and cache a single todo. */
export function useTodoDetailQuery(id: string) {
  return useQuery({
    queryKey: todoKeys.detail(id),
    queryFn: () => fetchTodo(id),
    staleTime: 60_000,
    gcTime: 1000 * 60 * 60 * 24,  // 24h — see useTodosQuery
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
import { createTodo, toggleTodo, deleteTodo, type CreateTodoInput, type Todo } from '@api/todos';
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
      // Cancel in-flight queries for both keys so they can't clobber our patch.
      await queryClient.cancelQueries({ queryKey: todoKeys.lists() });
      await queryClient.cancelQueries({ queryKey: todoKeys.detail(id) });

      const previousList = queryClient.getQueryData<Todo[]>(todoKeys.lists());
      const previousDetail = queryClient.getQueryData<Todo>(todoKeys.detail(id));

      // Patch each cache entry only when it exists — returning `old` untouched
      // when undefined avoids materialising a fake empty list.
      queryClient.setQueryData<Todo[] | undefined>(todoKeys.lists(), (old) =>
        old ? old.map((t) => (t.id === id ? { ...t, completed: !t.completed } : t)) : old,
      );
      queryClient.setQueryData<Todo | undefined>(todoKeys.detail(id), (old) =>
        old ? { ...old, completed: !old.completed } : old,
      );

      return { previousList, previousDetail };
    },
    onError: (_err, id, context) => {
      // Roll back both keys on error.
      if (context?.previousList !== undefined) {
        queryClient.setQueryData(todoKeys.lists(), context.previousList);
      }
      if (context?.previousDetail !== undefined) {
        queryClient.setQueryData(todoKeys.detail(id), context.previousDetail);
      }
    },
    onSettled: (_data, _err, id) => {
      // Reconcile with server truth for both keys once the mutation settles.
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
  TouchableOpacity,
  RefreshControl,
  StyleSheet,
} from 'react-native';
import type { NativeStackScreenProps } from '@react-navigation/native-stack';
import type { RootStackParamList } from '@navigation/types';
import { LoadingView } from '@shared/components/LoadingView';
import { ErrorView } from '@shared/components/ErrorView';
import { EmptyStateView } from '@shared/components/EmptyStateView';
import { useTodosQuery } from '../queries';
import { useDeleteTodo, useToggleTodo } from '../mutations';

type Props = NativeStackScreenProps<RootStackParamList, 'TodoList'>;

export function TodosScreen({ navigation }: Props) {
  const { data: todos, isPending, isError, error, refetch, isRefetching } = useTodosQuery();
  const toggleMutation = useToggleTodo();
  const deleteMutation = useDeleteTodo();

  // States delegate to the shared components (§12) so every screen renders them
  // identically. isPending is the v5 first-load flag (there is no cached data yet).
  if (isPending) return <LoadingView label="Loading todos" />;
  if (isError) return <ErrorView error={error} onRetry={refetch} />;
  if (todos.length === 0) return <EmptyStateView message="No todos yet. Add your first one!" />;

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
> They define the repository-layer cache contract for TanStack Query: the
> data-fetching layer is the single source of caching truth.

1. **Cache decoded objects, not bytes.** TanStack Query stores the return value of `queryFn` — a decoded TypeScript object. Never cache raw `AxiosResponse` or `ArrayBuffer`.
2. **Explicit `staleTime` and `gcTime` on every `useQuery`.** No implicit infinite TTL. `staleTime` governs background revalidation; `gcTime` governs memory reclamation.
3. **Query keys = `[operation, ...params]`.** Never key on URLs. Centralise key definitions in a `todoKeys` (or `<resource>Keys`) object so mutations and queries share the same reference.
4. **Invalidate on write.** Every `useMutation` calls `queryClient.invalidateQueries({ queryKey })` for all affected list and detail keys in `onSuccess`. Optimistic updates (optional) must pair a rollback in `onError`.
5. **MMKV persistence for offline-first.** The `PersistQueryClientProvider` + MMKV persister hydrates the cache before the first render. Stale data renders immediately; revalidation runs in the background.
6. **Repository seam.** `src/api/*.ts` functions are the only axios callers. Screens and components never import from `axios` or from `src/api/` directly — they consume query/mutation hooks.
7. **Query cache = transient server-owned data.** Durable non-secret user data belongs in MMKV; secrets (the access token) live only in memory in the Keychain-backed auth store (§10), never in plain-text MMKV. Never use TanStack Query as a system of record.

---

## 10. Auth Store (Zustand + Keychain)

```typescript
// src/store/authStore.ts
// Auth session store. The access token lives ONLY in memory here and in the
// platform secure enclave via react-native-keychain (iOS Keychain / Android
// Keystore) — never in plain-text MMKV. The axios request interceptor (§3)
// reads `accessToken` synchronously via useAuthStore.getState().

import { create } from 'zustand';
import * as Keychain from 'react-native-keychain';

// Namespaces the credential entry. Use a stable, app-unique service string.
const KEYCHAIN_SERVICE = 'com.example.app.auth';

interface AuthState {
  accessToken: string | null;
  isAuthenticated: boolean;
  setToken: (token: string) => Promise<void>;
  clearToken: () => Promise<void>;
}

export const useAuthStore = create<AuthState>()((set) => ({
  accessToken: null,
  isAuthenticated: false,

  // Persist to the secure enclave and mirror into memory for synchronous reads.
  setToken: async (token) => {
    await Keychain.setGenericPassword('accessToken', token, {
      service: KEYCHAIN_SERVICE,
    });
    set({ accessToken: token, isAuthenticated: true });
  },

  // Logout: wipe both the secure enclave and the in-memory copy.
  clearToken: async () => {
    await Keychain.resetGenericPassword({ service: KEYCHAIN_SERVICE });
    set({ accessToken: null, isAuthenticated: false });
  },
}));

/**
 * Restore the token from the Keychain into the store at app start.
 * Call once from App.tsx before navigation reads `isAuthenticated` (§2).
 */
export async function hydrateAuth(): Promise<void> {
  const creds = await Keychain.getGenericPassword({ service: KEYCHAIN_SERVICE });
  if (creds) {
    useAuthStore.setState({ accessToken: creds.password, isAuthenticated: true });
  }
}
```

---

## 11. Network Status Hook

```typescript
// src/shared/hooks/useNetworkStatus.ts
// Reactive online/offline flag backed by NetInfo. Complements the onlineManager
// wiring in §2 (which drives TanStack Query) — use this hook for UI affordances
// such as an offline banner.

import { useEffect, useState } from 'react';
import NetInfo from '@react-native-community/netinfo';

/** Returns true while the device reports an active network connection. */
export function useNetworkStatus(): boolean {
  const [isOnline, setIsOnline] = useState(true);

  useEffect(() => {
    // addEventListener returns its own unsubscribe function.
    const unsubscribe = NetInfo.addEventListener((state) =>
      setIsOnline(!!state.isConnected),
    );
    return unsubscribe;
  }, []);

  return isOnline;
}
```

---

## 12. Shared UI Components (Loading / Error / Empty)

```typescript
// src/shared/components/LoadingView.tsx
import React from 'react';
import { View, ActivityIndicator, StyleSheet } from 'react-native';

export function LoadingView({ label = 'Loading' }: { label?: string }) {
  return (
    <View style={styles.center}>
      <ActivityIndicator size="large" accessibilityLabel={label} />
    </View>
  );
}

const styles = StyleSheet.create({
  center: { flex: 1, justifyContent: 'center', alignItems: 'center', padding: 24 },
});
```

```typescript
// src/shared/components/ErrorView.tsx
import React from 'react';
import { View, Text, TouchableOpacity, StyleSheet } from 'react-native';

type Props = { error: unknown; onRetry?: () => void };

export function ErrorView({ error, onRetry }: Props) {
  const message = error instanceof Error ? error.message : 'Something went wrong.';
  return (
    <View style={styles.center}>
      <Text style={styles.errorText}>{message}</Text>
      {onRetry ? (
        <TouchableOpacity style={styles.retryButton} onPress={onRetry} accessibilityRole="button">
          <Text style={styles.retryText}>Retry</Text>
        </TouchableOpacity>
      ) : null}
    </View>
  );
}

const styles = StyleSheet.create({
  center: { flex: 1, justifyContent: 'center', alignItems: 'center', padding: 24 },
  errorText: { color: '#d32f2f', textAlign: 'center', marginBottom: 12 },
  retryButton: { backgroundColor: '#1976d2', borderRadius: 8, paddingHorizontal: 20, paddingVertical: 10 },
  retryText: { color: '#fff', fontWeight: '600' },
});
```

```typescript
// src/shared/components/EmptyStateView.tsx
import React from 'react';
import { View, Text, StyleSheet } from 'react-native';

export function EmptyStateView({ message }: { message: string }) {
  return (
    <View style={styles.center}>
      <Text style={styles.emptyText}>{message}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  center: { flex: 1, justifyContent: 'center', alignItems: 'center', padding: 24 },
  emptyText: { color: '#757575', textAlign: 'center' },
});
```

---

## 13. Maestro E2E Flow

```yaml
# e2e/todos.yaml
# Maestro flow exercising the todos happy path end to end. Run with `maestro test e2e/`.
appId: com.example.app
---
- launchApp:
    clearState: true
- assertVisible: "My Todos"
- tapOn: "Add"
- inputText: "Buy milk"
- tapOn: "Save"
- assertVisible: "Buy milk"
- tapOn:
    id: "todo-checkbox-Buy milk"   # toggle complete
- tapOn: "Buy milk"                # open detail
- assertVisible: "Todo Detail"
- back
- tapOn:
    id: "todo-delete-Buy milk"
- assertNotVisible: "Buy milk"
```
