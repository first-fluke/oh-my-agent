/**
 * API Data Layer Template for Mobile Agent (React Native)
 *
 * This file is the complete todos data layer — the ONLY place that touches
 * the axios transport for the /todos resource. Screens and components never
 * import from this file directly; they consume the TanStack Query hooks in
 * src/features/todos/queries.ts and mutations.ts, which call these functions.
 *
 * Layout (split into separate files in production):
 *   src/api/
 *     client.ts          ← singleton axios instance + interceptors (auth, retry)
 *     queryClient.ts     ← QueryClient + MMKV persister (offline-first cache)
 *     todos.ts           ← THIS FILE: typed axios functions for /todos
 *   src/features/todos/
 *     queries.ts         ← useQuery hooks (useTodosQuery, useTodoDetailQuery)
 *     mutations.ts       ← useMutation hooks (useCreateTodo, useToggleTodo, useDeleteTodo)
 *
 * Caching contract (TanStack Query — the RN parallel to swift's ResponseCache actor):
 *   - Reads: useQuery caches DECODED JS objects (not AxiosResponse bytes).
 *     staleTime / gcTime are explicit on every query — no implicit infinite TTL.
 *     Query keys = [operation, ...params], never URLs.
 *     Stale-while-revalidate: the cache entry renders immediately; a background
 *     fetch updates it when the entry is older than staleTime.
 *   - Writes: useMutation calls queryClient.invalidateQueries() for all affected
 *     keys on onSuccess so the next read repopulates from the server.
 *   - Offline persistence: @tanstack/query-persist-client-core + MMKV persister
 *     (react-native-mmkv) serialises the cache to disk so it survives app restarts.
 *   - Secrets / durable user data: expo-secure-store or react-native-keychain.
 *     Never use TanStack Query as a system of record.
 */

// ============================================================================
// src/api/client.ts
// ============================================================================

import axios, {
  type AxiosInstance,
  type InternalAxiosRequestConfig,
  type AxiosResponse,
  type AxiosError,
} from 'axios';
import axiosRetry from 'axios-retry';
import { MMKV } from 'react-native-mmkv';

/** Shared MMKV instance. Re-export so other modules (store, utils) can reuse it. */
export const storage = new MMKV({ id: 'app-storage' });

const BASE_URL =
  process.env.EXPO_PUBLIC_API_BASE_URL ?? 'https://api.example.com';

/**
 * Singleton axios instance — the ONLY axios instance in the codebase.
 * All src/api/*.ts data functions import from this module.
 * React components and screens NEVER import this directly.
 */
export const apiClient: AxiosInstance = axios.create({
  baseURL: BASE_URL,
  timeout: 15_000,
  headers: { 'Content-Type': 'application/json' },
});

// --- Request interceptor: inject bearer token from MMKV ---
apiClient.interceptors.request.use((config: InternalAxiosRequestConfig) => {
  const token = storage.getString('accessToken');
  if (token) {
    config.headers.set('Authorization', `Bearer ${token}`);
  }
  return config;
});

// --- Response interceptor: handle 401 centrally ---
apiClient.interceptors.response.use(
  (response: AxiosResponse) => response,
  async (error: AxiosError) => {
    if (error.response?.status === 401) {
      // Purge the stale token — the auth store / navigation will redirect
      // the user to the login screen.
      storage.delete('accessToken');
    }
    return Promise.reject(error);
  },
);

// --- Retry: 3 attempts, exponential back-off, idempotent methods only ---
axiosRetry(apiClient, {
  retries: 3,
  retryCondition: (error) =>
    axiosRetry.isNetworkOrIdempotentRequestError(error) &&
    error.response?.status !== 401,
  retryDelay: axiosRetry.exponentialDelay,
});

// ============================================================================
// src/api/queryClient.ts
// ============================================================================

import { QueryClient } from '@tanstack/react-query';
import { createSyncStoragePersister } from '@tanstack/query-persist-client-core';

/** Separate MMKV instance namespaced for the query cache to avoid key collisions. */
const queryStorage = new MMKV({ id: 'query-cache' });

/**
 * MMKV-backed persister for TanStack Query.
 * Serialises the entire query cache to disk under a single key so the cache
 * survives app restarts — this is the offline-first persistence tier, mirroring
 * the disk-tier of swift's hyperoslo/Cache Storage.
 */
export const mmkvPersister = createSyncStoragePersister({
  storage: {
    getItem: (key) => queryStorage.getString(key) ?? null,
    setItem: (key, value) => queryStorage.set(key, value),
    removeItem: (key) => queryStorage.delete(key),
  },
});

/**
 * Application-wide QueryClient. Created once; provided via
 * <PersistQueryClientProvider> in App.tsx. Never instantiate per-component.
 *
 * Default staleTime (60 s) and gcTime (5 min) apply to all queries unless
 * a query overrides them explicitly. Overriding is encouraged for resources
 * with different freshness requirements.
 */
export const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      staleTime: 60_000,        // 1 minute — triggers background revalidation
      gcTime: 5 * 60_000,       // 5 minutes idle before memory GC
      retry: 3,
      refetchOnWindowFocus: false, // Irrelevant on mobile; disabling avoids surprises
    },
    mutations: {
      retry: 0,
    },
  },
});

// ============================================================================
// src/api/todos.ts
// ============================================================================
// Typed axios functions for the /todos REST resource.
// Pure data functions: accept inputs, call apiClient, return decoded objects.
// They are the transport seam — no React, no hooks, no cache knowledge.

// --- Domain types ---

/** A single todo item returned by the API. */
export interface Todo {
  id: string;
  title: string;
  completed: boolean;
  createdAt: string;
}

/** Request body for creating a new todo. */
export interface CreateTodoInput {
  title: string;
}

// --- Data functions ---

/**
 * Fetch all todos for the authenticated user.
 * Called by: useTodosQuery (src/features/todos/queries.ts)
 */
export async function fetchTodos(): Promise<Todo[]> {
  const { data } = await apiClient.get<Todo[]>('/todos');
  return data;
}

/**
 * Fetch a single todo by ID.
 * Called by: useTodoDetailQuery (src/features/todos/queries.ts)
 */
export async function fetchTodo(id: string): Promise<Todo> {
  const { data } = await apiClient.get<Todo>(`/todos/${id}`);
  return data;
}

/**
 * Create a new todo with the given title.
 * Called by: useCreateTodo (src/features/todos/mutations.ts)
 * Cache effect: mutations.ts invalidates todoKeys.lists() on success.
 */
export async function createTodo(input: CreateTodoInput): Promise<Todo> {
  const { data } = await apiClient.post<Todo>('/todos', input);
  return data;
}

/**
 * Toggle the completed flag on a todo.
 * Called by: useToggleTodo (src/features/todos/mutations.ts)
 * Cache effect: mutations.ts invalidates todoKeys.lists() + todoKeys.detail(id) on success.
 */
export async function toggleTodo(id: string): Promise<Todo> {
  const { data } = await apiClient.patch<Todo>(`/todos/${id}/toggle`);
  return data;
}

/**
 * Permanently delete a todo.
 * Called by: useDeleteTodo (src/features/todos/mutations.ts)
 * Cache effect: mutations.ts invalidates todoKeys.lists() and removes todoKeys.detail(id).
 */
export async function deleteTodo(id: string): Promise<void> {
  await apiClient.delete(`/todos/${id}`);
}

// ============================================================================
// src/features/todos/queries.ts
// ============================================================================
// Read hooks — server-state cache layer built on TanStack Query.
// These hooks are what screens import. They never expose axios internals.

import { useQuery } from '@tanstack/react-query';

/**
 * Centralised query key factory.
 * Shape: [operation, ...params] — never a URL.
 * Shared with mutations.ts so invalidation references the exact same keys.
 */
export const todoKeys = {
  all: ['todos'] as const,
  lists: () => [...todoKeys.all, 'list'] as const,
  detail: (id: string) => [...todoKeys.all, 'detail', id] as const,
};

/**
 * Fetch and cache the full todo list.
 *
 * Behaviour:
 *   - On mount: returns cached data immediately (zero-latency render), then
 *     triggers a background fetch when data is older than staleTime (SWR).
 *   - On cache miss: fetches and caches, then returns.
 *   - After app restart: MMKV persister restores the cache; stale check runs.
 */
export function useTodosQuery() {
  return useQuery({
    queryKey: todoKeys.lists(),
    queryFn: fetchTodos,
    staleTime: 60_000,   // 1 minute
    gcTime: 5 * 60_000,  // 5 minutes
  });
}

/**
 * Fetch and cache a single todo by ID.
 * Disabled when `id` is falsy to avoid spurious requests during navigation setup.
 */
export function useTodoDetailQuery(id: string) {
  return useQuery({
    queryKey: todoKeys.detail(id),
    queryFn: () => fetchTodo(id),
    staleTime: 60_000,
    gcTime: 5 * 60_000,
    enabled: Boolean(id),
  });
}

// ============================================================================
// src/features/todos/mutations.ts
// ============================================================================
// Write hooks — useMutation wrappers that call api functions and invalidate cache.
// Rule: EVERY mutation invalidates all affected query keys in onSuccess.

import { useMutation, useQueryClient } from '@tanstack/react-query';

/** Create a new todo, then invalidate the list cache. */
export function useCreateTodo() {
  const qc = useQueryClient();

  return useMutation({
    mutationFn: (input: CreateTodoInput) => createTodo(input),
    onSuccess: () => {
      // Force the list to refetch on next mount — the new todo must appear.
      qc.invalidateQueries({ queryKey: todoKeys.lists() });
    },
  });
}

/**
 * Toggle a todo's completed state.
 * Uses an optimistic update for instant visual feedback; rolls back on error.
 */
export function useToggleTodo() {
  const qc = useQueryClient();

  return useMutation({
    mutationFn: (id: string) => toggleTodo(id),
    // Optimistic: flip the completed flag in-cache before the network call.
    onMutate: async (id) => {
      // Cancel any in-flight list queries to avoid overwriting our optimistic update.
      await qc.cancelQueries({ queryKey: todoKeys.lists() });
      const previousList = qc.getQueryData<Todo[]>(todoKeys.lists());

      qc.setQueryData<Todo[]>(todoKeys.lists(), (old) =>
        old?.map((todo) =>
          todo.id === id ? { ...todo, completed: !todo.completed } : todo,
        ) ?? [],
      );

      // Return snapshot for rollback.
      return { previousList };
    },
    onError: (_err, _id, context) => {
      // Roll back the optimistic update on failure.
      if (context?.previousList !== undefined) {
        qc.setQueryData(todoKeys.lists(), context.previousList);
      }
    },
    onSuccess: (_data, id) => {
      // Invalidate both list and detail to ensure server truth after success.
      qc.invalidateQueries({ queryKey: todoKeys.lists() });
      qc.invalidateQueries({ queryKey: todoKeys.detail(id) });
    },
  });
}

/** Delete a todo, then invalidate the list and remove the detail entry. */
export function useDeleteTodo() {
  const qc = useQueryClient();

  return useMutation({
    mutationFn: (id: string) => deleteTodo(id),
    onSuccess: (_data, id) => {
      qc.invalidateQueries({ queryKey: todoKeys.lists() });
      // The detail entry is permanently invalid — remove it rather than refetch.
      qc.removeQueries({ queryKey: todoKeys.detail(id) });
    },
  });
}
