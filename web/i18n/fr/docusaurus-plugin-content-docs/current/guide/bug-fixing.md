---
title: "Guide : correction de bugs"
sidebar_label: Correction de bugs
description: Workflow de débogage structuré en sept étapes avec triage par sévérité, signaux d'escalade, diagnostic étayé par le code source et validation après correction.
---

# Guide : correction de bugs

## Quand utiliser le workflow de débogage

Utilisez `/debug` (ou dites « fix bug », « fix error » ou « debug » en langage naturel) lorsque vous avez un bug précis à diagnostiquer et à corriger. Le workflow fournit une approche structurée et reproductible qui évite le piège courant consistant à corriger les symptômes au lieu de la cause racine.

Le workflow de débogage prend en charge tous les fournisseurs configurés. Les étapes 1 à 5 s'exécutent en ligne. L'étape 6 (recherche de motifs similaires) peut déléguer à un sous-agent `debug-investigator` lorsque le périmètre est large (au moins 10 fichiers ou une erreur multi-domaines), puis l'étape 7 enregistre le résultat en mémoire.

---

## Modèle de rapport de bug

Lorsque vous signalez un bug, fournissez autant d'informations que possible parmi les suivantes. Chaque champ aide le workflow de débogage à réduire plus vite le périmètre de recherche.

### Champs obligatoires

| Champ | Description | Exemple |
|:------|:-----------|:--------|
| **Message d'erreur** | Le texte exact de l'erreur ou la trace de pile | `TypeError: Cannot read properties of undefined (reading 'id')` |
| **Étapes de reproduction** | Actions ordonnées qui déclenchent le bug | 1. Connectez-vous comme administrateur. 2. Accédez à /users. 3. Cliquez sur « Delete » pour un utilisateur. |
| **Comportement attendu** | Ce qui devrait se produire | L'utilisateur est supprimé et retiré de la liste. |
| **Comportement réel** | Ce qui se produit réellement | La page s'arrête sur un écran blanc. |

### Champs facultatifs (fortement recommandés)

<!-- oma-docs:ignore-start -->
| Champ | Description | Exemple |
|:------|:-----------|:--------|
| **Environnement** | Navigateur, système d'exploitation, version de Node, appareil | Chrome 124, macOS 15.3, Node 22.1 |
| **Fréquence** | Toujours, parfois, uniquement la première fois | Toujours reproductible |
| **Modifications récentes** | Ce qui a changé avant l'apparition du bug | PR #142 fusionnée (fonctionnalité de suppression d'utilisateur) |
| **Code concerné** | Fichiers ou fonctions que vous soupçonnez | `src/api/users.ts`, `deleteUser()` |
| **Journaux** | Journaux du serveur, sortie de la console | `[ERROR] UserService.delete: user.organizationId is undefined` |
| **Captures d'écran/enregistrements** | Éléments visuels | Capture d'écran de l'écran d'erreur |
<!-- oma-docs:ignore-end -->

Plus vous fournissez de contexte dès le départ, moins le workflow de débogage devra poser de questions intermédiaires.

---

## Triage de sévérité (P0-P3)

La sévérité détermine la manière dont le bug est traité et la rapidité de sa correction.

### P0 : critique (réponse immédiate)

**Définition :** la production est indisponible, des données sont perdues ou corrompues, ou une faille de sécurité est active.

**Réponse attendue :** arrêtez tout. Cette tâche est la seule à traiter jusqu'à sa résolution.

**Exemples :**

- Le système d'authentification est contourné ; tous les utilisateurs peuvent accéder aux endpoints administrateur.
- Une migration de base de données a corrompu la table des utilisateurs ; les comptes sont inaccessibles.
- Le traitement des paiements facture deux fois les clients.
- Un endpoint d'API renvoie les données personnelles d'autres utilisateurs.

**Approche de débogage :** ignorez le modèle complet. Fournissez le message d'erreur et toute trace de pile. Le workflow commence directement à l'étape 2 (Reproduire).

### P1 : élevée (même session)

**Définition :** une fonctionnalité centrale est cassée pour un nombre important d'utilisateurs. Une solution de contournement existe peut-être, mais elle n'est pas acceptable à long terme.

**Réponse attendue :** corrigez dans la session de travail en cours. Ne commencez pas de nouvelle fonctionnalité avant la résolution.

**Exemples :**

- La recherche ne renvoie aucun résultat pour les requêtes contenant des caractères spéciaux.
- L'envoi de fichiers échoue au-delà de 5 Mo (la limite devrait être de 50 Mo).
- L'application mobile plante au démarrage sur les appareils Android 14.
- Les e-mails de réinitialisation de mot de passe ne sont pas envoyés (intégration du service d'e-mail cassée).

**Approche de débogage :** boucle complète en sept étapes. Une revue QA est recommandée après la correction.

### P2 : moyenne (ce sprint)

**Définition :** une fonctionnalité fonctionne, mais avec un comportement dégradé. L'utilisabilité est touchée, sans perte de fonctionnalité.

**Réponse attendue :** planifiez la correction dans le sprint en cours. Corrigez avant la prochaine version.

**Exemples :**

- Le tri d'un tableau est sensible à la casse (« apple » est placé après « Zebra »).
- Le mode sombre rend le texte illisible dans le panneau des réglages.
- Le temps de réponse de l'endpoint /users est de 8 secondes (il devrait être inférieur à 1 s).
- La pagination affiche « Page 1 of 0 » lorsque la liste est vide.

**Approche de débogage :** boucle complète en sept étapes. Incluez le cas dans la suite de régression QA.

### P3 : faible (backlog)

**Définition :** problème cosmétique, cas limite ou gêne mineure.

**Réponse attendue :** ajoutez le problème au backlog. Corrigez quand vous avez le temps ou regroupez-le avec des modifications liées.

**Exemples :**

- Le texte d'une infobulle contient une faute : « Delet » au lieu de « Delete ».
- Avertissement de console à propos d'une méthode de cycle de vie React obsolète.
- L'alignement du pied de page est décalé de 2 pixels pour des fenêtres de 768 à 800 px.
- Le spinner de chargement continue pendant 200 ms après l'affichage du contenu.

**Approche de débogage :** la boucle complète n'est peut-être pas nécessaire. Une correction directe accompagnée d'un test de régression suffit.

---

## La boucle de débogage en sept étapes en détail

Le workflow `/debug` exécute ces étapes dans l'ordre. Il utilise le fournisseur d'intelligence du code configuré. La recherche native est réservée aux chemins situés hors du projet ou aux chemins ignorés lorsque ce fournisseur est indisponible ou expire.

### Étape 1 : recueillir les informations sur l'erreur

Le workflow demande (ou reçoit de l'utilisateur) :

- le message d'erreur et la trace de pile ;
- les étapes pour reproduire ;
- le comportement attendu et le comportement réel ;
- les détails de l'environnement.

Si le message d'erreur est déjà présent dans le prompt, le workflow passe immédiatement à l'étape 2.

### Étape 2 : reproduire le bug

**Outils utilisés :** les outils de recherche et de symboles configurés, ou `rg` natif et les lectures ciblées lorsque les outils configurés sont indisponibles.

L'objectif est de localiser l'erreur dans le dépôt : trouver la ligne exacte où l'exception est levée, la fonction exacte qui produit une sortie erronée ou la condition précise qui provoque le comportement inattendu.

Cette étape transforme un symptôme signalé par l'utilisateur (« la page plante ») en emplacement au niveau du dépôt (`src/api/users.ts:47, deleteUser() throws TypeError`).

### Étape 3 : diagnostiquer la cause racine

**Outils utilisés :** navigation dans les références et les symboles lorsqu'elle est disponible, puis lectures natives ciblées lorsqu'elle ne l'est pas.

Le workflow remonte depuis l'emplacement de l'erreur pour trouver la cause réelle. Il vérifie les motifs courants suivants :

| Motif | Ce qu'il faut chercher |
|:--------|:----------------|
| **Accès null/undefined** | Vérifications null absentes, chaînage optionnel nécessaire, variables non initialisées |
| **Conditions de concurrence** | Opérations asynchrones terminées dans le désordre, await manquant, état mutable partagé |
| **Gestion d'erreur manquante** | try/catch absent, rejet de promesse non géré, error boundary absent |
| **Types de données incorrects** | Chaîne à la place d'un nombre attendu, coercition de type manquante, schéma incorrect |
| **État obsolète** | État React qui ne se met pas à jour, valeurs en cache non invalidées, closure capturant une ancienne valeur |
| **Validation manquante** | Entrée utilisateur non assainie, corps de requête API non validé, conditions limites non vérifiées |

Diagnostiquez la cause racine, pas le symptôme. Si `user.id` est indéfini, demandez pourquoi user est indéfini à cet endroit du chemin d'exécution, plutôt que de chercher uniquement comment protéger l'accès à une valeur indéfinie.

### Étape 4 : proposer une correction minimale

Le workflow présente :

1. la cause racine identifiée (avec les éléments du chemin de code qui l'étayent) ;
2. la correction proposée (en ne changeant que le nécessaire) ;
3. l'explication de la façon dont la correction résout la cause racine, et pas seulement le symptôme.

La proposition est présentée avant toute modification. Le workflow attend une confirmation lorsque la modification n'est pas déjà autorisée par la demande ou la politique d'exécution ; une autorisation existante lui permet de continuer sans nouvelle question.

**Principe de correction minimale :** changez le moins de lignes possible. Ne refactorez pas, n'améliorez pas le style du code et n'ajoutez pas de fonctionnalités sans rapport. La correction doit pouvoir être relue en moins de 2 minutes.

### Étape 5 : appliquer la correction et écrire un test de régression

Deux actions ont lieu pendant cette étape :

1. **Implémenter la correction :** appliquer la modification minimale autorisée.
2. **Écrire un test de régression :** un test qui :
   - reproduit le bug original (le test doit échouer sans la correction) ;
   - vérifie que la correction fonctionne (le test doit réussir avec la correction) ;
   - empêche la réapparition du même bug lors de futures modifications.

Le test de régression est le résultat le plus important du workflow de débogage. Sans lui, une modification ultérieure peut réintroduire le même bug.

### Étape 6 : rechercher des motifs similaires

Après l'application de la correction, le workflow recherche dans tout le dépôt le motif qui a causé le bug.

**Outils utilisés :** la recherche de motifs configurée ou une recherche native ciblée avec le motif identifié comme cause racine.

Par exemple, si le bug vient d'un accès à `user.organization.id` sans vérifier si `organization` est null, la recherche examine toutes les autres occurrences d'accès à `organization.id` sans vérification null.

**Critères de délégation à un sous-agent :** le workflow lance un sous-agent `debug-investigator` lorsque :

- l'erreur couvre plusieurs domaines (par exemple le frontend et le backend) ;
- le périmètre de recherche du motif similaire couvre au moins 10 fichiers ;
- un traçage approfondi des dépendances est nécessaire pour diagnostiquer complètement le problème.

Méthodes de lancement selon le fournisseur :

| Fournisseur | Méthode de lancement |
|:-------|:------------|
| Claude Code | Outil Agent avec `.claude/agents/debug-investigator.md` |
| Codex CLI | Demande de sous-agent médiée par le modèle, résultats en JSON |
| Gemini CLI | `oma agent spawn debug "scan prompt" {session_id} -w {workspace}` |
| Antigravity / Fallback | `oma agent spawn debug "scan prompt" {session_id} -w {workspace}` |

Tous les emplacements vulnérables similaires sont signalés. Les occurrences confirmées sont corrigées pendant la même session.

### Étape 7 : documenter le bug

Le workflow écrit un fichier mémoire avec :

- le symptôme et la cause racine ;
- la correction appliquée et les fichiers modifiés ;
- l'emplacement du test de régression ;
- les motifs similaires trouvés dans le dépôt.

---

## Modèle de prompt pour /debug

Pour déclencher le workflow de débogage, vous pouvez fournir un prompt structuré :

```
/debug

Error: TypeError: Cannot read properties of undefined (reading 'id')
Stack trace:
  at deleteUser (src/api/users.ts:47:23)
  at handleDelete (src/routes/users.ts:112:5)

Steps to reproduce:
1. Log in as admin
2. Navigate to /users
3. Click "Delete" on a user whose organization was deleted

Expected: User is deleted
Actual: 500 Internal Server Error

Environment: Node 22.1, PostgreSQL 16
```

**Pourquoi cette structure fonctionne :**

- **L'erreur et la trace de pile** permettent à l'étape 2 de localiser immédiatement le code (`search_for_pattern` avec « deleteUser » trouve la fonction ; `find_symbol` repère l'emplacement exact).
- **Les étapes de reproduction** avec la condition déclenchante précise (« utilisateur dont l'organisation a été supprimée ») orientent vers la cause racine (clé étrangère null).
- **L'environnement** écarte les fausses pistes liées à une version.

Pour un bug plus simple, un prompt plus court suffit :

```
/debug The login page shows "Invalid credentials" even with correct password
```

Le workflow demandera les détails supplémentaires nécessaires.

---

## Signaux d'escalade

Ces signaux indiquent qu'il faut aller au-delà de la boucle de débogage standard :

### Signal 1 : la même correction est tentée deux fois

Si le workflow propose et applique une correction, puis que la même erreur réapparaît, le problème est plus profond que le diagnostic initial. Réévaluez la cause. Si des alternatives méritent d'être testées et que le budget de récupération existant le permet, utilisez la **boucle d'exploration** dans le workflow actif (ultrawork, orchestrate, work) :

- générer 2 ou 3 hypothèses alternatives sur la cause racine ;
- isoler chaque expérience et préserver son baseline, ses preuves et le travail sans rapport ;
- retenir une approche qui respecte le comportement requis et des critères de mesure comparables, puis vérifier le résultat intégré.

### Signal 2 : cause racine multi-domaines

L'erreur du frontend est causée par une modification backend elle-même causée par une migration de schéma de base de données. Lorsque la cause racine traverse les frontières de domaine, passez à `/work` ou `/orchestrate` pour faire intervenir les agents concernés.

**Exemple :** le frontend affiche « undefined » pour le nom de l'utilisateur. Le backend renvoie null pour `user.display_name`. Une migration a ajouté la colonne, mais les lignes existantes ont des valeurs NULL. La correction nécessite : une migration de base de données (backfill), la gestion du null dans le backend et un affichage de repli dans le frontend.

### Signal 3 : environnement de reproduction absent

Le bug ne se produit qu'en production et vous ne pouvez pas le reproduire localement. Signaux possibles :

- différences de configuration propres à l'environnement ;
- conditions de concurrence qui n'apparaissent que sous la charge de production ;
- comportement d'un service tiers différent entre la préproduction et la production.

**Action :** recueillez les logs de production, demandez l'accès au monitoring de production et envisagez d'ajouter de l'instrumentation ou de la journalisation avant de tenter une correction.

### Signal 4 : échec de l'infrastructure de test

Le test de régression ne peut pas être écrit parce que l'infrastructure de test est cassée, absente ou inadéquate.

**Action :** corrigez d'abord l'infrastructure de test (ou utilisez `oma install` pour la configurer), puis revenez au workflow de débogage. Si aucune vérification exécutable n'est applicable, consignez la raison dans le contrat de résultat au lieu d'inventer une vérification réussie.

---

## Liste de contrôle après correction

Après avoir appliqué la correction et le test de régression, vérifiez :

- [ ] **Le test de régression échoue sans la correction :** annulez temporairement la correction et confirmez que le test détecte le bug.
- [ ] **Le test de régression réussit avec la correction :** réappliquez la correction et confirmez la réussite du test.
- [ ] **Les vérifications existantes pertinentes passent :** exécutez les vérifications du projet qui couvrent le comportement modifié. N'exécutez un build que si la tâche l'exige explicitement.
- [ ] **Les motifs similaires ont été recherchés :** l'étape 6 est terminée et toutes les occurrences trouvées sont corrigées ou documentées.
- [ ] **La correction est minimale :** seules les lignes nécessaires ont changé. Aucun refactoring sans rapport n'a été inclus.
- [ ] **La cause racine est documentée :** le fichier mémoire consigne le symptôme, la cause racine, la correction appliquée, les fichiers modifiés, l'emplacement du test de régression et les motifs similaires trouvés.

---

## Critères de complétion

Le workflow de débogage est terminé lorsque :

1. la cause racine est identifiée et documentée, et pas seulement le symptôme ;
2. une correction minimale est appliquée dans le cadre de l'autorisation de la tâche ;
3. un test de régression existe, échoue sans la correction et réussit avec elle ;
4. le dépôt a été recherché pour les motifs similaires et toutes les occurrences confirmées sont traitées ;
5. un rapport de bug est enregistré en mémoire avec le symptôme, la cause racine, la correction appliquée, les fichiers modifiés, l'emplacement du test de régression et les motifs similaires trouvés ;
6. tous les tests existants continuent de passer après la correction.
