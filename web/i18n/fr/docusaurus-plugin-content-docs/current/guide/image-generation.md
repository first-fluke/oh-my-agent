---
title: "Guide : génération d'images"
sidebar_label: Génération d'images
description: Guide complet de la génération d'images oh-my-agent, avec dispatch multi-fournisseurs via Codex (gpt-image-2), Pollinations (flux/zimage, gratuit) et Antigravity via Gemini Code Assist, images de référence, garde-fous de coût, organisation des sorties, dépannage et modes d'invocation partagés.
---

# Génération d'images

`oma-image` est le routeur d'images multi-fournisseurs d'oh-my-agent. Il génère des images à partir de prompts en langage naturel, les envoie au CLI du fournisseur auprès duquel vous êtes authentifié et écrit un manifeste à côté de la sortie avec les entrées et les décisions du fournisseur nécessaires pour auditer ou reproduire l'exécution. La sortie réelle du fournisseur peut varier.

La compétence s'active sur des formulations comme « generate an image », « create an image », « make a picture », « draw me … » ou « image of … », sur un nom de fournisseur (`gpt-image`, `nano-banana`, `pollinations`), ou lorsqu'une autre compétence a besoin d'une image comme effet secondaire (visuel principal, miniature, photo de produit).

> **TL;DR** Il vous faut l'un des éléments suivants : `POLLINATIONS_API_KEY` (`flux` / `zimage` gratuits), `codex login` (gpt-image-2 sur votre forfait ChatGPT) ou un `agy` connecté. Exécutez `oma image doctor`, puis `oma image generate "<prompt>" --vendor pollinations`. Les images et `manifest.json` sont écrits dans `.agents/results/images/{timestamp}-{shortid}/`.

---

## Quand l'utiliser

- Générer des images, illustrations, photos de produits, concept arts ou visuels principaux de landing page ;
- comparer le même prompt entre plusieurs modèles côte à côte (`--vendor all`) ;
- produire des ressources depuis n'importe quel runtime qui charge les compétences oma (Claude Code, Codex CLI, Antigravity, Cursor, etc.) ;
- permettre à une autre compétence (design, marketing, docs) d'appeler le pipeline d'images comme infrastructure partagée.

## Quand NE PAS l'utiliser

- Modifier ou retoucher une image existante (hors périmètre ; utilisez un outil dédié) ;
- générer une vidéo ou de l'audio (hors périmètre) ;
- composer un SVG inline ou un vecteur à partir de données structurées (utilisez une compétence de templating) ;
- redimensionner ou convertir simplement un format (utilisez une bibliothèque d'images, pas un pipeline de génération).

---

## Fournisseurs en un coup d'œil

La compétence privilégie le CLI : lorsqu'un CLI natif peut renvoyer des octets d'image bruts, le chemin subprocess est préféré à une clé API directe.

| Fournisseur | Stratégie | Modèles | Déclencheur | Coût |
|---|---|---|---|---|
| `pollinations` | HTTP direct | Gratuit : `flux`, `zimage`. Avec crédits : `qwen-image`, `wan-image`, `gpt-image-2`, `klein`, `kontext`, `gptimage`, `gptimage-large` | `POLLINATIONS_API_KEY` défini (inscription gratuite sur [enter.pollinations.ai](https://enter.pollinations.ai)) | Gratuit pour `flux` / `zimage` |
| `codex` | Via le CLI en priorité avec `codex exec` (OAuth ChatGPT) | `gpt-image-2` | `codex login` (aucune clé API nécessaire) | Facturé sur votre forfait ChatGPT |
| `antigravity` | CLI `agy` via l'abonnement Gemini Code Assist | Le modèle est choisi en interne par `agy` | `agy` installé et connecté | Aucun coût par image via Code Assist |

Comment `--vendor` choisit les fournisseurs d'une exécution :

| `--vendor` | Fournisseurs exécutés | Dossier de sortie | Code de sortie 5 lorsque |
|---|---|---|---|
| `auto` (par défaut) | chaque fournisseur dont la vérification de santé réussit | `{timestamp}-{shortid}-compare/` lorsque deux fournisseurs ou plus s'exécutent | aucun fournisseur n'est sain |
| `all` | chaque fournisseur activé | `{timestamp}-{shortid}-compare/` lorsque deux fournisseurs ou plus s'exécutent | un fournisseur demandé n'est pas sain |
| `codex`, `pollinations` ou `antigravity` | ce fournisseur | `{timestamp}-{shortid}/` | ce fournisseur n'est pas sain |

Le mode fournisseur intégré est `auto` : il exécute **chaque** fournisseur qui passe sa vérification de santé, en parallèle. Passez `--vendor pollinations` pour rester sur le chemin gratuit. Les modèles `flux` et `zimage` de Pollinations sont gratuits par image, mais nécessitent tout de même une `POLLINATIONS_API_KEY` ; Codex et Antigravity exigent leur propre connexion. Les estimations payantes utilisent toujours le garde-fou de confirmation du coût.

---

## Démarrage rapide

Avant la première génération, vérifiez quel fournisseur est prêt et authentifiez l'un des chemins pris en charge :

```bash
oma image doctor

# Pollinations: create a free account and export its key.
export POLLINATIONS_API_KEY="<pollinations-key>"

# Or authenticate an alternative provider instead.
codex login
# Sign in to Gemini Code Assist for `agy` when using --vendor antigravity.
```

```bash
# Runs every vendor whose health check passes; cost and auth depend on those vendors.
oma image generate "minimalist sunrise over mountains"

# Stay on the free Pollinations path.
oma image generate "minimalist sunrise over mountains" --vendor pollinations

# Run all configured vendors; every selected vendor must be healthy or the command stops.
oma image generate "cat astronaut" --vendor all

# Specific vendor + size + count, skip cost prompt
oma image generate "logo concept" --vendor codex --size 1024x1024 -n 3 -y

# Cost estimate without spending
oma image generate "test prompt" --dry-run

# List registered vendors and their default model (supported models: oma image doctor)
oma image vendor list
```

Une exécution réussie en mode texte affiche une progression comme celle-ci (les chemins sont donnés à titre d'exemple) :

```text
[oma image] using: pollinations
[oma image] pollinations generating... 5s
[oma image] pollinations ok (7.4s) -> /path/to/project/.agents/results/images/20261014-101500-ab12cd/pollinations-flux-ab12cd.jpg
[oma image] manifest: /path/to/project/.agents/results/images/20261014-101500-ab12cd/manifest.json
```

---

## Utiliser comme compétence

`oma-image` s'active automatiquement depuis le langage naturel et peut aussi être invoqué explicitement. Il possède trois points d'entrée.

### 1. Langage naturel (activation automatique)

Dans n'importe quel runtime qui charge les compétences oma (Claude Code, Codex CLI, Antigravity, Cursor, etc.), décrivez simplement l'image. Des formulations comme « generate an image », « make a picture », « draw me … » ou « image of … » activent la compétence ; les runtimes qui associent les compétences par leur description peuvent aussi la sélectionner pour des demandes comme « concept art » ou « hero shot ».

Vous n'avez pas besoin de retenir les flags du CLI. Décrivez votre besoin en langage courant et la compétence le traduit en options :

| Vous dites | La compétence en déduit |
|---|---|
| « utilise codex » / « avec gpt-image-2 » / « flux gratuit » | `--vendor codex` / `--vendor pollinations` |
| « compare les fournisseurs » / « côte à côte » | `--vendor all` |
| « portrait » / « paysage » / « 1024×1536 » | `--size 1024x1536` / `--size 1536x1024` |
| « haute qualité » / « brouillon » | `--quality high` / `--quality low` |
| « trois variantes » / « donne-m'en 3 » | `-n 3` |
| « enregistre dans ./hero » / « sortie dans docs/assets » | `--output-dir <dir>` |
| Image jointe + « rends-la nocturne » | `-r <attached path>` |
| « estime seulement le coût » / « exécution à blanc » | `--dry-run` |

Exemples :

> « Génère un lever de soleil minimaliste sur des montagnes pour le visuel principal de la landing page, au format paysage et en haute qualité. »
> « Compare une photo de produit d'une tasse en céramique chez tous les fournisseurs, avec trois variantes pour chacun. »
> « Utilise codex pour rendre cette photo de loutre dramatique et nocturne. » (avec une référence jointe)

L'agent [interprète le brief](#clarification-protocol), comble les lacunes avec des valeurs par défaut et appelle `oma image generate` avec les flags déduits. Utilisez la commande slash lorsque vous voulez contrôler explicitement les valeurs exactes des flags.

### 2. Commande slash explicite

```text
/oma-image a red apple on white background
/oma-image --vendor all --size 1536x1024 jeju coastline at sunset
/oma-image -n 3 --quality high --output-dir ./hero "minimalist dashboard hero illustration"
```

Tous les flags CLI (`--vendor`, `-n`, `--size`, `-r`, `--dry-run`, …) fonctionnent dans la commande slash et sont transmis au même pipeline `oma image generate`.

### 3. Depuis une autre compétence (infrastructure partagée)

Les autres compétences (design, marketing, docs) appellent le pipeline comme infrastructure partagée avec une sortie JSON :

```bash
oma image generate "<prompt>" --output json
```

Avec `--output json`, stdout contient un seul objet JSON `{exitCode, manifestPath, runs}` ; chaque entrée de `runs` indique son fournisseur, son statut et ses fichiers de sortie. Lisez `manifestPath` pour l'enregistrement complet. `--dry-run` affiche l'en-tête texte `[oma image] dry-run plan:` avant le plan ; ignorez cette ligne lors de l'analyse.

---

## Référence CLI

```bash
oma image generate "<prompt>"
  [--vendor auto|codex|pollinations|antigravity|all]
  [-n 1..5]
  [--size WxH|auto]
  [--quality low|medium|high|auto]
  [--output-dir <dir>] [--allow-external-output]
  [-r <path>]...
  [--timeout <duration>] [-y] [--no-prompt-in-manifest]
  [--dry-run] [--output text|json]

oma image doctor
oma image vendor list
```

### Flags clés

| Flag | Rôle |
|---|---|
| `--vendor <name>` | `auto`, `pollinations`, `codex`, `antigravity` ou `all`. Avec `all`, chaque fournisseur demandé doit être sain (mode strict). |
| `-n, --count <n>` | Nombre d'images par fournisseur, de 1 à 5 (limite de temps réel). Valeur par défaut : 1. |
| `--size <size>` | `WxH`, chaque côté étant un multiple de 16 compris entre 16 et 3840, avec un rapport d'aspect entre 1:3 et 3:1 (par exemple `512x512`, `1024x1024`, `1024x1536`, `1536x1024`), ou `auto`. Valeur par défaut : `1024x1024`. |
| `--quality <level>` | `low`, `medium`, `high` ou `auto` (par défaut). |
| `--output-dir <dir>` | Répertoire de sortie ; les fichiers y sont écrits directement. Par défaut : `.agents/results/images/{timestamp}-{shortid}/`. Les chemins hors de `$PWD` nécessitent `--allow-external-output`. |
| `--allow-external-output` | Autorise un répertoire de sortie situé hors de `$PWD`. |
| `--model <name>` | Remplace le modèle pour **chaque** fournisseur de l'exécution ; combinez-le donc avec un seul `--vendor` (par exemple `--vendor pollinations --model zimage`). `antigravity` l'ignore car `agy` choisit son modèle. |
| `-r, --reference <path>` | Jusqu'à 10 images de référence (PNG/JPEG/GIF/WebP, ≤ 5 Mo chacune). Répétable ou séparé par des virgules. Pris en charge par `codex` et `antigravity` ; rejeté par `pollinations`. |
| `-y, --yes` | Ignore la confirmation de coût pour les exécutions estimées à ≥ `$0.20`. Également disponible via `OMA_IMAGE_YES=1`. |
| `--no-prompt-in-manifest` | Stocke le SHA-256 du prompt au lieu du texte brut dans `manifest.json`. |
| `--dry-run` | Affiche le plan et l'estimation de coût sans dépenser. |
| `--output text\|json` | Format de sortie du CLI. JSON est la surface d'intégration pour les autres compétences. |
| `--timeout <duration>` | Délai d'attente par image. Valeur par défaut : 180 secondes. |

---

## Images de référence

Joignez jusqu'à 10 images de référence pour guider le style, l'identité du sujet ou la composition.

```bash
oma image generate -r ~/Downloads/otter.jpeg "same otter in dramatic lighting" --vendor codex
oma image generate -r a.png -r b.png "blend these styles" --vendor antigravity
oma image generate -r a.png,b.png "blend these styles" --vendor antigravity
```

| Fournisseur | Prise en charge des références | Méthode |
|---|---|---|
| `codex` (gpt-image-2) | Oui | Passe `-i <path>` à `codex exec` |
| `antigravity` | Oui | Copie les références dans un répertoire propre à l'exécution et en donne l'accès à `agy` |
| `pollinations` | Non | Rejeté avec le code de sortie 4 (nécessite un hébergement par URL) |

### Où se trouvent les images jointes

- **Claude Code :** `~/.claude/image-cache/<session>/N.png`, exposé dans les messages système sous la forme `[Image: source: <path>]`. Le chemin est limité à la session ; copiez l'image dans un emplacement durable si vous voulez la réutiliser.
- **Antigravity :** répertoire d'upload du workspace (l'IDE affiche le chemin exact).
- **Codex CLI comme hôte :** doit être transmis explicitement ; les pièces jointes de la conversation ne sont pas transmises.

Lorsqu'un utilisateur joint une image et demande d'en générer ou d'en modifier une à partir de celle-ci, l'agent appelant **doit** la transmettre via `--reference <path>` au lieu de la décrire en prose. Si le CLI local est trop ancien pour prendre en charge `--reference`, exécutez `oma update` puis réessayez.

---

## Structure de sortie

Par défaut, chaque exécution écrit dans un dossier horodaté avec suffixe de hash sous `.agents/results/images/` ; avec `--output-dir`, les fichiers sont écrits directement dans ce répertoire :

```text
.agents/results/images/
├── 20260424-143052-ab12cd/                 # one vendor ran
│   ├── pollinations-flux-ab12cd.jpg        # -1, -2, ... suffixes when -n > 1
│   └── manifest.json
└── 20260424-143122-7z9kqw-compare/         # two or more vendors ran
    ├── codex-gpt-image-2-7z9kqw.png
    ├── pollinations-flux-7z9kqw.jpg
    ├── antigravity-7z9kqw.jpg              # no model segment: agy picks the model
    └── manifest.json
```

`manifest.json` enregistre le fournisseur, le modèle, le prompt (ou son SHA-256), la taille, la qualité et le coût, afin que la demande puisse être auditée et reproduite. Il ne garantit pas des pixels identiques avec un fournisseur en production.

---

## Coût, sécurité et annulation

1. **Garde-fou de coût :** les exécutions estimées à ≥ `$0.20` demandent une confirmation ; sans terminal interactif, l'exécution se termine avec le code 1 et un message mentionnant `--yes`. Contournez-la avec `-y` ou `OMA_IMAGE_YES=1`. Seul `--vendor pollinations` avec `flux` / `zimage` est garanti gratuit ; `auto` peut aussi inclure un Codex connecté.
2. **Sécurité des chemins :** les chemins de sortie hors de `$PWD` nécessitent `--allow-external-output` pour éviter les écritures inattendues.
3. **Annulable :** `Ctrl+C` (SIGINT/SIGTERM) annule tous les appels de fournisseurs en cours et l'orchestrateur.
4. **Trace stable :** `manifest.json` est toujours écrit à côté des images.
5. **`n` maximal = 5 :** il s'agit d'une limite de temps réel, pas d'un quota.
6. **Codes de sortie :** alignés sur `oma search fetch` : `0` ok, `1` général, `2` sécurité, `3` introuvable, `4` entrée invalide, `5` authentification requise, `6` délai dépassé.

---

## Comment l'agent interprète un brief {#clarification-protocol}

L'agent utilise ce que vous avez dit et comble les lacunes avec des valeurs créatives par défaut raisonnables pour le cadre, le style, l'éclairage et le format. Il ne pose une question que lorsqu'un choix manquant changerait sensiblement le résultat, et il n'attend pas d'approbation d'un prompt enrichi une fois que vous lui avez demandé de générer. Les formulations explicites, le texte à afficher sur l'image et l'intention des références sont conservés tels quels.

| Vous dites | Ce qui se passe |
|---|---|
| « une pomme rouge » | Génération immédiate ; l'agent complète le cadre, le style, l'éclairage et la taille |
| « une pomme rouge en icône vectorielle plate, 512x512 » | Votre style et votre taille sont utilisés tels quels |
| « quelque chose pour la page d'accueil » | Une question sur le sujet, car il change le résultat |

Pour voir exactement ce qui a été envoyé au fournisseur, consultez le champ `prompt` de `manifest.json` (stocké sous forme de SHA-256 avec `--no-prompt-in-manifest`).

---

## Configuration

- **Configuration du projet :** section `image:` de `.agents/oma-config.yaml`. L'ancien `config/image-config.yaml` n'est plus lu.
- **Variables d'environnement :**
  - `OMA_IMAGE_DEFAULT_VENDOR` : remplace le fournisseur par défaut configuré (`auto`). Le flag `--vendor` lui-même vaut `auto` par défaut ; passez donc `--vendor` à chaque commande lorsque vous avez besoin d'un fournisseur précis ;
  - `OMA_IMAGE_DEFAULT_OUT` : remplace le répertoire de sortie par défaut ;
  - `OMA_IMAGE_YES` : `1` pour ignorer la confirmation du coût ;
  - `POLLINATIONS_API_KEY` : obligatoire pour le fournisseur Pollinations (inscription gratuite).

---

## Dépannage

| Symptôme | Cause probable | Correction |
|---|---|---|
| Code de sortie `5` (auth-required) | Le fournisseur sélectionné n'est pas authentifié | Exécutez `oma image doctor` pour voir quel fournisseur nécessite une connexion. Puis utilisez `codex login`, connectez-vous à `agy` ou définissez `POLLINATIONS_API_KEY`. |
| Code de sortie `4` sur `--reference` | `pollinations` rejette les références, ou le fichier est trop volumineux ou dans un mauvais format | Passez à `--vendor codex` ou `--vendor antigravity`. Chaque référence doit faire au maximum 5 Mo et être au format PNG/JPEG/GIF/WebP. |
| `--reference` non reconnu | CLI local obsolète | Exécutez `oma update` et réessayez. Ne remplacez pas la référence par une description en prose. |
| La confirmation de coût bloque l'automatisation | L'exécution est estimée à ≥ `$0.20` | Passez `-y` ou définissez `OMA_IMAGE_YES=1`. Mieux : utilisez `pollinations`, qui est gratuit. |
| `--vendor all` s'interrompt immédiatement | L'un des fournisseurs demandés n'est pas sain (mode strict) | Installez ou connectez le fournisseur manquant, ou choisissez un `--vendor` précis. |
| La sortie est écrite dans un répertoire inattendu | La valeur par défaut est `.agents/results/images/{timestamp}-{shortid}/` | Passez `--output-dir <dir>`. Les chemins hors de `$PWD` nécessitent `--allow-external-output`. |
| `--out path "…" is outside $PWD. Use --allow-external-out to override.` (code de sortie 1) | `--output-dir` pointe hors du projet | Relancez avec `--allow-external-output` (le message affiche encore l'ancien nom du flag), ou choisissez un répertoire dans le projet. |
| Plusieurs fournisseurs se sont exécutés et le dossier se termine par `-compare` | `--vendor auto` exécute chaque fournisseur sain | Passez un seul `--vendor` pour exécuter un seul fournisseur. |
| Antigravity échoue après une vérification de santé réussie | `agy --version` prouve l'installation, pas la connexion | Connectez-vous à Gemini Code Assist, puis réessayez avec `oma image doctor` et `--vendor antigravity`. |

---

## Étapes suivantes

- [Génération vidéo](./video-generation.md) : `oma-video` réutilise `oma-image` comme fournisseur visuel ;
- [Workflows de contenu et de recherche](./content-and-research.md) : autres capacités de contenu et leurs prérequis ;
- [Compétences](../core-concepts/skills.md) : l'architecture de compétence à deux couches qui alimente `oma-image` ;
- [CLI Commands : image](../cli-interfaces/commands.md#image) : référence complète de la commande `oma image` ;
- [CLI Options](../cli-interfaces/options.md) : matrice des options globales.
