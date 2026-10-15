---
title: "Guide : Dépannage"
sidebar_label: Dépannage
description: Diagnostiquer les échecs d’installation, de configuration, de fournisseur, de hooks, de tableau de bord, de planning, d’évaluation et de résultats d’agents par symptôme ou par message d’erreur exact, à l’aide de vérifications et de correctifs fondés sur les sources.
---

# Dépannage

Commencez par un diagnostic lisible par machine depuis le projet ou la racine d’installation :

```bash
oma doctor --json
```

La commande doit se terminer par un JSON qui identifie l’installation, le fournisseur, la configuration et les résultats d’intégration. Ajoutez `--profile` lorsque le problème concerne la résolution du modèle ou par agent. Conservez le JSON lors du signalement d’un problème ; il contient les chemins et vérifications sélectionnés sans nécessiter une supposition en prose.

## Trouver votre symptôme {#find-your-symptom}

| Symptôme | Section |
|---------|-------|
| OMA lit la mauvaise configuration, ou une mise à jour a remplacé vos paramètres | [Le CLI ou l’installation utilise les mauvais fichiers](#the-cli-or-install-is-using-the-wrong-files) |
| `oma install` ou `oma update` ne parvient pas à télécharger une release | [Une installation ou une mise à jour ne parvient pas à télécharger la release](#an-install-or-update-cannot-download-the-release) |
| Un CLI fournisseur ou un modèle ne démarre pas | [Un fournisseur ne démarre pas](#a-vendor-does-not-start) |
| Les hooks sont installés mais rien ne se passe | [Les hooks sont installés mais ne s’exécutent pas](#hooks-are-installed-but-do-not-run) |
| Le tableau de bord est vide, déconnecté ou ne démarre pas | [Le tableau de bord est vide ou déconnecté](#the-dashboard-is-empty-or-disconnected) |
| Une tâche planifiée est absente ou a échoué | [Un planning est absent ou ne s’est pas exécuté](#a-schedule-is-missing-or-did-not-run) |
| L’évaluation ou l’optimisation de compétence ne signale aucune couverture | [L’évaluation ou l’optimisation ne signale aucune couverture](#evaluation-or-optimization-reports-no-coverage) |
| Une exécution d’agent ne se vérifie pas, ne se termine pas ou ne reprend pas | [Un résultat ne peut pas finir ou reprendre](#a-result-cannot-finish-or-resume) |
| Le CLI a affiché un message d’erreur | [Trouver votre erreur](#find-your-error) |

## Trouver votre erreur {#find-your-error}

Chaque message ci-dessous est affiché par le CLI. Faites correspondre le début du message.

| Message | Cause | Correctif |
|---------|-------|-----|
| `Unknown plan task: <id>` | L’ID de tâche (issu de `--task-id`, ou l’ID de l’agent par défaut) n’est pas un `id` de tâche dans `.agents/results/plan-<session>.json` | Passez `--task-id` avec un ID de tâche du plan |
| `Plan is immutable after dispatch; ...` | Le plan de session a changé après son premier dispatch | Restaurez le plan, ou enregistrez le plan modifié sous un nouvel ID de session (et un nouveau `lineage_id` si vous en définissez un) |
| `Task acceptance contract changed before dispatch` ou `Plan changed before dispatch` | Le plan a été modifié pendant le démarrage d’une exécution | Réessayez une fois le plan stable |
| `Attempt limit reached for workflow lineage and logical goal` | Le `max_attempts` du plan (3 par défaut, première tentative comprise) est épuisé | Examinez les tentatives en échec avant d’en planifier une autre |
| `Cannot verify a finished run; start a new run` | `oma agent verify` a été lancé après la fin de l’exécution | Démarrez une nouvelle exécution avec `oma agent begin` |
| `Choose a command, --required, or --affected` | `oma agent verify` n’a reçu aucun mode de vérification, ou plusieurs | Utilisez exactement un mode parmi `--required`, `--affected PATH...` ou `-- <argv>` |
| `No complete test selection for affected paths: ...` | Le graphe n’a pas de sélection de tests complète pour ces chemins | Utilisez `--required` |
| `The spawning parent finalizes managed runs; write the claim file instead` | `oma agent finish` a été appelé sur une exécution démarrée par `oma agent spawn` ou `parallel` | Écrivez le claim au chemin injecté ; le parent finalise l’exécution |
| `Resume requires a session plan with task contracts` | La session n’a pas de fichier de plan | La reprise ne fonctionne que pour les sessions fondées sur un plan ; relancez plutôt la tâche avec spawn |
| `A resume coordinator already owns this session` | Un autre `oma agent resume` pour la session est en cours, ou son bail provient d’un autre hôte | Attendez la fin de l’autre reprise ; un bail laissé par un processus mort sur le même hôte est récupéré automatiquement |
| `No graph-backed context found for <agent>` | Aucun contexte de graphe n’existe pour cet agent | Corrigez la définition de la tâche, ou poursuivez avec le chemin de recherche natif documenté du projet |
| `Dashboard failed: port 9847 is already in use. ...` | Un autre processus occupe le port du tableau de bord | `DASHBOARD_PORT=8080 oma dashboard web`, ou arrêtez l’autre processus |
| `Invalid DASHBOARD_PORT: ...` | `DASHBOARD_PORT` n’est pas un entier compris entre 1 et 65535 | Définissez un port valide, ou supprimez la variable pour utiliser 9847 |
| `Removed option <old>. Use <new>.` | La commande a utilisé une écriture d’option qui a été supprimée | Utilisez l’option indiquée dans le message |
| `Unknown command: ... Use oma --help.` | Le chemin de commande a été supprimé ou renommé | Lancez `oma --help` ou `oma describe` pour connaître les chemins actuels |
| `oma agent spawn` se termine avec le code 3 | Le fournisseur s’est terminé avec 0, mais l’exécution ne s’est pas achevée en `completed` | Lisez `unresolved` dans l’enregistrement d’exécution ; consultez [Résultats d’agents et reprise](./agent-results-and-resume.md) |

## Le CLI ou l’installation utilise les mauvais fichiers {#the-cli-or-install-is-using-the-wrong-files}

Vérifiez explicitement le contexte :

```bash
oma doctor --json
oma doctor --profile
```

| Symptôme | Cause | Correctif |
|---------|-------|-----|
| Un paramètre est ignoré, ou une valeur globale par défaut l’emporte | Les commandes lisent les valeurs globales par défaut depuis `$OMA_HOME/.agents/` (par défaut `~/.oma/.agents/`), puis la configuration partagée du projet le plus proche et une superposition locale. Des racines de projet ancêtres différentes ne sont pas fusionnées | Vérifiez quels chemins de configuration `oma doctor --json` a sélectionnés, et modifiez le fichier réellement lu |
| OMA s’arrête pendant le chargement de la configuration | Un fichier CUE local et un fichier YAML local existent tous deux, ou un fichier local est malformé. OMA s’arrête au lieu d’ignorer silencieusement le remplacement | Supprimez l’un des deux fichiers locaux, ou corrigez celui qui est malformé |
| La configuration utilisateur a été remplacée après une mise à jour | La mise à jour a été lancée avec `--force`. Les mises à jour ordinaires conservent la configuration appartenant à l’utilisateur ; le mode forcé peut la remplacer | Mettez à jour sans `--force`, puis examinez la configuration et les chemins générés |
| Les paramètres de `oma-config.yaml` sont ignorés, et `language` ou `timezone` affichent les valeurs du modèle | Un ancien `oma update` a copié le `oma-config.cue` livré à côté de votre YAML. CUE l’emporte sur YAML, donc les valeurs du modèle s’appliquent | `oma update` supprime cette copie tant qu’elle reste un modèle non modifié et l’enregistre sous `.agents/backup/stray-shared-config/`. Si vous l’avez modifiée, gardez un seul fichier de configuration partagée et supprimez l’autre |
| `oma doctor` signale `timezone: Asia/Seoul` | Les anciens modèles livraient `Asia/Seoul` comme fuseau horaire par défaut, et votre système en utilise un autre | Supprimez la ligne `timezone` pour suivre le fuseau horaire du système. Pour conserver `Asia/Seoul`, définissez-le dans votre configuration locale (`oma-config.local.yaml` ou `.local.cue`) |

Consultez [Référence de configuration](/docs/guide/configuration-reference) pour l’ordre des fichiers. Après une mise à jour, examinez la configuration et les chemins générés :

```bash
oma update --ci
oma doctor --json
```

`oma update --ci` conserve l’exécution non interactive.

## Une installation ou une mise à jour ne parvient pas à télécharger la release {#an-install-or-update-cannot-download-the-release}

<!-- oma-docs:ignore-start -->
`oma install`, `oma update` et la réparation de `oma doctor` téléchargent la release désignée par `prompt-manifest.json` sur `main`. Ils essaient d’abord l’asset `agent-skills.tar.gz` de la release GitHub `cli-v<version>`, vérifié par rapport à son fichier `.sha256`, puis l’archive source de ce tag, puis un clone superficiel du tag. Une somme de contrôle qui ne correspond pas, ou une charge utile dont `.agents/skills/_version.json` indique une autre version, interrompt l’exécution au lieu d’essayer une autre source.
<!-- oma-docs:ignore-end -->

| Symptôme | Cause | Correctif |
|---------|-------|-----|
| Le téléchargement échoue juste après une release | Le manifeste désigne une version dont les assets sont encore en cours de publication | Attendez quelques minutes et réessayez |
| Vous avez besoin de contenu non publié depuis `main` | Les releases n’installent que du contenu tagué | Activez l’option pour une seule exécution avec `OMA_UPDATE_CHANNEL=main oma update` |

```bash
OMA_UPDATE_CHANNEL=main oma update
```

L’exécution affiche un avertissement : le contenu de la branche main n’est ni une release taguée ni vérifié par somme de contrôle.

## Un fournisseur ne démarre pas {#a-vendor-does-not-start}

Lancez le contrôle d’authentification propre au fournisseur, puis examinez le profil résolu par OMA :

```bash
oma doctor --profile
oma agent spawn AGENT "print the resolved runtime and stop" SESSION --read-only
```

| Symptôme | Cause | Correctif |
|---------|-------|-----|
| Le CLI du fournisseur n’est pas authentifié | La session du fournisseur a expiré ou n’a jamais été configurée | Authentifiez-vous à nouveau avec la commande exacte du fournisseur indiquée par `oma doctor` |
| Un remplacement de modèle est rejeté | Le remplacement n’utilise pas la forme `owner/model` acceptée par le schéma, ou son fournisseur ne prend pas en charge le transport CLI sélectionné | Utilisez la forme `owner/model` avec un fournisseur qui prend en charge le transport |
| `model_preset: free` ne parvient pas à joindre sa passerelle | L’URL ou le modèle de passerelle résolu est incorrect, ou la variable d’environnement de clé API configurée est vide | Vérifiez l’URL et le modèle de passerelle avec `oma doctor --profile`, puis définissez la clé dans la variable d’environnement |
| Un enfant se termine sans artefact de résultat | L’enfant n’a pas écrit son claim au chemin injecté | Examinez le répertoire d’exécution et l’état du parent (voir ci-dessous) |

Si vous omettez la map `free`, les valeurs par défaut sont `http://127.0.0.1:31415/v1`, `FREELLM_API_KEY` et le modèle `auto` ; ne placez jamais la clé API elle-même dans le YAML.

Un enfant créé reçoit l’identité de l’exécution et les instructions de résultat, écrit le claim au chemin injecté et signale ses artefacts ; le parent finalise le reçu géré après avoir capturé le code de sortie. Les enfants en lecture seule renvoient `OMA_RESULT_JSON: ...` ; cette ligne est enregistrée comme inspection et ne satisfait pas une vérification exécutable.

## Les hooks sont installés mais ne s’exécutent pas {#hooks-are-installed-but-do-not-run}

| Symptôme | Cause | Correctif |
|---------|-------|-----|
| Codex n’exécute pas les hooks OMA | Les hooks ne sont pas encore approuvés : il s’agit de la première installation, ou une mise à jour a modifié une chaîne de commande de hook | Examinez `.codex/hooks.json`, puis lancez `/hooks` dans Codex |

```bash
test -f .codex/hooks.json
codex
# inside Codex: /hooks
```

Les sous-processus Codex créés par OMA transmettent l’option de contournement pour leur propre invocation gérée ; cela n’accorde pas sa confiance à un hook dans une session Codex que vous démarrez vous-même. Consultez [Confiance des hooks Codex](/docs/guide/codex-hook-trust).

## Le tableau de bord est vide ou déconnecté {#the-dashboard-is-empty-or-disconnected}

Démarrez le tableau de bord du terminal depuis le projet qui contient les fichiers de session :

```bash
oma dashboard terminal
```

| Symptôme | Cause | Correctif |
|---------|-------|-----|
| `No agents detected yet` | Le workflow n’a pas encore écrit de fichiers de session, de tâche ou de progression dans le répertoire de mémoire surveillé, ou le tableau de bord surveille un autre répertoire | Attendez le premier fichier de progression ; lancez la commande depuis la racine du projet, passez `--project-root <path>`, ou définissez `MEMORIES_DIR` |
| Les fichiers de l’ancien répertoire `.serena/memories/` n’apparaissent pas | Le tableau de bord lit `.agents/state/memories/` et ne recherche pas dans l’ancien répertoire | Définissez `MEMORIES_DIR` sur le répertoire qui contient les fichiers |
| `oma dashboard web` se termine avec `port 9847 is already in use` | Un autre processus occupe le port | Utilisez un autre `DASHBOARD_PORT` |
| La page web reste sur Disconnected après le redémarrage du tableau de bord | Chaque démarrage crée un nouveau token d’accès, et l’onglet ouvert conserve l’ancien | Rechargez la page |

Le tableau de bord web se lie à la boucle locale et affiche son URL. Ouvrez-la ; la page transporte son propre token pour l’API web et le WebSocket.

```bash
MEMORIES_DIR=/path/to/.agents/state/memories DASHBOARD_PORT=9847 oma dashboard web
```

D’autres signaux du tableau de bord sont décrits dans [Surveillance du tableau de bord](./dashboard-monitoring.md#troubleshooting-runbook).

## Un planning est absent ou ne s’est pas exécuté {#a-schedule-is-missing-or-did-not-run}

Examinez le manifeste et l’état du planificateur. Les deux premières commandes sont en lecture seule ; les deux dernières modifient l’état :

```bash
oma schedule list                 # read-only: synced, stale, missing-in-os, orphan-in-os
oma schedule inspect SCHEDULE_ID  # read-only: one manifest entry
oma schedule sync                 # writes: registers missing jobs and rewrites stale ones
oma schedule run SCHEDULE_ID      # executes the job now (normally invoked by the OS scheduler)
```

| Symptôme | Cause | Correctif |
|---------|-------|-----|
| `schedule list` affiche `missing-in-os` ou `stale` | L’enregistrement OS est absent ou obsolète | `oma schedule sync` |
| Le journal d’exécution affiche `Unknown command: schedule:run` | L’enregistrement date d’avant le renommage de la commande | `oma update` le resynchronise automatiquement ; `oma schedule sync` le réécrit également |
| `schedule list` affiche `orphan-in-os` | Une tâche OS n’a pas d’entrée dans le manifeste | `oma schedule sync --prune`, uniquement lorsque les tâches orphelines doivent être supprimées |
| Un planning créé n’a jamais été enregistré | Il a été créé avec `--dry-run`, qui ne fait qu’un aperçu | Créez-le à nouveau sans `--dry-run` |
| Un intervalle récurrent n’a pas été enregistré | L’intervalle doit être arrondi | Examinez l’aperçu, puis acceptez l’arrondi avec `--accept-rounded` |
| La tâche s’est exécutée mais a échoué | Le fournisseur s’est terminé avec un code non nul, ou le journal indique `re-auth required` | Consultez le journal d’exécution sous `~/.oma/schedule/runs/<id>/` et authentifiez à nouveau le fournisseur |

## L’évaluation ou l’optimisation ne signale aucune couverture {#evaluation-or-optimization-reports-no-coverage}

| Symptôme | Cause | Correctif |
|---------|-------|-----|
| L’évaluation ou l’optimisation de compétence ne signale aucune couverture | Moins de cinq fixtures existent sous `.agents/eval/<skill>/` | Ajoutez des fixtures jusqu’à en avoir au moins cinq |
| Le mode mock rejette les rollouts enregistrés | La provenance des rollouts enregistrés ne correspond pas à la compétence actuelle et aux hachages des fixtures | Réenregistrez en mode live ; ne copiez pas un ancien fichier `_rollouts` dans un nouveau répertoire de compétence en le considérant comme une preuve actuelle |
| `--apply` refuse d’écrire | `--apply` exige un résultat de validation strictement positif et un découpage de tests réussi appartenant au runner | Gardez `--dry-run`, la valeur par défaut, pendant l’examen du diff proposé, et corrigez d’abord la validation en échec |

Une compétence appartenant à OMA modifiée par `--apply` peut être écrasée par une mise à jour `oma update` ultérieure.

## Un résultat ne peut pas finir ou reprendre {#a-result-cannot-finish-or-resume}

Examinez les fichiers d’exécution et de plan :

```bash
ls .agents/state/agent-runs/
oma agent resume SESSION_ID --dry-run
```

| Symptôme | Cause | Correctif |
|---------|-------|-----|
| Un claim terminé est rejeté ou rétrogradé | Un reçu en échec, des entrées modifiées, des artefacts manquants, des éléments non résolus ou un contrat de tâche modifié | Lancez `oma agent verify RUN_ID --required` avant de terminer, et corrigez ce que le reçu signale |
| La reprise laisse une tâche `blocked` | La reprise automatique exige `retry_policy: "safe"`, une invite rejouable et des tentatives restantes | Lisez la raison dans le rapport dry-run. Le plan est figé après son premier dispatch : définissez donc `retry_policy` dans le plan d’une nouvelle session, ou relancez la tâche manuellement |
| La reprise ne relance pas une tâche | Un processus vivant, ou une tentative native interrompue sans résultat partiel ou en échec clair, est laissé intact pour éviter le travail en double | Attendez le processus vivant, ou finalisez d’abord la tentative native |

Consultez [Résultats d’agents et reprise](./agent-results-and-resume.md) pour le cycle de vie complet.

## Demander de l’aide {#ask-for-help}

Pour demander de l’aide, incluez la sortie pertinente de `oma doctor --json`, la commande, l’ID de session ou d’exécution et le message non résolu. N’incluez ni identifiants ni contenu de fichiers contenant des secrets. Ouvrez une issue sur [github.com/first-fluke/oh-my-agent/issues](https://github.com/first-fluke/oh-my-agent/issues).

## Voir aussi {#see-also}

- [Utiliser OMA](./usage.md#troubleshooting) : problèmes de configuration tels que des compétences ou CLI manquants et des conflits d’espace de travail
- [Surveillance du tableau de bord](./dashboard-monitoring.md#troubleshooting-runbook) : signaux de tableau de bord bloqué, planté ou déconnecté
- [Résultats d’agents et reprise](./agent-results-and-resume.md) : enregistrements d’exécution, claims et récupération
- [Glossaire](../getting-started/glossary.md) : des termes tels que [enregistrement d’exécution et claim](../getting-started/glossary.md#run-record-and-claim)
