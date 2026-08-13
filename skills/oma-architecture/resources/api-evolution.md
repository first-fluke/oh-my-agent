# API Evolution - Versioning and Deprecation Decision Patterns

> Pattern vocabulary from Microservice API Patterns (MAP - Zimmermann, Stocker, Lübke, Pautasso, Zdun; "Patterns for API Design"). Use in Recommendation or ADR mode when the decision concerns a **published API contract** with consumers the provider does not control. `oma-refactor` routes here when an expand-contract refactoring crosses a published-contract boundary.

## When this file applies
- Choosing a versioning scheme for a public, partner, or cross-team API
- Deciding how long old versions live and how consumers migrate off them
- Writing the ADR for a breaking change to a published contract
- Reviewing an expand-contract plan whose "contract" phase removes something external consumers may use

## Core tension
The provider wants freedom to change; consumers want stability. Every pattern below is a **named position on that tradeoff**. An API evolution ADR must state which guarantee is being sold, to whom, and when it expires - Hyrum's Law means anything observable is part of the de-facto contract regardless of what the docs promise.

## Versioning patterns
| Pattern | Decision | Notes |
|---------|----------|-------|
| Version Identifier | Make the version explicit in the contract (URL path, media type, header, or payload field) | Prerequisite for every lifecycle pattern below; "no version marker" is itself a decision (forces Eternal Lifetime or breakage) |
| Semantic Versioning | MAJOR.MINOR.PATCH signals whether a change breaks, extends, or fixes | Only MAJOR needs a migration decision; publish the compatibility rules, not just the numbers |

## Lifecycle guarantee patterns
| Pattern | Promise to consumers | Choose when |
|---------|----------------------|-------------|
| Experimental Preview | None - may change or vanish without notice | Pre-GA feedback gathering; keeps early adopters off your back-compat hook |
| Aggressive Obsolescence | Old versions deprecated quickly with published sunset dates | Provider velocity dominates; few, reachable consumers |
| Limited Lifetime Guarantee | Each version supported for a fixed window (e.g., 24 months from publication) | B2B defaults; lets consumers budget migrations |
| Two in Production | Exactly N (typically 2) versions live concurrently; shipping version N+1 retires N-1 | Rolling migration with a bounded support burden - the workhorse for internal and partner APIs |
| Eternal Lifetime Guarantee | Published contracts never break | Huge or unknown consumer base (public web APIs); the most expensive promise - make it deliberately or not at all |

## Decision guidance
- Internal service-to-service default: **Two in Production + Semantic Versioning + Version Identifier**. It bounds support cost while never forcing a consumer to migrate under fire.
- Deprecation is a protocol, not an event: announce with sunset date -> run old+new concurrently (the expand phase) -> drive migration with telemetry on old-version traffic -> contract only when traffic is zero or the sunset date passes, whichever the guarantee dictates.
- The guarantee is set at **publication time**: retrofitting a shorter lifetime onto an already-published version is itself a breaking change to the meta-contract.
- Telemetry precondition: if you cannot measure per-version consumer traffic, you cannot safely run anything more aggressive than Eternal Lifetime - instrument first.
- The wider MAP catalog (foundation, responsibility, structure, and quality patterns: Pagination, Wish List, Rate Limit, API Key, ...) covers API *design*; this file deliberately scopes to *evolution*, which is where refactoring and architecture meet.

## ADR checklist for a published-contract change
- What lifetime guarantee did the old version's publication imply (explicitly or by Hyrum)?
- Who consumes it today (telemetry, not assumption), and what is migration cost per consumer class?
- Which lifecycle pattern governs the transition, and what are the announced sunset dates and channels?
- Can old and new run concurrently during migration (Two in Production / expand phase), and what is the rollback path?
- How will old-version traffic be monitored to zero before the contract phase?
