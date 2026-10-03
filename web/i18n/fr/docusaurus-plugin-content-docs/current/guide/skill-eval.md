---
title: "Guide : Évaluation de l’utilité des compétences"
sidebar_label: Évaluation des compétences
description: Comment écrire des fixtures de tâches d’évaluation pour oma skill eval, la convention du répertoire .agents/eval/, les types de vérificateurs et les modes d’exécution mock/live.
---

# Évaluation de l’utilité des compétences

`oma skill eval` mesure si le chargement d’une compétence améliore réellement les résultats des tâches d’un agent. Il répond à une question différente de `oma skill audit` (qui demande « deux compétences sont-elles redondantes ? ») : il demande « cette compétence aide-t-elle ? ».

La conception suit deux résultats de recherche : WikiSkill (arXiv:2608.27454) sépare l’expérience brute, les connaissances persistantes et les compétences exécutables tout en conservant des portes sur des données retenues pour l’évolution ; SkillLens (arXiv:2605.23899) montre que l’utilité d’une compétence est indépendante de la singularité de sa description — une compétence distincte peut rester inutile et une compétence qui se chevauche peut rester utile.

---

## Fonctionnement

Pour chaque fixture de tâche, la commande exécute deux bras :

1. **Bras de référence** — l’invite de tâche est envoyée à un agent sans la compétence.
2. **Bras de traitement** — `SKILL.md` est ajouté au début de l’invite, puis la même tâche est envoyée.

Chaque bras reçoit un score (0 = échec, 1 = réussite) par le vérificateur de la tâche. La métrique principale est :

```
utilityLift = weighted_mean(treatment scores) − weighted_mean(baseline scores)
```

Une compétence réussit lorsque `utilityLift ≥ 5%`. En dessous de ce seuil, elle reçoit un avertissement (gain marginal) ou échoue (aucun gain). Au moins 5 tâches évaluables sont requises pour rendre un verdict.

---

## Convention `.agents/eval/<skill>/`

Placez les fixtures de tâches sous `.agents/eval/<skill>/`. Ce chemin se trouve dans `.agents/` mais en dehors du répertoire de la compétence lui-même ; il survit donc à `oma update` sans écraser les évaluations écrites par l’utilisateur.

```
.agents/eval/
└── oma-scholar/
    ├── claims-only.yaml        ← task fixture
    ├── entity-lookup.yaml
    ├── partial-fetch.yaml
    ├── structured-output.yaml
    ├── edge-empty-response.yaml
    └── _rollouts/
        └── a3f1b2c4d5e6f7a8.json   ← recorded arm outputs + judge verdicts
```

Les fichiers dont le nom commence par `_` sont ignorés lors du chargement des fixtures de tâches. Le sous-répertoire `_rollouts/` contient les sorties enregistrées des exécutions `--live --record` précédentes.

---

## Schéma d’une fixture de tâche

Chaque fixture est un fichier YAML avec les champs suivants :

```yaml
id: claims-only
skill: oma-scholar
domain: research
prompt: "Fetch claims-only for knows:generated/reconvla/1.0.0"
checker:
  type: judge
  rubric: "Does the answer fetch ONLY the claims via the section=statements partial fetch?"
weight: 1
```

| Champ | Requis | Description |
|:------|:---------|:-----------|
| `id` | Oui | Identifiant unique de cette tâche (utilisé dans les noms de fichiers de rollout et les rapports) |
| `skill` | Oui | Compétence évaluée (correspond au nom du répertoire parent) |
| `domain` | Oui | Étiquette de domaine utilisée pour le regroupement et la sélection des tâches voisines de transfert négatif |
| `prompt` | Oui | Invite de tâche envoyée aux deux bras |
| `checker` | Non | Méthode de scoring de la sortie du bras. Par défaut, `{ type: judge }` lorsqu’il est omis. |
| `weight` | Oui | Poids relatif pour la moyenne pondérée (utilisez `1` sauf si les tâches ont une importance différente) |
| `group` | Non | Étiquette de famille. `oma skill optimize` conserve les fixtures qui partagent un groupe dans la même partition train/validation/test final afin qu’un quasi-doublon ne puisse pas fuiter d’une partition à l’autre. |

### Types de vérificateurs

#### judge (par défaut)

Un LLM évalue la sortie du bras selon une grille et renvoie PASS ou FAIL. C’est le comportement par défaut lorsque `checker` est omis ou lorsque `checker.type` est absent.

```yaml
checker:
  type: judge
  rubric: "Does the answer correctly cite the source and avoid hallucination?"
```

Le champ `rubric` est facultatif ; s’il est omis, la grille par défaut est utilisée : « Does the answer correctly and completely satisfy the task prompt? »

Vous pouvez aussi écrire la grille au niveau supérieur pour raccourcir la fixture :

```yaml
id: minimal-fixture
skill: oma-scholar
domain: research
prompt: "What are the main claims in paper X?"
rubric: "Does the answer enumerate the main claims without adding fabricated ones?"
weight: 1
```

**Important :** en mode `--mock`, les tâches judge exigent un verdict précédemment enregistré dans `_rollouts/`. Si aucun verdict enregistré n’existe pour une tâche, celle-ci est exclue du rapport avec un avertissement. Lancez `--live --record` pour alimenter les rollouts en premier.

La même règle vaut pour tout type de vérificateur lorsqu’un bras manque entièrement : la tâche est exclue au lieu d’être notée 0. Une donnée absente n’est pas une réponse échouée — la noter ferait passer les deux bras à 0 et un lift nul se lirait comme `decision: "fail"`. Les exclusions qui font passer le nombre de tâches notées sous `MIN_TASKS` remontent `coverage: "insufficient"`.

#### assert (facultatif)

Vérification déterministe d’une sous-chaîne. À utiliser pour vérifier un contrat, un format ou un appel d’outil lorsque la sortie attendue est exacte.

```yaml
checker:
  type: assert
  expect_contains:
    - "section=statements"
    - "partial_fetch=true"
```

La vérification réussit lorsque chaque chaîne de `expect_contains` est présente dans la sortie du bras.

#### regex (facultatif)

Correspondance d’une expression régulière déterministe. À utiliser lorsqu’un motif est nécessaire plutôt qu’une chaîne exacte.

```yaml
checker:
  type: regex
  pattern: "section=\\w+"
```

Les motifs de plus de 200 caractères reçoivent le score 0 (mesure de protection temporaire contre ReDoS). La sortie est tronquée à 10 000 caractères avant la correspondance.

---

## Modes d’exécution

### --mock (par défaut)

Rejoue les rollouts enregistrés depuis `_rollouts/`. Le mode est entièrement déterministe et hors ligne : aucun LLM n’est appelé.

- Pour les vérificateurs `assert`/`regex` : les scores sont calculés à partir des chaînes de sortie enregistrées.
- Pour les vérificateurs `judge` : le champ `score` enregistré par `--live --record` est rejoué.

Si une tâche judge n’a aucun score enregistré dans `_rollouts/`, elle est exclue du rapport (avec un avertissement dans la console). Le mode mock reste ainsi strictement hors ligne.

Les enregistrements sont également vérifiés pour détecter l’obsolescence avant leur utilisation. Une modification du corps de la compétence, des invites, des contrats de tâche et de vérificateur, des grilles de juge effectives ou d’une révision du protocole de l’évaluateur invalide les entrées concernées. Les entrées sans provenance sont également supprimées avec un avertissement nommant le fichier et le nombre d’entrées. Lorsqu’il reste moins de `MIN_TASKS` tâches évaluables, l’exécution signale `coverage: "insufficient"` au lieu d’un verdict.

:::note `oma skill optimize --mock`
L’optimiseur note les corps candidats de SKILL.md. Comme un enregistrement n’est valide que pour le corps qui l’a produit, les corps candidats n’ont aucun rollout correspondant et sont signalés comme non couverts. Utilisez `--live` pour noter les candidats.
:::

Ce mode est sûr pour la CI. Définissez `OMA_SKILLEVAL_MOCK=1` pour le forcer.

```bash
oma skill eval --skill oma-scholar
```

### --live

Crée de vrais bras d’agents via `oma agent spawn --read-only`. Chaque bras de tâche s’exécute dans son propre espace de travail temporaire, de sorte que les fichiers produits par un bras n’affectent pas un autre. Les échecs de processus, les enveloppes d’erreur d’API et les échecs du juge excluent toute la comparaison appariée du scoring et de l’enregistrement ; la sortie partielle est une donnée de diagnostic.

Avant la répartition, la commande affiche un aperçu du coût indiquant le nombre de tâches, de répartitions de bras, de répartitions de juges et le fournisseur résolu. Confirmez avec `y` ou passez outre avec `--yes`.

Les autres contrôles sont utiles dans la CI et pour les analyses de couverture :

| Option | Effet |
| --- | --- |
| `--task-dir <path>` | Évalue les fixtures depuis un répertoire autre que `.agents/eval/<skill>`. |
| `--max-tasks <n>` | Limite le nombre de fixtures pour une exécution live bornée. |
| `--trials <n>` | Répète chaque bras `n` fois (1 à 10). Le bras démarré en premier alterne entre les essais, les scores par tâche sont moyennés et le rapport ajoute la variance intra-tâche. Les tâches voisines de `--neg-transfer` ne s’exécutent qu’une fois. |
| `--neg-transfer` | Mesure la compétence candidate sur des tâches du même domaine appartenant à d’autres compétences ; désactivé par défaut. |
| `--routing` | Mesure l’activation : pour chaque tâche, demande quelle compétence installée serait chargée d’après la `description` de chaque compétence. En live, mesure (une répartition supplémentaire par tâche) ; en mock, rejoue un enregistrement d’acheminement réalisé avec le même catalogue. |
| `--require-coverage` | Retourne un code non nul lorsqu’il reste moins de cinq tâches appariées évaluables, ou lorsqu’une vérification demandée du transfert négatif est incomplète. |

```bash
# Preview and confirm
oma skill eval --skill oma-scholar --live

# Skip confirmation
oma skill eval --skill oma-scholar --live --yes
```

#### Mesure du transfert négatif

Avec `--neg-transfer`, chaque tâche voisine sélectionnée s’exécute deux fois : une référence neuve sans le candidat, puis un traitement avec le corps candidat exact injecté. Les tâches voisines sont les tâches d’autres compétences du même `domain`. Lorsqu’aucune autre compétence ne partage le domaine, un échantillon borné inter-domaines (jusqu’à six tâches, réparties entre les autres compétences) est utilisé à la place et `negativeTransferCoverage.scope` indique `cross-domain` ; l’interférence d’un corps injecté ne se limite pas à son propre domaine, et un domaine unique ne doit pas rendre la vérification impossible. Les deux bras utilisent le même évaluateur et des espaces de travail vides distincts. Le delta est le score du traitement moins le score de la référence ; une valeur négative signifie que le candidat a nui à cette tâche voisine. L’aperçu live inclut ces répartitions supplémentaires de bras et de juge. `--max-tasks` plafonne aussi l’échantillon de tâches voisines, avec un avertissement lorsque des tâches sont omises.

Utilisez `--live --neg-transfer --record` pour enregistrer des comparaisons propres au candidat sous `.agents/eval/<candidate>/_negative-transfer/<neighbor>/<body-hash>/_rollouts/`. Le rejeu mock exige que l’identité du candidat, le hachage du corps et le hachage complet de la tâche et du vérificateur correspondent, et que les deux bras partagent un même ID de comparaison. Les enregistrements d’évaluation ordinaires d’une tâche voisine ne peuvent pas se substituer à cette mesure.

Chaque entrée `negativeTransfer` porte `trials` (les comparaisons appariées derrière `delta`). L’optimisation re-mesure une fois une tâche voisine en régression avant de rejeter un candidat et ajoute `confirmed` (`true` lorsque la répétition a aussi régressé, `false` dans le cas contraire) ; `oma skill eval --neg-transfer` rapporte la comparaison unique. Le rapport inclut `negativeTransferCoverage` avec `status`, `expected` et `scored`. `status` vaut `not-requested` lorsque l’option est absente, `measured` lorsque chaque tâche voisine sélectionnée a un résultat apparié valide et que l’échantillon n’est pas vide, et `insufficient` pour zéro tâche voisine ou toute comparaison manquante. Un tableau `negativeTransfer` vide n’établit donc pas l’absence de régressions. Le `ok` du JSON est faux lorsque la couverture demandée du transfert négatif est insuffisante.

#### Isolation de la compétence (garder la référence honnête) {#skill-isolation-keeping-the-baseline-honest}

`utilityLift` n’est pertinent que si le **bras de référence s’exécute sans la compétence cible**. Le piège est le suivant : un agent distribué charge automatiquement toutes les compétences installées dans son environnement d’exécution ; il récupérerait donc encore la compétence censée être mesurée *sans* elle, ce qui contaminerait la comparaison (référence ≈ traitement, lift ≈ 0).

Pour l’éviter, `--live` exécute **les deux bras dans des espaces de travail temporaires distincts**. Les profils protégés Claude et Codex désactivent la découverte automatique des compétences et des instructions ainsi que les outils d’agent. Le traitement reçoit la cible **uniquement** via le `SKILL.md` injecté. Les profils exploratoires utilisent un répertoire de compétences filtré sans la cible, mais cela seul ne prouve pas l’isolation.

Un répertoire de travail propre masque la découverte de compétences locale au projet, mais l’isolation à l’exécution dépend aussi du profil du fournisseur. Le rapport déclare le niveau vérifié via `isolation` :

| État | Signification |
|---|---|
| `enforced` | Claude protégé avec un ID de cible valide et sans copie HOME, ou Codex natif avec suppression de la découverte et des outils, et vérifications de thread à l’exécution. Un contrat d’exécution en échec interrompt la répartition. |
| `best-effort` | Un environnement d’exécution sans profil de texte protégé, un ID de cible invalide ou une copie HOME de Claude ; l’isolation n’est pas vérifiée. |
| `unavailable` | Fournisseur fondé sur HOME (par exemple **antigravity**, qui lit `~/.gemini/antigravity-cli/skills`) ; un répertoire de travail propre ne peut pas le masquer. Un avertissement est affiché et le résultat est signalé à faible confiance. |
| n/a | Mode mock — aucune répartition live. |

D’autres profils d’exécution restent disponibles pour l’évaluation exploratoire, mais les résultats `best-effort` et `unavailable` bloquent la promotion de l’optimisation live. Le fournisseur d’évaluation suit la configuration de modèle du projet. Codex utilise sa connexion CLI native ainsi que le modèle et le fournisseur configurés via `app-server` ; il ne bascule pas silencieusement vers Claude ni vers un client à clé d’API. Le contrat Codex protégé cible la CLI 0.154.x sur macOS/Linux, avec un stockage natif des identifiants dans des fichiers et un `auth.json` existant. Un répertoire de configuration temporaire privé référence les fichiers de configuration et d’authentification d’origine tout en excluant l’état d’amorçage partagé ; les identifiants ne sont pas copiés, et l’actualisation native utilise le fichier d’authentification d’origine. Les magasins d’identifiants keyring, auto et éphémère ne sont actuellement pas pris en charge. Les versions et les modes de stockage non pris en charge, ainsi que les échecs de contrat, deviennent des erreurs de répartition.

Les juges s’exécutent dans de nouveaux répertoires temporaires, avec la mémoire d’optimisation désactivée. Les juges Claude et Codex utilisent le même transport de texte protégé que les bras d’évaluation. La configuration du fournisseur du juge est figée pour l’exécution.

### --live --record

Lance les bras live et écrit les sorties capturées (y compris les verdicts des juges pour les tâches vérifiées par judge) dans `_rollouts/<hash>.json`. Le nom de fichier est un hachage SHA-256 déterministe de l’ensemble des ID de tâches, et non une valeur fondée sur la date ou le hasard.

Utilisez cette option pour amorcer les exécutions `--mock` sur votre machine afin que les relances restent hors ligne.

Chaque entrée porte une provenance pour qu’une reprise ultérieure puisse déterminer si elle s’applique encore :

| Champ | Enregistré sur | Comparé à |
|---|---|---|
| `skillBodyHash` | `treatment` uniquement | le corps SKILL.md évalué |
| `promptHash` | les deux bras | le `prompt` courant de la fixture |
| `taskHash` | les deux bras | la tâche complète, le vérificateur effectif ou la grille de juge par défaut, et `SKILL_EVAL_PROTOCOL_REVISION` |
| `trial` | les deux bras (`--trials` > 1) | apparie la référence et le traitement d’une même répétition ; absent pour un essai unique |
| `judgeResponse` | tâches judge | le texte du verdict du juge, extrait de l’enveloppe (borné), conservé afin qu’un `score` stocké puisse être audité |

Les sorties des bras sont enregistrées sous forme de texte de réponse. Lorsqu’une CLI de fournisseur renvoie une enveloppe de résultat JSON, le champ `result` est stocké et noté ; les métadonnées de l’enveloppe ne sont jamais mises en correspondance par les vérificateurs `assert`/`regex` ni lues par l’analyseur du juge.

Le bras de référence ne reçoit pas la compétence, donc la seule modification de SKILL.md n’invalide pas son enregistrement. Les modifications du contrat de tâche ou d’évaluateur invalident les deux bras. L’enregistrement live exécute à nouveau les deux bras.

Les enregistrements antérieurs à la provenance complète de la tâche et de l’évaluateur doivent être régénérés avec `--live --record` (et `--neg-transfer` pour les comparaisons de tâches voisines) ; ajouter de nouveaux hachages à d’anciens scores ne permet pas de les vérifier. Le même contrat participe à l’identité de la suite d’optimisation, de sorte que les connaissances antérieures limitées à la suite ne sont pas réutilisées sous le contrat mis à jour. Maintenez `SKILL_EVAL_PROTOCOL_REVISION` en l’incrémentant lorsque le comportement de notation, les invites du juge ou l’analyse des verdicts, ou tout autre comportement implicite de l’évaluateur change.

:::caution `_rollouts/` est local uniquement — ne le commitez pas
Un enregistrement ne se rejoue que pour le corps SKILL.md exact qui l’a produit. Modifiez une compétence et ses enregistrements de traitement sont supprimés lors de la prochaine exécution `--mock` ; un enregistrement commité deviendrait obsolète à la prochaine modification de SKILL.md et afficherait des avertissements pour toute personne qui le récupère. Le répertoire est ignoré par Git ; enregistrez localement.
:::

```bash
oma skill eval --skill oma-scholar --live --record --yes
```

Après une exécution live réussie, le rapport contient les comptes de référence et de traitement, `utilityLift`, `coverage: "ok"`, l’état d’isolation et une décision pass/warn/fail. Une exécution mock ultérieure ne réutilise que les enregistrements dont les invites de tâche et le corps de compétence de traitement correspondent encore.

---

### Concurrence et délais d’expiration des répartitions

Les bras live, les bras de tâches voisines, les appels de juge et les sondes d’acheminement passent par un pool borné de sous-processus dont la taille est fixée par `OMA_SKILL_EVAL_CONCURRENCY` (4 par défaut, 16 au maximum). Les deux bras d’un essai s’exécutent toujours ensemble dans des répertoires vides distincts, le bras démarré en premier alternant entre les essais, et les résultats conservent l’ordre des tâches ; les enregistrements et les scores sont donc identiques à ceux d’une exécution en série. Définissez la variable à 1 pour exécuter en série.

Chaque bras live et chaque appel de juge est arrêté de force après `OMA_SKILL_EVAL_TIMEOUT_MS` (180000 par défaut). Une répartition ayant dépassé son délai est relancée une fois avant que la tâche soit exclue du rapport, car une réponse lente est une défaillance de transport plutôt qu’une réponse ; un second dépassement exclut la tâche (et, en optimisation, fait échouer la couverture de la partition). Augmentez la limite pour les fixtures qui nécessitent légitimement de longues réponses.

## Acheminement : la compétence est-elle sélectionnée ?

Le lift d’utilité mesure ce que fait le corps une fois chargé. Les fournisseurs décident de charger ou non une compétence d’après la `description` de son frontmatter ; un meilleur corps qui n’est jamais sélectionné n’est donc pas une amélioration. `--routing` envoie l’invite de chaque tâche, avec le nom et la description de chaque compétence installée, au même modèle protégé et lui demande l’unique compétence qu’il chargerait (ou `NONE`). Le choix de la cible est une activation ; le choix d’une autre compétence est une erreur d’acheminement ; `NONE` est une absence de sélection.

```text
  routing: measured  activated 5/6 (83%)  misrouted 1 [oma-docs×1]  none 0  unparsed 0  catalog 33
```

Le rapport JSON porte `routing` avec `status`, les comptes, `activationRate`, `misroutedTo` et `catalogSize` ; chaque constat porte `routing: target | other | none | unparsed`. Avec `--record`, les choix sont enregistrés dans `_rollouts/<hash>.routing.json` avec un hachage du catalogue. Un `--mock --routing` ultérieur ne les rejoue que tant que chaque description et chaque tâche restent inchangées ; sinon `status` vaut `stale` et rien n’est compté.

Cela mesure la description par rapport au catalogue via le transport protégé. Cela n’exerce pas le mécanisme de découverte propre au fournisseur, que le profil protégé désactive délibérément, et ne mesure pas si la procédure de la compétence chargée est suivie ; cela relève toujours de la mesure d’utilité.

## Un jeu minimal de fixtures fonctionnel

Cinq fixtures sont requises pour un verdict (`MIN_TASKS = 5`). Voici un jeu minimal pour une compétence imaginaire `oma-scholar` :

```yaml
# .agents/eval/oma-scholar/claims-only.yaml
id: claims-only
skill: oma-scholar
domain: research
prompt: "Fetch claims-only for knows:generated/reconvla/1.0.0"
rubric: "Does the answer fetch ONLY the claims via the section=statements partial fetch?"
weight: 1
```

```yaml
# .agents/eval/oma-scholar/entity-lookup.yaml
id: entity-lookup
skill: oma-scholar
domain: research
prompt: "Look up the entity knows:concept/attention-mechanism"
rubric: "Does the answer return the entity name, description, and at least one related concept?"
weight: 1
```

Répétez pour au moins trois tâches supplémentaires. Lancez ensuite :

```bash
# Seed rollouts (local only — re-run after any SKILL.md edit)
oma skill eval --skill oma-scholar --live --record --yes

# Offline replay
oma skill eval --skill oma-scholar --json
```

---

## Lire le rapport

**Sortie texte :**

```
Skill utility eval  (skill: oma-scholar)
  tasks: 7
  isolation: enforced [claude]

  baseline: 42.9%  treatment: 71.4%
  utilityLift: 28.6%  (stddev: 14.3%)
  [PASS]
  Skill shows positive utility lift >= 5%.

  Per-task findings:
    claims-only: baseline=0 treatment=1 lift=+1.000
    entity-lookup: baseline=1 treatment=1 lift=+0.000
    ...

  Thresholds: fail <= 0%, warn < 5%
```

**Sortie JSON** (via `--json`) :

```json
{
  "ok": true,
  "skill": "oma-scholar",
  "taskCount": 7,
  "coverage": "ok",
  "decision": "pass",
  "baselineScore": 0.4286,
  "treatmentScore": 0.7143,
  "utilityLift": 0.2857,
  "utilityStdDev": 0.1429,
  "repeatability": {
    "trials": 1,
    "liftCi95": { "lower": 0.0918, "upper": 0.4796 },
    "withinTaskStdDev": null,
    "status": "single-trial"
  },
  "findings": [
    { "taskId": "claims-only", "baseline": 0, "treatment": 1, "lift": 1.0, "trials": 1, "liftStdDev": 0, "routing": "target" }
  ],
  "usage": { "status": "actual", "dispatches": 14, "inputTokens": 61234, "outputTokens": 9876, "costUsd": 0.8123, "judge": { "status": "actual", "dispatches": 6, "inputTokens": 12000, "outputTokens": 30, "costUsd": 0.1401 } },
  "routing": { "status": "measured", "measured": 7, "activated": 6, "misrouted": 1, "none": 0, "unparsed": 0, "activationRate": 0.8571, "misroutedTo": { "oma-search": 1 }, "catalogSize": 33 },
  "negativeTransfer": [],
  "negativeTransferCoverage": { "status": "not-requested", "expected": 0, "scored": 0 },
  "isolation": "enforced",
  "isolationVendor": "claude"
}
```

`usage` additionne ce que le fournisseur a rapporté pour les bras notés et, séparément, pour leurs appels de juge : nombre de répartitions, tokens d’entrée et de sortie (lectures et écritures de cache comprises) et coût en USD. `status` vaut `actual` lorsque chaque répartition a rapporté sa consommation, `partial` lorsque certaines ne l’ont pas fait, et `unknown` lorsqu’aucune ne l’a fait (un transport texte seul tel que le pont Codex ne rapporte rien). Les rollouts enregistrés portent `usage` et `judgeUsage` par entrée ; un rejeu mock rapporte donc le coût de l’enregistrement qu’il réutilise plutôt que zéro.

`repeatability` sépare la variation entre tâches de la variation d’une nouvelle exécution à l’autre. `liftCi95` est un intervalle t apparié à 95 % sur les lifts par tâche (null en dessous de deux tâches notées). Avec `--trials` égal ou supérieur à deux, `withinTaskStdDev` est l’écart-type moyen par tâche du lift par essai, et `status` vaut `stable` uniquement lorsque l’intervalle exclut zéro du côté du lift ; sinon il vaut `unstable` et un `pass` est rétrogradé en `warn`. Une exécution à essai unique rapporte `single-trial` : elle peut montrer un lift, mais pas que ce lift se reproduit.

`ok` vaut `true` uniquement lorsque `coverage === "ok"`, `decision === "pass"` et que toute vérification demandée du transfert négatif a une couverture suffisante. Le champ `isolation` indique si le bras de référence a réellement été exécuté sans la compétence cible (voir [Isolation de la compétence](#skill-isolation-keeping-the-baseline-honest)) ; `isolation` vaut `"n/a"` en mode `--mock`.

---

## Intégration CI

```bash
# Fail the build if the skill regresses or has insufficient coverage
oma skill eval --skill oma-scholar --json --require-coverage
```

Codes de sortie :
- `0` — réussite ou avertissement
- `1` — échec, ou couverture insuffisante des tâches ou du transfert négatif avec `--require-coverage`

---

## Choisir le mode live ou mock

Utilisez `--live` avec des vérificateurs judge pour mesurer l’utilité réelle sur des tâches ouvertes. Utilisez `--mock` pour rejouer hors ligne des verdicts judge enregistrés ou exécuter des vérifications de contrat déterministes `assert`/`regex`.

Le déterminisme mock est conservé en enregistrant le verdict binaire du juge (PASS/FAIL) dans l’entrée de rollout pendant `--live --record`, puis en rejouant ce score enregistré lors des exécutions `--mock` suivantes — aucun nouvel appel de LLM.

**Sortie des données :** pendant `--live`, la répartition du juge envoie la sortie du bras candidat au fournisseur configuré pour l’évaluation. Un avertissement unique est affiché au début de chaque exécution live.

Si une exécution mock signale une couverture insuffisante, examinez l’avertissement pour repérer les entrées `_rollouts` supprimées ou manquantes, puis lancez une passe d’enregistrement live après avoir corrigé la fixture ou la compétence. La promotion live exige un profil protégé Claude ou Codex fonctionnel avec `isolation: "enforced"` ; les autres profils restent exploratoires.

---

## Publier des tâches d’évaluation avec une compétence

Les compétences peuvent inclure un jeu de tâches d’évaluation en plaçant les fixtures dans `.agents/eval/<skill>/`. Ce sont des fichiers écrits par l’utilisateur en dehors du répertoire de la compétence ; ils survivent donc à `oma update`. Lors de la création d’une nouvelle compétence avec `oma-skill-creation`, ajoutez un jeu de fixtures `eval/` correspondant afin de donner aux futurs auteurs un moyen de vérifier l’effet de la compétence. Consultez `.agents/skills/oma-skill-creation/SKILL.md` pour le workflow d’écriture de compétences.
