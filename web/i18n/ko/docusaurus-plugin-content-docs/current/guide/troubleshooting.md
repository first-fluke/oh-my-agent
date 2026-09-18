---
title: "가이드: 문제 해결"
sidebar_label: 문제 해결
description: 설치, 설정, 벤더, 대시보드, 스케줄, 평가, 에이전트 결과 오류를 근거 있는 검사로 진단합니다.
---

# 문제 해결

프로젝트 또는 설치 루트에서 기계 판독 가능한 진단부터 시작합니다.

```bash
oma doctor --json
```

명령은 설치, 벤더, 설정, 통합 관련 발견 사항을 식별하는 JSON으로 끝나야 합니다. 모델 또는 에이전트별 해석이 문제라면 `--profile`을 추가하세요. 문제를 보고할 때 이 JSON을 보관하면 추측성 설명 없이 선택된 경로와 검사를 확인할 수 있습니다.

## CLI 또는 설치가 잘못된 파일을 사용함

실행 컨텍스트를 명시적으로 확인합니다.

```bash
oma doctor --json
oma doctor --profile
```

프로젝트 명령은 가장 가까운 `.agents/oma-config.cue` 또는 `.agents/oma-config.yaml`과 하나의 로컬 오버레이를 읽습니다. 글로벌 명령은 HOME 설치 루트를 읽습니다. 로컬 CUE와 로컬 YAML이 모두 있으면 하나를 제거하세요. 로컬 파일이 잘못되면 OMA는 오버라이드를 조용히 무시하지 않고 중단합니다. [설정 레퍼런스](/docs/guide/configuration-reference)를 참고하세요.

업데이트 후에는 설정과 생성된 경로를 확인합니다.

```bash
oma update --ci
oma doctor --json
```

`oma update --ci`는 비대화형으로 실행합니다. 사용자 설정이 예기치 않게 교체되었다면 `--force`를 사용했는지 확인하세요. 일반 업데이트는 사용자가 소유한 설정을 보존하지만 강제 모드는 교체할 수 있습니다.

## 벤더가 시작되지 않음

벤더 자체 인증 검사를 실행한 뒤 OMA의 해석된 프로필을 확인합니다.

```bash
oma doctor --profile
oma agent spawn AGENT "print the resolved runtime and stop" SESSION --read-only
```

`oma doctor`가 나열한 정확한 벤더 명령으로 다시 인증하세요. 모델 오버라이드는 스키마가 허용하는 `owner/model` 형식이어야 하며, 해당 벤더가 선택한 CLI 전송 방식을 지원해야 합니다. `model_preset: free`라면 `oma doctor --profile`에서 해석된 게이트웨이 URL과 모델을 확인한 뒤 설정된 API 키 환경 변수에 키가 있는지 확인하세요. `free` 맵을 생략하면 기본값은 `http://127.0.0.1:31415/v1`, `FREELLM_API_KEY`, 모델 `auto`입니다. API 키 자체를 YAML에 넣지 마세요.

자식이 결과 산출물 없이 종료되면 실행 디렉토리와 상위 프로세스 상태를 확인하세요. `spawn`된 자식은 주입된 실행 식별자와 결과 지시를 받고, 주입된 경로에 결과 보고(`claim`)를 쓰고 artifact를 보고합니다. 상위 프로세스는 종료 코드를 수집한 뒤 관리되는 실행 기록(`receipt`)을 마무리합니다. 읽기 전용 자식은 `OMA_RESULT_JSON: ...`을 반환하며, 이 줄은 검사 결과로 기록되고 실행 가능한 검증을 충족하지 않습니다.

## 훅은 설치됐지만 실행되지 않음

Codex의 경우 생성된 파일을 확인하고 한 번만 수행하는 신뢰 절차를 따릅니다.

```bash
test -f .codex/hooks.json
codex
# inside Codex: /hooks
```

첫 설치 후와 업데이트에서 명령 문자열이 바뀐 뒤 `/hooks`를 실행하세요. OMA가 `spawn`한 Codex 하위 프로세스는 자체 관리 호출에 우회 플래그를 전달하지만, 사용자가 직접 시작한 Codex 세션의 훅은 자동으로 신뢰 대상으로 등록되지 않습니다. [Codex 훅 신뢰 설정](/docs/guide/codex-hook-trust)를 참고하세요.

## 대시보드가 비어 있거나 연결이 끊김

세션 파일이 있는 프로젝트에서 터미널 대시보드를 시작합니다.

```bash
oma dashboard terminal
```

기본적으로 `.agents/state/memories/`를 읽습니다. 상태가 다른 위치에 있으면 `MEMORIES_DIR`을 설정하세요. 웹 대시보드는 루프백에 바인딩하고 토큰이 포함된 URL을 출력합니다.

```bash
MEMORIES_DIR=/path/to/.agents/state/memories DASHBOARD_PORT=9847 oma dashboard web
```

명령이 출력한 정확한 URL을 열어야 합니다. 웹 API와 WebSocket에는 대시보드 토큰이 필요합니다. 포트가 사용 중이면 다른 `DASHBOARD_PORT`를 사용하세요. 에이전트가 표시되지 않으면 선택한 메모리 디렉토리에 워크플로가 세션·작업·진행 파일을 썼는지 확인하세요. 대시보드는 기존 `.serena/memories/` 디렉토리를 자동으로 검색하지 않습니다.

## 스케줄이 없거나 실행되지 않음

매니페스트와 스케줄러 상태를 확인합니다.

```bash
oma schedule list
oma schedule sync
oma schedule run SCHEDULE_ID
```

`schedule list`는 `synced`, `stale`, `missing-in-os`, `orphan-in-os`를 보고합니다. `schedule sync`는 누락된 작업을 복원하고 stale 등록을 다시 씁니다(실행 로그의 `Unknown command: schedule:run` 줄은 등록이 명령 이름 변경 이전 것이라는 뜻이며, `oma update`가 자동으로 재동기화합니다). OS에 남은 고아 작업을 제거할 때만 `--prune`을 추가하세요. `--dry-run`으로 만든 미리보기는 작업을 등록하지 않습니다. 반복 간격에서는 미리보기를 검토한 뒤 `--accept-rounded`로 OMA의 반올림을 승인하세요. `~/.agents/schedule/runs/<id>/`의 실행 로그에서 0이 아닌 벤더 종료 코드 또는 `re-auth required`를 확인하세요.

## 평가 또는 최적화가 커버리지를 보고하지 않음

스킬 평가와 최적화에는 모두 `.agents/eval/<skill>/` 아래에 테스트 사례(fixture)가 최소 5개 필요합니다. 모의 실행 모드에서는 저장된 실행의 출처 정보(provenance)가 현재 스킬과 테스트 사례의 해시와 일치해야 합니다. 테스트 사례나 스킬이 바뀌면 `live` 모드로 다시 기록하세요. 오래된 `_rollouts` 파일을 새 스킬 디렉토리에 복사하여 현재 증거로 취급하지 마세요.

최적화에서는 제안된 변경사항을 검토하는 동안 기본값인 `--dry-run`을 유지하세요. `--apply`에는 엄격하게 양수인 검증 결과와 실행기가 소유한 테스트 분할 통과가 필요합니다. OMA가 관리하는 스킬은 이후 `oma update`로 덮어쓸 수 있습니다.

## 결과를 종료하거나 재개할 수 없음

실행과 계획 파일을 확인합니다.

```bash
ls .agents/state/agent-runs/
oma agent resume SESSION_ID --dry-run
```

`finish` 전에 `oma agent verify RUN_ID --required`를 실행하세요. 실패한 검증 기록, 변경된 입력, 누락 산출물, 미해결 항목 또는 변경된 작업 계약이 있는 완료된 결과 보고(`claim`)는 거부되거나 `failed` 또는 `partial` 상태로 처리됩니다. 재개(`resume`)는 `retry_policy: "safe"`, 재실행 가능한 프롬프트, 남은 시도가 있는 작업만 자동으로 재개합니다. 실행 중 프로세스가 있거나 명확한 `partial`/`failed` 결과가 없는 중단된 네이티브 시도는 중복 작업을 막기 위해 그대로 둡니다. [에이전트 결과 및 재개](/docs/guide/agent-results-and-resume)를 참고하세요.

도움을 요청할 때는 관련 `oma doctor --json` 출력, 명령, 세션 ID와 실행 ID, 미해결 메시지를 포함하세요. 자격 증명이나 시크릿이 포함된 파일 내용은 포함하지 마세요.
