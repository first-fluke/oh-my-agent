---
title: Integratie in bestaand project
description: Veilige en niet-destructieve integratieworkflow voor het toevoegen van oh-my-agent-skills aan een bestaand Antigravity-project.
---

# Integratie in een bestaand project

Deze handleiding vervangt de verouderde root `AGENT_GUIDE.md`-workflow en weerspiegelt de huidige werkruimtestructuur (`cli` + `web`) en CLI-gedrag.

## Doel

Voeg `oh-my-agent`-skills toe aan een bestaand project zonder bestaande bestanden te overschrijven.

## Aanbevolen pad (CLI)

Voer dit uit in de hoofdmap van het doelproject:

```bash
bunx oh-my-agent
```

Wat het doet:

- Installeert of werkt `.agents/skills/*` bij
- Installeert gedeelde resources in `.agents/skills/_shared`
- Installeert `.agents/workflows/*`
- Installeert `.agents/config/user-preferences.yaml`
- Installeert optioneel globale workflows onder `~/.gemini/antigravity/global_workflows`

## Veilig handmatig pad

Gebruik dit wanneer u volledige controle wilt over elke gekopieerde map.

```bash
cd /path/to/your-project

mkdir -p .agents/skills .agents/workflows .agents/config

# Kopieer alleen ontbrekende skillmappen (voorbeeld)
for skill in oma-coordination oma-pm oma-frontend oma-backend oma-mobile oma-qa oma-debug oma-orchestrator oma-commit; do
  if [ ! -d ".agents/skills/$skill" ]; then
    cp -r /path/to/oh-my-agent/.agents/skills/$skill .agents/skills/$skill
  fi
done

# Kopieer gedeelde resources als ze ontbreken
[ -d .agents/skills/_shared ] || cp -r /path/to/oh-my-agent/.agents/skills/_shared .agents/skills/_shared

# Kopieer workflows als ze ontbreken
for wf in coordinate.md orchestrate.md plan.md review.md debug.md setup.md tools.md; do
  [ -f ".agents/workflows/$wf" ] || cp /path/to/oh-my-agent/.agents/workflows/$wf .agents/workflows/$wf
done

# Kopieer standaard gebruikersvoorkeuren alleen als ze ontbreken
[ -f .agents/config/user-preferences.yaml ] || cp /path/to/oh-my-agent/.agents/config/user-preferences.yaml .agents/config/user-preferences.yaml
```

## Verificatiechecklist

```bash
# 9 installeerbare skills (exclusief _shared)
find .agents/skills -mindepth 1 -maxdepth 1 -type d ! -name '_shared' | wc -l

# Gedeelde resources
[ -d .agents/skills/_shared ] && echo ok

# 7 workflows
find .agents/workflows -maxdepth 1 -name '*.md' | wc -l

# Basis commandogezondheidscontrole
bunx oh-my-agent doctor
```

## Optionele dashboards

Dashboards zijn optioneel en gebruiken de geïnstalleerde CLI:

```bash
bunx oh-my-agent dashboard
bunx oh-my-agent dashboard:web
```

Standaard URL webdashboard: `http://localhost:9847`

## Terugdraaistrategie

Maak voor de integratie een checkpointcommit aan in uw project:

```bash
git add -A
git commit -m "chore: checkpoint before oh-my-agent integration"
```

Als u de integratie ongedaan moet maken, draai die commit dan terug via uw gebruikelijke teamproces.

## Multi-CLI-symlinkondersteuning

Wanneer u `bunx oh-my-agent` uitvoert, ziet u na het selecteren van skills deze prompt:

```text
Also develop with other CLI tools?
  ○ Claude Code (.claude/skills/)
  ○ OpenCode, Amp, Codex (.agents/skills/)
  ○ GitHub Copilot (.github/skills/)
```

Selecteer eventuele extra CLI-tools die u naast Antigravity gebruikt. De installer zal:

1. Skills installeren in `.agents/skills/` (de native locatie van Antigravity)
2. Symlinks aanmaken van de skillsmap van elke geselecteerde CLI naar `.agents/skills/`

Dit garandeert een enkele bron van waarheid terwijl skills over meerdere CLI-tools werken.

### Symlinkstructuur

```
.agents/skills/oma-frontend/      ← Bron (SSOT)
.claude/skills/oma-frontend/     → ../../.agents/skills/oma-frontend/
.agents/skills/oma-frontend/     → ../../.agents/skills/oma-frontend/ (OpenCode, Amp, Codex)
.github/skills/oma-frontend/     → ../../.agents/skills/oma-frontend/ (GitHub Copilot)
```

De installer slaat bestaande symlinks over en geeft een waarschuwing als er een echte map op de doellocatie bestaat.

## Opmerkingen

- Overschrijf bestaande `.agents/skills/*`-mappen niet, tenzij u aangepaste skills bewust wilt vervangen.
- Houd projectspecifieke beleidsbestanden (`.agents/config/*`) onder het eigendom van uw repository.
- Ga voor multi-agentorkestratiepatronen verder met de [`Gebruikshandleiding`](./usage.md).
