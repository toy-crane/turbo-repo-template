# Hono 코드 구조 개편 명세

## 목표

현재 Hono 코드를 실제 소유권에 맞게 다시 배치한다. 배포 진입점, 앱 조립,
기능별 라우트와 여러 기능이 함께 사용하는 코드를 구분한다. 첫 개편은 기존
HTTP 경로, 인증, AI 스트리밍과 오류 응답을 그대로 유지하며 현재 없는 계층을
미리 만들지 않는다.

## 적용할 결정

- [Hono 코드 구조](../../decisions/hono-code-architecture.md)
- [AI 서버 경계](../../decisions/ai-server-boundary.md)
- [AI 채팅 프로토콜](../../decisions/ai-chat-protocol.md)
- [AI 모델 라우팅](../../decisions/ai-model-routing.md)

## 필요한 최종 상태

### 최상위 소유권

`apps/api/src/index.ts`는 Vercel과 Bun이 읽는 배포 진입점만 소유한다.
`apps/api/src/app.ts`는 기능 라우트와 앱 전체 오류 처리를 조립하고 테스트가
사용하는 `createApp()`을 제공한다.

나머지 서버 코드는 다음 영역에 둔다.

| 영역 | 소유하는 코드 |
| --- | --- |
| `features` | 하나의 API 기능에 함께 속하는 라우트, 설정과 동작 |
| `shared` | 둘 이상의 기능 또는 앱 조립 코드가 실제로 함께 사용하는 기반 코드 |

첫 개편의 기능은 `health`와 `ai-chat`이다.

```text
apps/api/src/
  index.ts
  app.ts
  app.test.ts
  features/
    health/
      route.ts
    ai-chat/
      route.ts
      config.ts
  shared/
    safe-error-log.ts
```

### 기능 내부 책임

- 각 기능의 `route.ts`는 Hono sub-app과 경로 handler를 함께 소유한다.
- `health/route.ts`는 인증이나 다른 기능에 의존하지 않는 상태 확인 응답을
  소유한다.
- `ai-chat/route.ts`는 사용자 인증 미들웨어, 요청 검증, 모델 호출과 UI message
  stream 응답을 소유한다.
- `ai-chat/config.ts`는 `AI_GATEWAY_MODEL` 이름과 모델 설정 읽기를 소유한다.
- Hono handler를 별도 Controller로 분리하지 않는다. 별도 파일이 필요한 순수
  동작은 해당 기능 안에서 실제 역할을 나타내는 이름으로 만든다.
- `Service`, `Repository`, `Model`, `Types` 폴더와 기본 `index.ts`를 미리 만들지
  않는다.

### 의존 방향

```text
index.ts → app.ts → features → shared
                  ↘ shared
```

- `index.ts`는 `createApp()`을 호출해 기본 export만 만든다.
- `app.ts`는 `app.route()`로 기능 sub-app을 조립한다.
- 한 기능은 다른 기능의 내부 파일을 import하지 않는다.
- `shared`는 `app.ts`나 `features`를 import하지 않는다.
- 기능 하나만 사용하는 코드는 이름이 일반적이어도 해당 기능에 둔다.
- 둘 이상의 소유자가 실제로 사용할 때만 `shared`로 올린다.

### 현재 코드의 새 소유권

| 현재 책임 | 최종 소유권 |
| --- | --- |
| Vercel과 Bun 기본 export | `src/index.ts` |
| `createApp()`, 기능 조립, 앱 전체 오류 응답 | `src/app.ts` |
| `GET /health` | `src/features/health/route.ts` |
| `POST /ai/chat`과 사용자 인증 | `src/features/ai-chat/route.ts` |
| `AI_GATEWAY_MODEL` 확인 | `src/features/ai-chat/config.ts` |
| 대화 내용을 남기지 않는 오류 로그 | `src/shared/safe-error-log.ts` |

### 테스트와 검증

- 공개 검증 경계는 `createApp().request()`다.
- 기존 테스트는 상태 확인, 인증 거절, 인증 성공 스트림, 잘못된 본문 거절과
  대화 비공개 로그를 같은 HTTP 경로에서 계속 확인한다.
- 파일 위치, 내부 함수 호출 횟수나 `app.route()` 사용 여부를 테스트하지 않는다.
- 구조 변경 뒤 `apps/api`의 테스트, 타입 검사와 코드 검사가 모두 통과해야
  한다.
- 저장소 전체 테스트, 타입 검사와 코드 검사도 통과해야 한다.
- 로컬 Hono 서버에서 `GET /health`가 기존 응답을 반환해야 한다.

## 완료 조건

- `src/index.ts`에는 배포 진입 코드만 있다.
- `src/app.ts`는 기능 구현을 직접 소유하지 않고 Hono 앱을 조립한다.
- `health`와 `ai-chat` 라우트가 각각 자신의 기능 폴더에 있다.
- AI 모델 환경 설정이 `ai-chat` 기능 안에 있다.
- 여러 경계가 함께 사용하는 안전한 오류 로그만 `shared`에 있다.
- `Controller`, `Service`, `Repository`, `Model`, `Types` 폴더와 빈 책임 폴더가
  생기지 않는다.
- 기존 HTTP 경로, 응답, 인증, 스트리밍과 오류 처리 동작이 바뀌지 않는다.
- 필요한 검증과 구현 diff 리뷰가 통과한다.

## 이번 개편에서 제외할 범위

- 새 API 경로와 제품 기능 추가
- 요청 또는 응답 형식 변경
- Supabase 인증 정책과 관리자 권한 변경
- AI 모델, system prompt, 도구, 저장 또는 사용량 제한 변경
- Hono RPC와 타입 클라이언트 도입
- 별도 의존성 주입 도구, import 경계 검사 도구와 경로 별칭 도입
- 패키지 설치, 제거 또는 버전 변경

## 가정

- `health`는 제품 기능은 아니지만 독립된 API 기능 단위로 관리한다.
- 현재 `createApp()`의 `auth`와 `model` 주입 경계는 외부 시스템을 대체하는
  테스트 경계이므로 유지한다.
- 기능이 하나뿐인 설정이나 미들웨어는 `shared`로 올리지 않는다.

## 남은 위험

- Hono sub-app을 상위 앱에 붙이는 경로나 순서를 잘못 바꾸면 기존 경로가 404로
  바뀔 수 있다.
- route factory의 반환 타입을 넓히면 나중에 Hono RPC를 도입할 때 타입 추론이
  끊길 수 있다.
- 첫 개편은 import 경계를 자동으로 검사하지 않으므로 이후 코드가 기능 간
  내부 import 규칙을 어길 가능성이 남는다.
