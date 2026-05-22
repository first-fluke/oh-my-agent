---
title: CLI 옵션
description: 모든 CLI 옵션의 종합 레퍼런스입니다. 전역 플래그, 출력 제어, 명령어별 옵션, 실전 사용 패턴을 다룹니다.
---

# CLI 옵션

## 전역 옵션

이 옵션들은 루트 `oma` / `oh-my-agent` 명령에서 사용할 수 있습니다:

| 플래그 | 설명 |
|:-------|:-----|
| `-V, --version` | 버전 번호를 출력하고 종료 |
| `-h, --help` | 명령에 대한 도움말 표시 |

모든 서브커맨드도 `-h, --help`를 지원하여 해당 명령의 도움말 텍스트를 표시합니다.

---

## 출력 옵션

많은 명령이 CI/CD 파이프라인과 자동화를 위한 기계 판독 가능한 출력을 지원합니다. JSON 출력을 요청하는 방법은 세 가지이며, 우선순위는 다음과 같습니다:

### 1. --json 플래그

```bash
oma stats --json
oma doctor --json
oma cleanup --json
```

`--json` 플래그는 JSON 출력을 얻는 가장 간단한 방법입니다. 사용 가능한 명령: `doctor`, `stats`, `retro`, `cleanup`, `auth:status`, `memory:init`, `verify`, `visualize`.

### 2. --output 플래그

```bash
oma stats --output json
oma doctor --output text
```

`--output` 플래그는 `text` 또는 `json`을 받습니다. `--json`과 동일한 기능을 제공하지만, 환경 변수가 json으로 설정된 상태에서 특정 명령만 텍스트로 출력하고 싶을 때 유용합니다.

**유효성 검사:** 잘못된 형식이 제공되면 CLI가 다음 오류를 발생시킵니다: `Invalid output format: {value}. Expected one of text, json`.

### 3. OH_MY_AG_OUTPUT_FORMAT 환경 변수

```bash
export OH_MY_AG_OUTPUT_FORMAT=json
oma stats    # JSON 출력
oma doctor   # JSON 출력
oma retro    # JSON 출력
```

이 환경 변수를 `json`으로 설정하면 지원하는 모든 명령에서 JSON 출력을 강제합니다. `json`만 인식되며, 다른 값은 무시되고 기본값인 텍스트가 사용됩니다.

**결정 순서:** `--json` 플래그 > `--output` 플래그 > `OH_MY_AG_OUTPUT_FORMAT` 환경 변수 > `text` (기본값).

### JSON 출력을 지원하는 명령

| 명령 | `--json` | `--output` | 비고 |
|:-----|:---------|:----------|:-----|
| `doctor` | 예 | 예 | CLI 검사, MCP 상태, 스킬 상태 포함 |
| `stats` | 예 | 예 | 전체 메트릭 객체 |
| `retro` | 예 | 예 | 메트릭, 작성자, 커밋 타입이 포함된 스냅샷 |
| `cleanup` | 예 | 예 | 정리된 항목 목록 |
| `auth:status` | 예 | 예 | CLI별 인증 상태 |
| `memory:init` | 예 | 예 | 초기화 결과 |
| `verify` | 예 | 예 | 검사별 검증 결과 |
| `visualize` | 예 | 예 | JSON 형태의 의존성 그래프 |
| `describe` | 항상 JSON | 해당 없음 | 항상 JSON 출력 (인트로스펙션 명령) |
| `recap` | 예 | 예 | 도구/세션별 대화 이력 |
| `export` | 예 | 예 | 내보내기 상태와 대상 경로 |
| `image generate` / `image doctor` / `image list-vendors` | `--format json` | 해당 없음 | `--json` 대신 `--format json`을 사용합니다 |
| `search ...` | 항상 JSON | 해당 없음 | 모든 `search` 서브커맨드는 JSON으로 스트리밍합니다. 사람이 읽기 좋게 보려면 `--pretty`를 사용하세요 |

---

## 명령별 옵션

### oma (설치)

```
oma
```

플래그가 없습니다. 대화형 설치 마법사가 프리셋 선택을 요청한 뒤 `model_preset`을 `.agents/oma-config.yaml`에 기록합니다.

### doctor

```
oma doctor [--json] [--output <format>] [--profile]
```

| 플래그 | 설명 | 기본값 |
|:-------|:-----|:-------|
| `--json` | 형식이 지정된 텍스트 대신 JSON으로 출력합니다. | `false` |
| `--output <format>` | 출력 형식을 명시적으로 지정합니다 (`text` 또는 `json`). [출력 옵션](#출력-옵션) 참조. | `text` |
| `--profile` | 프로필 헬스 매트릭스를 표시합니다. 활성화된 `model_preset`과 `agents:` 오버라이드를 기준으로 에이전트별 해석된 모델 슬러그, CLI, 인증 상태를 보여줍니다. [에이전트별 모델](../guide/per-agent-models.md) 참조. | `false` |

### update

```
oma update [-f | --force] [--ci]
```

| 플래그 | 축약 | 설명 | 기본값 |
|:-------|:-----|:-----|:-------|
| `--force` | `-f` | 업데이트 중 사용자가 커스터마이즈한 설정 파일을 덮어씁니다. 대상: `oma-config.yaml`, `mcp.json`, `stack/` 디렉토리. 이 플래그가 없으면 해당 파일은 업데이트 전에 백업되었다가 이후 복원됩니다. | `false` |
| `--ci` | | 비대화형 CI 모드로 실행합니다. 모든 확인 프롬프트를 건너뛰고, 스피너와 애니메이션 대신 일반 콘솔 출력을 사용합니다. stdin을 사용할 수 없는 CI/CD 파이프라인에 필요합니다. | `false` |

**--force 사용 시 동작:**
- `oma-config.yaml`이 레지스트리 기본값으로 대체됩니다.
- `mcp.json`이 레지스트리 기본값으로 대체됩니다.
- 백엔드 `stack/` 디렉토리(언어별 리소스)가 대체됩니다.
- 이 플래그에 관계없이 다른 모든 파일은 항상 업데이트됩니다.

**--ci 사용 시 동작:**
- 시작 시 `console.clear()` 없음.
- `@clack/prompts`가 일반 `console.log`로 대체됨.
- 경쟁 도구 감지 안내 건너뛰기.
- `process.exit(1)` 호출 대신 오류를 throw.

### stats

```
oma stats [--json] [--output <format>] [--reset]
```

| 플래그 | 설명 | 기본값 |
|:-------|:-----|:-------|
| `--reset` | 모든 메트릭 데이터를 리셋합니다. `.serena/metrics.json`을 삭제하고 빈 값으로 다시 생성합니다. | `false` |

### retro

```
oma retro [window] [--json] [--output <format>] [--interactive] [--compare]
```

| 플래그 | 설명 | 기본값 |
|:-------|:-----|:-------|
| `--interactive` | 수동 데이터 입력이 있는 대화형 모드. git에서 수집할 수 없는 추가 컨텍스트(예: 분위기, 주요 이벤트)를 요청합니다. | `false` |
| `--compare` | 현재 시간 범위를 이전 동일 기간과 비교합니다. 변동 메트릭을 표시합니다 (예: 커밋 +12, 추가된 줄 -340). | `false` |

**window 인자 형식:**
- `7d`: 7일
- `2w`: 2주
- `1m`: 1개월
- 생략 시 기본값 (7일)

### cleanup

```
oma cleanup [--dry-run] [-y | --yes] [--json] [--output <format>]
```

| 플래그 | 축약 | 설명 | 기본값 |
|:-------|:-----|:-----|:-------|
| `--dry-run` | | 미리보기 모드. 정리할 모든 항목을 나열하지만 변경하지 않습니다. 결과에 관계없이 종료 코드 0. | `false` |
| `--yes` | `-y` | 모든 확인 프롬프트를 건너뜁니다. 묻지 않고 모든 것을 정리합니다. 스크립트와 CI에 유용합니다. | `false` |

**정리 대상:**
1. 고아 PID 파일: 참조된 프로세스가 더 이상 실행되지 않는 `/tmp/subagent-*.pid`.
2. 고아 로그 파일: 죽은 PID에 매칭되는 `/tmp/subagent-*.log`.
3. Gemini Antigravity 디렉토리: `.gemini/antigravity/brain/`, `.gemini/antigravity/implicit/`, `.gemini/antigravity/knowledge/`. 이 디렉토리는 시간이 지남에 따라 상태가 누적되어 커질 수 있습니다.

### agent:spawn

```
oma agent:spawn <agent-id> <prompt> <session-id> [-m <vendor>] [-w <workspace>]
```

| 플래그 | 축약 | 설명 | 기본값 |
|:-------|:-----|:-----|:-------|
| `--model` | `-m` | CLI 벤더 오버라이드. `antigravity`, `claude`, `codex`, `qwen` 중 하나여야 합니다. 모든 설정 기반 벤더 해석을 오버라이드합니다. | 설정에서 해석 |
| `--workspace` | `-w` | 에이전트의 작업 디렉토리. 생략하거나 `.`로 설정하면 CLI가 모노레포 설정 파일(pnpm-workspace.yaml, package.json, lerna.json, nx.json, turbo.json, mise.toml)에서 워크스페이스를 자동 감지합니다. | 자동 감지 또는 `.` |

**유효성 검사:**
- `agent-id`는 `backend`, `frontend`, `mobile`, `qa`, `debug`, `pm` 중 하나여야 합니다.
- `session-id`는 `..`, `?`, `#`, `%`, 또는 제어 문자를 포함해서는 안 됩니다.
- `vendor`는 `antigravity`, `claude`, `codex`, `qwen` 중 하나여야 합니다.

**벤더별 동작:**

| 벤더 | 명령 | 자동 승인 플래그 | 프롬프트 플래그 |
|:-----|:-----|:---------------|:-------------|
| antigravity | `agy` | `--dangerously-skip-permissions` | `-p` |
| gemini | `gemini` | `--approval-mode=yolo` | `-p` |
| claude | `claude` | (없음) | `-p` |
| codex | `codex` | `--full-auto` | (없음, 프롬프트는 위치 인자) |
| qwen | `qwen` | `--yolo` | `-p` |

이 기본값은 `.agents/skills/oma-orchestrator/config/cli-config.yaml`에서 오버라이드할 수 있습니다.

### agent:status

```
oma agent:status <session-id> [agent-ids...] [-r <root>]
```

| 플래그 | 축약 | 설명 | 기본값 |
|:-------|:-----|:-----|:-------|
| `--root` | `-r` | 메모리 파일(`.serena/memories/result-{agent}.md`)과 PID 파일을 찾기 위한 루트 경로. | 현재 작업 디렉토리 |

**상태 결정 로직:**
1. `.serena/memories/result-{agent}.md`가 존재하면: `## Status:` 헤더를 읽습니다. 헤더가 없으면 `completed`로 보고합니다.
2. `/tmp/subagent-{session-id}-{agent}.pid`에 PID 파일이 존재하면: PID가 살아 있는지 확인합니다. 살아 있으면 `running`, 죽었으면 `crashed`로 보고합니다.
3. 어느 파일도 존재하지 않으면: `crashed`로 보고합니다.

### agent:parallel

```
oma agent:parallel [tasks...] [-m <vendor>] [-i | --inline] [--no-wait]
```

| 플래그 | 축약 | 설명 | 기본값 |
|:-------|:-----|:-----|:-------|
| `--model` | `-m` | 모든 생성된 에이전트에 적용되는 CLI 벤더 오버라이드. | 설정에서 에이전트별로 해석 |
| `--inline` | `-i` | 태스크 인자를 파일 경로가 아닌 `agent:task[:workspace]` 문자열로 해석합니다. | `false` |
| `--no-wait` | | 백그라운드 모드. 모든 에이전트를 시작하고 완료를 기다리지 않고 즉시 반환합니다. PID 목록과 로그는 `.agents/results/parallel-{timestamp}/`에 저장됩니다. | `false` (완료 대기) |

**인라인 태스크 형식:** `agent:task` 또는 `agent:task:workspace`
- 콜론으로 구분된 마지막 세그먼트가 `./` 또는 `/`로 시작하거나 `.`인 경우 워크스페이스로 감지합니다.
- 예시: `backend:Implement auth API:./api` (agent=backend, task="Implement auth API", workspace=./api).
- 예시: `frontend:Build login page` (agent=frontend, task="Build login page", workspace=자동 감지).

**YAML 태스크 파일 형식:**
```yaml
tasks:
  - agent: backend
    task: "Implement user API"
    workspace: ./api           # 선택
  - agent: frontend
    task: "Build user dashboard"
```

### recap

```
oma recap [--window <period>] [--date <date>] [--tool <tools>] [--top <n>] [--sort <metric>] [--mermaid] [--graph] [--json] [--output <format>]
```

| 플래그 | 설명 | 기본값 |
|:-------|:-----|:-------|
| `--window <period>` | 시간 범위. `1d`, `3d`, `7d`, `2w`, `30d` 중 하나입니다. `--date`가 설정되면 무시됩니다. | `1d` |
| `--date <date>` | 특정 날짜 (`YYYY-MM-DD`). `--window`보다 우선합니다. | |
| `--tool <tools>` | 도구별로 세션을 필터링합니다. 쉼표로 구분: `claude`, `codex`, `qwen`, `cursor`. | 모든 도구 |
| `--top <n>` | 요약에서 상위 N개의 프로젝트/주제만 표시합니다. | 무제한 |
| `--sort <metric>` | 세션을 `count` 또는 `duration` 기준으로 정렬합니다. | `count` |
| `--mermaid` | 기본 요약 대신 Mermaid Gantt 차트를 출력합니다. | `false` |
| `--graph` | 브라우저에서 인터랙티브 그래프를 엽니다. `--mermaid`와 상호 배타적입니다. | `false` |

### export

```
oma export <format> [-d <path>] [--json] [--output <format>]
```

| 플래그 | 축약 | 설명 | 기본값 |
|:-------|:-----|:-----|:-------|
| `--dir <path>` | `-d` | 내보낸 규칙을 기록할 대상 디렉토리. | `process.cwd()` |

**지원 형식:** `cursor` (설치된 스킬에서 파생된 `.cursor/rules` 파일을 기록합니다).

### search

```
oma search <subcommand> [...]
```

`search` 그룹은 자체 JSON 출력을 사용합니다 (`--json` / `--output` 플래그 없음). URL/쿼리 서브커맨드에서 `--pretty`를 사용하면 결과를 가독성 있게 출력하며, 서브커맨드별 옵션은 다음과 같습니다.

| 서브커맨드 | 주요 옵션 |
|:-----------|:---------|
| `fetch <url>` | `--only`, `--skip`, `--include-archive`, `--timeout`, `--locale`, `--pretty` |
| `api <url>` / `meta <url>` / `rss <url>` / `archive <url>` | `--timeout`, `--locale`, `--pretty` |
| `api:search <query>` | `--platforms <list>`, `--timeout`, `--locale`, `--pretty` |
| `rss:google <query>` | `--locale` (기본값 `en-US`) |
| `media <url>` | `--subs`, `--sub-lang <list>` (기본값 `en`), `--format <spec>`, `--timeout` (기본값 `30`), `--pretty` |
| `code <query>` | `--host <github\|gitlab>` (기본값 `github`), `--language`, `--repo`, `--limit` (기본값 `20`), `--pretty` |
| `trust <domain>` | `--pretty` |
| `doctor` | 없음. Chrome / `python3 curl_cffi` / `yt-dlp` / `gh` 바이너리 점검을 실행합니다 |

**종료 코드:** `0` ok, `1` error, `2` blocked, `3` not-found, `4` invalid-input, `5` auth-required, `6` timeout. 스크립트에서 일시적 차단과 잘못된 입력을 구분할 때 활용하세요.

### image

```
oma image <subcommand> [...]
```

출력 형식은 공유 `--json` 플래그가 아니라 서브커맨드별 `--format <text|json>`으로 제어합니다.

`image generate`가 받는 옵션입니다.

| 플래그 | 축약 | 설명 | 기본값 |
|:-------|:-----|:-----|:-------|
| `--vendor <name>` | | `auto` \| `pollinations` \| `codex` \| `gemini` \| `all`. `auto`는 `image-config.yaml`과 사용 가능한 인증을 기반으로 결정합니다. | `auto` |
| `--size <size>` | | `1024x1024` \| `1024x1536` \| `1536x1024` \| `auto`. | 벤더 기본값 |
| `--quality <level>` | | `low` \| `medium` \| `high` \| `auto`. | 벤더 기본값 |
| `--count <n>` | `-n` | 이미지 개수, 1..5. | `1` |
| `--out <dir>` | | 출력 디렉토리. `--allow-external-out`이 설정되지 않으면 `$PWD` 내부에 있어야 합니다. | `.agents/results/images/{timestamp}/` |
| `--allow-external-out` | | `--out` 경로가 `$PWD` 외부에 있는 것을 허용합니다. | `false` |
| `--model <name>` | | 벤더별 모델 오버라이드 (예: `gpt-image-2`, `flux`, `imagen-4`). | 벤더 기본값 |
| `--strategy <list>` | | Gemini 폴백 순서. `mcp`, `stream`, `api`를 쉼표로 구분합니다. | 벤더 기본값 |
| `--timeout <seconds>` | | 이미지당 타임아웃. | 벤더 기본값 |
| `--reference <path>` | `-r` | 스타일/주제 전이를 위한 레퍼런스 이미지. 반복 지정(`-r a.png -r b.png`) 또는 쉼표 구분이 가능합니다. 크기(≤5MB), 형식(매직 바이트로 PNG/JPEG/GIF/WebP 검증), 개수(≤10)를 검증합니다. `codex`(`codex exec`에 `-i` 전달)와 `gemini`(`inlineData`로 base64 인라인)에서 지원하며, `pollinations`에서는 종료 코드 4로 거부됩니다. | |
| `--yes` | `-y` | 비용 확인 프롬프트를 건너뜁니다. | `false` |
| `--no-prompt-in-manifest` | | `manifest.json`에 원문 대신 프롬프트의 SHA256을 저장합니다. | `false` |
| `--dry-run` | | 계획과 비용 추정치만 출력하고 실행하지 않습니다. | `false` |
| `--format <format>` | | `text` \| `json`. | `text` |

`image doctor`와 `image list-vendors`는 `--format <text|json>`만 받습니다.

### memory:init

```
oma memory:init [--json] [--output <format>] [--force]
```

| 플래그 | 설명 | 기본값 |
|:-------|:-----|:-------|
| `--force` | `.serena/memories/`의 비어 있거나 기존 스키마 파일을 덮어씁니다. 이 플래그가 없으면 기존 파일은 수정되지 않습니다. | `false` |

### verify

```
oma verify <agent-type> [-w <workspace>] [--json] [--output <format>]
```

| 플래그 | 축약 | 설명 | 기본값 |
|:-------|:-----|:-----|:-------|
| `--workspace` | `-w` | 검증할 워크스페이스 디렉토리 경로. | 현재 작업 디렉토리 |

**에이전트 타입:** `backend`, `frontend`, `mobile`, `qa`, `debug`, `pm`.

---

## 실전 예제

### CI 파이프라인: 업데이트 및 검증

```bash
# CI 모드로 업데이트 후 doctor로 설치 확인
oma update --ci
oma doctor --json | jq '.healthy'
```

### 자동화된 메트릭 수집

```bash
# 메트릭을 JSON으로 수집하여 모니터링 시스템에 파이프
export OH_MY_AG_OUTPUT_FORMAT=json
oma stats | curl -X POST -H "Content-Type: application/json" -d @- https://metrics.example.com/api/v1/push
```

### 상태 모니터링을 활용한 배치 에이전트 실행

```bash
# 백그라운드에서 에이전트 시작
oma agent:parallel tasks.yaml --no-wait

# 주기적으로 상태 확인
SESSION_ID="session-$(date +%Y%m%d-%H%M%S)"
watch -n 5 "oma agent:status $SESSION_ID backend frontend mobile"
```

### 테스트 후 CI에서 정리

```bash
# 프롬프트 없이 모든 고아 프로세스 정리
oma cleanup --yes --json
```

### 워크스페이스 인식 검증

```bash
# 각 도메인을 해당 워크스페이스에서 검증
oma verify backend -w ./apps/api
oma verify frontend -w ./apps/web
oma verify mobile -w ./apps/mobile
```

### 스프린트 리뷰를 위한 비교 회고

```bash
# 이전 스프린트와 비교하는 2주 스프린트 회고
oma retro 2w --compare

# 스프린트 보고서용 JSON으로 저장
oma retro 2w --json > sprint-retro-$(date +%Y%m%d).json
```

### 전체 상태 검사 스크립트

```bash
#!/bin/bash
set -e

echo "=== oh-my-agent Health Check ==="

# CLI 설치 확인
oma doctor --json | jq -r '.clis[] | "\(.name): \(if .installed then "OK (\(.version))" else "MISSING" end)"'

# 인증 상태 확인
oma auth:status --json | jq -r '.[] | "\(.name): \(.status)"'

# 메트릭 확인
oma stats --json | jq -r '"Sessions: \(.sessions), Tasks: \(.tasksCompleted)"'

echo "=== Done ==="
```

### 에이전트 인트로스펙션을 위한 describe

```bash
# AI 에이전트가 사용 가능한 명령을 발견
oma describe | jq '.command.subcommands[] | {name, description}'

# 특정 명령의 세부사항 가져오기
oma describe agent:spawn | jq '.command.options[] | {flags, description}'
```
