# AI 채팅 표현 명세

## 목표

현재 채팅의 서버 경계, 메시지 동작과 스크롤을 유지하면서 입력창, 사용자 메시지 진입,
답변 대기 표시와 스트리밍 답변의 표현을 개선한다. 입력창은 하나의 플로팅 Liquid
Glass 컨트롤로 보이고, 답변은 도착하는 동안에도 읽을 수 있는 네이티브 Markdown으로
표시한다.

이 명세는 [최소 채팅 화면 명세](../ai-chat/spec.md)의 일반 텍스트 전용 범위와
Markdown 제거 항목을 대체한다. [채팅 메시지 동작 명세](../chat-message-actions/spec.md)의
`답변을 쓰고 있어요.` 문구와 기다리는 동안의 표시 방식, Markdown 제외 항목도 이
명세가 대체한다. 복사, 다시 받기, 수정, 중지, 다시 시도와 최신 메시지 이동은 그대로
유지한다.

## 적용할 결정

- [모바일 AI 채팅 표현](../../decisions/mobile-ai-chat-rendering.md)
- [AI 채팅 프로토콜](../../decisions/ai-chat-protocol.md)
- [AI 서버 경계](../../decisions/ai-server-boundary.md)
- [모바일 채팅 스크롤](../../decisions/mobile-chat-scrolling.md)
- [모바일 키보드 회피](../../decisions/mobile-keyboard-avoidance.md)
- [모바일 UI 렌더러 경계](../../decisions/mobile-ui-renderer-boundaries.md)
- [모바일 아이콘 렌더링](../../decisions/mobile-icon-rendering.md)
- [모바일 타이포그래피](../../decisions/mobile-typography.md)
- [화면 문구 한국어 말투](../../decisions/korean-ui-writing.md)
- [모바일 테스트와 런타임 검증](../../decisions/mobile-testing-and-verification.md)

## 확정한 범위

### 입력창 전체의 Liquid Glass

- 여러 줄 입력창과 보내기 또는 중지 버튼을 하나의 둥근 플로팅 영역으로 묶는다.
- iOS 26 이상에서는 이 전체 영역을 `expo-glass-effect`의 `GlassView`로 표시한다.
- Liquid Glass를 지원하지 않는 iOS와 Android에서는 같은 크기, 모양과 배치의 일반
  `surface`를 표시한다. 흐림 효과나 유사 재질로 Liquid Glass를 흉내 내지 않는다.
- 입력창 뒤에서 화면 너비 전체를 덮는 불투명 배경은 제거한다. 메시지 목록 위에 입력
  영역만 떠 있는 모습으로 둔다.
- 수정 상태 안내와 오류 문구는 Glass 안에 넣지 않고 입력 영역 바로 위에 둔다.
- 현재 `KeyboardStickyView`, 여러 줄 높이 조절, Safe Area, 키보드 회피와 입력 동작을
  유지한다.
- 첨부 버튼과 첨부 영역은 추가하지 않는다.

### 스트리밍 Markdown 답변

- 사용자 메시지는 현재 일반 `Text`를 유지한다. AI 답변 본문만 `StreamdownText`로
  표시한다.
- `StreamdownText` 안의 `EnrichedMarkdownText`가 네이티브 Markdown을 그린다.
- Markdown은 `flavor="github"`으로 해석한다. 문단, 제목, 강조, 인용, 목록, 링크,
  인라인 코드, 코드 블록과 표를 표시한다.
- 링크를 누르면 운영체제의 외부 링크 열기 기능으로 연결한다.
- 스트리밍 중 코드 블록과 표는 완성될 때까지 감추지 않고 도착한 부분부터 보여 준다.
  `codeBlockMode`와 `tableMode`는 모두 `progressive`다.
- 닫히지 않은 Markdown 보완은 `StreamdownText`가 담당한다. 메시지 상태를 React에
  반영하는 주기는 현재 `useChat`의 `throttle: 50`을 유지한다.
- 답변 아래 복사와 다시 받기는 그대로 둔다. 답변을 받는 동안에는 기존처럼 동작을
  표시하지 않는다.
- Worklets Bundle Mode와 Metro 설정은 현재 Uniwind 설정과 함께 동작하도록 구성한다.
  Markdown 렌더러가 요구하는 네이티브 빌드를 iOS와 Android에 반영한다.

### 사용자 메시지 진입

- 메시지를 보내면 이번 전송으로 추가된 사용자 메시지 전체가 화면 아래에서 최종
  자리로 올라온다.
- 진입 시간은 400ms다. 처음에는 빠르고 끝에서 천천히 멈추는
  `Easing.out(Easing.cubic)`을 사용한다. 최신 메시지 버튼이 쓰는 곡선과 같다.
- 과거 메시지를 처음 표시하거나 목록 행을 다시 만들 때는 움직이지 않는다.
- 메시지를 수정해 다시 보낸 경우에는 새 전송이므로 움직인다.
- 시스템의 동작 줄이기 설정을 켜면 진입 움직임 없이 최종 자리에 바로 표시한다.
- 현재 `anchoredEndSpace`, 질문의 위쪽 12px 배치, 최신 답변 자동 추적과 사용자가 읽던
  위치 보존을 바꾸지 않는다.

### 답변 대기 표시

- 전송한 뒤 300ms 안에 답변 첫 글자가 오지 않으면 답변이 시작될 자리에 `Thinking`을
  표시한다.
- `Thinking`은 200ms 동안 서서히 나타난다. 300ms 안에 답변이 시작되면 한 번도
  표시하지 않는다.
- 첫 글자가 오면 `Thinking`을 없애고 같은 자리에서 Markdown 답변을 보여 준다.
- `Thinking`은 마침표가 없는 라벨로 표시한다.
- 현재 `MaskedView`, `LinearGradient`, Reanimated와 일반 `Text` 구성을 유지한다.
  `@shopify/react-native-skia`는 추가하지 않는다.
- 마스크와 이동 영역은 `Thinking`의 실제 글자 너비에 맞춘다. 밝은 띠는 56px이고,
  숫자 픽셀 값으로 글자 왼쪽 바깥에서 오른쪽 바깥까지 이동한다.
- 한 번 지나가는 시간은 1,500ms이며 일정한 속도로 반복한다.
- 시스템의 동작 줄이기 설정을 켜면 움직이지 않는 `Thinking`만 표시한다.

## 유지할 범위

- Hono `POST /ai/chat`, Vercel AI SDK UI message stream과 `expo/fetch`
- 서버의 제공자 비밀값, 모델 선택과 유료 AI 호출 소유권
- 시간 순서의 `KeyboardAwareLegendList`와 현재 스크롤 상태 모델
- 메시지 복사, 수정 후 다시 보내기, 답변 다시 받기, 생성 중지와 다시 시도
- 프로젝트 공통 `Icon`과 Lucide 렌더링
- 화면을 나가면 대화와 초안을 버리는 현재 수명

## 제외할 범위

- 이미지, 파일과 다른 첨부
- 추론 요약, 추론 과정 표시와 추론 시트
- 모바일에서 모델 제공자로 직접 여는 native WebSocket
- Pinecone, RAG, 검색, 도구 호출과 출처 표시
- `@shopify/react-native-skia` 기반 `Thinking`
- SF Symbols 전용 React Native 아이콘과 플랫폼별 메시지 아이콘
- 지난 대화 저장, 조회와 Native Pager
- 별도의 JS 스레드 성능 개선, 성능 벤치마크와 Release 프로파일링
- 서버 경로, 인증, 모델 라우팅과 스트리밍 프로토콜 변경

## 완료 조건

1. iOS 26 이상에서는 입력창과 보내기 또는 중지 버튼 전체가 하나의 Liquid Glass로
   보이고, 다른 iOS와 Android에서는 같은 배치의 `surface`로 보인다.
2. 입력 영역 뒤에 화면 너비 전체를 덮는 불투명 블록이 없으며 오류와 수정 안내는 입력
   영역 위에 남는다.
3. 키보드가 열리고 닫히거나 입력창이 여러 줄로 커져도 목록과 입력 영역이 겹치지 않는다.
4. AI 답변의 제목, 강조, 목록, 링크, 인라인 코드, 코드 블록과 표가 네이티브
   Markdown으로 표시된다.
5. 스트리밍 중 닫히지 않은 Markdown이 깨진 원문이나 빈 답변으로 깜빡이지 않고, 코드
   블록과 표가 도착한 부분부터 보인다.
6. 링크를 누르면 올바른 주소가 열리고, 완료된 답변의 복사와 다시 받기가 그대로
   동작한다.
7. 방금 보낸 사용자 메시지만 400ms 동안 아래에서 올라오며, 과거 메시지와 다시 만든
   목록 행은 움직이지 않는다.
8. 첫 글자가 300ms보다 늦게 오면 `Thinking`이 서서히 나타나고 좁은 밝은 띠가 글자
   안에서 자연스럽게 지나간다. 더 빨리 오면 `Thinking`이 보이지 않는다.
9. 동작 줄이기 설정에서는 사용자 메시지와 `Thinking`이 움직이지 않는다.
10. 현재 질문 배치, 자동 추적, 읽던 위치, 메시지 수정과 재생성에서 스크롤이 달라지지
    않는다.

자동 테스트는 Markdown prop과 링크 처리, 새 사용자 메시지의 진입 조건, `Thinking`의
지연과 첫 글자 전환, 동작 줄이기 상태와 기존 메시지 동작을 확인한다. Liquid Glass,
키보드와 스크롤의 조합, 스트리밍 Markdown의 실제 배치와 반짝임은 iOS 및 Android
Development Build에서 확인한다.

## 가정

- 모델이 보내는 답변은 GitHub Flavored Markdown으로 해석해도 일반 문장이 달라지지
  않는다.
- 답변 전체 복사는 렌더링된 모양이 아니라 서버에서 받은 Markdown 원문을 복사한다.
- `Thinking`의 56px 밝은 띠와 1,500ms 이동은 첫 구현의 확정값이다. 색상은 현재
  `muted`와 `foreground` 시맨틱 토큰을 사용한다.
- 사용자 메시지 진입은 목록의 최종 배치를 바꾸지 않는 화면 표현이다.
- 진입 곡선은 처음에 `Easing.out(Easing.exp)` 500ms로 정했다가 기기에서 재고 바꿨다.
  지수 곡선은 거리의 74%를 첫 100ms에 끝내서, 행이 키보드를 벗어나기 전에 이동이
  거의 끝나 있었다. 눈에 닿는 것은 올라오는 움직임이 아니라 도약이었다.

## 남은 위험

- `StreamdownText`와 `EnrichedMarkdownText`는 새 네이티브 의존성과 Worklets Bundle
  Mode 설정을 요구한다. 현재 Uniwind Metro 설정과 함께 묶은 뒤 새 Development Build가
  필요하다.
- 스트리밍 표가 행마다 커지면 현재 읽던 위치 보정과 함께 화면이 움직여 보일 수 있다.
  실제 기기에서 문제가 확인되면 표만 완성 뒤 표시하는 방향을 새 결정으로 검토한다.
- 사용자 메시지 진입과 `anchoredEndSpace`의 위치 확정이 같은 시점에 일어난다. 목록
  배치는 맞아도 두 움직임이 겹쳐 보이면 메시지 진입 시간만 다시 조정해야 한다.
- `MaskedView`는 플랫폼별 합성이 다를 수 있다. 특정 플랫폼에서 밝은 띠가 끊기면
  Skia를 바로 추가하지 않고 그 플랫폼에서 정지된 `Thinking`으로 내린 뒤 재검토한다.
- 네이티브 Markdown의 시스템 글자 크기 확대, 코드 가로 스크롤과 표 너비가 현재 본문
  역할과 맞는지는 실제 기기에서 확인해야 한다.

## 상태

ready for implementation
