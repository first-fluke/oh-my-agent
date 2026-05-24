---
title: "Gids: Automatische Updates"
description: Volledige GitHub Action-documentatie voor oh-my-agent — setup, alle invoer en uitvoer, gedetailleerde voorbeelden en hoe het onder de motorkap werkt.
---

# Gids: Automatische Updates

## Overzicht

De oh-my-agent GitHub Action (`first-fluke/oma-update-action@v1`) werkt automatisch de agent-skills van je project bij door `oma update` in CI uit te voeren. Het ondersteunt twee modi: een pull request aanmaken voor review, of direct committen naar een branch.

---

## Snelle setup

```yaml
name: Update oh-my-agent

on:
  schedule:
    - cron: '0 9 * * 1'  # Elke maandag om 9:00 UTC
  workflow_dispatch:

permissions:
  contents: write
  pull-requests: write

jobs:
  update:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
      - uses: first-fluke/oma-update-action@v1
```

---

## Alle action invoer

| Invoer | Type | Standaard | Beschrijving |
|:------|:-----|:---------|:-----------|
| `mode` | string | `"pr"` | `"pr"` maakt een pull request. `"commit"` pusht direct. |
| `base-branch` | string | `"main"` | Basisbranch voor de PR of directe commits. |
| `force` | string | `"false"` | Overschrijft gebruikersaanpassingen (oma-config.yaml, mcp.json, stack/). |
| `pr-title` | string | `"chore(deps): update oh-my-agent skills"` | Aangepaste PR-titel. |
| `pr-labels` | string | `"dependencies,automated"` | Kommagescheiden labels voor de PR. |
| `commit-message` | string | `"chore(deps): update oh-my-agent skills"` | Aangepast commitbericht. |
| `token` | string | `${{ github.token }}` | GitHub-token. Gebruik een PAT als de PR andere workflows moet triggeren. |

## Alle action uitvoer

| Uitvoer | Type | Beschrijving |
|:-------|:-----|:-----------|
| `updated` | string | `"true"` als er wijzigingen zijn na `oma update`. |
| `version` | string | De oh-my-agent versie na de update. |
| `pr-number` | string | Het pull request-nummer (alleen in `pr`-modus). |
| `pr-url` | string | De volledige URL van de PR (alleen in `pr`-modus). |

---

## Gedetailleerde voorbeelden

### Voorbeeld 1: standaard PR-Modus

```yaml
- uses: first-fluke/oma-update-action@v1
  id: update
- name: Samenvatting
  if: steps.update.outputs.updated == 'true'
  run: echo "Bijgewerkt naar versie ${{ steps.update.outputs.version }}"
```

### Voorbeeld 2: directe commit-modus met PAT

```yaml
- uses: first-fluke/oma-update-action@v1
  with:
    mode: commit
    token: ${{ secrets.OH_MY_AGENT_PAT }}
    base-branch: develop
```

### Voorbeeld 3: met Slack-notificatie

```yaml
- uses: first-fluke/oma-update-action@v1
  id: update
- name: Slack Notificatie
  if: steps.update.outputs.updated == 'true'
  uses: slackapi/slack-github-action@v2
  with:
    webhook: ${{ secrets.SLACK_WEBHOOK }}
    webhook-type: incoming-webhook
    payload: |
      {"text": "oh-my-agent bijgewerkt naar v${{ steps.update.outputs.version }}"}
```

### Voorbeeld 4: force-modus

```yaml
- uses: first-fluke/oma-update-action@v1
  with:
    force: 'true'
    pr-title: "chore(deps): force-update oh-my-agent skills (reset configs)"
```

**Waarschuwing:** Force-modus overschrijft `oma-config.yaml`, `mcp.json` en `stack/`-directory's.

---

## Hoe het onder de motorkap werkt

1. **Setup Bun** — Installeert de Bun-runtime
2. **Installeer oh-my-agent** — `bun install -g oh-my-agent`
3. **Voer oma update uit** — `oma update --ci` (optioneel `--force`)
4. **Controleer wijzigingen** — `git status --porcelain .agents/ .claude/`
5. **PR- of commit-modus** — Afhankelijk van `mode`-invoer

Wat `oma update --ci` intern doet: versie controleren, tarball downloaden, gebruikersbestanden behouden (tenzij `--force`), bestanden kopieren, symlinks vernieuwen.

