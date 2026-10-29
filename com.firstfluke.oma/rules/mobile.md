---
description: Flutter/Dart and cross-platform mobile development standards
globs: "**/*.{dart,swift,kt}"
alwaysApply: false
---

# Mobile Development Standards

Variant-specific stacks live in `.agents/skills/oma-mobile/variants/{flutter,react-native,swift-ios,kotlin-android}/`.
React Native sources (`.ts`/`.tsx`) are not matched by this rule's glob — for RN work, read the
`react-native` variant directly. `.kt` files are Kotlin-native (Compose) when the project is an
Android application (`settings.gradle.kts` + `com.android.application`, no `pubspec.yaml` /
`react-native`); otherwise they are Flutter/RN Android host code.

## Core Rules

1. **Clean Architecture**: domain -> data -> presentation (Swift native: App/Core/Features/Shared; Kotlin native: `app/{ui,data,di}` + `api-client`)
2. **State Management**: the variant's solution — Flutter: Riverpod/Bloc; React Native: Zustand + TanStack Query; Swift: `@MainActor @Observable`; Kotlin: `@HiltViewModel` + `StateFlow`. No raw setState/ad-hoc state for complex logic
3. **Design Guidelines**: Material Design 3 (Android) + iOS HIG (iOS)
4. **Resource Cleanup**: dispose controllers / cancel structured tasks; Swift: `.task {}` auto-cancel, never `deinit`; Kotlin: `viewModelScope`, never `GlobalScope`
5. **Networking**: transport client with interceptors (Flutter: Dio; RN: axios behind TanStack Query hooks; Swift: swift-openapi-generator Client; Kotlin: openapi-generator `jvm-ktor` `*Api` over Ktor with an injected OkHttp engine) + repository-layer response cache when required; handle offline gracefully
6. **Secrets**: secure storage only (flutter_secure_storage / Keychain / react-native-keychain / Android Keystore-backed storage) — never plain prefs or MMKV
7. **Performance**: 60fps target; test on both platforms
8. **E2E Testing**: Maestro (Flutter/RN/Kotlin) or XCUITest (Swift native) for critical user flows
