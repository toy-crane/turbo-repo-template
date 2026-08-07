# 01 — 공통 모바일 셸과 iOS 기준 경로

## Outcome

기존 단일 개발 확인 화면을 공통 Expo Router 앱으로 교체하고, Home·Activity·Settings의 완결된 사용자 경로를 iOS Development Build에서 사용할 수 있다. 공통 코드에는 Android가 사용할 플랫폼별 아이콘과 universal Settings 트리도 함께 포함한다.

## Blockers

None.

## Acceptance criteria

- [ ] 앱이 Expo Router entry로 시작하고 `/`에서 Home 탭을 표시한다.
- [ ] Home, Activity와 Settings 세 탭을 탭과 drag로 전환할 수 있고 선택 highlight가 현재 탭을 따른다.
- [ ] 세 탭은 iOS native Large Title을 표시하며 RN 또는 `@expo/ui` 본문에 같은 제목을 중복하지 않는다.
- [ ] Home과 Activity는 React Native UI placeholder이고, Activity 스크롤에 따라 Glass 탭이 축소되고 위로 스크롤하면 복원된다.
- [ ] Settings는 route 루트의 universal `Host` 하나가 전체 본문을 소유하며 `FieldGroup`, Notifications·Haptics 더미 switch와 앱 버전 확인용 row를 표시한다.
- [ ] 더미 switch는 현재 실행 중에만 상태를 유지하고 운영체제 기능, 저장소 또는 분석 이벤트를 호출하지 않는다.
- [ ] appearance가 `automatic`을 따르고 RN 콘텐츠, navigation container, native window, status bar, Glass 탭과 Settings가 Light/Dark 전환에 함께 반응한다.
- [ ] navigation theme의 `background`와 `card`는 `background.canvas`, `text`는 `text.primary`를 사용하며 navigation font를 덮어쓰지 않는다.
- [ ] Home, Activity와 Settings 아이콘 정의가 iOS SF Symbol과 Android Material Symbol 이름을 함께 포함한다.
- [ ] 기존 Development Build 검증 유틸리티를 대체한 라우팅, 시맨틱 색상과 RN placeholder 접근성 테스트가 통과한다.
- [ ] iOS Development Build에서 세 탭, Large Title, Activity 스크롤, Settings control, Light/Dark와 배경 연속성을 확인한다.

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
pending

## Execution

- Verification: —
- Blocker: —
