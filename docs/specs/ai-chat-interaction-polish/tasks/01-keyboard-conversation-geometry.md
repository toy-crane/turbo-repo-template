# 01 — 키보드와 입력창이 함께 움직이는 대화 틀

## Outcome

사용자는 빈 대화와 메시지가 있는 대화에서 같은 목록을 사용한다. 키보드를 열고 닫거나
입력창 높이와 글자 크기가 바뀌어도 대화 영역, 입력창과 하단 Safe Area가 한 화면처럼
연속해서 움직이며 마지막 내용이 입력창에 가리지 않는다.

## Blockers

None.

## Acceptance criteria

- [x] 빈 대화에서도 `KeyboardAwareLegendList`를 유지하고 빈 문구를 목록의 empty content로
  표시한다. 키보드 상태에 따라 다른 화면 구조를 렌더링하지 않는다.
- [x] 빈 문구는 네이티브 헤더 아래부터 입력창 위까지 남은 영역의 가운데에 놓이고,
  키보드 애니메이션과 함께 줄어드는 영역을 자연스럽게 따라간다.
- [x] 키보드가 닫히면 입력창이 하단 Safe Area를 지키고, 열리면 키보드 위에 iOS 8pt,
  Android 8dp 간격을 둔다.
- [x] iOS에서 상호작용으로 키보드를 내릴 때 입력창과 대화 영역이 키보드 진행도와 함께
  움직인다. Android는 목록을 끌면 키보드를 닫는 현재 동작을 유지한다.
- [x] iOS 네이티브 헤더 높이를 목록 inset에 수동으로 더하지 않는다. 첫 메시지의 위쪽은
  두 플랫폼 모두 네이티브 헤더 아래 16 레이아웃 단위다.
- [x] 입력창 바깥 묶음은 투명하고 실제 입력칸과 전송·중지 버튼만 시맨틱 표면색을 쓴다.
- [x] 목록은 측정한 입력창 높이와 Safe Area를 하단 공간으로 확보한다. 대화 끝에서 마지막
  메시지 작업과 입력칸 사이에 최소 16 간격이 보인다.
- [x] 여러 줄 입력과 Dynamic Type으로 입력창 높이가 바뀌어도 목록 하단 공간을 같은
  프레임에 맞추고 마지막 내용이 입력칸 뒤에 멈추지 않는다.
- [x] 밝은 화면, 어두운 화면과 고대비에서 투명한 입력창 바깥과 실제 입력칸의 경계가
  구분된다. 모션 줄이기에서도 필요한 위치 변화는 유지한다.
- [x] 화면과 컴포넌트 테스트가 빈 대화에도 목록이 존재하고, iOS 전용 헤더 높이 전달이
  사라지며, 키보드가 열린 목록의 작업을 한 번에 누를 수 있음을 확인한다.

## Constraints

- `react-native-keyboard-controller`와 `@legendapp/list`가 키보드 진행도, 입력창 높이 측정과
  목록 inset을 계속 소유한다. `KeyboardAvoidingView`나 별도 키보드 상태 화면을 추가하지
  않는다.
- `ChatScreen`과 `ChatPanel` 사이의 `topInset` 보정을 제거한다. 같은 여백을 다른 수동
  padding이나 spacer로 다시 만들지 않는다.
- 입력창 높이와 목록 하단 공간은 하나의 측정값에서 계산한다. 생성 상태, 오류 또는 최신
  메시지 이동 버튼을 이 측정 대상에 넣지 않는다.

## Verification

- 저장소 루트에서 `bun run check --filter=@repo/mobile`,
  `bun run check-types --filter=@repo/mobile`, `bun run test --filter=@repo/mobile`이 통과한다.
- `chat-screen.test.tsx`와 `chat-panel.test.tsx`가 수동 헤더 inset 제거, 항상 유지되는 목록,
  입력창 하단 보호와 기존 전송 동작을 확인한다.
- iOS와 Android Development Build에서 `agent-device` 한 세션씩 사용해 빈 대화에서 키보드
  열기·닫기, 8 간격, 하단 Safe Area, 첫 메시지 위 16 간격, 여러 줄 입력과 큰 글자를
  확인한다.

## Review checkpoint

Required after this task. 누적 범위는 하나로 유지되는 대화 목록, 키보드 진행도에 맞춘 대화
영역, 입력창 높이 측정, Safe Area와 첫 메시지 inset이다. Jest는 실제 네이티브 키보드
애니메이션과 LegendList의 inset 연결을 재현하지 못한다. 이 기준이 틀리면 02의 답변 공간과
자동 스크롤 계산도 함께 틀어지므로 두 플랫폼의 기기 검증 결과를 확인한 뒤 02를 시작한다.

## Status

<!-- Later values: `in-progress`, `completed`, or `blocked`. -->
completed

## Execution

- Verification: `bun run check --filter=@repo/mobile`, `bun run check-types --filter=@repo/mobile`,
  `bun run test --filter=@repo/mobile -- --runInBand --forceExit` 통과. 모바일 테스트 205개 통과.
  iPhone 17 Simulator와 `mobile_shell_verify_api35` Android Development Build에서 실제 이메일
  코드로 로그인한 뒤 빈 대화, 키보드 열기와 닫기, 8 간격, Safe Area, 첫 메시지, 여러 줄
  입력, iOS 상호작용 닫기와 Android 끌어서 닫기를 확인했다. iOS 밝은 화면과 어두운 화면,
  Android 글자 크기 1.3과 고대비, 애니메이션 끄기에서도 배치를 확인하고 로그아웃했다.
- Blocker: 없음.
