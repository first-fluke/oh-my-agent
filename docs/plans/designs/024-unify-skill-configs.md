# 024 · Unify Skill Configs into `oma-config.yaml`

> Design for moving user-tunable keys out of the seven per-skill `config/*.yaml` files and into
> `.agents/oma-config.yaml`, the one file install/update/uninstall already treat as user-owned.

- Status: **Implemented** (§8 amended during implementation — see the note there)
- Date: 2026-08-12
- Scope: `.agents/skills/*/config/*.yaml` (7 files) + the `.agents/config/models.yaml` preservation gap.
- Related: `023-ownership-manifest.md` (the `seeded` ownership class this design leans on),
  `007-model-preset.md` (`model_preset` / `agents:` semantics), migration `018-unify-scm-config.ts`
  (the precedent this design copies)

---

## 1. Problem & Motivation

Seven skills ship a config file inside their own skill directory:

| Skill | Config file | Read by |
|---|---|---|
| oma-video | `.agents/skills/oma-video/config/video-config.yaml` | **CLI** — `cli/commands/video/config.ts:97` |
| oma-image | `.agents/skills/oma-image/config/image-config.yaml` | **CLI** — `cli/commands/image/config.ts:91` |
| oma-orchestrator | `.agents/skills/oma-orchestrator/config/cli-config.yaml` | **CLI** — `cli/platform/agent-config/config-io.ts:82` |
| oma-voice | `.agents/skills/oma-voice/config/voice-config.yaml` | **agent** — `SKILL.md:231` |
| oma-hwp | `.agents/skills/oma-hwp/config/hwp-config.yaml` | **agent** — `SKILL.md:166` |
| oma-pdf | `.agents/skills/oma-pdf/config/pdf-config.yaml` | **agent** — `SKILL.md:145` |
| oma-scholar | `.agents/skills/oma-scholar/config/scholar-config.yaml` | **agent** — `SKILL.md:253` |

### 1.1 User edits are silently destroyed on every update

`.agents/skills/` is replaced wholesale: `installSkill` does
`fs.cpSync(src, dest, { recursive: true, force: true })`
(`cli/platform/skills-installer/ssot-install.ts:7-40`), and `oma update` copies the whole `.agents`
tree with `force: true` (`cli/commands/update/run.ts:233-238`). All seven files are entries in
`prompt-manifest.json` (lines 1033, 1083, 1463, 1528, 1638, 1868, 2008), so they ride along
generically — nothing has to name them for them to be clobbered.

`.agents/oma-config.yaml` gets the opposite treatment: update saves the bytes before the copy
(`run.ts:219-224`), restores after (`run.ts:244-245`), then key-merges new template keys via
`appendMissingConfigKeys` (`run.ts:262-281`); install never overwrites it
(`ssot-install.ts:145-156`); uninstall classifies it `userOwned`, reason `"user preferences"`
(`cli/commands/uninstall/run.ts:222-229`).

So a user who sets `default_vendor: pollinations` in `image-config.yaml` — exactly what
`SKILL.md:275` tells them to do — loses it on their next `oma update`, with no warning and no diff.
That is the whole motivation; everything below is secondary.

### 1.2 The "keep in sync" mirror has already fallen out of sync

`.agents/skills/oma-video/config/video-config.yaml:2-4` says it *"Mirrors
cli/commands/video/config/video-config.yaml (the CLI is the source of truth; keep these in sync)"*.
Every clause of that sentence is false. The named file is **dead** — zero references in the repo,
`cli/package.json` publishes only `["bin"]`, the build is a single `bun build` bundle with no asset
copy step, and it is in neither `prompt-manifest.json` nor any install path. It is **not** the
source of truth; the real defaults are `DEFAULT_VIDEO_CONFIG` (`cli/commands/video/config.ts:68-95`).
And the two have **already drifted**: the dead mirror carries `providers.music.order: [strudel]`
which the shipped `.agents/` copy lacks. A manual sync convention that broke on its first test is
not a convention.

### 1.3 Duplication and discoverability

`video-config.yaml` and `image-config.yaml` restate `DEFAULT_VIDEO_CONFIG` / `DEFAULTS`
(`image/config.ts:33-89`) key for key, including the entire `per_image_usd` cost matrix. Both
loaders already reach *back out* to `.agents/oma-config.yaml` for one key — `applyRootLanguage`
(`video/config.ts:234-245`, `image/config.ts:176-187`) — so the split is already leaking. A user
looking for "where do I configure oma" finds `oma-config.yaml`, not seven files nested three levels
inside a directory the docs tell them not to edit.

### 1.4 `active_vendor` is already redundant

`cli-config.yaml:6` self-describes as *"used as fallback when oma-config.yaml is not configured"*,
and the resolution chain confirms it is the second-to-last tier:

```ts
// cli/platform/agent-config/vendor-resolution.ts:148-153
const vendor = vendorOverride || mappedVendor || defaultCli || cliConfig?.active_vendor || "claude";
```

`defaultCli` is `oma-config.yaml`'s `default_cli` (`vendor-resolution.ts:112`). So `active_vendor`
fires only when oma-config has no `default_cli`, no `agents:` match, and no resolvable
`model_preset` — and it differs from the hardcoded `"claude"` floor only when the user changed it,
which §1.1 says they cannot durably do.

### 1.5 Related gap: `models.yaml` is documented, then deleted

`.agents/config/defaults.yaml:8` documents `.agents/config/models.yaml` as a user extension point
("add or override model slugs"). It is read by `cli/platform/model-registry/user-models.ts:79` and
appended to by `cli/commands/model/propose.ts:207-225`. But uninstall removes the entire
`.agents/config/` directory as `omaOwned` with reason `"created by installConfigs"`
(`cli/commands/uninstall/run.ts:206-213`), taking the user's file with it. Install itself gets this
right (`ssot-install.ts:118-129`, "User-editable config files are never overwritten") — only
uninstall disagrees.

## 2. Goals / Non-Goals

**Goals**

- A user override, once written, survives `oma update` forever.
- One discoverable location for all user-tunable oma behaviour.
- Sparse overrides: a user writes only the keys they changed, never a copied full file.
- No behaviour change for a user who has never edited a skill config.
- Fix the `models.yaml` uninstall gap (§1.5) in the same release.

**Non-Goals**

- **Moving shipped defaults.** Defaults stay where they are: TypeScript literals for CLI-read
  skills, shipped YAML for agent-read skills. `oma-config.yaml` holds overrides only. A fresh
  install writes no new sections at all.
- Moving the `cli-config.yaml` `vendors:` block. That is a vendor *capability registry* (command
  names, flag spellings, `response_jq`) consumed by `parallel.ts:118`, `review.ts:103`,
  `spawn-status.ts:275` — shipped data, not preferences.
- Changing precedence (§5) or any CLI flag.
- Deleting the seven files in this release. See the deprecation window in §7.

## 3. Approach Comparison

| | **A · status quo + docs warning** | **B · move whole files into oma-config** | **C · move user overrides only** |
|---|---|---|---|
| Survives `oma update` | ✗ | ✓ | ✓ |
| oma-config size after migration | unchanged | +~180 lines of restated defaults | +0-10 lines (only what user changed) |
| Default changes reach existing users | ✓ | ✗ — a copied default is now a pin; upstream tuning is frozen per user | ✓ |
| Migration complexity | none | trivial copy | needs a defaults diff |
| Diff noise in `oma-config.yaml` | n/a | high | minimal |
| Precedent | — | — | `018-unify-scm-config.ts` |

**Recommendation: C.** B's failure mode is the decisive one: copying `per_image_usd` into every
user's `oma-config.yaml` means the day a vendor changes pricing, no existing install picks it up —
we would have converted a silent-loss bug into a silent-staleness bug. C costs one defaults-diff
pass in the migration and nothing thereafter. A is not viable; a warning does not make the file
writable.

## 4. Proposed Sections and Key Inventory

Six new top-level sections, all optional, all sparse. **Absent key = code default.** Sections are
`seeded` in the `023` ownership sense: written by the user, never rewritten by oma.

### 4.1 `video:` (CLI-read)

Defaults: `DEFAULT_VIDEO_CONFIG`, `cli/commands/video/config.ts:68-95`.

| Old key (`video-config.yaml`) | New path | Default source |
|---|---|---|
| `default_output_dir` | `video.default_output_dir` | `config.ts:69` |
| `default_mode` / `default_aspect` / `default_locale` | `video.default_*` | `config.ts:70-72` |
| `default_captions` / `default_visual` / `default_voice` / `default_music` | `video.default_*` | `config.ts:73-76` |
| `default_compositor` / `default_timeout_sec` | `video.default_*` | `config.ts:77-78` |
| `providers.{script,voice,visual,caption,capture,music,compositor}.order` | `video.providers.<n>.order` | `config.ts:81-87` |
| `providers.{pexels,pixelle}.enabled` | — **drop** | env-derived unconditionally at `config.ts:230-231`; the file value has never had an effect |
| `providers.{pexels,pixelle}.envVar` | `video.providers.<n>.env_var` | `config.ts:88-89` |
| `cost.guardrail_usd` | `video.cost.guardrail_usd` | `config.ts:91` |
| `limits.max_duration_sec` / `max_scenes` | `video.limits.*` | `config.ts:92` |
| `naming.single_folder_pattern` | `video.naming.single_folder_pattern` | `config.ts:93` |
| — | `video.yes` | `config.ts:79` (code-only today; expose for parity) |
| `language` | — **drop** | already sourced from root `language:` via `applyRootLanguage` |

`providers.music.order` exists only in the dead mirror today (§1.2) and must be added to the
`.agents/` inventory as part of this work.

### 4.2 `image:` (CLI-read)

Defaults: `DEFAULTS`, `cli/commands/image/config.ts:33-89`.

| Old key | New path | Default source |
|---|---|---|
| `default_output_dir` / `default_vendor` / `default_size` | `image.default_*` | `config.ts:34-36` |
| `default_quality` / `default_count` / `default_timeout_sec` | `image.default_*` | `config.ts:37-39` |
| `vendors.<v>.{enabled,model,extra_args}` | `image.vendors.<v>.*` | `config.ts:40-55` |
| `cost_guardrail.estimate_threshold_usd` | `image.cost_guardrail.estimate_threshold_usd` | `config.ts:57` |
| `cost_guardrail.per_image_usd.<v>.<model>.<q>` | `image.cost_guardrail.per_image_usd.*` | `config.ts:58-79` |
| `compare.folder_pattern` / `compare.manifest` | `image.compare.*` | `config.ts:81-84` |
| `naming.single_folder_pattern` | `image.naming.single_folder_pattern` | `config.ts:85-87` |

`per_image_usd` is the key most worth *not* migrating unless changed (§3).

### 4.3 `voice:` (agent-read)

| Old key | New path |
|---|---|
| `notification_profile` / `asset_profile` | `voice.notification_profile` / `voice.asset_profile` |
| `output_dir` | `voice.output_dir` |
| `auto_notify_after_sec` | `voice.auto_notify_after_sec` |
| `max_tts_chars` / `max_stt_minutes` | `voice.max_tts_chars` / `voice.max_stt_minutes` |

`notification_profile` / `asset_profile` are the sharp case: they are `null` in the shipped file and
*must* be set per machine, so today every voice user is guaranteed to lose their setting on update.

### 4.4 `hwp:` and `pdf:` (agent-read)

| Old key | New path |
|---|---|
| `hwp` · `format` | `hwp.format` |
| `hwp` · `version.channel` / `version.pinned` | `hwp.version.channel` / `hwp.version.pinned` |
| `hwp` · `output.default_location` | `hwp.output.default_location` |
| `hwp` · `supported_formats` | — keep shipped (advertised scope, not a preference) |
| `pdf` · `format` / `image_output` / `image_format` / `use_struct_tree` | `pdf.*` |
| `pdf` · `ocr.enabled` / `ocr.languages` / `ocr.hybrid_port` | `pdf.ocr.*` |
| `pdf` · `output.default_location` / `output.overwrite` | `pdf.output.*` |

### 4.5 `scholar:` (agent-read)

`api.base_url` only:

| Old key | New path |
|---|---|
| `api.base_url` | `scholar.base_url` |

Everything else in `scholar-config.yaml` — `api.endpoints.*`, `api.timeout_seconds`,
`partial_fields`, `semanticscholar.*`, `openalex.*`, `generation.*` including `id_prefixes`,
`output.*`, `lint.*` — is protocol shape or shipped constants, not user preference, and stays in the
skill file. `base_url` is the one key a user with a self-hosted knows instance must change.

### 4.6 Orchestrator (`cli-config.yaml`) — deprecate the user-facing half

| Old key | Disposition |
|---|---|
| `active_vendor` | **Drop.** Redundant with `oma-config.yaml`'s `default_cli` (`vendor-resolution.ts:148-153`, §1.4). Migration maps a non-`claude` value to `default_cli`; the reader tier is removed after the deprecation window, leaving `… \|\| defaultCli \|\| "claude"`. |
| `execution.results_dir` | Stays code-side. `cli/constants/paths.ts:12` already flags it as a manual-sync duplicate of `AGENTS_RESULTS_DIR`; unifying makes the comment obsolete. |
| `execution.timeout` / `log_level` / `keep_temp_files` | **Deferred.** `agents:` in oma-config is a strict per-agent `AgentSpec` map (`schemas.ts:49-64`, `.strict()`), so an `agents.execution` key fails validation and takes the *whole* config down with it — `parseOmaConfig` returns null. No TypeScript reads these three keys today either, so moving them buys nothing. They need their own top-level section if they are ever wired up. |
| `vendors.<v>.*` | Stays shipped (non-goal, §2). |

`default_cli` is currently schema-accepted (`schemas.ts:88`) but undocumented in the shipped
`oma-config.yaml` template — this work should document it.

## 5. Precedence

Unchanged, and now uniform across all six sections:

```
built-in defaults  <  .agents/oma-config.yaml  <  legacy skill config (deprecated, §7)  <  env vars  <  CLI flags
```

The legacy tier sits above oma-config only during the deprecation window, so a user who has *not*
migrated keeps their current behaviour byte for byte. Env and flag handling
(`applyEnvOverrides`, `video/config.ts:219-232`, `image/config.ts:167-174`) is untouched.

## 6. Readers to Update

**CLI-read** — code change required:

- `cli/commands/video/config.ts` — replace `PROJECT_CONFIG_PATH` (`:97`) with an oma-config section
  read; keep `normalizeKeys` (`:168-217`) for the legacy fallback tier. `applyRootLanguage`
  (`:234-245`) collapses into the same single read.
- `cli/commands/image/config.ts` — same for `CONFIG_PATH` (`:91`); `applyRootLanguage` (`:176-187`)
  additionally drops its stray `require("node:fs")` inside an ESM module.
- `cli/platform/agent-config/vendor-resolution.ts:148-153` — drop the `cliConfig?.active_vendor`
  tier after the window. `readCliConfig` (`config-io.ts:82`) survives for the `vendors:` registry.
- Delete `cli/commands/video/config/video-config.yaml` (dead, §1.2).

A shared `loadSkillSection<T>(cwd, section)` helper — one YAML read, one deep-merge, one
legacy-fallback warning path — avoids a third copy of the merge logic.

**Agent-read** — `SKILL.md` change required, no code:

- `.agents/skills/oma-voice/SKILL.md:231`, `resources/execution-protocol.md:64-65`,
  `resources/voice-matrix.md:41`
- `.agents/skills/oma-hwp/SKILL.md:166`, `resources/execution-protocol.md:123`,
  `resources/troubleshooting.md:49`
- `.agents/skills/oma-pdf/SKILL.md:145,162`, `resources/execution-protocol.md:5`
- `.agents/skills/oma-scholar/SKILL.md:253`

Each must instruct the agent to read `.agents/oma-config.yaml` §`<section>` first and fall back to
the skill config. These are prose instructions, so the fallback is a sentence, not a code path —
which is also why the agent-read four are the *lower*-risk half of this change.

Docs to follow: `web/docs/core-concepts/agents.md:644,712,777,799`,
`web/docs/guide/image-generation.md:239`, `web/docs/cli-interfaces/options.md:204,299`,
`web/docs/cli-interfaces/commands.md:181`, `web/docs/core-concepts/project-structure.md:187`,
plus i18n mirrors.

## 7. Migration `022-unify-skill-configs`

Next free number is **022** (highest existing is `021-remove-eval-artifacts.ts`; `006` was never
used). Registered in `cli/commands/migrations/index.ts` after `migrateRemoveEvalArtifacts`.

`018-unify-scm-config.ts` is the template but not the whole job: it only `unlinkSync`s the legacy
files (`:33-53`), because `scm:` was already present in the shipped oma-config template. Here the
data has to move first.

**Algorithm**, per skill:

1. Read the legacy YAML. Absent → nothing to do.
2. Deep-diff against that skill's shipped default (TS literal for video/image; the pristine shipped
   YAML, recoverable via `prompt-manifest.json`'s recorded `sha256`, for the agent-read four).
3. Collect differing leaf keys, mapped through the §4 tables. Dropped keys
   (`providers.pexels.enabled`, `language`, `supported_formats`) are skipped with a report line.
4. Empty set → delete the legacy file, report `"removed (unmodified)"`.
   **Amended:** only for `video` and `image`, whose shipped defaults are TypeScript literals.
   For the agent-read four the YAML *is* the shipped default the SKILL.md falls back to, and
   migrations run again after `oma update` re-copies `.agents/` (`update/run.ts:250`) — deleting
   those would strip their defaults on every single update, leaving the agent with nothing to
   read. They are left in place and re-diffed each run instead.
5. Otherwise → append a commented section to `.agents/oma-config.yaml` holding only those keys,
   report each by name, and **keep** the legacy file for the window.
6. `active_vendor`: if not `claude` and oma-config has no `default_cli`, write `default_cli`.

Writes reuse the append-only path of `appendMissingConfigKeys`
(`cli/commands/update/config-merge.ts`) so user comments and ordering survive; the migration never
rewrites an existing user key.

**Deprecation window — one release:**

| Release | Reader behaviour | Migration behaviour |
|---|---|---|
| N (this change) | oma-config first; on legacy hit, use it and emit a one-line stderr warning naming the file, the key, and the oma-config path to move it to | runs; migrates modified keys; deletes unmodified legacy files |
| N+1 | legacy tier removed; a surviving legacy file is ignored | `023-remove-legacy-skill-configs` deletes the remaining files |

The warning goes to stderr only, once per key per process, so it cannot corrupt the JSON-on-stdout
contract that `oma video` / `oma image` share with the market pipeline convention.

## 8. `models.yaml` — Resolved: fold into `oma-config`, no uninstall classifier

> **Amended during implementation.** The original draft proposed an uninstall classifier that
> would preserve `.agents/config/models.yaml` as `userOwned`. §8 opened the question of whether
> the readers were dead; they are not, and settling that question changes the answer.

**The readers are live.** `cli/platform/model-registry/user-models.ts:79` reads the file and
`cli/commands/model/propose.ts:207-225` appends to it, so `web/CHANGELOG.md:566` is simply wrong
and migration `008-model-preset.ts:401-417` is the outlier. But `oma-config` *already* has an
inline `models:` block (`cli/platform/agent-config/types.ts:135`, "formerly models.yaml"), read by
`loadInlineUserModels`. The two are duplicates of each other, and only one of them survives
`oma uninstall`.

So the fix is not to teach uninstall about a second location — it is to have one location.
`models.yaml` gets exactly the treatment the seven skill configs get:

- **Migration 022 also folds it in.** Entries in `.agents/config/models.yaml` are appended to
  oma-config's `models:` block, subject to the same append-only rule: if the user already has a
  `models:` key, the migration reports the conflict and changes nothing.
- **Same one-release deprecation window.** `reloadRegistry` now merges both sources with the file
  winning (`mergeUserModels`, `user-models.ts`), so a user mid-migration sees no slug resolve
  differently. Each surviving slug warns once on stderr, naming `models.<slug>` in oma-config.
- **The file is not deleted** by the migration, for the same reason the modified skill configs are
  not: it is still the winning tier during the window.
- **No uninstall change.** `.agents/config/` stays `omaOwned`. Once the user's slugs live in
  oma-config, removing the directory is correct — it holds only shipped `defaults.yaml`. The
  data-loss bug of §1.5 is fixed by moving the data, not by reclassifying its old home.

This also settles §1.5's inconsistency in favour of the changelog's *intent*: after the window,
`.agents/config/models.yaml` genuinely no longer participates.

One follow-up left open: `model/propose.ts` still writes proposals to `models.yaml`. It should
target oma-config's `models:` block before the window closes, otherwise `oma model propose` keeps
writing into the deprecated file. Out of scope here — it is a write path, not a read path, and
migration 022 folds whatever it produces on the next update.

## 9. Failure Modes

| Failure | Behaviour |
|---|---|
| `oma-config.yaml` malformed | section read fails → fall back to legacy file, then defaults; never throw. Matches the existing `try/catch` in `applyRootLanguage` (`video/config.ts:241-244`) |
| Both oma-config section and legacy file present | oma-config wins per §5 during the window? **No** — legacy wins, with a warning. Chosen deliberately: a user mid-migration must not see behaviour flip under them. Reversed at N+1 |
| Migration run twice | idempotent — step 4/5 finds no legacy file, or finds keys already present in oma-config and skips them |
| Migration on a repo where the user edited *and* upstream changed the same default | user value is migrated (diff is against the *shipped* default of the version being upgraded from, read via manifest `sha256`); if that pristine copy is unavailable, the migration migrates the whole file and reports it as a coarse migration rather than guessing |
| User never runs the migration (fresh clone of an old `.agents/`) | legacy tier still reads their file at release N; at N+1 the file is ignored and defaults apply. This is the one real data-loss window — the N-release warning is what mitigates it, so it must name the exact oma-config path |
| Global + project install both present | unchanged; `findConfigFileUp` (`config-io.ts:80`) already walks upward and finds the nearest `.agents/` |
| `.agents/config/models.yaml` present but empty | classified `userOwned`, preserved, no-op |

## 10. Test Strategy

| Test | Covers |
|---|---|
| `022-unify-skill-configs.test.ts` | per-skill: unmodified file deleted; modified file yields exactly the changed keys; idempotent rerun |
| `video/config.test.ts` (extend `:42`) | oma-config `video:` read; legacy fallback + warning; env still overrides both |
| `image/config.test.ts` (extend `:30`) | same for `image:` |
| `vendor-resolution.test.ts` | `default_cli` beats legacy `active_vendor`; removal of the tier keeps the `"claude"` floor |
| `update-preserves-skill-overrides.test.ts` | **regression for §1.1** — write an override, run update, assert it survives |
| `uninstall-models-yaml.test.ts` | **regression for §1.5** — `models.yaml` preserved, `defaults.yaml` removed |
| `skill-config-sections.test.ts` | every key in the §4 tables resolves to a real default; guards the tables against drift |

## 11. Open Questions

1. Should `scholar.output.*` and `scholar.lint.fail_on_warning` join `base_url`? They read as
   genuine preferences, but the brief for this design scoped `scholar:` to `base_url` only.
   Deferring rather than widening unilaterally.
2. `OmaConfig.vendors` is schema-accepted (`schemas.ts:85`) and documented in the shipped template
   (`oma-config.yaml:239-245`, the `vendors.pi` block), but no consumer was located — the three
   `config?.vendors` reads (`parallel.ts:118`, `review.ts:103`, `spawn-status.ts:275`) all take
   `CliConfig`, not `OmaConfig`. If it is genuinely unwired, that is a separate bug and should not
   be fixed inside this migration.
3. Whether `oma doctor` should report "N legacy skill configs still present" during the window.
   Cheap, and it converts a stderr warning users may never see into a checkable state.
