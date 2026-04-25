---
title: "Guide : Génération d'images"
description: Guide complet de la génération d'images d'oh-my-agent — dispatch multi-fournisseurs via Codex (gpt-image-2), Pollinations (flux/zimage, gratuit) et Gemini, avec images de référence, garde-fous de coût, structure de sortie, dépannage et schémas d'invocation partagés.
---

# Génération d'images

`oma-image` est le routeur d'images multi-fournisseurs d'oh-my-agent. Il génère des images à partir de prompts en langage naturel, dispatche vers le CLI du fournisseur auprès duquel vous êtes authentifié, et écrit un manifest déterministe à côté de la sortie afin que chaque exécution soit reproductible.

La compétence s'active automatiquement sur des mots-clés tels que *image*, *illustration*, *visual asset*, *concept art*, ou lorsqu'une autre compétence a besoin d'une image en effet de bord (visuel hero, vignette, photo produit).

---

## Quand l'utiliser

- Générer des images, illustrations, photos produit, concept art, visuels hero/landing
- Comparer le même prompt sur plusieurs modèles côte à côte (`--vendor all`)
- Produire des assets depuis un workflow d'éditeur (Claude Code, Codex, Gemini CLI)
- Permettre à une autre compétence (design, marketing, docs) d'appeler le pipeline d'images comme infrastructure partagée

## Quand NE PAS l'utiliser

- Édition ou retouche d'une image existante — hors périmètre (utilisez un outil dédié)
- Génération de vidéos ou d'audio — hors périmètre
- Composition SVG / vectorielle inline à partir de données structurées — utilisez une compétence de templating
- Redimensionnement / conversion de format simple — utilisez une bibliothèque d'images, pas un pipeline de génération

---

## Aperçu des fournisseurs

La compétence est CLI-first : lorsque le CLI natif d'un fournisseur peut renvoyer des octets d'image bruts, le chemin sous-processus est privilégié par rapport à une clé API directe.

| Fournisseur | Stratégie | Modèles | Déclencheur | Coût |
|---|---|---|---|---|
| `pollinations` | HTTP direct | Gratuit : `flux`, `zimage`. Avec crédits : `qwen-image`, `wan-image`, `gpt-image-2`, `klein`, `kontext`, `gptimage`, `gptimage-large` | `POLLINATIONS_API_KEY` défini (inscription gratuite sur https://enter.pollinations.ai) | Gratuit pour `flux` / `zimage` |
| `codex` | CLI-first — `codex exec` via ChatGPT OAuth | `gpt-image-2` | `codex login` (aucune clé API requise) | Facturé sur votre forfait ChatGPT |
| `gemini` | CLI-first → repli sur API directe | `gemini-2.5-flash-image`, `gemini-3.1-flash-image-preview` | `gemini auth login` ou `GEMINI_API_KEY` + facturation | Désactivé par défaut ; nécessite la facturation |

`pollinations` est le fournisseur par défaut car `flux` / `zimage` sont gratuits, donc le déclenchement automatique sur mots-clés est sûr.

---

## Démarrage rapide

```bash
# Free, zero-config — uses pollinations/flux
oma image generate "minimalist sunrise over mountains"

# Compare every authenticated vendor in parallel
oma image generate "cat astronaut" --vendor all

# Specific vendor + size + count, skip cost prompt
oma image generate "logo concept" --vendor codex --size 1024x1024 -n 3 -y

# Cost estimate without spending
oma image generate "test prompt" --dry-run

# Inspect authentication and install status per vendor
oma image doctor

# List registered vendors and the models each one supports
oma image list-vendors
```

`oma img` est un alias de `oma image`.

---

## Slash command (dans un éditeur)

```text
/oma-image a red apple on white background
/oma-image --vendor all --size 1536x1024 jeju coastline at sunset
/oma-image -n 3 --quality high --out ./hero "minimalist dashboard hero illustration"
```

La slash command est transmise au même pipeline `oma image generate` — chaque flag CLI fonctionne aussi ici.

---

## Référence CLI

```bash
oma image generate "<prompt>"
  [--vendor auto|codex|pollinations|gemini|all]
  [-n 1..5]
  [--size 1024x1024|1024x1536|1536x1024|auto]
  [--quality low|medium|high|auto]
  [--out <dir>] [--allow-external-out]
  [-r <path>]...
  [--timeout 180] [-y] [--no-prompt-in-manifest]
  [--dry-run] [--format text|json]

oma image doctor
oma image list-vendors
```

### Flags clés

| Flag | Rôle |
|---|---|
| `--vendor <name>` | `auto`, `pollinations`, `codex`, `gemini` ou `all`. Avec `all`, chaque fournisseur demandé doit être authentifié (mode strict). |
| `-n, --count <n>` | Nombre d'images par fournisseur, 1 à 5 (limite de wall-time). |
| `--size <size>` | Format : `1024x1024` (carré), `1024x1536` (portrait), `1536x1024` (paysage) ou `auto`. |
| `--quality <level>` | `low`, `medium`, `high` ou `auto` (valeur par défaut du fournisseur). |
| `--out <dir>` | Répertoire de sortie. Par défaut `.agents/results/images/{timestamp}/`. Les chemins hors de `$PWD` requièrent `--allow-external-out`. |
| `-r, --reference <path>` | Jusqu'à 10 images de référence (PNG/JPEG/GIF/WebP, ≤ 5 Mo chacune). Répétable ou séparé par des virgules. Pris en charge sur `codex` et `gemini` ; rejeté sur `pollinations`. |
| `-y, --yes` | Ignore l'invite de confirmation de coût pour les exécutions estimées à ≥ `$0.20`. Aussi disponible via `OMA_IMAGE_YES=1`. |
| `--no-prompt-in-manifest` | Stocke le SHA-256 du prompt au lieu du texte brut dans `manifest.json`. |
| `--dry-run` | Affiche le plan et l'estimation de coût sans dépenser. |
| `--format text\|json` | Format de sortie CLI. JSON est la surface d'intégration pour les autres compétences. |
| `--strategy <list>` | Escalade spécifique à Gemini, par exemple `mcp,stream,api`. Surcharge `vendors.gemini.strategies`. |

---

## Images de référence

Attachez jusqu'à 10 images de référence pour guider le style, l'identité du sujet ou la composition.

```bash
oma image generate -r ~/Downloads/otter.jpeg "same otter in dramatic lighting" --vendor codex
oma image generate -r a.png -r b.png "blend these styles" --vendor gemini
oma image generate -r a.png,b.png "blend these styles" --vendor gemini
```

| Fournisseur | Prise en charge des références | Comment |
|---|---|---|
| `codex` (gpt-image-2) | Oui | Passe `-i <path>` à `codex exec` |
| `gemini` (2.5-flash-image) | Oui | Inline base64 `inlineData` dans la requête |
| `pollinations` | Non | Rejeté avec le code de sortie 4 (nécessite un hébergement par URL) |

### Où se trouvent les images attachées

- **Claude Code** — `~/.claude/image-cache/<session>/N.png`, exposées dans les messages système comme `[Image: source: <path>]`. Limitées à la session : copiez-les vers un emplacement durable si vous souhaitez les réutiliser plus tard.
- **Antigravity** — répertoire d'upload du workspace (l'IDE affiche le chemin exact)
- **Codex CLI en tant qu'hôte** — doit être passé explicitement ; les pièces jointes en cours de conversation ne sont pas transmises

Lorsque l'utilisateur attache une image et demande d'en générer ou éditer une à partir de celle-ci, l'agent appelant **doit** la transmettre via `--reference <path>` plutôt que de la décrire en prose. Si le CLI local est trop ancien pour prendre en charge `--reference`, exécutez `oma update` et réessayez.

---

## Structure de sortie

Chaque exécution écrit dans `.agents/results/images/` avec un répertoire horodaté et suffixé d'un hash :

```
.agents/results/images/
├── 20260424-143052-ab12cd/                 # single-vendor run
│   ├── pollinations-flux.jpg
│   └── manifest.json
└── 20260424-143122-7z9kqw-compare/         # --vendor all run
    ├── codex-gpt-image-2.png
    ├── pollinations-flux.jpg
    └── manifest.json
```

`manifest.json` enregistre le fournisseur, le modèle, le prompt (ou son SHA-256), la taille, la qualité et le coût — chaque exécution est reproductible à partir du seul manifest.

---

## Coût, sécurité et annulation

1. **Garde-fou de coût** — les exécutions estimées à ≥ `$0.20` demandent confirmation. Contournez avec `-y` ou `OMA_IMAGE_YES=1`. Le `pollinations` par défaut (flux/zimage) étant gratuit, l'invite est automatiquement ignorée pour celui-ci.
2. **Sécurité des chemins** — les chemins de sortie hors de `$PWD` requièrent `--allow-external-out` afin d'éviter des écritures inattendues.
3. **Annulable** — `Ctrl+C` (SIGINT/SIGTERM) interrompt simultanément tous les appels de fournisseurs en cours et l'orchestrateur.
4. **Sorties déterministes** — `manifest.json` est toujours écrit à côté des images.
5. **`n` max = 5** — une limite de wall-time, pas un quota.
6. **Codes de sortie** — alignés avec `oma search fetch` : `0` ok, `1` général, `2` sécurité, `3` introuvable, `4` entrée invalide, `5` authentification requise, `6` timeout.

---

## Protocole de clarification

Avant d'invoquer `oma image generate`, l'agent appelant exécute cette checklist. Si quelque chose manque et n'est pas inférable, il pose la question d'abord ou amplifie le prompt et présente l'expansion pour approbation.

**Requis :**
- **Sujet** — quel est l'élément principal de l'image ? (objet, personne, scène)
- **Décor / arrière-plan** — où cela se passe-t-il ?

**Fortement recommandé (à demander si absent et non inférable) :**
- **Style** — photoréaliste, illustration, rendu 3D, peinture à l'huile, concept art, vectoriel plat ?
- **Ambiance / éclairage** — lumineux vs sombre, chaud vs froid, dramatique vs minimal
- **Contexte d'usage** — image hero, icône, vignette, plan produit, affiche ?
- **Format** — carré, portrait ou paysage

Pour un prompt bref comme *"a red apple"*, l'agent ne pose **pas** de questions de suivi. Il amplifie plutôt en ligne et montre à l'utilisateur :

> Utilisateur : "a red apple"
> Agent : "Je vais générer ceci : *a single glossy red apple centered on a clean white background, soft studio lighting, photorealistic, shallow depth of field, 1024×1024*. Dois-je continuer, ou souhaitez-vous un style/composition différent ?"

Lorsque l'utilisateur a rédigé un brief créatif complet (≥ 2 parmi : sujet + style + éclairage + composition), son prompt est respecté à la lettre — pas de clarification, pas d'amplification.

**Langue de sortie.** Les prompts de génération sont envoyés au fournisseur en anglais (les modèles d'image sont entraînés majoritairement sur des légendes en anglais). Si l'utilisateur a écrit dans une autre langue, l'agent traduit et affiche la traduction lors de l'amplification afin que l'utilisateur puisse corriger toute mauvaise interprétation.

---

## Invocation partagée (depuis d'autres compétences)

D'autres compétences appellent la génération d'images comme infrastructure partagée :

```bash
oma image generate "<prompt>" --format json
```

Le manifest JSON écrit sur stdout inclut les chemins de sortie, le fournisseur, le modèle et le coût — facile à parser et à chaîner.

---

## Configuration

- **Configuration projet :** `config/image-config.yaml`
- **Variables d'environnement :**
  - `OMA_IMAGE_DEFAULT_VENDOR` — surcharge le fournisseur par défaut (sinon `pollinations`)
  - `OMA_IMAGE_DEFAULT_OUT` — surcharge le répertoire de sortie par défaut
  - `OMA_IMAGE_YES` — `1` pour contourner la confirmation de coût
  - `POLLINATIONS_API_KEY` — requise pour le fournisseur pollinations (inscription gratuite)
  - `GEMINI_API_KEY` — requise lorsque le fournisseur gemini bascule vers l'API directe
  - `OMA_IMAGE_GEMINI_STRATEGIES` — ordre d'escalade séparé par des virgules pour gemini (`mcp,stream,api`)

---

## Dépannage

| Symptôme | Cause probable | Correction |
|---|---|---|
| Code de sortie `5` (auth-required) | Le fournisseur sélectionné n'est pas authentifié | Exécutez `oma image doctor` pour voir quel fournisseur nécessite une connexion. Puis `codex login` / définissez `POLLINATIONS_API_KEY` / `gemini auth login`. |
| Code de sortie `4` sur `--reference` | `pollinations` rejette les références, ou fichier trop volumineux / mauvais format | Passez à `--vendor codex` ou `--vendor gemini`. Chaque référence doit faire ≤ 5 Mo et être au format PNG/JPEG/GIF/WebP. |
| `--reference` non reconnu | CLI local obsolète | Exécutez `oma update` et réessayez. Ne basculez pas vers une description en prose. |
| La confirmation de coût bloque l'automatisation | L'exécution est estimée à ≥ `$0.20` | Passez `-y` ou définissez `OMA_IMAGE_YES=1`. Mieux : passez au `pollinations` gratuit. |
| `--vendor all` s'interrompt immédiatement | L'un des fournisseurs demandés n'est pas authentifié (mode strict) | Authentifiez le fournisseur manquant, ou choisissez un `--vendor` spécifique. |
| Sortie écrite dans un répertoire inattendu | La valeur par défaut est `.agents/results/images/{timestamp}/` | Passez `--out <dir>`. Les chemins hors de `$PWD` nécessitent `--allow-external-out`. |
| Gemini ne renvoie aucun octet d'image | La boucle agentique du Gemini CLI n'émet pas d'`inlineData` brut sur stdout (à partir de 0.38) | Le fournisseur bascule automatiquement sur l'API directe. Définissez `GEMINI_API_KEY` et assurez-vous d'avoir activé la facturation. |

---

## Voir aussi

- [Compétences](/docs/core-concepts/skills) — l'architecture de compétences à deux couches qui propulse `oma-image`
- [Commandes CLI](/docs/cli-interfaces/commands) — référence complète des commandes `oma image`
- [Options CLI](/docs/cli-interfaces/options) — matrice des options globales
