# Documentation Commands

**verify mode** runs a drift check against the current codebase:

```bash
# Default: scan all repo markdown (**/*.md, gitignored files excluded),
# render markdown to stdout.
# URL link checking is delegated to lychee in the background
# (install: `brew install lychee`). Core check ~8s on a 1k-doc repo.
oma docs verify

# Narrow to a path or glob (uses minimatch)
oma docs verify "docs/**/*.md"
oma docs verify cli/README.md

# Machine-readable output for CI / hooks
oma docs verify --json

# Persist full markdown report to a file (works alongside --json too)
oma docs verify --report-file ./drift-report.md

# Skip URL checking entirely (when lychee is run separately, or as a
# one-off override of docs.check_urls=true in oma-config.yaml)
oma docs verify --no-urls

# Block until lychee finishes (CI scenarios needing complete URL data)
oma docs verify --urls-sync

# Exit code: 0 = clean, 1 = broken refs found in core check.
# URL drift, if any, is reported separately at docs/generated/url-drift.json
# and does NOT affect this exit code.
```

**sync mode** proposes patches for docs affected by a git diff (CLI emits candidates; the host applies edits within existing authorization):

```bash
# Default: staged changes (--cached), fallback HEAD~1..HEAD
oma docs sync

# Explicit range
oma docs sync HEAD~5..HEAD
oma docs sync main..feature-branch

# The CLI emits the candidate-doc list; the host LLM drafts patches and
# resolves any new authorization per doc ([y] apply / [n] skip / [d] diff / [s] full proposal).
# Sync regenerates docs/generated/doc-refs.json after applying any patches.
```

**i18n mode** detects structural drift between English source docs (`web/docs`) and translations (`web/i18n/{lang}/...`); report-only, never edits translations:

```bash
# Default: severity ≥ MEDIUM, markdown summary to stdout
oma docs i18n

# Machine-readable, custom threshold
oma docs i18n --json --min-severity HIGH

# Output: per-pair drift signals (line/heading diff, EN-newer flag).
# Hand CRITICAL/HIGH pairs to `oma-translation` diff-sync mode.
```

**lint mode** checks translated docs for content-level style anti-patterns (report-only, no auto-fix):

```bash
# Default CJK locales: ko,ja,zh
oma docs lint
oma docs lint --json --locales ko,ja
```

**Workflow hook (opt-in)** runs verify automatically at workflow completion when `docs.auto_verify: true` in `oma-config.yaml`:

```bash
# Hook command emitted by /scm, /work, /ultrawork
oma docs verify --json
# Hook policy: warn-only in v1; non-zero exit does NOT block workflow completion
```
