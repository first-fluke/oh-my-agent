---
title: "가이드: 예약 에이전트"
sidebar_label: 에이전트 예약 실행
description: OS 스케줄러(macOS launchd, Linux systemd, Windows 작업 스케줄러)로 어떤 에이전트든 반복 또는 일회성 일정에 맞춰 실행하며 벤더 런타임을 열어 둘 필요가 없습니다.
---

# 예약 에이전트

`oma schedule`을 쓰면 지금 어떤 AI 벤더 런타임(Claude Code, Codex, Antigravity, Cursor, Qwen, Grok, opencode, pi)이 열려 있든 상관없이, 어떤 에이전트든 시간 기준으로 실행할 수 있습니다. OS 스케줄러가 작업을 발동하면, 그 작업이 디스크에 이미 캐시된 벤더 자격 증명으로 `oma agent spawn`을 헤드리스로 호출합니다.

---

## 동작 방식

`oma schedule create`를 실행하면 oma가 다음을 수행합니다.

1. 작업 레코드를 `~/.oma/schedule/schedules.json`의 글로벌 매니페스트에 씁니다.
2. 작업을 OS 스케줄러(macOS launchd, Linux systemd --user, Windows 작업 스케줄러)에 등록합니다. OS 작업은 설정된 cron 간격마다 `oma schedule run <id>`를 호출합니다.
3. 발동 시점에 `oma schedule run`이 작업을 찾아 캡처한 환경 변수를 주입하고, `oma agent spawn`을 호출한 뒤, 실행 로그를 `~/.oma/schedule/runs/<id>/<timestamp>.md`에 씁니다.

매니페스트가 단일 진실 원천(SSOT)이고 OS 스케줄러는 실행기일 뿐입니다. 작업 정의, 실행 로그, 마지막 발동 시각 같은 모든 상태는 `~/.oma/schedule/` 아래에 있습니다.

### 설계상 글로벌 전용

`oma schedule`은 의도적으로 프로젝트별이 아니라 사용자 전역입니다. OS 스케줄러는 현재 작업 디렉토리와 무관하게 작업을 실행하므로, 중앙 레지스트리 하나만이 현실적인 SSOT입니다. 각 작업은 `workspace`와 `projectLabel`로 소속 프로젝트를 기록하므로, 레지스트리를 공유하더라도 `schedule list`가 프로젝트별로 묶어 보여줄 수 있습니다.

`--global` 플래그는 없습니다. schedule 명령은 `$OMA_HOME/schedule/`을 사용하며, 기본값은 `~/.oma/schedule/`입니다. 등록된 OS 작업은 해석된 홈 경로를 명시적으로 전달받으므로 로그인 셸 없이도 같은 레지스트리를 엽니다. 홈을 옮긴 뒤에는 `oma schedule sync`를 실행해 작업 명령과 로그 경로를 갱신하세요.

### OS 백엔드

| 플랫폼 | 기본 백엔드 | 폴백 | `oma schedule run`의 stderr |
|---|---|---|---|
| macOS | launchd (plist + `launchctl`) | — | `runs/<id>/stderr.log` |
| Linux | systemd --user 타이머 | `systemctl --user`를 쓸 수 없을 때 사용자 `crontab` | `runs/<id>/stderr.log` (systemd), 저장되지 않음 (crontab) |
| Windows | 작업 스케줄러 (`schtasks`) | — | 저장되지 않음 |

oma가 사용 가능한 백엔드를 자동으로 고릅니다. 직접 설정할 필요가 없습니다.

---

## 비교: schedule과 ralph와 Claude /loop

이 세 기능은 모두 "나중에 다시 실행"과 관련이 있어서 헷갈리기 쉽지만, 서로 다른 개념입니다.

| 기능 | 트리거 | 범위 | 벤더 재시작 후에도 유지? |
|---|---|---|---|
| `oma schedule` | 시간 기준 (cron) | 벤더 무관, OS 수준 | 예. 벤더 런타임이 하나도 열려 있지 않아도 OS 스케줄러가 발동합니다 |
| `ralph` | 완료 기준 (Stop 훅 루프) | 벤더 무관 | 현재 세션이 살아 있는 동안만 유지됩니다. ralph는 타이머가 아니라 "끝날 때까지 계속" 루프입니다 |
| Claude Code `/loop` | 시간 기준 (인프로세스 cron) | Claude 런타임 전용 | 아니오. Claude Code가 실행 중일 때만 발동합니다 |

평일 오전 9시에 작업을 돌리고 싶다면 `schedule`을, 에이전트가 품질 기준을 만족할 때까지 계속 반복하길 원한다면 `ralph`를 쓰세요. `/loop`는 이미 Claude Code 안에 있고 벤더 간 이식성이 필요 없을 때만 쓰세요.

---

## 빠른 시작

```bash
# Run the qa-reviewer agent every weekday at 9 AM
oma schedule create qa-reviewer "Run QA review on the latest changes" --cron "0 9 * * 1-5"

# Run a backend agent every 2 hours using natural-language syntax
oma schedule create backend "Check for slow queries in the API logs" --every "2h"

# One-shot: run at the next 15:00 and remove the job after a successful run
oma schedule create pm "Generate weekly plan" --cron "0 15 * * *" --once

# Check what is scheduled
oma schedule list

# Remove a job
oma schedule delete sch_abcdefgh2345
```

`schedule create`는 `run`과 `delete`에 필요한 작업 ID를 출력합니다.

```text
Scheduled job registered: sch_abcdefgh2345
  Agent:   qa-reviewer
  Cron:    0 9 * * 1-5
  Vendor:  auto
  Project: my-project
  Once:    false
```

새 작업은 첫 예약 실행 전에 직접 한 번 발동해 프롬프트와 벤더 자격 증명을 확인하세요.

```bash
oma schedule run sch_abcdefgh2345
ls ~/.oma/schedule/runs/sch_abcdefgh2345/
```

---

## 명령

### schedule create

예약 에이전트 작업을 등록합니다.

```bash
oma schedule create <agent-id> <prompt> --cron "<5-field>" | --every "<phrase>" [--vendor <vendor>] [-w <path>] [--once] [--expires-after <Nd>] [--env <KEY1,KEY2>] [--dry-run] [--accept-rounded]
```

**인자:**

| 인자 | 필수 | 설명 |
|---|---|---|
| `agent-id` | 예 | `oma agent spawn`에 전달할 에이전트입니다. 표준 ID(`orchestrator`, `architecture`, `pm`, `backend`, `frontend`, `mobile`, `db`, `debug`, `refactor`, `qa`, `docs`, `tf-infra`, `explore`) 또는 `qa-reviewer`, `backend-engineer` 같은 정의 이름을 씁니다. 등록 시점에는 검증하지 않으므로 작업을 만든 뒤 `oma schedule run <id>`를 한 번 실행하세요. |
| `prompt` | 예 | 실행 시점에 에이전트에 전달할 태스크 설명 |

**옵션:**

| 플래그 | 설명 |
|---|---|
| `--cron "<expr>"` | 5필드 cron 표현식(예: 매일 오전 9시는 `"0 9 * * *"`). `--every`와 함께 쓸 수 없습니다. |
| `--every "<phrase>"` | 자연어 간격입니다(아래 표 참고). `--cron`과 함께 쓸 수 없습니다. |
| `--vendor <vendor>` | `oma agent spawn`에 전달할 CLI 벤더 오버라이드: `antigravity`, `claude`, `codex`, `cursor`, `opencode`, `qwen`, `grok`, `pi`. 기본값은 `oma-config.yaml` 기준 자동 감지입니다. |
| `-w, --workspace <path>` | 실행 시점의 에이전트 작업 디렉토리입니다. 기본값은 등록 시점의 현재 작업 디렉토리입니다. |
| `--once` | 일회성 모드입니다. exit 0으로 끝난 첫 실행 뒤에 작업이 스스로 제거됩니다. 실행이 실패하면 작업이 남아 다음 cron 일치 시점에 다시 발동합니다. 기본값은 반복입니다. |
| `--expires-after <duration>` | 반복 작업이 이 기간을 넘긴 뒤 처음 발동할 때 제거합니다. `30d`처럼 단위를 붙인 일 단위 정수를 쓰며, 단위 없는 숫자(`30`)는 거부됩니다. `0`은 무기한이며 기본값입니다. |
| `--env <KEY1,KEY2>` | 나열한 환경 변수만 `~/.oma/schedule/env/<id>`(권한 0600)에 캡처해 실행 시점에 주입합니다. 시크릿은 매니페스트 자체에 절대 기록되지 않습니다. |
| `--dry-run` | 스케줄러 작업, 매니페스트 항목, 환경 파일을 쓰지 않고 해석된 cron과 반올림 안내를 출력합니다. |
| `--accept-rounded` | OMA가 자연어 간격을 cron으로 표현 가능한 단계로 반올림한 뒤 등록하려면 필요합니다. 먼저 `--dry-run`으로 미리 보세요. |

`--cron`과 `--every` 중 정확히 하나가 필요합니다.

#### --every: 자연어 간격

`--every`는 다음 표현 형식을 받습니다. oma가 이를 5필드 cron 표현식으로 파싱하며, 요청한 간격을 cron으로 표현할 수 있는 가장 가까운 단위로 반올림하면 안내를 출력합니다.

| 표현 형식 | 예시 | 비고 |
|---|---|---|
| 축약 단위 | `5m`, `2h`, `1d` | 분, 시간, 일 |
| every + 축약 | `every 20m`, `every 2h` | |
| every + 단어 | `every 5 minutes`, `every 2 hours` | 복수형 단위도 받습니다 |
| 초 | `30s` | 최소 1분으로 올림합니다. cron은 분 미만 간격을 표현할 수 없습니다 |

나누어떨어지지 않는 간격은 가장 가까운 깔끔한 단위로 반올림하고 안내를 출력합니다. 예를 들어 `--every 7m`은 7이 60을 나누지 못하므로 `6m`(`*/6`)으로 반올림됩니다.

등록 전에 반올림된 간격을 미리 확인하세요.

```bash
oma schedule create backend "Check logs" --every 7m --dry-run
# Preview: requested interval resolves to */6 * * * *
# Note: Requested every 7m -- 7 is not a divisor of 60; rounded to every 6m (*/6 * * * *).
# Preview only: no OS job, manifest entry, or env file was written.
oma schedule create backend "Check logs" --every 7m --accept-rounded
```

미리 보기를 생략하면 명령이 반올림된 간격 등록을 거부합니다. 일정은 선택한 OS 스케줄러의 로컬 시간 규칙을 따릅니다.

**예제:**

```bash
# Exact cron expression (full control)
oma schedule create backend "Optimize slow queries" --cron "0 */4 * * *"

# Natural language (oma converts to cron)
oma schedule create frontend "Run lighthouse audit" --every "every 6 hours"
# Converts to 0 */6 * * * (6 divides 24 cleanly, so no rounding note)

# Pin to a vendor and a workspace
oma schedule create qa "Run security scan" --cron "0 2 * * 0" --vendor claude -w /home/user/myproject

# One-shot job
oma schedule create pm "Generate sprint retrospective" --cron "0 17 * * 5" --once

# Capture specific env vars for the job
oma schedule create backend "Sync external API data" --cron "0 * * * *" --env SYNC_API_KEY,SYNC_TARGET_URL
```

---

### schedule list

모든 프로젝트의 예약 작업을 프로젝트별로 묶어 나열하고 OS 드리프트 상태를 함께 보여줍니다.

```bash
oma schedule list [--json]
```

**옵션:**

| 플래그 | 설명 |
|---|---|
| `--json` | 기계 판독 가능한 JSON으로 출력 |

**드리프트 상태:**

| 상태 | 의미 |
|---|---|
| `synced` | 매니페스트와 OS 스케줄러 양쪽에 작업이 있습니다 |
| `stale` | 등록은 되어 있지만 OS 등록이 현재 CLI가 받지 않는 명령을 호출합니다(예: 명령 경로 표준화 전에 기록된 `schedule:run <id>`). `schedule sync`로 다시 쓰세요. `oma update`가 자동으로 처리합니다. |
| `missing-in-os` | 매니페스트에는 있지만 OS 스케줄러에 없습니다. `schedule sync`로 복구하세요. |
| `orphan-in-os` | 에이전트 일정(`dev.oma.sch_*`)이 OS 스케줄러에는 있지만 매니페스트에 없습니다. `schedule sync --prune`으로 제거하세요. |

`dev.oma.agentmemory`, `dev.oma.serena-daemon-gc`, `dev.oma.serena-reaper` 같은 내부 서비스는 각자의 서비스 관리자가 있습니다. `schedule list`는 이들을 고아 감지에서 제외하고, `schedule sync --prune`도 이들을 보존합니다.

**출력 (텍스트):**

작업은 프로젝트 라벨로 묶입니다. 각 행은 ID, cron 표현식, 에이전트, 벤더, OS 백엔드, 반복 여부, 드리프트 상태를 보여줍니다.

```text
[my-project]
ID                 CRON           AGENT              VENDOR   BACKEND  RECUR  STATE
------------------------------------------------------------------------------------------
sch_abcdefgh2345   0 9 * * 1-5    qa-reviewer        auto     launchd  true   synced
sch_mnopqrst4567   */30 * * * *   backend            claude   launchd  true   missing-in-os

[orphan-in-os]
  dev.oma.sch_old (in OS scheduler but not in manifest)
```

`oma harness evolution enable`로 만든 작업은 에이전트가 `__builtin__`으로 표시되며, 해당 프로젝트에서 `oma harness evolution run --scheduled`를 실행합니다. 이 작업은 `oma schedule delete`가 아니라 `oma harness evolution enable`과 `disable`로 관리하세요([프로젝트 하네스 진화](./harness-evolution.md) 참고). `oma schedule --help`에 나오는 `oma schedule builtin-evolution-add`와 `oma schedule inspect`는 그 명령을 위한 내부 헬퍼입니다.

**예제:**

```bash
oma schedule list
oma schedule list --json | jq '.jobs[] | select(.drift != "synced")'
```

---

### schedule delete

예약 작업을 매니페스트와 OS 스케줄러 양쪽에서 제거합니다.

```bash
oma schedule delete <id>
```

**인자:**

| 인자 | 필수 | 설명 |
|---|---|---|
| `id` | 예 | `schedule list`에서 얻은 작업 ID(형식: `sch_<base32-12>`) |

OS 스케줄러 제거가 실패하면(예: 백엔드가 일시적으로 사용 불가) 경고를 출력하지만 매니페스트 항목은 그대로 제거합니다.

**예제:**

```bash
oma schedule delete sch_abcdefgh2345
```

---

### schedule run

ID로 예약 작업을 실행합니다. 발동 시점에 OS 스케줄러가 호출하며, 보통 직접 실행하지 않습니다.

```bash
oma schedule run <id>
```

래퍼가 하는 일은 다음과 같습니다.
1. 매니페스트에서 작업 ID를 찾습니다. 없으면 0이 아닌 코드로 종료합니다. `--expires-after` 기간이 지났으면 실행하지 않고 작업을 제거합니다.
2. `~/.oma/schedule/env/<id>`가 있으면 캡처한 환경 변수를 읽어 스폰할 프로세스에 주입합니다.
3. `oma agent spawn <agentId> <prompt> <generatedSessionId> --vendor <vendor> -w <workspace>`를 호출합니다.
4. 실행 결과를 `~/.oma/schedule/runs/<id>/<ISO-timestamp>.md`에 씁니다.
5. 매니페스트의 `lastFiredAt`을 갱신합니다.
6. `--once`가 설정돼 있고 에이전트가 exit 0으로 끝났으면 작업을 제거합니다(매니페스트와 OS 스케줄러 양쪽).

**인증 실패는 요란하게 알립니다.** 벤더 자격 증명이 만료됐으면 작업이 0이 아닌 코드로 종료하고 stderr에 `re-auth required: <vendor>`를 출력합니다(launchd와 systemd에서는 `runs/<id>/stderr.log`에 저장됩니다). `--vendor` 없이 만든 작업이면 벤더가 `unknown`으로 표시됩니다. 조용히 성공한 척하지 않습니다.

디버깅을 위해 `schedule run`을 직접 실행할 수 있습니다.

```bash
oma schedule run sch_abcdefgh2345
```

---

### schedule sync

매니페스트를 OS 스케줄러와 다시 동기화합니다. 시스템 마이그레이션, OS 스케줄러 초기화 후, 또는 드리프트를 복구할 때 쓰세요.

```bash
oma schedule sync [--prune]
```

**옵션:**

| 플래그 | 설명 |
|---|---|
| `--prune` | OS 스케줄러에는 있지만 매니페스트에 없는 작업(orphan-in-os)도 함께 제거합니다. `--prune`이 없으면 고아 작업을 보고만 하고 제거하지 않습니다. |

**예제:**

```bash
# Repair missing-in-os jobs and rewrite stale registrations (does not remove orphans)
oma schedule sync

# Repair missing-in-os jobs AND remove orphans
oma schedule sync --prune
```

`oma update`는 업데이트가 끝날 때마다 같은 동기화를(`--prune` 없이) 실행합니다. 따라서 CLI 릴리스가 `oma schedule run` 명령의 표기를 바꾸더라도 기존 OS 등록이 새 바이너리가 거부하는 명령을 가리킨 채 남지 않습니다. 이전 버전이 `oma schedule:run <id>`로 기록한 등록도 계속 동작합니다. OS가 호출하는 작업에 한해 이 예전 표기는 계속 허용됩니다.

---

## 저장 레이아웃

모든 예약 상태는 `~/.oma/schedule/` 아래에 있습니다.

```text
~/.oma/schedule/
├── schedules.json          # SSOT manifest (permissions 0600)
├── env/
│   └── sch_abcdefgh2345    # Captured env vars for this job (permissions 0600)
├── running/                # Lease files while a job runs
└── runs/
    └── sch_abcdefgh2345/
        ├── 2026-06-16T09-00-00-000Z.md   # One log per fire: session, exit code, agent output
        ├── stdout.log                    # launchd and systemd only: stdout of oma schedule run
        └── stderr.log                    # launchd and systemd only: stderr, e.g. re-auth required
```

권한:
- `~/.oma/schedule/` 디렉토리: `0700`
- `schedules.json`과 `env/<id>` 파일: `0600`

**시크릿은 `schedules.json`에 절대 기록하지 않습니다.** `--env` 플래그는 나열한 키만 `env/` 아래의 별도 `0600` 파일에 씁니다. 명시적으로 나열한 키만 캡처하며, 환경 전체를 덤프하는 일은 없습니다.

---

## 보안 참고

- `schedule create`는 신뢰 경로 작업입니다. 인증된 사용자만 작업을 등록할 수 있습니다. `schedule create`를 외부나 신뢰할 수 없는 입력에 노출하지 마세요. 예약된 프롬프트는 미래 시점에 실행되는 임의 코드입니다.
- `schedule run`은 매니페스트에 ID가 있는 작업만 실행합니다. 임의 argv 주입은 불가능합니다.
- 디스크의 벤더 자격 증명(예: `~/.codex/auth.json`, `~/.grok/auth.json`)을 헤드리스 디스패치에 그대로 씁니다. 추가 인증 게이트는 없습니다. 자격 증명이 만료되면 작업이 요란하게 실패합니다.

---

## 팁과 문제 해결 {#tips-and-troubleshooting}

**실행 로그 확인:**

```bash
ls ~/.oma/schedule/runs/sch_abcdefgh2345/
cat ~/.oma/schedule/runs/sch_abcdefgh2345/2026-06-16T09-00-00-000Z.md
```

**시스템 재시작 후 작업이 `missing-in-os`로 표시될 때:**

`oma schedule sync`를 실행해 매니페스트의 모든 작업을 OS 스케줄러에 다시 등록하세요.

**작업이 발동했는데 벤더 자격 증명이 만료됐을 때:**

macOS(launchd)와 Linux(systemd)에서는 `~/.oma/schedule/runs/<id>/stderr.log`에서 `re-auth required: <vendor>`를 확인하세요. `<timestamp>.md` 실행 로그에는 에이전트 자체의 출력과 종료 코드가 들어 있습니다. crontab과 작업 스케줄러 백엔드는 이 stderr를 보관하지 않으므로 터미널에서 `oma schedule run <id>`를 실행해 확인하세요. 벤더 CLI로 다시 인증하고(예: `claude login`, `codex login`), 다음 예약 발동 전에 `oma schedule run <id>`를 직접 실행해 확인하세요.

**작업 변경:**

`schedule update`는 없습니다. 대체할 작업을 먼저 만든 뒤 `oma schedule delete <old-id>`로 이전 ID를 삭제하세요. `--env`는 작업을 만들 때 변수 값을 복사하므로, 시크릿을 교체한 뒤에는 셸에 새 값을 export한 상태로 작업을 다시 만드세요.

**`--every`가 간격을 반올림했을 때:**

oma가 간격을 반올림하면 무엇이 바뀌었는지 안내를 출력합니다. 60분이나 24시간으로 깔끔하게 나누어떨어지지 않는 정확한 간격이 필요하면 `--cron`에 5필드 표현식을 직접 쓰세요.

**한 프로젝트의 작업을 전부 제거할 때:**

```bash
# List jobs for a specific project, then remove each
oma schedule list --json | jq -r '.jobs[] | select(.projectLabel == "my-project") | .id' \
  | xargs -I{} oma schedule delete {}
```

**Windows 지원:**

Windows에서는 oma가 `schtasks`로 작업을 등록합니다. 작업 스케줄러 등록은 다시 읽어 올 수 없으므로 `schedule list`는 등록된 모든 작업을 `stale`로 보고하고, `schedule sync`(`oma update`도 실행함)가 이를 전부 다시 등록합니다. Windows에서는 `stale`이 예상된 상태이며, `missing-in-os`와 `orphan-in-os`는 여전히 드리프트를 뜻합니다.

다만 `schtasks`는 모든 cron 형태를 표현하지 못합니다. 지원하는 형태는 `*/N * * * *`(N분마다), `M * * * *`(매시 M분), `M H * * *`(매일), `M H * * D`(매주. `D`는 요일 하나, `1-5` 같은 범위, `1,3,5` 같은 쉼표 목록 가능), `M H D * *`(매월)입니다. 그 밖의 표현식(예: 분 필드의 쉼표 목록)은 Windows에서 `schedule create` 시점에 거부합니다.

`--every`는 60을 나누는 분 간격(예: `--every 5m`, `--every 30m`)일 때만 지원되는 형태를 만듭니다. 시간·일 간격(`--every 2h`, `--every "every 6 hours"`, `--every 1d`)과 `--cron "0 */4 * * *"` 같은 시간 단계는 `0 */N * * *` 또는 `0 0 */N * *`를 만들며, 작업 스케줄러는 `schedule create` 시점에 이를 거부합니다. Windows에서는 `--cron "0 9 * * 1-5"`처럼 고정 시각을 쓰세요.

---

## 함께 보기

- [프로젝트 하네스 진화](./harness-evolution.md) — 예산 범위 안에서 스킬 개선을 실행하는 내장 `__builtin__` 작업.
- [하네스 평가](./harness-eval.md) — 평가 명령들이 서로 어떻게 맞물리는지.
