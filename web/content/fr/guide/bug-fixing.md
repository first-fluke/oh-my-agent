---
title: "Guide : Correction de Bugs"
description: Guide complet de débogage couvrant la boucle structurée en 5 étapes, le triage de sévérité, les signaux d'escalade et la validation post-correction.
---

# Guide : Correction de Bugs

## Quand utiliser le workflow de débogage

Utilisez `/debug` (ou dites « fix bug », « fix error », « debug » en langage naturel) lorsque vous avez un bug spécifique à diagnostiquer et corriger. Le workflow fournit une approche structurée et reproductible du débogage qui évite le piège classique de corriger les symptômes plutôt que les causes profondes.

Le workflow de débogage supporte tous les fournisseurs (Gemini, Claude, Codex, Qwen). Les étapes 1 à 5 s'exécutent en ligne. L'étape 6 (scan de motifs similaires) peut être déléguée à un sous-agent `debug-investigator` lorsque le périmètre de scan est large (10+ fichiers ou erreurs multi-domaines).

---

## Modèle de rapport de bug

Lorsque vous signalez un bug, fournissez autant d'informations que possible parmi les suivantes. Chaque champ aide le workflow de débogage à cibler la recherche plus rapidement.

### Champs obligatoires

| Champ | Description | Exemple |
|:------|:-----------|:--------|
| **Message d'erreur** | Le texte exact de l'erreur ou la stack trace | `TypeError: Cannot read properties of undefined (reading 'id')` |
| **Étapes de reproduction** | Actions ordonnées qui déclenchent le bug | 1. Se connecter en tant qu'admin. 2. Naviguer vers /users. 3. Cliquer sur « Supprimer » sur n'importe quel utilisateur. |
| **Comportement attendu** | Ce qui devrait se passer | L'utilisateur est supprimé et retiré de la liste. |
| **Comportement réel** | Ce qui se passe réellement | La page plante avec un écran blanc. |

### Champs optionnels (fortement recommandés)

| Champ | Description | Exemple |
|:------|:-----------|:--------|
| **Environnement** | Navigateur, OS, version de Node, appareil | Chrome 124, macOS 15.3, Node 22.1 |
| **Fréquence** | Toujours, parfois, première fois uniquement | Toujours reproductible |
| **Changements récents** | Ce qui a changé avant l'apparition du bug | Fusion de la PR #142 (fonctionnalité de suppression d'utilisateur) |
| **Code lié** | Fichiers ou fonctions suspectés | `src/api/users.ts`, `deleteUser()` |
| **Logs** | Logs serveur, sortie console | `[ERROR] UserService.delete: user.organizationId is undefined` |
| **Captures d'écran/enregistrements** | Preuves visuelles | Capture d'écran de l'écran d'erreur |

Plus vous fournissez de contexte en amont, moins le workflow de débogage nécessitera d'échanges.

---

## Triage de sévérité (P0-P3)

La sévérité détermine comment le bug est traité et à quelle vitesse il doit être corrigé.

### P0 -- Critique (réponse immédiate)

**Définition :** La production est en panne, des données sont perdues ou corrompues, une faille de sécurité est active.

**Attente de réponse :** Tout arrêter. C'est la seule tâche jusqu'à résolution.

**Exemples :**
- Le système d'authentification est contourné -- tous les utilisateurs peuvent accéder aux endpoints admin.
- Une migration de base de données a corrompu la table des utilisateurs -- les comptes sont inaccessibles.
- Le traitement des paiements facture les clients en double.
- Un endpoint API retourne les données personnelles d'autres utilisateurs.

**Approche de débogage :** Ignorer le modèle complet. Fournir le message d'erreur et toute stack trace. Le workflow démarre immédiatement à l'étape 2 (Reproduire).

### P1 -- Élevé (même session)

**Définition :** Une fonctionnalité essentielle est cassée pour un nombre significatif d'utilisateurs. Un contournement peut exister mais n'est pas acceptable à long terme.

**Attente de réponse :** Corriger dans la session de travail en cours. Ne pas commencer de nouvelles fonctionnalités tant que le bug n'est pas résolu.

**Exemples :**
- La recherche ne retourne aucun résultat pour les requêtes contenant des caractères spéciaux.
- L'upload de fichiers échoue pour les fichiers de plus de 5 Mo (la limite devrait être de 50 Mo).
- L'application mobile plante au lancement sur les appareils Android 14.
- Les emails de réinitialisation de mot de passe ne sont pas envoyés (intégration du service email cassée).

**Approche de débogage :** Boucle complète en 5 étapes. Revue QA recommandée après correction.

### P2 -- Moyen (ce sprint)

**Définition :** Une fonctionnalité marche mais avec un comportement dégradé. Affecte l'ergonomie mais pas la fonctionnalité.

**Attente de réponse :** Planifier pour le sprint en cours. Corriger avant la prochaine release.

**Exemples :**
- Le tri du tableau est sensible à la casse (« apple » se trie après « Zebra »).
- Le mode sombre a du texte illisible dans le panneau de paramètres.
- Le temps de réponse de l'API pour l'endpoint /users est de 8 secondes (devrait être inférieur à 1 s).
- La pagination affiche « Page 1 sur 0 » lorsque la liste est vide.

**Approche de débogage :** Boucle complète en 5 étapes. Inclure dans la suite de régression QA.

### P3 -- Faible (backlog)

**Définition :** Problème cosmétique, cas limite ou inconvénient mineur.

**Attente de réponse :** Ajouter au backlog. Corriger quand c'est opportun, ou regrouper avec des changements connexes.

**Exemples :**
- Le texte de l'infobulle contient une faute de frappe : « Delet » au lieu de « Delete ».
- Avertissement console à propos d'une méthode de cycle de vie React dépréciée.
- L'alignement du pied de page est décalé de 2 pixels sur les largeurs de viewport entre 768 et 800 px.
- Le spinner de chargement continue pendant 200 ms après que le contenu est visible.

**Approche de débogage :** Peut ne pas nécessiter la boucle de débogage complète. Une correction directe avec un test de régression suffit.

---

## La boucle de débogage en 5 étapes en détail

Le workflow `/debug` exécute ces étapes dans un ordre strict. Il utilise les outils d'analyse de code MCP tout au long du processus -- jamais de lecture brute de fichiers ni de grep.

### Étape 1 : Collecter les informations d'erreur

Le workflow demande (ou reçoit de l'utilisateur) :
- Message d'erreur et stack trace
- Étapes de reproduction
- Comportement attendu vs réel
- Détails de l'environnement

Si un message d'erreur est déjà fourni dans le prompt, le workflow passe immédiatement à l'étape 2.

### Étape 2 : Reproduire le bug

**Outils utilisés :** `search_for_pattern` avec le message d'erreur ou les mots-clés de la stack trace, `find_symbol` pour localiser la fonction et le fichier exact.

L'objectif est de localiser l'erreur dans le code source -- trouver la ligne exacte où l'exception est levée, la fonction exacte qui produit un résultat erroné, ou la condition exacte qui cause le comportement inattendu.

Cette étape transforme un symptôme signalé par l'utilisateur (« la page plante ») en un emplacement dans le code (`src/api/users.ts:47, deleteUser() throws TypeError`).

### Étape 3 : Diagnostiquer la cause profonde

**Outils utilisés :** `find_referencing_symbols` pour remonter le chemin d'exécution depuis le point d'erreur.

Le workflow remonte depuis l'emplacement de l'erreur pour trouver la cause réelle. Il vérifie ces schémas de causes profondes courants :

| Schéma | Ce qu'il faut chercher |
|:-------|:----------------------|
| **Accès null/undefined** | Vérifications null manquantes, chaînage optionnel nécessaire, variables non initialisées |
| **Conditions de concurrence** | Opérations asynchrones se terminant dans le désordre, await manquant, état mutable partagé |
| **Gestion d'erreur manquante** | try/catch absent, rejet de promesse non géré, error boundary manquant |
| **Types de données incorrects** | Chaîne au lieu d'un nombre attendu, coercition de type manquante, schéma incorrect |
| **État obsolète** | État React qui ne se met pas à jour, valeurs en cache non invalidées, closure capturant une ancienne valeur |
| **Validation manquante** | Entrée utilisateur non assainie, corps de requête API non validé, conditions limites non vérifiées |

La discipline clé : diagnostiquer la **cause profonde**, pas le symptôme. Si `user.id` est undefined, la question n'est pas « comment vérifier si c'est undefined ? » mais « pourquoi user est-il undefined à ce point du chemin d'exécution ? ».

### Étape 4 : Proposer une correction minimale

Le workflow présente :
1. La cause profonde identifiée (avec les preuves de la trace du code).
2. La correction proposée (ne modifiant que le strict nécessaire).
3. Une explication de pourquoi cela corrige la cause profonde, pas juste le symptôme.

**Le workflow se bloque ici jusqu'à la confirmation de l'utilisateur.** Cela empêche l'agent de débogage d'effectuer des modifications sans approbation.

**Principe de correction minimale :** Modifier le moins de lignes possible. Ne pas refactoriser, ne pas améliorer le style du code, ne pas ajouter de fonctionnalités sans rapport. La correction doit être vérifiable en moins de 2 minutes.

### Étape 5 : Appliquer la correction et écrire le test de régression

Deux actions se produisent à cette étape :

1. **Implémenter la correction** -- La modification minimale approuvée est appliquée.
2. **Écrire un test de régression** -- Un test qui :
   - Reproduit le bug original (le test doit échouer sans la correction)
   - Vérifie que la correction fonctionne (le test doit passer avec la correction)
   - Empêche le même bug de se reproduire lors de futurs changements

Le test de régression est le livrable le plus important du workflow de débogage. Sans lui, le même bug peut être réintroduit par n'importe quel changement futur.

### Étape 6 : Scanner les motifs similaires

Après application de la correction, le workflow scanne l'ensemble du code source à la recherche du même motif qui a causé le bug.

**Outils utilisés :** `search_for_pattern` avec le motif identifié comme cause profonde.

Par exemple, si le bug était causé par l'accès à `user.organization.id` sans vérifier si `organization` est null, le scan recherche toutes les autres instances d'accès à `organization.id` sans vérification null.

**Critères de délégation au sous-agent** -- Le workflow lance un sous-agent `debug-investigator` lorsque :
- L'erreur couvre plusieurs domaines (ex. : frontend et backend affectés).
- Le périmètre de scan des motifs similaires couvre 10+ fichiers.
- Un traçage approfondi des dépendances est nécessaire pour diagnostiquer complètement le problème.

Méthodes de lancement spécifiques au fournisseur :

| Fournisseur | Méthode de lancement |
|:------------|:--------------------|
| Claude Code | Outil Agent avec `.claude/agents/debug-investigator.md` |
| Codex CLI | Requête de sous-agent médié par le modèle, résultats en JSON |
| Gemini CLI | `oh-my-ag agent:spawn debug "scan prompt" {session_id} -w {workspace}` |
| Antigravity / Fallback | `oh-my-ag agent:spawn debug "scan prompt" {session_id} -w {workspace}` |

Tous les emplacements vulnérables similaires sont signalés. Les instances confirmées sont corrigées dans la même session.

### Étape 7 : Documenter le bug

Le workflow écrit un fichier de mémoire contenant :
- Symptôme et cause profonde
- Correction appliquée et fichiers modifiés
- Emplacement du test de régression
- Motifs similaires trouvés dans le code source

---

## Modèle de prompt pour /debug

Lorsque vous déclenchez le workflow de débogage, vous pouvez fournir un prompt structuré :

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

- **Erreur + stack trace** permet à l'étape 2 de localiser immédiatement le code (`search_for_pattern` avec « deleteUser » trouve la fonction ; `find_symbol` identifie l'emplacement exact).
- **Étapes de reproduction** avec la condition de déclenchement spécifique (« un utilisateur dont l'organisation a été supprimée ») oriente vers la cause profonde (clé étrangère null).
- **Environnement** élimine les fausses pistes liées aux versions.

Pour des bugs plus simples, un prompt plus court suffit :

```
/debug The login page shows "Invalid credentials" even with correct password
```

Le workflow demandera des détails supplémentaires si nécessaire.

---

## Signaux d'escalade

Ces signaux indiquent que le bug nécessite une escalade au-delà de la boucle de débogage standard :

### Signal 1 : Même correction tentée deux fois

Si le workflow propose une correction, l'applique, et la même erreur réapparaît, le problème est plus profond que le diagnostic initial. Cela déclenche la **boucle d'exploration** dans les workflows qui la supportent (ultrawork, orchestrate, work) :

- Générer 2 à 3 hypothèses alternatives pour la cause profonde.
- Tester chaque hypothèse dans un workspace séparé (git stash par tentative).
- Évaluer les résultats et adopter la meilleure approche.

### Signal 2 : Cause profonde multi-domaines

L'erreur dans le frontend est causée par un changement backend qui est lui-même causé par une migration de schéma de base de données. Lorsque la cause profonde traverse les limites de domaines, escaladez vers `/work` ou `/orchestrate` pour impliquer les agents des domaines concernés.

**Exemple :** Le frontend affiche « undefined » pour le nom de l'utilisateur. Le backend retourne null pour `user.display_name`. La migration de base de données a ajouté la colonne mais les lignes existantes ont des valeurs NULL. La correction nécessite : une migration de base de données (remplissage rétroactif), la gestion null côté backend, et un affichage de repli côté frontend.

### Signal 3 : Environnement de reproduction manquant

Le bug ne se produit qu'en production et vous ne pouvez pas le reproduire localement. Les signaux incluent :
- Différences de configuration spécifiques à l'environnement.
- Conditions de concurrence qui ne se manifestent que sous la charge de production.
- Différences de comportement des services tiers entre le staging et la production.

**Action :** Collecter les logs de production, demander l'accès à la surveillance de production, et envisager d'ajouter de l'instrumentation/logging avant de tenter une correction.

### Signal 4 : Défaillance de l'infrastructure de test

Le test de régression ne peut pas être écrit car l'infrastructure de test est cassée, manquante ou inadéquate.

**Action :** Corriger l'infrastructure de test d'abord (ou utiliser `oma install` pour la configurer), puis revenir au workflow de débogage.

---

## Liste de vérification post-correction

Après application de la correction et du test de régression, vérifiez :

- [ ] **Le test de régression échoue sans la correction** -- Annuler temporairement la correction et confirmer que le test détecte le bug.
- [ ] **Le test de régression passe avec la correction** -- Appliquer la correction et confirmer que le test passe.
- [ ] **Les tests existants passent toujours** -- Exécuter la suite de tests complète pour vérifier l'absence de régressions.
- [ ] **Le build réussit** -- Compiler/builder le projet pour détecter les erreurs de type ou d'import.
- [ ] **Les motifs similaires ont été scannés** -- L'étape 6 a été complétée et toutes les instances trouvées sont soit corrigées, soit documentées.
- [ ] **La correction est minimale** -- Seules les lignes nécessaires ont été modifiées. Aucun refactoring sans rapport n'a été inclus.
- [ ] **La cause profonde est documentée** -- Le fichier de mémoire enregistre : symptôme, cause profonde, correction appliquée, fichiers modifiés, emplacement du test de régression et motifs similaires trouvés.

---

## Critères de complétion

Le workflow de débogage est terminé lorsque :

1. La cause profonde est identifiée et documentée (pas seulement le symptôme).
2. Une correction minimale est appliquée avec l'approbation de l'utilisateur.
3. Un test de régression existe, qui échoue sans la correction et passe avec.
4. Le code source a été scanné à la recherche de motifs similaires, et toutes les instances confirmées ont été traitées.
5. Un rapport de bug est enregistré en mémoire avec : symptôme, cause profonde, correction appliquée, fichiers modifiés, emplacement du test de régression et motifs similaires trouvés.
6. Tous les tests existants continuent de passer après la correction.
