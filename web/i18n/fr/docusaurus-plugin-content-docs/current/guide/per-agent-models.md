---
title: "Guide : configuration des modèles par agent"
sidebar_label: Modèles des agents
description: "Configurez le modèle d'IA utilisé par chaque agent via model_preset dans oma-config.yaml. Cette page couvre les presets intégrés et leurs modèles par rôle, la table de résolution du modèle et de la CLI, les surcharges par agent, les définitions de modèles en ligne, les presets personnalisés avec extends, oma doctor --profile, les plafonds de quota et les transports pi/OpenCode/Kimi."
---

# Guide : configuration des modèles par agent

## Vue d'ensemble

`model_preset: auto` est la valeur par défaut des nouvelles installations. Les agents non configurés utilisent les définitions d'agents et les réglages de modèle natifs du fournisseur courant. Choisissez un preset fixe pour imposer des modèles, ou surchargez des agents individuels lorsqu'un autre modèle ou fournisseur est nécessaire. Les presets explicites existants sont conservés lors d'une réinstallation ou d'une mise à jour.

La configuration partagée se trouve dans `.agents/oma-config.yaml` et, s'il existe, dans `.agents/oma-config.cue`, dont les clés remplacent les mêmes clés du YAML. Un fichier local facultatif, ignoré par Git, surcharge les réglages pour votre machine.

Pour connaître toutes les clés de premier niveau et la précédence, consultez la [référence de configuration](/docs/guide/configuration-reference).

1. Les presets intégrés et les modèles attribués à chaque rôle
2. La manière dont OMA résout le modèle et la CLI d'un agent
3. La configuration locale et le preset FreeLLMAPI (`free`)
4. La surcharge d'agents individuels avec la map `agents:`
5. L'intégration de slugs de modèles personnalisés avec `models:`
6. La définition de presets personnalisés avec `custom_presets:` et `extends:`
7. L'inspection de la configuration résolue avec `oma doctor --profile`
8. La migration depuis l'ancien `agent_cli_mapping` et les plafonds de quota de session
9. Le dispatch via pi, OpenCode et Kimi Code CLI

---

## Presets intégrés {#built-in-presets}

Définissez `model_preset` avec l'une des clés intégrées :

```yaml
# .agents/oma-config.yaml
language: en
model_preset: auto
```

| Clé | Description | Usage conseillé |
|:----|:-----------|:----------------|
| `auto` | Suit les réglages d'agent et de modèle du runtime courant sans injecter de modèle ni d'indicateur d'effort | Nouvelles installations |
| `free` | Mode passerelle spécial pour les processus Codex, Claude ou Qwen lancés par OMA ; il est résolu séparément du registre des presets intégrés. | Passerelle FreeLLMAPI locale |
| `antigravity` | Tous les agents utilisent la CLI Antigravity (`agy`) : Gemini 3.1 Pro pour l'implémentation, l'architecture et la QA ; Gemini 3.6 Flash pour l'orchestration, le PM, la documentation et l'exploration. Avec agy 1.1+, OMA transmet l'identifiant d'affichage issu de `agy models` (par exemple `--model "Gemini 3.1 Pro (High)"`) et convertit `effort` en un niveau publié par le modèle. agy 1.0 n'a pas de `--model` : sa propre configuration décide. agy n'a pas de `--thinking-budget`. | Utilisateurs de la CLI Antigravity |
| `claude` | Tous les agents utilisent Claude : Opus pour l'architecture, Haiku pour l'exploration, Sonnet pour tous les autres rôles | Détenteurs d'un abonnement Claude Max |
| `codex` | Tous les agents utilisent OpenAI Codex (GPT-5.5 pour la plupart des rôles, GPT-5.4-mini pour l'exploration), avec des niveaux d'effort | Utilisateurs ChatGPT Plus/Pro |
| `qwen` | Tous les agents utilisent Qwen Code ; les sessions Qwen correspondantes peuvent utiliser les agents natifs générés, et les autres runtimes utilisent le dispatch CLI | Inférence locale ou auto-hébergée |
| `kiro` | Tous les agents utilisent la CLI Kiro ; Sonnet prend en charge l'implémentation et l'architecture, Haiku l'orchestration et l'exploration | Utilisateurs de Kiro |
| `cursor` | Tous les agents utilisent Cursor `composer-2.5` (`composer-2.5-fast` pour orchestrator/qa/pm/docs/explore) | Utilisateurs Cursor Pro ou Pro Student |
| `mixed` | Claude pour orchestrator, architecture (Opus), qa, pm et docs ; Codex GPT-5.5 pour les rôles d'implémentation et GPT-5.4-mini pour explore | Profiter de plusieurs fournisseurs sans gérer la configuration de chaque agent |

Les presets intégrés sont fournis dans le paquet CLI et sont mis à jour automatiquement lors de la mise à niveau de `oh-my-agent`. `gemini` est un alias de compatibilité qui redirige vers `antigravity` ; ce n'est pas un preset actuel distinct. Aucun fichier de preset local n'est nécessaire.

### Modèles par rôle {#models-per-role}

Les presets fixes attribuent ces slugs du registre. Les préfixes de propriétaire sont omis : `antigravity/`, `anthropic/`, `openai/`, `qwen/`, `kiro/` et `cursor/` pour les six premières colonnes, et `anthropic/` pour les modèles Claude ou `openai/` pour les modèles GPT dans `mixed`. La source de vérité est `cli/platform/built-in-presets.ts`.

| Rôle | `antigravity` | `claude` | `codex` | `qwen` | `kiro` | `cursor` | `mixed` |
|:-----|:--------------|:---------|:--------|:-------|:-------|:---------|:--------|
| orchestrator, pm, docs | gemini-3.6-flash | claude-sonnet-4-6 | gpt-5.5 (medium) | qwen3-coder-next | claude-haiku-3-5 | composer-2.5-fast | claude-sonnet-4-6 |
| architecture | gemini-3.1-pro | claude-opus-4-7 | gpt-5.5 (high) | qwen3.6-plus (thinking) | claude-sonnet-4-5 | composer-2.5 | claude-opus-4-7 |
| qa | gemini-3.1-pro | claude-sonnet-4-6 | gpt-5.5 (high) | qwen3.6-plus (thinking) | claude-sonnet-4-5 | composer-2.5-fast | claude-sonnet-4-6 |
| backend, frontend, mobile, db, debug, refactor, tf-infra | gemini-3.1-pro | claude-sonnet-4-6 | gpt-5.5 (high) | qwen3.6-plus (thinking) | claude-sonnet-4-5 | composer-2.5 | gpt-5.5 (high) |
| explore | gemini-3.6-flash | claude-haiku-4-5 | gpt-5.4-mini (low) | qwen3-coder-next | claude-haiku-3-5 | composer-2.5-fast | gpt-5.4-mini (low) |

Les valeurs entre parenthèses sont l'`effort` du preset (Codex) ou `thinking: true` (Qwen). Un rôle que le preset ne liste pas, comme `eval`, utilise l'entrée `orchestrator` de ce preset.

---

## Comment OMA résout le modèle et la CLI d'un agent {#how-oma-resolves-an-agents-model-and-cli}

`OMA_MODEL_PRESET`, lorsqu'il est défini, remplace d'abord `model_preset` (voir [Chargement de la configuration](/docs/guide/oma-config-semantics#precedence-table)). Le résolveur choisit ensuite une ligne :

| `model_preset` | `agents.<id>` défini ? | Modèle envoyé à la CLI | CLI qui exécute l'agent |
|:---------------|:-------------------|:----------------------|:------------------------|
| `free` | Ignoré | `FREELLM_MODEL`, sinon `free.model`, sinon `auto` (tous les rôles) | `--vendor`, sinon `OMA_RUNTIME_VENDOR`, sinon le runtime détecté s'il s'agit de Codex, Claude ou Qwen, sinon `default_cli`, sinon `codex`. Seuls `codex`, `claude` et `qwen` sont acceptés. |
| `auto` | Non | Aucun. Les réglages d'agent et de session propres au fournisseur s'appliquent. | `--vendor`, sinon un `OMA_RUNTIME_VENDOR` pris en charge, sinon le runtime détecté, sinon `default_cli`, sinon `claude`. Une valeur non prise en charge est une erreur. |
| `auto` | Oui | Le `model` de la surcharge | La `cli` de ce modèle, puis la règle de remplacement du fournisseur ci-dessous |
| Intégré, alias ou personnalisé | Non | L'entrée du preset pour le rôle, sinon l'entrée `orchestrator` du preset | La `cli` de ce modèle, puis la règle de remplacement du fournisseur ci-dessous |
| Intégré, alias ou personnalisé | Oui | L'entrée du preset fusionnée superficiellement avec la surcharge (les champs de la surcharge l'emportent) | La `cli` de ce modèle, puis la règle de remplacement du fournisseur ci-dessous |

Voici comment s'articulent les autres éléments :

- **Recherche du preset.** OMA vérifie d'abord les noms intégrés, puis les alias (`gemini` redirige vers `antigravity` avec un avertissement), puis `custom_presets`. Un preset personnalisé portant un nom intégré est ignoré. Un nom inconnu s'arrête avec `Unknown model_preset "..."`, qui liste les noms valides.
- **Recherche du modèle.** Un slug est d'abord recherché dans `models:`, puis dans le registre intégré. Un slug inconnu, ou une spécification avec `api_only: true`, arrête le dispatch.
- **Règle de remplacement du fournisseur.** Lorsque `--vendor` ou `OMA_RUNTIME_VENDOR` désigne un fournisseur pour une ligne adossée à un modèle, `pi` prend toujours le relais (modèles de vrais fournisseurs uniquement ; voir [Dispatch via pi](#dispatching-through-pi-transport-runtime)). Tout autre fournisseur ne prend le relais que s'il figure dans `supports.native_dispatch_from` du modèle. Sinon, OMA émet un avertissement et conserve la `cli` propre au modèle.
- **Effort.** `effort` est abandonné, avec un avertissement, pour les modèles dont la CLI n'a pas d'option d'effort (Claude Code). Il est conservé pour pi, qui le convertit en `--thinking`.

## Dispatch automatique {#auto-dispatch}

Avec `auto`, OMA utilise le chemin de sous-agent natif du runtime courant lorsqu'il est disponible. Les agents provenant d'un autre fournisseur et les runtimes sans dispatch natif utilisent `oma agent spawn`. Auto ne se transforme pas en preset fixe d'un fournisseur. Les plans hérités n'injectent pas d'indicateurs de modèle ou d'effort OMA. Un processus CLI externe utilise les valeurs par défaut persistées de cette CLI, qui peuvent différer d'un modèle choisi uniquement dans la session parente.

`oma doctor --profile` affiche `(vendor agent default)` pour les agents hérités et le modèle résolu pour les surcharges explicites. Les fichiers d'agents natifs conservent les définitions du fournisseur ; en mode auto, les surcharges du même fournisseur sont appliquées lors de la génération de ces fichiers par install/update.

## Configuration locale

Créez **un seul** fichier parmi `.agents/oma-config.local.cue` et `.agents/oma-config.local.yaml` à côté de la configuration partagée. Install, link et update ajoutent les deux chemins à `.gitignore` ; update conserve les fichiers locaux existants, y compris avec `--force`.

OMA sélectionne le répertoire de configuration du projet le plus proche. Dans ce répertoire, les clés définies dans le CUE partagé remplacent les mêmes clés du YAML partagé, et le fichier local surcharge les valeurs partagées. L'ordre complet figure dans la [table de précédence](/docs/guide/oma-config-semantics#precedence-table). Les fichiers CUE sont évalués séparément avant la fusion : un `model_preset: "auto"` partagé peut donc être remplacé par `"free"` dans le fichier local. Les objets sont fusionnés récursivement ; les tableaux, scalaires et `null` remplacent la valeur partagée. Un fichier local mal formé, un exécutable CUE manquant pour un CUE local ou la présence des deux formats locaux est une erreur, et ne permet pas de revenir aux valeurs par défaut partagées.

Les options de commande et les surcharges d'environnement prises en charge ont priorité sur la configuration effective des fichiers. `oma doctor --profile` indique les fichiers utilisés. Les fichiers locaux ne sont pas transportés par les clones Git ni les nouveaux worktrees. Les sous-processus en mode free héritent de `OMA_MODEL_PRESET=free` et de l'environnement de passerelle résolu afin que les sous-processus OMA imbriqués conservent la route ; les sessions lancées indépendamment doivent avoir leur propre configuration locale ou leur propre environnement. Les réglages enregistrés par les commandes d'installation et de configuration ciblent toujours la configuration partagée ; une surcharge locale reste prioritaire à l'exécution.

## Preset FreeLLMAPI {#freellmapi-preset}

Conservez `model_preset: auto` dans le fichier partagé et activez le mode localement :

```cue
// .agents/oma-config.local.cue
model_preset: "free"
free: {
    base_url:    "http://127.0.0.1:31415/v1"
    api_key_env: "FREELLM_API_KEY"
    model:       "auto"
}
```

Le fichier YAML équivalent est :

```yaml
# .agents/oma-config.local.yaml
model_preset: free
free:
  base_url: http://127.0.0.1:31415/v1
  api_key_env: FREELLM_API_KEY
  model: auto
```

Démarrez FreeLLMAPI séparément et exportez sa clé unifiée sous le nom `FREELLM_API_KEY`. OMA accepte aussi `FREELLMAPI_API_KEY` en amont lorsque la variable de clé par défaut est sélectionnée ; la variable canonique gagne si les deux sont définies. Un `api_key_env` personnalisé ne lit que la variable indiquée. Ne placez jamais la clé elle-même dans la configuration. `OMA_MODEL_PRESET` surcharge le preset. `FREELLM_BASE_URL` et `FREELLM_MODEL` surchargent les réglages correspondants du fichier. Les valeurs de l'exemple sont les valeurs par défaut : `model_preset: free` suffit lorsque le serveur et la clé sont prêts.

```bash
oma doctor --profile
oma agent spawn backend "Review the API error handling" free-review --vendor codex --read-only
```

Le mode free utilise `free.model` pour tous les rôles dispatchés par OMA, y compris ceux qui possèdent déjà des pins `agents.*.model`. Il ne résout pas ces pins vers des abonnements payants. Choisissez `auto`, un identifiant de modèle de passerelle ou une chaîne de passerelle nommée telle que `auto:coding` (créez d'abord cette chaîne dans FreeLLMAPI).

Le transport suit la ligne `free` de [Comment OMA résout le modèle et la CLI d'un agent](#how-oma-resolves-an-agents-model-and-cli). Seuls les transports Codex, Claude et Qwen sont pris en charge. La sélection explicite d'un transport non pris en charge est une erreur.

| Transport | Endpoint de la passerelle | URL de base de la CLI |
|:--|:--|:--|
| Codex | `/v1/responses` | Inclut `/v1` |
| Claude | `/v1/messages` | Racine du serveur ; OMA retire le suffixe `/v1` |
| Qwen | `/v1/chat/completions` | Inclut `/v1` |

Utilisez `oma agent spawn` même lorsque le parent utilise le même fournisseur. OMA injecte la connexion à la passerelle et les identifiants uniquement dans ce sous-processus ; modifier le preset ne change pas le modèle d'une session hôte déjà ouverte ni celui d'un outil de sous-agent natif de l'hôte. Codex reçoit un fournisseur Responses personnalisé par les arguments d'invocation, tandis que la clé reste dans l'environnement enfant. Claude et Qwen reçoivent les réglages d'endpoint compatibles. Les réglages Claude/Qwen contradictoires qui remplaceraient la route ou la clé sont signalés avant l'exécution ; OMA ne réécrit pas ces fichiers.

Avant de lancer l'agent, le spawn et la revue vérifient `GET /v1/models` avec authentification. L'absence de clé, les échecs de connexion et les erreurs HTTP d'authentification arrêtent l'exécution. `oma doctor --profile` affiche l'URL et le modèle effectifs, les surcharges d'environnement, la présence de la clé et l'état de préparation du serveur sans afficher la clé. La disponibilité du serveur ne garantit pas que le modèle dispose d'un quota suffisant pour terminer une tâche.

FreeLLMAPI gère le basculement de fournisseur au niveau de la requête. Le basculement explicite de fournisseur fondé sur des checkpoints par OMA reste un mécanisme distinct de récupération de processus ; chaque successeur en mode free doit toujours utiliser un transport FreeLLMAPI pris en charge. Aucun retour automatique vers une configuration de fournisseur payante n'est effectué.

Le preset free configure l'inférence des agents. Il ne modifie pas la configuration d'embedding des services mémoire existants. FreeLLMAPI expose aussi `/v1/embeddings` ; lors de la configuration séparée d'un magasin vectoriel, fixez une famille de modèles afin que les vecteurs existants conservent un espace compatible.

Références amont : [configuration du client](https://github.com/tashfeenahmed/freellmapi/blob/main/docs/en/clients/01-agent-clients.md), [API et familles d'embeddings](https://github.com/tashfeenahmed/freellmapi/blob/main/docs/en/api/01-rest-api.md).

## Surcharger des agents individuels

Utilisez la map `agents:` pour surcharger certains agents par-dessus le preset actif. Seuls les agents listés sont concernés ; les autres suivent les réglages du fournisseur en mode auto ou les valeurs par défaut du preset fixe sélectionné.

```yaml
# .agents/oma-config.yaml
language: en
model_preset: auto

agents:
  backend: { model: openai/gpt-5.5, effort: high }
  qa:      { model: anthropic/claude-sonnet-4-6 }
```

Chaque entrée est un objet `AgentSpec` :

| Champ | Type | Obligatoire | Description |
|:------|:-----|:---------|:-----------|
| `model` | string | Oui | Slug de modèle (intégré ou défini par l'utilisateur) |
| `effort` | `none` \| `low` \| `medium` \| `high` \| `xhigh` | Non | Effort de raisonnement (ignoré par les modèles qui ne le prennent pas en charge) |
| `thinking` | boolean | Non | Activer la réflexion étendue (selon le modèle) |
| `memory` | `user` \| `project` \| `local` | Non | Portée mémoire de l'agent |

Les identifiants d'agents valides sont : `orchestrator`, `architecture`, `qa`, `pm`, `backend`, `frontend`, `mobile`, `db`, `debug`, `refactor`, `docs`, `tf-infra`, `explore` et `eval`. Les presets intégrés ne définissent pas `eval` : il utilise donc l'entrée `orchestrator` du preset, sauf si vous le surchargez.

La fusion est superficielle : chaque champ de votre surcharge remplace le champ correspondant du preset. Les champs omis conservent la valeur du preset.

---

## Intégrer des slugs de modèles {#inlining-model-slugs}

Enregistrez sous `models:` les slugs de modèles qui ne figurent pas encore dans le registre intégré. Une fois enregistrés, référencez le slug depuis `agents:` ou `custom_presets:`.

```yaml
# .agents/oma-config.yaml
models:
  antigravity/gemini-3.1-pro-low:
    cli: antigravity
    cli_model: "Gemini 3.1 Pro (Low)"   # exact display ID from `agy models`
    auth_hint: "Requires Antigravity CLI sign-in (Google AI Pro tier)"
    supports:
      effort: null
      apply_patch: false
      task_budget: false
      prompt_cache: true
      computer_use: false
      native_dispatch_from: [antigravity]
      api_only: false
```

Deux règles s'appliquent à un slug enregistré que vous référencez depuis `agents:` :

1. **La clé doit avoir la forme `owner/model`.** `agents.<id>.model` est validé selon un motif `owner/model` ; une clé simple comme `my-fast-model` est donc refusée. Utilisez une clé avec barre oblique comme `antigravity/gemini-3.1-pro-low` (ou le slug `provider/model` propre au fournisseur).
2. **La spécification doit être complète et valide.** `cli`, `cli_model`, `auth_hint` et tous les champs `supports` sont requis lors de la résolution. `cli` doit valoir `antigravity`, `claude`, `codex`, `commandcode`, `cursor`, `grok`, `kimi`, `kiro`, `qwen` ou `opencode` ; les entrées de `native_dispatch_from` doivent valoir `antigravity`, `claude`, `codex`, `cursor`, `kimi`, `kiro`, `opencode` ou `qwen`. `gemini` n'est une valeur valide pour aucun des deux. Une spécification invalide journalise `[model-registry] User inline model "<slug>" failed validation — falling back to core registry` ; si le registre principal ne contient pas ce slug, le dispatch s'arrête avec une erreur de slug inconnu.

> Si un slug défini par l'utilisateur entre en collision avec un slug intégré, la définition utilisateur gagne et un avertissement est émis.

---

## Presets personnalisés

Définissez des presets supplémentaires dans `custom_presets:`. Utilisez `extends:` pour hériter de toutes les valeurs par défaut d'agents d'un preset intégré et ne remplacer que les agents concernés.

```yaml
# .agents/oma-config.yaml
language: en
model_preset: my-team

custom_presets:
  my-team:
    extends: claude              # base preset — partial merge
    description: "Team A — sonnet base, codex for implementation"
    agent_defaults:
      backend: { model: openai/gpt-5.5, effort: high }
      db:      { model: openai/gpt-5.5, effort: high }
      # all other agents inherited from claude
```

Sans `extends:`, définissez au moins `orchestrator` : chaque rôle omis par le preset utilise son entrée `orchestrator`. Avec `extends:`, seuls les éléments listés sont remplacés ; les autres sont hérités du preset de base. `extends` peut désigner un preset intégré ou un autre preset personnalisé, et une chaîne circulaire est une erreur. Un preset personnalisé portant le nom d'un preset intégré (par exemple `claude`) est ignoré ; le preset intégré l'emporte.

---

## `oma doctor --profile`

Exécutez `oma doctor --profile` pour inspecter la matrice de modèles entièrement résolue, après fusion des valeurs par défaut du preset, de `custom_presets` et des surcharges `agents:`.

```bash
oma doctor --profile
```

**Exemple de sortie** (abrégé : `model_preset: mixed` avec une surcharge `backend` ; une exécution réelle liste les 13 rôles, et le terminal dessine chaque section dans un cadre) :

```text
 Profile Health (mixed)

 Configuration sources
   shared: <project>/.agents/oma-config.yaml

 Auth Status Matrix
┌──────────────┬────────────────────────────────────┬──────────────┬────────────────┐
│ Role         │ Model                              │ CLI          │ Auth Status    │
├──────────────┼────────────────────────────────────┼──────────────┼────────────────┤
│ orchestrator │ anthropic/claude-sonnet-4-6        │ claude       │ ✓ logged in    │
│ architecture │ anthropic/claude-opus-4-7          │ claude       │ ✓ logged in    │
│ qa (preset)  │ anthropic/claude-sonnet-4-6        │ claude       │ ✓ logged in    │
│ backend (over│ openai/gpt-5.5                     │ codex        │ ✓ logged in    │
│ explore (pres│ openai/gpt-5.4-mini                │ codex        │ ✓ logged in    │
└──────────────┴────────────────────────────────────┴──────────────┴────────────────┘

 Profile health check complete (mixed)
```

Chaque ligne indique le rôle, le slug de modèle résolu, la CLI qui l'exécute et son état d'authentification. La cellule du rôle porte une étiquette de source : `(preset)`, `(override)` ou `(vendor)` pour les agents qui héritent des réglages du fournisseur sous `auto`. La colonne Role fait 14 caractères de large : les étiquettes longues sont donc tronquées, comme ci-dessus. Utilisez cette commande lorsqu'un sous-agent choisit un fournisseur inattendu.

---

## Migration depuis `agent_cli_mapping`

La migration 008 s'exécute automatiquement avec `oma install` et `oma update`. Elle convertit les projets hérités sur place :

| Configuration héritée | Résultat après la migration 008 |
|:-------------|:--------------------------|
| Toutes les entrées utilisent le même fournisseur (par exemple toutes `claude`) | `model_preset` défini sur le preset de ce fournisseur (l'ancien `gemini` correspond à `antigravity`), sans `agents:` |
| Fournisseurs mixtes | Fournisseur le plus fréquent → `model_preset` ; les autres → surcharges `agents:` |
| Valeurs d'objet `AgentSpec` | Déplacées telles quelles dans `agents:` |
| Contenu de `models.yaml` | Intégré dans `oma-config.yaml.models` |
| `defaults.yaml` personnalisé | Conservé sous `custom_presets.user-customized` avec un avertissement |

Les originaux sont sauvegardés dans `.agents/backup/008-model-preset/<timestamp>-<pid>/` avant toute modification (`~/.oma/backup/008-model-preset/...` pour l'installation globale). La migration est idempotente. Si `model_preset` est déjà présent, elle est ignorée.

<!-- oma-docs:ignore-start -->
Après la migration, `.agents/config/defaults.yaml`, `.agents/config/models.yaml` et le répertoire `.agents/config/` sont supprimés.
<!-- oma-docs:ignore-end -->

---

## Plafond de quota de session

Ajoutez `session.quota_cap` à `oma-config.yaml` pour limiter la création incontrôlée de sous-agents :

```yaml
session:
  quota_cap:
    tokens: 2000000      # plain digits: YAML reads 2_000_000 as a string, which disables the cap
    spawn_count: 40
    per_vendor:          # dispatch vendor IDs (claude, codex, antigravity, ...), not model owners
      claude: 1200000
      codex: 600000
      antigravity: 200000
```

Lorsqu'un plafond est atteint, `oma agent spawn` refuse le lancement suivant et échoue avec `[session-cost] Quota cap exceeded for session <id>: <dimension> (current: N, limit: M)`. L'utilisation des tokens est estimée à partir de la longueur du prompt : `spawn_count` est donc la limite la plus prévisible. Règles des champs : [Plafonds de quota de session](/docs/guide/configuration-reference#session-quota-caps).

---

## Exemple complet

```yaml
# .agents/oma-config.yaml
language: en
model_preset: my-team

agents:
  frontend: { model: anthropic/claude-sonnet-4-6 }

models:
  antigravity/gemini-3.1-pro-low:
    cli: antigravity
    cli_model: "Gemini 3.1 Pro (Low)"   # exact display ID from `agy models`
    auth_hint: "Requires Antigravity CLI sign-in (Google AI Pro tier)"
    supports:
      effort: null
      apply_patch: false
      task_budget: false
      prompt_cache: true
      computer_use: false
      native_dispatch_from: [antigravity]
      api_only: false

custom_presets:
  my-team:
    extends: claude
    description: "Sonnet base, Codex for backend/db"
    agent_defaults:
      backend: { model: openai/gpt-5.5, effort: high }
      db:      { model: openai/gpt-5.5, effort: high }

session:
  quota_cap:
    tokens: 2000000
    spawn_count: 40
```

Exécutez `oma doctor --profile` pour confirmer la résolution, puis démarrez un workflow comme d'habitude.

---

## Dispatch via pi (runtime de transport) {#dispatching-through-pi-transport-runtime}

[pi](https://github.com/earendil-works/pi) (Earendil) est un runtime proxy multi-fournisseurs plutôt qu'un propriétaire de modèles : il peut exécuter tout modèle d'un vrai fournisseur (Anthropic, OpenAI ou Google) avec une seule CLI. oma traite pi comme une **couche de transport** : votre `model_preset` et vos surcharges `agents:` restent exactement tels quels, et pi devient la CLI qui exécute un agent donné.

Dispatchez n'importe quel agent via pi avec la surcharge `--vendor pi` :

```bash
oma agent spawn backend "Implement the export endpoint" <session> --vendor pi
```

Voici ce qui se passe :

- Le modèle par agent résolu depuis votre preset ou vos surcharges (par exemple `openai/gpt-5.5`) est converti au format `--model <provider/id>` de pi, et `effort` est converti en niveau `--thinking`. **Les modèles par sous-agent fonctionnent avec pi exactement comme en natif** : différents agents peuvent utiliser différents modèles.
- La persona de l'agent (son prompt système) est intégrée depuis `.agents/agents/<id>.md`, car pi ne possède pas de fichier d'agent propre au fournisseur auquel se référer.
- L'authentification est celle configurée pour pi (`~/.pi/agent/auth.json` ou une clé API de fournisseur dans l'environnement). `oma doctor` signale l'installation et l'authentification pi avec les autres CLI.

**Contrainte :** pi n'exécute que des modèles de vrais fournisseurs. Les presets propriétaires de CLI (`cursor`, `kiro`, `qwen`, `antigravity`) nomment des modèles qui n'existent que dans leurs propres CLI ; leur dispatch via pi est donc refusé avec une erreur explicite. Pour router des agents par pi, utilisez `claude`, `codex` ou `mixed`, ou des surcharges `agents.<id>` dont les modèles sont des slugs `anthropic/`, `openai/` ou `google/`. `gemini` est un alias d'`antigravity` : pi le refuse donc.

> Le catalogue de modèles de pi dépend de la version et de l'authentification. Si un slug résolu ne correspond pas à ce que votre installation pi expose, vérifiez `pi --list-models` ; la correspondance de `--model` dans pi est approximative, de sorte que la plupart des slugs de fournisseurs sont résolus tels quels.

### Modèles absents du registre intégré de pi (par exemple Z.ai GLM)

pi résout `--model` dans son **registre de modèles intégré**, et son réglage `defaultProvider` n'est consulté qu'en l'absence de modèle transmis. Pour Z.ai, pi ne fournit qu'un sous-ensemble d'identifiants GLM (`glm-4.7`, `glm-4.5-air`, `glm-5-turbo`, `glm-5.1`, `glm-5v-turbo` dans pi 0.80.x) ; un preset qui nomme un autre identifiant ne pourra pas être résolu.

Deux méthodes permettent de gérer ce cas :

1. **Identifiants du registre** : limitez votre preset aux identifiants du registre. Utilisez la forme `provider/id` (par exemple `zai/glm-4.7`) pour fixer explicitement le fournisseur ; oma le transmet tel quel à `--model` de pi.
2. **Identifiants non enregistrés** : enregistrez-les avec une extension pi. Le champ `api` doit nommer un des **identifiants d'adaptateur d'API** de pi (`openai-completions`, `anthropic-messages`, …), et non le nom du fournisseur. Les noms de fournisseurs comme `"zai"` ou les raccourcis comme `"openai"` ne sont pas des identifiants d'adaptateur et provoquent à l'exécution `No API provider registered for api: …`.

```typescript
// ~/.pi/agent/extensions/zai-glm-models/index.ts  (or <project>/.pi/extensions/)
export default function (pi: ExtensionAPI) {
  pi.registerProvider("zai", {
    baseUrl: "https://api.z.ai/api/coding/paas/v4",
    api: "openai-completions", // adapter id, NOT "zai"
    apiKey: "$ZAI_API_KEY",
    models: [
      { id: "glm-4.7-flash", api: "openai-completions", /* … */ },
      // NOTE: `models` replaces ALL existing models for the provider —
      // re-declare the built-in ids here if you still want them.
    ],
  });
}
```

Vérifiez avec `pi --list-models` avant d'intégrer les identifiants dans un preset.

---

## Dispatch via OpenCode

[OpenCode](https://opencode.ai) est un fournisseur de type extension : comme pi, il ne possède pas de modèles, mais exécute ceux de son propre catalogue — le fournisseur gratuit `opencode`, l'abonnement économique `opencode-go` et la passerelle `opencode-zen`. oma l'intègre comme un **fournisseur de plugin en processus** : opencode charge automatiquement `.opencode/plugins/oma/` au lieu d'enregistrer des hooks dans un fichier de réglages, et résout la persona de chaque agent depuis les fichiers `.opencode/agents/<id>.md` générés.

### Dispatch explicite

Routez n'importe quel agent via opencode avec la surcharge `--vendor opencode` :

```bash
oma agent spawn pm "Draft the rollout plan" <session> --vendor opencode
```

Cette commande exécute `opencode run --agent pm --dir <workspace> "<prompt>"`. Le prompt est un **argument positionnel final** : l'option `-p` d'opencode signifie `--password`, et non le prompt.

### Modèles OpenCode par agent

Pour router des agents précis vers un modèle opencode, enregistrez le modèle sous `models:` et référencez-le depuis `agents:`. Deux conditions s'appliquent (voir [Intégrer des slugs de modèles](#inlining-model-slugs)) :

1. **Le slug doit avoir la forme `owner/model`.** Utilisez le slug `provider/model` d'opencode comme clé du registre ; les noms simples sont refusés par le schéma `agents.<id>.model`.
2. **La spécification doit être complète** : `cli`, `cli_model`, `auth_hint` et chaque champ `supports`. Une spécification incomplète échoue à la validation ; OMA journalise un avertissement et revient au registre principal, si bien que l'agent ne serait pas routé vers opencode.

```yaml
# .agents/oma-config.yaml
language: en
model_preset: claude          # heavier impl roles stay on Claude

models:
  opencode-go/deepseek-v4-flash:
    cli: opencode
    cli_model: opencode-go/deepseek-v4-flash
    auth_hint: "OpenCode Go subscription — run: opencode auth login"
    supports:
      effort: null
      apply_patch: false
      task_budget: false
      prompt_cache: false
      computer_use: false
      native_dispatch_from: [opencode]
      api_only: false

agents:
  pm:      { model: opencode-go/deepseek-v4-flash }
  qa:      { model: opencode-go/deepseek-v4-flash }
  docs:    { model: opencode-go/deepseek-v4-flash }
  explore: { model: opencode-go/deepseek-v4-flash }
```

Chaque agent routé exécute `opencode run -m opencode-go/deepseek-v4-flash
--agent <id> --dir <workspace> "<prompt>"`. Ce modèle convient aux rôles légers et rapides (pm, qa, docs, explore), tandis que les agents d'implémentation plus lourds restent sur Codex/Claude/etc.

### Valider un slug de modèle

Le catalogue d'opencode dépend de l'abonnement et de la connexion ; oma ne code donc **pas** en dur les slugs de modèles opencode. Validez-en un dans le catalogue installé :

```bash
oma model probe opencode-go/deepseek-v4-flash --json   # accepted | rejected | auth_required
opencode models opencode-go                            # list everything your plan exposes
```

`oma model probe` indique `accepted` lorsque le slug est listé par `opencode models`, `rejected` lorsqu'il ne l'est pas et `auth_required` lorsque le fournisseur demande une connexion ou un abonnement.

### Authentification et fichiers générés

- **Authentification :** `opencode auth login` stocke les identifiants dans `~/.local/share/opencode/auth.json`, une entrée par fournisseur. `oma auth status` / `oma doctor` signalent opencode comme authentifié dès qu'un fournisseur possède un identifiant. `oma doctor --profile` est plus précis par fournisseur : chaque ligne est vérifiée avec le préfixe du fournisseur de son `cli_model` enregistré ; ainsi, un modèle dont `cli_model: zai-coding-plan/glm-5.3` est contrôlé avec l'identifiant `zai-coding-plan`. Une ligne dont le modèle ne possède pas de `provider/model` `cli_model` enregistré affiche `? unknown` plutôt qu'un échec d'authentification certain.
- **Fichiers générés :** `oma link` (ou `oma link opencode`) écrit une persona `.opencode/agents/<id>.md` par agent ainsi que le pont `.opencode/plugins/oma/`. Ces fichiers sont générés depuis la SSOT `.agents/` : ne les modifiez pas directement ; relancez `oma link` pour les régénérer.

> **Note sur les workflows persistants :** l'événement `session.idle` d'opencode (son équivalent le plus proche du hook Claude `Stop`) sert uniquement aux notifications et ne peut pas empêcher la fin de la session. Les workflows persistants (orchestrate / work / ultrawork) fonctionnent donc avec une sémantique Stop **dégradée** sous opencode : le renforcement du workflow a lieu au message suivant plutôt qu'en maintenant la session ouverte.

---

## Dispatch via Kimi Code CLI

[Kimi Code CLI](https://www.kimi.com/code) ne lit les **hooks** que dans une configuration globale (`~/.kimi-code/config.toml`, `KIMI_CODE_HOME`). `oma install`/`oma link` écrivent donc la chaîne de hooks Kimi et ses liens symboliques de compétences dans le HOME avec un consentement explicite (comme Antigravity). Kimi analyse aussi directement la SSOT `.agents/skills/` d'oma, de sorte que les compétences se résolvent à l'échelle du projet. Le **MCP** n'écrit rien dans le HOME et reste propre au projet : il est écrit selon le mode dans `<cwd>/.kimi-code/mcp.json` (projet) ou `~/.kimi-code/mcp.json` (global).

### Dispatch explicite

Routez n'importe quel agent via Kimi avec la surcharge `--vendor kimi` :

```bash
oma agent spawn pm "Draft the rollout plan" <session> --vendor kimi
```

Cette commande exécute `kimi -p "<prompt>"`. Le mode `-p` (non interactif) de Kimi approuve automatiquement les appels d'outils ordinaires avec sa politique d'autorisation `auto` ; oma n'ajoute donc **pas** `--yolo`/`--auto` (ces options sont mutuellement exclusives avec `-p`).

### Modèles Kimi par agent

Comme pour opencode, oma ne code **pas** en dur le catalogue de modèles Kimi (la gamme de Kimi dépend du fournisseur et de l'abonnement). Pour router des agents précis vers un modèle Kimi, enregistrez une spécification complète sous `models:` avec `cli: kimi`, puis référencez-la depuis `agents:` :

La clé du registre doit avoir la forme `owner/model` (les noms simples sont refusés par le schéma `agents.<id>.model`) et `cli_model` est l'alias exact transmis à `kimi --model` ; l'alias de programmation documenté par Kimi est `kimi-code/kimi-for-coding`. Confirmez l'alias exposé par votre abonnement avec `kimi --model <alias>` avant de le valider.

```yaml
# .agents/oma-config.yaml
models:
  kimi-code/kimi-for-coding:
    cli: kimi
    cli_model: kimi-code/kimi-for-coding
    auth_hint: "Kimi subscription — run: kimi login"
    supports:
      effort: null
      apply_patch: false
      task_budget: false
      prompt_cache: false
      computer_use: false
      native_dispatch_from: []
      api_only: false

agents:
  pm:   { model: kimi-code/kimi-for-coding }
  docs: { model: kimi-code/kimi-for-coding }
```

Chaque agent routé exécute `kimi --model kimi-code/kimi-for-coding -p "<prompt>"`.

> **Note sur les workflows persistants :** le chemin Stop bloquant documenté de Kimi est le code de sortie 2 / stderr, mais le routeur `oma hook run` quitte toujours avec le code 0 et émet un dialecte stdout. oma émet au mieux `permissionDecision: "deny"` (ainsi que `decision: "block"` au format Claude) afin que les workflows persistants se dégradent proprement sous Kimi.
