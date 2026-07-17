# Mobile Agent - Execution Protocol

## Step 0: Prepare
1. **Assess difficulty**: see `../../_shared/core/difficulty-guide.md`
   - **Simple**: Skip to Step 3 | **Medium**: All 4 steps | **Complex**: All steps + checkpoints
2. **Check lessons**: read your domain section in `../../_shared/core/lessons-learned.md`
3. **Clarify requirements**: follow `../../_shared/core/clarification-protocol.md`
   - Check **Uncertainty Triggers**: business logic, security/auth, existing code conflicts?
   - Determine level: LOW → proceed | MEDIUM → present options | HIGH → ask immediately
4. **Budget context**: follow `../../_shared/core/context-budget.md` (read symbols, not whole files)

**Intelligent Escalation**: When uncertain, escalate early. Don't blindly proceed.

Follow these steps in order (adjust depth by difficulty).

## Step 1: Analyze
- Read the task requirements carefully
- Identify target platform: check for `Package.swift` (Swift iOS), `pubspec.yaml` (Flutter), or `package.json` + `react-native` dep (React Native)
<!-- oma-docs:ignore-start -->
- **If Swift (Package.swift detected)**: identify which `Features/` modules are affected; check for `Core/Networking/openapi.yaml`
<!-- oma-docs:ignore-end -->
- **If Flutter**: identify screens, widgets, and Riverpod/Bloc providers
- **If React Native**: identify screens, query/mutation hooks (`src/features/*/queries.ts`), Zustand stores, and navigation types
- Check existing code with Serena: `get_symbols_overview("Sources/Features")` (Swift), `get_symbols_overview("lib/features")` (Flutter), or `get_symbols_overview("src/features")` (React Native)
- Determine platform-specific requirements (iOS HIG vs Material Design 3)
- List assumptions; ask if unclear

## Step 2: Plan
- **Swift**: plan using `App/Core/Features/Shared` layers; define the `@Observable` view model state enum; identify which `Operations` + `Components` types the feature needs from the generated `Client`
- **Flutter**: decide on feature structure using Clean Architecture; define entities (domain) and repository interfaces; plan state management (Riverpod providers); identify navigation routes (GoRouter)
- **React Native**: define the query key factory and query/mutation hooks (TanStack Query = repository layer); decide Zustand store shape for client state; plan typed React Navigation routes; decide persistence needs (MMKV persister, keychain for secrets)
- Plan offline-first strategy if required
- Note platform differences (iOS HIG vs Material Design 3)

## Step 3: Implement
- Create/modify files in this order (Flutter shown; Swift maps to Core → Features → Tests, RN to api → queries/mutations → store → ui → navigation → tests):
  1. Domain: entities and repository interfaces
  2. Data: models, API clients (Dio / axios / generated Client), repository implementations
  3. Presentation: providers/hooks/view models, screens, widgets
  4. Navigation: GoRouter routes / typed React Navigation routes / router-owned NavigationStack
  5. Tests: unit + widget/component tests
- Use the platform's template as reference: `resources/screen-template.dart` (Flutter), `resources/screen-template.swift` (Swift), `resources/screen-template.tsx` (React Native)
- Follow Clean Architecture layers strictly

## Step 4: Verify
- Run `resources/checklist.md` items
- Run `../../_shared/core/common-checklist.md` items
- Test on both iOS and Android (or emulators)
- Verify 60fps performance (no jank)
- Check dark mode support

## On Error
See `resources/error-playbook.md` for recovery steps.
