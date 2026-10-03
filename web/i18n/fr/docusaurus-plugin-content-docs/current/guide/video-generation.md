---
title: "Guide : Génération vidéo"
sidebar_label: Génération vidéo
description: Guide complet de la génération vidéo oh-my-agent — un routeur à trois niveaux, avec ou sans clé, qui compose script, narration, visuels, sous-titres et compositeur HyperFrames géré dans des répertoires d’exécution reproductibles pour les modes shorts, explainer et demo.
---

# Génération vidéo

`oma-video` est le routeur vidéo d’oh-my-agent. À partir d’un brief d’une ligne, il compose un script, une narration, des visuels et des sous-titres, puis enregistre le plan dans un répertoire d’exécution. Les étapes de fournisseur peuvent fonctionner sans clé et utiliser des replis locaux ou déterministes ; un vrai MP4 nécessite toujours un compositeur opérationnel et une composition valide.

La compétence s’active automatiquement avec des mots-clés comme *video*, *shorts*, *reels*, *explainer*, *demo*, *walkthrough*, *screencast*, ou lorsqu’une autre compétence a besoin d’une vidéo comme effet secondaire.

---

## Quand l’utiliser

- Transformer un brief, un README, du code ou des données en courte vidéo.
- Produire un explainer narré ou un enregistrement de démonstration/parcours.
- Tout pipeline reproductible « brief → `.mp4` » que vous voulez relancer de manière déterministe.

## Quand NE PAS l’utiliser

- Images fixes uniques → utilisez [`oma-image`](/docs/guide/image-generation).
- Diffusion ou streaming d’écran en direct → hors périmètre (la capture est supervisée, elle n’est pas diffusée).
- Audio de narration autonome → utilisez `oma-voice`.

---

## Modes en un coup d’œil

| Mode | Format | Ce qu’il compose |
|------|--------|------------------|
| `shorts` | 9:16 | Clip vertical court (script → narration → visuels → sous-titres). |
| `explainer` | 16:9 | Explainer horizontal à partir d’un README, de code ou d’un brief de données. |
| `demo` | dérivé | Parcours construit à partir d’un enregistrement humain fourni avec `--capture` ; `--source web --url` fournit le contexte d’une capture supervisée avec navigateur affiché et n’automatise jamais la connexion. |

Le mode choisit des valeurs raisonnables ; transmettez les flags pertinents lorsque vous avez besoin d’autres valeurs.

---

## Démarrage rapide

```bash
# Key-optional short — script, captions, and a local render when the toolchain is ready
oma video generate "three quick tips for better focus" --mode shorts -y

# 16:9 explainer in Korean
oma video generate "what oh-my-agent does" --mode explainer --aspect 16:9 --locale ko -y

# Demo from a human recording (you control login and capture)
oma video generate "product walkthrough" --mode demo --capture ./capture.mp4 --polish
```

Chaque exécution affiche son répertoire. Un `--seed` fixe stabilise les entrées de planification déterministes ; les sorties live des fournisseurs et les images capturées peuvent tout de même varier. Refaites le rendu d’un répertoire existant lorsque vous voulez réutiliser sa spécification de rendu et ses éléments enregistrés.

D’autres outils qui exécutent `oma video generate --output json` analysent une enveloppe JSON sur stdout : `{exitCode, runDir, manifestPath, scriptPath, renderSpecPath, warnings, error}`. Il n’existe pas de clé `outputs` : lisez les chemins de sortie ou d’élément depuis le manifeste à `manifestPath`.

---

## Référence CLI

```
oma video generate <brief...> [options]
oma video doctor [--install|--upgrade|--install-mpt|--install-strudel]  # toolchain readiness / provisioning
oma video compose <runDir>       # prepare HTML project and authoring contract
oma video render <runDir>        # re-render from render-spec.json (deterministic)
oma video provider list         # provider availability + key/fallback status
```

### Flags principaux

| Flag | Rôle |
|------|---------|
| `--mode <m>` | `shorts` \| `explainer` \| `demo`. |
| `--aspect <a>` | `9:16` \| `16:9` \| `1:1` \| `auto`. |
| `--locale <lang>` | Balise de langue de la narration et des sous-titres. |
| `--captions <s>` | `tiktok` \| `lower-third` \| `none` (alignement sans clé). |
| `--visual <m>` | `auto` \| `generate` \| `stock` \| `aigc` \| `slide`. |
| `--voice <profile>` | Voix de narration, ou `none` (valeur par défaut ; omettez-la et la vidéo sera rendue silencieuse avec un minutage estimé des sous-titres). |
| `--music <mode>` | `upbeat`, `calm`, `cinematic`, `lofi`, `piano` ou `none`. |
| `--compositor <c>` | `hyperframes` (par défaut) \| `mpt`. |
| `--capture <path>` | Chemin de l’enregistrement d’entrée pour le mode demo (`--source file`). |
| `--source <k>` | Source de capture demo : `file` ou `web` (par défaut : `file`). |
| `--url <url>` | URL cible pour `--source web` (locale, staging ou production) ; elle ne remplace pas `--capture` lorsqu’un enregistrement est requis. |
| `--device <name>` | Cadre d’appareil pour la capture web ; remplace le dimensionnement du format. |
| `--ready-selector <css>` | Sélecteur CSS à attendre avant la capture web. |
| `--show-cursor` | Superposer un curseur visible dans la capture web. |
| `--polish` | Superposer la composition HyperFrames aux images capturées. |
| `--capture-timeout <sec>` | Plafond strict pour la capture web live. |
| `--capture-stop <mode>` | Arrêt non interactif pour la CI : `duration:<sec>` ou `selector:<css>`. |
| `--output-dir <path>` | Répertoire de sortie de base. Les chemins hors de `$PWD` exigent `--allow-external-output`. |
| `--allow-external-output` | Autoriser les chemins de sortie hors de `$PWD`. |
| `--max-usd <n>` | Coût maximal estimé avant confirmation. |
| `--duration <sec>` | Durée cible, ou `auto`. |
| `--seed <n>` | Graine déterministe. |
| `--dry-run` | Émettre script / render-spec / manifeste et ignorer le rendu. |
| `--script <path>` | `script.json` écrit par l’agent à injecter (remplace le squelette ; contrôle narration, texte à l’écran et prompts visuels par scène). |
| `-y, --yes` | Passer l’invite de confirmation du coût. |
| `--timeout <duration>` | Délai maximal de chaque appel à un fournisseur visuel ou musical, par exemple `90s` ou `2m` ; un nombre sans unité est exprimé en secondes. |
| `--output <f>` | Sortie CLI : `text` (par défaut) ou `json`. |
| `--no-brief-in-manifest` | Stocker un SHA-256 du brief au lieu du brief brut. |

---

## Fournisseurs utilisables sans clé

Les étapes de fournisseur se résolvent vers une **branche réelle** et, lorsque l’étape le permet, un **repli déterministe**. Des clés manquantes peuvent donc laisser une exécution planifiée avec un minutage estimé ou des éléments locaux. Le compositeur est une étape finale obligatoire et n’a pas de repli normal par placeholder :

| Capacité | Branche réelle | Repli |
|------------|-------------|----------|
| script | LLM lorsqu’une clé est présente | plan déterministe à partir du brief |
| voix | `oma-voice` (Voicebox, local) | minutage estimé, aucun audio |
| visuel | `oma-image` / `oma-slide` / stock | élément placeholder |
| sous-titre | alignement forcé sans clé | minutage estimé des mots |
| capture | capture web avec navigateur supervisée (`--source web`) ou enregistrement fourni (`--source file --capture`) | protocole guidé « enregistrez-le vous-même » |
| compositeur | HyperFrames (géré) ou MoneyPrinterTurbo | aucun repli de compositeur ; l’exécution échoue avec des diagnostics |

Aucune automatisation des identifiants : une personne effectue toute connexion à l’écran pendant la capture ; les URL et tokens de requête sont masqués dans les journaux et le manifeste.

Les sous-titres sont rendus comme des **repères statiques par fenêtre** — l’unique ligne de sous-titre active à l’image courante, entourée par CSS, sans animation par mot.

---

## Chaîne d’outils et `doctor`

La chaîne lourde (le `node_modules` du projet HyperFrames géré, la police Pretendard intégrée, le checkout MoneyPrinterTurbo, les navigateurs de capture et Chrome Headless Shell) est **provisionnée à la demande**, jamais livrée dans le paquet. `doctor` sans option ne fait qu’établir un rapport — il n’installe jamais rien :

```bash
oma video doctor
```

Il indique `node`, `chromium`, `ffmpeg`, `ffprobe`, `hyperframes-toolchain`, `hyperframes-skills`, `pretendard-font`, `mpt-project`, `voicebox`, `oma-image`, `pixelle` et `cap`, puis affiche l’indication d’installation de tout élément manquant. La base requise comprend Node.js 22+, la chaîne d’outils HyperFrames et son navigateur Chrome, FFmpeg/FFprobe et `oma-image`. Un vrai MP4 exige aussi du HTML écrit.

Utilisez les flags d’installation pour provisionner la chaîne d’outils :

```bash
oma video doctor --install             # warm the latest HyperFrames toolchain + Chrome Headless Shell + Pretendard + heygen-com/hyperframes
oma video doctor --upgrade             # force a latest-version check now
oma video doctor --install-mpt         # MoneyPrinterTurbo checkout (clone + venv + deps) for --compositor mpt
```

`--install` récupère aussi la police Pretendard intégrée (version épinglée) dans le cache partagé de la chaîne d’outils — elle fait partie de la limite de déterminisme. En cas d’échec réseau, un avertissement est affiché et le rendu revient aux polices système ; les différences de navigateur et de système d’exploitation peuvent tout de même affecter la sortie encodée.

---

## Structure de sortie

```
.agents/results/videos/{timestamp}-{shortid}-{mode}/
├── script.json          # scenes + narration
├── render-spec.json     # the deterministic render contract
├── timing.json          # per-segment timing (voicebox-stt or estimated)
├── captions.srt / .vtt
├── audio/narration-*.wav
├── visuals/scene-*.{png,svg,…}
├── hyperframes/         # index.html, AUTHORING.md, local assets and toolchain link
├── {mode}-{slug}.mp4    # the rendered output (slug derived from the script title)
└── manifest.json        # providers, assets, cost, warnings
```

Le `render-spec.json` et les éléments constituent la limite de déterminisme ; la capture live est enregistrée comme `nondeterministic` dans le manifeste.

---

## Dépannage

| Symptôme | Cause / correctif |
|---------|-------------|
| Aucun MP4 n’est produit | Un contrôle du compositeur, de la composition ou de la chaîne d’outils a échoué. Lancez `oma video doctor`, puis `oma video compose <runDir>` et corrigez la composition signalée avant de relancer `oma video render <runDir>`. |
| La narration est silencieuse (`source: estimated`) | Voicebox est inaccessible ; démarrez le serveur `oma-voice` ou acceptez le minutage estimé. |
| `--source web` affiche un protocole guidé au lieu d’enregistrer | Aucun TTY ou environnement de capture navigateur indisponible → repli guidé. Utilisez un terminal interactif avec un environnement de capture provisionné et `--capture-stop`, ou transmettez un fichier enregistré avec `--capture`. |
| Le rendu est lent au premier lancement | Le navigateur HyperFrames / checkout MPT est provisionné une fois ; les exécutions suivantes réutilisent le cache. |

---

## HyperFrames toujours à jour — vous écrivez la composition

oh-my-agent ne fournit **aucun code de composition HyperFrames**. Chaque exécution obtient son propre projet à `<runDir>/hyperframes/`, échafaudé par `oma video compose` sur le dernier HyperFrames npm (cache de chaîne `~/.cache/oma-video/hyperframes/<version>/`, partagé via un lien symbolique `node_modules`) avec [heygen-com/hyperframes](https://github.com/heygen-com/hyperframes) à HEAD (`~/.cache/oma-video/hyperframes-skills/`). L’agent écrit la source de composition générée en suivant `AUTHORING.md` de l’échafaudage, les compétences et la spécification du mode dans `.agents/skills/oma-video/resources/hyperframes-authoring/`.

```bash
oma video generate "…"                     # → render-spec.json + <runDir>/hyperframes/ (composition pending)
oma video compose <runDir> --output json   # refresh scaffold / print the contract (idempotent)
#   author hyperframes/index.html as instructed by AUTHORING.md
oma video render <runDir> --output json    # lint → npx hyperframes render → ffprobe; exit 1 on any failure
```

- Les vérifications de dernière version (npm + GitHub) sont limitées par `video.hyperframes.check_interval_min` (60 par défaut ; `0` = chaque compose). `oma update` respecte l’intervalle ; `oma video doctor --upgrade` force une vérification ; les exécutions hors ligne utilisent la chaîne mise en cache et signalent `stale`.
- La reproductibilité vit dans le répertoire d’exécution : `render-spec.json`, la source de composition écrite et la version de la chaîne inscrite dans les métadonnées du paquet HyperFrames généré. Le rendu à nouveau de la même exécution réutilise ce contrat de rendu ; une nouvelle exécution vérifie le dernier HyperFrames.
- Un échec de lint ou de rendu n’est **pas** masqué derrière un placeholder (qui n’existe que pour `OMA_VIDEO_MOCK=1`) : `oma video render` se termine avec le code 1, les diagnostics et l’agent corrige la composition avec les dernières compétences. Une rupture sur une nouvelle version de HyperFrames est un bug de composition, jamais une raison d’épingler.

```yaml
video:
  hyperframes:
    check_interval_min: 60    # 0 = check on every compose
```

## Voir aussi

- [`/video` workflow](/docs/core-concepts/workflows) — le pipeline brief → script → éléments → render-spec → HyperFrames.
- [Génération d’images](/docs/guide/image-generation) — le routeur d’images fixes réutilisé comme fournisseur visuel vidéo.
