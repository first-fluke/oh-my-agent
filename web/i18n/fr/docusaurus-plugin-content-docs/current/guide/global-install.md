---
title: "Guide : Installation globale"
description: Installez oh-my-agent dans votre HOME utilisateur (~/.agents/) plutôt que par projet, afin que les mêmes skills, workflows et règles s'appliquent à tous vos projets. Couvre oma install --global, oma update --global, oma uninstall --global, la surcharge OMA_HOME, la détection d'installation double via oma doctor et les particularités des plateformes (refus de sudo, CI, WSL, garde-fou cwd=HOME).
---

## Qu'est-ce qu'une installation globale ?

Par défaut, `oma install` limite toute l'installation au répertoire de projet courant : le SSOT vit dans `<cwd>/.agents/` et les configurations des fournisseurs sont écrites dans `<cwd>/.claude/`, `<cwd>/.codex/`, etc. Une **installation globale** (`oma install --global`) installe oh-my-agent dans votre HOME utilisateur, de sorte que les mêmes skills, workflows et règles soient disponibles dans chaque projet que vous ouvrez, sans avoir à répéter l'étape d'installation. Le SSOT vit dans `~/.agents/` et les configurations des fournisseurs dans `~/.claude/`, `~/.codex/`, etc.

## Comparaison Projet vs Global

| Aspect | Projet (`oma install`) | Global (`oma install --global`) |
|--------|------------------------|--------------------------------|
| Emplacement du SSOT | `<cwd>/.agents/` | `~/.agents/` |
| Configurations fournisseurs | `<cwd>/.claude/`, `<cwd>/.codex/`, etc. | `~/.claude/`, `~/.codex/`, etc. |
| Fichier de verrouillage | `<cwd>/.agents/_install.lock` | `~/.agents/_install.lock` |
| Métadonnées | `<cwd>/.agents/_version.json (schemaVersion=2)` | `~/.agents/_version.json (schemaVersion=2)` |
| Cas d'usage | Personnalisation par projet | Valeur par défaut personnelle pour tous les projets |
| Portée de oma-config.yaml | Spécifique au projet | Référence pour tout l'utilisateur |

Les deux modes peuvent coexister. `oma doctor` signale les deux installations lorsqu'elles sont présentes et alerte sur tout écart entre elles.

## Configuration au premier lancement

La première fois que vous exécutez `oma install --global` sur une machine, l'installation affiche une note explicative avant de poursuivre :

```
This is your first global install of oh-my-agent.
Scope:
  - SSOT: ~/.agents/  (all skills, workflows, rules)
  - Vendor configs: ~/.claude/, ~/.codex/, ~/.gemini/, ~/.qwen/  (symlinks + settings)
  - Lock file: ~/.agents/_install.lock
Existing per-project installs are not affected.

? Proceed with the global install? (y/N)
```

Confirmez pour continuer. L'installation suit ensuite le même flux interactif qu'une installation projet (langue, preset de modèle, type de projet, sélection du fournisseur).

Après une installation réussie, les étapes suivantes sont affichées :

```
1. Open your project in your IDE
2. Type /orchestrate to spawn a multi-agent workflow
3. Run `oma doctor` if anything looks off
```

## Particularités

### Refus de sudo

`oma install` (quel que soit le mode) se termine immédiatement lorsqu'il est lancé sous `sudo` :

```
Refusing to install under sudo. Re-run as the target user (without sudo) — oma writes to your HOME and runs as your user.
```

Relancez la commande avec votre utilisateur normal, sans `sudo`.

### Environnements CI

Lancer `oma install --global` dans un pipeline CI modifie le HOME du runner CI. Ce n'est généralement pas souhaitable. Si vous en avez tout de même besoin (par exemple, un pipeline de bootstrap), oma émet un avertissement :

```
Running `oma install --global` in CI. This will modify the CI user's HOME.
```

L'installation se poursuit si `--yes` / `OMA_YES=1` est défini. Sans cela, l'avertissement s'affiche et l'installation continue en mode interactif (ce qui bloquera la plupart des configurations CI).

### WSL : HOME Linux vs USERPROFILE Windows

Lorsqu'oma détecte qu'il s'exécute dans le sous-système Windows pour Linux, il affiche :

```
WSL detected: your $HOME (/home/<user>) is the WSL Linux home and is distinct
from your Windows %USERPROFILE%. oma will install only to the WSL HOME.
If you want a Windows-side install, re-run this command from PowerShell.
```

Une installation WSL et une installation PowerShell sont indépendantes. Si vous souhaitez une couverture globale des deux côtés, exécutez `oma install --global` une fois depuis WSL et une fois depuis PowerShell.

### Avertissement cwd = HOME (mode projet)

Si vous lancez `oma install` (sans `--global`) alors que votre répertoire courant est votre HOME, oma vous avertit :

```
You're running oma in your HOME directory without --global. This will scatter
files in ~/. Are you sure?
```

En mode non interactif / CI, l'opération est interrompue automatiquement. Utilisez `--global` si vous visez une installation à l'échelle de l'utilisateur.

## Désinstallation

```bash
# Preview what would be removed (never deletes anything)
oma uninstall --global --dry-run

# Remove the global install
oma uninstall --global
```

La commande de désinstallation distingue les fichiers détenus par oma de ceux détenus par l'utilisateur. Le contenu détenu par l'utilisateur (oma-config.yaml, mcp.json, skills personnalisés sans le marqueur `<!-- oma:generated -->`) n'est jamais supprimé.

Pour désinstaller une installation projet, omettez `--global` :

```bash
oma uninstall [--dry-run]
```

## Surcharge OMA_HOME

À des fins de test ou de staging, vous pouvez rediriger toutes les opérations oma vers un répertoire arbitraire :

```bash
OMA_HOME=/tmp/oma-test oma install --global
```

`OMA_HOME` prend le pas sur `--global` et sur `process.cwd()`. Les chemins système interdits (`/etc`, `/usr`, `/bin`, `/boot`, `/sys`, `/proc`) sont rejetés même via `OMA_HOME`. Le chemin doit être absolu et accessible en écriture.
