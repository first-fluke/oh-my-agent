# 디자인 스킬과 구현 공급자 검토

검토일: 2026-10-27. 공개 저장소의 고정 커밋과 실제 스킬·실행 코드를 기준으로 분류했다. 별점 순위나 공급자의 품질 주장을 선택 근거로 사용하지 않았다.

## 연결한 두 스킬

`oma-design`은 현재 작업에 필요한 공급자 하나를 선택한다. runtime catalog에서 정확한 이름과 출처를 확인하고, 없으면 Skills CLI의 `use`로 지침과 전체 지원 디렉터리를 불러온다. 영구 설치기나 별도 에이전트 실행을 전제하지 않는다.

| 공급자 | 선택할 작업 | OMA가 유지할 경계 |
|---|---|---|
| [Taste](https://github.com/Leonxlnx/taste-skill) | 새로운 웹 시각 방향, 전체 페이지 구성, 승인된 시각 개편 | 작업별 review/component/app-screen 분기, 기존 브랜드·스택·언어, 빌드 승인, 실제 검증 근거 |
| [Impeccable](https://github.com/pbakaus/impeccable) | 기존 UI의 critique/audit/polish, 시스템 extract/document | 작업별 참조만 로딩, 감사의 수정 금지, 프로젝트 DESIGN.md, 엔진·hook·외부 호출의 별도 실행 조건 |

일반적인 색상·타이포그래피·간격·모션 방법론은 선택한 외부 스킬에 맡긴다. OMA에는 프로젝트의 브랜드·콘텐츠·CJK·접근성 조건, `DESIGN.md`, semantic token 계약, 구현 이관과 검증 증거를 남긴다. 기존 디자인 결정을 문서에 옮기는 일에는 외부 스킬이 필요하지 않다.

## 조건부 확장과 흡수, 남은 후보

| 후보 | 소스에서 확인한 역할 | 판단과 향후 연결 위치 | 직접 근거 |
|---|---|---|---|
| OpenDesign | Electron/웹 앱, daemon, CLI/MCP, 자체 에이전트 실행기를 가진 디자인 workspace | 별도 환경으로 취급. 이미 사용하는 OpenDesign의 자료를 가져올 때 선택적 MCP 연동 후보 | [MCP 구현](https://github.com/nexu-io/open-design/blob/325494e5a1e5858f7aa63bd71d7f326bdf911e7f/apps/daemon/src/mcp.ts), [설치 동작](https://github.com/nexu-io/open-design/blob/325494e5a1e5858f7aa63bd71d7f326bdf911e7f/scripts/postinstall.mjs) |
| Hallmark | 단일 디자인 스킬, theme/scaffold, 소스·렌더 검사 도구 | 디자인 공급자 대안. 현재 두 공급자와의 역할 중복을 비교한 뒤 선택 경로로 검토 | [스킬](https://github.com/Nutlope/hallmark/blob/7ec868225c6caa040558c321ee0fefa0e73f83a8/skills/hallmark/SKILL.md), [theme 구현](https://github.com/Nutlope/hallmark/blob/7ec868225c6caa040558c321ee0fefa0e73f83a8/skills/hallmark/scripts/theme.mjs) |
| CanvasUI | WebGL/WebGPU 효과 엔진과 프레임워크별 wrapper를 제공하는 source-copy registry | **조건부 확장 연결:** GPU 효과가 선택됐을 때 `oma-frontend`가 component/framework/renderer를 고름 | [registry](https://github.com/DavidHDev/canvas-ui/blob/a04a99b235299ee79a123a16ccb2e6cf9da74b6b/src/lib/registry.ts), [Liquid 엔진](https://github.com/DavidHDev/canvas-ui/blob/a04a99b235299ee79a123a16ccb2e6cf9da74b6b/src/lib/Liquid/LiquidVanilla.ts) |
| Magic UI | React/Tailwind 기반 컴포넌트 registry와 선택 설치 스킬 | 필요한 컴포넌트가 있을 때 `oma-frontend`의 구현 후보 | [스킬](https://github.com/magicuidesign/magicui/blob/efe76fc5755eca1142dd4f74c1d6f0ace2887e3c/skills/magic-ui/SKILL.md), [실제 registry](https://github.com/magicuidesign/magicui/blob/efe76fc5755eca1142dd4f74c1d6f0ace2887e3c/apps/www/registry/registry-ui.ts) |
| Scroll World | 사전 생성 MP4의 재생 위치를 스크롤에 맞추는 JS 엔진과 영상 제작 recipe | **조건부 확장 연결:** 시네마틱 페이지 요청을 frontend와 image/video 작업으로 분리 | [엔진](https://github.com/oso95/scroll-world/blob/71cc36d3bb150248ae36a2c552f9cbf88802a79c/skills/scroll-world/references/scrub-engine.js), [제작 파이프라인](https://github.com/oso95/scroll-world/blob/71cc36d3bb150248ae36a2c552f9cbf88802a79c/skills/scroll-world/references/pipeline.md) |
| GSAP skills | GSAP API·timeline·ScrollTrigger·React lifecycle 등 8개 전문 스킬과 예제 | **조건부 확장 연결:** GSAP를 선택했을 때 해당 API/framework 지침만 로딩 | [React 지침](https://github.com/greensock/gsap-skills/blob/aed9cfd3277740755f6bfc1155c7aa645403b760/skills/gsap-react/SKILL.md), [실제 예제](https://github.com/greensock/gsap-skills/blob/aed9cfd3277740755f6bfc1155c7aa645403b760/examples/react/App.jsx) |
| Emil Kowalski skills | 모션 구현·리뷰·성능·UI 마감 등 작업별 문서 스킬 15개 | **선별 흡수:** 독립 작성한 모션·상호작용 원칙을 OMA 공유 규약에 반영 | [animate](https://github.com/emilkowalski/skills/blob/2d228630ba1446365f614a108cb8252f1feda202/skills/animate/SKILL.md), [작업별 검토](https://github.com/emilkowalski/skills/blob/2d228630ba1446365f614a108cb8252f1feda202/skills/review-animations/SKILL.md) |

세 구현 경로는 [조건부 구현 확장](../skills/oma-frontend/resources/specialized-visual-implementation.md)에 연결했다. Emil에서 선별한 원칙은 [공유 상호작용 품질](../skills/_shared/ui-interaction-quality.md)에 모아 design과 frontend가 조건부로 참조한다. Hallmark·Magic UI·OpenDesign은 현재 검토 후보로 유지한다.

## 구현 코드를 보고 남긴 조건

- **OpenDesign:** 프로젝트 파일과 DESIGN.md를 읽는 MCP 경로는 구현돼 있다. `start_run`은 자체 에이전트를 실행하며, 기본 설치는 workspace 빌드와 native 재빌드를 포함한다. catalog에는 별도 upstream 설치를 안내하는 stub도 많다. Taste/Impeccable은 upstream을 직접 선택한다.
- **Hallmark:** 기존 UI에는 사용자가 Hallmark를 명시한 경우만 적용하는 자체 경계가 있다. Together 이미지 생성, 설치기, Claude hook은 선택적 실행 경로다. 이미지를 사용하면 코드 MIT와 별개인 해당 이미지 출처·라이선스가 필요하다.
- **CanvasUI:** 실제 35개 효과의 6개 사용 방식과 2개 렌더러가 registry 420개 변형을 만든다. 선택한 브라우저/GPU의 지원과 콘텐츠 fallback을 검증해야 한다. [라이선스](https://github.com/DavidHDev/canvas-ui/blob/a04a99b235299ee79a123a16ccb2e6cf9da74b6b/LICENSE.md)는 MIT + Commons Clause로 표시돼 있으므로, OMA에 컴포넌트 묶음을 복제해 재배포하는 설계를 전제하지 않는다.
- **Magic UI:** 컴포넌트마다 motion/next-themes/cobe 등의 요구가 다르다. canonical registry와 root registry가 일치하지 않는 항목도 있다. 공식 MCP는 별도 패키지로 문서화돼 있으나 해당 패키지 구현·권한·연결은 이번 검토 범위 밖이다.
- **Scroll World:** 현재 엔진에는 unmount 정리와 Blob URL 해제 경로가 보이지 않는다. 기존 SPA에 그대로 장착하는 대신 lifecycle 보정이 필요하다. 영상 생성 서비스의 인증·비용은 별도 실행 조건이다.
- **GSAP:** 기존 Motion/CSS 선택을 대체하는 기본값으로 올리지 않는다. 제공 Nuxt 예제에는 타입 중복 선언이 있어 예제 전체의 실행 성공을 보장하지 않는다.
- **Emil:** 실행 CLI나 애니메이션 라이브러리 대신 지침과 recipe를 제공한다. `animate-expo`는 React Native/Expo, `write-swift`는 Swift에 한정한다. 기존 frontend/mobile 스택 전체를 추천 목록으로 교체하지 않는다.

## 검토 범위와 증거의 한계

| 저장소 | 확보한 전체 tree | 읽기·정적 스캔 범위 |
|---|---:|---|
| OpenDesign | 13,664개 파일 | 텍스트 13,076개 정적 스캔, 핵심 24개 파일 전체와 12개 일부 의미 검토 |
| Hallmark | 820개 파일 | 텍스트 460개 수집·해시 검증·정적 스캔, 핵심 실행 경로 의미 검토 |
| CanvasUI | 568개 파일 | 텍스트 504개 수집·해시 검증·정적 스캔, registry/wrapper/대표 엔진 의미 검토 |
| Magic UI | 956개 파일 | 선택한 27개 파일과 관련 registry 항목·공개 payload 검토 |
| Scroll World | 11개 파일 | 전체 원문과 구현·recipe 검토 |
| GSAP skills | 44개 파일 | 전체 원문, 8개 스킬과 예제 소스 검토 |
| Emil skills | 29개 파일 | 전체 원문, 15개 스킬과 지원 recipe·표준 검토 |

대형 저장소의 전체 텍스트 정적 스캔은 모든 줄의 의미·보안 검토를 뜻하지 않는다. 바이너리 자산은 tree에 기록했으며 렌더·GPU·기기 검증을 하지 않았다. 이 목록은 구조와 적용 범위의 판단이며, 공급자 간 결과 품질·토큰·비용을 비교한 실험 결과가 아니다. 외부 스킬 실행기·설치기·MCP·이미지/영상 생성 서비스는 실행하지 않았다.
