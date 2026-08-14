# 모바일 Uniwind 스타일 일관성 명세

## 목표

React Native UI의 고정된 화면 규칙을 Uniwind로 표현한다. 실행 중 계산값과 네이티브 경계는 현재 방식을 유지한다. 화면 디자인과 실제 동작은 바꾸지 않는다.

## 적용할 결정

- [모바일 Uniwind 스타일 경계](../../decisions/mobile-uniwind-styling.md)
- [모바일 색상 시맨틱](../../decisions/mobile-color-semantics.md)
- [모바일 UI 렌더러 경계](../../decisions/mobile-ui-renderer-boundaries.md)
- [모바일 타이포그래피](../../decisions/mobile-typography.md)
- [모바일 아이콘 렌더링](../../decisions/mobile-icon-rendering.md)
- [모바일 테스트와 런타임 검증](../../decisions/mobile-testing-and-verification.md)

## 현재 기준

- React Native UI에서 원시 Tailwind 팔레트 클래스를 사용한 곳은 없다.
- 직접 쓴 HEX 14건은 Google과 Apple 버튼 및 마크에만 있다. 이 값은 브랜드 예외다.
- iOS Development Build에서 로그인, 온보딩, Home, Activity, Saved, 채팅과 Settings를 Light 및 Dark 모드로 확인했다. 화면 모드 사이에서 눈에 띄는 시맨틱 색상 단절은 없었다.
- 고정된 스타일이 inline `style`에 남은 직접 누락 3곳과 고정값과 런타임 값이 섞인 후보 3곳이 이번 작업의 전체 범위다.

## 확정한 범위

### 직접 누락

- `SessionCheckingScreen`의 고정된 전체 화면 배치와 배경은 Uniwind 시맨틱 클래스로 표현한다. 로그인 상태를 확인하는 동안 빈 화면을 유지하는 동작은 바꾸지 않는다.
- `LatestMessageButton`의 React Native 대체 원은 고정된 크기, 정렬, 모서리와 `surface` 색상을 클래스로 표현한다. `GlassView`가 소유하는 Liquid Glass 경계는 그대로 둔다.
- `WaitingAnswer`의 React Native 기본 레이어는 `muted` 배경을 클래스로 표현한다. 그라데이션 색상, 이동 애니메이션과 `Animated.View` 스타일은 런타임 값으로 남긴다.

### 혼합 구간

- `AuthScreen`은 고정된 좌우 및 기본 여백을 클래스로 표현하고 실제 safe area로 계산한 값만 `style`에 둔다. 같은 padding 속성을 두 경로에 함께 지정하지 않는다.
- 공용 `Button`은 크기별 고정 배치와 내부 정렬을 완성된 클래스 변형으로 표현한다. 대기 상태에서 보존하는 측정 크기와 호출자가 넘긴 런타임 `style`은 유지한다. Dynamic Type에서 높이가 늘어나는 동작도 그대로 둔다.
- 공용 `Icon`은 감싸는 뷰의 크기를 완성된 클래스 맵으로 표현한다. Lucide에 넘기는 숫자 크기와 공용 어댑터가 읽은 시맨틱 색상은 JavaScript 속성으로 유지한다.

### 공통 규칙

- 고정된 색상은 원시 팔레트나 HEX가 아니라 기존 시맨틱 토큰을 사용한다.
- 선택지가 있는 스타일은 완성된 클래스 문자열로 고른다. 클래스 이름 조각을 실행 중에 이어 붙이지 않는다.
- `className`과 `style`은 같은 속성을 함께 지정하지 않는다.
- 현재 보이는 값과 동작을 보존한다. 새 전역 토큰, TypeScript 팔레트 또는 프로젝트 전용 스타일 계층을 만들지 않는다.
- 고정된 특수 수치가 기존 Uniwind 간격 눈금과 정확히 맞지 않으면 현재 값을 보존한다. 같은 제품 역할이 반복되기 전에는 전역 토큰으로 올리지 않는다.

## 제외할 범위

- `@expo/ui`의 `Host`와 호스팅된 SwiftUI·Compose
- Expo Router의 네이티브 Stack, NativeTabs, `Stack.Toolbar`와 내비게이션 테마 브리지
- Google과 Apple 버튼 및 마크의 브랜드 색상
- 네이티브 시작 화면과 앱 에셋
- safe area, 키보드, 측정값, 애니메이션, 그라데이션 좌표와 런타임 변환
- 화면 디자인, 색상값, 간격값, 글자 크기와 상호작용 변경
- 이번 점검에서 찾지 않은 inline `style`의 일괄 정리
- inline `style`을 금지하는 lint 규칙 또는 자동 검사 추가

## 완료 조건

1. 직접 누락 3곳의 React Native 뷰에는 고정된 제품 스타일을 담은 inline `style`이 남지 않는다.
2. 혼합 구간 3곳은 고정값과 런타임 값을 나누며 같은 속성을 두 경로에서 지정하지 않는다.
3. 새 원시 팔레트 클래스, 새 HEX 색상과 별도 토큰 계층이 생기지 않는다.
4. Light 및 Dark 모드에서 대상 화면의 시맨틱 색상 역할과 기존 배치가 유지된다.
5. 인증 화면의 safe area와 키보드 배치, 버튼의 Dynamic Type 및 대기 상태 크기, 아이콘 크기, 답변 대기 애니메이션과 최신 메시지 버튼의 플랫폼별 표현이 그대로 동작한다.
6. iOS와 Android Development Build에서 대상 화면을 확인한다. 자동 테스트는 고정된 변형 선택과 기존 상태 동작을 확인한다.
7. 저장소의 타입 검사, 정적 검사와 관련 자동 테스트를 통과한다.

## 가정

- 구현하는 동안 `uniwind 1.10.1`과 `heroui-native 1.0.8`을 유지한다.
- 현재 전역 CSS의 시맨틱 토큰과 화면별 디자인 값은 바꾸지 않는다.
- inline `style`의 전체 개수는 성공 기준이 아니다. 고정된 제품 스타일이 올바른 경로에 있는지를 기준으로 삼는다.

## 남은 위험

- inline `style`에는 허용한 런타임 값과 놓친 고정값이 함께 나타날 수 있어 개수만 세는 자동 검사는 거짓 경고를 낸다.
- 이번 기준 점검은 iOS에서만 화면을 직접 확인했다. Android의 실제 화면 보존 여부는 구현 검증에서 확인해야 한다.
- 외부 컴포넌트가 `className`을 지원하지 않는 속성은 작은 어댑터가 계속 필요하다.
- 자동 lint 규칙을 두지 않으므로 이후 코드 리뷰에서 이 결정 계약을 확인해야 한다.

## 상태

ready for implementation
