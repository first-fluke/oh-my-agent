---
title: CLI 옵션
description: 모든 CLI 옵션의 종합 레퍼런스입니다. 전역 플래그, 출력 제어, 명령어별 옵션, 실전 사용 패턴을 다룹니다.
---

# CLI 옵션

## 전역 옵션

이 옵션은 루트 `oma` / `oh-my-agent` 명령에서 사용할 수 있습니다:

| 플래그 | 설명 |
|:-------|:-----|
| `-g, --global` | `<cwd>/.agents/` 대신 HOME 설치(`~/.agents/`)를 대상으로 동작 |
| `-y, --yes` | 선택한 명령이 확인을 지원하는 경우 프롬프트를 건너뜁니다. 명령별 안전 검사는 계속 적용됩니다. |
| `-V, --version` | 버전 번호를 출력하고 종료 |
| `-h, --help` | 명령에 대한 도움말 표시 |

모든 서브커맨드도 `-h, --help`를 지원하여 해당 명령의 도움말 텍스트를 표시합니다.

---

## 출력 옵션

많은 명령이 CI/CD 파이프라인과 자동화를 위한 기계 판독 가능한 출력을 지원합니다. JSON 출력을 요청하는 방법은 세 가지이며, 우선순위는 다음과 같습니다.

### 1. --json 플래그

```bash
oma stats get --json
oma doctor --json
oma cleanup --json
```

`--json` 플래그는 해당 경로가 명시적으로 제공할 때만 사용할 수 있습니다. 명령 계열만 보고 지원 여부를 추정하지 마세요. 예를 들어 `image`, `video`, `slide`의 leaf 경로는 레지스트리에 등록된 곳에서 `--output`을 제공하고, `search`는 자체 JSON 스트림을 사용합니다. 이 페이지 끝의 레지스트리 매트릭스가 경로별 권위 있는 목록입니다.

### 2. --output 플래그

```bash
oma stats get --output json
oma doctor --output text
```

`--output` 플래그는 `text` 또는 `json`을 받습니다. `--json`과 동일한 기능을 제공하지만, 환경 변수가 json으로 설정된 상태에서 특정 명령만 텍스트로 출력하고 싶을 때 유용합니다.

**유효성 검사:** 잘못된 형식이 제공되면 CLI가 다음 오류를 발생시킵니다: `Invalid output format: {value}. Expected one of text, json`.

### 3. OH_MY_AG_OUTPUT_FORMAT 환경 변수

```bash
export OH_MY_AG_OUTPUT_FORMAT=json
oma stats get    # JSON 출력
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
| `auth status` | 예 | 예 | CLI별 인증 상태 |
| `memory init` | 예 | 예 | 초기화 결과 |
| `verify agent` / `verify triggers` | 예 | 예 | 검사별 검증 결과 |
| `visualize` | 예 | 예 | JSON 형태의 의존성 그래프 |
| `describe` | 항상 JSON | 해당 없음 | 항상 JSON 출력 (인트로스펙션 명령) |
| `recap` | 예 | 예 | 도구/세션별 대화 이력 |
| `image generate` / `image doctor` / `image vendor list` | 해당 없음 | 예 | `--output json`을 사용합니다. `vendor list`가 정식 탐색 경로입니다. |
| `video generate` / `video doctor` / `video compose` / `video render` / `video provider list` | 해당 없음 | 예 | 실행 봉투 또는 준비 상태 보고서에는 `--output json`을 사용합니다. |
| `explain validate` | 예 | 예 | 산출물 검증 보고서 |
| `explain render` / `explain patch` / `explain components` | 예 | 예 | 렌더 보고서: 파일, 경고, 사이드카 상태 |
| `diagram resolve` / `diagram update` | 예 | 예 | 엔진 해석 또는 관리 캐시 결과 |
| `market resolve` / `market update` | 예 | 예 | 관리 리서치 엔진 상태 |
| `docs verify` / `docs sync` / `docs i18n` / `docs lint` | 예 | 해당 없음 | 각 docs 경로가 고유한 보고서 옵션을 사용합니다. |
| `search ...` | 항상 JSON | 해당 없음 | 모든 `search` 서브커맨드는 JSON으로 스트리밍합니다. 사람이 읽기 좋게 보려면 `--pretty`를 사용하세요. |

---

## 명령별 옵션

### install

```
oma install [--web-search <provider>] [--code-intelligence <provider>] [--semantic-memory <provider>] [--honcho-url <url>] [--honcho-workspace <id>]
```

대화형 설치기는 선택한 공급자 설정을 `.agents/oma-config.yaml`에 기록합니다. 공급자 플래그는 web-search, code-intelligence, semantic-memory 통합을 선택하며 `--honcho-url`과 `--honcho-workspace`는 해당 공급자를 선택했을 때 Honcho 메모리 서비스를 설정합니다. 설치 과정에서 확인을 요청하면 루트 `-y, --yes` 플래그가 적용됩니다.

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
oma update [-f | --force] [--with-new-skills] [--ci] [-y | --yes] [--all] [--vendor <vendors>]
oma update mcp [-y | --yes] [--ci] [--all] [--vendor <vendors>]
```

| 플래그 | 축약 | 설명 | 기본값 |
|:-------|:-----|:-----|:-------|
| `--force` | `-f` | 업데이트 중 사용자가 커스터마이즈한 설정 파일을 덮어씁니다. 대상: `oma-config.yaml`, `mcp.json`, `stack/` 디렉토리. 이 플래그가 없으면 해당 파일은 업데이트 전에 백업되었다가 이후 복원됩니다. | `false` |
| `--with-new-skills` | | 현재 설치 뒤 레지스트리에 추가된 스킬을 설치합니다. | `false` |
| `--ci` | | 비대화형 CI 모드로 실행합니다. 모든 확인 프롬프트를 건너뛰고, 스피너와 애니메이션 대신 일반 콘솔 출력을 사용합니다. stdin을 사용할 수 없는 CI/CD 파이프라인에 필요합니다. | `false` |
| `--yes` | `-y` | 안내를 건너뜁니다. `--all`이나 `--vendor`와 함께 쓰지 않으면 없는 벤더 디렉토리를 만들지 않습니다. | `false` |
| `--all` | | 지원하는 모든 프로젝트 범위 벤더를 만들거나 업데이트합니다. | `false` |
| `--vendor <vendors>` | | 쉼표로 구분한 벤더 목록을 만들거나 업데이트합니다. 예: `claude,qwen`. | 이미 있는 벤더 디렉토리만 |

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

**벤더 범위:**
- `oma update`는 이미 존재하는 벤더 디렉토리만 업데이트합니다.
- `oma update --yes`는 같은 벤더 범위를 쓰며 안내만 건너뜁니다.
- `oma update --all`은 지원하는 모든 프로젝트 범위 벤더를 만들거나 업데이트합니다.
- `oma update --vendor claude,qwen`은 나열한 벤더만 만들거나 업데이트합니다.

`oma update mcp`는 같은 `--yes`, `--ci`, `--all`, `--vendor` 제어를 사용해 브라우저 MCP 서버를 선택합니다. `--force`나 `--with-new-skills`는 사용하지 않습니다.

### stats

```
oma stats get [--json] [--output <format>]
oma stats reset
```

| 플래그 | 설명 | 기본값 |
|:-------|:-----|:-------|
| `--json` | reset 결과를 JSON으로 출력합니다. | `false` |
| `--output <format>` | `text` 또는 `json`으로 출력합니다. | `text` |

`oma stats reset`이 reset 명령입니다. 예전 표기인 `oma stats get --reset`은 현재 공개 표면에 없습니다.

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

### agent spawn

```
oma agent spawn <agent-id> <prompt> <session-id> [options]
```

| 플래그 | 축약 | 설명 | 기본값 |
|:-------|:-----|:-----|:-------|
| `--resumed-from` | 없음 | 재시도를 선행 run ID에 연결합니다. | |
| `--fallback-vendors` | 없음 | 쉼표로 구분한 명시적 벤더 폴백 체인입니다. | |
| `--task-id` | 없음 | 세션 계획의 태스크 ID입니다. 기본값은 agent ID입니다. | agent ID |
| `--vendor` | 없음 | CLI 벤더 오버라이드. 런타임은 `antigravity`, `claude`, `codex`, `cursor`, `opencode`, `qwen`, `grok`, `pi`를 받습니다. | 설정에서 해석 |
| `--workspace` | `-w` | 에이전트의 작업 디렉토리. 생략하거나 `.`로 설정하면 CLI가 모노레포 설정 파일(pnpm-workspace.yaml, package.json, lerna.json, nx.json, turbo.json, mise.toml)에서 워크스페이스를 자동 감지합니다. | 자동 감지 또는 `.` |
| `--isolation` | 없음 | 격리 모드입니다. `worktree`는 스폰별 git 워크트리를 만듭니다. | `none` |
| `--read-only` | 없음 | 스폰된 에이전트를 비파괴 도구로 제한하고 자동 승인 플래그를 억제합니다. | `false` |

**유효성 검사:**
- `agent-id`는 `backend`, `frontend`, `mobile`, `qa`, `debug`, `pm` 중 하나여야 합니다.
- `session-id`는 `..`, `?`, `#`, `%`, 또는 제어 문자를 포함해서는 안 됩니다.
- `vendor`는 `antigravity`, `claude`, `codex`, `cursor`, `opencode`, `qwen`, `grok`, `pi` 중 하나여야 합니다.

**벤더별 동작:**

| 벤더 | 명령 | 자동 승인 플래그 | 프롬프트 플래그 |
|:-----|:-----|:---------------|:-------------|
| antigravity | `agy` | `--dangerously-skip-permissions` | `-p` |
| claude | `claude` | (없음) | `-p` |
| codex | `codex` | `--sandbox workspace-write` | (없음, 프롬프트는 위치 인자) |
| cursor | `cursor-agent` | 벤더별 | `-p` |
| opencode | `opencode` | 벤더별 | `-p` |
| qwen | `qwen` | `--yolo` | `-p` |
| grok | `grok` | 벤더별 | `-p` |
| pi | `pi` | `--read-only`에서는 억제 | 프롬프트는 위치 인자 |

이 기본값은 `.agents/skills/oma-orchestration/config/cli-config.yaml`에서 오버라이드할 수 있습니다.

Codex는 workspace-write 샌드박스를 유지합니다. oma는 네트워크 접근을 활성화하고, 프로젝트 루트, OMA 상태 홈(`~/.oma`), 기존 패키지 매니저 캐시를 쓰기 가능한 디렉토리로 추가합니다. `oma update`는 `cli-config.yaml`을 교체하므로 오래 유지할 모드는 `OMA_CODEX_SANDBOX`로 설정하세요. 값은 `read-only`, `workspace-write`(기본값), `danger-full-access`(샌드박스도 승인도 없음) 중 하나입니다.

### agent status

```
oma agent status <session-id> [agent-ids...] [-r <root>]
```

| 플래그 | 축약 | 설명 | 기본값 |
|:-------|:-----|:-----|:-------|
| `--root` | `-r` | 메모리 파일(`.agents/state/memories/result-{agent}.md`)과 PID 파일을 찾기 위한 루트 경로. | 현재 작업 디렉토리 |

**상태 결정 로직:**
1. `.agents/state/memories/result-{agent}.md`가 존재하면: `## Status:` 헤더를 읽습니다. 헤더가 없으면 `completed`로 보고합니다.
2. `/tmp/subagent-{session-id}-{agent}.pid`에 PID 파일이 존재하면: PID가 살아 있는지 확인합니다. 살아 있으면 `running`, 죽었으면 `crashed`로 보고합니다.
3. 어느 파일도 존재하지 않으면: `crashed`로 보고합니다.

### agent parallel

```
oma agent parallel [tasks...] [--vendor <vendor>] [-i | --inline] [--no-wait]
```

| 플래그 | 축약 | 설명 | 기본값 |
|:-------|:-----|:-----|:-------|
| `--vendor` | 없음 | 모든 생성된 에이전트에 적용되는 CLI 벤더 오버라이드. | 설정에서 에이전트별로 해석 |
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
| `--tool <tools>` | 도구별로 세션을 필터링합니다. 쉼표로 구분: `grok`, `claude`, `codex`, `qwen`, `cursor`, `antigravity`. | 모든 도구 |
| `--top <n>` | 요약에서 상위 N개의 프로젝트/주제만 표시합니다. | 무제한 |
| `--sort <metric>` | 세션을 `count` 또는 `duration` 기준으로 정렬합니다. | `count` |
| `--mermaid` | 기본 요약 대신 Mermaid Gantt 차트를 출력합니다. | `false` |
| `--graph` | 브라우저에서 인터랙티브 그래프를 엽니다. `--mermaid`와 상호 배타적입니다. | `false` |

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

출력 형식은 서브커맨드별 `--output <text|json>`으로 제어합니다.

`image generate`가 받는 옵션입니다.

| 플래그 | 축약 | 설명 | 기본값 |
|:-------|:-----|:-----|:-------|
| `--vendor <name>` | | `auto` \| `pollinations` \| `codex` \| `antigravity` \| `all`. `auto`는 활성 `image:` 설정과 사용 가능한 인증에서 해석합니다. | `auto` |
| `--size <size>` | | 양쪽이 16으로 나누어지는 `WxH`, 각 변 16~3840, 종횡비 1:3~3:1 또는 `auto`. | 벤더 기본값 |
| `--quality <level>` | | `low` \| `medium` \| `high` \| `auto`. | 벤더 기본값 |
| `--count <n>` | `-n` | 이미지 개수, 1..5. | `1` |
| `--output-dir <dir>` | | 출력 디렉토리입니다. `--allow-external-output`이 없으면 `$PWD` 안에 있어야 합니다. | `.agents/results/images/{timestamp}/` |
| `--allow-external-output` | | `$PWD` 밖의 `--output-dir` 경로를 허용합니다. | `false` |
| `--model <name>` | | 벤더별 모델 오버라이드입니다. antigravity 모델은 `agy`가 선택합니다. | 벤더 기본값 |
| `--timeout <duration>` | | duration 값으로 지정하는 이미지당 타임아웃입니다. | 벤더 기본값 |
| `--reference <path>` | `-r` | 스타일/주제 전이를 위한 참조 이미지입니다. 반복 지정(`-r a.png -r b.png`) 또는 쉼표 구분이 가능합니다. 크기(≤5MB), 형식(매직 바이트로 PNG/JPEG/GIF/WebP), 개수(≤10)를 검증합니다. `codex`와 `antigravity`에서 지원하며 `pollinations`에서는 종료 코드 4로 거부됩니다. | |
| `--yes` | `-y` | 비용 확인 프롬프트를 건너뜁니다. | `false` |
| `--no-prompt-in-manifest` | | `manifest.json`에 원문 대신 프롬프트의 SHA256을 저장합니다. | `false` |
| `--dry-run` | | 계획과 비용 추정치만 출력하고 실행하지 않습니다. | `false` |
| `--output <format>` | | `text` \| `json`. | `text` |

`image doctor`와 `image vendor list`는 `--output <text|json>`을 받습니다. `image list-vendors`는 도움말 별칭이며 `vendor list`가 정식 탐색 경로입니다.

### video

```
oma video generate <brief...> [options]
oma video doctor [--output <format>] [--install|--upgrade|--install-mpt|--install-strudel]
oma video compose <run-dir> [--output <format>] [--refresh] [--offline]
oma video render <run-dir> [--output <format>]
oma video provider list [--output <format>]
```

`video generate`는 계획 및 캡처 제어 옵션인 `--mode`, `--aspect`, `--locale`, `--captions`, `--visual`, `--voice`, `--music`, `--duration`, `--compositor`, `--capture`, `--source`, `--url`, `--device`, `--ready-selector`, `--show-cursor`, `--polish`, `--capture-timeout`, `--capture-stop`을 받습니다. 또한 `--output-dir`, `--allow-external-output`, `--max-usd`, `--seed`, `--timeout`, `--script`, `--dry-run`, `--yes`, `--output`, `--no-brief-in-manifest`를 받습니다. 브라우저 캡처에는 `--source web --url <url>`을 사용하고, 기본 source는 `file`입니다. 일반 렌더링에는 작성된 컴포지션과 동작하는 compositor가 필요하며 placeholder는 `OMA_VIDEO_MOCK=1` 테스트 경로에만 제한됩니다.

`video doctor`는 HyperFrames/MPT/Strudel 도구 체인을 보고하거나 준비합니다. `compose`는 실행의 컴포지션 계약을 준비하고 `render`는 lint, 렌더링, 출력 검사를 수행합니다. `provider list`는 공급자와 키 상태를 보고합니다. 실행 매니페스트와 복구 순서는 [비디오 생성](../guide/video-generation.md)을 참고합니다.

### memory init

```
oma memory init [--json] [--output <format>] [--force]
```

| 플래그 | 설명 | 기본값 |
|:-------|:-----|:-------|
| `--force` | `.agents/state/memories/`의 비어 있거나 기존 스키마 파일을 덮어씁니다. 이 플래그가 없으면 기존 파일은 수정되지 않습니다. | `false` |

### verify

```
oma verify agent <agent-type> [-w <workspace>] [--json] [--output <format>]
oma verify triggers [--corpus <path>] [--max-false-fire <pct>] [--max-missed-fire <pct>] [--json] [--output <format>]
```

| 플래그 | 축약 | 설명 | 기본값 |
|:-------|:-----|:-----|:-------|
| `--workspace` | `-w` | 검증할 워크스페이스 디렉토리 경로. | 현재 작업 디렉토리 |

**에이전트 타입:** `backend`, `frontend`, `mobile`, `qa`, `debug`, `pm`.

`verify triggers`는 라벨이 붙은 corpus에서 키워드 감지 정확도를 측정합니다. 백분율 임계값은 게이트이며 CI 작업에서 개별 결과를 확인하려면 JSON 출력을 사용합니다. 예전 `oma verify <agent-type>` 표기는 호환 도움말 형식이고 등록된 경로는 `verify agent`입니다.

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
oma stats get | curl -X POST -H "Content-Type: application/json" -d @- https://metrics.example.com/api/v1/push
```

### 상태 모니터링을 활용한 배치 에이전트 실행

```bash
# 백그라운드에서 에이전트 시작
oma agent parallel tasks.yaml --no-wait

# 주기적으로 상태 확인
SESSION_ID="session-$(date +%Y%m%d-%H%M%S)"
watch -n 5 "oma agent status $SESSION_ID backend frontend mobile"
```

### 테스트 후 CI에서 정리

```bash
# 프롬프트 없이 모든 고아 프로세스 정리
oma cleanup --yes --json
```

### 워크스페이스 인식 검증

```bash
# 각 도메인을 해당 워크스페이스에서 검증
oma verify agent backend -w ./apps/api
oma verify agent frontend -w ./apps/web
oma verify agent mobile -w ./apps/mobile
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
oma auth status --json | jq -r '.[] | "\(.name): \(.status)"'

# 메트릭 확인
oma stats get --json | jq -r '"Sessions: \(.sessions), Tasks: \(.tasksCompleted)"'

echo "=== Done ==="
```

### 에이전트 인트로스펙션을 위한 describe

```bash
# AI 에이전트가 사용 가능한 명령을 발견
oma describe | jq '.command.subcommands[] | {name, description}'

# 특정 명령의 세부사항 가져오기
oma describe "agent spawn" | jq '.command.options[] | {flags, description}'
```

## 전체 공개 옵션 레지스트리 {#complete-public-option-registry}

다음 매트릭스는 체크인된 공개 명령 레지스트리에서 생성한 것입니다. 이 표가 이 페이지의 적용 범위 인덱스입니다. `없음`은 명령별 옵션이 없다는 뜻이며, 공유 루트 플래그와 도움말 별칭은 위에서 설명했습니다. 값 문법이 바뀌면 `oma describe "<path>"`로 런타임 도움말을 확인합니다.

`docs sync`는 기본 diff 범위로 staged 변경을 선택할 때 내부 git 옵션 `--cached`도 인식하며, `market run`에는 `market.save_dir`에서 온 `--save-dir`가 추가될 수 있습니다. 이 값은 각 위임 도구의 도움말과 함께 해석합니다.

| 명령 경로 | 공개 옵션 | 목적 |
|---|---|---|
| `install` | `--web-search <provider>, --code-intelligence <provider>, --semantic-memory <provider>, --honcho-url <url>, --honcho-workspace <id>` | OMA 스킬과 설정을 설치합니다. |
| `describe` | `없음` | 런타임 인트로스펙션용으로 CLI 명령을 JSON으로 설명합니다. |
| `uninstall` | `--dry-run, -y, --yes` | OMA가 소유한 파일을 제거하며 설정과 사용자 스킬은 보존합니다. |
| `update` | `-f, --force, --with-new-skills, --ci, -y, --yes, --all, --vendor <vendors>` | 레지스트리에서 최신 스킬로 업데이트합니다. |
| `update mcp` | `-y, --yes, --ci, --all, --vendor <vendors>` | 브라우저 MCP 서버를 선택합니다. |
| `link` | `--dry-run` | SSOT에서 벤더 파일을 재생성합니다. |
| `intel` | `없음` | 제품 인텔리전스 파이프라인을 실행합니다. |
| `intel suggest` | `--config <path>, --topic <topic>, --target <target>, --repos <repos>, --since <window>, --last-commits <n>, --output-dir <path>, --dry-run, --fixture <path>, --create-issue, --base-repo <owner/name>, --yes, --json, --output <format>` | 시장 및 코드 인텔리전스에서 가치 높은 제품 작업을 제안합니다. |
| `market` | `없음` | 최신 last30days 엔진으로 커뮤니티 신호 시장 조사를 실행합니다. |
| `market detect-trap` | `--force` | 키워드 트랩 질의를 사전 검사합니다. |
| `market resolve` | `--refresh, --offline, --json, --output <format>` | 실행할 last30days 엔진과 Python을 해석합니다. |
| `market update` | `--json, --output <format>` | 관리되는 last30days 엔진 캐시를 갱신합니다. |
| `market run` | `없음` | 해석된 last30days 엔진을 실행합니다. |
| `doctor` | `--profile, --heal-check <agentType>, --json, --output <format>` | CLI 설치, MCP 설정, 스킬 상태를 점검합니다. |
| `profile` | `없음` | 로컬 OMA 실행 프로필을 관리합니다. |
| `profile list` | `--json, --output <format>` | 로컬 프로필 목록을 표시합니다. |
| `profile show` | `--json, --output <format>` | 로컬 프로필 하나를 표시합니다. |
| `profile create` | `--json, --output <format>` | 로컬 프로필을 만듭니다. |
| `profile use` | `--shell <shell>, --json, --output <format>` | 기존 프로필을 활성화하는 셸 코드를 출력합니다. |
| `profile run` | `없음` | 자식 프로세스에 OMA_PROFILE을 설정해 명령 하나를 실행합니다. |
| `retro` | `--interactive, --compare, --json, --output <format>` | 메트릭과 추세를 포함한 엔지니어링 회고를 실행합니다. |
| `recap` | `--window <period>, --date <date>, --tool <tools>, --top <n>, --sort <metric>, --mermaid, --graph, --json, --output <format>` | AI 도구 대화 이력을 요약합니다. |
| `docs` | `없음` | 문서 드리프트를 검사하고 변경 문서 후보를 찾습니다. |
| `docs verify` | `--json, --report-file <path>, --no-urls, --urls-sync` | 문서의 로컬 참조와 깨진 대상을 보고합니다. |
| `docs sync` | `--json` | git diff를 참조하는 문서 후보를 나열합니다. |
| `docs i18n` | `--json, --min-severity <level>` | 영어 문서와 번역의 구조적 드리프트를 보고합니다. |
| `docs lint` | `--json, --locales <list>` | 번역 문서의 내용 수준 스타일 문제를 검사합니다. |
| `emit` | `--target <target>, --output-dir <path>, --json, --output <format>` | `.agents/` SSOT에서 표준 형식 산출물을 만듭니다. |
| `cleanup` | `--dry-run, -y, --yes, --json, --output <format>` | 고아 서브에이전트 프로세스와 임시 파일을 정리합니다. |
| `bridge` | `--context <name>` | 공유 프로젝트 Serena 서버로 MCP stdio를 중계합니다. |
| `verify` | `없음` | 서브에이전트 결과 또는 키워드 트리거 정확도를 검증합니다. |
| `verify agent` | `-w, --workspace <path>, --json, --output <format>` | 에이전트 출력물을 검증합니다. |
| `verify triggers` | `--corpus <path>, --max-false-fire <pct>, --max-missed-fire <pct>, --json, --output <format>` | 라벨이 지정된 프롬프트 corpus에서 키워드 트리거 정확도를 측정합니다. |
| `vault` | `없음` | 운영체제 키체인(macOS Keychain / Linux Secret Service / Windows Credential Manager)에서 API 키와 시크릿을 관리합니다. |
| `vault store` | `--value <value>` | <name> 아래에 시크릿을 저장합니다(대화형 비밀번호 프롬프트). |
| `vault get` | `없음` | 저장된 값을 stdout으로 출력합니다(용도: export KEY=$(oma vault get <name>)). |
| `vault list` | `--json` | 저장된 시크릿 이름 목록을 표시합니다(값은 표시하지 않음). |
| `vault delete` | `없음` | 키체인과 인덱스에서 시크릿을 삭제합니다. |
| `star` | `없음` | GitHub에서 oh-my-agent에 별을 표시합니다. |
| `visualize` | `--focus <node-or-path>, --affected <paths...>, --json, --output <format>` | 프로젝트 구조를 의존성 그래프로 시각화합니다. |
| `search` | `없음` | fetch, meta, rss, media, trust, code 검색 프리미티브를 제공합니다. |
| `search providers` | `--json, --pretty` | 등록된 검색 공급자와 선택 상태를 조회합니다. |
| `search web` | `--provider <id>, --limit <n>, --timeout <duration>, --json, --pretty` | 선택한 web provider로 검색합니다. |
| `search fetch` | `--only <strategies>, --skip <strategies>, --include-archive, --timeout <duration>, --locale <value>, --pretty` | 자동 승격 전략 파이프라인으로 URL을 가져옵니다. |
| `search meta` | `--timeout <duration>, --locale <value>, --pretty` | URL에서 OGP, JSON-LD, Schema.org를 추출합니다. |
| `search media` | `--subs, --sub-lang <list>, --format <spec>, --timeout <duration>, --pretty` | yt-dlp로 미디어 메타데이터를 추출합니다. |
| `search archive` | `--timeout <duration>, --locale <value>, --pretty` | AMP, archive.today, Wayback을 통해 가져옵니다. |
| `search trust` | `--pretty` | 도메인의 신뢰 수준과 점수를 해석합니다. |
| `search code` | `--host <github\|gitlab>, --language <lang>, --repo <owner/repo>, --limit <n>, --pretty` | gh 또는 glab으로 코드를 검색합니다. |
| `search doctor` | `없음` | 검색 의존성을 점검합니다. |
| `search api` | `없음` | 플랫폼 API 경로를 제공합니다. |
| `search api fetch` | `--timeout <duration>, --locale <value>, --pretty` | 일치하는 플랫폼 API로 가져옵니다. |
| `search api search` | `--platforms <list>, --timeout <duration>, --locale <value>, --pretty` | 지원 플랫폼으로 키워드 검색을 분산합니다. |
| `search rss` | `없음` | RSS 및 Atom 경로를 제공합니다. |
| `search rss fetch` | `--timeout <duration>, --locale <value>, --pretty` | URL의 RSS/Atom 피드를 찾고 파싱합니다. |
| `search rss google` | `--locale <value>` | 질의에 대한 Google News RSS URL을 만듭니다. |
| `harness` | `없음` | 격리된 저장소 작업에서 OMA harness 오버레이를 평가합니다. |
| `harness eval` | `--suite <path>, --candidate <path>, --mock, --live, --record, --record-file <path>, --yes, --timeout <duration>, --require-coverage, --json, --output <format>` | 후보 `.agents/` 오버레이를 기준선과 비교합니다. |
| `harness incident promote` | `--skill <id>, --draft, --force, --json, --output <format>` | 캡처한 인시던트에서 스킬 회귀 픽스처를 도출합니다. |
| `harness feedback` | `--live, --apply, --max-epochs <n>, --incident <ids...>, --scan-runs, --json, --output <format>` | 인시던트를 승격하고 영향받은 스킬을 최적화합니다. |
| `harness evolution enable` | `--max-dispatches <n>, --cron <expr>, --mode <mode>, --json, --output <format>` | 프로젝트의 예산이 정해진 예약 피드백 사이클을 활성화합니다. 모드는 apply 또는 propose입니다. |
| `harness evolution status` | `--json, --output <format>` | 설정, 스케줄, 대기 중인 작업, 충돌, 마지막 사이클을 보여줍니다. |
| `harness evolution disable` | `--json, --output <format>` | 프로젝트의 예약 피드백 사이클을 비활성화합니다. |
| `harness evolution run` | `--json, --output <format>` | 활성화된 프로젝트에 저장된 모드와 예산으로 사이클을 한 번 실행합니다. |
| `slide` | `없음` | 1920×1080 HTML 프레젠테이션을 만들고 검증·내보냅니다. |
| `slide validate` | `--workspace <path>, --output <format>, --slide <file>, --report-file <path>` | 슬라이드의 overflow, overlap, 글꼴 크기를 품질 게이트로 검사합니다. |
| `slide bundle` | `--workspace <path>, --output-file <path>, --inline-fonts` | 슬라이드 파일을 자체 완결 HTML로 합칩니다. |
| `slide edit` | `--workspace <path>, --port <n>` | 브라우저 기반 슬라이드 bbox 편집기를 엽니다. |
| `slide doctor` | `없음` | 슬라이드에 필요한 의존성을 점검합니다. |
| `slide create` | `--output-dir <path>, --force` | 새 슬라이드 작업 디렉토리를 생성합니다. |
| `slide preview` | `--workspace <path>` | 발표자 노트 패널이 있는 viewer.html을 만듭니다. |
| `slide export` | `없음` | 슬라이드를 내보냅니다. |
| `slide export pdf` | `--workspace <path>, --output-file <path>, --mode <mode>` | puppeteer-core로 슬라이드를 PDF로 내보냅니다. |
| `slide export png` | `--workspace <path>, --output-dir <path>, --resolution <res>` | puppeteer-core로 각 슬라이드를 PNG로 내보냅니다. |
| `slide export pptx` | `--workspace <path>, --output-file <path>` | 실험적인 raster 기반 PPTX를 내보냅니다. |
| `slide import` | `없음` | 슬라이드 가져오기 워크플로우를 시작합니다. |
| `slide import pptx` | `--workspace <path>` | officeparser로 PPTX를 슬라이드 조각으로 가져옵니다. |
| `slide asset` | `없음` | 슬라이드 자산을 관리합니다. |
| `slide asset fetch-video` | `--workspace <path>, --output-name <name>` | yt-dlp로 동영상 자산을 내려받습니다. |
| `slide style` | `없음` | 디자인 스타일 프리셋을 탐색하고 가져옵니다. |
| `slide style list` | `없음` | 사용 가능한 스타일 프리셋을 나열합니다. |
| `slide style preview` | `없음` | 터미널에서 스타일 프리셋을 미리 봅니다. |
| `slide style get` | `--refresh` | 최신 bold-template 디자인을 가져옵니다. |
| `scholar` | `없음` | Knows 논문 사이드카와 OpenAlex/Semantic Scholar 폴백을 다룹니다. |
| `scholar search` | `--limit <n>, --year-min <year>, --always-fallback` | 논문을 검색합니다. |
| `scholar resolve` | `없음` | 여러 소스에서 가장 적합한 논문을 찾습니다. |
| `scholar get` | `--section <name>` | 사이드카 또는 연구 메타데이터를 가져옵니다. |
| `scholar lint` | `--lenient, --fail-on-warning` | `.knows.yaml` 또는 `.knows.json` 사이드카를 검증합니다. |
| `image` | `없음` | 인증을 고려해 여러 벤더로 AI 이미지를 생성합니다. |
| `image generate` | `--vendor <name>, --size <size>, --quality <level>, -n, --count <n>, --output-dir <path>, --allow-external-output, --model <name>, --timeout <duration>, -r, --reference <path>, -y, --yes, --no-prompt-in-manifest, --dry-run, --output <format>` | 이미지를 생성합니다. |
| `image doctor` | `--output <format>` | 벤더별 인증과 설치 상태를 점검합니다. |
| `image vendor` | `없음` | 이미지 벤더를 관리합니다. |
| `image vendor list` | `--output <format>` | 등록된 이미지 벤더와 모델을 나열합니다. |
| `video` | `없음` | 숏폼, 설명, 데모 영상을 생성합니다. |
| `video generate` | `--mode <mode>, --aspect <aspect>, --locale <lang>, --captions <style>, --visual <mode>, --voice <profile>, --music <mode>, --duration <sec>, --compositor <name>, --capture <path>, --source <kind>, --url <url>, --device <name>, --ready-selector <css>, --show-cursor, --polish, --capture-timeout <sec>, --capture-stop <mode>, --output-dir <path>, --allow-external-output, --max-usd <n>, --seed <n>, --timeout <duration>, -y, --yes, --dry-run, --script <path>, --output <format>, --no-brief-in-manifest` | brief에서 비디오 실행 디렉토리를 생성합니다. |
| `video doctor` | `--output <format>, --install, --upgrade, --install-mpt, --install-strudel` | 비디오 공급자와 compositor 준비 상태를 점검합니다. |
| `video compose` | `--output <format>, --refresh, --offline` | 최신 HyperFrames 도구 체인으로 실행 컴포지션을 준비합니다. |
| `video render` | `--output <format>` | render-spec.json에서 실행 디렉토리를 다시 렌더링합니다. |
| `video provider` | `없음` | 비디오 공급자를 관리합니다. |
| `video provider list` | `--output <format>` | 비디오 공급자와 가용성을 나열합니다. |
| `serena` | `없음` | Serena MCP 언어 서버 수명 주기 도구입니다. |
| `serena reap` | `--dry-run, --quiet` | 유휴 Serena LSP 자식을 종료합니다. |
| `serena reaper` | `없음` | Serena reaper를 관리합니다. |
| `serena reaper enable` | `--dry-run` | 주기적인 Serena Reaper 작업을 설치합니다. |
| `serena reaper disable` | `--dry-run` | 주기적인 Serena Reaper 작업을 제거합니다. |
| `explain` | `없음` | 설명서 산출물과 품질 검증 도구를 제공합니다. |
| `explain validate` | `--input-dir <path>, --output <format>, --report-file <path>, --json` | 자체 완결 explain HTML 산출물을 검증합니다. |
| `explain render` | `--output-file <path>, --theme <name>, --mode <mode>, --style <level>, --lang <code>, --archify, --no-archify, --open, --output <format>, --json` | Markdown 초안(파일 또는 stdin)을 자체 완결 HTML 설명서 한 장으로 렌더링합니다. |
| `explain patch` | `--panel <id>, --open, --output <format>, --json` | 렌더링된 페이지에 들어 있는 초안으로 패널 하나를 교체합니다. |
| `explain components` | `--output <format>, --json` | 초안에 쓸 수 있는 컴포넌트 목록 또는 컴포넌트 하나의 문법을 출력합니다. |
| `diagram` | `없음` | archify 대화형 HTML 또는 Mermaid 폴백 엔진을 관리합니다. |
| `diagram resolve` | `--engine <engine>, --refresh, --offline, --json, --output <format>` | 워크플로우가 사용할 다이어그램 엔진과 archify 위치를 보고합니다. |
| `diagram update` | `--json, --output <format>` | 관리 캐시에 최신 archify 릴리스를 다운로드합니다. |
| `diagram archify` | `없음` | 업데이트 검사를 끈 상태로 설치된 archify CLI를 실행합니다. |
| `help` | `없음` | 도움말 정보를 표시합니다. |
| `version` | `없음` | 버전 번호를 표시합니다. |
| `dashboard` | `없음` | 실시간 에이전트 모니터링 대시보드를 실행합니다. |
| `dashboard terminal` | `없음` | 터미널 대시보드를 시작합니다. |
| `dashboard web` | `없음` | 웹 대시보드를 시작합니다. |
| `auth` | `없음` | 지원 CLI 인증을 관리합니다. |
| `auth status` | `--json, --output <format>` | 지원되는 모든 CLI의 인증 상태를 점검합니다. |
| `hook` | `없음` | 중앙 훅 라우터를 관리합니다. |
| `hook run` | `--vendor <v>, --event <e>, --matcher <m>` | 벤더 훅 이벤트를 중앙 라우터로 전달합니다. |
| `hook probe` | `--vendor <list>, --output <format>, --hooks-dir <dir>` | 벤더별 훅 호환성 매트릭스를 출력합니다. |
| `state` | `없음` | OMA L1 워크플로우 상태를 관리합니다. |
| `state emit` | `--session-id <id>, --category <category>, --vendor <vendor>, --vendor-sid <vendorSid>, --parent-event-id <eventId>, --causality-key <key>, --ts <iso>, --no-mirror, --json, --output <format>` | OMA L1 워크플로우 이벤트를 추가합니다. |
| `state migrate` | `--include-active, --dry-run, --json, --output <format>` | 레거시 세션을 HOME 프로필로 마이그레이션합니다. |
| `state get` | `--json, --output <format>` | 하나의 OMA L1 세션을 조회합니다. |
| `state list` | `--category <category>, --archived, --all-projects, --project <project>, --search <text>, --older-than <duration>, --dry-run, --json, --output <format>` | OMA L1 워크플로우 상태를 조회합니다. |
| `state repair` | `--dry-run, --json, --output <format>` | OMA L1 상태 파일을 복구합니다. |
| `state verify` | `--workflow <workflow>, --checkpoint <checkpoint>, --session-id <id>, --category <category>, --no-emit-missing, --json, --output <format>` | 워크플로우 체크포인트에 필요한 L1 이벤트를 검증합니다. |
| `state decisions` | `없음` | 필수 L1 의사결정을 관리합니다. |
| `state decisions list` | `--json, --output <format>` | 필수 L1 decision.made 체크포인트를 나열합니다. |
| `state inject-log` | `없음` | 주입 감사 로그를 관리합니다. |
| `state inject-log list` | `--entry <file>, --json, --output <format>` | 경계별 주입 감사 로그를 나열하거나 조회합니다. |
| `state inject-log get` | `--json, --output <format>` | 경계별 주입 감사 로그를 조회합니다. |
| `state summary` | `--category <category>, --json, --output <format>` | 세션 요약을 coordination store로 내보냅니다. |
| `state trajectory` | `--category <category>, --open, --width <columns>, --sequence, --ascii, --json, --output <format>` | L1 이벤트와 벤더 트랜스크립트를 합친 세션 궤적을 표시합니다. |
| `state heal-check` | `--agent <agentType>, --json, --output <format>` | 에이전트의 자체 복구 가능 여부를 확인합니다. |
| `state activate` | `--category <category>, --archived, --all-projects, --project <project>, --search <text>, --older-than <duration>, --dry-run, --json, --output <format>` | OMA L1 워크플로우 상태를 활성화합니다. |
| `state archive` | `--category <category>, --archived, --all-projects, --project <project>, --search <text>, --older-than <duration>, --dry-run, --json, --output <format>` | OMA L1 워크플로우 상태를 보관합니다. |
| `state purge` | `--category <category>, --archived, --all-projects, --project <project>, --search <text>, --older-than <duration>, --dry-run, --json, --output <format>` | OMA L1 워크플로우 상태를 영구 삭제합니다. |
| `ralph` | `없음` | ralph 실행 산출물을 관리합니다. |
| `ralph verify` | `--session-id <id>, --newer-than <iso>, --no-emit, --json, --output <format>` | ralph EXEC 산출물과 우회 방지 게이트를 검증합니다. |
| `goal` | `없음` | 워크플로우 목표 계약을 관리합니다. |
| `goal set` | `--workflow <name>, --session-id <id>, --gate <keyword>, --budget-minutes <n>, --description <text>, --json, --output <format>` | 활성 워크플로우에 목표 계약을 연결합니다. |
| `stats` | `없음` | 생산성 메트릭을 관리합니다. |
| `stats get` | `--json, --output <format>` | 생산성 메트릭을 조회합니다. |
| `stats reset` | `--json, --output <format>` | 생산성 메트릭을 초기화합니다. |
| `agent` | `없음` | 에이전트 실행을 관리합니다. |
| `agent context` | `--project-root <path>, --difficulty <level>` | 네이티브 디스패치 프롬프트용 그래프 선택 컨텍스트를 읽습니다. |
| `agent resume` | `--project-root <path>, --dry-run, --max-attempts <count>` | 안전하게 미완료 작업을 재개합니다. |
| `agent begin` | `--project-root <path>, -w, --workspace <path>` | 증거 기반 네이티브 에이전트 실행을 시작합니다. |
| `agent verify` | `--project-root <path>, --required, --affected <paths...>` | 검증 argv를 실행하고 실제 종료 코드를 기록합니다. |
| `agent finish` | `--project-root <path>` | 검증 기록으로 네이티브 에이전트 결과를 확인합니다. |
| `agent spawn` | `--resumed-from <run-id>, --fallback-vendors <vendors>, --task-id <id>, --vendor <vendor>, -w, --workspace <path>, --isolation <mode>, --read-only` | 서브에이전트를 생성합니다. |
| `agent status` | `--project-root <path>` | 서브에이전트 상태를 확인합니다. |
| `agent parallel` | `--session-id <id>, --vendor <vendor>, -i, --inline, --no-wait` | 여러 서브에이전트를 병렬 실행합니다. |
| `agent review` | `--vendor <vendor>, -p, --prompt <prompt>, -w, --workspace <path>, --no-uncommitted` | 외부 CLI로 코드 리뷰를 실행합니다. |
| `model` | `없음` | 모델과 공급자 진단을 제공합니다. |
| `model check` | `--json, --fail-on-drift, --owner <name>, --probe` | 모델 레지스트리와 실제 벤더 목록을 비교합니다. |
| `model probe` | `--json, --timeout <duration>` | 공급자 CLI에서 모델 슬러그를 확인합니다. |
| `model propose` | `--json, --owner <name>, --write, --timeout <duration>` | 허용된 후보에 대한 `oma-config` 모델 패치를 만듭니다. |
| `memory` | `없음` | AgentMemory와 로컬 메모리를 관리합니다. |
| `memory keys` | `--kind <kind>, --profile <name>, --key-env <name>, --from-env <name>, --dry-run, --json, --output <format>` | Honcho 연결 또는 로컬 임베딩 자격 증명을 설정합니다. |
| `memory init` | `--force, --json, --output <format>` | coordination store를 초기화합니다. |
| `memory setup` | `--endpoint <url>, --port <port>, --install, --start, --dry-run, --json, --output <format>` | AgentMemory 엔드포인트 설정을 준비합니다. |
| `memory daemon` | `없음` | OMA 소유 AgentMemory 데몬을 관리합니다. |
| `memory daemon status` | `--json, --output <format>` | 데몬 상태를 표시합니다. |
| `memory daemon start` | `--port <port>, --dry-run, --json, --output <format>` | AgentMemory를 백그라운드에서 시작합니다. |
| `memory daemon stop` | `--dry-run, --json, --output <format>` | OMA 소유 AgentMemory 데몬을 중지합니다. |
| `memory daemon restart` | `--port <port>, --dry-run, --json, --output <format>` | OMA 소유 AgentMemory 데몬을 다시 시작합니다. |
| `memory service` | `없음` | AgentMemory 운영체제 서비스 통합을 관리합니다. |
| `memory service install` | `--port <port>, --dry-run, --json, --output <format>` | AgentMemory launchd/systemd 서비스 통합을 설치합니다. |
| `memory service uninstall` | `--dry-run, --json, --output <format>` | AgentMemory launchd/systemd 서비스 통합을 제거합니다. |
| `memory status` | `--json, --output <format>` | 선택한 semantic-memory 공급자의 상태를 표시합니다. |
| `memory retry` | `없음` | AgentMemory 재시도를 관리합니다. |
| `memory retry drain` | `--dry-run, --json, --output <format>` | 대기 중인 AgentMemory observe 재시도를 비웁니다. |
| `memory import` | `--source <source>, --since <since>, --dry-run, --force-partial, --json, --output <format>` | 벤더 대화 이력을 AgentMemory로 가져옵니다. |
| `memory maintain` | `--keep <count>, --dry-run, --json, --output <format>` | AgentMemory 로컬 저장소를 유지보수합니다. |
| `memory maintain backup` | `--keep <count>, --dry-run, --json, --output <format>` | AgentMemory 로컬 저장소를 백업합니다. |
| `memory maintain prune` | `--keep <count>, --dry-run, --json, --output <format>` | AgentMemory 로컬 저장소를 정리합니다. |
| `memory maintain vacuum` | `--keep <count>, --dry-run, --json, --output <format>` | AgentMemory 로컬 저장소를 vacuum합니다. |
| `memory gc` | `--scope <scope>, --keep <count>, --max-age <duration>, --dry-run, --json, --output <format>` | 프로젝트 로컬 메모리를 정리합니다. |
| `memory upgrade` | `--port <port>, --dry-run, --json, --output <format>` | AgentMemory를 중지·백업·업그레이드·재시작하고 상태를 확인합니다. |
| `skill` | `없음` | 설치된 스킬을 검사하고 감사합니다. |
| `skill audit` | `--json, --output <format>` | 설치된 스킬 설명의 유사도를 검사합니다. |
| `skill lint` | `--skill <id>, --json, --output <format>` | 스킬 작성 문제를 감지합니다. |
| `skill eval` | `--skill <id>, --mock, --live, --record, --yes, --task-dir <path>, --max-tasks <n>, --trials <n>, --require-coverage, --neg-transfer, --routing, --json, --output <format>` | 보류된 작업에서 스킬 효용 향상을 측정합니다. |
| `skill optimize` | `--skill <id>, --dry-run, --apply, --mock, --live, --max-epochs <n>, --edits-per-epoch <k>, --lr <chars>, --yes, --memory <mode>, --json, --output <format>` | 측정된 효용 향상을 최대화하도록 스킬을 최적화합니다. |
| `skill meta-optimize` | `--target <part>, --skill <ids...>, --anchor <ids...>, --repeats <n>, --candidates <n>, --max-epochs <n>, --edits-per-epoch <k>, --live, --apply, --memory <mode>, --yes, --json, --output <format>` | 진화 절차 변경을 제안하고 보류된 스킬에서 채점합니다. |
| `skill procedure` | `--export, --json, --output <format>` | 진화 절차(최적화기와 유지 관리 프롬프트, constitution)와 해시를 보여줍니다. |
| `skill evolution-stats` | `--skill <id>, --json, --output <format>` | 기록된 최적화 실행을 결과, 메모리 모드, 절차별로 집계합니다. |
| `skill promotions` | `--skill <id>, --all, --json, --output <format>` | 스킬의 기록된 SKILL.md 승격과 롤백을 서술하며, `--all`을 지정하면 모든 스킬과 절차를 대상으로 합니다. |
| `skill rollback` | `--skill <id>, --json, --output <format>` | 가장 최근에 기록된 승격이 교체한 SKILL.md 본문을 복원합니다. |
| `schedule` | `없음` | 예약된 에이전트 작업을 관리합니다. |
| `schedule create` | `--cron <expr>, --every <phrase>, --vendor <vendor>, -w, --workspace <path>, --once, --expires-after <duration>, --env <keys>, --dry-run, --accept-rounded` | 예약된 에이전트 작업을 등록합니다. |
| `schedule list` | `--json, --output <format>` | 예약 작업과 OS 드리프트 상태를 나열합니다. |
| `schedule delete` | `없음` | 매니페스트와 OS 스케줄러에서 예약 작업을 제거합니다. |
| `schedule run` | `없음` | 예약 작업을 ID로 실행합니다. |
| `schedule sync` | `--prune` | 매니페스트를 OS 스케줄러에 다시 동기화합니다. |
