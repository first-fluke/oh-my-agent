---
title: "Gids: Integratie in Bestaand Project"
description: Volledige gids voor het toevoegen van oh-my-agent aan een bestaand project — CLI-pad, handmatig pad, verificatie, SSOT-symlinkstructuur en wat de installer onder de motorkap doet.
---

# Gids: Integratie in Bestaand Project

## Twee integratiepaden

1. **CLI-pad** — Voer `oma` (of `npx oh-my-agent`) uit en volg de interactieve prompts. Aanbevolen voor de meeste gebruikers.
2. **Handmatig pad** — Kopieer bestanden en configureer symlinks zelf. Nuttig voor beperkte omgevingen of aangepaste opstellingen.

Beide paden produceren hetzelfde resultaat: een `.agents/`-directory (de SSOT) met symlinks vanuit IDE-specifieke directory's.

---

## CLI-Pad: stap voor stap

### 1. Installeer de CLI
```bash
bun install --global oh-my-agent
```

### 2. Navigeer naar je projectroot
```bash
cd /path/to/your/project
```

### 3. Voer de installer uit
```bash
oma
```

### 4. Selecteer projecttype
Presets: All, Fullstack, Frontend, Backend, Mobile, DevOps, Custom.

### 5. Kies backend-taal (indien van toepassing)
Python, Node.js, Rust of Auto-detect.

### 6. Configureer IDE symlinks
De installer maakt altijd Claude Code symlinks (`.claude/skills/`) aan. Hij genereert ook vendor-native agentbestanden en hooks voor Antigravity, Claude, Codex en Qwen, en als er een `.github/`-directory bestaat, worden GitHub Copilot symlinks automatisch aangemaakt. Anders vraagt hij:

```
Symlinks ook aanmaken voor GitHub Copilot? (.github/skills/)
```

### 7. Git rerere setup
Aanbevolen voor multi-agent merge-conflicthergebruik.

### 8. MCP configuratie
Serena MCP bridge configuratie voor Antigravity IDE en Gemini CLI.

---

## Handmatig pad

```bash
# Download en extraheer
VERSION=$(curl -s https://raw.githubusercontent.com/first-fluke/oh-my-agent/main/prompt-manifest.json | jq -r '.version')
curl -L "https://github.com/first-fluke/oh-my-agent/releases/download/cli-v${VERSION}/agent-skills.tar.gz" -o agent-skills.tar.gz
sha256sum -c agent-skills.tar.gz.sha256
tar -xzf agent-skills.tar.gz

# Kopieer naar project
cp -r .agents/ /path/to/your/project/.agents/

# Maak symlinks
mkdir -p /path/to/your/project/.claude/skills
ln -sf ../../.agents/skills/oma-frontend /path/to/your/project/.claude/skills/oma-frontend
# ... herhaal voor andere skills
```

---

## Verificatiechecklist

```bash
oma doctor
oma doctor --json
```

Controleert: CLI-installaties (`agy`, claude, codex, qwen), authenticatie, MCP-configuratie, skill-status.

---

## Multi-IDE symlinkstructuur (SSOT-Concept)

oh-my-agent gebruikt een Single Source of Truth (SSOT)-architectuur. `.agents/` is de enige plek waar skills, workflows, configs en agentdefinities leven. Alle IDE-specifieke directory's bevatten alleen symlinks.

**Waarom symlinks?**
- Een update, alle IDE's profiteren
- Geen duplicatie
- Veilig verwijderen — `.claude/` verwijderen vernietigt je skills niet
- Git-vriendelijk

---

## Veiligheidstips en terugdraaienstrategie

### Voor installatie
1. Commit je huidige werk
2. Controleer op bestaande `.agents/`-directory

### Na installatie
1. Review wat er is aangemaakt met `git status`
2. Voeg selectief toe aan `.gitignore`:
```gitignore
.serena/
.agents/results/
.agents/state/
```

### Terugdraaien
```bash
rm -rf .agents/ .claude/skills/ .claude/agents/ .serena/
```

---

## Wat de installer onder de motorkap doet

1. **Legacy migratie** — `.agent/` (enkelvoud) naar `.agents/` (meervoud)
2. **Concurrentdetectie** — Biedt aan concurrerende tools te verwijderen
3. **Tarball download** — Laatste release van GitHub
4. **Gedeelde bronnen installatie** — `_shared/` directory
5. **Workflow installatie** — Alle 14 workflowbestanden
6. **Config installatie** — Standaardconfiguratie (bestaande bestanden behouden)
7. **Skill installatie** — Per geselecteerde skill
8. **Leveranciersaanpassingen** — IDE-specifieke bestanden voor alle ondersteunde leveranciers (Antigravity, Claude, Codex, Qwen)
9. **CLI symlinks** — `.claude/skills/`, `.claude/agents/`
10. **Git rerere + MCP** — Optionele configuratie
