# variants/ — Mobile Platform Variants

The `variants/` directory is the home for **all** mobile platform stacks,
mirroring the layout used by `oma-backend/variants/`. Every supported platform
is represented here, each as a self-contained variant.

| Variant | `stack.yaml` `language` | Files |
|---------|------------------------|-------|
| `swift-ios/` | `swift` | `stack.yaml`, `tech-stack.md`, `snippets.md` |
| `kotlin-android/` | `kotlin` | `stack.yaml`, `tech-stack.md`, `snippets.md` |
| `flutter/` | `flutter` | `stack.yaml`, `tech-stack.md`, `snippets.md` |
| `react-native/` | `react-native` | `stack.yaml`, `tech-stack.md`, `snippets.md` |

## Layout contract

Each `variants/{platform}/` directory contains:

<!-- oma-docs:ignore-start -->
- **`stack.yaml`** — the variant's stack manifest, validated against
  `stack.schema.json`. Declares `language`, `framework`, `state`, `navigation`,
  `http_client`, `local_storage`, `response_cache`, `structure`, `source`, and a
  `verify:` block. It is the seed for `/stack-set`; `oma verify agent mobile`
  reads the project manifest at `../stack/stack.yaml`, not this file.
<!-- oma-docs:ignore-end -->
- **`tech-stack.md`** — human-readable narrative reference (`stack.yaml` wins on
  conflict).
- **`snippets.md`** — numbered code patterns, including the data/repository
  layer and the repository-layer response cache when required.

<!-- oma-docs:ignore-start -->
`stack.schema.json` is the shared schema for all variants and for the generated
`stack/stack.yaml`.
<!-- oma-docs:ignore-end -->

## resources/ is shared meta only

The sibling `resources/` directory holds **only** cross-platform, protocol, and
meta documents shared by every variant: `execution-protocol.md`,
`checklist.md`, `error-playbook.md`, and `tech-stack.md` (the variant index +
cross-platform guidance). Platform-specific stack narrative and snippets belong
in the variant, not in `resources/`.

## Stack selection

<!-- oma-docs:ignore-start -->
Use the project's `../stack/` directory when it exists: `/stack-set` writes it
from the detected codebase, seeded from the matching variant (adapt, never
blind-copy). Otherwise detect the platform from the project manifest
(`Package.swift`, `settings.gradle.kts` + `com.android.application`,
`pubspec.yaml`, `package.json` + `react-native`) and read the matching
`variants/{platform}/` directly.
<!-- oma-docs:ignore-end -->
