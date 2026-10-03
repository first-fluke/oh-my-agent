---
title: "Guide : Dépannage"
sidebar_label: Dépannage
description: Diagnostiquer les échecs d’installation, de configuration, de fournisseur, de tableau de bord, de planning, d’évaluation et de résultats d’agents à l’aide de vérifications fondées sur les sources.
---

# Dépannage

Commencez par un diagnostic lisible par machine depuis le projet ou la racine d’installation :

```bash
oma doctor --json
```

La commande doit se terminer par un JSON qui identifie l’installation, le fournisseur, la configuration et les résultats d’intégration. Ajoutez `--profile` lorsque le problème concerne la résolution du modèle ou par agent. Conservez le JSON lors du signalement d’un problème ; il contient les chemins et vérifications sélectionnés sans nécessiter une supposition en prose.

## Le CLI ou l’installation utilise les mauvais fichiers

Vérifiez explicitement le contexte :

```bash
oma doctor --json
oma doctor --profile
```

Les commandes de projet lisent le `.agents/oma-config.cue` ou `.agents/oma-config.yaml` le plus proche, puis une superposition locale. Une commande globale lit la racine d’installation de HOME. Si un fichier CUE local et un fichier YAML local existent tous deux, supprimez-en un. Si un fichier local est malformé, OMA s’arrête au lieu d’ignorer silencieusement le remplacement. Consultez [Référence de configuration](/docs/guide/configuration-reference).

Après une mise à jour, examinez la configuration et les chemins générés :

```bash
oma update --ci
oma doctor --json
```

`oma update --ci` conserve l’exécution non interactive. Si la configuration utilisateur a été remplacée de manière inattendue, vérifiez si `--force` a été utilisé ; les mises à jour ordinaires conservent la configuration appartenant à l’utilisateur, tandis que le mode forcé peut la remplacer.

## Une installation ou une mise à jour ne parvient pas à télécharger la release

<!-- oma-docs:ignore-start -->
`oma install`, `oma update` et la réparation de `oma doctor` téléchargent la release désignée par `prompt-manifest.json` sur `main`. Ils essaient d’abord l’asset `agent-skills.tar.gz` de la release GitHub `cli-v<version>`, vérifié par rapport à son fichier `.sha256`, puis l’archive source de ce tag, puis un clone superficiel du tag. Une somme de contrôle qui ne correspond pas, ou une charge utile dont `.agents/skills/_version.json` indique une autre version, interrompt l’exécution au lieu d’essayer une autre source.
<!-- oma-docs:ignore-end -->

Juste après la création d’une release, le manifeste peut désigner une version dont les assets sont encore en cours de publication ; attendez quelques minutes et réessayez. Pour installer volontairement du contenu non publié depuis la branche `main`, activez cette option pour cette exécution :

```bash
OMA_UPDATE_CHANNEL=main oma update
```

L’exécution affiche un avertissement : le contenu de la branche main n’est ni une release taguée ni vérifié par somme de contrôle.

## Un fournisseur ne démarre pas

Lancez le contrôle d’authentification propre au fournisseur, puis examinez le profil résolu par OMA :

```bash
oma doctor --profile
oma agent spawn AGENT "print the resolved runtime and stop" SESSION --read-only
```

Utilisez la commande exacte du fournisseur indiquée par `oma doctor` pour vous authentifier à nouveau. Un remplacement de modèle doit utiliser la forme `owner/model` acceptée par le schéma, et son fournisseur doit prendre en charge le transport CLI sélectionné. Pour `model_preset: free`, vérifiez l’URL et le modèle de passerelle résolus avec `oma doctor --profile`, puis vérifiez que la variable d’environnement de clé API configurée contient une clé. Si vous omettez la map `free`, les valeurs par défaut sont `http://127.0.0.1:31415/v1`, `FREELLM_API_KEY` et le modèle `auto` ; ne placez jamais la clé API elle-même dans le YAML.

Si un enfant se termine sans artefact de résultat, examinez le répertoire d’exécution et l’état du parent. Un enfant créé reçoit l’identité de l’exécution et les instructions de résultat, écrit le claim au chemin injecté et signale ses artefacts ; le parent finalise le reçu géré après avoir capturé le code de sortie. Les enfants en lecture seule renvoient `OMA_RESULT_JSON: ...` ; cette ligne est enregistrée comme inspection et ne satisfait pas une vérification exécutable.

## Les hooks sont installés mais ne s’exécutent pas

Pour Codex, examinez le fichier généré et suivez le parcours de confiance unique :

```bash
test -f .codex/hooks.json
codex
# inside Codex: /hooks
```

Exécutez `/hooks` après la première installation et après une mise à jour qui modifie une chaîne de commande. Les sous-processus Codex créés par OMA transmettent l’option de contournement pour leur propre invocation gérée ; cela n’accorde pas sa confiance à un hook dans une session Codex que vous démarrez vous-même. Consultez [Confiance des hooks Codex](/docs/guide/codex-hook-trust).

## Le tableau de bord est vide ou déconnecté

Démarrez le tableau de bord du terminal depuis le projet qui contient les fichiers de session :

```bash
oma dashboard terminal
```

Il lit `.agents/state/memories/` par défaut. Définissez `MEMORIES_DIR` lorsque l’état est ailleurs. Le tableau de bord web se lie à la boucle locale et affiche une URL avec token :

```bash
MEMORIES_DIR=/path/to/.agents/state/memories DASHBOARD_PORT=9847 oma dashboard web
```

Ouvrez l’URL exacte affichée par la commande ; l’API web et le WebSocket exigent le token de tableau de bord. Si le port est occupé, utilisez un autre `DASHBOARD_PORT`. Si aucun agent n’apparaît, vérifiez que le workflow a écrit les fichiers de session, de tâche ou de progression dans le répertoire de mémoire sélectionné. Le tableau de bord ne recherche pas automatiquement l’ancien répertoire `.serena/memories/`.

## Un planning est absent ou ne s’est pas exécuté

Examinez le manifeste et l’état du planificateur :

```bash
oma schedule list
oma schedule sync
oma schedule run SCHEDULE_ID
```

`schedule list` indique `synced`, `stale`, `missing-in-os` et `orphan-in-os`. `schedule sync` restaure les tâches manquantes et réécrit les enregistrements obsolètes (une ligne `Unknown command: schedule:run` dans le journal d’exécution signifie que l’enregistrement date d’avant le renommage de la commande ; `oma update` le resynchronise automatiquement) ; ajoutez `--prune` uniquement lorsque les tâches OS orphelines doivent être supprimées. Un aperçu créé avec `--dry-run` n’enregistre pas de tâche. Pour un intervalle récurrent, acceptez l’arrondi d’OMA avec `--accept-rounded` après examen de l’aperçu. Vérifiez le journal d’exécution sous `~/.agents/schedule/runs/<id>/` pour une sortie fournisseur non nulle ou `re-auth required`.

## L’évaluation ou l’optimisation ne signale aucune couverture

L’évaluation de compétence et l’optimisation de compétence exigent toutes deux au moins cinq fixtures sous `.agents/eval/<skill>/`. En mode mock, la provenance des rollouts enregistrés doit correspondre à la compétence actuelle et aux hachages des fixtures. Réenregistrez en mode live lorsque la fixture ou la compétence a changé ; ne copiez pas un ancien fichier `_rollouts` dans un nouveau répertoire de compétence en le considérant comme une preuve actuelle.

Pour l’optimisation, gardez `--dry-run`, la valeur par défaut, pendant l’examen du diff proposé. `--apply` exige un résultat de validation strictement positif et un découpage de tests réussi appartenant au runner ; une compétence appartenant à OMA peut être écrasée par une mise à jour `oma update` ultérieure.

## Un résultat ne peut pas finir ou reprendre

Examinez les fichiers d’exécution et de plan :

```bash
ls .agents/state/agent-runs/
oma agent resume SESSION_ID --dry-run
```

Lancez `oma agent verify RUN_ID --required` avant de terminer. Un claim terminé avec un reçu en échec, des entrées modifiées, des artefacts manquants, des éléments non résolus ou un contrat de tâche modifié est rejeté ou rétrogradé. La reprise est automatique uniquement pour les tâches avec `retry_policy: "safe"`, une invite rejouable et des tentatives restantes. Un processus vivant ou une tentative native interrompue sans résultat partiel ou en échec clair est laissé intact pour éviter le travail en double. Consultez [Résultats d’agents et reprise](/docs/guide/agent-results-and-resume).

Pour demander de l’aide, incluez la sortie pertinente de `oma doctor --json`, la commande, l’ID de session ou d’exécution et le message non résolu. N’incluez ni identifiants ni contenu de fichiers contenant des secrets.
