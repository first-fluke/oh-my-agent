---
title: Compétences
description: Guide complet de l’architecture en deux couches des 33 skills d’OMA, du routage par SKILL.md, des ressources à la demande, des protocoles partagés et conditionnels, de l’exécution par fournisseur, des mesures de tokens et de la mécanique de routage.
---

# Compétences

Les skills sont des ensembles de connaissances structurés qui fournissent à un rôle de dispatch les indications de son domaine. Ils regroupent des protocoles d’exécution, des références de stack, des modèles de code, des guides de résolution d’erreurs, des listes de contrôle qualité et, lorsque le skill en fournit, des exemples. L’ensemble suit une architecture en deux couches conçue pour économiser des tokens.

---

## La conception en deux couches

### Couche 1 : SKILL.md (chargée lorsque le skill est routé)

Chaque skill possède un fichier `SKILL.md` à sa racine. Il entre dans la fenêtre de contexte lorsque le routage sélectionne le skill : le hook d’injection transmet une **référence de chemin**, et non le contenu. Un skill non routé ne coûte donc rien au-delà de sa `description`. Le fichier contient :

- **Frontmatter YAML** avec `name` et `description` (utilisés pour le routage et l’affichage)
- **When to use / When NOT to use** : conditions d’activation explicites
- **Core rules** : les 5 à 15 contraintes les plus importantes du domaine
- **Architecture overview** : la structure attendue du code
- **Library list** : les dépendances approuvées et leur rôle
- **References** : les pointeurs vers les ressources de la couche 2 (jamais chargées automatiquement)

Exemple de frontmatter :

```yaml
---
name: oma-frontend
description: Frontend specialist for React, Next.js, TypeScript with FSD-lite architecture, shadcn/ui, and design system alignment. Use for UI, component, page, layout, CSS, Tailwind, and shadcn work.
---
```

Le champ `description` est essentiel : il contient les mots-clés de routage utilisés par le système pour associer les tâches aux agents.

### Couche 2 : resources/ (chargée à la demande)

Le répertoire `resources/` contient les connaissances d’exécution détaillées. Ces fichiers ne sont chargés que lorsque :
1. l’hôte ou le workflow a sélectionné le skill (par exemple via une correspondance native ou une commande explicite) ;
2. la tâche en cours remplit la condition de chargement de la référence.

Ce chargement à la demande est régi par le guide de chargement du contexte (`.agents/skills/_shared/core/context-loading.md`), qui distingue les instructions d’entrée des références sélectionnées selon la tâche.

---

## Exemple de structure de fichiers

```
.agents/skills/oma-frontend/
├── SKILL.md                          ← Layer 1: loaded when routed
└── resources/
    ├── execution-protocol.md         ← Layer 2: step-by-step workflow
    ├── tech-stack.md                 ← Layer 2: detailed technology specs
    ├── angular-rules.md              ← Layer 2: Angular-specific conventions
    ├── snippets.md                   ← Layer 2: copy-paste code patterns
    ├── error-playbook.md             ← Layer 2: error recovery procedures
    └── checklist.md                  ← Layer 2: quality verification checklist

.agents/skills/oma-backend/
├── SKILL.md
├── resources/
│   ├── execution-protocol.md
│   ├── orm-reference.md              ← Domain-specific (ORM queries, N+1, transactions)
│   ├── checklist.md
│   └── error-playbook.md
└── variants/                          ← Shipped language seeds / generated references
    ├── node/
    ├── python/
    └── rust/

.agents/skills/oma-mobile/
├── SKILL.md
├── resources/
│   ├── execution-protocol.md
│   ├── tech-stack.md
│   ├── screen-template.dart
│   ├── screen-template.swift         ← Swift native iOS screen template
│   ├── screen-template.tsx            ← React Native screen template
│   ├── checklist.md
│   └── error-playbook.md
└── variants/                          ← Stack schema and generated platform references
    ├── README.md
    └── stack.schema.json

.agents/skills/oma-design/
├── SKILL.md
├── resources/
│   ├── execution-protocol.md
│   ├── anti-patterns.md
│   ├── checklist.md
│   ├── design-md-spec.md
│   ├── design-tokens.md
│   ├── prompt-enhancement.md
│   ├── stitch-integration.md
│   └── error-playbook.md
└── reference/                         ← Deep reference material
    ├── typography.md
    ├── color-and-contrast.md
    ├── spatial-design.md
    ├── motion-design.md
    ├── responsive-design.md
    ├── component-patterns.md
    ├── accessibility.md
    └── shader-and-3d.md
```

---

## Types de ressources par skill

| Type de ressource | Motif de nom de fichier | Rôle | Quand elle est chargée |
|-------------------|-------------------------|------|------------------------|
| **Execution Protocol** | `execution-protocol.md` | Workflow étape par étape : Analyze -> Plan -> Implement -> Verify | L’opération sélectionnée a besoin des détails de sa commande ou de son contrat |
| **Tech Stack** | `tech-stack.md` | Spécifications techniques détaillées, versions, configuration | Framework sélectionné ou décision de stack |
| **Error Playbook** | `error-playbook.md` | Procédures de récupération avec escalade « 3 strikes » | En cas d’erreur seulement |
| **Checklist** | `checklist.md` | Vérification qualité propre au domaine | À l’étape Verify |
| **Snippets** | `snippets.md` | Motifs de code prêts à copier-coller | Implémentation ou forme de sortie peu familière |
| **Examples** | `examples.md` ou `examples/` | Exemples input/output pour le LLM | Implémentation ou forme de sortie peu familière |
| **Variants** | répertoire `variants/` | Références propres au langage/framework. Le backend fournit les seeds `node`, `python` et `rust` ; le mobile fournit un schéma et peut recevoir des références de plateforme générées. | Lorsqu’une stack correspondante existe |
| **Templates** | `component-template.tsx`, `screen-template.dart` | Modèles de code réutilisables | Lors de la création d’un composant |
| **Domain Reference** | `orm-reference.md`, `anti-patterns.md`, etc. | Connaissances approfondies pour des sous-tâches précises | Selon le type de tâche |

---

## Ressources partagées (_shared/)

Tous les agents partagent les fondations de `.agents/skills/_shared/`. Elles sont réparties en trois catégories.

### Ressources fondamentales (`.agents/skills/_shared/core/`)

| Ressource | Rôle | Quand elle est chargée |
|-----------|------|------------------------|
| **`skill-routing.md`** | Route selon le résultat de la tâche, la responsabilité et les dépendances réelles ; aucune chaîne d’agents obligatoire ni quota de tours. | Référencée par les skills d’orchestration et de coordination |
| **`context-loading.md`** | Entrée du skill responsable, références conditionnelles et limites de chargement du runtime. | Lors de la composition du contexte |
| **`prompt-structure.md`** | Guide les transmissions de tâches peu familières avec un objectif, un contexte, des contraintes réelles et des preuves d’acceptation ; aucun modèle obligatoire pour les tâches directes. | Référencée par l’agent PM et tous les workflows |
| **`clarification-protocol.md`** | Résout les détails courants à partir du contexte et ne demande que les informations manquantes importantes ou une autorisation. | Lorsque les exigences sont ambiguës |
| **`context-budget.md`** | Estimations de taille des fichiers, mesure réelle des prompts, lectures ciblées et checkpoints. | Tâches longues ou diagnostic de la surcharge de contexte |
| **`difficulty-guide.md`** | Choisit la profondeur de planification et les livrables selon les dépendances et les besoins de vérification. | Lorsque la décomposition nécessite une estimation de difficulté |
| **`quality-principles.md`** | Indications sur le périmètre, la maintenabilité, les preuves et une vérification proportionnée. | Au début des workflows axés qualité (ultrawork) |
| **`vendor-detection.md`** | Protocole de détection du runtime (Claude Code, Codex CLI, Antigravity, Cursor, Kiro, Qwen et fallback CLI), avec marqueurs d’hôte et état du fournisseur configuré. | Au début du workflow |
| **`session-metrics.md`** | Preuves de session facultatives, sans score de pénalité conversationnel ni d’évaluateur. | Rétrospective demandée ou correction importante |
| **`common-checklist.md`** | Vérifications transversales applicables ; aucune limite globale du nombre de lignes ni exigence généralisée de catch. | Revue transversale lorsque c’est pertinent |
| **`lessons-learned.md`** | Consigne et applique des leçons étayées par des preuves, avec des conditions de version et de déclenchement ; aucun seuil RCA automatique. | Après les erreurs et à la fin d’une session |
| **`api-contracts/`** | Modèle de contrat facultatif. Réutilisez les schémas du projet ; les contrats générés se trouvent en dehors des sources du skill. | Lorsqu’une tâche traverse des frontières |

### Ressources d’exécution (`.agents/skills/_shared/runtime/`)

| Ressource | Rôle |
|-----------|------|
| **`memory-protocol.md`** | Format et opérations des fichiers mémoire pour les sous-agents CLI. Définit les protocoles On Start, During Execution et On Completion, avec outils mémoire configurables (lecture/écriture/édition) et extension de suivi d’expériences. |
| **`execution-protocols/claude.md`** | Patterns d’exécution propres à Claude Code, injectés par `oma agent spawn` lorsque le fournisseur est claude. |
| **`execution-protocols/antigravity.md`** | Patterns d’exécution de l’Antigravity CLI (`agy`). |
| **`execution-protocols/codex.md`** | Patterns d’exécution du Codex CLI. |
| **`execution-protocols/commandcode.md`** | Patterns d’exécution de CommandCode. |
| **`execution-protocols/grok.md`** | Patterns d’exécution de Grok. |
| **`execution-protocols/kimi.md`** | Patterns d’exécution de Kimi Code. |
| **`execution-protocols/kiro.md`** | Patterns d’exécution de Kiro. |
| **`execution-protocols/opencode.md`** | Patterns d’exécution de l’extension OpenCode. |
| **`execution-protocols/pi.md`** | Patterns d’exécution de l’extension pi. |
| **`execution-protocols/qwen.md`** | Patterns d’exécution du Qwen CLI. |

Les protocoles propres aux fournisseurs sont injectés automatiquement pour les agents lancés par CLI avec `oma agent spawn`. Les sous-agents natifs utilisent les règles d’intégration du fournisseur sélectionné.

### Ressources conditionnelles (`.agents/skills/_shared/conditional/`)

Elles ne sont chargées que lorsque les conditions d’exécution correspondantes sont réunies :

| Ressource | Condition | Chargée par |
|-----------|-----------|-------------|
| **`quality-score.md`** | Un baseline défini ou une comparaison d’expériences est nécessaire | Orchestrator (la transmet au prompt QA) |
| **`experiment-ledger.md`** | Une première expérience est enregistrée après l’établissement d’un baseline IMPL | Orchestrator (inline, après mesure baseline) |
| **`exploration-loop.md`** | La récupération échoue à plusieurs reprises et des alternatives méritent d’être testées dans la limite du budget | Orchestrator (inline, avant les agents d’hypothèses) |

Ces ressources sont différées jusqu’à ce que leurs déclencheurs respectifs s’appliquent. La difficulté seule ne les injecte pas.

---

## Comment les skills sont routés via skill-routing.md

La carte de routage définit la manière dont les tâches sont associées aux agents.

### Routage simple (un seul domaine)

Un prompt contenant « Build a login form with Tailwind CSS » correspond aux mots-clés `UI`, `component`, `form` et `Tailwind`, puis est routé vers **oma-frontend**.

### Routage d’une demande complexe

Les demandes couvrant plusieurs domaines suivent des ordres d’exécution établis :

| Motif de demande | Ordre d’exécution |
|------------------|-------------------|
| « Create a fullstack app » | oma-pm -> (oma-backend + oma-frontend) en parallèle -> oma-qa |
| « Create a mobile app » | oma-pm -> (oma-backend + oma-mobile) en parallèle -> oma-qa |
| « Fix bug and review » | oma-debug -> oma-qa |
| « Design and build a landing page » | oma-design -> oma-frontend |
| « I have an idea for a feature » | oma-brainstorm -> oma-pm -> agents concernés -> oma-qa |
| « Do everything automatically » | oma-orchestration (en interne : oma-pm -> agents -> oma-qa) |

### Règles de dépendance entre agents

**Peuvent s’exécuter en parallèle (aucune dépendance) :**
- oma-backend + oma-frontend (lorsqu’un contrat d’API est déjà défini)
- oma-backend + oma-mobile (lorsqu’un contrat d’API est déjà défini)
- oma-frontend + oma-mobile (indépendants l’un de l’autre)

**Doivent s’exécuter séquentiellement :**
- oma-brainstorm -> oma-pm (la conception précède la planification)
- oma-pm -> tous les autres agents (la planification vient d’abord)
- agent d’implémentation -> oma-qa (la revue suit l’implémentation)
- oma-backend -> oma-frontend/oma-mobile (sans contrat d’API prédéfini)

**La QA intervient toujours en dernier**, sauf lorsque l’utilisateur ne demande que la revue de fichiers précis.

---

## Calcul des économies de tokens {#token-savings-math}

Mesurez avant d’annoncer des économies :

```bash
bun scripts/measure-skill-context.ts
bun scripts/measure-skill-context.ts --skills oma-pm,oma-backend,oma-frontend --json
oma agent context backend --difficulty Simple
```

Le script fournit des estimations (octets UTF-8 / 4) pour des scénarios de taille de fichiers. `routed` correspond à l’entrée seule ; `simple`, `medium` et `complex` ajoutent, pour comparaison, des fichiers hypothétiques de protocole, d’exemples et de stack. Ces noms sont conservés pour la compatibilité avec le script, et non comme des instructions de préchargement. `all` est un plafond de taille des ressources, et non une configuration d’exécution. Un checkout neuf peut utiliser un seed de plateforme comme proxy de taille ; il ne charge pas toutes les plateformes.

La commande de contexte affiche l’injection réelle du contexte de la tâche. Elle n’inclut pas le reste de la conversation ni l’ensemble des instructions de l’hôte ou du runtime. Utilisez un prompt assemblé ou la télémétrie d’usage pour mesurer le nombre total de tokens d’entrée, la latence et le coût sur un modèle précis. Ne les déduisez pas de la taille du dépôt ni des comptages de miroirs générés.

## Chargement des ressources selon la tâche {#resource-loading-by-task}

Chaque niveau de difficulté commence par le skill responsable. Le graphe est un index de références ; l’adjacence n’autorise pas le chargement d’un autre spécialiste, d’un guide de résolution d’erreurs ou d’un workflow d’expériences conditionnel.

Le chargeur utilise des budgets souples de 1 500 / 4 000 / 8 000 tokens estimés pour Simple / Medium / Complex. Une entrée qui dépasse le budget est conservée et le dépassement est signalé. Les références complémentaires restent différées, sauf sélection explicite une fois leur déclencheur de tâche résolu. Une entrée requise n’est jamais remplacée par des documents plus petits sans rapport.

La vérification s’adapte au risque de la tâche et aux exigences du projet. Une étiquette de difficulté n’impose ni suite de tests complète, ni réponse preflight fixe, ni seconde approbation d’un travail déjà autorisé.

## Cartes de chargement du contexte (par agent)

Voici des exemples de références à consulter lorsque la tâche en a besoin. Utilisez l’index actuel du skill responsable et ne sélectionnez que les sections applicables :

### Agent backend

| Type de tâche | Ressources requises |
|---------------|--------------------|
| Création d’une API CRUD | `variants/{node,python,rust}/snippets.md` correspondants lorsqu’ils existent |
| Authentification | `snippets.md` de la variante correspondante + `tech-stack.md` lorsqu’il existe |
| Migration de base | `snippets.md` de la variante correspondante lorsqu’il existe |
| Optimisation des performances | `orm-reference.md` et les exemples correspondants fournis par le skill |
| Modification d’un code existant | Fournisseur d’intelligence du code du projet et ressources d’exécution pertinentes |

### Agent frontend

| Type de tâche | Ressources requises |
|---------------|--------------------|
| Création d’un composant | snippets.md + motifs de composants existants du projet |
| Implémentation d’un formulaire | snippets.md (formulaire + Zod) |
| Intégration API | snippets.md (TanStack Query) |
| Styling | tailwind-rules.md |
| Mise en page | snippets.md (grid) |

### Agent design

| Type de tâche | Ressources requises |
|---------------|--------------------|
| Création d’un système de design | reference/typography.md + reference/color-and-contrast.md + reference/spatial-design.md + design-md-spec.md |
| Design d’une landing page | reference/component-patterns.md + reference/motion-design.md + prompt-enhancement.md |
| Audit design | checklist.md + anti-patterns.md |
| Export de tokens de design | design-tokens.md |
| Effets 3D / shaders | reference/shader-and-3d.md + reference/motion-design.md |
| Revue d’accessibilité | reference/accessibility.md + checklist.md |

### Agent QA

| Type de tâche | Ressources requises |
|---------------|--------------------|
| Revue de sécurité | checklist.md (section Security) |
| Revue de performance | checklist.md (section Performance) |
| Revue d’accessibilité | checklist.md (section Accessibility) |
| Audit complet | checklist.md (complet) + self-check.md |
| Comparaison d’une métrique définie | quality-score.md (conditionnel) |

---

## Composition du prompt de l’orchestrateur

Lorsque l’orchestrateur compose les prompts des sous-agents, il n’inclut que les ressources pertinentes pour la tâche :

1. Le chemin du SKILL.md du skill responsable (le dispatch CLI injecte déjà le contenu)
2. La section execution-protocol d’une opération sélectionnée, lorsqu’elle est nécessaire
3. Les ressources correspondant au type de tâche (selon les cartes ci-dessus)
4. La section error-playbook pertinente, uniquement après un échec observé
5. Memory Protocol (mode CLI)

Cette composition ciblée évite de charger des ressources inutiles et maximise le contexte disponible pour le travail réel du sous-agent.

---

## Preuves de session et revue rétrospective

Les enregistrements de session consignent les corrections importantes, les changements de périmètre, les reprises de travail et les constats de revue arbitrés, preuves à l’appui. Une clarification nécessaire n’entraîne aucune pénalité. Les anciens scores pondérés CD et EA, ainsi que les règles de RCA déclenchées par seuil, ont été supprimés ; il s’agissait d’instructions de prompt, et non de métriques calculées par la CLI.

Réutilisez les résultats de tâche existants lorsque c’est possible. Un fichier distinct `session-metrics-{sessionId}.md` est facultatif dans le magasin de coordination configuré. Un échec répété ou une rétrospective demandée peut justifier une leçon, mais un échec de contrôle ordinaire ou un constat contesté n’en établit pas automatiquement une. Conservez les journaux historiques ; ne les réécrivez pas dans le nouveau format.

`oma stats` rend compte de la productivité et des synthèses de l’usage et du coût enregistrés. `oma retro` regroupe en suggestions les événements réels de porte, de blocage et de décision manquante. Aucune des deux ne calcule de scores CD/EA à partir de ces artefacts Markdown.

## Décomposition des tâches et récupération du contexte

Planifiez en fonction des dépendances et des comportements vérifiables indépendamment. Un nombre fixe de sprints, un nombre de fichiers et des estimations de tours ne déterminent ni la profondeur de la revue ni l’achèvement. Regroupez les tests et la gestion des erreurs avec le comportement qu’ils vérifient.

En cas de blocage observé ou de perte de contexte utile, enregistrez le travail terminé, les critères restants, les chemins pertinents et les preuves de vérification avant de reprendre ou de relancer le dispatch. Préservez le travail existant et évitez de dupliquer une tentative en cours. À lui seul, un ratio tours/progression n’impose pas de réinitialisation.

## Mesure et exploration conditionnelles

Un baseline défini ou une comparaison d’expériences active les indications de mesure ; la simple présence de tests ou de lint ne les active pas. Consignez des métriques comparables avec leurs unités, leur méthode, leur révision et leurs preuves. Les vérifications requises de correction et de sécurité restent indépendantes. OMA ne comporte aucune formule composite par défaut, aucune porte fondée sur une note alphabétique ni aucun rollback déclenché par un score.

Une expérience réelle consigne son hypothèse, les preuves du baseline et du candidat, les vérifications requises, la décision et les fichiers dont elle a la charge. Des échecs répétés peuvent justifier de tester un autre mécanisme dans la limite du budget de récupération existant. Isolez les changements de l’expérience, préservez les modifications sans rapport et vérifiez le candidat intégré avant de relancer la porte.
