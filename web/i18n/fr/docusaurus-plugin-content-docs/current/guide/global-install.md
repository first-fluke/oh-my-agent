---
title: "Guide : installation globale"
sidebar_label: Installation globale
description: "Installez oh-my-agent dans votre HOME utilisateur (~/.agents/) plutôt que par projet, afin que les mêmes compétences, workflows et règles s'appliquent à tous vos projets. Couvre oma install --global, oma update --global, oma uninstall --global, la surcharge OMA_HOME, la détection des installations doubles via oma doctor et les particularités des plateformes (refus de sudo, CI, WSL, garde-fou cwd=HOME)."
---

## Qu'est-ce qu'une installation globale ?

Par défaut, `oma install` limite tout au répertoire du projet courant : la SSOT se trouve dans `<cwd>/.agents/` et les configurations des fournisseurs sont écrites dans `<cwd>/.claude/`, `<cwd>/.codex/`, etc. Une **installation globale** (`oma install --global`) installe oh-my-agent dans votre HOME utilisateur afin que les mêmes compétences, workflows et règles soient disponibles dans chaque projet ouvert, sans répéter l'installation. La SSOT se trouve dans `~/.agents/` et les configurations des fournisseurs dans `~/.claude/`, `~/.codex/`, etc.

## Comparaison projet et globale

| Aspect | Projet (`oma install`) | Globale (`oma install --global`) |
|--------|------------------------|----------------------------------|
| Emplacement de la SSOT | `<cwd>/.agents/` | `~/.agents/` |
| Configurations des fournisseurs | `<cwd>/.claude/`, `<cwd>/.codex/`, etc. | `~/.claude/`, `~/.codex/`, etc. |
| Fichier de verrouillage | `<cwd>/.agents/_install.lock` | `~/.agents/_install.lock` |
| Métadonnées | `<cwd>/.agents/_version.json (schemaVersion=2)` | `~/.agents/_version.json (schemaVersion=2)` |
| Cas d'usage | Personnalisation par projet | Valeur personnelle par défaut pour tous les projets |
| Portée de oma-config.yaml | Propre au projet | Base à l'échelle de l'utilisateur |

Les deux modes peuvent coexister. `oma doctor` signale les deux installations si elles existent et indique les écarts entre elles.

Après une installation globale réussie, vérifiez les fichiers dans le HOME utilisateur et le profil résolu :

```bash
oma doctor --json
oma doctor --profile
```

La première commande indique l'état de l'installation et des fournisseurs ; la commande de profil affiche le plan de modèles utilisé par les agents. Exécutez-les depuis n'importe quel projet lorsque vous souhaitez examiner l'installation globale.

## Configuration au premier lancement

Lors de la première exécution de `oma install --global` sur une machine, l'installation affiche une note explicative avant de continuer :

```
This is your first global install of oh-my-agent.
Scope:
  - SSOT: ~/.agents/  (all skills, workflows, rules)
  - Vendor configs: ~/.claude/, ~/.codex/, ~/.gemini/, ~/.qwen/  (symlinks + settings)
  - Lock file: ~/.agents/_install.lock
Existing per-project installs are not affected.

? Proceed with the global install? (y/N)
```

Confirmez pour continuer. L'installation suit ensuite le même parcours interactif qu'une installation de projet (langue, preset de modèle, type de projet et sélection du fournisseur).

Après une installation réussie, les étapes suivantes sont affichées :

```
1. Open your project in your IDE
2. Type /orchestrate to spawn a multi-agent workflow
3. Run `oma doctor` if anything looks off
```

## Particularités

### Refus de sudo

`oma install` (quel que soit le mode) quitte immédiatement lorsqu'il est exécuté sous `sudo` :

```
Refusing to install under sudo. Re-run as the target user (without sudo) — oma writes to your HOME and runs as your user.
```

Exécutez la commande avec votre utilisateur normal, sans `sudo`.

### Environnements CI

L'exécution de `oma install --global` dans un pipeline CI modifie le répertoire HOME du runner CI. C'est généralement indésirable. Si vous en avez besoin (par exemple pour une pipeline d'amorçage), oma affiche un avertissement :

```
Running `oma install --global` in CI. This will modify the CI user's HOME.
```

L'installation continue si `--yes` / `OMA_YES=1` est défini. Sans cette option, l'avertissement s'affiche et l'installation continue de manière interactive, ce qui bloquera la plupart des configurations CI.

### WSL : HOME Linux et USERPROFILE Windows

Lorsque oma détecte qu'il s'exécute dans le sous-système Windows pour Linux, il affiche :

```
WSL detected: your $HOME (/home/<user>) is the WSL Linux home and is distinct
from your Windows %USERPROFILE%. oma will install only to the WSL HOME.
If you want a Windows-side install, re-run this command from PowerShell.
```

Une installation WSL et une installation PowerShell sont indépendantes. Pour une couverture globale des deux environnements, exécutez `oma install --global` une fois depuis WSL et une fois depuis PowerShell.

### Garde cwd = HOME (mode projet)

`oma link` et `oma update` (sans `--global`) refusent de s'exécuter lorsque le répertoire courant est votre HOME. En mode projet, `<cwd>/.claude/settings.json` serait `~/.claude/settings.json` — vos paramètres globaux de Claude Code — et le rendu à l'échelle du projet réécrirait ses commandes `$HOME/.claude/hooks/...` en `$CLAUDE_PROJECT_DIR/...`, ce qui casserait tous les hooks et la barre d'état dans les projets dépourvus de leur propre `.claude/hooks/`. Utilisez plutôt `oma link --global` / `oma update --global` pour l'installation HOME, ou placez-vous d'abord dans un projet avec `cd`.

Si vous exécutez `oma install` (sans `--global`) alors que le répertoire courant est votre HOME, oma vous avertit :

```
You're running oma in your HOME directory without --global. This will scatter
files in ~/. Are you sure?
```

En mode non interactif ou CI, l'opération est automatiquement interrompue. Utilisez `--global` si vous voulez réellement une installation à l'échelle de l'utilisateur.

## Relier une installation globale

`oma link` régénère les fichiers natifs des fournisseurs à partir de la SSOT sans réinstaller. Comme `install` et `update`, il résout sa cible selon le contexte d'installation : passez `--global` pour remettre en cohérence `~/.agents/` ; cette commande fonctionne depuis n'importe quel répertoire, pas seulement `$HOME` :

```bash
# Regenerate every configured vendor in the global install
oma link --global

# Regenerate only opencode (e.g. after editing per-agent models in ~/.agents/oma-config.yaml)
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

La commande de désinstallation sépare les fichiers appartenant à oma de ceux appartenant à l'utilisateur. Le contenu utilisateur (oma-config.yaml, mcp.json, les compétences personnalisées sans le marqueur `<!-- oma:generated -->`) n'est jamais supprimé.

Pour désinstaller une installation de projet, omettez `--global` :

```bash
oma uninstall [--dry-run]
```

## Surcharge OMA_HOME

Pour les tests ou la préproduction, vous pouvez rediriger toutes les opérations oma vers un répertoire arbitraire :

```bash
OMA_HOME=/tmp/oma-test oma install --global
```

`OMA_HOME` a priorité sur `--global` et `process.cwd()`. Les chemins système interdits (`/etc`, `/usr`, `/bin`, `/boot`, `/sys`, `/proc`) sont rejetés, même via `OMA_HOME`. Le chemin doit être absolu et accessible en écriture.

Pour un test rapide sûr, définissez `OMA_HOME` sur un répertoire vide accessible en écriture et exécutez `oma install --global --yes` ; le récapitulatif doit nommer ce répertoire comme racine d'installation. Supprimez ensuite le répertoire, puis lancez l'installation réelle avec le HOME souhaité.
