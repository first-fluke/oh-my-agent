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
| `cursor` | Tous les agents utilisent Cursor `composer-2.5` (`composer-2.5-fast` pour orchestrator/qa/pm/docs/retrieval) | Abonnés Cursor Pro / Pro Student |
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

Identifiants d'agent valides : `orchestrator`, `architecture`, `qa`, `pm`, `backend`, `frontend`, `mobile`, `db`, `debug`, `tf-infra`, `retrieval`.

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
│ retrieval    │ google/gemini-3.1-flash-lite │ gemini   │ ✗ not logged in  │ (preset) │
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
