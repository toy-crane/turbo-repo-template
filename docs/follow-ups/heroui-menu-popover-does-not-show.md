# heroui-native의 Menu가 가상 목록 안에서 열리지 않는다

## 증상

`heroui-native@1.0.8`의 `Menu`를 `presentation="popover"`로 쓸 때,
`KeyboardAwareLegendList`의 항목 안에 두면 열리지 않는다.
같은 컴포넌트를 목록 밖(입력창 옆)에 두면 정상으로 열린다.
iOS 26.5 시뮬레이터의 Development Build에서 확인했다.

## 확인한 것

- **목록 밖에서는 된다.** 공식 문서의 Basic Usage를 그대로 입력창 위에 두고
  누르니 메뉴가 화면에 나왔다. 라이브러리 자체나 번들, `PortalHost`,
  빠져 있는 `@gorhom/bottom-sheet`는 문제가 아니다.
- **목록 안에서는 안 된다.** 같은 구성을 메시지 행 안에 두면 열리지 않는다.
  `asChild`로 우리 뷰를 넘기든, 라이브러리 기본 트리거를 그대로 쓰든 같다.
  길게 누르기와 한 번 누르기 모두 마찬가지다.
- 길게 누르기는 핸들러까지 도달하고, `Menu.Trigger`의 `open()`도 불리고,
  `useMenu()`로 읽은 `isOpen`도 `true`가 된다. `Menu.Portal`의 자식도
  렌더링된다. 그런데 `Menu.Content`가 그리는 것만 화면에 없다.

## 도구에 대한 주의

`agent-device`의 접근성 스냅샷은 이 메뉴를 보지 못한다.
메뉴가 `FullWindowOverlay`에 그려지기 때문에 `snapshot --raw`에도 잡히지 않는다.
목록 밖에서 정상으로 열린 메뉴조차 스냅샷에는 없었다.
**이 메뉴는 스크린샷으로만 확인한다.** 스냅샷이 비었다고 없는 것이 아니다.

## 의심하는 지점

`MenuContentPopover`는 아래 값으로 화면에 그릴지를 정한다.

```ts
const isReady = Boolean(contentLayout?.y && contentLayout.y < screenHeight);
```

측정 전 내용은 `useRelativePosition`이 `top: Dimensions.get('screen').height`로
화면 밖에 세워 둔다. 측정이 끝나면 제자리를 찾아 `y`가 작아지고 그때 보인다.

`Menu.Content`에 `onLayout`을 붙여 두 곳을 비교했다.

- 목록 밖: `{"x":0,"y":874,...}` 다음에 `{"x":91,"y":484,...}`. 두 단계가 돈다.
- 목록 안: `onLayout`이 **한 번도 오지 않는다**. 내용이 자리를 잡는 단계까지
  가지 못한다는 뜻이다.

`isOpen`은 `true`가 되고 `Menu.Portal`의 자식도 렌더링되는데 `Menu.Content`만
자리를 잡지 못한다. 목록이 행을 담는 컨테이너와 관련이 있어 보이지만
확정하지 못했다.

## 다음에 해 볼 것

- 메뉴를 행 밖으로 꺼낸다. `ChatPanel`이 `Menu` 하나만 두고, 길게 누른 메시지의
  위치에 맞춰 보이지 않는 트리거를 놓는 방법이 있다. 목록 밖에서는 동작하는
  것이 확인됐으므로 가능성이 있지만, 트리거를 손으로 배치하는 부담이 있다.
- 목록의 `freeze`, `recycleItems`, 컨테이너 재사용을 하나씩 끄고 좁힌다.

## 확인을 막는 것

Development Build가 편집을 안정적으로 받지 않는다. Metro는 다시 묶는데
기기에 반영되지 않아, 로그를 넣어도 나오지 않는 구간이 있었다.
기기 확인을 이어가려면 이 문제부터 풀어야 한다.
[[mobile-dev-environment-traps]]의 강제 종료 후 딥링크 재실행 절차를 쓴다.

## 함께 알아낸 것

`Menu.Content`에 `width`를 주지 않으면 항목 제목이 `flex: 1`로 늘어나다가
0이 되어 아이콘만 남는다. 공식 문서의 예제도 `width`를 지정한다.
지금 코드는 승인된 프로토타입과 같은 208을 쓴다.

## 남은 선택

[채팅 메시지 동작 명세](../specs/chat-message-actions/spec.md)는 메시지 메뉴를
이 컴포넌트에 맡기기로 했다. 목록 안에서 열리지 않으므로 결정을 다시 해야 한다.

- `@gorhom/bottom-sheet`를 더하고 `presentation="bottom-sheet"`로 바꾼다.
  시트는 트리거 위치를 재지 않으므로 목록 안이라는 조건을 피해 간다.
  네이티브 의존성이 하나 늘고, 메시지 옆이 아니라 아래에서 올라온다.
- React Native로 메뉴를 직접 그린다. 의존성은 늘지 않지만 위치 계산과
  화면 경계 회피를 프로젝트가 소유하게 된다.

## 다시 볼 조건

`heroui-native`나 `@legendapp/list`를 올릴 때 이 항목을 먼저 확인한다.
