# Frontend Agent - Self-Verification Checklist

Check the items that apply to the change before handoff. An item that names a command or tool is a check to select: run it only when the user or the active workflow requires it, and otherwise report it as not verified.

## Next.js 16 Conventions
- [ ] Request-proxy/auth-gate file is named `proxy.ts` (NOT `middleware.ts`) and exports `proxy` (NOT `middleware`)
<!-- oma-docs:ignore-start -->
- [ ] Do NOT flag `src/proxy.ts` as dead code or recommend renaming to `middleware.ts`; `proxy.ts` is the canonical Next.js 16+ convention
<!-- oma-docs:ignore-end -->
- [ ] Config flags use the `Proxy` form (e.g. `skipProxyUrlNormalize`), not the legacy `Middleware` form
- [ ] `<Link>` prefetch follows the project's policy; a link that deviates from it carries an inline reason

## TypeScript
- [ ] Strict mode, no `any` types
- [ ] Explicit interfaces for all component props
- [ ] No TypeScript errors (the check is the project's configured `typecheck` command; preserve framework checks and the selected TypeScript 7/native-preview executable)

## Styling
- [ ] Tailwind CSS only (no inline styles, no CSS modules)
- [ ] Responsive at the task's target breakpoints (default set in `../../../rules/frontend.md` §Performance: 320px, 768px, 1024px, 1440px)
- [ ] Dark mode supported (if project uses it)
- [ ] No hardcoded colors (use Tailwind theme tokens)

## Accessibility (WCAG 2.2 AA)
- [ ] Semantic HTML elements (`<nav>`, `<main>`, `<button>`)
- [ ] All images have alt text
- [ ] Color contrast >= 4.5:1 (normal text), >= 3:1 (large text)
- [ ] Keyboard navigation works for all interactive elements
- [ ] ARIA labels on non-obvious interactive elements
- [ ] Focus indicators visible

## UX States
- [ ] Loading state (skeleton or spinner)
- [ ] Error state (user-friendly message + retry action)
- [ ] Empty state (helpful message + CTA)
- [ ] Optimistic updates where appropriate

## Recommended product-interface review (advisory)

For new or substantially changed admin consoles, dashboards, SaaS product UI,
and internal tools, recommend `oma-design` with Interface Design
`design-review` using [product-interface-review.md](../../oma-design/resources/product-interface-review.md).
Record `completed`, `recommended-not-run` with a reason, or `not-applicable`.
An unavailable or omitted advisory review does not block completion; the task's
required functional, responsive, and accessibility checks still apply.

## Deferred / Stub Markers (transparency)
- [ ] Every deferred external integration is wrapped in `// TODO(oma-deferred): <vendor or feature>`
- [ ] Every mock data block has `// MVP: replace with <real-source>` on top
- [ ] Every save/persist UI has a working storage adapter (localStorage, IndexedDB, or API). Empty `onClick={() => console.log("save")}` does NOT count; wire actual persistence, or mark explicitly: `// TODO(oma-deferred): persist <state> to <storage>`
- [ ] Reload-after-save round-trips state for any save action surfaced in the UI

## React 19 hook patterns (catch what eslint catches)
React 19 + recent `eslint-plugin-react-hooks` flag these as hard errors that break runtime behavior. Patterns and replacements: `snippets.md` §React 19 hook patterns.

- [ ] No synchronous `setState` inside `useEffect` (`react-hooks/set-state-in-effect`): derive in render, use a lazy `useState` initializer, move the update into the triggering event handler, or use `useSyncExternalStore` for external subscriptions.
- [ ] No `ref.current` read during render (`react-hooks/refs`): read refs only inside event handlers or effects; pass the ref object (or a callback ref) to a child that needs the instance.
- [ ] `useEffect` deps complete and stable: list every referenced reactive value; memoize object/array literals so dep identity does not change every render.
- [ ] No prop-mirroring via effect: `useEffect(() => setX(derive(props)))` is always a bug; compute `x` in the render body or memoize.

## Performance
- [ ] No unnecessary re-renders (check with React DevTools Profiler)
- [ ] Memoization matches the project's React Compiler setting: compiler ON (`reactCompiler` in `next.config.*`) → no hand-written `useMemo`/`useCallback`/`React.memo` in new code; compiler OFF → memoize manually (see `tech-stack.md` §React Compiler)
- [ ] Code splitting for route-level components
- [ ] Images optimized and lazy-loaded

## Testing
- [ ] Unit tests for components with logic
- [ ] User interactions tested (click, type, submit)
- [ ] Async behavior tested (loading -> data -> display)
