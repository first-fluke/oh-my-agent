# variants/ — Mobile Platform Variants

The `variants/` directory is the home for **all** mobile platform stacks,
mirroring the layout used by `oma-backend/variants/`. Every supported platform
is represented here, each as a self-contained variant.

| Variant | `stack.yaml` `language` | Files |
|---------|------------------------|-------|
| `swift-ios/` | `swift` | `stack.yaml`, `tech-stack.md`, `snippets.md`, `api-template.swift` |
| `flutter/` | `flutter` | `stack.yaml`, `tech-stack.md`, `snippets.md`, `api-template.dart` |
| `react-native/` | `react-native` | `stack.yaml`, `tech-stack.md`, `snippets.md`, `api-template.ts` |

## Layout contract

Each `variants/{platform}/` directory contains:

- **`stack.yaml`** — the stack SSOT, validated against `stack.schema.json`.
  Declares `language`, `framework`, `state`, `navigation`, `http_client`,
  `local_storage`, `response_cache`, `structure`, `source`, and a `verify:`
  block consumed by `oma verify mobile`.
- **`tech-stack.md`** — human-readable narrative reference (`stack.yaml` wins on
  conflict).
- **`snippets.md`** — copy-paste-ready, numbered code patterns.
- **`api-template.{swift,dart,ts}`** — the canonical data/repository template,
  including the mandatory repository-layer response cache.

`stack.schema.json` is the shared schema for all variants.

## resources/ is shared meta only

The sibling `resources/` directory holds **only** cross-platform, protocol, and
meta documents shared by every variant: `execution-protocol.md`, `examples.md`,
`checklist.md`, `error-playbook.md`, `tech-stack.md` (the variant index +
cross-platform guidance), and the screen templates. Platform-specific stack
narrative and snippets belong in the variant, not in `resources/`.

## Stack selection

A project's stack is detected from its manifest (`Package.swift`, `pubspec.yaml`,
`package.json` + `react-native`) or chosen via `/stack-set`, which seeds a
project-specific `stack/` from the matching variant baseline (adapt, never
blind-copy). The variant `stack.yaml` is the default; any field may be overridden
per project.
