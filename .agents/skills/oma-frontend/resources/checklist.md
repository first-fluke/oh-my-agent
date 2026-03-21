# Frontend Agent - Self-Verification Checklist

Run through every item before submitting your work.

## TypeScript
- [ ] Strict mode, no `any` types
- [ ] Explicit interfaces for all component props
- [ ] No TypeScript errors (`npx tsc --noEmit`)

## Styling
- [ ] Tailwind CSS only (no inline styles, no CSS modules)
- [ ] Responsive at 320px, 768px, 1024px, 1440px
- [ ] Dark mode supported (if project uses it)
- [ ] No hardcoded colors (use Tailwind theme tokens)

## Accessibility (WCAG 2.1 AA)
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

## Performance
- [ ] No unnecessary re-renders (check with React DevTools Profiler)
- [ ] Code splitting for route-level components
- [ ] Images optimized and lazy-loaded

## Testing
- [ ] Unit tests for components with logic
- [ ] User interactions tested (click, type, submit)
- [ ] Async behavior tested (loading -> data -> display)
