---
title: oh-my-agent을 선택하는 이유
description: 포화된 multi-agent CLI 시장에서 oh-my-agent의 포지셔닝. 비용 축이 구현에서 테스트·유지보수로 이동했고, oh-my-agent는 그 이동에 맞춰 quality gate, 독립 검증, multi-vendor dispatch, repo-native 커스터마이즈를 제공합니다.
---

# oh-my-agent을 선택하는 이유

multi-agent CLI 카테고리는 이미 포화 상태입니다. 지난 분기에만 Metateam, OpenSwarm, DevSquad, Praktor, Salacia, Codelegate, agent-of-empires, TTal, Maggy 등 20개가 넘는 multi-agent orchestrator가 등장했습니다. 대부분은 같은 축을 최적화합니다 - 에이전트가 코드를 더 빠르게 쓰게 만드는 것.

oh-my-agent은 다른 축을 최적화합니다. 충분히 강한 모델 환경에서 SDLC의 분석·설계·구현 비용은 0에 수렴합니다. 비용은 이제 테스트와 유지보수 — 첫 커밋 이후에도 시스템이 동작하고, 안전하며, 이해 가능한 상태를 유지하는 일 — 쪽에 쌓입니다. oh-my-agent은 그 축을 중심으로 설계되었습니다.

이 페이지는 그 포지셔닝을 구체화합니다. 이 프레이밍의 원래 토론은 [issue #155](https://github.com/first-fluke/oh-my-agent/issues/155#issuecomment-4142133589)를 참조하세요.

---

## 비용 축이 이동했다

충분히 강한 모델 하나가 몇 분 만에 작동하는 기능을 만들어내면, 병목은 더 이상 구현 처리량이 아닙니다. 병목은 산출물이 주장한 대로 작동하는지 검증하는 것, iteration 사이의 silent regression을 잡는 것, 프롬프트·로그에서 비밀키가 새지 않게 하는 것, 토큰 소비가 사고를 일으키기 전에 가시화하는 것입니다.

에이전트를 더 빠르게 spawn할 뿐인 하네스는 이 어느 것도 해결하지 못합니다. 구현 이후 단계를 위해 설계된 하네스는 다릅니다.

---

## oh-my-agent이 구현 이후 단계에 제공하는 것

각 기능은 multi-agent CLI 카테고리에서 보고된 특정 실패 모드에 대응합니다.

### LLM 자체 평가가 아닌 독립 검증

`oma verify <agent>`는 에이전트 유형별 14개 결정론적 체크를 실행합니다. 모두 mechanical 체크입니다: 테스트 명령 exit code, TypeScript strict 통과, raw SQL 패턴 탐지, 하드코딩 시크릿 스캔, Flutter analyze, inline style 스캔, 에이전트 charter 대비 scope violation. "looks correct" 판정 같은 LLM 판단은 없습니다. 체크는 기반 명령이 성공을 보고할 때 그리고 그때만 통과합니다.

이는 카테고리에서 가장 흔한 불만에 대응합니다 - 한 커뮤니티 글이 요약한 표현으로 "agents lie - they say tests pass when tests do not". 체크 목록은 `cli/commands/verify/verify.ts`를 보세요.

### iteration 간 재검증

`ralph` 워크플로우는 `ultrawork`을 독립 JUDGE 단계로 감쌉니다. 매 iteration 후 JUDGE는 모든 criterion을 재검증합니다 - 이전 iteration에서 이미 통과한 것까지 포함합니다. 이는 C2 수정이 C1을 silent하게 깨뜨리는 경우를 잡습니다. 긴 에이전트 세션에서 대부분의 regression이 실제로 발생하는 매커니즘입니다.

30초가 넘는 heavy verification은 영향받는 파일 경로에 대해 캐시되므로 재검증 비용이 적게 유지됩니다. 전체 프로토콜은 `.agents/workflows/ralph/resources/judge-protocol.md`를 보세요.

### 손해 발생 전에 차단하는 quota cap

모든 `oma agent:spawn` 호출은 토큰 추정치를 `.serena/memories/session-cost-{sessionId}.md`에 기록합니다. 다음 spawn 전에 `checkCap`이 설정된 quota cap을 조회해 어느 차원이라도 초과되면 실행을 거부합니다. 세 차원이 강제됩니다: 총 토큰, 총 spawn 수, vendor별 토큰 예산.

cap이 없으면 월말이 되어서야 4만 달러를 썼다는 사실을 알게 됩니다. cap이 있으면 spawn 15번째에 예산이 1번 남았다고 오케스트레이터가 알려줍니다. `cli/io/session-cost.ts`를 보고 `.agents/oma-config.yaml`의 `session.quota_cap`에서 설정하세요.

### 무한 retry가 아닌 retry-then-explore

`orchestrate` Step 5가 검증 실패를 발견하면, 에러 컨텍스트와 함께 에이전트를 최대 2회 재시도합니다. 두 번째 재시도도 실패하고 비용 cap이 아직 초과되지 않았으면 워크플로우는 Exploration Loop로 전환됩니다 - 2-3개의 대체 가설 변형을 별도 workspace에서 병렬로 spawn하고 점수가 가장 높은 결과만 남깁니다. 실패한 접근은 비용이 기록된 채 폐기됩니다.

이는 한 접근 자체가 잘못된 경우에 대한 구조화된 대응입니다. 같은 접근을 retry하면 절대 수렴하지 않지만, 다른 접근을 병렬로 시도하면 수렴합니다.

### monorepo 인지 workspace 라우팅

`detectWorkspace`는 pnpm, nx, turbo, lerna 설정을 읽고 각 에이전트를 자기 sub-workspace로 자동 라우팅합니다. backend agent는 `apps/api/`, frontend agent는 `apps/web/`에서 동작합니다 - orchestrator가 경로를 수동으로 조합할 필요가 없습니다. `cli/io/workspaces.ts`를 보세요.

---

## multi-vendor는 선택사항이 아니다

두 번째 설계 가정은 실제 AI 네이티브 개발을 하는 어떤 팀이든 한 공급사 이상을 쓴다는 것입니다. 오늘은 Claude, Codex, Gemini, Copilot, Qwen, Kimi, 그리고 다음 분기에 나올 무엇이든을 의미합니다. vendor 전환은 edge case가 아닌 사실입니다 - Anthropic이 에이전트 기능을 별도 유료 plan으로 옮기고, OpenAI가 Anthropic 모델 열화와 같은 주에 Codex CLI를 출시하며, GitHub Copilot이 consumption-based 가격제로 전환합니다.

oh-my-agent은 vendor 선택을 `.agents/oma-config.yaml`의 `model_preset`과 `agents.<id>.model`을 통한 per-agent 설정으로 다룹니다. 휴대 가능한 `.agents/` 디렉토리가 single source of truth이며 지원되는 모든 runtime이 그로부터 투사합니다. oh-my-agent을 쓰기 위해 vendor lock-in이 필요하지 않고, 전환 시 마이그레이션이 필요하지 않습니다.

---

## repo-native 커스터마이즈

세 번째 가정은 두 팀이 "done"의 정의를 공유하는 일이 없다는 것입니다. 한 팀은 모든 backend 변경에 OWASP Top 10 스캔을 요구합니다. 다른 팀은 한국어 QA 보고서를 요구합니다. 또 다른 팀은 모든 migration을 merge 전에 database agent가 review하도록 요구합니다.

`.agents/`는 그저 저장소 안의 파일들이기 때문에 모든 팀이 자신의 행동 강령과 컴플라이언스 자세에 맞게 에이전트, skill, workflow, quality gate를 추가하거나 수정할 수 있습니다. 커스터마이즈는 `git commit`이지 vendor support ticket이 아닙니다.

---

## 실무에서 이게 의미하는 것

우선순위가 병렬 에이전트를 빠르게 spawn하는 것이라면 많은 도구가 그 표면을 커버합니다. 우선순위가 에이전트가 떠난 후에도 계속 작동하는 코드를 출시하는 것이라면 oh-my-agent이 그 목적으로 만들어졌습니다. `oma verify`, JUDGE, Exploration Loop, quota cap, monorepo 라우팅은 선택적 부가 기능이 아니라 프로젝트가 존재하는 이유입니다.

각 기능의 자세한 내용은 사이드바의 Core Concepts 섹션(Agents, Parallel Execution)을 보세요.
