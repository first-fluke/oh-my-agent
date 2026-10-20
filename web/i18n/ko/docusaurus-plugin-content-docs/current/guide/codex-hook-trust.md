---
title: "가이드: Codex 훅 신뢰"
sidebar_label: Codex 훅 신뢰 설정
description: Codex 훅을 한 번 검토하기 전까지 실행하지 않는 이유, 업데이트 동작, oh-my-agent가 생성한 Codex 서브프로세스에 자동으로 적용하는 처리를 설명합니다.
---

# 가이드: Codex 훅 신뢰

oh-my-agent를 프로젝트에 설치하면 벤더 네이티브 훅 설정을 작성하는데, Codex CLI용 `.codex/hooks.json`도 여기에 포함됩니다. Claude Code와 달리 Codex는 이 훅을 자동으로 실행하지 않습니다. 관리 대상이 아닌 모든 명령 훅을 TOFU(Trust-On-First-Use) 뒤에 두기 때문에, 한 번 검토하고 활성화해야만 훅이 동작합니다.

이는 oh-my-agent의 한계가 아니라 Codex 쪽 안전장치입니다.

---

## 한 번만 하면 되는 단계: Codex에서 훅 검토

`oma`(설치), `oma link`, `oma update`가 Codex가 본 적 없는 프로젝트에 `.codex/hooks.json`(전역 설치라면 `~/.codex/hooks.json`)을 쓰고 나면, 훅은 아직 실행되지 **않습니다**. Codex를 열고 한 번 검토해야 합니다.

1. Codex CLI에서 프로젝트를 엽니다.
2. `/hooks`를 실행해 훅 브라우저(TUI)를 엽니다.
3. 나열된 훅을 검토하고 활성화합니다.

이 과정을 거치기 전까지 훅은 신뢰되지 않은 상태로 남아 조용히 건너뛰어집니다. 그래서 oh-my-agent는 `.codex/hooks.json`을 만들거나 바꿀 때마다 다음과 같이 안내합니다.

```text
⚠ Codex hooks installed/updated — run codex and use /hooks to trust them (untrusted hooks do not run).
```

Codex를 열기 전에 생성된 파일을 확인합니다.

```bash
test -s .codex/hooks.json && echo "Codex hooks are installed"
oma link codex
```

예상 결과는 설치·업데이트 안내가 출력된 뒤 Codex의 `/hooks` 브라우저에 훅이 나타나는 것입니다. `oma link codex`는 생성된 파일을 다시 맞추지만, 최초 신뢰 결정 자체를 대신하지는 않습니다.

**참고:** 여기서 `--dangerously-bypass-hook-trust`는 도움이 되지 않습니다. 이 플래그의 경고("Enabled hooks may run without review")가 뜻하는 바는 이미 활성화된 훅에 한해 검토를 건너뛴다는 것이며, 한 번도 검토하지 않은 훅은 실행하지 않습니다. 훅을 처음 활성화하는 방법은 `/hooks` 브라우저뿐입니다.

내부적으로 Codex는 사용자의 결정을 `~/.codex/config.toml`의 `[hooks.state]` 항목에 저장합니다. 키는 훅 파일 경로, 이벤트, 블록, 훅으로 구성되며, `enabled` 플래그와 명령 문자열의 `trusted_hash`가 함께 기록됩니다.

---

## 업데이트할 때 벌어지는 일

한 번 훅을 신뢰하고 나면 업데이트할 때마다 이 단계를 반복할 필요가 없습니다.

- **`oma link`나 `oma update`를 다시 실행해도 신뢰가 유지됩니다.** 훅 명령 문자열이 그대로인 한 그렇습니다. Codex는 저장된 해시를 현재 명령과 비교하고, 일치하면 훅을 계속 신뢰합니다.
- **이후 oh-my-agent 버전이 훅 명령 문자열을 바꾸면** 해시가 더 이상 맞지 않아 해당 훅이 조용히 신뢰되지 않은 상태로 돌아갑니다. 설치 안내가 다시 뜨고, `/hooks`로 다시 신뢰해야 합니다.

즉 검토 단계는 처음 한 번, 그리고 훅 명령이 실제로 바뀐 릴리스 이후에만 필요합니다.

---

## oh-my-agent가 자동으로 처리하는 것

oh-my-agent가 직접 Codex 서브프로세스를 스폰할 때, 예를 들어 `oma agent spawn`으로 다른 벤더 에이전트를 디스패치할 때는 `--dangerously-bypass-hook-trust`를 자동으로 붙입니다. 덕분에 자체 검증한 훅이 업데이트 후에도 수동 재신뢰 없이 동작합니다.

이 플래그는 oh-my-agent가 스폰하는 Codex 프로세스에**만** 적용됩니다. `~/.codex/config.toml`이나 프로젝트 설정에는 절대 기록되지 않으므로, 사용자가 직접 시작한 Codex 세션에는 영향을 주지 않습니다.

---

## `[features] hooks` 플래그는 필요 없습니다

예전 oh-my-agent 릴리스는 Codex 설정에 `[features] codex_hooks = true`를 기록했습니다. Codex 0.124에서 이 플래그의 이름이 `hooks`로 바뀌었고 훅이 기본으로 켜지는 안정 기능이 되었으므로 이제 플래그가 필요 없습니다. oh-my-agent는 두 키 모두 기록하지 않으며, `[features]` 테이블에서 사용 중단된 `codex_hooks`와 `child_agents_md` 플래그를 발견하면 제거합니다.

---

## 요약

| 상황 | 해야 할 일 |
|:----------|:------------|
| 최초 설치 또는 프로젝트의 첫 `.codex/hooks.json` | Codex를 열고 `/hooks`를 실행해 훅을 한 번 활성화 |
| 훅 명령이 그대로인 `oma update` | 없음. 신뢰가 유지됩니다 |
| 훅 명령이 바뀐 `oma update` | `/hooks`를 다시 실행해 재신뢰 (설치 프로그램이 안내를 출력합니다) |
| oh-my-agent가 스폰한 Codex 서브프로세스 | 없음. 우회가 자동으로 적용됩니다 |

## 함께 보기

- [기존 프로젝트 통합](./integration.md): 설치 프로그램이 벤더별로 기록하는 파일
- [전역 설치](./global-install.md): `~/.codex/`에 기록하는 사용자 전역 설치
