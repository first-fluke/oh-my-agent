---
title: "Guide : surveillance du dashboard"
sidebar_label: Surveillance du dashboard
description: Surveillez les sessions OMA depuis le terminal ou un dashboard web en loopback, choisissez le répertoire d'état et récupérez les problèmes courants de connexion et de découverte.
---

# Guide : surveillance du dashboard

## Deux commandes de dashboard

oh-my-agent fournit deux dashboards en temps réel pour suivre l'activité des agents pendant les workflows multi-agents.

| Commande | Interface | URL | Technologie |
|:--------|:---------|:----|:-----------|
| `oma dashboard terminal` | Terminal (TUI) | N/A (rendu dans votre terminal) | chokidar file watcher, picocolors rendering |
| `oma dashboard web` | Navigateur | `http://127.0.0.1:9847` (jeton affiché au démarrage) | HTTP server, WebSocket, chokidar file watcher |

Les deux dashboards surveillent `.agents/state/memories/` par défaut. Définissez `MEMORIES_DIR` lorsque les fichiers de coordination se trouvent ailleurs. Le dashboard ne se rabat pas automatiquement sur `.serena/memories/`.

### Dashboard terminal

```bash
oma dashboard terminal
```

Cette commande affiche une interface à cadres directement dans le terminal. Elle se met à jour automatiquement lorsque les fichiers mémoire changent. Appuyez sur `Ctrl+C` pour quitter.

```
╔════════════════════════════════════════════════════════╗
║  OMA Memory Dashboard                                 ║
║  Session: session-20260324-143052  [RUNNING]          ║
╠════════════════════════════════════════════════════════╣
║  Agent        Status       Turn   Task                ║
║  ──────────── ──────────── ────── ──────────────────  ║
║  backend      ● running    3      Implement user API  ║
║  frontend     ● running    2      Build login page    ║
║  mobile       ✓ completed  5      Auth screens done   ║
║  qa           ○ blocked    -                          ║
╠════════════════════════════════════════════════════════╣
║  Latest Activity:                                     ║
║  [backend] Implementing JWT token validation          ║
║  [frontend] Creating login form components            ║
║  [mobile] Completed biometric auth integration        ║
╠════════════════════════════════════════════════════════╣
║  Updated: 03/24/2026, 02:31:15 PM  |  Ctrl+C to exit ║
╚════════════════════════════════════════════════════════╝
```

**Symboles de statut :**

- `●` (vert) : en cours ;
- `✓` (cyan) : terminé ;
- `✗` (rouge) : échec ;
- `○` (jaune) : bloqué ;
- `◌` (atténué) : en attente.

### Dashboard web

```bash
oma dashboard web
```

Cette commande démarre un serveur web limité à la boucle locale sur le port 9847 (configurable via `DASHBOARD_PORT`). OMA affiche une URL contenant `127.0.0.1` ; ouvrez l'URL exacte et conservez le jeton. La page utilise ce jeton pour `/api/state`, `/api/recap` et les mises à jour WebSocket. Les requêtes qui n'en contiennent pas renvoient `401`.

```bash
# Custom port
DASHBOARD_PORT=8080 oma dashboard web

# Custom memories directory
MEMORIES_DIR=/path/to/.agents/state/memories oma dashboard web

# The process also serves the recap view at /recap; use the tokenized URL it prints.
```

Le dashboard web affiche les mêmes informations que le dashboard terminal, dans une interface sombre stylisée qui comprend :

- un badge d'état de connexion (Connected / Disconnected / Connecting avec reconnexion automatique) ;
- l'identifiant et la barre d'état de la session ;
- un tableau de statut des agents avec des points animés ;
- un flux des dernières activités ;
- des horodatages mis à jour automatiquement.

---

## Disposition recommandée à 3 terminaux

Pour les workflows multi-agents, la configuration recommandée utilise trois volets de terminal :

```
┌────────────────────────────────┬────────────────────────────────┐
│                                │                                │
│   Terminal 1: Main Agent       │   Terminal 2: Dashboard        │
│                                │                                │
│   $ gemini                     │   $ oma dashboard terminal              │
│   > /orchestrate               │                                │
│   ...                          │   ╔═══════════════════════╗    │
│                                │   ║ Serena Dashboard      ║    │
│                                │   ║ Session: ...          ║    │
│                                │   ╚═══════════════════════╝    │
│                                │                                │
├────────────────────────────────┴────────────────────────────────┤
│                                                                 │
│   Terminal 3: Ad-hoc commands                                   │
│                                                                 │
│   $ oma agent status session-20260324-143052 backend frontend   │
│   $ oma stats get                                                   │
│   $ oma verify agent backend -w ./api                           │
│                                                                 │
└─────────────────────────────────────────────────────────────────┘
```

**Le terminal 1** exécute la session de l'agent principal (Gemini CLI, Claude Code, Codex, etc.) dans laquelle vous utilisez des workflows comme `/orchestrate` ou `/work`.

**Le terminal 2** exécute le dashboard pour une surveillance passive. Il se met à jour automatiquement, sans interaction nécessaire.

**Le terminal 3** sert aux commandes ponctuelles : consulter le statut des agents, lancer des vérifications, afficher les statistiques ou déboguer des problèmes.

---

## Sources de données dans .agents/state/memories/

Les dashboards lisent le répertoire `.agents/state/memories/`. Les agents et les workflows y écrivent les fichiers de coordination pendant l'exécution. Utilisez `MEMORIES_DIR` lorsque l'état d'un projet est stocké ailleurs.

### Types de fichiers et contenu

| Motif de fichier | Créé par | Contenu |
|:-------------|:----------|:---------|
| `orchestrator-session.md` | Étape 2 de `/orchestrate` | ID de session, heure de début, statut (RUNNING/COMPLETED/FAILED), version du workflow |
| `session-{workflow}.md` | `/work`, `/ultrawork` | Métadonnées de session, progression des phases, résumé de la demande utilisateur |
| `task-board.md` | Workflows d'orchestration | Tableau Markdown avec les affectations, statuts et tâches des agents |
| `progress-{agent}.md` | Chaque agent lancé | Numéro du tour en cours, travail de l'agent, résultats intermédiaires |
| `result-{agent}.md` | Chaque agent terminé | Statut final (COMPLETED/FAILED), fichiers modifiés, problèmes rencontrés, livrables |
| `debug-{id}.md` | Workflow `/debug` | Diagnostic du bug, cause racine, correction appliquée, emplacement du test de régression |
| `experiment-ledger-{sessionId}.md` | Expériences réelles | Preuves comparables du baseline et du candidat, vérifications requises et décisions |
| `lessons-{sessionId}.md` | Lorsqu'une cause réutilisable est étayée par des preuves | Leçons propres à la session ; aucune génération déclenchée par un score |

### Comment le dashboard les lit

Le dashboard combine plusieurs stratégies pour extraire les informations :

1. **Détection de session :** recherche d'abord `orchestrator-session.md`, puis le fichier `session-*.md` modifié le plus récemment. Il analyse le statut à partir des mots-clés `RUNNING`, `IN PROGRESS`, `COMPLETED`, `DONE`, `FAILED` et `ERROR`.

2. **Analyse du tableau de tâches :** lit `task-board.md` comme un tableau Markdown. Il extrait le nom de l'agent, son statut et la description de sa tâche à partir des colonnes.

3. **Découverte des agents :** s'il n'existe pas de tableau de tâches, recherche dans tous les fichiers `.md` les motifs `**Agent**: {name}`, les lignes `Agent: {name}` ou les noms de fichiers contenant `_agent` ou `-agent`.

4. **Comptage des tours :** pour chaque agent découvert, lit les fichiers `progress-{agent}.md` et extrait le numéro du tour à partir des motifs `turn: N`.

5. **Flux d'activité :** liste les 5 fichiers `.md` modifiés le plus récemment, puis extrait la dernière ligne pertinente (titre, ligne de statut ou élément d'action) comme message d'activité. Le dashboard web expose également la vue récapitulative à `/recap`.

---

## Ce que montre chaque dashboard

### Statut de la session

La partie supérieure affiche :

- **ID de session :** extrait des fichiers de session (format : `session-YYYYMMDD-HHMMSS`) ;
- **Statut :** code couleur : vert pour RUNNING, cyan pour COMPLETED, rouge pour FAILED et jaune pour UNKNOWN.

### Tableau des tâches

Le tableau des agents affiche chaque agent détecté avec :

- **Nom de l'agent :** identifiant du domaine (backend, frontend, mobile, qa, debug, pm) ;
- **Statut :** état courant avec indicateur visuel (running/completed/failed/blocked/pending) ;
- **Tour :** numéro du tour courant de l'agent (nombre d'itérations terminées), extrait des fichiers de progression ;
- **Tâche :** brève description du travail en cours, tronquée pour tenir dans l'espace disponible.

### Progression des agents

La progression est suivie par les fichiers `progress-{agent}.md`. Chaque fichier est mis à jour par l'agent pendant son travail. Le dashboard y recherche :

- le numéro du tour (qui augmente au fil de la progression) ;
- l'action courante (ce que l'agent fait maintenant) ;
- les résultats intermédiaires (achèvements partiels).

### Résultats

Lorsqu'un agent termine, il écrit `result-{agent}.md` avec :

- le statut final (COMPLETED ou FAILED) ;
- la liste des fichiers modifiés ;
- les problèmes rencontrés ;
- les livrables produits.

Le dashboard détecte la fin grâce à la présence de ce fichier et met à jour le statut de l'agent.

---

## Runbook de dépannage

### Signal 1 : l'agent affiche « running », mais le tour n'avance pas

**Symptôme :** le dashboard affiche un agent en cours, mais le numéro de tour n'a pas changé depuis plusieurs minutes.

**Causes possibles :**

- l'agent est bloqué sur une opération longue (analyse d'un dépôt volumineux ou appel API lent) ;
- l'agent a planté, mais le fichier PID existe encore ;
- l'agent attend une entrée utilisateur (cela ne devrait pas arriver en mode d'approbation automatique).

**Actions :**

1. Consultez le fichier de log de l'agent : `cat /tmp/subagent-{session-id}-{agent-id}.log`
2. Vérifiez que le processus est réellement actif : `oma agent status {session-id} {agent-id}`
3. Si le processus ne tourne plus alors que le statut indique « running », l'agent a planté. Relancez-le avec le contexte de l'erreur.

### Signal 2 : l'agent affiche « crashed »

**Symptôme :** `oma agent status` renvoie `crashed` pour un agent.

**Causes possibles :**

- le processus du fournisseur CLI s'est arrêté de manière inattendue (mémoire insuffisante, quota API dépassé, délai réseau) ;
- le répertoire de workspace a été supprimé ou ses permissions ont changé ;
- le CLI du fournisseur n'est pas installé ou n'est pas authentifié.

**Actions :**

1. Consultez le fichier de log pour les détails : `cat /tmp/subagent-{session-id}-{agent-id}.log`
2. Vérifiez l'installation du CLI : `oma doctor`
3. Vérifiez l'authentification : `oma auth status`
4. Relancez l'agent avec la même tâche : `oma agent spawn {agent-id} "{task}" {session-id} -w {workspace}`

### Signal 3 : le dashboard affiche « aucun agent détecté pour l'instant »

**Symptôme :** le dashboard fonctionne, mais aucun agent n'est affiché.

**Causes possibles :**

- le workflow n'a pas encore atteint l'étape de lancement des agents ;
- le répertoire `.agents/state/memories/` est vide ;
- le dashboard surveille le mauvais répertoire.

**Actions :**

1. Vérifiez le répertoire mémoire : `ls -la .agents/state/memories/`
2. Vérifiez si le workflow est toujours dans la phase de planification (les agents ne sont pas encore lancés).
3. Vérifiez que le dashboard surveille le bon répertoire du projet : il résout le chemin mémoire depuis le répertoire courant.
4. Si vous utilisez un chemin personnalisé : `MEMORIES_DIR=/path/to/.agents/state/memories oma dashboard terminal`

### Signal 4 : le dashboard web affiche « disconnected »

**Symptôme :** le badge de connexion du dashboard web affiche « Disconnected » en rouge.

**Causes possibles :**

- le processus `oma dashboard web` a été arrêté ;
- le navigateur utilise une URL obsolète ou le jeton de démarrage manque ;
- le port est déjà utilisé par un autre processus.

**Actions :**

1. Vérifiez que le processus du dashboard tourne : `ps aux | grep dashboard`
2. Rouvrez l'URL exacte avec jeton imprimée par le processus ; ne supprimez pas son jeton.
3. Essayez un autre port : `DASHBOARD_PORT=8080 oma dashboard web`
4. Vérifiez la disponibilité du port : `lsof -i :9847`
5. Le dashboard web se reconnecte automatiquement avec un backoff exponentiel (1 s au départ, multiplicateur 1,5, maximum 10 s). Attendez quelques secondes la reconnexion.

---

## Liste de contrôle de surveillance avant merge

Avant de considérer une session multi-agents comme terminée, vérifiez dans le dashboard :

- [ ] **Tous les agents affichent « completed » :** aucun agent ne reste dans l'état « running » ou « blocked ».
- [ ] **Aucun agent n'affiche « failed » :** si un agent a échoué, consultez ses logs et relancez-le.
- [ ] **L'agent QA a terminé sa revue :** recherchez `result-qa-agent.md` ou `result-qa.md`.
- [ ] **Zéro constat CRITICAL/HIGH :** vérifiez les décomptes de sévérité dans le fichier de résultat QA.
- [ ] **Le statut de session est COMPLETED :** le fichier de session doit afficher le statut final.
- [ ] **Le flux d'activité affiche le rapport final :** la dernière activité doit être le rapport récapitulatif.

---

## Critères de complétion

La surveillance du dashboard est terminée lorsque :

1. tous les agents lancés ont atteint un état terminal (terminé ou échoué puis pris en charge) ;
2. le cycle de revue QA est terminé sans problème bloquant ;
3. le statut de session reflète le résultat final ;
4. les résultats sont enregistrés en mémoire pour référence ultérieure.

---

## Détails techniques

### Dashboard terminal (oma dashboard terminal)

- **Surveillance des fichiers :** utilise [chokidar](https://github.com/paulmillr/chokidar) avec `awaitWriteFinish` (seuil de stabilité de 200 ms, intervalle de polling de 50 ms) pour éviter d'afficher des écritures partielles.
- **Rendu :** efface et redessine tout le terminal à chaque événement de modification de fichier. Utilise `picocolors` pour les couleurs ANSI et des caractères Unicode de cadres pour la bordure.
- **Répertoire mémoire :** résolu depuis `MEMORIES_DIR`, puis l'argument CLI du dashboard lorsqu'il est fourni, puis `{cwd}/.agents/state/memories`.
- **Arrêt propre :** intercepte `SIGINT` et `SIGTERM`, ferme le watcher chokidar et quitte proprement.

### Dashboard web (oma dashboard web)

- **Serveur HTTP :** `createServer` de Node.js sert la page HTML sur `/`, la page récapitulative sur `/recap`, l'état JSON sur `/api/state` et les données récapitulatives sur `/api/recap`. Le serveur se lie à `127.0.0.1`.
- **WebSocket :** utilise la bibliothèque `ws`. Une connexion provenant de la boucle locale doit inclure le jeton du processus dans sa query string. À la connexion, le client reçoit immédiatement l'état complet. Les mises à jour suivantes sont envoyées sous la forme de messages `{ type: "update", event, file, data }`.
- **Surveillance des fichiers :** même configuration chokidar que pour le dashboard terminal. Les changements de fichiers déclenchent une fonction `broadcast()` qui construit l'état courant et l'envoie à tous les clients WebSocket connectés.
- **Anti-rebond :** les mises à jour sont regroupées pendant 100 ms pour éviter d'inonder les clients pendant des écritures rapides de fichiers (par exemple, lorsque plusieurs agents écrivent leur progression en même temps).
- **Reconnexion automatique :** le client du navigateur se reconnecte avec un backoff exponentiel (1 s initiale, multiplicateur 1,5, maximum 10 s) lorsque la connexion WebSocket est interrompue.
- **Port :** 9847 par défaut, configurable via la variable d'environnement `DASHBOARD_PORT`. Les requêtes API acceptent `X-OMA-Dashboard-Token` ou `?token=...` ; les jetons absents ou invalides renvoient `401`.
- **Construction de l'état :** `buildFullState()` agrège les informations de session, le tableau de tâches, le statut des agents, les compteurs de tours et le flux d'activité dans un objet JSON unique à chaque mise à jour.
