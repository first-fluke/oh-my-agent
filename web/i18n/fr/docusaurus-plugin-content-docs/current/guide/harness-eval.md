---
title: Évaluation du harnais
sidebar_label: Évaluation du harnais
description: Évaluer une superposition complète de harnais OMA avec des tâches de dépôt appariées et isolées et des vérifications d’artefacts déterministes.
---

# Évaluation du harnais

`oma harness eval` mesure si un harnais OMA candidat améliore un agent cible fixe sans modifier le modèle de cet agent. La commande adapte le protocole d’évaluation au moment du test de [AI4AI at Test-Time: Strong-to-Weak Capability Transfer via Harnesses](https://arxiv.org/abs/2608.12307) : garder le modèle cible fixe, modifier le harnais et comparer les résultats sur les mêmes tâches.

Cette commande évalue une unité plus grande que `oma skill eval` :

| Commande | Traitement | Cible du score |
|:--------|:----------|:-------------|
| `oma skill eval` | Un corps `SKILL.md` | Sortie de l’agent |
| `oma harness eval` | Une superposition `.agents/` limitée au périmètre | Fichiers et sortie produits dans un espace de travail de dépôt |

Utilisez l’évaluation de compétence pour répondre à « cette compétence aide-t-elle ? ». Utilisez l’évaluation du harnais pour répondre à « cette combinaison de compétences, workflows, règles et instructions d’agent permet-elle à l’agent fixe d’accomplir les tâches du dépôt de manière plus fiable ? ».

## Modèle d’évaluation

Une exécution live évalue chaque tâche comme une expérience appariée :

1. OMA capture la fixture initiale de la tâche. Un instantané complet initialise les deux bras afin qu’ils partent des mêmes fichiers, même si la fixture source change pendant l’exécution.
2. OMA copie les définitions actuelles `agents`, `config`, `rules`, `skills` et `workflows` dans cet espace de travail et les projette dans le format du fournisseur sélectionné.
3. OMA répète l’installation dans un second espace de travail neuf et y applique la superposition candidate.
4. Le même agent principal, la même route fournisseur, la même autorisation d’écriture et le même délai d’expiration sont utilisés pour les deux bras.
5. Des vérifications déterministes inspectent l’espace de travail produit et la sortie facultative de l’agent. Les vérifications de commande de confiance s’exécutent ensuite dans une copie neuve des artefacts de la tâche.

Le vrai projet n’est jamais utilisé comme répertoire de travail d’un bras. OMA capture la sortie brute et les artefacts finaux de la tâche avant les vérifications et le nettoyage de l’espace de travail temporaire. Le bac à sable du processus propre au fournisseur sélectionné reste l’autorité pour les accès en dehors du répertoire de travail.

## Structure du candidat

Le chemin du candidat est un répertoire contenant une arborescence `.agents/` partielle :

```text
candidate/
└── .agents/
    ├── agents/
    │   └── docs-curator.md
    ├── rules/
    │   └── documentation.md
    ├── skills/
    │   └── project-docs/
    │       └── SKILL.md
    └── workflows/
        └── docs-check.md
```

Seuls les fichiers sous `.agents/agents`, `.agents/rules`, `.agents/skills` et `.agents/workflows` sont acceptés. Les hooks, fixtures de l’évaluateur, l’état, les résultats, les fichiers de configuration, les liens symboliques et les variantes d’agents fournisseurs sont rejetés. Les champs protégés du frontmatter d’agent, comme `model`, `tools`, `effort` et les limites d’exécution, doivent correspondre à la référence. Un bras échoue également si l’agent en cours modifie les définitions protégées de `.agents/` avant le scoring.

## Format de la suite

Une suite est constituée d’un fichier YAML et d’un répertoire de fixture par tâche :

```text
harness-eval/
├── suite.yaml
└── fixtures/
    ├── stale-api-doc/
    │   ├── docs/api.md
    │   └── src/session.ts
    └── missing-guide/
        ├── docs/
        └── src/feature.ts
```

```yaml
schema_version: 2
id: docs-harness
agent: docs-curator
tasks:
  - id: stale-api-doc
    partition: validation
    prompt: Update the API documentation to match the implementation.
    workspace: fixtures/stale-api-doc
    weight: 1
    checks:
      - type: file_contains
        path: docs/api.md
        value: openSession
      - type: file_not_contains
        path: docs/api.md
        value: createSession
  - id: missing-guide
    partition: final-test
    prompt: Write the missing guide for the feature in this fixture.
    workspace: fixtures/missing-guide
    checks:
      - type: file_exists
        path: docs/feature.md
```

La version 2 exige à la fois des tâches `validation` et `final-test`. Chaque tâche doit déclarer sa partition. La validation est la valeur par défaut ; utilisez `--partition final-test` pour une exécution finale distincte après la sélection du candidat. Les deux partitions ne peuvent ni partager ni imbriquer de répertoires de fixtures. Conservez les fichiers d’enregistrement en dehors des répertoires de fixtures, des superpositions candidates et des entrées de l’évaluateur ; ces emplacements sont rejetés pour empêcher les exécutions ultérieures de voir les vérifications finales. Les suites de version 1 s’exécutent toujours en tant que `exploratory` ; elles ne peuvent pas être sélectionnées comme test final.

Les ID de tâches doivent être uniques. Les chemins de fixtures et de vérifications doivent rester dans le projet et l’espace de travail de la tâche. Les suites et les fixtures doivent également rester en dehors des définitions de référence copiées dans chaque bras. Les fixtures ne peuvent pas contenir de liens symboliques ni de surfaces de contrôle du harnais d’agent telles que `.agents`, `.codex`, `.claude`, des répertoires de compétences fournisseur ou des fichiers d’instructions d’agent à la racine. Cela empêche les données de tâche d’usurper l’identité du harnais contrôlé de l’un ou l’autre bras.

Les répertoires de dépendances générés tels que `node_modules` et `.venv` ne sont pas copiés depuis le harnais de référence. Validez la source de l’assistant déterministe et les manifestes de dépendances dans la compétence ; fournissez les dépendances d’exécution dans la fixture de tâche lorsqu’une vérification en a besoin.

### Types de vérification

| Type | Champs | Condition de réussite |
|:-----|:-------|:---------------|
| `file_exists` | `path` | Le chemin existe après la fin du bras. |
| `file_not_exists` | `path` | Le chemin n’existe pas. |
| `file_contains` | `path`, `value` | Le fichier existe et contient la valeur. |
| `file_not_contains` | `path`, `value` | Le fichier existe et ne contient pas la valeur. |
| `output_contains` | `value` | La sortie capturée de l’agent contient la valeur. |
| `output_not_contains` | `value` | La sortie capturée de l’agent ne contient pas la valeur. |
| `output_judge` | `rubric` | Contrat noté porté par les incidents ; l’évaluateur mécanique l’indique comme non évalué (voir [Cas de régression d’incident](./harness-incidents.md)). |
| `file_json_equals` | `path`, `value`, `pointer` facultatif | Le JSON analysé du fichier est égal à `value`, éventuellement à l’emplacement d’un JSON Pointer. |
| `output_json_equals` | `value`, `pointer` facultatif | La sortie capturée est un JSON valide et égale `value`, éventuellement à l’emplacement d’un JSON Pointer. |
| `command` | `argv`, `checker`, `timeout_ms`, `expected_exit_code` | Le sous-processus de confiance se termine dans son délai d’expiration et retourne le code de sortie spécifié. |

Les assertions JSON comparent des valeurs analysées, types compris ; un texte qui annonce un succès ne peut pas satisfaire une assertion d’état JSON. `pointer` utilise la syntaxe JSON Pointer, par exemple `/result/count`, et désigne par défaut la valeur entière.

Les vérifications de commande sont rédigées par le propriétaire de confiance de la suite :

```yaml
- type: command
  argv: [/absolute/path/to/node, "{checker}", state.json]
  checker: checkers/verify-state.mjs
  timeout_ms: 5000
  expected_exit_code: 0
```

`checker` se résout relativement au fichier de suite. Ce doit être un fichier source ordinaire et autonome, stocké en dehors de chaque fixture, de la superposition candidate et des définitions `.agents` de référence. `argv[0]` doit être un exécutable absolu situé en dehors du projet ; `{checker}` doit constituer un argument complet. OMA transmet les arguments directement, sans interpolation par le shell. Les délais d’expiration doivent être des entiers positifs d’au plus 300 000 millisecondes. Les codes de sortie sont des entiers de 0 à 255.

Avant la répartition, OMA prend un instantané des octets source du vérificateur et calcule le hachage des définitions de l’évaluateur et de l’exécutable. Après la répartition, il copie les artefacts de la tâche dans un espace de travail temporaire distinct, écrit le vérificateur issu de l’instantané en dehors de ces artefacts et l’invoque à cet endroit. Chaque commande reçoit une copie neuve ; un vérificateur ne peut pas modifier l’entrée de la vérification suivante. Les projections de harnais générées sont exclues et les liens symboliques d’artefacts sont rejetés. Une modification de la source du vérificateur pendant l’exécution d’un bras fait échouer ce bras ; une source modifiée n’est jamais substituée à l’instantané. Le vérificateur doit utiliser des assertions fixes sur les artefacts ou sur le comportement de l’application, et ne doit pas déléguer son verdict à des tests ou à des scripts de paquets que le candidat peut modifier.

Les vérifications et les chemins des vérificateurs ne sont pas ajoutés à l’invite de l’agent ni à la fixture. L’entrée de la tâche sélectionnée est nécessairement visible pendant son exécution. Cela protège l’intégrité de l’évaluateur et sépare les partitions ; cela n’empêche pas un processus du même utilisateur de lire d’autres fichiers de l’hôte.

## Exécuter et enregistrer

Le mode live lance deux répartitions par tâche sélectionnée, affiche un aperçu des répartitions et demande une confirmation :

```bash
oma harness eval \
  --suite harness-eval/suite.yaml \
  --candidate candidate \
  --live --record \
  --record-file harness-eval/_runs/trial-1.json
```

Utilisez `--yes` pour une exécution non interactive et `--timeout-minutes` pour définir une limite de temps murale identique pour chaque bras. L’exécution live exige un fournisseur qui découvre les fichiers du harnais relativement à l’espace de travail du projet. OMA refuse la découverte fondée sur HOME, car la référence pourrait voir du contenu candidat installé globalement.

`--record` écrit un enregistrement JSON immuable de version 2. L’emplacement par défaut est `_runs/` à côté de la suite, avec les hachages de référence et de candidat dans le nom de fichier. Utilisez un nouveau `--record-file` pour une autre exécution live ; une destination existante est rejetée avant la répartition. Les enregistrements préservent :

- l’identité de la suite, la partition, la provenance des invites et des fixtures, les hachages de référence et de candidat, ainsi que les hachages de l’évaluateur, des vérificateurs et des exécutables ;
- la sortie d’origine et son hachage, y compris le stdout de diagnostic disponible des répartitions échouées ;
- les manifestes d’artefacts initiaux et finaux, avec les octets des fichiers, les hachages par fichier, les modes des fichiers et des répertoires, et un condensé du manifeste ;
- les références des vérificateurs, les résultats des bras, l’identité de l’incident lorsqu’elle est fournie, et le hachage de l’enregistrement source pour une nouvelle exécution.

Les instantanés de tâche sont bornés à 5 MiB par fichier, 32 MiB au total et 2 000 entrées. Les liens symboliques, les fichiers spéciaux, les chemins contenant des secrets, les fichiers illisibles et les données trop volumineuses sont enregistrés comme omissions. Les contrôles du harnais copiés sont exclus des artefacts finaux de la tâche. Les instantanés incomplets restent des limites explicites de la preuve ; ils ne peuvent ni alimenter une nouvelle exécution épinglée ni satisfaire un rescoring de fichiers. La sortie brute peut tout de même appuyer des vérifications portant uniquement sur la sortie lorsque la répartition d’origine a réussi.

Les enregistrements ont leur propre hachage d’intégrité. Un hachage d’enregistrement ou d’artefact modifié est rejeté. Ces hachages identifient les preuves ; ils n’attestent pas le confinement du processus et ne rendent pas un résultat prêt pour la promotion.

### Conditions d’exécution

Chaque évaluation live ou en nouvelle exécution résout un manifeste d’exécution avant la première répartition et le stocke dans l’enregistrement sous `manifest`. Il nomme les conditions que décrit un verdict, afin qu’un score stocké ne soit jamais pris pour une preuve concernant un autre modèle, une autre CLI ou un autre build d’OMA :

| Champ | Signification |
|---|---|
| `vendor`, `dispatchMode`, `runtimeVendor`, `command` | Route de répartition résolue et nom de l’exécutable de la CLI. |
| `model`, `modelSource` | Le modèle qu’OMA a résolu à partir du plan de l’agent ou de la valeur par défaut du fournisseur. `vendor-session` signifie que la configuration de session propre au fournisseur sélectionne le modèle et qu’OMA ne l’a pas épinglé. |
| `effort`, `thinking` | Paramètres de raisonnement tirés du plan de l’agent lorsqu’ils sont présents. |
| `cliVersion`, `cliVersionStatus` | Première ligne de `<command> --version` (`probed`), ou `unavailable` lorsque la sonde a échoué. |
| `omaVersion`, `platform`, `arch`, `node` | Hôte et build d’OMA. |
| `environmentPolicy` | Noms des variables d’environnement reçues par les bras, entrées forcées et nombre de variables supprimées. Les valeurs ne sont jamais enregistrées. |
| `memory`, `confinement` | `memory: disabled` pour chaque bras ; `confinement` indique ce que la répartition restreint ou non (espace de travail temporaire, réseau non restreint, identifiants hérités, outils par défaut du fournisseur). |
| `manifestHash` | Identité des conditions ci-dessus. |

Le manifeste est une description, pas une attestation : il consigne ce qu’OMA a résolu, et les champs de confinement indiquent explicitement que l’isolation du réseau et des identifiants n’est pas appliquée. `promotionReady` reste `false`.

### Politique d’environnement

Les deux bras reçoivent le même environnement filtré par une liste d’autorisation. Les variables de base (`PATH`, `HOME` et les paramètres de locale, de répertoire temporaire, de proxy et de certificats), toutes les variables `OMA_*` ainsi que les préfixes d’identifiants et de détection du runtime du fournisseur cible sont transmis ; les entrées qu’un constructeur de répartition ajoute pour l’invocation sont conservées. Tout le reste est supprimé afin qu’un candidat ne puisse pas atteindre par accident un jeton de déploiement ou la clé d’un autre fournisseur. `OMA_NO_AGENTMEMORY=1` est forcé pour que la mémoire du fournisseur ne puisse pas transporter de contexte entre le bras de référence et le bras candidat.

Définissez `OMA_HARNESS_ENV_PASSTHROUGH=NAME1,NAME2` pour transmettre des variables supplémentaires dont une tâche a réellement besoin. Les noms apparaissent dans le manifeste sous `environmentPolicy.extra`. Pour un fournisseur sans jeu de préfixes connu, le manifeste indique `vendorKnown: false` et seules les entrées de base, `OMA_*` et de transmission atteignent le processus.

## Réutiliser un enregistrement

La commande distingue quatre actions :

| Action | Travail effectué | Appels d’agent/de modèle |
|:-------|:---------------|:------------------|
| `inspect` | Agréger les verdicts de bras stockés après validation de la provenance. Aucune vérification n’est exécutée. | Aucun |
| `rescore` | Appliquer les vérifications courantes de sortie et de fichiers à la sortie brute et aux octets d’artefacts d’origine. | Aucun |
| `fixture-replay` | Faire correspondre une transcription de requêtes d’outils fournie, rejouer ses réponses de fixture et ses modifications de fichiers, puis appliquer les vérifications prises en charge. | Aucun |
| `rerun` | Exécuter l’agent configuré dans de nouveaux espaces de travail initialisés à partir des instantanés initiaux enregistrés. | Deux par tâche sélectionnée |

`--action inspect` est la valeur par défaut. `--mock` est un alias de l’inspection et ne peut pas être combiné avec une autre action. Ni l’inspection ni le rejeu de fixtures ne relance un agent.

### Inspecter les verdicts stockés

```bash
oma harness eval \
  --suite harness-eval/suite.yaml \
  --candidate candidate \
  --action inspect \
  --record-file harness-eval/_runs/trial-1.json
```

L’inspection exige que les hachages d’origine de la suite, de la partition, de l’évaluateur, de la référence et du candidat correspondent. Elle affiche les scores enregistrés sans invoquer les vérificateurs ni réévaluer la sortie. Les enregistrements de version 1 restent disponibles pour l’inspection lorsque leur provenance requise correspond. Les anciens enregistrements sans provenance de partition ou d’évaluateur ne peuvent pas passer la validation actuelle de la CLI. Les verdicts hérités ne peuvent pas être réétiquetés comme de nouvelles preuves brutes : collectez un nouvel enregistrement live pour un rescoring, un rejeu de fixtures ou une nouvelle exécution épinglée.

### Rescorer les preuves d’origine

```bash
oma harness eval \
  --suite harness-eval/suite.yaml \
  --candidate candidate \
  --action rescore \
  --record-file harness-eval/_runs/trial-1.json
```

Le rescoring utilise les vérifications courantes et ignore les valeurs `passed` et les verdicts de vérification d’origine. L’identité de la suite, l’ID de tâche, l’invite, l’identité de l’incident, la référence, le candidat et la partition sélectionnée doivent toujours correspondre. Les définitions de vérificateur peuvent changer ; le nouveau résultat décrit la façon dont les octets d’origine se comportent face à ces vérifications. Les modifications apportées aujourd’hui aux fichiers de fixture ne remplacent pas les artefacts finaux enregistrés.

Les vérifications de commande sont insuffisantes pour un rescoring hors ligne, car l’enregistrement n’épingle ni le runtime externe ni l’environnement. Les vérifications visant des artefacts exclus ou incomplets sont également insuffisantes. Une répartition d’origine échouée laisse une sortie de diagnostic, qui ne peut pas devenir une mesure valide par rescoring. Utilisez une nouvelle exécution live lorsque les critères d’acceptation actuels exigent l’exécution d’une commande.

### Rejouer les fixtures d’outils

Un fichier de transcription contient un objet, ou un tableau d’objets dont les ID de tâche sont uniques. Fournissez une transcription par tâche sélectionnée :

```json
{
  "schemaVersion": 1,
  "taskId": "stale-api-doc",
  "requests": [
    { "tool": "documentation", "request": { "path": "docs/api.md" } }
  ],
  "steps": [
    {
      "tool": "documentation",
      "request": { "path": "docs/api.md" },
      "response": { "body": "Use openSession." },
      "writes": [
        { "path": "docs/api.md", "content": "Use openSession.\n" }
      ],
      "removes": []
    }
  ],
  "output": "Fixture completed.",
  "dependencies": [
    { "name": "documentation", "repeatability": "fixture" }
  ]
}
```

```bash
oma harness eval \
  --suite harness-eval/suite.yaml \
  --candidate candidate \
  --action fixture-replay \
  --record-file harness-eval/_runs/trial-1.json \
  --transcript harness-eval/tool-fixtures.json
```

Les requêtes doivent correspondre exactement à la séquence d’étapes, par nom d’outil et par valeur de requête. `writes` et `removes` sont des modifications facultatives de fichiers de tâche, exprimées par des chemins relatifs ; elles ne peuvent ni sortir de l’espace de travail ni modifier les contrôles du harnais. Les noms d’outils sont des données, et aucune commande de transcription n’est exécutée. `output` est une donnée de fixture, requise lorsqu’une vérification de sortie en a besoin.

Chaque dépendance déclarée possède un `name`, une `repeatability` (`fixture`, `live` ou `unavailable`) et, facultativement, une `reason` et une référence `fixture`. Une dépendance de fixture exige une étape correspondante portant ce nom d’outil. Les dépendances live ou indisponibles rendent le rejeu insuffisant. Le champ facultatif `fixture` est descriptif ; le rejeu consomme les étapes fournies plutôt que de charger ce chemin. Le rejeu de transcription valide les dépendances déclarées et n’établit pas que toutes les dépendances historiques aient été capturées.

Les deux bras enregistrés doivent avoir le même instantané initial complet. OMA applique la même transcription à chaque bras et exécute les vérifications courantes de sortie et de fichiers. Les vérifications de commande exigent une nouvelle exécution live. Ces résultats montrent que la séquence de fixtures fournie peut être rejouée ; ils ne peuvent pas établir une amélioration comportementale du candidat ni la reproductibilité du modèle.

### Relancer l’agent à partir des fichiers initiaux épinglés

```bash
oma harness eval \
  --suite harness-eval/suite.yaml \
  --candidate candidate \
  --action rerun \
  --record-file harness-eval/_runs/trial-1.json
```

Une nouvelle exécution exige une identité de suite et de tâche correspondante, ainsi que des instantanés initiaux complets identiques pour les deux bras d’origine. Elle lance de vrais appels d’agent en utilisant la référence et le candidat actuels, la route fournisseur/modèle configurée et les vérifications courantes. Elle n’utilise pas les artefacts finaux d’origine comme état de départ. Une modification ultérieure de la fixture source ne peut donc pas changer silencieusement l’état initial enregistré.

Les nouvelles exécutions ont le même aperçu des répartitions, la même confirmation et le même comportement de délai d’expiration que les exécutions live. Elles peuvent utiliser un candidat modifié ; sélectionnez explicitement la source d’origine avec `--record-file`. Ajoutez `--record` pour enregistrer un nouveau fichier voisin dont le nom se termine par `-rerun-<timestamp>.json`, lié au hachage de l’enregistrement source. L’enregistrement d’origine est préservé.

Les fichiers épinglés ne reproduisent ni l’état des services externes, ni le comportement de l’horloge, ni l’échantillonnage du modèle. Une nouvelle exécution constitue une preuve comportementale récente dans les conditions indiquées, et non l’affirmation que la trajectoire d’origine de l’agent a été reproduite de façon déterministe.

### Conditions enregistrées lors du rejeu

`inspect`, `rescore` et `fixture-replay` rapportent le manifeste stocké dans l’enregistrement avec `conditions: "recorded"`, ou `conditions: "unavailable"` pour un enregistrement antérieur aux manifestes. OMA résout aussi les conditions actuelles et énumère chaque différence de fournisseur, de mode de répartition, de modèle, d’effort, de réflexion, de version de la CLI, de version d’OMA ou d’hôte comme une limite du rejeu et un blocage de la promotion :

```text
replay limitation: Recorded conditions differ from current: model: recorded "gpt-5.4", current "gpt-5.5"
```

La version de la CLI n’est sondée lors du rejeu que si l’enregistrement porte lui-même une version sondée ; une paire non sondée est signalée comme non comparable plutôt que comme égale. Les verdicts enregistrés restent consultables dans leurs conditions d’origine. Ils ne constituent pas une preuve pour le candidat dans les conditions actuelles tant qu’une évaluation live ou en nouvelle exécution n’a pas produit un enregistrement dont le manifeste correspond.

### Consommation

Chaque bras stocke `usage` lorsque le fournisseur l’a rapporté : tokens d’entrée et de sortie, coût en USD, temps mural et modèle ayant produit la plus grande partie de la sortie. L’évaluation les additionne dans `usage`, avec un `status` valant `actual`, `partial` (certains bras n’ont rien rapporté) ou `unknown`. Les enveloppes de résultat du fournisseur sont ouvertes avant l’exécution des vérifications et avant l’enregistrement de la sortie, de sorte que `output_contains` et `output_json_equals` voient la réponse de l’agent plutôt que les métadonnées JSON qui l’entourent ; l’usage contenu dans l’enveloppe est ce qui alimente ce champ.

### Étiquettes du rapport

Les rapports incluent `executionMode`, `evidenceStatus` (`complete`, `insufficient` ou `legacy`), `replayLimitations` et, lorsqu’il est disponible, un `sourceRecordHash`. Les rapports d’exécution live et de nouvelle exécution ajoutent `manifest`, `conditions: "current"` et `traceSession`. La complétude des preuves décrit ce que l’action courante peut inspecter ou évaluer. Les limites héritées de l’incident restent visibles même lorsque la capture actuelle des fichiers est complète. `promotionReady` reste `false` dans tous les modes.

## Événements de trace

Chaque évaluation live ou en nouvelle exécution écrit des événements liés dans la session locale `oma-harness-<suite-id>` :

| Événement | Charge utile |
|---|---|
| `harness.eval.started` | Action, hachages de la suite, de la référence, du candidat et de l’évaluateur, partition, hachage du manifeste, fournisseur résolu, modèle, version de la CLI et nombre de tâches. |
| `harness.arm.completed` | Un par bras : tâche, bras, état de réussite, durée, hachage de la sortie, erreur de répartition, code de sortie, indicateur de délai d’expiration et trace du bras. `parentEventId` pointe vers l’événement de démarrage. |
| `harness.eval.completed` | Décision, lift, état des preuves, et chemin et hachage de l’enregistrement lorsque `--record` a été utilisé. |

Tous les événements d’une même évaluation partagent un `causalityKey`. Lorsqu’un événement ne peut pas être écrit, le rapport liste `Trace event <kind> was not recorded` comme limite du rejeu au lieu de l’omettre silencieusement.

Chaque exécution de bras stocke aussi `diagnostics` et `trace` dans l’enregistrement :

- `diagnostics` : code de sortie, signal, indicateur de délai d’expiration et les 8 derniers KiB de stderr avec `stderrStatus` (`captured`, `truncated` ou `unavailable`).
- `trace` : ce que le harnais a pu observer. `output` vaut `complete`, `partial` (un processus échoué a tout de même produit du stdout) ou `unavailable` ; `artifacts` indique si l’instantané final est complet ; `changedPaths` liste les fichiers que le bras a ajoutés, modifiés ou supprimés par rapport à l’espace de travail initial épinglé (plafonné à 200 avec `changedPathsTruncated`) ; `toolCalls` vaut toujours `unsupported` parce que les CLI des fournisseurs n’exposent pas au harnais d’observations par outil.

Un bras échoué conserve donc sa sortie partielle, la fin de son stderr, son statut de sortie et ses modifications de fichiers, de sorte que la dernière erreur puisse être reliée à ce que le bras a modifié. Une observation manquante est enregistrée comme un état ; elle ne se lit jamais comme une exécution propre.

## Métriques et porte de décision

Chaque tâche ne réussit que lorsque toutes ses vérifications réussissent. Les scores sont des moyennes pondérées sur les tâches appariées :

```text
lift = candidateScore - baselineScore
```

OMA signale également :

- tâches corrigées : la référence a échoué et le candidat a réussi ;
- tâches en régression : la référence a réussi et le candidat a échoué ;
- couverture : au moins cinq tâches appariées et évaluables sont requises.

La décision de score est `pass` lorsque le lift atteint au moins 5 points de pourcentage et qu’il n’y a aucune régression. Toute régression fait échouer le candidat. Un lift non négatif inférieur à 5 points déclenche un avertissement, et moins de cinq tâches appariées produit la décision `insufficient`. Ajoutez `--require-coverage` pour qu’une couverture insuffisante retourne un code non nul dans la CI. Un score ne constitue pas une preuve lorsqu’un bras manque, qu’un hachage d’enregistrement est obsolète ou qu’une vérification déterministe est incomplète. Les erreurs de répartition live et d’intégrité de l’évaluateur forcent une décision d’échec ; elles ne peuvent pas compter comme un lift réussi. Le rescoring et le rejeu de fixtures écartent des paires évaluables les bras dont les preuves sont insuffisantes et rapportent une décision `insufficient` au lieu de traiter l’absence de preuve comme une régression du candidat.

Un score réussi n’établit pas l’éligibilité à la promotion. Les rapports incluent la partition, le hachage de l’évaluateur, `promotionReady: false` et des blocages explicites. Les exécutions héritées et de validation n’ont pas de preuve de test final. Les routes de répartition actuelles n’attestent pas le confinement des accès au système de fichiers ; même une exécution de test final ne peut donc pas revendiquer une évaluation finale protégée ni autoriser une promotion. Ce champ reste faux tant qu’un fournisseur d’exécution ne peut pas établir cette frontière.

## Limite actuelle

Les superpositions candidates sont produites à l’extérieur ; cette commande n’implémente ni constructeur ni boucle automatique `harness opt`. La capture d’artefacts, le rescoring hors ligne, le rejeu de fixtures d’outils, les nouvelles exécutions à partir de fichiers épinglés, la sélection de partition, les instantanés d’évaluateur, les manifestes d’exécution, une liste d’autorisation d’environnement et les événements de trace liés sont disponibles, mais le secret des données retenues au niveau du système d’exploitation, le confinement du réseau ou des identifiants, les essais stochastiques répétés, la comptabilisation des tokens et l’épinglage forcé du modèle pour les appels de sous-agents imbriqués ne sont pas établis. La liste d’autorisation d’environnement limite les variables dont hérite un processus fournisseur ; elle n’empêche pas une CLI de fournisseur de lire son propre magasin d’identifiants ni d’accéder au réseau. Tant que l’épinglage des appels imbriqués n’existe pas, les suites destinées à mesurer un modèle fixe doivent éviter les workflows candidats qui créent d’autres rôles d’agents configurés.
