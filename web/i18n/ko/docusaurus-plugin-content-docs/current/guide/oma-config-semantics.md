---
title: "가이드: oma-config.yaml 시맨틱"
sidebar_label: 설정 로딩 규칙
description: CUE와 YAML 설정 계층을 선택하고 local overlay를 적용하며 설치 컨텍스트별 폴백을 해석하는 방법을 설명합니다. 지원 키와 기본값은 설정 레퍼런스를 참고하세요.
---

## 개요

설정은 현재 작업 디렉토리에서 상위로 이동하며 발견하는 가장 가까운 `.agents/` 디렉토리에서 선택됩니다.

- **공유 설정**: `.agents/oma-config.cue`, 또는 CUE가 없거나 평가할 수 없을 때 `.agents/oma-config.yaml`을 사용합니다.
- **로컬 설정**: `.agents/oma-config.local.cue` 또는 `.agents/oma-config.local.yaml`(공유 파일에 overlay되는 하나의 파일이며 비공개로 유지해야 합니다).

OMA는 일반적인 런타임 조회에서 프로젝트 파일과 `~/.agents/oma-config.*`를 병합하지 않습니다. 글로벌 설치는 설치 root가 HOME이므로 HOME 파일을 읽고, 프로젝트 명령은 가장 가까운 프로젝트 계층을 읽습니다. `auto_update_cli`는 의도적으로 예외이며, 업데이트 확인에서 프로젝트 설정, home 설정, 그리고 기본값 `true` 순으로 조회합니다. 지원 모델과 기본값 전체는 [설정 레퍼런스](/docs/guide/configuration-reference)를 참고하세요.

## 우선순위 표

| 키 | 유효 규칙 | 비고 |
|-----|:---------:|-------|
| `OMA_MODEL_PRESET` | 최고 우선 | 비어 있지 않은 환경 변수 값이 해당 프로세스의 `model_preset`을 대체합니다. |
| Local 파일 | 공유 설정에 overlay | 일반 map은 재귀적으로 병합하고, 배열·스칼라·`null`은 공유 값을 대체합니다. 두 local 파일 형식은 동시에 존재할 수 없습니다. |
| 공유 CUE | 우선 | CUE가 없거나 실패하면 loader가 공유 YAML 파일을 시도합니다. local CUE 오류는 치명적입니다. |
| 공유 YAML | 폴백 | 사용할 수 있는 공유 CUE가 선택되지 않을 때 사용합니다. |
| `auto_update_cli` | 프로젝트, home, `true` 순 | 이 업데이트 전용 폴백은 `resolveAutoUpdateCli`에 구현되어 있으며 일반적인 글로벌 계층이 아닙니다. |

로컬 override에는 변경한 leaf만 넣으세요. 예를 들어 로컬 모델 선택을 공유 파일에서 분리할 수 있습니다.

```yaml
# .agents/oma-config.local.yaml
model_preset: claude
agents:
  backend:
    model: anthropic/claude-sonnet-4-6
```

가장 가까운 `.agents/` 디렉토리를 선택하려면 프로젝트에서 명령을 실행하세요. 잘못된 local 파일은 오류를 표시하고 중단하므로, 다시 시도하기 전에 수정하거나 제거해야 합니다.

## 기본값

| 키 | 기본값 | 적용 시점 |
|-----|---------|--------------|
| `auto_update_cli` | `true` | 두 파일 모두 없거나 키가 누락된 경우 |
| `serena.mode` | `stdio` | 두 파일 모두 없거나 키가 누락된 경우 |
| `serena.auto_update` | `true` | 두 파일 모두 없거나 키가 누락된 경우 |
| `telemetry` | `false` | 두 파일 모두 없거나 키가 누락된 경우 |
| `language` | `en` | 두 파일 모두 없거나 키가 누락된 경우 |
| `model_preset` | 필수 | 배포된 프로젝트 템플릿은 `auto`를 사용하며 schema는 비어 있지 않은 값을 요구합니다. |
| `translation_voice` | `balanced` | 두 파일 모두 없거나 키가 누락된 경우 |
| `timezone` | 시스템 timezone | 두 파일 모두 없거나 키가 누락된 경우 |

## 읽기 순서의 근거

가장 가까운 계층 규칙은 프로젝트 설정을 자체적으로 유지합니다. 사용자 전체 기준값이 필요하면 글로벌로 설치하고 `~/.agents/oma-config.yaml`을 편집하세요. 프로젝트 설치는 여전히 자체적인 가장 가까운 계층을 정의할 수 있습니다.

## 참고 사항

- `oma-config.yaml`의 `language`는 에이전트 응답 언어를 제어합니다. 설치 및 업데이트 경고 메시지를 결정하는 데는 사용되지 **않습니다**. 설치 시점에는 `oma-config.yaml`이 아직 로드되지 않으므로, 해당 메시지는 시스템 로케일(`$LANG`)을 기준으로 합니다.
- `auto_update_cli` 우선순위는 update 명령에 명시적으로 구현되어 있습니다. 프로젝트 설치와 글로벌 설치가 모두 있을 때 프로젝트 값을 먼저 확인하고, 그다음 home 값을 확인합니다.
- `telemetry`(기본값 `false`)는 각 벤더 자체의 opt-out으로 연결되며, `oma install` / `oma update` / `oma link`가 값을 씁니다. Claude는 `DISABLE_TELEMETRY`와 `CLAUDE_CODE_DISABLE_FEEDBACK_SURVEY`, Gemini와 Qwen은 `privacy.usageStatisticsEnabled`, Codex는 `analytics.enabled`와 `feedback.enabled`, Grok은 `[features] telemetry`, Antigravity(agy)는 `~/.gemini/antigravity-cli/settings.json`의 `enableTelemetry`를 씁니다. `telemetry: true`로 두면 해당 벤더에 대한 oma의 opt-out을 제거해 다시 수집에 동의합니다.
- `diagram`(engine `auto` / `archify` / `mermaid`, `explain_sidecar`, `archify.managed|channel|check_interval_min|path|quality|open`)은 `video` / `image`와 같은 sparse skill-override 섹션입니다. [Diagram Engine](/docs/guide/diagram-engine)을 참고하세요.
- `video.hyperframes.check_interval_min`은 per-run HyperFrames toolchain 및 heygen-com/hyperframes에 대한 최신 버전 확인(`oma video compose`, `oma update`)을 제한합니다.
- `market`(`managed|channel|check_interval_min|path|python|save_dir`)은 `oma market`의 기반인 항상 최신 `last30days` engine을 설정합니다. [Market Research](/docs/guide/market-research)를 참고하세요.
- typed runtime schema는 `providers`, `free`, `agents`, `models`, `custom_presets`, `vendors`, `session`, `docs` 및 sparse skill 섹션을 다룹니다. 배포 템플릿에는 `scm`, `memory`, `serena_reaper`, `mcp`와 같은 consumer-owned block도 있습니다. 이 목록에서 키를 추론하지 말고 [설정 레퍼런스](/docs/guide/configuration-reference)와 해당 block의 feature guide를 사용하세요.
- `oma-config.yaml`을 직접 편집하는 것은 안전합니다. `oma install`과 `oma update`는 정규식 수준의 필드 치환을 사용하며, 자신이 관리하지 않는 사용자 편집 키(예: 커스텀 `agents:` override, `session.quota_cap`)는 그대로 보존합니다.
- `oma update`는 배포 템플릿에는 있지만 사용자 파일에는 없는 최상위 키를 `# Added by oma update` marker 아래에 템플릿 기본값으로 덧붙입니다. 이미 있는 키는 절대 건드리지 않으므로 기존 내용은 바이트 단위로 그대로 유지됩니다. 일부러 지운 키는 템플릿 기본값으로 다시 나타나므로, 제외하려면 키를 지우는 대신 값을 명시적으로 지정하세요.
