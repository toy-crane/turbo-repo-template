# 모바일 아이콘 렌더링

## Decisions

- React Native UI의 시스템 아이콘은 `expo-symbols`의 `SymbolView`로 렌더링한다.
- 하나의 아이콘 의미에 iOS SF Symbol과 Android Material Symbol 이름을 함께 지정한다. SF Symbol 문자열 하나만 전달하는 iOS 전용 사용은 하지 않는다.
- 네이티브 셸의 아이콘은 Expo Router의 tab, toolbar와 menu icon API가 렌더링한다.
- `@expo/ui`의 `Host` 안에 아이콘이 필요하면 universal `Icon`을 사용한다. `SymbolView`를 `Host` 안에 삽입하지 않는다.
- 시스템 심벌로 표현할 수 없는 브랜드 로고나 고유 그래픽만 이미지 또는 SVG asset으로 제공한다.

## Boundaries

- 최초 셸에는 별도의 범용 아이콘 폰트나 서드파티 아이콘 디자인 시스템을 추가하지 않는다.
- 플랫폼별 심벌의 세부 모양이 다른 것은 의도된 차이다. Home, Activity, Settings처럼 의미와 접근성 label은 플랫폼 사이에서 동일하게 유지한다.
- 아이콘 색상은 적용되는 표면의 시맨틱 색상을 사용한다. 탭의 선택·비선택 색상과 애니메이션은 탭 컴포넌트가 소유한다.
- 아이콘이 단독으로 동작을 전달하면 그 아이콘을 소유한 button, tab 또는 control이 접근성 label을 제공한다.

## Why

현재 셸은 플랫폼 관례를 따르는 표현과 낮은 구현 복잡도를 우선한다. `expo-symbols`는 React Native UI에서 각 운영체제의 시스템 심벌을 사용할 수 있고, 선택한 Glass 탭도 같은 렌더러를 기본으로 사용한다. 네이티브 셸과 `Host` 내부에서는 각 표면의 소유 API를 사용해야 네이티브 상태, tint와 접근성 동작을 보존할 수 있다.

## Reconsider when

- 중요한 제품 개념을 표현할 적절한 SF Symbol 또는 Material Symbol이 없다.
- 플랫폼마다 같은 실루엣을 유지해야 하는 브랜드 아이콘 언어가 제품 요구사항으로 정해진다.
- 시스템 심벌의 플랫폼별 차이 때문에 사용자가 같은 기능으로 인식하지 못한다는 검증 결과가 나온다.

## Still-rejected alternatives

- 범용 아이콘 폰트 — 두 플랫폼에서 같은 모양을 만들 수 있지만 현재 필요한 시스템 아이콘을 위해 별도 폰트와 API를 추가할 이유가 없다. 브랜드 아이콘 체계가 필요해지면 재검토한다.
- 서드파티 SVG 아이콘 세트 — 세밀한 시각 통일에는 유리하지만 현재의 플랫폼 네이티브 방향과 placeholder 범위에는 불필요하다. 시스템 심벌의 한계가 실제로 확인되면 재검토한다.

## Evidence worth preserving

- 선택한 `expo-glass-tabs` `0.1.1`의 기본 아이콘 경로는 `expo-symbols`의 `SymbolView`를 사용한다.
- 현재 `expo-symbols`에서 이름을 문자열 하나로 전달하면 SF Symbol로 취급된다. Android에도 표시하려면 플랫폼별 이름 객체가 필요하다.
