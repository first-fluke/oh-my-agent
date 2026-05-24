---
title: Installation
description: Guide d'installation complet d'oh-my-agent — trois méthodes d'installation, les six presets avec leurs listes de compétences, prérequis des outils CLI pour les cinq fournisseurs, configuration post-installation, champs de oma-config.yaml et vérification avec oma doctor.
---

# Installation

## Prérequis

- **Un IDE ou CLI propulsé par l'IA** -- au moins l'un des suivants : Claude Code, Gemini CLI, Codex CLI, Qwen CLI, Antigravity CLI (`agy`), Antigravity IDE, Cursor ou OpenCode
- **bun** -- Runtime JavaScript et gestionnaire de paquets (installé automatiquement par le script d'installation s'il est absent)
- **uv** -- Gestionnaire de paquets Python pour Serena MCP (installé automatiquement s'il est absent)

---

## Méthode 1 : Installation en une commande (recommandée)

```bash
# macOS / Linux
curl -fsSL https://raw.githubusercontent.com/first-fluke/oh-my-agent/main/cli/install.sh | bash
```

```powershell
# Windows (PowerShell)
irm https://raw.githubusercontent.com/first-fluke/oh-my-agent/main/cli/install.ps1 | iex
```

Les deux scripts bootstrap se comportent de la même façon :
1. Détecte votre plateforme (macOS, Linux ou Windows)
2. Vérifie la présence de bun, uv et serena, les installe si absents
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

| Préréglage | Compétences incluses |
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
│   └── oma-config.yaml      # Vos préférences
├── skills/
│   ├── _shared/                    # Ressources partagées (toujours installées)
│   │   ├── core/                   # skill-routing, context-loading, etc.
│   │   ├── runtime/                # memory-protocol, execution-protocols/
│   │   └── conditional/            # quality-score, experiment-ledger, etc.
│   ├── oma-frontend/               # Selon le preset
│   │   ├── SKILL.md
│   │   └── resources/
│   └── ...                         # Autres compétences sélectionnées
├── workflows/                      # Les 16 définitions de workflows
├── agents/                         # Définitions des sous-agents
├── mcp.json                        # Configuration du serveur MCP
├── results/plan-{sessionId}.json                       # Vide (renseigné par /plan)
├── state/                          # Vide (utilisé par les workflows persistants)
└── results/                        # Vide (renseigné par les exécutions d'agents)

.claude/
├── settings.json                   # Hooks et permissions
├── hooks/
│   ├── triggers.json               # Mapping mot-clé/workflow (11 langues)
│   ├── keyword-detector.ts         # Logique de détection automatique
│   ├── persistent-mode.ts          # Application du mode workflow persistant
│   └── hud.ts                      # Indicateur de barre d'état [OMA]
├── skills/                         # Symlinks → .agents/skills/
└── agents/                         # Définitions de sous-agents pour l'IDE

.serena/
└── memories/                       # État d'exécution (renseigné pendant les sessions)
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
oma doctor              # Vérification de santé
oma dashboard           # Surveillance terminal
oma dashboard:web       # Tableau de bord web sur http://localhost:9847
oma agent:spawn         # Lance des agents depuis le terminal
oma agent:parallel      # Exécution parallèle d'agents
oma agent:status        # Vérifie le statut d'un agent
oma stats               # Statistiques de session
oma retro               # Analyse rétrospective
oma cleanup             # Nettoyage des artefacts de session
oma update              # Met à jour oh-my-agent
oma verify              # Vérifie la sortie d'un agent
oma visualize           # Visualisation des dépendances
oma describe            # Décrit la structure du projet
oma bridge              # Pont SSE vers stdio pour Antigravity
oma memory:init         # Initialise le fournisseur de mémoire
oma auth:status         # Vérifie le statut d'authentification des CLI
oma star                # Ajoute une étoile au dépôt
```

`oma` est l'abréviation de `oh-my-agent`. Les deux fonctionnent comme commandes CLI.

---

## Installation des outils CLI IA

Vous avez besoin d'au moins un outil CLI IA installé. oh-my-agent supporte cinq fournisseurs, et vous pouvez les combiner -- en utilisant différents CLI pour différents agents via le mapping agent-CLI.

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

### Antigravity CLI (`agy`)

```bash
curl -fsSL https://antigravity.google/cli/install.sh | bash
```

L'authentification est gérée par `agy` au premier lancement. Le binaire est `agy`. Pour les environnements sans interface, définissez la variable d'environnement `ANTIGRAVITY_API_KEY`. `oma doctor` rapporte l'état de l'authentification via `~/.gemini/antigravity-cli/cache/onboarding.json`.

---

## oma-config.yaml

La commande `oma install` crée `.agents/oma-config.yaml`. C'est le fichier de configuration central pour tout le comportement d'oh-my-agent :

```yaml
# Langue de réponse pour tous les agents et workflows
language: en

# Format de date utilisé dans les rapports et fichiers mémoire
date_format: "YYYY-MM-DD"

# Fuseau horaire pour les horodatages
timezone: "UTC"

# CLI par défaut pour le lancement des agents
# Options : antigravity, claude, codex, qwen
default_cli: gemini

# Mapping CLI par agent (remplace default_cli)
model_preset (per-agent overrides via `agents:`):
  frontend: claude       # Raisonnement UI complexe
  backend: gemini        # Génération rapide d'API
  mobile: gemini
  db: gemini
  pm: gemini             # Décomposition rapide
  qa: claude             # Revue de sécurité approfondie
  debug: claude          # Analyse de cause profonde
  design: claude
  tf-infra: gemini
  dev-workflow: gemini
  translator: claude
  orchestrator: gemini
  commit: gemini
```

### Référence des champs

| Champ | Type | Par défaut | Description |
|-------|------|---------|-------------|
| `language` | string | `en` | Code de langue de réponse. Toute sortie d'agent, message de workflow et rapport utilise cette langue. Prend en charge 11 langues (en, ko, ja, zh, es, fr, de, pt, ru, nl, pl). |
| `date_format` | string | `YYYY-MM-DD` | Chaîne de format de date pour les horodatages des plans, fichiers mémoire et rapports. |
| `timezone` | string | `UTC` | Fuseau horaire de tous les horodatages. Utilise les identifiants standard (par exemple `Asia/Seoul`, `America/New_York`). |
| `default_cli` | string | `gemini` | CLI de repli lorsqu'aucun mapping spécifique à l'agent n'existe. Utilisé comme niveau 3 dans la priorité de résolution du fournisseur. |
| `model_preset (per-agent overrides via `agents:`)` | map | (vide) | Associe les identifiants d'agent à des fournisseurs CLI spécifiques. Prioritaire sur `default_cli`. |

### Priorité de résolution du fournisseur

Lors du lancement d'un agent, le fournisseur CLI est déterminé par cet ordre de priorité (le plus élevé en premier) :

1. Flag `--model` passé à `oma agent:spawn`
2. Entrée `model_preset (per-agent overrides via `agents:`)` pour cet agent spécifique dans `oma-config.yaml`
3. Paramètre `default_cli` dans `oma-config.yaml`
4. `active_vendor` dans `cli-config.yaml` (repli hérité)
5. `gemini` (repli final codé en dur)

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

Consultez le [Guide d'utilisation](/docs/guide/usage) pour des exemples détaillés, ou apprenez-en plus sur les [Agents](/docs/core-concepts/agents) pour comprendre ce que fait chaque spécialiste.
