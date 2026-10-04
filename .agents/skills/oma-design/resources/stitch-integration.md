# Stitch MCP Integration (Optional)

## Overview

Google Stitch is an AI-powered UI design platform. Its MCP server enables
coding agents to interact with design projects programmatically.

Stitch MCP is **optional**; all 7 phases of the design workflow work
without it. It adds visual preview and design extraction capabilities.

## Connection and Setup

- Official remote MCP endpoint: `https://stitch.googleapis.com/mcp`
- API key settings: [Stitch Settings](https://stitch.withgoogle.com/settings)
- Authentication: Stitch API key or Google Cloud OAuth/ADC.

When the user requests Stitch and its tools are unavailable:
1. Resolve the MCP client from the current runtime or existing config. Ask
   only if it cannot be determined; preserve other MCP server entries.
2. Configure a direct HTTP connection to the official endpoint. Reuse
   existing credentials; prefer the client's Google OAuth/ADC integration
   when it supports Stitch. Otherwise use the API key route. Do not
   install a third-party MCP proxy as the default or fallback.
3. Run the matching setup procedure when setup is authorized; do not stop
   at displaying commands. The user completes Google sign-in, consent,
   project selection, or key creation when needed.
4. Reload/reconnect the client's MCP server, discover its tools, and call
   `list_projects`. An empty project list is a successful connection.

### OAuth/ADC with Antigravity CLI (`agy`)

Antigravity CLI supports Google Cloud ADC through
`authProviderType: "google_credentials"`. Use this provider for Stitch;
the account login used to run `agy` does not replace MCP ADC setup.

With the official gcloud CLI installed and the user's project selected:

```bash
gcloud auth login
gcloud auth application-default login
gcloud config set project YOUR_PROJECT_ID
gcloud auth application-default set-quota-project YOUR_PROJECT_ID
gcloud beta services mcp enable stitch.googleapis.com --project=YOUR_PROJECT_ID
```

The login commands open Google sign-in in the browser. The user completes
sign-in and consent; reuse valid credentials when already configured.
If the runtime cannot provide an interactive terminal or browser, give
the user the login command or gcloud's login URL and resume after login.
The account needs `roles/serviceusage.serviceUsageConsumer` on the selected
project. Report missing permissions without claiming a successful connection.

Merge this entry into the active Antigravity CLI `mcp_config.json`.
The current official global location is `~/.gemini/config/mcp_config.json`;
workspace configs use `.agents/mcp_config.json`. Prefer the private global
config for credentials. Use `/mcp` in `agy` to inspect and reload the
installed client's active configuration.

```json
{
  "mcpServers": {
    "stitch": {
      "serverUrl": "https://stitch.googleapis.com/mcp",
      "authProviderType": "google_credentials",
      "headers": { "X-Goog-User-Project": "YOUR_PROJECT_ID" }
    }
  }
}
```

Antigravity uses `serverUrl` for remote MCP connections; `url` and
`httpUrl` are not supported. Its Google credential provider manages ADC
access tokens. For other clients, verify their documented Google OAuth/ADC
support before choosing this route. Do not save a one-time bearer token
as a permanent MCP header or assume generic DCR OAuth works for Stitch.

### API Key with Direct HTTP

If the API key route is selected and no key is configured, open
`https://stitch.withgoogle.com/settings` in the user's browser. Use the
available browser tool or the command for the current OS:

| OS | Command |
|----|---------|
| macOS | `open 'https://stitch.withgoogle.com/settings'` |
| Linux | `xdg-open 'https://stitch.withgoogle.com/settings'` |
| Windows (PowerShell) | `Start-Process 'https://stitch.withgoogle.com/settings'` |

If opening fails or no browser is available, provide the clickable
[Stitch Settings](https://stitch.withgoogle.com/settings) link. Have the
user create a key under **API Keys → Create Key** and configure it in the
client's private MCP config or secret/environment mechanism. Keep the key
out of committed project files and design artifacts.

Direct HTTP uses the official endpoint and the `X-Goog-Api-Key` header.
Merge the Stitch entry into the client's config using its actual schema.

#### Antigravity CLI (`agy`)

```bash
agy mcp add --type http --header "X-Goog-Api-Key: YOUR_KEY" \
  stitch https://stitch.googleapis.com/mcp
```

Flags must precede the server name. The equivalent private config entry is:

```json
{
  "mcpServers": {
    "stitch": {
      "serverUrl": "https://stitch.googleapis.com/mcp",
      "headers": { "X-Goog-Api-Key": "YOUR_KEY" }
    }
  }
}
```

Reload through `/mcp` and call `list_projects` to verify.

#### Claude Code

```bash
claude mcp add stitch --transport http https://stitch.googleapis.com/mcp \
  --header "X-Goog-Api-Key: YOUR_KEY" --scope user
```

#### Cursor (`.cursor/mcp.json` or user MCP config)

```json
{
  "mcpServers": {
    "stitch": {
      "url": "https://stitch.googleapis.com/mcp",
      "headers": { "X-Goog-Api-Key": "YOUR_KEY" }
    }
  }
}
```

#### VS Code (`.vscode/mcp.json` or user MCP config)

```json
{
  "servers": {
    "stitch": {
      "type": "http",
      "url": "https://stitch.googleapis.com/mcp",
      "headers": { "X-Goog-Api-Key": "YOUR_KEY" }
    }
  }
}
```

#### Codex (`~/.codex/config.toml`)

Set `STITCH_API_KEY` in the environment that launches Codex, then merge:

```toml
[mcp_servers.stitch]
url = "https://stitch.googleapis.com/mcp"
env_http_headers = { "X-Goog-Api-Key" = "STITCH_API_KEY" }
```

`env_http_headers` maps header names to environment variable names, so
the value above is the variable name rather than the key itself.
For other clients, follow their official HTTP MCP configuration schema
with the same endpoint and API key header.

## Namespace Discovery

MCP tool names may be prefixed. Before calling, discover the prefix:
1. Use the runtime's tool discovery or MCP tool listing mechanism.
2. Look for tools containing "list_projects", "get_screen", etc.
3. Use the discovered names and input schemas.

Call `get_screen` and download its `htmlCode.downloadUrl` or
`screenshot.downloadUrl` for HTML or screenshots. To map screens to site
routes, retrieve each screen's HTML and perform that mapping locally.
Use only tools exposed by the connected official server.

## Tool Mapping by Workflow Phase

Follow the discovered input schemas for all calls.

### Phase 2: EXTRACT
| Step | Tool | Input |
|------|------|-------|
| Find projects | `list_projects` | filter: "view=owned" |
| Get design theme | `get_project` | resource name → designTheme object |
| List screens | `list_screens` | numeric project ID |
| Download HTML | `get_screen` + HTTP download | screen identifier → `htmlCode.downloadUrl` |
| Download screenshot | `get_screen` + HTTP download | screen identifier → `screenshot.downloadUrl` |

### Phase 4: PROPOSE
| Step | Tool | Input |
|------|------|-------|
| Generate concept | `generate_screen_from_text` | text prompt + design context |
| Generate variants | `generate_variants` | existing screen ID |
| Preview | `get_screen` + HTTP download | `screenshot.downloadUrl` for visual comparison |

### Phase 5: GENERATE
| Step | Tool | Input |
|------|------|-------|
| Map site routes | local operation | requested screen-to-route mapping |
| Get page HTML | `get_screen` + HTTP download | `htmlCode.downloadUrl` per route |

## Available Tools

| Tool | Description |
|------|-------------|
| `list_projects` | List all accessible Stitch projects |
| `get_project` | Get project details (including designTheme) |
| `list_screens` | List screens within a project |
| `get_screen` | Get screen metadata and download URLs |
| `generate_screen_from_text` | Generate new screen from text prompt |
| `edit_screens` | Edit existing screens via text prompt |
| `generate_variants` | Generate design variants of a screen |

## Without Stitch

All workflow phases function without Stitch MCP:

| Phase | With Stitch | Without Stitch |
|-------|-------------|----------------|
| EXTRACT | API-based token extraction | Manual URL HTML/CSS analysis or skip |
| PROPOSE | Visual screen generation + screenshots | Text-based concept descriptions |
| GENERATE | Download screen HTML and map routes locally | Direct code generation from DESIGN.md |

## Troubleshooting

Use the client's MCP status/logs and a `list_projects` call to diagnose
the connection. For ADC errors, rerun `gcloud auth application-default login`
and check the quota project, Stitch MCP API enablement, and IAM permissions.
For missing/invalid API keys, reopen Stitch Settings and update the private
client config's `X-Goog-Api-Key` header or its environment mapping.
If the client cannot reconnect in the current session, report that a
reload is needed; do not claim verification until `list_projects` succeeds.

## Sources

- [Official Stitch MCP setup](https://stitch.withgoogle.com/docs/mcp/setup)
- [Antigravity CLI MCP and Google credentials](https://antigravity.google/docs/mcp?tab=cli)
- [Google Cloud ADC and scopes](https://cloud.google.com/docs/authentication/application-default-credentials)
- [Codex HTTP MCP configuration](https://developers.openai.com/codex/mcp)
