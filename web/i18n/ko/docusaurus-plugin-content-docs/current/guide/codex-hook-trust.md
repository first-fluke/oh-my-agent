---
title: "가이드: Codex 훅 신뢰"
sidebar_label: Codex 훅 신뢰 설정
description: Codex가 훅을 신뢰 절차 뒤에 두는 방식, oh-my-agent가 자기 훅을 실행시키려고 기록하는 내용, 직접 훅을 검토해야 하는 경우를 설명합니다.
---

# 가이드: Codex 훅 신뢰

oh-my-agent를 프로젝트에 설치하면 벤더 네이티브 훅 설정을 작성하며, Codex CLI용 `.codex/hooks.json`도 여기에 포함됩니다. Codex는 훅이 설정돼 있다는 것만으로 실행하지 않습니다. 두 가지 승인이 모두 있어야 하고, 둘 다 사용자 설정(`$CODEX_HOME/config.toml`, 기본값 `~/.codex/config.toml`)에 저장됩니다. 프로젝트가 자기 훅을 스스로 승인할 수는 없습니다.

1. **프로젝트 신뢰.** 프로젝트의 `.codex/` 폴더(`config.toml`, `hooks.json`)는 신뢰된 프로젝트에서만 로드됩니다: `[projects."<path>"] trust_level = "trusted"`.
2. **훅별 신뢰.** 프로젝트 범위든 사용자 범위든, 관리 대상이 아닌 모든 훅에는 `[hooks.state."<hooks.json 경로>:<event>:<group>:<handler>"]` 항목이 있어야 하고, 그 `trusted_hash`가 훅의 현재 선언(명령, timeout, matcher, async 여부, status message)과 일치해야 합니다.

새로 생기거나 바뀐 훅이 있으면 Codex TUI는 "Hooks need review"를 띄우고, `codex exec`는 그 훅을 조용히 빼고 실행합니다.

---

## oh-my-agent가 대신 기록하는 것

`oma install`, `oma update`, `oma link`는 **oh-my-agent 자신의 훅**에 대해 두 승인을 모두 기록합니다. 대상은 이름이 `oma-hook-*`이거나 `oma-hook.sh` 래퍼로 실행되는 훅입니다. 해시는 Codex에서 "Trust all and continue"를 골랐을 때 Codex가 계산하는 값과 같습니다. 그래서 첫 Codex 세션부터 `/hooks` 단계 없이 훅이 실행됩니다. 이후 oh-my-agent 릴리스가 훅 명령을 바꿔도 `oma update`가 새 해시를 기록하므로 훅은 계속 켜져 있습니다.

oh-my-agent는 `config.toml`에서 해당 테이블만 고칩니다. 고친 결과를 다시 읽어서 다른 내용이 하나라도 달라지면 파일을 건드리지 않습니다. 다음은 절대 하지 않습니다.

- 같은 `hooks.json`에 사용자가 직접 추가한 훅 승인
- `trust_level = "untrusted"`로 표시한 프로젝트 신뢰
- 사용자가 끈 훅(`enabled = false`) 다시 켜기
- Codex가 홈 디렉터리를 만들기 전의 Codex 설정 변경

전역 설치(`~/.codex/hooks.json`)에는 신뢰할 프로젝트가 없으므로 훅별 항목만 기록합니다.

---

## 직접 훅을 검토해야 하는 경우

oh-my-agent가 신뢰를 기록하지 못하면 안내 메시지와 함께 이유를 출력합니다.

```text
⚠ Codex hooks installed/updated but not trusted (<reason>) — run codex and use /hooks to trust them (untrusted hooks do not run).
```

주로 `config.toml`을 파싱할 수 없거나, 프로젝트를 untrusted로 표시했거나, Codex를 아직 한 번도 실행하지 않은 경우입니다. 이때는 Codex에서 프로젝트를 열고 `/hooks`를 실행해 훅을 한 번 활성화하세요. 그다음 `oma link codex`를 실행하면 이후 업데이트에서도 신뢰가 유지됩니다.

---

## oh-my-agent가 실행하는 Codex 프로세스

oh-my-agent가 Codex 서브프로세스를 직접 실행할 때(예: `oma agent spawn`)는 `--dangerously-bypass-hook-trust`도 함께 넘깁니다. 이 플래그는 활성화된 훅을 해시 검사 없이 실행하게 하지만, 프로젝트 신뢰는 풀어 주지 않습니다. oh-my-agent가 시작한 프로세스에만 적용되며 설정 파일에는 기록되지 않습니다.

---

## `[features] hooks` 플래그는 필요 없음

예전 oh-my-agent 릴리스는 Codex 설정에 `[features] codex_hooks = true`를 썼습니다. Codex 0.124에서 이 플래그 이름이 `hooks`로 바뀌었고, 훅은 기본으로 켜진 안정 기능이 되어 플래그가 필요 없습니다. oh-my-agent는 두 키 모두 쓰지 않고, `[features]` 테이블에서 지원 중단된 `codex_hooks`와 `child_agents_md` 플래그를 발견하면 제거합니다.

---

## 요약

| 상황 | 할 일 |
|:----------|:------------|
| 프로젝트에 처음 설치 | 없음. 설치 프로그램이 신뢰를 기록합니다 |
| 훅 명령이 바뀌는 `oma update` | 없음. 새 해시가 기록됩니다 |
| 설치 프로그램이 "not trusted (…)"를 출력 | 이유를 해결하거나, Codex에서 `/hooks`를 한 번 실행 |
| `.codex/hooks.json`에 직접 추가한 훅 | `/hooks`에서 직접 검토 |

## 함께 보기

- [기존 프로젝트 통합](./integration.md): 설치 프로그램이 벤더별로 작성하는 파일
- [전역 설치](./global-install.md): `~/.codex/`에 쓰는 사용자 전체 설치
