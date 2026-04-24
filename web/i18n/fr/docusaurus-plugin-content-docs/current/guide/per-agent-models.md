---
title: "Guide : configuration de modèle par agent"
description: Configurer différents fournisseurs de CLI, modèles et niveaux de raisonnement par agent via oma-config.yaml et models.yaml. Couvre agent_cli_mapping, les profils runtime, oma doctor --profile, models.yaml et le plafond de quota de session.
---

# Guide : configuration de modèle par agent

## Vue d'ensemble

oh-my-agent prend en charge la **sélection de modèle par agent** via `agent_cli_mapping`. Chaque agent (pm, backend, frontend, qa, …) peut cibler un fournisseur, un modèle et un niveau de raisonnement spécifiques de manière indépendante, au lieu de partager un fournisseur global unique.

Cette page couvre :

1. La hiérarchie à trois fichiers de configuration
2. Le format dual de `agent_cli_mapping`
3. Les presets de profils runtime
4. La commande `oma doctor --profile`
5. Les slugs de modèle définis par l'utilisateur dans `models.yaml`
6. Le plafond de quota de session

---

## Hiérarchie des fichiers de configuration

oh-my-agent lit la configuration depuis trois fichiers, par ordre de priorité (du plus élevé au plus bas) :

| Fichier | Rôle | Éditable ? |
|:--------|:-----|:-----------|
| `.agents/oma-config.yaml` | Overrides utilisateur — mapping agent-CLI, profil actif, quota de session | Oui |
| `.agents/config/models.yaml` | Slugs de modèle fournis par l'utilisateur (ajouts au registre intégré) | Oui |
| `.agents/config/defaults.yaml` | Base Profile B intégrée (5 `runtime_profiles`, fallbacks sûrs) | Non — SSOT |

> `defaults.yaml` fait partie du SSOT et ne doit pas être modifié directement. Toute personnalisation se fait dans `oma-config.yaml` et `models.yaml`.

---

## Format dual de `agent_cli_mapping`

`agent_cli_mapping` accepte deux formes de valeur pour permettre une migration progressive :

```yaml
# .agents/oma-config.yaml
agent_cli_mapping:
  pm: "claude"                        # legacy — fournisseur seul (modèle par défaut)
  backend:                            # nouvel objet AgentSpec
    model: "openai/gpt-5.3-codex"
    effort: high
  frontend:
    model: "anthropic/claude-sonnet-4-6"
    effort: medium
  qa:
    model: "google/gemini-3.1-pro-preview"
    effort: low
```

**Forme chaîne legacy** : `agent: "vendor"` — toujours valide ; utilise le modèle par défaut du fournisseur avec l'effort par défaut via le profil runtime correspondant.

**Forme objet AgentSpec** : `agent: { model, effort }` — fixe un slug de modèle précis et un niveau de raisonnement (`low`, `medium`, `high`).

Les deux formes se combinent librement. Les agents non déclarés retombent sur le `runtime_profile` actif, puis sur `agent_defaults` de niveau supérieur dans `defaults.yaml`.

---

## Profils runtime

`defaults.yaml` fournit Profile B avec cinq `runtime_profiles` prêts à l'emploi. Sélectionnez-en un dans `oma-config.yaml` :

```yaml
# .agents/oma-config.yaml
active_profile: claude-only   # voir les options ci-dessous
```

| Profil | Tous les agents routés vers | À utiliser quand |
|:-------|:----------------------------|:-----------------|
| `claude-only` | Claude Code (Sonnet/Opus) | Stack Anthropic homogène |
| `codex-only` | OpenAI Codex (GPT-5.x) | Stack purement OpenAI |
| `gemini-only` | Gemini CLI | Workflows orientés Google |
| `antigravity` | Mixte : impl→codex, architecture/qa/pm→claude, retrieval→gemini | Combiner les forces inter-fournisseurs |
| `qwen-only` | Qwen Code | Inférence locale / auto-hébergée |

Les profils permettent de remodeler rapidement toute la flotte sans modifier chaque ligne d'agent.

---

## `oma doctor --profile`

Le flag `--profile` affiche une vue matricielle indiquant, pour chaque agent, le fournisseur, le modèle et l'effort résolus — après la fusion de `oma-config.yaml`, `models.yaml` et `defaults.yaml`.

```bash
oma doctor --profile
```

**Exemple de sortie :**

```
oh-my-agent — Profile Health (runtime=claude)

┌──────────────┬──────────────────────────────┬──────────┬──────────────────┐
│ Role         │ Model                        │ CLI      │ Auth Status      │
├──────────────┼──────────────────────────────┼──────────┼──────────────────┤
│ orchestrator │ anthropic/claude-sonnet-4-6  │ claude   │ ✓ logged in      │
│ architecture │ anthropic/claude-opus-4-7    │ claude   │ ✓ logged in      │
│ qa           │ anthropic/claude-sonnet-4-6  │ claude   │ ✓ logged in      │
│ pm           │ anthropic/claude-sonnet-4-6  │ claude   │ ✓ logged in      │
│ backend      │ openai/gpt-5.3-codex         │ codex    │ ✗ not logged in  │
│ frontend     │ openai/gpt-5.4               │ codex    │ ✗ not logged in  │
│ retrieval    │ google/gemini-3.1-flash-lite │ gemini   │ ✗ not logged in  │
└──────────────┴──────────────────────────────┴──────────┴──────────────────┘
```

Chaque ligne affiche le slug de modèle résolu (après la fusion de `oma-config.yaml` + profil actif + `defaults.yaml`) et indique si vous êtes connecté au CLI qui exécutera ce rôle. Utilisez cette commande chaque fois qu'un subagent choisit un fournisseur inattendu.

---

## Ajouter des slugs dans `models.yaml`

`models.yaml` est optionnel et permet d'enregistrer des slugs de modèle absents du registre intégré — pratique pour les modèles fraîchement publiés.

```yaml
# .agents/config/models.yaml
models:
  - slug: "openai/gpt-5.5-spud"
    vendor: openai
    context_window: 1_000_000
    supports_effort: true
    default_effort: medium
    notes: "Preview — GPT-5.5 Spud release candidate"
```

Une fois enregistré, le slug est utilisable dans `agent_cli_mapping` :

```yaml
agent_cli_mapping:
  backend:
    model: "openai/gpt-5.5-spud"
    effort: high
```

Les slugs sont des identifiants — conservez exactement l'orthographe anglaise publiée par le fournisseur.

---

## Plafond de quota de session

Ajoutez `session.quota_cap` dans `oma-config.yaml` pour limiter les spawns incontrôlés de subagents :

```yaml
# .agents/oma-config.yaml
session:
  quota_cap:
    tokens: 2_000_000        # plafond total de tokens par session
    spawn_count: 40          # nombre max de subagents parallèles + séquentiels
    per_vendor:              # sous-plafonds de tokens par fournisseur
      claude: 1_200_000
      openai: 600_000
      google: 200_000
```

Lorsqu'un plafond est atteint, l'orchestrateur refuse tout nouveau spawn et retourne le statut `QUOTA_EXCEEDED`. Laisser un champ vide (ou omettre `quota_cap` entièrement) désactive la dimension correspondante.

---

## Tout mettre ensemble

Un `oma-config.yaml` réaliste :

```yaml
active_profile: antigravity

agent_cli_mapping:
  pm: "claude"
  backend:
    model: "openai/gpt-5.3-codex"
    effort: high
  frontend:
    model: "anthropic/claude-sonnet-4-6"
    effort: medium
  qa:
    model: "google/gemini-3.1-pro-preview"
    effort: low

session:
  quota_cap:
    tokens: 2_000_000
    spawn_count: 40
    per_vendor:
      claude: 1_200_000
      openai: 600_000
      google: 200_000
```

Lancez `oma doctor --profile` pour vérifier la résolution, puis démarrez le workflow comme d'habitude.


## Propriété des fichiers de configuration

| Fichier | Propriétaire | Modifiable en toute sécurité ? |
|---------|--------------|-------------------------------|
| `.agents/config/defaults.yaml` | SSOT fourni avec oh-my-agent | Non — à traiter en lecture seule |
| `.agents/oma-config.yaml` | Vous | Oui — personnalisez ici |
| `.agents/config/models.yaml` | Vous | Oui — ajoutez de nouveaux slugs ici |

`defaults.yaml` contient un champ `version:` afin que les nouvelles versions d'oh-my-agent puissent ajouter des `runtime_profiles`, de nouveaux slugs Profile B ou ajuster la matrice d'effort. Le modifier directement signifie que vous ne recevrez pas ces mises à jour automatiquement.

## Mise à jour de defaults.yaml

Lorsque vous récupérez une nouvelle version d'oh-my-agent, exécutez `oma install` — l'installateur compare la version locale de `defaults.yaml` avec celle fournie dans le paquet :

- **Correspondance** → aucun changement, silencieux.
- **Divergence** → avertissement :
  ```
  [install] .agents/config/defaults.yaml is 2.1.0; bundled is 2.2.0.
            Run 'oma install --update-defaults' to upgrade.
  ```
- **Divergence + `--update-defaults`** → la version du paquet écrase la vôtre :
  ```
  oma install --update-defaults
  # [install] Updated .agents/config/defaults.yaml (2.1.0 → 2.2.0)
  ```

`models.yaml` n'est jamais modifié par l'installateur. `oma-config.yaml` est également préservé, à une exception près : `oma install` réécrit la ligne `language:` et actualise le bloc `vendors:` en fonction des réponses que vous fournissez lors de l'installation. Tout autre champ que vous ajoutez (par ex., `agent_cli_mapping`, `active_profile`, `session.quota_cap`) est conservé d'une exécution à l'autre.

## Mise à jour depuis une installation antérieure à la version 5.16.0

Si votre projet est antérieur à la fonctionnalité de modèle/effort par agent :

1. Exécutez `oma install` (ou `oma update`) depuis la racine de votre projet. L'installateur dépose un `defaults.yaml` neuf dans `.agents/config/` et exécute la migration `003-oma-config`, qui déplace automatiquement tout `legacy .agents/config/user-preferences.yaml` vers `.agents/oma-config.yaml`.
2. Exécutez `oma doctor --profile`. Vos valeurs existantes `agent_cli_mapping: { backend: "gemini" }` sont résolues via `runtime_profiles.gemini-only.agent_defaults.backend`, de sorte que la matrice affiche automatiquement le bon slug et le bon CLI.
3. (Optionnel) Mettez à niveau les entrées chaîne legacy vers la nouvelle forme AgentSpec dans `oma-config.yaml` si vous souhaitez des overrides par agent pour `model`, `effort`, `thinking` ou `memory` :
   ```yaml
   agent_cli_mapping:
     backend:
       model: "openai/gpt-5.3-codex"
       effort: "high"
   ```
4. Si vous avez personnalisé `defaults.yaml`, `oma install` signalera la divergence de version au lieu d'écraser. Déplacez vos personnalisations dans `oma-config.yaml` / `models.yaml`, puis exécutez `oma install --update-defaults` pour accepter le nouveau SSOT.

Aucun changement incompatible pour `agent:spawn` — les configurations legacy continuent de fonctionner via un fallback gracieux pendant que vous migrez à votre rythme.
