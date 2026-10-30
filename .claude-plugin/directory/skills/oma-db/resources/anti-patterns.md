# DB Agent - Anti-Pattern Review Guide

Use this file for DB review, schema/query critique, remediation, or changes involving business logic in DB objects or ORM hooks. Review the affected scope; a query/index task does not require a database-wide inventory or rewrite.

## 1. ISO 27001 / 27002 / 22301-Oriented Suggestions

When any of the following are weak or absent, recommend improvements explicitly:

- access control and least privilege
- encryption in transit and at rest
- audit logging for privileged or sensitive data changes
- backup, restore drill, and retention evidence
- data classification and PII handling
- schema change management and migration traceability
- secure credential handling
- deletion and archive controls for cold data
- privileged access review and segregation of duties
- secure configuration baselines and hardening guidance
- business continuity planning assumptions for critical databases
- recovery objectives such as RTO / RPO and restore evidence
- failover, redundancy, and backup dependency visibility

## 2. Logical Design

- **CSV in one column**
  - Smell: comma-separated IDs/tags/statuses stored in `VARCHAR`
  - Fix: separate dependent table or junction table for many-to-many
- **Naive tree**
  - Smell: `parent_id` only, but complex subtree queries and moves are required
  - Fix: choose the tree model that matches the workload and relationship semantics
- **Surrogate-key obsession**
  - Smell: every table gets generic `id` without regard to natural/composite identity
  - Fix: use natural key or composite key when it models the domain better; prefer descriptive PK names like `bug_id`
- **Missing foreign keys**
  - Smell: referential integrity delegated to application code
  - Fix: add FK constraints and let the DB reject invalid references
- **EAV**
  - Smell: generic `entity_id`, `attr_name`, `attr_value`
  - Fix: use subtype modeling, JSON only when true schema flexibility is required
- **Polymorphic association**
  - Smell: one FK-like column can point to multiple parent tables
  - Fix: simplify relationships, use junction tables, or introduce a shared supertype
- **Repeated columns for multi-value attributes**
  - Smell: `tag1`, `tag2`, `tag3`
  - Fix: store one value per row in a dependent table
- **Metadata as schema**
  - Smell: table names or column names encode data values such as year or tenant
  - Fix: use partitioning, proper normalization, or vertical split

## 3. Physical Design

- **Floating-point money**
  - Smell: `FLOAT/REAL/DOUBLE` for currency or exact quantities
  - Fix: use `NUMERIC/DECIMAL`
- **Hard-coded enum in schema without governance**
  - Smell: volatile code sets trapped inside enum/check definitions
  - Fix: use reference tables when values are expected to evolve
- **Ghost file**
  - Smell: DB stores only file path while lifecycle, backup, authorization, and restore are unmanaged
  - Fix: use BLOB/object storage only with clear lifecycle, permissions, and backup/restore design
- **Index shotgun**
  - Smell: indexes created by guesswork or duplicated heavily
  - Fix: MENTOR the indexes:
    - Measure
    - Explain
    - Nominate
    - Test
    - Optimize
    - Rebuild

## 4. Query Design

- **NULL misuse**
  - Smell: NULL treated like a normal value or fake defaults used instead of NULL
  - Fix: use `IS NULL`, `IS NOT NULL`, `COALESCE`, and proper nullability semantics
- **Ambiguous grouping**
  - Smell: non-grouped columns selected beside aggregates
  - Fix: obey the single-value rule or rewrite with proper subqueries/window logic
- **Random sort**
  - Smell: `ORDER BY RAND()` on large tables
  - Fix: choose a sampling strategy that avoids full random sort
- **Poor-man's search engine**
  - Smell: broad `%keyword%` or regex search on large text
  - Fix: use full-text indexing or a dedicated search engine
- **Spaghetti query**
  - Smell: forcing every rule into one giant SQL statement
  - Fix: split into stages or multiple queries when it improves correctness and maintainability
- **Implicit columns**
  - Smell: `SELECT *` in production paths
  - Fix: list required columns explicitly

## 5. Application Integration

### Application Ownership Policy

Strongly recommend managing business decisions, workflow orchestration, and external side effects explicitly in application domain/services and jobs. Apply this recommendation to **new and existing** implementations, including triggers, stored procedures, stored functions, views, DB events/schedulers, and ORM hooks/entity listeners. This is a design default, not a blanket ban on those mechanisms.

For each affected existing implementation, identify its callers and writers, explain the risk, recommend a concrete replacement, and state the transition priority. Existing usage or convention alone is not a reason to retain it. If retention is justified, record the application alternative, the technical reason (such as atomicity across writers, measured performance, or audit requirements), and the relevant tests, privileges, deployment, and recovery approach. Recommend a staged transition when replacement is appropriate; implementation remains within the authorized scope.

### Patterns to Improve

| Pattern and failure mechanism | Strongly recommended alternative |
| --- | --- |
| Business policy in triggers, procedures, functions, views, or large `CASE` expressions: pricing, fees, eligibility, visibility, and approval rules become duplicated or tied to DB deployments | Give the policy an application owner and tests; version changing policies with effective dates and record the version/inputs used for decisions that must be reproduced |
| Implicit workflow: setting a status or saving an entity silently triggers payment, approval, shipment, or chained writes | Use explicit commands, validated state transitions, and service orchestration; moving the same hidden behavior into ORM hooks is not an improvement |
| External I/O inside DB execution, or a DB commit followed by an independent broker/API write: failures leave partial effects that rollback cannot undo | Record the integration event in an outbox in the same transaction as business data; publish through a worker with idempotency and bounded retry, and define compensation for partial external success |
| Business scheduling in DB events/jobs without execution ownership: settlement, expiry, and notifications lack retry limits, checkpoints, or failure visibility | Manage execution in an application job/workflow with observable runs and recovery; validate deadlines at action time rather than trusting a delayed expiry batch |
| Trigger-driven cache/search synchronization or cross-system projections without replay/reconciliation | Use explicit events or CDC with consumer deduplication, ordering requirements, lag monitoring, replay, and reconciliation |
| Policy bypass through multiple writers or procedures that modify another service's tables | Identify API, batch, admin, import, and direct SQL writers; align write permissions and policy enforcement, and use the owning service's API/events across service boundaries |
| Cascading deletion of independently owned objects or trigger-driven soft delete without retention/restore rules | Manage deletion intent, authorization, retention, and restoration in the application; define explicit coordination across ownership boundaries |
| Business authorization and audit context hidden in DB session state or routines | Give business authorization and action intent an application owner; propagate verified actor/tenant context and record decision reasons, while preserving DB enforcement and DB change/access audit |

### Database Responsibilities to Preserve

- Keep declarative integrity (`PK`, `FK`, `UNIQUE`, `CHECK`, `NOT NULL`, and exclusion constraints where supported), atomic conditional updates, transaction boundaries, isolation, and locking. Application prechecks alone cannot enforce invariants under concurrent or independent writes.
- Preserve RLS and DB privileges where they enforce access restrictions; RLS can be the primary enforcement point. Verify the connection roles, bypass privileges, and actor/tenant context rather than replacing RLS with application filtering.
- Keep DB access/change audit where required. Application business audit does not cover every direct SQL, administrator, or batch change. Audit triggers can be justified, but their coverage and privileged bypass limits must be explicit.
- `ON DELETE CASCADE` can be appropriate for dependent components with the same lifecycle. Flag cascades across independent ownership or retention boundaries, rather than treating every cascade as an anti-pattern.
- Keep efficient joins, aggregates, pure SQL functions/views, generated values, and set-based bulk operations in the DB where appropriate. Application ownership of a job does not require fetching all rows into an application loop. DB-local summaries or routines may be retained with correctness and performance evidence.
- Backup, replication, vacuum/statistics, partition maintenance, and storage TTL remain database operations. Separate physical cleanup from business expiry and retention decisions.
- CDC transports committed changes; it does not automatically supply the business intent of a domain event. An application can write an outbox and use CDC to publish it. Neither approach removes the need to handle duplicates, ordering, or consumer recovery.

For an accepted transition, use `resources/migration-playbook.md` §Moving Business Logic into the Application. Preserve all writers and invariants, and prevent the old and new paths from executing the same external effect twice.

### Other Integration Anti-Patterns

- **Readable passwords**
  - Smell: plaintext or reversibly encrypted passwords
  - Fix: salted one-way hash, secure transport, no password recovery by disclosure
- **SQL injection**
  - Smell: unchecked input concatenated into SQL
  - Fix: parameterized queries, allowlists for dynamic clauses, code review
- **Surrogate-key gap paranoia**
  - Smell: trying to fill deleted ID gaps
  - Fix: treat surrogate keys as identifiers, not row numbers
- **Ignoring DB return values and executed SQL**
  - Smell: no error handling or no visibility into actual SQL
  - Fix: inspect execution results, logs, and emitted SQL
- **SQL exempt from engineering discipline**
  - Smell: no version control, no tests, no review, no documentation
  - Fix: treat DB artifacts like code
- **Active Record leakage**
  - Smell: controllers calling persistence methods directly
  - Fix: keep service/repository boundaries and avoid mixing UI flow with DB access

## 6. Vector Retrieval / RAG

- **Treating vector DB as a drop-in search replacement**
  - Smell: lexical search removed entirely after adding embeddings
  - Fix: default to hybrid retrieval; combine keyword/BM25, metadata filters, ANN, and reranking
- **Embedding everything without a versioning strategy**
  - Smell: multiple models/dimensions/chunk rules with no metadata or migration plan
  - Fix: version embeddings like schema, store model/config metadata, and support rolling re-embedding
- **Ignoring chunking strategy**
  - Smell: fixed-size chunks and naive splitting regardless of document structure
  - Fix: use document-aware chunking, overlap, and hierarchical structure where needed
- **Blind ANN defaults**
  - Smell: HNSW/IVF/PQ defaults used without recall-latency benchmarking
  - Fix: benchmark real workloads and tune ANN parameters deliberately
- **Assuming metadata filtering scales for free**
  - Smell: high-cardinality filters piled onto vector search with no partition strategy
  - Fix: design pre-segmentation, partitioned indexes, or tenant-specific collections where justified
- **Unplanned real-time writes**
  - Smell: continuous inserts degrade recall and latency over time
  - Fix: design buffers, compaction, tiered indexing, and ingestion/search separation
- **Storing raw documents in vector DB**
  - Smell: vector DB becomes source of truth for full documents
  - Fix: keep canonical docs in object store or primary DB and store references in vector DB
- **No retrieval observability**
  - Smell: only infra metrics exist; no recall or semantic drift monitoring
  - Fix: add golden queries, offline evaluation, drift tracking, and token-waste monitoring
- **Over-trusting similarity scores**
  - Smell: one cosine threshold is treated as universally meaningful
  - Fix: calibrate per domain/model and use reranking for precision-sensitive cases
- **Believing vector DB equals RAG architecture**
  - Smell: only index layer is optimized while chunking, orchestration, and feedback loop are ignored
  - Fix: treat retrieval as a pipeline, not a single database decision
