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
 *     restored, silently defeating offline-first. Query keys = [account/tenant, operation, ...params],
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
// `createMMKV(...)` anywhere else. MMKV is plain text unless an encryptionKey is
// passed, so it holds NON-SECRET data only (prefs, offline flags, query cache).

import { createMMKV } from 'react-native-mmkv';

/** General-purpose non-secret KV store. */
export const storage = createMMKV({ id: 'app-storage' });

/** Separate instance namespaced for the query cache to avoid key collisions. */
export const queryStorage = createMMKV({ id: 'query-cache' });

// ============================================================================
// src/store/authStore.ts
// ============================================================================
// Auth session store. The access token lives ONLY in memory here and in the
// platform secure enclave via react-native-keychain — never in plain MMKV.

import { create } from 'zustand';
import * as Keychain from 'react-native-keychain';
import { resetAccountQueryCache } from '@api/queryClient';

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

// ============================================================================
// src/api/client.ts
// ============================================================================

import axios, {
  type AxiosInstance,
  type AxiosRequestConfig,
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

// --- Retry: 3 attempts, exponential back-off, idempotent methods only ---
axiosRetry(apiClient, {
  retries: 3,
  retryCondition: (error) =>
    ['get', 'head', 'options', 'put', 'delete'].includes(error.config?.method?.toLowerCase() ?? '') &&
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
let cacheSessionVersion = 0;
export const createAccountPersister = (accountId: string) => {
  const version = cacheSessionVersion;
  return createSyncStoragePersister({
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

/**
 * One QueryClient per authenticated session; provided via
 * <PersistQueryClientProvider> in App.tsx. Never instantiate per-component.
 *
 * gcTime MUST stay >= the persister's maxAge (24h, set in App.tsx) or an
 * unused entry is garbage-collected from memory before the persisted copy can
 * be restored — which silently breaks "survives app restart". Override
 * staleTime per-query for resources with different freshness requirements.
 */
const createQueryClient = () => new QueryClient({
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
export let queryClient = createQueryClient();
export async function resetAccountQueryCache(accountId: string | null): Promise<void> {
  cacheSessionVersion += 1; // block delayed disk writes from the retired session
  await queryClient.cancelQueries();
  queryClient.clear();
  if (accountId) await createAccountPersister(accountId).removeClient();
  queryClient = createQueryClient(); // old callbacks retain an unmounted client
}


// ============================================================================
// src/api/todos.ts
// ============================================================================
// Typed axios functions for the /todos REST resource.
// Pure data functions: accept inputs, call apiClient, return decoded objects.
// They are the transport seam — no React, no hooks, no cache knowledge.

import { apiClient, type SessionRequestConfig } from './client';

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
export async function fetchTodos(accountId: string | null, sessionVersion: number, signal?: AbortSignal): Promise<Todo[]> {
  const config: SessionRequestConfig = { _accountId: accountId, _sessionVersion: sessionVersion, signal };
  const { data } = await apiClient.get<Todo[]>('/todos', config);
  return data;
}

/**
 * Fetch a single todo by ID.
 * Called by: useTodoDetailQuery (src/features/todos/queries.ts)
 */
export async function fetchTodo(id: string, accountId: string | null, sessionVersion: number, signal?: AbortSignal): Promise<Todo> {
  const config: SessionRequestConfig = { _accountId: accountId, _sessionVersion: sessionVersion, signal };
  const { data } = await apiClient.get<Todo>(`/todos/${id}`, config);
  return data;
}

/**
 * Create a new todo with the given title.
 * Called by: useCreateTodo (src/features/todos/mutations.ts)
 * Cache effect: mutations.ts invalidates todoKeys.lists(accountId) on success.
 */
export async function createTodo(input: CreateTodoInput, accountId: string | null, sessionVersion: number): Promise<Todo> {
  const config: SessionRequestConfig = { _accountId: accountId, _sessionVersion: sessionVersion };
  const { data } = await apiClient.post<Todo>('/todos', input, config);
  return data;
}

/**
 * Toggle the completed flag on a todo.
 * Called by: useToggleTodo (src/features/todos/mutations.ts)
 * Cache effect: mutations.ts optimistically patches todoKeys.lists(accountId) + todoKeys.detail(accountId, id).
 */
export async function toggleTodo(id: string, accountId: string | null, sessionVersion: number): Promise<Todo> {
  const config: SessionRequestConfig = { _accountId: accountId, _sessionVersion: sessionVersion };
  const { data } = await apiClient.patch<Todo>(`/todos/${id}/toggle`, undefined, config);
  return data;
}

/**
 * Permanently delete a todo.
 * Called by: useDeleteTodo (src/features/todos/mutations.ts)
 * Cache effect: mutations.ts invalidates todoKeys.lists(accountId) and removes todoKeys.detail(accountId, id).
 */
export async function deleteTodo(id: string, accountId: string | null, sessionVersion: number): Promise<void> {
  const config: SessionRequestConfig = { _accountId: accountId, _sessionVersion: sessionVersion };
  await apiClient.delete(`/todos/${id}`, config);
}

// ============================================================================
// src/features/todos/queries.ts
// ============================================================================
// Read hooks — server-state cache layer built on TanStack Query.
// These hooks are what screens import. They never expose axios internals.

import { useQuery } from '@tanstack/react-query';
import { useAuthStore } from '@store/authStore';

/**
 * Centralised query key factory.
 * Shape: [account/tenant, operation, ...params] — never a URL.
 * Shared with mutations.ts so invalidation references the exact same keys.
 */
export const todoKeys = {
  all: (accountId: string | null) => ['account', accountId, 'todos'] as const,
  lists: (accountId: string | null) => [...todoKeys.all(accountId), 'list'] as const,
  detail: (accountId: string | null, id: string) => [...todoKeys.all(accountId), 'detail', id] as const,
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
  const accountId = useAuthStore((state) => state.accountId);
  const sessionVersion = useAuthStore((state) => state.sessionVersion);
  return useQuery({
    queryKey: todoKeys.lists(accountId),
    queryFn: ({ signal }) => fetchTodos(accountId, sessionVersion, signal),
    enabled: Boolean(accountId),
    staleTime: 60_000,            // 1 minute
    gcTime: 1000 * 60 * 60 * 24,  // 24h — must stay >= the persister maxAge
  });
}

/**
 * Fetch and cache a single todo by ID.
 * Disabled when `id` is falsy to avoid spurious requests during navigation setup.
 */
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

// ============================================================================
// src/features/todos/mutations.ts
// ============================================================================
// Write hooks — useMutation wrappers that call api functions and invalidate cache.
// Rule: EVERY mutation invalidates all affected query keys once it settles.

import { useMutation, useQueryClient } from '@tanstack/react-query';
import { useAuthStore } from '@store/authStore';

// A paused/optimistic mutation from an old provider must not use a new login.
function runAccountMutation<T>(accountId: string | null, version: number, operation: (version: number) => Promise<T>): Promise<T> {
  const current = useAuthStore.getState();
  if (!accountId || current.accountId !== accountId || current.sessionVersion !== version) {
    return Promise.reject(new Error('Mutation belongs to a retired session'));
  }
  return operation(version);
}

/** Create a new todo, then invalidate the list cache. */
export function useCreateTodo() {
  const accountId = useAuthStore((state) => state.accountId);
  const sessionVersion = useAuthStore((state) => state.sessionVersion);
  const qc = useQueryClient();

  return useMutation({
    mutationFn: (input: CreateTodoInput) => runAccountMutation(accountId, sessionVersion, (version) => createTodo(input, accountId, version)),
    onSuccess: () => {
      // Force the list to refetch on next mount — the new todo must appear.
      qc.invalidateQueries({ queryKey: todoKeys.lists(accountId) });
    },
  });
}

/**
 * Toggle a todo's completed state.
 * Uses an optimistic update for instant visual feedback; rolls back on error.
 */
export function useToggleTodo() {
  const accountId = useAuthStore((state) => state.accountId);
  const sessionVersion = useAuthStore((state) => state.sessionVersion);
  const qc = useQueryClient();

  return useMutation({
    mutationFn: (id: string) => runAccountMutation(accountId, sessionVersion, (version) => toggleTodo(id, accountId, version)),
    // Optimistic: flip the completed flag in-cache before the network call.
    onMutate: async (id) => {
      // Cancel in-flight queries for both keys so they can't clobber our patch.
      await qc.cancelQueries({ queryKey: todoKeys.lists(accountId) });
      await qc.cancelQueries({ queryKey: todoKeys.detail(accountId, id) });

      const previousList = qc.getQueryData<Todo[]>(todoKeys.lists(accountId));
      const previousDetail = qc.getQueryData<Todo>(todoKeys.detail(accountId, id));

      // Patch each cache entry only when it exists — returning `old` untouched
      // when undefined avoids materialising a fake empty list.
      qc.setQueryData<Todo[] | undefined>(todoKeys.lists(accountId), (old) =>
        old ? old.map((t) => (t.id === id ? { ...t, completed: !t.completed } : t)) : old,
      );
      qc.setQueryData<Todo | undefined>(todoKeys.detail(accountId, id), (old) =>
        old ? { ...old, completed: !old.completed } : old,
      );

      // Return snapshots for rollback.
      return { previousList, previousDetail };
    },
    onError: (_err, id, context) => {
      // Roll back both keys on failure.
      if (context?.previousList !== undefined) {
        qc.setQueryData(todoKeys.lists(accountId), context.previousList);
      }
      if (context?.previousDetail !== undefined) {
        qc.setQueryData(todoKeys.detail(accountId, id), context.previousDetail);
      }
    },
    onSettled: (_data, _err, id) => {
      // Reconcile with server truth for both keys once the mutation settles.
      qc.invalidateQueries({ queryKey: todoKeys.lists(accountId) });
      qc.invalidateQueries({ queryKey: todoKeys.detail(accountId, id) });
    },
  });
}

/** Delete a todo, then invalidate the list and remove the detail entry. */
export function useDeleteTodo() {
  const accountId = useAuthStore((state) => state.accountId);
  const sessionVersion = useAuthStore((state) => state.sessionVersion);
  const qc = useQueryClient();

  return useMutation({
    mutationFn: (id: string) => runAccountMutation(accountId, sessionVersion, (version) => deleteTodo(id, accountId, version)),
    onSuccess: (_data, id) => {
      qc.invalidateQueries({ queryKey: todoKeys.lists(accountId) });
      // The detail entry is permanently invalid — remove it rather than refetch.
      qc.removeQueries({ queryKey: todoKeys.detail(accountId, id) });
    },
  });
}
