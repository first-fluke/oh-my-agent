---
title: "Guide : Référence de configuration"
sidebar_label: Référence de configuration
description: Emplacements de configuration OMA pris en charge, priorité, clés typées, valeurs par défaut et règles de propriété lors des mises à jour.
---

# Référence de configuration

OMA lit la configuration depuis `.agents/oma-config.cue` ou `.agents/oma-config.yaml`. Une superposition locale, `.agents/oma-config.local.cue` ou `.agents/oma-config.local.yaml`, est utile pour les réglages propres à la machine qui ne doivent pas entrer dans le fichier partagé.

Lancez ceci depuis le projet dont vous souhaitez examiner la configuration :

```bash
oma doctor --profile
```

Le résultat attendu est un profil résolu qui affiche le préréglage sélectionné et le plan de modèle par agent. Si la commande signale une erreur d’analyse, corrigez la couche de configuration la plus proche avant de modifier les réglages de modèle.

## Quel fichier l’emporte

Le chargeur remonte depuis le répertoire courant et s’arrête au répertoire `.agents/` le plus proche qui contient une configuration partagée ou locale. Dans ce répertoire :

1. `oma-config.cue` est évalué en premier.
2. `oma-config.yaml` est utilisé lorsque le fichier CUE partagé est absent ou ne peut pas être évalué.
3. Un fichier local (`oma-config.local.cue` ou `.local.yaml`) est fusionné par-dessus le fichier partagé.
4. `OMA_MODEL_PRESET`, lorsqu’il est défini, remplace `model_preset` pour ce processus.

Les maps sont fusionnées récursivement. Les tableaux, scalaires et `null` remplacent la valeur partagée. Garder les deux formats locaux est une erreur. Un fichier local malformé est fatal afin qu’un remplacement privé ne puisse pas être ignoré silencieusement.

Il s’agit d’une règle de couche la plus proche, pas d’une fusion générale entre projet et répertoire utilisateur. Une installation globale lit `~/.agents/oma-config.*` puisque HOME est sa racine d’installation. Une commande de projet lit la couche de projet la plus proche. La vérification de mise à jour de `auto_update_cli` est l’exception : elle examine le projet, puis HOME, puis utilise la valeur par défaut activée.

## Clés de premier niveau

Les clés suivantes sont lues par le schéma d’exécution actuel ou par les consommateurs OMA fournis. Une clé marquée sparse est volontairement partielle : omettez une valeur imbriquée pour conserver la valeur par défaut du code.

| Clé | Type ou valeurs acceptées | Valeur par défaut en l’absence de clé | Rôle |
| --- | --- | --- | --- |
| `language` | chaîne | `en` | Langue des réponses utilisée par les workflows et les compétences. |
| `translation_voice` | `formal`, `balanced`, `interpreter` | `balanced` dans le modèle fourni | Choix de voix pour `oma-translation`. |
| `date_format` | `ISO`, `US`, `EU` | `ISO` dans le modèle fourni ; l’omission ne crée aucun remplacement explicite | Préférence de formatage des dates. |
| `timezone` | nom IANA | fuseau horaire du système | Dates utilisées par les plannings et les rapports. |
| `auto_update_cli` | booléen | `true` | Vérifications en arrière-plan de la version du CLI ; désactivez avec `false`. |
| `telemetry` | booléen | `false` | Activation de la télémétrie des fournisseurs utilisée par l’installation, la mise à jour et la réconciliation des liens. |
| `model_preset` | chaîne non vide | `auto` dans les nouveaux modèles | Préréglage de modèle intégré ou personnalisé. `OMA_MODEL_PRESET` le remplace pour un seul processus. |
| `free` | `base_url`, `api_key_env`, `model` | `http://127.0.0.1:31415/v1`, `FREELLM_API_KEY`, `auto` | Réglages FreeLLMAPI lorsque le préréglage est `free` ; `FREELLM_BASE_URL` et `FREELLM_MODEL` remplacent les valeurs du fichier, et le nom de clé ne contient jamais le secret. Consultez [Configuration des modèles par agent](/docs/guide/per-agent-models#freellmapi-preset). |
| `providers` | `docs`, `web`, `code_intelligence`, `code_intelligence_guard`, `semantic_memory` | `context7`, `native`, `serena`, `block`, `agentmemory` | Sélection des fournisseurs de documentation, de recherche, d’intelligence du code et de mémoire sémantique. L’intelligence du code accepte `serena` ou `gortex` ; la mémoire sémantique accepte `agentmemory`, `honcho` ou `none`. `code_intelligence_guard` (`block` ou `off`) contrôle la garde de recherche PreToolUse. Les recherches natives limitées à des exclusions de fournisseur confirmées ou à des chemins situés hors du projet sont autorisées sans contournement. La garde lit les exclusions de Serena et les règles gitignore activées, ou la liste des exclusions de Gortex ; elle ne déduit pas les dépendances à partir des noms de répertoires. Le hook ne mentionne pas `OMA_CI_ALLOW_NATIVE`. Une recherche shell préfixée par `OMA_CI_ALLOW_NATIVE=1` contourne la garde uniquement pour des ressources situées hors du projet ou des chemins ignorés que la garde n’a pas reconnus, pas pour le code source du projet. |
| `brave` | `api_key_env` ou `api_key_vault` | non défini | Référence aux identifiants de recherche Brave. |
| `honcho` | `base_url`, `workspace_id`, `project_id`, `api_key_env`, `api_key_vault`, `timeout_ms`, `max_results`, `max_tokens`, `recall_mode` | Voir [Détails Honcho](#honcho-semantic-memory) | Réglages de connexion à la mémoire sémantique Honcho. |
| `agents` | ID d’agent → `model`, `effort`, `thinking`, `memory` facultatifs | résolution du préréglage | Remplacements par agent appliqués au préréglage sélectionné. Effort vaut `none`, `low`, `medium`, `high` ou `xhigh` ; memory vaut `user`, `project` ou `local`. |
| `models` | slug de modèle → mappage CLI | non défini | Définitions de modèles intégrées pour les CLI fournisseurs pris en charge. |
| `custom_presets` | préréglage → description, `extends` et `agent_defaults` facultatifs | non défini | Préréglages définis par l’utilisateur ; `extends` peut hériter d’un préréglage intégré. |
| `vendors` | YAML : `string[]` d’ID de fournisseurs sélectionnés ; modèle CUE : map de repli `vendors.pi` facultative | tous les fournisseurs liables pour la liste YAML | Sélection des intégrations que `oma install` et `oma update` projettent en YAML. La map des capacités de répartition se trouve dans la configuration d’orchestration gérée ; consultez [Sélection du fournisseur et métadonnées de répartition](#vendor-selection-and-dispatch-metadata). |
| `default_cli` | chaîne | repli du consommateur | Repli historique limité au fournisseur lorsqu’aucun plan de modèle n’est résolu. |
| `session.quota_cap` | `tokens`, `spawn_count`, `per_vendor: map<string, integer>` | chaque dimension omise n’a pas de plafond | Limites strictes de tokens et de créations vérifiées avant la prochaine création d’agent ; consultez [Plafonds de quota de session](#session-quota-caps). |
| `docs` | `auto_verify`, `check_urls`, `exclude` | `false`, `true`, `[]` | Comportement et exclusions d’analyse de `oma docs verify`. |
| `serena` | `mode: bridge\|stdio`, `auto_update` | `bridge`, `true` | Transport MCP de Serena et comportement de mise à jour. |
| `mcp.devtools_browsers` | `aside`, `chrome`, `firefox` ou `[]` | non défini = conserver la configuration existante | Sélection du MCP DevTools du navigateur pendant la réconciliation. Une liste vide explicite supprime les entrées de navigateur sélectionnées. |
| `video` | map sparse appartenant à la compétence | valeur par défaut de la compétence ; voir [Génération vidéo](/docs/guide/video-generation) | Routage vidéo, ordre des fournisseurs, sortie, coût, limites et réglages de rafraîchissement HyperFrames. |
| `image` | map sparse appartenant à la compétence | valeur par défaut de la compétence ; voir [Génération d’images](/docs/guide/image-generation) | Fournisseur d’images, taille, qualité, sortie, comparaison et coûts. |
| `voice` | `notification_profile`, `asset_profile`, `output_dir`, `auto_notify_after_sec`, `max_tts_chars`, `max_stt_minutes` | valeur par défaut de la compétence ; voir [Workflows de contenu et de recherche](/docs/guide/content-and-research#generate-speech-or-transcribe-audio) | Profil Voicebox, sortie et réglages de longueur. |
| `hwp` | `format`, `version.*`, `output.*` | valeur par défaut de la compétence ; voir [Workflows de contenu et de recherche](/docs/guide/content-and-research#extract-hwp-family-documents) | Format Kordoc, canal de version et emplacement de sortie. |
| `pdf` | `format`, `image_output`, `image_format`, `use_struct_tree`, `ocr.*`, `output.*` | valeur par défaut de la compétence ; voir [Workflows de contenu et de recherche](/docs/guide/content-and-research#extract-pdf-content) | Extraction PDF, OCR, image et réglages de remplacement. |
| `scholar` | `base_url` | valeur par défaut de la compétence ; voir [Workflows de contenu et de recherche](/docs/guide/content-and-research#search-and-validate-scholarly-material) | Hôte du endpoint Knows ; la forme du protocole reste détenue par la compétence. |
| `diagram` | `engine`, `explain_sidecar`, `archify.*` | valeur par défaut de la compétence ; voir [Moteur de diagrammes](/docs/guide/diagram-engine) | Sélection Mermaid/archify et réglages du moteur géré. |
| `market` | `managed`, `channel`, `check_interval_min`, `path`, `python`, `save_dir` | valeur par défaut de la compétence ; voir [Recherche de marché](/docs/guide/market-research) | Résolution du moteur last30days géré et emplacement des résultats. |

Le modèle fourni contient également des blocs détenus par les consommateurs. Leurs clés et valeurs par défaut actuelles sont :

| Bloc | Clés lues par le consommateur | Valeur par défaut | Effet |
| --- | --- | --- | --- |
| `memory.gc` | `keep_sessions`, `max_age_days` | conserver 100 sessions ; supprimer les artefacts Serena de plus de 50 jours ; `0` désactive la suppression par âge | Valeurs par défaut pour `oma memory gc` ; les options de commande les remplacent. |
| `serena_reaper` | `enabled`, `policy: lru\|idle`, `keep_warm`, `idle_minutes`, `grace_seconds` | `false`, `lru`, `2`, `10`, `90` | Contrôle le chemin planifié de nettoyage du LSP Serena. `oma serena reap` interactif reste explicite ; les exécutions silencieuses planifiées sont facultatives. |
| `refactor_guard` | `enabled`, `max_lines` | `false`, `500` | Active le guard de budget de lignes du hook d’arrêt et définit le budget de code par fichier. |
| `scm` | `conventional_commits`, `branching_strategy`, `require_pr_for_default_branch`, `co_author.*`, `forbidden_patterns`, `allowed_exceptions` | le modèle fourni active les commits conventionnels et la protection des PR, avec ses listes d’auteur et de noms de fichier | Gouverne la compétence SCM, le hook de commit et la protection contre les motifs secrets. Remplacez les valeurs d’identité du modèle par les vôtres avant d’activer les trailers de co-auteur. |

Ces blocs sont acceptés par le passthrough de configuration et interprétés par leur fonctionnalité ou workflow. L’analyseur `serena_reaper` lit les clés snake_case montrées ci-dessus, même si d’anciens commentaires du modèle utilisaient des noms camelCase. Lisez le guide de la fonctionnalité correspondante avant d’ajouter des clés imbriquées ; cette page n’invente aucune clé en dehors des consommateurs listés ici.

## Objets imbriqués exacts

### Mémoire sémantique Honcho {#honcho-semantic-memory}

La map `honcho` est validée par `HonchoConfigSchema`. Les noms de clés et le comportement effectif à l’exécution sont les suivants :

| Clé | Forme | Valeur effective par défaut ou contrainte |
| --- | --- | --- |
| `base_url` | chaîne URL | `https://api.honcho.dev` ; HTTPS est requis sauf pour HTTP en boucle locale. Les identifiants, chaînes de requête et fragments sont rejetés. |
| `workspace_id` | 1 à 128 lettres, chiffres, `_` ou `-` | Requis au démarrage du fournisseur. L’installateur interactif initialise `oma` lorsqu’aucune valeur enregistrée n’existe. |
| `project_id` | chaîne supprimée des espaces en bordure, de 1 à 128 caractères | L’omission signifie la racine du projet OMA courant. |
| `api_key_env` | nom de variable d’environnement | `HONCHO_API_KEY`. Un endpoint hors boucle locale nécessite cette variable ou `api_key_vault`. |
| `api_key_vault` | nom de clé de coffre (`A-Z`, `a-z`, chiffres, `.`, `_`, `-` ; 1 à 64 caractères) | L’omission signifie aucune recherche dans le coffre. Si les deux références d’identifiants sont présentes, la valeur d’environnement est utilisée en premier. |
| `timeout_ms` | entier `100`–`30000` | `5000` millisecondes. La même échéance couvre une demande d’état ou de mémoire. |
| `max_results` | entier `1`–`50` | `8` résultats de rappel. |
| `max_tokens` | entier `128`–`16000` | `2000` octets UTF-8 pour le contenu rappelé et le contexte inféré. |
| `recall_mode` | `messages` ou `hybrid` | L’installateur écrit `messages` pour une nouvelle sélection. Une valeur omise active aussi la demande de représentation du fournisseur en plus du rappel des messages. |

Par exemple, un workspace distant peut utiliser une référence secrète sans placer le secret dans le YAML :

```yaml
providers:
  semantic_memory: honcho
honcho:
  base_url: https://honcho.example.com
  workspace_id: team
  project_id: product-docs
  api_key_vault: honcho-team
  timeout_ms: 5000
  max_results: 8
  max_tokens: 2000
  recall_mode: messages
```

L’installateur utilise `http://127.0.0.1:8000` comme URL initiale lors d’une configuration Honcho interactive ou non interactive sans URL enregistrée. Cette valeur initiale de l’installateur est distincte du repli d’exécution du fournisseur ci-dessus. Utilisez `oma memory status` après avoir sélectionné le fournisseur ; un workspace ou identifiant manquant est signalé comme indisponible au lieu de basculer silencieusement vers un autre fournisseur de mémoire.

### Plafonds de quota de session {#session-quota-caps}

`session.quota_cap` est une map partielle. Chaque champ est facultatif ; un champ omis laisse cette dimension sans plafond. Les valeurs doivent être des entiers non négatifs et `per_vendor` mappe les noms de fournisseurs à des budgets de tokens :

```yaml
session:
  quota_cap:
    tokens: 2000000
    spawn_count: 30
    per_vendor:
      claude: 1500000
      codex: 500000
```

Le chargeur de plafonds vérifie la couche CUE utilisateur, puis la couche YAML utilisateur, puis le repli des valeurs par défaut fourni. Avant une création, OMA vérifie `spawn_count`, le total de `tokens` et `per_vendor` dans cet ordre. Une limite est atteinte lorsque l’utilisation lui est supérieure ou égale ; OMA bloque la création suivante et signale la dimension gagnante. L’utilisation correspond au décompte des tokens, pas à une estimation de facturation.

### Sélection du fournisseur et métadonnées de répartition {#vendor-selection-and-dispatch-metadata}

Dans le `.agents/oma-config.yaml` appartenant à l’utilisateur, `vendors` est une liste d’ID d’intégrations sélectionnées :

```yaml
vendors:
  - claude
  - codex
  - pi
```

Une liste absente ou vide sélectionne tous les ID du registre des fournisseurs liables d’OMA. La liste contrôle les projections de l’installation et de la mise à jour ; ce n’est pas la map des capacités de commande par fournisseur.

Le schéma CUE fourni de `.agents/oma-config.cue` autorise aussi un objet `vendors.pi` avec les champs `command`, `prompt_flag`, `model_flag`, `default_model` et `thinking_flag`. Ce bloc est une forme de repli typée dans le modèle CUE ; le chemin actuel de répartition des agents résout ses champs de capacité depuis le registre d’orchestration géré ci-dessous. N’utilisez donc pas `vendors.pi` pour remplacer la liste YAML de sélection.

Le fichier de capacités géré `.agents/skills/oma-orchestration/config/cli-config.yaml` contient cette map. Chaque entrée `vendors.<id>` prend en charge les champs suivants :

| Champ | Forme | Utilisation |
| --- | --- | --- |
| `command` | chaîne exécutable | Binaire à exécuter. |
| `subcommand` | chaîne | Sous-commande insérée avant les options, comme `codex exec`. |
| `prompt_flag` | chaîne, ou `none`/`null` pour désactiver | Option associée à l’invite ; une invite positionnelle est utilisée lorsque l’option est désactivée. |
| `auto_approve_flag` | chaîne | Option de contournement des permissions du fournisseur pour les exécutions en écriture. Supprimée en mode lecture seule. |
| `read_only_flag` | chaîne | Option en lecture seule du fournisseur. Si elle est absente, le constructeur utilise son repli propre au fournisseur ou avertit. |
| `output_format_flag` | chaîne | Option qui sélectionne une sortie lisible par machine. |
| `output_format` | chaîne | Valeur associée à `output_format_flag`. |
| `model_flag` | chaîne | Option associée à `default_model`. |
| `default_model` | chaîne | Valeur de modèle utilisée lorsqu’un plan résolu n’en fournit pas. |
| `isolation_env` | chaîne `NAME=value` | Affectation d’environnement facultative ; les clés dangereuses de chargeur/interpréteur sont rejetées et `$$` est remplacé par l’ID du processus courant. |
| `isolation_flags` | chaîne d’arguments de style shell | Arguments d’isolation supplémentaires séparés en tokens argv. |

Le fichier de capacités géré est régénéré par les mises à jour OMA. Modifiez les clés `agents`, `models` et `custom_presets` appartenant à l’utilisateur pour sélectionner les modèles ; utilisez cette map de capacités uniquement pour maintenir les données d’orchestration gérées ou déboguer un adaptateur de fournisseur. L’objet `vendors.pi` commenté des anciens modèles est une métadonnée de repli et ne remplace ni la liste des fournisseurs sélectionnés ni le registre de répartition géré.

## Modifications courantes

Choisissez un préréglage fixe pour un projet tout en gardant un remplacement personnel local :

```yaml
# .agents/oma-config.yaml
language: en
model_preset: mixed

# .agents/oma-config.local.yaml
agents:
  backend:
    model: openai/gpt-5.4
    effort: high
```

Sélectionnez explicitement les fournisseurs d’intelligence du code et de mémoire :

```yaml
providers:
  code_intelligence: serena
  code_intelligence_guard: block   # off → advisory primer only, no tool denial
  semantic_memory: none
```

Conservez la configuration du navigateur inchangée pendant les mises à jour ou supprimez-la délibérément :

```yaml
# Omit mcp.devtools_browsers to leave existing browser entries unchanged.
mcp:
  devtools_browsers: []
```

## Règles de mise à jour et de propriété

`.agents/oma-config.yaml` appartient à l’utilisateur. `oma update` conserve le contenu existant et peut ajouter les nouvelles clés de premier niveau du modèle fourni sous un marqueur `# Added by oma update`. `oma update --force` peut remplacer la configuration utilisateur, la configuration MCP et les répertoires de pile ; utilisez-le uniquement lorsque la réinitialisation de ces personnalisations est intentionnelle. Les fichiers de superposition locaux restent l’emplacement privé des valeurs propres à la machine.

Ne placez pas de clés API dans ce fichier. Utilisez les champs `api_key_env` ou `api_key_vault` et gardez l’identifiant réel dans le coffre de secrets ou l’environnement référencé.

Pour les détails de résolution des modèles, consultez [Configuration des modèles par agent](/docs/guide/per-agent-models). Pour la sémantique des couches et le comportement en cas d’échec, consultez [Sémantique de la configuration OMA](/docs/guide/oma-config-semantics).
