# 모바일 코드 구조 개편 명세

## 목표

현재 모바일 코드를 실제 소유권에 맞게 다시 배치한다. Expo Router 경로, 앱 전체 기반 코드, 업무 기능, 화면 조립 코드와 공용 기반 코드를 구분한다. 첫 개편은 기존 제품 동작과 임시 화면을 유지하며, 폴더 이름만으로 불필요한 계층을 만들지 않는다.

이 명세는 [모바일 코드 구조 결정](../../decisions/mobile-code-architecture.md)에 남아 있는 `Types → Config → Repo → Service → Runtime → UI` 임시 책임 이름을 이번 개편 범위에서 대체한다. 구현을 마친 상태에서는 해당 결정 계약도 이 명세와 같은 용어를 사용해야 한다.

## 적용할 결정

- [모바일 인증](../../decisions/mobile-authentication.md)
- [모바일 원격 데이터 상태](../../decisions/mobile-remote-data.md)
- [모바일 UI 렌더러 경계](../../decisions/mobile-ui-renderer-boundaries.md)
- [모바일 테스트와 런타임 검증](../../decisions/mobile-testing-and-verification.md)
- [Supabase 클라이언트 경계](../../decisions/supabase-client-boundaries.md)
- [AI 채팅 프로토콜](../../decisions/ai-chat-protocol.md)
- [AI 서버 경계](../../decisions/ai-server-boundary.md)

## 필요한 최종 상태

### 최상위 소유권

`apps/mobile/app`은 현재 위치에 유지한다. Expo Router가 읽는 경로 파일만 이 폴더에 둔다. 테스트, 화면 본문, Provider 구현과 업무 기능은 넣지 않는다.

그 밖의 모바일 코드는 `apps/mobile/src` 아래에서 다음 네 영역으로 나눈다.

| 영역 | 소유하는 코드 |
| --- | --- |
| `core` | 앱 초기화, Provider 조립, 내비게이션, 앱 전체 테마 연결 |
| `features` | 사용자가 실행하는 실제 업무 기능 |
| `screens` | 경로가 표시할 화면과 기능 조립 |
| `shared` | 여러 기능과 화면이 함께 사용하는 기반 코드와 테스트 도구 |

첫 개편의 업무 기능은 `auth`와 `chat`이다. `home`, `activity`, `saved`, `settings`는 기능을 보여 주거나 임시 콘텐츠를 담는 화면이다.

```text
apps/mobile/
  app/
  src/
    core/
      navigation/
      providers/
      theme/
    features/
      auth/
      chat/
    screens/
      home/
      activity/
      saved/
      settings/
    shared/
      supabase/
      test/
```

### 기능 내부 책임

기능에는 실제 코드가 있는 폴더만 만든다.

| 폴더 | 역할 |
| --- | --- |
| `api` | Supabase, Hono, Apple 또는 Google SDK처럼 기능 밖의 시스템 호출 |
| `query` | TanStack Query의 Query Key, Query와 Mutation 옵션, 캐시 갱신 |
| `state` | 기능 UI가 함께 사용하는 클라이언트 상태와 상태 전환 |
| `config` | 해당 기능의 환경 변수와 설정 |
| `ui` | 기능을 표시하고 조작하는 컴포넌트 |

- `api`와 `query`는 합치지 않는다.
- Supabase Auth 세션은 `query`에 넣지 않는다.
- 한 컴포넌트만 쓰는 입력값, 열림 여부와 짧은 진행 상태는 해당 컴포넌트에 둔다.
- 타입은 사용하는 코드 가까이에 둔다. 여러 파일이 실제로 공유하기 전에는 독립된 `types` 폴더를 만들지 않는다.
- `Repository`, `Service`, `Model`, `Runtime` 폴더를 만들지 않는다.
- `index.ts`는 실제 외부 공개 경계가 필요할 때만 만든다.

현재 모바일에는 실제 `useQuery`, `queryOptions` 또는 `useMutation` 사용처가 없다. 앱 전체 `QueryClientProvider`는 `core/providers`가 소유하고, 실제 원격 데이터 기능이 생기기 전에는 빈 `query` 폴더를 만들지 않는다.

### 의존 방향

최상위 영역은 다음 방향으로만 의존한다.

```text
app      → core, screens, features, shared
core     → features, shared
screens  → features, shared
features → shared
shared   → 외부 패키지
```

- `shared`는 `core`, `features`, `screens`를 import하지 않는다.
- 한 기능은 다른 기능의 내부 파일을 직접 import하지 않는다.
- 여러 기능을 묶는 코드는 `screens` 또는 `core`가 소유한다.
- 기능 내부의 기본 방향은 `ui → query/state → api → shared`다.
- 같은 폴더 안의 가까운 파일은 상대 경로를 사용할 수 있다. 영역을 넘는 import는 `@/*` 별칭을 사용한다.

`@/*`는 `apps/mobile/src/*`를 가리킨다. 이 별칭은 구현할 때 `apps/mobile/tsconfig.json`에 추가하며, 경로 파일도 `../../../src/...` 대신 같은 별칭을 사용한다.

### 현재 코드의 새 소유권

| 현재 책임 | 최종 소유권 |
| --- | --- |
| `src/navigation/*` | `core/navigation` |
| `src/query/app-query-provider.tsx` | `core/providers` |
| `src/theme/*` | `core/theme` |
| Supabase 클라이언트, 환경 설정, 암호화 세션 저장소 | `shared/supabase` |
| `src/test/*` | `shared/test` |
| Hono API 주소 설정 | `features/chat/config` |
| Chat 전송 코드 | `features/chat/api` |
| `useChat` 메시지와 스트리밍 상태 | `features/chat/state` |
| Chat 메시지, 입력창과 전송 UI | `features/chat/ui` |
| Home의 Chat 조립과 Settings 진입 UI | `screens/home` |
| Activity 임시 화면 | `screens/activity` |
| Saved 임시 화면 | `screens/saved` |
| Settings 화면과 앱 정보 표시 | `screens/settings` |

### Auth 책임

Auth는 다음 책임을 각각 소유한다.

- `api`: 이메일 코드 전송과 확인, Apple과 Google 로그인, Supabase 제공자 로그인 완료, 로그아웃의 외부 SDK 호출
- `config`: Google Client ID와 이메일 OTP 설정
- `state`: Supabase 세션 복원과 구독, 로그인 단계와 오류, 재전송 대기 시간, 중복 실행 방지, 로그아웃 진행과 사용자별 Query 캐시 제거
- `ui`: 로그인 화면, 제공자 버튼, 이메일과 코드 입력, 세션 확인 화면

현재 `SupabaseGate` 컴포넌트는 이름을 바꿔 남기지 않는다. Supabase 클라이언트 생성은 `shared/supabase`가 소유하고, React Native `AppState`에 따른 `startAutoRefresh`와 `stopAutoRefresh`는 Auth 세션 상태가 소유한다. 필수 Supabase 환경 변수는 현재 `app.config.ts`의 실행 전 검사를 유지한다. 앱 안에서 별도의 Supabase 설정 오류 화면은 제공하지 않는다.

Settings 화면은 Supabase 클라이언트나 `QueryClient`를 직접 다루지 않는다. Auth 상태가 제공하는 로그아웃 동작을 사용한다.

### Chat과 Home 책임

Chat 기능은 Hono 전송, `useChat` 상태와 Chat UI를 함께 소유한다. Home 화면은 Chat 기능을 표시하고 Settings 진입 툴바를 조립한다. Chat 상태와 UI를 `screens/home`에 구현하지 않는다.

첫 버전의 대화는 기존 결정대로 메모리에만 유지한다. React Query에 넣거나 Supabase에 저장하지 않는다.

### 화면과 임시 콘텐츠 보존

첫 구조 개편에서는 다음 내용을 그대로 유지한다.

- Activity의 스크롤 확인용 임시 목록
- Saved의 디자인 결정 임시 목록
- Settings의 Notifications와 Haptics 임시 스위치
- Home 툴바의 `T` 이니셜 아바타
- Home, Activity, Saved와 Settings의 현재 경로와 네이티브 표시 방식
- Settings의 `pageSheet`, 닫기 툴바와 `@expo/ui` 화면 소유권

임시 콘텐츠를 실제 제품 기능으로 바꾸거나 제거하는 작업은 이 명세에 포함하지 않는다.

### 테스트 위치와 검증 범위

- 단위 테스트와 컴포넌트 테스트는 대상 파일 옆으로 함께 이동한다.
- Expo Router 경로 통합 테스트는 `apps/mobile/app` 밖에 둔다.
- 여러 영역이 공유하는 가짜 Supabase와 렌더링 도구만 `shared/test`에 둔다.
- 임시 화면의 기존 테스트는 콘텐츠와 함께 유지한다.
- `settings-theme.ts`와 그 전용 테스트는 제거한다. 실제 Settings 화면 테스트가 같은 색상 전달 동작을 확인한다.
- 구조 이동 뒤에도 모바일 타입 검사, 코드 검사와 Jest 테스트가 모두 통과해야 한다.
- Development Build에서 로그인 경로, Home Chat, 탭 이동, Settings 열기와 로그아웃이 기존처럼 동작해야 한다.

## 완료 조건

- `apps/mobile/app`에는 Expo Router 경로 파일만 있다.
- `apps/mobile/src`의 운영 코드는 `core`, `features`, `screens`, `shared` 중 소유권에 맞는 한 영역에 있다.
- `features`에는 `auth`와 `chat`만 있다.
- `home`, `activity`, `saved`, `settings`는 `screens`에 있다.
- 최상위 `src/api`, `src/navigation`, `src/query`, `src/supabase`, `src/theme`, `src/test` 폴더가 남아 있지 않다.
- 빈 책임 폴더와 기본 `index.ts`가 생기지 않는다.
- 영역을 넘는 import가 `@/*` 별칭을 사용하고 정해진 의존 방향을 지킨다.
- 네트워크 호출 코드가 TanStack Query를 import하지 않는다.
- Auth 세션이 TanStack Query 캐시에 들어가지 않는다.
- `SupabaseGate`가 남아 있지 않고 Auth 세션 자동 갱신이 유지된다.
- 기존 화면, 임시 콘텐츠, 인증, Chat 스트리밍, 로그아웃과 내비게이션 동작이 이 명세에서 명시한 예외 외에는 바뀌지 않는다.
- [모바일 코드 구조 결정](../../decisions/mobile-code-architecture.md)이 이 명세와 같은 현재 용어를 사용한다.

## 이번 개편에서 제외할 범위

- Activity, Saved와 Settings의 실제 제품 기능 구현
- 임시 콘텐츠와 임시 아바타의 삭제 또는 디자인 변경
- Supabase 테이블, RLS, 마이그레이션과 생성 타입 변경
- Hono API와 AI 채팅 프로토콜 변경
- 대화 저장과 지난 대화 조회
- Repository, Service 또는 별도 Domain Model 도입
- 새 상태 관리 라이브러리와 폴더 경계 검사 도구 도입
- Expo Router 경로, NativeTabs와 Settings 표시 방식 변경
- 패키지 설치, 제거 또는 버전 변경

## 가정

- 첫 개편은 파일 이동과 책임 분리에 집중한다.
- `settings-theme.ts`는 별도 경계가 필요한 로직이 아니라고 보고 Settings 화면에 합친다.
- 자동 import 경계 검사 도구는 추가하지 않고 기존 TypeScript와 Ultracite 검사를 유지한다.
- 기능 내부 파일을 얼마나 잘게 나눌지는 위 책임 경계를 지키는 범위에서 구현자가 결정한다.
- `app.config.ts`가 모바일과 빌드 시점 모두에서 사용 가능한 순수 환경 설정 모듈을 import하는 것은 허용한다.

## 남은 위험

- Provider 순서를 바꾸면 HeroUI 테마, Supabase 세션 복원 또는 Query Client 접근 시점이 달라질 수 있다.
- Auth 화면의 상태와 UI를 나누는 과정에서 재전송 타이머, 중복 실행 방지와 제공자 취소 처리가 달라질 수 있다.
- 경로 통합 테스트의 모듈 Mock이 현재 상대 경로에 묶여 있어 파일 이동과 함께 빠짐없이 바뀌어야 한다.
- 첫 개편은 import 경계를 자동으로 막지 않으므로 이후 코드가 규칙을 어길 가능성이 남는다.
- 앱 안의 Supabase 설정 오류 화면을 제거하면 `app.config.ts` 검사를 거치지 않은 비표준 실행 경로에서는 오류 표현이 달라질 수 있다.
