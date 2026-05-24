---
title: Workflows
description: Volledige referentie voor alle 16 oh-my-agent workflows — slash-commando's, persistente vs niet-persistente modi, triggertrefwoorden in 11 talen, fasen en stappen, gelezen en geschreven bestanden, auto-detectiemechanismen via triggers.json en keyword-detector.ts, informatiepatroonfiltering en persistent mode-statusbeheer.
---

# Workflows

Workflows zijn gestructureerde meerstapsprocessen die worden getriggerd door slash-commando's of natuurlijke taaltrefwoorden. Ze definieren hoe agenten samenwerken aan taken — van enkelfasige hulpmiddelen tot complexe 5-fasen kwaliteitspoorten.

Er zijn 16 workflows, waarvan 4 persistent zijn (ze behouden status en kunnen niet per ongeluk worden onderbroken).

---

## Persistente workflows

Persistente workflows blijven draaien totdat alle taken klaar zijn. Ze behouden status in `.agents/state/` en herinjecteren `[OMA PERSISTENT MODE: ...]`-context bij elk gebruikersbericht totdat ze expliciet worden gedeactiveerd.

### /orchestrate

**Beschrijving:** Geautomatiseerde CLI-gebaseerde parallelle agentuitvoering. Spawnt subagenten via CLI, coördineert door MCP-geheugen, bewaakt voortgang en draait verificatielussen.

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

**Trigger regex-patronen** (intentie + zelfstandig naamwoord-whitelist, zie [Auto-Detectie: Pattern-veld](#pattern-field-raw-regex)):
| Sectie | Patroon | Voorbeelden die triggeren |
|--------|---------|---------------------------|
| `*` (universeel) | `(build\|create\|make\|develop\|implement\|scaffold) + (a\|an\|the) + [modifier]{0,3} + <noun>` | "Build a TODO app with user authentication", "Create an awesome web service", "Develop a backend with PostgreSQL" |
| `*` (universeel) | `i want a/an + <noun>` | "I want a CLI for parsing logs" |
| `ko` | `<noun> + (을\|를\|이\|가)? + (만들어\|구현해\|개발해 + 변형)` | "TODO 앱 만들어줘", "REST API 구현해", "백엔드를 개발해주세요" |

Whitelist van zelfstandige naamwoorden (15): app, api, service, server, cli, tool, website, dashboard, system, feature, backend, frontend, prototype, mvp, bot.

**Stappen:**
1. **Stap 0 — Voorbereiding:** Lees coördinatieskill, contextladingsgids, geheugenprotocol. Detecteer leverancier.
2. **Stap 1 — Plan Laden/Aanmaken:** Controleer op `.agents/results/plan-{sessionId}.json`. Indien afwezig, vraag gebruiker eerst `/plan` uit te voeren.
3. **Stap 2 — Sessie Initialiseren:** Laad `oma-config.yaml`, toon CLI-mappingtabel, genereer sessie-ID (`session-JJJJMMDD-UUMMSS`), maak `orchestrator-session.md` en `task-board.md` aan in geheugen.
4. **Stap 3 — Agenten Spawnen:** Voor elke prioriteitstier (P0 eerst, dan P1...), spawn agenten met leverancier-geschikte methode. Overschrijd nooit MAX_PARALLEL.
5. **Stap 4 — Monitoren:** Poll `progress-{agent}.md`-bestanden, werk `task-board.md` bij. Let op voltooiingen, fouten, crashes.
6. **Stap 5 — Verifieren:** Draai `verify.sh {agent-type} {workspace}` per voltooide agent. Bij falen, herspawn met foutcontext (max 2 herhaalpogingen). Na 2 herhaalpogingen, activeer Exploratieslus.
7. **Stap 6 — Verzamelen:** Lees alle `result-{agent}.md`-bestanden, stel samenvatting samen.
8. **Stap 7 — Eindrapport:** Presenteer sessiesamenvatting. Indien Quality Score gemeten, voeg Experiment Ledger-samenvatting toe.

**Gelezen bestanden:** `.agents/results/plan-{sessionId}.json`, `.agents/oma-config.yaml`, `progress-{agent}.md`, `result-{agent}.md`.
**Geschreven bestanden:** `orchestrator-session.md`, `task-board.md` (geheugen), eindrapport.

**Wanneer gebruiken:** Grote projecten die maximale parallelisme vereisen met geautomatiseerde coördinatie.

---

### /work

**Beschrijving:** Stap-voor-stap multi-domeincoördinatie. PM plant eerst, dan voeren agenten uit met gebruikersbevestiging bij elke poort, gevolgd door QA-review en probleemoplossing.

**Persistent:** Ja. Statusbestand: `.agents/state/work-state.json`.

**Triggertrefwoorden:**
| Taal | Trefwoorden |
|------|-------------|
| Universeel | "work", "step by step" |
| Koreaans | "코디네이트", "단계별" |
| Japans | "コーディネート", "ステップバイステップ" |
| Chinees | "协调", "逐步" |
| Spaans | "coordinar", "paso a paso" |
| Frans | "coordonner", "étape par étape" |
| Duits | "koordinieren", "schritt für schritt" |

**Stappen:**
1. **Stap 0 — Voorbereiding:** Lees skills, context-loading, geheugenprotocol.
2. **Stap 1 — Requirements Analyseren:** Identificeer betrokken domeinen.
3. **Stap 2 — PM Agent Planning:** PM ontleedt requirements, definieert API-contracten, slaat op in `.agents/results/plan-{sessionId}.json`.
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

### /ralph

**Beschrijving:** Persistente, zelfreferentiële uitvoeringslus. Verpakt ultrawork met een onafhankelijke verifier die na elke iteratie de voltooiingscriteria controleert. Blijft doorlopen totdat alle criteria slagen of de beveiligingen ingrijpen.

**Persistent:** Ja. Statusbestand: `.agents/state/ralph-state.json`.

**Triggertrefwoorden:**
| Taal | Trefwoorden |
|------|-------------|
| Universeel | "ralph" |
| Engels | "don't stop", "until done", "keep going", "finish everything", "run to completion" |
| Koreaans | "랄프", "멈추지마", "끝까지", "완료될때까지", "끝장내" |
| Japans | "止まるな", "完了まで", "最後まで", "全部終わらせて" |
| Chinees | "不要停", "直到完成", "全部完成", "做完为止" |
| Spaans | "no pares", "hasta completar", "termina todo" |
| Frans | "n'arrête pas", "jusqu'à complétion", "termine tout" |
| Duits | "hör nicht auf", "bis zur fertigstellung", "alles fertigstellen" |

**Fasen:**
1. **Fase 0 — INIT:** Vereisten laden (context-loading, geheugenprotocol, judge-protocol). Verifieerbare voltooiingscriteria definiëren (elk moet mechanisch te verifiëren zijn — test slaagt, build slaagt, bestand bestaat). Criteria ter bevestiging aan de gebruiker presenteren. Sessie initialiseren met `max_iterations: 5`.
2. **Fase 1 — WORK:** Ultrawork (PLAN → IMPL → VERIFY → REFINE → SHIP) uitvoeren als één iteratie.
3. **Fase 2 — JUDGE:** Onafhankelijke verifier controleert elk voltooiingscriterium tegenover de werkelijke projectstatus (tests uitvoeren, builds controleren, bestaan van bestanden verifiëren). Elk criterium scoren als PASS/FAIL met bewijs.
4. **Fase 3 — DECIDE:** Als alle criteria PASS → lus beëindigen, eindrapport genereren. Bij FAIL → iteratieteller verhogen, foutcontext terugvoeren, terug naar Fase 1.
5. **Beveiligingen:** De lus stopt als `current_iteration >= max_iterations` (standaard 5), of als hetzelfde criterium 3 keer achter elkaar faalt met dezelfde grondoorzaak (stuck-detectie).

**Belangrijkste verschil met /ultrawork:** Ultrawork is een 5-fase workflow in één doorgang. Ralph verpakt ultrawork in een retry-lus met een onafhankelijke judge die voltooiing objectief verifieert — hij blijft doorgaan totdat het werk daadwerkelijk klaar is, niet alleen "beoordeeld".

**Gelezen bestanden:** `.agents/workflows/ralph/resources/judge-protocol.md`, alle ultrawork-bestanden.
**Geschreven bestanden:** `session-ralph.md` (geheugen), iteratielogs, eindrapport.

**Wanneer gebruiken:** Wanneer gegarandeerde voltooiing nodig is — de agent moet blijven werken totdat verifieerbare criteria slagen, niet slechts één doorgang doen en rapporteren.

---

## Niet-persistente workflows

### /plan

**Beschrijving:** PM-gedreven taakopsplitsing. Analyseert requirements, selecteert tech stack, ontleedt in geprioriteerde taken met afhankelijkheden, definieert API-contracten.

**Triggertrefwoorden:** Universeel: "task breakdown"; Engels: "plan"; Koreaans: "계획", "요구사항 분석", "스펙 분석"; Japans: "計画", "要件分析", "タスク分解"; Chinees: "计划", "需求分析", "任务分解".

**Stappen:** Requirements verzamelen -> Technische haalbaarheid analyseren -> API-contracten definieren -> Ontleden in taken -> Reviewen met gebruiker -> Plan opslaan.

**Uitvoer:** `.agents/results/plan-{sessionId}.json`, geheugen schrijven, optioneel `docs/exec-plans/active/`.

---

### /exec-plan

**Beschrijving:** Maakt, beheert en volgt uitvoeringsplannen als eersteklas repository-artefacten in `docs/exec-plans/`.

**Triggertrefwoorden:** Geen (uitgesloten van auto-detectie).

**Stappen:** Voorbereiding -> Scope analyseren (complexiteit bepalen: Eenvoudig/Gemiddeld/Complex) -> Uitvoeringsplan aanmaken (markdown in `docs/exec-plans/active/`) -> API-contracten definiëren (indien domeinoverstijgend) -> Reviewen met gebruiker -> Uitvoeren (overdragen aan `/orchestrate` of `/work`) -> Afronden (verplaatsen naar `completed/`).

**Uitvoer:** `docs/exec-plans/active/{plan-naam}.md` met takentabel, beslissingslog, voortgangsnotities.

**Wanneer gebruiken:** Na `/plan` voor complexe functies die bijgehouden uitvoering met beslissingslogging nodig hebben.

---

### /brainstorm

**Beschrijving:** Design-first ideevorming. Verkent intentie, verduidelijkt beperkingen, stelt benaderingen voor, produceert een goedgekeurd ontwerpdocument voor planning.

**Triggertrefwoorden:** Universeel: "brainstorm"; Engels: "ideate", "explore design"; Koreaans: "브레인스토밍", "아이디어", "설계 탐색"; Japans: "ブレインストーミング", "アイデア", "設計探索"; Chinees: "头脑风暴", "创意", "设计探索".

**Stappen:** Projectcontext verkennen (MCP-analyse) -> Verduidelijkende vragen stellen (een tegelijk) -> 2-3 benaderingen voorstellen met afwegingen -> Ontwerp sectie voor sectie presenteren (met gebruikersgoedkeuring per stap) -> Ontwerpdocument opslaan in `docs/plans/` -> Overgang: suggereer `/plan`.

**Regels:** Geen implementatie of planning voor ontwerpgoedkeuring. Geen code-uitvoer. YAGNI.

---

### /architecture

**Beschrijving:** Software-architectuurworkflow — architectuurproblemen diagnosticeren, de juiste analysemethode selecteren (diagnostische routering / design-twice / ATAM / CBAM / ADR), opties vergelijken, input van stakeholders synthetiseren en een aanbeveling, review of ADR produceren.

**Triggertrefwoorden:** Universeel: "architecture", "ADR", "ATAM", "CBAM"; Engels: "architecture review", "architectural tradeoff"; Koreaans: "아키텍처", "설계 검토"; Japans: "アーキテクチャ"; Chinees: "架构".

**Stappen:** Beslissing kaderen (nieuwe architectuur / review / tradeoff-analyse / investeringsprioritering / ADR-schrijven) -> Methodologie selecteren via diagnostische routering -> Huidige architectuur analyseren via MCP-code-analyse (`get_symbols_overview`, `find_symbol`, `find_referencing_symbols`) -> Input van stakeholders synthetiseren (alleen wanneer de beslissing zo overkoepelend is dat de kosten gerechtvaardigd zijn) -> Aanbeveling produceren met expliciete aannames, tradeoffs, risico's en validatiestappen -> Overdragen aan `/plan` wanneer implementatie nodig is.

**Regels:** Schrijf in deze workflow GEEN implementatiecode of taakplannen. Overdragen aan `/plan` na de architectuurbeslissing. Gebruik MCP-tools voortdurend; niet vervangen door onbewerkte file-reads of grep.

**Wanneer gebruiken:** Systeemarchitectuurkeuzes, beslissingen over module/service/ownership-grenzen, prioriteren van refactorings, ADR-schrijven, onderzoeken van architectuurpijn (wijzigingsversterking, verborgen afhankelijkheden, ongemakkelijke API's).

---

### /deepinit

**Beschrijving:** Volledige projectinitialisatie. Analyseert een bestaande codebase, genereert AGENTS.md, ARCHITECTURE.md en een gestructureerde `docs/`-kennisbasis.

**Triggertrefwoorden:** Universeel: "deepinit"; Koreaans: "프로젝트 초기화"; Japans: "プロジェクト初期化"; Chinees: "项目初始化".

**Stappen:** Voorbereiding -> Codebase analyseren (projecttype, architectuur, impliciete regels, domeinen, grenzen) -> ARCHITECTURE.md genereren (domeinkaart, maximaal 200 regels) -> `docs/`-kennisbasis genereren (design-docs/, exec-plans/, generated/, product-specs/, references/, domeindocumenten) -> Root AGENTS.md genereren (~100 regels, inhoudsopgave) -> Grens-AGENTS.md-bestanden genereren (monorepo-pakketten, maximaal 50 regels per stuk) -> Bestaande harnas bijwerken (bij opnieuw uitvoeren) -> Valideren (geen dode links, regellimieten).

**Uitvoer:** AGENTS.md, ARCHITECTURE.md, docs/design-docs/, docs/exec-plans/, docs/PLANS.md, docs/QUALITY-SCORE.md, docs/CODE-REVIEW.md en domeinspecifieke documenten indien ontdekt.

---

### /review

**Beschrijving:** Volledige QA-reviewpipeline. Beveiligingsaudit (OWASP Top 10), prestatieanalyse, toegankelijkheidscontrole (WCAG 2.1 AA) en codekwaliteitsreview.

**Triggertrefwoorden:** Universeel: "code review", "security audit", "security review"; Engels: "review"; Koreaans: "리뷰", "코드 검토", "보안 검토"; Japans: "レビュー", "コードレビュー", "セキュリティ監査"; Chinees: "审查", "代码审查", "安全审计".

**Stappen:** Reviewscope identificeren -> Geautomatiseerde beveiligingscontroles (npm audit, bandit) -> Handmatige beveiligingsreview (OWASP Top 10) -> Prestatieanalyse -> Toegankelijkheidsreview (WCAG 2.1 AA) -> Codekwaliteitsreview -> QA-rapport genereren.

**Optionele fix-verify lus** (met `--fix`): Na QA-rapport, spawn domeinagenten om CRITICAL/HIGH-problemen te fixen, draai QA opnieuw, herhaal tot 3 keer.

**Delegatie:** Bij grote scopes worden stappen 2-7 gedelegeerd aan een gespawnde QA-agent subagent.

---

### /deepsec

**Beschrijving:** Stuurt de `oma-deepsec`-skill end-to-end aan. Installeert `.deepsec/`, kalibreert kosten, draait scan/process/triage/revalidate/export-passes, beveiligt PR's via `process --diff`, schrijft custom matchers en routeert findings naar gespecialiseerde agents. Inline-uitvoering (geen subagent-spawns).

**Triggertrefwoorden:** Universeel: "/deepsec", "deepsec workflow"; Engels: "run deepsec", "deepsec scan this repo", "scan repo with deepsec", "deepsec pr review", "deepsec ci gate", "deepsec triage", "deepsec matchers".

**Stappen:**
1. **Stap 1, Skill laden:** Lees `.agents/skills/oma-deepsec/SKILL.md` en laad alleen de resource-bestanden die bij de afgeleide intent horen (`setup.md`, `scanning.md`, `pr-review.md`, `matchers.md`, `triage.md`, `config.md`). Als `.deepsec/` al in de repo-root bestaat, behandel de run incrementeel en draai nooit opnieuw `init`.
2. **Stap 2, Intent classificeren:** Los op naar precies één van `setup`, `scan`, `pr-review`, `matchers`, `triage`, `config`, `troubleshoot`. Multi-intent prompts worden sequentieel uitgevoerd. Voeg `setup` toe vóór elke AI-aanroep-intent als `.deepsec/` ontbreekt.
3. **Stap 3, Agentkeuze bevestigen:** Bevestig vóór elke betaalde aanroep `claude` (sterkste redenering, duurst) versus `codex` (read-only sandbox, goedkoper). Sla over als de gebruiker er één noemde, `deepsec.config.ts` `defaultAgent` vastlegt of de keuze is gedelegeerd.
4. **Stap 4, Afgeleide intent uitvoeren:**
   - **4A `setup`:** `bunx deepsec init`, `bun install`, `.env.local` bewerken, verifiëren met `scan --limit 20` + `process --limit 5`, daarna `data/<id>/INFO.md` schrijven (50-100 regels, projectspecifiek). **Vereist gebruikersbevestiging op `INFO.md`.**
   - **4B `scan`:** Scan -> kalibreren met `--limit 50 --concurrency 5` -> kostenextrapolatie melden (expliciete gebruikersgoedkeuring vereist) -> volledige `process` -> `triage --severity HIGH` + `revalidate --min-severity HIGH` -> `export --format md-dir` + `metrics`.
   - **4C `pr-review`:** Direct-modus `process --diff origin/${BASE_REF} --comment-out comment.md`. Publiceer het two-job CI-patroon (`analyze` zonder `pull-requests: write`, `comment` consumeert alleen het opgeschoonde artefact). Exit `1` = ten minste één netto nieuwe finding.
   - **4D `matchers`:** Doorloop `data/<id>/files/` voor entry-pointgaten, schrijf per-slug matchers naar `.deepsec/matchers/<slug>.ts` op de juiste ruisniveau (`precise` / `normal` / `noisy`), koppel via `.deepsec/deepsec.config.ts` en verifieer met `scan --matchers`.
   - **4E `triage`:** `triage --severity HIGH` -> `revalidate --min-severity HIGH` -> filter export naar alleen `true-positive` / `uncertain`. Noteer terugkerende FP-vormen voor de volgende `INFO.md`-revisie.
   - **4F `config` / `troubleshoot`:** Pas de symptoomtabel uit `resources/config.md` toe.
5. **Stap 5, Samenvatten en routeren:** Maak een run-samenvatting (project id, pass-type, agent/model, gescande bestanden, findings, TP na revalidate, kosten, wall time, stopcondities). Routeer follow-ups op basis van de **laag van het kwetsbare bestand** (backend -> `oma-backend`, frontend -> `oma-frontend`, mobile -> `oma-mobile`, IaC -> `oma-tf-infra`, DB -> `oma-db`, CI -> `oma-dev-workflow`, docs-drift -> `oma-docs`, entry-pointgat -> terug naar stap 4D). Bij dubbelzinnige laag of `revalidation.verdict === "uncertain"` eerst `oma-debug` als triage-hop.
6. **Stap 6, Stopcondities:** Beëindig bij voltooide intent + stap 5-samenvatting, blokkerende preconditie (ontbrekende credential, geweigerde `INFO.md`) of quotastop met een veilig resume-commando.

**Gelezen bestanden:** `.agents/skills/oma-deepsec/SKILL.md`, `.agents/skills/oma-deepsec/resources/*.md` (intent-scoped), `data/<id>/INFO.md`, `data/<id>/files/`, `deepsec.config.ts`.
**Geschreven bestanden:** `.deepsec/` (bij `setup`), `.env.local` (gitignored), `data/<id>/INFO.md`, `.deepsec/matchers/<slug>.ts`, `findings/` (bij `export`), `comment.md` (bij `pr-review`).

**Regels:** Wijzig in deze workflow geen productbroncode (laat specialisten dat doen). Echo of commit geen credentials (`vck_…`, `sk-ant-…`, OIDC-tokens). Verleen geen `pull-requests: write` aan een CI-job die PR-gestuurde code uitvoert. Hervatten, niet resetten: bij onderbreking dezelfde opdracht opnieuw draaien; nooit `rm -rf data/<id>/` zonder expliciete gebruikersinstructie.

**Wanneer te gebruiken:** Agent-powered kwetsbaarheidsscan van een repo, CI/PR-beveiligingsgating via `process --diff`, schrijven van projectspecifieke matchers voor entry-pointdekking, triëren van bestaande findings om FP's te verminderen.

---

### /debug

**Beschrijving:** Gestructureerde bugdiagnose en -oplossing met regressietestschrijven en vergelijkbare patronenscanning.

**Triggertrefwoorden:** Universeel: "debug"; Engels: "fix bug", "fix error", "fix crash"; Koreaans: "디버그", "버그 수정", "에러 수정", "버그 찾아", "버그 고쳐"; Japans: "デバッグ", "バグ修正", "エラー修正"; Chinees: "调试", "修复 bug", "修复错误".

**Stappen:** Foutinformatie verzamelen -> Reproduceren (MCP `search_for_pattern`, `find_symbol`) -> Oorzaak diagnosticeren (MCP `find_referencing_symbols` om uitvoeringspad te traceren) -> Minimale fix voorstellen (gebruikersbevestiging vereist) -> Fix toepassen + regressietest schrijven -> Scannen op vergelijkbare patronen (kan debug-investigator subagent spawnen bij scope > 10 bestanden) -> Bug documenteren in geheugen.

**Criteria voor subagent-spawning:** Fout beslaat meerdere domeinen, scanscope > 10 bestanden, of diepgaande afhankelijkheidstracing nodig.

---

### /design

**Beschrijving:** 7-fasen designworkflow die DESIGN.md produceert met tokens, componentpatronen en toegankelijkheidsregels.

**Triggertrefwoorden:** Universeel: "design system", "DESIGN.md", "design token"; Engels: "design", "landing page", "ui design", "color palette", "typography", "dark theme", "responsive design", "glassmorphism"; Koreaans: "디자인", "랜딩페이지", "디자인 시스템", "UI 디자인"; Japans: "デザイン", "ランディングページ", "デザインシステム"; Chinees: "设计", "着陆页", "设计系统".

**Fasen:** SETUP -> EXTRACT (optioneel) -> ENHANCE -> PROPOSE (2-3 richtingen) -> GENERATE (DESIGN.md + tokens) -> AUDIT (responsief, WCAG 2.2, Nielsen, AI slop-controle) -> HANDOFF.

**Verplicht:** Alle uitvoer responsive-first (mobiel 320-639px, tablet 768px+, desktop 1024px+).

---

### /scm

**Beschrijving:** Genereert Conventional Commits met automatische functie-gebaseerde splitsing.

**Triggertrefwoorden:** Geen (uitgesloten van auto-detectie).

**Stappen:** Wijzigingen analyseren (git status, git diff) -> Functies scheiden (als > 5 bestanden die verschillende scope/type beslaan) -> Type bepalen (feat/fix/refactor/docs/test/chore/style/perf) -> Scope bepalen (gewijzigde module) -> Beschrijving schrijven (imperatief, < 72 tekens) -> Commit onmiddellijk uitvoeren (geen bevestigingsprompt).

**Regels:** Nooit `git add -A`. Nooit secrets committen. HEREDOC voor meerregelige berichten. Co-Author: `First Fluke <our.first.fluke@gmail.com>`.

---

### /tools

**Beschrijving:** Beheer MCP-toolzichtbaarheid en -beperkingen.

**Triggertrefwoorden:** Geen (uitgesloten van auto-detectie).

**Toolgroepen:** memory, code-analysis, code-edit, file-ops.

---

### /pdf

**Beschrijving:** PDF naar Markdown converteren met `opendataloader-pdf` — extraheert tekst, tabellen, koppen en afbeeldingen in de juiste leesvolgorde.

**Triggertrefwoorden:** Geen (wordt expliciet aangeroepen met een pad naar een invoerbestand).

**Stappen:** Invoer valideren (bestaan van bestand bevestigen) -> Uitvoerlocatie bepalen (door gebruiker opgegeven of zelfde directory als invoer) -> `uvx opendataloader-pdf` uitvoeren (geen installatie vereist) -> Voor gescande PDF's hybride modus met OCR gebruiken -> Uitvoer normaliseren met `uvx mdformat` -> Leesbaarheid en structuur valideren -> Conversieproblemen (ontbrekende tabellen, vervormde tekst) rapporteren.

**Regels:** Standaard uitvoerlocatie is dezelfde directory als de invoer-PDF. Sla nooit stappen over. De antwoordtaal volgt `.agents/oma-config.yaml`.

**Wanneer gebruiken:** PDF-documenten converteren naar Markdown voor LLM-context of RAG-ingestion, gestructureerde inhoud (tabellen, koppen, lijsten) uit PDF's extraheren.

---

### /stack-set

**Beschrijving:** Automatische detectie van project tech stack en generatie van taalspecifieke referenties voor de backend-skill.

**Triggertrefwoorden:** Geen (uitgesloten van auto-detectie).

**Uitvoer:** Bestanden in `.agents/skills/oma-backend/stack/`.

---

## Skills vs. workflows

| Aspect | Skills | Workflows |
|--------|--------|-----------|
| **Wat ze zijn** | Agentexpertise (wat een agent weet) | Georkestreerde processen (hoe agenten samenwerken) |
| **Locatie** | `.agents/skills/oma-{naam}/` | `.agents/workflows/{naam}.md` |
| **Activering** | Automatisch via skill-routeringstrefwoorden | Slash-commando's of triggertrefwoorden |
| **Scope** | Enkel-domein uitvoering | Meerstaps, vaak multi-agent |
| **Voorbeelden** | "Bouw een React-component" | "Plan de functie -> bouw -> review -> commit" |

---

## Auto-detectie: hoe het werkt

### Het hook-systeem

oh-my-agent gebruikt een `UserPromptSubmit`-hook die draait voordat elk gebruikersbericht wordt verwerkt. Het hook-systeem bestaat uit:

1. **`triggers.json`** (`.claude/hooks/triggers.json`): Definieert trefwoord-naar-workflow mappings voor alle 11 ondersteunde talen.
2. **`keyword-detector.ts`** (`.claude/hooks/keyword-detector.ts`): TypeScript-logica die de invoer scant tegen triggertrefwoorden en workflowactiveringscontext injecteert.
3. **`persistent-mode.ts`** (`.claude/hooks/persistent-mode.ts`): Handhaaft persistente workflowuitvoering door te controleren op actieve statusbestanden.

### Detectiestroom

1. De gebruiker typt invoer in natuurlijke taal in.
2. De hook controleert of er een expliciet `/command` aanwezig is (zo ja, dan slaat hij de detectie over om duplicatie te voorkomen).
3. De hook saneert de invoer (verwijdert codeblokken, geciteerde strings en geplakte system-echo blokken) en scant deze vervolgens tegen `.agents/hooks/core/triggers.json` — zowel de trefwoordlijsten (letterlijke zinsdelen) als de `patterns` (raw regex). Een versterkingsbeveiliging onderdrukt opnieuw triggeren wanneer dezelfde workflow in de afgelopen 60 seconden al 2 of meer keren is geactiveerd.
4. Indien een match wordt gevonden, controleert de hook of de invoer overeenkomt met informatiepatronen.
5. Indien de invoer informationeel is (bijv. "wat is orchestrate?"), filtert de hook deze uit — er wordt geen workflow getriggerd.
6. Indien de invoer actiegericht is, injecteert de hook `[OMA WORKFLOW: {workflow-naam}]` in de context.
7. De agent leest de geïnjecteerde tag en laadt het bijbehorende workflowbestand uit `.agents/workflows/`.

### Taalsectieconventie

`.agents/hooks/core/triggers.json` gebruikt een per-taal sectiestructuur voor `keywords`, `patterns` en `informationalPatterns`:

| Sectie | Gedrag |
|--------|--------|
| `*` | Universeel — altijd geladen ongeacht de `language`-instelling in `.agents/oma-config.yaml`. Gebruik voor Engelse content (lingua franca) en echte cross-taal tokens (bijv. workflownaam `"orchestrate"`). |
| `en` | Engels — geladen voor achterwaartse compatibiliteit. Functioneel gelijkwaardig aan `*`. Nieuwe Engelse content hoort in `*` thuis. |
| `ko`, `ja`, `zh`, `es`, `fr`, `de`, `pt`, `ru`, `nl`, `pl` | Taalspecifiek — alleen geladen wanneer `language: <lang>` is ingesteld in `.agents/oma-config.yaml`. |

**Implicatie**: Indien u `language: en` instelt in `.agents/oma-config.yaml`, worden alleen `*` en `en` patronen geladen. Koreaanse/Japanse/etc. natuurlijke-taal triggers vuren niet, ook al typt de gebruiker in die talen. Om een niet-Engelse taal in te schakelen, stel `language: <code>` overeenkomstig in. De Engelse fallback in `*` blijft altijd actief.

### Pattern-veld (raw regex)

Naast letterlijke `keywords` kan elke workflow ook `patterns` declareren — raw regex-strings gecompileerd met `iu`-flags. Patronen maken multi-token intentiematching mogelijk die anders combinatorische trefwoordlijsten zou vereisen.

```jsonc
{
  "workflows": {
    "orchestrate": {
      "persistent": true,
      "keywords": { "*": ["orchestrate"], "en": ["parallel", ...] },
      "patterns": {
        "*": ["\\b(build|create|make)\\s+(?:an?|the)\\s+...\\b"],
        "ko": ["(앱|API|...)\\s*(?:을|를)?\\s*(?:만들어\\s*(?:주세요|줘)?|...)"]
      }
    }
  }
}
```

Auteursregels:
- Strings worden direct gecompileerd — escape backslashes één keer voor JSON, één keer voor regex (`\\b`, `\\s+`)
- Geen automatische word-boundary wrapping — patroonauteurs handelen `\b` zelf af
- Ongeldige regex wordt stilzwijgend overgeslagen tijdens runtime (zichtbaar bij config-bewerking via testfouten)

### Informatiepatroonfiltering

De `informationalPatterns`-sectie van `.agents/hooks/core/triggers.json` definieert zinsdelen die wijzen op vragen in plaats van commando's. Gecontroleerd in een venster van 60 tekens rond elke potentiële workflowmatch:

| Sectie | Patroonvoorbeelden |
|--------|---------------------|
| `*` (universeel Engels) | "what is", "what are", "how to", "how does", "how do", "should we", "should i", "could we", "would you", "what if", "what about", "why build", "false positive", "trigger when", "auto-trigger" |
| `ko` | "뭐야", "무엇", "어떻게", "설명해", "알려줘", "트리거", "발동", "메타", "왜 만들", "어떻게 만들", "어떨까", "한다면", "할까요" |
| `ja` | "とは", "って何", "どうやって", "説明して" |
| `zh` | "是什么", "什么是", "怎么", "解释" |

Indien de invoer zowel een workflowtrigger als een informatiepatroon matcht, krijgt het informatiepatroon voorrang en wordt geen workflow getriggerd. Dit blokkeert prompts zoals:
- `"How do you build a TODO app?"` — `how do` in `*` blokkeert de orchestrate-intentie regex
- `"orchestrate 트리거 해주면 되나요?"` (onder `language: ko`) — `트리거` in `ko` blokkeert het orchestrate-trefwoord

### Uitgesloten workflows

Vereisen expliciet `/command`: `/scm`, `/tools`, `/stack-set`, `/exec-plan`, `/pdf`.

---

## Persistente modus mechanismen

### Statusbestanden

Persistente workflows maken statusbestanden aan in `.agents/state/`:

```
.agents/state/
├── orchestrate-state.json
├── ultrawork-state.json
└── work-state.json
```

Deze bestanden bevatten: workflownaam, huidige fase/stap, sessie-ID, tijdstempel en eventuele lopende status.

### Versterking

Terwijl een persistente workflow actief is, injecteert de `persistent-mode.ts`-hook `[OMA PERSISTENT MODE: {workflow-naam}]` in elk gebruikersbericht. Dit zorgt ervoor dat de workflow blijft doorlopen, ook over gespreksbeurten heen.

### Deactivering

Om een persistente workflow te deactiveren zegt de gebruiker "workflow done" (of het equivalent in de geconfigureerde taal). Dit:
1. Verwijdert het statusbestand uit `.agents/state/`
2. Stopt de injectie van de persistent mode-context
3. Keert terug naar normale werking

De workflow kan ook op natuurlijke wijze eindigen wanneer alle stappen zijn voltooid en de laatste poort slaagt.

---

## Typische workflowsequenties

### Snelle functie
```
/plan → uitvoer reviewen → /exec-plan
```

### Complex multi-domein project
```
/work → PM plant → gebruiker bevestigt → agenten spawnen → QA reviewt → problemen fixen → leveren
```

### Maximale kwaliteitslevering
```
/ultrawork → PLAN (4 reviewstappen) → IMPL → VERIFY (3 reviewstappen) → REFINE (5 reviewstappen) → SHIP (4 reviewstappen)
```

### Bugonderzoek
```
/debug → reproduceren → oorzaak → minimale fix → regressietest → vergelijkbare patronen scannen
```

### Design-naar-implementatie pipeline
```
/brainstorm → ontwerpdocument → /plan → taakopsplitsing → /orchestrate → parallelle implementatie → /review → /scm
```

### Nieuwe codebase setup
```
/deepinit → AGENTS.md + ARCHITECTURE.md + docs/
```
