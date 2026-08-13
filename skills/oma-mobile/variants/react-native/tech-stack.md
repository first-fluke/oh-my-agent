# Mobile Agent - Tech Stack Reference (React Native)

## Framework: React Native + TypeScript

- **Language**: TypeScript (strict mode; `"strict": true` in `tsconfig.json`)
- **UI Framework**: React Native 0.86 with React 19 (core components); Expo is the recommended toolchain for new projects (managed or bare workflow)
- **Architecture**: New Architecture (Fabric + TurboModules) — default since RN 0.76 and the only mode from 0.82 onward
- **Minimum OS**: iOS 16.0 / Android API 26 (Oreo)
- **Tooling**: Metro bundler, Expo CLI or React Native CLI, React Native DevTools for dev debugging

React Native renders to native UI components — not a WebView or canvas. Expo adds a curated native module layer, OTA updates, and a first-class build service (EAS Build), which removes native toolchain friction for most projects. Bare workflow gives full native access when Expo modules do not cover a capability.

## State Management: Zustand

Client/UI state is managed with **Zustand**. Zustand is a minimal, hook-first store with no boilerplate and no context wrapping required. Redux Toolkit (RTK) is the heavier alternative for teams that need time-travel debugging, a stricter action/reducer discipline, or RTK Query integration.

| Concern | Tool |
|---------|------|
| Client / UI state | Zustand |
| Server state + caching | TanStack Query (see Response Cache section) |
| Heavy team state / RTK Query | Redux Toolkit (alternative) |

Zustand stores live in `src/store/`. Keep stores small and feature-scoped — one store per feature domain is preferred over a single monolithic store.

## HTTP Transport: Axios

<!-- oma-docs:ignore-start -->
Network calls are made through a **singleton Axios instance** configured in `src/api/client.ts`. The instance wires request interceptors for bearer-token injection and response interceptors for 401 handling / token refresh. Retry logic (exponential back-off) is attached via `axios-retry`.
<!-- oma-docs:ignore-end -->

**Transport vs. server-state distinction.** Axios is a transport concern only — it sends and receives bytes. It knows nothing about caching, stale data, or background revalidation. TanStack Query (below) owns those concerns. React components never import the Axios instance directly; they consume typed hooks built on TanStack Query.

```
axios instance (transport)
  └── used by: src/api/*.ts  (typed data functions)
        └── consumed by: TanStack Query hooks (useQuery / useMutation)
              └── consumed by: Screens / components
```

See `snippets.md §3` for the canonical Axios instance and auth interceptor.

## Response Cache: TanStack Query (@tanstack/react-query)

**Read-through caching at the data-fetching layer is mandatory.** TanStack Query owns the repository-layer cache: it caches **decoded JavaScript objects** (not raw response bytes), provides stale-while-revalidate out of the box, and centralizes invalidation so the data-fetching layer is the single source of caching truth.

```
Screen / Component
  |  renders from
  v
useQuery / useMutation hook    (src/features/<feature>/queries.ts / mutations.ts)
  |  on miss / revalidate
  +──────────────────────►  QueryClient in-memory cache  (decoded JS objects)
  |                          + MMKV persister (survives restarts)
  |  on cache miss
  v
src/api/<resource>.ts          (typed axios functions — transport only)
  |  HTTP via axios instance
  v
Backend REST API
```

**Mandatory rules:**

1. Every read is wrapped in a `useQuery` call with **explicit `staleTime` and `gcTime`** — no implicit infinite TTL. `staleTime` controls when a cached entry is considered stale and triggers a background revalidation; `gcTime` (formerly `cacheTime`) controls when an unused entry is garbage-collected from memory. For offline-first, `gcTime` **must stay `>=` the persister's `maxAge`** (default 24h) or the persisted cache is discarded before it can be restored on the next launch.
2. Query keys follow the pattern `[operation, ...params]` — for example `['todos', 'list']` or `['todos', 'detail', id]`. **Never key on URLs** (they conflate transport with cache identity and break under proxy/versioning changes).
3. Every mutation (`useMutation`) **must call `queryClient.invalidateQueries({ queryKey })`** for all affected query keys on `onSuccess`. Optimistic updates are optional but, when used, must pair a `rollback` in `onError`.
4. Offline persistence: `@tanstack/react-query-persist-client` (the `PersistQueryClientProvider`) + `@tanstack/query-sync-storage-persister` driving a custom MMKV persister (`react-native-mmkv`) so the query cache survives app restarts. Wire `onlineManager` to `@react-native-community/netinfo` so paused mutations resume and stale queries refetch when connectivity returns.
<!-- oma-docs:ignore-start -->
5. The `QueryClient` is created once at app startup (`src/api/queryClient.ts`) and provided via `<QueryClientProvider>` in the root component. Never create per-component `QueryClient` instances.
<!-- oma-docs:ignore-end -->
6. Network calls are isolated in `src/api/` typed functions (axios). **Screens and components never call axios directly** — this is the repository seam. Components consume hooks; hooks consume the api layer.
7. The query cache is for **transient, server-owned data**. Durable non-secret user-owned data belongs in MMKV; secrets (the access token) live only in memory in a Zustand `authStore` hydrated from `react-native-keychain` — never in plain-text MMKV. TanStack Query is never a system of record.

See `snippets.md §2` for QueryClient + MMKV persister setup, `snippets.md §5` for `queries.ts` / `mutations.ts`, and `snippets.md §9` for the cache rules recap.

## Local Storage

| Layer | Library | Purpose |
|-------|---------|---------|
| Fast KV (non-secret) | `react-native-mmkv` | User preferences, offline flags, TanStack Query persistence |
| Secrets / tokens | `expo-secure-store` or `react-native-keychain` | Auth tokens, API keys |
| Query cache persistence | MMKV persister (`@tanstack/query-sync-storage-persister` + `@tanstack/react-query-persist-client`) | Offline-first server-state survival across restarts |

**MMKV** is a C++-backed key-value store (the same one WeChat uses) that is 30× faster than `AsyncStorage` on both platforms. Use it for all non-secret durable state. Use `expo-secure-store` (Expo projects) or `react-native-keychain` (bare RN) for anything that must live in the platform secure enclave (iOS Keychain / Android Keystore).

Never store secrets in MMKV — it stores plain text unless an `encryptionKey` is passed. The access token lives in an in-memory Zustand `authStore` (`src/store/authStore.ts`) that is hydrated from the Keychain at app start; the axios request interceptor reads it synchronously via `useAuthStore.getState().accessToken`, and a 401 clears both the Keychain and the store. See `snippets.md §10`.

## Testing

| Layer | Framework |
|-------|-----------|
| Unit (domain logic, stores) | Jest |
| Component / screen | `@testing-library/react-native` |
| E2E / critical flows | Maestro |

Components under test are wrapped in a `QueryClientProvider` with a fresh `QueryClient` (no retries, zero stale time) so tests do not make real network calls. The `src/api/` module is mocked at the Jest module boundary — tests assert on hook behavior, not axios internals.

Run tests with `npx jest --ci`. Maestro flow files live in `e2e/` and exercise critical user journeys (login, create-todo, toggle, delete) via `maestro test e2e/`.

## Project Layout

Feature-sliced structure with a clean api / feature / shared separation:

```
src/
  api/
    client.ts               # Axios singleton instance + interceptors
    queryClient.ts          # QueryClient creation + MMKV persister setup
    todos.ts                # Typed axios functions for /todos resource
    auth.ts                 # Typed axios functions for /auth resource
  features/
    todos/
      model/
        todo.ts             # TypeScript types / interfaces for the domain
      ui/
        TodosScreen.tsx     # Screen consuming useQuery / useMutation hooks
        TodoItem.tsx        # Presentational component
      queries.ts            # useTodosQuery, useTodoDetailQuery (useQuery wrappers)
      mutations.ts          # useCreateTodo, useToggleTodo, useDeleteTodo (useMutation)
    auth/
      model/
        auth.ts
      ui/
        LoginScreen.tsx
      queries.ts
      mutations.ts
  navigation/
    RootNavigator.tsx       # Stack + Tab navigator composition
    types.ts                # Typed RootStackParamList, TabParamList
  shared/
    components/
      LoadingView.tsx
      ErrorView.tsx
      EmptyStateView.tsx
    hooks/
      useNetworkStatus.ts   # NetInfo wrapper for offline detection
    utils/
      storage.ts            # MMKV instance export
  store/
    authStore.ts            # Zustand store for auth session (token, user)
    uiStore.ts              # Zustand store for global UI flags
  App.tsx                   # Root component — providers, NavigationContainer
e2e/
  todos.yaml                # Maestro E2E flow for todos feature
  auth.yaml                 # Maestro E2E flow for login
```

## Architecture Pattern

```
Screen / Component  (src/features/<feature>/ui/)
  |  calls (React hook)
  v
useQuery / useMutation hook  (src/features/<feature>/queries.ts, mutations.ts)
  |  reads from in-memory + MMKV-persisted cache (stale-while-revalidate)
  +──────────────────────────────────►  QueryClient cache  (decoded JS objects)
  |  on cache miss or revalidation
  v
src/api/<resource>.ts  (typed axios functions — transport only)
  |  HTTP via singleton axios instance with auth interceptor
  v
Backend REST API
```

Each `features/<name>/` folder is a vertical slice owning its types, UI components, and data hooks. `shared/` contains stateless, reusable components and utilities with no feature knowledge. The `api/` layer is the only place that touches axios and the network.

## Navigation: React Navigation v7 (native-stack)

Use **`@react-navigation/native-stack`** (backed by `react-native-screens` native primitives) for push navigation — it is measurably faster than the JS-animated `@react-navigation/stack`. Tab navigation uses `@react-navigation/bottom-tabs`.

<!-- oma-docs:ignore-start -->
Route param lists are **fully typed** in `src/navigation/types.ts` with a `RootStackParamList`. Screen components receive `NativeStackScreenProps<RootStackParamList, 'ScreenName'>` as props, giving compile-time checked navigation calls.
<!-- oma-docs:ignore-end -->

```typescript
// src/navigation/types.ts
export type RootStackParamList = {
  TodoList: undefined;
  TodoDetail: { id: string };
  Login: undefined;
};
```

<!-- oma-docs:ignore-start -->
Pass `<NavigationContainer>` and navigator composition to `src/navigation/RootNavigator.tsx`; never embed navigation logic inside screen components.
<!-- oma-docs:ignore-end -->

See `snippets.md §7` for the typed navigator setup and `snippets.md §6` for a screen consuming typed route params.
