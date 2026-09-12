# Mobile Agent - Execution Protocol

## Preparation
Use the task's scope, existing project conventions, and acceptance criteria. Follow `../../_shared/core/execution-policy.md` when it has not already been supplied. Read only references needed by the selected operation; consult lessons or recovery guides for an observed issue. Expand planning depth only when the change requires it.

## Step 1: Analyze
- Read the task requirements carefully
- Identify target platform: check for `Package.swift` (Swift iOS), `pubspec.yaml` (Flutter), or `package.json` + `react-native` dep (React Native)
<!-- oma-docs:ignore-start -->
- **If Swift (Package.swift detected)**: identify which `Features/` modules are affected; check for `Core/Networking/openapi.yaml`
<!-- oma-docs:ignore-end -->
- **If Flutter**: identify screens, widgets, and Riverpod/Bloc providers
- **If React Native**: identify screens, query/mutation hooks (`src/features/*/queries.ts`), Zustand stores, and navigation types
- Explore existing code through the configured `code_intelligence` capability. If it is unavailable or times out, use native search/read for the relevant feature roots (`Sources/Features`, `lib/features`, or `src/features`) and record the limit.
- Determine platform-specific requirements (iOS HIG vs Material Design 3)
- List assumptions; ask if unclear

## Step 2: Plan
- **Swift**: plan using `App/Core/Features/Shared` layers; define the `@Observable` view model state enum; identify which `Operations` + `Components` types the feature needs from the generated `Client`
- **Flutter**: decide on feature structure using Clean Architecture; define entities (domain) and repository interfaces; plan state management (Riverpod providers); identify navigation routes (GoRouter)
- **React Native**: define the query key factory and query/mutation hooks (TanStack Query = repository layer); decide Zustand store shape for client state; plan typed React Navigation routes; decide persistence needs (MMKV persister, keychain for secrets)
- Plan offline-first strategy if required
- Note platform differences (iOS HIG vs Material Design 3)

## Step 3: Implement
- **Honor the task's `test_approach`** (see `../../_shared/core/test-approach.md`): for `tdd` tasks, write and run the focused test first (record the RED failure), make the minimal change (GREEN), then continue
- Create/modify files in this order (Flutter shown; Swift maps to Core → Features → Tests, RN to api → queries/mutations → store → ui → navigation → tests):
  1. Domain: entities and repository interfaces
  2. Data: models, API clients (Dio / axios / generated Client), repository implementations
  3. Presentation: providers/hooks/view models, screens, widgets
  4. Navigation: GoRouter routes / typed React Navigation routes / router-owned NavigationStack
  5. Tests: unit + widget/component tests
- Use the platform's template as reference: `resources/screen-template.dart` (Flutter), `resources/screen-template.swift` (Swift), `resources/screen-template.tsx` (React Native)
- Follow Clean Architecture layers strictly

## Step 4: Verify
- Check applicable items in `resources/checklist.md`
- Use `../../_shared/core/common-checklist.md` only for cross-domain verification
- For `tdd` tasks, append the `TDD_EVIDENCE` block (test command, RED, GREEN) to the result file per `../../_shared/core/test-approach.md`
- Test on both iOS and Android (or emulators)
- Verify 60fps performance (no jank)
- Check dark mode support

## On Error
See `resources/error-playbook.md` for recovery steps.
