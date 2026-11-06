# Install oh-my-agent with an AI agent

Follow these steps when a user asks you to install oh-my-agent in their project.

## 1. Use the target project

Run the commands from the project root where the user wants OMA installed. Read its existing `AGENTS.md` and OMA configuration, when present, and retain the user's saved preferences.

This guide installs project skills, agents, hooks, and workflows in that project. The `oma` CLI itself is installed globally so the generated hooks can call it. For shared configuration across projects, use the [global installation guide](../web/docs/guide/global-install.md).

## 2. Make the CLI available

Check whether `oma --version` succeeds. If it does, use that installation.

If `oma` is missing, prepare the CLI and dependencies with the bootstrap for the current operating system.

### macOS / Linux

```bash
curl -fsSL https://raw.githubusercontent.com/first-fluke/oh-my-agent/main/cli/install.sh | OMA_INSTALL_NO_RUN=1 bash
export PATH="${BUN_INSTALL:-$HOME/.bun}/bin:$HOME/.local/bin:$PATH"
oma --version
```

### Windows (PowerShell)

```powershell
powershell -NoProfile -Command '$env:OMA_INSTALL_NO_RUN = "1"; irm https://raw.githubusercontent.com/first-fluke/oh-my-agent/main/cli/install.ps1 | iex'
$env:Path = "$env:USERPROFILE\.bun\bin;$env:USERPROFILE\.local\bin;$env:Path"
oma --version
```

`OMA_INSTALL_NO_RUN=1` prepares dependencies and the CLI without opening the interactive setup. The PowerShell bootstrap runs in a child process because it exits when preparation finishes. Refreshing `PATH` makes newly installed commands visible in the calling shell.

## 3. Install the project configuration

Run:

```bash
oma install --preset all --yes
```

Use the user's requested preset instead of `all` when one was specified. The `all` preset includes the skills referenced by every workflow. Let the installer generate the managed files and merge supported settings.

`--yes` uses saved choices where available and installer defaults otherwise. Runtime selection follows the saved configuration or the default vendor list; it does not detect which agent is reading this guide. A fresh non-interactive installation uses `model_preset: auto` and selects no browser MCP. Existing browser choices are retained. See the [installation reference](../web/docs/getting-started/installation.md) for presets, providers, runtime selection, and default setup actions.

Pass `--preset` and `--yes` to `oma install` itself. The shell bootstrap does not forward command-line arguments to the installer.

## 4. Check the installation

```bash
oma doctor --json
```

Read the report and resolve installation problems within the requested scope. Report any items that remain unresolved. Check that the project has its generated `AGENTS.md`, `.agents/oma-config.yaml`, and the selected runtimes' integration files.

Read the generated project instructions before continuing the user's work. In the completion report, include the CLI version, project path, selected runtimes and skill preset, and the observed doctor results. Tell the user to reload their agent session if that host loads configuration only at startup.
