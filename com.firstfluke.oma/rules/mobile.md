---
description: Flutter/Dart and cross-platform mobile development standards
globs: "**/*.{dart,swift,kt}"
alwaysApply: false
---

# Mobile Development Standards

Variant-specific stacks live in `.agents/skills/oma-mobile/variants/{flutter,react-native,swift-ios}/`.
React Native sources (`.ts`/`.tsx`) are not matched by this rule's glob — for RN work, read the
`react-native` variant directly. Kotlin-native (Compose) is not a supported variant; `.kt` files
here are Flutter/RN Android host code only.

## Core Rules

1. **Clean Architecture**: domain -> data -> presentation (Swift native: App/Core/Features/Shared)
2. **State Management**: the variant's solution — Flutter: Riverpod/Bloc; React Native: Zustand + TanStack Query; Swift: `@MainActor @Observable`. No raw setState/ad-hoc state for complex logic
3. **Design Guidelines**: Material Design 3 (Android) + iOS HIG (iOS)
4. **Resource Cleanup**: dispose controllers / cancel structured tasks; Swift: `.task {}` auto-cancel, never `deinit`
5. **Networking**: transport client with interceptors (Flutter: Dio; RN: axios behind TanStack Query hooks; Swift: swift-openapi-generator Client) + mandatory repository-layer response cache; handle offline gracefully
6. **Secrets**: secure storage only (flutter_secure_storage / Keychain / react-native-keychain) — never plain prefs or MMKV
7. **Performance**: 60fps target; test on both platforms
8. **E2E Testing**: Maestro (Flutter/RN) or XCUITest (Swift native) for critical user flows
