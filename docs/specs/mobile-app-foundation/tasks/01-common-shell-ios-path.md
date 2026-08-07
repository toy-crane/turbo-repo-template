# 01 — 공통 모바일 셸과 iOS 기준 경로

## Outcome

기존 단일 개발 확인 화면을 공통 Expo Router 앱으로 교체하고, Home·Activity·Settings의 완결된 사용자 경로를 iOS Development Build에서 사용할 수 있다. 공통 코드에는 Android가 사용할 플랫폼별 아이콘과 universal Settings 트리도 함께 포함한다.

## Blockers

None.

## Acceptance criteria

- [x] 앱이 Expo Router entry로 시작하고 `/`에서 Home 탭을 표시한다.
- [x] Home, Activity와 Settings 세 탭을 탭과 drag로 전환할 수 있고 선택 highlight가 현재 탭을 따른다.
- [x] 세 탭은 iOS native Large Title을 표시하며 RN 또는 `@expo/ui` 본문에 같은 제목을 중복하지 않는다.
- [x] Home과 Activity는 React Native UI placeholder이고, Activity 스크롤에 따라 Glass 탭이 축소되고 위로 스크롤하면 복원된다.
- [x] Settings는 route 루트의 universal `Host` 하나가 전체 본문을 소유하며 `FieldGroup`, Notifications·Haptics 더미 switch와 앱 버전 확인용 row를 표시한다.
- [x] 더미 switch는 현재 실행 중에만 상태를 유지하고 운영체제 기능, 저장소 또는 분석 이벤트를 호출하지 않는다.
- [x] appearance가 `automatic`을 따르고 RN 콘텐츠, navigation container, native window, status bar, Glass 탭과 Settings가 Light/Dark 전환에 함께 반응한다.
- [x] navigation theme의 `background`와 `card`는 `background.canvas`, `text`는 `text.primary`를 사용하며 navigation font를 덮어쓰지 않는다.
- [x] Home, Activity와 Settings 아이콘 정의가 iOS SF Symbol과 Android Material Symbol 이름을 함께 포함한다.
- [x] 기존 Development Build 검증 유틸리티를 대체한 라우팅, 시맨틱 색상과 RN placeholder 접근성 테스트가 통과한다.
- [x] iOS Development Build에서 세 탭, Large Title, Activity 스크롤, Settings control, Light/Dark와 배경 연속성을 확인한다.

## Constraints

- 공유 route와 UI 모듈에 iOS 전용 import 또는 SF Symbol 문자열만 사용하는 임시 구현을 남기지 않는다.
- iOS 26 이상에서는 지원되는 native glass를 사용하고, 사용할 수 없는 iOS에서는 패키지 fallback을 유지한다.
- 실제 제품 데이터, 네트워크 요청, 영구 설정, 커스텀 폰트, 제품 accent 또는 추가 Glass 장식을 도입하지 않는다.

## Verification

- 저장소 루트에서 최종 lockfile 기준 `bun install --frozen-lockfile`을 실행해 로컬 Turbo와 모바일 의존성을 준비한다.
- 저장소 루트에서 `bun run check --filter=@repo/mobile`, `bun run check-types --filter=@repo/mobile`, `bun run test --filter=@repo/mobile`을 실행해 모두 성공하고 비대화형으로 종료되는지 확인한다.
- `apps/mobile`에서 `bun run ios`로 Development Build를 실행하고 `agent-device`로 Home 진입, 세 탭 전환, Activity 스크롤, 두 Settings switch 조작과 Light/Dark 전환 후 접근성 스냅샷과 화면 상태를 확인한다.
- 탭 전환, overscroll과 appearance 전환 중 `background.canvas`가 아닌 배경이 노출되지 않는지 확인한다.

## Review checkpoint

None.

## Status

<!-- Later values: `in-progress`, `completed`, or `blocked`. -->
completed

## Execution

- Test seams: 시스템 scheme을 입력받는 공개 시맨틱 색상 선택 API, React Native Testing Library로 렌더링한 Home·Activity placeholder의 접근성 계약
- Verification: 깨끗한 의존성 트리에서 `bun install --frozen-lockfile`; `bun run check --filter=@repo/mobile`; `bun run check-types --filter=@repo/mobile`; `bun run test --filter=@repo/mobile` (최종 HEAD 12 suites, 19 tests); `bunx expo install --check`; `bunx expo config --type public` 통과. iOS autolinking은 25개 native module을 패키지별 한 번씩 선택함
- iOS runtime: iOS 26.5의 전용 iPhone 17e와 Metro 8092에서 Development Build를 네이티브 빌드해 0 errors로 설치했다. `agent-device` 접근성 스냅샷과 화면 캡처로 세 탭의 tap·Settings→Home drag, 선택 상태, Home·Activity·Settings Large Title, Activity 1–18 placeholder 및 탭 축소·복원, Settings의 Notifications/Haptics `0/1 → 1/0` 변경과 탭 왕복 후 상태 유지를 확인했다.
- Appearance and accessibility: Light/Dark에서 RN 화면, native header·status bar·window, Glass 탭과 universal Settings가 함께 전환됐다. 탭 이동·Activity 스크롤·appearance 전환을 포함한 10.835초 영상을 0.2초 간격 54프레임으로 확인해 이색 배경 flash가 없음을 확인했다. `accessibility-extra-extra-extra-large`에서 세 화면을 확인해 본문 재배치, Settings 행 확장과 탭 라벨 상한이 clipping·overlap 없이 동작했으며, 검증 후 appearance `light`와 content size `large`로 복원했다.
- Final accessibility review: iOS에서 `tab` role이 첫 Home trigger를 전체 화면 ancestor로 합치던 문제를 `abe383f`에서 플랫폼별 role로 수정했다. iOS 26.5 접근성 tree에서 Home·Activity·Settings가 각각 약 119pt 폭의 독립된 `Button`으로 표시되고 Home의 `selected: true` 상태 및 screen-reader selector를 이용한 Activity→Home 전환을 확인했다.
- Isolation: 검증 후 iPhone 17e와 Metro 8092만 종료했다. 다른 세션의 iPhone 17 Pro는 booted, Metro 8081은 listening 상태로 유지됨을 다시 확인했다.
