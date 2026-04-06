---
title: "가이드: 대시보드 모니터링"
description: 터미널 및 웹 대시보드, 데이터 소스, 3-터미널 레이아웃, 문제 해결, 기술 구현 세부사항을 다루는 종합 대시보드 가이드.
---

# 가이드: 대시보드 모니터링

## 두 가지 대시보드 명령

oh-my-agent는 멀티 에이전트 워크플로우 중 에이전트 활동을 모니터링하기 위한 두 가지 실시간 대시보드를 제공합니다.

| 명령 | 인터페이스 | URL | 기술 |
|:-----|:---------|:----|:-----|
| `oma dashboard` | 터미널 (TUI) | 해당 없음 — 터미널에서 렌더링 | chokidar 파일 감시자, picocolors 렌더링 |
| `oma dashboard:web` | 브라우저 | `http://localhost:9847` | HTTP 서버, WebSocket, chokidar 파일 감시자 |

두 대시보드 모두 동일한 데이터 소스를 감시합니다: `.serena/memories/` 디렉토리.

### 터미널 대시보드

```bash
oma dashboard
```

터미널에서 직접 박스 그리기 UI를 렌더링합니다. 메모리 파일이 변경되면 자동으로 업데이트됩니다. `Ctrl+C`를 눌러 종료합니다.

```
╔════════════════════════════════════════════════════════╗
║  Serena Memory Dashboard                              ║
║  Session: session-20260324-143052  [RUNNING]          ║
╠════════════════════════════════════════════════════════╣
║  Agent        Status       Turn   Task                ║
║  ──────────── ──────────── ────── ──────────────────  ║
║  backend      ● running    3      Implement user API  ║
║  frontend     ● running    2      Build login page    ║
║  mobile       ✓ completed  5      Auth screens done   ║
║  qa           ○ blocked    -                          ║
╠════════════════════════════════════════════════════════╣
║  Latest Activity:                                     ║
║  [backend] Implementing JWT token validation          ║
║  [frontend] Creating login form components            ║
║  [mobile] Completed biometric auth integration        ║
╠════════════════════════════════════════════════════════╣
║  Updated: 03/24/2026, 02:31:15 PM  |  Ctrl+C to exit ║
╚════════════════════════════════════════════════════════╝
```

**상태 기호:**
- `●` (녹색) — 실행 중
- `✓` (시안) — 완료됨
- `✗` (빨간색) — 실패
- `○` (노란색) — 차단됨
- `◌` (흐림) — 대기 중

### 웹 대시보드

```bash
oma dashboard:web
```

포트 9847에서 웹 서버를 엽니다(`DASHBOARD_PORT` 환경 변수로 설정 가능). 브라우저 UI가 WebSocket으로 연결되어 실시간 업데이트를 수신합니다.

```bash
# 커스텀 포트
DASHBOARD_PORT=8080 oma dashboard:web

# 커스텀 메모리 디렉토리
MEMORIES_DIR=/path/to/.serena/memories oma dashboard:web
```

웹 대시보드는 터미널 대시보드와 동일한 정보를 보여주지만, 스타일링된 다크 테마 UI로 다음 기능을 추가로 제공합니다:
- 연결 상태 뱃지 (Connected / Disconnected / Connecting과 자동 재연결)
- 세션 ID 및 상태 바
- 애니메이션 상태 점이 있는 에이전트 상태 테이블
- 최근 활동 피드
- 자동 업데이트 타임스탬프

---

## 권장 3-터미널 레이아웃

멀티 에이전트 워크플로우에서 권장되는 설정은 세 개의 터미널 패인을 사용합니다:

```
┌────────────────────────────────┬────────────────────────────────┐
│                                │                                │
│   터미널 1: 메인 에이전트      │   터미널 2: 대시보드            │
│                                │                                │
│   $ gemini                     │   $ oma dashboard              │
│   > /orchestrate               │                                │
│   ...                          │   ╔═══════════════════════╗    │
│                                │   ║ Serena Dashboard      ║    │
│                                │   ║ Session: ...          ║    │
│                                │   ╚═══════════════════════╝    │
│                                │                                │
├────────────────────────────────┴────────────────────────────────┤
│                                                                 │
│   터미널 3: 임시 명령                                            │
│                                                                 │
│   $ oma agent:status session-20260324-143052 backend frontend   │
│   $ oma stats                                                   │
│   $ oma verify backend -w ./api                                 │
│                                                                 │
└─────────────────────────────────────────────────────────────────┘
```

**터미널 1**은 `/orchestrate` 또는 `/work`와 같은 워크플로우와 상호작용하는 주 에이전트 세션(Gemini CLI, Claude Code, Codex 등)을 실행합니다.

**터미널 2**는 모니터링용 대시보드를 실행합니다. 자동으로 갱신되므로 별도 조작이 필요 없습니다.

**터미널 3**은 임시 명령용입니다: 에이전트 상태 확인, 검증 실행, 통계 확인, 문제 디버깅.

---

## .serena/memories/의 데이터 소스

대시보드는 `.serena/memories/` 디렉토리에서 읽습니다. 이 디렉토리는 실행 중 에이전트와 워크플로우가 MCP 메모리 도구를 사용하여 채웁니다.

### 파일 타입과 내용

| 파일 패턴 | 생성자 | 내용 |
|:---------|:------|:-----|
| `orchestrator-session.md` | `/orchestrate` 2단계 | 세션 ID, 시작 시간, 상태 (RUNNING/COMPLETED/FAILED), 워크플로우 버전 |
| `session-{workflow}.md` | `/work`, `/ultrawork` | 세션 메타데이터, 단계 진행, 사용자 요청 요약 |
| `task-board.md` | 오케스트레이션 워크플로우 | 에이전트 할당, 상태, 태스크가 포함된 Markdown 테이블 |
| `progress-{agent}.md` | 각 생성된 에이전트 | 현재 턴 번호, 에이전트가 작업 중인 내용, 중간 결과 |
| `result-{agent}.md` | 각 완료된 에이전트 | 최종 상태 (COMPLETED/FAILED), 변경된 파일, 발견된 이슈, 산출물 |
| `debug-{id}.md` | `/debug` 워크플로우 | 버그 진단, 근본 원인, 적용된 수정, 회귀 테스트 위치 |
| `experiment-ledger.md` | Quality Score 시스템 | 실험 추적: 기준 점수, 변동, 유지/폐기 결정 |
| `lessons-learned.md` | 세션 종료 시 자동 생성 | 폐기된 실험(변동 <= -5)의 교훈 |

### 대시보드가 읽는 방법

대시보드는 정보를 추출하기 위해 여러 전략을 사용합니다:

1. **세션 감지** — 먼저 `orchestrator-session.md`를 찾고, 없으면 가장 최근에 수정된 `session-*.md` 파일로 폴백합니다. 키워드에서 상태를 파싱합니다: `RUNNING`, `IN PROGRESS`, `COMPLETED`, `DONE`, `FAILED`, `ERROR`.

2. **태스크 보드 파싱** — `task-board.md`를 Markdown 테이블로 읽습니다. 열에서 에이전트 이름, 상태, 태스크 설명을 추출합니다.

3. **에이전트 탐지** — 태스크 보드가 없으면 모든 `.md` 파일에서 `**Agent**: {name}` 패턴, `Agent: {name}` 줄, 또는 `_agent`나 `-agent`를 포함하는 파일명을 스캔하여 에이전트를 발견합니다.

4. **턴 카운팅** — 발견된 각 에이전트에 대해 `progress-{agent}.md` 파일을 읽고 `turn: N` 패턴에서 턴 번호를 추출합니다.

5. **활동 피드** — 가장 최근에 수정된 5개의 `.md` 파일을 나열하고, 마지막 의미 있는 줄(헤더, 상태 줄, 액션 항목)을 활동 메시지로 추출합니다.

---

## 각 대시보드가 표시하는 내용

### 세션 상태

상단 섹션에 표시됩니다:
- **세션 ID** — 세션 파일에서 추출 (형식: `session-YYYYMMDD-HHMMSS`).
- **상태** — 색상 코드: RUNNING은 녹색, COMPLETED는 시안, FAILED는 빨간색, UNKNOWN은 노란색.

### 태스크 보드

에이전트 테이블에 감지된 모든 에이전트가 표시됩니다:
- **에이전트 이름** — 도메인 식별자 (backend, frontend, mobile, qa, debug, pm).
- **상태** — 시각적 인디케이터와 함께 현재 상태 (running/completed/failed/blocked/pending).
- **턴** — 에이전트의 현재 턴 번호 (완료한 반복 횟수). 진행 파일에서 추출.
- **태스크** — 에이전트가 작업 중인 내용의 간략한 설명 (화면에 맞게 잘림).

### 에이전트 진행

진행 상황은 `progress-{agent}.md` 파일을 통해 추적됩니다. 각 파일은 에이전트가 작업하면서 업데이트합니다. 대시보드는 이 파일을 폴링하여 다음을 확인합니다:
- 턴 번호 (에이전트가 진행하면서 증가).
- 현재 작업 (에이전트가 지금 하고 있는 것).
- 중간 결과 (부분 완료).

### 결과

에이전트가 완료되면 `result-{agent}.md`를 작성합니다:
- 최종 상태 (COMPLETED 또는 FAILED).
- 변경된 파일 목록.
- 발견된 이슈.
- 생성된 산출물.

대시보드는 이 파일의 존재를 감지하여 에이전트의 상태를 그에 맞게 업데이트합니다.

---

## 문제 해결 런북

### 신호 1: 에이전트가 "running"으로 표시되지만 턴 진행 없음

**증상:** 대시보드가 에이전트를 running으로 표시하지만 턴 번호가 몇 분간 변경되지 않음.

**가능한 원인:**
- 에이전트가 긴 작업에 걸려 있음 (대규모 코드베이스 스캔, 느린 API 호출).
- 에이전트가 크래시했지만 PID 파일이 여전히 존재.
- 에이전트가 사용자 입력을 기다리고 있음 (자동 승인 모드에서는 발생하지 않아야 함).

**조치:**
1. 에이전트의 로그 파일 확인: `cat /tmp/subagent-{session-id}-{agent-id}.log`
2. 프로세스가 실제로 실행 중인지 확인: `oma agent:status {session-id} {agent-id}`
3. 프로세스가 실행 중이 아닌데 상태가 "running"이면 에이전트가 비정상 종료된 것입니다. 오류 정보와 함께 다시 생성하세요.

### 신호 2: 에이전트가 "crashed"로 표시

**증상:** `oma agent:status`가 에이전트에 대해 `crashed`를 반환.

**가능한 원인:**
- CLI 벤더 프로세스가 예기치 않게 종료 (메모리 부족, API 할당량 초과, 네트워크 타임아웃).
- 워크스페이스 디렉토리가 삭제되었거나 권한이 변경됨.
- 벤더 CLI가 설치되지 않았거나 인증되지 않음.

**조치:**
1. 로그 파일에서 오류 세부사항 확인: `cat /tmp/subagent-{session-id}-{agent-id}.log`
2. CLI 설치 확인: `oma doctor`
3. 인증 확인: `oma auth:status`
4. 같은 태스크로 에이전트 재생성: `oma agent:spawn {agent-id} "{task}" {session-id} -w {workspace}`

### 신호 3: 대시보드에 "No agents detected yet" 표시

**증상:** 대시보드가 실행 중이지만 에이전트가 표시되지 않음.

**가능한 원인:**
- 워크플로우가 아직 에이전트 생성 단계에 도달하지 않음.
- `.serena/memories/` 디렉토리가 비어 있음.
- 대시보드가 잘못된 디렉토리를 감시 중.

**조치:**
1. 메모리 디렉토리 확인: `ls -la .serena/memories/`
2. 워크플로우가 아직 기획 단계에 있는지 확인 (에이전트가 아직 생성되지 않음).
3. 대시보드가 올바른 프로젝트 디렉토리를 감시하고 있는지 확인: 대시보드는 현재 작업 디렉토리에서 메모리 경로를 해석합니다.
4. 커스텀 경로를 사용하는 경우: `MEMORIES_DIR=/path/to/.serena/memories oma dashboard`

### 신호 4: 웹 대시보드에 "Disconnected" 표시

**증상:** 웹 대시보드의 연결 뱃지가 빨간색 "Disconnected"를 표시.

**가능한 원인:**
- `oma dashboard:web` 프로세스가 종료됨.
- 브라우저와 localhost 간의 네트워크 문제.
- 포트가 다른 프로세스에 의해 사용 중.

**조치:**
1. 대시보드 프로세스가 실행 중인지 확인: `ps aux | grep dashboard`
2. 다른 포트 시도: `DASHBOARD_PORT=8080 oma dashboard:web`
3. 포트 가용성 확인: `lsof -i :9847`
4. 웹 대시보드는 지수 백오프(1초 초기, 1.5배 승수, 10초 최대)로 자동 재연결합니다. 재연결을 위해 몇 초 기다리세요.

---

## 머지 전 모니터링 체크리스트

멀티 에이전트 세션이 완료된 것으로 간주하기 전에 대시보드를 통해 확인합니다:

- [ ] **모든 에이전트가 "completed"로 표시** — "running"이나 "blocked" 상태의 에이전트가 없음.
- [ ] **"failed"로 표시된 에이전트 없음** — 실패한 에이전트가 있으면 로그를 확인하고 재생성.
- [ ] **QA 에이전트가 리뷰를 완료** — `result-qa-agent.md` 또는 `result-qa.md`를 확인.
- [ ] **CRITICAL/HIGH 발견 사항 0건** — QA 결과 파일에서 심각도 카운트 확인.
- [ ] **세션 상태가 COMPLETED** — 세션 파일이 최종 상태를 표시해야 함.
- [ ] **활동 피드에 최종 보고서 표시** — 마지막 활동이 요약 보고서여야 함.

---

## 완료 기준

대시보드 모니터링은 다음 조건이 충족되면 완료됩니다:
1. 모든 생성된 에이전트가 최종 상태에 도달 (완료 또는 실패 후 처리됨).
2. QA 리뷰 사이클이 차단 이슈 없이 종료.
3. 세션 상태가 최종 결과를 반영.
4. 결과가 향후 참조를 위해 메모리에 기록됨.

---

## 기술 세부사항

### 터미널 대시보드 (oma dashboard)

- **파일 감시:** [chokidar](https://github.com/paulmillr/chokidar)를 `awaitWriteFinish` (200ms 안정성 임계값, 50ms 폴링 간격)와 함께 사용하여 파일이 다 쓰이기 전에 렌더링되는 것을 방지합니다.
- **렌더링:** 모든 파일 변경 이벤트에서 전체 터미널을 지우고 다시 그립니다. ANSI 색상 출력에 `picocolors`를 사용하고 테두리에 유니코드 박스 그리기 문자를 사용합니다.
- **메모리 디렉토리:** `MEMORIES_DIR` 환경 변수, CLI 인자, 또는 `{cwd}/.serena/memories`에서 해석됩니다.
- **안전 종료:** `SIGINT`와 `SIGTERM` 시그널을 수신하면 chokidar 감시자를 닫고 깔끔하게 종료합니다.

### 웹 대시보드 (oma dashboard:web)

- **HTTP 서버:** Node.js `createServer`가 `/`에서 HTML 페이지를, `/api/state`에서 JSON 상태를 제공합니다.
- **WebSocket:** `ws` 라이브러리를 사용합니다. `WebSocketServer`가 HTTP 서버에 연결됩니다. 연결 시 클라이언트가 즉시 전체 상태를 수신합니다. 이후 업데이트는 `{ type: "update", event, file, data }` 메시지로 푸시됩니다.
- **파일 감시:** 터미널 대시보드와 동일한 chokidar 설정. 파일 변경이 `broadcast()` 함수를 트리거하여 현재 상태를 빌드하고 연결된 모든 WebSocket 클라이언트에 전송합니다.
- **디바운싱:** 빠른 파일 쓰기(예: 여러 에이전트가 동시에 진행 상황을 기록할 때) 중 클라이언트 과부하를 방지하기 위해 100ms로 디바운싱됩니다.
- **자동 재연결:** 브라우저 클라이언트가 WebSocket 연결이 끊기면 지수 백오프(1초 초기, 1.5배 승수, 10초 최대)로 재연결합니다.
- **포트:** 기본값 9847, `DASHBOARD_PORT` 환경 변수로 설정 가능.
- **상태 빌드:** `buildFullState()` 함수가 매 업데이트마다 세션 정보, 태스크 보드, 에이전트 상태, 턴 카운트, 활동 피드를 하나의 JSON 객체로 집계합니다.
