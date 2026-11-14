---
title: Capacités et paquets des fournisseurs
description: Découverte des compétences, définitions d’agents, hooks et formats de paquets selon les fournisseurs OMA.
---

# Capacités et paquets des fournisseurs

`cli/constants/vendor-capabilities.ts` enregistre la découverte de compétences, le répertoire d’agents, le pont de hooks et le manifeste de paquet de chaque hôte pris en charge. Ses clés de fournisseur correspondent à `ALL_CLI_VENDORS` ; les chemins de projection des compétences viennent de `CLI_SKILLS_DIR`, afin que les installations de projet et globales conservent leurs destinations existantes.

| Hôte | Compétences partagées sans liens fournisseur | Répertoire d’agents | Pont de hooks | Manifeste de paquet |
| --- | --- | --- | --- | --- |
| Antigravity CLI | Non | — | Paramètres | `antigravity-plugin/plugin.json` |
| Claude Code | Non | `.claude/agents` | Paramètres | `.claude-plugin/plugin.json` |
| Codex | Non | `.codex/agents` | Paramètres | `plugin.json` |
| Command Code | Non | `.commandcode/agents` | Paramètres | `commandcode-mod/package.json` |
| Copilot CLI | Non | `.github/agents` | Paramètres | `plugin.json` (paquet Agent Plugins) |
| Cursor | Non | `.cursor/agents` | Paramètres | `.cursor-plugin/plugin.json` |
| Grok | — | `.grok/agents` | Paramètres | `.grok-plugin/plugin.json` |
| Hermes | Non | — | — | `plugin.json` (paquet Agent Plugins) |
| Kilo Code | Oui | `.kilo/agents` | Extension | `opencode-package/package.json` |
| Kimi | Non | — | Paramètres | `.kimi-plugin/plugin.json` |
| Kiro | Non | `.kiro/agents` | Paramètres | `plugin.json` (paquet Agent Plugins) |
| OpenCode | Non | `.opencode/agents` | Extension | `opencode-package/package.json` |
| Pi | Oui | — | Extension | `pi-package/package.json` |
| Qwen Code | Oui | `.qwen/agents` | Paramètres | `plugin.json` (paquet Agent Plugins) |
| ZCode | — | — | — | `.zcode-plugin/plugin.json` |

« Sans liens fournisseur » signifie qu’OMA peut utiliser la découverte partagée dans les deux modes d’installation. Le seul scan de projet de Kimi ne remplace pas sa projection globale de compétences existante. Un pont de hooks ou un répertoire d’agents n’implique pas un adaptateur de runtime en sous-processus. Gemini n’est pas un fournisseur OMA ; Antigravity CLI a sa propre intégration.

## Paquet Agent Plugins {#agent-plugins-package}

La racine du dépôt est un paquet [Agent Plugins 1.0](https://agent-plugins.org/), et `oma emit` le régénère depuis la SSOT `.agents/` :

```text
plugin.json              # $schema 1.0.0, name "oma", version, keywords, extensions
mcp.json                 # portable MCP servers (1.0.0 mcp schema)
skills/<name>/SKILL.md   # Agent Skills (+ bundled references/)
com.firstfluke.oma/      # agents, workflows, rules, oma-config.yaml (oma-aware hosts)
com.github.copilot/      # Copilot CLI components (see below)
```

Les installations Git et marketplace clonent le dépôt sans dépendances, donc la racine est le paquet. Une installation par chemin local ou `owner/repo:path` copie plutôt le répertoire que vous indiquez, et la racine du dépôt porte aussi l’arbre source, `node_modules` et le site web. Pour celles-ci, utilisez la copie propre que `oma emit --target agent-plugin` écrit dans `codex-plugin/` (dans ce dépôt : `bun cli/cli.ts emit --target agent-plugin`), ou décompressez `oma-agent-plugin.tar.gz` depuis une [release GitHub](https://github.com/first-fluke/oh-my-agent/releases). `codex-plugin/` est généré et ignoré par Git, pas versionné. Parce que chaque hôte installe cette arborescence en entier, ses compétences référencent une seule copie `skills/_shared/` des guides partagés ; seul le `skills/` racine les regroupe dans chaque compétence, puisque `bunx skills use first-fluke/oh-my-agent@<skill>` copie un seul répertoire de compétence hors de celui-ci.

Les mots-clés du manifeste (`oma`, `oh-my-agent`, `multi-agent`, `orchestrator`, `orchestrate`, `workflow`, `workflows`, `skills`, `agents`) sont aussi le vocabulaire d’activation de Kiro. Le manifeste ne déclare aucun chemin de composant, ce que la spécification interdit ; chaque hôte lit les emplacements fixes. Aucun hôte n’a besoin d’un manifeste natif à côté de `plugin.json` : Copilot lit un manifeste Agent Plugins à la racine avant `.claude-plugin/plugin.json`, et Qwen Code charge le paquet via son adaptateur Agent Plugins sans générer `qwen-extension.json`.

| Hôte | Charge | Installation |
| --- | --- | --- |
| GitHub Copilot CLI | compétences, serveurs MCP, et depuis `com.github.copilot/` : 12 agents personnalisés, 20 commandes slash de workflows, 6 règles à portée de fichiers, 4 hooks de cycle de vie | `copilot plugin install first-fluke/oh-my-agent` (clone le paquet racine), `copilot plugin install /absolute/path/to/codex-plugin` sur la copie émise, ou `copilot plugin marketplace add first-fluke/oh-my-agent` puis `copilot plugin install oma@oh-my-agent` |
| Kiro CLI (Powers) | compétences et serveurs MCP (les noms de serveurs reçoivent un espace de noms à l’installation) ; activation sur les mots-clés du manifeste | `kiro-cli powers install /absolute/path/to/codex-plugin` sur la copie émise (CLI 2.25+), ou **Add Custom Power → Import power from GitHub** avec l’URL du dépôt |
| Qwen Code | compétences et serveurs MCP en tant qu’extension `oma` | `qwen extensions install /absolute/path/to/codex-plugin --consent` ou `qwen extensions link /absolute/path/to/codex-plugin` sur la copie émise (origine Agent Plugins). L’URL nue du dépôt ouvre le sélecteur interactif de plugins de Qwen, parce que la racine porte aussi le marketplace Claude ; `qwen extensions install https://github.com/first-fluke/oh-my-agent:oma` sélectionne l’entrée `oma` de ce marketplace sans interaction (d’après la documentation Qwen, elle est alors convertie depuis le manifeste Claude). |
| Hermes Agent | compétences sous la forme `oma:<skill>` et les serveurs MCP stdio / Streamable HTTP | `hermes plugins install first-fluke/oh-my-agent --no-enable`, puis `hermes plugins enable oma` |
| Codex | compétences et serveurs MCP | `codex plugin marketplace add first-fluke/oh-my-agent` puis `codex plugin add oma@oh-my-agent` |

### Composants Copilot CLI {#copilot-cli-components}

Copilot lit les composants non portables dans l’espace de noms `com.github.copilot/` que `oma emit` remplit depuis la SSOT :

- `agents/<name>.agent.md` : les mêmes agents personnalisés Copilot qu’une installation de projet écrit dans `.github/agents/`.
- `commands/<workflow>.md` : une commande slash par workflow disponible ; chacune lit le `.agents/workflows/<workflow>.md` du projet.
- `rules/<rule>.instructions.md` : les règles qui ont un glob de fichiers (`applyTo`) ou `alwaysApply: true` ; les règles à la demande restent avec l’installation de projet.
- `hooks/hooks.json` avec `scripts/plugin-bootstrap.sh` et `scripts/plugin-hook.sh` : les mêmes scripts fail-open que l’entrée marketplace Claude Code, exécutés avec `OMA_PLUGIN_VENDOR=copilot`. SessionStart approvisionne la CLI et lance `oma install --yes` pour le projet courant ; UserPromptSubmit, PreToolUse (Bash) et Stop transmettent à `oma hook --vendor copilot` jusqu’à ce que l’enregistrement `.github/hooks/oma.json` du projet prenne le relais. Chaque commande se termine par `|| true`, de sorte qu’une CLI absente ou une racine de plugin non résolue ne bloque jamais un appel d’outil.

Les workflows, les agents et les règles référencent l’arborescence `.agents/` du projet. Sans la CLI oma, le paquet fournit encore les compétences et les serveurs MCP ; le hook d’amorçage ajoute le reste à la première session.

### Relevé de validation {#validation-record}

Vérifié le 2026-11-08 avec le répertoire home de chaque hôte pointé vers un répertoire de travail isolé ; aucun appel de modèle, hook ou serveur MCP n’a été exécuté. `<path>/codex-plugin` est l’arborescence écrite par `oma emit --target agent-plugin` :

- Copilot CLI 1.0.107 : `copilot plugin install <path>/codex-plugin` a signalé `Installed 33 skills` ; `plugin list --json` montre `oma` activé à la version du paquet ; la copie en cache sous `installed-plugins/_direct/` contient `com.github.copilot/{agents,commands,rules,hooks,scripts}`. `copilot plugin marketplace add <repo>` suivi de `copilot plugin install oma@oh-my-agent` a aussi installé l’entrée complète en direct depuis le checkout. Copilot avertit que les installations directes sont dépréciées au profit de `plugin@marketplace`.
- Kiro CLI 3.1.0 : `kiro-cli powers install <path>/codex-plugin` (avec `KIRO_HOME` et `KIRO_DATA_DIR` sur le répertoire de travail) a signalé `Installed power "oma"` et copié le paquet vers `powers/installed/oma/`. Kiro ignore `USERPROFILE` ; utilisez `KIRO_HOME` pour déplacer son répertoire home.
- Qwen Code 0.26.9 : `qwen extensions install <path>/codex-plugin --consent` a signalé `installed successfully and enabled` ; `qwen extensions list` montre `Origin: AgentPlugins`, 33 compétences et les serveurs MCP `context7`, `serena` et `aside`.
- Hermes Agent : non installé ici. Le manifeste, le frontmatter des compétences et `mcp.json` ont été contrôlés par rapport aux règles de `hermes_cli/agent_plugins.py` de Hermes (aucun champ inconnu, noms valides, commandes stdio en jetons uniques) ; Hermes n’exige pas de bloc `extensions["com.nousresearch.hermes"]`.

La CI émet le paquet depuis le checkout et l’installe dans des versions épinglées de Copilot CLI et de Qwen Code à chaque push (job `agent-plugin-hosts`, `scripts/agent-plugin-host-smoke.ts`).

## Paquets Pi {#pi-packages}

Pi découvre directement les `.agents/skills` du projet et les `~/.agents/skills` globaux. Installer OMA dans un projet n’exige donc pas de projection `.pi/skills`.

Pour une distribution hors d’une installation OMA, le pipeline de release émet le paquet de compétences Pi et le publie sur npm sous le nom `oh-my-agent-pi` ; vous pouvez aussi l’émettre vous-même :

```bash
pi install npm:oh-my-agent-pi            # the published package
oma emit --target pi-package             # or emit it locally
pi install /absolute/path/to/pi-package
```

Dans ce dépôt source, lancez la CLI locale avec `bun cli/cli.ts emit --target pi-package`. La sortie par défaut est `pi-package/` (ignoré par Git ; l’arborescence est générée, pas versionnée) ; `--output-dir <base>` l’écrit sous `<base>/pi-package/`.

Le `package.json` généré déclare `pi.skills: ["./skills"]`, inclut le mot-clé `pi-package` et utilise la version du dépôt. Les guides partagés référencés par les compétences sont émis une seule fois sous `skills/_shared/` (pi charge le paquet en entier), si bien qu’aucune compétence n’emporte sa propre copie. Le paquet n’a ni dépendances de workspace ni scripts d’installation. Il distribue les compétences ; l’installation de projet d’OMA fournit séparément son extension de hooks Pi.

Pi prend aussi en charge les sources Git et npm. Le dépôt déclare déjà ses compétences sources dans son `package.json` racine, de sorte que `pi install git:github.com/first-fluke/oh-my-agent@<tag>` peut les découvrir. Pi lance l’installation des dépendances pour les paquets Git qui contiennent un `package.json` ; le paquet émis évite l’arbre de dépendances du workspace source. `oma emit` lui-même ne publie pas ; le workflow de release publie le paquet émis sur npm.

Ce format a été contrôlé le 2026-11-05 par rapport à la documentation du paquet Pi 0.78.1 installé et à son résolveur de paquets. La résolution en lecture seule du dépôt source et du paquet émis a chargé 33 compétences avec zéro diagnostic, sans installer de paquet ni contacter un modèle.

## Paquet de plugin OpenCode et Kilo Code {#opencode-and-kilo-code-plugin-package}

`oma link` installe le pont de hooks de la famille opencode par projet : `.opencode/plugins/oma/oma.ts` (`.kilo/plugins/oma/` pour Kilo) plus les entrées de handlers qu’il lance, enregistrées sous `plugin` dans `opencode.json` / `kilo.json`. Le même pont est aussi émis comme paquet de plugin npm, afin qu’un projet (ou une configuration globale) puisse le charger sans installation par projet :

```bash
oma emit --target opencode-package
```

La sortie par défaut est `opencode-package/` (le seul paquet émis qui reste versionné, pour qu’un clone puisse le charger comme plugin de répertoire) ; `--output-dir <base>` l’écrit sous `<base>/opencode-package/`. Le paquet (`oh-my-agent-opencode`) contient le pont SSOT inchangé (`oma.ts`), une entrée de paquet (`index.ts`, les champs `main`/`exports`), une entrée de handler générée par script de hook autonome (chacune exécute `oma hook script --vendor opencode --script <name>`), `filter-test-output.sh` et un README. Il n’a pas de dépendances ; la CLI `oma` doit être sur le PATH et `bun` doit être installé, et chaque hook est fail-open lorsque l’un des deux manque.

Les deux hôtes chargent les plugins de paquet par des contrats différents, et l’entrée sert les deux depuis un seul export par défaut : OpenCode 2.x lit `{ id, setup(ctx) }` et `setup` enregistre `ctx.session.hook("prompt" | "context" | "experimental.idle")` et `ctx.tool.hook("execute.before")`, chacun adapté vers les handlers du pont `chat.message`, `experimental.chat.system.transform`, `session.idle` et `tool.execute.before` ; Kilo Code et OpenCode 1.18.29+ exigent un objet avec `server()`, qui est le pont lui-même. La logique des handlers n’est pas dupliquée.

Enregistrez-le par nom de paquet dans `.opencode/opencode.json` (projet) ou `~/.config/opencode/opencode.json` (global) ; OpenCode installe les plugins npm dans son cache au démarrage :

```json
{
  "$schema": "https://opencode.ai/config.json",
  "plugin": ["oh-my-agent-opencode"]
}
```

Kilo Code lit la même clé dans `.kilo/kilo.json` ou `~/.config/kilo/kilo.json` ; `kilo plugin oh-my-agent-opencode` ajoute l’entrée pour vous. Les deux hôtes font le dispatch avec l’identité partagée `opencode`, qui répond dans le dialecte JSON de Claude que le pont lit. Un projet où `oma link` a déjà enregistré `./plugins/oma/oma.ts` n’a pas besoin du paquet ; gardez l’un ou l’autre.

OpenCode 2.x accepte aussi un plugin de répertoire (`"plugin": ["../path/to/opencode-package"]`, relatif au fichier de configuration), qui charge le paquet émis sans npm. OpenCode 2.x exige que les chemins de plugins configurés soient des répertoires et rejette une entrée fichier unique : l’enregistrement par projet `./plugins/oma/oma.ts` écrit par `oma link` y est ignoré (« configured plugin path must be a directory »), donc sur OpenCode 2.x utilisez ce paquet à la place ; Kilo Code charge toujours le fichier par projet.

Vérifié le 2026-11-08 contre OpenCode 2.2.6 et Kilo Code CLI 7.8.27 : les deux ont résolu `plugin: ["oh-my-agent-opencode"]` depuis la configuration du projet (`opencode debug config`, `kilo debug config`), OpenCode a tenté l’installation npm (un 404 tant que le paquet n’est pas publié) et est resté fail-open, et avec le paquet placé dans le cache de plugins de chaque hôte (`<cache>/opencode/npm/<spec>/node_modules/`, `<cache>/kilo/packages/<spec>/node_modules/`) une exécution headless `run "orchestrate: say hi"` contre un endpoint local compatible OpenAI a reçu `[OMA WORKFLOW: ORCHESTRATE]` dans son prompt système sur les deux hôtes, suivi des réentrées du mode persistant jusqu’au plafond de renforcement. Le workflow de release publie le paquet émis sur npm sous le nom `oh-my-agent-opencode` à chaque release de la CLI.

## Paquet mod Command Code {#command-code-mod-package}

Les hooks du fichier de réglages de Command Code (`.commandcode/settings.json`, installés par `oma link`) ne couvrent que `SessionStart`, `PostToolUse` et `Stop`. Un [mod](https://commandcode.ai/docs/mods) voit le cycle de vie complet, donc OMA émet aussi un paquet mod :

```bash
oma emit --target commandcode-mod
```

La sortie par défaut est `commandcode-mod/` (ignoré par Git ; l’arborescence est générée, pas versionnée). Son `package.json` porte le mot-clé `cmd-mod` et un bloc `commandcode` (`mods: ["./mods/oma.ts"]`, `skills: ["./skills"]`), de sorte qu’une installation apporte le pont de hooks et toutes les compétences OMA. `mods/oma.ts` mappe les hooks ModApi vers les handlers du cœur via `oma hook script --vendor commandcode --script <name>` : `transformInput` exécute keyword-detector et skill-injector (le prompt passe inchangé), `appendSystemPrompt` injecte le contexte détecté, `onSessionStart` exécute code-intelligence-primer et state-boundary, `beforeToolCall` exécute scm-guard (un refus devient `{block: true}`) et test-filter sur `shell_command`, et `onStop` transforme un blocage du mode persistant en `{continue: true, reason}`. Le paquet n’a pas de dépendances et n’a pas besoin d’étape de build ; chaque hook est fail-open sans la CLI `oma`.

```bash
cmd mods add oh-my-agent-commandcode          # this project
cmd mods add -g oh-my-agent-commandcode       # your user
cmd mods add ./commandcode-mod                # a local checkout or `oma emit` output
cmd mods inspect ./commandcode-mod            # static report, never runs the mod
cmd --mod ./commandcode-mod/mods/oma.ts       # one session, without installing
```

Vérifié le 2026-11-08 contre Command Code 1.88.5 : `cmd mods inspect` a signalé les hooks enregistrés, `cmd mods add -g <local path>` a installé le paquet et `cmd mods list` a montré `oma · user · from local:…`, et l’exécution des hooks du mod contre la CLI a injecté `[OMA WORKFLOW: ORCHESTRATE]`, bloqué `git add .env` et renvoyé une continuation du mode persistant. Un tour `cmd -p` adossé à un modèle n’a pas été exercé (pas de compte Command Code sur la machine de test). Le workflow de release publie le paquet émis sur npm sous le nom `oh-my-agent-commandcode` à chaque release de la CLI.

## Vérification du plugin Cursor {#cursor-plugin-verification}

Cursor Agent `2026.10.22-27dcf5f` expose :

```text
agent --plugin-dir <path>
agent plugin marketplace add <gitUrl> [--git-ref <ref>]
agent plugin marketplace list
agent plugin marketplace remove <nameOrUrl>
agent plugin marketplace update <nameOrUrl>
```

Sa CLI de plugins n’a pas de commande d’installation d’un plugin individuel. L’enregistrement d’un marketplace est une opération de compte qui indexe un dépôt Git ; il ne fournit pas de contrôle d’installation locale isolée. OMA n’enregistre pas de marketplace automatiquement pendant l’émission.

Le 2026-11-05, les deux répertoires de compétences, le répertoire d’agents, le répertoire de règles, le fichier MCP et le logo du manifeste Cursor versionné se résolvaient tous dans le dépôt. L’aide de la CLI a confirmé la prise en charge du chargement d’un répertoire de plugin local. L’enregistrement du marketplace du compte et une session de modèle réelle n’ont pas été exercés.

## Hôtes de plugins compatibles Claude {#claude-compatible-plugin-hosts}

Antigravity CLI, Grok Build CLI, ZCode et Kimi Code lisent des manifestes de plugins dont la forme descend de `.claude-plugin/plugin.json` de Claude Code. `oma emit` génère un manifeste natif par hôte à partir de la source de vérité `.agents/`. Un clone git de ce dépôt est le paquet installable pour Grok, ZCode et Kimi ; l’arborescence Antigravity est générée (`oma emit --target antigravity-plugin`, ou l’archive de release `oma-antigravity-plugin.tar.gz`) parce que son validateur rejette la racine du dépôt :

| Hôte | Cible d’émission | Artefact versionné | Compétences | Agents | MCP | Hooks |
| --- | --- | --- | --- | --- | --- | --- |
| Antigravity CLI | `antigravity-plugin` | aucun ; `antigravity-plugin/` émis (autonome, archive de release) | `skills/` | `agents/` (convertis) | `mcp_config.json` | non livrés |
| Grok Build CLI | `grok-plugin` | `.grok-plugin/{plugin,marketplace}.json` | `skills/` à la racine | `.agents/agents/*.md` | `mcpServers` inline | non déclarés |
| ZCode | `zcode-plugin` | `.zcode-plugin/{plugin,marketplace}.json` | `skills/` à la racine | `.agents/agents/*.md` | `mcpServers` inline | non déclarés |
| Kimi Code | `kimi-plugin` | `.kimi-plugin/plugin.json` | `skills/` à la racine | `.agents/agents/*.md` | `mcpServers` inline | non déclarés |

Aucun de ces paquets ne livre de hooks. Les hooks du plugin Claude résolvent le projet depuis `CLAUDE_PROJECT_DIR` et `${CLAUDE_PLUGIN_ROOT}`, que ces hôtes ne définissent pas, et Antigravity et Kimi exécutent les hooks de plugin avec le répertoire du plugin comme répertoire de travail. Les workflows et les hooks de projet viennent donc de la CLI `oma` (`bun install -g oh-my-agent`, puis `oma install`), qui approvisionne le pont de hooks natif de chaque hôte. Les compétences, les agents, les règles et les serveurs MCP fonctionnent sans elle.

Dans ce dépôt source, lancez la CLI locale avec `bun cli/cli.ts emit --target <target>` ; `--output-dir <base>` écrit chaque artefact sous `<base>` au même chemin relatif. Le contrôle de dérive de la CI (`bun run --cwd cli check:emit-drift`) échoue lorsqu’un manifeste versionné diffère d’une émission fraîche, et Release Please incrémente la version de chaque manifeste versionné avec la release de la CLI ; les arborescences de chemin local générées prennent leur version du tag de release auquel elles sont émises.

### Antigravity CLI (`agy`) {#antigravity-cli-agy}

Le paquet suit [antigravity.google/docs/build-plugins](https://antigravity.google/docs/build-plugins) : `plugin.json` validé contre `https://antigravity.google/schemas/v1/plugin.json`, `skills/<name>/SKILL.md`, `agents/<name>.md`, `rules/AGENTS.md` plus un `rules/<rule>.md` par règle OMA (`trigger: always_on | glob | model_decision`, `globs` séparés par des virgules), `mcp_config.json`, `assets/logo.png` et un README. Une arborescence autonome est émise parce que `agy plugin validate --strict` rejette la racine du dépôt (le `AGENTS.md` racine et le `hooks/hooks.json` de Claude sont signalés comme jamais chargés). Installez le répertoire `antigravity-plugin/`, pas l’URL ni la racine du dépôt : pointé vers la racine, agy charge le `plugin.json` Agent Plugins qui s’y trouve, soit 33 compétences, aucun agent ni règle, et `mcp.json` seulement tant que son flag `enable-agent-plugins-spec` est activé (`agy plugin validate --json .`, agy 1.5.3).

```bash
# From a release asset:
tar -xzf oma-antigravity-plugin.tar.gz        # unpacks antigravity-plugin/
# Or from a clone (the tree is generated, not committed):
git clone https://github.com/first-fluke/oh-my-agent
cd oh-my-agent && bun install && bun cli/cli.ts emit --target antigravity-plugin
agy plugin validate --strict ./antigravity-plugin
agy plugin install ./antigravity-plugin
agy plugin list
agy --agent pm-planner
```

Les compétences se chargent comme `/<skill-name>` ; les serveurs MCP reçoivent l’espace de noms `oma_<server>`. `agy plugin import claude` importe aussi une installation Claude Code existante. Le 2026-11-08, l’arborescence émise a passé `agy plugin validate --strict` (agy 1.5.3) avec 0 erreur et 0 avertissement : 33 compétences, 12 agents, 14 règles, 3 serveurs MCP.

### Grok Build CLI {#grok-build-cli}

Grok lit les plugins et marketplaces Claude Code sans configuration, donc `.claude-plugin/` fonctionne déjà. Le `.grok-plugin/plugin.json` natif ajoute des déclarations explicites de compétences, d’agents et de MCP, et `.grok-plugin/marketplace.json` liste la même entrée `oma` et les racines de domaine `oma-frontend`, `oma-security`, `oma-research` que le marketplace Claude, avec des sources locales (`{"type": "local", "path": ...}`), la forme que le validateur de catalogue de Grok accepte sans sha de commit épinglé.

```bash
grok plugin marketplace add first-fluke/oh-my-agent
grok plugin install oma            # or oma-frontend, oma-security, oma-research
# Local clone instead of GitHub:
grok plugin validate ./oh-my-agent
grok --plugin-dir ./oh-my-agent
```

Grok n’était pas installé sur l’hôte d’émission ; le manifeste et le catalogue sont contrôlés structurellement par les tests de la CLI par rapport au jeu de champs documenté et aux règles de catalogue `xai-org/plugin-marketplace`.

### ZCode {#zcode}

ZCode résout d’abord `.zcode-plugin/plugin.json` et se rabat sur `.claude-plugin/plugin.json`, de sorte que la racine du dépôt se résout nativement et que chaque racine de domaine se résout via son manifeste Claude. L’installation est uniquement graphique :

1. Ouvrez **Settings → Plugins**.
2. Cliquez sur **Create → Add marketplace** (en haut à droite) et saisissez `first-fluke/oh-my-agent`, l’URL Git ou le chemin d’un clone local. ZCode valide le marketplace avant de l’ajouter.
3. Sous le segment **Personal**, cliquez sur **Install** pour `oma` (ou une entrée de domaine) et attendez que le statut passe à **Installed**. Les plugins sont activés par défaut.
4. Plus tard, utilisez **Manage installed → Check for updates** ; ZCode compare la version de l’entrée de catalogue dans `.zcode-plugin/marketplace.json` avec le `plugin.json` installé, de sorte que les deux suivent la release de la CLI.

ZCode n’était pas installé sur l’hôte d’émission ; le motif de nom du manifeste (`^[a-z0-9][a-z0-9._-]{0,127}$`), le jeu de champs et la forme du marketplace sont affirmés par les tests de la CLI.

### Kimi Code CLI {#kimi-code-cli}

`.kimi-plugin/plugin.json` pointe `skills` vers le répertoire de scan `skills/` à la racine, liste chaque fichier `.agents/agents/*.md` (déjà au format d’agent de Kimi : frontmatter `name` et `description`, corps Markdown comme prompt système), place `mcpServers` inline et porte le bloc `interface` affiché par `/plugins`.

```text
/plugins install /absolute/path/to/oh-my-agent
/plugins install https://github.com/first-fluke/oh-my-agent
/reload
```

Kimi copie le plugin vers `$KIMI_CODE_HOME/plugins/managed/oma/` et l’applique à chaque projet ; les compétences sont invoquées comme `/skill:oma:<skill-name>`. Kimi n’était pas installé sur l’hôte d’émission ; la surface du manifeste (champs autorisés, règle de chemin `./`, jeu de champs de hooks) est affirmée par les tests de la CLI.

## Qwen Agent Board {#qwen-agent-board}

La [documentation expérimentale de Qwen Agent Board](https://qwenlm.github.io/qwen-code-docs/en/users/features/agent-board/) décrit `qwen board task`, `claim`, `done`, `ask` et `answer`. Le tableau coordonne des fichiers locaux ; il ne démarre pas, ne rejoint pas et ne surveille pas les processus d’agents.

OMA peut transmettre des opérations explicites du tableau lorsque la CLI Qwen installée annonce la commande `board` :

```bash
oma agent board show --board orders --json
oma agent board task "Check API" --board orders --actor api --owner web
oma agent board done TASK_ID --board orders --actor web --note "Checked"
```

L’adaptateur prend aussi en charge `claim`, `ask`, `answer` et `decline`. Il contrôle l’aide racine avant de transmettre une opération. Il complète l’état d’exécution et les reçus d’OMA ; il ne marque jamais automatiquement le travail OMA comme terminé.

Le Qwen Code 0.20.1 installé n’exposait ni la commande CLI `board` ni `agents` le 2026-11-05. `qwen board --help` a renvoyé l’aide racine, donc cette installation échoue au contrôle de capacité. Une opération réelle de tableau natif reste non vérifiée ; il n’y a pas d’intégration `agents join`.
