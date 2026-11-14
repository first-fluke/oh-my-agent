# Mobile Agent - Code Snippets (React Native)

Copy-paste ready patterns. Use these as starting points; adapt to the specific task.
Screens and components **never** call axios directly — they consume hooks built on TanStack Query.

---

## 1. Package Dependencies

```json
// package.json (relevant dependencies)
{
  "dependencies": {
    // Core (Expo SDK 57 pairs RN 0.86 with React 19.2.3; RN 0.82+ is New-Arch only)
    "react": "19.2.3",
    "react-native": "^0.86.0",

    // Navigation (v7 is the current stable line)
    "@react-navigation/native": "^7.3.10",
    "@react-navigation/native-stack": "^7.3.10",
    "@react-navigation/bottom-tabs": "^7.3.10",
    "react-native-screens": "^4.26.2",
    "react-native-safe-area-context": "~5.7.0",

    // HTTP transport
    "axios": "^1.7.7",

    // Server-state cache + offline persistence
    "@tanstack/react-query": "^5.101.2",
    "@tanstack/query-async-storage-persister": "^5.101.2",
    "@tanstack/react-query-persist-client": "^5.101.2",

    // Network status (drives onlineManager + useNetworkStatus)
    "@react-native-community/netinfo": "12.0.1",

    // Local storage (v4 is the Nitro module; requires RN 0.76+)
    "react-native-mmkv": "^4.3.2",
    "react-native-nitro-modules": "0.35.9", // MMKV 4.3.2 uses this in its development dependencies

    // Secrets (choose one)
    "expo-secure-store": "~57.0.4",
    // -- OR (bare RN) --
    "react-native-keychain": "^10.0.0",

    // Client-state
    "zustand": "^5.0.14"
  },
  "devDependencies": {
    "typescript": "^5.5.4",
    "@types/react": "^19.0.0",
    "jest": "^29.7.0",
    // Jest preset for React Native: set `preset: '@react-native/jest-preset'` in jest.config.js.
    "@react-native/jest-preset": "^0.86.0",
    // Matchers (toBeVisible, etc.) ship inside @testing-library/react-native >=12.4,
    // so no separate matcher package is needed. React Native ships its own types too.
    "@testing-library/react-native": "^14.0.1",
    "test-renderer": "^1.0.0", // peer dependency of @testing-library/react-native 14
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
// never call `createMMKV(...)` anywhere else. MMKV stores plain text unless an
// encryptionKey is passed, so it holds NON-SECRET data only (prefs, offline
// flags, the query cache). Secrets live in the Keychain-backed auth store (§9).

import { createMMKV } from 'react-native-mmkv';

export const storage = createMMKV({ id: 'app-storage' });

// Separate instance namespaced for the query cache to avoid key collisions.
export const queryStorage = createMMKV({ id: 'query-cache' });
```

```typescript
// src/api/queryClient.ts
// Creates the single QueryClient, the MMKV cache persister, and wires
// onlineManager to NetInfo. Import this module once in App.tsx — never create
// per-component QueryClients.

import { QueryClient, onlineManager } from '@tanstack/react-query';
import { createAsyncStoragePersister } from '@tanstack/query-async-storage-persister';
import NetInfo from '@react-native-community/netinfo';
import { queryStorage } from '@shared/utils/storage';

// Drive TanStack Query's online state from the real network status so paused
// mutations resume and stale queries refetch the moment connectivity returns.
onlineManager.setEventListener((setOnline) =>
  NetInfo.addEventListener((state) => setOnline(!!state.isConnected)),
);

// Persister adapter: TanStack Query serialises/deserialises its cache as a
// single JSON string under the key below. PersistQueryClientProvider restores
// it on mount and keeps queries idle until the restore finishes.
let cacheSessionVersion = 0;
export const createAccountPersister = (accountId: string) => {
  const version = cacheSessionVersion;
  return createAsyncStoragePersister({
    key: `query-cache:${accountId}`,
    storage: {
      getItem: (key) => queryStorage.getString(key) ?? null,
      setItem: (key, value) => {
        if (version === cacheSessionVersion) queryStorage.set(key, value);
      },
      removeItem: (key) => queryStorage.remove(key),
    },
  });
};

const createQueryClient = () => new QueryClient({
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
export let queryClient = createQueryClient();
export async function resetAccountQueryCache(accountId: string | null): Promise<void> {
  cacheSessionVersion += 1; // block delayed disk writes from the retired session
  await queryClient.cancelQueries();
  queryClient.clear();
  if (accountId) await createAccountPersister(accountId).removeClient();
  queryClient = createQueryClient(); // old callbacks retain an unmounted client
}

```

```typescript
// src/App.tsx  (provider wiring — abridged)
import React, { useEffect, useMemo, useState } from 'react';
import { PersistQueryClientProvider } from '@tanstack/react-query-persist-client';
import { NavigationContainer } from '@react-navigation/native';
import { queryClient, createAccountPersister } from '@api/queryClient';
import { RootNavigator } from '@navigation/RootNavigator';
import { hydrateAuth, useAuthStore } from '@store/authStore';
import { LoadingView } from '@shared/components/LoadingView';

// Bump on breaking changes to any cached shape to discard the persisted cache.
// Keep it stable across a release (e.g. the app version string).
const CACHE_BUSTER = '1.0.0';

export default function App() {
  const [ready, setReady] = useState(false);
  const accountId = useAuthStore((state) => state.accountId);
  const sessionVersion = useAuthStore((state) => state.sessionVersion);
  const persister = useMemo(() => accountId ? createAccountPersister(accountId) : null, [accountId, sessionVersion]);
  useEffect(() => {
    hydrateAuth().catch(() => useAuthStore.getState().clearToken()).finally(() => setReady(true));
  }, []);
  if (!ready) return <LoadingView label="Restoring session" />;
  if (!accountId || !persister) return <NavigationContainer><RootNavigator /></NavigationContainer>;

  return (
    // PersistQueryClientProvider restores the MMKV-persisted cache on mount and
    // keeps queries idle until it finishes, so screens render the restored data
    // and then revalidate.
    // maxAge caps how long a persisted cache is trusted; it must be <= the
    // QueryClient's gcTime (24h) or entries GC out before they can be restored.
    <PersistQueryClientProvider
      key={`${accountId}:${sessionVersion}`}
      client={queryClient}
      persistOptions={{
        persister,
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
  type AxiosRequestConfig,
  type InternalAxiosRequestConfig,
  type AxiosResponse,
  type AxiosError,
} from 'axios';
import { useAuthStore } from '@store/authStore';

const BASE_URL = process.env.EXPO_PUBLIC_API_BASE_URL ?? 'https://api.example.com';

export const apiClient: AxiosInstance = axios.create({
  baseURL: BASE_URL,
  timeout: 15_000,
  headers: { 'Content-Type': 'application/json' },
});

// --- Request interceptor: inject bearer token ---
// Read synchronously from the in-memory auth store (hydrated from the Keychain
// at app start, §9). Secrets NEVER live in plain-text MMKV.
export type SessionRequestConfig = AxiosRequestConfig & { _sessionVersion: number; _accountId: string | null };
type SessionRequest = InternalAxiosRequestConfig & { _sessionVersion?: number; _accountId?: string | null; _retried?: boolean };
apiClient.interceptors.request.use((config: SessionRequest) => {
  config._sessionVersion ??= useAuthStore.getState().sessionVersion;
  if (!('_accountId' in config)) config._accountId = useAuthStore.getState().accountId;
  if (config._sessionVersion !== useAuthStore.getState().sessionVersion ||
      config._accountId !== useAuthStore.getState().accountId) {
    throw new axios.CanceledError('Request belongs to a retired session');
  }
  const token = useAuthStore.getState().accessToken;
  if (token) {
    config.headers.set('Authorization', `Bearer ${token}`);
  }
  return config;
});

// --- Single-flight token refresh ---
// Only one refresh is ever in flight; concurrent 401s await the same promise
// and then replay their original request exactly once.
let refreshPromise: { version: number; promise: Promise<string | null> } | null = null;

async function refreshAccessToken(): Promise<string | null> {
  const version = useAuthStore.getState().sessionVersion;
  try {
    // Bare axios (no interceptors/retry) so the refresh can't recurse on itself.
    const { data } = await axios.post<{ accessToken: string }>(
      `${BASE_URL}/auth/refresh`,
      {},
      { withCredentials: true }, // refresh token rides as an httpOnly cookie
    );
    if (!await useAuthStore.getState().updateToken(data.accessToken, version)) return null;
    return data.accessToken;
  } catch {
    await useAuthStore.getState().clearToken(version);
    return null;
  }
}

// --- Response interceptor: refresh once on 401, else logout ---
apiClient.interceptors.response.use(
  (response: AxiosResponse) => response,
  async (error: AxiosError) => {
    const original = error.config as
      | SessionRequest
      | undefined;

    if (error.response?.status === 401 && original && !original._retried &&
        !original.signal?.aborted && useAuthStore.getState().isAuthenticated &&
        original._sessionVersion === useAuthStore.getState().sessionVersion) {
      original._retried = true;
      const version = useAuthStore.getState().sessionVersion;
      if (!refreshPromise || refreshPromise.version !== version) {
        const promise = refreshAccessToken().finally(() => {
          if (refreshPromise?.promise === promise) refreshPromise = null;
        });
        refreshPromise = { version, promise };
      }
      const newToken = await refreshPromise.promise;
      if (newToken && version === useAuthStore.getState().sessionVersion && !original.signal?.aborted) {
        original.headers.set('Authorization', `Bearer ${newToken}`);
        return apiClient(original); // replay the original request once
      }
    }
    return Promise.reject(error);
  },
);

// The transport does not retry. TanStack Query owns retries (`retry` in the
// QueryClient defaults: queries back off and retry, mutations do not), so a
// second retry layer here would multiply the attempts.
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

import { apiClient, type SessionRequestConfig } from './client';

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
export async function fetchTodos(accountId: string | null, sessionVersion: number, signal?: AbortSignal): Promise<Todo[]> {
  const config: SessionRequestConfig = { _accountId: accountId, _sessionVersion: sessionVersion, signal };
  const { data } = await apiClient.get<Todo[]>('/todos', config);
  return data;
}

/** Fetch a single todo by ID. */
export async function fetchTodo(id: string, accountId: string | null, sessionVersion: number, signal?: AbortSignal): Promise<Todo> {
  const config: SessionRequestConfig = { _accountId: accountId, _sessionVersion: sessionVersion, signal };
  const { data } = await apiClient.get<Todo>(`/todos/${id}`, config);
  return data;
}

/** Create a new todo. */
export async function createTodo(input: CreateTodoInput, accountId: string | null, sessionVersion: number): Promise<Todo> {
  const config: SessionRequestConfig = { _accountId: accountId, _sessionVersion: sessionVersion };
  const { data } = await apiClient.post<Todo>('/todos', input, config);
  return data;
}

/** Toggle the completed flag on a todo. */
export async function toggleTodo(id: string, accountId: string | null, sessionVersion: number): Promise<Todo> {
  const config: SessionRequestConfig = { _accountId: accountId, _sessionVersion: sessionVersion };
  const { data } = await apiClient.patch<Todo>(`/todos/${id}/toggle`, undefined, config);
  return data;
}

/** Permanently delete a todo. */
export async function deleteTodo(id: string, accountId: string | null, sessionVersion: number): Promise<void> {
  const config: SessionRequestConfig = { _accountId: accountId, _sessionVersion: sessionVersion };
  await apiClient.delete(`/todos/${id}`, config);
}
```

---

## 5. Feature Query and Mutation Hooks

```typescript
// src/features/todos/queries.ts
// Read hooks — wrap src/api/todos.ts functions with TanStack Query.
// Explicit staleTime / gcTime on every query; never rely on defaults alone.

import { useQuery } from '@tanstack/react-query';
import { useAuthStore } from '@store/authStore';
import { fetchTodos, fetchTodo } from '@api/todos';

// Centralise query key definitions so mutations can reference them without
// string duplication. Key shape: [account/tenant, operation, ...params].
export const todoKeys = {
  all: (accountId: string | null) => ['account', accountId, 'todos'] as const,
  lists: (accountId: string | null) => [...todoKeys.all(accountId), 'list'] as const,
  detail: (accountId: string | null, id: string) => [...todoKeys.all(accountId), 'detail', id] as const,
};

/** Fetch and cache the todo list. Returns stale data instantly, revalidates in
 *  the background when data is older than staleTime. */
export function useTodosQuery() {
  const accountId = useAuthStore((state) => state.accountId);
  const sessionVersion = useAuthStore((state) => state.sessionVersion);
  return useQuery({
    queryKey: todoKeys.lists(accountId),
    queryFn: ({ signal }) => fetchTodos(accountId, sessionVersion, signal),
    enabled: Boolean(accountId),
    staleTime: 60_000,             // 1 minute — adjust per resource freshness requirement
    gcTime: 1000 * 60 * 60 * 24,  // 24h — must stay >= the persister maxAge (§2)
  });
}

/** Fetch and cache a single todo. */
export function useTodoDetailQuery(id: string) {
  const accountId = useAuthStore((state) => state.accountId);
  const sessionVersion = useAuthStore((state) => state.sessionVersion);
  return useQuery({
    queryKey: todoKeys.detail(accountId, id),
    queryFn: ({ signal }) => fetchTodo(id, accountId, sessionVersion, signal),
    staleTime: 60_000,
    gcTime: 1000 * 60 * 60 * 24,  // 24h — see useTodosQuery
    enabled: Boolean(accountId && id),
  });
}
```

```typescript
// src/features/todos/mutations.ts
// Write hooks — wrap src/api/todos.ts functions with useMutation.
// Every mutation MUST call invalidateQueries for affected keys on onSuccess
// so the cache repopulates from the server on the next read.

import { useMutation, useQueryClient } from '@tanstack/react-query';
import { useAuthStore } from '@store/authStore';
import { createTodo, toggleTodo, deleteTodo, type CreateTodoInput, type Todo } from '@api/todos';
import { todoKeys } from './queries';

// A paused/optimistic mutation from an old provider must not use a new login.
function runAccountMutation<T>(accountId: string | null, version: number, operation: (version: number) => Promise<T>): Promise<T> {
  const current = useAuthStore.getState();
  if (!accountId || current.accountId !== accountId || current.sessionVersion !== version) {
    return Promise.reject(new Error('Mutation belongs to a retired session'));
  }
  return operation(version);
}

/** Create a new todo then invalidate the list cache. */
export function useCreateTodo() {
  const accountId = useAuthStore((state) => state.accountId);
  const sessionVersion = useAuthStore((state) => state.sessionVersion);
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (input: CreateTodoInput) => runAccountMutation(accountId, sessionVersion, (version) => createTodo(input, accountId, version)),
    onSuccess: () => {
      // Invalidate the list so the next useTodosQuery fetches fresh data.
      queryClient.invalidateQueries({ queryKey: todoKeys.lists(accountId) });
    },
  });
}

/** Toggle a todo's completed flag then invalidate list + detail caches. */
export function useToggleTodo() {
  const accountId = useAuthStore((state) => state.accountId);
  const sessionVersion = useAuthStore((state) => state.sessionVersion);
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (id: string) => runAccountMutation(accountId, sessionVersion, (version) => toggleTodo(id, accountId, version)),
    // Optimistic update: flip the flag in the cache immediately for instant UI
    // feedback; roll back if the mutation fails.
    onMutate: async (id) => {
      // Cancel in-flight queries for both keys so they can't clobber our patch.
      await queryClient.cancelQueries({ queryKey: todoKeys.lists(accountId) });
      await queryClient.cancelQueries({ queryKey: todoKeys.detail(accountId, id) });

      const previousList = queryClient.getQueryData<Todo[]>(todoKeys.lists(accountId));
      const previousDetail = queryClient.getQueryData<Todo>(todoKeys.detail(accountId, id));

      // Patch each cache entry only when it exists — returning `old` untouched
      // when undefined avoids materialising a fake empty list.
      queryClient.setQueryData<Todo[] | undefined>(todoKeys.lists(accountId), (old) =>
        old ? old.map((t) => (t.id === id ? { ...t, completed: !t.completed } : t)) : old,
      );
      queryClient.setQueryData<Todo | undefined>(todoKeys.detail(accountId, id), (old) =>
        old ? { ...old, completed: !old.completed } : old,
      );

      return { previousList, previousDetail };
    },
    onError: (_err, id, onMutateResult) => {
      // Roll back both keys on error.
      if (onMutateResult?.previousList !== undefined) {
        queryClient.setQueryData(todoKeys.lists(accountId), onMutateResult.previousList);
      }
      if (onMutateResult?.previousDetail !== undefined) {
        queryClient.setQueryData(todoKeys.detail(accountId, id), onMutateResult.previousDetail);
      }
    },
    onSettled: (_data, _err, id) => {
      // Reconcile with server truth for both keys once the mutation settles.
      queryClient.invalidateQueries({ queryKey: todoKeys.lists(accountId) });
      queryClient.invalidateQueries({ queryKey: todoKeys.detail(accountId, id) });
    },
  });
}

/** Delete a todo then invalidate the list cache. */
export function useDeleteTodo() {
  const accountId = useAuthStore((state) => state.accountId);
  const sessionVersion = useAuthStore((state) => state.sessionVersion);
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (id: string) => runAccountMutation(accountId, sessionVersion, (version) => deleteTodo(id, accountId, version)),
    onSuccess: (_data, id) => {
      queryClient.invalidateQueries({ queryKey: todoKeys.lists(accountId) });
      // Remove the detail cache entry immediately — it is no longer valid.
      queryClient.removeQueries({ queryKey: todoKeys.detail(accountId, id) });
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

  // States delegate to the project's shared LoadingView / ErrorView / EmptyStateView
  // so every screen renders them identically. isPending is the v5 first-load flag
  // (there is no cached data yet).
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
            testID={`todo-checkbox-${item.id}`}
            accessibilityLabel={`Toggle ${item.title}`}
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
            testID={`todo-delete-${item.id}`}
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

## 8. Jest Test: Screen with QueryClientProvider

```typescript
// src/features/todos/__tests__/TodosScreen.test.tsx
// Wraps the screen in a QueryClientProvider with a fresh no-retry QueryClient.
// The api module is mocked at the Jest boundary — tests assert on component
// output, not axios internals. RNTL v14: `render` and `fireEvent` are async —
// await both.

import React from 'react';
import { render, screen, fireEvent, waitFor } from '@testing-library/react-native';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { useAuthStore } from '@store/authStore';
import { TodosScreen } from '../ui/TodosScreen';

// Mock the entire api/todos module — the seam between hooks and transport.
jest.mock('@api/todos', () => ({
  fetchTodos: jest.fn(),
  toggleTodo: jest.fn(),
  deleteTodo: jest.fn(),
}));
// authStore imports the Keychain native module and the MMKV-backed query client;
// stub both so the real store can be seeded with plain setState.
jest.mock('react-native-keychain', () => ({
  setGenericPassword: jest.fn(),
  getGenericPassword: jest.fn(),
  resetGenericPassword: jest.fn(),
}));
jest.mock('@api/queryClient', () => ({ resetAccountQueryCache: jest.fn() }));

import * as todosApi from '@api/todos';

const ACCOUNT_ID = 'acct-1';
const SESSION_VERSION = 1;

type Props = React.ComponentProps<typeof TodosScreen>;
const navigation = { navigate: jest.fn() } as unknown as Props['navigation'];
const route: Props['route'] = { key: 'TodoList-test', name: 'TodoList' };

// A fresh QueryClient per test avoids state bleed.
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

async function renderScreen() {
  return render(
    <QueryClientProvider client={createTestQueryClient()}>
      <TodosScreen navigation={navigation} route={route} />
    </QueryClientProvider>,
  );
}

describe('TodosScreen', () => {
  beforeEach(() => {
    // Queries are `enabled: Boolean(accountId)` and mutations are fenced by
    // accountId + sessionVersion, so an unseeded store never fetches.
    useAuthStore.setState({
      accessToken: 'test-token',
      accountId: ACCOUNT_ID,
      sessionVersion: SESSION_VERSION,
      isAuthenticated: true,
    });
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  it('renders todo titles for the signed-in account', async () => {
    (todosApi.fetchTodos as jest.Mock).mockResolvedValue([
      { id: '1', title: 'Buy milk', completed: false, createdAt: '' },
      { id: '2', title: 'Walk the dog', completed: true, createdAt: '' },
    ]);

    await renderScreen();

    expect(await screen.findByText('Buy milk')).toBeOnTheScreen();
    expect(screen.getByText('Walk the dog')).toBeOnTheScreen();
    expect(todosApi.fetchTodos).toHaveBeenCalledWith(ACCOUNT_ID, SESSION_VERSION, expect.anything());
  });

  it('shows the empty state when the list is empty', async () => {
    (todosApi.fetchTodos as jest.Mock).mockResolvedValue([]);

    await renderScreen();

    expect(await screen.findByText(/No todos yet/i)).toBeOnTheScreen();
  });

  it('does not fetch without an account', async () => {
    useAuthStore.setState({ accessToken: null, accountId: null, isAuthenticated: false });

    await renderScreen();

    expect(todosApi.fetchTodos).not.toHaveBeenCalled();
  });

  it('deletes through the account-scoped api call', async () => {
    (todosApi.fetchTodos as jest.Mock).mockResolvedValue([
      { id: '42', title: 'Delete me', completed: false, createdAt: '' },
    ]);
    (todosApi.deleteTodo as jest.Mock).mockResolvedValue(undefined);

    await renderScreen();

    await fireEvent.press(await screen.findByLabelText('Delete Delete me'));

    await waitFor(() => {
      expect(todosApi.deleteTodo).toHaveBeenCalledWith('42', ACCOUNT_ID, SESSION_VERSION);
    });
  });
});
```

---

## 9. Auth Store (Zustand + Keychain)

```typescript
// src/store/authStore.ts
// Auth session store. The access token lives ONLY in memory here and in the
// platform secure enclave via react-native-keychain (iOS Keychain / Android
// Keystore) — never in plain-text MMKV. The axios request interceptor (§3)
// reads `accessToken` synchronously via useAuthStore.getState().

import { create } from 'zustand';
import * as Keychain from 'react-native-keychain';
import { resetAccountQueryCache } from '@api/queryClient';

// Namespaces the credential entry. Use a stable, app-unique service string.
const KEYCHAIN_SERVICE = 'com.example.app.auth';

interface AuthState {
  accessToken: string | null;
  accountId: string | null; // validated non-secret account/tenant ID from the server
  sessionVersion: number;
  isAuthenticated: boolean;
  setToken: (token: string, accountId: string) => Promise<void>;
  updateToken: (token: string, version: number) => Promise<boolean>;
  clearToken: (expectedVersion?: number) => Promise<void>;
}

// Serialize credential writes: a late refresh cannot undo logout.
let sessionTransition: Promise<unknown> = Promise.resolve();
function transition<T>(operation: () => Promise<T>): Promise<T> {
  const next = sessionTransition.then(operation);
  sessionTransition = next.catch(() => undefined);
  return next;
}

export const useAuthStore = create<AuthState>()((set, get) => ({
  accessToken: null,
  accountId: null,
  sessionVersion: 0,
  isAuthenticated: false,
  setToken: (token, accountId) => transition(async () => {
    if (!accountId) throw new Error('Validated account ID is required');
    const previousAccount = get().accountId;
    set({ accessToken: null, accountId: null, isAuthenticated: false,
      sessionVersion: get().sessionVersion + 1 }); // unmount old account before awaiting
    await resetAccountQueryCache(previousAccount);
    await Keychain.setGenericPassword(accountId, token, { service: KEYCHAIN_SERVICE });
    set({ accessToken: token, accountId, isAuthenticated: true });
  }),
  updateToken: (token, version) => transition(async () => {
    const accountId = get().accountId;
    if (version !== get().sessionVersion || !accountId) return false;
    await Keychain.setGenericPassword(accountId, token, { service: KEYCHAIN_SERVICE });
    set({ accessToken: token });
    return true;
  }),
  clearToken: (expectedVersion) => transition(async () => {
    // Check inside the queue: a queued new login may have finished meanwhile.
    if (expectedVersion !== undefined && expectedVersion !== get().sessionVersion) return;
    const previousAccount = get().accountId;
    set({ accessToken: null, accountId: null, isAuthenticated: false,
      sessionVersion: get().sessionVersion + 1 });
    await resetAccountQueryCache(previousAccount);
    await Keychain.resetGenericPassword({ service: KEYCHAIN_SERVICE });
  }),
}));

// Call before mounting account providers. The username is the validated account
// ID written by setToken; discard legacy token-only entries during migration.
export async function hydrateAuth(): Promise<void> {
  const creds = await Keychain.getGenericPassword({ service: KEYCHAIN_SERVICE });
  if (creds && creds.username !== 'accessToken') {
    await useAuthStore.getState().setToken(creds.password, creds.username);
  } else if (creds) {
    await useAuthStore.getState().clearToken();
  }
}
```

---

## 10. Network Status Hook

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

## 11. Maestro E2E Flow

Before this flow, sign into an isolated test account and seed a todo with title
Buy milk and a known ID. Supply that ID as MAESTRO_TODO_ID. Keep the signed-in
session: clearState would return the example navigator to Login. This example
covers existing row actions; add/login flows belong to their actual screens.
Run it on Android: Maestro supports the `back` command on Android and Web only.

```yaml
appId: com.example.app
---
- launchApp:
    clearState: false
- assertVisible: "My Todos"
- assertVisible: "Buy milk"
- tapOn:
    id: "todo-checkbox-${MAESTRO_TODO_ID}"
- tapOn: "Buy milk"
- assertVisible: "Todo Detail"
- back
- tapOn:
    id: "todo-delete-${MAESTRO_TODO_ID}"
- assertNotVisible: "Buy milk"
```
