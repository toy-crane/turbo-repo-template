# 01: 서버 생성 중지와 텍스트 전용 응답 계약

## 결과

클라이언트가 요청을 중단하면(중지 버튼, 앱 종료, 연결 끊김) 서버가 진행하던 모델 호출도 함께 멈춘다. 응답 스트림은 계약상 텍스트 전용이 되어, `AI_GATEWAY_MODEL`에 reasoning 모델을 설정해도 reasoning part가 클라이언트에 나가지 않는다.

## 선행 조건

없음.

## 완료 조건

- [x] `streamText` 호출이 요청의 `AbortSignal`(`c.req.raw.signal`)을 전달받고, 요청 중단이 가짜 모델의 `doStream` 옵션까지 전파되는 것을 테스트로 확인한다.
- [x] 중단 시 `onAbort` 로그가 메서드와 경로만 남긴다. 대화 내용, 비밀 값과 제공자 원문은 로그와 응답 어디에도 없다.
- [x] 가짜 모델이 reasoning과 텍스트를 함께 흘려도 응답 본문에 reasoning part가 없고 텍스트 part는 그대로 유지된다.
- [x] 기존 인증 401, 본문 검증 400, 스트리밍 성공, 로그 유출 방지 테스트가 전부 그대로 통과한다.

## 제약

- AI 채팅 프로토콜 결정의 독립 헬퍼 구조(`createUIMessageStreamResponse` + `toUIMessageStream`)를 유지한다. 결과 객체의 deprecated 메서드로 바꾸지 않는다.
- 응답 헤더를 바꾸지 않는다. iOS 스트리밍 버퍼링 대응은 작업 02의 기기 검증에서 실제로 관찰될 때만 별도로 다룬다.
- zod를 추가하지 않고, `/health`를 함께 막는 전역 미들웨어를 만들지 않는다.

## 검증

- 저장소 루트에서 다음 명령이 모두 통과한다.
  - `bun run check --filter=@repo/api`
  - `bun run check-types --filter=@repo/api`
  - `bun run test --filter=@repo/api`
- HTTP 연결 끊김이 실제 런타임에서 전파되는지는 작업 02의 기기 검증(중지 → 서버 중단 로그)에서 확인한다.

## 검토 지점

없음.

## 상태

<!-- 이후 값: `in-progress`, `completed`, `blocked` -->
completed

## 실행 결과

- 검증: `bun run check --filter=@repo/api`, `bun run check-types --filter=@repo/api`, `bun run test --filter=@repo/api` 모두 통과(테스트 10개). 새 테스트 3개: 중단이 `doStream`의 `abortSignal`까지 전파, 중단 로그가 `Request aborted on POST /ai/chat`만 남고 대화 내용 미노출, reasoning part가 응답에서 제외되고 텍스트 part 유지.
- 선행 조건: 없음.
- HTTP 연결 끊김의 실제 런타임 전파는 작업 02의 기기 검증에서 확인한다.
