---
title: "Guide : Configuration des modèles par agent"
description: Configurez le modèle d'IA utilisé par chaque agent via model_preset dans oma-config.yaml. Couvre les presets intégrés, les surcharges par agent, les définitions de modèles en ligne, les presets personnalisés avec extends, oma doctor --profile, ainsi que la migration depuis l'ancien agent_cli_mapping.
---

# Guide : Configuration des modèles par agent

## Vue d'ensemble

`model_preset` est l'unique notion qui contrôle le modèle utilisé par chaque agent. Choisissez l'un des presets intégrés et chaque agent (pm, backend, frontend, qa, …) sera relié à un modèle adapté à la pile du fournisseur correspondant. Surchargez ensuite des agents individuels selon vos besoins. Définissez des presets supplémentaires lorsque votre équipe utilise une combinaison non standard.

Toute la configuration tient dans un seul fichier : `.agents/oma-config.yaml`.

Cette page couvre :

1. Les presets intégrés
2. La surcharge d'agents individuels via la table `agents:`
3. L'ajout en ligne de slugs de modèles personnalisés via `models:`
4. La définition de presets personnalisés avec `custom_presets:` et `extends:`
5. L'inspection de la configuration résolue avec `oma doctor --profile`
6. La migration depuis l'ancien `agent_cli_mapping`

---

## Presets intégrés

Affectez à `model_preset` l'une des clés intégrées :

```yaml
# .agents/oma-config.yaml
language: en
model_preset: antigravity
```

| Clé | Description | Idéal pour |
|:----|:-----------|:-----------|
| `antigravity` | Tous les agents utilisent Antigravity CLI (`agy`) : Gemini 3.1 Pro pour l'implémentation/architecture, Gemini 3.5 Flash pour l'orchestration et la recherche. La sélection du modèle est pilotée par la configuration interne de `agy` — les flags `--model` et `--thinking-budget` ne sont pas exposés. | Utilisateurs de l'Antigravity CLI |
| `claude` | Tous les agents utilisent Claude (Sonnet/Opus) | Détenteurs d'un abonnement Claude Max |
| `codex` | Tous les agents utilisent OpenAI Codex (GPT-5.x) avec des niveaux d'effort | Utilisateurs de ChatGPT Plus/Pro |
| `gemini` | Tous les agents utilisent Gemini CLI, avec thinking activé pour les rôles d'implémentation | Utilisateurs de Google AI Pro |
| `qwen` | Tous les agents sont routés en externe via Qwen Code ; thinking binaire (sans niveaux d'effort) | Inférence locale ou auto-hébergée |
| `cursor` | Tous les agents utilisent Cursor `composer-2.5` (`composer-2.5-fast` pour orchestrator/qa/pm/docs/explore) | Abonnés Cursor Pro / Pro Student |
| `mixed` | Mixte : les rôles d'implémentation utilisent Codex, architecture/qa/pm utilisent Claude, et la recherche utilise Gemini | Tirer parti des forces de plusieurs fournisseurs sans gérer une configuration par agent |

Les presets intégrés sont livrés dans le paquet CLI et se mettent à jour automatiquement lorsque vous mettez à niveau `oh-my-agent`. Aucun fichier local à maintenir.

---

## Surcharger des agents individuels

Utilisez la table `agents:` pour surcharger des agents spécifiques par-dessus le preset actif. Seuls les agents que vous listez sont affectés ; les autres conservent les valeurs par défaut du preset.

```yaml
# .agents/oma-config.yaml
language: en
model_preset: antigravity

agents:
  backend: { model: openai/gpt-5.5, effort: high }
  qa:      { model: anthropic/claude-sonnet-4-6 }
```

Chaque entrée est un objet `AgentSpec` :

| Champ | Type | Requis | Description |
|:------|:-----|:-------|:-----------|
| `model` | string | Oui | Slug du modèle (intégré ou défini par l'utilisateur) |
| `effort` | `low` \| `medium` \| `high` | Non | Effort de raisonnement (ignoré sur les modèles qui ne le prennent pas en charge) |
| `thinking` | boolean | Non | Active le thinking étendu (spécifique au modèle) |
| `memory` | `user` \| `project` \| `local` | Non | Portée de la mémoire pour l'agent |

Identifiants d'agent valides : `orchestrator`, `architecture`, `qa`, `pm`, `backend`, `frontend`, `mobile`, `db`, `debug`, `tf-infra`, `explore`.

La fusion est superficielle : chaque champ de votre surcharge remplace la valeur du preset pour ce champ. Les champs que vous omettez conservent la valeur du preset.

---

## Slugs de modèles en ligne

Enregistrez les slugs de modèles qui ne figurent pas encore dans le registre intégré sous `models:`. Une fois enregistrés, utilisez le slug n'importe où dans `agents:` ou `custom_presets:`.

```yaml
# .agents/oma-config.yaml
models:
  my-fast-model:
    cli: gemini
    cli_model: gemini-3-flash
    supports:
      native_dispatch_from: [gemini]
      thinking: true
```

> Si un slug défini par l'utilisateur entre en collision avec un slug intégré, la définition utilisateur l'emporte et un avertissement est émis.

---

## Presets personnalisés

Définissez des presets supplémentaires dans `custom_presets:`. Utilisez `extends:` pour hériter de toutes les valeurs par défaut d'un preset intégré et ne surcharger que les agents qui vous intéressent.

```yaml
# .agents/oma-config.yaml
language: en
model_preset: my-team

custom_presets:
  my-team:
    extends: claude              # preset de base — fusion partielle
    description: "Équipe A — base sonnet, codex pour l'implémentation"
    agent_defaults:
      backend: { model: openai/gpt-5.5, effort: high }
      db:      { model: openai/gpt-5.5, effort: high }
      # tous les autres agents hérités de claude
```

Sans `extends:`, vous devez fournir `agent_defaults` pour les 11 rôles d'agent. Avec `extends:`, seules les entrées que vous listez sont surchargées ; les autres sont héritées du preset de base.

---

## `oma doctor --profile`

Exécutez `oma doctor --profile` pour inspecter la matrice de modèles entièrement résolue, après fusion des valeurs par défaut du preset, des `custom_presets` et des surcharges `agents:`.

```bash
oma doctor --profile
```

**Exemple de sortie :**

```
oh-my-agent — Profile Health (preset=mixed)

┌──────────────┬──────────────────────────────┬──────────┬──────────────────┬──────────┐
│ Role         │ Model                        │ CLI      │ Auth Status      │ Source   │
├──────────────┼──────────────────────────────┼──────────┼──────────────────┼──────────┤
│ orchestrator │ anthropic/claude-sonnet-4-6  │ claude   │ ✓ logged in      │ (preset) │
│ architecture │ anthropic/claude-opus-4-7    │ claude   │ ✓ logged in      │ (preset) │
│ qa           │ anthropic/claude-sonnet-4-6  │ claude   │ ✓ logged in      │ (preset) │
│ backend      │ openai/gpt-5.5         │ codex    │ ✗ not logged in  │ (override)│
│ explore    │ google/gemini-3.1-flash-lite │ gemini   │ ✗ not logged in  │ (preset) │
└──────────────┴──────────────────────────────┴──────────┴──────────────────┴──────────┘
```

Chaque ligne indique le slug de modèle résolu et la source qui l'a appliqué (`(preset)` ou `(override)`). Utilisez cette commande dès qu'un sous-agent sélectionne un fournisseur inattendu.

---

## Migration depuis l'ancien `agent_cli_mapping`

La migration 008 s'exécute automatiquement lors de `oma install` et `oma update`. Elle convertit sur place les projets existants :

| Configuration héritée | Résultat après la migration 008 |
|:----------------------|:--------------------------------|
| Toutes les entrées sur le même fournisseur (par exemple, tout en `gemini`) | `model_preset: gemini`, sans `agents:` |
| Fournisseurs mixtes | Fournisseur le plus fréquent → `model_preset` ; les autres → surcharges `agents:` |
| Valeurs sous forme d'objet `AgentSpec` | Déplacées telles quelles vers `agents:` |
| Contenu de `models.yaml` | Intégré en ligne dans `oma-config.yaml.models` |
| `defaults.yaml` personnalisé | Préservé en tant que `custom_presets.user-customized` avec un avertissement |

Les originaux sont sauvegardés dans `.agents/.backup-pre-008-{timestamp}/` avant toute modification. La migration est idempotente : si `model_preset` est déjà présent, elle est ignorée.

Après la migration, `.agents/config/defaults.yaml`, `.agents/config/models.yaml` et le répertoire `.agents/config/` sont supprimés.

---

## Plafond de quota de session

`session.quota_cap` est inchangé. Ajoutez-le à `oma-config.yaml` pour limiter le spawn incontrôlé de sous-agents :

```yaml
session:
  quota_cap:
    tokens: 2_000_000
    spawn_count: 40
    per_vendor:
      claude: 1_200_000
      openai: 600_000
      google: 200_000
```

Lorsqu'un plafond est atteint, l'orchestrateur refuse les nouveaux spawns et expose un statut `QUOTA_EXCEEDED`.

---

## Exemple complet

```yaml
# .agents/oma-config.yaml
language: en
model_preset: my-team

agents:
  frontend: { model: anthropic/claude-sonnet-4-6 }

models:
  my-fast-model:
    cli: gemini
    cli_model: gemini-3-flash
    supports: { native_dispatch_from: [gemini], thinking: true }

custom_presets:
  my-team:
    extends: claude
    description: "Base Sonnet, Codex pour backend/db"
    agent_defaults:
      backend: { model: openai/gpt-5.5, effort: high }
      db:      { model: openai/gpt-5.5, effort: high }

session:
  quota_cap:
    tokens: 2_000_000
    spawn_count: 40
```

Exécutez `oma doctor --profile` pour confirmer la résolution, puis lancez un workflow comme d'habitude.

---

## Dispatch via OpenCode

[OpenCode](https://opencode.ai) est un fournisseur de classe extension : comme pi,
ce n'est pas un propriétaire de modèles, mais une CLI qui exécute des modèles issus
de son propre catalogue — le fournisseur gratuit `opencode`, le plan d'abonnement
économique `opencode-go` et la passerelle `opencode-zen`. oma l'intègre en tant que
**fournisseur à plugin in-process** : opencode charge automatiquement
`.opencode/plugins/oma/` au lieu d'enregistrer des hooks dans un fichier de
paramètres, et résout la persona de chaque agent à partir de fichiers
`.opencode/agents/<id>.md` générés.

### Dispatch explicite

Acheminez n'importe quel agent via opencode avec la surcharge `-m opencode` :

```bash
oma agent spawn pm "Draft the rollout plan" <session> --vendor opencode
```

Cela exécute `opencode run --agent pm --dir <workspace> "<prompt>"`. Le prompt est un
**argument positionnel en fin de commande** — le flag `-p` d'opencode signifie
`--password`, et non le prompt.

### Modèles OpenCode par agent

Pour acheminer des agents spécifiques vers un modèle opencode, enregistrez le modèle
sous `models:` et référencez-le depuis `agents:`. Deux exigences s'appliquent (voir
[Slugs de modèles en ligne](#inlining-model-slugs)) :

1. **Le slug doit être au format `owner/model`.** Utilisez le slug opencode
   `provider/model` comme clé du registre — les noms nus sont rejetés par le schéma
   `agents.<id>.model`.
2. **La spécification doit être complète** — `cli`, `cli_model`, `auth_hint` et chaque
   booléen `supports`. Une spécification incomplète échoue à la validation et retombe
   silencieusement sur le registre central (l'agent ne serait donc pas acheminé vers
   opencode).

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

Chaque agent ainsi acheminé déclenche `opencode run -m opencode-go/deepseek-v4-flash
--agent <id> --dir <workspace> "<prompt>"`. C'est un bon choix pour les rôles légers
et rapides (pm, qa, docs, explore), tandis que les agents d'implémentation plus lourds
restent sur Codex/Claude/etc.

### Valider un slug de modèle

Le catalogue d'opencode est soumis à abonnement et à connexion ; oma ne code donc
**pas en dur** les slugs de modèles opencode. Validez-en un par rapport à votre
catalogue installé :

```bash
oma model probe opencode-go/deepseek-v4-flash --json   # accepted | rejected | auth_required
opencode models opencode-go                            # list everything your plan exposes
```

`oma model probe` renvoie `accepted` lorsque le slug est listé par `opencode models`,
`rejected` lorsqu'il ne l'est pas, et `auth_required` lorsque le fournisseur requiert
une connexion ou un abonnement.

### Authentification et fichiers générés

- **Authentification :** `opencode auth login` stocke les identifiants dans
  `~/.local/share/opencode/auth.json`. `oma auth status` / `oma doctor` rapportent
  l'authentification opencode aux côtés des autres CLI au niveau du vendor (authentifié dès qu'un
  fournisseur possède des identifiants). En revanche, `oma doctor --profile` tient compte
  du fournisseur : chaque ligne est vérifiée avec le préfixe de fournisseur de
  son `cli_model` enregistré, donc un modèle avec
  `cli_model: zai-coding-plan/glm-5.3` est vérifié avec l'identifiant
  `zai-coding-plan`. Une ligne dont le modèle n'a pas de `cli_model` enregistré
  sous la forme `provider/model` affiche `? unknown` plutôt qu'un échec
  d'authentification certain.
- **Fichiers générés :** `oma link` (ou `oma link opencode`) écrit une persona
  `.opencode/agents/<id>.md` par agent, ainsi que le pont `.opencode/plugins/oma/`.
  Ceux-ci sont générés à partir de la SSOT `.agents/` — ne les modifiez pas
  directement ; relancez `oma link` pour les régénérer.

> **Note sur les workflows persistants :** l'événement `session.idle` d'opencode (son
> équivalent le plus proche du hook `Stop` de Claude) sert uniquement de notification
> et ne peut pas empêcher la session de se terminer. Les workflows persistants
> (orchestrate / work / ultrawork) s'exécutent donc avec une **sémantique Stop dégradée**
> sous opencode — le renforcement du workflow intervient au message suivant plutôt qu'en
> maintenant la session ouverte.
