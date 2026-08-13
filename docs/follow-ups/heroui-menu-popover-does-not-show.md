# heroui-native의 Menu popover가 화면에 나오지 않는다

## 증상

`heroui-native@1.0.8`의 `Menu`를 `presentation="popover"`로 쓰면 메뉴가 열린
상태가 되지만 화면에도, 접근성 트리에도 아무것도 나오지 않는다.
iOS 26.5 시뮬레이터의 Development Build에서 확인했다.

## 확인한 것

기기에서 임시 로그를 넣어 단계별로 확인했다.

- `Menu`는 Metro에서 문제없이 묶인다. 빠져 있는 `@gorhom/bottom-sheet`는
  라이브러리의 `src/optional/` 심이 받아내고, 번들도 실행도 실패하지 않는다.
- 길게 누르기는 핸들러까지 도달하고 `Menu.Trigger`의 `open()`도 불린다.
- `useMenu()`로 읽은 `isOpen`이 `true`가 된다.
- `Menu.Portal`의 자식이 실제로 렌더링된다. `PortalHost`는 붙어 있다.
- 그런데 `Menu.Content`가 그리는 것은 화면에도 접근성 트리에도 없다.
  `snapshot --raw`에 메뉴 항목의 글자가 하나도 잡히지 않는다.

원인을 우리 쪽 사용법으로 좁히려고 아래를 각각 시도했지만 모두 같은 결과다.

- `asChild` 없이 라이브러리 기본 트리거로 탭해서 열기
- `animation="disable-all"`
- `Menu.Portal`의 `disableFullWindowOverlay`
- 기능 안에 별도 `PortalHost`를 두고 `hostName`으로 보내기

즉 우리가 트리거를 바꿔 쓴 것과는 상관이 없다.

## 의심하는 지점

`src/components/menu/menu.tsx`의 `MenuContentPopover`가 다음 값을 쓴다.

```ts
const isReady = Boolean(contentLayout?.y && contentLayout.y < screenHeight);
```

`contentLayout.y`가 0이면 좌표로는 정상인데도 준비되지 않은 것으로 본다.
확정한 원인은 아니다. 여기까지가 기기에서 확인한 범위다.

## 남은 선택

[채팅 메시지 동작 명세](../specs/chat-message-actions/spec.md)는 메시지 메뉴를
이 컴포넌트에 맡기기로 했다. 그 자리를 다른 방법으로 채우려면 결정을 다시
해야 한다.

- `@gorhom/bottom-sheet`를 더하고 `presentation="bottom-sheet"`로 바꾼다.
  네이티브 의존성이 하나 늘고, 메시지 옆이 아니라 아래에서 올라오는 시트가 된다.
- React Native로 메뉴를 직접 그린다. 의존성은 늘지 않지만 위치 계산과 화면
  경계 회피를 프로젝트가 소유하게 된다.

## 다시 볼 조건

`heroui-native`를 올릴 때 이 항목을 먼저 확인한다.
