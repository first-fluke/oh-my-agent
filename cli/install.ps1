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

# ── cue (for typed oma-config.cue) ──────────────────────────────────
if (Test-Command cue) {
  Write-Ok "cue found"
} else {
  Write-Info "Installing cue via winget..."
  $cueInstalled = $false
  if (Test-Command winget) {
    & winget install -e --id cue-lang.cue --accept-source-agreements --accept-package-agreements
    if ($LASTEXITCODE -eq 0) {
      Write-Ok "cue installed via winget"
      $cueInstalled = $true
    } else {
      Write-Warn "winget install cue-lang.cue failed"
    }
  } else {
    Write-Warn "winget not found. Please install cue via 'winget install cue-lang.cue' or see https://cuelang.org/docs/install/"
  }
}

# ── oma CLI (global; hooks and workflows call it) ───────────────────
# Keep an existing install (npm, brew, or bun) so a second global copy
# cannot shadow it.
$omaCliReady = $true
if (Test-Command oma) {
  Write-Ok "oma found"
} else {
  Write-Info "Installing the oma CLI (bun install --global oh-my-agent)..."
  & bun install --global oh-my-agent@latest
  if ($LASTEXITCODE -ne 0) {
    Write-Warn "Global install failed. Install it later: bun install --global oh-my-agent"
    $omaCliReady = $false
  } else {
    Add-ToPath "$env:USERPROFILE\.bun\bin"
    if (Test-Command oma) {
      Write-Ok "oma installed"
    } else {
      Write-Warn "oma installed but not on PATH. Add %USERPROFILE%\.bun\bin to PATH, then open a new terminal."
      $omaCliReady = $false
    }
  }
}

Write-Host ""
Write-Ok "Core dependencies ready"
Write-Host ""

# ── Run oh-my-agent ─────────────────────────────────────────────────
# CI smoke tests set OMA_INSTALL_NO_RUN=1 to verify the bootstrap path
# without launching the interactive setup.
if ($env:OMA_INSTALL_NO_RUN -eq "1") {
  Write-Info "OMA_INSTALL_NO_RUN=1 set — skipping the interactive setup"
  exit 0
}

Write-Info "Launching oh-my-agent setup..."
Write-Host ""
if ($omaCliReady) {
  & oma
} else {
  & bunx oh-my-agent@latest
}
exit $LASTEXITCODE
