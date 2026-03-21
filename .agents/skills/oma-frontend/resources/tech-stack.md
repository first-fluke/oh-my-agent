# Frontend Agent - Tech Stack Reference

## Core Framework
- **Framework**: Next.js 16+ (App Router), React 19+
- **Language**: TypeScript (strict mode)
- **Testing**: Vitest, React Testing Library, Playwright

## Code Standards
- Explicit TypeScript interfaces for props
- Tailwind classes only (no inline styles)
- Semantic HTML with ARIA labels
- Keyboard navigation support

## Project Structure

```
src/
  app/           # Next.js App Router pages
  components/
    ui/          # Reusable primitives (button, card)
    [feature]/   # Feature components
  lib/
    api/         # API clients (TanStack Query hooks)
    hooks/       # Custom hooks
  types/         # TypeScript types
```

## Serena MCP Shortcuts
- `find_symbol("ComponentName")`: Locate existing component
- `get_symbols_overview("src/components")`: List all components
- `find_referencing_symbols("Button")`: Find usages before changes
