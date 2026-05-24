---
title: "가이드: oma-config.yaml 시맨틱"
description: 프로젝트 설치와 글로벌 설치가 모두 존재할 때 oma-config.yaml의 키별 우선순위 규칙을 다룹니다. auto_update_cli(프로젝트 우선), serena.mode, telemetry, language, model_preset, translation_voice, timezone, 그리고 agy / claude / codex / gemini / qwen이 각각 어떤 dotfile을 읽는지를 설명합니다.
---

## 개요

`oma-config.yaml`은 두 위치에 존재할 수 있습니다.

- **프로젝트**: `<cwd>/.agents/oma-config.yaml`
- **글로벌**: `~/.agents/oma-config.yaml`

두 파일이 모두 존재하면 모든 키에 대해 프로젝트 파일이 우선합니다. 이는 의도된 동작입니다. 프로젝트별 커스터마이징은 더 구체적인 신호이므로, 사용자 전체에 적용되는 기본값으로 덮어써져서는 안 되기 때문입니다.

## 우선순위 표

| 키 | 프로젝트 우선? | 비고 |
|-----|:---:|-------|
| `auto_update_cli` | 예 | 프로젝트 값이 글로벌 값을 오버라이드합니다. `resolveAutoUpdateCli`(`cli/commands/update/update.ts`)에 구현되어 있습니다. |
| `serena.mode` | 예 | Serena MCP 전송 모드를 제어합니다(예: `stdio`, `sse`). |
| `telemetry` | 예 | 벤더 텔레메트리 opt-in (`true` / `false`). |
| `language` | 예 | 에이전트 출력의 응답 언어(예: `en`, `ko`, `ja`). |
| `model_preset` | 예 | 모델 선택 프리셋(예: `claude`, `mixed`, `codex`). |
| `translation_voice` | 예 | 번역기 톤: `formal`, `balanced`, `interpreter`. |
| `timezone` | 예 | 타임존 식별자(예: `Asia/Seoul`, `America/New_York`). |

"프로젝트 우선"은 다음을 의미합니다. 해당 키가 프로젝트 파일에 존재하면, 글로벌 파일이 어떤 값을 가지고 있든 프로젝트 값이 사용됩니다. 키가 프로젝트 파일에 없으면 글로벌 파일의 값이 사용됩니다. 두 파일 모두에 없으면 기본값이 적용됩니다.

## 기본값

| 키 | 기본값 | 적용 시점 |
|-----|---------|--------------|
| `auto_update_cli` | `true` | 두 파일 모두 없거나 키가 누락된 경우 |
| `serena.mode` | `stdio` | 두 파일 모두 없거나 키가 누락된 경우 |
| `telemetry` | `false` | 두 파일 모두 없거나 키가 누락된 경우 |
| `language` | `en` | 두 파일 모두 없거나 키가 누락된 경우 |
| `model_preset` | `claude` | 두 파일 모두 없거나 키가 누락된 경우 |
| `translation_voice` | `balanced` | 두 파일 모두 없거나 키가 누락된 경우 |
| `timezone` | 시스템 타임존 | 두 파일 모두 없거나 키가 누락된 경우 |

## 읽기 순서의 근거

프로젝트 설정을 먼저 읽는 이유는 더 구체적인 컨텍스트(개발자가 실제로 작업 중인 저장소)를 표현하기 때문입니다. 팀이 프로젝트에 대해 `language: ko`나 `model_preset: mixed`를 강제하는 경우, 그 선택이 개인의 글로벌 `oma-config.yaml`에 의해 조용히 덮어써져서는 안 됩니다.

글로벌 파일은 사용자 전체에 적용되는 기준값을 제공합니다. 프로젝트가 설정하지 않은 키는 글로벌 값으로 폴백되고, 글로벌 값도 없으면 다시 하드코딩된 기본값으로 폴백됩니다.

## 참고 사항

- `oma-config.yaml`의 `language`는 에이전트 응답 언어를 제어합니다. 설치 및 업데이트 경고 메시지를 결정하는 데는 사용되지 **않습니다**. 설치 시점에는 `oma-config.yaml`이 아직 로드되지 않으므로, 그 메시지는 시스템 로케일(`$LANG`)을 기준으로 합니다.
- `auto_update_cli` 우선순위는 update 명령에 명시적으로 구현되어 있습니다. 프로젝트 설치와 글로벌 설치가 모두 존재할 때, 프로젝트의 `oma-config.yaml`이 먼저 참조됩니다.
- `oma-config.yaml`을 직접 편집하는 것은 안전합니다. `oma install`과 `oma update`는 정규식 수준의 필드 치환을 사용하며, 자신이 관리하지 않는 사용자 편집 키(예: 커스텀 `agents:` 오버라이드, `session.quota_cap`)는 그대로 보존합니다.
