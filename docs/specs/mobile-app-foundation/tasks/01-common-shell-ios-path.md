# 01: 공통 모바일 셸과 iOS 기준 경로

## 결과

기존 단일 개발 확인 화면을 공통 Expo Router 앱으로 교체한다. 사용자는 iOS Development Build에서 Home·Activity·Settings로 이어지는 완결된 경로를 사용할 수 있다. 공통 코드에는 Android가 사용할 플랫폼별 아이콘과 공통 Settings 트리도 포함한다.

## 선행 조건

없음.

## 완료 조건

- [x] 앱이 Expo Router 진입점으로 시작하고 `/`에서 Home 탭을 표시한다.
- [x] Home, Activity와 Settings 세 `NativeTabs` 항목을 눌러 전환할 수 있고 선택 강조가 현재 탭을 따른다.
- [x] 세 탭은 iOS 네이티브 Large Title을 표시하며 RN 또는 `@expo/ui` 본문에 같은 제목을 중복하지 않는다.
- [x] Home과 Activity는 React Native UI 임시 화면이다. iOS 26 이상에서 Activity를 스크롤하면 네이티브 탭이 축소되고 위로 스크롤하면 복원된다.
- [x] Settings는 라우트 루트의 공통 `Host` 하나가 전체 본문을 소유한다. `FieldGroup`, 기본 `Switch label` 형태의 Notifications·Haptics 더미 스위치와 앱 버전 확인용 행을 표시한다.
- [x] 더미 스위치는 현재 실행 중에만 상태를 유지하고 운영체제 기능, 저장소 또는 분석 이벤트를 호출하지 않는다.
- [x] 화면 모드는 `automatic`을 따른다. RN 콘텐츠, 내비게이션 컨테이너, 네이티브 창, 상태 표시줄, 네이티브 탭과 Settings가 Light/Dark 전환에 함께 반응한다.
- [x] 내비게이션 테마의 `background`와 `card`는 `background.canvas`를 사용하고 `text`는 `text.primary`를 사용한다. 내비게이션 폰트는 덮어쓰지 않는다.
- [x] Home, Activity와 Settings 아이콘 정의가 iOS SF Symbol과 Android Material Symbol 이름을 함께 포함한다.
- [x] 기존 Development Build 검증 유틸리티를 대체한 라우팅, 시맨틱 색상과 RN 임시 화면 접근성 테스트가 통과한다.
- [x] iOS Development Build에서 세 탭, Large Title, Activity 스크롤, Settings 컨트롤, Light/Dark와 배경 연속성을 확인한다.

## 제약

- 공유 라우트와 UI 모듈에 iOS 전용 불러오기 또는 SF Symbol 문자열만 사용하는 임시 구현을 남기지 않는다.
- 탭의 화면 모드와 상호작용은 `NativeTabs` 및 운영체제 기본 동작에 맡긴다. 별도 Glass, 흐림 효과, 드래그와 햅틱 구현은 추가하지 않는다.
- 실제 제품 데이터, 네트워크 요청, 영구 설정, 커스텀 폰트, 제품 강조색 또는 커스텀 탭 장식을 도입하지 않는다.

## 검증

- 저장소 루트에서 최종 잠금 파일 기준 `bun install --frozen-lockfile`을 실행해 로컬 Turbo와 모바일 의존성을 준비한다.
- 저장소 루트에서 다음 명령을 실행한다. 모두 성공하고 비대화형으로 종료되는지 확인한다.
  - `bun run check --filter=@repo/mobile`
  - `bun run check-types --filter=@repo/mobile`
  - `bun run test --filter=@repo/mobile`
- `apps/mobile`에서 `bun run ios`로 Development Build를 실행한다. `agent-device`로 Home 진입, 세 탭 전환, Activity 스크롤, 두 Settings 스위치 조작과 Light/Dark 전환을 수행한다. 접근성 스냅샷과 화면 상태를 확인한다.
- 탭 전환, 경계 너머 스크롤과 화면 모드 전환 중 `background.canvas`가 아닌 배경이 노출되지 않는지 확인한다.

## 검토 지점

없음.

## 상태

<!-- 이후 값: `in-progress`, `completed`, `blocked` -->
completed

## 실행 결과

- 테스트 경계: 시스템 화면 모드를 입력받는 공개 시맨틱 색상 선택 API와 React Native Testing Library로 렌더링한 Home·Activity 임시 화면의 접근성 계약을 확인했다.
- 최종 검증: 다음 명령이 모두 통과했다.
  - `bun install --frozen-lockfile`
  - `bun run check`
  - `bun run check-types`
  - `bun run test`(9 suites, 15 tests)
  - `bun run build --filter=@repo/mobile`
  - `bunx expo install --check`
  - `bunx expo config --type public`
- 네이티브 탭 전환: `expo-glass-tabs`를 제거했다. Expo Router `NativeTabs`의 Home·Activity·Settings 트리거와 iOS SF Symbol·Android Material Symbol 쌍으로 교체했다. 앱이 직접 사용하던 탭·심벌·Glass·흐림 효과·햅틱·애니메이션 의존성과 세 라이브러리 패치를 제거했다.
- iOS 빌드: 사전 빌드된 React Core와 Development Build의 링크 충돌은 `expo-build-properties`의 `ios.buildReactNativeFromSource`로 해결했다. `prebuild` 결과의 `Podfile.properties.json`에도 값이 생성됐다. iOS 26.5 전용 iPhone 17e에서 소스 빌드가 오류 없이 설치됐다.
- iOS 실행 결과: Metro 8093에서 Home·Activity·Settings가 각각 독립된 네이티브 탭 버튼으로 식별됐다. 네이티브 Large Title과 선택 상태도 올바르게 바뀌었다. Activity 1–18을 아래위로 스크롤해 탭 축소와 복원을 확인했다.
- 기본 스위치: Settings 접근성 트리와 화면에서 Notifications·Haptics가 라벨 왼쪽, 스위치 오른쪽의 기본 배치로 표시됐다. 두 컨트롤을 `0/1 → 1/0`으로 변경해 동작도 확인했다.
- 검증 환경 정리: 검증에 사용한 iPhone 17e, `agent-device` 세션과 Metro 8093만 종료했다.
