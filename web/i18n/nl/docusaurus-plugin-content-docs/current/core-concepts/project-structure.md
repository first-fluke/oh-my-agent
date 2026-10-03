---
title: Projectstructuur
description: Een lezersgerichte kaart van een oh-my-agent-installatie met de SSOT onder .agents/, representatieve skillresources, workflows, ingecheckte agentdefinities, runtimestatus, integratielagen voor leveranciers en de structuur van de bronrepository.
---

# Projectstructuur

Na de installatie van oh-my-agent krijgt je project twee kernbomen: `.agents/` (de single source of truth, inclusief de coördinatiestore `.agents/state/memories/`) en runtime-integratielagen (zoals `.claude/`, `.cursor/` en `.codex/`). Als Serena als code-intelligenceprovider is gekozen, kan er ook een optionele directory `.serena/` met Serena-onboardingmemories bestaan. Deze pagina legt de gedeelde bestanden uit en de optionele of gegenereerde paden die relevant zijn bij troubleshooting.

---

## Representatieve directorystructuur

De onderstaande boom toont de gedeelde resources en representatieve domeinskills in detail. De huidige catalogus bevat 33 skilldirectories; weggelaten skills volgen hetzelfde patroon met `SKILL.md` plus optionele `resources/`, `variants/` of een skillspecifieke directory. Beschouw de live `.agents/`-boom als leidend wanneer een gegenereerd of optioneel bestand ontbreekt.

```
your-project/
├── .agents/                          ← Single Source of Truth (SSOT)
│   ├── oma-config.cue / .yaml    ← Language, model_preset, providers, agent overrides
│   │
│   ├── skills/
│   │   ├── _shared/                  ← Resources used by ALL agents
│   │   │   ├── README.md
│   │   │   ├── core/
│   │   │   │   ├── skill-routing.md
│   │   │   │   ├── context-loading.md
│   │   │   │   ├── prompt-structure.md
│   │   │   │   ├── clarification-protocol.md
│   │   │   │   ├── context-budget.md
│   │   │   │   ├── difficulty-guide.md
│   │   │   │   ├── quality-principles.md
│   │   │   │   ├── vendor-detection.md
│   │   │   │   ├── session-metrics.md
│   │   │   │   ├── common-checklist.md
│   │   │   │   ├── lessons-learned.md
│   │   │   │   └── api-contracts/
│   │   │   │       ├── README.md
│   │   │   │       └── template.md
│   │   │   ├── runtime/
│   │   │   │   ├── memory-protocol.md
│   │   │   │   └── execution-protocols/
│   │   │   │       ├── claude.md
│   │   │   │       ├── antigravity.md
│   │   │   │       ├── codex.md
│   │   │   │       ├── commandcode.md / kimi.md / kiro.md
│   │   │   │       ├── opencode.md / pi.md
│   │   │   │       └── qwen.md
│   │   │   └── conditional/
│   │   │       ├── quality-score.md
│   │   │       ├── experiment-ledger.md
│   │   │       └── exploration-loop.md
│   │   │
│   │   ├── oma-frontend/
│   │   │   ├── SKILL.md
│   │   │   └── resources/              ← execution, stack, Angular, snippets, checks
│   │   │
│   │   ├── oma-backend/
│   │   │   ├── SKILL.md
│   │   │   ├── resources/              ← execution, ORM, checklist, recovery
│   │   │   └── variants/               ← node, python, rust seeds / generated refs
│   │   │
│   │   ├── oma-mobile/
│   │   │   ├── SKILL.md
│   │   │   ├── resources/              ← execution, tech stack, screen templates, checks
│   │   │   └── variants/               ← stack schema and generated platform refs
│   │   │
│   │   ├── oma-db/
│   │   │   ├── SKILL.md
│   │   │   └── resources/
│   │   │       ├── execution-protocol.md
│   │   │       ├── document-templates.md
│   │   │       ├── anti-patterns.md
│   │   │       ├── vector-db.md
│   │   │       ├── migration-playbook.md
│   │   │       ├── query-tuning.md
│   │   │       ├── iso-controls.md
│   │   │       ├── checklist.md
│   │   │       ├── error-playbook.md
│   │   │       └── examples.md
│   │   │
│   │   ├── oma-design/
│   │   │   ├── SKILL.md
│   │   │   ├── resources/
│   │   │   │   ├── execution-protocol.md
│   │   │   │   ├── anti-patterns.md
│   │   │   │   ├── checklist.md
│   │   │   │   ├── design-md-spec.md
│   │   │   │   ├── design-tokens.md
│   │   │   │   ├── prompt-enhancement.md
│   │   │   │   ├── stitch-integration.md
│   │   │   │   └── error-playbook.md
│   │   │   └── reference/
│   │   │       ├── typography.md
│   │   │       ├── color-and-contrast.md
│   │   │       ├── spatial-design.md
│   │   │       ├── motion-design.md
│   │   │       ├── responsive-design.md
│   │   │       ├── component-patterns.md
│   │   │       ├── accessibility.md
│   │   │       └── shader-and-3d.md
│   │   │
│   │   ├── oma-pm/
│   │   │   ├── SKILL.md
│   │   │   └── resources/
│   │   │       ├── execution-protocol.md
│   │   │       ├── examples.md
│   │   │       ├── iso-planning.md
│   │   │       ├── plan-phase-protocol.md
│   │   │       ├── task-template.json
│   │   │       └── error-playbook.md
│   │   │
│   │   ├── oma-qa/
│   │   │   ├── SKILL.md
│   │   │   └── resources/
│   │   │       ├── execution-protocol.md
│   │   │       ├── iso-quality.md
│   │   │       ├── checklist.md
│   │   │       ├── self-check.md
│   │   │       ├── error-playbook.md
│   │   │       └── verify-ship-protocol.md
│   │   │
│   │   ├── oma-debug/
│   │   │   ├── SKILL.md
│   │   │   └── resources/
│   │   │       ├── execution-protocol.md
│   │   │       ├── common-patterns.md
│   │   │       ├── debugging-checklist.md
│   │   │       ├── bug-report-template.md
│   │   │       ├── checklist.md
│   │   │       ├── error-playbook.md
│   │   │       └── ...
│   │   │
│   │   ├── oma-tf-infra/
│   │   │   ├── SKILL.md
│   │   │   └── resources/
│   │   │       ├── execution-protocol.md
│   │   │       ├── multi-cloud-examples.md
│   │   │       ├── cost-optimization.md
│   │   │       ├── policy-testing-examples.md
│   │   │       ├── iso-42001-infra.md
│   │   │       ├── checklist.md
│   │   │       ├── error-playbook.md
│   │   │       └── examples.md
│   │   │
│   │   ├── oma-dev-workflow/
│   │   │   ├── SKILL.md
│   │   │   └── resources/
│   │   │       ├── validation-pipeline.md
│   │   │       ├── database-patterns.md
│   │   │       ├── api-workflows.md
│   │   │       ├── i18n-patterns.md
│   │   │       ├── release-coordination.md
│   │   │       └── troubleshooting.md
│   │   │
│   │   ├── oma-translation/
│   │   │   ├── SKILL.md
│   │   │   └── resources/
│   │   │       ├── translation-rubric.md
│   │   │       ├── anti-ai-patterns.md
│   │   │       └── lang/
│   │   │           ├── _template.md
│   │   │           ├── en.md
│   │   │           ├── ja.md
│   │   │           ├── ko.md
│   │   │           └── zh.md
│   │   │
│   │   ├── oma-orchestration/
│   │   │   ├── SKILL.md
│   │   │   ├── resources/
│   │   │   │   ├── subagent-prompt-template.md
│   │   │   │   └── memory-schema.md
│   │   │   ├── scripts/
│   │   │   │   ├── spawn-agent.sh
│   │   │   │   ├── parallel-run.sh
│   │   │   │   └── verify.sh
│   │   │   ├── templates/
│   │   │   └── config/
│   │   │       └── cli-config.yaml
│   │   │
│   │   ├── oma-brainstorm/
│   │   │   └── SKILL.md
│   │   │
│   │   ├── oma-coordination/
│   │   │   ├── SKILL.md
│   │   │   └── resources/
│   │   │       └── examples.md
│   │   │
│   │   └── oma-scm/
│   │       ├── SKILL.md
│   │       ├── config/
│   │       │   └── commit-config.yaml
│   │       └── resources/
│   │           └── conventional-commits.md
│   │
│   ├── workflows/                    ← 21 process definitions
│   │   ├── orchestrate.md             ← Persistent: automated parallel execution
│   │   ├── work.md                    ← Persistent: step-by-step coordination
│   │   ├── ultrawork.md               ← Persistent: 5-phase quality workflow
│   │   ├── ralph.md                   ← Persistent: repeated execution + judge
│   │   ├── plan.md / brainstorm.md / architecture.md
│   │   ├── deepinit.md / review.md / debug.md / design.md
│   │   ├── scm.md / tools.md / stack-set.md / convert.md
│   │   ├── docs.md / explain.md / recap.md / schedule.md / video.md
│   │   └── ...                         ← Keep this list aligned with `.agents/workflows/`
│   │
│   ├── agents/                        ← 12 checked-in subagent definitions
│   │   ├── architecture-reviewer.md / backend-engineer.md
│   │   ├── db-engineer.md / debug-investigator.md / docs-curator.md
│   │   ├── frontend-engineer.md / mobile-engineer.md / pm-planner.md
│   │   ├── qa-reviewer.md / refactor-engineer.md
│   │   ├── research-explorer.md / tf-infra-engineer.md
│   │
│   ├── results/                       ← Plans, claims, reports, and generated artifacts
│   ├── state/                         ← Active workflow state files
│   │   ├── orchestrate-state.json     ← (exists only when workflow is active)
│   │   ├── ultrawork-state.json
│   │   ├── work-state.json
│   │   └── memories/                  ← Coordination memory store (canonical path)
│   │       ├── orchestrator-session-{sessionId}.md ← Session ID, status, phase tracking
│   │       ├── task-board-{sessionId}.md          ← Task assignments and status
│   │       ├── progress-{agentId}-{taskId}-{runId}-{sessionId}.md ← Run-scoped progress updates
│   │       ├── result-{agentId}-{taskId}-{runId}-{sessionId}.md   ← Run-scoped final outputs
│   │       ├── session-metrics.md         ← Session evidence and experiment results
│   │       ├── experiment-ledger.md       ← Experiment tracking (conditional)
│   │       ├── session-work.md            ← Work workflow session state
│   │       ├── session-ultrawork.md       ← Ultrawork workflow session state
│   │       ├── session-cost-{sessionId}.md ← Per-session spawn cost telemetry
│   │       └── archive/
│   │           └── metrics-{date}.md      ← Archived session metrics
│   └── mcp.json                       ← MCP server configuration
│
├── .claude/                           ← IDE Integration Layer
│   ├── settings.json                  ← Hooks registration and permissions
│   ├── hooks/                         ← Only the variant's runtime-required files (see below)
│   │   ├── oma-hook.sh                ← Generated wrapper: resolves oma binary, exec oma hook "$@"
│   │   ├── hud.ts                     ← [OMA] statusline indicator (bun path, not routed via oma hook)
│   │   └── filter-test-output.sh      ← Test-output filter; in-process test-filter pipes Bash test commands through it
│   ├── skills/                        ← Symlinks → .agents/skills/
│   │   ├── oma-frontend -> ../../.agents/skills/oma-frontend
│   │   ├── oma-backend -> ../../.agents/skills/oma-backend
│   │   └── ...
│   └── agents/                        ← Subagent definitions for Claude Code
│       ├── backend-engineer.md
│       ├── frontend-engineer.md
│       └── ...
│
└── .serena/                           ← Optional: Serena MCP (only created if Serena is used)
    └── memories/                       ← Serena's own onboarding knowledge (code_style.md,
        │                                 project_purpose.md, ...); legacy coordination
        │                                 fallback for older projects
        └── ...
```

---

## .agents/: de Source of Truth

Dit is de kern van de directory. Alles wat agents nodig hebben, staat hier. Voor het gedrag van agents is dit de enige relevante directory. Alle andere directories worden hiervan afgeleid.

### oma-config.cue en oma-config.yaml

**`oma-config.yaml`**: centraal configuratiebestand met:
- `language`: code voor de antwoordtaal (en, ko, ja, zh, es, fr, de, pt, ru, nl, pl)
- `date_format`: tijdstempelformaat (`ISO`, `US` of `EU`; standaard `ISO`)
- `timezone`: IANA-tijdzone-identificator; weggelaten waarden gebruiken de tijdzone van het systeem
- `model_preset`: actieve sleutel voor de modelpreset (`auto` als standaard, of een vaste/aangepaste preset)
- `providers`: capability-providers voor docs, web, code-intelligence en semantic memory
- `auto_update_cli`: CLI automatisch op de achtergrond bijwerken (standaard `true`, uitschakelen met `false`)
- `telemetry`: opt-in voor telemetrie van leveranciers (standaard `false`)
- `mcp.devtools_browsers`: optionele browserlijst; weglaten behoudt de bestaande setup
- `agents`: gedeeltelijke overschrijvingen per agent (alleen objecten van het type `AgentSpec`)
- `models`: door de gebruiker gedefinieerde modelslugs
- `custom_presets`: optionele aangepaste presets met optionele `extends:`

### skills/

Hier staat de skillkennis. De huidige catalogus bevat 33 skilldirectories plus gedeelde `_shared`-resources; de preset `all` wordt afgeleid van de live skillboom.

**`_shared/`**: resources die alle agents gebruiken:
- `core/`: routering, context loading, promptstructuur, clarification protocol, contextbudget, moeilijkheidsinschatting, reasoningtemplates, kwaliteitsprincipes, leveranciersdetectie, sessiemetrics, algemene checklist, lessons learned en API-contracttemplates
- `runtime/`: memoryprotocol, event-specificatie, result contract en leveranciersspecifieke uitvoeringsprotocollen
- `conditional/`: kwaliteitsmeting, experimentledger en exploratielus (alleen geladen wanneer geactiveerd)

**`oma-{skill}/`**: elke directory per skill bevat:
- `SKILL.md`: Laag 1, geladen wanneer de skill wordt gerouteerd. Bevat identiteit, routering en kernregels.
- `resources/`: Laag 2, on demand geladen. Bevat uitvoeringsprotocollen, voorbeelden, checklists, foutoplossingshandleidingen, techstacks, snippets en templates.
- Sommige skills hebben extra subdirectories: `variants/` (backend/mobile-seeds), gegenereerde `stack/`-referenties van `/stack-set`, `reference/` (oma-design) en skillspecifieke scripts/configuratie.

### workflows/

21 Markdown-bestanden definiëren het gedrag van slashcommando's. Elk bestand bevat:
- YAML-frontmatter met `description`
- Een verplichte regelsectie (antwoordtaal, volgorde van stappen, vereiste MCP-tools)
- Instructies voor leveranciersdetectie
- Een stapsgewijs uitvoeringsprotocol
- Gate-definities (voor persistente workflows)

Persistente workflows: `orchestrate.md`, `work.md`, `ultrawork.md` en `ralph.md`.
Niet-persistente workflows zijn `plan.md`, `brainstorm.md`, `architecture.md`, `deepinit.md`, `review.md`, `debug.md`, `design.md`, `scm.md`, `tools.md`, `stack-set.md`, `convert.md`, `docs.md`, `explain.md`, `recap.md`, `schedule.md` en `video.md`.

### agents/

De 12 subagentdefinitiebestanden worden gebruikt bij het spawnen via de Agent-tool van Claude Code of via de CLI. Elk bestand bevat:
- Frontmatter: `name`, `description`, `skills` (welke skill moet worden geladen)
- Verwijzing naar het uitvoeringsprotocol
- Template voor Charter preflight (`CHARTER_CHECK`)
- Architectuuroverzicht
- 10 domeinspecifieke regels
- De verklaring: "Never modify `.agents/` files"

### plan-\{sessionId\}.json

Wordt gegenereerd door de workflow `/plan` en bevat het gestructureerde plan met taken, agenttoewijzingen, prioriteiten, afhankelijkheden en acceptatiecriteria. `/orchestrate` en `/work` gebruiken dit plan. Het bijbehorende leesbare overzicht staat in `docs/plans/work/{NNN}-{name}.md` (levenscyclus via het veld `Status`). Permanente ontwerpbeslissingen staan ernaast in `docs/plans/designs/{NNN}-{name}.md`.

### state/

Actieve statusbestanden voor persistente workflows. Als je ze verwijdert (of zegt dat de workflow klaar is), deactiveer je de persistente workflow.

De subdirectory `state/memories/` is de canonieke store voor coördinatiegeheugen: sessiestatus van de orchestrator, taakbord, voortgangs- en resultaatbestanden per agent en taak, sessiemetrics en kostenregistratie. Dashboards bewaken deze directory en de CLI zoekt hier eerst (oudere projecten vallen terug op de legacy-directory `.serena/memories/`). Zie [.agents/state/memories/: runtimestatus](#agentsstatememories-runtime-state) hieronder.

### results/

Agentresultaatbestanden. Voltooide agents schrijven hier status, samenvatting, gewijzigde bestanden en acceptatiecriteria. De orchestrator en dashboards lezen deze bestanden.

### mcp.json

MCP-serverconfiguratie met:
- Serverdefinities (Serena enzovoort)
- Geheugenconfiguratie: `memoryConfig.provider`, `memoryConfig.basePath`, `memoryConfig.tools` (namen van lees-, schrijf- en edit-tools)
- Toolgroepdefinities voor het beheer met `/tools`

---

## .claude/: IDE-integratie

Deze directory verbindt oh-my-agent met Claude Code en andere IDE's.

### settings.json

Registreert hooks voor Claude Code. Elke hookgebeurtenis gebruikt nu de canonieke ABI `oma hook run`:

```json
{
  "hooks": {
    "UserPromptSubmit": [
      {
        "hooks": [{
          "name": "oma-hook-UserPromptSubmit",
          "type": "command",
          "command": "$CLAUDE_PROJECT_DIR/.claude/hooks/oma-hook.sh --vendor claude --event UserPromptSubmit",
          "timeout": 25
        }]
      }
    ]
  }
}
```

De entry `statusLine` blijft op een direct `bun`-pad staan (hot-path voor rendering) en wordt niet via `oma hook run` gerouteerd.

### hooks/

De directory `hooks/` van een leverancier bevat **alleen de bestanden die daar tijdens runtime iets uitvoert of leest**. De handlerketen zelf (keyword detection, persistent mode, skill injection, …) draait in-process in het `oma`-binary via `oma hook run`; handlerbestanden met extensie `.ts` worden tijdens het bouwen in de CLI gebundeld en worden NIET naar vendor-directories gematerialiseerd.

**`oma-hook.sh`**: gegenereerd wrapper-script dat door `oma link`/`oma install`/`oma update` wordt geschreven. Elk hookevent van een leverancier gaat via dit bestand. De resolutievolgorde tijdens runtime is: `$OMA_BIN` (expliciete override) → `command -v oma` (PATH) → bekende installatiedirectories zoals `$HOME/.bun/bin` en `$HOME/.local/share/mise/shims` (agents die via een GUI starten erven een minimale PATH) → `exit 0` (fail-open, blokkeert de agent nooit). Er worden geen machinespecifieke waarden in het script geschreven, dus het bestand is byte-identiek voor elke ontwikkelaar en veilig om te committen. Het geeft `"$@"` ongewijzigd door, zodat de argumenten `--vendor`, `--event` en `--matcher` onveranderd bij `oma hook run` aankomen. Het bevat een self-dedup-preamble die dubbele triggers onderdrukt wanneer zowel een projectinstallatie als een globale installatie hetzelfde event registreert.

**`hud.ts`**: rendert de `[OMA]`-indicator in de statusbalk met modelnaam, contextgebruik (kleurgecodeerd: groen/geel/rood) en actieve workflowstatus. Wordt rechtstreeks onder `statusLine` geregistreerd (niet via `oma hook run`) om de renderlatentie op het hot path laag te houden. Wordt alleen gematerialiseerd voor leveranciers waarvan de variant een `statusLine`- of alleen-HUD-event registreert (bijvoorbeeld claude, antigravity en qwen). De code leidt het leveranciersdialect af uit het eigen geïnstalleerde pad; de kopie per leverancier is dus functioneel vereist.

**`filter-test-output.sh`**: shellfilter dat ruis uit test-runneroutput verwijdert. De in-process test-filterhandler herschrijft gedetecteerde Bash-testcommando's zodat ze via `<hookDir>/filter-test-output.sh` worden gepiped. Daarom wordt dit bestand gematerialiseerd voor elke leverancier waarvan de variant `test-filter.ts` registreert (alle behalve cursor).

#### Waar de handlerlogica werkelijk staat

De handlerbronnen zijn de SSOT in `.agents/hooks/core/` en draaien in-process via `oma hook run`:

**`keyword-detector.ts`**: pure handler (`run(input, ctx): HandlerResult | null`) voor keyword detection. De logica:
1. Saniteert de invoer (verwijdert codeblokken, geciteerde strings en geplakte system-echo-blokken)
2. Vergelijkt de opgeschoonde invoer met trigger-`keywords` (letterlijke waarden) en `patterns` (regex)
3. Controleert informatieve patronen in een venster van 60 tekens rond elke match
4. Past de reinforcement guard toe (onderdrukt dezelfde workflow als die binnen 60s twee keer of vaker is getriggerd)
5. Geeft een `context`-resultaat terug dat `[OMA WORKFLOW: ...]` of `[OMA PERSISTENT MODE: ...]` injecteert

**`persistent-mode.ts`**: pure handler (`run()`) die actieve statusbestanden in `.agents/state/` controleert en persistente workflowuitvoering opnieuw afdwingt. Wordt bij `Stop`-events in-process aangeroepen via `oma hook run`.

**`scm-guard.ts`**: pure handler (`run()`) op `PreToolUse` (Bash/shell-tools) die `git add` van vermoedelijke secretbestanden weigert. Handhaaft `forbidden_patterns` minus `allowed_exceptions` uit `.agents/skills/oma-scm/config/commit-config.yaml` (ingebouwde defaults wanneer de config ontbreekt). Draait vóór `test-filter` in de keten voor claude, codex, cursor, grok, kimi, kiro en qwen, en in de opencode-bridge (`tool.execute.before` werpt een fout om te blokkeren) en pi-bridge (`tool_call` retourneert `{ block: true, reason }`); een commando met prefix `OMA_SCM_ALLOW_SECRETS=1` omzeilt de guard na expliciete gebruikersgoedkeuring. Breed stagen (`git add -A` / `git add .`) wordt opzettelijk niet geblokkeerd; die regel hangt af van toestemming van de gebruiker, die de hook niet kan waarnemen.

**`code-intelligence-guard.ts`**: pure handler (`run()`) op `PreToolUse` die de regel "Code Search" mechanisch afdwingt. Zolang `providers.code_intelligence` naar `serena` (of `gortex`) wordt opgelost en `providers.code_intelligence_guard` niet `off` is, weigert de handler de native zoektools (`Grep`, `Glob` op Claude Code) en shellcommando's waarvan het eerste binary een recursieve codezoekopdracht is (`rg`, `ag`, `ack`, `fd`, `grep -r`, `find -name`/`-path`, `git grep`), en noemt de weigeringsreden de providertool die in plaats daarvan moet worden gebruikt (`search_for_pattern`, `find_file`, `find_symbol`). Niet-recursieve `grep` (pipefilters, losse bestanden), `find` zonder naampredicaat en leesacties worden nooit aangeraakt. Wordt direct na `scm-guard` geregistreerd voor claude, codex, cursor, grok, kimi, kiro en qwen; de installer voegt de matchers van de keten samen, zodat het `PreToolUse`-item van Claude `Bash|Grep|Glob` wordt. Een shellcommando dat `OMA_CI_ALLOW_NATIVE=1` bevat, omzeilt de guard nog steeds, maar alleen als noodluik voor operators bij zoekopdrachten naar resources buiten het project of genegeerde paden die de guard niet heeft herkend. De weigeringsreden noemt dat prefix niet, en het is geen terugvaloptie voor de broncode van het project.

**`triggers.json`**: de mapping van keywords naar workflows, statisch ingebouwd in het `oma`-binary tijdens het bouwen (bron: `.agents/hooks/core/triggers.json`). Definieert:
- `workflows`: map van workflownaam naar `{ persistent: boolean, keywords: { language: [...] }, patterns?: { language: [...] }, explicit?: [...] }`. `keywords` zijn letterlijke frases; `patterns` zijn onbewerkte regexstrings (gecompileerd met `iu`-flags). `explicit` (alleen persistente workflows) somt de keywords op die als expliciete aanroep tellen — alleen die activeren de persistente modus; elke andere match wordt als suggestie geïnjecteerd.
- `informationalPatterns`: frases die vragen aanduiden (worden uitgefilterd bij automatische detectie)
- `excludedWorkflows`: workflows waarvoor expliciet `/command`-gebruik vereist is

Taalonderdelen in `keywords`, `patterns` en `informationalPatterns` volgen deze conventie:
- `*`: universeel/Engels.
- `en`: functioneel gelijk aan `*`.
- `ko`/`ja`/`zh`/enzovoort: taalspecifieke formuleringen.

Elke sectie wordt altijd geladen; de instelling `language` in `.agents/oma-config.yaml` bepaalt alleen de antwoordtaal. Woordgrenzen hangen af van het keyword zelf: ASCII-keywords matchen hele woorden, keywords met niet-ASCII-tekst matchen als substrings.

#### Materialisatie per leverancier: vóór → na

Oudere installaties kopieerden de **volledige** set `.agents/hooks/core/` (ongeveer 20 bestanden) naar de hookdirectory van elke leverancier, hoewel de in-process dispatch de meeste daarvan als dode bestanden achterliet:

```
# BEFORE — every vendor hookDir (.claude/hooks, .codex/hooks, .cursor/hooks, …)
hooks/
├── oma-hook.sh            ← executed (event dispatch)
├── hud.ts                 ← executed (statusLine)
├── filter-test-output.sh  ← read (test-filter pipe target)
├── keyword-detector.ts    ← dead copy (runs in-process via oma hook)
├── persistent-mode.ts     ← dead copy
├── skill-injector.ts      ← dead copy
├── state-boundary.ts      ← dead copy
├── test-filter.ts         ← dead copy
├── code-intelligence-primer.ts ← dead copy
├── triggers.json          ← dead copy (inlined into the oma binary)
├── types.ts, constants.ts, fs-utils.ts, hook-output.ts,
│   agentmemory-client.ts, agy-input.ts,
│   inject-log.ts, state-emit.ts, state-marker.ts,
│   vendor-renderer.ts     ← dead copies (handler-chain internals)
└── …
```

Nu leidt de installer een whitelist af uit de variant-JSON van de leverancier (`requiredVariantScripts` in `cli/platform/hooks-composer.ts`) en materialiseert hij alleen wat die leverancier uitvoert of leest:

```
# AFTER
.claude/hooks/              .codex/hooks/  .grok/hooks/  .kiro/hooks/
├── oma-hook.sh             ├── oma-hook.sh
├── hud.ts                  └── filter-test-output.sh
└── filter-test-output.sh
                            .cursor/hooks/  .commandcode/hooks/
.qwen/hooks/  .kiro/hooks/  └── oma-hook.sh
(same as .claude where the variant needs it)
```

| Leverancier | Gematerialiseerde bestanden | Waarom |
|---|---|---|
| claude, qwen | `oma-hook.sh`, `hud.ts`, `filter-test-output.sh` | statusLine + test-filter |
| codex, grok, kiro | `oma-hook.sh`, `filter-test-output.sh` | test-filter, zonder statusLine |
| cursor | `oma-hook.sh` | geen statusLine, geen test-filter |
| commandcode | `oma-hook.sh` | alleen Stop — Command Code heeft geen prompt-event en PreToolUse kan de invoer niet herschrijven ([hooks reference](https://commandcode.ai/docs/hooks/reference)) |
| antigravity | geen (project) — `hud.ts` + core hooks gekopieerd naar `~/.gemini/antigravity-cli/hooks/` | agy leest instellingen alleen uit HOME en workspace-hooks uit `.agents/hooks.json`, die handlers rechtstreeks uit `.agents/hooks/core/` uitvoert; een project-`.gemini/antigravity-cli/` wordt nooit geladen (`homeOnly` variantflag) |
| pi | volledige set `.agents/hooks/core/` onder `.pi/extensions/oma/` | de pi-bridge start handlers als subprocessen in plaats van settings-hooks te gebruiken |

De bestemmingsdirectory wordt vóór het kopiëren leeggemaakt. Als je `oma install`/`oma update`/`oma link` opnieuw uitvoert op een oudere installatie, worden achtergebleven bestanden uit de oude volledige kopie automatisch verwijderd.

#### Een handlerketen afzonderlijk debuggen

Je kunt elke handlerketen met een echte payload uitvoeren zonder de live agentsessie te starten:

```bash
# Inspect what keyword-detector injects for a given prompt
echo '{"prompt":"orchestrate the auth feature","cwd":"/path/to/project"}' \
  | oma hook run --vendor claude --event UserPromptSubmit

# Test a pre_tool block (Bash tool)
echo '{"tool_name":"Bash","tool_input":{"command":"rm -rf /"},"cwd":"/path/to/project"}' \
  | oma hook run --vendor claude --event PreToolUse --matcher Bash

# Test persistent-mode Stop enforcement
echo '{"cwd":"/path/to/project"}' \
  | oma hook run --vendor claude --event Stop
```

`oma hook run` eindigt altijd met 0 (fail-open). Lege stdout betekent dat de keten voor dat event niets deed. De JSON in het leveranciersdialect (of gewone tekst voor kiro-prompts) wordt naar stdout geschreven wanneer een handler wordt geactiveerd.

#### Migratie vanaf installaties van vóór 019

Bestaande installaties met oude entries als `bun "$CLAUDE_PROJECT_DIR/.claude/hooks/keyword-detector.ts"` worden automatisch gemigreerd wanneer je opnieuw `oma install`, `oma update` of `oma link` uitvoert. De installer gebruikt vervanging op basis van markers: alleen door OMA beheerde hookgroepen (herkend aan hun `name`/`command`-patronen) worden vervangen; hookgroepen die je zelf hebt toegevoegd blijven in hun oorspronkelijke volgorde behouden. Het `statusLine`/HUD-pad verandert niet. De in-process bridge van pi wordt niet beïnvloed. Zie `cli/commands/hook/command.ts` voor de routerimplementatie (intern aangeduid als "design 019") en `cli/platform/hooks-composer/` voor de materialisatielogica per leverancier.

### skills/

Symlinks naar `.agents/skills/`. Hierdoor zijn skills zichtbaar voor IDE's die uit `.claude/skills/` lezen, terwijl `.agents/` de single source of truth blijft.

### agents/

Subagentdefinities in het formaat voor de Agent-tool van Claude Code. Ze verwijzen naar de skillbestanden en bevatten het template voor `CHARTER_CHECK`.

---

## .agents/state/memories/: runtimestatus {#agentsstatememories-runtime-state}

Hier schrijven agents hun voortgang tijdens orchestratiesessies. Dit is de canonieke store voor coördinatiegeheugen; de CLI zoekt hier eerst en valt terug op de legacy-directory `.serena/memories/` voor projecten die vóór de verhuizing zijn gemaakt. Sessies en taakborden bevatten de sessie-ID; voortgangs- en resultaatbestanden bevatten agent, taak, run en sessie-ID. Dashboards volgen deze directory voor realtime-updates.

| Bestand | Eigenaar | Doel |
|------|-------|---------|
| `orchestrator-session-{sessionId}.md` | Orchestrator | Sessiemetadata: ID, status, starttijd, huidige fase |
| `task-board-{sessionId}.md` | Orchestrator | Taaktoewijzingen: agent, taak, prioriteit, status, afhankelijkheden |
| `progress-{agentId}-{taskId}-{runId}-{sessionId}.md` | Die run | Voortgang per beurt: acties, gelezen/gewijzigde bestanden, huidige status |
| `result-{agentId}-{taskId}-{runId}-{sessionId}.md` | Die run | Einduitvoer: voltooiingsstatus, samenvatting, gewijzigde bestanden, acceptatiecriteria |
| `session-metrics.md` | Orchestrator | Wezenlijke correcties en experiment-evidence |
| `experiment-ledger.md` | Orchestrator/QA | Regels met evidence voor daadwerkelijke experimenten |
| `session-work.md` | Work-workflow | Sessiestatus voor Work |
| `session-ultrawork.md` | Ultrawork-workflow | Fasebewaking voor Ultrawork |
| `session-cost-{sessionId}.md` | Systeem | Kostenregistratie voor spawns in de sessie |
| `archive/metrics-{date}.md` | Systeem | Gearchiveerde sessiemetrics (bewaartermijn 30 dagen) |

Paden naar memorybestanden en toolnamen kun je configureren in `.agents/mcp.json` via `memoryConfig`.

Serena's eigen onboardingmemories (`code_style.md`, `project_purpose.md` en vergelijkbare kennisbestanden) blijven in `.serena/memories/` en staan los van deze coördinatieartefacten.

---

## Structuur van de oh-my-agent-bronrepository

Werk je aan oh-my-agent zelf (en gebruik je het niet alleen), dan is de repository een monorepo:

```
oh-my-agent/
├── cli/                  ← CLI tool source (TypeScript, run with bun)
│   ├── cli.ts / bin/     ← CLI entry points
│   ├── commands/         ← User-facing command families
│   ├── platform/         ← Agent, vendor, skill, and hook adapters
│   ├── vendors/ / utils/ / types/
│   ├── package.json
│   └── install.sh        ← Bootstrap installer
├── web/                  ← Documentation site (Docusaurus)
│   ├── docs/             ← English documentation pages (base locale)
│   └── i18n/             ← Translated documentation pages
├── action/               ← GitHub Action for automated skill updates
├── docs/                 ← Translated READMEs and specifications
├── .agents/              ← EDITABLE in source repo (this IS the source)
├── .claude/              ← IDE integration
├── CLAUDE.md             ← Project instructions for Claude Code
└── package.json          ← Root workspace config
```

In de bronrepository mogen `.agents/`-wijzigingen worden aangebracht (dit is de SSOT-uitzondering voor de bronrepository zelf). De regels van `.agents/` die verbieden deze directory te wijzigen, gelden voor consumentenprojecten en niet voor de oh-my-agent-repository.

Ontwikkelcommando's (uitvoeren vanuit de repositoryroot):
- `bun run test`: CLI-tests (vitest)
- `bun run lint`: lint de CLI- en web-workspaces
- `bun run build`: CLI-build
- `bun run typecheck`: typecheck de CLI en web
- Commits moeten het conventionele commitformaat volgen (afgedwongen door commitlint)
