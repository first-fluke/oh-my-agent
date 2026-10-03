---
title: "Guide : intégrer un projet existant"
sidebar_label: Projets existants
description: "Guide complet pour ajouter oh-my-agent à un projet existant : voie CLI, voie manuelle, vérification, structure des liens symboliques SSOT et fonctionnement interne de l'installateur."
---

# Guide : intégrer un projet existant

## Deux voies d'intégration

Deux méthodes permettent d'ajouter oh-my-agent à un projet existant :

1. **Voie CLI** : exécutez `oma` (ou `npx oh-my-agent`) et suivez les invites interactives. C'est la méthode recommandée dans la plupart des cas.
2. **Voie manuelle** : copiez les fichiers et configurez vous-même les liens symboliques. Cette méthode convient aux environnements restreints ou aux installations personnalisées.

Les deux méthodes produisent le même résultat : un répertoire `.agents/` (la SSOT) et des fichiers natifs générés pour les fournisseurs, comme `.claude/agents/`, `.codex/agents/` et `.qwen/agents/`.

---

## Voie CLI : étape par étape

### 1. Installer la CLI

```bash
# Global install (recommended)
bun install --global oh-my-agent

# Or use npx for one-time runs
npx oh-my-agent
```

Après l'installation globale, la commande `oma` (ou `oh-my-agent`) est disponible.

### 2. Accéder à la racine du projet

```bash
cd /path/to/your/project
```

Exécutez l'installateur depuis le répertoire du projet à configurer. OMA écrit la SSOT relativement à sa racine d'installation ; un dépôt Git est recommandé pour faciliter la revue et le retour arrière, mais l'installateur ne l'exige pas.

### 3. Exécuter l'installateur

```bash
oma
```

La commande par défaut (sans sous-commande) lance l'installateur interactif.

### 4. Choisir le type de projet

L'installateur propose les presets suivants :

| Preset | Compétences incluses |
|:-------|:---------------------|
| **All** | Toutes les compétences disponibles |
| **Fullstack** | Frontend + Backend + PM + QA |
| **Frontend** | Compétences React/Next.js |
| **Backend** | Compétences backend Python/Node.js/Rust |
| **Mobile** | Compétences mobiles Flutter/Dart |
| **DevOps** | Compétences Terraform + CI/CD + Workflow |
| **Custom** | Choix de compétences dans la liste complète |

### 5. Choisir le langage backend (si nécessaire)

Si vous sélectionnez un preset qui inclut la compétence backend, l'installateur vous demande de choisir une variante de langage :

- **Python** : FastAPI/SQLAlchemy (par défaut)
- **Node.js** : NestJS/Hono + Prisma/Drizzle
- **Rust** : Axum/Actix-web
- **Other / Auto-detect** : configurez-le ensuite avec `/stack-set`

### 6. Configurer les liens symboliques des IDE

L'installateur crée toujours les liens symboliques Claude Code (`.claude/skills/`). Il génère aussi les fichiers d'agent natifs, hooks, réglages et fichiers d'intégration du fournisseur sélectionné ; les familles de fournisseurs actuelles comprennent Antigravity, Claude, Codex, Cursor, Kiro, Kimi, Qwen, ainsi que les chemins d'extension pour pi et OpenCode. Si un répertoire `.github/` existe, il peut créer automatiquement les liens symboliques GitHub Copilot. Lorsque vous sélectionnez **ZCode**, les workflows deviennent des commandes slash via les liens `.zcode/commands/*.md` (workflows uniquement — aucun fichier d'agent ni hook). Sinon, l'installateur demande :

```
Also create symlinks for GitHub Copilot? (.github/skills/)
```

### 7. Configuration git globale recommandée

Vers la fin de `oma install` et `oma update`, la CLI inspecte deux réglages **globaux** de git utiles aux workflows multi-agents :

| Clé | Valeur souhaitée | Pourquoi |
|:----|:-----------------|:---------|
| `rerere.enabled` | `true` | Réutiliser les résolutions enregistrées : les fusions multi-agents rencontrent souvent les mêmes conflits et rerere rejoue votre correction précédente |
| `init.defaultBranch` | `main` | Utiliser un nom de branche par défaut cohérent pour les nouveaux dépôts |

Si une valeur manque ou diffère, la CLI propose une confirmation interactive (réponse par défaut **oui**) :

```
Enable git rerere? (Recommended for multi-agent merge conflict reuse) (unset)
Set git init.defaultBranch to main? (Recommended global default) (currently "master")
```

L'acceptation exécute l'équivalent de :

```bash
git config --global rerere.enabled true
git config --global init.defaultBranch main
```

Les chemins **non interactifs** (`--yes`, `--ci`, `CI=true`) n'écrivent jamais la configuration globale de git. Ils affichent seulement une note indiquant les commandes de correction manuelle.

`oma doctor` rapporte ces mêmes contrôles sous **Git Config**, compte les écarts comme des problèmes, les expose sous `gitRecommended` dans la sortie `--json` et peut appliquer les corrections de manière interactive.

### 8. Configuration MCP

Si une configuration MCP d'Antigravity IDE existe (`~/.gemini/antigravity/mcp_config.json`), l'installateur propose de configurer le pont MCP Serena :

```
Configure Serena MCP with bridge? (Required for full functionality)
```

Si vous acceptez, il met en place :

```json
{
  "mcpServers": {
    "serena": {
      "command": "npx",
      "args": ["-y", "oh-my-agent@latest", "bridge", "http://localhost:12341/mcp"],
      "disabled": false
    }
  }
}
```

De même, si des réglages Gemini CLI existent (`~/.gemini/settings.json`), il propose de configurer Serena pour Gemini CLI en mode HTTP :

```json
{
  "mcpServers": {
    "serena": {
      "url": "http://localhost:12341/mcp"
    }
  }
}
```

### 9. Terminer

L'installateur affiche un récapitulatif de tout ce qui a été installé :

- Liste des compétences installées
- Emplacement du répertoire des compétences
- Liens symboliques créés
- Éléments ignorés, le cas échéant

---

## Voie manuelle

Cette méthode convient aux environnements où la CLI interactive n'est pas disponible (pipelines CI, shells restreints ou machines d'entreprise).

### Étape 1 : télécharger et extraire

```bash
# Download the latest tarball from the registry
VERSION=$(curl -s https://raw.githubusercontent.com/first-fluke/oh-my-agent/main/prompt-manifest.json | jq -r '.version')
curl -L "https://github.com/first-fluke/oh-my-agent/releases/download/cli-v${VERSION}/agent-skills.tar.gz" -o agent-skills.tar.gz

# Verify checksum
curl -L "https://github.com/first-fluke/oh-my-agent/releases/download/cli-v${VERSION}/agent-skills.tar.gz.sha256" -o agent-skills.tar.gz.sha256
sha256sum -c agent-skills.tar.gz.sha256

# Extract
tar -xzf agent-skills.tar.gz
```

### Étape 2 : copier les fichiers dans le projet

```bash
# Copy the core .agents/ directory
cp -r .agents/ /path/to/your/project/.agents/

# Regenerate vendor-native files from the SSOT
cd /path/to/your/project
oma link
```

`oma link` régénère `.claude/`, `.codex/`, `.qwen/` et les autres fichiers natifs des fournisseurs à partir de `.agents/agents/`. À l'exécution, OMA utilise le dispatch natif uniquement lorsque le fournisseur du runtime actuel correspond au fournisseur cible de l'agent. Les configurations multi-fournisseurs restent fonctionnelles, mais les agents qui ne correspondent pas passent par un `oma agent spawn` externe.

Pour Qwen Code, les définitions Markdown générées se trouvent dans `.qwen/agents/`. Sélectionnez un rôle OMA via le `subagent_type` de l'outil Agent, par exemple `backend-engineer`. Vérifiez les définitions disponibles avec `/agents manage` dans Qwen Code. Les agents natifs suivent le même [cycle de vie des résultats](./agent-results-and-resume.md) que les lancements CLI : `oma agent begin`, `oma agent verify` et `oma agent finish`. Avec `model_preset: free`, utilisez `oma agent spawn` afin que le processus enfant reçoive la configuration de la passerelle.

Qwen Code utilise le même `code-intelligence-primer` que les autres fournisseurs. Comme Claude Code, il enregistre l'amorce partagée sur `SessionStart` et `UserPromptSubmit` : les consignes sont injectées une fois par session, puis de nouveau après un compactage. L'amorce suit le fournisseur configuré (Serena ou Gortex), inclut des consignes sur les outils différés et autorise le repli natif lorsque le fournisseur est indisponible ou expire. Qwen n'ajoute ni blocage distinct de la recherche de code ni suivi des résultats du fournisseur.

Après la mise à jour de la CLI, exécutez `oma link qwen` pour régénérer les paramètres de hooks et le wrapper, puis démarrez une nouvelle session Qwen. Les tests de sortie des hooks vérifient le contrat d'intégration ; ils ne garantissent pas quel outil un modèle choisira.

### Étape 3 : configurer les préférences utilisateur

```bash
mkdir -p /path/to/your/project/.agents
cat > /path/to/your/project/.agents/oma-config.yaml << 'EOF'
language: en
date_format: ISO
timezone: UTC
model_preset: antigravity
EOF
```

### Étape 4 : initialiser le répertoire mémoire

```bash
oma memory init
# Or manually:
mkdir -p /path/to/your/project/.agents/state/memories
```

---

## Liste de vérification

Après l'installation, par l'une ou l'autre méthode, vérifiez que tout est correctement configuré :

```bash
# Run the doctor command for a full health check
oma doctor

# Check output format for CI
oma doctor --json
```

La commande doctor vérifie :

| Contrôle | Ce qui est vérifié |
|:---------|:-------------------|
| **CLI installations** | agy, claude, codex, qwen (version et disponibilité) |
| **Authentication** | État de la clé API ou d'OAuth pour chaque CLI |
| **MCP configuration** | Configuration du serveur MCP Serena pour chaque environnement CLI |
| **Skill status** | Compétences installées et état de leur actualisation |

Commandes de vérification manuelle :

```bash
# Verify .agents/ directory exists
ls -la .agents/

# Verify skills are installed
ls .agents/skills/

# Verify symlinks point to correct targets
ls -la .claude/skills/

# Verify config exists
cat .agents/oma-config.yaml

# Verify memory directory
ls .agents/state/memories/ 2>/dev/null || echo "Memory not initialized"

# Check version
cat .agents/skills/_version.json 2>/dev/null
```

---

## Structure des liens symboliques multi-IDE (concept SSOT)

oh-my-agent utilise une architecture de source unique de vérité (SSOT). Le répertoire `.agents/` est le seul emplacement où résident les compétences, workflows, configurations et définitions d'agents. Les répertoires propres aux IDE contiennent uniquement des liens symboliques vers `.agents/`.

### Organisation des répertoires

```
your-project/
  .agents/                          # SSOT — the real files live here
    agents/                         # Agent definition files
      backend-engineer.md
      frontend-engineer.md
      qa-reviewer.md
      ...
    config/                         # Shipped auxiliary config files
      ...
    oma-config.yaml                 # User-owned project configuration
    mcp.json                        # MCP server configuration
    results/plan-{sessionId}.json    # Current plan (generated by /plan)
    skills/                         # Installed skills
      _shared/                      # Shared resources across all skills
        core/                       # Core protocols and references
        runtime/                    # Runtime execution protocols
        conditional/                # Conditionally-loaded resources
      oma-frontend/                 # Frontend skill
      oma-backend/                  # Backend skill
      oma-qa/                       # QA skill
      ...
    workflows/                      # Workflow definitions
      orchestrate.md
      work.md
      ultrawork.md
      plan.md
      ...
    state/                          # Runtime coordination state
      memories/                     # Coordination artifacts (progress-*, result-*, task-board, session-cost-*)
    results/                        # Agent execution results
  .claude/                          # Claude Code — symlinks only
    skills/                         # -> .agents/skills/* and .agents/workflows/*
    agents/                         # -> .agents/agents/*
  .github/                          # GitHub Copilot — symlinks only (optional)
    skills/                         # -> .agents/skills/*
  .zcode/                           # ZCode — workflow commands only (optional)
    commands/                       # -> .agents/workflows/*
  .serena/                          # Serena MCP storage (separate from OMA state)
    memories/                       # Serena's own onboarding memories
    metrics.json                    # Productivity metrics
```

### Pourquoi des liens symboliques ?

Lorsque `oma update` actualise `.agents/`, chaque IDE qui pointe dessus récupère la modification. Les compétences ne sont stockées qu'une fois au lieu d'être copiées pour chaque IDE. Supprimer `.claude/` ne supprime pas les compétences : la SSOT dans `.agents/` reste intacte. Les liens symboliques sont également légers et produisent des diffs propres dans git.

---

## Conseils de sécurité et stratégie de retour arrière

### Avant l'installation

1. **Validez votre travail actuel.** L'installateur crée de nouveaux répertoires et fichiers. Un état git propre permet d'utiliser `git checkout .` pour tout annuler.
2. **Vérifiez l'existence de `.agents/`.** S'il provient d'un autre outil, sauvegardez-le d'abord. L'installateur l'écrasera.

### Après l'installation

1. **Examinez ce qui a été créé.** Exécutez `git status` pour voir les nouveaux fichiers. L'installateur ne crée des fichiers que dans `.agents/`, `.claude/` et, éventuellement, `.github/`.
2. **Vérifiez `.gitignore`.** Dans un dépôt git, install/update/link ajoutent automatiquement les entrées d'exécution à la racine `.gitignore` (`.antigravitycli/`, `.agents/results/`, `.agents/state/`, `.agents/backup/`, `docs/plans/`) — vérifiez qu'elles ont bien été ajoutées. La plupart des équipes versionnent `.agents/` et `.claude/` pour partager la configuration. L'entrée `.serena/` reste à votre appréciation : Serena gère son propre cache avec un `.serena/.gitignore` interne, vous pouvez donc versionner `.serena/project.yml` (configuration de projet partagée) ou ignorer entièrement le répertoire :

```gitignore
# optional — ignore Serena entirely (runtime memory)
.serena/
```

### Retour arrière

Pour supprimer complètement oh-my-agent d'un projet :

```bash
# Remove the SSOT directory
rm -rf .agents/

# Remove IDE symlinks
rm -rf .claude/skills/ .claude/agents/
rm -rf .github/skills/  # if created

# Remove runtime files
rm -rf .serena/
```

Vous pouvez aussi simplement revenir en arrière avec git :

```bash
git checkout -- .agents/ .claude/
git clean -fd .agents/ .claude/ .serena/
```

---

## Configurer le tableau de bord

Après l'installation, vous pouvez configurer une supervision en temps réel. Consultez le [guide de supervision du tableau de bord](/docs/guide/dashboard-monitoring) pour tous les détails.

Configuration rapide :

```bash
# Terminal dashboard (watches .agents/state/memories/ for changes)
oma dashboard terminal

# Web dashboard (browser-based; OMA prints a tokenized loopback URL)
oma dashboard web
```

---

## Ce que fait l'installateur en coulisses

Lorsque vous exécutez `oma` (la commande d'installation), voici précisément ce qui se passe :

### 1. Migration héritée

L'installateur recherche l'ancien répertoire `.agent/` (au singulier) et le migre vers `.agents/` (au pluriel) s'il le trouve. Cette migration unique est destinée aux utilisateurs qui mettent à niveau une version antérieure.

### 2. Détection des concurrents

L'installateur recherche les outils concurrents et propose de les supprimer pour éviter les conflits.

### 3. Téléchargement de l'archive

L'installateur télécharge la dernière archive de publication depuis les releases GitHub d'oh-my-agent. Cette archive contient le répertoire `.agents/` complet, avec toutes les compétences, ressources partagées, workflows, configurations et définitions d'agents.

### 4. Installation des ressources partagées

`installShared()` copie le répertoire `_shared/` vers `.agents/skills/_shared/`. Il contient :

- `core/` : routage des compétences, chargement du contexte, structure des prompts, principes de qualité, détection des fournisseurs et contrats d'API.
- `runtime/` : protocole mémoire et protocoles d'exécution propres à chaque fournisseur.
- `conditional/` : ressources chargées uniquement lorsque certaines conditions sont réunies (score de qualité, boucle d'exploration).

### 5. Installation des workflows

`installWorkflows()` copie tous les fichiers de workflow vers `.agents/workflows/`. Ils définissent `/orchestrate`, `/work`, `/ultrawork`, `/plan`, `/brainstorm`, `/deepinit`, `/review`, `/debug`, `/design`, `/scm`, `/tools` et `/stack-set`.

### 6. Installation de la configuration

`installConfigs()` copie les fichiers auxiliaires vers `.agents/config/`, crée `.agents/mcp.json` et initialise la configuration appartenant à l'utilisateur `.agents/oma-config.yaml` ou `.agents/oma-config.cue`. Les fichiers utilisateur existants sont conservés sauf avec `--force` ; `oma update` conserve également la configuration utilisateur et ajoute, si nécessaire, les nouvelles clés de premier niveau du modèle.

### 7. Installation des compétences

Pour chaque compétence sélectionnée, `installSkill()` copie le répertoire de la compétence vers `.agents/skills/{skill-name}/`. Si une variante est choisie (par exemple Python pour le backend), il configure aussi le répertoire `stack/` avec les ressources propres au langage.

### 8. Adaptations par fournisseur

`installVendorAdaptations()` installe les fichiers propres aux IDE pour les fournisseurs pris en charge :

- Définitions d'agents (`.claude/agents/*.md`, `.codex/agents/*.toml`, `.gemini/agents/*.md`)
- Configurations des hooks (`.claude/hooks/`, `.codex/hooks.json`)
- Fichiers de réglages et document d'intégration partagé des fournisseurs (`AGENTS.md` uniquement, Claude Code ≥ 2.1.277 compris). `CLAUDE.md` et `GEMINI.md` ne reçoivent jamais de bloc OMA ; un `CLAUDE.md` existant appartenant à l'utilisateur ne reçoit qu'une ligne d'import `@AGENTS.md`, afin que Claude Code n'ignore pas `AGENTS.md`

Codex protège ses hooks derrière une étape de confiance unique : `.codex/hooks.json` ne s'exécute pas tant que vous ne l'avez pas examiné une fois via le navigateur `/hooks` de Codex. Consultez [Confiance accordée aux hooks Codex](/docs/guide/codex-hook-trust) pour plus de détails.

### 9. Liens symboliques de la CLI

`createCliSymlinks()` crée des liens symboliques depuis les répertoires propres aux IDE vers la SSOT :

- `.claude/skills/{skill}` -> `../../.agents/skills/{skill}`
- `.claude/skills/{workflow}.md` -> `../../.agents/workflows/{workflow}.md`
- `.github/skills/{skill}` -> `../../.agents/skills/{skill}` (si Copilot est activé)

Les fichiers d'agents natifs sont générés à partir de `.agents/agents/` par `oma link`, `oma install` ou `oma update`, plutôt que d'être directement liés.

### 10. Workflows globaux

`installGlobalWorkflows()` installe les fichiers de workflow susceptibles d'être nécessaires globalement, en dehors du répertoire du projet.

### 11. Configuration git recommandée et MCP

Comme indiqué dans la voie CLI, install/update peuvent configurer les réglages **globaux** recommandés de git (`rerere.enabled`, `init.defaultBranch`) après consentement interactif, et peuvent configurer les réglages MCP lorsque cela s'applique.
