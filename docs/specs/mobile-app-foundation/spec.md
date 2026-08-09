# 모바일 앱 기반 명세

## 목표

현재 개발 확인용 단일 화면을 Expo Router 기반 모바일 셸로 교체한다. 세 개의 테스트용 네이티브 탭에서 React Native UI와 플랫폼 UI Settings를 함께 확인한다. 운영체제 화면 모드가 바뀌면 앱 콘텐츠, 내비게이션 컨테이너와 네이티브 창이 하나의 시각 체계로 전환되어야 한다.

## 적용할 결정

- [모바일 색상 시맨틱](../../decisions/mobile-color-semantics.md)
- [모바일 아이콘 렌더링](../../decisions/mobile-icon-rendering.md)
- [모바일 타이포그래피](../../decisions/mobile-typography.md)
- [모바일 UI 렌더러 경계](../../decisions/mobile-ui-renderer-boundaries.md)
- [모바일 테스트와 런타임 검증](../../decisions/mobile-testing-and-verification.md)

## 필요한 최종 상태

### 화면 모드와 색상

- 앱 화면 모드는 시스템 설정을 따르는 `automatic`이다. 앱 내부 테마 선택과 저장 기능은 없다.
- 앱이 소유하는 최초 시맨틱 색상은 다음과 같다.

| 시맨틱 토큰 | Light | Dark |
| --- | --- | --- |
| `background.canvas` | `#F4F4F6` | `#0B0B0D` |
| `text.primary` | `#111114` | `#FFFFFF` |
| `background.surface` | `#FFFFFF` | `#1A1A1E` |

- Expo Router 내비게이션 테마는 현재 시스템 색상 모드의 기본 테마를 보존한다. `background`와 `card`는 `background.canvas`에 연결하고 `text`는 `text.primary`에 연결한다.
- 내비게이션 테마의 `card`는 앱 콘텐츠 카드가 아니라 내비게이션 라이브러리가 요구하는 필드다. 최초 셸에서는 네이티브 내비게이션 표면과 화면 바탕이 이어지도록 `background.canvas`를 사용한다.
- 내비게이션 테마의 기본 폰트는 덮어쓰지 않는다. 네이티브 헤더와 라벨은 플랫폼 시스템 폰트를 유지한다.
- 네이티브 루트 창의 배경은 현재 `background.canvas`와 동기화한다. 상태 표시줄은 현재 화면 모드에 자동으로 맞춘다.
- 별도의 앱 `ThemeContext`는 만들지 않는다. Expo Router의 `ThemeProvider`가 내비게이션 트리를 담당하고, React Native UI는 시스템 색상 모드와 중앙 시맨틱 색상을 직접 사용한다.
- 플랫폼 UI Settings의 `Host`는 화면 모드를 강제하지 않고 시스템 설정을 따른다. 브랜드 강조색이 아직 없으므로 별도의 시드 색상도 주입하지 않는다.

### 네이티브 셸과 탭

- Expo Router의 Native Stack이 화면 전환과 헤더를 소유한다. 탭 셸 자체의 헤더는 숨기고 Home, Activity와 Settings 각 탭 안에 독립적인 Stack을 둔다.
- 세 개의 직접 탭은 Expo Router의 `NativeTabs`로 구성한다. 현재 SDK 57에서는 `expo-router/unstable-native-tabs` 진입점을 사용한다.
- 탭은 고정된 순서로 Home, Activity, Settings를 제공한다.
- 세 탭의 첫 화면은 각각 Home, Activity, Settings라는 네이티브 Stack 제목을 표시한다. iOS에서는 스크롤에 따라 접히는 Large Title을 사용하고 Android에서는 기본 App Bar 제목을 사용한다. 별도의 RN 또는 `@expo/ui` 제목을 본문에 중복해서 만들지 않는다.
- 각 `NativeTabs.Trigger.Icon`에는 iOS의 SF Symbol과 Android의 Material Symbol 이름을 함께 지정한다. 기본·선택 아이콘의 렌더링은 탭을 소유한 네이티브 API에 맡긴다.
- 탭 바의 화면 모드, 선택 표현, 안전 영역과 접근성은 운영체제가 소유한다. 앱은 별도 Glass 색조, 흐림 효과 또는 단색 대체 표현을 구현하지 않는다.
- iOS 26 이상에서는 `minimizeBehavior="onScrollDown"`으로 Activity를 아래로 스크롤할 때 탭 바가 축소되고 위로 스크롤하면 복원된다. Android에서는 플랫폼 기본 하단 내비게이션을 유지한다.
- 탭 전환은 각 탭을 누르는 표준 네이티브 동작을 사용한다. 별도의 드래그·스크럽·햅틱 동작은 추가하지 않는다.

### RN 임시 화면

- Home과 Activity는 React Native UI다.
- Home은 `background.canvas`와 네이티브 Stack 제목 아래의 본문 여백을 확인할 수 있는 최소 임시 화면이다.
- Activity는 실제 스크롤이 발생할 만큼 중립적인 임시 콘텐츠를 반복해 탭 바 축소와 경계 너머 스크롤을 검증한다.
- 두 화면은 자체적인 최상위 고정 배경을 중복해서 칠하지 않고 내비게이션 컨테이너의 바탕을 사용한다.
- 두 화면의 본문은 모두 테스트용 임시 콘텐츠다. 실제 제품 데이터, 네트워크 요청, 저장 상태 또는 제품 기능을 넣지 않는다.

### 플랫폼 UI Settings

- Settings는 `@expo/ui` 공통 컴포넌트 한 트리로 만든다. iOS에서는 SwiftUI, Android에서는 Jetpack Compose로 렌더링한다.
- Settings 라우트의 루트에 화면 전체를 소유하는 `Host` 하나를 둔다. React Native 컴포넌트를 내부에 삽입하지 않는다.
- Settings의 iOS Large Title과 Android App Bar 제목은 바깥의 네이티브 Stack이 소유한다. `Host`는 그 아래의 본문 전체를 소유한다.
- 그룹형 Settings 표현에는 공통 `FieldGroup`과 플랫폼 컨트롤을 사용한다.
- 첫 번째 섹션은 Notifications와 Haptics 같은 두 개의 더미 스위치를 제공한다.
- 스위치는 `Switch label="..."` 기본 형태를 그대로 사용한다. 라벨은 왼쪽, 컨트롤은 오른쪽에 배치한다. 이를 바꾸기 위한 라이브러리 패치나 별도 라벨 행은 두지 않는다.
- 두 번째 섹션은 앱 버전처럼 상호작용하지 않는 확인용 행을 제공한다.
- 모든 행, 라벨과 값은 플랫폼 표현을 확인하기 위한 임시 콘텐츠이며 실제 설정 기능을 뜻하지 않는다.
- 더미 컨트롤 상태는 현재 실행 중에만 유지하고 재실행 시 초기화한다. 운영체제 권한, 알림, 햅틱 설정, 저장소 또는 분석 이벤트와 연결하지 않는다.
- Settings 내부의 컨트롤 색상, 눌림 상태와 접근성 표현은 플랫폼 기본 동작을 유지한다.

## 완료 조건

- 앱 시작 경로가 Expo Router로 전환되고 `/`가 Home 탭을 표시한다.
- Home, Activity와 Settings가 iOS에서는 시스템 폰트의 네이티브 Large Title, Android에서는 기본 App Bar 제목을 표시하고 본문에 제목이 중복되지 않는다.
- Home, Activity와 Settings 탭을 눌러 전환할 수 있으며 선택 강조가 올바른 탭을 따른다.
- iOS 26 이상에서 Activity를 아래로 스크롤하면 탭 바가 축소되고 위로 스크롤하면 복원된다. Android 탭 바는 스크롤과 무관하게 플랫폼 기본 동작을 유지한다.
- Settings의 두 스위치를 조작할 수 있고 화면 안에서 상태가 유지된다. 앱을 다시 실행하면 초기값으로 돌아온다.
- 시스템 화면 모드를 실행 중에 바꾸면 RN 임시 화면, 내비게이션 컨테이너, 네이티브 창, 네이티브 탭과 Settings가 모두 대응하는 화면 모드로 갱신된다.
- 탭 전환, 경계 너머 스크롤과 투명한 네이티브 영역에서 다른 배경색이 번쩍이지 않는다.
- iOS와 Android에서 탭 아이콘과 라벨이 모두 보이고 화면 읽기 프로그램이 식별할 수 있다.
- 기본 및 큰 접근성 글자 크기에서 탭과 화면의 핵심 콘텐츠가 잘리거나 겹치지 않는다.
- Jest·React Native Testing Library 검사는 시맨틱 색상 선택과 RN 임시 화면의 접근성 계약을 확인한다.
- Development Build 검증은 iOS와 Android 각각에서 세 탭, Activity 스크롤, Settings 컨트롤, Light/Dark 전환과 배경 연속성을 확인한다.

## 제외할 범위

- 실제 Home 또는 Activity 제품 기능
- 영구 Settings 저장과 운영체제 기능 연동
- 앱 내부 화면 모드 선택기
- 커스텀 폰트와 내비게이션 폰트 재정의
- RN 화면 내부의 부분적인 SwiftUI 또는 Compose `Host`
- 제품 강조색과 상태 색상 설계
- Expo Web
- 별도의 splash, 숫자 애니메이션 또는 커스텀 탭 장식
- 테스트를 위한 추가 푸시 라우트, 모달 또는 폼 시트

## 남은 위험

- `NativeTabs`는 현재 Expo Router의 불안정 API다. SDK를 올릴 때 진입점과 옵션 호환성을 다시 확인해야 한다.
- Expo SDK 57과 로컬 Apple 도구 체계에서는 사전 빌드된 React Core가 iOS Development Build와 링크 충돌을 일으킨다. 이 충돌을 피하기 위해 공식 `expo-build-properties`의 `ios.buildReactNativeFromSource`를 사용한다. 깨끗한 네이티브 빌드 시간이 늘어나는 비용이 있다.
- 현재 `@expo/ui 57.0.9`의 Android 기본 `Switch label`은 보이는 라벨과 스위치를 별도 접근성 노드로 내보낸다. 라벨 색상을 외부에서 지정할 API도 없다. 패치를 두지 않는 결정에 따라 TalkBack 컨트롤 이름과 Dark 대비를 앱에서 별도로 보정하지 않는다. 상위 라이브러리가 수정되면 다시 검토한다.
- 공통 `FieldGroup`의 세부 API는 Expo SDK에 따라 바뀔 수 있다. 구현할 때 설치된 `@expo/ui` 타입을 기준으로 사용한다.
- 플랫폼 UI Settings의 내부 표면은 각 운영체제 시맨틱 표현을 사용하므로 RN의 `background.surface`와 픽셀 단위로 같지 않을 수 있다. 이는 플랫폼 UI 정책에 따른 의도된 차이다.
