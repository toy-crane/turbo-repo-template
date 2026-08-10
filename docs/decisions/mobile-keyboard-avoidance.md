# 모바일 키보드 회피

## 결정

- 키보드가 올라올 때 화면을 비키는 일은 `react-native-keyboard-controller`가 맡는다.
  React Native의 `KeyboardAvoidingView`를 쓰지 않는다.
- `KeyboardProvider`는 루트 레이아웃에서 내비게이션을 포함해 그 아래 전부를 감싼다.
- 하단에 고정한 버튼은 `KeyboardStickyView`가, 입력이 여럿인 스크롤 폼은
  `KeyboardAwareScrollView`가 맡는다.

## 경계

- 이 결정은 라이브러리 사용법을 고정하지 않는다. props와 훅은 공식 문서를 따른다.
- `KeyboardStickyView`의 `offset`은 이미 음수인 `translateY`에 더해진다. 양수가 키보드
  쪽으로 내리고 음수가 더 멀어진다. 안전 영역 여백을 되돌려 줄 때 부호를 뒤집기 쉽다.
- 네이티브 모듈이라 추가하거나 제거하면 iOS와 Android Development Build를 다시 만든다.
  테스트는 라이브러리가 제공하는 대역을 `jest.setup.ts`에 건다.

## 이유

`KeyboardAvoidingView`는 자기 프레임의 위치와 키보드가 덮는 위치를 빼서 비킬 거리를
구한다. 그런데 키보드 위치는 화면 전체를 기준으로 오고, 네이티브 Stack 화면의 프레임은
헤더 아래를 기준으로 잡힌다. 기준이 다른 두 값을 빼므로 헤더가 있는 화면에서는 답이
어긋나고, 로그인 화면에서는 "비킬 필요 없음"으로 나와 하단 버튼이 키보드에 그대로
가려졌다. `KeyboardStickyView`는 재지도 빼지도 않고 키보드가 움직인 만큼 뷰를 따라
옮기므로 헤더 유무와 무관하다.

Expo의 키보드 가이드도 `KeyboardAvoidingView`를 "프로토타입에는 훌륭하지만 플랫폼별
설정이 필요하고 조정하기 어렵다"고 적고, 그 이상은 이 라이브러리를 가리킨다.

## 재검토 조건

- React Native의 `KeyboardAvoidingView`가 내비게이션 헤더를 인지하게 될 때
- Expo SDK가 이 라이브러리를 기본으로 포함할 때
- 네이티브 모듈을 쓸 수 없는 런타임을 지원 범위에 넣을 때

## 계속 제외하는 대안

- `KeyboardAvoidingView`에 헤더 높이를 `keyboardVerticalOffset`으로 넣기: 화면마다 헤더
  유무를 알아야 하고, 높이를 주는 `@react-navigation/elements`가 이 앱에서 직접 해결되지
  않는다.
- 키보드 높이만 듣는 자체 훅: 동작은 하지만 키보드 애니메이션과의 동기화, 상호작용
  중 닫기 같은 동작을 우리가 다시 만들게 된다.
