# AI 채팅 프로토콜

## 결정

- 첫 AI API는 `POST /ai/chat`으로 제공하는 스트리밍 채팅 API다.
- 요청과 응답은 Vercel AI SDK의 UI message 프로토콜을 사용한다.
- Hono 서버는 `streamText()`의 결과를 `toUIMessageStreamResponse()`로 반환한다.
- 모바일 앱은 `@ai-sdk/react`의 `useChat()`과 `expo/fetch`로 응답을 스트리밍한다.

## 경계

- 모바일 앱은 Supabase Auth access token을 `Authorization` 헤더에 넣는다. 서버 인증과 공개 경로의 범위는 AI 서버 경계 결정이 소유한다.
- 이 결정은 모델 제공자와 모델, system prompt, 도구, 대화 저장 방식, 스트림 재연결과 사용량 제한을 정하지 않는다.
- Expo Web은 지원하지 않으며 iOS와 Android의 `expo/fetch` 동작만 검증한다.

## 이유

Vercel AI SDK의 UI message 프로토콜은 텍스트뿐 아니라 추론, 도구 호출과 사용자 정의 데이터를 순서가 있는 message part로 전달한다. `useChat()`이 이 프로토콜의 전송과 채팅 상태를 처리하므로 모바일과 서버가 별도 스트림 형식과 상태 관리 코드를 만들지 않아도 된다. Expo SDK 57은 스트리밍에 필요한 `expo/fetch`를 제공한다.

## 재검토 조건

- 첫 AI 기능이 대화가 아닌 한 번의 생성 요청으로 바뀔 때
- `expo/fetch`가 iOS 또는 Android에서 UI message stream을 안정적으로 처리하지 못할 때
- Hono나 Vercel Functions가 AI SDK 응답 스트리밍을 안정적으로 전달하지 못할 때
- 클라이언트가 AI SDK UI message 프로토콜과 맞지 않는 별도 실시간 프로토콜을 사용하게 될 때

## 계속 제외하는 대안

- 일반 텍스트 스트림: 간단하지만 도구 호출과 사용자 정의 데이터의 구조를 잃고 모바일이 메시지 상태를 직접 관리해야 한다. AI 응답이 영구히 텍스트 하나로 제한될 때만 재검토한다.
- 생성이 끝난 뒤 JSON 응답 반환: 구현은 단순하지만 긴 응답이 끝날 때까지 사용자가 결과를 볼 수 없다. 실시간 응답이 제품 요구에서 빠질 때만 재검토한다.
