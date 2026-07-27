#Requires -Version 5.1
# oh-my-agent installer (Windows)
# Usage: irm https://raw.githubusercontent.com/first-fluke/oh-my-agent/main/cli/install.ps1 | iex

$ErrorActionPreference = "Stop"

# ── TLS 1.2 (Windows PowerShell 5.1 defaults to 1.0/1.1, which breaks
#    HTTPS downloads from bun.sh / astral.sh on older Windows) ─────────
try {
  [Net.ServicePointManager]::SecurityProtocol = `
    [Net.ServicePointManager]::SecurityProtocol -bor [Net.SecurityProtocolType]::Tls12
} catch {}

# ── Output helpers ──────────────────────────────────────────────────
function Write-Info { param([string]$Message) Write-Host "▸ $Message" -ForegroundColor Cyan }
function Write-Ok   { param([string]$Message) Write-Host "✓ $Message" -ForegroundColor Green }
function Write-Warn { param([string]$Message) Write-Host "! $Message" -ForegroundColor Yellow }
function Write-Fail {
  param([string]$Message)
  Write-Host "✗ $Message" -ForegroundColor Red
  exit 1
}

function Test-Command {
  param([string]$Name)
  $null -ne (Get-Command $Name -ErrorAction SilentlyContinue)
}

function Add-ToPath {
  param([string]$Dir)
  if (-not (Test-Path $Dir)) { return }
  if (-not ($env:Path -split ';' | Where-Object { $_ -eq $Dir })) {
    $env:Path = "$Dir;$env:Path"
  }
}

# ── Banner ──────────────────────────────────────────────────────────
Write-Host ""
Write-Host " 🛸 oh-my-agent installer " -ForegroundColor Magenta
Write-Host ""

# ── Platform detection ──────────────────────────────────────────────
$isWin = $false
if ($PSVersionTable.PSVersion.Major -ge 6) {
  $isWin = $IsWindows
} else {
  $isWin = $env:OS -eq "Windows_NT"
}

if (-not $isWin) {
  Write-Fail "This script is for Windows only. On macOS/Linux use:`n  curl -fsSL https://raw.githubusercontent.com/first-fluke/oh-my-agent/main/cli/install.sh | bash"
}

$arch = $env:PROCESSOR_ARCHITECTURE
Write-Info "Detected Windows $arch"
Write-Host ""

# ── bun (required) ──────────────────────────────────────────────────
if (Test-Command bun) {
  Write-Ok "bun found"
} else {
  Write-Info "Installing bun..."
  try {
    Invoke-RestMethod https://bun.sh/install.ps1 | Invoke-Expression
  } catch {
    Write-Fail "bun installation failed. See https://bun.sh"
  }
  Add-ToPath "$env:USERPROFILE\.bun\bin"
  if (-not (Test-Command bun)) {
    Write-Fail "bun installation failed. Restart your shell and retry, or install manually: https://bun.sh"
  }
  Write-Ok "bun installed"
}

# ── uv (optional; required only for Serena MCP) ─────────────────────
$serenaSetupReady = $true
if (Test-Command uv) {
  Write-Ok "uv found"
} else {
  Write-Info "Installing uv..."
  try {
    Invoke-RestMethod https://astral.sh/uv/install.ps1 | Invoke-Expression
  } catch {
    Write-Warn "uv installation failed. See https://docs.astral.sh/uv"
    $serenaSetupReady = $false
  }
  if ($serenaSetupReady) {
    Add-ToPath "$env:USERPROFILE\.local\bin"
    if (-not (Test-Command uv)) {
      Write-Warn "uv installation failed. Restart your shell and retry, or install manually: https://docs.astral.sh/uv"
      $serenaSetupReady = $false
    } else {
      Write-Ok "uv installed"
    }
  }
}

# ── serena (Serena MCP binary, installed via uv tool) ───────────────
if (Test-Command serena) {
  Write-Ok "serena found"
  $serenaSetupReady = $true
} elseif ($serenaSetupReady) {
  Write-Info "Installing serena-agent via uv tool..."
  & uv tool install -p 3.13 serena-agent@latest --prerelease=allow
  if ($LASTEXITCODE -ne 0) {
    Write-Warn "serena-agent install failed. Please install manually: uv tool install -p 3.13 serena-agent@latest --prerelease=allow"
    $serenaSetupReady = $false
  } else {
    Add-ToPath "$env:USERPROFILE\.local\bin"
    if (-not (Test-Command serena)) {
      Write-Warn "serena binary not on PATH after install. Run: uv tool update-shell"
      $serenaSetupReady = $false
    } else {
      Write-Ok "serena installed"
    }
  }
}
if (-not $serenaSetupReady) {
  Write-Warn "Continuing without Serena; install it later to enable code intelligence."
}

Write-Host ""
Write-Ok "Core dependencies ready"
Write-Host ""

# ── Run oh-my-agent ─────────────────────────────────────────────────
# CI smoke tests set OMA_INSTALL_NO_RUN=1 to verify the bootstrap path
# without launching the interactive setup.
if ($env:OMA_INSTALL_NO_RUN -eq "1") {
  Write-Info "OMA_INSTALL_NO_RUN=1 set — skipping bunx oh-my-agent@latest"
  exit 0
}

Write-Info "Launching oh-my-agent setup..."
Write-Host ""
& bunx oh-my-agent@latest
exit $LASTEXITCODE
