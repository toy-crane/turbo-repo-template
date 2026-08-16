# 모바일 진입 키보드

## 결정

- 들어오자마자 입력하는 화면은 `useFocusOnArrival()`이 주는 ref를 입력에 붙인다. 입력의 `autoFocus`는 쓰지 않는다.
- 새 채팅 화면은 진입 포커스를 사용한다. 뒤로 나갔다가 새 채팅을 다시 열면 새 화면에 진입한 것이므로 다시 포커스를 준다.
- 포커스는 화면 전환이 끝난 뒤에 준다. 화면이 밀려 들어오는 동안에는 키보드가 보이지 않는다.
- 전환이 끝나는 시점은 화면이 소유한다. 화면과 입력을 그리는 컴포넌트가 다르면 화면이 ref를 만들어 넘기고, 받는 쪽은 그 ref를 입력에 붙이기만 한다.
- 진입 포커스는 한 번만 준다. 사용자가 키보드를 내린 뒤나 앱에서 돌아온 뒤에 다시 주지 않는다.
- 입력이 다시 mount되는 화면은 따로 처리하지 않는다. 새 입력이 붙을 때 같은 ref가 포커스를 다시 가져간다.

## 경계

- 들어온 목적이 곧 입력인 화면에만 적용한다. 입력이 있다는 이유만으로 모든 화면에 진입 키보드를 넣지 않는다.
- 이 결정은 키보드가 가리는 영역을 비키는 방법을 정하지 않는다. 그 주제는 [모바일 키보드 회피](mobile-keyboard-avoidance.md)를 따른다.
- 스크린리더가 켜져 있어도 예외를 두지 않는다.
- 화면을 밀어 넣지 않고 스택의 첫 화면으로 여는 경로도 전환 신호를 받는다. 온보딩 닉네임 화면을 앱 시작부터 확인했다. 다만 애니메이션이 아예 없는 표시 방식은 확인하지 않았다.

## 이유

iOS는 mount 시점에 포커스를 주면 올라오는 키보드를 화면 전환에 실어 함께 옆으로 밀어 넣는다. 그 뒤 키보드가 제자리를 찾아 아래에서 다시 올라오므로, 한 번 들어오는 동안 움직임이 두 방향으로 갈라져 보인다. 전환이 끝난 뒤에 포커스를 주면 화면은 옆에서, 키보드와 그 위의 입력은 아래에서 각각 한 번씩만 움직인다.

키보드가 등장하는 방향이나 애니메이션을 정하는 값은 없다. `react-native-keyboard-controller` 1.22.3의 공개 API는 `setInputMode`, `setDefaultMode`, `preload`, `dismiss`, `isVisible`, `state`, `setFocusTo`뿐이다. `react-native-screens`의 화면 옵션 중 키보드와 관련된 `keyboardHandlingEnabled`는 뒤로 스와이프할 때 키보드를 숨길지를 정한다. 그래서 조절할 수 있는 것은 포커스를 주는 시점과 화면 전환 자체뿐이다.

값은 키보드가 전환 시간만큼 늦게 뜨는 것이다. 이걸 받아들이는 대신 움직임을 하나로 만든다.

## 재검토 조건

- `react-native-keyboard-controller`가 `skipKeyboardAnimation()`을 내놓아 전환과 동시에 키보드를 띄울 수 있을 때
- `react-native-screens`나 react-navigation이 push 중 키보드 처리를 고칠 때
- 전환 신호가 오지 않는 진입 경로를 지원 범위에 넣을 때
- 여러 단계를 잇달아 지나가는 흐름에서 단계마다 늦는 키보드가 문제로 보고될 때

## 계속 제외하는 대안

- 입력의 `autoFocus`: iOS가 키보드를 화면 전환에 실어 옆에서 끌고 들어온다. 위 재검토 조건이 열릴 때 다시 본다.
- 화면 전환을 `fade`나 `slide_from_bottom`으로 바꾸기: 키보드는 제자리를 찾지만 뒤로 가기를 포함한 화면 전환 전체가 iOS 기본과 달라진다.
- 고정 시간만큼 기다렸다 포커스 주기: 기기와 화면마다 전환 길이가 달라 짧으면 전환 중에 뜨고 길면 그만큼 늦는다.

## 보존할 근거

- `react-native-keyboard-controller` [#1157](https://github.com/kirillzyusko/react-native-keyboard-controller/issues/1157): 라이브러리 저자가 "AI/chat 앱의 첫 화면을 키보드와 함께 바로 보여 주는" 용도로 `KeyboardController.skipKeyboardAnimation()`을 제안했고 아직 열려 있다. 같은 이슈에서 native-stack push와 `autoFocus` 조합이 추가 버그를 부른다고 적었다.
- `react-navigation` [#11626](https://github.com/react-navigation/react-navigation/issues/11626): `autoFocus` 화면을 push하면 키보드가 이전 화면 위에 나타났다가 사라지고 새 화면과 함께 애니메이션된다.
- `wix/react-native-navigation` [#2622](https://github.com/wix/react-native-navigation/issues/2622): iOS 기본 horizontal-slide 전환에서만 생기고 `fade` 전환에서는 생기지 않는다.
- `react-native-keyboard-controller` [#1215](https://github.com/kirillzyusko/react-native-keyboard-controller/issues/1215): iOS 26에서 expo-router push와 `autoFocus`를 함께 쓰면 레이아웃이 튀고 키보드 색이 잠시 잘못 나온다.
