# Capability providers (experimental)

OMA separates documentation, code intelligence, semantic recall, and deterministic
workflow state. Gortex and Honcho are opt-in integrations; existing installations
keep Context7, Serena, and the existing optional AgentMemory behavior.

| Capability | Default | Alternatives | Fallback |
| --- | --- | --- | --- |
| Documentation | Context7 | — | Official documentation through web search |
| General web search | Runtime native search | Brave Search | Explicit failure; no automatic provider switch |
| Code intelligence | Serena | Gortex (experimental) | Native search/read |
| Semantic memory | AgentMemory | Honcho (experimental), `none` | Local evidence only |
| Coordination and verification | `.agents/state/` | — | No external memory dependency |

## Configuration

`oma install` offers a code-intelligence choice (Serena or Gortex) and a semantic
memory choice (Agent Memory, Honcho, or none). Fresh installs default to **Serena
and Agent Memory**. Web search offers Native (default) or Brave Search;
reinstalling retains saved choices. For unattended installs:

```sh
oma install --yes --code-intelligence gortex --semantic-memory honcho \
  --honcho-url http://127.0.0.1:8000 --honcho-workspace oma
```

Honcho selection also prompts for its server URL and workspace. New connections
default to the local origin above, workspace `oma`, and `recall_mode: messages`;
existing connection settings, credentials references, and recall mode are retained.
The selection is saved before native configurations and hook routing are linked.
Selecting Gortex skips Serena's binary, project, and context setup. Gortex and the
Honcho server must be installed separately; selecting them does not start services
or track repositories. Use `oma memory keys` to configure the credentials needed
by your deployment, then `oma memory status` to check access. Selecting Agent
Memory preserves its existing optional setup behavior.

Set the following in the project's `.agents/oma-config.yaml` through your normal
configuration source. Omit any field to retain its default.

```yaml
providers:
  docs: context7
  web: native
  code_intelligence: gortex
  semantic_memory: honcho

honcho:
  workspace_id: my-team
  project_id: my-project
  api_key_env: HONCHO_API_KEY
  base_url: https://api.honcho.dev
  timeout_ms: 5000
  max_results: 8
  max_tokens: 2000
  recall_mode: hybrid  # hybrid | messages
```

Supply the API key through the named environment variable or an OS-keychain
reference (`api_key_vault`); do not put the actual key in YAML. A nonempty
environment key takes precedence over the keychain reference. Keychain failures
do not fall back to unauthenticated requests or expose credential diagnostics.
`workspace_id` is required for Honcho access. `project_id` is optional: its default
is the resolved project-root path. Set a stable, unique project ID to share recall
across checkouts or machines. Reusing an ID in the same workspace intentionally
shares memory. Provider selection is resolved from the project configuration;
global MCP projection does not make memory configuration global to all projects.

Apply the native configuration and inspect status:

```sh
oma link --dry-run
oma link
oma doctor
oma memory status
```

Run `oma link` after changing providers, including when reverting to defaults.
There is no automatic Gortex/Honcho installation, service deployment, or repository
tracking in this integration.

## Search provider extension interface

Search integrations share the `SearchProviderDefinition` and
`SearchProviderAdapter` contracts in `cli/types/search-provider.ts`. The explicit,
instance-scoped `SearchProviderRegistry` lives in `cli/platform/search-providers.ts`.
An integration registers a unique ID, supported capabilities (`web`, `docs`,
`contents`, `research`), transport (`runtime`, `mcp`, `api`), and authentication
metadata. API credentials are resolved lazily through the supplied context;
provider metadata contains environment variable names, not secret values.

Adapters implement read-only `status(context)` and `execute(request, context)`.
Requests retain capability-specific inputs, including library/version for docs
and URLs for content reads. Responses retain source URLs, titles, excerpts,
provider/capability provenance, and optional vendor-specific `extensions`.
The execution boundary rejects unsupported capabilities and mismatched provenance,
propagates cancellation, and bounds waiting by the caller's abort signal. Adapters
must also propagate the signal to their own I/O so cancelled work actually stops.
There is no implicit fallback, plugin discovery, installation, or MCP projection.

Inspect the shipped registry and current selection without network calls:

```sh
oma search providers --pretty
```

Currently, `native` declares runtime-managed web search and `context7` declares
runtime-managed MCP documentation search. Neither has a CLI execution adapter;
`runtime-managed` does not certify that the active agent has a connected search
tool. Registration likewise does not certify credential validity or reachability.
Brave has a CLI execution adapter for `web`. The existing URL-fetch and platform
API search commands retain their existing behavior.

`providers.web` defaults to `native` and accepts a provider ID. The registry checks
whether that ID is registered and supports web search; `oma search providers`
returns a nonzero exit status for missing or incompatible selections, and
`oma doctor` reports them. `providers.docs` remains restricted to Context7 until
another documentation integration is wired through configuration and routing.

You.com is not implemented or offered during installation. To add another provider,
implement its adapter and register its definition in
`createSearchProviderRegistry()`, then connect the execution/MCP route and installer
credential configuration. Only advertise capabilities the adapter actually supports.
Setting `web: you` reports `unregistered`. Registry tests use a synthetic adapter to verify dispatch,
capability checks, cancellation, provenance, and registration isolation.

## Brave Search

Brave uses the official [Web Search API](https://api-dashboard.search.brave.com/api-reference/web/search/get)
directly from the CLI; no browser, extra MCP server, or SDK package is required.
Only general web search is registered. Page reads continue through
`oma search fetch <url>`; documentation searches use Context7.

Select Brave during `oma install`, or pass `--web-search brave`. Alternatively,
set the following through your configuration source and run `oma link` to update
agent instructions:

```yaml
providers:
  web: brave

# Optional credential references; these are the defaults, not key values.
brave:
  api_key_env: BRAVE_SEARCH_API_KEY
  api_key_vault: brave-search
```

Provide `BRAVE_SEARCH_API_KEY` in the environment, or use hidden input to store
the key in the OS keychain:

```sh
oma vault store brave-search
oma search web "TypeScript release notes" --limit 5 --pretty

# Override the provider for one request without changing the configuration.
oma search web "TypeScript release notes" --provider brave --pretty
```

A nonempty environment value takes precedence over the configured vault entry.
The API key is sent only in the `X-Subscription-Token` header to
`https://api.search.brave.com/res/v1/web/search`; redirects are rejected.
Actual keys are never written to project YAML by this integration. The existing
vault command owns key storage; the installer displays its setup instruction and
does not prompt for or test a Brave key itself.

Requests accept 1–20 results (default 10), a nonempty query of at most 400
characters and 50 words, and `--timeout` in seconds (default 15, range 0.1–120).
Output contains source URLs, titles, excerpts and the returned web-result fields
under `extensions.brave`. Non-HTTP(S) result URLs are excluded. Missing credentials,
authentication failures, rate limits, malformed responses and network errors fail
explicitly without switching providers or printing upstream error bodies.

`oma doctor` checks Brave credential availability with a one-second deadline and
no Brave API request; it does not certify a valid key, quota or reachability. Other
doctor checks may contact their respective services. `oma search providers` only
reports registration. Native search remains owned by the agent runtime and has
no standalone CLI adapter, so `oma search web` requires Brave selection or an
explicit `--provider brave` override.

Generated agent instructions route general web questions through
`oma search web` when Brave is selected, overriding native-web routing in installed
skills. Run `oma link` after changing the selection; returning to Native removes
the Brave instruction. Search results remain untrusted evidence and source links
should be cited.

## Gortex

Install [Gortex](https://github.com/zzet/gortex) separately. OMA projects `gortex mcp --tools compact` into the selected runtimes'
native MCP files and removes their Serena entry while Gortex is selected. Existing
custom Gortex commands are retained. Pi also receives the `pi-mcp-adapter` package
registration, even when no browser MCP is selected.

New OMA entries explicitly select the [compact MCP surface](https://github.com/zzet/gortex/blob/main/docs/mcp.md#compact-mcp-surface):
21 domain tools, with operation schemas discovered through `capabilities`.
Existing custom Gortex entries keep their chosen preset. An inherited
`GORTEX_TOOLS` environment variable takes precedence over the CLI flag.

Generated agent instructions route code-intelligence work to Gortex and override
Serena-specific skill routing. The `code-intelligence-primer` hook detects the active
code-intelligence provider and injects Gortex primer guidance (`[OMA GORTEX PRIMER]`)
into sessions, replacing the Serena primer.

### Project setup (install and update)

Selecting Gortex in the installer is the consent to track the project. In
project mode, `oma install` and `oma update` both run the same idempotent
setup, mirroring Serena's `project.yml` maintenance:

1. **Tracking** — when `gortex repos --json` does not list the project root,
   `oma` runs `gortex track <root>`. The initial index continues in the daemon
   after the command returns. An already tracked root is never re-tracked
   (that call blocks on the daemon's control budget without effect).
2. **Excludes** — the project's tracked entry gains OMA's generated directories
   (`.agents/results/`, `.agents/state/`, `.agents/backup/`) and tool caches
   missing from Gortex's builtin baseline (`.ruff_cache/`, `.pytest_cache/`,
   `.turbo/`, `coverage/`) through `gortex config exclude add --repo <name>`.
   Only missing patterns are added; user patterns and the rest of Gortex's
   config stay untouched, and the Gortex CLI reloads the daemon itself. Without
   these excludes, every write to those directories becomes a watcher patch
   that holds the daemon's writer gate, and a saturated gate makes graph
   queries time out for every tracked repository.

Nothing is written into the project tree: both steps live in Gortex's own
user-level configuration (`~/.gortex/config.yaml`), which OMA only ever edits
through the Gortex CLI. Users do not need to know these settings exist;
re-running `oma update` on another machine converges it again.

Global installs skip both steps: their root is `$HOME`, which is not a
codebase. A missing binary or an unresponsive daemon degrades to a warning; the
install never fails on Gortex. OMA still does not run `gortex install` or
`gortex init`, and agent sessions must never track additional repositories.

Previous native Serena/Gortex entries are saved in
`.agents/state/provider-mcp.json`. Switching back to Serena restores these entries
and removes an OMA-added Gortex entry. Preserve this backup until restoration;
it can contain environment values from custom MCP entries and is written with
owner-only permissions. User-managed servers outside the projected native files
are outside this reconciliation scope. The shared `.agents/mcp.json` template
is not changed by provider projection.

`oma doctor` reports Gortex binary availability and whether the current project is
in the daemon's tracked set (`gortex repos --json`); an untracked project is an
issue with `oma update` as the fix. It does not validate that a graph has been
indexed or run a graph query. If Gortex is unavailable, use native search;
OMA does not silently activate Serena as a second provider.

## Local runtime state and delivery retries

Agent runs, claims, plan pins, resume checkpoints, and CLI memory retries
use `~/.oma/u/<profile>/projects/<project-hash>/`. Their locks use the same
profile/project scope. `OMA_STATE_HOME` replaces `~/.oma`; `OMA_PROFILE` selects
the numeric profile, defaulting to `0`. The project hash is the SHA-256 of its
canonical absolute path. Branches at the same path share state; separate
worktree paths do not.

Let `P` be `~/.oma/u/<profile>/projects/<project-hash>`:

| Data | Previous location | Current location |
| --- | --- | --- |
| Runs, claims, output, sequence | `.agents/state/agent-runs/` | `P/agent-runs/` |
| Plan pins | `.agents/state/agent-plans/` | `P/agent-plans/` |
| Resume checkpoints and leases | `.agents/state/agent-resume/` | `P/agent-resume/` |
| CLI delivery queue and ACKs | `.agents/state/retry/` | `P/retry/` |
| CLI delivery intents | None | `P/retry/outbox/` |

These runtime readers use only the current location, including profile `0`.
Normal runtime readers do not consult old files. Project-mode `oma update`
runs a one-time migration before installing hooks; explicit migration is also
available. Originals are preserved, matching copies are skipped, and conflicting
or active records are reported instead of overwritten. L1 sessions remain under
`~/.oma/u/<profile>/sessions/<sid>/`. Plans and reports remain under
`.agents/results/`, and coordination Markdown remains under
`.agents/state/memories/`.

CLI retry rows require `memoryDelivery` (observe/remember flags) and
`memoryTarget` (version, provider, profile, project ID, original project
directory, and destination). The destination pins the non-secret endpoint and
Honcho workspace/session where applicable. Changing provider or destination
retains the backlog instead of sending it elsewhere. An unresolved endpoint
is retained too. URLs containing credentials, query parameters, or fragments
are not persisted as delivery identities. Old event-only retry rows are ignored;
there is no adoption option or target-binding sidecar.

`emitEventWithMemory()` persists a delivery intent before appending L1. Retry
drain recovers only intents whose exact event exists in L1, without appending
that event again. ACK records contain `deliveryId` and `dimension`: the ID is
bound to destination, session, and event, and observe/remember are acknowledged
separately. ACKed queue records prevent recovery from regenerating completed
deliveries. A dry run does not recover intents or write ACKs. Remote success
followed by a local ACK failure can still produce a duplicate remote write.

`memory-delivery.ts` owns provider selection, intent preparation, drain leases,
outbox recovery, queue selection, delivery, and operation ACKs. Both immediate
event delivery and CLI retry drain use that service. `events.ts` owns the
intent-before-L1 append boundary and delegates delivery; the CLI drain only
resolves arguments. The outbox, queue, and ACK files retain their distinct
preparation, pending, and completion roles and their existing storage format.

CLI-dispatched hooks use this delivery queue. Installed pi, OpenCode, and
Antigravity handler scripts forward stdin, cwd, and profile through
`oma hook script` and run one allowlisted handler under the same memory adapter.
Reinstall or run `oma link` with the updated CLI to refresh these generated
wrappers. The managed `.agents/` definitions remain unchanged. Core handlers
append L1 before calling the adapter, so the pre-L1 intent guarantee applies to
`emitEventWithMemory()`, not that earlier hook boundary.

### Migrate existing project runtime data

```sh
oma state migrate --runtime --dry-run --json
oma state migrate --runtime --json
```

This migration copies completed run receipts, claims, outputs, plan pins, and
resume state into profile `0` storage. It adjusts receipt output paths and
monotonically reconciles the run sequence. Live or unknown execution owners,
unsafe paths, and destination conflicts are reported without overwriting data.
It leaves L1 sessions and project artifacts untouched. A dry run writes nothing,
and rerunning the command skips identical copies.

Retry migration performs no network calls. Raw queue and ACK snapshots, including
original inode identity, are preserved under
`P/retry/migration-unbound/<snapshot-hash>/`. Rows with no recorded destination
remain there and are excluded from automatic delivery. Rows that already pin a
valid destination retain that destination and their completed operation ACKs.
The migration verifies source stability and uses queue leases when publishing.
Old project files remain as originals; there is no permanent fallback reader.


## Honcho

### Configure credentials

Honcho connection credentials and the self-hosted server's embedding credentials
serve different purposes. Use the hidden-input prompt for the one you need:

```sh
# Hosted/authenticated Honcho: store in the OS keychain and add api_key_vault
# to the existing project's .agents/oma-config.yaml.
oma memory keys --kind connection

# Local Honcho with the default OpenAI embedding configuration:
# store the key in ~/.honcho/profiles/oma/.env, outside the project.
oma memory keys --kind embedding --profile oma
```

The connection command preserves existing YAML settings and comments, and does
not change provider selection. Local keyless Honcho needs no connection key.
The embedding command writes the profile file with mode `0600`; this is a local
credential file, not the OS keychain. It sets `DERIVER_ENABLED`,
`SUMMARY_ENABLED`, `PEER_CARD_ENABLED`, and `DREAM_ENABLED` to false, and
`EMBED_MESSAGES` to true. The embedding service still processes message content;
disabling generative inference does not disable embedding requests.

`HONCHO_CONFIG_DIR` relocates the profile directory as in the upstream CLI;
credential profiles inside the project are rejected. Existing embedding model,
transport, endpoint, and vector dimensions are preserved. A new profile uses
Honcho's default OpenAI embedding configuration. For an **already configured**
Gemini embedding profile, use `--key-env LLM_GEMINI_API_KEY`; this only selects
the credential variable, not the model or transport. The default variable is
`LLM_OPENAI_API_KEY`. Profile changes apply when the server is restarted.

```sh
# Preview without prompting, opening the keychain, or writing a file.
oma memory keys --kind embedding --profile oma --dry-run

# Automation: read from an existing environment variable, never a key argument.
oma memory keys --kind connection --from-env HONCHO_SETUP_KEY --json

# After installing the latest upstream CLI, start/restart the configured profile.
# This pulls the latest image and may issue embedding requests once data is sent.
honcho start --profile oma --image ghcr.io/plastic-labs/honcho:latest
```

This command prepares credentials; it does not install/start Honcho or verify
the supplied key. Set OMA's `honcho.base_url`, `workspace_id`, and
`recall_mode: messages` for the local deployment, then run `oma link`.
`messages` skips inferred-representation recall but still uses semantic search
and therefore requires working embeddings. Fully model-free keyword recall
is not implemented in this adapter.

### Storage and recall

The adapter uses the [Honcho v3 API](https://honcho.dev/docs/v3): get/create a
workspace and project session, create messages, and search within that session.
Only durable conclusions from `decision.made`, `blocker.raised`, and
`skill.pattern.consolidated` events are automatically remembered. Raw transcripts,
diffs, task boards, and complete event envelopes are not sent. Raw transcript
imports are rejected for Honcho and `none`; existing AgentMemory retry entries
are retained without uploading them to a different provider.

Each project maps to a hashed session ID within the configured workspace. Messages
use the `oma` peer and retain their source OMA session in metadata. Recall checks
workspace, project session, peer, message ID, and OMA source metadata before
returning a result with provenance. By default, `recall_mode: hybrid` retrieves
Honcho's derived peer representation alongside message matches. Both requests
share one deadline and restrict recall to the same project session. Set
`recall_mode: messages` to use only the stored-message search.

Representations are curated around the current query and include frequently
derived conclusions. They can carry lasting preferences or project context inferred
from the durable decisions OMA recorded. The default `oma` peer represents this
project's OMA records, not an authenticated individual user's global personality.
OMA does not broaden the query to other projects or start uploading raw chats.

Inferred context is explicitly labeled advisory and potentially outdated. It is
not a user instruction, a verified fact, or workflow gate evidence. Its provenance
records the workspace, project session, peer, and retrieval time; the endpoint
returns no source-message IDs, so none are invented. Retrieval time is not the
age of the inference. Derivation is asynchronous: empty, unavailable, or timed-out
representations fall back to message results without an unscoped retry. The adapter
uses the current v3 representation API and does not add a per-request chat-model
reasoning call. Server-side derivation/search may still consume model resources.

Results are limited by count and an aggregate content budget. An inferred-context
item counts toward the same result limit and uses at most half the content budget
when message matches are present (except a one-result request). Oversized inferred
context is truncated at a Unicode boundary and marked; the advisory label also
counts toward the budget. `max_tokens` uses
UTF-8 bytes as a conservative upper bound, so it can return fewer results than
an exact tokenizer would. Oversized facts are skipped. Search order is preserved;
the adapter's reciprocal-rank score is not a Honcho confidence score.

Requests have a bounded timeout and do not follow redirects. Writes share one
timeout across workspace/session/message operations. Failures keep local OMA
events intact and return no remote recall; they do not upload data to another
provider. CLI durable event writes use the scoped replay queue described above;
direct adapter calls have no implicit replay queue. Repeated writes may produce
duplicates because the remote API does not supply an exactly-once guarantee.

For self-hosting, set `base_url` to the API origin. HTTP without a key is allowed
only on loopback; remote endpoints require HTTPS and a key. OMA does not provision
the Honcho server, databases, model credentials, or retention/deletion policies.
Honcho server licensing and deployment requirements should be reviewed separately
in the [upstream repository](https://github.com/plastic-labs/honcho).

The CLI event pipeline, skill optimization recall, and installed hooks use
the selected provider. Generated pi/OpenCode/Antigravity wrappers route each
handler through the CLI adapter, including Honcho recall and `none` opt-out.

`oma memory status` and the provider section of `oma doctor` check Honcho workspace
access with a read-only session-list request. They do not create a workspace.
Existing `oma memory setup`, daemon, upgrade, and maintenance commands remain
AgentMemory-specific.

## Diagnostics and evaluation

Context7 diagnostics report configuration presence, declared API-key versus
anonymous/client-managed authentication, and the official-documentation fallback.
Reachability is explicitly reported as `not-probed`; this does not certify a live
MCP connection or valid credentials.

Automated tests cover configuration defaults, native MCP formats, custom-setting
restoration, dry runs, SSOT symlinks, hook routing, project isolation, provenance,
budgets, authentication failures, timeouts, and raw-event exclusion. These are
local and mocked API checks. Live runtime compatibility, retrieval quality, token
cost, graph startup cost, and privacy/deletion behavior still need evaluation
against OMA fixtures before either integration is promoted from experimental.
