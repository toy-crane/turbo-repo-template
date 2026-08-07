# 02 — Android 플랫폼 완성 및 통합 검증

## Outcome

공통 모바일 셸이 Android Development Build에서도 플랫폼 관례에 맞게 완성되어, 사용자가 기본 App Bar, Material Symbol, Glass 탭 fallback과 Compose Settings를 포함한 같은 세 탭 경로를 사용할 수 있다.

## Blockers

- [01 — 공통 모바일 셸과 iOS 기준 경로](01-common-shell-ios-path.md) — 공통 Expo Router 구조, theme, 세 탭과 universal Settings 트리가 있어야 Android 플랫폼 표현과 fallback을 검증하고 보완할 수 있다.

## Acceptance criteria

- [ ] Android Development Build가 `/`의 Home 탭으로 시작하고 Home, Activity와 Settings 세 탭을 전환할 수 있다.
- [ ] 세 화면의 제목은 Android 기본 native App Bar로 표시되고 본문에 제목이 중복되지 않는다.
- [ ] Home, Activity와 Settings의 Material Symbol과 label이 모두 표시되고 screen reader가 각 탭을 식별한다.
- [ ] Android에서 Glass 탭이 solid fallback으로 표시되고 선택 highlight, drag, haptic과 Activity 스크롤 축소·복원이 동작한다.
- [ ] Settings의 같은 universal 트리가 Compose `Host`와 `FieldGroup`으로 렌더링되고 두 더미 switch가 현재 실행 중에만 상태를 유지한다.
- [ ] 시스템 Light/Dark 전환 시 RN placeholder, navigation container, native window, status bar, 탭과 Settings가 함께 갱신된다.
- [ ] 탭 전환, overscroll과 Settings 진입·이탈 중 다른 배경색이 번쩍이지 않는다.
- [ ] 기본 및 큰 접근성 글자 크기에서 App Bar, 탭 label과 Settings 핵심 콘텐츠가 잘리거나 겹치지 않는다.
- [x] 공통 Jest, React Native Testing Library와 타입·정적 검사가 Android 보완 후에도 통과한다.

## Constraints

- iOS와 시각적으로 같게 만들기 위한 RN Large Title이나 Android 전용 Compose Top App Bar를 추가하지 않는다.
- Android 전용 Settings 트리를 만들지 않고 universal 컴포넌트 트리를 유지한다.
- Material Symbol이 부족하다는 실제 검증 결과 없이 범용 아이콘 폰트나 서드파티 SVG 아이콘 세트를 추가하지 않는다.

## Verification

- 저장소 루트에서 최종 lockfile 기준 `bun install --frozen-lockfile`을 실행해 Android Development Build와 검증에 필요한 의존성을 준비한다.
- 저장소 루트에서 `bun run check --filter=@repo/mobile`, `bun run check-types --filter=@repo/mobile`, `bun run test --filter=@repo/mobile`을 실행해 모두 성공하는지 확인한다.
- `apps/mobile`에서 `bun run android`로 Development Build를 실행하고 `agent-device`로 세 탭 전환, Activity 스크롤, 두 Settings switch 조작, Light/Dark 전환과 큰 글자 크기 상태를 확인한다.
- Android 접근성 스냅샷과 스크린샷에서 App Bar 제목, 세 탭의 icon·label, Compose Settings와 배경 연속성을 확인한다.

## Review checkpoint

None.

## Status

<!-- Later values: `in-progress`, `completed`, or `blocked`. -->
in-progress

## Execution

- Verification: `bun install --frozen-lockfile`; `bun run check --filter=@repo/mobile`; `bun run check-types --filter=@repo/mobile`; `bun run test --filter=@repo/mobile` (4 suites, 6 tests); `bunx expo install --check` 통과. Android autolinking `resolve --platform android --json`은 23개 native module을 패키지별 한 번씩 선택함
- Diagnostic: `expo-doctor --verbose`에서 필수 peer와 Expo SDK 버전 검사는 통과함. 전체 결과는 Bun 격리 설치의 같은 버전 peer-context 복사본을 중복으로 보고하고 `npm explain`을 호출하는 4개 진단 때문에 16/20이며, 깨끗한 재설치 후에도 동일함
- Blocker: 다른 세션의 Metro·Simulator와 겹치지 않도록 Android Development Build 런타임 검증은 아직 실행하지 않음
