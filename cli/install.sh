#!/usr/bin/env bash
# oh-my-agent installer (macOS/Linux only)
# Usage: curl -fsSL https://raw.githubusercontent.com/first-fluke/oh-my-agent/main/cli/install.sh | bash
set -euo pipefail

# ── Colors ──────────────────────────────────────────────────────────
if [ -t 1 ]; then
  BOLD="\033[1m"
  DIM="\033[2m"
  GREEN="\033[32m"
  YELLOW="\033[33m"
  RED="\033[31m"
  CYAN="\033[36m"
  MAGENTA="\033[35m"
  RESET="\033[0m"
else
  BOLD="" DIM="" GREEN="" YELLOW="" RED="" CYAN="" MAGENTA="" RESET=""
fi

info()  { printf "${CYAN}▸${RESET} %b\n" "$*"; }
ok()    { printf "${GREEN}✓${RESET} %b\n" "$*"; }
warn()  { printf "${YELLOW}!${RESET} %b\n" "$*"; }
fail()  { printf "${RED}✗${RESET} %b\n" "$*" >&2; exit 1; }

command_exists() {
  command -v "$1" >/dev/null 2>&1
}

pick_downloader() {
  if command_exists curl; then
    DOWNLOADER="curl"
    return 0
  fi

  if command_exists wget; then
    DOWNLOADER="wget"
    return 0
  fi

  fail "Either curl or wget is required"
}

download_to_stdout() {
  local url="$1"

  case "${DOWNLOADER}" in
    curl) curl -fsSL "$url" ;;
    wget) wget -qO- "$url" ;;
    *) fail "No downloader configured" ;;
  esac
}

# ── Platform detection ──────────────────────────────────────────────
detect_platform() {
  OS="$(uname -s)"
  ARCH="$(uname -m)"

  case "$OS" in
    Darwin) PLATFORM="macOS" ;;
    Linux)  PLATFORM="Linux" ;;
    MINGW*|MSYS*|CYGWIN*)
      fail "Windows: use the PowerShell installer instead.\n\n  irm https://raw.githubusercontent.com/first-fluke/oh-my-agent/main/cli/install.ps1 | iex"
      ;;
    *)      fail "Unsupported OS: $OS" ;;
  esac

  case "$ARCH" in
    x86_64|amd64)  ARCH="x64" ;;
    arm64|aarch64) ARCH="arm64" ;;
    *)             fail "Unsupported architecture: $ARCH" ;;
  esac
}

# ── Dependency checks & installs ────────────────────────────────────
check_bun() {
  if command_exists bun; then
    ok "bun found"
    return 0
  fi
  return 1
}

install_bun() {
  info "Installing bun..."
  download_to_stdout https://bun.sh/install | bash
  # Source the updated shell profile to pick up bun
  export BUN_INSTALL="${HOME}/.bun"
  export PATH="${BUN_INSTALL}/bin:${PATH}"
  if command_exists bun; then
    ok "bun installed"
  else
    fail "bun installation failed. Please install manually: https://bun.sh"
  fi
}

check_uv() {
  if command_exists uv; then
    ok "uv found"
    return 0
  fi
  return 1
}

install_uv() {
  info "Installing uv..."
  download_to_stdout https://astral.sh/uv/install.sh | sh
  # Source the updated shell profile to pick up uv
  export PATH="${HOME}/.local/bin:${PATH}"
  if command_exists uv; then
    ok "uv installed"
  else
    fail "uv installation failed. Please install manually: https://docs.astral.sh/uv"
  fi
}

# ── Main ────────────────────────────────────────────────────────────
main() {
  printf "\n${BOLD}${MAGENTA} 🛸 oh-my-agent installer ${RESET}\n\n"

  pick_downloader
  detect_platform
  info "Detected ${BOLD}${PLATFORM} ${ARCH}${RESET}"
  echo ""

  # ── bun (required) ──
  if ! check_bun; then
    install_bun
  fi

  # ── uv (required for Serena MCP) ──
  if ! check_uv; then
    install_uv
  fi

  echo ""
  ok "All dependencies ready"
  echo ""

  # ── Run oh-my-agent interactive installer ──
  info "Launching ${BOLD}oh-my-agent${RESET} setup..."
  echo ""
  exec bunx oh-my-agent@latest < /dev/tty
}

if [[ "${BASH_SOURCE[0]:-$0}" == "$0" ]]; then
  main "$@"
fi
