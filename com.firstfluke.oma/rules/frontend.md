---
description: React/Next.js frontend coding standards with shadcn/ui, Tailwind CSS v4, and FSD-lite architecture
globs: "**/*.{tsx,jsx,css,scss}"
alwaysApply: false
---

# Frontend Coding Standards

## Core Rules

Apply framework-specific rules only to that framework. Existing project choices take precedence over starter defaults; scoped changes do not authorize migrations.

1. **Component Reuse**: Use `shadcn/ui` components first. Extend via `cva` variants or composition. Avoid custom CSS.
2. **Design Fidelity**: Code must map 1:1 to `DESIGN.md` (Section 9 — Agent Prompt Guide) and Design Tokens. Resolve discrepancies before implementation.
3. **Rendering Strategy**: Default to Server Components for performance. Use Client Components only for interactivity and API integration.
4. **Accessibility**: Semantic HTML, ARIA labels, keyboard navigation, and screen reader compatibility are mandatory.
5. **Tool First**: Check for existing solutions and tools before coding.
7. **Request proxy convention**: when the target project uses Next.js 16+ with `proxy.ts`, preserve that convention. Check the installed framework version and routing before recommending a file rename. Diagnose wiring from code and tests.
7. **No Prop Drilling**: Avoid passing props beyond 3 levels. Use the project's client-state library (Jotai atoms or a Zustand store — see oma-frontend `resources/tech-stack.md`) instead. Avoid React Context.
8. **Auth Boundary**: Client code must not import database adapters or server-only auth code. Keep server-side application logic in the project's existing server boundary.
9. **Animation library**: preserve the project's existing animation library for scoped edits. For new motion-based implementations, use the `motion` package and `motion/react` imports. Respect reduced-motion preferences.
10. **Framework version**: preserve the installed framework and dependency ranges for scoped changes. Select versions when scaffolding or when an upgrade is explicitly requested; do not upgrade an existing app to satisfy a starter default.

## Architecture (FSD-lite)

- **Root (`src/`)**: Shared logic (components, lib, types). Hoist common code here.
- **Feature (`src/features/*/`)**: Feature-specific logic. **No cross-feature imports.** Unidirectional flow only.

```
src/features/[feature]/
├── components/           # Feature UI components
│   └── skeleton/         # Loading skeleton components
├── types/                # Feature-specific type definitions
└── utils/                # Feature-specific utilities & helpers
```

## Naming Conventions

### Symbols

- Components/Types/Interfaces: `PascalCase`
- Functions/Vars/Hooks: `camelCase`
- Constants: `SCREAMING_SNAKE_CASE`
- Imports: Absolute `@/` is MANDATORY (no relative `../../`)
- MUST use `import type` for interfaces/types

### File Naming — self-describing names

**Principle: the filename alone must answer "what domain + what role". If a reader has to open the file to know what it is, the name is wrong.**

All files are `kebab-case`. Components use `<domain>-<ui-role>.tsx`; non-component modules use `<domain>.<kind>.ts`.

| Kind | Pattern | Example |
|------|---------|---------|
| Component | `<domain>-<ui-role>.tsx` | `order-summary-card.tsx` → `OrderSummaryCard` |
| Skeleton | `<component>-skeleton.tsx` | `order-summary-card-skeleton.tsx` |
| Hook | `use-<behavior>.ts` | `use-order-polling.ts` |
| TanStack Query | `<domain>.queries.ts` / `<domain>.mutations.ts` | `orders.queries.ts` |
| Jotai atoms | `<domain>.atoms.ts` | `cart.atoms.ts` |
| Zustand store | `<domain>.store.ts` | `cart.store.ts` |
| Zod schema | `<domain>.schema.ts` | `checkout.schema.ts` |
| Types | `<domain>.types.ts` | `order.types.ts` |
| Constants | `<domain>.constants.ts` | `payment.constants.ts` |
| API client | `<domain>.api.ts` | `orders.api.ts` |
| Utility | one capability per file, named as a verb phrase | `format-price.ts`, `parse-tracking-number.ts` |
| Test | colocated `<target>.test.ts(x)` | `format-price.test.ts` |

Rules:

1. **Filename = kebab-case of the main export.** One main export per file; `order-summary-card.tsx` exports `OrderSummaryCard`.
2. **Keep the domain in the name even inside a feature directory.** Editor tabs and search results show only the basename — `cart-summary-card.tsx`, not `summary-card.tsx` inside `features/cart/components/`.
3. **`index.ts` only as a feature public-API barrel** (`src/features/<feature>/index.ts`). Never `index.tsx` as a component file.
4. **Grab-bag filenames are BANNED**: `utils.ts`, `helpers.ts`, `common.ts`, `misc.ts`, `data.ts`, `styles.ts`, and bare `types.ts` / `constants.ts` / `hooks.ts` without a domain prefix. Split them by domain or capability instead.
5. **Version/status suffixes are BANNED**: `*-v2`, `*-new`, `*-old`, `*-final`, `*-copy`, `*-refactored`. Git owns history, not filenames.
6. **No abbreviations** beyond universally known ones (`api`, `db`, `i18n`, `a11y`): `user-profile-card.tsx`, never `usr-prf-crd.tsx`.

## Performance

- Target First Contentful Paint (FCP) < 1s
- Use `next/dynamic` for heavy components, `next/image` for media
- Responsive Breakpoints: 320px, 768px, 1024px, 1440px
