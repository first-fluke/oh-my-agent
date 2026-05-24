---
title: "Guide : Sémantique de oma-config.yaml"
description: Règles de précédence clé par clé pour oma-config.yaml lorsque les installations projet et globale coexistent. Couvre auto_update_cli (projet l'emporte sur global), serena.mode, telemetry, language, model_preset, translation_voice, timezone, et quels fichiers de configuration agy / claude / codex / gemini / qwen prennent en compte.
---

## Vue d'ensemble

`oma-config.yaml` peut résider à deux emplacements :

- **Projet** : `<cwd>/.agents/oma-config.yaml`
- **Global** : `~/.agents/oma-config.yaml`

Lorsque les deux fichiers existent, celui du projet l'emporte pour chaque clé. Ce choix est volontaire : la personnalisation par projet est le signal le plus spécifique et ne doit pas être écrasée par une valeur par défaut à l'échelle de l'utilisateur.

## Table de précédence

| Clé | Projet l'emporte ? | Notes |
|-----|:---:|-------|
| `auto_update_cli` | Oui | La valeur du projet écrase celle du global. Implémenté dans `resolveAutoUpdateCli` (`cli/commands/update/update.ts`). |
| `serena.mode` | Oui | Contrôle le mode de transport MCP Serena (par exemple, `stdio`, `sse`). |
| `telemetry` | Oui | Opt-in à la télémétrie du fournisseur (`true` / `false`). |
| `language` | Oui | Langue de réponse pour les sorties des agents (par exemple, `en`, `ko`, `ja`). |
| `model_preset` | Oui | Preset de sélection de modèle (par exemple, `claude`, `mixed`, `codex`). |
| `translation_voice` | Oui | Ton du traducteur : `formal`, `balanced`, `interpreter`. |
| `timezone` | Oui | Identifiant de fuseau horaire (par exemple, `Asia/Seoul`, `America/New_York`). |

« Projet l'emporte » signifie : si la clé est présente dans le fichier du projet, c'est cette valeur qui est utilisée, indépendamment de ce que dit le fichier global. Si la clé est absente du fichier du projet, la valeur du fichier global est utilisée. Si elle est absente des deux, la valeur par défaut s'applique.

## Valeurs par défaut

| Clé | Valeur par défaut | Cas d'application |
|-----|---------|--------------|
| `auto_update_cli` | `true` | Les deux fichiers sont absents ou la clé est manquante |
| `serena.mode` | `stdio` | Les deux fichiers sont absents ou la clé est manquante |
| `telemetry` | `false` | Les deux fichiers sont absents ou la clé est manquante |
| `language` | `en` | Les deux fichiers sont absents ou la clé est manquante |
| `model_preset` | `claude` | Les deux fichiers sont absents ou la clé est manquante |
| `translation_voice` | `balanced` | Les deux fichiers sont absents ou la clé est manquante |
| `timezone` | Fuseau horaire système | Les deux fichiers sont absents ou la clé est manquante |

## Justification de l'ordre de lecture

La configuration projet est lue en premier parce qu'elle représente le contexte le plus spécifique — le dépôt sur lequel la développeuse ou le développeur travaille activement. Une équipe peut imposer `language: ko` ou `model_preset: mixed` pour son projet, et ces choix ne doivent pas être silencieusement écrasés par le `oma-config.yaml` global d'un individu.

Le fichier global fournit une référence à l'échelle de l'utilisateur. Les clés que le projet ne définit pas se rabattent sur la valeur du global, qui à son tour se rabat sur la valeur par défaut codée en dur.

## Notes

- `language` dans `oma-config.yaml` contrôle la langue de réponse des agents. Il n'est **pas** utilisé pour déterminer les messages d'avertissement d'installation/mise à jour — ceux-ci s'appuient sur la locale système (`$LANG`), car `oma-config.yaml` n'est pas encore chargé au moment de l'installation.
- La précédence de `auto_update_cli` est explicitement implémentée dans la commande update. Lorsqu'une installation projet et une installation globale coexistent, le `oma-config.yaml` du projet est consulté en premier.
- Modifier directement `oma-config.yaml` est sans danger. `oma install` et `oma update` utilisent un remplacement de champ au niveau regex et préservent les clés éditées par l'utilisateur qu'ils ne gèrent pas (par exemple, les surcharges `agents:` personnalisées, `session.quota_cap`).
