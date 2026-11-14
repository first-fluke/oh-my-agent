---
title: Installation
sidebar_label: Installation
description: Installez oh-my-agent, choisissez les compétences et les fournisseurs, comprenez les fichiers générés dans le projet, configurez les modèles et les valeurs d'exécution par défaut, puis vérifiez la configuration avec oma doctor.
---

# Installation

Pour une seule tâche, commencez par [une compétence unique](./choose-setup.md#load-one-skill). Pour les hooks de projet et les workflows d'équipe, utilisez l'installation du runtime ci-dessous. Le [guide de configuration](./choose-setup.md) distingue le chargement d'instructions, les presets de compétences et l'installation depuis le marketplace Claude Code.

Pour Grok Bot, consultez la [page d'installation de Grok Bot](/grok-bot/). Le lien natif **Add to Grok Bot** exige une fiche approuvée sur Cursor Marketplace ; il n'est pas disponible tant que l'enregistrement est en attente. Le [guide d'installation manuel](https://github.com/first-fluke/oh-my-agent/blob/main/integrations/grok-bot/README.md) distinct explique `oma install --target grok-bot` pour la machine Bot. L'intégration runtime de Grok Build ci-dessous est une cible d'installation différente.

## Installer avec un agent IA {#install-with-an-ai-agent}

Collez ceci dans votre agent de codage :

```text
Install and configure oh-my-agent in this project by following this guide:
https://raw.githubusercontent.com/first-fluke/oh-my-agent/main/docs/agent-install.md
```

Le [guide d'installation par agent](https://github.com/first-fluke/oh-my-agent/blob/main/docs/agent-install.md) couvre la préparation de la CLI, la configuration non interactive du projet et la vérification avec `oma doctor`.

## Prérequis {#prerequisites}

- **Un IDE ou une CLI propulsé par l'IA** : au moins un hôte pris en charge, par exemple Claude Code, Codex CLI, Qwen Code, Antigravity CLI (`agy`), Cursor, OpenCode, Kimi Code CLI, Kiro, CommandCode, pi, GitHub Copilot ou Hermes
- **bun** : runtime JavaScript et gestionnaire de paquets (installé automatiquement par le script d'installation s'il est absent)
- **uv** : gestionnaire de paquets Python (le script d'amorçage propose de l'installer s'il est absent)
- **Fournisseur d'intelligence du code** : Serena est le fournisseur par défaut. Gortex est également pris en charge lorsqu'il est sélectionné dans la configuration des fournisseurs. L'installateur peut amorcer Serena avec `uv tool install` ; il continue avec un avertissement lorsqu'une dépendance facultative est indisponible. Lorsque Gortex est sélectionné, `oma install` et `oma update` en mode projet enregistrent le projet auprès du daemon Gortex (`gortex track`) s'il n'est pas encore suivi, et ajoutent les répertoires générés par OMA à la liste d'exclusion de ce projet via la CLI Gortex ; rien n'est écrit dans l'arborescence du projet. Gortex lui-même doit être installé séparément.

L'installateur regroupe les intégrations par capacité. Les fournisseurs de hooks incluent Antigravity, Claude, Codex, CommandCode, Cursor, Grok, Kimi, Kiro et Qwen ; OpenCode et pi utilisent des ponts d'extension ; GitHub Copilot et Hermes reçoivent des liens vers les compétences ; ZCode reçoit les commandes de workflow. Vous pouvez sélectionner plusieurs fournisseurs, mais la première tâche n'a besoin que de l'hôte que vous prévoyez d'utiliser.

---

## Méthode 1 : installation en une commande {#method-1-one-liner-install-full-harness}

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
3. Ils installent la commande `oma` globalement avec `bun install --global oh-my-agent`, sauf si `oma` est déjà dans votre PATH (les hooks et les workflows l'appellent)
4. Ils lancent l'installateur interactif avec la sélection du preset et des fournisseurs
5. Ils créent `.agents/` avec les compétences et la configuration choisies
6. Ils configurent les couches d'intégration du runtime (hooks, symlinks et paramètres des fournisseurs détectés)
7. Ils configurent les serveurs MCP d'intelligence du code et de mémoire

L'amorçage continue après l'échec d'une dépendance facultative et affiche les commandes à exécuter ensuite. AgentMemory est le fournisseur de mémoire sémantique par défaut : `oma install` et `oma update` échouent si son installation, son démarrage ou son contrôle de santé échoue. Sélectionner `providers.semantic_memory: none` ou `honcho`, ou définir `OMA_NO_AGENTMEMORY=1`, désactive la préparation automatique d'AgentMemory. Lancez `oma doctor` une fois l'installateur terminé.

### Ce que fait aussi l'installateur par défaut {#what-the-installer-also-does-by-default}

- **MCP navigateur Aside** : présélectionné dans la configuration interactive et, s'il est absent, installé avec `curl -fsSL https://releases.aside.com/install.sh | bash`, uniquement si vous le laissez sélectionné. Désélectionnez-le à l'étape du MCP navigateur ou plus tard avec `oma update mcp`.
- **Service AgentMemory** : `bun install -g @agentmemory/agentmemory`, enregistré comme service de connexion (launchd, unité utilisateur systemd ou tâche planifiée Windows).
- **CUE** : installé par le script d'amorçage avec `brew install cue` (macOS/Linux) ou `winget` (Windows), puis de nouveau par `oma install` lorsque Serena est le fournisseur d'intelligence de code.
- **Écritures hors du projet** : `~/.claude.json` (marque le projet comme espace de travail Claude Code de confiance), `~/.serena/` (contexte OMA, taille minimale des réponses, enregistrement du projet), `~/.cursor/cli-config.json` (désactive l'attribution des commits de Cursor), `~/.grok/config.toml` (télémétrie) et `~/.gemini/antigravity-cli/` (HUD), chacun uniquement pour un fournisseur sélectionné. Lier des skills dans les dossiers des fournisseurs du répertoire personnel (Antigravity, Hermes, Kimi) demande d'abord une confirmation.
- **Désactivations de télémétrie** : Claude `DISABLE_TELEMETRY=1` (ce qui désactive aussi Claude Code Remote Control) et les statistiques d'utilisation de Gemini, Qwen, Codex et Grok. Définissez `telemetry: true` pour conserver les valeurs par défaut des fournisseurs.
- **Paramètres Claude Code** : les clés non définies de `.claude/settings.json` sont complétées, dont `skipDangerousModePermissionPrompt: true`, `effortLevel: high`, `cleanupPeriodDays: 180` et des flags env qui désactivent l'auto memory, l'adaptive thinking, le signalement d'erreurs et les instructions git intégrées. Les valeurs que vous avez déjà définies sont conservées.
- **Trailer de co-auteur** : l'attribution des commits de Claude Code devient `Co-Authored-By: First Fluke <our.first.fluke@gmail.com>`, et les PR reçoivent une ligne "Generated with oh-my-agent". Définissez `scm.co_author.enabled: false` pour le désactiver.
- **Garde commit-msg** : `.githooks/commit-msg` rejette les adresses `Co-authored-by` absentes de `.githooks/co-authors.allow` et de `scm.co_author.email`. `git config --local core.hooksPath .githooks` n'est défini que si aucun autre hook n'est actif ; sinon, oma indique comment chaîner le garde. Définissez `scm.co_author.enforce_hook: false` pour vous en dispenser.
- **Mises à jour en arrière-plan** : `oma update` met à jour la CLI `oma` en arrière-plan (`auto_update_cli: false` ou `OMA_SKIP_VERSION_CHECK=1` pour l'arrêter) et exécute `uv tool upgrade serena-agent --prerelease=allow` (`serena.auto_update: false` pour l'arrêter).
- **Minuteur de nettoyage Serena** : avec Serena dans le mode `bridge` par défaut, la première session d'agent qui démarre un serveur Serena partagé enregistre un minuteur qui arrête toutes les 5 minutes les serveurs Serena partagés inactifs (launchd `dev.oma.serena-daemon-gc`, minuteur utilisateur systemd `oma-serena-daemon-gc.timer` ou tâche planifiée Windows `OMA Serena Daemon GC`). Définissez `serena.mode: stdio` pour vous passer du serveur partagé et de son minuteur. `oma uninstall` ne supprime pas le minuteur.
- **Les exécutions non interactives** (`-y`, `OMA_YES=1`, `CI=true`) utilisent le preset de skills `All`, `model_preset: auto` et Python comme langage backend. Elles ne sélectionnent aucun MCP navigateur (et sautent le script d'installation d'Aside), sauf si `mcp.devtools_browsers` en liste déjà un.

---

## Méthode 2 : installation manuelle avec bunx {#method-2-manual-install-via-bunx}

```bash
bunx oh-my-agent@latest
```

Cette commande lance l'installateur interactif sans amorçage des dépendances. bun doit déjà être installé.

L'installateur vous demande de choisir un [preset de compétences](./glossary.md#skill-preset). Les presets actuels sont définis dans `PRESETS` dans `cli/constants/skill-data.ts` :

### Presets {#presets}

Choisissez le preset qui correspond au travail dont le dépôt a besoin. Les noms de compétences ci-dessous omettent le préfixe `oma-`.

| Preset | Choisissez-le lorsque le projet est | Compétences incluses | Nombre |
|--------|-------------------------------------|----------------------|--------|
| **all** | N'importe quel projet, ou lorsque vous voulez que chaque workflow fonctionne d'emblée | Toutes les compétences du registre | 33 |
| **fullstack** | Des clients web et mobile avec un backend et une infrastructure Terraform | architecture, brainstorm, design, frontend, backend, mobile, db, pm, qa, debug, scm, tf-infra, dev-workflow | 13 |
| **fullstack-web** | Un frontend web avec un backend et une base de données | architecture, brainstorm, design, frontend, backend, db, pm, qa, debug, scm, dev-workflow | 11 |
| **fullstack-mobile** | Une application mobile avec un backend et une base de données | architecture, brainstorm, design, mobile, backend, db, pm, qa, debug, scm, dev-workflow | 11 |
| **frontend** | Une interface web uniquement | architecture, brainstorm, design, frontend, pm, qa, debug, scm | 8 |
| **backend** | Une API ou un service avec une base de données | architecture, brainstorm, backend, db, pm, qa, debug, scm, dev-workflow | 9 |
| **mobile** | Une application mobile uniquement | architecture, brainstorm, mobile, pm, qa, debug, scm | 7 |
| **devops** | Du travail d'infrastructure, de CI/CD et d'observabilité | architecture, brainstorm, tf-infra, dev-workflow, observability, pm, qa, debug, scm | 9 |
| **security** | De l'analyse de sécurité, de la revue de code et de la remédiation | security, architecture, qa, debug, refactor, scm | 6 |
| **research** | Des articles, des études de marché et la conversion PDF/HWP | scholar, market, pdf, hwp, academic-writing, search, translation, scm | 8 |
| **content** | Des ressources de design, des images, de la voix et du contenu rédigé | design, image, voice, academic-writing, translation, scm | 6 |

Les presets sont des ensembles de compétences ; ils ne créent pas une définition de sous-agent par compétence. Le preset `all` est développé à partir du registre de compétences actif, de sorte que la liste peut s'allonger avec le dépôt. Les presets de domaine ne contiennent que les compétences de leur spécialité.

Choisissez un preset depuis la ligne de commande :

```bash
oma install --preset frontend --yes
```

`--preset` utilise les noms du tableau et est prioritaire sur l'invite interactive des compétences et sur la valeur par défaut `all` en mode non interactif. Un nom inconnu est rejeté avant le début de l'installation. Omettre l'option conserve le parcours de sélection existant. L'option sélectionne les compétences ; les fichiers partagés, agents, workflows, hooks et la configuration des fournisseurs continuent de suivre l'installateur du runtime. Réinstaller avec un preset plus restreint conserve les compétences précédemment installées. La sélection personnalisée n'est disponible que via le menu interactif ; `custom` et les valeurs vides ne sont pas acceptés par `--preset`.

Après l'installation, consultez la liste des compétences sélectionnées et le rapport de disponibilité des workflows. Un workflow n'est exposé que lorsque les manifestes des compétences requises portent des noms et des descriptions valides. Des compétences conservées existantes peuvent satisfaire ces exigences. Les références conditionnelles sont signalées séparément et n'élargissent pas le preset sélectionné. Ce contrôle porte sur les manifestes ; les outils, fournisseurs, identifiants et l'exécution nécessitent toujours leurs propres vérifications.

### Workflows nécessitant des compétences hors d'un preset {#workflows-that-need-skills-outside-a-preset}

Chaque preset copie les définitions de workflows et d'agents. Les commandes et invites ne sont exposées que pour les workflows dont les compétences requises sont disponibles. Par exemple, une installation `frontend` neuve laisse `/work` indisponible faute d'`oma-coordination` ; ses compétences PM et QA existantes satisfont déjà les autres exigences d'entrée. L'installateur signale cette compétence manquante sans basculer vers `all`.

| Workflow | Compétences d'entrée requises | Presets qui les incluent |
|----------|-------------------------------|------------------------|
| `/work`, `/ultrawork`, `/ralph` | oma-coordination, oma-pm, oma-qa | all |
| `/orchestrate` | oma-coordination, oma-orchestration, oma-qa | all |
| `/docs` | oma-docs | all |
| `/explain` | oma-explanation | all |
| `/security` | oma-security | all, security |
| `/recap` | oma-recap | all |
| `/video` | oma-video | all |
| `/design` | oma-design | all, fullstack, fullstack-web, fullstack-mobile, frontend, content |
| `/architecture` | oma-architecture | all, fullstack, fullstack-web, fullstack-mobile, frontend, backend, mobile, devops, security |
| `/plan` | oma-pm | all, fullstack, fullstack-web, fullstack-mobile, frontend, backend, mobile, devops |
| `/review` | oma-qa | all, fullstack, fullstack-web, fullstack-mobile, frontend, backend, mobile, devops, security |
| `/scm` | oma-scm | tous les presets |

Les références propres à certaines branches restent informatives. Par exemple, `/convert` choisit des outils PDF, HWP ou vidéo après examen de son entrée ; `/ralph` et `/ultrawork` peuvent nécessiter `oma-refactor` sur une branche de refactorisation. Ces références ne sont pas des exigences d'entrée inconditionnelles.

Exécutez `oma doctor` pour diagnostiquer les manifestes manquants ou invalides. Pour ajouter une compétence manquante, exécutez `oma install` et choisissez **Select individually**. Après avoir réparé un manifeste, exécutez `oma link` pour actualiser l'exposition des workflows ; une réinstallation l'actualise aussi. Utilisez le périmètre `--global` correspondant pour une installation globale OMA. Les commandes utilisateur existantes sont conservées lorsque les commandes OMA indisponibles sont supprimées.

### Plugins de domaine {#domain-plugins}

Les utilisateurs du marketplace Claude Code peuvent choisir une entrée de domaine après avoir ajouté le marketplace `oh-my-agent` :

```bash
claude plugin install oma-frontend@oh-my-agent
# Alternatives: oma-security@oh-my-agent, oma-research@oh-my-agent
```

Les entrées de domaine contiennent 8 compétences frontend, 6 compétences sécurité ou 8 compétences recherche ainsi qu'une sélection d'agents natifs correspondante. Leur amorçage de session transmet ce preset à l'installateur du runtime. La configuration partagée du runtime et les compétences déjà installées suivent le comportement de l'installateur décrit ci-dessus. L'entrée `oma` conserve le plugin complet. Les mêmes racines de domaine sont déclarées dans le catalogue du marketplace Codex généré ainsi que dans les catalogues Grok Build et ZCode. Antigravity CLI (`agy plugin install ./antigravity-plugin` sur l'arborescence émise ou l'archive de release `oma-antigravity-plugin.tar.gz`), Grok Build CLI, ZCode et Kimi Code (`/plugins install`) lisent chacun leur propre manifeste généré ; consultez [Hôtes de plugins compatibles Claude](../guide/vendor-capabilities.md#claude-compatible-plugin-hosts) pour les étapes exactes par hôte.

Les jobs CI épinglés des hôtes enregistrent le marketplace local sur des runners neufs, installent les entrées de domaine et inspectent l'inventaire résultant. Ces vérifications s'exécutent sans appels de modèle. Les identifiants d'exécution, les fournisseurs externes et la réussite d'une première tâche nécessitent toujours leur propre vérification. Les contrôles de release exigent aussi que les deux manifestes de chaque racine de domaine correspondent à la version de la CLI et disposent d'un outil de mise à jour Release Please.

Les ressources partagées (`_shared/`) sont toujours installées, quel que soit le preset. Elles comprennent le routage central, le chargement du contexte, la structure des prompts, la détection des fournisseurs, les protocoles d'exécution et le protocole de mémoire.

### Fichiers créés {#what-gets-created}

Après l'installation, votre projet contient :

```text
.agents/
├── oma-config.yaml          # Your preferences
├── oma-config.cue           # Optional schema-backed configuration
├── mcp.json                 # MCP server configuration
├── skills/
│   ├── _shared/             # Shared resources (always installed)
│   │   ├── core/            # skill-routing, context-loading, etc.
│   │   ├── runtime/         # memory-protocol, execution-protocols/
│   │   └── conditional/     # quality-score, experiment-ledger, etc.
│   ├── oma-frontend/        # Per preset
│   │   ├── SKILL.md
│   │   └── resources/
│   └── ...                  # Other selected skills
├── workflows/               # Workflow definitions (all 20, every preset)
├── agents/                  # Subagent definitions (all 12, every preset)
├── hooks/                   # Hook sources (core/, variants/)
├── rules/                   # Project rules
├── results/                 # Plans and agent results (populated by workflows)
└── state/                   # Persistent workflow and coordination state
    └── memories/            # Runtime coordination state

.claude/
├── settings.json            # Vendor settings, when Claude Code is selected
├── hooks/
│   ├── oma-hook.sh          # Generated wrapper for the in-process hook chain
│   └── hud.ts               # Optional [OMA] statusline indicator
├── skills/                  # Symlinks → .agents/skills/
└── agents/                  # Generated native subagent files, when supported
```

L'installateur ne crée les répertoires de fournisseurs que pour les hôtes que vous sélectionnez. Le code source des hooks reste dans `.agents/hooks/core/` ; les fichiers générés par fournisseur sont des sorties d'intégration. Serena peut également utiliser un ancien répertoire `.serena/memories/` dans les projets plus anciens.

---

## Méthode 3 : installation globale {#method-3-global-install}

Pour utiliser la CLI au niveau global (tableaux de bord, lancement d'agents, diagnostics), installez oh-my-agent globalement :

:::note
Cette section installe la commande `oma`. Ce n'est pas la même chose que `oma install --global`, qui installe les compétences, les workflows et les règles dans le répertoire global d'OMA (`~/.oma/.agents/`) pour tous les projets. Voir [Installation globale](../guide/global-install.md).
:::

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
oma dashboard web # Web dashboard at http://127.0.0.1:9847
oma agent spawn # Spawn agents from terminal
oma agent parallel # Parallel agent execution
oma agent status # Check agent status
oma agent review # Code review via an external CLI
oma docs verify # Check documentation references
oma skill audit # Audit skill routing descriptions
oma stats get # Session statistics
oma recap # Conversation history recap across AI tools
oma link # Regenerate vendor-native files from `.agents/` SSOT
oma update # Update installed skills from the registry
oma verify agent <agent-type> # Verify agent output (build/test/scope/secrets)
oma describe # Introspect CLI commands as JSON
oma bridge # Proxy MCP stdio to a shared per-project Serena server
oma memory init # Initialize coordination memory schema
oma auth status # Check CLI auth status
oma search # Mechanical search primitives
oma image # Multi-vendor AI image generation
oma video # Video generation and capture
oma slide # Presentation generation and export
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
  backend: { model: openai/gpt-6.1-terra, effort: high }
  qa:      { model: anthropic/claude-sonnet-5-5 }

# Optional — user-defined model slugs
# models:
#   my-fast:
#     cli: antigravity
#     cli_model: "Gemini 3.8 Flash (Medium)"
#     supports: { thinking: true }

# Optional — user-defined presets
# custom_presets:
#   my-team:
#     extends: claude
#     agent_defaults:
#       backend: { model: openai/gpt-6.1-terra, effort: high }
```

### Référence des champs {#field-reference}

| Champ | Type | Obligatoire | Description |
|-------|------|-------------|-------------|
| `language` | string | Oui | Code de langue des réponses. Prend en charge en, ko, ja, zh, es, fr, de, pt, ru, nl et pl. |
| `model_preset` | string | Oui | Clé du [preset de modèles](./glossary.md#model-preset) actif. `auto` suit le runtime courant ; les clés fixes comprennent `free`, `antigravity`, `claude`, `codex`, `qwen`, `cursor`, `kiro` et `mixed`. Les clés de preset personnalisées sont également valides. Voir [Modèles par agent](../guide/per-agent-models.md). |
| `agents` | map | Non | Surcharges de modèle par rôle ; `agents.default` contient `cli` (la CLI de repli pour `oma agent spawn` lorsque les paramètres explicites de l'agent et le preset sélectionné ne résolvent aucun fournisseur) ainsi que les valeurs par défaut `effort`, `thinking` et `memory`. |
| `providers` | map | Non | Fournisseurs de capacités : `code_intelligence` (`serena` ou `gortex`), `code_intelligence_guard` (`block` ou `off`), `docs` (`context7`), `web` (`native` ou `brave`) et `semantic_memory` (`agentmemory`, `honcho` ou `none`) ; leurs sections d'identifiants (`brave`, `exa`, `honcho`) ; et des fournisseurs LLM nommés tels que `free` (la passerelle FreeLLMAPI utilisée par `model_preset: free`). Gardez les clés API dans des variables d'environnement. |
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

Lorsqu'un agent est lancé, la CLI résout ses paramètres dans cet ordre : `agents.<id>`, le `model_preset` sélectionné, le fallback de l'orchestrateur du preset, puis `agents.default.cli`. Avec `model_preset: auto`, la configuration native du runtime courant fournit le modèle ; un runtime inconnu utilise `agents.default.cli`. Voir [Modèles par agent](../guide/per-agent-models.md) pour la matrice complète.

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

```text
"Build a login form with email validation using Tailwind CSS"
```

Vous pouvez aussi utiliser une commande de workflow :

```text
/plan authentication feature with JWT and refresh tokens
```

Consultez le [Guide d'utilisation](/docs/guide/usage) pour des exemples détaillés, ou découvrez les [Agents](/docs/core-concepts/agents) pour comprendre le rôle de chaque spécialiste. Si l'installation ou un hook ne se comporte pas comme prévu, consultez [Dépannage](../guide/troubleshooting.md).
