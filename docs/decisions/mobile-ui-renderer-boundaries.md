# 모바일 UI 렌더러 경계

## Decisions

- 네이티브 셸은 플랫폼 내비게이션이 소유한다. 네이티브 헤더, 툴바, 모달 표시 방식과 전환 제스처가 여기에 포함된다.
- 화면 콘텐츠는 React Native UI를 기본으로 한다.
- 호스팅된 SwiftUI는 Settings처럼 플랫폼 관례가 화면 전체의 핵심인 경우에만 사용한다. `Host`는 해당 라우트의 루트에서 화면 전체를 소유해야 한다.
- React Native 컴포넌트 내부에 개별 SwiftUI 컨트롤을 넣기 위한 `Host`는 만들지 않는다.
- `GlassView`와 `BlurView` 같은 네이티브-backed RN 컴포넌트는 React Native UI 안에서 필요한 곳에 사용할 수 있다. 네이티브 구현을 사용한다는 이유만으로 호스팅된 SwiftUI로 분류하지 않는다.

## Boundaries

- 호스팅된 SwiftUI 화면 안의 `Picker`, `Button`, `Toggle`은 같은 화면 루트의 `Host` 안에서 사용할 수 있다.
- React Native UI 안의 숫자 애니메이션, picker 또는 button 하나를 위해 별도 `Host`를 추가하지 않는다. 제품 핵심 경험이라는 주관적 예외도 두지 않는다.
- 이 결정은 Glass와 blur의 구체적인 배치, fallback 또는 애니메이션 방식을 확정하지 않는다. 각 기능은 지원 플랫폼과 접근성 설정에서 별도로 검증한다.
- 이 결정은 Android에서 Settings에 대응하는 화면의 렌더러를 확정하지 않는다.

## Why

화면 단위로 주 렌더러를 선택하면 React Native와 SwiftUI 사이의 크기 측정, baseline, safe area, 테마와 상태 전달 문제를 화면 곳곳에서 반복하지 않아도 된다. 반면 `GlassView`와 `BlurView`는 React Native 트리 안에서 사용하는 API이므로, 필요한 플랫폼 표현을 얻으면서 화면 소유권은 React Native에 유지할 수 있다. `Host`의 위치만 확인하면 규칙을 적용할 수 있어 컴포넌트마다 예외의 가치를 다시 판단할 필요도 없다.

## Reconsider when

- 완결된 화면으로 만들 수 없으면서 React Native 또는 네이티브-backed RN 컴포넌트로 대체할 수 없는 필수 플랫폼 기능이 생긴다.
- Expo UI가 `Host` 경계의 레이아웃, 테마와 플랫폼 fallback을 React Native 컴포넌트와 동일한 수준으로 투명하게 처리한다.

## Still-rejected alternatives

- 호스팅된 SwiftUI를 전혀 사용하지 않음 — Settings처럼 플랫폼 관례가 화면 전체의 가치인 경우까지 포기한다. 그런 화면도 React Native UI가 더 적합하다는 실제 증거가 생기면 재검토한다.
- 효과가 명확한 개별 SwiftUI 컴포넌트만 예외적으로 허용 — 무엇이 핵심 효과인지 매번 다시 판단하게 되고 작은 `Host` 경계를 화면 곳곳에 만든다.
- 네이티브-backed RN 컴포넌트까지 금지 — `Host` 없이 사용할 수 있는 플랫폼 표현을 불필요하게 배제한다.

## Evidence worth preserving

- Expo UI의 SwiftUI 컴포넌트는 React Native에서 사용할 때 `Host`로 감싸야 한다: <https://docs.expo.dev/versions/latest/sdk/ui/swift-ui/>
- Expo GlassEffect의 `GlassView`는 React 컴포넌트이며 내부적으로 iOS의 네이티브 `UIVisualEffectView`를 렌더링한다: <https://docs.expo.dev/versions/latest/sdk/glass-effect/>
- Expo BlurView는 하위 콘텐츠를 흐리게 표시하는 React 컴포넌트다: <https://docs.expo.dev/versions/latest/sdk/blur-view/>
- Clarity의 호스팅된 SwiftUI 숫자는 안정적인 flex 배치와 safe area를 위해 별도 보정이 필요했다: <https://github.com/SchroederNathan/clarity/blob/main/components/animated-rounded-number.ios.tsx>
