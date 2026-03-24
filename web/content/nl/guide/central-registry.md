---
title: "Gids: Centraal Register"
description: Gedetailleerde documentatie over het centraal register — release-please workflow, conventionele commits, consumentensjablonen, .agent-registry.yml formaat en vergelijking met de GitHub Action-benadering.
---

# Gids: Centraal Register

## Overzicht

Het centrale registermodel behandelt de oh-my-agent GitHub-repository (`first-fluke/oh-my-agent`) als een versiebeheerde artefactbron. Consumentenprojecten halen specifieke versies van skills en workflows uit dit register, wat consistentie garandeert over teams en projecten.

Dit is de enterprise-grade benadering voor organisaties die nodig hebben: versiepinning, auditeerbare updatetrails via pull requests, checksumverificatie, wekelijkse geautomatiseerde updatecontroles en handmatige review voor elke update.

---

## Voor Beheerders: Nieuwe Versies Uitgeven

### Release-Please Workflow

oh-my-agent gebruikt [release-please](https://github.com/googleapis/release-please) om releases te automatiseren. Conventionele commits landen op `main`, release-please maakt een release-PR, en bij merge wordt een Git-tag en GitHub Release aangemaakt.

| Prefix | Betekenis | Versiebump |
|:-------|:---------|:-----------|
| `feat:` | Nieuwe functie | Minor (1.x.0) |
| `fix:` | Bugfix | Patch (1.0.x) |
| `feat!:` of `BREAKING CHANGE:` | Breaking change | Major (x.0.0) |
| `chore:` | Onderhoud | Geen bump |

### Release-artefacten

| Artefact | Beschrijving | Doel |
|:---------|:-----------|:--------|
| `agent-skills.tar.gz` | Gecomprimeerde tarball van `.agents/` | Alle skills, workflows, configs, agenten |
| `agent-skills.tar.gz.sha256` | SHA256 checksum | Integriteitsverificatie |
| `prompt-manifest.json` | JSON met versie en metadata | Gebruikt door `oma update` |

---

## Voor Consumenten: Project Instellen

### .agent-registry.yml Formaat

```yaml
registry:
  repo: first-fluke/oh-my-ag

version: "4.7.0"

auto_update:
  enabled: true
  schedule: "0 9 * * 1"  # Elke maandag om 9:00 UTC
  pr:
    auto_merge: false
    labels: ["dependencies", "agent-registry"]

sync:
  target_dir: "."
  backup_existing: true
  preserve:
    - ".agent/config/user-preferences.yaml"
    - ".agent/config/local-*"
```

### Workflow Rollen

**check-registry-updates.yml** — Controleert op nieuwe versies en maakt een PR aan.
**sync-agent-registry.yml** — Download en past registerbestanden toe wanneer de versie verandert.

---

## Vergelijking: Centraal Register vs GitHub Action

| Aspect | Centraal Register | GitHub Action |
|:-------|:----------------|:-------------|
| **Setup-complexiteit** | Hoger — 3 bestanden | Lager — 1 workflowbestand |
| **Versiebeheer** | Expliciete pinning | Altijd laatste versie |
| **Checksumverificatie** | Ja — SHA256 | Nee |
| **Terugdraaien** | Versie wijzigen in `.agent-registry.yml` | Updatecommit terugdraaien |
| **Goedkeuringsstroom** | PR-review vereist (auto-merge uitgeschakeld) | Configureerbaar |
| **Offline/air-gapped** | Mogelijk — tarball handmatig downloaden | Vereist npm-toegang |

---

## Wanneer Welke Gebruiken

### Gebruik het Centraal Register wanneer:
- Je meerdere projecten beheert die op dezelfde versie moeten blijven
- Je auditeerbare, reviewbare update-PR's nodig hebt
- Je beveiligingsbeleid expliciete goedkeuring vereist voor afhankelijkheidsupdates

### Gebruik de GitHub Action wanneer:
- Je een enkel project of enkele onafhankelijke projecten hebt
- Je de eenvoudigste setup wilt
- Je vertrouwd bent met automatische updates naar de laatste versie
