# 모바일 UI 렌더러 경계

## Decisions

- 네이티브 셸은 플랫폼 내비게이션이 소유한다. 네이티브 헤더, 툴바, 모달 표시 방식과 전환 제스처가 여기에 포함된다.
- 최상위 화면 제목은 플랫폼의 native Stack 표현을 따른다. iOS에서는 적합한 첫 화면에 접히는 Large Title을 사용하고, Android에서는 기본 App Bar 제목을 사용한다.
- 화면 콘텐츠는 React Native UI를 기본으로 한다.
- Settings처럼 플랫폼 관례가 화면 전체의 핵심인 경우에는 `@expo/ui` universal 컴포넌트로 플랫폼 UI를 구성한다. 같은 트리가 iOS에서는 SwiftUI, Android에서는 Jetpack Compose로 렌더링된다.
- `Host`는 해당 라우트의 루트에서 화면 전체를 소유해야 한다. React Native 컴포넌트 내부에 개별 SwiftUI 또는 Compose 컨트롤을 넣기 위한 `Host`는 만들지 않는다.
- `GlassView`와 `BlurView` 같은 네이티브-backed RN 컴포넌트는 React Native UI 안에서 필요한 곳에 사용할 수 있다. 네이티브 구현을 사용한다는 이유만으로 호스팅된 SwiftUI나 Compose로 분류하지 않는다.

## Boundaries

- 플랫폼 UI 화면 안의 `Picker`, `Button`, `Switch`는 같은 화면 루트의 `Host` 안에서 사용할 수 있다.
- React Native UI 안의 숫자 애니메이션, picker 또는 button 하나를 위해 별도 `Host`를 추가하지 않는다. 제품 핵심 경험이라는 주관적 예외도 두지 않는다.
- universal API가 필요한 Settings 동작을 제공하는 동안 iOS와 Android용 플랫폼별 트리를 따로 만들지 않는다.
- iOS와 시각적으로 같게 만들기 위해 Android 본문에 Large Title을 다시 구현하거나 Android 전용 Compose Top App Bar를 추가하지 않는다.
- 이 결정은 Glass와 blur의 구체적인 배치, fallback 또는 애니메이션 방식을 확정하지 않는다. 각 기능은 지원 플랫폼과 접근성 설정에서 별도로 검증한다.

## Why

화면 단위로 주 렌더러를 선택하면 React Native와 플랫폼 UI 사이의 크기 측정, safe area, 테마와 상태 전달 문제를 화면 곳곳에서 반복하지 않아도 된다. navigation title도 같은 의미를 공유하되 각 운영체제의 기본 위계로 표현하면 플랫폼별 별도 헤더를 만들지 않아도 된다. universal Settings는 하나의 트리로 각 운영체제의 네이티브 UI를 얻는다. 반면 `GlassView`와 `BlurView`는 React Native 트리 안에서 사용하는 API이므로, 필요한 플랫폼 표현을 얻으면서 화면 소유권은 React Native에 유지할 수 있다.

## Reconsider when

- 완결된 화면으로 만들 수 없으면서 React Native 또는 네이티브-backed RN 컴포넌트로 대체할 수 없는 필수 플랫폼 기능이 생긴다.
- Expo UI가 `Host` 경계의 레이아웃, 테마와 플랫폼 fallback을 React Native 컴포넌트와 동일한 수준으로 투명하게 처리한다.
