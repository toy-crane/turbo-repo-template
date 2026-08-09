# 모바일 색상 시맨틱

## 결정

- React Native UI의 런타임 색상 원본은 Uniwind가 읽는 전역 CSS 한 곳에 둔다.
- 앱은 HeroUI Native의 시맨틱 변수 문법을 공식 색상 이름으로 사용한다. 기본 역할은 `background`, `foreground`, `surface`, `surface-foreground`이며 필요한 역할은 HeroUI Native의 시맨틱 변수 집합 안에서 추가한다.
- React Native UI와 HeroUI Native 컴포넌트는 `bg-background`, `text-foreground`, `bg-surface` 같은 Uniwind 클래스를 사용한다. 별도의 TypeScript 색상 팔레트나 같은 의미의 프로젝트 전용 토큰 계층은 두지 않는다.
- 기본 팔레트가 필요하면 전역 CSS 안의 구현 세부사항으로 둔다. 화면과 컴포넌트는 기본 색상이나 HEX 값이 아니라 시맨틱 클래스 또는 변수를 사용한다.
- 화면 모드는 운영체제 설정을 따르는 `automatic`으로 고정한다. 앱 안에 별도의 테마 선택이나 저장 기능을 두지 않는다.
- 초기 색상값은 다음과 같다.

| 역할 | Light | Dark |
| --- | --- | --- |
| `background` | `#F4F4F6` | `#0B0B0D` |
| `foreground` | `#111114` | `#FFFFFF` |
| `surface` | `#FFFFFF` | `#1A1A1E` |

- 클래스를 사용할 수 없는 Expo Router, 네이티브 Stack 옵션과 루트 창에는 얇은 테마 브리지가 Uniwind 변숫값을 전달한다. 이 브리지는 색상을 정의하지 않는다.
- Expo Router 내비게이션 테마의 `background`와 `card`는 HeroUI의 `background`에 연결하고, `text`는 `foreground`에 연결한다. 기본 내비게이션 테마의 시스템 폰트는 덮어쓰지 않는다.
- 네이티브 루트 창의 배경도 HeroUI의 `background`와 동기화한다. 상태 표시줄 스타일은 화면 모드를 자동으로 따른다.

## 경계

- HeroUI의 `background`, `foreground`와 `surface`는 React Native UI의 공식 역할명이다. 같은 역할을 `background.canvas`, `text.primary` 같은 별도 이름으로 다시 정의하지 않는다.
- `background`는 앱과 라우트 컨테이너의 가장 바깥 배경을 뜻한다. `surface`는 카드와 패널 같은 콘텐츠 표면을 뜻한다. `surface-foreground`, `accent-foreground`처럼 특정 배경 위의 대비색은 독립된 역할로 관리한다.
- 특정 컴포넌트나 제품 도메인 전용 토큰은 HeroUI의 공통 역할과 상태로 의미를 표현할 수 없다는 것이 실제 화면에서 확인된 경우에만 추가한다.
- React Navigation의 `card`는 라이브러리가 정한 필드명이며 앱 콘텐츠의 `surface`를 뜻하지 않는다. 최초 셸에서는 네이티브 내비게이션 표면이 화면 바탕과 이어지도록 `background`에 연결한다.
- 플랫폼 UI가 소유하는 컨트롤 내부 색상과 상태는 해당 플랫폼의 기본 시맨틱 표현을 유지한다. 앱 팔레트를 모든 네이티브 요소에 강제로 주입하지 않는다.
- Uniwind CSS 변수는 `@expo/ui`의 `Host` 안에 자동 전파되지 않는다. 브랜드 연결이 실제로 필요할 때만 `accent`를 `seedColor` 같은 지원 API로 명시적으로 전달한다.
- 네이티브 시작 화면은 런타임 CSS를 읽지 못한다. 따라서 앱 설정에 Light/Dark `background`의 빌드 시점 스냅샷을 둘 수 있다. 이 예외는 런타임 색상 원본을 하나 더 만드는 근거가 되지 않는다.
- 이 결정은 `accent`, `critical`, `success` 같은 제품 상태 색상의 실제 값을 확정하지 않는다.

## 이유

HeroUI Native가 이미 제공하는 시맨틱 문법을 앱의 공식 이름으로 사용하면 React Native UI가 Uniwind 클래스와 컴포넌트 기본 스타일을 같은 값에서 얻는다. 별도 TypeScript 팔레트와 토큰 번역을 제거하면서도 색상값이 아니라 역할로 스타일을 선택할 수 있다. 클래스를 사용할 수 없는 네이티브 셸에는 같은 CSS 값을 읽는 단방향 브리지만 둔다. 이 브리지는 화면 전환과 경계 너머 스크롤 중에 다른 배경이 노출되는 일을 막는다. 호스팅된 SwiftUI와 Compose는 CSS 구현을 공유하지 않는다. 같은 화면 모드와 필요한 브랜드 의도만 플랫폼 API로 전달받는다.

## 재검토 조건

- HeroUI Native와 Uniwind가 React Native UI의 기본 스타일 기반이 아니게 된다.
- 실제 제품 역할을 HeroUI 시맨틱 변수로 표현할 수 없어 반복적인 오용이나 양방향 변환이 생긴다.
- 사용자가 앱 안에서 시스템과 다른 화면 모드를 선택해야 하는 제품 요구가 생긴다.

## 계속 제외하는 대안

- TypeScript 시맨틱 팔레트를 별도 원본으로 유지: Uniwind와 값 및 화면 모드를 동기화해야 하므로 원본이 두 개 생긴다. CSS 클래스를 사용할 수 없는 소비처는 CSS 값을 읽는 단방향 브리지로 해결한다.
- `background.canvas`, `text.primary` 같은 프로젝트 전용 문법을 HeroUI 변수 위에 유지: 현재 역할이 1:1로 대응하는데도 두 이름을 계속 번역해야 한다. HeroUI 문법이 실제 제품 의미를 표현하지 못한다는 증거가 생기면 다시 검토한다.
