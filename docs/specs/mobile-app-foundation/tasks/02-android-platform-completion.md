# 02 — Android 플랫폼 완성 및 통합 검증

## Outcome

공통 모바일 셸이 Android Development Build에서도 플랫폼 관례에 맞게 완성되어, 사용자가 기본 App Bar, Material Symbol, Glass 탭 fallback과 Compose Settings를 포함한 같은 세 탭 경로를 사용할 수 있다.

## Blockers

- [01 — 공통 모바일 셸과 iOS 기준 경로](01-common-shell-ios-path.md) — 공통 Expo Router 구조, theme, 세 탭과 universal Settings 트리가 있어야 Android 플랫폼 표현과 fallback을 검증하고 보완할 수 있다.

## Acceptance criteria

- [x] Android Development Build가 `/`의 Home 탭으로 시작하고 Home, Activity와 Settings 세 탭을 전환할 수 있다.
- [x] 세 화면의 제목은 Android 기본 native App Bar로 표시되고 본문에 제목이 중복되지 않는다.
- [x] Home, Activity와 Settings의 Material Symbol과 label이 모두 표시되고 screen reader가 각 탭을 식별한다.
- [x] Android에서 Glass 탭이 solid fallback으로 표시되고 선택 highlight, drag, haptic과 Activity 스크롤 축소·복원이 동작한다.
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

- Verification: 최종 lockfile로 `bun install --frozen-lockfile`; `bun run check --filter=@repo/mobile`; `bun run check-types --filter=@repo/mobile`; `bun run test --filter=@repo/mobile` (7 suites, 11 tests); `bunx expo install --check`를 통과했다. Android Development Build는 Gradle `assembleDebug`가 455개 task를 처리해 `BUILD SUCCESSFUL`로 끝났고 APK 설치와 Metro bundle도 성공했다. Android autolinking `resolve --platform android --json`은 23개 native module을 패키지별 한 번씩 선택했다.
- Android runtime: API 35의 전용 `Codex Mobile Foundation API 35` AVD(`emulator-5564`)와 Metro 8093에서 `/` Home으로 시작했다. 접근성 snapshot과 화면 캡처로 세 탭 전환, 각 화면에 한 번만 표시되는 native App Bar 제목, Material Symbol·label 및 탭의 식별 가능한 접근성 node를 확인했다.
- Navigation behavior: solid fallback, 선택 highlight와 Settings→Activity→Home scrub을 확인했다. scrub 경계를 지날 때 Android vibrator service에 앱 package의 `TOUCH` event가 두 번 기록됐다. Activity 1–18을 스크롤해 label 없는 축소 bar와 위로 스크롤한 뒤 복원된 bar를 확인했다.
- Settings and appearance: 같은 universal `Host`·`FieldGroup` 트리에서 Notifications/Haptics를 `off/on → on/off`로 바꾸고 탭 왕복 후 상태 유지를 확인했다. Light/Dark에서 RN 화면, native App Bar·window·status bar, 탭과 Compose Settings가 함께 갱신됐다. Android Dark의 행 텍스트 대비 결함은 `d440355`에서 수정하고 실제 화면으로 재검증했다.
- Accessibility and continuity: Android `font_scale` 1.0과 2.0에서 Home, Activity 1–18, Settings의 행 확장과 탭을 확인했다. 확대 시 Material Symbol이 잘리던 `expo-symbols` 문제는 재현 test와 Bun patch를 `2b3c2a5`에 추가해 고쳤다. Home→Activity, Activity 상단 overscroll, Settings 진입·switch 조작, Settings→Home scrub을 담은 7.567초 영상을 0.2초 간격 38프레임으로 확인해 이색 배경 flash가 없음을 확인했다. 검증 후 appearance `light`와 `font_scale` 1.0으로 복원했다.
- Review and diagnostics: 이전 `codex review --base main`의 세 finding을 수정했다 — universal Row의 지원되지 않는 percentage width 제거(`ec47a0e`), Android scrub haptic 보완(`7b815d9`), tab label 글자 확대 상한 적용(`eb2c3f8`). `expo-doctor --verbose`의 필수 peer와 Expo SDK 버전 검사는 통과했으며, 전체 16/20은 Bun 격리 설치의 같은 버전 peer-context 복사본과 `npm explain` 호출을 보고하는 기존 진단이다.
- Isolation: 공간이 부족한 기존 Pixel 9 Pro AVD의 사용자 앱과 데이터는 삭제하지 않고 별도 AVD를 만들었다. 검증 후 `emulator-5564`와 Metro 8093만 종료했다. 다른 세션의 `mobile_shell_verify_api35` Android emulator, iPhone 17 Pro와 Metro 8081은 계속 실행 중이며 iPhone 17e는 shutdown 상태임을 확인했다.
