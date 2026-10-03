---
title: "Guide : Optimisation des compétences"
sidebar_label: Optimisation des compétences
description: Utiliser oma skill optimize pour faire évoluer durablement une compétence avec des preuves, un entraînement déterministe, une validation et des portes de test final détenues par le runner.
---

# Optimisation des compétences

`oma skill optimize` fait évoluer le `SKILL.md` d’une compétence pour maximiser son `utilityLift` mesuré par `oma skill eval`. Il sépare les preuves brutes de rollout, les connaissances persistantes limitées au périmètre et la compétence exécutable. Un Wiki Maintainer consolide les réussites et échecs observables ; un Proposer utilise ces connaissances pour produire des modifications bornées d’ajout, suppression ou remplacement. Les candidats doivent améliorer l’utilité d’entraînement ou de validation sans régression sur l’une ou l’autre partition, avec des mesures complètes des tâches et du transfert négatif. `--apply` exige aussi un test final détenu par le runner, entièrement mesuré et sans régression, ainsi qu’une isolation live vérifiée. Lors du déploiement, aucune recherche wiki supplémentaire n’a lieu au moment de l’inférence : la sortie reste un `SKILL.md`.

Fondement de recherche : Tang, L., Rashtchian, C., Ferng, C.-S., Tomkins, A., Juan, D.-C. et Vu, T. (2026). *WikiSkill: Compiling agent experience into persistent knowledge for skill evolution* [Preprint]. arXiv. https://doi.org/10.48550/arXiv.2608.27454

L’optimisation en CLI exige actuellement `--live` et entraîne des appels de modèle. Le chemin par défaut hors live et `--mock` ne peuvent ni générer ni rejouer de propositions, car aucun chargeur de propositions enregistrées n’est implémenté ; ils s’arrêtent avant l’évaluation. Utilisez `oma skill eval --mock` pour un rejeu hors ligne. Les API d’optimiseur et de scoring injectées restent disponibles pour les tests hors ligne. Passer à la fois `--live` et `--mock` est une erreur.

---

## Dépendance obligatoire : fixtures de tâches d’évaluation

`oma skill optimize` ne peut pas s’exécuter sans fixtures de tâches d’évaluation. Il en faut au moins **5** (`MIN_TASKS = 5`) dans `.agents/eval/<skill>/`. Si le nombre trouvé est inférieur, la commande échoue immédiatement :

```
[oma skill opt] no eval coverage for skill "oma-scholar": found 2 task fixture(s), need at least 5. Author tasks first — see web/docs/guide/skill-eval.md
```

Consultez le [Guide d’évaluation de l’utilité des compétences](/docs/guide/skill-eval) pour la convention du répertoire `.agents/eval/<skill>/`, le schéma des fixtures, les types de vérificateurs et la préparation des rollouts pour le rejeu mock.

La promotion exige aussi un ensemble non vide de tâches voisines du même domaine appartenant à d’autres compétences. Chaque score de validation du candidat et le score final du candidat doivent mesurer les tâches voisines de leur partition évaluée avec le corps candidat exact. L’absence de tâches voisines ou des enregistrements appariés incomplets ne peuvent pas établir l’absence de transfert négatif. L’évaluation hors ligne ne peut rejouer que des enregistrements de candidat correspondants ; utilisez l’optimisation live pour générer et évaluer de nouveaux candidats.

Le rejeu et les connaissances limitées à la suite sont liés au contrat complet de tâche et d’évaluateur, y compris la grille de juge par défaut effective et la révision du protocole de notation. Les anciens enregistrements et les périmètres de connaissances antérieurs exigent de nouvelles preuves après cette mise à niveau de la provenance ; réétiqueter d’anciens scores avec de nouveaux hachages n’établit pas une mesure valide.

---

## Fonctionnement

Les fixtures sont triées par ID de tâche et réparties de façon déterministe entre les ensembles **train**, de **validation retenue** et de **test final détenu par le runner**. Avec au moins cinq fixtures, les proportions visées sont 60/20/20 et chaque partition contient au moins une tâche. Par exemple, huit fixtures produisent après arrondi quatre tâches train, une tâche de validation et trois tâches de test final. Les fixtures qui déclarent le même `group` sont affectées ensemble, de sorte qu’une fixture sœur reformulée ne puisse pas se trouver dans train pendant que l’original se trouve dans le test final ; avec moins de trois groupes, le découpage se rabat sur les ID de tâche et émet un avertissement. Les tâches du test final proviennent de ce jeu de fixtures local et sont tenues hors de portée du Maintainer et du Proposer. Les ID de tâche de test final en double et tout chevauchement avec une partition de développement sont rejetés.

Pour chaque époque (jusqu’à `--max-epochs`, 8 par défaut) :

1. **Noter le meilleur `SKILL.md` actuel sur la partition TRAIN** — `oma skill eval` renvoie les invites observables par tâche, les sorties et le lift. Chaque tâche d’une partition interne doit avoir ses deux bras notés ; des comparaisons échouées ou manquantes ne peuvent pas réduire le dénominateur.
2. **Le Wiki Maintainer consolide les preuves** — jusqu’à cinq échecs et trois réussites deviennent des motifs liés aux preuves. Les échecs sont choisis selon leur valeur d’apprentissage : d’abord les régressions, puis les échecs communs les plus profonds ; les tâches que les deux bras réussissent déjà sont écartées parce qu’elles n’apprennent rien sur la modification suivante. Les réussites sont classées par lift. Les motifs limités au périmètre et les résultats des portes précédentes sont rappelés depuis le système de mémoire L1/L2/L3 d’OMA.
3. **Le Proposer produit K modifications candidates** (jusqu’à `--edits-per-epoch`, 4 par défaut). Les modifications exactes déjà présentes dans l’historique persistant des rejets sont ignorées.
4. **Pour chaque modification candidate :**
   - appliquer la modification à une copie en mémoire de `SKILL.md` ;
   - valider le candidat (le frontmatter `name`/`description` doit subsister ; le corps doit être analysable) ;
   - imposer le budget de taux d’apprentissage textuel : supprimer les modifications dont la variation nette de caractères dépasse `--lr` (600 caractères par défaut) ;
   - renoter chaque tâche de la partition de **validation retenue** (avec des comparaisons appariées référence/candidat sur les tâches voisines) et chaque tâche de la partition d’**entraînement held-in** (sans comparaison avec des tâches voisines).
5. **Accepter le meilleur candidat valide** selon la règle held-in/held-out : le candidat ne perd rien sur l’une ou l’autre partition (`Δval ≥ 0` et `Δtrain ≥ 0`) et gagne sur au moins l’une d’elles. Les candidats sont classés par `Δval + Δtrain`. Un gain strict en validation n’est pas exigé, car un corps qui réussit déjà toutes les tâches de validation peut encore être réparé sur un échec d’entraînement sans perdre de terrain sur les données retenues ; le test final détermine si cette réparation se généralise. La couverture des tâches doit être complète, l’échantillon de transfert négatif non vide doit être entièrement mesuré, et aucune tâche voisine ne doit présenter de régression confirmée au niveau de `NEG_TRANSFER_FAIL = -0.1` ou en dessous. En exécution live, une tâche voisine qui régresse à sa première comparaison appariée est re-mesurée une fois ; le delta enregistré est la moyenne des deux comparaisons, et seule une régression reproduite (`confirmed: true`) rejette le candidat. Les rejeux mock ne peuvent pas re-mesurer ; une régression à essai unique est donc maintenue. Les rapports live doivent déclarer `isolation: "enforced"`. Les résultats des portes de proposition sont enregistrés avec `deltaLift` (validation), `deltaTrainLift` et les deltas des tâches voisines qui sous-tendent le verdict.
6. **Arrêt anticipé** après 2 époques consécutives sans modification acceptée (`OPT_EARLY_STOP_PATIENCE = 2`).
7. **Exécuter le test final détenu par le runner après l’évolution.** Le corps d’origine comme le gagnant de validation doivent couvrir chaque tâche du test final. Le candidat ne doit pas perdre de lift au test final (`candidateLift >= baselineLift` ; le gain pour lequel il a été accepté a déjà été démontré sur les partitions de développement, et exiger un gain strict sur un petit test figé rendrait la plupart des réparations impossibles à promouvoir) et doit réussir un autre contrôle de transfert négatif complet et propre au candidat. `finalTest.findings` liste le lift par tâche du corps d’origine et du candidat, de sorte qu’un test échoué puisse se lire comme une vraie régression ou comme une seule tâche bruitée. Un test final manquant, incomplet ou échoué empêche la promotion. Les échecs finaux mesurés restent des enregistrements d’audit et ne deviennent pas des connaissances de rejet pour les optimisations ultérieures.

L’optimiseur travaille sur une copie candidate en mémoire pendant la boucle.

Les candidats non mesurés sont enregistrés comme `inconclusive`, avec des raisons telles que `insufficient-coverage`, `negative-transfer-unmeasured` ou `unverified-isolation`. Ils sont exclus de l’historique de rejet appris et restent éligibles à une nouvelle tentative une fois les conditions d’évaluation réparées. Une régression confirmée sur une tâche voisine, une perte sur l’une ou l’autre partition (`split-regression`) ou l’absence de gain sur les deux partitions (`no-validation-lift`) constitue un rejet. Les diagnostics qui indiquent une évaluation incomplète ou une maintenance dégradée bloquent la promotion.

---

## Utilisation

```
oma skill optimize --skill <id> --live
               [--dry-run | --apply]
               [--max-epochs <n>] [--edits-per-epoch <k>] [--lr <chars>]
               [--yes]
               [--json] [--output <format>]
```

### Options

| Option | Valeur par défaut | Description |
|:-----|:--------|:-----------|
| `--skill <id>` | `_all` | ID de la compétence à optimiser (nom simple, sans séparateurs de chemin). |
| `--dry-run` | **oui (par défaut)** | Proposer des modifications et afficher le diff sans modifier `SKILL.md` ; les preuves générées et les événements d’évolution restent persistants. |
| `--apply` | — | Écrire le candidat validé une fois toutes les portes de promotion franchies, y compris des preuves complètes de test final et de transfert négatif ; sauvegarde l’original avant une écriture atomique. Une compétence détenue par OMA exige aussi `--yes`. |
| `--mock` | Défaut hors live | Le rejeu de propositions en CLI n’est pas implémenté ; ce chemin s’arrête donc avant l’évaluation. Utilisez `oma skill eval --mock` pour un rejeu d’évaluation hors ligne. |
| `--live` | — | Requis pour l’optimisation CLI actuelle. Entraîne de vrais appels de modèle ; affiche un aperçu du coût et demande une confirmation, sauf avec `--yes`. |
| `--max-epochs <n>` | `8` | Nombre maximal d’époques d’optimisation. |
| `--edits-per-epoch <k>` | `4` | Modifications candidates proposées par le LLM optimiseur à chaque époque. |
| `--lr <chars>` | `600` | Budget de taux d’apprentissage textuel : variation nette maximale de caractères par modification acceptée. |
| `--yes` | — | Passer la confirmation de l’aperçu du coût live et accepter le comportement d’écrasement lors de l’application à une compétence détenue par OMA. |
| `--json` | — | Sortie JSON pour la CI/CD. |
| `--output <format>` | `text` | Format de sortie (`text` ou `json`). |

---

## Exemple minimal de bout en bout

```bash
# Evaluate one epoch and print a candidate diff without applying it
oma skill optimize --skill oma-scholar --live --dry-run --max-epochs 1
```

Sortie illustrative pour huit fixtures et un candidat qui franchit toutes les portes de promotion :

```
[oma skill opt] skill: oma-scholar, tasks: 8 (train: 4, val: 1, test: 3), dry-run: true

Skill opt  (skill: oma-scholar)
  applied: false
  baselineLift: 0.0%  finalLift: 100.0%  (train 50.0% → 100.0%)
  epochs: 1  acceptedEdits: 1  rejected: 0
  budget: 42 model calls used (no limit)
  finalTest: pass baseline=0.0000 candidate=0.3333

  diff:
--- a/SKILL.md
+++ b/SKILL.md
@@ -12,6 +12,9 @@
 ### When to use
 - User asks to look up an academic paper or technical claim.
+- User asks for a summary of arxiv abstracts or DOI-linked documents.
 - User wants citations or sources for a factual statement.
```

Le diff montre ce que l’optimiseur écrirait. `SKILL.md` reste inchangé, tandis que les preuves d’évolution générées et les résultats des portes limités au périmètre sont conservés pour les exécutions futures.

---

## Appliquer une amélioration validée

Lorsque le diff proposé vous convient, relancez avec `--apply` :

```bash
# Apply accepted edits (backs up the original first)
oma skill optimize --skill oma-scholar --live --apply --yes
```

### La procédure comme artefact

Les invites de l’optimiseur et du Maintainer constituent la procédure d’amélioration. Elles sont livrées comme valeurs par défaut intégrées et peuvent être remplacées par des fichiers sous `.agents/evolution/` (appartenant à l’utilisateur : jamais copiés par le manifeste d’installation ni supprimés par `oma update`, contrairement à `.agents/eval/`) :

| Fichier | Rôle | Espaces réservés requis |
|---|---|---|
| `optimizer.md` | Propose des modifications de SKILL.md à partir des preuves d’entraînement et des connaissances persistantes | `{{body}}`, `{{findings}}`, `{{editsPerEpoch}}` (aussi `{{knowledge}}`) |
| `maintainer.md` | Consolide les preuves en motifs réutilisables | `{{evidence}}`, `{{priorFacts}}` (aussi `{{skillId}}`, `{{suiteHash}}`, `{{epoch}}`) |
| `constitution.yaml` | Surfaces que la boucle ne doit jamais écrire, parties de la procédure qu’une méta-optimisation peut modifier, `anchors` de vérité terrain par défaut pour les exécutions méta, et budget de répartitions | doit se lister lui-même sous `immutable` |

`budget.max_dispatches_per_run` (`null` par défaut, sans limite) est appliqué en exécution live : chaque appel de modèle sous-jacent (bras de tâche, bras de tâche voisine, juge, optimiseur, Maintainer) débite une unité, et l’appel qui dépasserait la limite est refusé avant d’être effectué. La boucle s’arrête alors avec un diagnostic `budget:exhausted`, le test final n’est pas exécuté, la promotion est bloquée et le résultat rapporte `budget: { limit, used }`. L’utilisation est enregistrée dans le résumé d’exécution dans les deux cas, de sorte que les procédures puissent être comparées sur leur coût autant que sur leur gain.

`oma skill procedure` affiche les sources actives et leurs hachages ; `--export` écrit les valeurs par défaut pour modification sans écraser les fichiers existants. Un gabarit qui omet un espace réservé requis est refusé plutôt que silencieusement dégradé. Chaque exécution enregistre `procedure` (un hachage par partie plus un hachage combiné) et `memory` dans son résultat, son résumé d’exécution et la lignée de promotion, de sorte que les preuves produites sous une procédure ne sont jamais confondues avec celles d’une autre.

La réponse de l’optimiseur n’est lue avec indulgence que pour la mise en forme : les blocs de code délimités et les lignes vides sont ignorés, mais toute ligne de contenu qui n’est pas une ligne `EDIT:` valide (ou un `NO_ACTION` seul) est un `parse-error`, et le diagnostic inclut désormais la première ligne fautive afin de pouvoir retracer l’échec.

### Ablation de la mémoire et statistiques sur longue durée

`--memory none` démarre une exécution à partir de connaissances vides (aucun motif rappelé ni historique de portes) tout en l’enregistrant. Comparer des exécutions sous `--memory recall` (par défaut) et `--memory none` avec le même budget est le test qui montre si les connaissances persistantes aident ; affirmer que la boucle apprend de l’expérience exige cette comparaison, et non la simple présence d’une mémoire.

`oma skill evolution-stats --skill <id>` agrège toutes les exécutions enregistrées pour une compétence depuis `.agents/results/skill-evolution/<id>/*.jsonl` : exécutions par statut, propositions par résultat de porte et taux d’acceptation, améliorations vérifiées (test final réussi et promotion éligible), applications et rollbacks, lift final moyen, appels de modèle sur les exécutions comptabilisées et appels par amélioration vérifiée (le coût du processus plutôt que celui d’une exécution), ainsi que les mêmes chiffres ventilés par mode de mémoire et par hachage de procédure. Le rapport de méta-optimisation montre le nombre moyen d’appels par exécution interne pour la procédure actuelle et pour chaque candidat, de sorte qu’une procédure qui l’emporte sur le gain en dépensant davantage soit visible comme telle.

### Méta-optimisation : la procédure comme candidat

`oma skill meta-optimize --target optimizer --skill <a> <b> ... --live` traite l’invite de l’optimiseur (ou du Maintainer) comme l’objet testé. Elle exécute la boucle interne (`oma skill optimize --dry-run`) sur chaque compétence retenue nommée, `--repeats` fois, sous la procédure actuelle ; demande à un proposer jusqu’à `--candidates` petites modifications du gabarit ; exécute à nouveau la boucle interne sous chaque candidat avec le même budget `--max-epochs` et `--edits-per-epoch` ; puis compare chaque candidat à la procédure actuelle par paires (compétence, répétition) sur la somme des gains de lift d’entraînement et de lift de validation obtenus par la boucle interne.

Un candidat n’est promu que lorsque l’intervalle bootstrap apparié à 95 % de sa différence de gain se situe au-dessus de zéro (à graine fixée, 1000 rééchantillonnages), qu’il existe au moins trois paires, et qu’aucune compétence ayant progressé sous la procédure actuelle ne perd plus de la moitié de ce gain sous le candidat. Une exécution interne dont l’évaluation a été bloquée (couverture insuffisante, isolation non vérifiée, budget épuisé) est rapportée comme échouée et exclue des paires, de sorte qu’une panne ne puisse pas compter comme un gain nul pour un bras. Les compétences retenues doivent avoir une marge de progression : une compétence dont le corps actuel obtient déjà un score parfait ne peut montrer aucun gain sous aucune procédure. `--anchor` nomme des compétences qui ne servent jamais à la sélection mais sont exécutées une fois sous la procédure actuelle et sous la procédure gagnante pour montrer la dérive ; sans cette option, la liste `anchors` de la constitution s’applique, de sorte qu’un ensemble de vérité terrain déclaré une fois est vérifié à chaque exécution méta. Avec `--apply`, le gabarit gagnant est écrit dans `.agents/evolution/<target>.md` avec une sauvegarde horodatée, un patch en diff unifié et un enregistrement dans `.agents/results/skill-evolution/_procedure/promotions.jsonl` portant les hachages du parent et du candidat, le hachage de la constitution et les preuves (compétences, répétitions, budget, paires, intervalle). Sans `--apply`, rien n’est écrit.

Ce qui reste figé : la partition de test final de chaque compétence n’est jamais lue pour la sélection (la métrique est le gain d’entraînement plus le gain de validation), le code de l’évaluateur et de l’optimisation est déclaré immuable dans la constitution, la constitution elle-même ne peut pas être une cible, et une cible doit figurer dans `meta_targets`. Les exécutions internes utilisent par défaut `--memory none` afin qu’une procédure soit jugée sur les modifications qu’elle produit plutôt que sur des connaissances rappelées d’exécutions antérieures. Les exécutions internes d’un même bras se chevauchent entre compétences (`OMA_META_CONCURRENCY`, jusqu’à 4 par défaut) tandis que les répétitions d’une compétence restent en série, car les preuves de chaque compétence aboutissent dans son propre fichier d’artefact. Chaque exécution interne enregistre le hachage de procédure combiné sous lequel elle s’est exécutée, de sorte que `oma skill evolution-stats` puisse attribuer les résultats ultérieurs à la procédure qui les a produits.

C’est la forme de niveau 5 décrite dans la revue des systèmes auto-améliorants (promotion held-in/held-out de Self-Harness, évaluation répétée d’ADAS avec intervalles bootstrap, évaluateurs figés comme dans AlphaEvolve) : la procédure est révisée par le système, mais le jugement externe reste hors de portée de la boucle. Le coût croît comme compétences × répétitions × (1 + candidats) exécutions internes ; la commande affiche la borne supérieure et demande une confirmation, sauf avec `--yes`.

### Lignée de promotion

Chaque écriture `--apply` ajoute un enregistrement à `.agents/results/skill-evolution/<skill>/promotions.jsonl` et écrit à côté un diff unifié pouvant être examiné dans `promotions/<candidate-hash>.patch`. L’enregistrement nomme les hachages du corps parent et du corps candidat, le chemin installé, le chemin de sauvegarde et les preuves qui motivent l’écriture : lifts de validation et de test final, décision de promotion, hachage de la suite de fixtures, révision du protocole de l’évaluateur et runtimes source/cible. `oma skill promotions --skill <id>` liste le journal.

`oma skill rollback --skill <id>` restaure le corps que l’application la plus récente a remplacé. Il refuse lorsque le fichier installé ne correspond plus au candidat de cette application (une modification manuelle ultérieure serait perdue), lorsque la sauvegarde ne correspond pas au parent enregistré, ou lorsque cette application a déjà fait l’objet d’un rollback ; un rollback réussi est ajouté au même journal avec `reverses` pointant vers l’application. Pour une compétence détenue par OMA, le patch est l’artefact à reporter dans le dépôt source ou dans une superposition utilisateur, car `oma update` écrase la copie installée ; l’enregistrement porte `omaOwned: true` afin qu’une mise à jour ultérieure ne soit pas prise pour une régression.

`--apply` exige au moins une modification acceptée sans perte de validation, `finalTest.passed: true` et `promotion.eligible: true`. Ces portes exigent une couverture complète des tâches internes, un échantillon de transfert négatif propre au candidat, non vide et entièrement mesuré, et une isolation live imposée. L’absence de test final, des mesures incomplètes ou des diagnostics de compilateur dégradés empêchent l’écriture. Une sauvegarde du `SKILL.md` original est créée avant l’écriture atomique, et le diff est affiché pour examen.

L’évaluation live peut satisfaire la porte d’isolation via le profil protégé Claude ou le profil Codex natif. Claude conserve les contrôles HOME/cible. Codex vérifie que le thread éphémère d’app-server n’a aucune source d’instructions ni aucun environnement d’outils avant de soumettre l’invite. Les autres profils d’exécution restent exploratoires.

### Voir ce qui a évolué

La boucle se signale à trois endroits, tous lus à partir des journaux de lignée en ajout seul plutôt qu’à partir d’une quelconque affirmation :

- `oma skill promotions --all` affiche une phrase par changement sur l’ensemble des compétences et de la procédure : ce qui a été modifié (l’ancre et le remplacement de la modification acceptée), les lifts held-in et held-out avant et après, si le test final a tenu, et, pour une promotion de procédure, la différence de gain appariée, son intervalle et les compétences sur lesquelles elle a été mesurée. `--skill <id>` restreint à une seule compétence. Les enregistrements d’application écrits par cette version portent les modifications acceptées et les lifts d’entraînement ; les anciens enregistrements se rabattent sur les hachages.
- `oma doctor` affiche une note **Evolution** : modifications de compétences appliquées et annulées par rollback, dernier changement par compétence, promotions de procédure, et ce qui attend d’être réinjecté (incidents capturés sans fixture, exécutions échouées pas encore capturées), avec la commande qui les traiterait.
- Au début d’une session, les hooks d’instantané d’état injectent un bloc `harness evolved since your last session` listant les promotions enregistrées depuis la dernière session qui en a affiché un ; chaque changement n’est annoncé qu’une fois. Le marqueur se trouve dans `.agents/state/evolution-notice.json`.

Activez l’[évolution du harnais du projet](./harness-evolution.md) pour exécuter des cycles de retour budgétés selon un planning :

```bash
oma harness evolution enable --max-dispatches 300
oma harness evolution status --json
```

Les cycles automatiques appliquent les changements réussis sous forme de superpositions de projet, conservent le travail incomplet pour une nouvelle tentative et partagent un seul quota de répartitions sur l’ensemble du cycle. Le planning par défaut est quotidien à 3 h, heure locale. Utilisez `--mode propose` pour évaluer sans appliquer, et `oma harness evolution disable` pour arrêter le planning. La méta-optimisation de procédure reste une commande manuelle distincte.

---

## Mode live

Le mode live appelle le Maintainer et le Proposer réels et relance des bras d’évaluation live à chaque époque. Il est coûteux : chaque tâche notée entraîne des appels de référence et de traitement, les fixtures judge ajoutent des appels de notation et le test final note les corps original et candidat. L’aperçu indique une borne supérieure calculée à partir de la partition réelle, y compris la référence de validation initiale, les appels d’entraînement et de compilateur, les appels de validation des candidats, deux scores de test final et les contrôles appariés des tâches voisines pour chaque candidat ainsi que pour le candidat final. Chaque appel a un délai de 120 secondes. Les bras Claude et Codex protégés désactivent les outils, la découverte automatique des instructions, MCP et la mémoire d’optimisation.

```bash
# Cost preview + confirm
oma skill optimize --skill oma-scholar --live

# Skip confirmation
oma skill optimize --skill oma-scholar --live --yes

# Live opt, then apply if improved
oma skill optimize --skill oma-scholar --live --apply --yes
```

L’aperçu du coût liste la borne supérieure des appels de modèle sous-jacents avant tout appel LLM.

Le Maintainer, le Proposer, les bras d’évaluation et les juges partagent un transport de texte protégé dans de nouveaux répertoires temporaires. Claude utilise son profil CLI restreint. Codex utilise le `codex app-server` natif avec la connexion CLI existante, le modèle et le fournisseur sélectionnés et l’effort de raisonnement ; il ne substitue pas de client à clé d’API et ne bascule pas vers Claude. Le profil Codex cible la CLI 0.154.x sur macOS/Linux, avec un stockage natif des identifiants dans des fichiers et un `auth.json` existant. Chaque appel prépare un `CODEX_HOME` temporaire privé qui référence les fichiers de configuration et d’authentification d’origine sans copier le contenu des identifiants. L’actualisation native du jeton utilise toujours le fichier d’authentification d’origine. L’état d’amorçage partagé est exclu et l’état temporaire est nettoyé ensuite. Les magasins d’identifiants keyring, auto et éphémère ne sont actuellement pas pris en charge. Le contrat du thread est vérifié avant l’envoi de toute entrée au modèle ; les versions, modes de stockage et échecs de protocole non pris en charge mettent fin à la répartition. Les outils, la découverte des instructions au démarrage, l’accès MCP et la persistance de session sont désactivés afin que les processus du compilateur ne puissent pas lire les fixtures tenues hors de portée via des outils d’agent. Les autres fournisseurs de compilateur échouent explicitement tant qu’ils n’ont pas de transport vérifié.

L’optimiseur rapporte `proposed` pour des modifications valides et `no-action` uniquement pour une réponse `NO_ACTION` explicite. Les échecs de processus ou d’API deviennent `dispatch-error` ; les réponses mal formées sans modification valide deviennent `parse-error`. Ces erreurs ne peuvent pas devenir des listes de modifications vides. Si le Maintainer ne peut pas fournir de motifs validés, il rapporte `degraded` avec une raison de répartition ou d’analyse ; les motifs de repli sont exclus des connaissances persistantes, et l’exécution ne peut pas promouvoir de candidat. Les échecs d’évaluation apparaissent dans `diagnostics` et dans les enregistrements de portes de proposition plutôt que dans l’historique de rejet appris.

---

## Sortie JSON

```bash
oma skill optimize --skill oma-scholar --live --dry-run --max-epochs 1 --json
```

```json
{
  "ok": true,
  "skill": "oma-scholar",
  "baselineLift": 0.0,
  "finalLift": 1.0,
  "baselineTrainLift": 0.5,
  "finalTrainLift": 1.0,
  "epochCount": 1,
  "acceptedEdits": [
    { "op": "add", "anchor": "### When to use", "after": "\n- User asks for a summary of arxiv abstracts or DOI-linked documents." }
  ],
  "rejectedCount": 0,
  "applied": false,
  "diff": "--- a/SKILL.md\n+++ b/SKILL.md\n...",
  "_dryRun": true,
  "finalTest": {
    "baselineLift": 0.0,
    "candidateLift": 0.3333,
    "passed": true,
    "findings": [
      { "taskId": "oma-scholar-doi-summary", "original": 0, "candidate": 1 },
      { "taskId": "oma-scholar-citation-format", "original": 0, "candidate": 0 },
      { "taskId": "oma-scholar-claim-check", "original": 0, "candidate": 0 }
    ]
  },
  "promotion": { "eligible": true, "reasons": [] },
  "diagnostics": [],
  "budget": { "limit": null, "used": 42 },
  "_split": { "trainCount": 4, "valCount": 1, "testCount": 3 }
}
```

`ok` exige `(applied || (acceptedEdits.length > 0 && finalLift >= baselineLift))`, `finalTest.passed === true` et `promotion.eligible === true`. `baselineTrainLift` et `finalTrainLift` rapportent la partition held-in en plus des lifts de validation. La même condition fait office de porte pour `--apply` : une modification acceptée pour une seule réparation d’entraînement n’est écrite que si le test final réussit aussi. Un test final ou un objet de promotion manquant ne peut pas produire `ok: true`. Les comptes `_split` affichent la partition de fixtures locale réellement utilisée pour l’exécution.

Par exemple, un candidat non mesuré peut produire cet extrait de rapport :

```json
{
  "ok": false,
  "acceptedEdits": [],
  "rejectedCount": 0,
  "finalTest": { "baselineLift": 0.0, "candidateLift": 0.0, "passed": false },
  "promotion": {
    "eligible": false,
    "reasons": ["validation:inconclusive", "final-test-failed", "no-validated-candidate"]
  },
  "diagnostics": [
    {
      "stage": "validation",
      "status": "inconclusive",
      "message": "Candidate evaluation is incomplete; retry after repairing the evaluation conditions."
    }
  ]
}
```

Examinez `diagnostics`, `promotion.reasons` et tout `finalTest.blocker` avant de réessayer. `rejectedCount` n’augmente pas pour une proposition non concluante. Un échec mesuré du test final peut augmenter le décompte de rejets d’audit de l’exécution tout en restant exclu des connaissances de rejet persistantes.

---

## Réserve SSOT pour les compétences `oma-*`

Les compétences dont l’ID commence par `oma-` appartiennent à oh-my-agent et sont **écrasées par `oma update`**. Pour ces compétences, `--apply` est déconseillé — utilisez `--dry-run` (la valeur par défaut), examinez le diff proposé et envoyez les modifications au registre si l’amélioration est significative. Pour les compétences écrites par l’utilisateur, `--apply` est sûr.

La commande affiche un avertissement lorsque la compétence cible appartient à OMA :

```
[oma skill opt] warning: "oma-scholar" is an oma-owned skill. --apply output will be overwritten by oma update. Consider using --dry-run and upstreaming the diff instead.
```

---

## Protection contre le surapprentissage

Le Maintainer et le Proposer reçoivent les preuves de rollout TRAIN. La sélection du candidat utilise la partition VALIDATION retenue, et la partition TEST distincte est détenue par le runner. L’exécution du compilateur sans outils empêche tout accès, depuis l’espace de travail, à ces fixtures et évaluateurs tenus hors de portée.

Un échec au test final empêche l’application. Son résultat reste disponible pour l’audit, mais ni les résultats des portes de test final ni les propositions non concluantes n’alimentent les connaissances d’optimisation persistantes. Les chemins de l’enregistreur, du rechargement de l’historique et du rappel sémantique excluent aussi les résultats de test final hérités, de sorte qu’une exécution ultérieure ne puisse pas utiliser un succès ou un échec antérieur au test final comme retour d’entraînement.

---

## Intégration CI

Utilisez le rejeu d’évaluation pour une vérification CI hors ligne des enregistrements existants propres au candidat :

```bash
oma skill eval --skill oma-scholar --mock --neg-transfer --require-coverage --json
```

L’optimisation en CLI exige elle-même `--live` ; elle n’a pas encore d’adaptateur de rejeu de propositions enregistrées. Les indications antérieures décrivant `oma skill optimize --mock` comme un optimiseur hors ligne complet étaient incorrectes. Déplacez les tâches de rejeu hors ligne vers `oma skill eval --mock`, ou activez explicitement l’optimisation live et son coût de modèle. Pour les exécutions d’optimisation, inspectez `ok` et `promotion.eligible` dans le JSON : un code de sortie zéro couvre aussi les exécutions terminées qui n’ont trouvé aucun candidat promouvable.

Codes de sortie de l’optimisation :
- `0` — optimisation terminée (avec ou sans amélioration)
- `1` — entrée invalide ou échec d’exécution, notamment une optimisation CLI hors live, des options `--live --mock` en conflit, un nombre de fixtures insuffisant, un fournisseur de compilateur non pris en charge, un échec de répartition de l’optimiseur ou une sortie d’optimiseur mal formée

---

## Voir aussi

- [Évaluation de l’utilité des compétences](/docs/guide/skill-eval) — écriture des fixtures de tâches, types de vérificateurs, modes mock/live et répertoire `_rollouts/`.
- [Commandes CLI](/docs/cli-interfaces/commands) — référence des options pour toutes les commandes de gestion des compétences.
