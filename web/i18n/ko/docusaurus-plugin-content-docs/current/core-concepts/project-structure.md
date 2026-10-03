---
title: 프로젝트 구조
description: oh-my-agent 설치의 독자를 위한 구조 지도입니다. .agents/의 SSOT, 대표 스킬 리소스, 워크플로우, 체크인된 에이전트 정의, 런타임 상태, 벤더 통합 계층, 소스 리포지토리 구조를 다룹니다.
---

# 프로젝트 구조

oh-my-agent을 설치하면 프로젝트에 두 가지 핵심 디렉토리 트리가 추가됩니다: `.agents/`(`.agents/state/memories/` 조율 저장소를 포함하는 단일 진실 원천)와 런타임 통합 계층(예: `.claude/`, `.cursor/`, `.codex/`)입니다. Serena를 코드 인텔리전스 프로바이더로 선택하면 Serena 온보딩 메모리를 위한 선택적 `.serena/` 디렉토리가 생길 수도 있습니다. 이 페이지는 문제를 해결할 때 중요한 공용 파일과 선택적·생성 경로를 설명합니다.

---

## 대표 디렉토리 트리

아래 트리는 공용 리소스와 대표적인 도메인 스킬을 자세히 보여줍니다. 현재 카탈로그에는 33개 스킬 디렉토리가 있으며, 생략된 스킬도 동일한 `SKILL.md`와 선택적인 `resources/`, `variants/` 또는 스킬별 디렉토리 패턴을 따릅니다. 생성 파일이나 선택 파일이 없을 때는 실제 `.agents/` 트리를 기준으로 판단하세요.

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

## .agents/: 진실의 원천

핵심 디렉토리입니다. 에이전트에 필요한 모든 것이 여기에 있습니다. 에이전트 동작과 관련된 유일한 디렉토리이며, 다른 모든 디렉토리는 여기서 파생됩니다.

### oma-config.cue 및 oma-config.yaml

**`oma-config.yaml`**: 중앙 설정 파일로 다음을 포함합니다.
- `language`: 응답 언어 코드 (en, ko, ja, zh, es, fr, de, pt, ru, nl, pl)
- `date_format`: 타임스탬프 형식 문자열 (`ISO`, `US`, `EU`; 기본값 `ISO`)
- `timezone`: IANA 시간대 식별자. 생략하면 시스템 시간대를 사용합니다.
- `model_preset`: 활성 모델 프리셋 키 (기본값 `auto`, 고정 또는 사용자 정의 프리셋)
- `providers`: 문서, 웹, 코드 인텔리전스, 시맨틱 메모리의 기능 프로바이더
- `auto_update_cli`: 백그라운드 업데이트 확인 (기본값 `true`, `false`로 옵트아웃)
- `telemetry`: 벤더 텔레메트리 옵트인 (기본값 `false`)
- `mcp.devtools_browsers`: 선택적인 브라우저 목록. 설정하지 않으면 기존 항목을 유지합니다.
- `agents`: 에이전트별 오버라이드 (선택, object 전용 `AgentSpec`)
- `models`: 사용자 정의 모델 슬러그 (선택)
- `custom_presets`: 사용자 정의 프리셋 (선택, `extends:` 사용 가능)

### skills/

스킬 전문성이 담겨 있는 곳입니다. 현재 카탈로그에는 `_shared` 리소스 외에 33개 스킬 디렉토리가 있으며, `all` 프리셋은 이 실제 트리에서 확장됩니다.

**`_shared/`**: 모든 에이전트가 사용하는 리소스입니다.
- `core/`: 라우팅, 컨텍스트 로딩, 프롬프트 구조, 명확화 프로토콜, 컨텍스트 예산, 난이도 평가, 추론 템플릿, 품질 원칙, 벤더 감지, 세션 메트릭, 공통 체크리스트, 학습된 교훈, API 컨트랙트 템플릿
- `runtime/`: 메모리 프로토콜, 이벤트 사양, 결과 계약, 벤더별 실행 프로토콜
- `conditional/`: 품질 점수 측정, 실험 원장 추적, 탐색 루프 프로토콜 (트리거 시에만 로드됨)

**`oma-{skill}/`**: 스킬별 디렉토리. 각각 다음을 포함합니다.
- `SKILL.md`: 레이어 1이며 스킬 라우팅 시 로드됩니다. 정체성, 라우팅, 핵심 규칙을 담습니다.
- `resources/`: 레이어 2입니다. 온디맨드로 로드되며 실행 프로토콜, 예제, 체크리스트, 오류 플레이북, 기술 스택, 스니펫, 템플릿을 담습니다.
- 일부 스킬은 추가 하위 디렉토리를 가집니다: `variants/`(backend/mobile 시드), `/stack-set`이 생성하는 `stack/` 레퍼런스, `reference/`(oma-design), 스킬별 스크립트와 설정.

### workflows/

슬래시 명령 동작을 정의하는 21개의 Markdown 파일. 각 파일에는 다음이 포함됩니다:
- `description`이 포함된 YAML 프론트매터
- 필수 규칙 섹션 (응답 언어, 단계 순서, MCP 도구 요구사항)
- 벤더 감지 지시사항
- 단계별 실행 프로토콜
- 게이트 정의 (지속 워크플로우용)

지속 워크플로우: `orchestrate.md`, `work.md`, `ultrawork.md`, `ralph.md`.
비지속 워크플로우에는 `plan.md`, `brainstorm.md`, `architecture.md`, `deepinit.md`, `review.md`, `debug.md`, `design.md`, `scm.md`, `tools.md`, `stack-set.md`, `convert.md`, `docs.md`, `explain.md`, `recap.md`, `schedule.md`, `video.md`가 포함됩니다.

### agents/

Task 도구(Claude Code) 또는 CLI를 통해 에이전트를 스폰할 때 사용하는 12개 서브에이전트 정의 파일입니다. 각 파일은 다음을 정의합니다:
- 프론트매터: `name`, `description`, `skills` (로드할 스킬)
- 실행 프로토콜 참조
- 차터 사전검증 (CHARTER_CHECK) 템플릿
- 아키텍처 요약
- 도메인별 규칙 (10개 규칙)
- 명시 사항: "`.agents/` 파일을 절대 수정하지 않는다"

### plan-\{sessionId\}.json

`/plan` 워크플로우가 생성합니다. 에이전트 할당, 우선순위, 의존성, 인수 기준이 포함된 구조화된 태스크 분해를 포함합니다. `/orchestrate`, `/work`, `/exec-plan`에서 사용됩니다.

사람이 읽는 보조 트래커는 `docs/plans/work/{NNN}-{name}.md`에 있으며 라이프사이클은 `Status` 필드로 관리합니다. 지속 설계 참조는 `docs/plans/designs/{NNN}-{name}.md`에 함께 둡니다.

### state/

지속 워크플로우의 활성 상태 파일입니다. 이 JSON 파일은 지속 워크플로우가 실행 중일 때만 존재합니다. `state/memories/` 하위 디렉토리가 표준 조율 메모리 저장소이며, 오케스트레이터 세션 상태, 태스크 보드, 에이전트별 진행·결과 파일, 세션 메트릭, 비용 텔레메트리를 담습니다. 대시보드가 이 경로를 감시하고 CLI가 먼저 해석합니다(오래된 프로젝트는 레거시 `.serena/memories/`로 폴백). [`.agents/state/memories/: 런타임 상태`](#agentsstatememories-런타임-상태)를 참고하세요. 파일을 삭제하거나 "workflow done"이라고 말하면 워크플로우가 비활성화됩니다.

### results/

에이전트 결과 파일. 완료된 에이전트가 상태(completed/failed), 요약, 변경된 파일, 인수 기준 체크리스트를 기록합니다. 오케스트레이터가 수집 시, 대시보드가 모니터링 시 읽습니다.

### mcp.json

다음을 포함하는 MCP 서버 설정:
- 서버 정의 (Serena 등)
- 메모리 설정: `memoryConfig.provider`, `memoryConfig.basePath`, `memoryConfig.tools` (읽기/쓰기/편집 도구 이름)
- `/tools` 관리를 위한 도구 그룹 정의

---

## .claude/: IDE 통합

이 디렉토리는 oh-my-agent을 Claude Code와 기타 IDE에 연결합니다.

### settings.json

Claude Code용 훅과 권한을 등록합니다. 이제 각 이벤트 훅 항목은 `oma hook run` 정규 ABI를 씁니다.

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

`statusLine` 항목은 `oma hook run`을 거치지 않고 `bun`을 직접 호출하는 경로로 남아 있습니다(표시 경로라 지연을 아낍니다).

### hooks/

벤더의 `hooks/` 디렉토리에는 **런타임에 그 디렉토리에서 실제로 실행되거나 읽히는 파일만** 들어갑니다. 핸들러 체인 자체(키워드 감지, 지속 모드, 스킬 주입 등)는 `oma hook run`을 통해 `oma` 바이너리 안에서 인프로세스로 동작합니다. 핸들러 `.ts` 파일은 빌드 시점에 CLI로 번들되며, 벤더 디렉토리에는 실체화되지 않습니다.

**`oma-hook.sh`**: `oma link` / `oma install` / `oma update`가 작성하는 생성 래퍼 스크립트입니다. 모든 벤더 훅 이벤트가 이 파일을 거쳐 라우팅됩니다. 런타임 해석 순서는 `$OMA_BIN`(명시적 오버라이드), `command -v oma`(PATH), `$HOME/.bun/bin`이나 `$HOME/.local/share/mise/shims` 같은 알려진 설치 디렉토리(GUI로 실행된 에이전트는 최소한의 PATH만 물려받습니다), 그리고 `exit 0`(fail-open, 에이전트를 절대 막지 않음) 순입니다. 머신에 종속된 값을 스크립트에 쓰지 않으므로 파일은 모든 개발자에게 바이트 단위로 동일하며 커밋해도 안전합니다. `"$@"`를 그대로 전달하기 때문에 `--vendor`, `--event`, `--matcher` 인자가 `oma hook run`까지 변형 없이 도달합니다. 프로젝트 설치와 글로벌 설치가 같은 이벤트를 등록했을 때 이중 발동을 막는 자체 중복 제거 프리앰블도 포함합니다.

**`hud.ts`**: 상태 바에 `[OMA]` 인디케이터를 렌더링해 모델명, 컨텍스트 사용량(색상 코드: 녹색/노란색/빨간색), 활성 워크플로우 상태를 표시합니다. 렌더링 지연을 아끼려고 `oma hook run`을 거치지 않고 `statusLine` 아래에 직접 등록됩니다. 변형(variant)이 `statusLine`이나 hud 전용 이벤트를 등록하는 벤더(예: claude, antigravity, qwen)에만 실체화됩니다. 자기 설치 경로를 보고 벤더 방언을 판단하므로, 벤더별 사본이 실제로 필요합니다.

**`filter-test-output.sh`**: 시끄러운 테스트 러너 출력을 다듬는 셸 필터입니다. 인프로세스 test-filter 핸들러가 감지한 Bash 테스트 명령을 `<hookDir>/filter-test-output.sh`로 파이프하도록 다시 쓰므로, `test-filter.ts`를 등록하는 모든 벤더(cursor를 제외한 전부)에 이 파일이 실체화됩니다.

#### 핸들러 로직이 실제로 있는 곳

핸들러 소스의 SSOT는 `.agents/hooks/core/`이며, `oma hook run`을 통해 인프로세스로 동작합니다.

**`keyword-detector.ts`**: 키워드 감지를 담당하는 순수 핸들러(`run(input, ctx): HandlerResult | null`)입니다. 동작은 다음과 같습니다.
1. 입력을 정제합니다 (코드 블록, 인용 문자열, 붙여넣은 시스템 에코 블록 제거)
2. 정제된 입력을 트리거 `keywords`(리터럴) 및 `patterns`(정규식)와 대조해 스캔합니다
3. 각 매치 주변 60자 윈도우에서 정보성 패턴을 확인합니다
4. 강화 가드를 적용합니다 (동일 워크플로우가 60초 안에 2회 이상 트리거되면 억제)
5. `[OMA WORKFLOW: ...]` 또는 `[OMA PERSISTENT MODE: ...]`를 주입하는 `context` 결과를 반환합니다

**`persistent-mode.ts`**: `.agents/state/`의 활성 상태 파일을 확인하고 지속 워크플로우 실행을 강제하는 순수 핸들러(`run()`)입니다. `Stop` 이벤트에서 `oma hook run`을 통해 인프로세스로 호출됩니다.

**`scm-guard.ts`**: `PreToolUse`(Bash/셸 도구)에서 동작하는 순수 핸들러(`run()`)로, 시크릿일 가능성이 있는 파일의 `git add`를 거부합니다. `.agents/skills/oma-scm/config/commit-config.yaml`의 `forbidden_patterns`에서 `allowed_exceptions`를 뺀 목록을 강제합니다(설정이 없으면 내장 기본값을 씁니다). claude, codex, cursor, grok, kimi, kiro, qwen에서는 체인상 `test-filter`보다 먼저 실행되고, opencode 브릿지에서는 `tool.execute.before`가 예외를 던져 차단하며, pi 브릿지에서는 `tool_call`이 `{ block: true, reason }`을 반환합니다. 사용자가 명시적으로 승인한 뒤 명령 앞에 `OMA_SCM_ALLOW_SECRETS=1`을 붙이면 가드를 우회합니다. 광범위 스테이징(`git add -A` / `git add .`)은 의도적으로 막지 않는데, 이 규칙은 훅이 관찰할 수 없는 사용자 동의에 달려 있기 때문입니다.

**`code-intelligence-guard.ts`**: `PreToolUse`에서 동작하는 순수 핸들러(`run()`)로, "Code Search" 규칙을 기계적으로 강제합니다. `providers.code_intelligence`가 `serena`(또는 `gortex`)로 해석되고 `providers.code_intelligence_guard`가 `off`가 아닌 동안에는 네이티브 검색 도구(Claude Code의 `Grep`, `Glob`)와, 맨 앞에 오는 바이너리가 재귀 코드 검색인 셸 명령(`rg`, `ag`, `ack`, `fd`, `grep -r`, `find -name`/`-path`, `git grep`)을 거부하며, 거부 사유는 대신 써야 할 프로바이더 도구(`search_for_pattern`, `find_file`, `find_symbol`)의 이름을 알려 줍니다. 재귀가 아닌 `grep`(파이프 필터, 단일 파일), 이름 조건이 없는 `find`, 읽기는 어떤 경우에도 건드리지 않습니다. claude, codex, cursor, grok, kimi, kiro, qwen에서는 `scm-guard` 바로 뒤에 등록되며, 설치 프로그램이 체인의 matcher를 하나로 합치므로 Claude의 `PreToolUse` 항목은 `Bash|Grep|Glob`이 됩니다. `OMA_CI_ALLOW_NATIVE=1`이 들어 있는 셸 명령은 여전히 가드를 우회하지만, 이는 프로젝트 밖 리소스나 가드가 인식하지 못한 무시 대상 경로를 검색할 때 쓰는 운영자용 예외 경로일 뿐입니다. 거부 사유는 이 접두사를 언급하지 않으며, 프로젝트 소스용 폴백이 아닙니다.

**`triggers.json`**: 키워드-워크플로우 매핑으로, 빌드 시점에 `oma` 바이너리에 정적으로 인라인됩니다(원본은 `.agents/hooks/core/triggers.json`). 다음을 정의합니다.
- `workflows`: 워크플로우 이름에서 `{ persistent: boolean, keywords: { language: [...] }, patterns?: { language: [...] }, explicit?: [...] }`로의 매핑. `keywords`는 리터럴 문구이며, `patterns`는 원시 정규식 문자열입니다(`iu` 플래그로 컴파일됨). `explicit`(지속 워크플로우 전용)은 명시적 호출로 인정되는 키워드를 나열하며, 이 키워드만 지속 모드를 활성화합니다. 나머지 일치는 모두 제안으로 주입됩니다.
- `informationalPatterns`: 질문을 나타내는 문구 (자동 감지에서 필터링됨)
- `excludedWorkflows`: 명시적 `/command` 호출이 필요한 워크플로우

`keywords`, `patterns`, `informationalPatterns` 내 언어 섹션은 다음 컨벤션을 따릅니다:
- `*`: 공통/영어.
- `en`: 기능적으로 `*`와 동일합니다.
- `ko`/`ja`/`zh`/etc.: 언어별 표현.

모든 섹션은 항상 로드되며, `.agents/oma-config.yaml`의 `language` 설정은 응답 언어만 제어합니다. 단어 경계는 키워드 자체에 따라 달라집니다. ASCII 키워드는 전체 단어일 때만 일치하고, ASCII가 아닌 텍스트를 포함한 키워드는 부분 문자열로 일치합니다.

#### 벤더별 실체화: 변경 전과 변경 후

예전 설치는 `.agents/hooks/core/` 전체(약 20개 파일)를 모든 벤더의 훅 디렉토리에 복사했습니다. 인프로세스 디스패치 때문에 그중 대부분은 죽은 파일이었는데도 그랬습니다.

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

이제 설치 프로그램은 벤더의 변형 JSON(`cli/platform/hooks-composer.ts`의 `requiredVariantScripts`)에서 화이트리스트를 뽑아, 해당 벤더가 실행하거나 읽는 파일만 실체화합니다.

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

| 벤더 | 실체화되는 파일 | 이유 |
|---|---|---|
| claude, qwen | `oma-hook.sh`, `hud.ts`, `filter-test-output.sh` | statusLine + test-filter |
| codex, grok, kiro | `oma-hook.sh`, `filter-test-output.sh` | test-filter만 있고 statusLine 없음 |
| cursor | `oma-hook.sh` | statusLine도 test-filter도 없음 |
| commandcode | `oma-hook.sh` | `Stop`만 지원합니다. Command Code에는 프롬프트 이벤트가 없고 PreToolUse가 입력을 다시 쓸 수 없습니다 ([훅 레퍼런스](https://commandcode.ai/docs/hooks/reference)) |
| antigravity | 프로젝트에는 없음. `hud.ts`와 코어 훅은 `~/.gemini/antigravity-cli/hooks/`로 복사됩니다 | agy는 설정을 HOME에서만 읽고 워크스페이스 훅은 `.agents/hooks.json`에서 읽는데, 이 파일은 핸들러를 `.agents/hooks/core/`에서 바로 실행합니다. 프로젝트의 `.gemini/antigravity-cli/`는 절대 로드되지 않습니다 (`homeOnly` 변형 플래그) |
| pi | `.pi/extensions/oma/` 아래에 `.agents/hooks/core/` 전체 | pi 브릿지는 설정 훅 대신 핸들러를 서브프로세스로 스폰합니다 |

대상 디렉토리는 복사 전에 비워지므로, 예전 설치에서 `oma install` / `oma update` / `oma link`를 다시 실행하면 남아 있던 전체 사본 파일이 자동으로 정리됩니다.

#### 핸들러 체인을 따로 떼어 디버깅하기

실제 에이전트 세션을 건드리지 않고도 아무 핸들러 체인이나 실제 페이로드로 실행해 볼 수 있습니다.

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

`oma hook run`은 항상 0으로 종료합니다(fail-open). stdout이 비어 있으면 해당 이벤트에서 체인이 아무 일도 하지 않았다는 뜻입니다. 핸들러가 발동하면 벤더 방언 JSON(kiro 프롬프트의 경우에는 일반 텍스트)이 stdout으로 출력됩니다.

#### 019 이전 설치에서 마이그레이션

예전 방식의 `bun "$CLAUDE_PROJECT_DIR/.claude/hooks/keyword-detector.ts"` 항목이 남아 있는 기존 설치는 다음에 `oma install`, `oma update`, `oma link`를 실행할 때 자동으로 마이그레이션됩니다. 설치 프로그램은 마커 기반으로 교체하므로, OMA가 관리하는 훅 그룹(`name` / `command` 패턴으로 식별)만 교체되고 사용자가 직접 추가한 훅 그룹은 원래 순서 그대로 보존됩니다. `statusLine` / hud 경로는 바뀌지 않습니다. pi 인프로세스 브릿지도 영향을 받지 않습니다. 라우터 구현은 `cli/commands/hook/command.ts`(내부적으로 "design 019"라고 부릅니다)를, 벤더별 실체화 로직은 `cli/platform/hooks-composer/`를 참고하세요.

### skills/

`.agents/skills/`를 가리키는 심볼릭 링크. `.claude/skills/`에서 읽는 IDE에 스킬을 노출하면서 `.agents/`를 단일 진실 원천으로 유지합니다.

### agents/

Claude Code의 Agent 도구용으로 포맷된 서브에이전트 정의. 스킬 파일을 참조하며 CHARTER_CHECK 템플릿을 포함합니다.

---

## .agents/state/memories/: 런타임 상태

오케스트레이션 세션 중 에이전트가 진행 상황을 기록하는 곳입니다. 여기가 표준 조율 메모리 저장소이며, CLI가 이 경로를 먼저 해석하고, 경로가 옮겨지기 전에 만들어진 프로젝트에서는 레거시 `.serena/memories/` 경로로 폴백합니다. 세션과 태스크 보드 파일에는 세션 ID가 들어가며 진행 및 결과 파일에는 에이전트, 태스크, 실행, 세션 ID가 들어갑니다. 이 디렉토리는 실시간 업데이트를 위해 대시보드가 감시합니다.

| 파일 | 소유자 | 목적 |
|------|--------|------|
| `orchestrator-session-{sessionId}.md` | 오케스트레이터 | 세션 메타데이터: ID, 상태, 시작 시간, 현재 단계 |
| `task-board-{sessionId}.md` | 오케스트레이터 | 태스크 할당: 에이전트, 태스크, 우선순위, 상태, 의존성 |
| `progress-{agentId}-{taskId}-{runId}-{sessionId}.md` | 해당 실행 | 턴별 업데이트: 수행한 작업, 읽은/수정한 파일, 현재 상태 |
| `result-{agentId}-{taskId}-{runId}-{sessionId}.md` | 해당 실행 | 최종 출력: 완료 상태, 요약, 변경된 파일, 인수 기준 |
| `session-metrics.md` | 오케스트레이터 | 중요한 수정과 실험 증거 |
| `experiment-ledger.md` | 오케스트레이터/QA | 실제 실험의 증거 행 |
| `session-work.md` | Work 워크플로우 | Work 전용 세션 상태 |
| `session-ultrawork.md` | Ultrawork 워크플로우 | Ultrawork 전용 단계 추적 |
| `session-cost-{sessionId}.md` | 시스템 | 세션별 스폰 비용 텔레메트리 |
| `archive/metrics-{date}.md` | 시스템 | 보관된 세션 메트릭 (30일 보존) |

메모리 파일 경로와 도구 이름은 `.agents/mcp.json`의 `memoryConfig`를 통해 설정할 수 있습니다.

Serena 자체의 온보딩 메모리(`code_style.md`, `project_purpose.md` 및 유사 지식 파일)는 `.serena/memories/`에 남으며 이 조율 아티팩트와 별개입니다.

---

## oh-my-agent 소스 리포지토리 구조

oh-my-agent 자체를 개발하는 경우(단순 사용이 아닌), 리포지토리는 모노레포입니다:

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

소스 리포에서는 `.agents/` 수정이 허용됩니다 (이것이 소스 리포 자체에 대한 SSOT 예외입니다). `.agents/`를 수정하지 않는다는 규칙은 소비자 프로젝트에 적용되며, oh-my-agent 리포지토리에는 적용되지 않습니다.

개발 명령어:
- `bun run test`: CLI 테스트 (vitest)
- `bun run lint`: CLI와 web 워크스페이스 린트
- `bun run build`: CLI 빌드
- `bun run typecheck`: CLI와 web 타입 검사
- 커밋은 conventional commit 형식을 따라야 합니다 (commitlint 강제)
