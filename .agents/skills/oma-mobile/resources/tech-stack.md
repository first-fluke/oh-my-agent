# Mobile Agent - Tech Stack Reference

## Flutter (Recommended)
- **Framework**: Flutter 3.19+
- **Language**: Dart 3.3+
- **State**: Riverpod 2.4+, Bloc, Provider
- **Navigation**: GoRouter 13+
- **API Client**: Dio
- **Local Storage**: Drift, Hive
- **Testing**: flutter_test, mockito

## React Native (Alternative)
- **Framework**: React Native 0.73+
- **Language**: TypeScript
- **State**: Redux Toolkit, Zustand
- **Navigation**: React Navigation 6+
- **Testing**: Jest, React Native Testing Library

## Project Structure (Flutter)

```
lib/
  main.dart
  core/              # Theme, router, utils
  features/
    [feature]/
      data/          # Models, repositories
      domain/        # Entities, use cases
      presentation/  # Screens, widgets, providers
  shared/            # Shared widgets
```

## Architecture Pattern

Clean Architecture with Riverpod:
1. Entity (Domain) - Pure business objects
2. Repository Interface (Domain) - Abstract data access
3. Repository Implementation (Data) - Dio, database
4. Providers (Presentation) - State management
5. Screens/Widgets (Presentation) - UI

## Platform Guidelines
- Material Design 3 for Android
- iOS Human Interface Guidelines for iOS
- Use `Platform.isIOS` for platform-specific code
