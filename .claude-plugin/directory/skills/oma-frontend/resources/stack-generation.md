# Stack generation: frontend

The generation and verification spec `/stack-set` follows for a frontend project. `/stack-set` detects the stack, resolves the target skill, and writes the files below into that skill's `stack/` directory; this file says what each file must contain. An Angular project writes into the `angular-developer` skill's `stack/` when that skill is installed, otherwise into this skill's.

## Angular

### stack.yaml
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
verify:                          # consumed by `oma verify agent frontend` (see _shared/core/stack-verify.schema.json)
  detect: angular.json
  syntax:
    cmd: "{syntax_check_cmd}"    # e.g. bunx tsc --noEmit -p tsconfig.app.json
  tests:
    cmd: "{test_cmd}"            # e.g. bunx vitest run, or ng test --watch=false
    skip_if_missing: "{optional_binary}"
```

### tech-stack.md
Generate an Angular-specific tech stack reference with these MANDATORY sections:
- Angular version and CLI workflow (`ng generate`, `ng build`, `ng serve`, detected build system)
- Standalone components (no NgModules in new code)
- Change detection: `ChangeDetectionStrategy.OnPush` default; zoneless setup if detected
- Signals as the default state primitive (`signal`, `computed`, `effect`, `input()`, `model()`)
- Lazy routes (`loadComponent` / `loadChildren`)
- UI library + styling integration (detected values)
- Test runner and how to run it
- **RxJS policy: signals first; every non-trivial Observable pipeline MUST ship with a marble test (`TestScheduler` from `rxjs/testing`)** — omit this section only when `async: signals-only`

### snippets.md
Generate copy-paste code patterns. MANDATORY patterns (all 8 required):
- [ ] Standalone component with `ChangeDetectionStrategy.OnPush` + signals + new control flow (`@if` / `@for`)
- [ ] `inject()`-based service + provider example
- [ ] Lazy route config (`loadComponent` / `loadChildren`)
- [ ] Typed Reactive Form + validation example
- [ ] HttpClient data-access service (or `httpResource`) example
- [ ] Signal ↔ RxJS interop (`toSignal` / `toObservable`)
- [ ] RxJS stream **with paired marble test** (`TestScheduler.run`) — when `rxjs` is in the detected stack; otherwise a signals-based async pattern
- [ ] Component test in the detected runner

### component-template.ts
Generate a standalone CRUD feature (component + data service) in the detected style. The template must:
- Use standalone components with `ChangeDetectionStrategy.OnPush` and signals for state.
- Be lazy-routable (`loadComponent`) and use `inject()` for DI.
- Use the detected UI library and styling conventions.
- If the data service exposes RxJS streams, include a paired `*.spec.ts` marble test using `TestScheduler`.

## React / Next.js / Vue / Svelte

Target is always `oma-frontend`. Mirror the Angular path's file set, adapted to the detected framework:

### stack.yaml
Same shape as the Angular `stack.yaml` with framework-appropriate values: `language`, `framework` (`nextjs` | `react` | `vue` | `svelte`), `framework_version`, `package_manager` (from lockfile), `ui` (e.g. `shadcn-ui`, `mui`, none), `styling` (e.g. `tailwindcss-v4`, css-modules), `state` (e.g. `zustand`, `redux-toolkit`, context, runes/composables), `test`, `source: detected`, `detected_from`, and a `verify:` block with runnable `syntax.cmd` (e.g. `bunx tsc --noEmit`) and `tests.cmd`.

### tech-stack.md
MANDATORY sections: framework version + CLI/build workflow (e.g. `next build` / Vite), routing model (App Router / file-based), rendering strategy (SSR/SSG/CSR as detected), state management approach, UI library + styling integration, data-fetching convention, test runner and how to run it.

### snippets.md
MANDATORY patterns (all 8): typed component (server + client component split where the framework has one) · route/page with data loading · form with validation · shared state example (detected state lib) · API/data-access module · error/loading boundary · UI-library component usage · component test in the detected runner.

### component-template.*
A CRUD feature (component + data-access module) in the detected framework's idiom, using the detected UI library and styling conventions.

## Verify

### Angular
- [ ] `stack.yaml` has `language`, `framework`, `framework_version`, `package_manager`, `ui`, `styling`, `test` fields
- [ ] `stack.yaml` has a `verify:` block with runnable `syntax.cmd` and `tests.cmd`
- [ ] `snippets.md` contains all 8 mandatory Angular patterns
- [ ] Generated references mention standalone components, OnPush, signals, lazy routes, and the Angular CLI
- [ ] If `rxjs` is in the detected stack: `snippets.md` includes a runnable marble test (`TestScheduler`) and `tech-stack.md` states that marble tests are mandatory for stream logic
- [ ] A frontend-only repo (Angular, Next.js, React, Vue, Svelte) did NOT also generate `.agents/skills/oma-backend/stack/`

### React / Next.js / Vue / Svelte
- [ ] `stack.yaml` has `language`, `framework`, `framework_version`, `package_manager`, `ui`, `styling`, `test` fields and a runnable `verify:` block
- [ ] `snippets.md` contains all 8 mandatory patterns in the detected framework's idiom
- [ ] Generated references match the detected rendering strategy and routing model (no Angular-specific content)
