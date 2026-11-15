---
name: oma-frontend
description: Implement or modify web UI in React, Next.js, or Angular. Use for
  components, pages, styles, forms, and frontend state or data flows.
---

# Frontend Agent - UI/UX Specialist

## Scheduling

### Goal
Build, modify, and verify React/Next.js or Angular TypeScript user interfaces that follow project architecture, design-system constraints, accessibility expectations, and existing frontend conventions.

### Intent signature
- User asks for UI, component, page, layout, CSS, Tailwind, shadcn, form, interaction, client state, or frontend API integration work.
- User needs browser-facing implementation in a React/Next.js or Angular TypeScript codebase.
- User asks for Angular component, directive, service, route, signal, or RxJS stream work.

### When to use
- Building user interfaces and components
- Client-side logic and state management
- Styling and responsive design
- Form validation and user interactions
- Integrating with backend APIs

### When NOT to use
- Backend API implementation → use Backend Agent
- Database access, migrations, or ORM setup → use Backend Agent
- Auth server setup (better-auth server library, DB adapters) → use Backend Agent
- Native mobile development → use Mobile Agent

### Expected inputs
- Target page, component, flow, or UI behavior
- Existing app structure, design tokens, component library, i18n files, and API contracts
- Acceptance criteria and target responsive states

### Expected outputs
- Frontend code changes in pages, components, hooks, styles, tests, or wrappers
- UI that respects project tokens, i18n, server/client boundaries, and accessibility expectations
- Verification performed, and any relevant lint, typecheck, test, or browser check that was not run

### Dependencies
- React, Next.js, TypeScript, TailwindCSS v4, and `shadcn/ui` — or Angular + signals + RxJS in Angular projects (`resources/angular-rules.md`)
- Project sources of truth for design tokens, i18n strings, and shared utilities
- `resources/execution-protocol.md`, `resources/checklist.md`, and the stack references listed under Stack Reference, each loaded on its trigger
- Conditional visual implementation routes and shared interaction-quality guidance; load only for the affected capability.
- The shadcn CLI, or shadcn registry MCP tools when connected, and the libraries in the Libraries table
- The project's lint, typecheck, test, and browser-inspection commands

## Structural Flow

### Transitions
- If a strict shadcn primitive exists, use or wrap it before creating generic markup.
- If UI text is user-facing and i18n exists, add strings through the i18n source of truth.
- If interaction or hooks are needed, mark the boundary as Client Component.
- If backend contracts are missing, coordinate with backend/API planning.
- For a new or substantially changed admin console, dashboard, SaaS product UI, or internal tool, recommend a post-implementation `oma-design` review through `../oma-design/resources/product-interface-review.md`. This review is advisory unless the task explicitly requires design approval.
- For a requested GPU effect, video-scroll scene, or selected GSAP implementation, use the matching conditional extension, and record it with subject `frontend.route-selection` per `references/_shared/runtime/route-selection.md`.

### Failure and recovery
- If design tokens or i18n sources are missing, state assumptions and follow existing local patterns.
- If a check that was run fails, fix before handoff or report the blocker.
- If required shadcn registry access fails, use existing local components or document fallback.

### Exit
- Success: UI works across target responsive states, required checks pass, and checks not run are reported.
- Partial success: missing assets, backend contracts, or verification gaps are explicit.

## Logical Operations

### Canonical workflow path
1. Identify the target route, component, state boundary, design-system constraints, UI requirements, and acceptance criteria. State assumptions where design tokens, i18n sources, or API contracts are unavailable.
2. Locate files and inspect symbols or content with the configured code-intelligence provider. For Serena, use `find_file`, `search_for_pattern`, `get_symbols_overview`, and `find_symbol`. Native search is limited to the provider exclusions and non-code paths permitted by the project's search policy.
3. Read the existing components, routes, hooks, styles, tokens, i18n keys, APIs, and shadcn availability before adding components or utilities.
4. Decide whether the work belongs in Server Components, Client Components, wrappers, hooks, or styles.
5. For a specialized visual capability, use `resources/specialized-visual-implementation.md`. For affected motion, touch, component feedback, or interaction performance, use `references/_shared/ui-interaction-quality.md`. Ordinary UI work does not preload these paths.
6. Implement the UI, state, styles, validation (form and data contracts through zod, form, and API schemas), and integration.
7. Select the project's relevant frontend checks (typically lint, typecheck, tests, and browser/responsive checks of desktop and mobile behavior when the UI changes). Run them only when the user or the active workflow requires it; otherwise report what was not verified.
8. Check the applicable checklist items and summarize the changed UI behavior, what was verified, and what was not.

### Resource scope and effects
Reads and edits frontend routes, components, styles, hooks, and tests, and possibly i18n keys; reads design tokens, i18n files, and resource references. Adds a dependency or shadcn component only when project conventions justify it. Lint, typecheck, test, and browser commands run only when the user or the active workflow requires them; builds run only on explicit user request. Backend APIs and registry tools are called only when the task requires them.

### Guardrails
Apply framework, library, architecture, and data-model defaults only when the target project has no established choice. Scoped edits do not authorize a stack migration or unrelated infrastructure.

`../../rules/frontend.md` is the source for the React/Next.js core rules (component reuse, design fidelity, rendering strategy, accessibility, request proxy convention, prop drilling, auth boundary, animation library, framework version), the FSD-lite architecture, and naming. The guardrails below add what it does not state.
1. Treat `components/ui/*` as read-only; customize through wrappers or `cva` composition.
2. Use project sources of truth for design tokens, i18n strings, and shared utilities before adding local alternatives.
3. Check the applicable checklist items before handoff and report what was verified and what was not.
4. **Self-describing file names**: every new file follows the File Naming convention in `../../rules/frontend.md` §Naming Conventions — domain + role readable from the basename alone (`order-summary-card.tsx`, `use-order-polling.ts`, `cart.atoms.ts`). Grab-bag names (`utils.ts`, `helpers.ts`, `misc.ts`) and version suffixes (`*-v2`, `*-final`) are banned.
5. Use the project's Link prefetch policy; adjust specific routes only when measured behavior or the task requires it.
6. **Angular projects follow `resources/angular-rules.md`**: standalone components + `OnPush` + signals-first, `inject()` DI, lazy routes, new control flow. **Any non-trivial RxJS pipeline MUST ship with a marble test (`TestScheduler` from `rxjs/testing`)** — a stream without a marble test fails review. React/Next.js-specific rules (shadcn workflow, `proxy.ts`, Libraries table below) do not apply in Angular projects.

### Libraries

React/Next.js projects only — Angular projects use the Angular-native equivalents in `resources/angular-rules.md` (signals, typed Reactive Forms, `HttpClient`/`httpResource`, RxJS with mandatory marble tests).

| Category | Library |
|----------|---------|
| Framework | New-project default: `next@16+` (App Router) + `react@19+` |
| Date | `luxon` |
| Styling | `TailwindCSS v4` + `shadcn/ui` (Base UI engine; see `resources/tech-stack.md`) |
| Hooks | `ahooks` (default) or `@mantine/hooks` (standalone, SSR-safe; no Mantine UI required); pre-made hooks preferred; pick one per project, don't mix |
| Utils | `es-toolkit` (first choice) |
| Types | `type-fest` (TS type utilities not in the standard lib: `SetRequired`, `Merge`, `JsonValue`, `Promisable`, etc.; built-in `Partial`/`Pick`/`Omit` stay first choice) |
| State (URL) | `nuqs` |
| State (Server) | `TanStack Query`; default is `orval`-generated hooks from the OpenAPI spec (`client: react-query`); hand-write hooks only for spec-less endpoints (see `resources/tech-stack.md` §Server State) |
| State (Client) | `Jotai` or `Zustand` (intent-based, no default; minimize use — see `resources/tech-stack.md`) |
| Forms | `@tanstack/react-form` (v1+; pass zod schemas directly via Standard Schema; do not add the v0-only `@tanstack/zod-form-adapter` to v1 projects) + `zod` (v4) |
| Auth | `better-auth` (client SDK only in client code) |
| Animation | New-project default: `motion` with imports from `motion/react` |

### Shadcn Workflow

- **Engine default: Base UI** (`components.json` → `style: "base-*"`). Radix (`radix-*`) is a
  reasoned fallback for existing Radix codebases only; no big-bang migration. Details in
  `resources/tech-stack.md` §shadcn/ui Primitive Engine.

1. Search: `npx shadcn@latest search <@registry> -q "<query>"`
2. Review: `npx shadcn@latest view <item>` (registry source) or `npx shadcn@latest docs <component>` (docs and examples)
3. Install: `npx shadcn@latest add <item>`; preview with `--dry-run` or `--diff` before overwriting

When a shadcn MCP server is connected, its registry search, example, and add-command tools cover the same three steps; discover the actual tool names before calling them.

### Server vs Client Components

- **Server Components**: Layouts, marketing pages, SEO metadata (`generateMetadata`, `sitemap`)
- **Client Components**: Interactive features and `useQuery` hooks
- **Mutations**: one owner per write. Server Actions for form-shaped, revalidate-only flows; TanStack Query for cache-coupled or non-form writes (`resources/tech-stack.md` §Mutations)

### UI Implementation (Shadcn/UI)

- **Usage**: Prefer strict shadcn primitives (`Card`, `Sheet`, `Typography`, `Table`) over `div` or generic classes.
- **Responsiveness**: Use `Drawer` (mobile) vs `Dialog` (desktop) via `useResponsive`.
<!-- oma-docs:ignore-start -->
- **Customization**: Treat `components/ui/*` as read-only. Create wrappers (e.g., `components/common/ProductButton.tsx`) or use `cva` composition. Never edit `components/ui/button.tsx` directly.
<!-- oma-docs:ignore-end -->

### Sources of Truth

- **DESIGN.md** (project root): visual system source of truth when present
- **Design Tokens**: the project's token source (`packages/design-tokens` or equivalent); never hardcode colors
- **i18n strings**: the project's i18n source (`packages/i18n` or equivalent); never hardcode UI text
- **Custom utilities**: check `es-toolkit` first; if implementing custom logic, use the project or task coverage target and risk-relevant tests

### Stack Reference

Project stack conventions live in dedicated files. Load a file when its trigger applies.

| File | Load when |
|---|---|
| `resources/tech-stack.md` | Choosing or checking framework versions, the shadcn primitive engine, Next.js 16 `proxy.ts` or React Compiler conventions, mutation ownership (Server Actions vs TanStack Query), the client-state library, or the browser-verification MCP selection |
| `resources/tailwind-rules.md` | Writing or reviewing Tailwind classes, design tokens, focus states, or Tailwind v4 `@theme` config |
| `resources/snippets.md` | A starting pattern is needed: Next.js canonicals, accessible card, React 19 hooks, TanStack Query/Form, i18n |
| `resources/angular-rules.md` | The target project is Angular (standalone/OnPush/signals conventions, RxJS marble-test policy) |

To extend: add `resources/<name>.md` and append a row above.

## References
- Stack generation spec: `resources/stack-generation.md` (loaded by `/stack-set` when it generates this skill's `stack/`)
- `../oma-design/resources/product-interface-review.md`: recommended design review after substantial product-interface implementation.
- Specialized visual implementation: `resources/specialized-visual-implementation.md` (requested CanvasUI GPU effect, Scroll World scene, or selected GSAP implementation)
- Interaction quality: `references/_shared/ui-interaction-quality.md` (motion, feedback, touch, interruption, or performance changes)
- Local code tools: `references/_shared/core/code-intelligence.md` (code search/navigation)

- Project frontend rules: `../../rules/frontend.md` (implementing or reviewing React/Next.js code: core rules, FSD-lite architecture, naming)
- Execution steps (follow for the selected task): `resources/execution-protocol.md`
- Checklist (applicable items before handoff): `resources/checklist.md`
- Error recovery: `resources/error-playbook.md`
- Context loading: `references/_shared/core/context-loading.md`
- Clarification: `references/_shared/core/clarification-protocol.md`
- Context budget: `references/_shared/core/context-budget.md`
- Lessons learned: `references/_shared/core/lessons-learned.md` (matching prior failure or requested retrospective)
- Observability handoff: `../oma-observability/SKILL.md` §Integrations — Core Web Vitals targets and browser-to-backend trace correlation