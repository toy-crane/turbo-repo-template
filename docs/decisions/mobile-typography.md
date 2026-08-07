# 모바일 타이포그래피

## Decisions

- 모바일 앱은 커스텀 폰트 파일을 번들하지 않고 각 플랫폼의 시스템 폰트 스택을 사용한다. iOS는 Apple 시스템 폰트의 기본 디자인을, Android는 Android 시스템 기본 폰트를 따른다.
- 텍스트 일관성의 기준은 글꼴 이름이나 고정 수치가 아니라 시맨틱 텍스트 역할이다. 글자 크기와 접근성 확대의 기준은 Apple의 `largeTitle`, `title2`, `body`, `headline`, `footnote`, `caption2` 같은 시맨틱 텍스트 스타일이다.
- 제품 용어에 맞춘 `screenTitle`, `control`, `tabLabel` 같은 역할 이름이 필요하면 대응하는 시맨틱 텍스트 스타일을 명시한다. 역할 집합과 예외는 실제 화면에 필요한 만큼만 추가한다.
- React Native UI는 공통 역할을 크기, 행간, 굵기와 `dynamicTypeRamp`에 매핑하되 `fontFamily`를 지정하지 않고 시스템 글자 크기 확대를 유지한다.
- 호스팅된 SwiftUI는 같은 공통 역할을 네이티브 `textStyle`과 굵기에 매핑하고 기본 font design을 유지한다. 네이티브 셸은 운영체제가 소유한 텍스트 위계와 기본 스타일을 유지한다.
- 렌더러 간 일관성은 픽셀과 글리프의 완전한 동일성이 아니라 같은 역할, 위계, 강조와 접근성 동작으로 판단한다.

## Boundaries

- `ui-rounded`, serif, monospace 또는 브랜드 폰트는 전역 기본값이 아니다. 특정 기능에 필요한 경우 별도 결정을 거친 지역적 예외로만 사용한다.
- 탭 라벨처럼 공간이 제한된 UI 크롬은 큰 접근성 글자 크기에서 실제 레이아웃을 검증한 뒤 해당 요소에만 확대 제한을 둘 수 있다. 본문과 주요 콘텐츠에 전역 제한을 적용하지 않는다.
- 텍스트 색상과 정렬은 이 결정의 범위가 아니다. 컴포넌트가 바꿀 수 있지만 텍스트 역할의 크기, 행간과 굵기 위계를 훼손하지 않아야 한다.

## Why

시스템 폰트와 시맨틱 텍스트 스타일을 함께 사용하면 React Native UI, 호스팅된 SwiftUI와 네이티브 셸이 각 렌더러의 네이티브 동작을 유지하면서 동일한 정보 위계를 표현할 수 있다. 운영체제의 언어별 폰트 선택과 Dynamic Type을 보존하고, 커스텀 폰트 로딩 및 굵기별 face 관리도 피한다.

Clarity는 SF Pro Rounded의 굵기별 파일을 번들하고 각 face를 `fontFamily`로 선택해 시각적 인상을 통일했다. 이 프로젝트는 Apple 시스템 폰트의 기본 디자인을 그대로 사용하기로 했으므로 그 자산 구조를 복제하지 않고, Clarity가 중앙화하지 않은 텍스트 역할을 프로젝트의 일관성 기준으로 삼는다.

## Reconsider when

- 브랜드 정체성이 플랫폼별 시스템 폰트보다 동일한 전용 서체를 요구한다.
- 지원 플랫폼이나 렌더러가 필요한 시맨틱 역할 또는 접근성 확대를 표현하지 못한다.
- 한국어와 영어, 기본 및 접근성 글자 크기의 실제 화면 검증에서 역할 매핑이 읽기 위계나 레이아웃을 반복적으로 훼손한다.

## Still-rejected alternatives

- SF Pro 또는 SF Pro Rounded 파일 번들 — 플랫폼 기본 디자인이라는 선택과 충돌하고 폰트 로딩 및 굵기별 face 관리를 추가한다. 브랜드 서체가 필요해질 때만 다시 검토한다.
- 화면마다 `fontSize`, `fontWeight`, `lineHeight` 직접 지정 — 같은 역할이 기능별로 달라지는 드리프트를 막지 못한다.
- 모든 렌더러에 동일한 고정 수치 적용 — 네이티브 텍스트 위계와 Dynamic Type을 약화하고 렌더러 차이를 불필요하게 숨긴다.

## Evidence worth preserving

- React Native는 앱 전체 텍스트의 전역 스타일 상속 대신 공통 Text 컴포넌트를 권장한다: <https://reactnative.dev/docs/text#limited-style-inheritance>
- React Native의 iOS `dynamicTypeRamp`는 `largeTitle`부터 `caption2`까지 시맨틱 단계를 제공한다: <https://reactnative.dev/docs/text#dynamictyperamp>
- Expo UI의 SwiftUI `font` modifier는 `textStyle` 사용 시 Dynamic Type에 맞춰 확대된다: <https://docs.expo.dev/versions/v57.0.0/sdk/ui/swift-ui/modifiers/#fontparams>
- Clarity의 `c734cfb` 커밋은 SF Pro Rounded Regular부터 Heavy까지를 번들하고 굵기를 별도 font family로 매핑했다: <https://github.com/SchroederNathan/clarity/commit/c734cfb9cc89acd195517099c2c0380737efa186>
