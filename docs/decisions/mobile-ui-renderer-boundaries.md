# 모바일 UI 렌더러 경계

## 결정

- 앱 셸은 Expo Router Native Stack, NativeTabs, `Stack.Toolbar`와 네이티브 표시 방식이 소유한다. 헤더, 탭, 툴바, 시트, 전환 제스처와 Liquid Glass가 여기에 포함된다.
- Liquid Glass는 운영체제의 셸 표현이며 앱 테마나 콘텐츠 스타일로 구현하지 않는다.
- Settings와 시스템 폼은 `@expo/ui`가 소유한다. 일반 제품 콘텐츠는 React Native UI와 HeroUI Native OSS가 소유한다.
- 한 화면은 하나의 주 렌더러를 사용한다. `@expo/ui`의 `Host`는 해당 화면 루트에서 전체 본문을 소유한다.
- 독립된 시트와 모달은 Native Stack 라우트로 표시한다. 짧은 작업은 `formSheet`, 화면 전체 흐름은 `pageSheet`를 사용한다. Settings는 네이티브 헤더와 닫기 툴바를 가진 `pageSheet`다.
- 뒤로 가기 컨트롤에는 이름을 붙이지 않는다. 셰브론만 두고 이전 화면 제목을 함께 적지 않는다.
- 최상위 화면 제목은 플랫폼의 네이티브 Stack 위계를 따른다. 적합한 iOS 첫 화면은 접히는 Large Title을 사용하고 Android는 기본 App Bar를 사용한다.
- 셸의 시스템 의미, 상태와 접근성 표현이 브랜드 스타일보다 우선한다.

## 경계

- Liquid Glass는 내비게이션과 기능 컨트롤에만 사용한다. 카드, 목록, 설정 섹션 같은 콘텐츠 표면에는 사용하지 않는다.
- 표준 네이티브 셸로 표현할 수 없는 중요한 플로팅 컨트롤에만 커스텀 Glass를 허용한다.
- 아바타처럼 이미지 자체가 기능 컨트롤이면 커스텀 툴바 뷰를 허용한다.
- Android에서는 해당 플랫폼의 네이티브 표현을 사용하며 Liquid Glass를 모방하지 않는다.
- 브랜드 색상은 콘텐츠와 핵심 액션에 사용할 수 있지만 셸 전체를 착색하지 않는다.
- React Native UI 안의 개별 컨트롤을 위해 별도 `Host`를 만들거나 Settings를 플랫폼별 트리로 나누지 않는다.
- React Native UI 안의 HeroUI `BottomSheet`는 독립 화면이나 라우트 수준의 표시 방식을 대체하지 않는다.
- 네이티브 기반 RN 컴포넌트는 React Native UI 소유권을 유지한다.

## 이유

뒤로 가기에 이전 화면 이름을 붙이면 방금 떠나온 곳을 한 번 더 읽게 하고, 현재 화면 제목이 쓸 너비를 가져간다. 셰브론만으로 돌아가는 곳을 충분히 알 수 있다.

셸을 플랫폼 내비게이션에 맡기면 운영체제의 표시 방식, 제스처, 재질과 접근성 적응을 보존할 수 있다. 화면별 주 렌더러와 Liquid Glass의 경계를 고정하면 여러 UI 시스템이 같은 표면을 중복해서 꾸미지 않는다.

## 재검토 조건

- Expo Router의 네이티브 API가 필수 내비게이션 동작을 지원하지 못한다.
- 완결된 화면으로 만들 수 없고 React Native UI로 대체할 수도 없는 필수 플랫폼 기능이 생긴다.
- Expo UI가 `Host` 경계의 레이아웃, 테마와 대체 표현을 React Native 컴포넌트처럼 투명하게 처리한다.
- Apple이 Liquid Glass의 레이어 또는 사용 원칙을 변경한다.
- 지원 플랫폼이나 최소 운영체제 정책이 변경된다.

## 계속 제외하는 대안

- HeroUI `BottomSheet`로 독립 화면이나 라우트 수준의 시트를 표시: Native Stack의 기본 헤더, 툴바, 라우트 전환과 표시 방식 소유권을 잃는다. 내비게이션 의미가 없는 동일 화면의 임시 패널 요구가 확인될 때만 다시 검토한다.
- Liquid Glass를 앱 테마로 만들거나 콘텐츠 표면에 수동 흐림 효과를 적용: 셸과 콘텐츠의 레이어 경계가 사라지고 플랫폼 적응을 중복 구현하게 된다. 운영체제의 레이어 원칙이 바뀔 때만 다시 검토한다.

## 보존할 근거

- 검증에 사용한 `@expo/ui 57.0.11`의 Android `Switch label`은 보이는 라벨과 스위치를 별도 접근성 노드로 내보내고 라벨 색상 API를 제공하지 않는다. 앱은 이 한계를 고치기 위한 패치나 플랫폼별 Settings 트리를 두지 않고 공통 기본 `Switch`를 유지한다. `@expo/ui`를 올릴 때 동작이 바뀌었는지 다시 확인한다.
- 2026-08-16 Android Development Build의 설정 화면에서 다시 확인했다. `알림` 라벨은 `android.widget.TextView`로, `notifications-switch`는 이름 없는 `android.view.View`로 같은 행 아래 형제 노드로 나왔다. `햅틱 반응`과 `haptics-switch`도 같았다. `SwitchProps`는 `value`, `onValueChange`, `label`, `disabled`, `testID`, `modifiers`만 선언해 라벨 색상 API도 그대로 없다.
