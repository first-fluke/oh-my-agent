# Frontend Agent - Tech Stack Reference

## Core Framework
- **Framework**: Next.js 16+ (App Router), React 19+
- **Language**: TypeScript (strict mode)
- **Testing**: Vitest, React Testing Library, Playwright

## Next.js 16 Conventions

### Proxy replaces Middleware

`middleware.ts` is **BANNED** in this project. It is NOT merely deprecated — touch it and you die. No exceptions.

- File: `middleware.ts` → `proxy.ts` (root or `src/`)
- Exported function: `middleware` → `proxy`
- Config flags: `skipMiddlewareUrlNormalize` → `skipProxyUrlNormalize`, etc.
- `src/proxy.ts` is the canonical request-proxy / auth-gate location

Forbidden actions (any of these is a fatal self-error — retract immediately):

- Creating a new `middleware.ts`
- Suggesting a rename of `proxy.ts` back to `middleware.ts`
- Flagging `proxy.ts` as dead code, unused, or not-wired

Reference: https://nextjs.org/docs/messages/middleware-to-proxy

## Serena MCP Shortcuts
- `find_symbol("ComponentName")` — locate existing component
- `get_symbols_overview("src/components")` — list all components
- `find_referencing_symbols("Button")` — find usages before changes
