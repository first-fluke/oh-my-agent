---
title: 실제 태스크에 맞춘 관리 화면 설계
description: 프로젝트의 스택과 시각 계약을 유지하면서 관리 화면의 위계, 표 밀도, 상태, 디자인 인계를 정합니다.
---

# 실제 태스크에 맞춘 관리 화면 설계

애플리케이션 코드를 바꾸기 전에, 관리 화면이 사용자를 어떻게 지원해야 하는지 정하려면 `oma-design`을 사용합니다.

## 스킬 불러오기

코딩 에이전트에게 이 명령을 실행하고, 반환된 지침과 지원 디렉토리를 읽도록 요청합니다.

```bash
bunx skills use first-fluke/oh-my-agent@oma-design
```

## 입력 제공

- 실행 중인 화면, 스크린샷, 또는 관련 컴포넌트입니다.
- 화면을 쓰는 사람과 그들이 끝내야 하는 동작입니다.
- 기존 `DESIGN.md`, 토큰, 컴포넌트, 언어, 반응형·접근성 요구사항입니다.

## 태스크 전달

```text
Use oma-design to define the direction for our customer-support admin.
Support agents triage a ticket table, filter by status and assignee, and open
ticket details in a drawer. Keep our React stack, existing component primitives,
brand palette, and Korean/English content. Cover loading, empty, error, keyboard
focus, and narrow-screen states. Return layout decisions and a semantic-token
handoff. Update DESIGN.md if the visual system changes. Do not edit application
code or install packages.
```

## 결과 확인

화면별 위계와 밀도 결정, 상태 동작, 시맨틱 토큰 대응, 구현 인계를 기대합니다. 받아들인 시스템 변경은 프로젝트의 기준 `DESIGN.md`에 들어갑니다.

분류 태스크에 맞춰 제안을 확인합니다. 사용자가 다음 티켓을 찾고, 필터를 바꾸고, 상세를 열고, 오류에서 회복할 수 있습니까? 렌더된 표본이 있으면 키보드 포커스, 읽을 수 있는 한국어·영어 텍스트, 좁은 화면 동작을 살펴봅니다. 문서만 있는 인계는 브라우저와 접근성 실행이 검증되지 않은 상태로 남습니다.

## 의존성과 다음 단계

새 관리 화면이나 제품 인터페이스 방향에는 [라우팅 계약](https://github.com/first-fluke/oh-my-agent/blob/82649cbd70fe1a1997bf149241fbcfb629510c5e/.agents/skills/oma-design/resources/external-design-skills.md)이 Interface Design을 고릅니다. 기존 UI의 비평, 감사, 다듬기는 Impeccable을 고르고, 그 밖의 웹 아트 디렉션은 Taste를 사용합니다. 현재 작업에는 공급자 하나를 불러옵니다.

그 외부 지침에는 자체 다운로드나 런타임 도구가 필요할 수 있습니다. 기존 스택, 브랜드, CJK 범위, WCAG 목표, 모션 축소 요구사항은 제약으로 남습니다. 지침을 불러와도 UI가 렌더되거나 검증되지는 않습니다.

구현은 프로젝트의 프론트엔드 전문가를 사용합니다. 프로젝트 훅과 워크플로우가 필요하면 `oma-design`이 포함된 [런타임 설정](https://firstfluke.com/oh-my-agent/docs/getting-started/choose-setup/#install-a-skill-preset)을 고릅니다.
