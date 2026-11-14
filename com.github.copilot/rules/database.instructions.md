---
description: Database schema design, normalization, indexing, and integrity
  standards for SQL, NoSQL, and vector databases
applyTo: "**/*.{sql,prisma}"
---

# Database Standards

## Core Rules

1. Choose model first, engine second: workload, access pattern, consistency, and scale drive DB selection.
2. For relational workloads, enforce at least **3NF** by default. Break 3NF only with explicit performance justification.
3. For distributed/non-relational workloads, model around aggregates and access paths; document **BASE** and consistency tradeoffs.
4. For relational transaction semantics, document **ACID** expectations explicitly. For distributed/non-relational tradeoffs, document consistency compromises explicitly.
5. For full schema design, document external, conceptual and internal schema views. For a scoped index/query/model change, update only the affected existing views.
6. Treat integrity as first-class: entity, domain, referential, and business-rule integrity must be explicit.
7. Concurrency is never implicit: define transaction boundaries, locking strategy, and isolation level per critical flow.
8. Apply existing data standards; add relevant naming, definition, format and validation rules for newly modeled data.
9. Update affected existing glossary, decision and capacity artifacts when the change alters their assumptions. A query-only task does not require new modeling documents.
10. Proactively flag anti-patterns and insecure shortcuts instead of silently implementing them.
11. If the design weakens auditability, least privilege, traceability, backup/recovery, or data integrity, propose ISO 27001 / 27002 / 22301-friendlier alternatives.
12. Vector DBs are retrieval infrastructure, not source-of-truth databases. Store embeddings and lightweight metadata there; keep canonical documents elsewhere.
13. Never treat vector search as a drop-in replacement for lexical search. Default to hybrid retrieval when exact match, compliance filtering, or explainability matters.
14. Embeddings are schema-like assets: version model, dimension, chunking, and preprocessing, and plan re-embedding migrations explicitly.
15. Retrieval quality is won at chunking, filtering, reranking, and observability, not only at the vector index layer.
16. Schema or data changes on live tables follow expand-contract (parallel change): additive expand, dual-write + batched backfill, verified read switch, delayed contract. DDL on hot tables is lock-aware with timeouts; destructive steps ship in a separate deploy after a soak window.
17. Query tuning starts from measurement and execution plans, never guesswork: measure, explain, nominate the dominant cost node, then optimize and re-measure.
18. Strongly recommend explicit application ownership of business policies, workflows, and external side effects in both new and existing triggers, stored procedures/functions, views, DB jobs, and ORM hooks. For affected existing logic, give a concrete alternative and transition priority; existing convention alone does not justify retention. Use `.agents/skills/oma-db/resources/anti-patterns.md` §5 for review and technical retention criteria. This is a strong recommendation, not a blanket feature ban or authorization for an unrelated rewrite.
19. Preserve DB integrity constraints, atomic updates, transactions/isolation/locking, RLS and privileges, DB audit, justified dependent cascades, and efficient set-based operations. For an accepted transition, follow `.agents/skills/oma-db/resources/migration-playbook.md` to cover every writer, prevent duplicate side effects, and define rollback.
