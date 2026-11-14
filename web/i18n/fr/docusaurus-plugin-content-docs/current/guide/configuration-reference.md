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

Le résultat attendu est un profil résolu qui affiche le preset sélectionné et le plan de modèle par agent. Si la commande signale une erreur d’analyse, corrigez la couche de configuration la plus proche avant de modifier les réglages de modèle.

## Quel fichier l’emporte

Le chargeur lit les valeurs globales par défaut depuis `$OMA_HOME/.agents/` (par défaut
`~/.oma/.agents/`), puis remonte depuis le répertoire courant et s’arrête au
répertoire `.agents/` de projet le plus proche. Dans chaque répertoire sélectionné :

1. `oma-config.yaml` fournit les valeurs partagées.
2. `oma-config.cue`, lorsqu’il est présent et valide, remplace chaque clé qu’il définit ; les clés YAML qu’il ne définit pas sont conservées. Si le fichier CUE ne peut pas être évalué, OMA émet un avertissement et utilise uniquement le fichier YAML.
3. Un fichier local (`oma-config.local.cue` ou `.local.yaml`) est fusionné par-dessus le résultat partagé.

Le résultat partagé/local du projet remplace le résultat partagé/local global.
`OMA_MODEL_PRESET`, lorsqu’il est défini, remplace `model_preset` après toutes les couches de fichiers.
L’ordre complet, un diagramme de flux et le dépannage se trouvent dans
[Chargement de la configuration](/docs/guide/oma-config-semantics#precedence-table).

Les maps sont fusionnées récursivement. Les tableaux, scalaires et `null` remplacent la valeur partagée. Garder les deux formats locaux est une erreur. Un fichier local malformé est fatal afin qu’un remplacement privé ne puisse pas être ignoré silencieusement.

Les racines de projets ancêtres différentes ne sont pas fusionnées. Un répertoire `.agents/`
de projet le plus proche, même vide, établit cette limite. L’ancienne installation `~/.agents/`
sert d’entrée de migration et n’est pas lue comme repli de projet. Les valeurs globales par défaut ne
modifient ni l’identité du projet courant ni sa portée mémoire.

## Clés de premier niveau {#top-level-keys}

Les clés suivantes sont lues par le schéma d’exécution actuel ou par les consommateurs OMA fournis. Une clé marquée sparse est volontairement partielle : omettez une valeur imbriquée pour conserver la valeur par défaut du code.

| Clé | Type ou valeurs acceptées | Valeur par défaut en l’absence de clé | Rôle |
| --- | --- | --- | --- |
| `language` | chaîne | `en` | Langue des réponses utilisée par les workflows et les compétences. L’installation conserve une valeur existante ou l’initialise à partir de la langue du système, sans invite. |
| `translation_voice` | `formal`, `balanced`, `interpreter` | `balanced` dans le modèle fourni | Choix de voix pour `oma-translation`. |
| `date_format` | `ISO`, `US`, `EU` | `ISO` dans le modèle fourni ; l’omission ne crée aucun remplacement explicite | Préférence de formatage des dates. |
| `timezone` | nom IANA | fuseau horaire du système | Dates utilisées par les plannings et les rapports. |
| `auto_update_cli` | booléen | `true` | Vérifications en arrière-plan de la version du CLI ; désactivez avec `false`. |
| `telemetry` | booléen | `false` | Activation de la télémétrie des fournisseurs utilisée par l’installation, la mise à jour et la réconciliation des liens. |
| `model_preset` | chaîne non vide | `auto` dans les nouveaux modèles | Preset de modèle intégré ou personnalisé. `OMA_MODEL_PRESET` le remplace pour un seul processus. |
| `free` | `base_url`, `api_key_env`, `model` | non défini | Ancienne forme de `providers.free` (`model` y est `default_model`) ; encore lue, et `oma update` la déplace. |
| `providers` | `docs`, `web`, `code_intelligence`, `code_intelligence_guard`, `semantic_memory` ; sections d’identifiants `brave`, `exa`, `honcho` ; tout autre `<name>` → objet de fournisseur LLM | `context7`, `native`, `serena`, `block`, `agentmemory` ; aucun identifiant ni fournisseur LLM | Sélectionne les fournisseurs de documentation, de recherche, d’intelligence du code et de mémoire sémantique, conserve leurs références d’identifiants et déclare les endpoints LLM par lesquels les agents peuvent être routés. Consultez [Fournisseurs](#providers). |
| `brave`, `exa`, `honcho` | comme sous `providers` | non défini | Anciennes formes de premier niveau de `providers.brave`, `providers.exa` et `providers.honcho` ; encore lues, et `oma update` les déplace. |
| `agents` | ID d’agent → `model`, `effort`, `thinking`, `memory` facultatifs ; `default` → `cli`, `effort`, `thinking`, `memory` | résolution du preset ; `default.cli` revient à `claude` (`codex` pour une route de fournisseur) | Remplacements par agent appliqués au preset sélectionné. Effort vaut `none`, `low`, `medium`, `high` ou `xhigh` ; memory vaut `user`, `project` ou `local`. `agents.default` remplit ces champs pour chaque rôle qui n’en définit aucun, et sa `cli` (parmi `claude`, `codex`, `cursor`, `antigravity`, `qwen`, `grok`, `kimi`, `kiro`, `opencode`, `pi`) est le fournisseur utilisé lorsque rien d’autre n’en sélectionne un : un runtime non détecté sous `auto`, ou une route de fournisseur après `--vendor`, `OMA_RUNTIME_VENDOR` et le runtime détecté. Un modèle `<provider>/<model-id>` route le rôle par ce fournisseur LLM. |
| `models` | slug de modèle → mappage CLI | non défini | Définitions de modèles intégrées pour les CLI fournisseurs pris en charge. |
| `custom_presets` | preset → description, `extends` et `agent_defaults` facultatifs | non défini | Presets définis par l’utilisateur ; `extends` peut hériter d’un preset intégré. |
| `vendors` | `string[]` d’ID de fournisseurs sélectionnés (YAML et CUE) | absente : `oma link` utilise tous les fournisseurs liables, `oma update` utilise les fournisseurs dont les répertoires de projet existent | Sélection des intégrations que `oma install` et `oma update` projettent. La map des capacités de répartition se trouve dans la configuration d’orchestration gérée ; consultez [Sélection du fournisseur et métadonnées de répartition](#vendor-selection-and-dispatch-metadata). |
| `default_cli` | ID de fournisseur | non défini | Ancienne forme de `agents.default.cli` ; encore lue, et `oma update` la déplace. |
| `session.quota_cap` | `tokens`, `spawn_count`, `per_vendor: map<string, integer>` | chaque dimension omise n’a pas de plafond | Usage de tokens enregistré et limites de créations vérifiés avant la prochaine création d’agent ; consultez [Plafonds de quota de session](#session-quota-caps). |
| `diagnostic_feedback` | `enabled`, `host_diagnostics`, `timeout_ms` | automatique pour les hôtes de terminal pris en charge, `false`, `1400` | Compare les diagnostics Serena avant et après les modifications de fichiers natives ; consultez [Retour de diagnostic](#diagnostic-feedback). |
| `docs` | `auto_verify`, `check_urls`, `exclude` | `false`, `true`, `[]` | Comportement et exclusions d’analyse de `oma docs verify`. |
| `serena` | `mode: bridge\|stdio`, `auto_update` | `bridge`, `true` | Transport MCP de Serena et comportement de mise à jour. |
| `mcp.devtools_browsers` | `aside`, `chrome`, `firefox` ou `[]` | non défini = conserver la configuration existante | Sélection du MCP DevTools du navigateur pendant la réconciliation. Une liste vide explicite supprime les entrées de navigateur sélectionnées. |
| `video` | map sparse appartenant à la compétence | valeur par défaut de la compétence ; voir [Génération vidéo](/docs/guide/video-generation) | Routage vidéo, ordre des fournisseurs, sortie, coût, limites et réglages de rafraîchissement HyperFrames. |
| `image` | map sparse appartenant à la compétence | valeur par défaut de la compétence ; voir [Génération d’images](/docs/guide/image-generation) | Fournisseur d’images, taille, qualité, sortie, comparaison et coûts. |
| `voice` | `backend`, `notification_profile`, `asset_profile`, `output_dir`, `auto_notify_after_sec`, `max_tts_chars`, `max_stt_minutes` | `backend: auto` ; autres clés : valeur par défaut de la compétence ; voir [Workflows de contenu et de recherche](/docs/guide/content-and-research#generate-speech-or-transcribe-audio) | Backend vocal (`auto`, `voicebox`, `voicestudio` ; également utilisé par la narration de `oma video`), profil, sortie et réglages de longueur. |
| `hwp` | `format`, `version.*`, `output.*` | valeur par défaut de la compétence ; voir [Workflows de contenu et de recherche](/docs/guide/content-and-research#extract-hwp-family-documents) | Format Kordoc, canal de version et emplacement de sortie. |
| `pdf` | `format`, `image_output`, `image_format`, `use_struct_tree`, `ocr.*`, `output.*` | valeur par défaut de la compétence ; voir [Workflows de contenu et de recherche](/docs/guide/content-and-research#extract-pdf-content) | Extraction PDF, OCR, image et réglages de remplacement. |
| `scholar` | `base_url` | valeur par défaut de la compétence ; voir [Workflows de contenu et de recherche](/docs/guide/content-and-research#search-and-validate-scholarly-material) | Hôte du endpoint Knows ; la forme du protocole reste détenue par la compétence. |
| `diagram` | `engine`, `explain_sidecar`, `archify.path`, `archify.quality`, `archify.open` | valeur par défaut de la compétence ; voir [Moteur de diagrammes](/docs/guide/diagram-engine) | Sélection Mermaid/archify et réglages d’épinglage et de qualité d’archify. Les clés retirées `archify.managed`, `archify.channel` et `archify.check_interval_min` sont ignorées avec un avis, et `oma update` les retire. |
| `market` | `path`, `python`, `save_dir` | valeur par défaut de la compétence ; voir [Étude de marché](/docs/guide/market-research) | Épinglage du moteur last30days, interpréteur et emplacement des résultats. Les clés retirées `managed`, `channel` et `check_interval_min` sont ignorées avec un avis, et `oma update` les retire. |

Le modèle fourni contient également des blocs détenus par les consommateurs. Leurs clés et valeurs par défaut actuelles sont :

| Bloc | Clés lues par le consommateur | Valeur par défaut | Effet |
| --- | --- | --- | --- |
| `memory.gc` | `keep_sessions`, `max_age_days` | conserver 100 sessions ; supprimer les artefacts Serena de plus de 50 jours ; `0` désactive la suppression par âge | Valeurs par défaut pour `oma memory gc` ; les options de commande les remplacent. |
| `serena_reaper` | `enabled`, `policy: lru\|idle`, `keep_warm`, `idle_minutes`, `grace_seconds` | `false`, `lru`, `2`, `10`, `90` | Contrôle le chemin planifié de nettoyage du LSP Serena. `oma serena reap` interactif reste explicite ; les exécutions silencieuses planifiées sont facultatives. |
| `refactor_guard` | `enabled`, `max_lines` | `false`, `500` | Active le guard de budget de lignes du hook d’arrêt et définit le budget de code par fichier. |
| `scm` | `conventional_commits`, `branching_strategy`, `require_pr_for_default_branch`, `co_author.*`, `forbidden_patterns`, `allowed_exceptions` | le modèle fourni active les commits conventionnels et la protection des PR, avec ses listes d’auteur et de noms de fichier | Gouverne la compétence SCM, le hook de commit et la protection contre les motifs secrets. Remplacez les valeurs d’identité du modèle par les vôtres avant d’activer les trailers de co-auteur. |

Ces blocs sont acceptés par le passthrough de configuration et interprétés par leur fonctionnalité ou workflow. L’analyseur `serena_reaper` lit uniquement les clés snake_case montrées ci-dessus et ignore le camelCase. Les modèles fournis affichent encore du camelCase (`keepWarm`, `idleMinutes`, `graceSeconds`), et le schéma CUE fourni rejette les clés snake_case à l’intérieur de son bloc de schéma (`field not allowed`) : définissez-les donc dans `oma-config.yaml` ou dans une superposition YAML locale. Lisez le guide de la fonctionnalité correspondante avant d’ajouter des clés imbriquées ; cette page n’invente aucune clé en dehors des consommateurs listés ici.

## Objets imbriqués exacts

### Fournisseurs {#providers}

`providers` sélectionne un fournisseur par capacité :

| Clé | Valeurs acceptées | Valeur par défaut |
| --- | --- | --- |
| `docs` | `context7` | `context7` |
| `web` | ID de fournisseur de recherche (lettres minuscules, chiffres, `_`, `-`), comme `native` ou `brave` | `native` |
| `code_intelligence` | `serena`, `gortex` | `serena` |
| `code_intelligence_guard` | `block`, `off` | `block` |
| `semantic_memory` | `agentmemory`, `honcho`, `none` | `agentmemory` |

Trois clés réservées portent la section d’identifiants ou de connexion d’un sélecteur : `providers.brave` et `providers.exa` (`api_key_env` ou `api_key_vault`) pour `web`, et `providers.honcho` pour `semantic_memory` (voir [Mémoire sémantique Honcho](#honcho-semantic-memory)). Leurs anciennes formes de premier niveau sont encore lues.

Toute autre clé sous `providers` est un **fournisseur LLM** : un endpoint compatible OpenAI ou Anthropic par lequel `oma agent spawn` peut router un CLI enfant au lieu du compte propre à ce CLI. La valeur est un objet :

| Champ | Valeurs acceptées | Requis | Rôle |
| --- | --- | --- | --- |
| `base_url` | URL HTTP(S) absolue sans identifiants, requête ni fragment ; `/v1` est ajouté s’il manque | oui | L’endpoint. |
| `api_key_env` | nom de variable d’environnement | oui (sauf `free`, qui vaut par défaut `FREELLM_API_KEY`) | D’où la clé est lue ; le fichier ne contient jamais la clé. `base_url` n’est facultatif que pour `free` (`http://127.0.0.1:31415/v1`). |
| `transport` | `chat_completions` (par défaut), `responses`, `anthropic_messages`, `multi` | non | Le protocole que parle l’endpoint. Il sélectionne le CLI enfant : `chat_completions` → Codex ou Qwen, `responses` → Codex, `anthropic_messages` → Claude, `multi` (une passerelle qui sert les trois) → Codex, Claude ou Qwen. |
| `default_model` | ID de modèle | lorsque le fournisseur est utilisé comme `model_preset` | Le modèle que chaque rôle utilise sous `model_preset: <name>`. |

```yaml
providers:
  code_intelligence: serena
  exaone:
    base_url: https://api.exaone.ai/v1
    api_key_env: EXAONE_API_KEY
    transport: chat_completions
    default_model: k-exaone_v2.5
agents:
  default: { effort: medium }
  backend: { model: exaone/k-exaone_v2.5 }
```

`free` est le fournisseur intégré d’une passerelle FreeLLMAPI locale : chaque champ a une valeur par défaut, `FREELLM_BASE_URL` et `FREELLM_MODEL` remplacent le fichier, et l’ancien bloc de premier niveau `free:` est encore lu (son `model` est `default_model` ici) ; voir [Fournisseurs LLM personnalisés](/docs/guide/per-agent-models#custom-llm-providers).

`code_intelligence_guard` contrôle la garde de recherche PreToolUse. Les recherches natives limitées à des exclusions de fournisseur confirmées ou à des chemins situés hors du projet sont autorisées sans contournement. La garde lit les exclusions de Serena et les règles gitignore activées, ou la liste des exclusions de Gortex ; elle ne déduit pas les dépendances à partir des noms de répertoires.

Le hook ne mentionne pas `OMA_CI_ALLOW_NATIVE`. Une recherche shell préfixée par `OMA_CI_ALLOW_NATIVE=1` contourne la garde uniquement pour des ressources situées hors du projet ou des chemins ignorés que la garde n’a pas reconnus, pas pour le code source du projet.

### Mémoire sémantique Honcho {#honcho-semantic-memory}

La map `providers.honcho` (ancien `honcho` de premier niveau, encore lu) est validée par `HonchoConfigSchema`. Les noms de clés et le comportement effectif à l’exécution sont les suivants :

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

`session.quota_cap` est une map partielle. Chaque champ est facultatif ; un champ omis laisse cette dimension sans plafond. Les valeurs doivent être des entiers non négatifs écrits sans séparateurs `_` (YAML lit `2_000_000` comme une chaîne, ce qui laisse cette dimension sans plafond). `per_vendor` mappe les ID de fournisseurs de répartition, comme `claude`, `codex` ou `antigravity`, à des budgets de tokens :

```yaml
session:
  quota_cap:
    tokens: 2000000
    spawn_count: 30
    per_vendor:
      claude: 1500000
      codex: 500000
```

Le chargeur de plafonds vérifie la couche CUE utilisateur, puis la couche YAML utilisateur, puis le repli des valeurs par défaut fourni. Avant une création, OMA vérifie `spawn_count`, le total de `tokens` et `per_vendor` dans cet ordre. Une limite est atteinte lorsque l’utilisation lui est supérieure ou égale ; OMA bloque la création suivante et signale la dimension gagnante.

OMA réserve une estimation des tokens d’entrée au démarrage d’une exécution. Lorsqu’une transcription native prise en charge est disponible après l’exécution, l’usage enregistré d’entrée, de cache et de sortie remplace cette estimation sans compter une autre création. Sinon, l’enregistrement reste explicitement estimé à partir de la longueur du prompt. L’usage observé de la session racine est marqué partiel lorsque des sous-agents natifs sont hors du périmètre de capture. Les plafonds de tokens dépendent donc des observations disponibles ; ils n’interrompent pas un enfant déjà en cours et ne garantissent pas une limite de facturation. `spawn_count` est la limite la plus prévisible.

### Budget d’exécution de session {#session-execution-budget}

Définissez `session.execution` pour borner le temps écoulé du dispatch CLI géré par OMA et de la vérification. Utilisez soit un `timeout_seconds` positif, soit une `deadline` ISO 8601 avec fuseau horaire :

```yaml
session:
  execution:
    timeout_seconds: 1800
```

Les commandes `oma agent spawn`, `parallel`, `review`, `resume`, `begin` et `verify` acceptent `--timeout-seconds` ou `--deadline`. La préparation, l’exécution, les nouvelles tentatives et les contrôles partagent une seule échéance absolue. L’échéance configurée, héritée ou persistée la plus proche l’emporte ; les nouvelles tentatives et la reprise ne remettent pas l’horloge à zéro. Omettez `session.execution` et les deux options pour laisser cette dimension sans plafond, sauf si le parent a fourni une échéance.

L’historique d’exécution est conservé sous `.agents/state/executions/`. Une annulation ou un dépassement de délai bloque la suite de l’exécution dans cette session et enregistre la raison de l’arrêt. Ces contrôles couvrent les processus lancés par le chemin CLI géré. Les agents natifs des fournisseurs et les tâches shell arbitraires ont besoin du mécanisme d’annulation de leur hôte ; les plafonds de CPU, de RAM et de stockage exigent le support du fournisseur.

Les CLI enfants gérés héritent de `OMA_EXECUTION_DEADLINE`, `OMA_EXECUTION_STATE` et `OMA_EXECUTION_ID`. Le chemin d’état et l’ID d’exécution forment une référence d’héritage liée ; un registre étranger, mal formé ou non concordant est rejeté avant toute écriture. Transmettez l’environnement hérité complet lorsque vous enveloppez un enfant OMA. Définir ces variables n’ajoute pas l’application d’une échéance à un programme sans rapport.

Lors d’une annulation, OMA arrête l’admission et tente une terminaison bornée du calcul dont il est propriétaire. Il conserve les journaux, les résultats, les worktrees et les métadonnées des ressources enregistrées. Supprimer des artefacts ou des ressources externes exige une demande ou une politique de rétention explicite. Une terminaison qui échoue reste visible au lieu d’être signalée comme entièrement nettoyée.

### Retour de diagnostic {#diagnostic-feedback}

Pour les hôtes de terminal pris en charge, OMA compare les erreurs et les avertissements avant et après les modifications de fichiers natives, puis injecte les diagnostics nouvellement signalés dans le retour de l’outil suivant. Il utilise un daemon HTTP Serena déjà en cours et correspondant au projet lorsque Serena est le fournisseur d’intelligence du code effectif (la valeur par défaut lorsqu’aucun fournisseur n’est spécifié). Il ne démarre jamais un daemon et ne lance jamais un build. Les modifications symboliques propres à Serena sont exclues, car elles fournissent déjà des diagnostics.

```yaml
diagnostic_feedback:
  enabled: true
  host_diagnostics: false
  timeout_ms: 1400
```

Définissez `enabled: false` pour désactiver ce retour. Définissez `host_diagnostics: true` lorsque l’hôte fournit déjà les diagnostics de modification ; Cursor et Antigravity sont ignorés automatiquement. Les surcharges locales au projet suivent les couches de configuration habituelles. Les surcharges d’environnement sont `OMA_DIAGNOSTIC_FEEDBACK`, `OMA_HOST_DIAGNOSTICS` et `OMA_DIAGNOSTIC_FEEDBACK_TIMEOUT_MS`.

Le délai couvre chaque hook complet d’avant ou d’après modification et est limité à 100–10 000 millisecondes. Les fournisseurs lents peuvent utiliser un délai plus long. Une recherche en échec ou expirée saute le retour et démarre un court temps de pause ; elle ne compte pas comme un résultat de diagnostic propre. Les bases d’avant modification manquantes ou périmées sautent aussi le retour. Chaque hook examine au plus trois fichiers et signale au plus huit nouvelles erreurs ou avertissements.

### Sélection du fournisseur et métadonnées de répartition {#vendor-selection-and-dispatch-metadata}

Dans le `.agents/oma-config.yaml` appartenant à l’utilisateur, `vendors` est une liste d’ID d’intégrations sélectionnées :

```yaml
vendors:
  - claude
  - codex
  - pi
```

Une liste sélectionne exactement ces fournisseurs, et `vendors: []` n’en sélectionne aucun. Sans clé `vendors`, `oma link` cible tous les fournisseurs du registre des fournisseurs liables d’OMA, tandis que `oma update` ne cible que les fournisseurs dont les répertoires de projet existent déjà. La liste contrôle les projections de l’installation et de la mise à jour ; ce n’est pas la map des capacités de commande par fournisseur.

Le schéma CUE fourni de `.agents/oma-config.cue` type `vendors` comme la même liste (`[...string]`). Les anciens modèles CUE le typaient comme un objet `vendors.pi` (`#VendorsConfig`) que rien ne lit : la répartition des agents résout ses champs de capacité depuis le registre d’orchestration géré ci-dessous. Si votre `oma-config.cue` déclare encore `vendors?: #VendorsConfig`, remplacez-le par `vendors?: [...string]` avant d’y placer une liste de sélection.

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

Choisissez un preset fixe pour un projet tout en gardant un remplacement personnel local.

**Fichier partagé** (commité) :

```yaml
# .agents/oma-config.yaml
language: en
model_preset: mixed
```

**Superposition locale** (ignorée par Git) :

```yaml
# .agents/oma-config.local.yaml
agents:
  backend:
    model: openai/gpt-6.1-terra
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

## Règles de mise à jour et de propriété {#update-and-ownership-rules}

`.agents/oma-config.yaml` appartient à l’utilisateur. `oma update` conserve le contenu existant et peut ajouter les nouvelles clés de premier niveau du modèle fourni sous un marqueur `# Added by oma update`. `oma update --force` peut remplacer la configuration utilisateur, la configuration MCP et les répertoires de pile ; utilisez-le uniquement lorsque la réinitialisation de ces personnalisations est intentionnelle. Les fichiers de superposition locaux restent l’emplacement privé des valeurs propres à la machine.

Ne placez pas de clés API dans ce fichier. Utilisez les champs `api_key_env` ou `api_key_vault` et gardez l’identifiant réel dans le coffre de secrets ou l’environnement référencé.

Pour les détails de résolution des modèles, consultez [Configuration des modèles par agent](/docs/guide/per-agent-models). Pour la sémantique des couches et le comportement en cas d’échec, consultez [Sémantique de la configuration OMA](/docs/guide/oma-config-semantics).
