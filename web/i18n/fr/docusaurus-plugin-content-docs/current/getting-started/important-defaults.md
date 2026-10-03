---
title: Valeurs par défaut importantes
description: Les valeurs par défaut d’oh-my-agent qui influencent le routage, la sélection des modèles, les fournisseurs, les mises à jour, la télémétrie, le MCP du navigateur, le transport Serena et la récupération des workflows.
---

# Valeurs par défaut importantes

Les valeurs par défaut sont choisies pour rendre un premier projet utilisable tout en stabilisant la configuration appartenant à l’utilisateur. Elles sont résolues à l’exécution : une clé omise peut donc se comporter différemment d’une valeur vide explicitement définie. Commencez ici lorsque le harnais fonctionne mais se comporte autrement que prévu.

## Valeurs par défaut qui influencent le premier lancement

| Domaine | Valeur par défaut | Conséquence | Remplacement |
|---|---|---|---|
| Langue des réponses | `en` | Les réponses des agents et des workflows utilisent l’anglais, sauf si la configuration du projet sélectionne une autre langue prise en charge. Une instruction explicite de l’utilisateur ou de la session peut encore remplacer la langue du projet lorsque l’hôte ou le workflow le permet. | `language` dans `.agents/oma-config.yaml` ou `.cue` |
| Routage des modèles | `auto` | La configuration native des agents de l’environnement d’exécution courant est utilisée. Les environnements inconnus reviennent à `default_cli` lorsqu’il est défini. | `model_preset`, `default_cli` ou `agents.<id>` |
| Intelligence du code | `serena` | Une nouvelle installation tente d’installer Serena et relie sa configuration MCP. | `providers.code_intelligence: gortex` ou `serena` |
| Garde de recherche de code | `block` | Tant qu’un fournisseur d’intelligence du code est configuré, un hook PreToolUse refuse les outils natifs `Grep`/`Glob` ainsi que la recherche récursive dans le shell (`rg`, `grep -r`, `find -name`), et oriente l’agent vers les outils du fournisseur. Les recherches limitées à des exclusions confirmées ou à des chemins situés hors du projet sont autorisées. Le hook ne mentionne aucun contournement pour le code source du projet. | `providers.code_intelligence_guard: off` |
| Mémoire sémantique | `agentmemory` | Agent Memory est sélectionné pour la mémoire sémantique lorsqu’il est disponible. | `providers.semantic_memory: honcho` ou `none` |
| Recherche web | `native` | La recherche utilise le canal web natif de l’environnement, sauf si un fournisseur est sélectionné. | `providers.web` |
| Fournisseur de documentation | `context7` | La recherche documentaire utilise le fournisseur Context7 lorsqu’une compétence le demande. | `providers.docs` |
| Télémétrie | désactivée | OMA écrit des réglages de désinscription des fournisseurs lors de la liaison. | `telemetry: true` |
| Mise à jour automatique du CLI | activée | Le CLI recherche les mises à jour, sauf désactivation. | `auto_update_cli: false` |
| Format de date | `ISO` | Les dates utilisent un format de style ISO lorsqu’aucun format n’est défini par le projet. | `date_format: US` ou `EU` |
| Fuseau horaire | fuseau horaire du système | Les heures planifiées et rapportées suivent l’hôte lorsque `timezone` est omis. | `timezone: Australia/Sydney` (ou un autre nom IANA) |
| Transport Serena | `bridge` | Les sessions partagent un serveur Serena par projet ; un bridge indisponible revient au stdio local à la session. | `serena.mode: stdio` |
| Mise à jour automatique de Serena | activée | `oma update` met à niveau l’outil Serena local lorsque c’est possible. | `serena.auto_update: false` |
| MCP DevTools du navigateur | non défini | Les entrées de navigateur existantes sont conservées ; une nouvelle installation interactive propose `aside`. | `mcp.devtools_browsers: [aside]`, `[chrome]`, `[firefox]` ou `[]` |
| Reaper Serena | chemin planifié désactivé | `serena_reaper.enabled: false` laisse le nettoyage périodique inactif. `oma serena reap` interactif s’exécute toujours. | `serena_reaper.enabled: true` et `oma serena reaper enable` |

Les noms et valeurs par défaut des fournisseurs proviennent des chargeurs d’exécution et des invites de l’installateur. Le fichier de configuration généré par l’installateur contient des commentaires pour les sections disponibles ; utilisez ces commentaires comme guide du schéma propre à la version.

## Priorité de configuration

OMA remonte depuis le répertoire de travail courant à la recherche du répertoire `.agents/` le plus proche. Il lit `oma-config.cue` lorsqu’il est présent et revient à `oma-config.yaml` si l’évaluation CUE partagée échoue. Une superposition locale de projet, soit `oma-config.local.cue`, soit `oma-config.local.yaml`, est fusionnée par-dessus ; ne gardez qu’une seule superposition locale. `OMA_MODEL_PRESET` peut remplacer `model_preset` pour un processus. Une configuration locale invalide interrompt le chargement au lieu de sélectionner silencieusement une autre valeur.

Le routage des modèles comporte deux cas particuliers avant l’ordre des préréglages fixes :

- Avec `model_preset: auto`, la configuration native de l’agent et du modèle de l’environnement courant est utilisée. Les remplacements explicites `agents.<id>` restent prioritaires ; un environnement inconnu peut utiliser `default_cli`.
- Avec `model_preset: free`, les créations d’enfants utilisent la passerelle locale FreeLLMAPI. `free.model` sélectionne le modèle de la passerelle et remplace les modèles épinglés par agent ; lorsqu’il est omis, `FREELLM_MODEL` ou le repli du fournisseur `auto` est utilisé.

Pour un préréglage fixe ou personnalisé, l’ordre effectif est :

1. Remplacement explicite `agents.<id>`.
2. Entrée correspondant à `model_preset`, intégrée ou dans `custom_presets`.
3. Entrée `orchestrator` du préréglage lorsqu’un rôle n’a pas d’entrée.
4. `default_cli` comme repli du fournisseur lorsque les niveaux précédents ne résolvent pas de plan.

Le préréglage `free` fournit des valeurs par défaut pour les trois réglages du fournisseur : `base_url` vaut `http://127.0.0.1:31415/v1`, `api_key_env` vaut `FREELLM_API_KEY` (`FREELLMAPI_API_KEY` étant accepté comme alias de compatibilité) et `model` vaut `auto`. Une clé API utilisable dans la variable d’environnement sélectionnée reste requise ; aucun repli de fournisseur n’existe. Définissez ces valeurs dans `oma-config.local.yaml` lorsqu’elles doivent rester propres à la machine, ou utilisez `FREELLM_BASE_URL` et `FREELLM_MODEL` pour des remplacements au niveau du processus.

## Valeurs par défaut aux conséquences surprenantes

Une clé `mcp.devtools_browsers` omise signifie « laisser les entrées de navigateur actuelles inchangées ». Une liste vide explicitement définie supprime les entrées de navigateur lors de la réconciliation. Les processus MCP du navigateur s’exécutent par session d’agent ; activez-les uniquement lorsqu’une tâche pilote un navigateur.

Le mode Serena `bridge` par défaut réduit les processus de serveur de langage en double lorsque plusieurs agents travaillent dans un même projet. `stdio` est le choix de récupération lorsqu’un bridge local ne peut pas démarrer ou lorsqu’une isolation stricte des processus est importante. Serena répare automatiquement ses enfants de serveur de langage au prochain appel d’outil ; le reaper de mémoire est séparé et n’a pas besoin d’être activé pour l’usage normal.

Le réglage de télémétrie par défaut est une désinscription. Définir `telemetry: true` supprime les entrées de désinscription des fournisseurs OMA lors de la prochaine liaison ou mise à jour, ce qui peut réactiver des fonctions de fournisseur dépendant de la télémétrie. Ce réglage contrôle les changements d’intégration des fournisseurs ; il ne modifie pas les fichiers de coût de session qu’OMA écrit pour sa propre comptabilité.

## Chemins de récupération

| Symptôme | Première vérification | Récupération |
|---|---|---|
| Les fichiers du fournisseur sont obsolètes | `oma doctor` et `oma link --dry-run` | Lancez `oma link <vendor>` après avoir modifié `.agents/` ; gardez le SSOT comme source. |
| Un modèle n’est pas accepté | `oma doctor --profile` | Passez à `auto`, utilisez un préréglage intégré ou définissez un slug de modèle sous `models:`. |
| Les outils Serena expirent | `oma doctor` et la section du fournisseur | Essayez `serena.mode: stdio` ; si la pression mémoire est en cause, prévisualisez avec `oma serena reap --dry-run`. |
| Un workflow persistant ne s’arrête pas | `.agents/state/*-state.json` | Dites `workflow done` ; n’examinez le fichier d’état que si le workflow n’a pas nettoyé. |
| Un reaper planifié ne fait rien | Section Reaper Serena de `oma doctor` | Définissez `serena_reaper.enabled: true`, puis lancez `oma serena reaper enable`. |
| La configuration locale empêche le démarrage | Chemin d’erreur de `oma doctor` | Corrigez ou supprimez la superposition locale ; ne créez pas à la fois une superposition `.cue` et `.yaml`. |

Poursuivez avec [Installation](./installation.md), [Modèles par agent](../guide/per-agent-models.md) ou [Sémantique de la configuration OMA](../guide/oma-config-semantics.md).
