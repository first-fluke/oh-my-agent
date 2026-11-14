# Backend Agent - Tech Stack Reference (Node.js)

## Primary Stack
- **Runtime**: Node.js 22.12+ / Bun 1.2+
- **Language**: TypeScript 5.4+ (strict mode)
- **Framework**: NestJS 11+
- **ORM**: Prisma 7 (install `prisma@7` and `@prisma/client@7`; `prisma-client` generator with a driver adapter; connection URL in `prisma.config.ts`)
- **Validation**: Zod 4+
- **Type utilities**: type-fest (`SetRequired`, `Merge`, `JsonValue`, `Promisable`, etc.; prefer over hand-rolled conditional-type gymnastics)
- **Database**: PostgreSQL 16+, Redis 7+
- **Auth**: jsonwebtoken, argon2 (node-argon2)
- **Testing**: Vitest, Supertest
- **Migrations**: Prisma Migrate

## Architecture
```
src/
  modules/          # Feature modules (controller, service, repository, DTOs)
  common/           # Shared guards, pipes, filters, errors
  prisma/           # PrismaService and PrismaModule
  generated/prisma/ # Generated Prisma Client
prisma/
  schema.prisma     # Data model
prisma.config.ts    # Schema path and datasource URL
```

## Security Requirements
- Password hashing: Argon2id via `argon2` (bcrypt cost 10-12 acceptable for legacy compatibility)
- JWT: 15min access tokens, 7 day refresh tokens
- Rate limiting on auth endpoints
- Input validation with Zod schemas
- Parameterized queries via ORM (never raw string interpolation)

## Linter/Formatter
- **ESLint**: with @typescript-eslint
- **Prettier**: consistent formatting
- **Biome**: alternative all-in-one (lint + format)
