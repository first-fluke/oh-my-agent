---
title: Workflows
description: Volledige referentie voor alle 14 oh-my-agent workflows — slash-commando's, persistente vs niet-persistente modi, triggertrefwoorden in 11 talen, fasen en stappen, gelezen en geschreven bestanden, auto-detectiemechanismen via triggers.json en keyword-detector.ts, informatiepatroonfiltering en persistent mode-statusbeheer.
---

# Workflows

Workflows zijn gestructureerde meerstapsprocessen die worden getriggerd door slash-commando's of natuurlijke taaltrefwoorden. Ze definieren hoe agenten samenwerken aan taken — van enkelfasige hulpmiddelen tot complexe 5-fasen kwaliteitspoorten.

Er zijn 14 workflows, waarvan 3 persistent zijn (ze behouden status en kunnen niet per ongeluk worden onderbroken).

---

## Persistente Workflows

Persistente workflows blijven draaien totdat alle taken klaar zijn. Ze behouden status in `.agents/state/` en herinjecteren `[OMA PERSISTENT MODE: ...]`-context bij elk gebruikersbericht totdat ze expliciet worden gedeactiveerd.

### /orchestrate

**Beschrijving:** Geautomatiseerde CLI-gebaseerde parallelle agentuitvoering. Spawnt subagenten via CLI, coordineert door MCP-geheugen, bewaakt voortgang en draait verificatielussen.

**Persistent:** Ja. Statusbestand: `.agents/state/orchestrate-state.json`.

**Triggertrefwoorden:**
| Taal | Trefwoorden |
|------|-------------|
| Universeel | "orchestrate" |
| Engels | "parallel", "do everything", "run everything" |
| Koreaans | "자동 실행", "병렬 실행", "전부 실행", "전부 해" |
| Japans | "オーケストレート", "並列実行", "自動実行" |
| Chinees | "编排", "并行执行", "自动执行" |
| Spaans | "orquestar", "paralelo", "ejecutar todo" |
| Frans | "orchestrer", "parallèle", "tout exécuter" |
| Duits | "orchestrieren", "parallel", "alles ausführen" |
| Portugees | "orquestrar", "paralelo", "executar tudo" |
| Russisch | "оркестровать", "параллельно", "выполнить всё" |
| Nederlands | "orkestreren", "parallel", "alles uitvoeren" |
| Pools | "orkiestrować", "równolegle", "wykonaj wszystko" |

**Stappen:**
1. **Stap 0 — Voorbereiding:** Lees coordinatieskill, contextladingsgids, geheugenprotocol. Detecteer leverancier.
2. **Stap 1 — Plan Laden/Aanmaken:** Controleer op `.agents/plan.json`. Indien afwezig, vraag gebruiker eerst `/plan` uit te voeren.
3. **Stap 2 — Sessie Initialiseren:** Laad `user-preferences.yaml`, toon CLI-mappingtabel, genereer sessie-ID (`session-JJJJMMDD-UUMMSS`), maak `orchestrator-session.md` en `task-board.md` aan in geheugen.
4. **Stap 3 — Agenten Spawnen:** Voor elke prioriteitstier (P0 eerst, dan P1...), spawn agenten met leverancier-geschikte methode. Overschrijd nooit MAX_PARALLEL.
5. **Stap 4 — Monitoren:** Poll `progress-{agent}.md`-bestanden, werk `task-board.md` bij. Let op voltooiingen, fouten, crashes.
6. **Stap 5 — Verifieren:** Draai `verify.sh {agent-type} {workspace}` per voltooide agent. Bij falen, herspawn met foutcontext (max 2 herhaalpogingen). Na 2 herhaalpogingen, activeer Exploratieslus.
7. **Stap 6 — Verzamelen:** Lees alle `result-{agent}.md`-bestanden, compileer samenvatting.
8. **Stap 7 — Eindrapport:** Presenteer sessiesamenvatting. Indien Quality Score gemeten, voeg Experiment Ledger-samenvatting toe.

**Gelezen bestanden:** `.agents/plan.json`, `.agents/config/user-preferences.yaml`, `progress-{agent}.md`, `result-{agent}.md`.
**Geschreven bestanden:** `orchestrator-session.md`, `task-board.md` (geheugen), eindrapport.

**Wanneer gebruiken:** Grote projecten die maximale parallelisme vereisen met geautomatiseerde coordinatie.

---

### /coordinate

**Beschrijving:** Stap-voor-stap multi-domeincoordinatie. PM plant eerst, dan voeren agenten uit met gebruikersbevestiging bij elke poort, gevolgd door QA-review en probleemoplossing.

**Persistent:** Ja. Statusbestand: `.agents/state/coordinate-state.json`.

**Triggertrefwoorden:**
| Taal | Trefwoorden |
|------|-------------|
| Universeel | "coordinate", "step by step" |
| Koreaans | "코디네이트", "단계별" |
| Japans | "コーディネート", "ステップバイステップ" |
| Chinees | "协调", "逐步" |
| Spaans | "coordinar", "paso a paso" |
| Frans | "coordonner", "étape par étape" |
| Duits | "koordinieren", "schritt für schritt" |

**Stappen:**
1. **Stap 0 — Voorbereiding:** Lees skills, context-loading, geheugenprotocol.
2. **Stap 1 — Requirements Analyseren:** Identificeer betrokken domeinen.
3. **Stap 2 — PM Agent Planning:** PM ontleedt requirements, definieert API-contracten, slaat op in `.agents/plan.json`.
4. **Stap 3 — Plan Reviewen:** Presenteer plan aan gebruiker. **Moet bevestiging krijgen.**
5. **Stap 4 — Agenten Spawnen:** Spawn per prioriteitstier, parallel binnen dezelfde tier.
6. **Stap 5 — Monitoren:** Poll voortgangsbestanden, verifieer API-contractuitlijning.
7. **Stap 6 — QA Review:** Spawn QA-agent voor beveiliging, prestaties, toegankelijkheid, codekwaliteit.
8. **Stap 6.1 — Quality Score** (conditioneel): Meet en registreer basislijn.
9. **Stap 7 — Itereren:** Bij CRITICAL/HIGH-bevindingen, herspawn verantwoordelijke agenten.

**Wanneer gebruiken:** Functies die meerdere domeinen beslaan waar je stap-voor-stap controle wilt.

---

### /ultrawork

**Beschrijving:** De kwaliteitsobsessieve workflow. 5 fasen, 17 totale stappen, waarvan 11 reviewstappen. Elke fase heeft een poort die moet slagen.

**Persistent:** Ja. Statusbestand: `.agents/state/ultrawork-state.json`.

**Triggertrefwoorden:**
| Taal | Trefwoorden |
|------|-------------|
| Universeel | "ultrawork", "ulw" |

**Fasen en stappen:**

| Fase | Stappen | Agent | Reviewperspectief |
|------|---------|-------|-------------------|
| **PLAN** | 1-4 | PM Agent (inline) | Volledigheid, Meta-review, Over-engineering/Eenvoud |
| **IMPL** | 5 | Dev Agenten (gespawnd) | Implementatie |
| **VERIFY** | 6-8 | QA Agent (gespawnd) | Uitlijning, Veiligheid (OWASP), Regressiepreventie |
| **REFINE** | 9-13 | Debug Agent (gespawnd) | Bestandssplitsing, Herbruikbaarheid, Cascade-impact, Consistentie, Dode Code |
| **SHIP** | 14-17 | QA Agent (gespawnd) | Codekwaliteit (lint/dekking), UX-stroom, Gerelateerde Problemen, Deploymentgereedheid |

**Poortdefinities:**
- **PLAN_GATE:** Plan gedocumenteerd, aannames opgesomd, alternatieven overwogen, gebruikersbevestiging.
- **IMPL_GATE:** Build slaagt, tests slagen, alleen geplande bestanden gewijzigd.
- **VERIFY_GATE:** Implementatie matcht requirements, nul CRITICAL, nul HIGH, geen regressies, Quality Score >= 75.
- **REFINE_GATE:** Geen grote bestanden/functies (> 500 regels / > 50 regels), code opgeschoond, Quality Score niet gedaald.
- **SHIP_GATE:** Kwaliteitscontroles geslaagd, UX geverifieerd, deployment-checklist compleet, gebruikers eindgoedkeuring.

**Wanneer gebruiken:** Maximale kwaliteitslevering. Wanneer code productiegereed moet zijn met uitgebreide review.

---

## Niet-Persistente Workflows

### /plan

**Beschrijving:** PM-gedreven taakopsplitsing. Analyseert requirements, selecteert tech stack, ontleedt in geprioriteerde taken met afhankelijkheden, definieert API-contracten.

**Triggertrefwoorden:** Universeel: "task breakdown"; Engels: "plan"; Koreaans: "계획", "요구사항 분석", "스펙 분석"; Japans: "計画", "要件分析", "タスク分解"; Chinees: "计划", "需求分析", "任务分解".

**Stappen:** Requirements verzamelen -> Technische haalbaarheid analyseren -> API-contracten definieren -> Ontleden in taken -> Reviewen met gebruiker -> Plan opslaan.

**Uitvoer:** `.agents/plan.json`, geheugen schrijven, optioneel `docs/exec-plans/active/`.

---

### /exec-plan

**Beschrijving:** Maakt, beheert en volgt uitvoeringsplannen als eersteklas repository-artefacten in `docs/exec-plans/`.

**Triggertrefwoorden:** Geen (uitgesloten van auto-detectie).

**Wanneer gebruiken:** Na `/plan` voor complexe functies die bijgehouden uitvoering met beslissingslogging nodig hebben.

---

### /brainstorm

**Beschrijving:** Design-first ideevorming. Verkent intentie, verduidelijkt beperkingen, stelt benaderingen voor, produceert een goedgekeurd ontwerpdocument voor planning.

**Triggertrefwoorden:** Universeel: "brainstorm"; Engels: "ideate", "explore design"; Koreaans: "브레인스토밍", "아이디어", "설계 탐색"; Japans: "ブレインストーミング", "アイデア", "設計探索"; Chinees: "头脑风暴", "创意", "设计探索".

**Regels:** Geen implementatie of planning voor ontwerpgoedkeuring. Geen code-uitvoer. YAGNI.

---

### /deepinit

**Beschrijving:** Volledige projectinitialisatie. Analyseert een bestaande codebase, genereert AGENTS.md, ARCHITECTURE.md en een gestructureerde `docs/`-kennisbasis.

**Triggertrefwoorden:** Universeel: "deepinit"; Koreaans: "프로젝트 초기화"; Japans: "プロジェクト初期化"; Chinees: "项目初始化".

**Uitvoer:** AGENTS.md, ARCHITECTURE.md, docs/design-docs/, docs/exec-plans/, docs/PLANS.md, docs/QUALITY-SCORE.md, docs/CODE-REVIEW.md.

---

### /review

**Beschrijving:** Volledige QA-reviewpipeline. Beveiligingsaudit (OWASP Top 10), prestatieanalyse, toegankelijkheidscontrole (WCAG 2.1 AA) en codekwaliteitsreview.

**Triggertrefwoorden:** Universeel: "code review", "security audit", "security review"; Engels: "review"; Koreaans: "리뷰", "코드 검토", "보안 검토"; Japans: "レビュー", "コードレビュー", "セキュリティ監査"; Chinees: "审查", "代码审查", "安全审计".

**Optionele fix-verify lus** (met `--fix`): Na QA-rapport, spawn domeinagenten om CRITICAL/HIGH-problemen te fixen, draai QA opnieuw, herhaal tot 3 keer.

---

### /debug

**Beschrijving:** Gestructureerde bugdiagnose en -oplossing met regressietestschrijven en vergelijkbare patronenscanning.

**Triggertrefwoorden:** Universeel: "debug"; Engels: "fix bug", "fix error", "fix crash"; Koreaans: "디버그", "버그 수정", "에러 수정", "버그 찾아", "버그 고쳐"; Japans: "デバッグ", "バグ修正", "エラー修正"; Chinees: "调试", "修复 bug", "修复错误".

**Criteria voor subagent-spawning:** Fout beslaat meerdere domeinen, scanscope > 10 bestanden, of diepgaande afhankelijkheidstracing nodig.

---

### /design

**Beschrijving:** 7-fasen designworkflow die DESIGN.md produceert met tokens, componentpatronen en toegankelijkheidsregels.

**Triggertrefwoorden:** Universeel: "design system", "DESIGN.md", "design token"; Engels: "design", "landing page", "ui design", "color palette", "typography", "dark theme", "responsive design", "glassmorphism"; Koreaans: "디자인", "랜딩페이지", "디자인 시스템", "UI 디자인"; Japans: "デザイン", "ランディングページ", "デザインシステム"; Chinees: "设计", "着陆页", "设计系统".

**Fasen:** SETUP -> EXTRACT (optioneel) -> ENHANCE -> PROPOSE (2-3 richtingen) -> GENERATE (DESIGN.md + tokens) -> AUDIT (responsief, WCAG 2.2, Nielsen, AI slop-controle) -> HANDOFF.

**Verplicht:** Alle uitvoer responsive-first (mobiel 320-639px, tablet 768px+, desktop 1024px+).

---

### /commit

**Beschrijving:** Genereert Conventional Commits met automatische functie-gebaseerde splitsing.

**Triggertrefwoorden:** Geen (uitgesloten van auto-detectie).

**Regels:** Nooit `git add -A`. Nooit secrets committen. HEREDOC voor meerregelige berichten. Co-Author: `First Fluke <our.first.fluke@gmail.com>`.

---

### /setup

**Beschrijving:** Interactieve projectconfiguratie.

**Triggertrefwoorden:** Geen (uitgesloten van auto-detectie).

**Uitvoer:** `.agents/config/user-preferences.yaml`.

---

### /tools

**Beschrijving:** Beheer MCP-toolzichtbaarheid en -beperkingen.

**Triggertrefwoorden:** Geen (uitgesloten van auto-detectie).

**Toolgroepen:** memory, code-analysis, code-edit, file-ops.

---

### /stack-set

**Beschrijving:** Automatische detectie van project tech stack en generatie van taalspecifieke referenties voor de backend-skill.

**Triggertrefwoorden:** Geen (uitgesloten van auto-detectie).

**Uitvoer:** Bestanden in `.agents/skills/oma-backend/stack/`.

---

## Skills vs. Workflows

| Aspect | Skills | Workflows |
|--------|--------|-----------|
| **Wat ze zijn** | Agentexpertise (wat een agent weet) | Georkestreerde processen (hoe agenten samenwerken) |
| **Locatie** | `.agents/skills/oma-{naam}/` | `.agents/workflows/{naam}.md` |
| **Activering** | Automatisch via skill-routeringstrefwoorden | Slash-commando's of triggertrefwoorden |
| **Scope** | Enkel-domein uitvoering | Meerstaps, vaak multi-agent |
| **Voorbeelden** | "Bouw een React-component" | "Plan de functie -> bouw -> review -> commit" |

---

## Auto-Detectie: Hoe Het Werkt

### Het Hook-Systeem

oh-my-agent gebruikt een `UserPromptSubmit`-hook die draait voordat elk gebruikersbericht wordt verwerkt. Het hook-systeem bestaat uit:

1. **`triggers.json`** (`.claude/hooks/triggers.json`): Definieert trefwoord-naar-workflow mappings voor alle 11 ondersteunde talen.
2. **`keyword-detector.ts`** (`.claude/hooks/keyword-detector.ts`): TypeScript-logica die de invoer scant tegen triggertrefwoorden en workflowactiveringscontext injecteert.
3. **`persistent-mode.ts`** (`.claude/hooks/persistent-mode.ts`): Handhaaft persistente workflowuitvoering door te controleren op actieve statusbestanden.

### Detectiestroom

1. Gebruiker typt invoer in natuurlijke taal
2. Hook controleert of expliciet `/command` aanwezig is (zo ja, sla detectie over)
3. Hook scant invoer tegen `triggers.json` trefwoordlijsten
4. Indien een match gevonden, controleer of de invoer overeenkomt met informatiepatronen
5. Indien informationeel (bijv. "wat is orchestrate?"), filter het uit — geen workflow triggers
6. Indien actiegericht, injecteer `[OMA WORKFLOW: {workflow-naam}]` in de context

### Informatiepatroonfiltering

| Taal | Informatiepatronen |
|------|-------------------|
| Engels | "what is", "what are", "how to", "how does", "explain", "describe", "tell me about" |
| Koreaans | "뭐야", "무엇", "어떻게", "설명해", "알려줘" |
| Japans | "とは", "って何", "どうやって", "説明して" |
| Chinees | "是什么", "什么是", "怎么", "解释" |

### Uitgesloten Workflows

Vereisen expliciet `/command`: `/commit`, `/setup`, `/tools`, `/stack-set`, `/exec-plan`.

---

## Persistente Modus Mechanismen

### Statusbestanden

Persistente workflows maken statusbestanden aan in `.agents/state/`:

```
.agents/state/
├── orchestrate-state.json
├── ultrawork-state.json
└── coordinate-state.json
```

### Versterking

Terwijl een persistente workflow actief is, injecteert de `persistent-mode.ts`-hook `[OMA PERSISTENT MODE: {workflow-naam}]` in elk gebruikersbericht.

### Deactivering

Gebruiker zegt "workflow done" (of equivalent). Dit verwijdert het statusbestand en stopt de injectie.

---

## Typische Workflowsequenties

### Snelle Functie
```
/plan → uitvoer reviewen → /exec-plan
```

### Complex Multi-Domein Project
```
/coordinate → PM plant → gebruiker bevestigt → agenten spawnen → QA reviewt → problemen fixen → leveren
```

### Maximale Kwaliteitslevering
```
/ultrawork → PLAN (4 reviewstappen) → IMPL → VERIFY (3 reviewstappen) → REFINE (5 reviewstappen) → SHIP (4 reviewstappen)
```

### Bugonderzoek
```
/debug → reproduceren → oorzaak → minimale fix → regressietest → vergelijkbare patronen scannen
```

### Design-naar-Implementatie Pipeline
```
/brainstorm → ontwerpdocument → /plan → taakopsplitsing → /orchestrate → parallelle implementatie → /review → /commit
```

### Nieuwe Codebase Setup
```
/deepinit → AGENTS.md + ARCHITECTURE.md + docs/ → /setup → CLI en MCP configuratie
```
