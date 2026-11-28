"""Harbor agents for the treatment arm: a stock host CLI plus a real OMA install.

The control arm is Harbor's built-in ``codex`` or ``claude-code`` agent. Each
subclass here changes one thing: after the host CLI is installed in the task
container, it runs the official OMA installer (``cli/install.sh``) and a
non-interactive project install in the task's working directory. The task
instruction, model, reasoning effort, host CLI version, timeouts, and verifier
are identical in both arms.
"""

from __future__ import annotations

import json
import os
import shlex
from pathlib import Path
from typing import Any

from harbor.agents.installed.claude_code import ClaudeCode
from harbor.agents.installed.codex import Codex
from harbor.environments.base import BaseEnvironment

OMA_VERSION = os.environ.get("OMA_BENCH_OMA_VERSION", "21.2.0")
# install.sh installs CUE through Homebrew only, so Linux containers get the
# pinned release binary instead. Version follows mise.toml.
CUE_VERSION = os.environ.get("OMA_BENCH_CUE_VERSION", "0.17.1")
# The published CLI imports node:zlib zstd (Node >= 22.15) and declares no
# engines range. Where the container's `node` is older, `oma` gets a private
# runtime; the system `node` stays as the control arm has it.
NODE_VERSION = os.environ.get("OMA_BENCH_NODE_VERSION", "22.17.0")
INSTALLER = Path(__file__).resolve().parents[3] / "cli" / "install.sh"
REMOTE_INSTALLER = "/installed-agent/oma-install.sh"
REMOTE_REPORT = "/installed-agent/oma-install-report.txt"

TOOLCHAIN_SCRIPT = f"""set -uo pipefail
export CI=true OMA_INSTALL_NO_RUN=1 OMA_NO_AGENTMEMORY=1 OMA_SKIP_VERSION_CHECK=1
export OMA_CLI_PACKAGE=oh-my-agent@{OMA_VERSION}
if [ -s ~/.nvm/nvm.sh ]; then . ~/.nvm/nvm.sh; fi
bash {REMOTE_INSTALLER} || echo "install.sh exit $?"
export PATH="$HOME/.bun/bin:$HOME/.local/bin:$PATH"
mkdir -p "$HOME/.local/bin"
if ! command -v cue >/dev/null 2>&1; then
  case "$(uname -m)" in x86_64) arch=amd64 ;; aarch64|arm64) arch=arm64 ;; *) arch= ;; esac
  if [ -n "$arch" ]; then
    curl -fsSL "https://github.com/cue-lang/cue/releases/download/v{CUE_VERSION}/cue_v{CUE_VERSION}_linux_$arch.tar.gz" \\
      | tar -xz -C "$HOME/.local/bin" cue || echo "cue download failed"
  fi
fi
command -v oma >/dev/null 2>&1 || {{ echo "oma CLI missing after install.sh" >&2; exit 41; }}
if ! node -e 'require("node:zlib").zstdDecompressSync.call' >/dev/null 2>&1; then
  case "$(uname -m)" in x86_64) arch=x64 ;; aarch64|arm64) arch=arm64 ;; *) arch= ;; esac
  runtime="$HOME/.local/share/oma-node"
  mkdir -p "$runtime"
  curl -fsSL "https://nodejs.org/dist/v{NODE_VERSION}/node-v{NODE_VERSION}-linux-$arch.tar.gz" \
    | tar -xz -C "$runtime" --strip-components=1 || {{ echo "private node download failed" >&2; exit 42; }}
  entry="$(readlink -f "$HOME/.bun/bin/oma")"
  printf '#!/bin/sh\nexec "%s" "%s" "$@"\n' "$runtime/bin/node" "$entry" > "$HOME/.local/bin/oma"
  chmod 755 "$HOME/.local/bin/oma"
  echo "oma runs on private node v{NODE_VERSION} (system node: $(node --version 2>/dev/null || echo none))"
fi
"""

LINK_SCRIPT = """set -uo pipefail
for bin in oma bun bunx uv uvx serena cue; do
  for dir in "$AGENT_HOME/.local/bin" "$AGENT_HOME/.bun/bin"; do
    if [ -x "$dir/$bin" ] && [ ! -e "/usr/local/bin/$bin" ]; then ln -s "$dir/$bin" "/usr/local/bin/$bin"; fi
  done
done
"""

PROJECT_SCRIPT = f"""set -uo pipefail
export CI=true OMA_NO_AGENTMEMORY=1 OMA_SKIP_VERSION_CHECK=1
if [ -s ~/.nvm/nvm.sh ]; then . ~/.nvm/nvm.sh; fi
export PATH="$HOME/.local/bin:$HOME/.bun/bin:$PATH"
{{
  echo "workdir=$(pwd)"
  echo "system_node=$(node --version 2>/dev/null || echo none)"
  echo "oma_path=$(command -v oma)"
  echo "oma=$(oma --version 2>&1 | tail -1)"
  for bin in bun uv serena cue; do
    echo "$bin=$(command -v $bin >/dev/null 2>&1 && echo present || echo missing)"
  done
}} > {REMOTE_REPORT}
oma -y install --semantic-memory none > /installed-agent/oma-project-install.log 2>&1
echo "install_exit=$?" >> {REMOTE_REPORT}
oma link "$OMA_VENDOR" > /installed-agent/oma-link.log 2>&1
echo "link_exit=$?" >> {REMOTE_REPORT}
for path in $OMA_EXPECTED; do
  echo "$path=$([ -e "$path" ] && echo present || echo missing)" >> {REMOTE_REPORT}
done
echo "vendor_dir=$(ls -A ".$OMA_VENDOR" 2>/dev/null | tr '\\n' ' ')" >> {REMOTE_REPORT}
[ -d .agents/skills ] && [ -e "$OMA_REQUIRED" ]
"""


class OmaInstall:
    """Installs OMA after the host CLI; mixed into a Harbor installed agent."""

    oma_vendor: str
    oma_expected: tuple[str, ...]
    oma_required: str
    _oma_workdir: str | None = None

    async def setup(self, environment: BaseEnvironment) -> None:
        await super().setup(environment)  # type: ignore[misc]
        try:
            await self._install_oma(environment)
        except Exception as exc:
            raise RuntimeError(f"OMA setup failed: {exc}") from exc

    async def _install_oma(self, environment: BaseEnvironment) -> None:
        await self.ensure_system_dependencies(
            environment, ("curl", "bash", "git", "unzip", "tar")
        )
        await environment.upload_file(INSTALLER, REMOTE_INSTALLER)
        await self.exec_as_root(environment, command=f"chmod 755 {REMOTE_INSTALLER}")
        await self.exec_as_agent(environment, command=TOOLCHAIN_SCRIPT)
        home = await self.exec_as_agent(environment, command='printf %s "$HOME"')
        await self.exec_as_root(
            environment,
            command=LINK_SCRIPT,
            env={"AGENT_HOME": (home.stdout or "").strip() or "/root"},
        )
        workdir = await self.exec_as_agent(environment, command="pwd")
        self._oma_workdir = (workdir.stdout or "").strip() or None
        await self._trust_workdir(environment)
        try:
            await self.exec_as_agent(
                environment,
                command=PROJECT_SCRIPT,
                env={
                    "OMA_VENDOR": self.oma_vendor,
                    "OMA_EXPECTED": " ".join(self.oma_expected),
                    "OMA_REQUIRED": self.oma_required,
                },
            )
        finally:
            # Keep the install evidence for failed installs too.
            setup_dir = self.logs_dir / "setup"
            setup_dir.mkdir(parents=True, exist_ok=True)
            for name in ("oma-install-report.txt", "oma-project-install.log", "oma-link.log"):
                result = await self.exec_as_agent(
                    environment,
                    command=f"cat {shlex.quote('/installed-agent/' + name)} 2>/dev/null || true",
                )
                (setup_dir / name).write_text(result.stdout or "")


    async def _trust_workdir(self, environment: BaseEnvironment) -> None:
        """Mark the workspace trusted, as a user who accepted the dialog would."""


class OmaCodex(OmaInstall, Codex):
    """Codex CLI with oh-my-agent installed into the task workspace."""

    oma_vendor = "codex"
    oma_expected = ("AGENTS.md", ".agents/skills", ".codex/hooks.json", ".codex/config.toml")
    oma_required = "AGENTS.md"

    def __init__(self, *args: Any, **kwargs: Any) -> None:
        # OMA's Codex hooks are project hooks; without persisted trust they are
        # skipped, which would silently measure a partial install.
        kwargs.setdefault("dangerously_bypass_hook_trust", True)
        super().__init__(*args, **kwargs)

    def _build_effective_config(self, openai_base_url: str | None = None) -> dict[str, Any]:
        config = super()._build_effective_config(openai_base_url)
        if self._oma_workdir:
            projects = config.setdefault("projects", {})
            projects[self._oma_workdir] = {"trust_level": "trusted"}
        return config


class OmaClaudeCode(OmaInstall, ClaudeCode):
    """Claude Code with oh-my-agent installed into the task workspace."""

    oma_vendor = "claude"
    oma_expected = ("AGENTS.md", ".agents/skills", ".claude/settings.json", ".claude/skills", ".mcp.json")
    oma_required = ".claude/settings.json"

    async def _trust_workdir(self, environment: BaseEnvironment) -> None:
        # Headless Claude Code drops parts of an untrusted project's settings.
        # Harbor points CLAUDE_CONFIG_DIR at the trial's session directory.
        if not self._oma_workdir:
            return
        config_dir = (self.environment_logs_dir / "sessions").as_posix()
        state = json.dumps({"projects": {self._oma_workdir: {"hasTrustDialogAccepted": True}}})
        await self.exec_as_agent(
            environment,
            command=(
                f"mkdir -p {shlex.quote(config_dir)} && "
                f"[ -e {shlex.quote(config_dir + '/.claude.json')} ] || "
                f"printf %s {shlex.quote(state)} > {shlex.quote(config_dir + '/.claude.json')}"
            ),
        )
