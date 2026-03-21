---
title: Integration in ein bestehendes Projekt
description: Sicherer und zerstörungsfreier Integrations-Workflow zum Hinzufügen von oh-my-agent-Skills zu einem bestehenden Antigravity-Projekt.
---

# Integration in ein bestehendes Projekt

Dieser Leitfaden ersetzt den veralteten Root-`AGENT_GUIDE.md`-Workflow und spiegelt die aktuelle Workspace-Struktur (`cli` + `web`) und das CLI-Verhalten wider.

## Ziel

`oh-my-agent`-Skills zu einem bestehenden Projekt hinzufügen, ohne vorhandene Assets zu überschreiben.

## Empfohlener Weg (CLI)

Führen Sie dies im Stammverzeichnis des Zielprojekts aus:

```bash
bunx oh-my-agent
```

Was es tut:

- Installiert oder aktualisiert `.agents/skills/*`
- Installiert gemeinsame Ressourcen in `.agents/skills/_shared`
- Installiert `.agents/workflows/*`
- Installiert `.agents/config/user-preferences.yaml`
- Installiert optional globale Workflows unter `~/.gemini/antigravity/global_workflows`

## Sicherer manueller Weg

Verwenden Sie diesen Weg, wenn Sie volle Kontrolle über jedes kopierte Verzeichnis benötigen.

```bash
cd /path/to/your-project

mkdir -p .agents/skills .agents/workflows .agents/config

# Nur fehlende Skill-Verzeichnisse kopieren (Beispiel)
for skill in oma-coordination oma-pm oma-frontend oma-backend oma-mobile oma-qa oma-debug oma-orchestrator oma-commit; do
  if [ ! -d ".agents/skills/$skill" ]; then
    cp -r /path/to/oh-my-agent/.agents/skills/$skill .agents/skills/$skill
  fi
done

# Gemeinsame Ressourcen kopieren, falls fehlend
[ -d .agents/skills/_shared ] || cp -r /path/to/oh-my-agent/.agents/skills/_shared .agents/skills/_shared

# Workflows kopieren, falls fehlend
for wf in coordinate.md orchestrate.md plan.md review.md debug.md setup.md tools.md; do
  [ -f ".agents/workflows/$wf" ] || cp /path/to/oh-my-agent/.agents/workflows/$wf .agents/workflows/$wf
done

# Standard-Benutzereinstellungen nur kopieren, falls fehlend
[ -f .agents/config/user-preferences.yaml ] || cp /path/to/oh-my-agent/.agents/config/user-preferences.yaml .agents/config/user-preferences.yaml
```

## Verifizierungs-Checkliste

```bash
# 9 installierbare Skills (ohne _shared)
find .agents/skills -mindepth 1 -maxdepth 1 -type d ! -name '_shared' | wc -l

# Gemeinsame Ressourcen
[ -d .agents/skills/_shared ] && echo ok

# 7 Workflows
find .agents/workflows -maxdepth 1 -name '*.md' | wc -l

# Grundlegender Zustandscheck
bunx oh-my-agent doctor
```

## Optionale Dashboards

Dashboards sind optional und verwenden die installierte CLI:

```bash
bunx oh-my-agent dashboard
bunx oh-my-agent dashboard:web
```

Standard-URL des Web-Dashboards: `http://localhost:9847`

## Rollback-Strategie

Erstellen Sie vor der Integration einen Checkpoint-Commit in Ihrem Projekt:

```bash
git add -A
git commit -m "chore: checkpoint before oh-my-agent integration"
```

Falls Sie rückgängig machen müssen, setzen Sie diesen Commit mit Ihrem normalen Teamprozess zurück.

## Multi-CLI-Symlink-Unterstützung

Wenn Sie `bunx oh-my-agent` ausführen, sehen Sie nach der Skill-Auswahl diese Abfrage:

```text
Also develop with other CLI tools?
  ○ Claude Code (.claude/skills/)
  ○ OpenCode, Amp, Codex (.agents/skills/)
  ○ GitHub Copilot (.github/skills/)
```

Wählen Sie alle zusätzlichen CLI-Tools aus, die Sie neben Antigravity verwenden. Der Installer wird:

1. Skills in `.agents/skills/` installieren (Antigravitys nativer Speicherort)
2. Symlinks vom Skills-Verzeichnis jedes ausgewählten CLI-Tools zu `.agents/skills/` erstellen

Dies gewährleistet eine einzige Informationsquelle, während die Skills über mehrere CLI-Tools hinweg funktionieren.

### Symlink-Struktur

```
.agents/skills/oma-frontend/      ← Quelle (SSOT)
.claude/skills/oma-frontend/     → ../../.agents/skills/oma-frontend/
.agents/skills/oma-frontend/     → ../../.agents/skills/oma-frontend/ (OpenCode, Amp, Codex)
.github/skills/oma-frontend/     → ../../.agents/skills/oma-frontend/ (GitHub Copilot)
```

Der Installer überspringt vorhandene Symlinks und warnt, wenn am Zielspeicherort ein echtes Verzeichnis existiert.

## Hinweise

- Überschreiben Sie vorhandene `.agents/skills/*`-Ordner nicht, es sei denn, Sie beabsichtigen, angepasste Skills zu ersetzen.
- Behalten Sie projektspezifische Richtliniendateien (`.agents/config/*`) unter der Eigentümerschaft Ihres Repositories.
- Für Multi-Agenten-Orchestrierungsmuster fahren Sie mit dem [`Nutzungsleitfaden`](./usage.md) fort.
