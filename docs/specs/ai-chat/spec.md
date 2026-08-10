# AI 채팅 명세

## 목표

Expo 모바일 앱과 Hono API를 하나의 AI 채팅 기능으로 완성한다. 사용자는 iOS와 Android에서 메시지를 작성하고, 서버가 보내는 답변을 바로 읽고, 생성을 제어하고, 메시지별 작업을 실행할 수 있다. Hono API는 인증된 요청을 모델로 전달하고 UI가 종류와 순서를 유지해 표시할 수 있는 응답을 보낸다. 이번 범위는 대화 저장이나 멀티모달 기능보다 현재 대화의 읽기·쓰기 경험, 서버 동작과 성능에 집중한다.

## 적용할 결정

- [AI 채팅 프로토콜](../../decisions/ai-chat-protocol.md)
- [AI 서버 경계](../../decisions/ai-server-boundary.md)
- [AI 모델 라우팅](../../decisions/ai-model-routing.md)
- [모바일 개발 런타임](../../decisions/mobile-development-runtime.md)
- [모바일 UI 렌더러 경계](../../decisions/mobile-ui-renderer-boundaries.md)
- [모바일 색상 시맨틱](../../decisions/mobile-color-semantics.md)
- [모바일 아이콘 렌더링](../../decisions/mobile-icon-rendering.md)
- [모바일 타이포그래피](../../decisions/mobile-typography.md)
- [모바일 테스트와 런타임 검증](../../decisions/mobile-testing-and-verification.md)

## 확정한 구현 방식

작업 분해 시점에 확정해 모든 작업이 공유하는 방식이다.

- `편집 후 다시 보내기`는 하단 입력창을 재사용한다. 편집을 누르면 입력창에 원문을 채우고 편집 중 표시와 취소를 보여준다. 말풍선 안에서 편집하지 않는다.
- 스트리밍 중에도 Markdown으로 그린다. 다시 해석은 스트리밍 중인 메시지 한 개로 한정하고 갱신 주기를 제한한다.
- Markdown은 mdast 계열 파서로 직접 구현한다. 참고 코드 `chat-template`은 라이선스가 없으므로 방식만 참고하고 코드를 복사하지 않는다.
- 코드 블록은 문법 강조 없이 시스템 monospace 글꼴, 가로 스크롤과 복사 버튼을 제공한다.
- 링크는 `expo-web-browser` 인앱 브라우저 시트로 연다.
- `새 대화` 확인은 플랫폼 기본 Alert를 사용하고, 새 대화 버튼은 Home 헤더 도구 막대에 둔다.
- 서버는 `toUIMessageStream`에 `sendReasoning: false`를 명시해 텍스트 전용 응답 계약을 지킨다.

## 구현 참고 코드

### 현재 저장소에서 이어서 쓸 코드

- [chat-transport.ts](../../../apps/mobile/src/features/chat/api/chat-transport.ts): `DefaultChatTransport`, `expo/fetch`와 요청마다 새 access token을 읽는 방식을 그대로 사용한다.
- [use-chat-session.ts](../../../apps/mobile/src/features/chat/state/use-chat-session.ts): 현재 `useChat` 연결, 중복 전송 방지와 다시 시도 처리를 유지하고 중지, 편집 후 다시 보내기, 다시 생성을 추가한다.
- [chat-panel.tsx](../../../apps/mobile/src/features/chat/ui/chat-panel.tsx): 현재 접근성 이름과 오류 표시를 유지한다. 문자열로 합친 메시지 본문과 `ScrollView` 화면은 part 렌더러와 가상 목록으로 바꾼다.
- [home-screen.tsx](../../../apps/mobile/src/screens/home/home-screen.tsx): 인증 기능에서 받은 access token을 채팅 기능에 넘기는 현재 경계를 유지한다.
- [route.ts](../../../apps/api/src/features/ai-chat/route.ts): 기존 인증, UI message 검증, `streamText`와 UI message stream 응답을 유지한다. 여기에 요청의 `AbortSignal` 전달을 추가한다.
- [app.ts](../../../apps/api/src/app.ts): AI 채팅 라우트 조립과 안전한 공통 오류 응답을 유지한다.
- [app.test.ts](../../../apps/api/src/app.test.ts)와 [chat-panel.test.tsx](../../../apps/mobile/src/features/chat/ui/chat-panel.test.tsx): 가짜 모델과 가짜 transport로 서버 스트림과 모바일 채팅 동작을 확인하는 기존 방식을 새 기능 검증에도 사용한다.

### 외부 코드에서 가져올 방식

- [`conversation.tsx`](https://github.com/EvanBacon/chat-template/blob/40379fcbc8d57025e09eef77ae129b7b30b100c7/src/components/chat/conversation.tsx): `LegendList` 가상 목록, 키보드에 맞춘 목록 이동, 아래쪽 따라가기 기준과 최신 메시지 이동 방식을 참고한다.
- [`prompt-input.tsx`](https://github.com/EvanBacon/chat-template/blob/40379fcbc8d57025e09eef77ae129b7b30b100c7/src/components/chat/prompt-input.tsx): 여러 줄 자동 높이 입력창과 키보드 위 입력창 배치를 참고한다. Liquid Glass와 예제 전용 화면 스타일은 가져오지 않는다.
- [`streaming-store.ts`](https://github.com/EvanBacon/chat-template/blob/40379fcbc8d57025e09eef77ae129b7b30b100c7/src/components/chat/streaming-store.ts)와 [`streaming-message.tsx`](https://github.com/EvanBacon/chat-template/blob/40379fcbc8d57025e09eef77ae129b7b30b100c7/src/components/chat/streaming-message.tsx): 스트리밍 중인 메시지만 갱신해 목록 전체의 다시 렌더링을 줄이는 방식을 참고한다.
- [`message.tsx`](https://github.com/EvanBacon/chat-template/blob/40379fcbc8d57025e09eef77ae129b7b30b100c7/src/components/chat/message.tsx): 사용자와 AI 메시지의 기본 배치를 참고한다. 이 명세의 part 렌더러와 메시지 작업 영역은 별도로 추가한다.
- [`markdown` 구성](https://github.com/EvanBacon/chat-template/tree/40379fcbc8d57025e09eef77ae129b7b30b100c7/src/components/markdown): Markdown AST 렌더링, GFM 표, 링크 열기와 코드 블록 가로 스크롤 방식을 참고한다. 코드 블록 복사 버튼은 예제에 없으므로 추가한다.

### 공식 문서와 제품 동작 참고

- [AI SDK Expo 시작 안내](https://ai-sdk.dev/v7/docs/getting-started/expo): Expo의 `useChat`, `DefaultChatTransport`, `expo/fetch`와 Hono 스트림 연결 기준으로 사용한다.
- [AI SDK `useChat`](https://ai-sdk.dev/v7/docs/reference/ai-sdk-ui/use-chat): 전송, 중지, 다시 생성과 상태 처리의 현재 API를 확인한다.
- [AI SDK `streamText`](https://ai-sdk.dev/v7/docs/reference/ai-sdk-core/stream-text): 서버에서 요청 중지 신호를 모델 호출로 전달하는 API를 확인한다.
- [Expo AI Chatbot](https://www.expoaichatbot.com/docs/introduction): 완성된 채팅 화면의 동작을 비교하는 자료로만 사용한다. 이번 MVP에서 제외한 저장, 이미지, 음성과 도구 기능은 가져오지 않는다.
- [`grok-voice-demo`](https://github.com/EvanBacon/grok-voice-demo/tree/0e9c42188c09c3351017bd0e174c02f3b5171f1d): 음성 대화를 추가하는 다음 단계에서 참고한다. 이번 구현에는 포함하지 않는다.

`chat-template`의 고정 시점은 Expo SDK 56과 AI SDK 6을 사용하고, 현재 저장소는 Expo SDK 57과 AI SDK 7을 사용한다. 따라서 UI 구성 방식만 참고하고 `src/app/index.tsx`의 AI SDK 연결 코드와 메시지를 텍스트로 합치는 처리는 복사하지 않는다. 외부 코드를 직접 옮길 때는 고정 링크의 원본과 라이선스 표기를 확인한다.

## 필요한 동작

### Hono API

- 기존 `POST /ai/chat`과 Supabase Auth 사용자 인증을 그대로 사용한다.
- 서버는 AI SDK UI message 배열을 검증하고, 잘못된 본문은 모델을 호출하지 않은 채 `400`으로 거절한다.
- access token이 없거나 유효하지 않으면 모델을 호출하지 않은 채 `401`로 거절한다.
- 서버는 요청에 들어온 현재 메시지 목록 전체를 모델 입력으로 바꾸고 AI Gateway의 서버 설정 모델을 호출한다.
- 새 메시지 전송, `편집 후 다시 보내기`와 `다시 생성`은 모두 현재 메시지 목록 전체를 같은 `POST /ai/chat`에 보낸다. 작업별 API를 추가하지 않는다.
- MVP 서버는 텍스트 답변만 생성하고 AI SDK UI message stream으로 반환한다.
- 모바일이 생성을 중지하면 요청의 `AbortSignal`을 모델 호출에 전달해 서버의 생성도 중지한다.
- 예상하지 못한 오류와 스트리밍 중 제공자 오류는 대화 내용, 비밀 값과 제공자 원문을 노출하지 않는다.
- `새 대화`는 모바일의 메모리 상태만 비운다. 서버에 초기화 요청을 보내지 않는다.

### 대화와 입력

- 대화가 비어 있으면 제목과 짧은 안내만 보여준다. 추천 질문은 보여주지 않는다.
- 입력창은 여러 줄 텍스트를 작성하며 내용에 맞춰 정해진 최대 높이까지 늘어난다.
- 공백뿐인 메시지는 보낼 수 없다.
- 같은 메시지를 연속 탭으로 중복 전송하지 않는다.
- 전송을 시작하면 입력한 내용을 비우고 사용자 메시지를 바로 대화에 표시한다.
- 입력창은 키보드와 Safe Area 위에 머문다. 키보드를 대화 목록에서 밀어 내려 닫을 수 있다.
- 이미지, 파일과 음성 입력 버튼은 이번 입력창에 표시하지 않는다.

### 생성 상태와 제어

- `submitted`, `streaming`, `ready`, `error` 상태를 화면에서 구분할 수 있다.
- 응답을 기다리거나 받는 동안 전송 버튼은 생성 중지 버튼으로 바뀐다.
- 사용자가 생성을 중지하면 그때까지 받은 AI 답변을 남기고 입력 가능한 상태로 돌아간다.
- 생성 중에는 같은 입력을 다시 보내거나 `다시 생성`, `편집 후 다시 보내기`, `새 대화`를 동시에 실행할 수 없다.
- 요청이 실패하면 사용자 메시지와 이미 받은 AI 답변을 남기고 다시 시도할 수 있는 오류를 보여준다.
- 제공자 오류 원문, 비밀 값과 내부 서버 정보는 화면에 표시하지 않는다.

### 메시지 구조와 본문

- AI SDK의 UI message를 하나의 문자열로 합치지 않는다.
- UI는 AI 답변의 텍스트, 파일, 출처와 도구 결과를 `parts`에 들어온 종류와 순서대로 표시할 수 있는 구조를 유지한다.
- MVP 서버가 실제로 보내는 part는 텍스트로 한정한다. 파일, 출처와 도구 part는 가짜 데이터로 UI 표시만 검증한다.
- 텍스트 part는 문단, 제목, 강조, 인용, 목록, 링크, 인라인 코드, 코드 블록과 표를 표시한다.
- 텍스트는 선택할 수 있다. 링크는 사용자가 눌러 열 수 있다.
- 코드 블록은 가로로 읽을 수 있고 해당 코드만 복사할 수 있다.
- 파일 part는 파일 이름, 종류와 열기 작업을 보여준다. 이번 범위에서는 사용자가 파일을 첨부하지 않는다.
- 출처 part는 제목과 출처 주소를 식별할 수 있게 보여주고 원문을 열 수 있다.
- 도구 part는 실행 중, 완료와 실패 상태를 구분하고 결과를 표시한다.
- 도구별 전용 UI를 연결할 수 있다. 전용 UI가 없는 part도 앱을 중단시키지 않고 안전한 기본 표시를 사용한다.
- 사용자 승인이나 거절을 기다리는 도구 UI는 지원하지 않는다.

### 메시지 작업

- 각 메시지 아래에는 해당 메시지에서 실행할 수 있는 작업 버튼 영역이 있다.
- 모든 사용자 및 AI 메시지는 본문을 복사할 수 있다.
- 마지막 사용자 메시지만 `편집 후 다시 보내기`를 제공한다.
- `편집 후 다시 보내기`는 마지막 사용자 메시지를 새 내용으로 바꾸고 그 뒤의 AI 답변을 새로 받는다. 이전 대화 갈래는 남기지 않는다.
- 마지막 AI 답변만 `다시 생성`을 제공한다.
- 과거 사용자 메시지 편집과 과거 AI 답변 다시 생성은 지원하지 않는다.

### 목록, 스크롤과 성능

- 메시지 목록은 대화가 길어져도 화면에 필요한 항목만 렌더링한다.
- 사용자가 대화 아래를 보고 있을 때만 새 메시지와 스트리밍 답변을 따라간다.
- 사용자가 이전 내용을 읽고 있으면 새 답변이 화면을 강제로 아래로 옮기지 않는다.
- 아래에서 멀어지면 최신 메시지로 이동하는 버튼을 보여준다.
- 키보드 높이, 입력창 높이와 메시지 높이가 바뀌어도 현재 읽던 위치를 불필요하게 움직이지 않는다.
- 스트리밍 조각마다 전체 대화가 다시 렌더링되지 않도록 화면 갱신 빈도를 제한한다.
- Markdown, 긴 코드 블록, 표와 도구 결과가 섞인 대화에서도 스크롤 입력이 끊기지 않아야 한다.

### 새 대화

- 사용자는 현재 세션의 메시지를 모두 지우고 새 대화를 시작할 수 있다.
- 메시지가 있으면 복구할 수 없다는 확인을 받은 뒤 초기화한다.
- 대화가 비어 있으면 확인 없이 그대로 빈 화면을 유지한다.
- 초기화한 대화는 복구하거나 지난 대화 목록에서 다시 열 수 없다.

### 접근성과 화면 적응

- 입력, 전송, 중지, 다시 시도, 메시지 작업과 최신 메시지 이동에는 VoiceOver와 TalkBack이 읽을 수 있는 이름과 역할이 있다.
- 글자 크기 확대, 밝은 화면과 어두운 화면, 고대비와 모션 줄이기 설정을 따른다.
- 작업 버튼은 플랫폼 권장 터치 영역을 확보하며 색만으로 상태를 구분하지 않는다.
- 생성 중, 오류와 중지 상태는 애니메이션을 보지 못해도 알 수 있다.

## 완료 조건

- 새 메시지 전송, 마지막 사용자 메시지 편집과 마지막 AI 답변 다시 생성은 모두 현재 메시지 목록을 기존 `POST /ai/chat`에 보내 동작한다.
- 모바일에서 생성을 중지하면 서버가 진행하던 모델 호출도 중지된다.
- iOS와 Android에서 여러 줄 메시지를 보내고 스트리밍되는 AI 답변을 읽을 수 있다.
- 사용자는 생성을 중지하고 부분 답변을 유지할 수 있다.
- 실패한 요청은 작성한 메시지를 잃지 않고 다시 시도할 수 있다.
- 실제 서버의 텍스트 답변과 테스트의 파일, 출처 및 도구 결과가 part의 종류와 순서를 유지한다.
- 모든 메시지를 복사할 수 있고 마지막 사용자 메시지만 편집할 수 있으며 마지막 AI 답변만 다시 생성할 수 있다.
- 긴 대화에서 자동 스크롤, 최신 메시지 이동, 키보드 닫기와 입력창 위치가 서로 방해하지 않는다.
- 새 대화는 확인 뒤 현재 메시지만 지우며 저장된 대화나 지난 대화 화면을 만들지 않는다.
- 화면 읽기 프로그램, 글자 크기 확대, 밝은 화면과 어두운 화면에서 핵심 동작을 완료할 수 있다.

## 가정

- 기존 Hono API, Supabase 인증과 AI SDK UI message stream을 그대로 사용한다.
- 파일, 출처와 도구 part는 이번 MVP의 실제 서버 응답에 포함되지 않는다.
- Markdown은 스트리밍 중에도 읽을 수 있어야 한다. 완성되지 않은 구문은 답변이 끝난 뒤 최종 형태로 정리될 수 있다.
- 세부 간격, 색상과 애니메이션은 기존 모바일 시맨틱 토큰과 플랫폼 동작을 따른다.

## 이번 범위에서 제외할 기능

- 대화 저장, 지난 대화 목록, 검색, 이름 변경, 즐겨찾기와 기기 간 동기화
- 스트림 재연결과 앱을 다시 연 뒤 생성 이어받기
- 이미지·파일 첨부와 PDF 대화
- 음성 입력과 실시간 음성 대화
- 실제 서버 도구, 검색, RAG, 파일 생성과 출처 생성
- 도구 실행 승인·거절
- 추천 질문과 시작용 작업 카드
- 모델 선택, 제공자 선택과 extended thinking 설정
- 제품별 system prompt
- 장기 기억과 비공개 대화
- Expo Web

## 남은 위험

- 스트리밍 중 완성되지 않은 Markdown을 자주 다시 해석하면 낮은 사양의 기기에서 스크롤이 끊길 수 있다.
- 표와 긴 코드 블록은 작은 화면에서 가로 스크롤과 대화 세로 스크롤이 충돌할 수 있다.
- AI SDK에 새 part 종류가 추가되면 기본 표시만으로 뜻을 충분히 전달하지 못할 수 있다.
- 대화를 저장하지 않으므로 앱 종료, 화면 재생성 또는 `새 대화` 뒤에는 내용을 복구할 수 없다.
