# 모바일 AI 채팅 표현

## 결정

- AI 답변은 `EnrichedMarkdownText`가 네이티브 Markdown으로 직접 그린다.
  `flavor="github"`과 `streamingAnimation`을 사용하고 코드 블록과 표는 도착한
  부분부터 보여 준다. 제목, 강조, 인용, 목록, 링크, 인라인 코드, 코드 블록과 표를
  표시하며, 답변 복사는 렌더링된 모양이 아니라 서버에서 받은 Markdown 원문을
  사용한다.
- `react-native-streamdown`과 `remend`는 사용하지 않는다. 두 패키지를 위해 붙였던
  Worklets Bundle Mode, 전용 Babel plugin, Metro resolver와 생성 파일 patch도
  유지하지 않는다. 불완전한 인라인 Markdown은 별도 보정 계층 없이
  `EnrichedMarkdownText`가 받은 그대로 처리한다.
- `markdown-to-jsx/native`는 현재 앱에 함께 넣지 않는다. 직접 렌더링에서 실제 읽기
  문제가 반복될 때만 현재 선택 메뉴와 링크 동작을 포함한 별도 비교 실험으로 검토한다.
- 메시지 스트림을 React 상태에 반영하는 주기는 `useChat`의 `throttle: 50`으로
  제한한다. `EnrichedMarkdownText`의 스트리밍 표시와 React 렌더 횟수를 제한하는
  일은 서로 다른 책임으로 유지한다.
- 입력창과 보내기 또는 중지 버튼은 하나의 중요한 플로팅 컨트롤이다. iOS 26
  이상에서는 `expo-glass-effect`의 `GlassView`로 전체 입력 영역을 감싸고, 그 밖의
  iOS와 Android에서는 같은 배치의 일반 `surface`를 사용한다.
- 방금 보낸 사용자 메시지만 `Easing.out(Easing.cubic)`으로 400ms 동안 화면 아래에서
  최종 자리로 들어온다. 과거 메시지나 목록이 다시 만든 메시지는 움직이지 않으며
  시스템의 동작 줄이기 설정을 따른다.
- 답변 첫 글자가 300ms 안에 오지 않으면 `Thinking`을 200ms 동안 나타낸다. 일반
  `Text`를 마스크로 사용하는 현재 구조를 유지하고, 56px 밝은 띠가 글자 너비 안을
  1,500ms 동안 일정하게 지나간다. 첫 글자가 오면 같은 자리에서 답변으로 바꾸며,
  동작 줄이기 설정에서는 움직이지 않는 글자만 보여 준다.

## 경계

- 서버 경로, 인증, 모델 라우팅과 스트리밍 프로토콜은 바꾸지 않는다. 모바일은
  Hono의 `POST /ai/chat`만 호출하고 제공자 비밀값은 서버가 소유한다.
- 첨부, 추론 요약, 모바일의 모델 제공자 직접 연결, RAG, 도구 호출, 지난 대화
  Pager는 이 결정에 포함하지 않는다.
- `@shopify/react-native-skia`, `react-native-nitro-symbols`와
  `react-native-true-sheet`를 이 표현만 위해 추가하지 않는다. React Native UI의
  아이콘은 프로젝트 공통 `Icon`을 계속 사용한다.
- 이 결정은 Markdown을 위해 사용하던 Worklets Bundle Mode만 제거한다.
  `react-native-reanimated`와 `react-native-worklets`가 맡는 질문 진입, 대기 표시와
  다른 화면 동작은 그대로 유지한다.
- 아래 저장소는 필요할 때 화면 아이디어와 구현 사례를 살펴보는 선택 참고 자료다.
  AI 채팅 작업마다 읽거나 같은 구현을 따라야 하는 규칙이 아니다. 이 프로젝트의
  명세, 결정 계약과 현재 코드가 항상 우선한다.

## 이유

`EnrichedMarkdownText`는 Markdown을 네이티브로 그리고, 완성되지 않은 표와 코드
블록도 도착한 부분부터 표시한다. 별도 Markdown 보정 계층을 두지 않으면 닫히지 않은
인라인 문법은 완성될 때까지 덜 다듬어진 모습으로 보일 수 있지만, Worklets Bundle
Mode와 전용 Metro 경로 없이 같은 렌더러, 선택 메뉴와 링크 동작을 유지할 수 있다.
빠른 토큰 스트림은 기존 `throttle: 50`으로 React 렌더 횟수를 제한한다.

입력창 전체를 하나의 플로팅 컨트롤로 보면 Liquid Glass의 기능 컨트롤 경계를 지킬
수 있다. 지원하지 않는 플랫폼에서 재질을 흉내 내지 않고 같은 배치만 유지하면
플랫폼 차이도 숨기지 않는다.

메시지 진입과 `Thinking`의 시점을 나누면 전송 직후 두 움직임이 경쟁하지 않는다.
한 줄짜리 진행 표시에 Skia를 추가하기보다 현재 마스크의 밝은 띠 너비와 이동 거리를
고치는 편이 더 작은 변경이며 시스템 글자 크기 확대도 그대로 유지한다.

## 알려진 제약

- GFM이 따르는 CommonMark 강조 규칙 때문에
  `**새 아키텍처(New Architecture)**는`처럼 굵은 글씨가 닫는 괄호 `)`로
  끝나고 바로 뒤에 한글 조사가 오면 닫는 `**`를 강조 표시로 해석하지
  않는다. 이 제약은 [CommonMark CJK 강조 이슈](https://github.com/commonmark/commonmark-spec/issues/650)에서도 다룬다.
- 현재 렌더러는 이 입력을 원문으로 표시한다. 앱은 서버가 보낸 Markdown을
  다른 문장으로 바꾸지 않고, 현재는 별도 우회 없이 알려진 제약으로 둔다.

## 재검토 조건

- `EnrichedMarkdownText`가 지원하는 React Native 버전 또는 접근성 동작이 현재
  앱과 맞지 않을 때
- CJK 강조 제약을 포함해 닫히지 않은 강조, 링크나 인라인 코드가 답변을
  읽기 어렵게 만드는 일이 실제 스트리밍에서 반복될 때
- `EnrichedMarkdownText`나 md4c가 CJK 강조 규칙을 선택해서 켤 수 있게 할 때
- 실제 배포 빌드에서 `MaskedView`의 반짝임이 특정 플랫폼에서 끊기거나 다르게
  그려지는 문제가 확인될 때
- 운영체제의 Liquid Glass 사용 원칙이나 `expo-glass-effect`의 지원 범위가 바뀔 때
- 첨부, 추론, 도구 결과나 지난 대화를 제품 범위에 넣을 때

## 계속 제외하는 대안

- `react-native-streamdown`과 `remend`: 닫히지 않은 인라인 Markdown을 미리
  완성하지만 Worklets Bundle Mode와 별도 Babel·Metro 설정이 필요하다. 이 경로에서
  생성한 `.worklets` 모듈이 worktree와 Metro 캐시 사이에서 섞이는 장애도 겪었다.
  직접 렌더링에서 읽기 문제가 반복될 때만 다시 검토한다.
- `markdown-to-jsx/native`: 불완전한 스트리밍 문법을 다루는 JavaScript 대안이지만
  현재 네이티브 텍스트 선택과 사용자 정의 선택 메뉴를 그대로 보장하지 않는다.
  직접 렌더링의 실제 문제가 확인되면 별도 비교 실험으로 검토한다.
- `Thinking`을 Skia로 그리기: 픽셀 단위 제어는 좋아지지만 한 줄을 위해 네이티브
  그래픽 의존성과 별도 글자 배치를 추가한다. 현재 방식의 플랫폼 문제가 실제로
  확인될 때 다시 검토한다.
- Margelo 예제 구조를 그대로 복사: 화면 표현과 함께 모바일 직접 WebSocket, 비밀값,
  RAG와 추론 UI까지 들어와 현재 서버 경계를 무너뜨린다. 각 기능이 별도 제품 요구로
  확정될 때 해당 부분만 다시 검토한다.

## 보존할 근거

- Margelo의 [ai-chat-demo](https://github.com/margelo/ai-chat-demo)는 AI 채팅 화면의
  아이디어가 필요할 때 선택해서 볼 수 있는 공개 예제다. 이번 검토 시점의 고정 사본은
  [6280b1f](https://github.com/margelo/ai-chat-demo/tree/6280b1f0f6d53d557b160481185e7bdfa7385cb6)다.
  입력창, 메시지, 대기 표시나 목록 표현을 비교하고 싶을 때 `Composer.tsx`,
  `MessageBubble.tsx`, `ShimmerText.tsx`와 `ChatMessages.tsx`를 볼 수 있다. 이 목록은
  따라야 할 기술 선택이나 필수 확인 항목이 아니다.
