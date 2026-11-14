# Mobile Agent - Error Recovery Playbook

When you encounter a failure, find the matching scenario and follow the recovery steps.
Use the relevant recovery steps. If required information or authority is missing, pause the dependent action and continue independent work.

Build policy for every scenario below: commands that compile, bundle, or reinstall native code (`flutter build`, `swift build`, Gradle tasks, `pod install`, app rebuilds) run only when the user explicitly asked for a build. Otherwise apply the fix, use non-build checks, and report the command and the verification limit.

---

## Flutter: Analysis, Build, or Test Failure

**Symptoms**: `flutter analyze` errors, Gradle/Xcode errors from a Flutter build, `flutter test` assertion failures

1. Read the error: file, line, expected vs actual type or value.
2. Type mismatch on a model: compare the model class with the API response; log the raw `response.data` before changing the model.
3. Gradle `Could not resolve`: dependency version conflict in `pubspec.yaml`. `minSdkVersion` / deployment-target errors: fix `android/app/build.gradle` or `ios/Podfile`.
4. Widget test: `pumpAndSettle()` for async work; wrap the widget in `ProviderScope` and override the repository provider instead of mocking Dio or Drift.
5. Generated code out of date (`*.g.dart`, `*.freezed.dart` missing or stale): the fix is `dart run build_runner build`. It is source generation, not an app build: run it when the task changed annotated sources, otherwise report it as the remaining step.
6. **NEVER**: `// ignore:` comments to suppress analysis warnings.

---

## Flutter: State Not Updating / Leaks

**Symptoms**: UI not updating, stale state, provider errors, memory growing over time

1. Provider kind: with `@riverpod` codegen use `Notifier` / `AsyncNotifier` / `StreamNotifier`; the generated provider name drops the `Notifier` suffix (`TodosNotifier` → `todosProvider`).
2. `ref.watch` in `build`, `ref.read` in callbacks; replace state objects instead of mutating them.
3. Controllers (`TextEditingController`, `AnimationController`, `ScrollController`), `StreamSubscription`s, listeners, and `Timer`s are released in `dispose()`; provider-owned work is cancelled in `ref.onDispose`.
4. Platform-only crash: check `Platform.isIOS` / `Platform.isAndroid` guards, per-platform permissions, and plugin platform support; record the platform and plugin version in the result.

---

## React Native: Metro / Build Failure

**Symptoms**: Metro bundler errors, `Unable to resolve module`, pod install failures, Gradle errors

1. **Unable to resolve module**: check the import path and `tsconfig.json`/`babel.config.js` path aliases (`@api`, `@store`, ...) agree; then `npx react-native start --reset-cache`
2. **iOS pod failure**: `cd ios && pod install --repo-update`; New Architecture (0.76+) requires up-to-date pods for Nitro/TurboModules (e.g., react-native-mmkv v4 needs RN 0.76+)
3. **Gradle failure**: check `android/build.gradle` versions match the RN release template; clean with `cd android && ./gradlew clean`
4. **Native module mismatch after upgrade**: rebuild the app binary — JS-only reload cannot load new native modules
5. If persists: note in result with full error; may be an environment issue

---

## React Native: TypeScript / Test Failure

**Symptoms**: `npx tsc --noEmit` errors, jest failures, RNTL matcher errors

1. Read the error: file, line, expected vs actual type
2. Navigation typing: screens must use the typed props from `RootStackParamList` — never `any`
3. Matcher not found (`toBeOnTheScreen` etc.): matchers are built into `@testing-library/react-native` ≥12.4 — remove any `@testing-library/jest-native` residue from jest setup
4. RNTL v14: `render`, `fireEvent`, `renderHook`, and `act` are async — `await` each call, or assertions run before updates flush
5. Query hook tests: wrap in a fresh `QueryClientProvider` per test (`retry: false`) and seed the auth store's `accountId` / `sessionVersion` — account-scoped queries stay disabled without them; async UI needs `await screen.findBy...`, not `getBy...`
6. **NEVER**: `@ts-ignore` / `as any` to silence type errors

---

## React Native: Stale Cache / Offline Issues

**Symptoms**: UI shows old data, mutations don't refresh lists, cache gone after restart

1. Mutation missing invalidation? Every mutation must invalidate the affected query keys (list AND detail) via the shared key factory
2. Cache not surviving restart: `gcTime` must be >= the persister's `maxAge` (default 24h); a short `gcTime` lets GC prune entries from the persisted MMKV snapshot
3. Offline behavior dead: confirm `onlineManager.setEventListener` is wired to NetInfo — RN has no default online detection
4. Optimistic update ghosts: `setQueryData` must return `old` unchanged when the cache entry is absent — never fabricate `[]`
5. Persisted schema drift after model changes: bump the persister `buster` string to drop the old snapshot

---

## Swift: Build Fails — Missing or Invalid OpenAPI Document

**Symptoms**: Build error from the `swift-openapi-generator` plugin such as `error: openapi.yaml not found` or YAML parse error; the build fails before any Swift file is compiled.

<!-- oma-docs:ignore-start -->
1. Confirm the spec exists at `Core/Networking/openapi.yaml` — this is where the build plugin looks.
<!-- oma-docs:ignore-end -->
2. If the file is absent: re-sync it from the backend (`curl -o Sources/Core/Networking/openapi.yaml https://<backend>/api-docs/openapi.yaml` or copy from the CI artifact). The iOS project is a **consumer** of the spec; never edit `openapi.yaml` directly.
3. If the file is present but the error is a parse error: validate the YAML (`python3 -c "import yaml, sys; yaml.safe_load(open(sys.argv[1]))" Sources/Core/Networking/openapi.yaml`); fix the upstream spec and re-sync.
4. After syncing, the next build regenerates `Client`, `Operations`, and `Components` automatically — no manual code-gen step needed.
5. **NEVER**: commit a placeholder or empty `openapi.yaml` just to silence the build; it will produce an incomplete `Client` and cause compile errors downstream.

---

## Swift: Generated `Client`/`Operations` Symbols Not Found

**Symptoms**: Compile errors such as `cannot find type 'Client' in scope` or `use of unresolved identifier 'Operations'`; the generator plugin appears not to have run.

1. Confirm the build plugin is attached in `Package.swift`:
   - The target must list `.plugin(name: "OpenAPIGenerator", package: "swift-openapi-generator")` under its `plugins:` key.
   - The target's dependencies must include `OpenAPIRuntime` and `OpenAPIURLSession`.
2. Confirm `openapi-generator-config.yaml` exists **in the same directory** as `openapi.yaml` (`Core/Networking/`). Without this file the plugin silently skips generation.
3. Check that both config files are inside the target's declared source directory (the directory that contains the `.target` in `Package.swift`). Files outside the source root are invisible to the build plugin.
4. A full regeneration needs a clean build (`swift package clean && swift build`, or Product → Clean Build Folder in Xcode — derived data caching sometimes hides generation failures). Run it only when the user asked for a build; otherwise report it as the remaining step.

---

## Swift: Compile Error for Undocumented Response Case

**Symptoms**: Compile error such as `expression pattern of type 'Operations.CreateTodo.Output.conflict' cannot match values of type '...'`; a response case (e.g., `.conflict`, `.created`, `.unprocessableContent`) referenced in the Swift code does not exist on the generated `Output` enum.

1. The root cause is that the OpenAPI spec does not declare that HTTP status code for the operation. The generator only emits cases for status codes listed in the spec.
2. Do NOT add the case manually to the generated file — it will be overwritten on the next build.
3. Ask the backend team to add the missing status code to the spec (e.g., add `409: description: Conflict` under the operation's `responses:`).
<!-- oma-docs:ignore-start -->
4. Re-sync `Core/Networking/openapi.yaml` once the spec is updated.
<!-- oma-docs:ignore-end -->
5. The next build regenerates the client; the new response case appears and the compile error resolves.
6. Update the Swift `switch` in the service layer to handle the new case explicitly.

---

## Swift: `@Observable` State Not Updating the SwiftUI View

**Symptoms**: Mutating a property on the view model has no visual effect; the view does not re-render even though the value changed.

1. Confirm the view model class is annotated with `@Observable` (Observation framework, **not** `ObservableObject`). Without the macro the view has no tracking infrastructure.
2. Check framework availability against supported OS versions. SwiftUI Observation integration requires iOS 17+. Preserve an older target using its supported observation mechanism or availability-gated implementation; changing minimum support requires a product decision.
3. Check that body reads the observable properties that should trigger an update and that those properties are not @ObservationIgnored. Plain let/var references to @Observable models can be observed. Use @State when the view owns the instance lifetime.
4. Use @Bindable when the child needs bindings such as $viewModel.title. Passing an observable reference as a plain argument does not prevent property observation or direct mutation.
5. Confirm properties are mutated on the **main actor**. Mutations from a background `Task` without `await MainActor.run { … }` (or `@MainActor` on the method) can update state off-main and miss the SwiftUI render pass.
6. When adapting an existing ObservableObject boundary, verify which layer owns and publishes the values read by the view instead of assuming the mechanisms automatically bridge.

---

## Kotlin: Generated Client or Gradle Configuration Failure

**Symptoms**: `Unresolved reference: TodosApi` / `…generated.model`, a `SerializationException` on the first decimal field, a Gradle error about the `org.jetbrains.kotlin.android` plugin

1. **Generated symbols unresolved**: the sources come from `openApiGenerate` into `build/generated/openapi`. Check that `preBuild` depends on `openApiGenerate`, that `:api-client` adds the generated `srcDir`, and that `inputSpec` points at the committed spec. Never commit or hand-edit generated sources.
2. **Constructor parameter mismatch on a generated `*Api`** (`baseUrl`, `httpClientEngine`, `httpClientConfig`): the names follow the pinned generator version — read `build/generated/openapi/.../infrastructure/ApiClient.kt` and adapt the Hilt module, not the generated file.
3. **`SerializationException` for `BigDecimal`**: the shared `Json` codec is missing the contextual `BigDecimal` serializer, or DI and tests use different `Json` instances (see `variants/kotlin-android/snippets.md` §2).
4. **`org.jetbrains.kotlin.android` rejected**: AGP 9 compiles Kotlin itself; remove the plugin from the module and the root build file instead of downgrading AGP.
5. A non-2xx response is not an exception with `expectSuccess = false`: check `HttpResponse.success` / `status` in the repository's unwrapping helper before assuming a transport failure.

---

## Rate Limit / Quota Error (LLM runtime)

**Symptoms**: `429`, `RESOURCE_EXHAUSTED`, `rate limit exceeded` (any vendor runtime: Claude, Codex, etc.)

1. Identify the source. An expected rate-limit response from the application under review is a test result, not an agent-provider quota failure.
2. For provider quota exhaustion, stop affected provider calls and record the unavailable checks; continue independent authorized work when possible.
3. Preserve injected session/task/run IDs and the claim path. Save progress/results under the configured memory base using the task/run-scoped names in `../references/_shared/runtime/memory-protocol.md`.
4. Use a valid claim status (`partial`, `blocked`, or `failed`) with the actual cause and unresolved work per `../references/_shared/runtime/result-contract.md`; do not invent a `quota_exceeded` status.

---

## General Principles

- **After 3 failures**: If same approach fails 3 times, must try a different method
- **Blocked**: when progress depends on a missing fact, credential, device, or authority, save the current state and report `blocked` with what is needed
- **Out of scope**: Backend/frontend issues; only record in result
