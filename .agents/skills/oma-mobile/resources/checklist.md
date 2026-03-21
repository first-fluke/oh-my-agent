# Mobile Agent - Self-Verification Checklist

Run through every item before submitting your work.

## Architecture
- [ ] Clean Architecture layers: domain -> data -> presentation
- [ ] Entities are pure Dart (no framework dependencies)
- [ ] Repository pattern with interface + implementation
- [ ] Riverpod/Bloc for state management (no setState in complex widgets)

## Platform
- [ ] Material Design 3 for Android
- [ ] iOS Human Interface Guidelines followed
- [ ] Platform-specific code guarded with `Platform.isIOS`/`Platform.isAndroid`
- [ ] Tested on both iOS and Android (emulator or device)
- [ ] Dark mode supported

## Performance
- [ ] 60fps scrolling (no jank)
- [ ] Controllers disposed in `dispose()` method
- [ ] No memory leaks (listeners, subscriptions cleaned up)
- [ ] Images cached and sized appropriately
- [ ] Cold start < 2s

## API Integration
- [ ] Dio with interceptors (auth, error handling)
- [ ] Loading states shown during API calls
- [ ] Error states with retry action
- [ ] Offline handling (graceful degradation or offline-first)

## Testing
- [ ] Unit tests for domain logic and providers
- [ ] Widget tests for key screens
- [ ] Edge cases: empty lists, error states, offline mode
- [ ] Tests pass on both platforms
