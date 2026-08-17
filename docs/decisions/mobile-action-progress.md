# 모바일 작업 진행 표시

## 결정

- 사용자가 React Native UI의 일반 버튼으로 시작한 작업은 같은 버튼에서 진행 중임을 표시한다. 버튼의 원래 문구와 크기를 유지하고, 작업 아이콘이 있던 자리나 문구 앞에 작은 회전 진행 표시를 둔다.
- React Native UI는 HeroUI Native를 감싼 프로젝트 공통 `Button`을 사용한다. `isPending`은 이 버튼의 상태이며 별도 `PendingButton`이나 `CTAButton`을 만들지 않는다.
- 프로젝트 공통 `Button`은 너비를 정하지 않는다. 전폭, 내용 너비와 정렬은 버튼을 배치하는 화면이 정한다.
- `isPending`인 버튼은 같은 작업을 다시 시작할 수 없고 화면 읽기 기능에 `busy`와 `disabled` 상태를 함께 전달한다. 화면 상태나 데이터 변경 계층도 같은 화면 프레임에 들어온 중복 실행을 막는다.
- 사용자가 버튼을 누르지 않아 자동으로 시작한 작업은 처리하는 대상이 진행 상태를 소유한다. 기존 내용과 관계없는 새 줄에 진행 표시를 추가하지 않는다.
- 자동 실행 작업이 1초 안에 끝나면 시각적인 진행 표시를 띄우지 않는다. 1초를 넘기면 작업 대상이 있던 영역을 유지한 채 진행 표시와 구체적인 상태 문구를 보여 준다.
- 네이티브 셸과 `@expo/ui` 화면은 프로젝트 공통 `Button`을 사용하지 않는다. 각 렌더러가 제공하는 버튼, 행과 진행 표시로 같은 의미를 표현한다.
- `@expo/ui` 화면에서 사용자가 시작한 작업은 그 작업을 시작한 컨트롤에서 진행 중임을 표시한다. 컨트롤의 문구는 바꾸지 않고 진행 표시만 더한다. iOS는 SwiftUI `ProgressView`, Android는 Compose `CircularProgressIndicator`가 그 자리를 그린다. 두 플랫폼 모두 문구 옆에 서는 얇은 원형 링이며, Android는 Material 기본값 대신 20dp에 선 2dp를 쓴다.
- 설정 화면의 파괴적 동작은 `FieldGroup.Section` 안의 `ListItem`으로 만든다. 아이콘과 셰브론은 두지 않는다. 진행 표시는 trailing 슬롯에 둔다.
- 진행 중임을 화면 읽기에 알리는 방법은 플랫폼마다 다르다. iOS는 행의 `accessibilityValue`로 상태를 지니고, Android는 작업이 시작될 때 `AccessibilityInfo.announceForAccessibility`로 한 번 알린다. Android 문구는 행이 앞에 서지 않으므로 `계정 삭제 진행 중`처럼 동작 이름을 함께 담는다.

## 경계

- Google, Apple과 이메일 로그인 버튼은 제공자 브랜드 규칙과 동일한 묶음 모양을 소유하는 기존 `SignInButton`을 유지한다. 진행 상태의 의미와 접근성 규칙만 공통 결정에 맞춘다.
- 프로필 저장은 플랫폼의 헤더 방식을 유지한다. iOS는 `Stack.Toolbar.Button`의 실행 아이콘을, Android는 `Stack.Screen`의 헤더 저장 버튼을 같은 자리의 시스템 진행 표시로 바꾼다.
- `@expo/ui` 화면의 진행 표시는 각 플랫폼이 제공하는 진행 컴포넌트가 그린다. 이를 위해 React Native UI 버튼을 `Host` 안에 넣지 않는다.
- 자동 확인, 자동 저장과 뒤에서 갱신하는 작업의 구체적인 위치와 문구는 작업 대상을 소유한 기능이 정한다.
- 완료량을 알 수 있는 업로드나 다운로드, 오래 걸리는 작업과 백그라운드 작업은 이 결정의 작은 회전 진행 표시만으로 다루지 않는다.
- 채팅처럼 별도 명세가 진행 상태를 정한 화면은 그 명세를 우선한다.

## 이유

진행 상태를 작업이 시작된 버튼이나 처리되는 대상에 두면 무엇을 기다리는지 바로 연결된다. 원래 문구와 크기를 유지하면 버튼이 움직이거나 작업의 뜻이 사라지지 않는다. 반대로 자동 작업의 진행 표시를 새 줄에 추가하면 어떤 요소와 연결되는지 알기 어렵고 화면 높이도 바뀐다.

하나의 공통 버튼이 HeroUI Native, 네이티브 셸과 `@expo/ui`를 모두 감싸면 각 렌더러가 제공하는 상태, 배치와 접근성 표현을 잃는다. 공통으로 유지할 것은 진행 상태의 의미이며, 실제 표시는 화면의 주 렌더러가 담당한다.

문구를 바꾸면 같은 컨트롤이 상태마다 다른 이름을 갖는다. Apple 설정 앱은 행의 이름을 고정한 채 상태를 별도 요소나 값으로 붙인다. 이 앱의 React Native `Button`도 처음부터 문구와 크기를 유지하고 표시만 바꿔 왔으므로 `@expo/ui` 화면만 다른 규칙을 쓸 이유가 없다.

화면 읽기 알림이 플랫폼마다 갈리는 이유는 Compose 쪽에 걸 자리가 없어서다. iOS는 행이 상태를 지니므로 나중에 다시 초점을 맞춰도 진행 중임을 읽지만, Android는 한 번 말하고 끝난다. 이 앱의 파괴적 동작은 1초 안에 끝나므로 돌아와서 다시 확인할 일이 사실상 없다.

Android에서 Material 3 Expressive의 `LoadingIndicator`를 쓰지 않는 이유는 모양이다. 속을 채운 33dp 덩어리가 일곱 모양 사이를 오가서 한 줄짜리 문구 옆에서는 진행이 아니라 도장이나 얼룩처럼 읽힌다. 얇은 원형 링은 두 플랫폼이 같은 인상을 주고, 같은 동작이 기기를 바꿨다고 다르게 보이지 않는다. 크기를 Material 기본값인 40dp에서 줄이는 것도 같은 이유다. 표시가 옆에 선 한 단어보다 커지면 행의 주인공이 바뀐다.

## 재검토 조건

- HeroUI Native가 문구, 크기와 접근성을 유지하는 공식 진행 중 상태를 제공한다.
- `@expo/ui`가 iOS와 Android에서 같은 방식으로 쓸 수 있는 버튼 진행 상태와 접근성 상태를 제공한다.
- `@expo/ui`가 행이나 버튼에 `busy` 상태를 직접 제공한다.
- `@expo/ui`가 Compose에 `liveRegion`이나 `stateDescription` modifier를 제공한다. Google이 권하는 방법이므로 나오면 Android 알림을 그쪽으로 옮긴다.
- Android가 `announceForAccessibility`를 deprecated에서 실제 동작 중지로 바꾼다.
- 실제 작업 시간 측정이나 사용자 검증에서 자동 실행 작업의 1초 표시 기준이 너무 짧거나 길다는 결과가 나온다.
- 진행 중인 작업을 취소하거나 정확한 완료량을 보여 줘야 하는 흐름이 생긴다.

## 계속 제외하는 대안

- `PendingButton`을 별도 컴포넌트로 만들기: 진행 중은 버튼의 정체성이 아니라 상태다. 다른 버튼 동작과 모양이 갈라질 때만 다시 검토한다.
- `CTAButton`만 공통화하기: 코드 다시 받기와 다시 불러오기 같은 일반 작업도 같은 상태 규칙이 필요하다. 주요 작업과 일반 작업에 서로 다른 버튼 기반이 필요해질 때만 다시 검토한다.
- 모든 버튼을 전폭으로 고정하기: 너비는 버튼의 상태가 아니라 화면 배치다. 제품의 모든 React Native UI 버튼이 전폭이라는 별도 화면 규칙이 생길 때만 다시 검토한다.
- 모든 렌더러를 하나의 공통 버튼으로 감싸기: 네이티브 셸, 호스팅된 SwiftUI와 Compose의 상태 표현을 React Native UI가 대신하게 된다. 렌더러 경계가 사라질 때만 다시 검토한다.
- 자동 작업이 시작되자마자 별도 줄에 진행 표시를 추가하기: 짧은 작업은 깜빡이고 긴 작업은 대상과 떨어진 표시만 남는다. 별도 진행 영역 자체가 제품 정보가 될 때만 다시 검토한다.
- 진행 중에 컨트롤의 문구를 `…중`으로 바꾸기: 접근성 이름을 얻는 가장 쉬운 방법이지만 컨트롤의 이름이 상태마다 달라진다. 표시와 접근성을 함께 전달할 다른 방법이 없어질 때만 다시 검토한다.

## 보존할 근거

- 설치된 HeroUI Native `1.0.8`의 `Button`은 별도 진행 중 속성이 없고 자식으로 `Spinner`를 조합한다. 버튼 기본 스타일은 높이와 가로 여백을 정하지만 너비는 정하지 않는다.
- 검증에 사용한 `@expo/ui 57.0.11`의 범용 `Button`은 `disabled`와 사용자 지정 자식을 지원하지만 진행 중 또는 `busy` 속성을 제공하지 않는다. `ButtonProps`는 `children`, `label`, `onPress`, `variant`만 선언하고 `disabled`는 `UniversalBaseProps`에서 온다.
- [SEED 로딩 지침](https://seed-design.io/docs/guidelines/loading)은 1초 안에 끝나는 작업에 별도 로딩 표시를 권하지 않으며, [Progress Circle 지침](https://seed-design.io/docs/components/progress-circle)은 표시 위치가 로딩 범위를 나타낸다고 설명한다.
- [Apple 진행 표시 지침](https://developer.apple.com/design/human-interface-guidelines/progress-indicators)은 진행 표시를 일관된 자리에 두라고 안내한다. 컨트롤 바로 옆에 두라는 문장은 macOS 절에 있으므로 iOS 규칙으로 인용하지 않는다.
- `@expo/ui 57.0.11`은 접근성을 props가 아니라 modifier로 제공한다. `@expo/ui/swift-ui/modifiers`의 `accessibilityLabel`, `accessibilityValue`, `accessibilityHint`, `accessibilityAddTraits`, `accessibilityHidden`과 `disabled`를 `modifiers` 배열로 넘긴다. `ListItem`과 범용 `Button` 모두 `modifiers`를 받는다.
- `@expo/ui`의 `ProgressView`는 SwiftUI `ProgressView`에 자식을 라벨로 넘긴다. 자식을 주면 화면에도 보이므로 진행 표시만 필요할 때는 자식 없이 사용한다.
- `@expo/ui 57.0.11`의 범용 `Button`은 자기가 그린 글자에서만 press를 받는다. iOS Simulator에서 행의 가로 위치를 옮겨 가며 확인했고, 글자 폭을 벗어난 지점은 눌리지 않았다. 버튼에 `contentShape(shapes.rectangle())`를 걸어도 넓어지지 않았고 `frame`에는 maxWidth를 무한으로 두는 값이 없다. 같은 버전의 `ListItem`은 iOS에서 SwiftUI `Button`을 감싸며 `contentShape(.rectangle())`를 적용해 행 전체를 누를 수 있게 해 준다.
- 진행 표시만으로는 접근성 트리에 아무것도 남지 않는다. `accessibilityValue`를 붙이면 iOS Simulator에서 행이 label `계정 삭제`에 value `진행 중`을 함께 보고했다. Apple 설정 앱이 `Voice, American (Voice 4)`로 읽히는 것과 같은 구조다.
- Apple 설정 앱의 접근성 트리에서 행의 상태는 이름을 고정한 채 전달된다. 사전 선택은 셀 `Catalan` 옆의 `selected` 요소로, Siri 음성은 셀의 `selected` 트레잇과 별도 `Checkmark` 요소로, 값이 있는 행은 `Voice, American (Voice 4)`처럼 이름과 값으로 읽힌다.
- [App Store 심사 지침 5.1.1(v)](https://developer.apple.com/support/offering-account-deletion-in-your-app/)은 계정 삭제를 앱에서 찾기 쉬운 곳에 두고 오래 걸리면 알리라고 요구하지만 버튼 문구는 정하지 않는다.
- `@expo/ui 57.0.11`의 Compose 진행 표시는 `LoadingIndicator`, `ContainedLoadingIndicator`, `CircularProgressIndicator`, `CircularWavyProgressIndicator`, `LinearProgressIndicator`, `LinearWavyProgressIndicator`다. 원형인 넷을 계정 삭제 행에 나란히 그려 Android Emulator에서 비교했다. `LoadingIndicator`는 33dp를 채운 덩어리이고, `CircularWavyProgressIndicator`는 48dp라 넷 중 가장 크며 호가 짧아지는 구간에서 링으로 보이지 않는다. `CircularProgressIndicator`만 크기와 선 두께를 함께 조절할 수 있다.
- `CircularProgressIndicator`는 `color`, `trackColor`, `strokeWidth`, `strokeCap`, `gapSize`를 props로 받고 크기는 `@expo/ui/jetpack-compose/modifiers`의 `size(width, height)`로 정한다. Compose 컴포넌트는 `testID`를 받지 않아 감싸는 `Row`가 대신 지닌다.
- Android Emulator에서 계정 삭제가 도는 시간은 614ms였다. 로컬 Supabase를 부른 값이며 확인창이 닫히는 애니메이션이 그 앞부분을 덮는다.
- `@expo/ui 57.0.11`의 Compose modifier 42개 중 접근성에 닿는 것은 `semantics` 하나뿐이고, 이 modifier는 자동 완성용 `contentType`만 받는다. `ModifierRegistry.kt`가 `Modifier.semantics { contentType = ct }`로만 옮긴다. `contentDescription`, `stateDescription`, `liveRegion`에 해당하는 modifier는 없다. 그래서 Compose 쪽 행에는 진행 중 상태를 걸 자리가 없다.
- [Android 16 동작 변경](https://developer.android.com/about/versions/16/behavior-changes-all)은 `announceForAccessibility`와 `TYPE_ANNOUNCEMENT` 이벤트를 deprecated로 표시했다. 동작하지 않게 만들지는 않았고, 권장 대안은 `setAccessibilityLiveRegion`과 Compose의 `Modifier.semantics { liveRegion = ... }`이다. React Native는 [무엇으로 대체할지 아직 논의 중](https://github.com/react-native-community/discussions-and-proposals/discussions/848)이다.
- React Native 0.86.2의 `AccessibilityInfo.announceForAccessibility`는 화면 읽기가 꺼져 있으면 아무것도 보내지 않고 바로 돌아온다(`AccessibilityInfoModule.kt`). 켜져 있을 때만 `TYPE_ANNOUNCEMENT` 이벤트를 보낸다.
- Android Emulator에서 TalkBack을 켜고 계정 삭제를 시작해 음성 알림이 나오는 것까지 확인했다. 프로덕션 이미지에서는 TalkBack 로그 수준을 올릴 수 없어 실제 발화 문장은 확인하지 못했다.
- 이 앱은 채팅 오류 안내에서 이미 같은 방법을 쓴다(`chat-panel.tsx`).
