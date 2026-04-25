---
title: CLI 명령어
description: 모든 oh-my-agent CLI 명령어의 종합 레퍼런스 — 구문, 옵션, 예제, 카테고리별 정리.
---

# CLI 명령어

전역 설치 후(`bun install --global oh-my-agent`), `oma` 또는 `oh-my-agent`를 사용합니다. 설치 없이 일회성으로 사용하려면 `npx oh-my-agent`를 실행합니다.

환경 변수 `OH_MY_AG_OUTPUT_FORMAT`을 `json`으로 설정하면 이를 지원하는 명령에서 기계 판독 가능한 출력을 강제합니다. 각 명령에 `--json`을 전달하는 것과 동일합니다.

---

## 설정 및 설치

### oma (install)

인자 없이 기본 명령을 실행하면 대화형 설치 프로그램이 시작됩니다.

```
oma
```

**수행 내용:**
1. 레거시 `.agent/` 디렉토리를 확인하고 발견되면 `.agents/`로 마이그레이션합니다.
2. 경쟁 도구를 감지하고 제거를 제안합니다.
3. 프로젝트 타입 선택을 요청합니다 (All, Fullstack, Frontend, Backend, Mobile, DevOps, Custom).
4. 백엔드가 선택된 경우 언어 변형을 요청합니다 (Python, Node.js, Rust, Other).
5. GitHub Copilot 심볼릭 링크에 대해 질문합니다.
6. 레지스트리에서 최신 tarball을 다운로드합니다.
7. 공유 리소스, 워크플로우, 설정, 선택된 스킬을 설치합니다.
8. 모든 벤더(Claude, Codex, Gemini, Qwen)에 대한 벤더 적응을 설치합니다.
9. CLI 심볼릭 링크를 생성합니다.
10. `git rerere` 활성화를 제안합니다.
11. Antigravity IDE 및 Gemini CLI용 MCP 설정을 제안합니다.

**예시:**
```bash
cd /path/to/my-project
oma
# 대화형 안내를 따릅니다
```

### doctor

CLI 설치 상태, MCP 설정, 스킬 상태를 검사합니다.

```
oma doctor [--json] [--output <format>]
```

**옵션:**

| 플래그 | 설명 |
|:-------|:-----|
| `--json` | JSON으로 출력 |
| `--output <format>` | 출력 형식 (`text` 또는 `json`) |

**검사 항목:**
- CLI 설치: gemini, claude, codex, qwen (버전 및 경로).
- 각 CLI의 인증 상태.
- MCP 설정: `~/.gemini/settings.json`, `~/.claude.json`, `~/.codex/config.toml`.
- 설치된 스킬: 어떤 스킬이 존재하고 그 상태.
- Serena 메모리 디렉토리: `.serena/memories/` 존재 여부 및 파일 수.
- 글로벌 워크플로우: `~/.gemini/antigravity/global_workflows/` 설치 상태.
- Git rerere: `rerere.enabled` 글로벌 설정 여부.
- Claude Code 권장 설정: `~/.claude/settings.json`의 최적 설정 확인:
  - `cleanupPeriodDays >= 180` (대화 히스토리 보존)
  - `CLAUDE_CODE_FILE_READ_MAX_OUTPUT_TOKENS >= 100000`
  - `CLAUDE_AUTOCOMPACT_PCT_OVERRIDE >= 80`
  - 텔레메트리/에러 리포팅/피드백 서베이 비활성화
  - 커밋·PR 어트리뷰션 문자열
- 사용자 레벨 CLAUDE.md: `~/.claude/CLAUDE.md`에 OMA 통합 블록(`<!-- OMA:START`) 존재 여부.

**자동 복구:** 누락된 스킬이나 설정이 감지되면 대화형으로 설치를 제안합니다. Claude Code 설정은 권장값을 자동 적용할 수 있습니다.

**예시:**
```bash
# 대화형 텍스트 출력
oma doctor

# CI 파이프라인용 JSON 출력
oma doctor --json

# jq로 파이프하여 특정 검사
oma doctor --json | jq '.clis[] | select(.installed == false)'
```

### update

레지스트리에서 최신 버전으로 스킬을 업데이트합니다.

```
oma update [-f | --force] [--ci]
```

**옵션:**

| 플래그 | 설명 |
|:-------|:-----|
| `-f, --force` | 사용자가 커스터마이즈한 설정 파일(`oma-config.yaml`, `mcp.json`, `stack/` 디렉토리) 덮어쓰기 |
| `--ci` | 비대화형 CI 모드로 실행 (안내 건너뛰기, 일반 텍스트 출력) |

**수행 내용:**
1. 레지스트리에서 `prompt-manifest.json`을 가져와 최신 버전을 확인합니다.
2. `.agents/skills/_version.json`의 로컬 버전과 비교합니다.
3. 이미 최신이면 종료합니다.
4. 최신 tarball을 다운로드하고 추출합니다.
5. 사용자 설정 파일을 보존합니다(`--force` 제외).
6. `.agents/` 위에 새 파일을 복사합니다.
7. 보존된 파일을 복원합니다.
8. 벤더 적응을 업데이트하고 심볼릭 링크를 갱신합니다.

**예시:**
```bash
# 표준 업데이트 (설정 보존)
oma update

# 강제 업데이트 (모든 설정을 기본값으로 리셋)
oma update --force

# CI 모드 (프롬프트 없음, 스피너 없음)
oma update --ci

# 강제 + CI 모드
oma update --ci --force
```

---

## 모니터링 및 메트릭

### dashboard

실시간 에이전트 모니터링을 위한 터미널 대시보드를 시작합니다.

```
oma dashboard
```

옵션 없음. 현재 디렉토리의 `.serena/memories/`를 감시합니다. 세션 상태, 에이전트 테이블, 활동 피드가 포함된 박스 드로잉 UI를 표시합니다. 모든 파일 변경 시 업데이트됩니다. `Ctrl+C`를 눌러 종료합니다.

메모리 디렉토리는 `MEMORIES_DIR` 환경 변수로 오버라이드할 수 있습니다.

**예시:**
```bash
# 표준 사용
oma dashboard

# 커스텀 메모리 디렉토리
MEMORIES_DIR=/path/to/.serena/memories oma dashboard
```

### dashboard:web

웹 대시보드를 시작합니다.

```
oma dashboard:web
```

`http://localhost:9847`에서 실시간 업데이트를 위한 WebSocket 연결이 있는 HTTP 서버를 시작합니다. 브라우저에서 URL을 열어 대시보드를 확인합니다.

**환경 변수:**

| 변수 | 기본값 | 설명 |
|:-----|:-------|:-----|
| `DASHBOARD_PORT` | `9847` | HTTP/WebSocket 서버의 포트 |
| `MEMORIES_DIR` | `{cwd}/.serena/memories` | 메모리 디렉토리 경로 |

**예시:**
```bash
# 표준 사용
oma dashboard:web

# 커스텀 포트
DASHBOARD_PORT=8080 oma dashboard:web
```

### stats

생산성 메트릭을 확인합니다.

```
oma stats [--json] [--output <format>] [--reset]
```

**옵션:**

| 플래그 | 설명 |
|:-------|:-----|
| `--json` | JSON으로 출력 |
| `--output <format>` | 출력 형식 (`text` 또는 `json`) |
| `--reset` | 모든 메트릭 데이터 리셋 |

**추적되는 메트릭:**
- 세션 수
- 사용된 스킬 (빈도 포함)
- 완료된 태스크
- 총 세션 시간
- 변경된 파일, 추가된 줄, 제거된 줄
- 마지막 업데이트 타임스탬프

메트릭은 `.serena/metrics.json`에 저장됩니다. 데이터는 git 통계와 메모리 파일에서 수집됩니다.

**예시:**
```bash
# 현재 메트릭 확인
oma stats

# JSON 출력
oma stats --json

# 모든 메트릭 리셋
oma stats --reset
```

### retro

메트릭과 트렌드가 포함된 엔지니어링 회고입니다.

```
oma retro [window] [--json] [--output <format>] [--interactive] [--compare]
```

**인자:**

| 인자 | 설명 | 기본값 |
|:-----|:-----|:-------|
| `window` | 분석 시간 범위 (예: `7d`, `2w`, `1m`) | 최근 7일 |

**옵션:**

| 플래그 | 설명 |
|:-------|:-----|
| `--json` | JSON으로 출력 |
| `--output <format>` | 출력 형식 (`text` 또는 `json`) |
| `--interactive` | 수동 입력이 있는 대화형 모드 |
| `--compare` | 현재 기간과 이전 동일 기간 비교 |

**표시 내용:**
- 한 줄 요약 (트윗용 메트릭)
- 요약 테이블 (커밋, 변경된 파일, 추가/제거된 줄, 기여자)
- 이전 회고 대비 트렌드 (이전 스냅샷이 존재하는 경우)
- 기여자 리더보드
- 커밋 시간 분포 (시간별 히스토그램)
- 작업 세션
- 커밋 타입 분류 (feat, fix, chore 등)
- 핫스팟 (가장 많이 변경된 파일)

**예시:**
```bash
# 최근 7일 (기본값)
oma retro

# 최근 30일
oma retro 30d

# 최근 2주
oma retro 2w

# 이전 기간과 비교
oma retro 7d --compare

# 대화형 모드
oma retro --interactive

# 자동화용 JSON
oma retro 7d --json
```

---

## 에이전트 관리

### agent:spawn

서브에이전트 프로세스를 생성합니다.

```
oma agent:spawn <agent-id> <prompt> <session-id> [-m <vendor>] [-w <workspace>]
```

**인자:**

| 인자 | 필수 | 설명 |
|:-----|:-----|:-----|
| `agent-id` | 예 | 에이전트 타입. `backend`, `frontend`, `mobile`, `qa`, `debug`, `pm` 중 하나 |
| `prompt` | 예 | 태스크 설명. 인라인 텍스트 또는 파일 경로 가능. |
| `session-id` | 예 | 세션 식별자 (형식: `session-YYYYMMDD-HHMMSS`) |

**옵션:**

| 플래그 | 설명 |
|:-------|:-----|
| `-m, --model <vendor>` | CLI 벤더 오버라이드: `gemini`, `claude`, `codex`, `qwen` |
| `-w, --workspace <path>` | 에이전트의 작업 디렉토리. 생략하면 모노레포 설정에서 자동 감지. |

**벤더 해석 순서:** `--model` 플래그 > oma-config.yaml의 `model_preset (per-agent overrides via `agents:`)` > `default_cli` > cli-config.yaml의 `active_vendor` > `gemini`.

**프롬프트 해석:** 프롬프트 인자가 기존 파일의 경로이면 파일 내용이 프롬프트로 사용됩니다. 그렇지 않으면 인자가 인라인 텍스트로 사용됩니다. 벤더별 실행 프로토콜이 자동으로 추가됩니다.

**예시:**
```bash
# 인라인 프롬프트, 워크스페이스 자동 감지
oma agent:spawn backend "Implement /api/users CRUD endpoint" session-20260324-143000

# 파일에서 프롬프트, 명시적 워크스페이스
oma agent:spawn frontend ./prompts/dashboard.md session-20260324-143000 -w ./apps/web

# 벤더를 Claude로 오버라이드
oma agent:spawn backend "Implement auth" session-20260324-143000 -m claude -w ./api

# 워크스페이스 자동 감지 모바일 에이전트
oma agent:spawn mobile "Add biometric login" session-20260324-143000
```

### agent:status

하나 이상의 서브에이전트 상태를 확인합니다.

```
oma agent:status <session-id> [agent-ids...] [-r <root>]
```

**인자:**

| 인자 | 필수 | 설명 |
|:-----|:-----|:-----|
| `session-id` | 예 | 확인할 세션 ID |
| `agent-ids` | 아니요 | 공백으로 구분된 에이전트 ID 목록. 생략 시 출력 없음. |

**옵션:**

| 플래그 | 설명 | 기본값 |
|:-------|:-----|:-------|
| `-r, --root <path>` | 메모리 확인을 위한 루트 경로 | 현재 디렉토리 |

**상태 값:**
- `completed` — 결과 파일 존재 (선택적 상태 헤더 포함).
- `running` — PID 파일이 존재하고 프로세스가 살아 있음.
- `crashed` — PID 파일이 존재하지만 프로세스가 죽었거나, PID/결과 파일이 없음.

**출력 형식:** 에이전트당 한 줄: `{agent-id}:{status}`

**예시:**
```bash
# 특정 에이전트 확인
oma agent:status session-20260324-143000 backend frontend

# 출력:
# backend:running
# frontend:completed

# 커스텀 루트로 확인
oma agent:status session-20260324-143000 qa -r /path/to/project
```

### agent:parallel

여러 서브에이전트를 병렬로 실행합니다.

```
oma agent:parallel [tasks...] [-m <vendor>] [-i | --inline] [--no-wait]
```

**인자:**

| 인자 | 필수 | 설명 |
|:-----|:-----|:-----|
| `tasks` | 예 | YAML 태스크 파일 경로, 또는 (`--inline` 사용 시) 인라인 태스크 사양 |

**옵션:**

| 플래그 | 설명 |
|:-------|:-----|
| `-m, --model <vendor>` | 모든 에이전트에 대한 CLI 벤더 오버라이드 |
| `-i, --inline` | 인라인 모드: 태스크를 `agent:task[:workspace]` 인자로 지정 |
| `--no-wait` | 백그라운드 모드 — 에이전트를 시작하고 즉시 반환 |

**YAML 태스크 파일 형식:**
```yaml
tasks:
  - agent: backend
    task: "Implement user API"
    workspace: ./api           # 선택, 생략 시 자동 감지
  - agent: frontend
    task: "Build user dashboard"
    workspace: ./web
```

**인라인 태스크 형식:** `agent:task` 또는 `agent:task:workspace` (워크스페이스는 `./` 또는 `/`로 시작해야 함).

**결과 디렉토리:** `.agents/results/parallel-{timestamp}/`에 각 에이전트의 로그 파일이 포함됩니다.

**예시:**
```bash
# YAML 파일에서
oma agent:parallel tasks.yaml

# 인라인 모드
oma agent:parallel --inline "backend:Implement auth API:./api" "frontend:Build login:./web"

# 백그라운드 모드 (대기 없음)
oma agent:parallel tasks.yaml --no-wait

# 모든 에이전트에 벤더 오버라이드
oma agent:parallel tasks.yaml -m claude
```

### agent:review

외부 AI CLI(codex, claude, gemini 또는 qwen)를 사용하여 코드 리뷰를 실행합니다.

```
oma agent:review [-m <vendor>] [-p <prompt>] [-w <path>] [--no-uncommitted]
```

**옵션:**

| 플래그 | 설명 |
|:-------|:-----|
| `-m, --model <vendor>` | 사용할 CLI 벤더: `codex`, `claude`, `gemini`, `qwen`. 기본값은 설정에서 해석된 벤더. |
| `-p, --prompt <prompt>` | 사용자 정의 리뷰 프롬프트. 생략하면 기본 코드 리뷰 프롬프트가 사용됩니다. |
| `-w, --workspace <path>` | 리뷰할 경로. 기본값은 현재 작업 디렉토리. |
| `--no-uncommitted` | 커밋되지 않은 변경 사항 리뷰를 건너뜁니다. 설정 시 세션 내 커밋된 변경 사항만 리뷰합니다. |

**수행 내용:**
- 환경 또는 최근 git 활동에서 현재 세션 ID를 자동 감지합니다.
- `codex`의 경우: 네이티브 `codex review` 서브커맨드를 사용합니다.
- `claude`, `gemini`, `qwen`의 경우: 프롬프트 기반 리뷰 요청을 구성하고 리뷰 프롬프트와 함께 CLI를 호출합니다.
- 기본적으로 작업 디렉토리의 커밋되지 않은 변경 사항을 리뷰합니다.
- `--no-uncommitted` 사용 시 현재 세션 내에서 커밋된 변경 사항만 리뷰합니다.

**예시:**
```bash
# 기본 벤더로 커밋되지 않은 변경 사항 리뷰
oma agent:review

# codex로 리뷰 (네이티브 codex review 명령 사용)
oma agent:review -m codex

# claude로 사용자 정의 프롬프트를 사용하여 리뷰
oma agent:review -m claude -p "보안 취약점과 입력 유효성 검사에 집중"

# 특정 경로 리뷰
oma agent:review -w ./apps/api

# 커밋된 변경 사항만 리뷰 (작업 트리 건너뛰기)
oma agent:review --no-uncommitted

# gemini로 특정 워크스페이스의 커밋된 변경 사항 리뷰
oma agent:review -m gemini -w ./apps/web --no-uncommitted
```

---

## 메모리 관리

### memory:init

Serena 메모리 스키마를 초기화합니다.

```
oma memory:init [--json] [--output <format>] [--force]
```

**옵션:**

| 플래그 | 설명 |
|:-------|:-----|
| `--json` | JSON으로 출력 |
| `--output <format>` | 출력 형식 (`text` 또는 `json`) |
| `--force` | 비어 있거나 기존 스키마 파일 덮어쓰기 |

**수행 내용:** MCP 메모리 도구가 에이전트 상태를 읽고 쓰는 데 사용하는 초기 스키마 파일과 함께 `.serena/memories/` 디렉토리 구조를 생성합니다.

**예시:**
```bash
# 메모리 초기화
oma memory:init

# 기존 스키마 강제 덮어쓰기
oma memory:init --force
```

---

## 통합 및 유틸리티

### auth:status

지원되는 모든 CLI의 인증 상태를 확인합니다.

```
oma auth:status [--json] [--output <format>]
```

**옵션:**

| 플래그 | 설명 |
|:-------|:-----|
| `--json` | JSON으로 출력 |
| `--output <format>` | 출력 형식 (`text` 또는 `json`) |

**확인 항목:** Gemini (API 키), Claude (API 키 또는 OAuth), Codex (API 키), Qwen (API 키).

**예시:**
```bash
oma auth:status
oma auth:status --json
```

### bridge

MCP stdio를 Streamable HTTP 전송으로 브릿지합니다.

```
oma bridge [url]
```

**인자:**

| 인자 | 필수 | 설명 |
|:-----|:-----|:-----|
| `url` | 아니요 | Streamable HTTP 엔드포인트 URL (예: `http://localhost:12341/mcp`) |

**수행 내용:** MCP stdio 전송(Antigravity IDE에서 사용)과 Streamable HTTP 전송(Serena MCP 서버에서 사용) 사이의 프로토콜 브릿지 역할을 합니다. Antigravity IDE가 HTTP/SSE 전송을 직접 지원하지 않아 필요합니다.

**아키텍처:**
```
Antigravity IDE <-- stdio --> oma bridge <-- HTTP --> Serena Server
```

**예시:**
```bash
# 로컬 Serena 서버로 브릿지
oma bridge http://localhost:12341/mcp
```

### verify

서브에이전트 출력을 예상 기준에 대해 검증합니다.

```
oma verify <agent-type> [-w <workspace>] [--json] [--output <format>]
```

**인자:**

| 인자 | 필수 | 설명 |
|:-----|:-----|:-----|
| `agent-type` | 예 | `backend`, `frontend`, `mobile`, `qa`, `debug`, `pm` 중 하나 |

**옵션:**

| 플래그 | 설명 | 기본값 |
|:-------|:-----|:-------|
| `-w, --workspace <path>` | 검증할 워크스페이스 경로 | 현재 디렉토리 |
| `--json` | JSON으로 출력 | |
| `--output <format>` | 출력 형식 (`text` 또는 `json`) | |

**수행 내용:** 지정된 에이전트 타입에 대한 검증 스크립트를 실행하여 빌드 성공, 테스트 결과, 범위 준수를 확인합니다.

**공통 검사 (모든 에이전트 타입):**
- **범위 검사**: `.agents/results/plan-{sessionId}.json`의 태스크 범위를 읽고, `git diff`로 변경된 파일을 정의된 범위 패턴과 비교합니다. 에이전트에 할당된 범위 외의 파일이 수정되면 실패합니다.
- **Charter Preflight**: `result-{agent}.md`에 올바르게 채워진 `CHARTER_CHECK:` 블록이 있는지, 미입력 플레이스홀더가 없는지 확인합니다.
- **하드코딩된 시크릿**: `.py`, `.ts`, `.tsx`, `.js`, `.dart` 파일에서 `password = "..."`, `api_key = "..."` 같은 패턴을 스캔합니다 (테스트/예제 파일은 제외).
- **TODO/FIXME 주석**: `TODO`, `FIXME`, `HACK`, `XXX` 주석 수를 집계합니다 (발견 시 경고).

**에이전트별 검사:**

| 에이전트 타입 | 추가 검사 |
|:------------|:---------|
| `backend` | Python 구문 검증 (`py_compile`), SQL 인젝션 감지 (f-string + SQL 키워드), Python 테스트 실행 (`pytest`) |
| `frontend` | TypeScript 컴파일 (`tsc --noEmit`), 인라인 스타일 감지 (`style={{`), `any` 타입 사용 (3개 초과 시 실패), 프론트엔드 테스트 (`vitest`) |
| `mobile` | Flutter/Dart 분석 (`flutter analyze` 또는 `dart analyze`), Flutter 테스트 (`flutter test`) |
| `qa` | 자체 검사 검증 |
| `debug` | 감지된 프로젝트 타입에 따라 Python 테스트 또는 프론트엔드 테스트 실행 |
| `pm` | `.agents/results/plan-{sessionId}.json`이 존재하고 유효한 JSON인지 검증 |

**출력 형식:**
각 검사는 `PASS`, `FAIL`, `WARN`, `SKIP` 중 하나를 상세 메시지와 함께 보고합니다. 전체 결과는 실패한 검사가 0건일 때만 `ok: true`입니다.

**예시:**
```bash
# 기본 워크스페이스에서 백엔드 출력 검증
oma verify backend

# 특정 워크스페이스에서 프론트엔드 검증
oma verify frontend -w ./apps/web

# CI용 JSON 출력
oma verify backend --json
```

### cleanup

고아 서브에이전트 프로세스 및 임시 파일을 정리합니다.

```
oma cleanup [--dry-run] [-y | --yes] [--json] [--output <format>]
```

**옵션:**

| 플래그 | 설명 |
|:-------|:-----|
| `--dry-run` | 변경하지 않고 정리할 항목을 표시 |
| `-y, --yes` | 확인 프롬프트를 건너뛰고 모든 것을 정리 |
| `--json` | JSON으로 출력 |
| `--output <format>` | 출력 형식 (`text` 또는 `json`) |

**정리 대상:**
- 시스템 임시 디렉토리의 고아 PID 파일 (`/tmp/subagent-*.pid`).
- 고아 로그 파일 (`/tmp/subagent-*.log`).
- `.gemini/antigravity/` 아래의 Gemini Antigravity 디렉토리 (brain, implicit, knowledge).

**예시:**
```bash
# 정리할 항목 미리보기
oma cleanup --dry-run

# 확인 프롬프트와 함께 정리
oma cleanup

# 프롬프트 없이 모든 것 정리
oma cleanup --yes

# 자동화용 JSON 출력
oma cleanup --json
```

### visualize

프로젝트 구조를 의존성 그래프로 시각화합니다.

```
oma visualize [--json] [--output <format>]
oma viz [--json] [--output <format>]
```

`viz`는 `visualize`의 내장 별칭입니다.

**옵션:**

| 플래그 | 설명 |
|:-------|:-----|
| `--json` | JSON으로 출력 |
| `--output <format>` | 출력 형식 (`text` 또는 `json`) |

**수행 내용:** 프로젝트 구조를 분석하고 스킬, 에이전트, 워크플로우, 공유 리소스 간의 관계를 보여주는 의존성 그래프를 생성합니다.

**예시:**
```bash
oma visualize
oma viz --json
```

### star

GitHub에서 oh-my-agent에 별을 달아줍니다.

```
oma star
```

옵션 없음. `gh` CLI가 설치되어 있고 인증되어 있어야 합니다. `first-fluke/oh-my-agent` 리포지토리에 별을 달아줍니다.

**예시:**
```bash
oma star
```

### describe

런타임 인트로스펙션을 위해 CLI 명령을 JSON으로 설명합니다.

```
oma describe [command-path]
```

**인자:**

| 인자 | 필수 | 설명 |
|:-----|:-----|:-----|
| `command-path` | 아니요 | 설명할 명령. 생략 시 루트 프로그램을 설명합니다. |

**수행 내용:** 명령의 이름, 설명, 인자, 옵션, 서브커맨드가 포함된 JSON 객체를 출력합니다. AI 에이전트가 사용 가능한 CLI 기능을 이해하는 데 사용됩니다.

**예시:**
```bash
# 모든 명령 설명
oma describe

# 특정 명령 설명
oma describe agent:spawn

# 서브커맨드 설명
oma describe "agent:parallel"
```

### help

도움말 정보를 표시합니다.

```
oma help
```

사용 가능한 모든 명령이 포함된 전체 도움말 텍스트를 표시합니다.

### version

버전 번호를 표시합니다.

```
oma version
```

현재 CLI 버전을 출력하고 종료합니다.

---

## 환경 변수

| 변수 | 설명 | 사용처 |
|:-----|:-----|:-------|
| `OH_MY_AG_OUTPUT_FORMAT` | `json`으로 설정하면 지원하는 모든 명령에서 JSON 출력을 강제 | `--json` 플래그가 있는 모든 명령 |
| `DASHBOARD_PORT` | 웹 대시보드의 포트 | `dashboard:web` |
| `MEMORIES_DIR` | 메모리 디렉토리 경로 오버라이드 | `dashboard`, `dashboard:web` |

---

## 별칭

| 별칭 | 전체 명령 |
|:-----|:---------|
| `viz` | `visualize` |
