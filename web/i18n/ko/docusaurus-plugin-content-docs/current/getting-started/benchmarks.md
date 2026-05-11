---
title: 벤치마크
description: 동일한 프롬프트로 5개의 Claude Code harness가 같은 어린이용 3D 학습 플랫폼 MVP를 구축했습니다. oh-my-agent는 functional, spec, visual, engineering, efficiency 5개 축에서 80.6/100점으로 1위를 기록했습니다.
---

# 벤치마크

5개의 Claude Code harness가 동일한 raw 프롬프트로 같은 어린이용 3D 창의 학습 플랫폼 MVP를 구축했습니다. **oh-my-agent는 80.6/100점으로 1위에 올랐습니다.** 평가 기준은 5축 rubric(functional, spec, visual, engineering, efficiency)입니다.

> 실행 조건: `claude-opus-4-6`, effort `max`, `--max-budget-usd 20`, `--no-session-persistence`, `--setting-sources project,local`. 사용자의 로그인된 `claude` CLI를 통한 OAuth 사용(`ANTHROPIC_API_KEY` 미사용).

---

## 비교 대상 harness

| Harness | 동작 방식 |
|---|---|
| `vanilla` | 순정 Claude Code, 플러그인/스킬 없음 (baseline) |
| `oma` | `oh-my-agent` 소스 시드 적용 (`.agents/` + `.claude/`) |
| `omc` | `--plugin-dir`을 통한 `oh-my-claudecode` |
| `ecc` | `~/.claude/`에 설치된 `everything-claude-code` |
| `superpowers` | `--plugin-dir`을 통한 `superpowers` |

---

## 최종 스코어보드

| 순위 | Harness | **총점** | Func/35 | Spec/15 | Visual/20 | Eng/20 | Eff/10 |
|---|---|---|---|---|---|---|---|
| 1 | **oma** | **80.6** | 32 | 13.3 | 15.3 | 15 | 5 |
| 2 | omc | 74.1 | 33.5 | 6.7 | 14.4 | 14.5 | 5 |
| 3 | superpowers | 72.9 | 30 | 9.3 | 11.6 | 14 | 8 |
| 4 | vanilla | 70.7 | 28.5 | 11.7 | 12 | 12.5 | 6 |
| 5 | ecc | 70.2 | 28.5 | 9.7 | 13 | 15 | 4 |

### 실행 비용 분석

| Harness | Turns | Duration | Cost | Files (src) |
|---|---|---|---|---|
| vanilla | 42 | 8m 56s | $2.37 | 16 |
| oma | 31 | 15m 56s | $4.04 | 21 |
| omc | 61 | 9m 02s | $1.92 | 14 |
| ecc | 79 | 10m 20s | $3.84 | 22 |
| superpowers | 39 | 8m 13s | $1.28 | 18 |

---

## 랜딩 페이지 비교

| vanilla | oma | omc | ecc | superpowers |
|---|---|---|---|---|
| ![vanilla](https://raw.githubusercontent.com/first-fluke/oh-my-agent/main/benchmarks/screenshots/vanilla/01-landing.png) | ![oma](https://raw.githubusercontent.com/first-fluke/oh-my-agent/main/benchmarks/screenshots/oma/01-landing.png) | ![omc](https://raw.githubusercontent.com/first-fluke/oh-my-agent/main/benchmarks/screenshots/omc/01-landing.png) | ![ecc](https://raw.githubusercontent.com/first-fluke/oh-my-agent/main/benchmarks/screenshots/ecc/01-landing.png) | ![superpowers](https://raw.githubusercontent.com/first-fluke/oh-my-agent/main/benchmarks/screenshots/superpowers/01-landing.png) |

화면별 전체 비교(world builder, AI 패널, 갤러리, save→reload 상태)는 [GitHub 벤치마크 리포트](https://github.com/first-fluke/oh-my-agent/tree/main/benchmarks)에 정리되어 있습니다.

---

## 각 축의 산정 방식

| 축 | 가중치 | 핵심 시그널 | 도구 |
|---|---|---|---|
| **Functional** | 35 | build exit, dev-server 부팅 (HTTP 200 ≤45s), 5개 user-journey 체크, lint, ts-clean | `pm install/build/lint`, curl, chrome-devtools MCP, `tsc --noEmit` |
| **Spec** | 15 | 13개 명시적 프롬프트 deliverable, real-API 보너스 | brace-balanced JSON 추출기를 사용하는 LLM judge |
| **Visual** | 20 | 안티 패턴, 어린이 친화적 UX, 디자인 시스템 일관성, 접근성 | 스크린샷 기반 LLM judge |
| **Engineering** | 20 | 코드 범위, TS strict, 최대 파일 크기 + 폴더 깊이, deferred-stub 마커, 하드코딩된 키 없음 | 정적 분석 (jq + grep + find) |
| **Efficiency** | 10 | 완료까지 turns, wall-clock duration, 파일당 비용 | `claude -p` 결과 JSON |

Spec과 visual judge는 `judge-multi.sh`를 통해 harness당 3회 실행되며, 항목별 점수는 라운드 전체에 걸쳐 평균을 냅니다. 구현체는 [`benchmarks/scoring/multiaxis/`](https://github.com/first-fluke/oh-my-agent/tree/main/benchmarks/scoring/multiaxis)에 있습니다.

---

## 유의 사항

1. **superpowers 프롬프트 오버라이드**: 비대화형 모드에서 harness가 동작하기 위해 필요한 조치였습니다(해당 harness의 `<HARD-GATE>` brainstorming 스킬이 단발성 실행을 차단합니다). 결과는 "게이트를 우회한 후 superpowers가 발휘할 수 있는 성능"을 반영하며, 순수한 동일 조건 비교는 아닙니다.
2. **spec과 visual은 다중 judge 평균, journey는 단일 실행**: journey 평가는 라이브 dev server가 필요하므로 단일 실행을 유지합니다. journey 점수 차이가 약 2점 미만일 경우 노이즈로 간주하시기 바랍니다. 표본 크기는 harness당 빌드 1회입니다.
3. **비용 정규화**: efficiency 축은 파일당 비용을 사용하며, 절대 비용(5개 harness에서 $1.28~$8.19 범위)은 점수에 반영되지 않습니다.
4. **oma의 `lint-clean` 감점은 의도된 결과**: oma는 ESLint 전용 규칙을 에이전트 스킬에 내장하는 대신, lint/typecheck 강제는 git hook(husky + lint-staged)과 CI에 위임하도록 의도적으로 설계되어 있습니다. 단발성 벤치마크에서는 이 부분이 `lint-clean`에서 -5점으로 감점되지만, 실제 워크플로우에서는 동일한 이슈가 pre-push 단계에서 차단되어 원격 저장소에 도달하지 않습니다.

---

## 재현 방법

```bash
# Run all 5 harnesses (sequential, ~45 min, ~$15-20 in API spend)
./benchmarks/run.sh

# Multiaxis scoring per harness (5-axis, 100pt) — single judge round
for h in vanilla oma omc ecc superpowers; do
  ./benchmarks/scoring/multiaxis/score.sh \
    /tmp/oma-benchmark-<timestamp>/projects/$h \
    $h \
    /tmp/oma-benchmark-<timestamp>/results/$h.json \
    /tmp/oma-benchmark-<timestamp>/multiaxis/$h
done

# Generate the report
./benchmarks/scoring/multiaxis/build-report.sh \
  /tmp/oma-benchmark-<timestamp> \
  $(pwd)
```

harness별 전체 서술, raw 점수, 스크린샷은 [`benchmarks/README.md`](https://github.com/first-fluke/oh-my-agent/blob/main/benchmarks/README.md)에서 관리됩니다. 이 파일은 각 실행의 `multiaxis/*.json`으로부터 `build-report.sh`가 생성하므로, 항상 최신 scoring artifact와 동기화 상태를 유지합니다.
