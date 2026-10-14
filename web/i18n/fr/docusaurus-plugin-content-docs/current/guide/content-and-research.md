---
title: "Guide : Workflows de contenu et de recherche"
sidebar_label: Vue d’ensemble
description: Choisir le bon parcours oh-my-agent, avec ses prérequis, pour l’extraction PDF et HWP, la voix, la recherche scientifique et web, les diapositives, les images, la vidéo, les explications de code, les diagrammes, l’étude de marché, les récapitulatifs, la traduction et la rédaction académique.
---

# Workflows de contenu et de recherche

Ce guide achemine les travaux documentaires, audio, de recherche, multimédias et de présentation vers la capacité qui en est responsable. Commencez par l’artefact dont vous avez besoin, puis utilisez le plus petit point d’entrée de commande ou de compétence qui produit un résultat révisable. Les capacités qui disposent de leur propre guide y renvoient dans la dernière colonne ; les autres sont traitées sur cette page.

| Besoin | Point d’entrée | Prérequis | Premier résultat | Guide |
|---|---|---|---|---|
| Extraire un PDF | compétence `oma-pdf`, ou les commandes `uvx opendataloader-pdf` ci-dessous | `uv` (pour `uvx`) | Markdown, texte, JSON ou court rapport d’extraction | [ci-dessous](#extract-pdf-content) |
| Extraire du HWP/HWPX/HWPML | compétence `oma-hwp` et `bunx kordoc@latest` | Bun | Markdown ou JSON/chunks structuré | [ci-dessous](#extract-hwp-family-documents) |
| Lire ou transcrire de l’audio | `/oma-voice` | Application Voicebox sur `127.0.0.1:17493` | Audio avec manifeste, ou `transcript.md` avec manifeste | [ci-dessous](#generate-speech-or-transcribe-audio) |
| Trouver et valider des articles | `oma scholar` | aucun ; `S2_API_KEY`, `OPENALEX_EMAIL` facultatifs | Résultats de recherche, sidecar récupéré ou rapport de lint | [ci-dessous](#search-and-validate-scholarly-material) |
| Rechercher sur le web ou récupérer une page | compétence `oma-search`, `oma search` | Chrome, Python `curl_cffi`, `yt-dlp`, `gh` facultatifs (à vérifier avec `oma search doctor`) | JSON sur stdout | [Commandes CLI : search](../cli-interfaces/commands.md#search) |
| Construire une présentation | compétence `oma-slide` et `oma slide` | Chrome, ou `OMA_CHROME_PATH` | Diapositives HTML validées et exports facultatifs | [ci-dessous](#slides-and-presentations) |
| Générer des images | compétence `oma-image`, `oma image generate` | l’un de `POLLINATIONS_API_KEY`, `codex login` ou un `agy` connecté | Images avec `manifest.json` sous `.agents/results/images/` | [Génération d’images](./image-generation.md) |
| Réaliser une vidéo courte, explicative ou de démonstration | `/video`, `oma video` | Node.js 22+, FFmpeg, puis `oma video doctor --install` | Un répertoire d’exécution sous `.agents/results/videos/` ; un MP4 après `oma video render` | [Génération de vidéos](./video-generation.md) |
| Expliquer un changement ou un sujet en une page | `/explain`, `oma explain` | git pour le mode changement ; `gh` pour les références de PR | HTML autonome sous `.agents/results/explain/` | [Explication de code](./code-explainer.md) |
| Diagramme d’architecture interactif | `/architecture`, `oma diagram` | aucun ; archify est récupéré à la première utilisation | Bloc Mermaid, plus `.archify.html` lorsque archify est résolu | [Moteur de diagrammes](./diagram-engine.md) |
| Étude de marché communautaire | compétence `oma-market`, `oma market` | Python 3.12+ | Un brief sous `.agents/results/market/` | [Étude de marché](./market-research.md) |
| Résumer des conversations d’agents | `/recap`, `oma recap` | aucun | JSON de récapitulatif depuis le CLI ; récapitulatif Markdown daté depuis `/recap` | [ci-dessous](#recap-agent-conversations) |
| Traduire ou réviser une prose localisée | compétence `oma-translation` | aucun | Texte dans la langue cible ou revue fondée sur les preuves | [ci-dessous](#translate-or-review-localized-content) |
| Rédiger ou auditer une prose académique | compétence `oma-academic-writing` | aucun | Brouillon, révision ou rapport de conformité avec une Claim-Evidence Map | [ci-dessous](#draft-or-audit-academic-writing) |

Les noms de commande `oma` de cette page sont des commandes publiques enregistrées. `uvx`, `bunx` et `bun` sont des outils de conversion externes documentés par leurs compétences propriétaires. Les autres [compétences](../getting-started/glossary.md#skill) sont des points d’entrée en langage naturel ou en commande slash ; il n’existe pas de commande autonome `oma pdf`, `oma hwp`, `oma voice`, `oma translation` ou `oma academic-writing`.

## Extraire le contenu PDF {#extract-pdf-content}

Utilisez la compétence `oma-pdf` lorsque l’entrée est un PDF et que la sortie doit fournir une structure lisible à une personne, à un LLM ou à un pipeline de récupération. La compétence sonde la couche de texte avant de choisir une extraction standard, balisée ou OCR hybride.

Pour vérifier rapidement la couche de texte, affichez une petite plage de pages sans créer de fichier de sortie :

```bash
uvx opendataloader-pdf "<input.pdf>" -f text --pages 1-3 --to-stdout -q
```

Pour extraire et normaliser en Markdown :

```bash
OUT=".agents/results/pdf/<document>"
uvx opendataloader-pdf "<input.pdf>" --format markdown --output-dir "$OUT"
uvx mdformat "$OUT/<document>.md"
```

Choisissez une plage avec `--pages` pour les documents volumineux. Si la couche de texte est lisible, restez sur l’extraction standard. Si une structure balisée est présente mais que l’ordre de lecture est mauvais, réessayez avec `--use-struct-tree` ; pour les tableaux brisés, essayez `--table-method cluster` ou `--markdown-with-html` avant de passer à l’OCR.

Pour un PDF numérisé ou fondé sur des images, démarrez le serveur hybride puis lancez le convertisseur hybride :

```bash
# Terminal 1: leave this local server running while the conversion runs.
uvx --from "opendataloader-pdf[hybrid]" opendataloader-pdf-hybrid \
  --port 5002 --force-ocr --ocr-lang "ko,en"
```

Dans un second terminal, définissez le répertoire de sortie et lancez le convertisseur :

```bash
OUT=".agents/results/pdf/<document>"
uvx opendataloader-pdf --hybrid docling-fast --hybrid-mode full \
  "<input.pdf>" --format markdown --output-dir "$OUT"
```

L’artefact réussi est le fichier Markdown ou texte du répertoire de sortie sélectionné, accompagné du nombre de pages et des éventuelles notes de qualité. Les PDF chiffrés nécessitent une copie déverrouillée ou un mot de passe. Les fichiers volumineux peuvent nécessiter des plages de pages et répertoires de sortie distincts afin que des exécutions répétées n’écrasent pas le même basename. Ne traitez pas les suppositions de l’OCR comme des faits de la source ; signalez les tableaux incertains ou manquants.

## Extraire les documents de la famille HWP {#extract-hwp-family-documents}

Utilisez `oma-hwp` pour les fichiers `.hwp`, `.hwpx` et `.hwpml`. La compétence exécute `kordoc` via Bun, puis post-traite les tableaux Markdown et les glyphes de la Private Use Area lorsque nécessaire.

```bash
OUT=".agents/results/hwp/<document>.md"
bunx kordoc@latest "<input.hwp>" -o "$OUT"

# The skill's cleanup helper; set this to the project or global oma-hwp skill directory.
HWP_SKILL_DIR=".agents/skills/oma-hwp"
bun "$HWP_SKILL_DIR/resources/flatten-tables.ts" "$OUT"
```

Sur un clone neuf, l’assistant peut signaler `Cannot find module "turndown"` ; lancez `bun install` dans le répertoire `resources/` de la compétence `oma-hwp`, puis relancez l’assistant.

Utilisez un répertoire de sortie explicite pour un lot :

```bash
bunx kordoc@latest "./incoming/*.hwpx" -d ".agents/results/hwp"
```

La sortie par défaut est Markdown. Pour un AST structuré, utilisez `bunx kordoc@latest "<input.hwp>" --format json` ; pour des fragments orientés récupération, utilisez `--format chunks`. Les options de conversion `--dedupe-headers`, `--keep-empty-cols` et `--inline-images` contrôlent les cas courants de tableaux et d’images. Vérifiez les titres, tableaux imbriqués ou fusionnés, listes, images, notes de bas de page et liens du résultat avant de le transmettre à une autre compétence.

`bun` et `bunx` sont des prérequis. Une sortie vide peut indiquer un contenu sous forme d’image numérisée ; acheminez ce cas vers un workflow capable d’OCR. Un contenu chiffré ou limité par DRM peut rester incomplet. Les entrées PDF, DOCX et XLSX appartiennent à leurs compétences correspondantes, même si `kordoc` possède d’autres sous-commandes d’écriture et d’analyse.

## Générer de la parole ou transcrire de l’audio {#generate-speech-or-transcribe-audio}

`oma-voice` est natif MCP et utilise un serveur Voicebox local. Invoquez-le dans un agent avec une commande slash :

```text
/oma-voice "The build is ready for review."
/oma-voice --profile prof_warm_korean "다음 단계 진행 준비됐어요"
/oma-voice transcribe ~/Downloads/standup.m4a
```

La synthèse vocale accepte jusqu’à 5 000 caractères par appel et nécessite un profil vocal Voicebox. La transcription ne nécessite pas de profil TTS et accepte un audio allant jusqu’à 30 minutes. Les travaux TTS et STT persistés écrivent sous `.agents/results/voice/` ; la transcription produit `transcript.md` et `manifest.json`. Le mode notification reste normalement dans Voicebox Captures et n’écrit pas de fichier audio local.

L’endpoint MCP local est `http://127.0.0.1:17493/mcp`. Une configuration de première utilisation enregistre Voicebox auprès de l’agent et l’application de bureau Voicebox fournit les profils vocaux. La compétence découvre les vrais noms d’outils MCP avec `tools/list`, puis appelle `voicebox_speak`, `voicebox_transcribe` ou `voicebox_list_profiles`. Si la synthèse vocale n’a pas de profil, créez-en ou sélectionnez-en un dans Voicebox ; découper une demande trop longue est une décision utilisateur, car la compétence ne la découpe pas automatiquement. Si le serveur est indisponible, vérifiez l’endpoint de santé local et redémarrez Voicebox avant de réessayer.

## Rechercher et valider des ressources scientifiques {#search-and-validate-scholarly-material}

Utilisez le CLI `oma scholar` pour les sidecars Knows et les métadonnées d’articles. search et resolve sont des opérations de découverte ; `get` récupère un enregistrement ou une section choisie ; `lint` est la porte de partage.

```bash
oma scholar search "vision language action" --limit 10
oma scholar search --year-min 2024 "vision language action"
oma scholar resolve "Attention Is All You Need"
oma scholar get "10.48550/arXiv.1706.03762"
oma scholar get --section statements "knows:generated/reconvla/1.0.0"
oma scholar lint paper.knows.yaml
oma scholar lint --lenient paper.knows.yaml
oma scholar lint --fail-on-warning paper.knows.yaml
```

Knows est essayé en premier, avec des replis OpenAlex et Semantic Scholar. `--section` peut demander `statements`, `evidence`, `relations`, `artifacts` ou `citation`. Utilisez `--lenient` lorsque des références croisées pendantes sont attendues pendant l’assemblage local ; utilisez `--fail-on-warning` pour une porte CI stricte. Un résultat de recherche ou un sidecar récupéré constitue une preuve de découverte, pas une affirmation que l’article soutient chaque conclusion. Générez ou révisez un sidecar dans l’agent, puis lancez `oma scholar lint` avant de le partager.

Si un service distant expire, réessayez une requête plus large ou autorisez le repli du CLI ; `--always-fallback` interroge OpenAlex et Semantic Scholar même lorsque Knows renvoie des résultats. Un 429 de Semantic Scholar peut être une limite du pool anonyme ; réessayez plus tard, ou définissez `S2_API_KEY`. Définissez `OPENALEX_EMAIL` (et éventuellement `OPENALEX_API_KEY`) pour identifier vos requêtes OpenAlex. Si un sidecar contient une erreur d’énumération de provenance, utilisez `tool`, `person` ou `org` ; si des avertissements de densité des relations persistent, ajoutez uniquement les relations de preuve prises en charge lorsque la source les justifie.

## Diapositives et présentations {#slides-and-presentations}

Utilisez `oma-slide` lorsque le livrable est une présentation sur une scène fixe. La compétence d’écriture produit des fragments HTML en 1920×1080 ; le CLI valide la géométrie, assemble le deck et l’exporte.

```bash
DECK_DIR=".agents/results/slides/<session-id>"
oma slide create --output-dir "$DECK_DIR"
# author slide-01.html and meta.json in "$DECK_DIR"
oma slide validate --workspace "$DECK_DIR" --output json
oma slide preview --workspace "$DECK_DIR"
oma slide bundle --workspace "$DECK_DIR"
```

Exportez uniquement après validation :

```bash
oma slide export pdf --workspace "$DECK_DIR" --output-file "$DECK_DIR/out/deck.pdf" --mode capture
oma slide export png --workspace "$DECK_DIR" --output-dir "$DECK_DIR/out/png" --resolution 1080p
oma slide export pptx --workspace "$DECK_DIR" --output-file "$DECK_DIR/out/deck.pptx"
```

Utilisez `--slide <file>` pour une vérification sur une seule diapositive et `--report-file <path>` avec une sortie JSON lorsqu’un autre processus a besoin des résultats. `slide import pptx <file>` démarre un workflow d’importation ; `slide asset fetch-video <url>` télécharge un élément vidéo ; `slide style list|preview|get <slug>` examine les styles. La sortie PPTX est fondée sur un raster et ne fournit donc ni texte ni calques de formes modifiables. La validation et l’export nécessitent Chrome/puppeteer ; définissez `OMA_CHROME_PATH` lorsque l’exécutable n’est pas détectable. Si la validation ne converge pas après trois itérations d’auto-correction, utilisez les problèmes de géométrie signalés pour modifier le fragment concerné.

## Récapituler les conversations d’agents {#recap-agent-conversations}

Utilisez `/recap` (ou demandez un récapitulatif à l’agent) pour des synthèses de travail fondées sur les preuves ; il exécute `oma recap` pour collecter l’historique. Une date calendaire et une fenêtre glissante sont des entrées différentes :

```bash
# A calendar day
oma recap --date "$(date +%F)" --json

# A rolling 24-hour window ending now
oma recap --json

# A rolling multi-day window, capped at 30 days
oma recap --window 7d --tool claude,codex --json
```

Ces commandes affichent l’historique collecté (texte de terminal par défaut, JSON avec `--json` ou diagramme de Gantt Mermaid avec `--mermaid`), et `--graph` ouvre à la place un graphe interactif dans le navigateur ; le CLI lui-même n’écrit aucun fichier. `/recap` enregistre le récapitulatif Markdown sous `.agents/results/recap/`, normalement sous la forme `{date}.md` pour un récapitulatif quotidien ou `{start-date}~{end-date}.md` pour une plage. Le récapitulatif regroupe par contenu de travail, distingue le travail demandé et en cours du travail terminé et consigne l’historique manquant des outils. Utilisez `--top` ou `--sort` lorsque le rapport doit être plus ciblé. Si le CLI est indisponible, la compétence peut utiliser le repli documenté de l’historique Claude, mais la couverture réduite de la source doit être indiquée.

Utilisez `oma retro` pour une rétrospective technique fondée sur git. Elle répond à une question différente d’un récapitulatif de conversation et peut comparer des fenêtres adjacentes avec `--compare`.

## Traduire ou réviser du contenu localisé {#translate-or-review-localized-content}

Utilisez `oma-translation` pour les chaînes d’interface, la documentation, les rapports, le texte marketing ou la prose académique. Invoquez-la en langage naturel ou avec le point d’entrée de compétence `/oma-translation` ; il n’existe pas de commande publique `oma translation`.

Donnez à la compétence la source, la locale cible, le type de contenu et indiquez s’il s’agit d’une traduction, d’une revue ou d’une synchronisation avec un diff source. Elle charge un profil linguistique correspondant depuis les ressources de la compétence lorsqu’il existe, conserve les placeholders, liens, structure Markdown et syntaxe protégée, puis suit les traductions sœurs et le glossaire du projet. Pour un document long ou une revue, elle applique aussi le rubric de traduction. Si aucun profil cible n’existe, elle utilise les règles partagées et signale cette limite une fois.

Pour la documentation, traduisez la page anglaise stable après la mise en place de ses ancres et exemples de commandes. Gardez les noms de CLI, flags, chemins, variables d’environnement et blocs de code exacts ; traduisez l’explication autour et vérifiez la structure de la page cible par rapport à l’anglais. Une signification ambiguë dans la source doit être signalée plutôt que devinée silencieusement.

## Rédiger ou auditer une écriture académique {#draft-or-audit-academic-writing}

Utilisez `oma-academic-writing` pour les essais, rapports, revues de littérature, analyses, synthèses, conclusions et révisions en anglais. Sélectionnez un mode et fournissez la grille ou les contraintes de source :

```text
Draft a literature review in draft mode from these sources. Include a Claim-Evidence Map.
Revise this section in revise mode against the quoted rubric below.
Review this draft in review mode and return the compliance report with recommended fixes.
```

`draft` renvoie la prose, des Writing Notes et une Claim-Evidence Map. `revise` renvoie les blocs original et révisé ainsi que les changements concrets. `review` renvoie les constats PASS/FAIL pour la structure des phrases, les verbes, le hedging, la spécificité, les motifs anti-IA, la clarté des paragraphes, le rythme et l’alignement des claims et des preuves. La compétence lit entièrement un brouillon existant pour revise/review, affaiblit ou retire les claims non étayés et transmet les sorties non anglaises à `oma-translation` après le passage anglais.

Utilisez `oma scholar` pour découvrir les sources et les preuves sidecar avant de rédiger. Si une citation ou une grille manque, marquez le claim comme en attente ou demandez la contrainte manquante ; ne comblez pas le manque avec une source inventée. L’artefact de fin utile est la prose accompagnée de la carte des preuves ou du rapport d’audit, plutôt qu’un paragraphe générique « poli » sans soutien traçable.

## Liste de récupération

| Symptôme | Action suivante |
|---|---|
| La sortie est vide ou structurellement déformée | Vérifiez le type d’entrée, puis choisissez le mode balisé, tableaux ou OCR pour les PDF ; pour HWP, vérifiez Bun et inspectez la source pour les pages composées uniquement d’images. |
| Une compétence locale ne peut pas se connecter | Vérifiez le service ou CLI local propriétaire (`Voicebox`, `Chrome`, `uvx`, `bunx`) avant de modifier la demande de contenu. |
| Un résultat de recherche est pauvre | Élargissez la requête, examinez l’état du repli/de la source et conservez l’incertitude dans le rapport. |
| Un export de diapositive échoue | Lancez `oma slide validate --workspace <dir> --output json`, corrigez les problèmes de géométrie ou de police, puis exportez à nouveau. |
| Un récapitulatif exagère l’achèvement | Revérifiez les reçus et les artefacts ; une invite ou un appel d’outil seul ne constitue pas une preuve d’achèvement. |
| Une traduction modifie la syntaxe du code | Restaurez les noms protégés et relancez les vérifications de structure avant de réviser la prose. |
| La prose académique contient des claims non étayés | Supprimez ou nuancez le claim, ajoutez des preuves via le parcours scholar et relancez la Claim-Evidence Map. |

## Étapes suivantes

- [Génération d’images](./image-generation.md), [Génération de vidéos](./video-generation.md), [Explication de code](./code-explainer.md), [Moteur de diagrammes](./diagram-engine.md) et [Étude de marché](./market-research.md) — les guides des capacités du tableau ci-dessus
- [Commandes CLI](../cli-interfaces/commands.md) et [Options CLI](../cli-interfaces/options.md) — les chemins CLI enregistrés complets et les alias d’options
- [Référence de configuration](./configuration-reference.md) — les sections de configuration `pdf`, `hwp`, `voice` et `scholar`
