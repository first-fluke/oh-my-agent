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
- Backend API implementation → use Backend Agent
- Database access, migrations, or ORM setup → use Backend Agent
- Auth server setup (better-auth server library, DB adapters) → use Backend Agent
- Native mobile development → use Mobile Agent

## Libraries

| Category | Library |
|----------|---------|
| Date | `luxon` |
| Styling | `TailwindCSS v4` + `shadcn/ui` |
| Hooks | `ahooks` (pre-made hooks preferred) |
| Utils | `es-toolkit` (first choice) |
| State (URL) | `nuqs` |
| State (Server) | `TanStack Query` |
| State (Client) | `Jotai` (minimize use) |
| Forms | `@tanstack/react-form` + `zod` |
| Auth | `better-auth` (client SDK only — never import server library or database adapters) |

## Shadcn Workflow

1. Search: `shadcn_search_items_in_registries`
2. Review: `shadcn_get_item_examples_from_registries`
3. Install: `shadcn_get_add_command_for_items`

## Server vs Client Components

- **Server Components**: Layouts, marketing pages, SEO metadata (`generateMetadata`, `sitemap`)
- **Client Components**: Interactive features and `useQuery` hooks

## UI Implementation (Shadcn/UI)

- **Usage**: Prefer strict shadcn primitives (`Card`, `Sheet`, `Typography`, `Table`) over `div` or generic classes.
- **Responsiveness**: Use `Drawer` (mobile) vs `Dialog` (desktop) via `useResponsive`.
- **Customization**: Treat `components/ui/*` as read-only. Create wrappers (e.g., `components/common/ProductButton.tsx`) or use `cva` composition. Never edit `components/ui/button.tsx` directly.

## Sources of Truth

- **Design Tokens**: `packages/design-tokens` (OKLCH) — never hardcode colors
- **i18n strings**: `packages/i18n` — never hardcode UI text
- **Custom utilities**: check `es-toolkit` first; if implementing custom logic, >90% unit test coverage is mandatory

## Designer Collaboration

- **Sync**: Map code variables to Figma layer names
- **UX**: Ensure key actions are visible "Above the Fold"

## How to Execute

1. Follow `resources/execution-protocol.md` step by step.
2. See `resources/examples.md` for input/output examples.
3. Before submitting, run `resources/checklist.md`.

## Execution Protocol (CLI Mode)

Vendor-specific execution protocols are injected automatically by `oma agent:spawn`.
Source files live under `../_shared/runtime/execution-protocols/{vendor}.md`.

## References

- Tech stack & Serena shortcuts: `resources/tech-stack.md`
- Execution steps: `resources/execution-protocol.md`
- Code examples: `resources/examples.md`
- Code snippets: `resources/snippets.md`
- Checklist: `resources/checklist.md`
- Error recovery: `resources/error-playbook.md`
- Component template: `resources/component-template.tsx`
- Tailwind rules: `resources/tailwind-rules.md`
- Context loading: `../_shared/core/context-loading.md`
- Reasoning templates: `../_shared/core/reasoning-templates.md`
- Clarification: `../_shared/core/clarification-protocol.md`
- Context budget: `../_shared/core/context-budget.md`
- Lessons learned: `../_shared/core/lessons-learned.md`

> [!IMPORTANT]
> Treat `components/ui/*` as read-only. Create wrappers for customization.
