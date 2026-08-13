---
name: stack-set
description: Auto-detect project tech stack and generate stack-specific references for domain skills
disable-model-invocation: true
---

# MANDATORY RULES: VIOLATION IS FORBIDDEN

- **Response language follows `language` setting in `.agents/oma-config.yaml` if configured.**
- **NEVER skip steps.** Execute from Step 1 in order.
- **This workflow is slash-invoked only** (`/stack-set`). It is NOT triggered by keyword detection.
- **Read manifests BEFORE generating.** Never fabricate stack values that were not detected.

---

# /stack-set: Stack Configuration Workflow

## Goal
Analyze project files to detect the tech stack, resolve the target domain skill, then generate language-specific references in that skill's `stack/` directory.

> **Vendor note:** This workflow executes inline (no subagent spawning). All vendors use their native file reading tools for manifest detection and file writing tools for stack generation.

---

## Step 1: Detect

Scan the project root for package manifests. Evaluate **all three** tables independently — do not stop at the first match.

### Backend manifests → domain `backend`

| File | Detection |
|:---|:---|
| `pyproject.toml`, `requirements.txt`, `Pipfile` | Python |
| `package.json`, `tsconfig.json` | Node.js/TypeScript |
| `Cargo.toml` | Rust |
| `pom.xml`, `build.gradle`, `build.gradle.kts` | Java/Kotlin |
| `go.mod` | Go |
| `mix.exs` | Elixir |
| `Gemfile` | Ruby |
| `*.csproj`, `*.sln` | C#/.NET |

Read manifest contents to detect framework:
- Python: FastAPI? Django? Flask?
- Node.js: NestJS? Express? Hono?
- Rust: Axum? Actix-web? Rocket?
- Java: Spring Boot? Quarkus?

**Frontend exclusion (amendment F):** `package.json` + `tsconfig.json` count as a backend (Node.js/TypeScript) signal only when no frontend signal from the table below claims them. In a frontend-only repo (Angular, Next.js, React, Vue, Svelte, …), `package.json` and `tsconfig.json` do NOT create a backend domain. A backend domain still counts when a non-Node backend manifest exists (e.g. `pyproject.toml`) or a separate package carries backend framework dependencies (NestJS, Express, Hono, …) in a monorepo. (Next.js API routes / server actions belong to the frontend domain, not a separate backend domain, unless a dedicated backend package exists.)

### Frontend manifests → domain `frontend`

| File | Detection |
|:---|:---|
| `angular.json` | Angular |
| `package.json` with `@angular/core`, `@angular/cli`, or `@angular/build` | Angular |
| `next.config.{js,mjs,ts}` or `package.json` with `next` | Next.js (React) |
| `package.json` with `react` + `react-dom` (no `next`, no `react-native`) | React SPA (Vite / CRA / Remix — infer from deps) |
| `nuxt.config.*` or `package.json` with `vue` / `nuxt` | Vue / Nuxt |
| `svelte.config.*` or `package.json` with `svelte` | Svelte / SvelteKit |
| `tsconfig.app.json`, `tsconfig.spec.json` | Angular (supporting signal only — never sufficient alone) |

Any row above counts as a frontend signal for the amendment-F backend exclusion — a Next.js or React repo must NOT fall through to the backend (Node.js) domain just because it has `package.json` + `tsconfig.json`.

For Angular, read manifest contents to detect the rest of the stack:
- Angular version from `@angular/core`
- Package manager from the lockfile (`bun.lock` → bun, `pnpm-lock.yaml` → pnpm, `yarn.lock` → yarn, `package-lock.json` → npm)
- UI library: `@spartan-ng/*` (Spartan UI)? `@angular/material`? PrimeNG? none
- Styling: Tailwind CSS? SCSS? (`components.json` is a Spartan/shadcn-style marker)
- Test runner: Vitest? Jest? Jasmine/Karma?
- RxJS: is `rxjs` used beyond Angular internals (streams in services/components)?

### Mobile manifests → domain `mobile`

| File | Detection |
|:---|:---|
| `Package.swift`, `*.xcodeproj`, `*.xcworkspace`, `Podfile` | Swift / iOS native |
| `pubspec.yaml` | Flutter |
| `package.json` with a `react-native` dependency | React Native |

For Swift / iOS native, additionally inspect the project to detect the UI framework:
- Look for `import SwiftUI` in source files or a `SwiftUI` framework dependency in `Package.swift`.
- Default to **SwiftUI** when ambiguous.

### Resolve `target_skill`

After scanning all tables, record every domain that has at least one detected manifest file:

| Detected domain | `target_skill` |
|:---|:---|
| backend only | `oma-backend` |
| frontend only (Angular) | `angular-developer` if `.agents/skills/angular-developer/` is installed, otherwise `oma-frontend` |
| frontend only (React / Next.js / Vue / Svelte) | `oma-frontend` |
| mobile only | `oma-mobile` |
| two or more (monorepo) | carry **all** into Step 2 — do NOT first-match |

**Multi-domain rule (amendment B):** If manifests from two or more tables are found, collect all detected domains as the detected set and proceed to Step 2. Do not silently discard any.

---

## Step 2: Confirm

### Single-domain: backend

Present detection results and ask for confirmation:
```
Detected backend stack:
  Language: {language}
  Framework: {framework}
  ORM: {orm}
  Validation: {validation}
  Migration: {migration}
  Test: {test framework}

Correct? (Y/n) or modify:
```

### Single-domain: frontend (Angular)

Present detection results and ask for confirmation:
```
Detected frontend stack:
  Framework: Angular {version}
  Package manager: {pm}
  UI: {ui_library}            (e.g. Spartan UI, Angular Material, none)
  Styling: {styling}          (e.g. Tailwind CSS v4, SCSS)
  Async/State: {async}        (signals-only, or signals + rxjs)
  Test: {test_runner}         (e.g. Vitest, Jest, Jasmine/Karma)

Correct? (Y/n) or modify:
```

For React / Next.js / Vue / Svelte detection, present an equivalent confirmation block using the relevant fields (framework + version, package manager, UI library, styling, state management, test runner).

### Single-domain: mobile (Swift)

Present detection results and ask for confirmation:
```
Detected mobile stack:
  Language: {language}        (e.g. Swift)
  UI: {ui}                    (e.g. SwiftUI)
  API generator: {api_generator}   (e.g. swift-openapi-generator)
  API spec: {api_spec}        (e.g. Core/Networking/openapi.yaml)
  Structure: {structure}      (e.g. App/Core/Features/Shared)
  Test: {test}                (e.g. XCTest)

Correct? (Y/n) or modify:
```

For Flutter or React Native mobile detection, present an equivalent confirmation block using the relevant fields (framework, sdk version, test framework, etc.).

### Multi-domain: present choice first

When more than one domain was detected in Step 1, **before** showing any per-domain confirm block, ask:

```
Multiple domains detected in this repo:
  [backend]   {backend_language} / {backend_framework}
  [frontend]  Angular {angular_version} / {ui_library}
  [mobile]    {mobile_language} / {mobile_ui}

Generate stack references for: [all / backend / frontend / mobile]
```

(List only the domains actually detected.)

After the user selects, show the per-domain confirmation block(s) for the chosen domain(s) and confirm each before generating.

---

## Step 3: Generate

Write generated files into `.agents/skills/{target_skill}/stack/`.

- Backend → `.agents/skills/oma-backend/stack/`
- Frontend → `.agents/skills/{frontend_target_skill}/stack/` (`angular-developer` or `oma-frontend`, per Step 1)
- Mobile → `.agents/skills/oma-mobile/stack/`
- Multi-domain → run the appropriate generation sub-path for each selected domain in turn.

---

### Backend path

#### stack.yaml
```yaml
language: {language}
framework: {framework}
orm: {orm}
validation: {validation}
migration: {migration}
test: {test_framework}
source: detected
detected_from:
  - {manifest_file}
verify:                          # consumed by `oma verify backend` (see _shared/core/stack-verify.schema.json)
  detect: {manifest_file}        # e.g. package.json, pyproject.toml
  syntax:
    cmd: "{syntax_check_cmd}"    # e.g. bunx tsc --noEmit
  tests:
    cmd: "{test_cmd}"            # e.g. bun test
    skip_if_missing: "{optional_binary}"
  raw_sql:                       # raw-SQL injection grep scan — omit only when the stack has no raw-query escape hatch
    patterns:
      - "{raw_sql_pattern}"      # ORM-appropriate ERE, e.g. "\\$queryRawUnsafe\\(" (Prisma), "f[\"'].*(SELECT|INSERT|UPDATE|DELETE)" (Python)
    include_glob: "{source_glob}" # e.g. "*.ts", "*.py"
    exclude_dirs: [{build_and_dep_dirs}]  # e.g. node_modules, dist, .venv, target
```

Seed `raw_sql` patterns from the matching `variants/{language}/stack.yaml` when one exists (node/python/rust ship with tested patterns); otherwise derive patterns from the detected ORM's raw-query APIs.

#### tech-stack.md
Generate tech stack reference with these MANDATORY sections:
- Framework version and core API
- ORM/DB library and usage
- Validation library
- Migration tool
- Test framework
- Linter/formatter

#### snippets.md
Generate copy-paste code patterns. MANDATORY patterns (all 8 required):
- [ ] Route/Handler + Auth example
- [ ] Validation Schema example
- [ ] ORM Model/Entity example
- [ ] DI (Dependency Injection) example
- [ ] Repository pattern example
- [ ] Paginated Query example
- [ ] Migration example
- [ ] Test example

#### api-template.*
Generate CRUD endpoint boilerplate in the detected language.

---

### Frontend path — Angular

#### stack.yaml
```yaml
language: typescript
framework: angular
framework_version: "{angular_version}"   # e.g. "22.0.0" from @angular/core
package_manager: {pm}                    # bun | pnpm | yarn | npm, from lockfile
ui: {ui_library}                         # e.g. spartan-ui, angular-material, none
styling: {styling}                       # e.g. tailwindcss-v4, scss
state: signals
async: {async}                           # signals-only | rxjs
test: {test_runner}                      # e.g. vitest, jest, jasmine-karma
source: detected
detected_from:
  - angular.json
  - package.json
verify:                          # consumed by `oma verify frontend` (see _shared/core/stack-verify.schema.json)
  detect: angular.json
  syntax:
    cmd: "{syntax_check_cmd}"    # e.g. bunx tsc --noEmit -p tsconfig.app.json
  tests:
    cmd: "{test_cmd}"            # e.g. bunx vitest run, or ng test --watch=false
    skip_if_missing: "{optional_binary}"
```

#### tech-stack.md
Generate an Angular-specific tech stack reference with these MANDATORY sections:
- Angular version and CLI workflow (`ng generate`, `ng build`, `ng serve`, detected build system)
- Standalone components (no NgModules in new code)
- Change detection: `ChangeDetectionStrategy.OnPush` default; zoneless setup if detected
- Signals as the default state primitive (`signal`, `computed`, `effect`, `input()`, `model()`)
- Lazy routes (`loadComponent` / `loadChildren`)
- UI library + styling integration (detected values)
- Test runner and how to run it
- **RxJS policy: signals first; every non-trivial Observable pipeline MUST ship with a marble test (`TestScheduler` from `rxjs/testing`)** — omit this section only when `async: signals-only`

#### snippets.md
Generate copy-paste code patterns. MANDATORY patterns (all 8 required):
- [ ] Standalone component with `ChangeDetectionStrategy.OnPush` + signals + new control flow (`@if` / `@for`)
- [ ] `inject()`-based service + provider example
- [ ] Lazy route config (`loadComponent` / `loadChildren`)
- [ ] Typed Reactive Form + validation example
- [ ] HttpClient data-access service (or `httpResource`) example
- [ ] Signal ↔ RxJS interop (`toSignal` / `toObservable`)
- [ ] RxJS stream **with paired marble test** (`TestScheduler.run`) — when `rxjs` is in the detected stack; otherwise a signals-based async pattern
- [ ] Component test in the detected runner

#### component-template.ts
Generate a standalone CRUD feature (component + data service) in the detected style. The template must:
- Use standalone components with `ChangeDetectionStrategy.OnPush` and signals for state.
- Be lazy-routable (`loadComponent`) and use `inject()` for DI.
- Use the detected UI library and styling conventions.
- If the data service exposes RxJS streams, include a paired `*.spec.ts` marble test using `TestScheduler`.

---

### Frontend path — React / Next.js / Vue / Svelte

Target is always `oma-frontend`. Mirror the Angular path's file set, adapted to the detected framework:

#### stack.yaml
Same shape as the Angular `stack.yaml` with framework-appropriate values: `language`, `framework` (`nextjs` | `react` | `vue` | `svelte`), `framework_version`, `package_manager` (from lockfile), `ui` (e.g. `shadcn-ui`, `mui`, none), `styling` (e.g. `tailwindcss-v4`, css-modules), `state` (e.g. `zustand`, `redux-toolkit`, context, runes/composables), `test`, `source: detected`, `detected_from`, and a `verify:` block with runnable `syntax.cmd` (e.g. `bunx tsc --noEmit`) and `tests.cmd`.

#### tech-stack.md
MANDATORY sections: framework version + CLI/build workflow (e.g. `next build` / Vite), routing model (App Router / file-based), rendering strategy (SSR/SSG/CSR as detected), state management approach, UI library + styling integration, data-fetching convention, test runner and how to run it.

#### snippets.md
MANDATORY patterns (all 8): typed component (server + client component split where the framework has one) · route/page with data loading · form with validation · shared state example (detected state lib) · API/data-access module · error/loading boundary · UI-library component usage · component test in the detected runner.

#### component-template.*
A CRUD feature (component + data-access module) in the detected framework's idiom, using the detected UI library and styling conventions.

---

### Mobile path — Swift / iOS native

**Adapt, not copy (amendment E):** Seed from `.agents/skills/oma-mobile/variants/swift-ios/` as the baseline, then adapt every value to match the detected project. Specifically:

- Replace placeholder `Features/` module names with the actual feature module names found in the project (e.g., `Features/Auth`, `Features/Home`).
<!-- oma-docs:ignore-start -->
- Set `api_spec` to the actual path where the OpenAPI document lives in this project (default `Core/Networking/openapi.yaml` only when no other location is found).
<!-- oma-docs:ignore-end -->
- Set the minimum iOS deployment target to the value detected from `Package.swift` or `.xcodeproj`; default `17.0` when not specified.
- Populate the DI wiring in the App entry snippet with the real `Client` and service types from the project, not generic placeholders.

Do **not** blind-copy the variant files; the generated `stack/` must be project-specific.

#### stack.yaml — mandatory fields
```yaml
language: swift
framework: swiftui           # or uikit — adapt to detected value
ui: swiftui                  # adapt to detected value
api_generator: swift-openapi-generator
api_spec: {actual_path_to_openapi_yaml}
structure: App/Core/Features/Shared
test: XCTest
source: detected
detected_from:
  - {manifest_file}          # e.g. Package.swift
verify:                      # consumed by `oma verify mobile` (see _shared/core/stack-verify.schema.json)
  detect: Package.swift
  syntax:
    cmd: "swift build"
    skip_if_missing: "swift"
  tests:
    cmd: "swift test"
    skip_if_missing: "swift"
```

#### tech-stack.md
Generate a Swift-specific tech stack reference with these MANDATORY sections:
- SwiftUI + Observation framework (`@Observable`, iOS 17+)
- `swift-openapi-generator` + `swift-openapi-runtime` + `swift-openapi-urlsession` — SwiftPM build plugin wiring
- `App/Core/Features/Shared` module layout (App = entry/composition root, Core = networking/generated client/DI, Features = screen + view-model verticals, Shared = reusable UI/utils)
- API spec provenance: where `{api_spec}` comes from, how it is kept in sync with the backend producer
- Test framework (XCTest / Swift Testing)
- Linter/formatter (SwiftLint if present)

#### snippets.md — mandatory Swift snippet set (all required)
- [ ] `Package.swift` with the `OpenAPIGenerator` build plugin declared and `openapi.yaml` spec discovery configured
- [ ] `openapi-generator-config.yaml` — generator configuration (namespace, accessibility, etc.)
- [ ] `@Observable` view model (Observation framework, async data loading, error state)
- [ ] SwiftUI feature view consuming the view model
- [ ] `Core/Networking` service wrapping the generated `Client` (URLSession transport, bearer auth middleware)
- [ ] Generated-client call pattern (`Operations.listItems`, `Operations.createItem`, etc.)
- [ ] App entry point + DI composition root (wiring `Client` → service → view model)
- [ ] XCTest example for the service or view model

#### api-template.swift
Generate a CRUD service built on the generated `Client` (using `Operations.*` call patterns from `swift-openapi-generator`). This is the Swift analogue of the backend `api-template.*`. The template must:
- Import and instantiate the generated `Client` (not a hand-rolled `URLSession` request builder).
- Implement list, get-by-id, create, update, and delete operations using `Operations.*` types.
- Handle transport errors and map them to domain error types.
- Use `async/await` throughout.

---

### Mobile path — Flutter / React Native

Seed from `.agents/skills/oma-mobile/variants/flutter/` or `.agents/skills/oma-mobile/variants/react-native/` respectively (same **adapt, not copy** rule as amendment E): generate `stack.yaml` (with a runnable `verify:` block, e.g. `flutter analyze` / `flutter test`, or `bunx tsc --noEmit` / `jest`), `tech-stack.md`, `snippets.md`, and an api-template in the detected idiom, replacing variant placeholders with the project's actual module names, SDK versions, and state-management library.

---

## Step 4: Verify

Confirm generated files meet requirements.

### Backend checks
- [ ] `stack.yaml` has `language`, `framework`, `orm`, `validation` fields
- [ ] `stack.yaml` has a `verify:` block with runnable `syntax.cmd` and `tests.cmd` (otherwise `oma verify backend` cannot dispatch)
- [ ] `stack.yaml` `verify:` includes a `raw_sql` scan with ORM-appropriate patterns (without it `oma verify backend` silently skips the raw-SQL injection check); omit only when the stack has no raw-query escape hatch
- [ ] `snippets.md` contains all 8 mandatory patterns
- [ ] `tech-stack.md` contains all 6 mandatory sections
- [ ] `api-template` file uses the correct language extension
- [ ] Code follows existing project conventions

### Frontend (Angular) checks
- [ ] `stack.yaml` has `language`, `framework`, `framework_version`, `package_manager`, `ui`, `styling`, `test` fields
- [ ] `stack.yaml` has a `verify:` block with runnable `syntax.cmd` and `tests.cmd`
- [ ] `snippets.md` contains all 8 mandatory Angular patterns
- [ ] Generated references mention standalone components, OnPush, signals, lazy routes, and the Angular CLI
- [ ] If `rxjs` is in the detected stack: `snippets.md` includes a runnable marble test (`TestScheduler`) and `tech-stack.md` states that marble tests are mandatory for stream logic
- [ ] A frontend-only repo (Angular, Next.js, React, Vue, Svelte) did NOT also generate `.agents/skills/oma-backend/stack/`

### Frontend (React / Next.js / Vue / Svelte) checks
- [ ] `stack.yaml` has `language`, `framework`, `framework_version`, `package_manager`, `ui`, `styling`, `test` fields and a runnable `verify:` block
- [ ] `snippets.md` contains all 8 mandatory patterns in the detected framework's idiom
- [ ] Generated references match the detected rendering strategy and routing model (no Angular-specific content)

### Mobile (Swift) checks
- [ ] `stack.yaml` has `language`, `api_generator`, `api_spec`, and `structure` fields populated with project-specific values (not variant defaults)
- [ ] `stack.yaml` has a `verify:` block with runnable `syntax.cmd` and `tests.cmd` (otherwise `oma verify mobile` cannot dispatch)
- [ ] `snippets.md` includes the generator configuration snippet (`openapi-generator-config.yaml`) and at least one snippet that uses the generated `Client` via `Operations.*`
- [ ] `api-template.swift` uses the generated client — not hand-rolled `URLSession` request construction
- [ ] `tech-stack.md` documents where `api_spec` originates and how it syncs from the backend producer
- [ ] Module names in snippets reflect real `Features/` modules detected in the project, not generic placeholders

---

## Constraints

- Do NOT modify `.agents/skills/{target_skill}/SKILL.md` (abstract interface is protected)
- Do NOT modify `resources/` common files under any skill
- Only create or modify files in the resolved skill's `stack/` directory
- If `stack/` already exists for the resolved domain skill, ask before overwriting
- `target_skill` is always the resolved domain skill (`oma-backend`, `oma-mobile`, or the resolved frontend skill — `angular-developer` / `oma-frontend`); never hardcode a single skill name in generation logic
