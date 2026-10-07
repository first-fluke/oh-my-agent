# Native skill compatibility matrix

`oma skills matrix` checks skill content retrieval, relative references, and final output contracts through the native Claude and Codex CLIs. Each case uses a fresh temporary workspace. The default diagnostics use native skill discovery; installed-skill audits also support the body injection format used by agent-valley.

## Plan and run

```sh
oma skills matrix
oma skills matrix --vendors codex --cases discovery,reference
oma skills matrix --live
oma skills matrix --live --yes --json --report matrix-report.json
```

The default command validates the suite and prints a plan. It starts no vendor processes and produces no compatibility verdicts. The default plan has six native CLI invocations: three cases across two vendors. In JSON, `plannedCalls` uses `callUnit: "native-cli-invocation"`. Each invocation can make multiple model requests; this count is not a token or cost limit.

`--live` calls the installed CLIs after a confirmation prompt. `--yes` skips that prompt; JSON live runs require it. Authenticate with the selected CLIs before running. Live execution requires a POSIX environment such as macOS or Linux; use Linux CLIs inside WSL. Native Windows live execution is rejected before a vendor starts because process-tree cleanup is not supported. Planning remains available without live calls.

A live run exits nonzero if any selected cell is not a pass, execution is cancelled or interrupted, or the full plan is not measured.

| Option | Meaning |
| --- | --- |
| `--suite <path>` | Load a custom JSON suite instead of the built-in probes. |
| `--project-root <path>` | Snapshot actual installed files under the project's `.agents/skills`. Use with `--skills`. |
| `--skills <names>` | Comma-separated installed skill names; cannot be combined with `--suite`. |
| `--delivery <mode>` | `native` (default) or `injected`; injection requires an installed-skill audit. |
| `--vendors <ids>` | Comma-separated `claude,codex`; both are selected by default. |
| `--cases <ids>` | Select comma-separated case IDs from the suite. |
| `--live` | Execute native CLIs; otherwise validate and plan. |
| `--yes` | Skip live confirmation. |
| `--timeout-seconds <n>` | Per-invocation deadline, 1–600 seconds; default 120. |
| `--claude-model <model>` | Select a Claude model explicitly. |
| `--codex-model <model>` | Select a Codex model explicitly. |
| `--json` / `--output json` | Print the structured report. `--output text` selects text. |
| `--report <path>` | Write the structured JSON report to a new file; existing files are not overwritten. |

## Built-in probes

| Case ID | Installed skill | Contract |
| --- | --- | --- |
| `discovery` | `oma-matrix-discovery` | Return a fresh value found only in the installed `SKILL.md`. |
| `reference` | `oma-matrix-reference` | Read `references/answer.txt` relative to the skill and return its fresh value. |
| `missing-resource` | `oma-matrix-missing-resource` | Attempt to read an intentionally absent reference, observe a not-found result, and return the required JSON. |

These are diagnostic skills supplied by the matrix. Passing them does not certify the shipped OMA skills or every behavior of a vendor. Use an installed audit to measure access to actual skill files, or a custom suite to test a specific fixture contract.

## Audit installed skills

```sh
oma skills matrix --project-root . --skills oma-backend,oma-debug --delivery injected --json
oma skills matrix --project-root . --skills oma-backend,oma-debug --delivery injected --live --yes --json --report installed-matrix.json
```

An installed audit snapshots actual skill files and shared resources without changing their bytes or inserting canaries. Relative reference paths remain intact in each temporary copy. The report identifies each selected skill's content hash, required files, missing files, and excluded references. Plans compute these hashes without starting a vendor process.

Installed snapshots allow up to 32 skills, 2,048 UTF-8 text files, 128 KiB per file, and 8 MiB total. Links, binary files, credential material, and host control files are rejected. Shared execution protocol documents remain ordinary resources.

The audit checks entry files and direct literal Markdown references. Missing references or references outside the supported skills boundary make coverage incomplete and prevent a passing cell. This is conservative: optional generated files mentioned literally, such as an unselected backend stack, can also leave coverage incomplete. Dynamic paths, conditional workflow behavior, and complete execution of a skill are outside this read-access contract. See the report's required-file list for the exact measured coverage.

`--delivery injected` installs files under `.agents/skills` for both vendors and includes each selected `SKILL.md` body in the prompt with agent-valley's `## Skill` and `Source:` format. Both delivery modes require successful, matching native reads of the entry and required references. Injecting the body, reporting native activation, or returning the expected JSON alone does not prove those reads.

The audit uses isolated CLI settings and restricted read tools or a read-only sandbox. Codex's sandbox does not prohibit every command. These checks measure file access under the declared delivery mode; they do not certify skill workflow correctness or reproduce every agent-valley execution setting.

## Consume results in agent-valley

Reports expose `protocolVersion`, `sourceKind`, `delivery`, and `auditScope`. Synthetic fixture reports have `sourceKind: "synthetic"` and `auditScope: "fixture-contract"`. Installed reports have `sourceKind: "installed"`, `auditScope: "read-reference"`, and a `bundle` manifest. The protocol for these fields is `oma-skill-matrix-v2`.

agent-valley can show cached results in `av doctor` and optionally use installed read-audit evidence to filter work Actor candidates before its existing cost and success-rate ranking. Configure the local report in the target project's `av.yaml`:

```yaml
oma:
  skill_compatibility:
    mode: warn
    report_path: installed-matrix.json
    max_age_hours: 168
```

`warn` reports diagnostics without changing routing. `require` accepts only matching installed, injected, completed live results with complete reference coverage. AV recomputes current source hashes through an OMA plan and checks the protocol, OMA version, platform, architecture, CLI version, explicit observed model, and required case results. Missing, stale, or unobserved conditions remain unverified. Updating skill resources or execution conditions invalidates previous evidence.

`av doctor` and work dispatch do not run live matrix calls. Generate reports separately and protect them as local operator-controlled evidence. Worktree copies and resumed missions are checked again. These reports provide read-access evidence; AV's task review and completion checks still establish whether the actual work succeeded.

## Read the evidence

Each vendor/case cell has one status:

| Status | Meaning |
| --- | --- |
| `pass` | Native execution completed successfully, the exact final JSON matched, required retrieval and missing-resource evidence was present, and the installed files were unchanged. |
| `fail` | A required execution, output, or file-integrity check failed. |
| `unverifiable` | Execution and output checks passed, but required content or missing-resource evidence was absent. |
| `error` | Execution could not be completed or its native event stream could not establish a complete result. |

The `content` and `reference:*` checks report a `proof` of `read` or `canary`. A read proof requires a successful, unambiguous read with content matching the installed file. A canary is a fresh random value placed in one skill file and held by the evaluator; returning it proves retrieval of that file's content.

Content retrieval and native activation are separate observations. `nativeActivation: "observed"` records an explicit matching native activation event; `"unobserved"` means that event was not observed. A cell can pass through a canary while activation remains unobserved. It does not prove the CLI's internal activation mechanism.

An attempted read, a statement that a file was read, or correct JSON alone does not establish retrieval. Missing-resource checks require a correlated not-found result for the expected path. Intermediate answers do not satisfy the final output contract.

## Supply a custom skill

Save this self-contained suite as `custom-matrix.json`:

```json
{
  "schemaVersion": 1,
  "cases": [
    {
      "id": "relative-answer",
      "skill": "example-answer",
      "prompt": "Use the example-answer skill. Return only its required final JSON object.",
      "files": {
        "SKILL.md": "---\nname: example-answer\ndescription: Read the relative answer reference when explicitly asked to use example-answer.\n---\n\nRead references/answer.txt relative to this skill directory. Return exactly one JSON object with the file's trimmed text as its value field. Do not guess the text or add commentary.\n",
        "references/answer.txt": "{{OMA_MATRIX_CANARY}}\n"
      },
      "references": ["references/answer.txt"],
      "expected": {"value": "{{OMA_MATRIX_CANARY}}"},
      "canary": {"file": "references/answer.txt", "field": "value"}
    }
  ]
}
```

```sh
oma skills matrix --suite custom-matrix.json --json
oma skills matrix --suite custom-matrix.json --live --yes --json
```

Every case requires a unique `id`, a unique `skill` name, a `prompt`, inline UTF-8 file contents in `files`, and an `expected` JSON object. `SKILL.md` must have frontmatter whose `name` matches `skill` and a nonempty description. The final response must equal `expected`, including its fields and values.

All file paths are relative to the installed skill root: `.claude/skills/<skill>/` for Claude and `.agents/skills/<skill>/` for Codex inside the temporary workspace. `references` lists installed files whose retrieval must be evidenced. Optional `missing` lists paths that must remain absent and produce a not-found read result. It does not create those files.

Optional `canary` names one installed `file` and one top-level `expected` field. Put `{{OMA_MATRIX_CANARY}}` exactly once in that file and use it as the entire value of the expected field. Do not put the placeholder in the prompt or any other location. Each cell receives a new value. A reference canary proves only the reference named in `canary.file`; other required references still need successful read evidence. Without a canary, a successful content-matching `SKILL.md` read is required, so matching the expected JSON can still result in `unverifiable`.

Suites are bounded to 1 MiB, 32 cases, 32 files per case, and 128 KiB per file. Paths must be relative POSIX paths without traversal, hidden components, or host control files such as `AGENTS.md`, `CLAUDE.md`, settings, or MCP configuration. Symlinks and file/directory collisions are rejected. This version tests instruction and reference files; it does not provide script execution or project editing for custom skills.

## Isolation and reports

The command leaves the source project's skills and settings unchanged. Each live cell uses temporary skill files and isolated vendor configuration, removed after execution. Authentication material is staged for native login; project settings, user instruction files, hooks, plugins, MCP configuration, and custom provider configuration are not inherited. Models use the isolated CLI default unless an explicit supported model name is supplied. A custom provider configured in your usual CLI profile is outside this version's scope.

Reports contain suite and content hashes, check results, activation observations, duration, and CLI/model conditions where observable. The top-level `models` records requested model names; each cell's `model` records only a model reported by the native CLI and is `null` when unavailable. Requested names are not treated as observed models. Unavailable CLI versions are also `null`. Usage and cost appear only when reported by the vendor. Reports omit raw transcripts, file contents, environment values, and credentials. An optional `--report` file is the only requested persistent output; it is created with restricted permissions and cannot replace an existing file.

Automated matrix tests use fixture executables and native event fixtures. They do not establish that actual live Claude or Codex runs passed on your machine.
