# Measurement - Four Layers + Commands

> Operationalizes target selection and effect verification. All values are diagnostic proxies (Goodhart) - never evaluation KPIs.

## Layer 1 - Static structure: "where change is hard"

| Metric | Reading | Thresholds |
|--------|---------|-----------|
| McCabe V(G) = E - N + 2P (~ branch points + 1) | Min. test-case lower bound for branch coverage | <=10 ok / 11-20 caution / 21-50 high risk / 50+ untestable |
| Cognitive Complexity | Human reading difficulty (nesting-weighted) | Primary indicator for the readability objective |
| CK suite (CBO, LCOM, WMC) | Coupling/cohesion at class/module boundary | Triggers for Move/Extract Class |
| Duplication % | Token/AST clone ratio | Duplicate Code smell, quantified |

```bash
# radon and lizard are PyPI packages — run via uvx (no install needed).
# Python
uvx radon cc -s -a <path>      # cyclomatic
uvx lizard <path>              # multi-language CC + NLOC + params
# Any language with lizard support
uvx lizard -l <lang> --CCN 10 <path>
```

## Layer 2 - Git forensics: "where change actually happens"

```bash
# High-churn files (exclude lock/generated noise)
git log --format=format: --name-only --since="1 year ago" \
  | grep -vE '(^$|lock|generated|\.snap|\.min\.)' | sort | uniq -c | sort -nr | head -20

# Bug hotspots (message-quality dependent; approximate is still useful)
git log -i -E --grep="fix|bug|broken" --name-only --format='' \
  | grep -v '^$' | sort | uniq -c | sort -nr | head -20

# Ownership / bus factor (squash merges distort this)
git shortlog -sn --no-merges

# Velocity trend (interpret as trend only, never absolute)
git log --format='%ad' --date=format:'%Y-%m' | sort | uniq -c

# Firefighting signal (safety-net trust diagnosis)
git log --oneline --since="1 year ago" | grep -icE 'revert|hotfix|emergency|rollback'
```

Corrections: use `--follow` for single-file rename history; register bulk mechanical commits in `.git-blame-ignore-revs`; squash merges flatten authorship.

**+ SATD signal** (admitted debt, independent of structure and history):

```bash
rg -c 'TODO|FIXME|HACK|XXX' --type-add 'src:*.{ts,tsx,py,dart,go,java,kt}' -t src | sort -t: -k2 -nr | head -20
```

## Layer 3 - Hotspot: "what to fix first"

`hotspot = complexity (L1) x change frequency (L2)` - the quantified form of the economic property and the budget's spending rank.

```bash
# Recipe: top-churn files joined with complexity
git log --format=format: --name-only --since="1 year ago" | grep -vE '(^$|lock)' \
  | sort | uniq -c | sort -nr | head -30 | awk '{print $2}' \
  | xargs -I{} sh -c 'echo "$(uvx lizard -C 999 {} 2>/dev/null | tail -1) {}"'
# Or use code-maat / CodeScene for the full join
```

## Layer 4 - Safety-net instrumentation: "where refactoring is safe NOW"

`net = breadth x strength x reliability` - if any factor is zero, there is no net.

| Dimension | Metric | Notes |
|-----------|--------|-------|
| Breadth | Coverage (statement < branch < condition < MC/DC) | Coverage measures *executed*, not *verified*. Prefer diff coverage gates over global targets |
| Strength | Mutation score (PIT / StrykerJS / mutmut) | The true measure of "will the net catch a behavior change" |
| Reliability | Flakiness rate | Non-deterministic tests destroy the "failure = behavior changed" signal; fix or quarantine first |

```bash
# Per-registry commands (see governance.md for the registry)
vitest run --coverage              # TS/JS breadth
stryker run                        # TS/JS strength
pytest --cov=<pkg> --cov-report=term-missing
mutmut run                         # Python strength
flutter test --coverage           # Dart breadth (strength gap: compensate with assertion review)
```

Tier by layer: dense unit tests on the pure core, few integration/contract tests on the shell, MC/DC only for safety-critical modules.

When the net is missing, LLM-assisted test generation is viable for seeding characterization suites - prefer approaches guided by coverage or mutation feedback, and review generated assertions manually (generation quality is bounded by the feedback signal).

## Outcome accounting (org level)

Budget effectiveness closes with DORA: deployment frequency, change lead time, change failure rate, MTTR. Investment hypothesis: structural improvement -> lead time down + change failure rate down. Review budget consumption alongside DORA trends quarterly; Layer-2 signals are proxies, DORA is the outcome.
