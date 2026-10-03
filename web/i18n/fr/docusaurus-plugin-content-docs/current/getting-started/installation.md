---
title: Installation
sidebar_label: Installation
description: Installez oh-my-agent, choisissez les compétences et les fournisseurs, comprenez les fichiers générés dans le projet, configurez les modèles et les valeurs d'exécution par défaut, puis vérifiez la configuration avec oma doctor.
---

# Installation

## Prérequis {#prerequisites}

- **Un IDE ou une CLI propulsé par l'IA** : au moins un hôte pris en charge, par exemple Claude Code, Codex CLI, Qwen Code, Antigravity CLI (`agy`), Cursor, OpenCode, Kimi Code CLI, Kiro, CommandCode, pi, GitHub Copilot ou Hermes
- **bun** : runtime JavaScript et gestionnaire de paquets (installé automatiquement par le script d'installation s'il est absent)
- **uv** : gestionnaire de paquets Python (le script d'amorçage propose de l'installer s'il est absent)
- **Fournisseur d'intelligence du code** : Serena est le fournisseur par défaut. Gortex est également pris en charge lorsqu'il est sélectionné dans la configuration des fournisseurs. L'installateur peut amorcer Serena avec `uv tool install` ; il continue avec un avertissement lorsqu'une dépendance facultative est indisponible. Lorsque Gortex est sélectionné, `oma install` et `oma update` en mode projet enregistrent le projet auprès du daemon Gortex (`gortex track`) s'il n'est pas encore suivi, et ajoutent les répertoires générés par OMA à la liste d'exclusion de ce projet via la CLI Gortex ; rien n'est écrit dans l'arborescence du projet. Gortex lui-même doit être installé séparément.

L'installateur regroupe les intégrations par capacité. Les fournisseurs de hooks incluent Antigravity, Claude, Codex, CommandCode, Cursor, Grok, Kimi, Kiro et Qwen ; OpenCode et pi utilisent des ponts d'extension ; GitHub Copilot et Hermes reçoivent des liens vers les compétences ; ZCode reçoit les commandes de workflow. Vous pouvez sélectionner plusieurs fournisseurs, mais la première tâche n'a besoin que de l'hôte que vous prévoyez d'utiliser.

---

## Méthode 0 : CLI skills (la plus rapide pour les compétences uniquement) {#method-0-skills-cli-fastest-for-skills-only}

Installez le pack de compétences OMA dans les runtimes d'agents détectés :

```bash
npx skills add first-fluke/oh-my-agent
```

C'est la voie d'accès la plus légère lorsque vous voulez les compétences sans le harnais complet. Pour les workflows, les règles, les hooks, les portes et `oma agent spawn`, utilisez la méthode 1 ou 2 ci-dessous.

## Méthode 1 : installation en une commande (harnais complet) {#method-1-one-liner-install-full-harness}

```bash
# macOS / Linux
curl -fsSL https://raw.githubusercontent.com/first-fluke/oh-my-agent/main/cli/install.sh | bash
```

```powershell
# Windows (PowerShell)
irm https://raw.githubusercontent.com/first-fluke/oh-my-agent/main/cli/install.ps1 | iex
```

Les deux scripts d'amorçage fonctionnent de la même manière :
1. Ils détectent votre plateforme (macOS, Linux ou Windows)
2. Ils vérifient la présence de bun et uv (et de Serena si vous l'avez choisi), puis les installent s'ils manquent
3. Ils lancent l'installateur interactif avec la sélection du preset et des fournisseurs
4. Ils créent `.agents/` avec les compétences et la configuration choisies
5. Ils configurent les couches d'intégration du runtime (hooks, symlinks et paramètres des fournisseurs détectés)
6. Ils configurent les serveurs MCP d'intelligence du code et de mémoire

L'amorçage continue après l'échec d'une dépendance facultative et affiche les commandes à exécuter ensuite. Lancez `oma doctor` une fois l'installateur terminé.

---

## Méthode 2 : installation manuelle avec bunx {#method-2-manual-install-via-bunx}

```bash
bunx oh-my-agent@latest
```

Cette commande lance l'installateur interactif sans amorçage des dépendances. bun doit déjà être installé.

L'installateur vous demande de choisir un preset de compétences. Les presets actuels sont définis dans `cli/constants/skill-data.ts` :

### Presets {#presets}

| Preset | Compétences incluses |
|--------|----------------------|
| **all** | Les 33 paquets de compétences actuels |
| **fullstack** | Architecture, brainstorming, design, frontend, backend, mobile, base de données, PM, QA, débogage, SCM, Terraform et workflow de développement |
| **fullstack-web** | Implémentation web fullstack, architecture, design, PM, QA, débogage, SCM et workflow de développement |
| **fullstack-mobile** | Implémentation fullstack axée mobile, architecture, design, PM, QA, débogage, SCM et workflow de développement |
| **frontend** | Architecture, brainstorming, design, frontend, PM, QA, débogage et SCM |
| **backend** | Architecture, brainstorming, backend, base de données, PM, QA, débogage, SCM et workflow de développement |
| **mobile** | Architecture, brainstorming, mobile, PM, QA, débogage et SCM |
| **devops** | Architecture, brainstorming, Terraform, workflow de développement, observabilité, PM, QA, débogage et SCM |
| **research** | Scholar, market, PDF, HWP, rédaction académique, recherche, traduction et SCM |
| **content** | Design, image, voix, rédaction académique, traduction et SCM |

Les presets sont des ensembles de compétences ; ils ne créent pas une définition de sous-agent par compétence. Le preset `all` est développé à partir du registre de compétences actif, de sorte que la liste peut s'allonger avec le dépôt. Les presets de domaine ne contiennent que les compétences nécessaires à leur spécialité.

Les ressources partagées (`_shared/`) sont toujours installées, quel que soit le preset. Elles comprennent le routage central, le chargement du contexte, la structure des prompts, la détection des fournisseurs, les protocoles d'exécution et le protocole de mémoire.

### Fichiers créés {#what-gets-created}

Après l'installation, votre projet contient :

```
.agents/
├── oma-config.yaml # Your preferences
├── oma-config.cue # Optional schema-backed configuration
├── skills/
│ ├── _shared/ # Shared resources (always installed)
│ │ ├── core/ # skill-routing, context-loading, etc.
│ │ ├── runtime/ # memory-protocol, execution-protocols/
│ │ └── conditional/ # quality-score, experiment-ledger, etc.
│ ├── oma-frontend/ # Per preset
│ │ ├── SKILL.md
│ │ └── resources/
│ └── ... # Other selected skills
├── workflows/ # Current workflow definitions (21 in this checkout)
├── agents/ # Subagent definitions
├── mcp.json # MCP server configuration
├── results/ # Plans and agent results (populated by workflows)
└── state/ # Persistent workflow and coordination state

.claude/
├── settings.json # Vendor settings, when Claude Code is selected
├── hooks/oma-hook.sh # Generated wrapper for the in-process hook chain
├── hooks/hud.ts # Optional [OMA] statusline indicator
├── skills/ # Symlinks → .agents/skills/
└── agents/ # Generated native subagent files, when supported

.agents/state/memories/
└── ... # Runtime coordination state
```

L'installateur ne crée les répertoires de fournisseurs que pour les hôtes que vous sélectionnez. Le code source des hooks reste dans `.agents/hooks/core/` ; les fichiers générés par fournisseur sont des sorties d'intégration. Serena peut également utiliser un ancien répertoire `.serena/memories/` dans les projets plus anciens.

---

## Méthode 3 : installation globale {#method-3-global-install}

Pour utiliser la CLI au niveau global (tableaux de bord, lancement d'agents, diagnostics), installez oh-my-agent globalement :

### Homebrew (macOS/Linux) {#homebrew-macoslinux}

```bash
brew install oh-my-agent
```

### npm / bun global {#npm--bun-global}

```bash
bun install --global oh-my-agent
# or
npm install --global oh-my-agent
```

Cette installation fournit la commande `oma` globalement et vous donne accès à toutes les commandes CLI depuis n'importe quel répertoire :

```bash
oma doctor # Health check
oma doctor --profile # Show resolved model/CLI per dispatch role
oma dashboard terminal # Terminal monitoring
oma dashboard web # Web dashboard at http://localhost:9847
oma agent spawn # Spawn agents from terminal
oma agent parallel # Parallel agent execution
oma agent status # Check agent status
oma agent review # Code review via an external CLI
oma docs verify # Check documentation references
oma skill audit # Audit skill routing descriptions
oma stats get # Session statistics
oma recap # Conversation history recap across AI tools
oma link # Regenerate vendor-native files from `.agents/` SSOT
oma update # Update oh-my-agent
oma verify agent <agent-type> # Verify agent output (build/test/scope/secrets)
oma describe # Introspect CLI commands as JSON
oma bridge # MCP stdio ↔ Streamable HTTP bridge
oma memory init # Initialize coordination memory schema
oma auth status # Check CLI auth status
oma search # Mechanical search primitives (alias: `oma s`)
oma image # Multi-vendor AI image generation (alias: `oma img`)
oma video # Video generation and capture
oma slide # Presentation generation and export
oma export # Export skills for external IDEs (e.g. cursor)
oma star # Star the repository
```

`oma` est l'abréviation de `oh-my-agent`. Les deux noms peuvent être utilisés comme commandes CLI.

---

## Installation des outils CLI IA {#ai-cli-tool-installation}

Vous devez avoir installé au moins un outil CLI IA. oh-my-agent prend en charge plusieurs fournisseurs ; vous pouvez les combiner en utilisant différents CLI pour différents agents via le mapping agent-CLI.

### Claude Code {#claude-code}

```bash
curl -fsSL https://claude.ai/install.sh | bash
# or
npm install --global @anthropic-ai/claude-code
```

L'authentification est automatique au premier lancement. Claude Code utilise `.claude/` pour les hooks et les paramètres, avec des compétences liées depuis `.agents/skills/`.

### Codex CLI {#codex-cli}

```bash
bun install --global @openai/codex
# or
npm install --global @openai/codex
```

Après l'installation, exécutez `codex login` pour vous authentifier.

### Qwen CLI {#qwen-cli}

```bash
bun install --global @qwen-code/qwen-code
```

Après l'installation, exécutez `/auth` dans la CLI pour vous authentifier.

### Antigravity CLI (`agy`) {#antigravity-cli-agy}

```bash
curl -fsSL https://antigravity.google/cli/install.sh | bash
```

`agy` gère l'authentification lors du premier lancement. Le binaire s'appelle `agy`. Dans les environnements sans interface, définissez plutôt la variable d'environnement `ANTIGRAVITY_API_KEY`. `oma doctor` indique l'état de l'authentification via `~/.gemini/antigravity-cli/cache/onboarding.json`.

---

## oma-config.yaml {#oma-configyaml}

La commande `oma install` crée `.agents/oma-config.yaml`. Il s'agit du fichier de configuration central de tout le comportement d'oh-my-agent :

```yaml
# Required
language: en
model_preset: auto          # follows the current runtime's native model settings

# Optional — date/time preferences
date_format: ISO
timezone: Australia/Sydney  # omit to use the system timezone

# Optional — auto-update the CLI in background
auto_update_cli: true
telemetry: false

# Optional — capability providers (defaults are context7/native/serena/agentmemory)
# providers:
#   docs: context7
#   web: native
#   code_intelligence: serena
#   code_intelligence_guard: block   # deny native Grep/Glob/rg while serena is configured (off to disable)
#   semantic_memory: agentmemory

# Optional — browser DevTools MCP. Omit to preserve the current setup.
# mcp:
#   devtools_browsers: [aside]

# Optional — partial override per agent (object-only, shallow merge)
agents:
  backend: { model: openai/gpt-5.5, effort: high }
  qa:      { model: anthropic/claude-sonnet-4-6 }

# Optional — user-defined model slugs
# models:
#   my-fast:
#     cli: antigravity
#     cli_model: "Gemini 3.6 Flash (Medium)"
#     supports: { thinking: true }

# Optional — user-defined presets
# custom_presets:
#   my-team:
#     extends: claude
#     agent_defaults:
#       backend: { model: openai/gpt-5.5, effort: high }
```

### Référence des champs {#field-reference}

| Champ | Type | Obligatoire | Description |
|-------|------|-------------|-------------|
| `language` | string | Oui | Code de langue des réponses. Prend en charge en, ko, ja, zh, es, fr, de, pt, ru, nl et pl. |
| `model_preset` | string | Oui | Clé du preset actif. `auto` suit le runtime courant ; les clés fixes comprennent `free`, `antigravity`, `claude`, `codex`, `qwen`, `cursor`, `kiro` et `mixed`. Les clés de preset personnalisées sont également valides. Voir [Modèles par agent](../guide/per-agent-models.md). |
| `default_cli` | string | Non | CLI de repli pour `oma agent spawn` lorsqu'aucun fournisseur n'est résolu par les paramètres explicites de l'agent et le preset sélectionné. |
| `free` | map | Non | Paramètres de la passerelle FreeLLMAPI utilisés avec `model_preset: free` ; gardez les clés API dans les variables d'environnement. |
| `providers` | map | Non | Fournisseurs de capacités : `code_intelligence` (`serena` ou `gortex`), `code_intelligence_guard` (`block` ou `off`), `docs` (`context7`), `web` (`native` ou `brave`) et `semantic_memory` (`agentmemory`, `honcho` ou `none`). |
| `date_format` | string | Non | Format des horodatages (`ISO`, `US`, `EU`). Valeur par défaut : `ISO`. |
| `timezone` | string | Non | Identifiant de fuseau horaire (par exemple `Asia/Seoul`). Une valeur omise utilise le fuseau horaire du système hôte. |
| `auto_update_cli` | boolean | Non | Indique si les vérifications CLI courantes peuvent mettre à jour l'outil en arrière-plan. Valeur par défaut : `true` (désactivez avec `false`). |
| `telemetry` | boolean | Non | Activation de la télémétrie du fournisseur. Valeur par défaut : `false`. |
| `agents` | map | Non | Surcharges partielles par agent (objet `AgentSpec` uniquement), fusionnées superficiellement avec les valeurs par défaut du preset. |
| `models` | map | Non | Slugs de modèles définis par l'utilisateur, auparavant stockés dans `models.yaml`. |
| `custom_presets` | map | Non | Presets définis par l'utilisateur. Prend en charge `extends:` pour hériter partiellement d'un preset intégré. |
| `mcp.devtools_browsers` | list | Non | Navigateurs pour DevTools MCP : `aside`, `chrome` ou `firefox`. Une valeur omise conserve la configuration existante ; `[]` désactive explicitement le serveur de navigateur. |
| `serena.mode` | string | Non | `bridge` partage un serveur Serena de projet et constitue la valeur par défaut ; `stdio` choisit un processus par session. |
| `serena.auto_update` | boolean | Non | Indique si `oma update` met à niveau Serena. Valeur par défaut : `true`. |

> **Format de configuration :** un fichier `.agents/oma-config.cue` valide est évalué comme configuration partagée. Si l'évaluation du CUE partagé échoue, le chargeur peut utiliser `.agents/oma-config.yaml` en secours ; une surcouche locale (`oma-config.local.cue` ou `.yaml`) est facultative et toute intention locale invalide est fatale. `OMA_MODEL_PRESET` remplace la valeur du fichier pour le processus courant.

### Résolution du fournisseur {#vendor-resolution}

Lorsqu'un agent est lancé, la CLI résout ses paramètres dans cet ordre : `agents.<id>`, le `model_preset` sélectionné, le fallback de l'orchestrateur du preset, puis `default_cli`. Avec `model_preset: auto`, la configuration native du runtime courant fournit le modèle ; un runtime inconnu utilise `default_cli`. Voir [Modèles par agent](../guide/per-agent-models.md) pour la matrice complète.

---

## Vérification : `oma doctor` {#verification-oma-doctor}

Après l'installation et la configuration, vérifiez que tout fonctionne :

```bash
oma doctor
```

Cette commande vérifie :
- l'installation et l'accessibilité de la CLI de l'hôte sélectionné ; les outils facultatifs sont signalés séparément ;
- la validité des entrées des serveurs MCP configurés (par exemple Serena, Gortex, Context7 ou DevTools) ;
- la présence des fichiers de compétences et la validité de leur frontmatter SKILL.md ;
- la validité des symlinks et des scripts de hooks ;
- la bonne configuration des hooks dans les fichiers de paramètres des fournisseurs ;
- l'accessibilité des fournisseurs sélectionnés pour l'intelligence du code et la mémoire (avec Gortex, aussi l'appartenance du projet courant à l'ensemble suivi par le daemon) ;
- la validité de `oma-config.cue` / `oma-config.yaml` et la présence des champs requis.

En cas de problème, `oma doctor` identifie l'élément manquant ou invalide et distingue les blocages de la première tâche des avertissements concernant les intégrations facultatives.

Pour inspecter le modèle et la CLI résolus pour chaque agent, exécutez :

```bash
oma doctor --profile
```

Voir [Modèles par agent](../guide/per-agent-models.md) pour la matrice complète et les détails de migration.

---

## Mise à jour {#updating}

### Mise à jour de la CLI {#cli-update}

```bash
oma update
```

Cette commande met à jour la CLI globale oh-my-agent vers la dernière version.

### Mise à jour des compétences du projet {#project-skills-update}

Les compétences et workflows d'un projet peuvent être mis à jour via la GitHub Action (`action/`) pour les mises à jour automatisées, ou manuellement en relançant l'installateur :

```bash
bunx oh-my-agent@latest
```

L'installateur détecte les installations existantes et propose une mise à jour tout en conservant votre `oma-config.yaml` et votre configuration personnalisée.

---

## Et ensuite {#what-is-next}

Ouvrez votre projet dans l'IDE ou la CLI IA sélectionné et commencez à utiliser oh-my-agent. Le routage des compétences dépend de l'hôte ; les hooks activés peuvent détecter les workflows. Essayez :

```
"Build a login form with email validation using Tailwind CSS"
```

Vous pouvez aussi utiliser une commande de workflow :

```
/plan authentication feature with JWT and refresh tokens
```

Consultez le [Guide d'utilisation](/docs/guide/usage) pour des exemples détaillés, ou découvrez les [Agents](/docs/core-concepts/agents) pour comprendre le rôle de chaque spécialiste.
