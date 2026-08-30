---
title: CLI 명령어
description: 모든 oh-my-agent CLI 명령어의 종합 레퍼런스입니다. 구문, 옵션, 예제, 카테고리별 정리를 다룹니다.
---

# CLI 명령어

전역 설치 후(`bun install --global oh-my-agent`), `oma` 또는 `oh-my-agent`을 사용합니다. 설치 없이 일회성으로 사용하려면 `npx oh-my-agent`을 실행합니다.

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
8. 선택된 벤더에 대한 벤더 적응을 설치합니다 (프로젝트 로컬 설정; 조용한 HOME 레벨 벤더 write 없음).
9. CLI 심볼릭 링크를 생성합니다.
10. 권장 **전역** git 설정을 제안합니다 (opt-in confirm):
    - `rerere.enabled=true`: 멀티 에이전트 머지 충돌 재사용
    - `init.defaultBranch=main`: 새 저장소 기본 브랜치 일관성
    - `--yes` / CI에서는 전역 write 없이 수동 수정 힌트만 출력
11. 해당되는 경우 MCP 설정을 제안합니다.
12. `gh` 인증 시 GitHub star를 제안합니다.

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
- CLI 설치: agy, claude, codex, qwen (버전 및 경로).
- 각 CLI의 인증 상태.
- MCP 설정: `~/.gemini/settings.json`, `~/.claude.json`, `~/.codex/config.toml`.
- 설치된 스킬: 어떤 스킬이 존재하고 그 상태.
- 메모리 스토어 디렉토리: `.agents/state/memories/` 존재 여부 및 파일 수 (구버전은 레거시 `.serena/memories/` 경로로 폴백).
- 이중 설치 마커(프로젝트 vs global) 및 관련 경고.
- 권장 **전역** git 설정 (JSON의 `gitRecommended`):
  - `rerere.enabled=true`
  - `init.defaultBranch=main`
  - 불일치마다 `totalIssues`에 반영
- 프로젝트 벤더 컨텍스트 파일 (해당 CLI가 설치된 경우 `CLAUDE.md` / `AGENTS.md`의 OMA 블록 등).
- AgentMemory, state/hooks 헬스, Serena reaper 진단 및 관련 이슈 카운터.

**자동 복구:** 누락된 스킬이 감지되면 대화형으로 설치를 제안합니다. 권장 git 설정이 없거나 다르면 install/update와 동일한 opt-in 전역 수정을 제안합니다.

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
| `-y, --yes` | 안내를 건너뜁니다. 벤더 범위는 그대로입니다. `--all`이나 `--vendor`를 주지 않으면 이미 있는 벤더 디렉토리만 업데이트합니다. |
| `--all` | 지원하는 모든 프로젝트 범위 벤더를 만들거나 업데이트합니다. |
| `--vendor <vendors>` | 특정 벤더를 만들거나 업데이트합니다. `claude,qwen`처럼 쉼표로 구분한 목록을 받습니다. |

**수행 내용:**
1. 레지스트리에서 `prompt-manifest.json`을 가져와 최신 버전을 확인합니다.
2. `.agents/skills/_version.json`의 로컬 버전과 비교합니다.
3. 이미 최신이면 종료합니다.
4. 최신 tarball을 다운로드하고 추출합니다.
5. 사용자 설정 파일을 보존합니다(`--force` 제외).
6. `.agents/` 위에 새 파일을 복사합니다.
7. 보존된 파일을 복원합니다.
8. 벤더 적응을 업데이트하고 심볼릭 링크를 갱신합니다.
9. 권장 **전역** git 설정을 제안합니다 (install과 동일한 opt-in: `rerere.enabled`, `init.defaultBranch`). `--yes` / `--ci`에서는 건너뜁니다.

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

### link

다시 설치하지 않고 `.agents/` 원본에서 벤더 네이티브 파일을 재생성합니다.

```
oma link [vendors...] [--global]
```

**예제:**

```bash
# 설정된 모든 벤더 재생성
oma link

# Claude와 Codex 파일만 재생성
oma link claude codex

# 어느 디렉토리에서든 HOME 설치(~/.agents/) 재생성
oma link opencode --global
```

`--global`이 없으면 link는 `<cwd>/.agents/`를, 있으면 `~/.agents/`(또는 `OMA_HOME`)를 대상으로 삼습니다. [글로벌 설치](../guide/global-install.md)를 참고하세요.

**수행 내용:**
1. `.agents/agents/`에서 벤더 네이티브 에이전트 파일을 다시 만듭니다
2. 선택한 벤더의 훅과 로컬 설정을 갱신합니다
3. `CLAUDE.md`, `GEMINI.md`, `AGENTS.md`의 통합 블록을 재생성합니다
4. 필요하면 Cursor MCP 연결과 CLI 스킬 심볼릭 링크를 갱신합니다

`.agents/agents/`, `.agents/workflows/`, `.agents/rules/`, 훅 정의를 수정한 뒤에 실행하세요.

**모델 동작:**
- 같은 벤더 네이티브 디스패치는 생성된 벤더 에이전트 파일에 정의된 모델을 씁니다.
- 외부 폴백 디스패치는 `.agents/skills/oma-orchestration/config/cli-config.yaml`의 벤더별 `default_model`을 씁니다.

**디스패치 동작:**
- 대상 벤더가 현재 런타임과 같고 그 런타임이 네이티브 역할 에이전트를 지원하면 OMA는 네이티브 디스패치를 씁니다.
- 그렇지 않으면 `oma agent:spawn`으로 폴백합니다.

### setup (워크플로우)

`/setup` 워크플로우는 에이전트 세션 안에서 호출하며, 언어, CLI 설치, MCP 연결, 에이전트-CLI 매핑을 대화형으로 설정합니다. 설치 프로그램인 `oma`와는 다릅니다. `/setup`은 이미 설치된 인스턴스를 설정합니다.

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
- 총 입력 토큰 (프롬프트 문자 수 기반 근사치이며, 출력 토큰은 아직 포함하지 않습니다)
- 총 스폰 수
- 벤더별 입력 토큰 단가를 보수적으로 적용한 추정 USD (Claude $3/M, Codex $5/M, Gemini $0.3/M, Qwen $0/M, Cursor $5/M, Antigravity $0.3/M)
- 벤더별 내역 (토큰 · 스폰 · USD)

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

### recap

Claude, Codex, Qwen, Cursor 세션에 걸친 AI 도구 대화 이력을 회고합니다.

```
oma recap [--window <period>] [--date <date>] [--tool <tools>] [--top <n>] [--sort <metric>] [--mermaid] [--graph] [--json] [--output <format>]
```

**옵션:**

| 플래그 | 설명 | 기본값 |
|:-----|:-----------|:--------|
| `--window <period>` | 시간 구간: `1d`, `3d`, `7d`, `2w`, `30d` | `1d` |
| `--date <date>` | 특정 날짜(`YYYY-MM-DD`). `--window`보다 우선합니다 | |
| `--tool <tools>` | 쉼표로 구분한 필터: `grok,claude,codex,qwen,cursor,antigravity` | 전체 |
| `--top <n>` | 상위 N개 프로젝트와 주제 표시 | |
| `--sort <metric>` | `count` 또는 `duration` 기준 정렬 | `count` |
| `--mermaid` | Mermaid 간트 차트로 출력 | |
| `--graph` | 브라우저에서 인터랙티브 그래프 열기 | |
| `--json` / `--output <format>` | 기계 판독 가능한 출력 | `text` |

**예제:**

```bash
oma recap                                     # Today (1d)
oma recap --window 7d                         # Last week
oma recap --date 2026-04-20 --tool grok,claude
oma recap --window 7d --mermaid > week.mmd
oma recap --window 30d --graph                # Interactive browser graph
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
| `-m, --model <vendor>` | CLI 벤더 오버라이드: `antigravity`, `claude`, `codex`, `cursor`, `qwen`, `grok`, `pi` |
| `-w, --workspace <path>` | 에이전트의 작업 디렉토리. 생략하면 모노레포 설정에서 자동 감지. |
| `--isolation <mode>` | 스폰별 격리 모드입니다. 현재 `worktree`를 지원하며, `${tmpdir}/oma-worktrees/{sessionId}/{agentId}`에 `oma/{sessionId}/{agentId}` 브랜치로 새 git 워크트리를 만들고 거기서 에이전트를 실행합니다. 종료 후에도 워크트리는 남으며, 수동 검토용 머지·폐기 명령을 출력합니다(자동 머지는 하지 않습니다). |
| `--read-only` | 스폰된 에이전트를 비파괴 도구로 제한합니다(자동 승인 플래그를 억제합니다). `oma skills eval --live`가 두 평가 갈래 모두에 내부적으로 씁니다. |

**종료 코드:**

| 코드 | 의미 |
|:-----|:--------|
| `0` | 벤더 프로세스가 0으로 종료했고 워크스페이스 아래에 세션 결과 아티팩트가 있습니다. |
| `3` | 벤더 프로세스는 0으로 종료했지만 워크스페이스 아래에 **세션 결과 아티팩트를 남기지 않았습니다**(예: agy가 `-w` 대신 자기 신뢰 루트에 쓴 경우). 세션 기록에 `blocker.raised` 이벤트가 추가되고 `agent:status`는 `no-artifact`로 보고합니다. 스폰이 완료된 것으로 취급하지 마세요. |
| 그 외 | 벤더 프로세스 자체가 실패했으며, 그 종료 코드를 그대로 전달합니다. |

**벤더 해석 순서:** `--model` 플래그 > `oma-config.yaml`의 `agents:` 오버라이드 > 활성 `model_preset`의 에이전트 기본값.

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
- `completed`: 결과 파일이 존재합니다(선택적 상태 헤더 포함).
- `running`: PID 파일이 존재하고 프로세스가 살아 있습니다.
- `crashed`: PID 파일이 존재하지만 프로세스가 죽었거나, PID/결과 파일이 없습니다.
- `no-artifact`: 벤더 프로세스가 0으로 종료했지만 워크스페이스 아래에 세션 결과 아티팩트를 남기지 않았습니다(엉뚱한 곳에 조용히 쓴 경우로, `agent:spawn`의 종료 코드 `3`을 참고하세요). 실패한 스폰으로 취급하세요.

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
| `--no-wait` | 백그라운드 모드(에이전트를 시작하고 즉시 반환) |

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

외부 AI CLI(codex, claude 또는 qwen)를 사용하여 코드 리뷰를 실행합니다.

```
oma agent:review [-m <vendor>] [-p <prompt>] [-w <path>] [--no-uncommitted]
```

**옵션:**

| 플래그 | 설명 |
|:-------|:-----|
| `-m, --model <vendor>` | 사용할 CLI 벤더: `antigravity`, `codex`, `claude`, `qwen`. 기본값은 설정에서 해석된 벤더. |
| `-p, --prompt <prompt>` | 사용자 정의 리뷰 프롬프트. 생략하면 기본 코드 리뷰 프롬프트가 사용됩니다. |
| `-w, --workspace <path>` | 리뷰할 경로. 기본값은 현재 작업 디렉토리. |
| `--no-uncommitted` | 커밋되지 않은 변경 사항 리뷰를 건너뜁니다. 설정 시 세션 내 커밋된 변경 사항만 리뷰합니다. |

**수행 내용:**
- 환경 또는 최근 git 활동에서 현재 세션 ID를 자동 감지합니다.
- `codex`의 경우: 네이티브 `codex review` 서브커맨드를 사용합니다.
- `claude`, `qwen`의 경우: 프롬프트 기반 리뷰 요청을 구성하고 리뷰 프롬프트와 함께 CLI를 호출합니다.
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

### goal:set

활성 영구 워크플로우(orchestrate, ultrawork, work, ralph)에 목표 계약을 붙입니다. 이 계약은 영구 모드 Stop 훅이 기계적으로 강제하므로, 완료 여부가 더 이상 모델의 판단에 달려 있지 않습니다.

```
oma goal:set [--workflow <name>] [--session <id>] [--gate <keyword>] [--budget-minutes <n>] [--description <text>]
```

**옵션:**

| 플래그 | 설명 |
|:-----|:-----------|
| `--gate <keyword>` | 결정론적 정지 게이트로 `typecheck`, `test`, `lint` 중 하나입니다. 같은 이름의 package.json 스크립트로 연결되며 셸 없이 argv 배열로 실행합니다. 설정된 동안 Stop 훅은 **이 스크립트가 통과할 때만** 워크플로우 종료를 허용하고, 실패하면 출력 끝부분과 함께 차단해 에이전트가 무엇을 고쳐야 할지 알게 합니다. 자유 형식 명령은 거부합니다. 게이트 값은 에이전트가 쓸 수 있는 상태 파일에 있으므로, 임의 문자열을 실행하면 권한 계층을 우회하게 되기 때문입니다. |
| `--budget-minutes <n>` | 워크플로우 활성화 시점부터 재는 wall-clock 예산입니다. 이를 넘기면 Stop 훅이 워크플로우를 비활성화하고 솔직하게 부분 완료로 멈추도록 허용합니다(기계 판정이며, 세션 이벤트 기록에 `gate: "budget"`과 함께 `gate.failed`로 남습니다). |
| `--description <text>` | 목표에 대한 사람용 설명입니다. 정보 제공 목적으로만 씁니다. |
| `--workflow <name>` | 여러 영구 워크플로우가 활성일 때 대상 워크플로우를 지정합니다. |
| `--session <id>` | 상태 파일의 대상 세션 id 접미사입니다. |

**동작 참고:**
- 게이트 통과 → 워크플로우가 비활성화되고 `gate.passed`가 발생하며 종료가 허용됩니다.
- 게이트 실패와 타임아웃(60초 하드 캡)은 모두 강화 한도(5회)에 반영되므로, 영원히 빨간 게이트가 종료를 계속 막을 수는 없습니다. 최종 안전장치로 2시간 staleness 만료가 남아 있습니다.
- 목표 계약이 없으면 영구 모드는 이전과 똑같이 동작합니다(강화 프롬프트만). 계약은 전적으로 선택 사항입니다.

**예제:**
```bash
# After starting /ultrawork: require typecheck to pass before the session may end
oma goal:set --gate typecheck

# Bound an autonomous run: stop honestly after 2 hours even if incomplete
oma goal:set --workflow ultrawork --gate test --budget-minutes 120
```

---

## 예약 에이전트

### schedule:add

예약 에이전트 작업을 등록합니다. `--cron`과 `--every` 중 정확히 하나가 필요합니다.

```
oma schedule:add <agent-id> <prompt> --cron "<5-field>" | --every "<phrase>" [-m <vendor>] [-w <path>] [--once] [--max-age-days <n>] [--env <KEY1,KEY2>]
```

**인자:**

| 인자 | 필수 | 설명 |
|:---------|:---------|:-----------|
| `agent-id` | 예 | 에이전트 타입: `backend`, `frontend`, `mobile`, `qa`, `debug`, `pm` |
| `prompt` | 예 | 발동 시점에 에이전트에 전달할 태스크 설명 |

**옵션:**

| 플래그 | 설명 |
|:-----|:-----------|
| `--cron "<expr>"` | 5필드 cron 표현식(예: `"0 9 * * *"`). `--every`와 함께 쓸 수 없습니다. |
| `--every "<phrase>"` | 자연어 간격: `5m`, `2h`, `1d`, `every 20m`, `every 5 minutes`. cron으로 표현할 수 있는 가장 가까운 단위로 반올림하고 안내를 출력합니다. `--cron`과 함께 쓸 수 없습니다. |
| `-m, --model <vendor>` | `oma agent:spawn`에 전달할 CLI 벤더 오버라이드: `antigravity`, `claude`, `codex`, `cursor`, `opencode`, `qwen`, `grok`, `pi`. 기본값은 자동 감지입니다. |
| `-w, --workspace <path>` | 에이전트의 작업 디렉토리입니다. 기본값은 등록 시점의 현재 디렉토리입니다. |
| `--once` | 일회성 모드입니다. 한 번 발동한 뒤 스스로 제거됩니다. |
| `--max-age-days <n>` | 반복 작업을 N일 뒤 자동 만료시킵니다(`0`은 무기한). |
| `--env <KEY1,KEY2>` | 지정한 환경 변수를 `~/.agents/schedule/env/<id>`(권한 0600)에 캡처해 실행 시점에 주입합니다. 나열한 키만 캡처하며, 환경 전체를 덤프하지 않습니다. |

**수행 내용:**
1. cron 표현식을 파싱하고 검증합니다(또는 `--every` 표현을 cron으로 변환합니다).
2. 작업을 `~/.agents/schedule/schedules.json`(글로벌 매니페스트, 권한 0600)에 씁니다.
3. OS 스케줄러(launchd / systemd --user / schtasks)에 작업을 등록합니다. OS 작업은 설정된 간격마다 `oma schedule:run <id>`를 호출합니다.

**예제:**
```bash
# Exact cron: weekdays at 9 AM
oma schedule:add qa-reviewer "Run QA review on latest changes" --cron "0 9 * * 1-5"

# Natural language: every 2 hours
oma schedule:add backend "Check for slow queries" --every "2h"

# One-shot, pinned vendor and workspace
oma schedule:add pm "Generate sprint plan" --cron "0 9 * * 1" --once -m claude -w /path/to/project

# Capture specific env vars for the job
oma schedule:add backend "Sync external data" --cron "0 * * * *" --env SYNC_API_KEY,SYNC_TARGET_URL
```

전체 흐름은 [예약 에이전트 가이드](../guide/scheduled-agents.md)를 참고하세요.

### schedule:list

모든 프로젝트의 예약 작업을 프로젝트별로 묶어 나열하고 OS 드리프트 상태를 함께 보여줍니다.

```
oma schedule:list [--json]
```

**옵션:**

| 플래그 | 설명 |
|:-----|:-----------|
| `--json` | JSON으로 출력 |

**드리프트 상태:** `synced`(매니페스트와 OS가 일치), `missing-in-os`(`schedule:sync`로 복구), `orphan-in-os`(매니페스트에 없는 작업이 OS에 있음. `schedule:sync --prune`으로 제거).

**예제:**
```bash
oma schedule:list
oma schedule:list --json | jq '.jobs[] | select(.drift != "synced")'
```

### schedule:remove

예약 작업을 매니페스트와 OS 스케줄러 양쪽에서 제거합니다.

```
oma schedule:remove <id>
```

**인자:**

| 인자 | 필수 | 설명 |
|:---------|:---------|:-----------|
| `id` | 예 | `schedule:list`에서 얻은 작업 ID(형식: `sch_<base32-12>`) |

**예제:**
```bash
oma schedule:remove sch_abc123def456
```

### schedule:run

ID로 예약 작업을 실행합니다. 발동 시점에 OS 스케줄러가 호출하는 진입점입니다. 보통 직접 실행하지 않지만 작업을 디버깅할 때 쓸 수 있습니다.

```
oma schedule:run <id>
```

**수행 내용:**
1. 매니페스트에서 `<id>`를 찾습니다(없으면 0이 아닌 코드로 종료합니다).
2. `~/.agents/schedule/env/<id>`에서 캡처한 환경 변수를 읽어 주입합니다.
3. `oma agent:spawn <agentId> <prompt> <sessionId> -m <vendor> -w <workspace>`를 호출합니다.
4. 결과를 `~/.agents/schedule/runs/<id>/<ISO-timestamp>.md`에 씁니다.
5. 매니페스트의 `lastFiredAt`을 갱신하고, `--once` 작업이면 스스로 제거합니다.
6. 인증이 만료되면 요란하게 실패합니다. 0이 아닌 코드로 종료하고 stderr에 `re-auth required: <vendor>`를 출력합니다. 조용히 성공한 척하지 않습니다.

**예제:**
```bash
# Invoke manually to debug a job
oma schedule:run sch_abc123def456
```

### schedule:sync

매니페스트를 OS 스케줄러와 다시 동기화합니다. 시스템 마이그레이션이나 OS 스케줄러 초기화 후 드리프트를 복구합니다.

```
oma schedule:sync [--prune]
```

**옵션:**

| 플래그 | 설명 |
|:-----|:-----------|
| `--prune` | 매니페스트에 없는 OS 작업(orphan-in-os)도 함께 제거합니다. `--prune`이 없으면 고아 작업을 보고만 하고 제거하지 않습니다. |

**예제:**
```bash
# Repair missing-in-os jobs
oma schedule:sync

# Repair missing-in-os AND remove orphans
oma schedule:sync --prune
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
| `--profile` | 프로파일 상태 매트릭스를 표시합니다. 활성 `model_preset`과 `agents:` 오버라이드에서 해석된 에이전트별 모델 슬러그, CLI, 인증 상태를 보여줍니다. [에이전트별 모델](../guide/per-agent-models.md)을 참고하세요. |

**확인 항목:** GitHub CLI (`gh`), Antigravity CLI (`agy`), Gemini (API 키), Claude (API 키 또는 OAuth), Codex (API 키), Cursor CLI, Qwen (API 키).

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
| `url` | 아니요 | 공유 데몬을 해석하는 대신 호출자가 관리하는 엔드포인트에 연결합니다 |
| `--context` | 아니요 | 데몬용 Serena 컨텍스트입니다(기본값 `ide`). 데몬은 이 값으로 구분됩니다 |

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

서브에이전트 출력을 예상 기준에 따라 검증합니다.

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

**수행 내용:** 지정된 에이전트 타입의 검증 스크립트를 실행하여 빌드 성공, 테스트 결과, 범위 준수를 확인합니다.

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

### hook

중앙 집중식 oma 훅 라우터(design 019)를 통해 벤더 훅 이벤트를 디스패치합니다. 모든 벤더가 생성한 `oma-hook.sh` 래퍼가 호출하는 정규 ABI입니다. 핸들러 체인을 따로 떼어 디버깅하거나 테스트할 때 직접 쓸 수도 있습니다.

```
oma hook --vendor <v> --event <nativeEvent> [--matcher <tool>]
```

**옵션:**

| 플래그 | 필수 | 설명 |
|:-----|:---------|:-----------|
| `--vendor <v>` | 예 | 벤더 식별자: `claude`, `codex`, `cursor`, `gemini`, `grok`, `kiro`, `qwen`, `antigravity` 중 하나입니다. (`pi` 벤더는 여기서 **유효하지 않습니다**. `oma hook` 대신 인프로세스 `installPiExtension` 브릿지를 씁니다.) |
| `--event <e>` | 예 | 벤더 설정에 등록된 네이티브 훅 이벤트 이름(예: `UserPromptSubmit`, `PreToolUse`, `Stop`) |
| `--matcher <m>` | 아니오 | 훅 등록에서 넘어온 선택적 도구 이름이나 매처(예: `Bash`) |

**stdin / stdout 계약:**
- **stdin**: 벤더 네이티브 JSON 페이로드(벤더가 훅 프로세스에 넘기는 것과 같은 객체).
- **stdout**: 핸들러가 발동하면 벤더 방언 JSON(kiro 프롬프트는 일반 텍스트), 아무 핸들러도 출력하지 않으면 빈 값.
- **종료 코드**: 항상 `0`입니다(fail-open. 오류는 stderr로 나가고 에이전트를 절대 막지 않습니다).

**런타임 데이터 흐름:**
```
vendor fires: oma-hook.sh --vendor claude --event UserPromptSubmit
  stdin: {"prompt":"...","cwd":"/project","sessionId":"..."}
  → oma hook resolves handler chain from .agents/hooks/variants/claude.json
  → runs: keyword-detector → state-boundary → skill-injector (in-process)
  → merges HandlerResult values (context: concat; pre_tool: last mutate wins; stop: any block)
  → emits vendor dialect to stdout
  → exit 0
```

**핸들러 체인을 따로 떼어 디버깅하기:**

```bash
# Test what keyword-detector injects for a given prompt (Claude)
echo '{"prompt":"orchestrate the auth feature","cwd":"/path/to/project"}' \
  | oma hook --vendor claude --event UserPromptSubmit

# Test a Bash pre_tool block (Claude)
echo '{"tool_name":"Bash","tool_input":{"command":"rm -rf /"},"cwd":"/path/to/project"}' \
  | oma hook --vendor claude --event PreToolUse --matcher Bash

# Test persistent-mode Stop enforcement (Codex)
echo '{"cwd":"/path/to/project"}' \
  | oma hook --vendor codex --event Stop

# Test a Gemini BeforeTool event
echo '{"tool_name":"run_shell_command","tool_input":{"command":"cat /etc/passwd"},"cwd":"/path/to/project"}' \
  | oma hook --vendor gemini --event BeforeTool
```

stdout이 비어 있으면 해당 이벤트에서 체인이 아무 일도 하지 않았다는 뜻입니다. stdout에 나온 JSON 객체는 에이전트 세션이 받게 될 벤더 방언입니다.

**범위 참고:**
- `statusLine`과 hud 항목은 `oma hook`을 거치지 않습니다(표시 경로는 지연을 아끼려고 `bun`을 직접 호출합니다).
- pi 벤더는 `oma hook`이 아니라 인프로세스 `installPiExtension` 브릿지를 씁니다.
- 데몬 소켓 경로(`SocketTransport`)는 이후 단계이며, 현재 전송은 항상 인프로세스입니다.

라우터 구현은 `cli/commands/hook/command.ts`(내부적으로 "design 019"라고 부릅니다)를, 벤더별 호환성 매트릭스는 `cli/commands/hook/probe/`를 참고하세요.

**예제:**
```bash
# Inspect Claude keyword-detection output for a real prompt
echo '{"prompt":"plan the new checkout feature","cwd":"'$(pwd)'"}' \
  | oma hook --vendor claude --event UserPromptSubmit

# Verify a Qwen Stop event fires the persistent-mode block
echo '{"cwd":"'$(pwd)'"}' | oma hook --vendor qwen --event Stop

# Check Gemini hook output format
echo '{"prompt":"brainstorm","cwd":"'$(pwd)'"}' \
  | oma hook --vendor gemini --event BeforeAgent
```

---

### hook:probe

벤더별 훅 호환성을 확인하고 커버리지 매트릭스를 출력합니다.

```
oma hook:probe [--vendor <list>] [--format <fmt>] [--hooks-dir <dir>]
```

**옵션:**

| 플래그 | 설명 | 기본값 |
|:-----|:-----------|:--------|
| `--vendor <list>` | 확인할 벤더를 쉼표로 구분 | 지원하는 모든 벤더 |
| `--format <fmt>` | 출력 형식: `text`, `md`, `json` | `text` |
| `--hooks-dir <dir>` | `.agents/hooks/core` 디렉토리 오버라이드 | 자동 감지 |

**확인 항목:** 벤더마다 코어 훅 스크립트(`keyword-detector`, `persistent-mode` 등)가 있는지, 변형 JSON이 이벤트를 핸들러 체인에 올바르게 매핑하는지 확인합니다. 어느 벤더든 `failed` 상태를 보고하면 종료 코드는 `1`입니다.

**예제:**
```bash
# Text matrix for all vendors
oma hook:probe

# Markdown matrix (useful in CI PR comments)
oma hook:probe --format md

# JSON for programmatic consumption
oma hook:probe --format json | jq '.results[] | select(.status == "failed")'

# Probe a subset of vendors
oma hook:probe --vendor claude,codex,gemini
```

---

### vault

API 키를 비롯한 시크릿을 OS 키체인(macOS Keychain, Linux Secret Service, Windows Credential Manager)에서 관리합니다. `@napi-rs/keyring`을 씁니다. 값은 셸 히스토리나 환경 파일에 절대 남지 않으며, 키 이름만 `~/.config/oma/vault-index.json`에 기록해 `oma vault list`가 값을 노출하지 않고도 목록을 보여줄 수 있게 합니다.

```
oma vault store <name> [--value <value>]
oma vault get <name>
oma vault list [--json]
oma vault rm <name>
```

**서브커맨드:**

| 서브커맨드 | 설명 |
|:------------|:-----------|
| `store <name>` | 시크릿 값을 숨김 입력으로 받아 OS 키체인의 `name` 아래에 씁니다. `--value <value>`는 비대화형용으로 값을 인라인으로 받습니다(셸 히스토리에 남으므로 프롬프트를 권장합니다). |
| `get <name>` | 저장된 값을 아무 장식 없이 stdout에 출력하므로 셸 안에서 바로 쓸 수 있습니다: `export ANTHROPIC_API_KEY=$(oma vault get anthropic)`. 키가 없으면 종료 코드 `2`로 끝납니다. |
| `list` | 저장된 키 이름과 `createdAt` 타임스탬프를 나열합니다. 값은 절대 표시하지 않습니다. |
| `rm <name>` | 키체인과 인덱스에서 시크릿을 제거합니다. |

**키 이름 규칙:** `[A-Za-z0-9._-]`로 이루어진 1~64자입니다. 예: `anthropic`, `openai-prod`, `github_pat`, `sentry.dsn`.

**네이티브 의존성:** `@napi-rs/keyring` 네이티브 모듈은 지연 로딩합니다. 로딩에 실패하면(예: `libsecret`이나 `gnome-keyring`이 없는 헤드리스 리눅스) 조용히 폴백하지 않고 설치 힌트와 함께 명시적인 오류를 냅니다.

**예제:**
```bash
# Store with a hidden interactive prompt
oma vault store anthropic

# Non-interactive (note: value is visible in shell history)
oma vault store openai --value sk-test-...

# Use in a shell pipeline
export ANTHROPIC_API_KEY=$(oma vault get anthropic)
oma agent:spawn backend "Refactor /api/auth" session-20260517-150000

# List entries (names only)
oma vault list

# Remove
oma vault rm anthropic
```

---

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
- **고아 Serena 언어 서버**: MCP 클라이언트(예: Claude)가 종료하면 그 `serena start-mcp-server`가 init으로 재부모화되고, LSP 자식 프로세스(`tsserver`, `pyright` 등, 수백 MB)가 클라이언트 없이 계속 돕니다. 여기서 이런 프로세스를 회수합니다. *놀고 있지만 아직 붙어 있는* 경우는 [`serena reap`](#serena)이 따로 처리합니다.
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

### serena

Serena의 프로젝트별 언어 서버가 잡고 있는 메모리를 회수합니다. Serena는 열려 있는 프로젝트마다 LSP 스택(`tsserver`, `pyright` 등, 약 300MB)을 띄우고 세션 내내 살려 두기 때문에, 프로젝트를 여러 개 열어 두면 부담이 커집니다. reaper는 놀고 있는 LSP 자식 프로세스를 종료하며, Serena는 다음 도구 호출 때 스스로 복구해 다시 띄웁니다(재시작이 필요 없습니다).

```
oma serena reap [--dry-run] [--quiet]
oma serena reaper:enable [--dry-run]
oma serena reaper:disable [--dry-run]
```

**서브커맨드:**

| 명령 | 설명 |
|:--------|:-----------|
| `serena reap` | 지금 한 번 유휴 LSP를 회수합니다. 대화형 실행은 항상 수행하고, 예약 경로인 `--quiet`는 `enabled` 옵트인을 따릅니다. |
| `serena reap --dry-run` | 회수 대상과 예상 확보 메모리를 미리 보여주며, 절대 종료하지 않습니다. |
| `serena reaper:enable` | 5분마다 `serena reap --quiet`를 실행하는 백그라운드 작업을 설치합니다(launchd / systemd 타이머 / Windows 작업 스케줄러). |
| `serena reaper:disable` | 백그라운드 작업을 제거합니다. |

**정책:** `lru`(기본값)는 최근에 활동한 프로젝트를 `keepWarm`개만큼 살려 두고 나머지를 회수합니다. `idle`은 `idleMinutes`를 넘겨 놀고 있는 프로젝트를 회수합니다. `graceSeconds` 구간이 진행 중인 도구 호출을 보호합니다.

**설정** (`.agents/oma-config.yaml`. 옵트인이며 기본값은 비활성입니다):

```yaml
serena_reaper:
  enabled: false     # gates the scheduled (--quiet) path; interactive reap always runs
  policy: lru        # lru | idle
  keepWarm: 2        # LRU: keep this many most-recently-active projects warm
  idleMinutes: 10    # idle threshold / LRU secondary floor
  graceSeconds: 90   # in-flight protection; SIGTERM→SIGKILL window
```

프로젝트별 KEEP/REAP 상태와 활동 신호 출처 같은 진단은 [`oma doctor`](#doctor)가 보여줍니다. 클라이언트가 죽어 고아가 된 Serena LSP는 이 설정과 무관하게 [`oma cleanup`](#cleanup)이 회수합니다.

**예제:**
```bash
# See what would be reclaimed across all open projects
oma serena reap --dry-run

# Reap idle LSPs once, right now
oma serena reap

# Turn on automatic 5-minute background reaping
#   (set serena_reaper.enabled: true in oma-config.yaml first)
oma serena reaper:enable

# Turn it back off
oma serena reaper:disable
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

### search

fetch, 메타데이터, RSS, 미디어, 코드, 신뢰도 점수를 아우르는 기계적 검색 프리미티브입니다. `oma s`로 줄여 쓸 수 있습니다. 모든 서브커맨드는 stdout에 JSON을 출력합니다(한 줄에 객체 하나, `--pretty`를 주면 보기 좋게 출력).

```
oma search <subcommand> ...
oma s <subcommand> ...
```

**서브커맨드:**

| 서브커맨드 | 용도 |
|:-----------|:--------|
| `fetch <url>` | 자동 에스컬레이션 전략 파이프라인(api → probe → impersonate → browser → archive)으로 URL을 가져옵니다 |
| `api <url>` | 매칭된 플랫폼 API 핸들러로 가져옵니다 (Phase 0) |
| `api:search <query>` | 지원하는 플랫폼에 키워드 검색을 병렬로 보냅니다 (`--platforms <list>`) |
| `meta <url>` | OGP / JSON-LD / Schema.org 메타데이터를 추출합니다 |
| `rss <url>` | RSS / Atom 피드를 찾아 파싱합니다 |
| `rss:google <query>` | 쿼리에 대한 Google News RSS URL을 만듭니다 |
| `media <url>` | `yt-dlp`로 미디어 메타데이터를 추출합니다 (1858개 사이트) |
| `archive <url>` | AMP / archive.today / Wayback 폴백으로 가져옵니다 |
| `trust <domain>` | 도메인의 신뢰 수준과 점수를 해석합니다 |
| `code <query>` | `gh`(GitHub)나 `glab`(GitLab)으로 코드를 검색합니다 |
| `doctor` | 의존성을 확인합니다 (Chrome, `python3` + `curl_cffi`, `yt-dlp`, `gh`) |

**URL과 쿼리 서브커맨드의 공통 옵션:**

| 플래그 | 설명 | 기본값 |
|:-----|:-----------|:--------|
| `--timeout <seconds>` | 전략별 타임아웃 | `15` (`media`는 `30`) |
| `--locale <value>` | `Accept-Language` 헤더 | `en-US,en;q=0.9` |
| `--pretty` | JSON 출력을 보기 좋게 정렬 | `false` |

**`fetch` 전용:**

| 플래그 | 설명 |
|:-----|:-----------|
| `--only <strategies>` | 실행할 전략을 쉼표로 구분 (`api,probe,impersonate,browser,archive`) |
| `--skip <strategies>` | 건너뛸 전략을 쉼표로 구분 |
| `--include-archive` | 마지막 폴백으로 archive 전략을 덧붙임 |

**`media` 전용:**

| 플래그 | 설명 |
|:-----|:-----------|
| `--subs` | 자막 저장 |
| `--sub-lang <list>` | 자막 언어를 쉼표로 구분 (기본값: `en`) |
| `--format <spec>` | yt-dlp 포맷 스펙 |

**`code` 전용:**

| 플래그 | 설명 | 기본값 |
|:-----|:-----------|:--------|
| `--host <github\|gitlab>` | 호스트 | `github` |
| `--language <lang>` | 언어 필터 | |
| `--repo <owner/repo>` | 특정 저장소로 범위 지정 | |
| `--limit <n>` | 최대 결과 수 | `20` |

**종료 코드:** `0` ok, `1` error, `2` blocked, `3` not-found, `4` invalid-input, `5` auth-required, `6` timeout.

**예제:**

```bash
# Auto-escalating fetch
oma search fetch https://example.com/article --pretty

# Force a single strategy
oma search fetch https://example.com --only browser

# Cross-platform keyword search via API handlers
oma search api:search "RAG patterns" --platforms hackernews,reddit

# Find a repo's trust score
oma search trust github.com

# Code search (defaults to GitHub)
oma search code "useEffect cleanup" --language ts --limit 10

# Verify your local dependencies
oma search doctor
```

### image

인증 상태를 인지해 병렬로 디스패치하는 멀티 벤더 AI 이미지 생성입니다. `oma img`로 줄여 쓸 수 있습니다.

```
oma image <subcommand> ...
oma img <subcommand> ...
```

**서브커맨드:**

| 서브커맨드 | 용도 |
|:-----------|:--------|
| `generate <prompt...>` | `pollinations`(flux/zimage, 무료), `codex`(ChatGPT OAuth 기반 gpt-image-2), `antigravity`(Gemini Code Assist 구독 기반 nano-banana, 키 불필요)로 이미지를 생성합니다 |
| `doctor` | 벤더별 인증과 설치 상태를 확인합니다 |
| `list-vendors` | 등록된 벤더와 지원 모델을 나열합니다 |

**`image generate` 옵션:**

| 플래그 | 설명 | 기본값 |
|:-----|:-----------|:--------|
| `--vendor <name>` | `auto` \| `pollinations` \| `codex` \| `gemini` \| `all` | `auto` |
| `--size <size>` | `1024x1024` \| `1024x1536` \| `1536x1024` \| `auto` | 벤더 기본값 |
| `--quality <level>` | `low` \| `medium` \| `high` \| `auto` | 벤더 기본값 |
| `-n, --count <n>` | 이미지 개수 (1~5) | `1` |
| `--out <dir>` | 출력 디렉토리 | `.agents/results/images/{timestamp}/` |
| `--allow-external-out` | `$PWD` 밖의 `--out` 경로 허용 | `false` |
| `--model <name>` | 벤더별 모델 오버라이드 | |
| `--strategy <list>` | Gemini 폴백 순서를 쉼표로 구분 (`mcp,stream,api`) | |
| `--timeout <seconds>` | 이미지당 타임아웃 | 벤더 기본값 |
| `-r, --reference <path>` | 참조 이미지입니다. 반복(`-r a.png -r b.png`)하거나 쉼표로 구분합니다. `codex`와 `gemini`에서 지원하고 `pollinations`에서는 거부합니다. 각 5MB 이하 PNG/JPEG/GIF/WebP(매직 바이트 검증), 최대 10개. | |
| `-y, --yes` | 비용 확인 생략 | `false` |
| `--no-prompt-in-manifest` | 원문 대신 프롬프트의 SHA256 저장 | `false` |
| `--dry-run` | 계획과 비용 추정만 출력하고 실행하지 않음 | `false` |
| `--format <format>` | CLI 출력 형식: `text` \| `json` | `text` |

모든 실행은 생성된 이미지 옆에 `manifest.json`을 작성해 벤더, 모델, 프롬프트(또는 해시), 사이즈, 품질, 비용을 기록합니다.

**예제:**

```bash
# Free, no-config generation
oma image generate "minimalist sunrise over mountains"

# Specific vendor + size + count, skip cost prompt
oma image generate "logo concept" --vendor codex --size 1024x1024 -n 3 -y

# All vendors in parallel for comparison
oma image generate "cat astronaut" --vendor all

# Cost estimate without spending
oma image generate "test prompt" --dry-run

# Use a reference image to guide style / subject (codex or gemini)
oma image generate "same otter in dramatic lighting" --vendor codex -r ~/Downloads/otter.jpeg

# Multiple references (repeatable or comma-separated)
oma image generate "blend these styles" --vendor gemini -r a.png -r b.png
oma image generate "blend these styles" --vendor gemini -r a.png,b.png

# Per-vendor doctor check
oma image doctor --format json
```

### star

GitHub에서 oh-my-agent 리포지토리에 스타를 남깁니다.

```
oma star
```

옵션 없음. `gh` CLI가 설치되어 있고 인증되어 있어야 합니다. `first-fluke/oh-my-agent` 리포지토리에 스타를 남깁니다.

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

## 스킬 관리

### skills audit

설치된 스킬에서 설명이 겹치는지, 지나치게 일반적인 블랙홀 스킬이 있는지, 라이브러리 크기에 따른 라우팅 저하가 있는지 검사합니다.

```
oma skills audit [--json] [--output <format>]
```

**옵션:**

| 플래그 | 설명 |
|:-----|:-----------|
| `--json` | CI/CD용 JSON으로 출력 |
| `--output <format>` | 출력 형식 (`text` 또는 `json`) |

**검사 항목:**
- **설명 쌍 유사도**: 설치된 스킬을 두 개씩 짝지어 TF-IDF 코사인 유사도를 계산합니다. 60% 이상이면 경고, 75% 이상이면 실패합니다.
- **블랙홀 탐지**: 나머지 전부에 대한 평균 유사도가 양의 이상치(평균 + 1.5 × 표준편차 이상)인 스킬을 표시합니다. 설명이 지나치게 일반적이어서 라우팅을 가로챌 수 있다는 뜻입니다.
- **라이브러리 크기 저하**: 스킬이 60개를 넘으면 경고합니다(라이브러리가 커질수록 라우팅 정확도가 로그 함수 꼴로 떨어집니다).
- **집중도 검사**: 스킬이 번들처럼 비대해지면 경고합니다. 참조 문서가 20개를 넘거나(`SKILL.md` 외의 `.md` 파일, 벤더링된 트리는 제외) `SKILL.md` 본문이 25,000자를 넘는 경우입니다. 집중된 스킬이 번들보다 성능이 좋으며(SkillsBench, arXiv:2602.12670), 해법은 삭제가 아니라 분할입니다.

**종료 코드:** 경고 구간이거나 아무것도 없으면 `0`, 실패 구간에 든 쌍이 하나라도 있으면 `1`.

**예제:**
```bash
oma skills audit
oma skills audit --json | jq '.findings'
```

### skills lint

스킬 하나하나의 작성 스멜을 탐지합니다. 스킬 *사이의* 관계를 보는 `skills audit`과 달리, 단일 `SKILL.md` 안의 품질 결함을 봅니다. arXiv:2607.01456의 스킬 스멜 분류를 따릅니다(실제로 쓰이는 SKILL.md의 99% 이상이 스멜을 최소 하나 갖고 있습니다).

```
oma skills lint [--skill <id>] [--json] [--output <format>]
```

**옵션:**

| 플래그 | 설명 |
|:-----|:-----------|
| `--skill <id>` | 스킬 하나만 검사 |
| `--json` | CI/CD용 JSON으로 출력 |
| `--output <format>` | 출력 형식 (`text` 또는 `json`) |

**일반 스멜 (모든 스킬):**

| 스멜 | 심각도 | 의미 |
|:------|:---------|:--------|
| `missing-name` | fail | 프론트매터 `name`이 없거나 비어 있음 |
| `missing-description` | fail | 프론트매터 `description`이 없거나 비어 있음. 라우팅이 여기에 달려 있음 |
| `weak-description` | warn | 설명이 40자 미만이라 라우팅 근거로 너무 빈약함 |
| `body-too-long` | warn | SKILL.md 본문이 500줄을 넘음. 세부 내용을 점진적 공개 뒤의 `resources/`로 옮길 것 |
| `template-placeholder` | warn | 코드 스팬 밖에 `{Placeholder}` 텍스트가 남아 있음 |
| `broken-reference` | fail | 존재하지 않는 `resources/`, `config/`, `scripts/`, `assets/` 파일을 참조함 |

**SSL-lite 스멜** (형식을 채택한 스킬, 즉 `## Scheduling` 헤딩이 있는 스킬에만 적용합니다. 서드파티 스킬에는 요구하지 않습니다):

| 스멜 | 심각도 | 의미 |
|:------|:---------|:--------|
| `ssl-structure` | fail | 최상위 섹션이 `Scheduling / Structural Flow / Logical Operations / References`에서 벗어남 |
| `canonical-path` | fail | `### Canonical command path`나 `### Canonical workflow path`가 정확히 하나가 아님 |
| `missing-boundaries` | warn | `### When NOT to use`가 없음. 경계 없는 스킬은 라우팅을 가로챔 |
| `empty-failure-recovery` | warn | `### Failure and recovery`가 없거나 비어 있음(불릿이나 표 행 모두 인정). SkillLens에 따라 실패 메커니즘을 명시할 것 |

**종료 코드:** fail 심각도 스멜이 없으면 `0`, 하나라도 있으면 `1`.

**예제:**
```bash
oma skills lint
oma skills lint --skill oma-scholar
oma skills lint --json | jq '.smells'
```

### skills eval

스킬별 유용성을 측정합니다. 스킬을 로딩하면 held-out 태스크 결과가 실제로 좋아지는지 봅니다. 설명 경계의 중복을 재는 `skills audit`의 *유용성* 측 대응물입니다. `audit`이 "두 스킬이 중복인가?"를 묻는다면, `eval`은 "이 스킬이 도움이 되는가?"를 묻습니다.

```
oma skills eval [--skill <id>] [--mock | --live] [--record] [--yes]
                [--task-dir <path>] [--max-tasks <n>] [--require-coverage]
                [--json] [--output <format>]
```

**옵션:**

| 플래그 | 설명 |
|:-----|:-----------|
| `--skill <id>` | 평가할 스킬 ID(단순 이름이며 경로 구분자를 쓰지 않습니다). 기본값은 `_all`입니다. |
| `--mock` | `_rollouts/`에 기록된 롤아웃을 재생합니다(기본값. 결정론적이며 LLM을 호출하지 않습니다). CI에서 안전합니다. |
| `--live` | 실제 에이전트를 디스패치합니다. 태스크마다 `oma agent:spawn --read-only`로 baseline과 treatment 두 갈래를 스폰합니다. 비용 미리보기를 출력하고 `--yes`가 없으면 확인을 받습니다. |
| `--record` | 캡처한 라이브 롤아웃(judge 판정 포함)을 `_rollouts/`에 저장해 이후 `--mock` 재생에 씁니다. `--live`와 함께일 때만 의미가 있습니다. |
| `--yes` | 비용 미리보기 확인을 생략합니다. `--live`와 함께일 때만 의미가 있습니다. |
| `--task-dir <path>` | 태스크 픽스처 디렉토리를 오버라이드합니다(워크스페이스 루트 안이어야 합니다). 기본값은 `.agents/eval/<skill>/`입니다. |
| `--max-tasks <n>` | 평가할 태스크 수를 제한합니다(결정론적 정렬 순서로 적용). |
| `--require-coverage` | 태스크가 5개 미만이면 0이 아닌 코드로 종료합니다(CI가 조용히 초록으로 지나가는 것을 막습니다). |
| `--json` | CI/CD용 JSON으로 출력 |
| `--output <format>` | 출력 형식 (`text` 또는 `json`) |

**동작 방식:**

`.agents/eval/<skill>/`의 태스크 픽스처마다 이렇게 진행합니다.
1. **baseline 갈래**: 스킬을 로딩하지 않은 채 태스크 프롬프트를 디스패치합니다.
2. **treatment 갈래**: 프롬프트 앞에 `SKILL.md`를 붙인 뒤 디스패치합니다.
3. 각 갈래를 체커가 채점합니다(기본은 judge이며, 결정론적으로 쓰려면 assert나 regex를 씁니다).
4. `utilityLift = weighted_mean(treatment 점수) − weighted_mean(baseline 점수)`.

**판정:**

| 판정 | 조건 |
|:---------|:---------|
| `pass` | `utilityLift ≥ 5%` |
| `warn` | `0% < utilityLift < 5%` |
| `fail` | `utilityLift ≤ 0%` (종료 코드 1) |
| `insufficient` | 채점 가능한 태스크가 5개 미만 (`--require-coverage`일 때만 종료 코드 1) |

**권장 모드:** 실제 스킬 유용성은 judge 체커와 함께 `--live`로 측정하세요. `--mock`은 기록된 judge 판정을 오프라인으로 재생하거나 결정론적 `assert`/`regex` 계약 검사를 실행할 때 사용합니다.

**환경 변수:** `OMA_SKILLEVAL_MOCK=1`은 플래그와 무관하게 mock 모드를 강제합니다.

**종료 코드:** pass나 warn이면 `0`, fail이거나 `--require-coverage`와 함께 insufficient면 `1`.

**예제:**
```bash
# Dry-run on recorded rollouts (CI-safe)
oma skills eval --skill oma-scholar

# Live run with cost preview
oma skills eval --skill oma-scholar --live

# Live run, record results for future mock replay, skip prompt
oma skills eval --skill oma-scholar --live --record --yes

# JSON output for CI
oma skills eval --skill oma-scholar --json

# Fail CI when no tasks exist
oma skills eval --skill oma-scholar --require-coverage

# Limit to 10 tasks
oma skills eval --skill oma-scholar --max-tasks 10
```

`.agents/eval/` 픽스처 형식과 체커 종류는 [스킬 유용성 평가 가이드](../guide/skill-eval.md)를 참고하세요.

---

### skills opt

WikiSkill 방식의 영속 진화로 스킬의 `SKILL.md`를 최적화합니다. Maintainer가 관측 가능한 롤아웃 근거를 범위가 지정된 지식으로 통합하고, Proposer가 제한된 추가·삭제·교체 편집을 제안하며, 거부 결과는 다음 실행에도 남습니다. 후보는 held-out 검증 분할에서 엄격히 향상되어야 하고, `--apply`에는 실행기 전용 최종 테스트의 엄격한 향상도 필요합니다. 연구 근거는 WikiSkill(arXiv:2608.27454)입니다.

```
oma skills opt [--skill <id>] [--dry-run | --apply] [--mock | --live]
               [--max-epochs <n>] [--edits-per-epoch <k>] [--lr <chars>]
               [--yes] [--json] [--output <format>]
```

**옵션:**

| 플래그 | 기본값 | 설명 |
|:-----|:--------|:-----------|
| `--skill <id>` | `_all` | 최적화할 스킬 ID(단순 이름이며 경로 구분자를 쓰지 않습니다). |
| `--dry-run` | **기본값** | 편집과 diff를 제안하되 `SKILL.md`는 바꾸지 않습니다. 생성된 진화 근거는 기록합니다. |
| `--apply` | 없음 | 수락된 편집을 적용합니다. 원본을 백업한 뒤 원자적으로 쓰며, 검증된 개선만 반영합니다. |
| `--mock` | **기본값** | 기록된 최적화 편집과 평가 판정을 재생합니다(결정론적, 오프라인). CI에서 안전합니다. |
| `--live` | 없음 | 실제 LLM 최적화를 디스패치합니다. 에폭마다 실제 모델 호출이 발생합니다. 비용 미리보기를 출력하고 `--yes`가 없으면 확인을 받습니다. |
| `--max-epochs <n>` | `8` | 최대 최적화 에폭 수. |
| `--edits-per-epoch <k>` | `4` | 에폭당 제안하는 후보 편집 수. |
| `--lr <chars>` | `600` | 텍스트 학습률 예산으로, 편집당 순 문자 변화의 상한입니다. |
| `--yes` | 없음 | 비용 미리보기 확인을 생략합니다(`--live`와 함께일 때만). |
| `--json` | 없음 | CI/CD용 JSON으로 출력합니다. |
| `--output <format>` | `text` | 출력 형식 (`text` 또는 `json`). |

**필수 의존성:** `.agents/eval/<skill>/`에 태스크 픽스처가 최소 5개 있어야 합니다. 그보다 적으면 명확한 메시지와 함께 오류를 냅니다. 작성 방법은 [스킬 유용성 평가 가이드](../guide/skill-eval.md)를 참고하세요.

**학습·검증·테스트 분할:** 픽스처는 결정론적으로 60/20/20으로 나뉩니다. Maintainer와 Proposer는 TRAIN 근거만 보고, 후보 선택은 held-out VALIDATION 태스크를 사용합니다. 실행기 전용 TEST 분할은 진화가 끝날 때까지 숨겨집니다. `--apply`는 검증과 최종 테스트가 모두 엄격히 향상될 때만 파일을 씁니다.

**SSOT 유의 사항:** ID가 `oma-`로 시작하는 스킬은 `oma update`가 덮어씁니다. 이런 스킬에는 `--apply`를 권장하지 않습니다. 기본값인 `--dry-run`으로 제안된 diff를 확인하고 업스트림에 반영하세요. 사용자가 직접 만든 스킬에는 자유롭게 적용해도 됩니다.

**종료 코드:** 최적화가 끝나면 `0`, 픽스처가 부족하거나 인자가 잘못되면 `1`.

**예제:**
```bash
# Propose edits (dry-run, mock — does not change SKILL.md, fully offline)
oma skills opt --skill oma-scholar --mock --dry-run

# Apply accepted edits (backs up original first)
oma skills opt --skill oma-scholar --mock --apply

# Live optimizer with cost preview
oma skills opt --skill oma-scholar --live

# Live optimizer, skip confirmation, apply if improved
oma skills opt --skill oma-scholar --live --apply --yes

# JSON output for CI
oma skills opt --skill oma-scholar --json

# Tune epochs and edits budget
oma skills opt --skill oma-scholar --max-epochs 4 --edits-per-epoch 2 --lr 300
```

전체 흐름과 SSOT·과적합 방지 세부 사항은 [스킬 최적화 가이드](../guide/skill-opt.md)를 참고하세요.

---

### harness eval

후보 `.agents/` 오버레이를 현재 OMA 하네스와 비교합니다. 짝지어진 격리 저장소 태스크에서 평가하며, 대상 에이전트와 벤더 경로는 고정한 채 결정론적 검사로 각 갈래가 만든 파일과 출력을 채점합니다.

```
oma harness eval --suite <path> --candidate <path> [--mock | --live]
                 [--record] [--record-file <path>] [--yes]
                 [--timeout-minutes <n>] [--require-coverage]
                 [--json] [--output <format>]
```

| 플래그 | 설명 |
|:-----|:------------|
| `--suite <path>` | 필수 스위트 YAML입니다. 스위트와 픽스처 워크스페이스는 프로젝트 루트 안에 있어야 합니다. |
| `--candidate <path>` | 범위가 지정된 `.agents/` 오버레이를 담은 필수 후보 루트입니다. |
| `--mock` | 해시가 일치하는 기록된 실행을 재생합니다(기본값. 결정론적이고 오프라인). |
| `--live` | 스위트의 대상 에이전트로 baseline과 candidate 갈래를 실행합니다. |
| `--record` | 이후 mock 재생을 위해 라이브 실행을 저장합니다. `--live`가 필요합니다. |
| `--record-file <path>` | 기록 경로를 오버라이드합니다. 프로젝트 루트 안이어야 합니다. |
| `--yes` | 라이브 실행 비용 확인을 생략합니다. |
| `--timeout-minutes <n>` | 갈래별 타임아웃으로, baseline과 candidate에 동일하게 적용합니다. 기본값은 `15`입니다. |
| `--require-coverage` | 채점 가능한 짝 태스크가 5개 미만이면 0이 아닌 코드로 종료합니다. |
| `--json` | 전체 평가를 JSON으로 출력합니다. |
| `--output <format>` | 출력 형식 (`text` 또는 `json`). |

**판정 게이트:** 통과하려면 짝 태스크가 최소 5개, 향상 폭이 최소 5%p, 회귀가 0건이어야 합니다. 회귀가 있으면 항상 실패합니다. 커버리지가 기준에 못 미치면 `insufficient`이며, `--require-coverage`가 있을 때만 0이 아닌 코드로 종료합니다.

**격리:** 후보 파일은 임시 candidate 갈래에서 `.agents/agents`, `.agents/rules`, `.agents/skills`, `.agents/workflows`의 내용만 교체할 수 있습니다. 훅, 설정, 상태, 평가 픽스처, 심볼릭 링크, 벤더 변형, 보호된 에이전트 실행 프론트매터 변경, 픽스처가 소유한 벤더 하네스 파일은 거부합니다. 실행 중에 보호된 정의를 변형하면 그 갈래는 실패합니다. HOME 기반 벤더 탐색은 라이브 평가에서 거부합니다. 기본 에이전트 경로는 고정이며, 중첩 서브에이전트의 모델 고정은 아직 강제하지 않습니다.

```bash
# Generate a live measurement and recording
oma harness eval --suite harness-eval/suite.yaml --candidate candidate --live --record

# Replay the same measurement in CI
oma harness eval --suite harness-eval/suite.yaml --candidate candidate --mock --require-coverage --json
```

스위트 스키마, 지원 검사, 격리 모델, 현재 제약은 [하네스 평가 가이드](../guide/harness-eval.md)를 참고하세요.

---

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
| `OMA_SKILLEVAL_MOCK` | `1`로 설정하면 플래그와 무관하게 `oma skills eval`이 mock 모드로 동작 | `skills eval` |
| `OMA_HOOK_SOCKET` | `selectTransport`가 탐색하는 프로젝트별 데몬 소켓 경로를 오버라이드(기본값: `<cwd>/.agents/.run/oma-hook.sock`). 현재는 항상 인프로세스 전송으로 폴백하며, 이후 데몬 단계를 위해 예약되어 있습니다. | `hook` |

---

## 별칭

| 별칭 | 전체 명령 |
|:-----|:---------|
| `viz` | `visualize` |
