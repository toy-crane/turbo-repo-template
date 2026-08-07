# 모바일 색상 시맨틱

## Decisions

- 모바일 앱의 색상 이름은 실제 색상값이나 특정 컴포넌트가 아니라 적용 대상과 의도를 표현한다.
- 시맨틱 색상 이름은 `color.{property}.{role}.{emphasis}.{state}` 순서를 따른다. 코드가 `colors` 객체 안에 있으면 `color` 접두사는 생략해 `colors.background.canvas`처럼 사용한다.
- 기본 property는 `background`, `text`, `icon`, `border`로 분리한다. `primary`처럼 의미가 겹치는 단어는 단독으로 사용하지 않고 `text.primary`, `background.accent`처럼 적용 대상을 붙인다.
- interaction state는 이름의 마지막에 둔다. 예를 들어 `background.surface.pressed`, `background.accent.disabled`, `border.critical.focused`처럼 표현한다.
- primitive palette가 필요하면 시맨틱 계층 아래의 구현 세부사항으로 둔다. 화면과 컴포넌트는 primitive나 HEX 값이 아니라 시맨틱 색상만 사용한다.
- 플랫폼 UI는 동일한 시맨틱 의미를 해당 플랫폼의 동적 색상에 매핑한다. 예를 들어 `text.primary`는 iOS의 `label`과 Android의 `onSurface`, `border.separator`는 iOS의 `separator`와 Android의 `outlineVariant`에 대응할 수 있다.

## Boundaries

- `foreground`, `card`, `primary`, `gray500`, `white`, `black`처럼 적용 대상이나 의도가 불명확한 이름은 앱 전역 시맨틱 토큰으로 사용하지 않는다.
- `background.canvas`는 앱과 route container의 가장 바깥 배경, `background.surface`는 카드와 패널 같은 콘텐츠 표면을 뜻한다. React Navigation의 `colors.card`에는 필요한 시맨틱 토큰을 명시적으로 매핑하며 같은 이름이라는 이유로 콘텐츠 surface와 결합하지 않는다.
- `text.onAccent`와 `icon.onAccent`처럼 특정 배경 위의 대비색은 독립된 역할로 관리한다. accent 색상 하나를 텍스트, 아이콘과 배경에 무조건 재사용하지 않는다.
- 특정 컴포넌트 전용 토큰은 공통 시맨틱 역할과 상태로 표현할 수 없다는 것이 실제 화면에서 확인된 경우에만 추가한다.
- 이 결정은 light 또는 automatic appearance, 실제 색상값과 최초 토큰 전체 목록을 확정하지 않는다.

## Why

property와 역할을 먼저 적으면 색상값, appearance와 렌더러가 달라져도 사용 의도가 유지된다. React Native UI, 호스팅된 SwiftUI와 네이티브 셸은 같은 토큰 이름을 공유하면서 각 플랫폼의 시스템 색상 및 접근성 동작에 맞는 값을 선택할 수 있다. 상태를 마지막에 두면 토큰이 늘어나도 검색과 확장이 예측 가능하다.

## Reconsider when

- 선택한 UI 프레임워크가 다른 토큰 문법을 필수로 요구해 지속적인 양방향 변환이 필요하다.
- 실제 화면에서 property-first 구조보다 대비색 쌍이나 컴포넌트 전용 토큰이 오류를 더 잘 방지한다는 반복 가능한 증거가 나온다.

## Still-rejected alternatives

- Clarity의 `background`, `foreground`, `card` 세 이름만 사용 — 작은 화면에는 간결하지만 텍스트, 아이콘, 상태와 Navigation `card` 의미가 늘어날 때 모호해진다.
- Material의 `primary`, `onPrimary`, `surface`, `onSurface`를 앱 전역 이름으로 직접 사용 — Android에는 자연스럽지만 Apple의 label 및 계층형 background 의미와 제품별 적용 대상을 충분히 구분하지 못한다.
- 화면에서 primitive 또는 HEX 직접 사용 — appearance와 플랫폼 매핑을 우회하고 같은 역할의 색상 드리프트를 만든다.

## Evidence worth preserving

- Apple의 UI element colors는 값이 아니라 사용 목적을 이름으로 표현하고 appearance에 동적으로 적응한다: <https://developer.apple.com/documentation/uikit/ui-element-colors>
- Atlassian은 `color.background.danger.bold.pressed`처럼 property, 역할, 강조와 상태 순으로 토큰을 구성한다: <https://atlassian.design/foundations/color-new/>
- Shopify Polaris도 element, role, prominence와 state 순서를 사용한다: <https://polaris-react.shopify.com/design/colors/color-tokens>
