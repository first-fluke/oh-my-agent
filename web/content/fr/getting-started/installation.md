---
title: Installation
description: Guide d'installation complet d'oh-my-agent — trois méthodes d'installation, les six presets avec leurs listes de compétences, prérequis des outils CLI pour les quatre fournisseurs, configuration post-installation, champs de oma-config.yaml et vérification avec oma doctor.
---

# Installation

## Prérequis

- **Un IDE ou CLI propulsé par l'IA** -- au moins l'un des suivants : Claude Code, Gemini CLI, Codex CLI, Qwen CLI, Antigravity IDE, Cursor ou OpenCode
- **bun** -- Runtime JavaScript et gestionnaire de paquets (installé automatiquement par le script d'installation s'il est absent)
- **uv** -- Gestionnaire de paquets Python pour Serena MCP (installé automatiquement s'il est absent)

---

## Méthode 1 : Installation en une commande (recommandée)

```bash
curl -fsSL https://raw.githubusercontent.com/first-fluke/oh-my-agent/main/cli/install.sh | bash
```

Ce script :
1. Détecte votre plateforme (macOS, Linux)
2. Vérifie la présence de bun et uv, les installe si absents
3. Lance l'installateur interactif avec sélection de preset
4. Crée `.agents/` avec les compétences sélectionnées
5. Configure la couche d'intégration `.claude/` (hooks, symlinks, paramètres)
6. Configure Serena MCP si détecté

Temps d'installation typique : moins de 60 secondes.

---

## Méthode 2 : Installation manuelle via bunx

```bash
bunx oh-my-agent@latest
```

Cela lance l'installateur interactif sans le bootstrap des dépendances. bun doit déjà être installé.

L'installateur vous invite à sélectionner un preset, qui détermine quelles compétences sont installées :

### Presets

| Preset | Skills Included |
|--------|----------------|
| **all** | oma-brainstorm, oma-pm, oma-frontend, oma-backend, oma-db, oma-mobile, oma-design, oma-qa, oma-debug, oma-tf-infra, oma-dev-workflow, oma-translator, oma-orchestrator, oma-scm, oma-coordination |
| **fullstack** | oma-frontend, oma-backend, oma-db, oma-pm, oma-qa, oma-debug, oma-brainstorm, oma-scm |
| **frontend** | oma-frontend, oma-pm, oma-qa, oma-debug, oma-brainstorm, oma-scm |
| **backend** | oma-backend, oma-db, oma-pm, oma-qa, oma-debug, oma-brainstorm, oma-scm |
| **mobile** | oma-mobile, oma-pm, oma-qa, oma-debug, oma-brainstorm, oma-scm |
| **devops** | oma-tf-infra, oma-dev-workflow, oma-pm, oma-qa, oma-debug, oma-brainstorm, oma-scm |

Chaque preset inclut oma-pm (planification), oma-qa (revue), oma-debug (correction de bugs), oma-brainstorm (idéation) et oma-scm (git) comme agents de base. Les presets spécifiques au domaine ajoutent les agents d'implémentation concernés.

Les ressources partagées (`_shared/`) sont toujours installées quel que soit le preset. Cela inclut le routage central, le chargement du contexte, la structure des prompts, la détection du fournisseur, les protocoles d'exécution et le protocole de mémoire.

### Ce qui est créé

Après l'installation, votre projet contiendra :

```
.agents/
├── config/
│   └── oma-config.yaml      # Your preferences
├── skills/
│   ├── _shared/                    # Shared resources (always installed)
│   │   ├── core/                   # skill-routing, context-loading, etc.
│   │   ├── runtime/                # memory-protocol, execution-protocols/
│   │   └── conditional/            # quality-score, experiment-ledger, etc.
│   ├── oma-frontend/               # Per preset
│   │   ├── SKILL.md
│   │   └── resources/
│   └── ...                         # Other selected skills
├── workflows/                      # All 14 workflow definitions
├── agents/                         # Subagent definitions
├── mcp.json                        # MCP server configuration
├── results/plan-{sessionId}.json                       # Empty (populated by /plan)
├── state/                          # Empty (used by persistent workflows)
└── results/                        # Empty (populated by agent runs)

.claude/
├── settings.json                   # Hooks and permissions
├── hooks/
│   ├── triggers.json               # Keyword-to-workflow mapping (11 languages)
│   ├── keyword-detector.ts         # Auto-detection logic
│   ├── persistent-mode.ts          # Persistent workflow enforcement
│   └── hud.ts                      # [OMA] statusline indicator
├── skills/                         # Symlinks → .agents/skills/
└── agents/                         # Subagent definitions for IDE

.serena/
└── memories/                       # Runtime state (populated during sessions)
```

---

## Méthode 3 : Installation globale

Pour une utilisation au niveau CLI (tableaux de bord, lancement d'agents, diagnostics), installez oh-my-agent globalement :

### Homebrew (macOS/Linux)

```bash
brew install oh-my-agent
```

### npm / bun global

```bash
bun install --global oh-my-agent
# or
npm install --global oh-my-agent
```

Cela installe la commande `oma` globalement, vous donnant accès à toutes les commandes CLI depuis n'importe quel répertoire :

```bash
oma doctor              # Health check
oma dashboard           # Terminal monitoring
oma dashboard:web       # Web dashboard at http://localhost:9847
oma agent:spawn         # Spawn agents from terminal
oma agent:parallel      # Parallel agent execution
oma agent:status        # Check agent status
oma stats               # Session statistics
oma retro               # Retrospective analysis
oma cleanup             # Clean up session artifacts
oma update              # Update oh-my-agent
oma verify              # Verify agent output
oma visualize           # Dependency visualization
oma describe            # Describe project structure
oma bridge              # SSE-to-stdio bridge for Antigravity
oma memory:init         # Initialize memory provider
oma auth:status         # Check CLI auth status
oma usage:anti          # Usage anti-pattern detection
oma star                # Star the repository
```

`oma` est l'abréviation de `oh-my-agent`. Les deux fonctionnent comme commandes CLI.

---

## Installation des outils CLI IA

Vous avez besoin d'au moins un outil CLI IA installé. oh-my-agent supporte quatre fournisseurs, et vous pouvez les combiner -- en utilisant différents CLI pour différents agents via le mapping agent-CLI.

### Gemini CLI

```bash
bun install --global @google/gemini-cli
# or
npm install --global @google/gemini-cli
```

L'authentification est automatique au premier lancement. Gemini CLI lit les compétences depuis `.agents/skills/` par défaut.

### Claude Code

```bash
curl -fsSL https://claude.ai/install.sh | bash
# or
npm install --global @anthropic-ai/claude-code
```

L'authentification est automatique au premier lancement. Claude Code utilise `.claude/` pour les hooks et paramètres, avec les compétences liées par symlink depuis `.agents/skills/`.

### Codex CLI

```bash
bun install --global @openai/codex
# or
npm install --global @openai/codex
```

Après l'installation, exécutez `codex login` pour vous authentifier.

### Qwen CLI

```bash
bun install --global @qwen-code/qwen-code
```

Après l'installation, exécutez `/auth` dans le CLI pour vous authentifier.

---

## oma-config.yaml

La commande `oma install` crée `.agents/oma-config.yaml`. C'est le fichier de configuration central pour tout le comportement d'oh-my-agent :

```yaml
# Response language for all agents and workflows
language: en

# Date format used in reports and memory files
date_format: "YYYY-MM-DD"

# Timezone for timestamps
timezone: "UTC"

# Default CLI tool for agent spawning
# Options: gemini, claude, codex, qwen
default_cli: gemini

# Per-agent CLI mapping (overrides default_cli)
agent_cli_mapping:
  frontend: claude       # Complex UI reasoning
  backend: gemini        # Fast API generation
  mobile: gemini
  db: gemini
  pm: gemini             # Quick decomposition
  qa: claude             # Thorough security review
  debug: claude          # Deep root-cause analysis
  design: claude
  tf-infra: gemini
  dev-workflow: gemini
  translator: claude
  orchestrator: gemini
  commit: gemini
```

### Référence des champs

| Field | Type | Default | Description |
|-------|------|---------|-------------|
| `language` | string | `en` | Response language code. All agent output, workflow messages, and reports use this language. Supports 11 languages (en, ko, ja, zh, es, fr, de, pt, ru, nl, pl). |
| `date_format` | string | `YYYY-MM-DD` | Date format string for timestamps in plans, memory files, and reports. |
| `timezone` | string | `UTC` | Timezone for all timestamps. Uses standard timezone identifiers (e.g., `Asia/Seoul`, `America/New_York`). |
| `default_cli` | string | `gemini` | Fallback CLI when no agent-specific mapping exists. Used as level 3 in vendor resolution priority. |
| `agent_cli_mapping` | map | (empty) | Maps agent IDs to specific CLI vendors. Takes precedence over `default_cli`. |

### Priorité de résolution du fournisseur

Lors du lancement d'un agent, le fournisseur CLI est déterminé par cet ordre de priorité (le plus élevé en premier) :

1. `--model` flag passed to `oma agent:spawn`
2. `agent_cli_mapping` entry for that specific agent in `oma-config.yaml`
3. `default_cli` setting in `oma-config.yaml`
4. `active_vendor` in `cli-config.yaml` (legacy fallback)
5. `gemini` (hardcoded final fallback)

---

## Vérification : `oma doctor`

Après l'installation et la configuration, vérifiez que tout fonctionne :

```bash
oma doctor
```

Cette commande vérifie :
- Tous les outils CLI requis sont installés et accessibles
- La configuration du serveur MCP est valide
- Les fichiers de compétences existent avec un frontmatter SKILL.md valide
- Les symlinks dans `.claude/skills/` pointent vers des cibles valides
- Les hooks sont correctement configurés dans `.claude/settings.json`
- Le fournisseur de mémoire est accessible (Serena MCP)
- `oma-config.yaml` est un YAML valide avec les champs requis

Si quelque chose ne va pas, `oma doctor` vous indique exactement ce qu'il faut corriger, avec des commandes à copier-coller.

---

## Mise à jour

### Mise à jour du CLI

```bash
oma update
```

Cela met à jour le CLI oh-my-agent global vers la dernière version.

### Mise à jour des compétences du projet

Les compétences et workflows d'un projet peuvent être mis à jour via la GitHub Action (`action/`) pour des mises à jour automatisées, ou manuellement en relançant l'installateur :

```bash
bunx oh-my-agent@latest
```

L'installateur détecte les installations existantes et propose de mettre à jour tout en préservant votre `oma-config.yaml` et toute configuration personnalisée.

---

## Prochaines étapes

Ouvrez votre projet dans votre IDE IA et commencez à utiliser oh-my-agent. Les compétences sont détectées automatiquement. Essayez :

```
"Build a login form with email validation using Tailwind CSS"
```

Ou utilisez une commande workflow :

```
/plan authentication feature with JWT and refresh tokens
```

Consultez le [Guide d'utilisation](/guide/usage) pour des exemples détaillés, ou apprenez-en plus sur les [Agents](/core-concepts/agents) pour comprendre ce que fait chaque spécialiste.
