# Native skill compatibility matrix

`oma skills matrix` checks skill content retrieval, relative references, and final output contracts through the native Claude and Codex CLIs. It installs each case into a fresh temporary workspace instead of adding the skill instructions to the task prompt.

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

These are diagnostic skills supplied by the matrix. Passing them does not certify the shipped OMA skills or every behavior of a vendor. Use a custom suite to test a specific skill and its contract.

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
