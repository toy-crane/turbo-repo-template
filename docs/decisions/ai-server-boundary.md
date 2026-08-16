# AI 서버 경계

## 결정

- AI SDK를 사용하는 서버 요청은 `apps/api`의 Hono 앱이 담당한다.
- `apps/api`는 모바일 앱과 분리된 Vercel 프로젝트로 연결하고 Vercel Functions에 배포한다.
- 모바일 앱은 모델 제공자를 직접 호출하지 않고 Hono API를 호출한다.
- 비용이 발생하는 AI API는 Supabase Auth 로그인 사용자의 access token을 요구한다.
- Hono는 `@supabase/server/adapters/hono`의 `withSupabase({ auth: 'user' })`를 비용이 발생하는 AI 경로에 적용한다.
- `apps/api`의 환경에는 실제 Supabase secret key를 두지 않는다. `@supabase/server`가 인증 방식과 무관하게 관리자 클라이언트를 만들면서 secret key를 요구하므로, 자격 증명이 아닌 자리표시자를 `env.secretKeys`로 넘겨 요구를 채운다.
- Supabase Auth의 익명 로그인을 사용하지 않는다.

## 경계

- 상태 확인처럼 모델을 호출하지 않고 설정값을 노출하지 않는 경로는 로그인 없이 제공할 수 있다.
- 모델 제공자와 Vercel AI Gateway의 비밀 값은 서버만 소유한다.
- AI 요청은 `supabaseAdmin`을 사용하지 않고 로그인 사용자의 RLS가 적용되는 `supabase` 클라이언트를 사용한다. 이 클라이언트를 만드는 데 필요한 `SUPABASE_PUBLISHABLE_KEY`는 공개 값이므로 서버 환경에 둔다. 계정 삭제 뒤 남은 access token이 비용이 드는 AI 요청을 보내지 못하도록 Supabase Auth에 현재 사용자 계정이 남아 있는지도 확인한다.
- 자리표시자는 자격 증명이 아니라 권한을 없애는 값이다. `sb_secret_` 형태를 쓰지 않으며, 나중에 누군가 `supabaseAdmin`을 호출하면 조용히 통과하지 않고 이 값으로 실패한다. 실제 secret key가 필요한 계정 삭제는 [계정 삭제 서버 경계](account-deletion-server-boundary.md)에 따라 Supabase Edge Function으로 분리한다.
- 이 결정은 모델 제공자와 모델, 대화 저장 방식, 사용량 제한 수치, AI와 무관한 서버 API의 소유권을 정하지 않는다.

## 이유

별도 서버 경계는 모델 비밀 값과 비용이 드는 호출을 모바일 번들에서 분리한다. Hono가 인증, 사용량 제한과 서버 도구 실행을 한곳에서 처리하면 AI 기능마다 같은 보호 장치를 반복하지 않아도 된다. `@supabase/server`의 Hono 어댑터를 사용하면 access token 검증, 사용자 정보와 RLS 클라이언트 생성을 직접 구현하지 않아도 된다. 익명 로그인을 끄면 별도 익명 사용자 검사 없이 `auth: 'user'`를 로그인 사용자 경계로 사용할 수 있다. `apps/api`를 별도 Vercel 프로젝트로 배포하면 모바일 앱의 빌드와 배포 주기에 묶이지 않으면서 Vercel Functions의 Hono 및 응답 스트리밍 지원을 사용할 수 있다.

계정 삭제를 Supabase Edge Function으로 분리하면 `apps/api`는 실제 Supabase secret key를 받지 않는다. 설치된 `@supabase/server`가 관리자 클라이언트를 항상 만들기 때문에 AI 경로에는 자리표시자가 계속 필요하다. 서명만 확인한 JWT는 계정 삭제 뒤에도 만료 전까지 남을 수 있으므로, 비용 보호에는 현재 사용자 확인도 필요하다.

## 재검토 조건

- Vercel Functions가 Hono 또는 필요한 AI 응답 스트리밍을 안정적으로 지원하지 못할 때
- `@supabase/server` Hono 어댑터가 필요한 인증 정책이나 권한 분리를 지원하지 못할 때
- `@supabase/server`가 관리자 클라이언트를 필요할 때만 만들어 AI 경로의 secret key 자리표시자가 필요 없어질 때
- 다른 서버 앱이 생겨 AI API를 별도 앱으로 유지하는 비용이 이점보다 커질 때
- 로그인 전 AI 체험이 제품 요구에 포함될 때
- AI 기능과 모델 호출이 제품 범위에서 빠질 때

## 계속 제외하는 대안

- 모바일 앱에서 모델 제공자를 직접 호출: 비밀 값과 유료 호출을 기기에 노출하므로 제외한다. 모델 제공자가 최종 사용자용으로 제한된 공개 자격 증명 방식을 제공할 때만 재검토한다.
- Expo API Route가 AI API를 함께 소유: 모바일 앱과 서버의 배포 경계가 다시 결합된다. 두 런타임을 하나의 배포 단위로 운영해야 할 이유가 생길 때 재검토한다.
- 로그인 없이 유료 AI API를 공개: 사용자별 통제 없이 비용 남용을 막기 어렵다. 게스트 체험과 그에 맞는 별도 제한 정책이 제품 요구로 확정될 때 재검토한다.
- `@supabase/server/core`로 인증 미들웨어를 직접 구성: 현재 필요한 사용자 인증을 처리하면서 공식 Hono 어댑터보다 코드와 설정이 늘어난다. 어댑터로 표현할 수 없는 인증 정책이 생길 때만 재검토한다.
