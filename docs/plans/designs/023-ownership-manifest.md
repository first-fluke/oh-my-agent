# 023 · Ownership Manifest

> Design for a per-file ownership record covering everything oma writes into vendor directories. Replaces the marker-heuristic ownership derivation used today by `uninstall`, `link`, and `update`.

- Status: **Draft** (design only — no implementation)
- Date: 2026-08-12
- Scope: vendor-projected files (`.claude/`, `.codex/`, `~/.hermes/`, …). The `.agents/` SSOT *distribution* side is already covered by `prompt-manifest.json` and is out of scope.
- Related: `014-oma-install-global.md` (install modes, `safeWriteJson`), `019-hook-oma-call-dispatch.md` (`oma-hook.sh` wrapper markers)

---

## 1. Problem & Motivation

oma has no record of which files it created. Ownership is **re-derived heuristically on every
install / update / uninstall / link** from a set of in-band markers:

| Marker | Where | Owns |
|---|---|---|
| `command` contains `oma-hook.sh`, or `name` starts with `oma-hook-` | `cli/platform/hooks-composer/settings-merge.ts:72` | hook entries inside vendor `settings.json` |
| `<!-- OMA:START … -->` / `<!-- OMA:END -->` | `cli/platform/rules.ts:149-150,303` | a region inside `CLAUDE.md` / `AGENTS.md` |
| `<!-- oma:generated -->` | `cli/commands/uninstall/run.ts:30,252` | `.github/prompts/*.prompt.md` |
| symlink realpath resolves into `.agents/workflows/` | `cli/commands/uninstall/run.ts:64-100` | vendor workflow links |
| entry is *any* symlink under a vendor skills dir | `cli/commands/uninstall/run.ts:220` | vendor skill links |

Despite its name, `cli/platform/manifest.ts` (315 lines) holds no ownership data. It manages
`_version.json` (`version`, `schemaVersion`, `mode`, `installedAt`, `needsReconcile` —
lines 30-156) plus a coarse *name-only* snapshot of installed skills and workflows
(`snapshotArtifacts`, lines 170-187). Its `sha256` machinery (lines 17-28, 247-307) belongs to the
**inbound** transport that verifies `prompt-manifest.json` downloads — it never records what was
written outbound.

### Defects this causes

1. **Uninstall misses HOME-consent vendors in project mode.**
   `vendorSkillsDir()` resolves `requiresHomeConsent` vendors under `homedir()` unconditionally
   (`cli/platform/skills-installer/vendor-dirs.ts:52-54`), but `buildRemovalPlan` computes
   `path.join(installRoot, mode === "global" ? spec.homePath : spec.projectPath)`
   (`cli/commands/uninstall/run.ts:211-213`). For a project install, uninstall therefore scans
   `<project>/.hermes/skills/oma` — a path that never existed — while the real links sit in
   `~/.hermes/skills/oma/`. All three HOME-consent vendors (`antigravity`, `hermes`, `kimi`) leak
   symlinks that no oma command can ever clean up.
2. **Windows link fallbacks become invisible.** `createLink` returns
   `symlink | junction | hardlink | copy` (`cli/platform/fs-link.ts:55-110`). Uninstall's ownership
   test is "is it a symlink" — a hardlinked or copied skill file is classified as *user-authored*
   and preserved forever.
3. **Drift is undetectable.** `link` cannot tell "file is exactly what I last wrote" from "user
   edited it". It overwrites unconditionally, or (for markers) merges blind.
4. **No `oma diff`, no `link --dry-run` with real content.** A preview can only enumerate paths it
   would touch, not what would actually change.
5. **No transactional story.** A crash mid-`link` leaves an unknowable partial state.
6. **Marker coverage is not total.** Files with no place to put a comment (JSON settings, symlinks,
   binary-ish assets) rely on structural inference that gets weaker with every new vendor.

## 2. Goals / Non-Goals

**Goals**

- Exact, enumerable ownership for every path oma writes outside `.agents/`.
- Distinguish *exclusive* ownership from *shared regions inside user files*.
- Detect user modification (drift) so destructive operations can preserve instead of clobber.
- Survive install-mode differences, including writes that land outside `installRoot`.
- Degrade safely: an absent or corrupt manifest must never make uninstall *more* destructive.
- Be the data source for `oma diff` and `link --dry-run`.

**Non-Goals**

- Replacing `prompt-manifest.json` (inbound SSOT distribution). The two never merge.
- Full transactional rollback with undo journals — see §9, deferred.
- Tracking user-authored content. Absence from the manifest means "not oma's", full stop.
- Content backup. Drift is *reported and preserved*, not versioned.

## 3. Approach Comparison

| | **A · extend `_version.json`** | **B · new `.agents/_ownership.json`** | **C · per-vendor manifests** |
|---|---|---|---|
| Location | `.agents/skills/_version.json` | `.agents/_ownership.json` | `.claude/_oma-owned.json`, … |
| Bootstrapping | ✗ lives **inside** the directory uninstall deletes wholesale (`run.ts:133-149`) | ✓ sibling of `.agents/skills/`, deleted last by explicit step | ✗ each manifest deleted with its own vendor dir |
| Write cost | ✗ couples a 5-field hot record (read by `getLocalVersion`, `readVersionInstallMode`, `getNeedsReconcile`) to a several-hundred-entry list | ✓ independent write cadence | ✓ small per file |
| Atomicity | ✓ single file | ✓ single file | ✗ N writes, no single commit point |
| Cross-vendor files | ✗ n/a | ✓ `CLAUDE.md`, `.mcp.json`, root-level docs have a home | ✗ shared files belong to no vendor |
| Out-of-root paths (HOME consent) | ✗ no base concept | ✓ explicit `base` field | ✗ vendor dir itself may be outside root |
| Schema churn risk | ✗ breaks 4 existing readers on every change | ✓ isolated, own `schemaVersion` | ✓ isolated |

**Recommendation: B.** A is disqualified by the bootstrapping hazard alone — storing the record of
what to delete inside the thing being deleted. C cannot express `CLAUDE.md` (merged by several
vendors) or give `link` one commit point. B keeps `_version.json` as the small, stable install
stamp it already is.

## 4. Ownership Classes

The single most important schema decision. Today uninstall has two buckets, `omaOwned` and
`userOwned`, and no way to say "oma owns lines 40-95 of this user's file". Three classes:

| Class | Meaning | Uninstall action | Examples |
|---|---|---|---|
| `exclusive` | oma created the whole entry; nothing else writes it | remove (if not drifted) | vendor skill symlinks, `.zcode/commands/*.md`, `oma-hook.sh`, generated `SKILL.md`, `.github/prompts/*.prompt.md` |
| `shared` | oma owns a delimited region inside a file it does not own | excise the region, keep the file | `.claude/settings.json` hook entries, `CLAUDE.md` / `AGENTS.md` `OMA:START` block, `.mcp.json` servers, `.codex/config.toml` |
| `seeded` | oma wrote it once, then handed it to the user | never touch | `.agents/oma-config.yaml`, `.agents/mcp.json` |

`shared` entries carry a `region` descriptor instead of a whole-file hash, so drift is evaluated
against the region only — a user adding their own hook to `settings.json` is not drift.

## 5. Manifest Schema

```jsonc
{
  "schemaVersion": 1,
  "omaVersion": "11.10.3",
  "mode": "project",                       // mirrors _version.json; advisory
  "installRoot": "/Users/x/proj",          // advisory — paths resolve via `base`
  "writtenAt": "2026-08-12T04:00:00.000Z",
  "entries": [
    {
      "path": ".claude/skills/oma-backend",  // always relative to `base`
      "base": "installRoot",                 // "installRoot" | "home"
      "class": "exclusive",
      "kind": "symlink",                     // file | dir | symlink
      "writer": "createVendorSymlinks",      // subsystem that produced it
      "vendor": "claude",
      "linkTarget": ".agents/skills/oma-backend",  // relative to installRoot
      "mechanism": "symlink"                 // fs-link.ts LinkMechanism
    },
    {
      "path": ".hermes/skills/oma/oma-backend",
      "base": "home",                        // ← the defect in §1.1, made representable
      "class": "exclusive",
      "kind": "symlink",
      "writer": "createVendorSymlinks",
      "vendor": "hermes",
      "linkTarget": ".agents/skills/oma-backend",
      "mechanism": "symlink"
    },
    {
      "path": ".claude/settings.json",
      "base": "installRoot",
      "class": "shared",
      "kind": "file",
      "writer": "installVendorAdaptations",
      "vendor": "claude",
      "region": { "type": "json-keys", "selector": "hooks.*[?name^=oma-hook-]" },
      "regionSha256": "3f2a…"               // hash of the extracted region, not the file
    },
    {
      "path": "CLAUDE.md",
      "base": "installRoot",
      "class": "shared",
      "kind": "file",
      "writer": "mergeRulesIndexForVendor",
      "vendor": "claude",
      "region": { "type": "delimited", "start": "<!-- OMA:START", "end": "<!-- OMA:END -->" },
      "regionSha256": "9c81…"
    },
    {
      "path": ".github/prompts/review.prompt.md",
      "base": "installRoot",
      "class": "exclusive",
      "kind": "file",
      "writer": "installCopilotWorkflowPrompts",
      "vendor": "copilot",
      "sha256": "7de4…",
      "size": 1284
    }
  ]
}
```

Field notes:

- **`path` + `base`** — never absolute. `base: "home"` resolves against `homedir()` *at read time*,
  so a dotfiles-synced manifest still points at the right user. This is the field that makes the
  §1.1 defect impossible to reintroduce: `vendorSkillsDir()` already knows the base, and recording
  it means uninstall no longer has to re-guess it.
- **`writer`** — the function name, so a stale entry can be traced to the subsystem that must be
  fixed, and so a future `oma diff --writer createVendorSymlinks` can scope a repair.
- **`mechanism`** — closes defect §1.2. A `copy`-mechanism entry is oma-owned even though `lstat`
  reports a plain file.
- **`sha256`** — content hash at write time, via the existing `sha256Hex` helper. `symlink` entries
  omit it and compare `linkTarget` instead. `dir` entries omit it and exist only for directories
  oma created wholesale.
- Entries are sorted by `(base, path)` so the file is diff-stable in git and byte-identical across
  reruns with no changes.

## 6. Storage & Lifecycle

**Location:** `<installRoot>/.agents/_ownership.json`. One manifest per install root; a machine
with both a global and a project install has two, each describing only its own writes.

**Written by:** `link()` — the single vendor-reconciliation kernel (`cli/commands/link/run.ts:153`)
that `install` and `update` both call. Every writer it invokes returns the entries it produced;
`link` accumulates them and commits **one** manifest at the end of the pass. No other command
writes the manifest.

**Write path:** atomic, non-negotiable. Reuse the `safeWriteJson` pattern already applied to vendor
settings (`cli/utils/safe-write.ts`, spec'd in `014 §7.1`): temp file → `fsync` → `rename`, with the
`EXDEV` copy fallback. A torn manifest is strictly worse than no manifest.

**Lifecycle:**

| Event | Manifest action |
|---|---|
| `oma install` | full manifest written at end of the embedded `link()` pass |
| `oma update` | rewritten wholesale — it is a fresh snapshot, not a delta |
| `oma link` | rewritten wholesale |
| `oma link --dry-run` | read-only; planned entries compared, nothing written |
| `oma uninstall` | consumed, then deleted **last**, after all its entries are processed |
| partial/crashed `link` | not written; previous manifest survives intact (§9) |

The manifest is regenerable by definition: rerunning `link` reconstructs it. That is what makes
"lost manifest" a recoverable condition rather than a data-loss event.

## 7. How Consumers Use It

### 7.1 `uninstall`

`buildRemovalPlan` becomes manifest-driven. For each entry, resolve `base`, then:

| Class | Current state | Action |
|---|---|---|
| `exclusive` | missing | no-op |
| `exclusive` | hash / `linkTarget` matches | remove |
| `exclusive` | hash mismatch | **preserve**, report under a new `modified` section |
| `shared` | region present, `regionSha256` matches | excise region, keep file |
| `shared` | region present, hash mismatch | preserve region, report |
| `shared` | region absent | no-op |
| `seeded` | any | preserve (existing `userOwned` behaviour) |

The two-bucket preview grows a third: **removed / modified-preserved / user-owned**. The existing
`applyRemoval` ordering (symlinks → files → directories deepest-first, `run.ts:329-364`) is unchanged
and still correct.

### 7.2 `link` and `update`

Before writing any file, compare the on-disk hash to the manifest entry:

- **unchanged** — skip the write entirely (idempotent link becomes genuinely cheap)
- **absent** — write, record
- **drifted** — the user edited an oma-owned file. Default: preserve and warn, listing the path and
  the `writer`. `--force` overwrites. This is a behaviour change and needs a release note; today
  these writes are silent clobbers.

Entries in the old manifest that the new pass did not produce are **orphans** — a vendor was
deconfigured, or a skill was removed upstream. They are removed on the same drift rules as uninstall.
This is the first time oma can prune a deconfigured vendor's leftovers at all.

### 7.3 `link --dry-run` / `oma diff`

Both are pure functions of (planned entries, recorded manifest, disk state):

```
oma diff
  + .qwen/skills/oma-refactor          (new — not in manifest)
  ~ .claude/settings.json              (region drifted — user edited an oma hook entry)
  - ~/.hermes/skills/oma/oma-market    (orphan — hermes no longer configured)
  ! .github/prompts/docs.prompt.md     (modified since install — link will preserve)
```

`link --dry-run` (task in flight separately) is the same computation with the plan applied but
nothing written. `oma diff` is the read-only standalone.

## 8. Migration from Marker Heuristics

Marker detection is **not deleted**. It becomes the fallback tier:

1. **Manifest present and parseable** → authoritative. Markers still run as a *secondary sweep*, and
   anything marker-owned but absent from the manifest is surfaced as `unmanifested` in the preview
   rather than silently removed. This catches pre-manifest installs whose `link` has not yet run,
   and any writer that forgot to report entries.
2. **Manifest absent** → today's marker behaviour, verbatim, plus a one-line notice that ownership
   is approximate and `oma link` will backfill it.
3. **Manifest corrupt / unparseable** → treat as absent. Never partially trust it.

**Backfill** happens on the next `link` (which every `install` and `update` runs), so an existing
user gets an accurate manifest on their next update without any explicit migration step. No entry in
`cli/commands/migrations/` is required — this is deliberately not a migration, because the manifest
is derived state and a migration would have to re-derive it from the very heuristics being replaced.

Marker removal is a separate, later decision, gated on: manifest present on N consecutive updates,
and zero `unmanifested` reports in the field.

## 9. Failure Modes

| Failure | Behaviour |
|---|---|
| Manifest missing | fall back to markers (§8.2); warn; backfill on next `link` |
| Manifest corrupt | treated as missing; the bad file is renamed `_ownership.json.bad` for inspection, not deleted |
| Partially written | impossible by construction — atomic temp+fsync+rename; a crash leaves the *previous* manifest |
| Stale (files added out-of-band by an older oma) | marker secondary sweep reports them as `unmanifested`; user decides |
| Stale (files deleted out-of-band) | entry resolves to a missing path → no-op, entry drops from the next pass |
| `installRoot` moved/renamed | paths are `base`-relative, so they still resolve; the `installRoot` field is advisory and refreshed on next `link` |
| `HOME` differs from write time | `base: "home"` resolves against the *current* `homedir()` — correct for a dotfiles-synced manifest, and the only sane interpretation |
| Manifest deleted mid-uninstall | uninstall holds the parsed entries in memory and unlinks the manifest last |
| Crash mid-`link` | manifest not yet committed; disk may hold newly written files not in the manifest. Next `link` is idempotent and re-records them. **Not** a rollback — see below |

**Transactional rollback is explicitly deferred.** A true two-phase commit needs a journal of
pre-images, which is a materially larger design (and a backup-retention policy). What this design
buys instead is *convergence*: because `link` is idempotent and the manifest is regenerable, a crash
is repaired by rerunning `link`, not by unwinding. The gap that leaves — files written before a crash
in a pass that is then abandoned — is bounded by that rerun. Recording this as a known limitation is
honest; claiming rollback would not be.

Path safety: every entry path is validated with the existing `assertContainedRelPath`
(`cli/platform/path-containment.ts`) against its resolved base before any write or delete. A manifest
is a list of paths to delete, so a hand-edited or tampered manifest must not be able to escape its
base.

## 10. Test Strategy

| Test | Covers |
|---|---|
| `ownership-manifest.test.ts` | schema round-trip, sort stability, byte-identical rerun |
| `ownership-manifest-atomic.test.ts` | interrupted write leaves prior manifest intact; `EXDEV` fallback |
| `uninstall-home-consent.test.ts` | **regression for §1.1** — project-mode install with `hermes` produces `base: "home"` entries; uninstall removes `~/.hermes/skills/oma/*` |
| `uninstall-drift.test.ts` | modified `exclusive` file preserved and reported, not deleted |
| `uninstall-shared-region.test.ts` | `settings.json` keeps user hooks, loses only `oma-hook-*` entries |
| `link-idempotent-skip.test.ts` | unchanged files are not rewritten on a second `link` |
| `link-orphan-prune.test.ts` | deconfiguring a vendor removes its entries on next `link` |
| `manifest-fallback.test.ts` | absent + corrupt manifest both fall back to markers with no behaviour regression |
| `manifest-windows-mechanism.test.ts` | **regression for §1.2** — `copy`/`hardlink` entries are recognised as oma-owned |

Isolation follows the existing convention: `OMA_HOME=$(mktemp -d)` per case, never touching the real
`homedir()` — mandatory here, since HOME-consent vendors are the point.

## 11. Open Questions

1. Region selector syntax for `shared` JSON entries — a small purpose-built descriptor (as sketched
   in §5) or an existing pointer syntax (JSONPath / RFC 6901)? Prefer the former; the selectors oma
   needs are few and fixed.
2. Should `.agents/` SSOT files themselves get entries? They are already covered by
   `prompt-manifest.json` on the way in, but uninstall deletes them via directory sweep and would
   benefit from the same drift protection. Leaning yes, as a `class: "exclusive"` entry per file, in
   a second phase.
3. Manifest size. A full install is roughly 40 skills × N vendors of symlinks; a rough bound is
   low-thousands of entries. Worth measuring before committing to a flat array rather than a
   per-vendor grouping.
4. Whether `oma doctor` should report manifest health (present / stale / unmanifested count)
   alongside its existing checks.
