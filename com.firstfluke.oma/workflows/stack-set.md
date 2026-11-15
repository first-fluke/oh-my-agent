---
name: stack-set
description: Auto-detect project tech stack and generate stack-specific references for domain skills
disable-model-invocation: true
---

- **Response language: the user's prompt language first, then `language` in `.agents/oma-config.yaml`, then English.**
- Follow `.agents/skills/_shared/core/execution-policy.md` for authorization, clarification, verification, and completion. Execute required steps on the selected path in dependency order; apply documented branch and skip conditions.
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
- Python: Litestar? FastAPI? Django? Flask?
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
| `settings.gradle.kts` (or `settings.gradle`) with a module applying `com.android.application`, and **no** `pubspec.yaml` / `react-native` dependency | Kotlin / Android native |
| `pubspec.yaml` | Flutter |
| `package.json` with a `react-native` dependency | React Native |

For Swift / iOS native, additionally inspect the project to detect the UI framework:
- Look for `import SwiftUI` in source files or a `SwiftUI` framework dependency in `Package.swift`.
- Default to **SwiftUI** when ambiguous.

For Kotlin / Android native, additionally inspect the Gradle files:
- Flutter and React Native repos also contain an `android/` Gradle project; those are **host shells**, not Kotlin native. Classify as Kotlin native only when the Gradle project is the app itself.
- UI: `org.jetbrains.kotlin.plugin.compose` or `androidx.compose.*` dependencies → Jetpack Compose; otherwise XML Views. Default to **Compose** when ambiguous.
- DI: `com.google.dagger.hilt.android` → Hilt; `io.insert-koin` → Koin.
- API generator: an `openApiGenerate {}` block from `org.openapi.generator` → record `generatorName`, `library` (e.g. `jvm-ktor`), `inputSpec` (= `api_spec`), and the `apiPackage`/`modelPackage`.
- HTTP: `io.ktor:ktor-client-*` → Ktor Client; record the engine artifact (`ktor-client-okhttp`, `ktor-client-android`, `ktor-client-cio`) separately. `com.squareup.retrofit2` → Retrofit; bare `com.squareup.okhttp3` → OkHttp.
- Local storage: `androidx.room` → Room; `androidx.datastore` → DataStore.

### Resolve `target_skill`

After scanning all tables, record every domain that has at least one detected manifest file:

| Detected domain | `target_skill` |
|:---|:---|
| backend only | `oma-backend` |
| frontend only (Angular) | `angular-developer` if `.agents/skills/angular-developer/` is installed, otherwise `oma-frontend` |
| frontend only (React / Next.js / Vue / Svelte) | `oma-frontend` |
| mobile only | `oma-mobile` |
| two or more (monorepo) | carry **all** into Step 2 — do NOT first-match |

`angular-developer` is the Angular team's agent skill, installed separately by the user; OMA does not ship it. Use it only when its directory exists. Otherwise (the default) Angular targets `oma-frontend`, whose `resources/angular-rules.md` carries the Angular conventions.

**Multi-domain rule (amendment B):** If manifests from two or more tables are found, collect all detected domains as the detected set and proceed to Step 2. Do not silently discard any.

---

## Step 2: Resolve Target & Present Detection

Reuse domains and stack choices already specified by the user. Present detected values for review; ask only about a material ambiguity, an unresolved target domain, or an overwrite outside the requested scope. The prompts below are for those unresolved cases.

### Single-domain: backend

Present detection results; ask for correction only if a material value remains unresolved:
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

Present detection results; ask for correction only if a material value remains unresolved:
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

Present detection results; ask for correction only if a material value remains unresolved:
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

For Kotlin / Android native, present the equivalent block with `Language: Kotlin`, `UI: Compose`, `DI: Hilt`, `HTTP: ktor-client (engine: okhttp)`, `API generator: openapi-generator (kotlin / jvm-ktor)`, `API spec: {inputSpec}`, `Structure: {modules}`, `Test: JUnit`.

For Flutter or React Native mobile detection, present an equivalent confirmation block using the relevant fields (framework, sdk version, test framework, etc.).

### Multi-domain: present choice first

When more than one domain was detected in Step 1 and the request does not identify which domains to configure, ask:

```
Multiple domains detected in this repo:
  [backend]   {backend_language} / {backend_framework}
  [frontend]  Angular {angular_version} / {ui_library}
  [mobile]    {mobile_language} / {mobile_ui}

Generate stack references for: [all / backend / frontend / mobile]
```

(List only the domains actually detected.)

Once the target domains are resolved, show their detected values together and generate within the authorized scope. Do not request a separate approval for each domain.

---

## Step 3: Generate

Write generated files into `.agents/skills/{target_skill}/stack/`.

- Backend → `.agents/skills/oma-backend/stack/`
- Frontend → `.agents/skills/{frontend_target_skill}/stack/` (`angular-developer` or `oma-frontend`, per Step 1)
- Mobile → `.agents/skills/oma-mobile/stack/`
- Multi-domain → generate each selected domain in turn.

For each selected domain, read its generation spec and follow the section for the detected stack:

| Domain | Generation spec |
|:---|:---|
| backend | `.agents/skills/oma-backend/resources/stack-generation.md` |
| frontend | `.agents/skills/oma-frontend/resources/stack-generation.md` (Angular, or React / Next.js / Vue / Svelte) |
| mobile | `.agents/skills/oma-mobile/resources/stack-generation.md` (Swift, Kotlin, or Flutter / React Native) |

The spec belongs to the domain's OMA skill even when the files are written elsewhere (an Angular project targeting `angular-developer` still follows the `oma-frontend` spec). If a spec file is absent, that skill is not installed: report it and skip the domain instead of generating from memory.

---

## Step 4: Verify

Confirm generated files meet requirements. Verification commands must follow the execution policy: use detected non-emitting checks, and include build/compile/package commands only when explicitly requested. If no suitable non-emitting check is available, report that limitation instead of substituting a build.

Run the `Verify` section of each generation spec used in Step 3 and report which items passed.

---

## Constraints

- Do NOT modify `.agents/skills/{target_skill}/SKILL.md` (abstract interface is protected)
- Do NOT modify `resources/` common files under any skill
- Only create or modify files in the resolved skill's `stack/` directory
- If `stack/` already exists, preserve unrelated content; ask before overwriting only when replacement is outside the authorized scope
- `target_skill` is always the resolved domain skill (`oma-backend`, `oma-mobile`, or the resolved frontend skill — `angular-developer` / `oma-frontend`); never hardcode a single skill name in generation logic
