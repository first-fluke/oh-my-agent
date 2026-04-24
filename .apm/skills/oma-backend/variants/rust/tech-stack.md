# Backend Agent - Tech Stack Reference (Rust)

## Primary Stack
- **Language**: Rust (latest stable)
- **Framework**: Axum 0.8+ (preferred) or Actix-web 4+
- **ORM/Query**: SQLx 0.8+ (compile-time checked queries) or SeaORM
- **Validation**: validator crate + serde
- **Database**: PostgreSQL 16+, Redis 7+
- **Auth**: jsonwebtoken, argon2/bcrypt
- **Testing**: cargo test, axum-test / actix-rt
- **Migrations**: SQLx migrate or sea-orm-migration
- **Async Runtime**: Tokio

## Architecture
```
src/
  handlers/         # HTTP handlers (thin, delegate to services)
  services/         # Business logic
  repositories/     # Database access
  models/           # Domain models and DB entities
  extractors/       # Custom Axum extractors (auth, validation)
  error.rs          # Centralized error types
  main.rs           # Router setup and server start
```

## Security Requirements
- Password hashing: argon2 (preferred) or bcrypt
- JWT: 15min access tokens, 7 day refresh tokens
- Rate limiting via tower middleware
- Input validation with serde + validator
- Compile-time query checking with SQLx

## Linter/Formatter
- **clippy**: lint warnings treated as errors
- **rustfmt**: consistent formatting
- **cargo audit**: dependency vulnerability scanning
