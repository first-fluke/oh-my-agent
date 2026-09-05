---
title: 병렬 실행
description: 여러 oh-my-agent 에이전트를 동시에 실행하는 완전 가이드입니다. agent spawn 구문과 모든 옵션, agent parallel 인라인 모드, 워크스페이스 인식 패턴, 멀티 CLI 설정, 벤더 해석 우선순위, 대시보드 모니터링, 세션 ID 전략, 피해야 할 안티 패턴을 다룹니다.
---

# 병렬 실행

oh-my-agent의 핵심 장점은 여러 전문 에이전트를 동시에 실행하는 것입니다. 백엔드 에이전트가 API를 구현하는 동안 프론트엔드 에이전트는 UI를 생성하고, 모바일 에이전트는 앱 화면을 구축합니다. 이 모든 작업은 공유 메모리를 통해 조율됩니다.

---

## agent:spawn: 단일 에이전트 스폰

### 기본 구문

```bash
oma agent spawn <agent-id> <prompt> <session-id> [options]
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
| `--vendor <name>` | — | 이 스폰에만 적용되는 CLI 벤더 오버라이드. 옵션: `antigravity`, `claude`, `codex`, `qwen`. |
| `--isolation <mode>` | | 스폰별 격리입니다. `worktree`는 `${tmpdir}/oma-worktrees/{sessionId}/{agentId}`에 `oma/{sessionId}/{agentId}` 브랜치로 새 git 워크트리를 만들고 거기서 에이전트를 실행합니다. 가설 스폰이나 병렬 에이전트가 공유 파일을 건드릴 때 유용합니다. 종료 후에도 워크트리는 남으며, 수동 검토용 머지·폐기 명령을 출력합니다. |
| `--max-turns <n>` | `-t` | 이 에이전트의 기본 턴 제한 오버라이드. |
| `--json` | | 결과를 JSON으로 출력 (스크립팅에 유용). |
| `--no-wait` | | 완료를 기다리지 않고 즉시 반환. |

### 예제

```bash
# 기본 벤더로 백엔드 에이전트 스폰
oma agent spawn backend "Implement JWT authentication API with refresh tokens" session-01

# 워크스페이스 격리와 함께 스폰
oma agent spawn backend "Auth API + DB migration" session-01 -w ./apps/api

# 이 특정 에이전트에 대해 벤더 오버라이드
oma agent spawn frontend "Build login form" session-01 --vendor claude -w ./apps/web

# 복잡한 태스크를 위해 턴 제한 상향
oma agent spawn backend "Implement payment gateway integration" session-01 -t 30

# 인라인 텍스트 대신 프롬프트 파일 사용
oma agent spawn backend ./prompts/auth-api.md session-01 -w ./apps/api
```

---

## 백그라운드 프로세스를 통한 병렬 스폰

여러 에이전트를 동시에 실행하려면 셸 백그라운드 프로세스를 사용합니다:

```bash
# 3개 에이전트를 병렬로 스폰
oma agent spawn backend "Implement auth API" session-01 -w ./apps/api &
oma agent spawn frontend "Build login form" session-01 -w ./apps/web &
oma agent spawn mobile "Auth screens with biometrics" session-01 -w ./apps/mobile &
wait  # 모든 에이전트가 완료될 때까지 블록
```

`&`는 각 에이전트를 백그라운드에서 실행합니다. `wait`는 모든 백그라운드 프로세스가 완료될 때까지 블록합니다.

### 워크스페이스 인식 패턴

에이전트를 병렬로 실행할 때 파일 충돌을 방지하기 위해 항상 별도의 워크스페이스를 할당하세요:

```bash
# 풀스택 병렬 실행
oma agent spawn backend "JWT auth + DB migration" session-02 -w ./apps/api &
oma agent spawn frontend "Login + token refresh + dashboard" session-02 -w ./apps/web &
oma agent spawn mobile "Auth screens + offline token storage" session-02 -w ./apps/mobile &
wait

# 구현 후 QA 실행 (순차 — 구현에 의존)
oma agent spawn qa "Review all implementations for security and accessibility" session-02
```

---

## agent:parallel: 인라인 병렬 모드

백그라운드 프로세스 관리를 자동으로 처리하는 더 깔끔한 구문:

### 구문

```bash
oma agent parallel -i <agent1>:<prompt1> <agent2>:<prompt2> [options]
```

### 예제

```bash
# 기본 병렬 실행
oma agent parallel -i backend:"Implement auth API" frontend:"Build login form" mobile:"Auth screens"

# no-wait 모드 (즉시 반환)
oma agent parallel -i backend:"Auth API" frontend:"Login form" --no-wait

# 모든 에이전트가 자동으로 같은 세션을 공유
oma agent parallel -i \
  backend:"JWT auth with refresh tokens" \
  frontend:"Login form with email validation" \
  db:"User schema with soft delete and audit trail"
```

`-i`(인라인) 플래그를 사용하면 에이전트-프롬프트 쌍을 명령어에서 직접 지정할 수 있습니다.

---

## 멀티 CLI 설정

oh-my-agent은 `.agents/oma-config.yaml`의 `model_preset`을 보고 각 에이전트를 알맞은 CLI로 라우팅합니다. 쓰는 벤더에 맞는 빌트인 프리셋을 고르고, 필요하면 에이전트별로 따로 오버라이드하면 됩니다.

### 설정 예시

```yaml
# .agents/oma-config.yaml
language: en
model_preset: mixed   # mixed: QA/PM은 Claude, 구현은 Codex, 탐색은 Gemini

# 프리셋 위에 특정 에이전트만 오버라이드
agents:
  frontend: { model: anthropic/claude-sonnet-4-6 }
  backend:  { model: openai/gpt-5.5, effort: high }
```

빌트인 프리셋은 `antigravity`, `claude`, `codex`, `qwen`, `cursor`, `mixed`입니다. 자세한 내용은 [에이전트별 모델](../guide/per-agent-models.md)을 참고하세요.

### 벤더 해석

`oma agent spawn`이 어떤 CLI를 쓸지 결정하는 순서입니다:

| 우선순위 | 소스 | 예시 |
|----------|--------|---------|
| 1 (최고) | `--vendor` 플래그 | `oma agent spawn backend "task" session-01 --vendor claude` |
| 2 | `oma-config.yaml`의 `agents:` 오버라이드 | `agents: { backend: { model: openai/gpt-5.5 } }` |
| 3 | 활성 `model_preset`의 에이전트 기본값 | 에이전트 역할로 프리셋 조회 |

`--vendor` 플래그가 항상 우선합니다. 플래그가 없으면 `agents:` 오버라이드를 보고, 그다음 프리셋 기본값을 씁니다.

---

## 벤더별 스폰 방식

스폰 메커니즘은 IDE/CLI에 따라 다릅니다:

| 벤더 | 에이전트 스폰 방법 | 결과 처리 |
|--------|----------------------|-----------------|
| **Claude Code** | 같은 벤더 태스크는 `.claude/agents/{name}.md`와 함께 `Agent` 도구를 쓰고, 다른 벤더 태스크는 `oma agent spawn`으로 폴백합니다. | 동기 반환 |
| **Codex CLI** | 같은 벤더 태스크는 `.codex/agents/{name}.toml`의 네이티브 커스텀 에이전트를 쓰고, 다른 벤더 태스크는 `oma agent spawn`으로 폴백합니다. | JSON 출력 |
| **Gemini CLI** | 같은 벤더 태스크는 `.gemini/agents/{name}.md`가 있으면 그것을 쓰고, 다른 벤더 태스크는 `oma agent spawn`으로 폴백합니다. | MCP 메모리 폴링 |
| **Antigravity IDE** | `oma agent spawn`만 (커스텀 서브에이전트 사용 불가) | MCP 메모리 폴링 |
| **CLI 폴백** | `oma agent spawn {agent} {prompt} {session} -w {workspace}` | 결과 파일 폴링 |

Claude Code 내에서 실행 시 워크플로우는 `Agent` 도구를 직접 사용합니다:
```
Agent(subagent_type="backend-engineer", prompt="...", run_in_background=true)
Agent(subagent_type="frontend-engineer", prompt="...", run_in_background=true)
```

같은 메시지에서 여러 Agent 도구를 호출하면 진정한 병렬로 실행됩니다(순차적 대기 없음).

1. `.agents/oma-config.yaml`에서 `target_vendor_for_agent`를 해석합니다
2. 현재 런타임 벤더와 일치하면 그 벤더의 네이티브 에이전트 파일을 씁니다
3. 일치하지 않으면 해당 에이전트에 한해 `oma agent spawn`을 씁니다

---

## 에이전트 모니터링

### 터미널 대시보드

```bash
oma dashboard terminal
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
oma dashboard web
# http://localhost:9847 에서 열림
```

기능:
- WebSocket을 통한 실시간 업데이트
- 연결 끊김 시 자동 재연결
- 색상 코딩된 에이전트 상태 표시기
- 진행 파일과 결과 파일에서 활동 로그 스트리밍
- 세션 히스토리

### 권장 터미널 레이아웃

최적의 가시성을 위해 3개 터미널을 사용합니다:

```
┌─────────────────────────┬──────────────────────┐
│                         │                      │
│   터미널 1:             │   터미널 2:          │
│   oma dashboard terminal         │   에이전트 스폰      │
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
oma agent status <session-id> <agent-id>
```

특정 에이전트의 현재 상태를 반환합니다. 실행 중 / 완료 / 실패 상태와 함께 턴 수와 마지막 활동을 보여줍니다.

---

## 세션 ID 전략

세션 ID는 같은 기능을 작업하는 에이전트를 그룹화합니다. 모범 사례:

- **기능당 하나의 세션:** "사용자 인증"을 작업하는 에이전트가 모두 `session-auth-01`을 공유
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
   oma agent spawn backend "task" session-01 -w ./apps/api &
   oma agent spawn frontend "task" session-01 -w ./apps/web &
   ```

4. **적극적으로 모니터링하세요.** 문제를 일찍 포착하기 위해 대시보드 터미널을 열어두세요. 실패한 에이전트는 빨리 잡지 않으면 턴을 낭비합니다.

5. **구현 후 QA를 실행하세요.** 모든 구현 에이전트 완료 후 QA 에이전트를 순차적으로 스폰하세요:
   ```bash
   oma agent spawn backend "task" session-01 -w ./apps/api &
   oma agent spawn frontend "task" session-01 -w ./apps/web &
   wait
   oma agent spawn qa "Review all changes" session-01
   ```

6. **재스폰으로 반복하세요.** 에이전트 출력에 수정이 필요하면 원래 태스크에 수정 컨텍스트를 추가하여 재스폰하세요. 새 세션을 시작하지 마세요.

7. **불확실하면 `/work`로 시작하세요.** work 워크플로우가 각 게이트에서 사용자 확인과 함께 프로세스를 단계별로 안내합니다.

### 하지 말아야 할 것

1. **같은 워크스페이스에 에이전트를 스폰하지 마세요.** 같은 디렉토리에 쓰는 두 에이전트는 머지 충돌을 만들고 서로의 작업을 덮어씁니다.

2. **MAX_PARALLEL(기본 3)을 초과하지 마세요.** 동시 에이전트 수가 많다고 항상 더 빠른 결과를 얻는 것은 아닙니다. 각 에이전트는 메모리와 CPU 리소스가 필요합니다. 기본값 3은 대부분의 시스템에 맞게 조정되어 있습니다.

3. **계획 단계를 건너뛰지 마세요.** 계획 없이 에이전트를 스폰하면 구현이 서로 어긋납니다. 예를 들어 프론트엔드는 하나의 API 형태를 기반으로 구축하고 백엔드는 다른 형태를 구축합니다.

4. **실패한 에이전트를 무시하지 마세요.** 실패한 에이전트의 작업은 불완전합니다. 실패 이유를 `result-{agent}.md`에서 확인하고, 프롬프트를 수정하여 재스폰하세요.

5. **관련 작업에 세션 ID를 혼합하지 마세요.** 백엔드와 프론트엔드 에이전트가 같은 기능을 작업한다면 오케스트레이터가 조율할 수 있도록 세션 ID를 공유해야 합니다.

---

## 전체 예제

사용자 인증 기능 구축을 위한 전체 병렬 실행 워크플로우:

```bash
# Step 1: 기능 계획
# (AI IDE에서 /plan을 실행하거나 기능을 설명)
# .agents/results/plan-{sessionId}.json에 태스크 분해가 생성됨

# Step 2: 구현 에이전트를 병렬로 스폰
oma agent spawn backend "Implement JWT auth API with registration, login, refresh, and logout endpoints. Use Argon2id for password hashing. Follow the API contract in .agents/skills/_shared/core/api-contracts/" session-auth-01 -w ./apps/api &
oma agent spawn frontend "Build login and registration forms with email validation, password strength indicator, and error handling. Use the API contract for endpoint integration." session-auth-01 -w ./apps/web &
oma agent spawn mobile "Create auth screens (login, register, forgot password) with biometric login support and secure token storage." session-auth-01 -w ./apps/mobile &

# Step 3: 별도 터미널에서 모니터링
# 터미널 2:
oma dashboard terminal

# Step 4: 모든 구현 에이전트 대기
wait

# Step 5: QA 리뷰 실행
oma agent spawn qa "Review all auth implementations across backend, frontend, and mobile for OWASP Top 10 compliance, accessibility, and cross-domain consistency." session-auth-01

# Step 6: QA에서 이슈 발견 시 특정 에이전트 재스폰하여 수정
oma agent spawn backend "Fix: QA found missing rate limiting on login endpoint and SQL injection risk in user search. Apply fixes per QA report." session-auth-01 -w ./apps/api

# Step 7: 수정 확인을 위해 QA 재실행
oma agent spawn qa "Re-review backend auth after fixes." session-auth-01
```
