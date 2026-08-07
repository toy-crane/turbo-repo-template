# 02 — Android 플랫폼 완성 및 통합 검증

## Outcome

공통 모바일 셸이 Android Development Build에서도 플랫폼 관례에 맞게 완성되어, 사용자가 기본 App Bar, Material Symbol, 네이티브 하단 내비게이션과 Compose Settings를 포함한 같은 세 탭 경로를 사용할 수 있다.

## Blockers

- [01 — 공통 모바일 셸과 iOS 기준 경로](01-common-shell-ios-path.md) — 공통 Expo Router 구조, theme, 세 탭과 universal Settings 트리가 있어야 Android 플랫폼 표현과 fallback을 검증하고 보완할 수 있다.

## Acceptance criteria

- [x] Android Development Build가 `/`의 Home 탭으로 시작하고 Home, Activity와 Settings 세 탭을 전환할 수 있다.
- [x] 세 화면의 제목은 Android 기본 native App Bar로 표시되고 본문에 제목이 중복되지 않는다.
- [x] Home, Activity와 Settings의 Material Symbol과 label이 모두 표시되고 screen reader가 각 탭을 식별한다.
- [x] Android에서 `NativeTabs`가 플랫폼 하단 내비게이션으로 표시되고 선택 highlight와 탭 전환이 동작한다. Activity 스크롤 중에도 Android 기본 탭 바는 유지된다.
- [x] Settings의 같은 universal 트리가 Compose `Host`와 `FieldGroup`으로 렌더링되고 두 더미 switch가 현재 실행 중에만 상태를 유지한다.
- [x] 시스템 Light/Dark 전환 시 RN placeholder, navigation container, native window, status bar, 탭과 Settings가 함께 갱신된다.
- [x] 탭 전환, overscroll과 Settings 진입·이탈 중 다른 배경색이 번쩍이지 않는다.
- [x] 기본 및 큰 접근성 글자 크기에서 App Bar, 탭 label과 Settings 핵심 콘텐츠가 잘리거나 겹치지 않는다.
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
completed

## Execution

- Verification: 최종 lockfile에서 `bun install --frozen-lockfile`; `bun run check`; `bun run check-types`; `bun run test`(9 suites, 15 tests); iOS·Android export; Expo dependency와 public config 검사가 모두 통과했다.
- Android build: API 35 전용 `Codex Mobile Foundation API 35` AVD에서 새 prebuild로 Gradle `assembleDebug`를 실행했다. 455개 task가 `BUILD SUCCESSFUL`로 끝났고 APK 설치와 Metro 8093 bundle이 성공했다.
- Android runtime: `/`가 Home으로 시작했고, 접근성 tree에서 Home·Activity·Settings가 각각 icon·label을 가진 네이티브 하단 내비게이션 item으로 표시됐다. Settings→Activity 전환과 Activity 1–18 스크롤 후에도 탭 바가 유지되는 것을 확인했다.
- Default switches: 같은 universal `Host`·`FieldGroup`에서 Notifications·Haptics label의 좌측 영역과 switch의 우측 영역을 확인했다. 두 switch를 눌렀을 때 각 thumb의 좌우 위치가 바뀌어 `off/on → on/off` 전환이 반영됐다.
- Accepted upstream limitation: `@expo/ui 57.0.9`의 기본 Android 구현은 보이는 label을 switch의 TalkBack 이름으로 연결하지 않고 label 색상 prop도 제공하지 않는다. patch 없이 공식 `Switch label`을 사용한다는 선택을 유지하고, 테스트 mock도 이 실제 sibling 구조를 반영했다.
- Dependency cleanup: 앱의 `expo-glass-tabs`, 직접 `expo-symbols`와 관련 glass·blur·haptic·animation 의존성 및 모든 Bun patch를 제거했다. `expo-symbols`와 `expo-glass-effect`는 Expo Router 내부 의존성으로 lockfile에만 남으며 앱이 직접 import하거나 patch하지 않는다.
- Isolation: 검증에 사용한 전용 AVD `emulator-5554`, `agent-device` session과 Metro 8093만 종료했다.
