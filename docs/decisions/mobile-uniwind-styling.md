# 모바일 Uniwind 스타일 경계

## 결정

- React Native UI에서 값이 고정된 색상, 간격, 크기, 정렬, 테두리, 모서리와 상태별 스타일은 지원되는 `className` 또는 `*ClassName` 속성으로 표현한다.
- 실행 중에만 알 수 있는 safe area, 키보드 위치, 측정 크기와 애니메이션 값은 `style`에 둔다. 외부 API가 `className`을 받지 않고 JavaScript 값만 받는 경우도 같은 경계를 따른다.
- 한 컴포넌트에서 두 방식을 함께 쓸 때는 `className`이 고정된 기본값을 맡고 `style`은 실행 중 계산한 차이만 맡는다. 같은 스타일 속성을 두 곳에서 함께 지정하지 않는다.
- 크기, 상태와 플랫폼처럼 선택지가 정해진 스타일은 완성된 클래스 문자열의 맵, 조건식 또는 `tailwind-variants`로 고른다. 클래스 이름 조각을 실행 중에 이어 붙이지 않는다.
- 호출자가 넘긴 `className`과 컴포넌트 기본 클래스를 합칠 때는 프로젝트의 `cn()`을 사용해 충돌을 정리한다.
- `color`처럼 스타일 밖의 색상 속성에 대응하는 `*ClassName`이 있으면 `accent-` 클래스로 시맨틱 토큰을 전달한다. 그런 속성이 없으면 작은 공용 어댑터가 전역 CSS의 시맨틱 색상을 JavaScript 값으로 읽어 전달한다.
- 재사용하는 외부 컴포넌트는 필요할 때 한 번만 `withUniwind`로 연결한다. 한 곳에서만 쓰는 `style` 전용 컴포넌트는 `useResolveClassNames`를 사용할 수 있다. React Native 기본 컴포넌트와 Reanimated 컴포넌트는 `withUniwind`로 감싸지 않는다.
- Uniwind와 별도로 TypeScript 팔레트나 같은 뜻의 토큰 계층을 만들지 않는다.

## 경계

- Expo Router의 네이티브 Stack, NativeTabs, `Stack.Toolbar`, `@expo/ui`의 `Host`와 호스팅된 SwiftUI·Compose는 각 API가 제공하는 스타일 방식을 유지한다. React Native UI의 `className` 규칙을 이 경계 너머에 강제로 적용하지 않는다.
- safe area, 키보드, 측정값, 애니메이션, 그라데이션 좌표와 런타임 변환은 `style` 또는 해당 API 속성에 남는다.
- Google과 Apple이 정한 버튼 및 마크 색상은 브랜드 값으로 직접 표현할 수 있다.
- 네이티브 시작 화면의 빌드 시점 색상 스냅샷은 [모바일 색상 시맨틱](mobile-color-semantics.md)의 예외를 따른다.
- 화면에 제품 스타일을 만들지 않는 기술용 루트나 외부 컴포넌트 연결부는 해당 API가 요구하는 `style`을 유지할 수 있다.
- 고정값이라는 이유만으로 모든 수치를 전역 토큰으로 올리지 않는다. 여러 화면에서 같은 제품 역할로 반복되는 것이 확인될 때만 새 시맨틱 역할을 검토한다.

## 이유

고정된 화면 규칙을 Uniwind에 모으면 React Native UI가 하나의 시맨틱 색상과 스타일 문법을 사용한다. 실행 중 계산값까지 클래스에 억지로 넣지 않으면 safe area, 측정과 애니메이션의 원인도 코드에서 분명하게 보인다. 이 경계는 원본이 둘로 갈라지는 일을 막으면서 `className`을 지원하지 않는 네이티브 API와 외부 컴포넌트도 그대로 사용할 수 있게 한다.

## 재검토 조건

- HeroUI Native와 Uniwind가 React Native UI의 기본 스타일 기반이 아니게 된다.
- Uniwind가 현재 `style`에 남긴 런타임 값을 안정적으로 직접 표현하게 된다.
- 같은 런타임 값 변환이 여러 곳에서 반복되어 작은 어댑터보다 별도 시맨틱 역할이 더 단순해진다.
- 외부 컴포넌트 연결부가 단순한 값 전달을 넘어 자체 스타일 체계로 커진다.

## 계속 제외하는 대안

- 모든 inline `style` 금지: safe area, 측정과 애니메이션의 런타임 값을 숨기거나 불필요한 우회 코드가 생긴다. Uniwind가 같은 값을 직접 다룰 수 있게 되면 다시 검토한다.
- 고정된 스타일도 모두 `style` 객체로 유지: React Native UI에 별도 간격과 색상 체계가 생겨 Uniwind 토큰과 어긋날 수 있다.
- 별도 TypeScript 토큰 팔레트 추가: 전역 CSS와 같은 값을 두 번 관리하게 된다. 클래스 밖의 소비처는 CSS 값을 읽는 작은 어댑터로 연결한다.
- React Native 기본 컴포넌트를 `withUniwind`로 감싸기: 이미 `className`을 지원하는 경로를 중복하고 Uniwind가 보장하는 기본 연결을 벗어난다.

## 보존할 근거

- 2026-08-14 정적 점검에서 React Native UI의 원시 Tailwind 팔레트 클래스는 0건이었다. 직접 쓴 HEX 14건은 Google과 Apple 버튼 및 마크에만 있었다.
- 같은 점검에서 고정된 스타일이 inline `style`에 남은 직접 누락 3곳과 고정값과 런타임 값이 섞인 후보 3곳을 확인했다.
- iOS Development Build에서 로그인, 온보딩, Home, Activity, Saved, 채팅과 Settings를 Light 및 Dark 모드로 확인했으며 화면 모드 사이의 눈에 띄는 시맨틱 색상 단절은 없었다.
