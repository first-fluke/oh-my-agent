---
title: "Guide : sémantique de oma-config.yaml"
sidebar_label: Chargement de la configuration
description: "Comment OMA sélectionne les couches de configuration CUE et YAML, applique les surcharges locales et résout les quelques replis liés au contexte d'installation. Consultez la référence de configuration pour connaître les clés et valeurs par défaut prises en charge."
---

## Vue d'ensemble

La configuration est sélectionnée dans le répertoire `.agents/` le plus proche, en remontant depuis le répertoire de travail courant :

- **Partagée** : `.agents/oma-config.cue`, ou `.agents/oma-config.yaml` lorsque CUE est absent ou ne peut pas être évalué.
- **Locale** : `.agents/oma-config.local.cue` ou `.agents/oma-config.local.yaml` (un seul fichier, superposé au fichier partagé ; gardez ce fichier privé).

Pour les lectures ordinaires du runtime, OMA ne fusionne pas un fichier de projet avec `~/.agents/oma-config.*`. Une installation globale lit le fichier du HOME, car sa racine d'installation est le HOME ; une commande de projet lit la couche de projet la plus proche. `auto_update_cli` est l'exception délibérée : son contrôle de mise à jour consulte la configuration du projet, puis celle du HOME, puis utilise la valeur par défaut activée. Consultez la [référence de configuration](/docs/guide/configuration-reference) pour le modèle complet.

## Table de précédence

| Clé | Règle effective | Notes |
|-----|:----------------:|-------|
| `OMA_MODEL_PRESET` | Priorité maximale | Une valeur d'environnement non vide remplace `model_preset` pour ce processus. |
| Fichier local | Superpose le fichier partagé | Les maps simples sont fusionnées récursivement ; les tableaux, scalaires et `null` remplacent la valeur partagée. Les deux formats de fichier local ne peuvent pas exister simultanément. |
| CUE partagé | Préféré | Si CUE est absent ou échoue, le chargeur tente le fichier YAML partagé. Une erreur de CUE local est fatale. |
| YAML partagé | Repli | Utilisé lorsqu'aucun fichier CUE partagé utilisable n'est sélectionné. |
| `auto_update_cli` | Projet, puis HOME, puis `true` | Ce repli propre à la mise à jour est implémenté dans `resolveAutoUpdateCli` ; ce n'est pas une couche globale générale. |

Pour une surcharge propre au projet, placez uniquement les feuilles modifiées dans le fichier local. Par exemple, un choix de modèle local peut rester en dehors du fichier partagé :

```yaml
# .agents/oma-config.local.yaml
model_preset: claude
agents:
  backend:
    model: anthropic/claude-sonnet-4-6
```

Exécutez la commande depuis le projet afin que le répertoire `.agents/` le plus proche soit sélectionné. Un fichier local mal formé provoque une erreur explicite ; corrigez-le ou supprimez-le avant de réessayer.

## Valeurs par défaut

| Clé | Valeur par défaut | Quand elle s'applique |
|-----|-------------------|-----------------------|
| `auto_update_cli` | `true` | Les deux fichiers sont absents ou la clé manque |
| `serena.mode` | `bridge` | Les deux fichiers sont absents ou la clé manque |
| `serena.auto_update` | `true` | Les deux fichiers sont absents ou la clé manque |
| `telemetry` | `false` | Les deux fichiers sont absents ou la clé manque |
| `language` | `en` | Les deux fichiers sont absents ou la clé manque |
| `model_preset` | Requis | Le modèle de projet fourni utilise `auto` ; le schéma exige une valeur non vide. |
| `translation_voice` | `balanced` | Les deux fichiers sont absents ou la clé manque |
| `timezone` | Fuseau système | Les deux fichiers sont absents ou la clé manque |

## Justification de l'ordre de lecture

La règle de la couche la plus proche garde la configuration d'un projet autonome. Pour définir une base à l'échelle de l'utilisateur, installez globalement puis modifiez `~/.agents/oma-config.yaml` ; les installations de projet peuvent toujours définir leur propre couche la plus proche.

## Notes

- `language` dans `oma-config.yaml` contrôle la langue des réponses des agents. Cette clé ne sert **pas** à déterminer la langue des messages d'avertissement d'installation ou de mise à jour : ceux-ci utilisent la locale système (`$LANG`), car `oma-config.yaml` n'est pas encore chargé au moment de l'installation.
- La précédence de `auto_update_cli` est implémentée explicitement dans la commande de mise à jour. Lorsqu'une installation de projet et une installation globale coexistent, la valeur du projet est consultée en premier, puis celle du HOME.
- `telemetry` (valeur par défaut `false`) correspond au mécanisme de désactivation propre à chaque fournisseur, écrit par `oma install` / `oma update` / `oma link` : Claude `DISABLE_TELEMETRY` + `CLAUDE_CODE_DISABLE_FEEDBACK_SURVEY`, Gemini/Qwen `privacy.usageStatisticsEnabled`, Codex `analytics.enabled` + `feedback.enabled`, Grok `[features] telemetry` et Antigravity (agy) `enableTelemetry` dans `~/.gemini/antigravity-cli/settings.json`. Définir `telemetry: true` réactive la télémétrie en supprimant la désactivation d'oma pour le fournisseur concerné.
- `diagram` (moteur `auto` / `archify` / `mermaid`, `explain_sidecar`, `archify.managed|channel|check_interval_min|path|quality|open`) est une section sparse de surcharge de compétence, comme `video` / `image` ; consultez [Moteur de diagrammes](/docs/guide/diagram-engine).
- `video.hyperframes.check_interval_min` limite la fréquence des contrôles de dernière version pour la toolchain HyperFrames par exécution et heygen-com/hyperframes (`oma video compose`, `oma update`).
- `market` (`managed|channel|check_interval_min|path|python|save_dir`) configure le moteur toujours à jour `last30days` utilisé par `oma market` ; consultez [Recherche de marché](/docs/guide/market-research).
- Le schéma de runtime typé couvre `providers`, `free`, `agents`, `models`, `custom_presets`, `vendors`, `session`, `docs` et les sections sparse de compétences. Les modèles fournis contiennent aussi des blocs appartenant à leurs consommateurs, comme `scm`, `memory`, `serena_reaper` et `mcp` ; leurs consommateurs sont propriétaires de leurs clés imbriquées. Ne déduisez pas une clé à partir de cette liste : utilisez la [référence de configuration](/docs/guide/configuration-reference) et le guide de la fonctionnalité pour ce bloc.
- Modifier directement `oma-config.yaml` est sûr. `oma install` et `oma update` remplacent les champs au niveau des expressions régulières et préservent les clés modifiées par l'utilisateur qu'ils ne gèrent pas (par exemple les surcharges `agents:` personnalisées et `session.quota_cap`).
- `oma update` ajoute en plus les clés de premier niveau définies par le modèle fourni mais absentes de votre fichier (avec les valeurs par défaut du modèle), sous un marqueur `# Added by oma update`. Les clés déjà présentes ne sont jamais modifiées : le contenu existant reste identique octet par octet. Les clés supprimées volontairement réapparaîtront avec la valeur par défaut du modèle ; définissez explicitement la valeur au lieu de supprimer la clé pour refuser cette réapparition.
