# 모바일 색상 시맨틱

## Decisions

- 모바일 앱의 색상 이름은 실제 색상값이나 특정 컴포넌트가 아니라 적용 대상과 의도를 표현한다.
- 시맨틱 색상 이름은 `color.{property}.{role}.{emphasis}.{state}` 순서를 따른다. 코드가 `colors` 객체 안에 있으면 `color` 접두사는 생략해 `colors.background.canvas`처럼 사용한다.
- 기본 property는 `background`, `text`, `icon`, `border`로 분리한다. `primary`처럼 의미가 겹치는 단어는 단독으로 사용하지 않고 `text.primary`, `background.accent`처럼 적용 대상을 붙인다.
- interaction state는 이름의 마지막에 둔다. 예를 들어 `background.surface.pressed`, `background.accent.disabled`, `border.critical.focused`처럼 표현한다.
- primitive palette가 필요하면 시맨틱 계층 아래의 구현 세부사항으로 둔다. 화면과 컴포넌트는 primitive나 HEX 값이 아니라 시맨틱 색상만 사용한다.
- 플랫폼 UI는 동일한 시맨틱 의미를 해당 플랫폼의 동적 색상에 매핑한다. 예를 들어 `text.primary`는 iOS의 `label`과 Android의 `onSurface`, `border.separator`는 iOS의 `separator`와 Android의 `outlineVariant`에 대응할 수 있다.
- appearance는 운영체제 설정을 따르는 `automatic`으로 고정한다. 앱 안에 별도의 테마 선택이나 저장 기능을 두지 않는다.
- 최초 앱 소유 색상은 `background.canvas`가 light `#F4F4F6`, dark `#0B0B0D`, `text.primary`가 light `#111114`, dark `#FFFFFF`, `background.surface`가 light `#FFFFFF`, dark `#1A1A1E`다.
- Expo Router의 navigation theme에서 `background`와 `card`는 `background.canvas`, `text`는 `text.primary`에 연결한다. 기본 navigation theme의 시스템 폰트는 덮어쓰지 않는다.
- 네이티브 root window의 배경도 `background.canvas`와 동기화하고 status bar 스타일은 appearance를 자동으로 따른다.

## Boundaries

- `foreground`, `card`, `primary`, `gray500`, `white`, `black`처럼 적용 대상이나 의도가 불명확한 이름은 앱 전역 시맨틱 토큰으로 사용하지 않는다.
- `background.canvas`는 앱과 route container의 가장 바깥 배경, `background.surface`는 카드와 패널 같은 콘텐츠 표면을 뜻한다. React Navigation의 `colors.card`에는 필요한 시맨틱 토큰을 명시적으로 매핑하며 같은 이름이라는 이유로 콘텐츠 surface와 결합하지 않는다.
- `text.onAccent`와 `icon.onAccent`처럼 특정 배경 위의 대비색은 독립된 역할로 관리한다. accent 색상 하나를 텍스트, 아이콘과 배경에 무조건 재사용하지 않는다.
- 특정 컴포넌트 전용 토큰은 공통 시맨틱 역할과 상태로 표현할 수 없다는 것이 실제 화면에서 확인된 경우에만 추가한다.
- navigation theme의 `card`는 라이브러리가 정한 필드명이며 앱 콘텐츠의 `background.surface`를 뜻하지 않는다. 최초 셸에서는 네이티브 내비게이션 표면이 화면 바탕과 이어지도록 `background.canvas`에 연결한다.
- 플랫폼 UI가 소유하는 컨트롤 내부 색상과 상태는 해당 플랫폼의 기본 시맨틱 표현을 유지한다. 앱 팔레트를 모든 네이티브 요소에 강제로 주입하지 않는다.
- 이 결정은 accent, critical, success 같은 제품 상태 색상의 실제 값을 확정하지 않는다.

## Why

property와 역할을 먼저 적으면 색상값, appearance와 렌더러가 달라져도 사용 의도가 유지된다. React Native UI, 호스팅된 SwiftUI와 Compose, 네이티브 셸은 같은 의미를 공유하면서 각 플랫폼의 시스템 색상 및 접근성 동작에 맞는 값을 선택할 수 있다. 앱 바탕, navigation container와 네이티브 window를 같은 canvas에 연결하면 전환과 overscroll 중 다른 배경이 노출되지 않는다.

## Reconsider when

- 선택한 UI 프레임워크가 다른 토큰 문법을 필수로 요구해 지속적인 양방향 변환이 필요하다.
- 실제 화면에서 property-first 구조보다 대비색 쌍이나 컴포넌트 전용 토큰이 오류를 더 잘 방지한다는 반복 가능한 증거가 나온다.
- 사용자가 앱 안에서 시스템과 다른 appearance를 선택해야 하는 제품 요구가 생긴다.
