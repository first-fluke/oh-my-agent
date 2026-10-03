---
title: Workflows
description: "Référence complète des 21 workflows d’oh-my-agent : commandes slash, modes persistant et non persistant, mots-clés de déclenchement dans 11 langues, phases et étapes, fichiers lus et écrits, détection automatique via triggers.json et keyword-detector.ts, filtrage des questions informatives et gestion de l’état du mode persistant."
---

# Workflows

Les workflows sont des processus structurés en plusieurs étapes, déclenchés par des commandes slash ou des mots-clés en langage naturel. Ils définissent la collaboration des agents, depuis les utilitaires en une phase jusqu’aux portes qualité complexes en cinq phases.

Il existe 21 workflows, dont 4 persistants : ils conservent leur état et ne peuvent pas être interrompus par inadvertance.

---

## Choisir un skill ou un workflow {#choosing-a-skill-or-workflow}

Choisissez selon le niveau de coordination et de vérification dont la tâche a besoin. Si un workflow est déjà sélectionné, suivez-le et poursuivez le workflow actif jusqu’à son annulation ou son changement explicite. Pour une nouvelle tâche sans workflow sélectionné, utilisez ce guide :

| Besoin de la tâche | Choisir | Exemple |
|---|---|---|
| Un seul domaine sans coordination d’agents | [Skill unique](/docs/guide/single-skill) | Ajouter un endpoint API et tester sa validation |
| Plusieurs domaines avec planification, implémentation et QA étape par étape | `/work` | Coordonner une modification d’API avec ses clients web et mobile |
| Délégation automatique de tâches indépendantes en parallèle | `/orchestrate` | Implémenter les tâches backend et frontend en parallèle après résolution des dépendances |
| Processus qualité complet explicitement demandé | `/ultrawork` | Exécuter la planification, l’implémentation, la vérification, le raffinement et les revues de préparation à la livraison |
| Répéter l’exécution jusqu’à ce que des critères vérifiables mécaniquement passent | `/ralph` | Répéter l’implémentation et la vérification indépendante jusqu’à la régression spécifiée, dans les garde-fous de la boucle |

`/orchestrate` charge un plan exploitable ou en crée un via `/plan` avant de lancer les agents. Il n’est donc pas nécessaire d’exécuter `/plan` au préalable. Un plan existant ne distingue pas `/work` de `/orchestrate` : choisissez selon la coordination souhaitée. Les deux workflows peuvent exécuter des tâches indépendantes en parallèle.

Les critères d’acceptation et les tests appartiennent aussi aux tâches single-skill. Leur présence ne déclenche pas à elle seule `/ralph` : chaque itération Ralph exécute tout le processus ultrawork avec un juge indépendant. Choisissez-le lorsque vous voulez cette boucle de vérification répétée. Les garde-fous peuvent arrêter la boucle avec un travail incomplet ou bloqué.

Cette table conseille une sélection ; elle ne constitue pas un routeur automatique. L’agent hôte peut recommander une approche, mais recommander ou expliquer un workflow ne le démarre pas. Une commande slash sélectionne explicitement le workflow. Lorsque le hook de détection par mots-clés est activé, des mots-clés ou motifs configurés peuvent aussi l’activer, sous réserve du filtrage des questions informatives. Le détecteur ne classe pas le nombre de domaines, ne vérifie pas la maturité du plan et n’applique pas la table comme un algorithme de priorité.

La revue du plan réutilise l’autorisation déjà accordée pour la tâche. Les agents ne demandent qu’une décision importante manquante ou une action hors périmètre. Une revue de préparation à la livraison n’autorise pas à elle seule la publication ou le déploiement.

---

## Workflows persistants {#persistent-workflows}

Les workflows persistants continuent jusqu’à la fin de toutes les tâches. Ils conservent leur état dans `.agents/state/` et réinjectent le contexte `[OMA PERSISTENT MODE: ...]` à chaque message utilisateur jusqu’à leur désactivation explicite.

Le mode persistant ne démarre que sur une **invocation explicite** — le nom même du workflow (la liste `explicit` de `triggers.json`, par exemple « orchestrate », « ultrawork »/« ulw », « ralph »/« 랄프 », « work mode »). Les autres mots-clés de déclenchement ci-dessous sont des indices en langage naturel : ils injectent le workflow comme suggestion sans activer le mode persistant, et ils ne se déclenchent jamais lorsque la première ou la dernière ligne du prompt est une question se terminant par `?`.

### /orchestrate

**Description :** Exécution parallèle automatisée d’agents par CLI. Le workflow lance des sous-agents par CLI, coordonne l’état durable et les reçus, surveille la progression et exécute des boucles de vérification.

**Persistant :** Oui. Fichier d’état : `.agents/state/orchestrate-state.json`.

**Mots-clés de déclenchement :**
| Langue | Mots-clés |
|---------|-----------|
| Explicite (persistant) | "orchestrate", "オーケストレート", "orquestar", "orchestrer", "orchestrieren", "orquestrar", "оркестровать", "orkestreren", "orkiestrować" |
| Anglais | "do everything", "run everything", "everything in parallel", "automate everything" |
| Coréen | "전부 실행", "전부 해", "전부 병렬로", "자동으로 해줘" |
| Japonais | "全部実行", "全部並列で", "自動でやって" |
| Chinois | "编排", "全部执行", "全部并行", "自动处理" |
| Espagnol | "ejecutar todo", "todo en paralelo" |
| Français | "tout exécuter", "tout en parallèle" |
| Allemand | "alles ausführen", "alles parallel" |
| Portugais | "executar tudo", "tudo em paralelo" |
| Russe | "выполнить всё", "всё параллельно" |
| Néerlandais | "alles uitvoeren", "alles parallel" |
| Polonais | "wykonaj wszystko", "wszystko równolegle" |

Les simples mots « parallel »/« automate » (et leurs traductions) ne sont pas des déclencheurs : « run the tests in parallel » ou « automate the release notes » sont des demandes ordinaires, et non de l’orchestration multi-agents.

**Motifs regex de déclenchement** (intention + liste blanche de noms, voir [Détection automatique : champ Pattern](#pattern-field-raw-regex)) :
| Section | Motif | Exemples déclencheurs |
|---------|-------|----------------------|
| `*` (universal) | `(build\|create\|make\|develop\|implement\|scaffold) + (me)? + (a\|an) + [modifier]{0,3} + <noun>` | "Build a TODO app with user authentication", "Create an awesome web service", "Develop a backend with PostgreSQL" |
| `*` (universal) | `i want a/an + <noun>` | "I want a CLI for parsing logs" |
| `ko` | `<noun> + (을\|를\|이\|가)? + (만들어\|구현해\|개발해 + 변형)` | "TODO 앱 만들어줘", "REST API 구현해", "백엔드를 개발해주세요" |

Liste blanche de noms (14) : app, api, service, server, cli, tool, website, dashboard, system, backend, frontend, prototype, mvp, bot. Une fonctionnalité isolée (« implement the login feature », « 로그인 기능 구현해줘 ») ou une chose existante (« make the API faster ») ne correspond pas.

**Étapes :**
1. **Step 0, Préparation :** lire le skill de coordination, le guide de chargement du contexte et le protocole mémoire. Détecter le fournisseur.
2. **Step 1, Charger/créer le plan :** chercher `.agents/results/plan-{sessionId}.json`, puis le `plan-*.json` le plus récent. S’il n’existe aucun plan, ou si le plan n’est pas prêt à l’exécution (tâche sans agent, niveau de priorité, dépendances ou critères d’acceptation), déléguer inline à `/plan` pour en créer un avec le même identifiant de session. Présenter le plan et réutiliser l’autorisation existante ; demander uniquement une décision importante manquante ou une nouvelle autorisation avant la délégation.
3. **Step 2, Initialiser la session :** charger `oma-config.yaml`, afficher la table de correspondance CLI, réutiliser l’identifiant du plan ou en générer un (`session-YYYYMMDD-HHMMSS`), puis créer `orchestrator-session-{sessionId}.md` et `task-board-{sessionId}.md` dans le magasin mémoire configuré.
4. **Step 3, Lancer les agents :** pour chaque niveau de priorité (P0, puis P1…), lancer les agents avec la méthode adaptée au fournisseur (sous-agents natifs si runtime et fournisseur cible correspondent ; `oma agent spawn` pour les tâches externes ou inter-fournisseurs). Ne jamais dépasser MAX_PARALLEL.
5. **Step 4, Surveiller :** interroger les fichiers `progress-{agentId}-{taskId}-{runId}-{sessionId}.md` propres aux runs et les reçus structurés, puis mettre à jour le task board. Surveiller fins, échecs et plantages.
6. **Step 5, Vérifier :** exécuter `verify.sh {agent-type} {workspace}` pour chaque agent terminé. En cas d’échec, relancer avec le contexte d’erreur (2 reprises maximum). Des échecs répétés peuvent justifier d’autres hypothèses, mais toutes les tentatives consomment le même budget de récupération global. Conserver les preuves non résolues si le budget ne couvre pas un tour de comparaison.
7. **Step 6, Collecter :** lire les fichiers de résultat propres aux runs et les claims structurées, puis compiler le résumé.
8. **Step 7, Rapport final :** présenter le résumé de session. Si des expériences ont été menées, résumer les preuves et les décisions ; ne consigner des leçons que lorsqu’une cause réutilisable est établie.

**Fichiers lus :** `.agents/results/plan-{sessionId}.json`, `.agents/oma-config.yaml`, fichiers de progression/résultat propres aux runs et reçus structurés.
**Fichiers écrits :** état de session/task board propre aux runs dans le magasin mémoire configuré, reçus et claims structurés, rapport final.

**Quand l’utiliser :** projets importants qui exigent un parallélisme maximal et une coordination automatisée.

---

### /work

**Description :** Coordination multi-domaines étape par étape. Le PM planifie, les agents exécutent dans le périmètre autorisé, puis la QA examine le résultat et les problèmes sont corrigés.

**Persistant :** Oui. Fichier d’état : `.agents/state/work-state.json`.

**Mots-clés de déclenchement :**
| Langue | Mots-clés |
|---------|-----------|
| Explicite (persistant) | "work mode", "work workflow" |
| Universel | "step by step" |
| Anglais | "one by one", "one step at a time" |
| Coréen | "단계별", "하나씩 해줘", "차근차근" |
| Japonais | "ステップバイステップ", "一歩ずつ" |
| Chinois | "逐步", "一步一步" |
| Espagnol | "paso a paso", "uno por uno" |
| Français | "étape par étape", "un par un" |
| Allemand | "schritt für schritt", "der reihe nach" |

Le simple mot « work » n’est pas un déclencheur — c’est du vocabulaire ordinaire (« Does this work on Windows? »).

**Étapes :**
1. **Step 0, Préparation :** lire les skills, le chargement du contexte et le protocole mémoire. Consigner le début de session.
2. **Step 1, Analyser les exigences :** identifier les domaines concernés. Pour un seul domaine, suggérer l’utilisation directe de l’agent.
3. **Step 2, Planification PM :** le PM décompose les exigences, définit les contrats d’API, crée le découpage priorisé et l’enregistre dans `.agents/results/plan-{sessionId}.json`.
4. **Step 3, Revoir le plan :** présenter le plan et continuer dans l’autorisation existante. Demander uniquement une décision importante manquante ou une nouvelle autorisation.
5. **Step 4, Lancer les agents :** lancer par niveau de priorité, en parallèle au sein d’un niveau, avec des workspaces séparés.
6. **Step 5, Surveiller :** interroger les fichiers de progression et vérifier l’alignement des contrats d’API.
7. **Step 6, Revue QA :** lancer un agent QA pour la sécurité (OWASP), la performance, l’accessibilité et la qualité du code.
8. **Step 6.1, Mesures** (conditionnel) : enregistrer un baseline lorsqu’une comparaison définie est nécessaire.
9. **Step 7, Itérer :** en cas de problème CRITICAL/HIGH, relancer l’agent responsable. Si le même problème persiste après 2 tentatives, activer l’Exploration Loop.

**Quand l’utiliser :** fonctionnalités qui couvrent plusieurs domaines et nécessitent une coordination étape par étape de la planification, de l’implémentation et de la QA.

---

### /ultrawork

**Description :** Workflow axé sur la qualité. Il comprend 5 phases, 17 étapes et 12 étapes de revue isolées. Chaque phase possède une porte qui doit passer avant la suite.

**Persistant :** Oui. Fichier d’état : `.agents/state/ultrawork-state.json`.

**Mots-clés de déclenchement :**
| Langue | Mots-clés |
|---------|-----------|
| Explicite (persistant) | "ultrawork", "ulw" |

**Phases et étapes :**

| Phase | Étapes | Agent | Perspective de revue |
|-------|--------|-------|----------------------|
| **PLAN** | 1-4 | Agent PM (inline) | Exhaustivité, méta-revue, sur-ingénierie/simplicité |
| **IMPL** | 5 | Agents de développement (lancés) | Implémentation |
| **VERIFY** | 6-8 | Agent QA (lancé) | Alignement, sécurité (OWASP), prévention des régressions |
| **REFINE** | 9-13 | Agent de refactoring (lancé) | Découpage de fichiers, réutilisabilité, impact en cascade, cohérence, code mort |
| **SHIP** | 14-17 | Agent QA (lancé) | Qualité du code (lint/coverage), parcours UX, problèmes liés, préparation au déploiement |

**Définition des portes :**
- **PLAN_GATE :** plan documenté, hypothèses listées, alternatives examinées, revue de sur-ingénierie effectuée, périmètre autorisé.
- **IMPL_GATE :** contrôles et tests applicables qui n’émettent pas d’artefact passent, seuls les fichiers planifiés sont modifiés, preuves de baseline enregistrées pour de véritables expériences. Les contrôles de build ne sont lancés que sur demande explicite.
- **VERIFY_GATE :** implémentation conforme aux exigences, zéro CRITICAL, zéro HIGH, aucune régression, objectifs de mesure du projet applicables atteints.
- **REFINE_GATE :** règles de maintenabilité du projet respectées, opportunités d’intégration capturées, effets de bord vérifiés, code nettoyé, aucune régression non résolue.
- **SHIP_GATE :** contrôles qualité passés, UX vérifiée, problèmes liés résolus, checklist de déploiement complète, objectifs de mesure du projet applicables atteints avec des preuves à jour. Réutiliser l’autorisation existante ; publier ou déployer exige une autorisation pour cette action.

**Comportement en cas d’échec :**
- Premier échec : revenir à l’étape concernée, corriger et réessayer.
- Deuxième échec sur le même problème : réévaluer la cause ; si des alternatives méritent d’être testées dans le budget restant, comparer des expériences isolées au comportement requis et aux métriques définies.

**Améliorations conditionnelles :** comparaisons de métriques définies, décisions et preuves d’expérience, exploration d’hypothèses budgétée et leçons appuyées par des causes réutilisables.

**Condition de saut de REFINE :** tâches simples de moins de 50 lignes.

**Quand l’utiliser :** processus complet de revue avant de décider si le résultat est prêt pour la livraison. Le workflow consigne contrôles et constats ; il ne décide pas à votre place si le résultat est prêt pour la production.

---

### /ralph

**Description :** Boucle d’exécution persistante et auto-référentielle. Elle enveloppe ultrawork d’un vérificateur indépendant qui contrôle les critères de fin après chaque itération. Elle signale une fin complète lorsque tous les critères passent, une fin partielle lorsqu’il ne reste que des critères réussis et bloqués, ou s’arrête lorsqu’un garde-fou se déclenche.

**Persistant :** Oui. Fichier d’état : `.agents/state/ralph-state.json`.

**Mots-clés de déclenchement :**
| Langue | Mots-clés |
|---------|-----------|
| Explicite (persistant) | "ralph", "랄프" |
| Anglais | "don't stop", "until done", "keep going until", "finish everything", "run to completion" |
| Coréen | "멈추지마", "끝까지 해", "완료될때까지", "때까지 계속", "끝장내" |
| Japonais | "止まるな", "完了まで", "最後まで", "全部終わらせて" |
| Chinois | "不要停", "直到完成", "全部完成", "做完为止" |
| Espagnol | "no pares", "hasta completar", "termina todo" |
| Français | "n'arrête pas", "jusqu'à complétion", "termine tout" |
| Allemand | "hör nicht auf", "bis zur fertigstellung", "alles fertigstellen" |

Les simples expressions de reprise (« keep going », « carry on », « 계속해 », « 続けて », « продолжай », …) ne sont pas des déclencheurs : les utilisateurs les saisissent pour reprendre après une interruption.

**Phases :**
1. **Phase 0, INIT :** charger les prérequis (chargement du contexte, protocole mémoire, protocole du juge). Définir et consigner des critères de fin vérifiables mécaniquement, comme des assertions de test, des contrôles de type qui n’émettent pas d’artefact, des codes de sortie ou l’existence de fichiers. Inclure des contrôles de build uniquement sur demande explicite. Initialiser la session avec `max_iterations: 5`.
2. **Phase 1, WORK :** exécuter ultrawork (PLAN → IMPL → VERIFY → REFINE → SHIP) comme une seule itération.
3. **Phase 2, JUDGE :** un vérificateur indépendant confronte chaque critère de fin à l’état réel du projet (exécuter les contrôles autorisés et vérifier l’existence des fichiers). Consigner les preuves et l’état PASS, FAIL, REGRESSED ou BLOCKED.
4. **Phase 3, DECIDE :** si tous les critères sont PASS, signaler la fin complète. S’il ne reste que PASS et BLOCKED, signaler la fin partielle. En présence de FAIL ou REGRESSED, transmettre le contexte d’échec à l’itération suivante, sous réserve des garde-fous.
5. **Garde-fous :** arrêter la boucle si `current_iteration >= max_iterations` (5 par défaut), ou si le même critère échoue 3 fois de suite avec la même cause profonde (détection de blocage).

**Différence principale avec /ultrawork :** Ultrawork exécute un processus en 5 phases avec des reprises lorsqu’une porte échoue. Ralph enveloppe ultrawork d’une boucle de reprise avec un juge indépendant qui vérifie objectivement la fin. La boucle s’achève par un rapport de fin complète, de fin partielle pour le travail bloqué ou de garde-fou.

**Fichiers lus :** `.agents/workflows/ralph/resources/judge-protocol.md`, tous les fichiers ultrawork.
**Fichiers écrits :** `session-ralph.md` (mémoire), journaux d’itération, rapport final.

**Quand l’utiliser :** lorsqu’une exécution répétée et une vérification indépendante des critères mécaniques sont explicitement souhaitées. Les tests seuls ne justifient pas Ralph : chaque itération doit inclure tout le processus ultrawork et ses garde-fous.

---

## Workflows non persistants

### /plan

**Description :** Découpage de tâches piloté par le PM. Analyse les exigences, sélectionne la stack technique, décompose en tâches priorisées avec dépendances et définit les contrats d’API.

**Mots-clés de déclenchement :**
| Langue | Mots-clés |
|---------|-----------|
| Universel | "task breakdown" |
| Anglais | "plan" |
| Coréen | "계획", "요구사항 분석", "스펙 분석" |
| Japonais | "計画", "要件分析", "タスク分解" |
| Chinois | "计划", "需求分析", "任务分解" |

**Étapes :** recueillir les exigences -> analyser la faisabilité technique (analyse du code MCP) -> évaluer la difficulté (Simple/Medium/Complex) -> définir les contrats d’API si la tâche traverse des frontières -> décomposer en tâches -> revoir avec l’utilisateur -> enregistrer les artefacts du plan (JSON lisible par machine + tracker Markdown lisible par humain pour Medium/Complex).

**Sortie :** `.agents/results/plan-{sessionId}.json`, écriture en mémoire et, pour Medium/Complex, `docs/plans/work/{NNN}-{name}.md` avec table des tâches, journal de décisions et notes de progression. Le cycle de vie est suivi par le champ `Status` de l’en-tête (`Active` -> `Completed`) ; les plans ne changent pas de dossier. Les designs créés par `/brainstorm` vont dans `docs/plans/designs/{NNN}-{name}.md`.

**Exécution :** inline (aucun lancement de sous-agent). `/orchestrate` et `/work` consomment ce workflow et mettent à jour les champs de tâche et de statut.

---

### /brainstorm

**Description :** Idéation centrée sur le design. Explore l’intention, clarifie les contraintes, propose des approches et produit un document de design approuvé avant la planification.

**Mots-clés de déclenchement :**
| Langue | Mots-clés |
|---------|-----------|
| Universel | "brainstorm" |
| Anglais | "ideate", "explore design" |
| Coréen | "브레인스토밍", "아이디어", "설계 탐색" |
| Japonais | "ブレインストーミング", "アイデア", "設計探索" |
| Chinois | "头脑风暴", "创意", "设计探索" |

**Étapes :** explorer le contexte du projet (analyse MCP) -> poser des questions de clarification (une à la fois) -> proposer 2 ou 3 approches avec compromis -> présenter le design section par section (confirmation de l’utilisateur à chaque étape) -> enregistrer le design dans `docs/plans/designs/{NNN}-{name}.md` -> transition : suggérer `/plan`.

**Règles :** aucune implémentation ni planification avant l’approbation du design. Aucun code produit. YAGNI.

---

### /architecture

**Description :** Workflow d’architecture logicielle qui diagnostique les problèmes, sélectionne la bonne méthode (routage diagnostique / design-twice / ATAM / CBAM / ADR), compare les options, synthétise l’avis des parties prenantes et produit une recommandation, une revue ou un ADR.

**Mots-clés de déclenchement :**
| Langue | Mots-clés |
|---------|-----------|
| Universel | "architecture", "ADR", "ATAM", "CBAM" |
| Anglais | "architecture review", "architectural tradeoff" |
| Coréen | "아키텍처", "설계 검토" |
| Japonais | "アーキテクチャ" |
| Chinois | "架构" |

**Étapes :** cadrer la décision (nouvelle architecture / revue / analyse de compromis / priorisation d’investissement / rédaction d’ADR) -> sélectionner la méthode par routage diagnostique -> analyser l’architecture actuelle avec l’analyse de code MCP (`get_symbols_overview`, `find_symbol`, `find_referencing_symbols`) -> synthétiser l’avis des parties prenantes lorsque le caractère transversal justifie le coût -> produire une recommandation avec hypothèses, compromis, risques et étapes de validation explicites -> transmettre à `/plan` lorsqu’une implémentation est nécessaire.

**Règles :** ne pas écrire de code d’implémentation ni de plan de tâches dans ce workflow. Passer à `/plan` après la décision d’architecture. Utiliser les outils MCP tout au long du workflow ; ne pas les remplacer par des lectures brutes ou grep.

**Quand l’utiliser :** choix d’architecture système, décisions de frontière module/service/propriété, priorisation de refactoring, rédaction d’ADR, investigation de problèmes architecturaux (amplification des changements, dépendances cachées, APIs maladroites).

---

### /deepinit

**Description :** Initialisation complète d’un projet. Analyse un code existant et génère AGENTS.md, ARCHITECTURE.md et une base de connaissances structurée `docs/`.

**Mots-clés de déclenchement :**
| Langue | Mots-clés |
|---------|-----------|
| Universel | "deepinit" |
| Coréen | "프로젝트 초기화" |
| Japonais | "プロジェクト初期化" |
| Chinois | "项目初始化" |

**Étapes :** préparation -> analyser le code (type de projet, architecture, règles implicites, domaines, frontières) -> générer ARCHITECTURE.md (carte des domaines, moins de 200 lignes) -> générer la base `docs/` (design-docs/, plans/, generated/, product-specs/, references/, documentation de domaine) -> générer AGENTS.md à la racine (~100 lignes, table des matières) -> générer les AGENTS.md de frontière (packages du monorepo, moins de 50 lignes chacun) -> mettre à jour le harness existant en cas de relance -> valider (aucun lien mort, limites de lignes).

**Sortie :** AGENTS.md, ARCHITECTURE.md, docs/design-docs/, docs/plans/, docs/PLANS.md, docs/QUALITY-SCORE.md, docs/CODE-REVIEW.md et les documents propres aux domaines découverts.

---

### /review

**Description :** Pipeline de revue QA complet : audit sécurité (OWASP Top 10), analyse de performance, contrôle d’accessibilité (WCAG 2.1 AA) et revue de qualité du code.

**Mots-clés de déclenchement :**
| Langue | Mots-clés |
|---------|-----------|
| Universel | "code review", "security audit", "security review" |
| Anglais | "review" |
| Coréen | "리뷰", "코드 검토", "보안 검토" |
| Japonais | "レビュー", "コードレビュー", "セキュリティ監査" |
| Chinois | "审查", "代码审查", "安全审计" |

**Étapes :** définir le périmètre -> contrôles de sécurité automatisés (npm audit, bandit) -> revue de sécurité manuelle (OWASP Top 10) -> analyse de performance -> revue d’accessibilité (WCAG 2.1 AA) -> revue de qualité du code -> produire le rapport QA.

**Boucle facultative correction-vérification** (avec `--fix`) : après le rapport QA, lancer des agents de domaine pour corriger les problèmes CRITICAL/HIGH, relancer la QA et répéter jusqu’à 3 fois.

**Délégation :** pour les grands périmètres, déléguer les étapes 2 à 7 à un sous-agent QA.

---

### /deepsec

**Description :** Piloter le skill `oma-deepsec` de bout en bout. Installer `.deepsec/`, calibrer le coût, exécuter les passes scan/process/triage/revalidate/export, contrôler les PR avec `process --diff`, écrire des matchers personnalisés et router les constats vers les agents spécialisés. S’exécute inline, sans lancement de sous-agent.

**Mots-clés de déclenchement :**
| Langue | Mots-clés |
|---------|-----------|
| Universel | "/deepsec", "deepsec workflow" |
| Anglais | "run deepsec", "deepsec scan this repo", "scan repo with deepsec", "deepsec pr review", "deepsec ci gate", "deepsec triage", "deepsec matchers" |
| Coréen | "딥섹 워크플로우", "딥섹 실행", "딥섹 스캔", "딥섹으로 검사", "딥섹 PR 리뷰", "딥섹 CI 게이트" |
| Japonais | "ディープセック実行", "deepsecワークフロー", "deepsecでスキャン", "deepsec PRレビュー" |
| Chinois | "运行 deepsec", "deepsec 工作流", "用 deepsec 扫描", "deepsec PR 审查" |

**Étapes :**
1. **Step 1, Charger le skill :** lire `.agents/skills/oma-deepsec/SKILL.md`, puis charger uniquement les ressources liées à l’intention (`setup.md`, `scanning.md`, `pr-review.md`, `matchers.md`, `triage.md`, `config.md`). Si `.deepsec/` existe déjà à la racine, traiter l’exécution comme incrémentale et ne jamais relancer `init`.
2. **Step 2, Classer l’intention :** choisir exactement `setup`, `scan`, `pr-review`, `matchers`, `triage`, `config` ou `troubleshoot`. Les prompts multi-intentions s’exécutent séquentiellement. Ajouter `setup` avant toute intention qui appelle l’IA si `.deepsec/` manque.
3. **Step 3, Confirmer le choix d’agent :** avant tout appel payant, confirmer `claude` (raisonnement le plus fort, plus cher) ou `codex` (sandbox en lecture seule, moins cher). Ignorer cette étape si l’utilisateur en a nommé un, si `deepsec.config.ts` fixe `defaultAgent` ou si l’utilisateur a délégué le choix.
4. **Step 4, Exécuter l’intention :**
   - **4A `setup` :** `bunx deepsec init`, `bun install`, éditer `.env.local`, vérifier avec `scan --limit 20` + `process --limit 5`, puis écrire `data/<id>/INFO.md` (50–100 lignes, propre au projet). **Confirmation utilisateur requise pour `INFO.md`.**
   - **4B `scan` :** scanner -> calibrer avec `--limit 50 --concurrency 5` -> présenter l’extrapolation du coût (accord explicite requis) -> `process` complet -> `triage --severity HIGH` + `revalidate --min-severity HIGH` -> `export --format md-dir` + `metrics`.
   - **4C `pr-review` :** mode direct `process --diff origin/${BASE_REF} --comment-out comment.md`. Émettre le pattern CI à deux jobs (`analyze` sans `pull-requests: write`, `comment` ne consomme que l’artefact nettoyé). Exit `1` = au moins un nouveau finding.
   - **4D `matchers` :** parcourir `data/<id>/files/` pour les lacunes de points d’entrée, écrire les matchers par slug dans `.deepsec/matchers/<slug>.ts` avec le bon niveau de bruit (`precise` / `normal` / `noisy`), les relier via `.deepsec/deepsec.config.ts`, puis vérifier avec `scan --matchers`.
   - **4E `triage` :** `triage --severity HIGH` -> `revalidate --min-severity HIGH` -> limiter l’export à `true-positive` / `uncertain`. Noter les motifs récurrents de faux positifs pour la prochaine révision de `INFO.md`.
   - **4F `config` / `troubleshoot` :** appliquer la table de symptômes de `resources/config.md`.
5. **Step 5, Résumer et router :** produire un résumé (identifiant de projet, type de passe, agent/modèle, fichiers scannés, findings, TP après revalidate, coût, durée, conditions d’arrêt). Router les suites selon la couche du fichier vulnérable (backend -> `oma-backend`, frontend -> `oma-frontend`, mobile -> `oma-mobile`, IaC -> `oma-tf-infra`, DB -> `oma-db`, CI -> `oma-dev-workflow`, dérive documentaire -> `oma-docs`, lacune de point d’entrée -> reprendre Step 4D). Couche ambiguë ou `revalidation.verdict === "uncertain"` -> passer d’abord par `oma-debug`.
6. **Step 6, Conditions d’arrêt :** terminer lorsque l’intention et le résumé de l’étape 5 sont terminés, lorsqu’une précondition bloque (identifiant manquant, `INFO.md` refusé) ou lorsqu’un quota impose l’arrêt ; dans ce dernier cas, fournir une commande de reprise sûre.

**Fichiers lus :** `.agents/skills/oma-deepsec/SKILL.md`, `.agents/skills/oma-deepsec/resources/*.md` selon l’intention, `data/<id>/INFO.md`, `data/<id>/files/`, `deepsec.config.ts`.
**Fichiers écrits :** `.deepsec/` (avec `setup`), `.env.local` (ignoré par Git), `data/<id>/INFO.md`, `.deepsec/matchers/<slug>.ts`, `findings/` (avec `export`), `comment.md` (avec `pr-review`).

**Règles :** ne pas modifier le code produit dans ce workflow (transmettre aux spécialistes). Ne pas afficher ni commiter les identifiants (`vck_…`, `sk-ant-…`, tokens OIDC). Ne donner `pull-requests: write` à aucun job CI qui exécute du code contrôlé par une PR. Reprendre plutôt que réinitialiser : après une interruption, relancer la même commande ; ne jamais `rm -rf data/<id>/` sans instruction explicite.

**Quand l’utiliser :** scan de vulnérabilités piloté par agent, garde de sécurité CI/PR via `process --diff`, création de matchers propres au projet et triage de findings existants pour réduire les faux positifs.

---

### /debug

**Description :** Diagnostic et correction structurés des bugs, avec écriture d’un test de régression et recherche de motifs similaires.

**Mots-clés de déclenchement :**
| Langue | Mots-clés |
|---------|-----------|
| Universel | "debug" |
| Anglais | "fix bug", "fix error", "fix crash" |
| Coréen | "디버그", "버그 수정", "에러 수정", "버그 찾아", "버그 고쳐" |
| Japonais | "デバッグ", "バグ修正", "エラー修正" |
| Chinois | "调试", "修复 bug", "修复错误" |

**Étapes :** recueillir les informations d’erreur -> reproduire (MCP `search_for_pattern`, `find_symbol`) -> diagnostiquer la cause profonde (MCP `find_referencing_symbols` pour suivre le chemin d’exécution) -> proposer la correction minimale (confirmation utilisateur requise) -> appliquer la correction et écrire le test de régression -> rechercher les motifs similaires (peut lancer un sous-agent debug-investigator au-delà de 10 fichiers) -> documenter le bug en mémoire.

**Critères de lancement d’un sous-agent :** erreur qui traverse plusieurs domaines, périmètre de plus de 10 fichiers ou traçage de dépendances approfondi.

---

### /design

**Description :** Workflow de design en 7 phases qui produit DESIGN.md avec tokens, motifs de composants et règles d’accessibilité.

**Mots-clés de déclenchement :**
| Langue | Mots-clés |
|---------|-----------|
| Universel | "design system", "DESIGN.md", "design token" |
| Anglais | "design", "landing page", "ui design", "color palette", "typography", "dark theme", "responsive design", "glassmorphism" |
| Coréen | "디자인", "랜딩페이지", "디자인 시스템", "UI 디자인" |
| Japonais | "デザイン", "ランディングページ", "デザインシステム" |
| Chinois | "设计", "着陆页", "设计系统" |

**Phases :** SETUP (collecte de contexte, `.design-context.md`) -> EXTRACT (optionnel, depuis URL/Stitch) -> ENHANCE (enrichissement d’un prompt vague) -> PROPOSE (2 ou 3 directions avec couleur, typographie, mise en page, animation et composants) -> GENERATE (DESIGN.md + tokens CSS/Tailwind/shadcn) -> AUDIT (responsive, WCAG 2.2, heuristiques Nielsen, contrôle AI slop) -> HANDOFF (enregistrer et informer l’utilisateur).

**Obligation :** toutes les sorties sont responsive-first (mobile 320–639 px, tablette 768 px et plus, desktop 1024 px et plus).

---

### /scm

**Description :** Génère des Conventional Commits avec découpage automatique par fonctionnalité.

**Mots-clés de déclenchement :** aucun (exclu de la détection automatique).

**Étapes :** analyser les changements (git status, git diff) -> séparer les fonctionnalités si plus de 5 fichiers couvrent des périmètres/types différents -> déterminer le type (feat/fix/refactor/docs/test/chore/style/perf) -> déterminer le scope (module modifié) -> rédiger la description (impératif, < 72 caractères) -> exécuter immédiatement le commit (sans confirmation).

**Règles :** ne jamais `git add -A`. Ne jamais commiter de secrets. Utiliser un HEREDOC pour les messages multilignes. Ajouter une signature de co-auteur uniquement lorsque la configuration effective `scm.co_author` l’active et fournit les deux valeurs.

---

### /tools

**Description :** Gérer la visibilité et les restrictions des outils MCP.

**Mots-clés de déclenchement :** aucun (exclu de la détection automatique).

**Fonctionnalités :** afficher l’état courant des outils MCP, activer/désactiver des groupes (memory, code-analysis, code-edit, file-ops), appliquer des changements permanents ou temporaires (`--temp`) et interpréter le langage naturel (« memory tools only », « disable code edit »).

**Groupes d’outils :**
- memory: read_memory, write_memory, edit_memory, list_memories, delete_memory
- code-analysis: get_symbols_overview, find_symbol, find_referencing_symbols, search_for_pattern
- code-edit: replace_symbol_body, insert_after_symbol, insert_before_symbol, rename_symbol
- file-ops: list_dir, find_file

---

### /convert

**Description :** Convertir un fichier d’un format à un autre, avec routage par catégorie de média. Les **documents** (PDF via `opendataloader-pdf`/`oma-pdf`, HWP/HWPX/HWPML via `kordoc`/`oma-hwp`) sont extraits en Markdown. Les fichiers **image**, **vidéo** et **audio** sont transcodés vers le format cible via `ffmpeg` (déjà fourni pour `oma-video`).

**Mots-clés de déclenchement :** aucun (invoqué explicitement avec un chemin d’entrée).

**Étapes :** valider l’entrée et router par catégorie (document `.pdf`/`.hwp*` ; image `.jpg`/`.png`/`.webp`/… ; vidéo `.mp4`/`.mov`/… ; audio `.mp3`/`.wav`/…) -> résoudre le format cible (document par défaut = Markdown ; média = `--to` explicite) -> convertir (PDF : `uvx opendataloader-pdf`, PDF scanné en OCR hybride ; HWP : `bunx kordoc@latest` ; média : `ffmpeg`) -> normaliser les documents (PDF : `uvx mdformat` ; HWP : `flatten-tables.ts`) -> vérifier (lire le Markdown / `ffprobe` pour le média) -> signaler le format source→cible et les choix de qualité/codec.

**Règles :** router par catégorie : ne jamais exécuter un convertisseur de documents sur un média, ni l’inverse. Le dossier de sortie par défaut est celui du fichier d’entrée. Signaler les choix de qualité/codec pour les médias (le transcodage n’est pas sans perte). Ne sauter aucune étape. La langue de réponse suit `.agents/oma-config.yaml`.

**Quand l’utiliser :** convertir des documents PDF ou HWP coréens en Markdown pour l’ingestion LLM/RAG, ou transcoder des images (jpg→webp/png), vidéos (mov→mp4, mp4→gif) et audios (wav→mp3).

---

### /docs

**Description :** Détecter la dérive documentaire et proposer une synchronisation via `oma-docs`. Le mode verify trouve les références cassées dans tout le Markdown du dépôt (glob par défaut `**/*.md`) ; le mode sync propose des patches par document pour ceux qu’un diff Git affecte. Le workflow s’exécute inline, sans sous-agent ; tous les fournisseurs invoquent directement `oma docs`.

**Mots-clés de déclenchement :** Universel : "oma-docs", "docs verify", "docs sync". Anglais : "verify docs", "check docs", "docs drift", "broken doc links", "stale docs", "sync docs", "patch docs". Coréen : "문서 검증", "문서 드리프트", "문서 동기화". Japonais : "ドキュメント検証", "ドキュメント同期". Chinois : "文档校验", "文档同步".

**Étapes :** détecter le mode (`verify` par défaut ; `sync` si le prompt mentionne sync ou fournit une plage de diff Git) -> prévol (`command -v oma` ; pour sync, confirmer un diff utilisable et revenir à `HEAD~1..HEAD` si nécessaire) -> Verify : `oma docs verify --json` (exit `0` sans référence cassée, `1` avec références cassées) ou Sync : `oma docs sync --json` sur la plage -> synthétiser selon le contrat hôte-LLM (verify : grouper par CRITICAL/HIGH/MEDIUM/LOW avec corrections concrètes ; sync : rédiger des patches unified diff minimaux) -> présenter chaque patch sync interactivement (`[y] apply [n] skip [d] show diff [s] show full proposal`, sans application automatique) -> après application, régénérer l’index via `oma docs verify --json` -> signaler le mode, les compteurs par type et les pointeurs vers `docs/generated/doc-refs.json` / `url-drift.json`.

**Règles :** ne jamais appliquer automatiquement les patches sync (confirmation `[y]` requise pour chaque document). Ne jamais modifier `.agents/` (SSOT). Si `oma docs` manque, afficher une indication d’installation et quitter ; ne pas revenir à des grep manuels.

**Fichiers lus :** Markdown cible (`**/*.md` ou glob demandé), `git diff` pour les `changedFiles` du mode sync.
**Fichiers écrits :** `docs/generated/doc-refs.json` (régénéré par verify), `docs/generated/url-drift.json` (si le contrôle URL s’exécute), patches approuvés (après `[y]`).

**Quand l’utiliser :** vérifier que la documentation correspond au code (chemins, commandes CLI, clés de configuration, variables d’environnement) ou proposer des patches après un changement de code.

---

### /recap

**Description :** Récapituler le travail quotidien ou périodique via `oma-recap`. Le workflow résout une date ou une fenêtre en langage naturel, invoque `oma recap --json` sur les historiques de plusieurs outils IA (Grok, Claude, Codex, Qwen, Cursor, Antigravity), délègue l’analyse des thèmes et le formatage Markdown au skill, puis fournit un TL;DR et le chemin enregistré. Il s’exécute inline, sans sous-agent ; tous les fournisseurs invoquent directement `oma recap`.

**Mots-clés de déclenchement :** Universel : "recap". Coréen : "리캡". Japonais : "リキャップ".

**Étapes :** détecter le mode et résoudre la fenêtre (`daily` par défaut avec aujourd’hui ; `period` lorsque des expressions comme « this week » / « 지난 7일 » donnent `--window Nd`) -> extraire un filtre `--tool` uniquement si l’utilisateur nomme explicitement des outils (`grok, claude, codex, qwen, cursor, antigravity`) -> prévol (`command -v oma`) -> exécuter `oma recap --json` (daily : `--date YYYY-MM-DD` ou omis ; period : `--window 7d` / `30d`) -> synthétiser et enregistrer selon le contrat du skill (seuil de thème de 15 minutes, modèle quotidien ou multi-jours) -> fournir un TL;DR en 3 points et le chemin de sauvegarde.

**Règles :** ne jamais modifier `.agents/` (SSOT). Ne jamais traduire automatiquement les termes techniques (noms de projet, noms d’outils, flags CLI) dans le récapitulatif enregistré. Ne pas fabriquer de récapitulatif si aucune source n’est disponible.

**Fichiers lus :** historiques de conversations des outils IA (via `oma recap`).
**Fichiers écrits :** `.agents/results/recap/{date}.md` ou `.agents/results/recap/{start}~{end}.md`.

**Quand l’utiliser :** résumer ce qui a été fait avec les outils IA sur une journée ou une période (semaine/mois), éventuellement filtré par outil.

---

### /stack-set

**Description :** Détecter automatiquement la stack du projet et générer les références propres au langage pour le skill de domaine résolu (backend ou mobile). Détecte les stacks mobiles (Swift/iOS via `Package.swift`/`.xcodeproj`, Flutter via `pubspec.yaml`, React Native via `package.json` + react-native) et route sinon vers `oma-backend`. Dans un monorepo qui contient les deux, le workflow demande laquelle configurer.

**Mots-clés de déclenchement :** aucun (exclu de la détection automatique).

<!-- oma-docs:ignore-start -->
**Étapes :** détecter (scanner les manifestes : pyproject.toml, package.json, Cargo.toml, pom.xml, go.mod, mix.exs, Gemfile, *.csproj, Package.swift, *.xcodeproj, pubspec.yaml) -> confirmer (afficher la stack détectée et obtenir confirmation) -> générer (`stack/stack.yaml`, `stack/tech-stack.md`, `stack/snippets.md` avec 8 motifs obligatoires, `stack/api-template.*`) -> vérifier.
<!-- oma-docs:ignore-end -->

**Sortie :** fichiers dans le répertoire `stack/` du skill de domaine résolu (par exemple `.agents/skills/oma-backend/stack/` ou `.agents/skills/oma-mobile/stack/`). Ne modifie ni SKILL.md ni `resources/`.

---

### /video

**Description :** Piloter le skill `oma-video` de bout en bout : brief → script → narration → visuels → sous-titres → render-spec → compositeur HyperFrames géré (ou MoneyPrinterTurbo). Le workflow crée un répertoire de run reproductible et n’émet un vrai `.mp4` qu’après réussite du compositeur et des contrôles ffprobe. La configuration des fournisseurs est optionnelle pour les fallbacks d’assets pris en charge ; une panne du compositeur ou de la toolchain reste un échec. Le workflow s’exécute inline, sans sous-agent.

**Mots-clés de déclenchement :**
| Langue | Mots-clés |
|----------|----------|
| Universel | "/video", "oma-video", "hyperframes", "shorts", "reels", "screencast" |
| Anglais | "generate video", "create a video", "make a video", "short-form video", "explainer video", "demo video", "walkthrough video", "video from readme", "video from code" |
| Coréen | "영상 만들어", "영상 생성", "비디오 만들어", "숏폼 만들어", "쇼츠 영상", "릴스 영상", "데모 영상", "설명 영상" |
| Japonais | "動画を生成", "動画を作成", "ショート動画", "解説動画", "デモ動画" |
| Chinois | "生成视频", "制作视频", "短视频", "讲解视频", "演示视频" |

**Étapes :**
1. **Résoudre le brief et le mode :** choisir `shorts` (9:16), `explainer` (16:9) ou `demo` (capture d’écran/web) ; appliquer les valeurs du mode, surchargeables par les flags.
2. **Composer le script :** générer les scènes et la narration (LLM si une clé existe, sinon plan déterministe tiré du brief).
3. **Synthétiser les assets :** narration via `oma-voice`, visuels via `oma-image`/`oma-slide`/stock, alignement des sous-titres sans clé, ou capture web dans un navigateur supervisé pour `demo --source web`. Chaque fournisseur se rabat sur un fallback déterministe.
4. **Construire le render-spec :** écrire `render-spec.json` (frontière de déterminisme) et les assets dans le répertoire du run.
5. **Rendre :** lancer le projet HyperFrames géré (ou MoneyPrinterTurbo) comme sous-processus. Une panne normale du compositeur ou de la toolchain échoue le run ; le placeholder déterministe n’est disponible que par le chemin explicite de test/mock (`OMA_VIDEO_MOCK=1`). La capture live est marquée `nondeterministic` dans le manifeste.

**Sortie :** répertoire de run `.agents/results/videos/{timestamp}-{shortid}-{mode}/` avec `script.json`, `render-spec.json`, `timing.json`, `captions.{srt,vtt}`, `audio/`, `visuals/`, `{composition}.mp4` et `manifest.json`. Voir le [guide de génération vidéo](../guide/video-generation.md).

---

### /schedule

**Description :** Enregistrer et gérer des jobs d’agents planifiés avec les commandes `oma schedule <action>`. Les jobs résident dans un registre global (`~/.agents/schedule/`) et utilisent le planificateur natif du système (launchd sur macOS, timers systemd utilisateur sur Linux, schtasks sur Windows, crontab comme fallback POSIX). Chaque exécution réintègre le harness via `oma agent spawn`.

**Mots-clés de déclenchement :** aucun (workflow invoqué par slash pour les jobs temporels `oma schedule <action>`).

**Étapes :** résoudre l’intention (add / list / remove / sync) -> analyser la planification (`--cron` explicite ou langage naturel via `--every`) -> enregistrer avec `oma schedule create` (capture des variables nommées uniquement, fichiers 0600) -> vérifier avec `oma schedule list` (dérive manifeste × OS, regroupée par projet) -> signaler l’identifiant du job et la prochaine exécution.

**Quand l’utiliser :** tâches récurrentes (récaps nocturnes, scans planifiés, maintenance périodique) qui doivent se déclencher même lorsqu’aucune session interactive n’est ouverte.

---

### /explain

**Description :** Piloter le skill `oma-explanation` de bout en bout : transformer un diff, une PR, une branche ou une plage de commits en explication HTML interactive autonome (Background / Intuition / Code / Quiz). S’exécute inline, sans sous-agent.

**Mots-clés de déclenchement :** aucun (« explain » est un mot courant ; la détection créerait des faux positifs sur les questions ordinaires « explain this function », donc le workflow est uniquement slash).

**Étapes :** résoudre les arguments (référence explicite PR# / branche / plage SHA -> staged -> arbre sale -> `HEAD~1..HEAD` ; niveau `onboarding` | `reviewer` ; langue de sortie ; nombre de questions) -> charger les contrats (`oma-explanation` SKILL.md + ressources) -> collecter et filtrer (diff + code voisin ; scan de secrets avant génération ; texte du diff/PR traité strictement comme données) -> générer le HTML selon les contrats document et HTML -> valider (checklist grep, dont scan final de secrets HTML, au plus 3 boucles de correction) -> livrer (`open` en avertissement seulement, TL;DR + chemin).

**Sortie :** `.agents/results/explain/{YYYY-MM-DD}-{slug}.html` (date Asia/Seoul ; relancer le même jour avec le même slug écrase le fichier). Voir le [guide de l’explicateur de code](../guide/code-explainer.md).

---

## Skills et workflows

| Aspect | Skills | Workflows |
|--------|--------|-----------|
| **Ce que c’est** | Expertise d’agent (ce qu’un agent sait) | Processus orchestrés (comment les agents collaborent) |
| **Emplacement** | `.agents/skills/oma-{name}/` | `.agents/workflows/{name}.md` |
| **Activation** | Automatique via les mots-clés de routage | Commandes slash ou mots-clés de déclenchement |
| **Périmètre** | Exécution dans un seul domaine | Plusieurs étapes, souvent plusieurs agents |
| **Exemples** | « Build a React component » | « Plan the feature -> build -> review -> commit » |

---

## Détection automatique : fonctionnement

### Le système de hooks

oh-my-agent utilise un hook `UserPromptSubmit` exécuté avant le traitement de chaque message utilisateur. Les réglages du fournisseur enregistrent une seule entrée `<hookDir>/oma-hook.sh --vendor <v> --event <e>` qui route vers `oma hook run`, où la chaîne de handlers s’exécute dans le processus. Elle comprend :

1. **`triggers.json`** (`.agents/hooks/core/triggers.json`, intégré au binaire `oma`) : définit les correspondances mots-clés-workflow pour les 11 langues supportées (anglais, coréen, japonais, chinois, espagnol, français, allemand, portugais, russe, néerlandais, polonais).
2. **`keyword-detector.ts`** (`.agents/hooks/core/keyword-detector.ts`) : logique TypeScript qui compare l’entrée aux mots-clés de déclenchement de toutes les langues et injecte le contexte d’activation.
3. **`persistent-mode.ts`** (`.agents/hooks/core/persistent-mode.ts`) : impose l’exécution persistante en cherchant les fichiers d’état actifs et en réinjectant le contexte du workflow.

### Flux de détection

1. L’utilisateur saisit une entrée en langage naturel.
2. Le hook vérifie la présence d’une commande explicite `/command` (si elle existe, il ignore la détection pour éviter les doublons).
3. Le hook assainit l’entrée (retire les blocs de code, chaînes entre guillemets et blocs d’écho système collés), puis la compare à `.agents/hooks/core/triggers.json`, qui contient les listes `keywords` (phrases littérales) et les `patterns` (regex brutes). Un garde-fou de renforcement supprime les nouveaux déclenchements si le même workflow s’est déclenché au moins 2 fois dans les 60 dernières secondes.
4. Lorsqu’il y a correspondance, vérifier si l’entrée correspond à un motif informatif.
5. Si l’entrée est informative (par exemple « what is orchestrate? »), la filtrer : aucun workflow ne se déclenche.
6. Si elle est actionnable, injecter `[OMA WORKFLOW: {workflow-name}]` dans le contexte. Lorsque plusieurs workflows correspondent, une invocation explicite l’emporte, puis le mot-clé le plus long.
7. Pour un workflow persistant, seule une invocation explicite (`explicit` dans `triggers.json`) écrit le fichier d’état du mode persistant ; une correspondance en langage naturel est injectée comme suggestion, et un prompt terminé par une question (`?` sur la première ou la dernière ligne) ne le déclenche pas du tout.
8. L’agent lit la balise injectée et charge le fichier correspondant dans `.agents/workflows/`.

### Convention des sections de langue

`.agents/hooks/core/triggers.json` utilise une structure par langue pour `keywords`, `patterns` et `informationalPatterns` :

| Section | Comportement |
|---------|--------------|
| `*` | Universel. S’utilise pour l’anglais (lingua franca) et les tokens réellement translingues (par exemple le nom de workflow `"orchestrate"`). |
| `en` | Anglais. Fonctionnellement équivalent à `*`. |
| `ko`, `ja`, `zh`, `es`, `fr`, `de`, `pt`, `ru`, `nl`, `pl` | Formulations propres à la langue. |

Toutes les sections sont toujours chargées : les utilisateurs écrivent leurs prompts dans la langue dans laquelle ils pensent, et le réglage `language` de `.agents/oma-config.yaml` ne contrôle que la langue des réponses. Un mot-clé écrit dans une langue ne peut correspondre qu’à un prompt contenant ce système d’écriture, si bien que la fusion de toutes les sections ne peut pas se déclencher sur des prompts sans rapport.

Les limites de mots dépendent uniquement du mot-clé lui-même, jamais de `language` : les mots-clés ASCII ne correspondent qu’à des mots entiers (« work » ne correspond donc pas à « network », ni « review » à « preview »), tandis que les mots-clés contenant du texte non ASCII correspondent comme sous-chaînes, parce que les particules et les flexions CJK se collent directement au mot (« 리뷰해줘 »).

### Champ Pattern (regex brute) {#pattern-field-raw-regex}

En plus des `keywords` littéraux, chaque workflow peut déclarer des `patterns`, chaînes regex brutes compilées avec les flags `iu`. Ces motifs permettent de faire correspondre une intention à plusieurs tokens sans créer des listes de mots-clés combinatoires.

```jsonc
{
  "workflows": {
    "orchestrate": {
      "persistent": true,
      // Subset of `keywords` that activates persistent mode (persistent workflows only)
      "explicit": ["orchestrate", ...],
      "keywords": { "*": ["orchestrate"], "en": ["do everything", ...] },
      "patterns": {
        "*": ["\\b(build|create|make)\\s+(?:me\\s+)?(?:an?)\\s+...\\b"],
        "ko": ["(앱|API|...)\\s*(?:을|를)?\\s*(?:만들어\\s*(?:주세요|줘)?|...)"]
      }
    }
  }
}
```

Règles de rédaction :
- Les chaînes sont compilées directement ; échapper les antislashs une fois pour JSON et une fois pour la regex (`\\b`, `\\s+`).
- Aucune frontière de mot n’est ajoutée automatiquement ; les auteurs des motifs gèrent eux-mêmes `\b`.
- Une regex invalide est ignorée silencieusement à l’exécution (elle reste visible à l’édition via les échecs de tests).

### Filtrage des motifs informatifs

La section `informationalPatterns` de `.agents/hooks/core/triggers.json` définit les phrases qui indiquent une question plutôt qu’une commande. Le hook les vérifie dans une fenêtre de 60 caractères autour de chaque correspondance potentielle :

| Section | Exemples de motifs |
|---------|--------------------|
| `*` (anglais universel) | "what is", "what are", "how to", "how does", "how do", "should we", "should i", "could we", "would you", "what if", "what about", "why build", "false positive", "trigger when", "auto-trigger" |
| `ko` | "뭐야", "무엇", "어떻게", "설명해", "알려줘", "트리거", "발동", "메타", "왜 만들", "어떻게 만들", "어떨까", "한다면", "할까요" |
| `ja` | "とは", "って何", "どうやって", "説明して" |
| `zh` | "是什么", "什么是", "怎么", "解释" |

Si l’entrée correspond à la fois à un déclencheur de workflow et à un motif informatif, le motif informatif est prioritaire et aucun workflow ne se déclenche. C’est ce qui bloque par exemple :
- `"How do you build a TODO app?"` : `how do` dans `*` bloque la regex d’intention orchestrate ;
- `"orchestrate 트리거 해주면 되나요?"` (avec `language: ko`) : `트리거` dans `ko` bloque le mot-clé orchestrate.

### Workflows exclus

Les workflows suivants ne sont pas déclenchés par mots-clés et doivent être invoqués avec une commande `/command` explicite. `/tools` et `/stack-set` figurent dans `excludedWorkflows` (retirés volontairement de la détection), `/convert` ne fournit simplement aucun mot-clé (les skills `oma-pdf` et `oma-hwp` portent leur propre détection), `/schedule` est invoqué par slash (`oma schedule <action>`), et `/explain` ne fournit aucun mot-clé puisque « explain » est courant et provoquerait des faux positifs :
- `/tools`
- `/stack-set`
- `/convert`
- `/schedule`
- `/explain`

---

## Mécanique du mode persistant {#persistent-mode-mechanics}

### Fichiers d’état

Les workflows persistants (orchestrate, ultrawork, work, ralph) créent des fichiers d’état dans `.agents/state/` lorsqu’ils sont invoqués explicitement (voir [Workflows persistants](#persistent-workflows)) :

```
.agents/state/
├── orchestrate-state.json
├── ultrawork-state.json
├── work-state.json
└── ralph-state.json
```

Ces fichiers contiennent le nom du workflow, la phase/étape courante, l’identifiant de session, l’horodatage et l’état en attente.

### Renforcement

Pendant l’activation d’un workflow persistant, le hook `persistent-mode.ts` injecte `[OMA PERSISTENT MODE: {workflow-name}]` dans chaque message utilisateur. Le workflow continue ainsi d’un tour de conversation à l’autre.

### Contrat d’objectif (porte d’arrêt et budget optionnels)

`oma goal set` attache un contrat de fin mécanique à un workflow persistant actif :

- `--gate typecheck|test|lint` : le hook Stop autorise la fin de session **uniquement si le script package.json correspondant passe** (exécuté comme tableau argv, sans shell ; les commandes libres sont rejetées). En cas d’échec, il bloque avec la fin de la sortie ; échecs et timeouts comptent vers la limite de renforcement afin qu’une porte rouge ne puisse pas bloquer indéfiniment.
- `--budget-minutes <n>` : budget d’horloge depuis l’activation. Au dépassement, le workflow est désactivé et un arrêt partiel honnête est autorisé, consigné dans la trace d’événements de session.

Sans contrat, le mode persistant se comporte comme décrit ci-dessus ; le contrat est opt-in. Voir `goal set` dans la [référence des commandes CLI](../cli-interfaces/commands.md#goal-set).

### Désactivation

Pour désactiver un workflow persistant, dire « workflow done » (ou l’équivalent dans la langue configurée). Cela :
1. supprime le fichier d’état dans `.agents/state/` ;
2. arrête l’injection du contexte de mode persistant ;
3. revient au fonctionnement normal.

Le workflow peut aussi se terminer naturellement lorsque toutes les étapes sont achevées et que la dernière porte passe. Lorsqu’une porte `goal set` est configurée, sa réussite désactive automatiquement le workflow.

---

## Séquences de workflows typiques

### Fonctionnalité dans un seul domaine
```
Describe the task → relevant skill → implement → focused verification
```

### Projet complexe multi-domaines
```
/work → PM plans → review within authorized scope → agents spawn → QA reviews → fix issues → report
```

### Implémentation parallèle automatisée
```
/orchestrate → load or create plan → resolve dependencies → spawn independent tasks → verify → report
```

### Livraison de qualité maximale
```
/ultrawork → PLAN (4 review steps) → IMPL → VERIFY (3 review steps) → REFINE (5 review steps) → SHIP (4 review steps)
```

### Investigation de bug
```
/debug → reproduce → root cause → minimal fix → regression test → similar pattern scan
```

### Pipeline du design à l’implémentation
```
/brainstorm → design document → /plan → task breakdown → /orchestrate → parallel implementation → /review → /scm
```

### Mise en place d’un nouveau code source
```
/deepinit → AGENTS.md + ARCHITECTURE.md + docs/
```

### Exécution répétée avec vérification indépendante
```
/ralph → define criteria → ultrawork → judge → repeat as needed → completion, partial completion, or safeguard report
```
