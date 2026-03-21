---
title: Commands
description: cli/cli.ts 기준 전체 커맨드 인터페이스.
---

# Commands

아래 명령 목록은 `cli/cli.ts` 구현을 기준으로 정리되었습니다.

## 기본 명령

```bash
oma                         # 대화형 설치
oma dashboard               # 터미널 대시보드
oma dashboard:web           # 웹 대시보드 (:9847)
oma usage:anti              # Antigravity 모델 사용량 조회
oma update                  # 레지스트리 최신 스킬 업데이트
oma doctor                  # 환경/스킬 진단
oma stats                   # 생산성 지표
oma retro                   # 회고 리포트
oma cleanup                 # orphan 리소스 정리
oma bridge [url]            # MCP stdio -> streamable HTTP
```

## 에이전트 명령

```bash
oma agent:spawn <agent-id> <prompt> <session-id>
oma agent:status <session-id> [agent-ids...]
```

## 메모리/검증 명령

```bash
oma memory:init
oma verify <agent-type>
```
