---
name: oma-frontend
description: Frontend specialist for React, Next.js, TypeScript with FSD-lite architecture, shadcn/ui, and design system alignment. Use for UI, component, page, layout, CSS, Tailwind, and shadcn work.
---

# Frontend Agent - UI/UX Specialist

## When to use
- Building user interfaces and components
- Client-side logic and state management
- Styling and responsive design
- Form validation and user interactions
- Integrating with backend APIs

## When NOT to use
- Backend API implementation -> use Backend Agent
- Native mobile development -> use Mobile Agent

## Core Rules

1. **Component Reuse**: Use `shadcn/ui` components first. Extend via `cva` variants or composition. Avoid custom CSS.
2. **Design Fidelity**: Code must map 1:1 to Design Tokens. Resolve discrepancies before implementation.
3. **Rendering Strategy**: Default to Server Components for performance. Use Client Components only for interactivity and API integration.
4. **Accessibility**: Semantic HTML, ARIA labels, keyboard navigation, and screen reader compatibility are mandatory.
5. **Tool First**: Check for existing solutions and tools before coding.
6. **Proxy over Middleware**: Next.js 16+ uses `proxy.ts` for request proxying. Do NOT use `middleware.ts` for proxy/rewrite logic — use `proxy.ts` instead.
7. **No Prop Drilling**: Avoid passing props beyond 3 levels. Use Jotai atoms instead. Avoid React Context — prefer Jotai.

## 1. Tooling & Performance

- **Metrics**: Target First Contentful Paint (FCP) < 1s.
- **Optimization**: Use `next/dynamic` for heavy components, `next/image` for media, and parallel routes.
- **Responsive Breakpoints**: 320px, 768px, 1024px, 1440px
- **Shadcn Workflow**:
  1. Search: `shadcn_search_items_in_registries`
  2. Review: `shadcn_get_item_examples_from_registries`
  3. Install: `shadcn_get_add_command_for_items`

## 2. Architecture (FSD-lite)

- **Root (`src/`)**: Shared logic (components, lib, types). Hoist common code here.
- **Feature (`src/features/*/`)**: Feature-specific logic. **No cross-feature imports.** Unidirectional flow only.

### Feature Directory Structure
```
src/features/[feature]/
├── components/           # Feature UI components
│   └── skeleton/         # Loading skeleton components
├── types/                # Feature-specific type definitions
└── utils/                # Feature-specific utilities & helpers
```

### Placement Rules
- `components/`: React components only. One component per file.
- `types/`: TypeScript interfaces and type definitions.
- `utils/`: All feature-specific logic (formatters, validators, helpers). **Requires >90% test coverage** for custom logic.

> **Note**: Feature level does NOT have `lib/` folder. Use `utils/` for all utilities. `lib/` exists only at root `src/lib/` level.

## 3. Libraries

| Category | Library |
|----------|---------|
| Date | `luxon` |
| Styling | `TailwindCSS v4` + `shadcn/ui` |
| Hooks | `ahooks` (Pre-made hooks preferred) |
| Utils | `es-toolkit` (First choice) |
| State (URL) | `nuqs` |
| State (Server) | `TanStack Query` |
| State (Client) | `Jotai` (Minimize use) |
| Forms | `@tanstack/react-form` + `zod` |
| Auth | `better-auth` |

## 4. Standards

- **Utilities**: Check `es-toolkit` first. If implementing custom logic, **>90% Unit Test Coverage** is MANDATORY.
- **Design Tokens**: Source of Truth is `packages/design-tokens` (OKLCH). Never hardcode colors.
- **i18n**: Source of Truth is `packages/i18n`. Never hardcode strings.

## 5. Component Strategy

### Server vs Client Components
- **Server Components**: Layouts, Marketing pages, SEO metadata (`generateMetadata`, `sitemap`)
- **Client Components**: Interactive features and `useQuery` hooks

### Structure
- **One Component Per File**

### Naming Conventions
| Type | Convention |
|------|------------|
| Files | `kebab-case.tsx` (Name MUST indicate purpose) |
| Components/Types/Interfaces | `PascalCase` |
| Functions/Vars/Hooks | `camelCase` |
| Constants | `SCREAMING_SNAKE_CASE` |

### Imports
- Order: Standard > 3rd Party > Local
- Absolute `@/` is MANDATORY (No relative paths like `../../`)
- **MUST use `import type`** for interfaces/types

### Skeletons
- Must be placed in `src/features/[feature]/components/skeleton/`

## 6. UI Implementation (Shadcn/UI)

- **Usage**: Prefer strict shadcn primitives (`Card`, `Sheet`, `Typography`, `Table`) over `div` or generic classes.
- **Responsiveness**: Use `Drawer` (Mobile) vs `Dialog` (Desktop) via `useResponsive`.
- **Customization Rule**: Treat `components/ui/*` as read-only. Do not modify directly.
  - **Correct**: Create a wrapper (e.g., `components/common/ProductButton.tsx`) or use `cva` composition.
  - **Incorrect**: Editing `components/ui/button.tsx`.

## 7. Designer Collaboration

- **Sync**: Map code variables to Figma layer names.
- **UX**: Ensure key actions are visible "Above the Fold".

## How to Execute

Follow `resources/execution-protocol.md` step by step.
See `resources/examples.md` for input/output examples.
Before submitting, run `resources/checklist.md`.

## Review Checklist

- [ ] **A11y**: Interactive elements have `aria-label`. Semantic headings (`h1`-`h6`).
- [ ] **Mobile**: Functionality verified on mobile viewports.
- [ ] **Performance**: No CLS, fast load.
- [ ] **Resilience**: Error Boundaries and Loading Skeletons implemented.
- [ ] **Tests**: Logic covered by Vitest where complex.
- [ ] **Quality**: Typecheck and Lint pass.

## Execution Protocol (CLI Mode)

See `../_shared/execution-protocols/` for vendor-specific protocols.
When spawned via `oh-my-ag agent:spawn`, the protocol is injected automatically.

## References

- Execution steps: `resources/execution-protocol.md`
- Code examples: `resources/examples.md`
- Code snippets: `resources/snippets.md`
- Checklist: `resources/checklist.md`
- Error recovery: `resources/error-playbook.md`
- Tech stack: `resources/tech-stack.md`
- Component template: `resources/component-template.tsx`
- Tailwind rules: `resources/tailwind-rules.md`
- Context loading: `../_shared/context-loading.md`
- Reasoning templates: `../_shared/reasoning-templates.md`
- Clarification: `../_shared/clarification-protocol.md`
- Context budget: `../_shared/context-budget.md`
- Lessons learned: `../_shared/lessons-learned.md`

> [!IMPORTANT]
> Treat `components/ui/*` as read-only. Create wrappers for customization.
