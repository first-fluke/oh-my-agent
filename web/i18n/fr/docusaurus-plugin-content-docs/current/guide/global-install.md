---
title: "Guide : installation globale"
sidebar_label: Installation globale
description: "Installez oh-my-agent dans le répertoire global d'OMA (~/.oma/) plutôt que par projet, afin que les mêmes compétences, workflows et règles s'appliquent à tous vos projets. Couvre oma install --global, oma update --global, oma uninstall --global, la surcharge OMA_HOME, la détection des installations doubles via oma doctor et les particularités des plateformes (refus de sudo, CI, WSL, garde-fou cwd=HOME)."
---

## Qu'est-ce qu'une installation globale ?

Par défaut, `oma install` limite tout au répertoire du projet courant : la SSOT se trouve dans `<cwd>/.agents/` et les configurations des fournisseurs sont écrites dans `<cwd>/.claude/`, `<cwd>/.codex/`, etc. Une **installation globale** (`oma install --global`) installe oh-my-agent dans le répertoire global d'OMA, afin que les mêmes compétences, workflows et règles soient disponibles dans chaque projet ouvert, sans répéter l'installation. La SSOT se trouve dans `~/.oma/.agents/` ; les configurations des fournisseurs restent dans `~/.claude/`, `~/.codex/`, etc.

## Comparaison projet et globale

| Aspect | Projet (`oma install`) | Globale (`oma install --global`, répertoire OMA par défaut) |
|--------|------------------------|--------------------------------|
| Emplacement de la SSOT | `<cwd>/.agents/` | `~/.oma/.agents/` |
| Configurations des fournisseurs | `<cwd>/.claude/`, `<cwd>/.codex/`, etc. | `~/.claude/`, `~/.codex/`, etc. |
| Fichier de verrouillage | `<cwd>/.agents/_install.lock` | `~/.oma/.agents/_install.lock` |
| Métadonnées | `<cwd>/.agents/skills/_version.json` (schemaVersion 2) | `~/.oma/.agents/skills/_version.json` (schemaVersion 2) |
| Cas d'usage | Personnalisation par projet | Valeur personnelle par défaut pour tous les projets |
| Portée de oma-config.yaml | Propre au projet | Base à l'échelle de l'utilisateur |

Les deux modes peuvent coexister. `oma doctor` signale les deux installations si elles existent et indique les écarts entre elles.

Après une installation globale réussie, vérifiez les fichiers dans le HOME utilisateur et le profil résolu :

```bash
oma doctor --global --json
oma doctor --global --profile
```

La première commande indique l'état de l'installation et des fournisseurs ; la commande de profil affiche le plan de modèles utilisé par les agents. Conservez `--global` (ou `-g`) : sans cette option, les deux commandes examinent le projet du répertoire courant, dont la configuration est superposée aux valeurs globales par défaut.

## Configuration au premier lancement

Lors de la première exécution de `oma install --global` sur une machine, l'installation affiche une note explicative avant de continuer :

```text
This is your first global install of oh-my-agent.
Scope:
  - SSOT: ~/.oma/.agents/  (all skills, workflows, rules)
  - Vendor configs: ~/.claude/, ~/.codex/, ~/.gemini/, ~/.qwen/  (symlinks + settings)
  - Lock file: ~/.oma/.agents/_install.lock
Existing per-project installs are not affected.

? Proceed with the global install? (y/N)
```

Confirmez pour continuer. L'installation suit ensuite le même parcours interactif qu'une installation de projet (langue, preset de modèle, type de projet et sélection du fournisseur).

Après une installation réussie, les étapes suivantes sont affichées :

```text
1. Open your project in your IDE
2. Type /orchestrate to spawn a multi-agent workflow
3. Run `oma doctor` if anything looks off
```

## Particularités

### Refus de sudo

`oma install` (quel que soit le mode) quitte immédiatement lorsqu'il est exécuté sous `sudo` :

```text
Refusing to install under sudo. Re-run as the target user (without sudo) — oma writes to your HOME and runs as your user.
```

Exécutez la commande avec votre utilisateur normal, sans `sudo`.

### Environnements CI

L'exécution de `oma install --global` dans un pipeline CI modifie le répertoire HOME du runner CI. C'est généralement indésirable. Si vous en avez besoin (par exemple pour une pipeline d'amorçage), oma affiche un avertissement :

```text
Running `oma install --global` in CI. This will modify the CI user's HOME. Proceeding because --yes / non-interactive mode is set.
```

L'avertissement apparaît lorsque `CI` vaut `true` ou `1`. Ces valeurs rendent déjà l'installation non interactive : elle se poursuit avec les valeurs par défaut sans attendre de saisie. Hors CI, `--yes` ou `OMA_YES=1` produit le même comportement non interactif.

### WSL : HOME Linux et USERPROFILE Windows

Lorsque oma détecte qu'il s'exécute dans le sous-système Windows pour Linux, il affiche :

```text
WSL detected: your $HOME (/home/<user>) is the WSL Linux home and is distinct
from your Windows %USERPROFILE%. oma will install only to the WSL HOME.
If you want a Windows-side install, re-run this command from PowerShell.
```

Une installation WSL et une installation PowerShell sont indépendantes. Pour une couverture globale des deux environnements, exécutez `oma install --global` une fois depuis WSL et une fois depuis PowerShell.

### Garde cwd = HOME (mode projet)

`oma link` et `oma update` (sans `--global`) refusent de s'exécuter lorsque le répertoire courant est votre HOME. En mode projet, `<cwd>/.claude/settings.json` serait `~/.claude/settings.json` — vos paramètres globaux de Claude Code — et le rendu à l'échelle du projet réécrirait ses commandes `$HOME/.claude/hooks/...` en `$CLAUDE_PROJECT_DIR/...`, ce qui casserait tous les hooks et la barre d'état dans les projets dépourvus de leur propre `.claude/hooks/`. Utilisez plutôt `oma link --global` / `oma update --global` pour l'installation globale, ou placez-vous d'abord dans un projet avec `cd`.

Si vous exécutez `oma install` (sans `--global`) alors que le répertoire courant est votre HOME, oma vous avertit :

```text
You're running oma in your HOME directory without --global. This will scatter
files in ~/. Are you sure?
```

En mode non interactif ou CI, l'opération est automatiquement interrompue. Utilisez `--global` si vous voulez réellement une installation à l'échelle de l'utilisateur.

## Relier une installation globale

`oma link` régénère les fichiers natifs des fournisseurs à partir de la SSOT sans réinstaller. Comme `install` et `update`, il résout sa cible selon le contexte d'installation : passez `--global` pour remettre en cohérence `~/.oma/.agents/` ; cette commande fonctionne depuis n'importe quel répertoire, pas seulement `$HOME` :

```bash
# Regenerate every configured vendor in the global install
oma link --global

# Regenerate only opencode (e.g. after editing per-agent models in ~/.oma/.agents/oma-config.yaml)
oma link opencode --global
```

Sans `--global`, `oma link` cible `<cwd>/.agents/`. Ainsi, si votre installation est globale et que vous l'exécutez dans un projet, il indique qu'aucun répertoire `.agents/` n'y a été trouvé.

## Désinstallation

```bash
# Preview what would be removed (never deletes anything)
oma uninstall --global --dry-run

# Remove the global install
oma uninstall --global
```

La commande de désinstallation sépare les fichiers appartenant à oma de ceux appartenant à l'utilisateur. Elle supprime uniquement les compétences enregistrées comme gérées par OMA dans `managed-skills.json` sous `.agents/state/` ; le marqueur `<!-- oma:generated -->` identifie les fichiers de prompt Copilot générés. Le contenu utilisateur (`oma-config.yaml`, `mcp.json` et les compétences non enregistrées comme gérées) n'est jamais supprimé. Lancez d'abord `--dry-run` pour voir la liste exacte.

Pour désinstaller une installation de projet, omettez `--global` :

```bash
oma uninstall [--dry-run]
```

## Surcharge OMA_HOME

Définissez `OMA_HOME` sur un chemin absolu pour déplacer les données globales appartenant à OMA :

```bash
OMA_HOME=/tmp/oma-test oma install --global
```

`OMA_HOME` est la racine du stockage global, pas une cible d'installation de projet. Avec la valeur ci-dessus, les définitions globales se trouvent dans `/tmp/oma-test/.agents/` ; l'installation et la liaison de projet utilisent toujours `<cwd>/.agents/`. Les paramètres natifs des fournisseurs et l'authentification restent en dehors de `OMA_HOME`. Les fichiers d'intégration OpenCode globaux sont écrits dans `~/.config/opencode/` sous le répertoire HOME réel.

`OMA_STATE_HOME` est une exception explicite pour le stockage des profils, de L1 et de l'exécution des projets : il doit être absolu et contient `u/`. S'il n'est pas défini, les profils suivent `OMA_HOME`. `XDG_CONFIG_HOME` ne déplace plus l'état d'OMA et ne modifie pas le chemin de sortie OpenCode d'OMA. Les secrets du trousseau du système, les données AgentMemory/Honcho et les caches de chaînes d'outils gérés restent chez leurs propriétaires actuels.

## Organisation du stockage global

Les données globales se trouvent par défaut sous `~/.oma`. Lorsque `OMA_HOME` est défini, remplacez `~/.oma` par sa valeur :

| Données | Emplacement |
|---|---|
| Définitions globales, configuration, métadonnées d'installation | `~/.oma/.agents/` |
| Manifeste des plannings, environnement capturé, journaux d'exécution | `~/.oma/schedule/` |
| Sauvegardes globales | `~/.oma/backup/` |
| Registre, verrous et journaux Serena | `~/.oma/state/serena/` |
| Index des noms de clés du coffre | `~/.oma/state/vault-index.json` |
| Profils, sessions L1, exécution des projets | `~/.oma/u/<profile>/` (`<OMA_STATE_HOME>/u/<profile>/` lorsque `OMA_STATE_HOME` est défini) |

La configuration globale fournit les valeurs par défaut. Le `.agents/oma-config.*` du projet le plus proche et
sa surcouche locale les remplacent ; les racines de projets ancêtres différentes ne sont pas fusionnées.
Consultez [Chargement de la configuration](./oma-config-semantics.md#precedence-table) pour l'ordre complet.
Un projet qui sélectionne `semantic_memory: none` garde la mémoire désactivée même lorsque la
configuration globale sélectionne AgentMemory.

## Installations existantes

La migration du répertoire personnel copie les données appartenant à OMA depuis `~/.agents/` et `~/.config/oma/`
vers la nouvelle organisation. Les originaux sont conservés, sauf les répertoires de compétences vérifiés comme appartenant à OMA
et convertis en liens de découverte : leur contenu d'origine est archivé sous
`~/.oma/backup/legacy-global-skills/` avant que l'ancien chemin ne devienne un lien vers la compétence
migrée. Les fichiers de destination existants ne sont pas écrasés ; les conflits et les données en cours d'utilisation
sont signalés pour une nouvelle tentative. Les index du coffre
fusionnent les noms de clés sans sortir les valeurs secrètes du trousseau du système. Les compétences
utilisateur et les liens étrangers restent en place ; les fichiers d'authentification des fournisseurs ne sont pas
déplacés. Les lecteurs à l'exécution n'utilisent que
les nouveaux chemins.

```bash
oma home migrate --dry-run --json
oma home migrate --json
oma schedule sync
```

L'installation et la mise à jour globales exécutent la migration avant d'écrire leurs fichiers globaux.
L'installation et la mise à jour de projet utilisent les racines unifiées sans migrer les données globales
sans rapport. La migration ne modifie pas les enregistrements de tâches du système ; exécutez `oma schedule sync`
après la migration si des plannings existent. Des services ou runners actifs peuvent différer certaines données ;
terminez ces processus et relancez la migration.

## Voir aussi

- [Chargement de la configuration](./oma-config-semantics.md) : comment les fichiers de configuration globaux, de projet et locaux sont fusionnés
- [Intégration à un projet existant](./integration.md) : installation en mode projet, vérification et rollback
- [Mises à jour automatisées](./automated-updates.md) : exécuter `oma update` depuis la CI
