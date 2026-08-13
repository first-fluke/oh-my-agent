# DB Agent - Execution Protocol

## Step 0: Prepare
1. **Assess difficulty**: see `../../_shared/core/difficulty-guide.md`
   - **Simple**: small schema adjustment or index review
   - **Medium**: new bounded context, migration, or backup/capacity update
   - **Complex**: engine selection, major redesign, multi-tenant or high-scale workload
2. **Clarify workload**
   - Functional flows, critical queries, write/read ratio, peak TPS, retention, RPO, RTO
   - Compliance or audit constraints, PII, multi-region, reporting needs
3. **Budget context**: follow `../../_shared/core/context-budget.md`
4. **If vector search is involved**, read `resources/vector-db.md`
5. **If security, audit, backup, or resilience requirements are central**, read `resources/iso-controls.md`
6. **If a schema or data change targets live tables**, read `resources/migration-playbook.md`
7. **If slow queries, execution plans, or index selection are in scope**, read `resources/query-tuning.md`

## Step 1: Explore
- Identify actors and external views that need data
- Capture entities, aggregates, reference data, events, and lifecycle states
- List access patterns:
  - point lookup
  - range scan
  - aggregation/reporting
  - full-text/search
  - semantic retrieval / RAG
  - batch ingestion
- Decide relational vs non-relational:
  - Prefer relational when joins, strong integrity, and transactional consistency dominate
  - Prefer NoSQL when aggregate reads/writes, massive scale, flexible schema, or distribution tolerance dominate
  - Prefer a graph model only when variable-depth traversals or relationship-pattern queries dominate the workload; adjacency (`parent_id`, junction tables) in a relational engine handles shallow, fixed-depth traversals fine
  - Prefer vector retrieval only for semantic similarity workloads; do not replace keyword/search engines blindly
- Screen for anti-pattern signals early:
  - comma-separated values in one column
  - tag1/tag2/tag3 style multi-column attributes
  - generic EAV tables
  - polymorphic foreign keys
  - missing FK constraints
  - blind surrogate-key usage
- Record assumptions and open risks
- If vector retrieval is needed, define:
  - hybrid vs pure vector retrieval
  - exact-filter requirements
  - embedding model and dimension
  - chunking strategy
  - reranking need

## Step 2: Design
- Produce **external schema**:
  - user-facing views, APIs, reports, or producer/consumer contracts
- Produce **conceptual schema**:
  - entities/aggregates, relationships, cardinality, optionality, ownership
- Produce **internal schema**:
  - tables/collections, keys, indexes, partitions, tablespaces, storage layout
- SQL path:
  - normalize to **3NF** minimum
  - define PK, FK, unique, check, default, nullability
  - document transaction boundaries and target isolation level
- NoSQL path:
  - model around access patterns and aggregate boundaries
  - define sharding/partition keys, secondary indexes, TTL, duplication policy
  - document consistency model, conflict strategy, and repair/reconciliation approach
- Graph path:
  - model nodes/edges from the traversal questions the business actually asks, not from the ERD
  - define edge direction, cardinality, and properties; decide which lookups still need secondary indexes on node properties
  - document traversal depth expectations and whether the engine's strength (index-free adjacency) is actually exercised
  - keep source-of-truth entities in the primary store when the graph is a derived projection; document the sync path
- Vector path:
  - define embedding model, dimension, normalization, and metadata versioning
  - define chunking policy, overlap, and document-type-specific chunk rules
  - design hybrid retrieval: lexical + ANN + metadata filtering + reranking
  - define canonical document store vs vector index boundary
  - document ANN index choice and key tuning parameters
- Apply data standards:
  - naming, definition, format, code set, validation rule
- Review security/compliance posture:
  - least privilege support
  - audit trail needs
  - encryption at rest / in transit expectations
  - backup/restore traceability
  - retention and deletion obligations
  - control guidance alignment for ISO 27001 / 27002
  - continuity and recovery alignment for ISO 22301

## Step 3: Optimize
- Validate hot paths against indexes and partitions; tune with `resources/query-tuning.md` (measure -> explain -> nominate -> test, never guesswork)
- If optimization requires schema changes on live tables, plan them via `resources/migration-playbook.md` (expand-contract, lock-aware DDL, batched backfill)
- For vector systems:
  - benchmark recall vs latency on production-like queries
  - measure ANN parameter tradeoffs, filter pushdown cost, and write amplification
  - design re-embedding and shadow-index migration flow
  - separate ingestion/search clusters or hot/cold vector tiers when write load is high
- Separate hot and cold data:
  - recent operational data stays online
  - historical/archive data moves to cheaper storage or archive partitions
- Define backup and recovery:
  - full backup cadence
  - incremental backup cadence
  - retention window
  - restore validation frequency
- Review anti-patterns in five buckets:
  - logical design
  - physical design
  - query design
  - application integration
  - vector retrieval / RAG
- Update capacity estimation:
  - object-by-object volume
  - tablespace/storage allocation
  - disk estimate
  - online workload
  - batch workload
  - backup volume

## Step 4: Verify
- Run `resources/checklist.md`
- Confirm every schema change updated:
  - glossary
  - standards table
  - capacity estimate
  - backup/recovery notes
- For vector systems, confirm updated:
  - embedding version metadata
  - chunking policy
  - retrieval evaluation set
  - re-index / re-embedding migration notes
- Confirm anti-pattern findings were either fixed or explicitly accepted with rationale
- Call out ISO 27001 / 27002-relevant risks and recommended controls when applicable
- Call out ISO 22301-relevant continuity and recovery gaps when applicable
- Call out any intentional denormalization or weaker consistency with reason

## On Error
See `resources/error-playbook.md` for recovery steps.
