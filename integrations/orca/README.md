# OMA for Orca

Connect an Orca project to OMA and insert review, debugging, verification, and
result-summary requests into an existing agent terminal. OMA remains the project's
source of skills and instructions; Orca remains the workspace and terminal host.

Requires Orca **1.4.197 or newer** with the experimental plugin system enabled.
The plugin is dependency-free JavaScript and HTML. It needs no build, bundler,
package installation, API key, or background service.

## Install

In Orca, open **Settings → Plugins**, enable the plugin system, and install from
Git using this versioned source **after the `orca-v0.1.0` tag is published**:

```text
https://github.com/first-fluke/oh-my-agent.git#orca-v0.1.0
```

Alternatively add the same tagged Git source as a marketplace source. The plugin
release's root `orca-marketplace.json` lists `first-fluke.oma`. An entry is installable only when
its referenced tag exists. Official marketplace inclusion is a separate upstream
review; a private/custom marketplace does not imply official endorsement.

For development, use **Install plugin → Local folder** and select the
`integrations/orca` folder in an OMA checkout. Review the two capabilities and
enable **OMA for Orca**. Orca copies a local installation: reinstall after changes.
Do not select a working folder containing dependencies, private files or escaping
symlinks; the installer validates the complete source tree.

## Use

1. Open a project worktree and start your coding agent in a terminal.
2. Open **OMA** in the right sidebar, then select that terminal's ID.
3. Choose **Connect project** and review the request preview.
4. Click **Insert into agent terminal**, review the inserted text, then press Enter.
5. Use **Review changes**, **Diagnose and fix**, **Verify changes**, or **Show results**.

Connect project asks the agent to detect existing project OMA and preserve its
configuration. If project OMA is absent, it uses `oma install` when available.
If the CLI is absent, run `npx oh-my-agent` interactively in a separate shell
terminal. A session restart may be needed for newly installed instructions.
Installing this plugin alone does not install OMA or enable it in every chat.

The same five actions are available in the command palette under **OMA:**.
Palette actions require exactly one terminal in the focused worktree. With
multiple terminals, select one in the panel instead. All actions insert text
without pressing Enter, including palette actions. Select a coding-agent terminal,
not a shell prompt. The plugin cannot identify terminal providers through the
current host API.

Results stay in the agent conversation and local reports/diffs. The panel reports
request insertion only: it does not claim that the agent ran, finished, or passed
verification. There is no live result dashboard in this release.

## Capabilities and boundaries

| Capability | Purpose |
| --- | --- |
| `workspace:read` | Read focused worktree display name, branch and terminal IDs |
| `terminal:send` | Insert the selected request into a specific terminal |

No network access, shell subprocesses, event subscriptions, global configuration
edits, or credential access are performed by the plugin. The agent may use its
own configured services when the user submits a request. Inserting a request
does not grant new permissions to the agent.

The host rechecks that a terminal belongs to the active worktree before sending.
The panel also checks for changed context and locks concurrent clicks. A timeout
does not prove delivery failed: inspect the terminal before retrying. Writes are
never retried automatically.

## Compatibility

Checked against the public source at Orca `v1.4.197`:

- `src/shared/plugins/plugin-manifest.ts`
- `src/shared/plugins/plugin-host-api.ts`
- `src/shared/plugins/plugin-panel-bridge.ts`
- `src/main/plugins/plugin-host-runtime.ts`
- `src/shared/plugins/plugin-marketplace.ts`

The official workflow-skills example still declares `contributes.skills`, but
this Orca version rejects that field and hides the `skills` marketplace category.
OMA therefore uses existing project skills through agent requests. This plugin
does not depend on the unsupported panel-to-worker command bridge.

The host CSP permits inline scripts only. `panel.html` contains the shared prompt
catalog as inert JSON; `main.mjs` reads that catalog for palette commands. There
is one prompt source and no generated panel bundle. Plugin workers run locally;
workspace operations continue to route through Orca.

## Verify and release

Run `bun run test:orca` from the OMA monorepo, or `node --test plugin.test.mjs`
from a standalone plugin checkout.

The tests execute the shipped worker and inline panel code, covering explicit
targeting, stale context, denied/rejected writes, duplicate requests, timeout
handling and prompt parity. They do not substitute for an Orca installation test.

Plugin versions and `orca-v*` tags are independent of CLI releases. Before
publishing a new plugin version, update this folder's `orca-plugin.json` and the
source ref in its `orca-marketplace.json`, run tests, and test
installation. Publish the source tag from a Git subtree split of
`integrations/orca`, so `orca-plugin.json`, `main.mjs` and `panel.html` are at the
tag's root. The full monorepo cannot be installed: Orca caps plugin trees at
2,000 entries and 50 MiB and rejects symlinks. Do not tag the monorepo root as a
plugin release.

For official listing, add the entry from `orca-marketplace.json` to
[`stablyai/orca-plugins`](https://github.com/stablyai/orca-plugins)'s index. Use the
PR text in `marketplace-pr.md`, substituting actual release and test evidence.
Confirm the tag is publicly readable before submitting; never list an older CLI
tag that lacks this plugin. Do not use the reserved `official` or unsupported
`skills` categories.

### Validation record (2026-09-05)

- Native Node tests: 11 passed on macOS.
- Orca 1.4.197: local-folder installation, capability review and enablement passed.
- The native sidebar rendered the panel, loaded the focused workspace and listed
  terminal handles. A disposable smoke-test terminal was explicitly selected;
  the panel reported insertion and `orca terminal read` confirmed the request
  text. Enter was not sent, and the smoke-test tab was closed afterward.
- Denied, stale-target and timeout paths were tested with the deterministic host
  harness. No coding-agent task was submitted during the installation smoke test.
- No build or bundle was run. Linux/Windows UI installation is not yet assessed.
