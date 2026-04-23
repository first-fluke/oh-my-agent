---
title: "Guide : configuration de modèle par agent"
description: Configurer différents fournisseurs de CLI, modèles et niveaux de raisonnement par agent avec . Couvre agent_cli_mapping, les profils runtime, oma doctor --profile, models.yaml et le plafond de quota de session.
---

# Guide : configuration de modèle par agent

## Vue d'ensemble

 introduit la **sélection de modèle par agent** via `agent_cli_mapping`. Chaque agent (pm, backend, frontend, qa…) peut désormais viser son propre fournisseur, modèle et niveau de raisonnement, au lieu de partager un fournisseur global unique.

Cette page couvre :

1. La hiérarchie à trois fichiers de configuration
2. Le format dual de `agent_cli_mapping`
3. Les presets de profils runtime
4. La commande `oma doctor --profile`
5. Les slugs de modèle définis par l'utilisateur dans `models.yaml`
6. Le plafond de quota de session

---

## Hiérarchie des fichiers de configuration

 lit trois fichiers par ordre de priorité (du plus élevé au plus bas) :

| Fichier | Rôle | Éditable ? |
|:--------|:-----|:-----------|
| `.agents/oma-config.yaml` | Overrides utilisateur — mapping agent-CLI, profil actif, quota de session | Oui |
| `.agents/config/models.yaml` | Slugs de modèle fournis par l'utilisateur (ajouts au registre intégré) | Oui |
| `.agents/config/defaults.yaml` | Base Profile B intégrée (4 `runtime_profiles`, fallbacks sûrs) | Non — SSOT |

> `defaults.yaml` appartient au SSOT et ne doit pas être modifié directement. Toute personnalisation se fait dans `user-preferences.yaml` et `models.yaml`.

---

## Format dual de `agent_cli_mapping`

`agent_cli_mapping` accepte deux formes de valeur, permettant une migration progressive :

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

**Forme chaîne legacy** : `agent: "vendor"` — toujours valide ; utilise le modèle et l'effort par défaut du fournisseur.

**Forme objet AgentSpec** : `agent: { model, effort }` — fige un slug de modèle précis et un niveau de raisonnement (`low`, `medium`, `high`).

Les deux se combinent librement. Les agents non déclarés retombent sur le `runtime_profile` actif.

---

## Profils runtime

`defaults.yaml` livre Profile B avec quatre `runtime_profiles` prêts à l'emploi. Choisissez-en un dans `user-preferences.yaml` :

```yaml
# .agents/oma-config.yaml
active_profile: claude-only   # options ci-dessous
```

| Profil | Tous les agents routés vers | À utiliser quand |
|:-------|:----------------------------|:-----------------|
| `claude-only` | Claude Code (Sonnet/Opus) | Stack Anthropic homogène |
| `codex-only` | OpenAI Codex (GPT-5.x) | Stack purement OpenAI |
| `gemini-only` | Gemini CLI | Workflows orientés Google |
| `antigravity` | Mixte : pm→claude, backend→codex, qa→gemini | Combiner les forces inter-fournisseurs |
| `qwen-only` | Qwen CLI | Inférence locale / auto-hébergée |

Les profils sont le moyen rapide de remodeler toute la flotte sans éditer chaque ligne.

---

## `oma doctor --profile`

Le nouveau flag `--profile` affiche une matrice indiquant, pour chaque agent, le fournisseur, le modèle et l'effort résolus **après** la fusion des trois fichiers de configuration.

```bash
oma doctor --profile
```

**Exemple de sortie :**

```
 — Active Profile: antigravity

Agent         Vendor    Model                       Effort   Source
------------  --------  --------------------------  -------  ------------------
pm            claude    claude-sonnet-4-6           medium   user-preferences
backend       openai    gpt-5.3-codex               high     user-preferences
frontend      openai    gpt-5.3-codex               medium   profile:antigravity
qa            google    gemini-3.1-pro-preview              low      profile:antigravity
architecture  claude    claude-opus-4-7             high     defaults
docs          claude    claude-sonnet-4-6           low      defaults

Session quota cap:
  tokens:       2,000,000
  spawn_count:  40
  per_vendor:   { claude: 1.2M, openai: 600K, google: 200K }
```

Si un sous-agent choisit un fournisseur inattendu, lancez d'abord cette commande : la colonne `Source` indique quelle couche de configuration l'a emporté.

---

## Ajouter des slugs dans `models.yaml`

`models.yaml` est optionnel et permet d'enregistrer des slugs de modèle pas encore présents dans le registre intégré — pratique pour les modèles fraîchement sortis.

```yaml
# .agents/config/models.yaml
models:
  - slug: "openai/gpt-5.5-spud"
    vendor: openai
    context_window: 1_000_000
    supports_effort: true
    default_effort: medium
    notes: "Preview — candidat release GPT-5.5 Spud"
```

Une fois enregistré, le slug est utilisable dans `agent_cli_mapping` :

```yaml
agent_cli_mapping:
  backend:
    model: "openai/gpt-5.5-spud"
    effort: high
```

Les slugs sont des identifiants — conservez strictement l'orthographe anglaise publiée par le fournisseur.

---

## Plafond de quota de session

Ajoutez `session.quota_cap` dans `user-preferences.yaml` pour limiter les spawns incontrôlés de sous-agents :

```yaml
# .agents/oma-config.yaml
session:
  quota_cap:
    tokens: 2_000_000        # plafond total de tokens par session
    spawn_count: 40          # nombre max de sous-agents parallèles + séquentiels
    per_vendor:              # sous-plafonds de tokens par fournisseur
      claude: 1_200_000
      openai: 600_000
      google: 200_000
```

Quand un plafond est atteint, l'orchestrateur refuse tout nouveau spawn et retourne le statut `QUOTA_EXCEEDED`. Laisser un champ vide (ou omettre `quota_cap` entièrement) désactive la dimension.

---

## Tout mettre ensemble

Un `user-preferences.yaml` réaliste :

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


## Config file ownership

| File | Owner | Safe to edit? |
|------|-------|---------------|
| `.agents/config/defaults.yaml` | **SSOT shipped with oh-my-agent** | ❌ Treat as read-only |
| `.agents/oma-config.yaml` | You | ✅ Customize here |
| `.agents/config/models.yaml` | You | ✅ Add new slugs here |

`defaults.yaml` carries a `version:` field so new OMA releases can add runtime_profiles, new Profile B slugs, or adjust the effort matrix. Editing it directly means you will not receive those upgrades automatically.

## Upgrading defaults.yaml

When you pull a newer oh-my-agent release, run `oma install` — the installer compares your local `defaults.yaml` version against the bundled one:

- **Match** → no change, silent.
- **Mismatch** → warning:
  ```
  [install] .agents/config/defaults.yaml is 2.1.0; bundled is 2.2.0.
            Run 'oma install --update-defaults' to upgrade.
  ```
- **Mismatch + `--update-defaults`** → the bundled version overwrites yours:
  ```
  oma install --update-defaults
  # [install] Updated .agents/config/defaults.yaml (2.1.0 → 2.2.0)
  ```

Your `user-preferences.yaml` and `models.yaml` are never touched by the installer.

## Upgrading from a pre-5.16.0 install

If your project predates the per-agent model/effort feature:

1. Run `oma install` from your project root. The installer drops a fresh `defaults.yaml` into `.agents/config/` and preserves your existing `oma-config.yaml`.
2. Run `oma doctor --profile`. Your legacy `agent_cli_mapping: { backend: "gemini" }` values are now resolved through `runtime_profiles.gemini-only.agent_defaults.backend`, so the matrix shows the correct slug and CLI automatically.
3. (Optional) Move custom agent settings from `oma-config.yaml` into the new `user-preferences.yaml` using the AgentSpec form if you want per-agent `model`, `effort`, `thinking`, or `memory` overrides:
   ```yaml
   agent_cli_mapping:
     backend:
       model: "openai/gpt-5.3-codex"
       effort: "high"
   ```
4. If you ever customized `defaults.yaml`, `oma install` will warn about the version mismatch instead of overwriting. Move your customizations into `user-preferences.yaml` / `models.yaml`, then run `oma install --update-defaults` to accept the new SSOT.

No breaking changes to `agent:spawn` — legacy configs keep working through graceful fallback while you migrate at your own pace.
