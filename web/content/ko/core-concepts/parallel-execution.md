---
title: 병렬 실행
description: 여러 oh-my-agent 에이전트를 동시에 실행하는 완전 가이드 — agent:spawn 구문과 모든 옵션, agent:parallel 인라인 모드, 워크스페이스 인식 패턴, 멀티 CLI 설정, 벤더 해석 우선순위, 대시보드 모니터링, 세션 ID 전략, 피해야 할 안티 패턴.
---

# 병렬 실행

oh-my-agent의 핵심 장점은 여러 전문 에이전트를 동시에 실행하는 것입니다. 백엔드 에이전트가 API를 구현하는 동안 프론트엔드 에이전트는 UI를 생성하고, 모바일 에이전트는 앱 화면을 구축합니다 — 모두 공유 메모리를 통해 조율됩니다.

---

## agent:spawn — 단일 에이전트 스폰

### 기본 구문

```bash
oma agent:spawn <agent-id> <prompt> <session-id> [options]
```

### 파라미터

| 파라미터 | 필수 | 설명 |
|-----------|----------|-------------|
| `agent-id` | 예 | 에이전트 식별자: `backend`, `frontend`, `mobile`, `db`, `pm`, `qa`, `debug`, `design`, `tf-infra`, `dev-workflow`, `translator`, `orchestrator`, `commit` |
| `prompt` | 예 | 태스크 설명 (따옴표로 감싼 문자열 또는 프롬프트 파일 경로) |
| `session-id` | 예 | 같은 기능을 작업하는 에이전트를 그룹화합니다. 형식: `session-YYYYMMDD-HHMMSS` 또는 고유 문자열. |
| `options` | 아니오 | 아래 옵션 표 참조 |

### 옵션

| 플래그 | 단축 | 설명 |
|------|-------|-------------|
| `--workspace <path>` | `-w` | 에이전트의 작업 디렉토리. 에이전트는 이 디렉토리 내의 파일만 수정합니다. |
| `--vendor <name>` | `-v` | 이 스폰에 대한 CLI 벤더 오버라이드. 옵션: `gemini`, `claude`, `codex`, `qwen`. |
| `--max-turns <n>` | `-t` | 이 에이전트의 기본 턴 제한 오버라이드. |
| `--json` | | 결과를 JSON으로 출력 (스크립팅에 유용). |
| `--no-wait` | | 완료를 기다리지 않고 즉시 반환. |

### 예제

```bash
# 기본 벤더로 백엔드 에이전트 스폰
oma agent:spawn backend "Implement JWT authentication API with refresh tokens" session-01

# 워크스페이스 격리와 함께 스폰
oma agent:spawn backend "Auth API + DB migration" session-01 -w ./apps/api

# 이 특정 에이전트에 대해 벤더 오버라이드
oma agent:spawn frontend "Build login form" session-01 -v claude -w ./apps/web

# 복잡한 태스크를 위해 턴 제한 상향
oma agent:spawn backend "Implement payment gateway integration" session-01 -t 30

# 인라인 텍스트 대신 프롬프트 파일 사용
oma agent:spawn backend ./prompts/auth-api.md session-01 -w ./apps/api
```

---

## 백그라운드 프로세스를 통한 병렬 스폰

여러 에이전트를 동시에 실행하려면 셸 백그라운드 프로세스를 사용합니다:

```bash
# 3개 에이전트를 병렬로 스폰
oma agent:spawn backend "Implement auth API" session-01 -w ./apps/api &
oma agent:spawn frontend "Build login form" session-01 -w ./apps/web &
oma agent:spawn mobile "Auth screens with biometrics" session-01 -w ./apps/mobile &
wait  # 모든 에이전트가 완료될 때까지 블록
```

`&`는 각 에이전트를 백그라운드에서 실행합니다. `wait`는 모든 백그라운드 프로세스가 완료될 때까지 블록합니다.

### 워크스페이스 인식 패턴

에이전트를 병렬로 실행할 때 파일 충돌을 방지하기 위해 항상 별도의 워크스페이스를 할당하세요:

```bash
# 풀스택 병렬 실행
oma agent:spawn backend "JWT auth + DB migration" session-02 -w ./apps/api &
oma agent:spawn frontend "Login + token refresh + dashboard" session-02 -w ./apps/web &
oma agent:spawn mobile "Auth screens + offline token storage" session-02 -w ./apps/mobile &
wait

# 구현 후 QA 실행 (순차 — 구현에 의존)
oma agent:spawn qa "Review all implementations for security and accessibility" session-02
```

---

## agent:parallel — 인라인 병렬 모드

백그라운드 프로세스 관리를 자동으로 처리하는 더 깔끔한 구문:

### 구문

```bash
oma agent:parallel -i <agent1>:<prompt1> <agent2>:<prompt2> [options]
```

### 예제

```bash
# 기본 병렬 실행
oma agent:parallel -i backend:"Implement auth API" frontend:"Build login form" mobile:"Auth screens"

# no-wait 모드 (즉시 반환)
oma agent:parallel -i backend:"Auth API" frontend:"Login form" --no-wait

# 모든 에이전트가 자동으로 같은 세션을 공유
oma agent:parallel -i \
  backend:"JWT auth with refresh tokens" \
  frontend:"Login form with email validation" \
  db:"User schema with soft delete and audit trail"
```

`-i` (inline) 플래그는 에이전트-프롬프트 쌍을 명령에서 직접 지정할 수 있게 합니다.

---

## 멀티 CLI 설정

모든 AI CLI가 모든 도메인에서 동일한 성능을 보이는 것은 아닙니다. oh-my-agent를 사용하면 에이전트를 해당 도메인을 가장 잘 처리하는 CLI로 라우팅할 수 있습니다.

### 전체 설정 예시

```yaml
# .agents/config/user-preferences.yaml

# 응답 언어
language: en

# 리포트용 날짜 형식
date_format: "YYYY-MM-DD"

# 타임스탬프 시간대
timezone: "Asia/Seoul"

# 기본 CLI (에이전트별 매핑이 없을 때 사용)
default_cli: gemini

# 에이전트별 CLI 라우팅
agent_cli_mapping:
  frontend: claude       # 복잡한 UI 추론, 컴포넌트 구성
  backend: gemini        # 빠른 API 스캐폴딩, CRUD 생성
  mobile: gemini         # 빠른 Flutter 코드 생성
  db: gemini             # 빠른 스키마 설계
  pm: gemini             # 빠른 태스크 분해
  qa: claude             # 철저한 보안 및 접근성 리뷰
  debug: claude          # 깊은 근본 원인 분석, 심볼 추적
  design: claude         # 세밀한 디자인 결정, 안티 패턴 감지
  tf-infra: gemini       # HCL 생성
  dev-workflow: gemini   # 태스크 러너 설정
  translator: claude     # 문화적 민감성을 갖춘 세밀한 번역
  orchestrator: gemini   # 빠른 조율
  commit: gemini         # 간단한 커밋 메시지 생성
```

### 벤더 해석 우선순위

`oma agent:spawn`이 어떤 CLI를 사용할지 결정할 때 다음 우선순위를 따릅니다(높은 것이 우선):

| 우선순위 | 소스 | 예시 |
|----------|--------|---------|
| 1 (최고) | `--vendor` 플래그 | `oma agent:spawn backend "task" session-01 -v claude` |
| 2 | `agent_cli_mapping` | user-preferences.yaml의 `agent_cli_mapping.backend: gemini` |
| 3 | `default_cli` | user-preferences.yaml의 `default_cli: gemini` |
| 4 | `active_vendor` | 레거시 `cli-config.yaml` 설정 |
| 5 (최저) | 하드코딩된 폴백 | `gemini` |

`--vendor` 플래그가 항상 우선합니다. 플래그가 없으면 에이전트별 매핑, 기본값, 레거시 설정, Gemini 폴백 순으로 확인합니다.

---

## 벤더별 스폰 방식

스폰 메커니즘은 IDE/CLI에 따라 다릅니다:

| 벤더 | 에이전트 스폰 방법 | 결과 처리 |
|--------|----------------------|-----------------|
| **Claude Code** | `.claude/agents/{name}.md` 정의를 사용하는 `Agent` 도구. 같은 메시지에서 여러 Agent 호출 = 진정한 병렬. | 동기 반환 |
| **Codex CLI** | 모델 중재 병렬 서브에이전트 요청 | JSON 출력 |
| **Gemini CLI** | `oh-my-ag agent:spawn` CLI 명령 | MCP 메모리 폴링 |
| **Antigravity IDE** | `oh-my-ag agent:spawn`만 (커스텀 서브에이전트 사용 불가) | MCP 메모리 폴링 |
| **CLI 폴백** | `oh-my-ag agent:spawn {agent} {prompt} {session} -w {workspace}` | 결과 파일 폴링 |

Claude Code 내에서 실행 시 워크플로우는 `Agent` 도구를 직접 사용합니다:
```
Agent(subagent_type="backend-engineer", prompt="...", run_in_background=true)
Agent(subagent_type="frontend-engineer", prompt="...", run_in_background=true)
```

같은 메시지에서의 여러 Agent 도구 호출은 진정한 병렬로 실행됩니다 — 순차적 대기 없음.

---

## 에이전트 모니터링

### 터미널 대시보드

```bash
oma dashboard
```

실시간 테이블 표시:
- 세션 ID 및 전체 상태
- 에이전트별 상태 (실행 중, 완료, 실패)
- 턴 수
- 진행 파일의 최근 활동
- 경과 시간

대시보드는 `.serena/memories/`를 감시하여 실시간 업데이트합니다.

### 웹 대시보드

```bash
oma dashboard:web
# http://localhost:9847 열림
```

기능:
- WebSocket을 통한 실시간 업데이트
- 연결 끊김 시 자동 재연결
- 색상 코딩된 에이전트 상태 표시기
- 진행 및 결과 파일에서의 활동 로그 스트리밍
- 세션 히스토리

### 권장 터미널 레이아웃

최적의 가시성을 위해 3개 터미널을 사용합니다:

```
┌─────────────────────────┬──────────────────────┐
│                         │                      │
│   터미널 1:             │   터미널 2:          │
│   oma dashboard         │   에이전트 스폰      │
│   (실시간 모니터링)     │   명령어             │
│                         │                      │
├─────────────────────────┴──────────────────────┤
│                                                │
│   터미널 3:                                    │
│   테스트/빌드 로그, git 작업                   │
│                                                │
└────────────────────────────────────────────────┘
```

### 개별 에이전트 상태 확인

```bash
oma agent:status <session-id> <agent-id>
```

특정 에이전트의 현재 상태를 반환: 실행 중, 완료, 또는 실패와 함께 턴 수 및 마지막 활동.

---

## 세션 ID 전략

세션 ID는 같은 기능을 작업하는 에이전트를 그룹화합니다. 모범 사례:

- **기능당 하나의 세션:** "사용자 인증" 작업 에이전트 모두 `session-auth-01` 공유
- **형식:** 설명적 ID 사용: `session-auth-01`, `session-payment-v2`, `session-20260324-143000`
- **자동 생성:** 오케스트레이터가 `session-YYYYMMDD-HHMMSS` 형식으로 ID 생성
- **반복에 재사용:** 수정과 함께 에이전트를 재스폰할 때 같은 세션 ID 사용

세션 ID가 결정하는 것:
- 에이전트가 읽고 쓰는 메모리 파일 (`progress-{agent}.md`, `result-{agent}.md`)
- 대시보드가 모니터링하는 대상
- 최종 보고서에서 결과가 그룹화되는 방법

---

## 병렬 실행 팁

### 해야 할 것

1. **먼저 API 컨트랙트를 확정하세요.** 프론트엔드와 백엔드 에이전트가 엔드포인트, 요청/응답 스키마, 에러 형식에 합의하도록 구현 에이전트 스폰 전에 `/plan`을 실행하세요.

2. **기능당 하나의 세션 ID를 사용하세요.** 에이전트 출력이 그룹화되고 대시보드 모니터링이 일관되게 유지됩니다.

3. **별도의 워크스페이스를 할당하세요.** 에이전트를 격리하기 위해 항상 `-w`를 사용하세요:
   ```bash
   oma agent:spawn backend "task" session-01 -w ./apps/api &
   oma agent:spawn frontend "task" session-01 -w ./apps/web &
   ```

4. **적극적으로 모니터링하세요.** 문제를 일찍 포착하기 위해 대시보드 터미널을 열어두세요 — 실패한 에이전트는 빨리 잡지 않으면 턴을 낭비합니다.

5. **구현 후 QA를 실행하세요.** 모든 구현 에이전트 완료 후 QA 에이전트를 순차적으로 스폰하세요:
   ```bash
   oma agent:spawn backend "task" session-01 -w ./apps/api &
   oma agent:spawn frontend "task" session-01 -w ./apps/web &
   wait
   oma agent:spawn qa "Review all changes" session-01
   ```

6. **재스폰으로 반복하세요.** 에이전트 출력에 수정이 필요하면 원래 태스크에 수정 컨텍스트를 추가하여 재스폰하세요. 새 세션을 시작하지 마세요.

7. **불확실하면 `/coordinate`로 시작하세요.** coordinate 워크플로우가 각 게이트에서 사용자 확인과 함께 프로세스를 단계별로 안내합니다.

### 하지 말아야 할 것

1. **같은 워크스페이스에 에이전트를 스폰하지 마세요.** 같은 디렉토리에 쓰는 두 에이전트는 머지 충돌을 만들고 서로의 작업을 덮어씁니다.

2. **MAX_PARALLEL(기본 3)을 초과하지 마세요.** 더 많은 동시 에이전트가 항상 더 빠른 결과를 의미하지 않습니다. 각 에이전트는 메모리와 CPU 리소스가 필요합니다. 기본값 3은 대부분의 시스템에 맞게 조정되어 있습니다.

3. **계획 단계를 건너뛰지 마세요.** 계획 없이 에이전트를 스폰하면 구현이 불일치합니다 — 프론트엔드는 하나의 API 형태를 기반으로 구축하고 백엔드는 다른 형태를 구축합니다.

4. **실패한 에이전트를 무시하지 마세요.** 실패한 에이전트의 작업은 불완전합니다. 실패 이유를 `result-{agent}.md`에서 확인하고, 프롬프트를 수정하여 재스폰하세요.

5. **관련 작업에 세션 ID를 혼합하지 마세요.** 백엔드와 프론트엔드 에이전트가 같은 기능을 작업한다면 오케스트레이터가 조율할 수 있도록 세션 ID를 공유해야 합니다.

---

## 전체 예제

사용자 인증 기능 구축을 위한 전체 병렬 실행 워크플로우:

```bash
# Step 1: 기능 계획
# (AI IDE에서 /plan을 실행하거나 기능을 설명)
# .agents/plan.json에 태스크 분해가 생성됨

# Step 2: 구현 에이전트를 병렬로 스폰
oma agent:spawn backend "Implement JWT auth API with registration, login, refresh, and logout endpoints. Use bcrypt for password hashing. Follow the API contract in .agents/skills/_shared/core/api-contracts/" session-auth-01 -w ./apps/api &
oma agent:spawn frontend "Build login and registration forms with email validation, password strength indicator, and error handling. Use the API contract for endpoint integration." session-auth-01 -w ./apps/web &
oma agent:spawn mobile "Create auth screens (login, register, forgot password) with biometric login support and secure token storage." session-auth-01 -w ./apps/mobile &

# Step 3: 별도 터미널에서 모니터링
# 터미널 2:
oma dashboard

# Step 4: 모든 구현 에이전트 대기
wait

# Step 5: QA 리뷰 실행
oma agent:spawn qa "Review all auth implementations across backend, frontend, and mobile for OWASP Top 10 compliance, accessibility, and cross-domain consistency." session-auth-01

# Step 6: QA에서 이슈 발견 시 특정 에이전트 재스폰하여 수정
oma agent:spawn backend "Fix: QA found missing rate limiting on login endpoint and SQL injection risk in user search. Apply fixes per QA report." session-auth-01 -w ./apps/api

# Step 7: 수정 확인을 위해 QA 재실행
oma agent:spawn qa "Re-review backend auth after fixes." session-auth-01
```
