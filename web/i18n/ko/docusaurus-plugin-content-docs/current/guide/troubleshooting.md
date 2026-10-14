---
title: "가이드: 문제 해결"
sidebar_label: 문제 해결
description: 설치, 설정, 벤더, 훅, 대시보드, 스케줄, 평가, 에이전트 결과 오류를 증상이나 정확한 오류 메시지로 찾아, 소스에 근거한 검사와 해결 방법으로 진단합니다.
---

# 문제 해결

프로젝트 또는 설치 루트에서 기계 판독 가능한 진단부터 시작합니다.

```bash
oma doctor --json
```

명령은 설치, 벤더, 설정, 통합 관련 발견 사항을 식별하는 JSON으로 끝나야 합니다. 모델 또는 에이전트별 해석이 문제라면 `--profile`을 추가하세요. 문제를 보고할 때 이 JSON을 보관하면 추측성 설명 없이 선택된 경로와 검사를 확인할 수 있습니다.

## 증상으로 찾기 {#find-your-symptom}

| 증상 | 이동할 곳 |
|---------|-------|
| OMA가 잘못된 설정을 읽거나, 업데이트가 설정을 교체함 | [CLI 또는 설치가 잘못된 파일을 사용함](#the-cli-or-install-is-using-the-wrong-files) |
| `oma install` 또는 `oma update`가 릴리스를 다운로드하지 못함 | [설치 또는 업데이트가 릴리스를 다운로드할 수 없음](#an-install-or-update-cannot-download-the-release) |
| 벤더 CLI 또는 모델이 시작되지 않음 | [벤더가 시작되지 않음](#a-vendor-does-not-start) |
| 훅은 설치됐지만 아무 일도 일어나지 않음 | [훅은 설치됐지만 실행되지 않음](#hooks-are-installed-but-do-not-run) |
| 대시보드가 비어 있거나, 연결이 끊기거나, 시작되지 않음 | [대시보드가 비어 있거나 연결이 끊김](#the-dashboard-is-empty-or-disconnected) |
| 예약된 작업이 없거나 실패함 | [스케줄이 없거나 실행되지 않음](#a-schedule-is-missing-or-did-not-run) |
| 스킬 평가 또는 최적화가 커버리지 없음을 보고함 | [평가 또는 최적화가 커버리지 없음을 보고함](#evaluation-or-optimization-reports-no-coverage) |
| 에이전트 실행이 검증, 종료 또는 재개되지 않음 | [결과를 종료하거나 재개할 수 없음](#a-result-cannot-finish-or-resume) |
| CLI가 오류 메시지를 출력함 | [오류 메시지로 찾기](#find-your-error) |

## 오류 메시지로 찾기 {#find-your-error}

아래 메시지는 모두 CLI가 출력합니다. 메시지의 앞부분을 대조하세요.

| 메시지 | 원인 | 해결 |
|---------|-------|-----|
| `Unknown plan task: <id>` | 작업 ID(`--task-id`로 지정하거나, 기본값은 에이전트 ID)가 `.agents/results/plan-<session>.json`에 있는 작업 `id`가 아님 | 계획에 있는 작업 ID를 `--task-id`로 전달하세요 |
| `Plan is immutable after dispatch; ...` | 첫 디스패치 이후 세션 계획이 변경됨 | 계획을 되돌리거나, 변경한 계획을 새 세션 ID(그리고 `lineage_id`를 지정했다면 새 `lineage_id`)로 저장하세요 |
| `Task acceptance contract changed before dispatch` 또는 `Plan changed before dispatch` | 실행이 시작되는 중에 계획이 수정됨 | 계획이 안정된 뒤 다시 시도하세요 |
| `Attempt limit reached for workflow lineage and logical goal` | 계획의 `max_attempts`(기본값 3, 첫 시도 포함)를 모두 사용함 | 다음 시도를 계획하기 전에 실패한 시도를 확인하세요 |
| `Cannot verify a finished run; start a new run` | 실행이 끝난 뒤 `oma agent verify`를 실행함 | `oma agent begin`으로 새 실행을 시작하세요 |
| `Choose a command, --required, or --affected` | `oma agent verify`가 검증 모드를 받지 못했거나 둘 이상 받음 | `--required`, `--affected PATH...`, `-- <argv>` 중 정확히 하나를 사용하세요 |
| `No complete test selection for affected paths: ...` | 그래프에 해당 경로에 대한 완전한 테스트 선택이 없음 | `--required`를 사용하세요 |
| `The spawning parent finalizes managed runs; write the claim file instead` | `oma agent spawn` 또는 `parallel`로 시작된 실행에서 `oma agent finish`를 호출함 | 주입된 경로에 클레임(claim)을 쓰세요. 실행은 상위 프로세스가 마무리합니다 |
| `Resume requires a session plan with task contracts` | 세션에 계획 파일이 없음 | 재개는 계획 기반 세션에서만 동작합니다. 대신 작업을 다시 `spawn`하세요 |
| `A resume coordinator already owns this session` | 같은 세션에 대해 다른 `oma agent resume`이 실행 중이거나, 그 lease가 다른 호스트에서 생성됨 | 다른 재개가 끝날 때까지 기다리세요. 같은 호스트에서 죽은 프로세스가 남긴 lease는 자동으로 회수됩니다 |
| `No graph-backed context found for <agent>` | 해당 에이전트에 대한 그래프 컨텍스트가 없음 | 작업 정의를 수정하거나, 프로젝트에 문서화된 네이티브 검색 경로로 계속 진행하세요 |
| `Dashboard failed: port 9847 is already in use. ...` | 다른 프로세스가 대시보드 포트를 점유함 | `DASHBOARD_PORT=8080 oma dashboard web`을 사용하거나 다른 프로세스를 중지하세요 |
| `Invalid DASHBOARD_PORT: ...` | `DASHBOARD_PORT`가 1부터 65535 사이의 정수가 아님 | 유효한 포트를 설정하거나, 설정을 해제해 9847을 사용하세요 |
| `Removed option <old>. Use <new>.` | 명령이 제거된 플래그 표기를 사용함 | 메시지에 나온 플래그를 사용하세요 |
| `Unknown command: ... Use oma --help.` | 명령 경로가 제거되었거나 이름이 바뀜 | 현재 경로는 `oma --help` 또는 `oma describe`로 확인하세요 |
| `oma agent spawn`이 종료 코드 3으로 끝남 | 벤더는 0으로 종료했지만 실행이 `completed`로 끝나지 않음 | 실행 기록의 `unresolved`를 확인하세요. [에이전트 결과 및 재개](./agent-results-and-resume.md)를 참고하세요 |

## CLI 또는 설치가 잘못된 파일을 사용함 {#the-cli-or-install-is-using-the-wrong-files}

실행 컨텍스트를 명시적으로 확인합니다.

```bash
oma doctor --json
oma doctor --profile
```

| 증상 | 원인 | 해결 |
|---------|-------|-----|
| 설정이 무시되거나 글로벌 기본값이 우선함 | 명령은 `$OMA_HOME/.agents/`(기본값 `~/.oma/.agents/`)에서 글로벌 기본값을 읽은 뒤, 가장 가까운 프로젝트 공유 설정과 하나의 로컬 오버레이를 읽습니다. 서로 다른 상위 프로젝트 루트는 병합되지 않습니다 | `oma doctor --json`이 선택한 설정 경로를 확인하고, 실제로 읽히는 파일을 수정하세요 |
| 설정을 불러오는 중 OMA가 중단됨 | 로컬 CUE와 로컬 YAML 파일이 모두 있거나, 로컬 파일이 잘못됨. OMA는 오버라이드를 조용히 무시하지 않고 중단합니다 | 두 로컬 파일 중 하나를 제거하거나, 잘못된 파일을 수정하세요 |
| 업데이트 후 사용자 설정이 교체됨 | 업데이트가 `--force`로 실행됨. 일반 업데이트는 사용자가 소유한 설정을 보존하지만 강제 모드는 교체할 수 있습니다 | `--force` 없이 업데이트한 뒤 설정과 생성된 경로를 확인하세요 |

파일 순서는 [설정 레퍼런스](/docs/guide/configuration-reference)를 참고하세요. 업데이트 후에는 설정과 생성된 경로를 확인합니다.

```bash
oma update --ci
oma doctor --json
```

`oma update --ci`는 실행을 비대화형으로 유지합니다.

## 설치 또는 업데이트가 릴리스를 다운로드할 수 없음 {#an-install-or-update-cannot-download-the-release}

<!-- oma-docs:ignore-start -->
`oma install`, `oma update`, `oma doctor` 복구는 `main`의 `prompt-manifest.json`이 가리키는 릴리스를 다운로드합니다. `cli-v<version>` GitHub 릴리스의 `agent-skills.tar.gz` 에셋을 먼저 시도하며 `.sha256` 파일로 검증하고, 그다음 해당 태그의 소스 아카이브, 그다음 해당 태그의 shallow clone을 시도합니다. 체크섬이 일치하지 않거나 페이로드의 `.agents/skills/_version.json`이 다른 버전을 가리키면, 다른 소스를 시도하지 않고 실행을 중단합니다.
<!-- oma-docs:ignore-end -->

| 증상 | 원인 | 해결 |
|---------|-------|-----|
| 릴리스 직후 다운로드가 실패함 | 매니페스트가 아직 에셋이 게시되고 있는 버전을 가리킴 | 몇 분 기다렸다가 다시 시도하세요 |
| `main`의 릴리스되지 않은 콘텐츠가 필요함 | 릴리스는 태그된 콘텐츠만 설치함 | `OMA_UPDATE_CHANNEL=main oma update`로 그 실행에 한해 명시적으로 활성화하세요 |

```bash
OMA_UPDATE_CHANNEL=main oma update
```

실행하면 main 브랜치의 콘텐츠는 태그된 릴리스도 아니고 체크섬 검증도 거치지 않았다는 경고가 출력됩니다.

## 벤더가 시작되지 않음 {#a-vendor-does-not-start}

벤더 자체 인증 검사를 실행한 뒤 OMA의 해석된 프로필을 확인합니다.

```bash
oma doctor --profile
oma agent spawn AGENT "print the resolved runtime and stop" SESSION --read-only
```

| 증상 | 원인 | 해결 |
|---------|-------|-----|
| 벤더 CLI가 인증되지 않음 | 벤더 세션이 만료되었거나 설정된 적이 없음 | `oma doctor`가 나열한 정확한 벤더 명령으로 다시 인증하세요 |
| 모델 오버라이드가 거부됨 | 오버라이드가 스키마가 허용하는 `owner/model` 형식이 아니거나, 해당 벤더가 선택한 CLI 전송 방식을 지원하지 않음 | 전송 방식을 지원하는 벤더로 `owner/model` 형식을 사용하세요 |
| `model_preset: free`가 게이트웨이에 연결되지 않음 | 해석된 게이트웨이 URL 또는 모델이 잘못되었거나, 설정된 API 키 환경 변수가 비어 있음 | `oma doctor --profile`로 게이트웨이 URL과 모델을 확인한 뒤 환경 변수에 키를 설정하세요 |
| 자식이 결과 산출물 없이 종료됨 | 자식이 주입된 경로에 클레임을 쓰지 않음 | 실행 디렉토리와 상위 프로세스 상태를 확인하세요(아래 참고) |

`free` 맵을 생략하면 기본값은 `http://127.0.0.1:31415/v1`, `FREELLM_API_KEY`, 모델 `auto`입니다. API 키 자체를 YAML에 넣지 마세요.

`spawn`된 자식은 실행 식별자와 결과 지시를 받고, 주입된 경로에 클레임을 쓰고, 산출물을 보고합니다. 상위 프로세스는 종료 코드를 수집한 뒤 관리되는 실행 기록(receipt)을 마무리합니다. 읽기 전용 자식은 `OMA_RESULT_JSON: ...`을 반환하며, 이 줄은 검사 결과로 기록되고 실행 가능한 검증을 충족하지 않습니다.

## 훅은 설치됐지만 실행되지 않음 {#hooks-are-installed-but-do-not-run}

| 증상 | 원인 | 해결 |
|---------|-------|-----|
| Codex가 OMA 훅을 실행하지 않음 | 훅이 아직 신뢰되지 않음: 첫 설치이거나, 업데이트로 훅 명령 문자열이 바뀜 | `.codex/hooks.json`을 확인한 뒤 Codex 안에서 `/hooks`를 실행하세요 |

```bash
test -f .codex/hooks.json
codex
# inside Codex: /hooks
```

OMA가 `spawn`한 Codex 하위 프로세스는 자체 관리 호출에 우회 플래그를 전달하지만, 사용자가 직접 시작한 Codex 세션의 훅을 신뢰하지는 않습니다. [Codex 훅 신뢰 설정](/docs/guide/codex-hook-trust)을 참고하세요.

## 대시보드가 비어 있거나 연결이 끊김 {#the-dashboard-is-empty-or-disconnected}

세션 파일이 있는 프로젝트에서 터미널 대시보드를 시작합니다.

```bash
oma dashboard terminal
```

| 증상 | 원인 | 해결 |
|---------|-------|-----|
| `No agents detected yet` | 워크플로우가 감시 중인 메모리 디렉토리에 세션·작업·진행 파일을 아직 쓰지 않았거나, 대시보드가 다른 디렉토리를 감시함 | 첫 진행 파일을 기다리세요. 프로젝트 루트에서 실행하거나, `--project-root <path>`를 전달하거나, `MEMORIES_DIR`을 설정하세요 |
| 기존 `.serena/memories/` 디렉토리의 파일이 표시되지 않음 | 대시보드는 `.agents/state/memories/`를 읽으며 기존 디렉토리를 검색하지 않음 | 파일이 있는 디렉토리로 `MEMORIES_DIR`을 설정하세요 |
| `oma dashboard web`이 `port 9847 is already in use`로 종료됨 | 다른 프로세스가 포트를 점유함 | 다른 `DASHBOARD_PORT`를 사용하세요 |
| 대시보드를 재시작한 뒤 웹 페이지가 계속 Disconnected 상태임 | 시작할 때마다 새 접근 토큰이 생성되는데, 열려 있는 탭은 이전 토큰을 가지고 있음 | 페이지를 새로 고침하세요 |

웹 대시보드는 루프백에 바인딩하고 URL을 출력합니다. 그 URL을 여세요. 페이지는 웹 API와 WebSocket용 토큰을 자체적으로 가지고 있습니다.

```bash
MEMORIES_DIR=/path/to/.agents/state/memories DASHBOARD_PORT=9847 oma dashboard web
```

더 많은 대시보드 신호는 [대시보드 모니터링](./dashboard-monitoring.md#troubleshooting-runbook)에 있습니다.

## 스케줄이 없거나 실행되지 않음 {#a-schedule-is-missing-or-did-not-run}

매니페스트와 스케줄러 상태를 확인합니다. 처음 두 명령은 읽기 전용이고, 마지막 두 명령은 상태를 변경합니다.

```bash
oma schedule list                 # read-only: synced, stale, missing-in-os, orphan-in-os
oma schedule inspect SCHEDULE_ID  # read-only: one manifest entry
oma schedule sync                 # writes: registers missing jobs and rewrites stale ones
oma schedule run SCHEDULE_ID      # executes the job now (normally invoked by the OS scheduler)
```

| 증상 | 원인 | 해결 |
|---------|-------|-----|
| `schedule list`에 `missing-in-os` 또는 `stale`이 표시됨 | OS 등록이 없거나 오래됨 | `oma schedule sync` |
| 실행 로그에 `Unknown command: schedule:run`이 표시됨 | 등록이 명령 이름 변경 이전 것임 | `oma update`가 자동으로 재동기화합니다. `oma schedule sync`도 등록을 다시 씁니다 |
| `schedule list`에 `orphan-in-os`가 표시됨 | OS 작업에 대응하는 매니페스트 항목이 없음 | 고아 작업을 제거해야 할 때만 `oma schedule sync --prune` |
| 만든 스케줄이 등록되지 않음 | 미리보기만 하는 `--dry-run`으로 생성됨 | `--dry-run` 없이 다시 생성하세요 |
| 반복 간격이 등록되지 않음 | 간격에 반올림이 필요함 | 미리보기를 검토한 뒤 `--accept-rounded`로 반올림을 승인하세요 |
| 작업은 실행됐지만 실패함 | 벤더가 0이 아닌 코드로 종료했거나, 로그에 `re-auth required`가 있음 | `~/.oma/schedule/runs/<id>/` 아래의 실행 로그를 확인하고 벤더를 다시 인증하세요 |

## 평가 또는 최적화가 커버리지 없음을 보고함 {#evaluation-or-optimization-reports-no-coverage}

| 증상 | 원인 | 해결 |
|---------|-------|-----|
| 스킬 평가 또는 최적화가 커버리지 없음을 보고함 | `.agents/eval/<skill>/` 아래 테스트 사례(fixture)가 5개 미만임 | 테스트 사례를 최소 5개가 될 때까지 추가하세요 |
| mock 모드가 기록된 rollout을 거부함 | 기록된 rollout의 출처 정보(provenance)가 현재 스킬과 테스트 사례의 해시와 일치하지 않음 | live 모드로 다시 기록하세요. 오래된 `_rollouts` 파일을 새 스킬 디렉토리에 복사하여 현재 증거로 취급하지 마세요 |
| `--apply`가 쓰기를 거부함 | `--apply`에는 엄격하게 양수인 검증 결과와 실행기가 소유한 테스트 분할 통과가 필요함 | 제안된 변경사항을 검토하는 동안 기본값인 `--dry-run`을 유지하고, 실패한 검증부터 해결하세요 |

`--apply`로 변경한 OMA 소유 스킬은 이후 `oma update`로 덮어쓰일 수 있습니다.

## 결과를 종료하거나 재개할 수 없음 {#a-result-cannot-finish-or-resume}

실행과 계획 파일을 확인합니다.

```bash
ls .agents/state/agent-runs/
oma agent resume SESSION_ID --dry-run
```

| 증상 | 원인 | 해결 |
|---------|-------|-----|
| 완료 상태의 클레임이 거부되거나 격하됨 | 실패한 검증 기록(receipt), 변경된 입력, 누락 산출물, 미해결 항목 또는 변경된 작업 계약 | `finish` 전에 `oma agent verify RUN_ID --required`를 실행하고, 검증 기록이 보고한 문제를 해결하세요 |
| 재개 후에도 작업이 `blocked`로 남음 | 자동 재개에는 `retry_policy: "safe"`, 재실행 가능한 프롬프트, 남은 시도가 필요함 | dry-run 보고서에서 이유를 확인하세요. 계획은 첫 디스패치 이후 고정되므로 새 세션의 계획에 `retry_policy`를 설정하거나 작업을 수동으로 다시 실행하세요 |
| 재개가 작업을 재시도하지 않음 | 실행 중인 프로세스, 또는 명확한 `partial`/`failed` 결과가 없는 중단된 네이티브 시도는 중복 작업을 막기 위해 그대로 둠 | 실행 중인 프로세스를 기다리거나, 네이티브 시도를 먼저 마무리하세요 |

전체 수명 주기는 [에이전트 결과 및 재개](./agent-results-and-resume.md)를 참고하세요.

## 도움 요청하기 {#ask-for-help}

도움을 요청할 때는 관련 `oma doctor --json` 출력, 명령, 세션/실행 ID, 미해결 메시지를 포함하세요. 자격 증명이나 시크릿이 포함된 파일 내용은 포함하지 마세요. 이슈는 [github.com/first-fluke/oh-my-agent/issues](https://github.com/first-fluke/oh-my-agent/issues)에 등록하세요.

## 함께 보기 {#see-also}

- [OMA 사용하기](./usage.md#troubleshooting): 누락된 스킬, CLI, 워크스페이스 충돌 같은 설정 문제
- [대시보드 모니터링](./dashboard-monitoring.md#troubleshooting-runbook): 멈춤, 크래시, 연결 끊김 대시보드 신호
- [에이전트 결과 및 재개](./agent-results-and-resume.md): 실행 기록, 클레임, 복구
- [용어집](../getting-started/glossary.md): [실행 기록과 클레임](../getting-started/glossary.md#run-record-and-claim) 같은 용어
