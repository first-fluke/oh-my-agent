---
title: "가이드: 멀티 에이전트 프로젝트"
description: 프론트엔드, 백엔드, 데이터베이스, 모바일, QA 전반에 걸쳐 여러 도메인 에이전트를 조율하는 완전 가이드 — 기획부터 머지까지.
---

# 가이드: 멀티 에이전트 프로젝트

## 멀티 에이전트 조율을 사용할 때

기능이 여러 도메인에 걸쳐 있습니다 — 백엔드 API + 프론트엔드 UI + 데이터베이스 스키마 + 모바일 클라이언트 + QA 리뷰. 단일 에이전트로는 전체 범위를 처리할 수 없으며, 각 도메인이 서로의 파일을 건드리지 않으면서 병렬로 진행되어야 합니다.

멀티 에이전트 조율이 적합한 경우:

- 태스크가 2개 이상의 도메인을 포함 (frontend, backend, mobile, db, QA, debug, pm).
- 도메인 간 API 컨트랙트가 존재 (예: 웹과 모바일 모두에서 사용하는 REST 엔드포인트).
- 병렬 실행으로 전체 소요 시간을 줄이고 싶은 경우.
- 모든 도메인의 구현 후 QA 리뷰가 필요한 경우.

태스크가 하나의 도메인에 완전히 속하는 경우, 해당 에이전트를 직접 사용하세요.

---

## 전체 시퀀스: /plan에서 /review까지

권장되는 멀티 에이전트 워크플로우는 엄격한 4단계 파이프라인을 따릅니다.

### 1단계: /plan — 요구사항 및 태스크 분해

`/plan` 워크플로우는 인라인으로 실행되며(서브에이전트 생성 없음) 구조화된 계획을 생성합니다.

```
/plan
```

수행 과정:

1. **요구사항 수집** — PM 에이전트가 대상 사용자, 핵심 기능, 제약 조건, 배포 대상에 대해 질문합니다.
2. **기술적 타당성 분석** — MCP 코드 분석 도구(`get_symbols_overview`, `find_symbol`, `search_for_pattern`)를 사용하여 기존 코드베이스에서 재사용 가능한 코드와 아키텍처 패턴을 스캔합니다.
3. **API 컨트랙트 정의** — 엔드포인트 컨트랙트(메서드, 경로, 요청/응답 스키마, 인증, 오류 응답)를 설계하고 `.agents/skills/_shared/core/api-contracts/`에 저장합니다.
4. **태스크 분해** — 프로젝트를 실행 가능한 태스크로 분해합니다. 각 태스크에는 할당된 에이전트, 제목, 인수 기준, 우선순위(P0-P3), 의존성이 포함됩니다.
5. **사용자와 계획 검토** — 전체 계획을 확인을 위해 제시합니다. 사용자의 명시적 승인 없이는 워크플로우가 진행되지 않습니다.
6. **계획 저장** — 승인된 계획을 `.agents/plan.json`에 저장하고 메모리에 요약을 기록합니다.

출력인 `.agents/plan.json`은 `/coordinate`와 `/orchestrate` 모두의 입력입니다.

### 2단계: /coordinate 또는 /orchestrate — 실행

두 가지 실행 경로가 있습니다:

| 측면 | /coordinate | /orchestrate |
|:-----|:-----------|:-------------|
| **상호작용** | 대화형 — 사용자가 각 단계에서 확인 | 자동화 — 완료까지 자동 실행 |
| **PM 기획** | 내장 (2단계에서 PM 에이전트 실행) | /plan의 plan.json 필요 |
| **사용자 체크포인트** | 계획 검토 후 (3단계) | 시작 전 (계획이 존재해야 함) |
| **영구 모드** | 예 — 완료까지 종료 불가 | 예 — 완료까지 종료 불가 |
| **적합한 경우** | 첫 사용, 감독이 필요한 복잡한 프로젝트 | 반복 실행, 잘 정의된 태스크 |

#### /coordinate — 대화형 멀티 에이전트 파이프라인

```
/coordinate
```

1. 사용자의 요청을 분석하고 관련 도메인을 식별합니다.
2. 태스크 분해를 위해 PM 에이전트를 실행합니다 (plan.json 생성).
3. 사용자 확인을 위해 계획을 제시합니다 — **확인될 때까지 차단됩니다**.
4. 우선순위 티어별로 에이전트를 생성합니다 (P0 먼저, 그다음 P1 등). 같은 우선순위의 태스크는 병렬로 실행됩니다.
5. 메모리 파일을 통해 에이전트 진행 상황을 모니터링합니다.
6. 모든 산출물에 대해 QA 에이전트 리뷰를 실행합니다 (OWASP Top 10, 성능, 접근성, 코드 품질).
7. QA가 CRITICAL 또는 HIGH 이슈를 발견하면, QA 발견 사항과 함께 담당 에이전트를 재생성합니다. 이슈당 최대 2회 반복합니다. 같은 이슈가 지속되면 **탐색 루프**를 활성화합니다 — 2-3개의 대안적 접근 방식을 생성하고, 같은 에이전트 타입을 별도의 워크스페이스에서 다른 가설 프롬프트로 생성하며, QA가 각각 점수를 매기고, 최상의 결과가 채택됩니다.

#### /orchestrate — 자동화된 병렬 실행

```
/orchestrate
```

1. `.agents/plan.json`을 로드합니다 (없으면 진행하지 않음).
2. `session-YYYYMMDD-HHMMSS` 형식의 ID로 세션을 초기화합니다.
3. 메모리 디렉토리에 `orchestrator-session.md`와 `task-board.md`를 생성합니다.
4. 우선순위 티어별로 에이전트를 생성합니다. 각 에이전트에게 태스크 설명, API 컨트랙트, 컨텍스트를 전달합니다.
5. `progress-{agent}.md` 파일을 폴링하여 진행 상황을 모니터링합니다.
6. `verify.sh`를 통해 완료된 각 에이전트를 검증합니다 — PASS (종료 코드 0)이면 수락, FAIL (종료 코드 1)이면 오류 컨텍스트와 함께 재생성 (최대 2회 재시도), 지속적 실패 시 탐색 루프를 트리거합니다.
7. 모든 `result-{agent}.md` 파일을 수집하고 최종 보고서를 작성합니다.

### 3단계: agent:spawn — CLI 수준 에이전트 관리

`agent:spawn` 명령어는 워크플로우가 내부적으로 호출하는 저수준 메커니즘입니다. 직접 사용할 수도 있습니다:

```bash
oma agent:spawn backend "Implement user auth API with JWT" session-20260324-143000 -w ./api
```

**모든 플래그:**

| 플래그 | 설명 |
|:-------|:-----|
| `-v, --vendor <vendor>` | CLI 벤더 오버라이드 (gemini/claude/codex/qwen). 모든 설정을 오버라이드. |
| `-w, --workspace <path>` | 에이전트의 작업 디렉토리. 생략 시 모노레포 설정에서 자동 감지. |

**벤더 해석 순서** (첫 번째 매치 사용):

1. 커맨드 라인의 `--vendor` 플래그
2. `user-preferences.yaml`의 해당 에이전트 타입에 대한 `agent_cli_mapping`
3. `user-preferences.yaml`의 `default_cli`
4. `cli-config.yaml`의 `active_vendor`
5. `gemini` (하드코딩된 기본값)

**워크스페이스 자동 감지**는 다음 순서로 모노레포 설정을 확인합니다: pnpm-workspace.yaml, package.json workspaces, lerna.json, nx.json, turbo.json, mise.toml. 각 워크스페이스 디렉토리는 에이전트 타입 키워드(예: 프론트엔드 에이전트의 경우 "web", "frontend", "client")에 대해 점수가 매겨집니다. 모노레포 설정이 없으면 `apps/web`, `apps/frontend`, `frontend/` 등의 하드코딩된 후보로 폴백합니다.

**프롬프트 해석:** `<prompt>` 인자는 인라인 텍스트 또는 파일 경로가 될 수 있습니다. 경로가 기존 파일로 해석되면 해당 파일 내용이 프롬프트로 사용됩니다. CLI는 또한 `.agents/skills/_shared/runtime/execution-protocols/{vendor}.md`에서 벤더별 실행 프로토콜을 자동으로 주입합니다.

### 4단계: /review — QA 검증

```
/review
```

리뷰 워크플로우는 전체 QA 파이프라인을 실행합니다:

1. **범위 식별** — 무엇을 리뷰할지 질문합니다 (특정 파일, 기능 브랜치, 또는 전체 프로젝트).
2. **자동화된 보안 검사** — `npm audit`, `bandit` 또는 동등한 도구를 실행합니다.
3. **OWASP Top 10 수동 리뷰** — 인젝션, 인증 결함, 민감 데이터, 접근 제어, 설정 오류, 안전하지 않은 역직렬화, 취약한 컴포넌트, 불충분한 로깅.
4. **성능 분석** — N+1 쿼리, 누락된 인덱스, 무한 페이지네이션, 메모리 누수, 불필요한 리렌더, 번들 크기.
5. **접근성** — WCAG 2.1 AA: 시맨틱 HTML, ARIA, 키보드 내비게이션, 색상 대비, 포커스 관리.
6. **코드 품질** — 명명 규칙, 오류 처리, 테스트 커버리지, TypeScript strict 모드, 미사용 임포트, async/await 패턴.
7. **보고서** — 발견 사항을 CRITICAL / HIGH / MEDIUM / LOW로 분류하여 `파일:라인`, 설명, 수정 코드와 함께 제시합니다.

범위가 큰 경우 워크플로우는 QA 에이전트 서브에이전트에 위임합니다. `--fix` 옵션을 사용하면 Fix-Verify 루프에 진입합니다: 도메인 에이전트를 생성하여 CRITICAL/HIGH 이슈를 수정하고, 다시 리뷰하고, 최대 3회 반복합니다.

---

## 세션 ID 전략

모든 오케스트레이션 세션은 다음 형식의 고유 식별자를 받습니다:

```
session-YYYYMMDD-HHMMSS
```

예시: `session-20260324-143052`

세션 ID는 다음 용도로 사용됩니다:

- 메모리 파일 명명 (`orchestrator-session.md`, `task-board.md`)
- 시스템 임시 디렉토리의 PID 파일로 에이전트 프로세스 추적 (`/tmp/subagent-{session-id}-{agent-id}.pid`)
- 로그 파일 상관관계 (`/tmp/subagent-{session-id}-{agent-id}.log`)
- `.agents/results/parallel-{timestamp}/`에 결과 그룹화

세션 ID는 `/orchestrate`의 2단계에서 생성되어 모든 생성된 에이전트에 전달됩니다. 이를 통해 단일 실행의 모든 에이전트, 로그, PID 파일을 하나의 세션으로 추적할 수 있습니다.

---

## 도메인별 워크스페이스 할당

각 에이전트는 파일 충돌을 방지하기 위해 격리된 워크스페이스 디렉토리에서 생성됩니다. 할당은 다음 규칙을 따릅니다:

### 자동 감지

`-w`가 생략되거나 `.`로 설정된 경우, CLI는 다음과 같이 최적의 워크스페이스를 감지합니다:

1. 모노레포 설정 파일 스캔 (pnpm-workspace.yaml, package.json, lerna.json, nx.json, turbo.json, mise.toml).
2. 글로브 패턴 확장 (예: `apps/*`를 실제 디렉토리로).
3. 에이전트 타입 키워드에 대해 각 디렉토리 점수 매기기:

| 에이전트 타입 | 키워드 (우선순위 순) |
|:-------------|:--------------------|
| frontend | web, frontend, client, ui, app, dashboard, admin, portal |
| backend | api, backend, server, service, gateway, core |
| mobile | mobile, ios, android, native, rn, expo |

4. 정확한 디렉토리 이름 매치는 100점, 키워드 포함은 50점, 경로 포함은 25점.
5. 가장 높은 점수의 디렉토리가 선택됩니다.

### 폴백 후보

모노레포 설정이 없으면, CLI는 하드코딩된 경로를 순서대로 확인합니다:

- **frontend:** `apps/web`, `apps/frontend`, `apps/client`, `packages/web`, `packages/frontend`, `frontend`, `web`, `client`
- **backend:** `apps/api`, `apps/backend`, `apps/server`, `packages/api`, `packages/backend`, `backend`, `api`, `server`
- **mobile:** `apps/mobile`, `apps/app`, `packages/mobile`, `mobile`, `app`

아무것도 매치되지 않으면 에이전트는 현재 디렉토리(`.`)에서 실행됩니다.

### 명시적 오버라이드

항상 사용 가능합니다:

```bash
oma agent:spawn frontend "Build landing page" session-id -w ./packages/web-app
```

---

## 컨트랙트 우선 규칙

API 컨트랙트는 에이전트 간의 동기화 메커니즘입니다. 컨트랙트 우선 규칙의 의미:

1. **구현 시작 전에 컨트랙트가 정의됩니다.** `/plan` 워크플로우의 3단계에서 `.agents/skills/_shared/core/api-contracts/`에 저장되는 API 컨트랙트를 생성합니다.

2. **모든 에이전트가 관련 컨트랙트를 컨텍스트로 받습니다.** `/orchestrate`가 3단계에서 에이전트를 생성할 때, 각 에이전트에게 "태스크 설명, API 컨트랙트, 관련 컨텍스트"를 전달합니다.

3. **컨트랙트는 인터페이스 경계를 정의합니다.** 컨트랙트는 다음을 명시합니다:
   - HTTP 메서드와 경로
   - 요청 본문 스키마 (타입 포함)
   - 응답 본문 스키마 (타입 포함)
   - 인증 요구사항
   - 오류 응답 형식

4. **모니터링 중 컨트랙트 위반이 감지됩니다.** `/coordinate`의 5단계에서 MCP 코드 분석 도구(`find_symbol`, `search_for_pattern`)를 사용하여 에이전트 간 API 컨트랙트 정합성을 확인합니다.

5. **QA 리뷰가 컨트랙트 준수를 확인합니다.** QA 에이전트의 정합성 리뷰 (ultrawork의 6단계)에서 API 컨트랙트를 포함하여 구현을 계획과 명시적으로 비교합니다.

**이것이 중요한 이유:** 컨트랙트 없이, 백엔드 에이전트는 `{ "user_id": 1 }`을 반환하고 프론트엔드 에이전트는 `{ "userId": 1 }`을 소비할 수 있습니다. 컨트랙트 우선 규칙은 이러한 종류의 통합 버그를 완전히 제거합니다.

---

## 머지 게이트: 4가지 조건

멀티 에이전트 작업이 완료된 것으로 간주되기 전에 네 가지 조건이 충족되어야 합니다:

### 1. 빌드 성공

모든 코드가 오류 없이 컴파일되고 빌드됩니다. 이는 에이전트 타입에 적합한 빌드 명령을 실행하는 검증 스크립트(`verify.sh`)에 의해 확인됩니다.

### 2. 테스트 통과

모든 기존 테스트가 계속 통과하고, 새 테스트가 구현된 기능을 커버합니다. QA 에이전트가 코드 품질 리뷰의 일환으로 테스트 커버리지를 확인합니다.

### 3. 계획된 파일만 수정

에이전트는 할당된 범위 외의 파일을 수정해서는 안 됩니다. 검증 단계에서 에이전트의 태스크와 관련된 파일만 변경되었는지 확인합니다. 이를 통해 에이전트가 공유 코드에 의도치 않은 부작용을 만드는 것을 방지합니다.

### 4. QA 리뷰 통과

QA 에이전트의 리뷰에서 CRITICAL 또는 HIGH 발견 사항이 남아 있지 않습니다. MEDIUM과 LOW 발견 사항은 향후 스프린트를 위해 문서화할 수 있지만, 차단 이슈는 반드시 해결되어야 합니다.

ultrawork 워크플로우에서 이러한 조건은 진행 전 모든 항목이 통과해야 하는 체크박스 형식의 명시적 **단계 게이트** (PLAN_GATE, IMPL_GATE, VERIFY_GATE, REFINE_GATE, SHIP_GATE)로 변환됩니다.

---

## 생성 예제

### 단일 에이전트 생성

```bash
# Gemini(기본)로 백엔드 에이전트 생성
oma agent:spawn backend "Implement /api/users CRUD endpoint per API contract" session-20260324-143000

# Claude로 프론트엔드 에이전트 생성, 명시적 워크스페이스
oma agent:spawn frontend "Build user dashboard with React" session-20260324-143000 -v claude -w ./apps/web

# 프롬프트 파일에서 생성
oma agent:spawn backend ./prompts/auth-api.md session-20260324-143000 -w ./api
```

### agent:parallel을 통한 병렬 실행

YAML 태스크 파일 사용:

```yaml
# tasks.yaml
tasks:
  - agent: backend
    task: "Implement user authentication API with JWT tokens"
    workspace: ./api
  - agent: frontend
    task: "Build login page and auth flow UI"
    workspace: ./web
  - agent: mobile
    task: "Implement mobile auth screens with biometric support"
    workspace: ./mobile
```

```bash
oma agent:parallel tasks.yaml
```

인라인 모드 사용:

```bash
oma agent:parallel --inline \
  "backend:Implement user auth API:./api" \
  "frontend:Build login page:./web" \
  "mobile:Implement auth screens:./mobile"
```

백그라운드 모드 (대기 없음):

```bash
oma agent:parallel tasks.yaml --no-wait
# 즉시 반환, 결과는 .agents/results/parallel-{timestamp}/에 기록
```

벤더 오버라이드:

```bash
oma agent:parallel tasks.yaml -v claude
```

---

## 피해야 할 안티패턴

### 1. 계획 건너뛰기

plan.json 없이 `/orchestrate`를 시작하는 것. 워크플로우가 진행을 거부합니다. 항상 먼저 `/plan`을 실행하거나, 내장 기획이 있는 `/coordinate`를 사용하세요.

### 2. 워크스페이스 겹침

두 에이전트를 같은 워크스페이스 디렉토리에 할당하는 것. 파일 충돌이 발생합니다 — 한 에이전트의 변경이 다른 에이전트의 변경을 덮어씁니다. 항상 별도의 워크스페이스 디렉토리를 사용하세요.

### 3. API 컨트랙트 미정의

컨트랙트를 먼저 정의하지 않고 백엔드와 프론트엔드 에이전트를 생성하는 것. 데이터 형식, 필드 이름, 오류 처리에 대해 호환되지 않는 가정을 하게 됩니다.

### 4. QA 발견 사항 무시

QA 리뷰를 선택 사항으로 취급하는 것. CRITICAL과 HIGH 발견 사항은 프로덕션에서 표면화될 실제 버그를 나타냅니다. 워크플로우는 차단 이슈가 남지 않을 때까지 반복하여 이를 강제합니다.

### 5. 수동 파일 조율

자동화된 검증 및 QA 파이프라인이 통합을 처리하도록 하지 않고 에이전트 출력을 수동으로 머지하려는 것. 자동화된 파이프라인은 수동 리뷰가 놓치는 이슈를 잡아냅니다.

### 6. 과도한 병렬화

P0 태스크가 완료되기 전에 P1 태스크를 실행하는 것. 우선순위 티어가 존재하는 이유는 P1 태스크가 종종 P0 출력에 의존하기 때문입니다. 워크플로우는 티어 순서를 자동으로 강제합니다.

### 7. 검증 건너뛰기

이후 검증 스크립트를 실행하지 않고 `agent:spawn`을 직접 사용하는 것. 검증 단계는 그렇지 않으면 전파될 빌드 실패, 테스트 회귀, 범위 위반을 잡아냅니다.

---

## 크로스 도메인 통합 검증

모든 에이전트가 개별 태스크를 완료한 후, 크로스 도메인 통합을 검증해야 합니다:

1. **API 컨트랙트 정합성** — MCP 도구(`find_symbol`, `search_for_pattern`)가 백엔드 구현이 프론트엔드와 모바일이 사용하는 컨트랙트와 일치하는지 확인합니다.

2. **타입 일관성** — 도메인 간에 공유되는 TypeScript 타입, Python dataclass, Dart 모델은 일관된 필드 이름과 타입을 사용해야 합니다.

3. **인증 흐름** — 백엔드가 JWT 인증을 구현하면, 프론트엔드는 헤더에 토큰을 올바르게 전송해야 하고, 모바일 앱은 토큰을 적절히 저장하고 갱신해야 합니다.

4. **오류 처리** — API의 모든 소비자는 문서화된 오류 응답을 처리해야 합니다. 백엔드가 `{ "error": "unauthorized", "code": 401 }`을 반환하면, 모든 클라이언트가 이 형식을 처리해야 합니다.

5. **데이터베이스 스키마 정합성** — 데이터베이스 에이전트가 마이그레이션을 생성하면, 백엔드 ORM 모델이 스키마와 정확히 일치해야 합니다.

QA 에이전트의 정합성 리뷰 (ultrawork의 6단계, coordinate의 6단계)가 이 크로스 도메인 검증을 체계적으로 수행합니다.

---

## 완료 시점

멀티 에이전트 프로젝트는 다음 조건이 충족되면 완료됩니다:

- 모든 우선순위 티어의 모든 에이전트가 성공적으로 완료됨.
- 모든 에이전트에 대해 검증 스크립트가 통과 (종료 코드 0).
- QA 리뷰 보고서에 CRITICAL과 HIGH 발견 사항이 0건.
- 크로스 도메인 API 컨트랙트 정합성이 확인됨.
- 빌드가 성공하고 모든 테스트가 통과.
- 최종 보고서가 메모리에 기록되고 사용자에게 제시됨.
- 사용자가 최종 승인 (`/coordinate`와 ultrawork의 SHIP_GATE에서).
