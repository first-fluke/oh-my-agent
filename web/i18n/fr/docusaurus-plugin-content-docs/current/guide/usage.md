---
title: Guide d'Utilisation
description: Exemples concrets montrant comment utiliser oh-my-agent — de taches simples a l'orchestration multi-agent complete.
---

# Comment Utiliser oh-my-agent

> Vous ne savez pas par ou commencer ? Tapez `/work` suivi de ce que vous voulez construire.

## Demarrage Rapide

1. Ouvrez votre projet dans un IDE IA (Claude Code, Gemini, Cursor, etc.)
2. Les skills sont auto-detectes depuis `.agents/skills/`
3. Commencez a discuter — decrivez ce que vous voulez

C'est tout. oh-my-agent s'occupe du reste.

---

## Exemple 1 : Tache Simple

**Vous tapez :**
```
"Cree un composant formulaire de connexion avec champs email et mot de passe en utilisant Tailwind CSS"
```

**Ce qui se passe :**
- Le skill `oma-frontend` s'active
- Charge son protocole d'execution et ses ressources tech-stack a la demande
- Vous obtenez un composant React avec TypeScript, Tailwind, validation de formulaire et tests

Pas besoin de commandes slash. Decrivez juste ce que vous voulez.

## Exemple 2 : Projet Multi-Domaine

**Vous tapez :**
```
"Construis une app TODO avec authentification utilisateur"
```

**Ce qui se passe :**

1. La detection de mots-cles voit que c'est multi-domaine → suggere `/work`
2. **Agent PM** planifie le travail : API d'auth, schema de base de donnees, UI frontend, perimetre QA
3. **Vous lancez les agents :**
   ```bash
   oma agent:spawn backend "JWT authentication API" session-01 -w ./apps/api &
   oma agent:spawn frontend "Login and TODO UI" session-01 -w ./apps/web &
   wait
   ```
4. **Les agents travaillent en parallele** — chacun dans son propre workspace
5. **L'agent QA revise** — audit de securite, verification d'integration
6. **Vous iterez** — relancez des agents avec des raffinements si necessaire

## Exemple 3 : Correction de Bug

**Vous tapez :**
```
"Il y a un bug — cliquer sur login affiche 'Cannot read property map of undefined'"
```

**Ce qui se passe :**

1. `oma-debug` s'active automatiquement (mot-cle : "bug")
2. Cause racine identifiee — le composant itere sur `todos` avant que les donnees chargent
3. Correction appliquee — etats de chargement et verifications null
4. Test de regression ecrit
5. Patterns similaires trouves et corriges proactivement dans 3 autres composants

## Exemple 4 : Systeme de Design

**Vous tapez :**
```
"Design une landing page sombre premium pour mon produit SaaS"
```

**Ce qui se passe :**

1. `oma-design` s'active (mot-cle : "design", "landing page")
2. Recueille le contexte — audience, marque, direction esthetique
3. Propose 2-3 directions de design avec options de couleur, typographie et mise en page
4. Genere `DESIGN.md` avec tokens, patterns de composants et regles d'accessibilite
5. Lance un audit — responsive, WCAG, heuristiques de Nielsen
6. Pret pour que `oma-frontend` implemente

## Exemple 5 : Execution Parallele via CLI

```bash
# Agent unique
oma agent:spawn backend "Implement JWT auth API" session-01

# Agents multiples en parallele
oma agent:spawn backend "Auth API + DB migration" session-01 -w ./apps/api &
oma agent:spawn frontend "Login form + error states" session-01 -w ./apps/web &
oma agent:spawn mobile "Auth screens + biometrics" session-01 -w ./apps/mobile &
wait

# Surveiller en temps reel
oma dashboard        # UI terminal
oma dashboard:web    # UI web a http://localhost:9847
```

---

## Commandes Workflow

Tapez-les dans votre IDE IA pour declencher des processus structures :

| Commande | Ce Qu'elle Fait | Quand L'utiliser |
|----------|-----------------|------------------|
| `/brainstorm` | Ideation libre et exploration | Avant de s'engager dans une approche |
| `/plan` | Decomposition PM → `.agents/results/plan-{sessionId}.json` | Avant de demarrer toute fonctionnalite complexe |
| `/exec-plan` | Executer un plan existant etape par etape | Apres `/plan` |
| `/work` | Coordination multi-domaine etape par etape | Fonctionnalites couvrant plusieurs agents |
| `/orchestrate` | Execution automatisee d'agents en parallele | Grands projets, parallelisme maximum |
| `/ultrawork` | Workflow qualite 5 phases (11 portes de revue) | Livraison qualite maximum |
| `/review` | Audit securite + performance + accessibilite | Avant de merger |
| `/debug` | Debogage structure de cause racine | Enquete sur des bugs |
| `/design` | Workflow design 7 phases → `DESIGN.md` | Construction de systemes de design |
| `/scm` | Commit conventionnel avec analyse type/scope | Commit de changements |
| `/tools` | Gestion des serveurs MCP | Ajout d'outils externes |
| `/stack-set` | Configuration du stack technique | Definition des preferences langage/framework |
| `/deepinit` | Initialisation complete du projet | Configuration dans un codebase existant |

---

## Auto-Detection (Sans Commandes Slash)

oh-my-agent detecte des mots-cles en 11 langues et active les workflows automatiquement :

| Vous Dites | Workflow Qui S'Active |
|------------|----------------------|
| "plan the auth feature" | `/plan` |
| "planifie l'authentification" | `/plan` |
| "do everything in parallel" | `/orchestrate` |
| "revise le code" | `/review` |
| "design la page" | `/design` |
| "brainstorm some ideas" | `/brainstorm` |

Les questions comme "qu'est-ce qu'orchestrate ?" sont filtrees — elles ne declencheront pas de workflows accidentellement.

---

## Skills Disponibles

| Skill | Ideal Pour | Sortie |
|-------|-----------|--------|
| oma-pm | "planifie ca", "decompose" | `.agents/results/plan-{sessionId}.json` |
| oma-frontend | UI, composants, style | Composants React, tests |
| oma-backend | APIs, bases de donnees, auth | Endpoints, modeles, tests |
| oma-db | Schema, ERD, migrations | Design de schema, optimisation de requetes |
| oma-mobile | Apps mobiles | Ecrans Flutter, gestion d'etat |
| oma-design | UI/UX, systemes de design | `DESIGN.md` avec tokens |
| oma-brainstorm | Ideation, exploration | Document de design |
| oma-qa | Securite, performance, a11y | Rapport QA avec corrections priorisees |
| oma-debug | Bugs, erreurs, crashes | Code corrige + tests de regression |
| oma-tf-infra | Infrastructure cloud | Modules Terraform |
| oma-dev-workflow | CI/CD, automatisation | Configs de pipeline |
| oma-translator | Traduction | Contenu multilingue naturel |
| oma-orchestrator | Execution parallele | Resultats d'agents |
| oma-scm | Commits Git | Commits conventionnels |

---

## Dashboards

### Dashboard Terminal

```bash
oma dashboard
```

Tableau en direct affichant le statut de session, etats des agents, tours et derniere activite. Surveille `.serena/memories/` pour les mises a jour en temps reel.

### Dashboard Web

```bash
oma dashboard:web
# → http://localhost:9847
```

Fonctionnalites :
- Mises a jour en temps reel via WebSocket
- Auto-reconnexion en cas de coupure
- Statut de session avec indicateurs d'agent colores
- Journal d'activite depuis les fichiers de progression et resultats

### Disposition Recommandee

Utilisez 3 terminaux :
1. Dashboard (`oma dashboard`)
2. Commandes de spawn d'agents
3. Logs de test/build

---

## Conseils

1. **Soyez specifique** — "Construis une app TODO avec JWT auth, frontend React, backend Express" bat "fais une app"
2. **Utilisez des workspaces** — `-w ./apps/api` empeche les agents de se marcher dessus
3. **Verrouillez les contrats d'abord** — lancez `/plan` avant de spawn des agents en parallele
4. **Surveillez activement** — les dashboards detectent les problemes avant le merge
5. **Iterez avec des re-spawns** — affinez les prompts d'agents au lieu de repartir de zero
6. **Commencez avec `/work`** — quand vous ne savez pas quel workflow utiliser

---

## Depannage

| Probleme | Solution |
|----------|----------|
| Skills non detectes dans l'IDE | Verifiez que `.agents/skills/` existe avec des fichiers `SKILL.md`, redemarrez l'IDE |
| CLI non trouve | `which gemini` / `which claude` — installez ceux qui manquent |
| Agents produisant du code conflictuel | Utilisez des workspaces separes (`-w`), verifiez les sorties, relancez avec corrections |
| Dashboard affiche "No agents detected" | Les agents n'ont pas encore ecrit dans `.serena/memories/` — attendez ou verifiez le session ID |
| Dashboard web ne demarre pas | Lancez `bun install` d'abord |
| Rapport QA avec 50+ problemes | Concentrez-vous sur CRITICAL/HIGH d'abord, documentez le reste pour plus tard |

---

Pour l'integration dans des projets existants, consultez le [Guide d'Integration](./integration.md).
