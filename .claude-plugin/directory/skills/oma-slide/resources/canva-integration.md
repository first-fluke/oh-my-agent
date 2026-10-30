# Canva MCP Integration — oma-slide

> Optional export/import channel connecting oma-slide decks to Canva via the Canva Remote MCP server.
> This channel is **never required** — all existing local export paths (HTML, PDF, PNG, PPTX) remain fully functional without it.

## Prerequisites

### Canva Remote MCP Server

- **Endpoint:** `https://mcp.canva.com/mcp`
- **Transport:** Streamable HTTP (remote MCP)
- **Authentication:** OAuth 2.0 via Canva Connect — user must authorize the MCP connection through their Canva account.

### MCP Client Configuration

The Canva Remote MCP server must be registered in the project's MCP client configuration.
Canva uses a **remote URL** transport — no local npm package or binary is required.

The config entry shape (inside `mcpServers`):

```json
"canva": {
  "url": "https://mcp.canva.com/mcp"
}
```

> **Note (Antigravity CLI):** Some agy versions use `serverUrl` instead of `url` for
> remote MCP servers. The auto-provisioning step detects the existing convention in
> the target config file and matches it.

#### Vendor-specific config file locations

| Vendor | Scope | Config file | Key path |
|--------|-------|-------------|----------|
| Claude / Cursor | project | `.mcp.json` | `mcpServers.canva` |
| Gemini VS Code Extension | project | `.gemini/settings.json` | `mcpServers.canva` |
| Antigravity CLI (agy) | project | `.agents/mcp_config.json` | `mcpServers.canva` |
| Antigravity CLI (agy) | user global | `~/.gemini/antigravity-cli/mcp_config.json` | `mcpServers.canva` |
| Antigravity shared | user global (IDE+CLI) | `~/.gemini/config/mcp_config.json` | `mcpServers.canva` |
| OMA shared | project | `.agents/mcp.json` | `mcpServers.canva` |

All config files use the same `{ "url": "https://mcp.canva.com/mcp" }` shape
(or `{ "serverUrl": ... }` for Antigravity if that convention is detected).

### Available capabilities

Use the connected server's tool list and parameter schemas as the execution contract.
Tool availability depends on account permissions, plan, and the current server. Do not
assume brand-template autofill or a particular export format is available.

## Canva MCP Tool Mapping

The following are names in the official remote server documentation. Client wrappers
may normalize their names; resolve the callable tools before invoking them.

| Operation | Documented remote tool | Contract |
|---|---|---|
| Browse or verify access | `search-designs` | Use the discovered query/filter schema |
| Read a design | `get-design` | Supply an authorized design ID |
| Export from Canva | `export-design` | Check supported formats in the tool schema |
| Import an existing deck | `import-design-from-url` | Requires a URL Canva can retrieve; a local path is not a URL |
| Upload an image asset | `upload-asset-from-url` | Requires a publicly accessible HTTPS asset URL |

`upload-asset-from-url` uploads an asset; it does not create a presentation or map an
array of asset IDs to pages. Do not invent a presentation-creation call that maps an asset-ID array to pages,
or pass a local filepath to a URL-upload tool.

References: [official MCP tools](https://www.canva.dev/docs/apps/mcp/tools/),
[URL asset upload](https://www.canva.dev/docs/apps/mcp/tools/upload-asset-from-url/).

## Export Pipeline: oma-slide → Canva

Trigger: the user requests a Canva export.

1. Discover the connected tools and probe access with `search-designs` using its schema.
   On authentication failure, explain the required OAuth connection and retain the local deck.
2. Produce a local deck with `oma slide export pptx --workspace <deck-dir>`.
3. If `import-design-from-url` is available, inspect its accepted formats and parameters.
   Use an existing Canva-readable URL authorized for this transfer. A local filepath cannot
   be passed to the remote server.
4. If only local files exist, deliver the PPTX for manual Canva import or resolve a suitable
   transfer destination with the user. Do not publish the file or enable public sharing merely
   to satisfy the remote tool's URL requirement.
5. Follow the tool's returned status/job schema. Report the returned Canva design URL only
   after the complete deck has imported. A missing or failed page makes the transfer incomplete;
   report it rather than silently skipping slides.

PPTX output is raster-backed: each slide is a PNG, so importing it does not make text
editable. Editable Canva content requires a separately supported editing workflow.

## Import Pipeline: Canva → oma-slide

Trigger: the user supplies a Canva design URL/ID or requests an import.

1. Resolve the design ID from the supplied URL or use `search-designs` when browsing is needed.
2. Read the design with `get-design` and inspect available export formats.
3. Request PPTX through `export-design` when supported. Follow its returned status and download
   URL schema; do not assume a fixed polling API.
4. Download the completed export into `<workdir>/imports/`, then use
   `oma slide import pptx <downloaded.pptx> --workspace <deck-dir>`.
5. Use the imported content as the base for any requested revision. If PPTX is unavailable,
   explain the supported alternatives before changing format.

## Browse Pipeline

Use `search-designs` with the user's query and present matching titles/URLs. Continue
with the selected design only within the requested operation's scope.

## Error Handling

| Error | Response |
|---|---|
| Server not configured | Offer the setup below when Canva was requested |
| OAuth or permission failure | Explain the missing access; retain local outputs |
| Local filepath supplied to URL tool | Use an authorized reachable URL or deliver a local file for manual import |
| Unsupported import/export format | Report the capability limit and supported alternatives |
| Transfer or job failure | Report the incomplete transfer; do not present skipped pages as success |
| Design not found | Show the requested ID and optionally search with the supplied query |

---

## Auto-Provisioning: Canva MCP Setup

When the skill detects that Canva MCP is not configured and the user has requested a Canva
operation, the skill **offers** to add the Canva MCP entry to the project config files.

### Detection

The skill checks for the `canva` key in `mcpServers` across known config files:

```
Project-level:
1. .agents/mcp.json                               (OMA shared SSOT)
2. .agents/mcp_config.json                         (Antigravity CLI project-scoped config)
3. .mcp.json                                       (Claude / Cursor project config)
4. .gemini/settings.json                            (Gemini VS Code Extension project settings)

User-global (optional, only if project-level is absent):
5. ~/.gemini/antigravity-cli/mcp_config.json        (agy CLI global config)
6. ~/.gemini/config/mcp_config.json                 (Antigravity shared IDE+CLI config)
```

If `canva` is absent from **all** project-level files, the skill surfaces a setup prompt.
User-global files are checked as a fallback — if Canva is configured globally but not
in the project, the skill notifies instead of re-provisioning.

### Setup Prompt

Ask the user:
> "Canva MCP is not configured in this project. Would you like me to add it to your
>  MCP config files? This adds `{ "url": "https://mcp.canva.com/mcp" }` to
>  mcpServers — no local packages are installed."

Options:
- **Yes, add to all config files** — write to all detected config files
- **Yes, add to current vendor only** — write to the active vendor's config only
- **No, skip Canva** — proceed without Canva; use local exports

### Provisioning Steps

For each target config file:

1. **Read** the existing JSON file.
2. **Parse** and verify it has a `mcpServers` object.
3. **Add** the `canva` entry:
   ```json
   "canva": {
     "url": "https://mcp.canva.com/mcp"
   }
   ```
4. **Write** the updated JSON back with the same formatting (2-space indent).
5. **Verify** the file is valid JSON after write.

### Post-Provisioning

After writing config files:

1. **Notify the user** that a session restart may be needed for the MCP client to pick up
   the new server. Some runtimes (e.g., Gemini CLI) require a restart; others hot-reload.
2. **Attempt a probe** (`search-designs` using the discovered schema) — if it succeeds, continue with the Canva operation.
   If it fails (expected on first run before OAuth), notify:
   > "Canva MCP config added. You'll need to authenticate with Canva on first use.
   >  The OAuth flow will be triggered automatically by your MCP client."
3. **Record the setup** through the configured session-memory capability when available. If it is
   unavailable, rely on the existing config file after checking it before any future prompt.

### Config File Safety

- **Never overwrite** an existing `canva` entry — if it exists with different settings, skip.
- **Never modify** non-`mcpServers` fields in any config file.
- **Backup** is not created (JSON merge is additive and reversible by removing the key).
- **`.agents/` SSOT rule**: the skill writes to `.agents/mcp.json` and `.agents/mcp_config.json`
  only when the user explicitly approves. This is a config-level change, not a skill definition change.

---

## Security Considerations

1. **OAuth tokens are managed by the MCP client** — the skill never handles or stores Canva credentials.
2. **Design data is sent to Canva through the MCP server** — the skill only sends/receives files and metadata.
3. **Uploaded assets are stored in the user's Canva account** — the skill does not control retention or sharing.
4. **No Canva API calls outside MCP** — all Canva interactions go through the registered MCP server tools.
5. **Auto-provisioning is user-approved** — the skill never writes MCP config without explicit user consent.
