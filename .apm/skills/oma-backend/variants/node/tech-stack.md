# Backend Agent - Tech Stack Reference (Node.js)

## Primary Stack
- **Runtime**: Node.js 22+ / Bun 1.2+
- **Language**: TypeScript 5.x (strict mode)
- **Framework**: NestJS 11+ or Hono 4+
- **ORM**: Prisma 6+ or Drizzle ORM
- **Validation**: Zod
- **Database**: PostgreSQL 16+, Redis 7+
- **Auth**: jsonwebtoken, bcrypt
- **Testing**: Vitest, Supertest
- **Migrations**: Prisma Migrate or Drizzle Kit

## Architecture
```
src/
  modules/          # Feature modules (NestJS) or routes (Hono)
  common/           # Shared guards, pipes, interceptors
  prisma/           # Prisma client and schema
```

## Security Requirements
- Password hashing: bcrypt (cost factor 10-12)
- JWT: 15min access tokens, 7 day refresh tokens
- Rate limiting on auth endpoints
- Input validation with Zod schemas
- Parameterized queries via ORM (never raw string interpolation)

## Linter/Formatter
- **ESLint**: with @typescript-eslint
- **Prettier**: consistent formatting
- **Biome**: alternative all-in-one (lint + format)
