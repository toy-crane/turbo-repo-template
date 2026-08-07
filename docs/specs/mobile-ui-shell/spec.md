# 모바일 UI 셸 스펙

## 목표

현재 개발 확인용 단일 화면을 Expo Router 기반 모바일 셸로 교체한다. 세 개의 테스트용 탭에서 React Native UI, Glass 탭 표현과 플랫폼 UI Settings를 함께 확인하고, 운영체제 appearance가 바뀌어도 앱 콘텐츠, 내비게이션 컨테이너와 네이티브 window가 하나의 시각 체계로 전환되게 한다.

## 적용할 결정

- [모바일 색상 시맨틱](../../decisions/mobile-color-semantics.md)
- [모바일 아이콘 렌더링](../../decisions/mobile-icon-rendering.md)
- [모바일 타이포그래피](../../decisions/mobile-typography.md)
- [모바일 UI 렌더러 경계](../../decisions/mobile-ui-renderer-boundaries.md)
- [모바일 테스트와 런타임 검증](../../decisions/mobile-testing-and-verification.md)

## 필요한 최종 상태

### Appearance와 색상

- 앱 appearance는 시스템 설정을 따르는 `automatic`이다. 앱 내부 테마 선택과 저장 기능은 없다.
- 앱이 소유하는 최초 시맨틱 색상은 다음과 같다.

| 시맨틱 토큰 | Light | Dark |
| --- | --- | --- |
| `background.canvas` | `#F4F4F6` | `#0B0B0D` |
| `text.primary` | `#111114` | `#FFFFFF` |
| `background.surface` | `#FFFFFF` | `#1A1A1E` |

- Expo Router navigation theme은 현재 시스템 scheme의 기본 theme을 보존하면서 `background`와 `card`를 `background.canvas`, `text`를 `text.primary`에 연결한다.
- navigation theme의 `card`는 앱 콘텐츠 카드가 아니라 내비게이션 라이브러리가 요구하는 필드다. 최초 셸에서는 native navigation surface와 화면 바탕이 이어지도록 `background.canvas`를 사용한다.
- navigation theme의 기본 fonts는 덮어쓰지 않는다. 네이티브 헤더와 라벨은 플랫폼 시스템 폰트를 유지한다.
- 네이티브 root window의 배경은 현재 `background.canvas`와 동기화하며 status bar는 현재 appearance에 자동으로 맞춘다.
- 별도의 앱 `ThemeContext`는 만들지 않는다. Expo Router의 `ThemeProvider`가 navigation tree를 담당하고, React Native UI는 시스템 scheme과 중앙 시맨틱 색상을 직접 사용한다.
- 플랫폼 UI Settings의 `Host`는 appearance를 강제하지 않고 시스템 설정을 따른다. 브랜드 accent가 아직 없으므로 별도의 seed color도 주입하지 않는다.

### 네이티브 셸과 탭

- Expo Router의 native Stack이 화면 전환과 헤더를 소유한다. 탭 셸 자체의 헤더는 숨기고 Home, Activity와 Settings 각 탭 안에 독립적인 Stack을 둔다.
- 세 개의 직접 탭은 `expo-router/ui` 기반 `expo-glass-tabs`로 구성한다. 최초 대상 버전은 `0.1.1`이다.
- 탭은 고정된 순서로 Home, Activity, Settings를 제공한다.
- 세 탭의 첫 화면은 각각 Home, Activity, Settings라는 native Stack 제목을 표시한다. iOS에서는 스크롤에 따라 접히는 Large Title, Android에서는 기본 App Bar 제목을 사용하며 별도의 RN 또는 `@expo/ui` 제목을 본문에 중복해서 만들지 않는다.
- Glass 탭 아이콘은 패키지의 기본 `expo-symbols` 경로를 사용한다. Home, Activity와 Settings 각각에 iOS의 SF Symbol과 Android의 Material Symbol 이름을 함께 지정해 두 플랫폼 모두에서 표시한다.
- 시스템 appearance가 바뀌면 Glass 탭의 label, icon, highlight, glass tint와 fallback도 함께 바뀐다.
- iOS 26 이상에서는 지원되는 native glass를 사용하고, native glass를 사용할 수 없는 iOS와 Android에서는 solid fallback을 사용한다.
- Activity의 스크롤에 따라 탭 바가 축소되고 다시 위로 스크롤하면 복원된다. 탭 전환, drag와 haptic 같은 패키지 기본 동작은 변경하지 않는다.

### RN placeholder 화면

- Home과 Activity는 React Native UI다.
- Home은 `background.canvas`와 native Stack 제목 아래의 본문 여백을 확인할 수 있는 최소 placeholder다.
- Activity는 실제 스크롤이 발생할 만큼 반복된 중립적 placeholder 콘텐츠를 제공해 탭 바 축소와 overscroll을 검증한다.
- 두 화면은 자체적인 최상위 고정 배경을 중복해서 칠하지 않고 navigation container의 canvas를 사용한다.
- 두 화면의 본문은 모두 테스트용 placeholder이며 실제 제품 데이터, 네트워크 요청, 저장 상태 또는 제품 기능을 넣지 않는다.

### 플랫폼 UI Settings

- Settings는 `@expo/ui` universal 컴포넌트 한 트리로 만든다. iOS에서는 SwiftUI, Android에서는 Jetpack Compose로 렌더링한다.
- Settings route의 루트에 화면 전체를 소유하는 `Host` 하나를 둔다. React Native 컴포넌트를 내부에 삽입하지 않는다.
- Settings의 iOS Large Title과 Android App Bar 제목은 바깥의 native Stack이 소유하고, `Host`는 그 아래의 본문 전체를 소유한다.
- grouped settings 표현에는 universal `FieldGroup`과 platform control을 사용한다.
- 첫 번째 섹션은 Notifications와 Haptics 같은 두 개의 더미 switch를 제공한다.
- 두 번째 섹션은 앱 버전처럼 상호작용하지 않는 확인용 row를 제공한다.
- 모든 row, label과 값은 플랫폼 표현을 확인하기 위한 placeholder이며 실제 설정 기능을 뜻하지 않는다.
- 더미 control state는 현재 실행 중에만 유지하고 재실행 시 초기화한다. 운영체제 권한, 알림, haptic 설정, 저장소 또는 분석 이벤트와 연결하지 않는다.
- Settings 내부의 control 색상, pressed state와 accessibility 표현은 플랫폼 기본 동작을 유지한다.

## 완료 조건

- 앱 시작 경로가 Expo Router로 전환되고 `/`가 Home 탭을 표시한다.
- Home, Activity와 Settings가 iOS에서는 시스템 폰트의 native Large Title, Android에서는 기본 App Bar 제목을 표시하고 본문에 제목이 중복되지 않는다.
- Home, Activity와 Settings 탭을 탭과 drag로 전환할 수 있으며 선택 highlight가 올바른 탭을 따른다.
- Activity를 아래로 스크롤하면 탭 바가 축소되고 위로 스크롤하면 복원된다.
- Settings의 두 switch가 조작되고 화면 안에서 상태를 유지하지만 앱 재실행 후 초기값으로 돌아온다.
- 시스템 appearance를 실행 중에 바꾸면 RN placeholder, navigation container, native window, Glass 탭과 Settings가 모두 대응하는 appearance로 갱신된다.
- 탭 전환, overscroll과 투명한 네이티브 영역에서 다른 배경색이 번쩍이지 않는다.
- iOS와 Android에서 탭 아이콘과 label이 모두 보이고 screen reader가 식별할 수 있다.
- 기본 및 큰 접근성 글자 크기에서 탭과 화면의 핵심 콘텐츠가 잘리거나 겹치지 않는다.
- Jest·React Native Testing Library 검사는 시맨틱 색상 선택과 RN placeholder의 접근성 계약을 확인한다.
- Development Build 검증은 iOS와 Android 각각에서 세 탭, Activity 스크롤, Settings control, Light/Dark 전환과 배경 연속성을 확인한다.

## 제외할 범위

- 실제 Home 또는 Activity 제품 기능
- 영구 Settings 저장과 운영체제 기능 연동
- 앱 내부 appearance 선택기
- 커스텀 폰트와 navigation font override
- RN 화면 내부의 부분적인 SwiftUI 또는 Compose `Host`
- 제품 accent와 status color 설계
- Expo Web
- 별도의 splash, 숫자 애니메이션 또는 추가 Glass 장식
- 테스트를 위한 추가 push route, modal 또는 form sheet

## 남은 위험

- `expo-glass-tabs`와 `expo-symbols`는 초기 버전이므로 설치된 SDK 57 조합에서 타입, Android symbol과 fallback을 실제 기기 런타임으로 확인해야 한다.
- universal `FieldGroup`의 세부 API는 Expo SDK에 따라 바뀔 수 있으므로 구현 시 설치된 `@expo/ui` 타입을 기준으로 사용한다.
- 플랫폼 UI Settings의 내부 surface는 각 운영체제 시맨틱 표현을 사용하므로 RN의 `background.surface`와 픽셀 단위로 같지 않을 수 있다. 이는 플랫폼 UI 정책에 따른 의도된 차이다.
