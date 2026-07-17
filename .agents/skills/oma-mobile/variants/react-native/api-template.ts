/**
 * API Data Layer Template for Mobile Agent (React Native)
 *
 * This file is the complete todos data layer — the ONLY place that touches
 * the axios transport for the /todos resource. Screens and components never
 * import from this file directly; they consume the TanStack Query hooks in
 * src/features/todos/queries.ts and mutations.ts, which call these functions.
 *
 * Layout (split into separate files in production):
 *   src/shared/utils/
 *     storage.ts         ← MMKV singletons (non-secret KV + query cache)
 *   src/store/
 *     authStore.ts       ← Zustand auth store (in-memory token, Keychain-backed)
 *   src/api/
 *     client.ts          ← singleton axios instance + interceptors (auth, refresh, retry)
 *     queryClient.ts     ← QueryClient + MMKV persister + onlineManager (offline-first)
 *     todos.ts           ← THIS FILE: typed axios functions for /todos
 *   src/features/todos/
 *     queries.ts         ← useQuery hooks (useTodosQuery, useTodoDetailQuery)
 *     mutations.ts       ← useMutation hooks (useCreateTodo, useToggleTodo, useDeleteTodo)
 *
 * Caching contract (TanStack Query owns the repository-layer cache):
 *   - Reads: useQuery caches DECODED JS objects (not AxiosResponse bytes).
 *     staleTime / gcTime are explicit — no implicit infinite TTL. gcTime must be
 *     >= the persister's maxAge or the persisted cache is GC'd before it can be
 *     restored, silently defeating offline-first. Query keys = [operation, ...params],
 *     never URLs. Stale-while-revalidate: the cache entry renders immediately; a
 *     background fetch updates it once the entry is older than staleTime.
 *   - Writes: useMutation calls queryClient.invalidateQueries() for all affected
 *     keys so the next read repopulates from the server.
 *   - Offline persistence: @tanstack/query-sync-storage-persister +
 *     @tanstack/react-query-persist-client + an MMKV persister (react-native-mmkv)
 *     serialise the cache to disk so it survives app restarts.
 *   - Secrets: the access token lives in an in-memory Zustand store hydrated from
 *     react-native-keychain — NEVER in plain-text MMKV. Durable non-secret user
 *     data belongs in MMKV. TanStack Query is never a system of record.
 */

// ============================================================================
// src/shared/utils/storage.ts
// ============================================================================
// Canonical MMKV singletons. Every module imports from here — never call
// `new MMKV(...)` anywhere else. MMKV is plain text unless an encryptionKey is
// passed, so it holds NON-SECRET data only (prefs, offline flags, query cache).

import { MMKV } from 'react-native-mmkv';

/** General-purpose non-secret KV store. */
export const storage = new MMKV({ id: 'app-storage' });

/** Separate instance namespaced for the query cache to avoid key collisions. */
export const queryStorage = new MMKV({ id: 'query-cache' });

// ============================================================================
// src/store/authStore.ts
// ============================================================================
// Auth session store. The access token lives ONLY in memory here and in the
// platform secure enclave via react-native-keychain — never in plain MMKV.

import { create } from 'zustand';
import * as Keychain from 'react-native-keychain';

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

/** Restore the token from the Keychain into the store at app start (call from App.tsx). */
export async function hydrateAuth(): Promise<void> {
  const creds = await Keychain.getGenericPassword({ service: KEYCHAIN_SERVICE });
  if (creds) {
    useAuthStore.setState({ accessToken: creds.password, isAuthenticated: true });
  }
}

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

// --- Request interceptor: inject bearer token ---
// Read synchronously from the in-memory auth store (hydrated from the Keychain
// at app start). Secrets NEVER live in plain-text MMKV.
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

import { QueryClient, onlineManager } from '@tanstack/react-query';
import { createSyncStoragePersister } from '@tanstack/query-sync-storage-persister';
import NetInfo from '@react-native-community/netinfo';

// Drive TanStack Query's online state from the real network status so paused
// mutations resume and stale queries refetch the moment connectivity returns.
onlineManager.setEventListener((setOnline) =>
  NetInfo.addEventListener((state) => setOnline(!!state.isConnected)),
);

/**
 * MMKV-backed persister for TanStack Query.
 * Serialises the entire query cache to disk under a single key so the cache
 * survives app restarts — this is the offline-first persistence tier.
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
 * gcTime MUST stay >= the persister's maxAge (24h, set in App.tsx) or an
 * unused entry is garbage-collected from memory before the persisted copy can
 * be restored — which silently breaks "survives app restart". Override
 * staleTime per-query for resources with different freshness requirements.
 */
export const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      staleTime: 60_000,            // 1 minute — triggers background revalidation
      gcTime: 1000 * 60 * 60 * 24,  // 24h — must stay >= the persister maxAge
      retry: 3,
      refetchOnWindowFocus: false,  // Irrelevant on mobile; disabling avoids surprises
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
 * Cache effect: mutations.ts optimistically patches todoKeys.lists() + todoKeys.detail(id).
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
    staleTime: 60_000,            // 1 minute
    gcTime: 1000 * 60 * 60 * 24,  // 24h — must stay >= the persister maxAge
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
    gcTime: 1000 * 60 * 60 * 24,  // 24h — see useTodosQuery
    enabled: Boolean(id),
  });
}

// ============================================================================
// src/features/todos/mutations.ts
// ============================================================================
// Write hooks — useMutation wrappers that call api functions and invalidate cache.
// Rule: EVERY mutation invalidates all affected query keys once it settles.

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
      // Cancel in-flight queries for both keys so they can't clobber our patch.
      await qc.cancelQueries({ queryKey: todoKeys.lists() });
      await qc.cancelQueries({ queryKey: todoKeys.detail(id) });

      const previousList = qc.getQueryData<Todo[]>(todoKeys.lists());
      const previousDetail = qc.getQueryData<Todo>(todoKeys.detail(id));

      // Patch each cache entry only when it exists — returning `old` untouched
      // when undefined avoids materialising a fake empty list.
      qc.setQueryData<Todo[] | undefined>(todoKeys.lists(), (old) =>
        old ? old.map((t) => (t.id === id ? { ...t, completed: !t.completed } : t)) : old,
      );
      qc.setQueryData<Todo | undefined>(todoKeys.detail(id), (old) =>
        old ? { ...old, completed: !old.completed } : old,
      );

      // Return snapshots for rollback.
      return { previousList, previousDetail };
    },
    onError: (_err, id, context) => {
      // Roll back both keys on failure.
      if (context?.previousList !== undefined) {
        qc.setQueryData(todoKeys.lists(), context.previousList);
      }
      if (context?.previousDetail !== undefined) {
        qc.setQueryData(todoKeys.detail(id), context.previousDetail);
      }
    },
    onSettled: (_data, _err, id) => {
      // Reconcile with server truth for both keys once the mutation settles.
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
