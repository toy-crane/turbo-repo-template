# 모바일 UI 렌더러 경계

## Decisions

- 앱 셸은 Expo Router Native Stack, NativeTabs, `Stack.Toolbar`와 native presentation이 소유한다. 헤더, 탭, 툴바, 시트, 전환 제스처와 Liquid Glass가 여기에 포함된다.
- Liquid Glass는 운영체제의 셸 표현이며 앱 테마나 콘텐츠 스타일로 구현하지 않는다.
- Settings와 system form은 `@expo/ui`, 일반 제품 콘텐츠는 React Native UI와 HeroUI Native OSS가 소유한다.
- 한 화면은 하나의 주 렌더러를 사용한다. `@expo/ui`의 `Host`는 해당 화면 루트에서 전체 본문을 소유한다.
- 독립된 시트와 모달은 Native Stack route로 표시한다. 짧은 작업은 `formSheet`, 화면 전체 흐름은 `pageSheet`이며 Settings는 네이티브 헤더와 닫기 툴바를 가진 `pageSheet`다.
- 최상위 화면 제목은 플랫폼의 native Stack 위계를 따른다. 적합한 iOS 첫 화면은 접히는 Large Title, Android는 기본 App Bar를 사용한다.
- 셸의 시스템 의미, 상태와 접근성 표현이 브랜드 스타일보다 우선한다.

## Boundaries

- Liquid Glass는 navigation과 functional control에만 사용하고 카드, 목록, 설정 섹션 같은 콘텐츠 surface에는 사용하지 않는다.
- 표준 네이티브 셸로 표현할 수 없는 중요한 floating control에만 custom Glass를 허용한다.
- 아바타처럼 이미지 자체가 기능 컨트롤인 경우에는 custom toolbar view를 허용한다.
- Android에서는 해당 플랫폼의 네이티브 표현을 사용하며 Liquid Glass를 모방하지 않는다.
- 브랜드 색상은 콘텐츠와 핵심 액션에 사용할 수 있지만 셸 전체를 착색하지 않는다.
- React Native UI 안의 개별 컨트롤을 위해 별도 `Host`를 만들거나 Settings를 플랫폼별 트리로 나누지 않는다.
- React Native UI 안의 HeroUI `BottomSheet`는 독립 화면이나 route-level presentation을 대체하지 않는다.
- 네이티브-backed React Native 컴포넌트는 React Native UI 소유권을 유지한다.

## Why

셸을 플랫폼 내비게이션에 맡기면 운영체제의 presentation, gesture, material과 접근성 적응을 보존할 수 있다. 화면별 주 렌더러와 Liquid Glass의 경계를 고정하면 여러 UI 시스템이 같은 surface를 중복해서 스타일링하지 않는다.

## Reconsider when

- Expo Router의 네이티브 API가 필수 navigation 동작을 지원하지 못한다.
- 완결된 화면으로 만들 수 없고 React Native UI로 대체할 수도 없는 필수 플랫폼 기능이 생긴다.
- Expo UI가 `Host` 경계의 레이아웃, 테마와 fallback을 React Native 컴포넌트처럼 투명하게 처리한다.
- Apple이 Liquid Glass의 레이어 또는 사용 원칙을 변경한다.
- 지원 플랫폼이나 최소 운영체제 정책이 변경된다.

## Still-rejected alternatives

- HeroUI `BottomSheet`로 독립 화면이나 route-level sheet를 표시 — Native Stack의 기본 header, toolbar, route 전환과 presentation 소유권을 잃는다. navigation 의미가 없는 동일 화면의 임시 패널 요구가 확인될 때만 다시 검토한다.
- Liquid Glass를 앱 테마로 만들거나 콘텐츠 surface에 수동 blur를 적용 — 셸과 콘텐츠의 레이어 경계가 사라지고 플랫폼 적응을 중복 구현하게 된다. 운영체제의 레이어 원칙이 바뀔 때만 다시 검토한다.
