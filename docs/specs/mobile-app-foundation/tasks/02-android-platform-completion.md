# 02: Android 플랫폼 완성과 통합 검증

## 결과

공통 모바일 셸을 Android Development Build의 플랫폼 관례에 맞게 완성한다. 사용자는 기본 App Bar, Material Symbol, 네이티브 하단 내비게이션과 Compose Settings를 포함한 같은 세 탭 경로를 사용할 수 있다.

## 선행 조건

- [01: 공통 모바일 셸과 iOS 기준 경로](01-common-shell-ios-path.md)가 먼저 완료되어야 한다. 공통 Expo Router 구조, 테마, 세 탭과 공통 Settings 트리를 바탕으로 Android 플랫폼 표현과 대체 표현을 검증하고 보완한다.

## 완료 조건

- [x] Android Development Build가 `/`의 Home 탭으로 시작하고 Home, Activity와 Settings 세 탭을 전환할 수 있다.
- [x] 세 화면의 제목은 Android 기본 네이티브 App Bar로 표시되고 본문에 제목이 중복되지 않는다.
- [x] Home, Activity와 Settings의 Material Symbol과 라벨이 모두 표시되고 화면 읽기 프로그램이 각 탭을 식별한다.
- [x] Android에서 `NativeTabs`가 플랫폼 하단 내비게이션으로 표시되고 선택 강조와 탭 전환이 동작한다. Activity 스크롤 중에도 Android 기본 탭 바는 유지된다.
- [x] Settings의 같은 공통 트리가 Compose `Host`와 `FieldGroup`으로 렌더링된다. 두 더미 스위치는 현재 실행 중에만 상태를 유지한다.
- [x] 시스템 Light/Dark 전환 시 RN 임시 화면, 내비게이션 컨테이너, 네이티브 창, 상태 표시줄, 탭과 Settings가 함께 갱신된다.
- [x] 탭 전환, 경계 너머 스크롤과 Settings 진입·이탈 중 다른 배경색이 번쩍이지 않는다.
- [x] 기본 및 큰 접근성 글자 크기에서 App Bar, 탭 라벨과 Settings 핵심 콘텐츠가 잘리거나 겹치지 않는다.
- [x] 공통 Jest, React Native Testing Library와 타입·정적 검사가 Android 보완 후에도 통과한다.

## 제약

- iOS와 시각적으로 같게 만들기 위한 RN Large Title이나 Android 전용 Compose Top App Bar를 추가하지 않는다.
- Android 전용 Settings 트리를 만들지 않고 공통 컴포넌트 트리를 유지한다.
- Material Symbol이 부족하다는 실제 검증 결과 없이 범용 아이콘 폰트나 서드파티 SVG 아이콘 세트를 추가하지 않는다.

## 검증

- 저장소 루트에서 최종 잠금 파일 기준 `bun install --frozen-lockfile`을 실행해 Android Development Build와 검증에 필요한 의존성을 준비한다.
- 저장소 루트에서 다음 명령을 실행해 모두 성공하는지 확인한다.
  - `bun run check --filter=@repo/mobile`
  - `bun run check-types --filter=@repo/mobile`
  - `bun run test --filter=@repo/mobile`
- `apps/mobile`에서 `bun run android`로 Development Build를 실행한다. `agent-device`로 세 탭 전환, Activity 스크롤, 두 Settings 스위치 조작, Light/Dark 전환과 큰 글자 크기 상태를 확인한다.
- Android 접근성 스냅샷과 스크린샷에서 App Bar 제목, 세 탭의 아이콘·라벨, Compose Settings와 배경 연속성을 확인한다.

## 검토 지점

없음.

## 상태

<!-- 이후 값: `in-progress`, `completed`, `blocked` -->
completed

## 실행 결과

- 최종 검증: 다음 검사가 모두 통과했다.
  - `bun install --frozen-lockfile`
  - `bun run check`
  - `bun run check-types`
  - `bun run test`(9 suites, 15 tests)
  - iOS·Android 내보내기
  - Expo 의존성과 공개 설정 검사
- Android 빌드: API 35 전용 `Codex Mobile Foundation API 35` AVD에서 새 `prebuild` 결과로 Gradle `assembleDebug`를 실행했다. 455개 작업이 `BUILD SUCCESSFUL`로 끝났다. APK 설치와 Metro 8093 번들도 성공했다.
- Android 실행 결과: `/`가 Home으로 시작했다. 접근성 트리에서 Home·Activity·Settings가 각각 아이콘·라벨을 가진 네이티브 하단 내비게이션 항목으로 표시됐다. Settings에서 Activity로 전환하고 Activity 1–18을 스크롤한 뒤에도 탭 바가 유지됐다.
- 기본 스위치: 같은 공통 `Host`·`FieldGroup`에서 Notifications·Haptics 라벨의 왼쪽 영역과 스위치의 오른쪽 영역을 확인했다. 두 스위치를 누르자 각 손잡이의 좌우 위치가 바뀌어 `off/on → on/off` 전환이 반영됐다.
- 확인된 상위 라이브러리 한계: `@expo/ui 57.0.9`의 기본 Android 구현은 보이는 라벨을 스위치의 TalkBack 이름으로 연결하지 않는다. 라벨 색상 `prop`도 제공하지 않는다. 패치 없이 공식 `Switch label`을 사용한다는 선택을 유지했다. 테스트 모형도 실제 형제 구조를 반영했다.
- 의존성 정리: 앱의 `expo-glass-tabs`, 직접 사용하는 `expo-symbols`, 관련 Glass·흐림 효과·햅틱·애니메이션 의존성과 모든 Bun 패치를 제거했다. `expo-symbols`와 `expo-glass-effect`는 Expo Router 내부 의존성으로 lockfile에만 남는다. 앱은 두 패키지를 직접 불러오거나 패치하지 않는다.
- 검증 환경 정리: 검증에 사용한 전용 AVD `emulator-5554`, `agent-device` 세션과 Metro 8093만 종료했다.
