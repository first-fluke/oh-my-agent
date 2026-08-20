---
title: 프로젝트 구조
description: oh-my-agent 설치의 완전한 디렉토리 트리와 모든 파일/디렉토리 설명입니다. .agents/ (config, skills, workflows, agents, state, results, mcp.json), .claude/ (settings, hooks, skills 심볼릭 링크, agents), .serena/memories/, oh-my-agent 소스 리포지토리 구조를 다룹니다.
---

# 프로젝트 구조

oh-my-agent을 설치하면 프로젝트에 세 가지 디렉토리 트리가 추가됩니다: `.agents/` (단일 진실 원천), `.claude/` (IDE 통합 레이어), `.serena/` (런타임 상태). 이 페이지에서는 모든 파일과 그 용도를 설명합니다.

---

## 전체 디렉토리 트리

```
your-project/
├── .agents/                          ← 단일 진실 원천 (SSOT)
│   ├── config/
│   │   └── oma-config.yaml    ← 언어, 시간대, CLI 매핑
│   │
│   ├── skills/
│   │   ├── _shared/                  ← 모든 에이전트가 사용하는 리소스
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
│   │   │   │       ├── gemini.md
│   │   │   │       ├── codex.md
│   │   │   │       └── qwen.md
│   │   │   └── conditional/
│   │   │       ├── quality-score.md
│   │   │       ├── experiment-ledger.md
│   │   │       └── exploration-loop.md
│   │   │
│   │   ├── oma-frontend/
│   │   │   ├── SKILL.md
│   │   │   └── resources/
│   │   │       ├── execution-protocol.md
│   │   │       ├── tech-stack.md
│   │   │       ├── tailwind-rules.md
│   │   │       ├── component-template.tsx
│   │   │       ├── snippets.md
│   │   │       ├── error-playbook.md
│   │   │       ├── checklist.md
│   │   │       └── examples.md
│   │   │
│   │   ├── oma-backend/
│   │   │   ├── SKILL.md
│   │   │   ├── resources/
│   │   │   │   ├── execution-protocol.md
│   │   │   │   ├── examples.md
│   │   │   │   ├── orm-reference.md
│   │   │   │   ├── checklist.md
│   │   │   │   └── error-playbook.md
│   │   │   └── stack/                 ← /stack-set으로 생성됨
│   │   │       ├── stack.yaml
│   │   │       ├── tech-stack.md
│   │   │       ├── snippets.md
│   │   │       └── api-template.*
│   │   │
│   │   ├── oma-mobile/
│   │   │   ├── SKILL.md
│   │   │   └── resources/
│   │   │       ├── execution-protocol.md
│   │   │       ├── tech-stack.md
│   │   │       ├── snippets.md
│   │   │       ├── screen-template.dart
│   │   │       ├── checklist.md
│   │   │       ├── error-playbook.md
│   │   │       └── examples.md
│   │   │
│   │   ├── oma-db/
│   │   │   ├── SKILL.md
│   │   │   └── resources/
│   │   │       ├── execution-protocol.md
│   │   │       ├── document-templates.md
│   │   │       ├── anti-patterns.md
│   │   │       ├── vector-db.md
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
│   │   │       └── examples.md
│   │   │
│   │   ├── oma-debug/
│   │   │   ├── SKILL.md
│   │   │   └── resources/
│   │   │       ├── execution-protocol.md
│   │   │       ├── common-patterns.md
│   │   │       ├── debugging-checklist.md
│   │   │       ├── bug-report-template.md
│   │   │       ├── error-playbook.md
│   │   │       └── examples.md
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
│   │   ├── oma-translator/
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
│   │   ├── oma-orchestrator/
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
│   ├── workflows/
│   │   ├── orchestrate.md             ← 영구 모드: 자동화된 병렬 실행
│   │   ├── work.md             ← 영구 모드: 단계별 조율
│   │   ├── ultrawork.md              ← 영구 모드: 5단계 품질 워크플로우
│   │   ├── plan.md                   ← PM 태스크 분해
│   │   ├── exec-plan.md              ← 실행 계획 관리
│   │   ├── brainstorm.md             ← 디자인 우선 아이디에이션
│   │   ├── deepinit.md               ← 프로젝트 초기화
│   │   ├── review.md                 ← QA 리뷰 파이프라인
│   │   ├── debug.md                  ← 구조화된 디버깅
│   │   ├── design.md                 ← 7단계 디자인 워크플로우
│   │   ├── scm.md                 ← Conventional commits
│   │   ├── tools.md                  ← MCP 도구 관리
│   │   └── stack-set.md              ← 기술 스택 설정
│   │
│   ├── agents/
│   │   ├── backend-engineer.md        ← 서브에이전트 정의: 백엔드
│   │   ├── frontend-engineer.md       ← 서브에이전트 정의: 프론트엔드
│   │   ├── mobile-engineer.md         ← 서브에이전트 정의: 모바일
│   │   ├── db-engineer.md             ← 서브에이전트 정의: 데이터베이스
│   │   ├── qa-reviewer.md             ← 서브에이전트 정의: QA
│   │   ├── debug-investigator.md      ← 서브에이전트 정의: 디버그
│   │   └── pm-planner.md             ← 서브에이전트 정의: PM
│   │
│   ├── results/plan-{sessionId}.json                      ← 생성된 계획 출력 (/plan으로 생성)
│   ├── state/                         ← 활성 워크플로우 상태 파일
│   │   ├── orchestrate-state.json     ← (워크플로우 활성 시에만 존재)
│   │   ├── ultrawork-state.json
│   │   └── work-state.json
│   ├── results/                       ← 에이전트 결과 파일
│   │   └── result-{agent}.md          ← (완료된 에이전트가 생성)
│   └── mcp.json                       ← MCP 서버 설정
│
├── .claude/                           ← IDE 통합 레이어
│   ├── settings.json                  ← 훅 등록 및 권한
│   ├── hooks/
│   │   ├── triggers.json              ← 키워드-워크플로우 매핑 (11개 언어)
│   │   ├── keyword-detector.ts        ← 자동 감지 로직
│   │   ├── persistent-mode.ts         ← 영구 워크플로우 강제
│   │   └── hud.ts                     ← [OMA] 상태표시줄 인디케이터
│   ├── skills/                        ← 심볼릭 링크 → .agents/skills/
│   │   ├── oma-frontend -> ../../.agents/skills/oma-frontend
│   │   ├── oma-backend -> ../../.agents/skills/oma-backend
│   │   └── ...
│   └── agents/                        ← Claude Code용 서브에이전트 정의
│       ├── backend-engineer.md
│       ├── frontend-engineer.md
│       └── ...
│
└── .serena/                           ← 런타임 상태 (Serena MCP)
    └── memories/
        ├── orchestrator-session.md    ← 세션 ID, 상태, 단계 추적
        ├── task-board.md              ← 태스크 할당 및 상태
        ├── progress-{agent}.md        ← 에이전트별 진행 상황 업데이트
        ├── result-{agent}.md          ← 에이전트별 최종 출력
        ├── session-metrics.md         ← Clarification Debt 및 Quality Score 추적
        ├── experiment-ledger.md       ← 실험 추적 (조건부)
        ├── session-work.md      ← Work 워크플로우 세션 상태
        ├── session-ultrawork.md       ← Ultrawork 워크플로우 세션 상태
        ├── tool-overrides.md          ← 임시 도구 제한 (/tools --temp)
        └── archive/
            └── metrics-{date}.md      ← 보관된 세션 메트릭
```

---

## .agents/: 진실의 원천

핵심 디렉토리입니다. 에이전트에 필요한 모든 것이 여기에 있습니다. 에이전트 동작과 관련된 유일한 디렉토리이며, 다른 모든 디렉토리는 여기서 파생됩니다.

### config/

**`oma-config.yaml`**: 중앙 설정 파일로 다음을 포함합니다.
- `language`: 응답 언어 코드 (en, ko, ja, zh, es, fr, de, pt, ru, nl, pl)
- `date_format`: 타임스탬프 형식 문자열 (기본값: `YYYY-MM-DD`)
- `timezone`: 시간대 식별자 (기본값: `UTC`)
- `model_preset`: 활성 모델 프리셋 키 (빌트인 또는 사용자 정의)
- `agents`: 에이전트별 오버라이드 (선택, object 전용 `AgentSpec`)
- `models`: 사용자 정의 모델 슬러그 (선택)
- `custom_presets`: 사용자 정의 프리셋 (선택, `extends:` 사용 가능)

### skills/

에이전트 전문성이 담겨 있는 곳입니다. 총 22개 디렉토리: 21개 에이전트 스킬 + 1개 공유 리소스 디렉토리.

**`_shared/`**: 모든 에이전트가 사용하는 리소스입니다.
- `core/`: 라우팅, 컨텍스트 로딩, 프롬프트 구조, 명확화 프로토콜, 컨텍스트 예산, 난이도 평가, 추론 템플릿, 품질 원칙, 벤더 감지, 세션 메트릭, 공통 체크리스트, 학습된 교훈, API 컨트랙트 템플릿
- `runtime/`: CLI 서브에이전트용 메모리 프로토콜, 벤더별 실행 프로토콜 (claude, codex, qwen)
- `conditional/`: 품질 점수 측정, 실험 원장 추적, 탐색 루프 프로토콜 (트리거 시에만 로드됨)

**`oma-{agent}/`**: 에이전트별 스킬 디렉토리. 각각 다음을 포함합니다.
- `SKILL.md` (~800바이트): 레이어 1입니다. 항상 로드되며 아이덴티티, 라우팅, 핵심 규칙을 담습니다.
- `resources/`: 레이어 2입니다. 온디맨드로 로드되며 실행 프로토콜, 예제, 체크리스트, 오류 플레이북, 기술 스택, 스니펫, 템플릿을 담습니다.
- 일부 에이전트는 추가 하위 디렉토리를 가집니다: `stack/` (oma-backend, /stack-set으로 생성), `reference/` (oma-design), `scripts/` (oma-orchestrator), `config/` (oma-orchestrator, oma-scm).

### workflows/

슬래시 명령 동작을 정의하는 16개의 Markdown 파일. 각 파일에는 다음이 포함됩니다:
- `description`이 포함된 YAML 프론트매터
- 필수 규칙 섹션 (응답 언어, 단계 순서, MCP 도구 요구사항)
- 벤더 감지 지시사항
- 단계별 실행 프로토콜
- 게이트 정의 (영구 워크플로우용)

영구 워크플로우: `orchestrate.md`, `work.md`, `ultrawork.md`.
비영구: `plan.md`, `exec-plan.md`, `brainstorm.md`, `deepinit.md`, `review.md`, `debug.md`, `design.md`, `scm.md`, `tools.md`, `stack-set.md`.

### agents/

Task 도구(Claude Code) 또는 CLI를 통해 에이전트를 스폰할 때 사용하는 서브에이전트 정의 파일입니다. 각 파일은 다음을 정의합니다:
- 프론트매터: `name`, `description`, `skills` (로드할 스킬)
- 실행 프로토콜 참조
- 차터 사전검증 (CHARTER_CHECK) 템플릿
- 아키텍처 요약
- 도메인별 규칙 (10개 규칙)
- 명시 사항: "`.agents/` 파일을 절대 수정하지 않는다"

### plan-\{sessionId\}.json

`/plan` 워크플로우가 생성합니다. 에이전트 할당, 우선순위, 의존성, 인수 기준이 포함된 구조화된 태스크 분해를 포함합니다. `/orchestrate`, `/work`, `/exec-plan`에서 사용됩니다.

### state/

영구 워크플로우의 활성 상태 파일입니다. 이 JSON 파일은 영구 워크플로우가 실행 중일 때만 존재합니다. 파일을 삭제하거나 "workflow done"이라고 말하면 워크플로우가 비활성화됩니다.

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

Claude Code용 훅과 권한을 등록합니다. 이제 각 이벤트 훅 항목은 `oma hook` 정규 ABI를 씁니다.

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

`statusLine` 항목은 `oma hook`을 거치지 않고 `bun`을 직접 호출하는 경로로 남아 있습니다(표시 경로라 지연을 아낍니다).

### hooks/

벤더의 `hooks/` 디렉토리에는 **런타임에 그 디렉토리에서 실제로 실행되거나 읽히는 파일만** 들어갑니다. 핸들러 체인 자체(키워드 감지, 영구 모드, 스킬 주입 등)는 `oma hook`을 통해 `oma` 바이너리 안에서 인프로세스로 동작합니다. 핸들러 `.ts` 파일은 빌드 시점에 CLI로 번들되며, 벤더 디렉토리에는 실체화되지 않습니다.

**`oma-hook.sh`**: `oma link` / `oma install` / `oma update`가 작성하는 생성 래퍼 스크립트입니다. 모든 벤더 훅 이벤트가 이 파일을 거쳐 라우팅됩니다. 런타임 해석 순서는 `$OMA_BIN`(명시적 오버라이드), `command -v oma`(PATH), `$HOME/.bun/bin`이나 `$HOME/.local/share/mise/shims` 같은 알려진 설치 디렉토리(GUI로 실행된 에이전트는 최소한의 PATH만 물려받습니다), 그리고 `exit 0`(fail-open, 에이전트를 절대 막지 않음) 순입니다. 머신에 종속된 값을 스크립트에 쓰지 않으므로 파일은 모든 개발자에게 바이트 단위로 동일하며 커밋해도 안전합니다. `"$@"`를 그대로 전달하기 때문에 `--vendor`, `--event`, `--matcher` 인자가 `oma hook`까지 변형 없이 도달합니다. 프로젝트 설치와 글로벌 설치가 같은 이벤트를 등록했을 때 이중 발동을 막는 자체 중복 제거 프리앰블도 포함합니다.

**`hud.ts`**: 상태 바에 `[OMA]` 인디케이터를 렌더링해 모델명, 컨텍스트 사용량(색상 코드: 녹색/노란색/빨간색), 활성 워크플로우 상태를 표시합니다. 렌더링 지연을 아끼려고 `oma hook`을 거치지 않고 `statusLine` 아래에 직접 등록됩니다. 변형(variant)이 `statusLine`이나 hud 전용 이벤트를 등록하는 벤더(claude, antigravity, qwen, gemini)에만 실체화됩니다. 자기 설치 경로를 보고 벤더 방언을 판단하므로, 벤더별 사본이 실제로 필요합니다.

**`filter-test-output.sh`**: 시끄러운 테스트 러너 출력을 다듬는 셸 필터입니다. 인프로세스 test-filter 핸들러가 감지한 Bash 테스트 명령을 `<hookDir>/filter-test-output.sh`로 파이프하도록 다시 쓰므로, `test-filter.ts`를 등록하는 모든 벤더(cursor를 제외한 전부)에 이 파일이 실체화됩니다.

#### 핸들러 로직이 실제로 있는 곳

핸들러 소스의 SSOT는 `.agents/hooks/core/`이며, `oma hook`을 통해 인프로세스로 동작합니다.

**`keyword-detector.ts`**: 키워드 감지를 담당하는 순수 핸들러(`run(input, ctx): HandlerResult | null`)입니다. 동작은 다음과 같습니다.
1. 입력을 정제합니다 (코드 블록, 인용 문자열, 붙여넣은 시스템 에코 블록 제거)
2. 정제된 입력을 트리거 `keywords`(리터럴) 및 `patterns`(정규식)와 대조해 스캔합니다
3. 각 매치 주변 60자 윈도우에서 정보성 패턴을 확인합니다
4. 강화 가드를 적용합니다 (동일 워크플로우가 60초 안에 2회 이상 트리거되면 억제)
5. `[OMA WORKFLOW: ...]` 또는 `[OMA PERSISTENT MODE: ...]`를 주입하는 `context` 결과를 반환합니다

**`persistent-mode.ts`**: `.agents/state/`의 활성 상태 파일을 확인하고 영구 워크플로우 실행을 강제하는 순수 핸들러(`run()`)입니다. `Stop` 이벤트에서 `oma hook`을 통해 인프로세스로 호출됩니다.

**`scm-guard.ts`**: `PreToolUse`(Bash/셸 도구)에서 동작하는 순수 핸들러(`run()`)로, 시크릿일 가능성이 있는 파일의 `git add`를 거부합니다. `.agents/skills/oma-scm/config/commit-config.yaml`의 `forbidden_patterns`에서 `allowed_exceptions`를 뺀 목록을 강제합니다(설정이 없으면 내장 기본값을 씁니다). claude, codex, cursor, grok, kimi, kiro, qwen에서는 체인상 `test-filter`보다 먼저 실행되고, opencode 브릿지에서는 `tool.execute.before`가 예외를 던져 차단하며, pi 브릿지에서는 `tool_call`이 `{ block: true, reason }`을 반환합니다. 사용자가 명시적으로 승인한 뒤 명령 앞에 `OMA_SCM_ALLOW_SECRETS=1`을 붙이면 가드를 우회합니다. 광범위 스테이징(`git add -A` / `git add .`)은 의도적으로 막지 않는데, 이 규칙은 훅이 관찰할 수 없는 사용자 동의에 달려 있기 때문입니다.

**`triggers.json`**: 키워드-워크플로우 매핑으로, 빌드 시점에 `oma` 바이너리에 정적으로 인라인됩니다(원본은 `.agents/hooks/core/triggers.json`). 다음을 정의합니다.
- `workflows`: 워크플로우 이름에서 `{ persistent: boolean, keywords: { language: [...] }, patterns?: { language: [...] } }`로의 매핑. `keywords`는 리터럴 문구이며, `patterns`는 원시 정규식 문자열입니다(`iu` 플래그로 컴파일됨).
- `informationalPatterns`: 질문을 나타내는 문구 (자동 감지에서 필터링됨)
- `excludedWorkflows`: 명시적 `/command` 호출이 필요한 워크플로우
- `cjkScripts`: CJK 스크립트를 사용하는 언어 코드 (ko, ja, zh)

`keywords`, `patterns`, `informationalPatterns` 내 언어 섹션은 다음 컨벤션을 따릅니다:
- `*`: 공통/영어. `.agents/oma-config.yaml`의 `language` 설정과 무관하게 항상 로드됩니다.
- `en`: 하위 호환성을 위해 로드됩니다. 기능적으로 `*`와 동일하며, 새로운 영어 콘텐츠는 `*`에 추가해야 합니다.
- `ko`/`ja`/`zh`/etc.: 언어별. `.agents/oma-config.yaml`에 `language: <code>`가 설정된 경우에만 로드됩니다.

#### 벤더별 실체화: 변경 전과 변경 후

예전 설치는 `.agents/hooks/core/` 전체(약 20개 파일)를 모든 벤더의 훅 디렉토리에 복사했습니다. 인프로세스 디스패치 때문에 그중 대부분은 죽은 파일이었는데도 그랬습니다.

```
# 변경 전 — 모든 벤더 hookDir (.claude/hooks, .codex/hooks, .cursor/hooks, …)
hooks/
├── oma-hook.sh            ← 실행됨 (이벤트 디스패치)
├── hud.ts                 ← 실행됨 (statusLine)
├── filter-test-output.sh  ← 읽힘 (test-filter 파이프 대상)
├── keyword-detector.ts    ← 죽은 사본 (oma hook으로 인프로세스 실행)
├── persistent-mode.ts     ← 죽은 사본
├── skill-injector.ts      ← 죽은 사본
├── state-boundary.ts      ← 죽은 사본
├── test-filter.ts         ← 죽은 사본
├── serena-primer.ts       ← 죽은 사본
├── triggers.json          ← 죽은 사본 (oma 바이너리에 인라인됨)
├── types.ts, constants.ts, fs-utils.ts, hook-output.ts,
│   agentmemory-client.ts, agy-input.ts, grok-context.ts,
│   inject-log.ts, state-emit.ts, state-marker.ts,
│   vendor-renderer.ts     ← 죽은 사본 (핸들러 체인 내부 구현)
└── …
```

이제 설치 프로그램은 벤더의 변형 JSON(`cli/platform/hooks-composer.ts`의 `requiredVariantScripts`)에서 화이트리스트를 뽑아, 해당 벤더가 실행하거나 읽는 파일만 실체화합니다.

```
# 변경 후
.claude/hooks/              .codex/hooks/  .grok/hooks/  .kiro/hooks/
├── oma-hook.sh             ├── oma-hook.sh
├── hud.ts                  └── filter-test-output.sh
└── filter-test-output.sh
                            .cursor/hooks/  .commandcode/hooks/
.gemini/hooks/  .qwen/hooks/  └── oma-hook.sh
(.claude와 동일)
```

| 벤더 | 실체화되는 파일 | 이유 |
|---|---|---|
| claude, qwen | `oma-hook.sh`, `hud.ts`, `filter-test-output.sh` | statusLine + test-filter |
| gemini | `oma-hook.sh`, `hud.ts`, `filter-test-output.sh` | hud 전용 이벤트 + test-filter |
| codex, grok, kiro | `oma-hook.sh`, `filter-test-output.sh` | test-filter만 있고 statusLine 없음 |
| cursor | `oma-hook.sh` | statusLine도 test-filter도 없음 |
| commandcode | `oma-hook.sh` | `Stop`만 지원합니다. Command Code에는 프롬프트 이벤트가 없고 PreToolUse가 입력을 다시 쓸 수 없습니다 ([훅 레퍼런스](https://commandcode.ai/docs/hooks/reference)) |
| antigravity | 프로젝트에는 없음. `hud.ts`와 코어 훅은 `~/.gemini/antigravity-cli/hooks/`로 복사됩니다 | agy는 설정을 HOME에서만 읽고 워크스페이스 훅은 `.agents/hooks.json`에서 읽는데, 이 파일은 핸들러를 `.agents/hooks/core/`에서 바로 실행합니다. 프로젝트의 `.gemini/antigravity-cli/`는 절대 로드되지 않습니다 (`homeOnly` 변형 플래그) |
| pi | `.pi/extensions/oma/` 아래에 `.agents/hooks/core/` 전체 | pi 브릿지는 설정 훅 대신 핸들러를 서브프로세스로 스폰합니다 |

대상 디렉토리는 복사 전에 비워지므로, 예전 설치에서 `oma install` / `oma update` / `oma link`를 다시 실행하면 남아 있던 전체 사본 파일이 자동으로 정리됩니다.

#### 핸들러 체인을 따로 떼어 디버깅하기

실제 에이전트 세션을 건드리지 않고도 아무 핸들러 체인이나 실제 페이로드로 실행해 볼 수 있습니다.

```bash
# 주어진 프롬프트에 keyword-detector가 무엇을 주입하는지 확인
echo '{"prompt":"orchestrate the auth feature","cwd":"/path/to/project"}' \
  | oma hook --vendor claude --event UserPromptSubmit

# pre_tool 차단 테스트 (Bash 도구)
echo '{"tool_name":"Bash","tool_input":{"command":"rm -rf /"},"cwd":"/path/to/project"}' \
  | oma hook --vendor claude --event PreToolUse --matcher Bash

# persistent-mode의 Stop 강제 테스트
echo '{"cwd":"/path/to/project"}' \
  | oma hook --vendor claude --event Stop
```

`oma hook`은 항상 0으로 종료합니다(fail-open). stdout이 비어 있으면 해당 이벤트에서 체인이 아무 일도 하지 않았다는 뜻입니다. 핸들러가 발동하면 벤더 방언 JSON(kiro 프롬프트의 경우에는 일반 텍스트)이 stdout으로 출력됩니다.

#### 019 이전 설치에서 마이그레이션

예전 방식의 `bun "$CLAUDE_PROJECT_DIR/.claude/hooks/keyword-detector.ts"` 항목이 남아 있는 기존 설치는 다음에 `oma install`, `oma update`, `oma link`를 실행할 때 자동으로 마이그레이션됩니다. 설치 프로그램은 마커 기반으로 교체하므로, OMA가 관리하는 훅 그룹(`name` / `command` 패턴으로 식별)만 교체되고 사용자가 직접 추가한 훅 그룹은 원래 순서 그대로 보존됩니다. `statusLine` / hud 경로는 바뀌지 않습니다. pi 인프로세스 브릿지도 영향을 받지 않습니다. 라우터 구현은 `cli/commands/hook/command.ts`(내부적으로 "design 019"라고 부릅니다)를, 벤더별 실체화 로직은 `cli/platform/hooks-composer/`를 참고하세요.

### skills/

`.agents/skills/`를 가리키는 심볼릭 링크. `.claude/skills/`에서 읽는 IDE에 스킬을 노출하면서 `.agents/`를 단일 진실 원천으로 유지합니다.

### agents/

Claude Code의 Agent 도구용으로 포맷된 서브에이전트 정의. 스킬 파일을 참조하며 CHARTER_CHECK 템플릿을 포함합니다.

---

## .agents/state/memories/: 런타임 상태

오케스트레이션 세션 중 에이전트가 진행 상황을 기록하는 곳입니다. 여기가 표준 조율 메모리 저장소이며, CLI가 이 경로를 먼저 해석하고, 경로가 옮겨지기 전에 만들어진 프로젝트에서는 레거시 `.serena/memories/` 경로로 폴백합니다. 이 디렉토리는 실시간 업데이트를 위해 대시보드가 감시합니다.

| 파일 | 소유자 | 목적 |
|------|--------|------|
| `orchestrator-session.md` | 오케스트레이터 | 세션 메타데이터: ID, 상태, 시작 시간, 현재 단계 |
| `task-board.md` | 오케스트레이터 | 태스크 할당: 에이전트, 태스크, 우선순위, 상태, 의존성 |
| `progress-{agent}.md` | 해당 에이전트 | 턴별 업데이트: 수행한 작업, 읽은/수정한 파일, 현재 상태 |
| `result-{agent}.md` | 해당 에이전트 | 최종 출력: 완료 상태, 요약, 변경된 파일, 인수 기준 |
| `session-metrics.md` | 오케스트레이터 | Clarification Debt 이벤트, Quality Score 진행 상황 |
| `experiment-ledger.md` | 오케스트레이터/QA | Quality Score 활성 시 실험 행 |
| `session-work.md` | Work 워크플로우 | Work 전용 세션 상태 |
| `session-ultrawork.md` | Ultrawork 워크플로우 | Ultrawork 전용 단계 추적 |
| `tool-overrides.md` | /tools 워크플로우 | 임시 도구 제한 (세션 범위) |
| `archive/metrics-{date}.md` | 시스템 | 보관된 세션 메트릭 (30일 보존) |

메모리 파일 경로와 도구 이름은 `.agents/mcp.json`의 `memoryConfig`를 통해 설정할 수 있습니다.

---

## oh-my-agent 소스 리포지토리 구조

oh-my-agent 자체를 개발하는 경우(단순 사용이 아닌), 리포지토리는 모노레포입니다:

```
oh-my-agent/
├── cli/                  ← CLI 도구 소스 (TypeScript, bun으로 빌드)
│   ├── src/              ← 소스 코드
│   ├── package.json
│   └── install.sh        ← 부트스트랩 설치 프로그램
├── web/                  ← 문서 사이트 (Next.js)
│   └── content/
│       └── en/           ← 영어 문서 페이지
├── action/               ← 자동화된 스킬 업데이트용 GitHub Action
├── docs/                 ← 번역된 README 및 사양서
├── .agents/              ← 소스 리포에서는 편집 가능 (이것이 소스이므로)
├── .claude/              ← IDE 통합
├── .serena/              ← 개발 런타임 상태
├── CLAUDE.md             ← Claude Code용 프로젝트 지시사항
└── package.json          ← 루트 워크스페이스 설정
```

소스 리포에서는 `.agents/` 수정이 허용됩니다 (이것이 소스 리포 자체에 대한 SSOT 예외입니다). `.agents/`를 수정하지 않는다는 규칙은 소비자 프로젝트에 적용되며, oh-my-agent 리포지토리에는 적용되지 않습니다.

개발 명령어:
- `bun run test`: CLI 테스트 (vitest)
- `bun run lint`: CLI와 web 워크스페이스 린트
- `bun run build`: CLI 빌드
- `bun run typecheck`: CLI와 web 타입 검사
- 커밋은 conventional commit 형식을 따라야 합니다 (commitlint 강제)
