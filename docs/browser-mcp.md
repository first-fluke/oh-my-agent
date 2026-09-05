# Browser MCP selection

`oma install` offers a multi-select for Aside, Chrome DevTools, and Firefox DevTools. Aside is selected by default. Use Space to toggle choices and Enter to continue; selecting none disables browser MCP servers. Reinstalling preselects the saved choices.

Run `oma update mcp` to change the selection without downloading a release or updating skills. `oma --global update mcp` changes the global installation. `--vendor codex,claude` limits which vendor configurations are updated. With `--yes` or `--ci`, the command keeps the saved selection, or chooses Aside when no preference exists.

The selection is saved under the existing preference key:

```yaml
mcp:
  devtools_browsers: [aside, chrome, firefox]
```

An explicit `[]` means no browser MCP. Ordinary `oma update` and `oma link` reconcile the saved selection; an unset preference in an existing installation is left unchanged. Other MCP servers and settings are preserved. Deselected browser entries are removed from the targeted configurations.

Aside is registered as:

```json
{
  "mcpServers": {
    "aside": {
      "command": "aside",
      "args": ["mcp"]
    }
  }
}
```

`oma install` and `oma update mcp` automatically install a missing Aside CLI using `curl -fsSL https://releases.aside.com/install.sh | bash`. Existing installations are reused. Installation failures stop the command before saving the selection. If the installed executable is outside PATH, new MCP entries use its absolute path (`ASIDE_CLI_BIN_DIR/aside`, default `~/.local/bin/aside`). Chrome and Firefox use their existing `npx` launchers (`chrome-devtools-mcp@latest` and `@mozilla/firefox-devtools-mcp@latest`). OMA registers the MCP servers; it does not install browser applications.

## Vendor coverage

All 14 installable OMA vendors have an explicit browser MCP adapter. Paths below are relative to the project, or to the user's HOME where prefixed with `~/`. Global native configurations are separate from a custom `OMA_HOME` installation directory.

| Vendor | Project configuration | Global configuration | Server map / format |
| --- | --- | --- | --- |
| Claude Code | `.mcp.json` | `~/.claude.json` | `mcpServers`, JSON |
| Codex | `.codex/config.toml` | `~/.codex/config.toml` | `mcp_servers`, TOML |
| Cursor | `.cursor/mcp.json` | `~/.cursor/mcp.json` | `mcpServers`, JSON, `type: stdio` |
| Qwen | `.qwen/settings.json` | `~/.qwen/settings.json` | `mcpServers`, JSON |
| Grok | `.grok/config.toml` | `~/.grok/config.toml` | `mcp_servers`, TOML |
| Kiro | `.kiro/settings/mcp.json` | `~/.kiro/settings/mcp.json` | `mcpServers`, JSON |
| Kimi | `.kimi-code/mcp.json` | `~/.kimi-code/mcp.json` | `mcpServers`, JSON |
| Antigravity CLI | `.agents/mcp_config.json` | `~/.gemini/antigravity-cli/mcp_config.json` | `mcpServers`, JSON |
| CommandCode | `.mcp.json` | `~/.commandcode/mcp.json` | `mcpServers`, JSON |
| Copilot CLI | `.github/mcp.json` | `~/.copilot/mcp-config.json` | `mcpServers`, JSON, `type: local` |
| OpenCode | `opencode.jsonc` or existing config files | `~/.config/opencode/opencode.json[c]` | `mcp`, JSONC, `type: local`, command array |
| Pi | `.pi/mcp.json` | `~/.pi/agent/mcp.json` | `mcpServers`, JSON, via MCP adapter |
| Hermes | User configuration only | `~/.hermes/config.yaml` | `mcp_servers`, YAML |
| ZCode | `.zcode/config.json` | `~/.zcode/cli/config.json` | `mcp.servers`, JSON |

Native environment overrides are respected: `CODEX_HOME`, `KIMI_CODE_HOME`, `PI_CODING_AGENT_DIR`, `HERMES_HOME`, and OpenCode's `XDG_CONFIG_HOME`. OpenCode updates existing project-root and `.opencode/` JSON/JSONC configurations so higher-priority files do not retain an obsolete OMA browser selection. JSONC and YAML comments and unrelated settings are preserved. Kiro browser entries previously written to `settings/cli.json` are removed from that incorrect location and reconciled into `settings/mcp.json`.

Pi needs `pi-mcp-adapter`: OMA adds `npm:pi-mcp-adapter` to `.pi/settings.json` (or the global agent directory's `settings.json`). Pi automatically installs missing registered packages on startup after project trust. Existing pinned adapter packages and other packages are retained. Selecting no browsers removes the browser entries without uninstalling the adapter, which may serve other MCP servers.

Hermes always uses its user configuration; installation respects the existing HOME export consent. An ordinary update includes explicitly recorded vendors even when they have no project directory. `--all` retains OMA's existing project-scoped vendor policy; HOME-only vendors can be selected explicitly with `--vendor`. Claude and CommandCode share `.mcp.json` in project mode, so changes to that shared file affect both clients. Copilot's native project file is `.github/mcp.json`; a separately customized `.mcp.json` can take precedence. Client-side workspace trust and tool policies still apply when the client starts.

## Verification references

Native paths and schemas were checked against [Claude MCP scopes](https://code.claude.com/docs/en/mcp), [Cursor MCP configuration](https://cursor.com/docs/mcp), [Qwen MCP configuration](https://qwenlm.github.io/qwen-code-docs/en/users/features/mcp/), [Grok MCP configuration](https://docs.x.ai/build/features/mcp-servers), [Kiro configuration](https://kiro.dev/docs/mcp/configuration/), and [Kimi configuration](https://www.kimi.com/code/docs/en/kimi-code-cli/configuration/config-files.html). Codex and Antigravity also use OMA's existing [Codex adapter](../cli/vendors/codex/settings.ts) and [Antigravity adapter](../cli/vendors/antigravity/mcp.ts).

The added integrations follow [CommandCode settings](https://commandcode.ai/docs/settings), [Copilot CLI MCP files](https://docs.github.com/en/copilot/how-tos/copilot-cli/customize-copilot/add-mcp-servers), [OpenCode MCP configuration](https://opencode.ai/docs/mcp-servers/), [Pi package loading](https://github.com/earendil-works/pi/blob/main/packages/coding-agent/docs/packages.md), [Pi MCP adapter](https://pi.dev/packages/pi-mcp-adapter), [Hermes MCP configuration](https://hermes-agent.nousresearch.com/docs/user-guide/features/mcp), and [ZCode load paths](https://zcode.z.ai/en/docs/mcp-services).

Tests exercise each vendor in both scopes, all three selections, deselection, repeated reconciliation, custom settings, configuration overrides, malformed files, and write-free previews. These are configuration integration tests; they do not launch every vendor application or perform a live browser MCP handshake.
