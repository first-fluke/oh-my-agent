# DB Agent - Query Tuning & Index Design Guide

Use this file when the task involves slow queries, execution plans, index selection, or query rewrites. Anti-pattern smells (`SELECT *`, `ORDER BY RAND()`, poor-man's search) live in `resources/anti-patterns.md`; this file owns the tuning method.

## Triage Order

Never tune from guesswork. Follow MENTOR (Measure, Explain, Nominate, Test, Optimize, Rebuild) concretely:

1. **Measure** - find the actual offender
   - PostgreSQL: `pg_stat_statements` by total/mean time; MySQL: slow query log / `performance_schema`
   - Rank by total time, not just per-call time: a 10ms query at 1k QPS beats a 2s report query
2. **Explain** - read the real plan
   - PostgreSQL: `EXPLAIN (ANALYZE, BUFFERS)`; MySQL: `EXPLAIN ANALYZE`
   - Run with production-representative parameters; plans change with parameter selectivity
3. **Nominate** - identify the dominant cost node before changing anything
4. **Test** - reproduce the slowness on production-like data volume
5. **Optimize** - index, rewrite, or schema change (in that order of preference)
6. **Rebuild** - re-measure p95/p99 after the change, not just the single-run time

## Reading a Plan

Look for these, roughly in order:

- **Estimate vs actual row mismatch** (e.g. estimated 100, actual 2M): stale statistics or correlated columns -> `ANALYZE` the table, consider extended statistics; a fix based on a wrong estimate fixes nothing
- **The most expensive node**: tune the node that dominates total time, not the first scan you see
- **Seq Scan on a large table** with a selective filter: missing or unusable index
- **Index Scan with a large `Filter:` line**: the index matches only part of the predicate; the rest is filtered row-by-row -> extend the index (`Index Cond` good, `Filter` suspicious)
- **Nested Loop over many outer rows** with an inner Seq Scan: usually a missing index on the join key
- **Sort spilling to disk** (`external merge`): missing index for `ORDER BY`, or work_mem-class tuning question
- **Repeated identical subplan execution**: correlated subquery to rewrite as join or lateral

## Index Design Heuristics

- **Composite column order**: equality predicates first, then the range/sort column. `WHERE tenant_id = ? AND created_at > ?` wants `(tenant_id, created_at)`, not the reverse
- **Leftmost prefix rule**: a composite index serves queries filtering on its leading columns only
- **Selectivity**: index columns that narrow rows sharply; a standalone index on a low-cardinality column (status, boolean) rarely helps — combine it into a composite or use a partial index
- **Covering / index-only**: include the selected columns (`INCLUDE` / suffix columns) so hot queries never touch the heap
- **Partial indexes** for skewed predicates: `WHERE status = 'PENDING'` when 99% of rows are done
- **Functional indexes** when queries filter on an expression (`lower(email)`) — or make the predicate sargable instead
- **Index every FK** used in joins or cascading deletes; missing FK indexes cause seq-scan deletes and lock storms
- Every index taxes writes and storage: after adding, check for now-redundant indexes (see index shotgun in `resources/anti-patterns.md`) and drop unused ones using index usage stats

## Rewrite Patterns

- **Sargability**: never wrap the indexed column in a function or cast in the predicate; move the transformation to the constant side (`created_at >= date '2026-01-01'`, not `date(created_at) = ...`)
- **Keyset pagination** over `OFFSET`: `WHERE (created_at, id) < (?, ?) ORDER BY created_at DESC, id DESC LIMIT n`; OFFSET scans and discards everything it skips
- **`OR` across different columns** often blocks index use: split into `UNION ALL` of index-friendly branches
- **`EXISTS` vs `IN`**: prefer `EXISTS` for correlated membership checks against large subquery results
- **Batch `IN` lists** instead of N+1 single-row queries from the application (see `oma-observability` DB span conventions for detecting N+1)
- **Pre-aggregate** heavy repeated reporting queries into materialized/summary tables instead of tuning an inherently large scan

## Verification

- Compare before/after with `EXPLAIN (ANALYZE, BUFFERS)` on the same data and parameters; record both plans
- Watch p95/p99 under concurrency, not a single warm-cache run
- Check plan stability across parameter values (skewed tenants, empty vs huge accounts)
- Confirm write-path latency did not regress after adding indexes
