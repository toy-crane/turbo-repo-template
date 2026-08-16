# 계정 삭제 서버 경계

## 결정

- 모바일 앱의 계정 삭제 요청은 Supabase Edge Function이 처리한다. 기존 `apps/api`
  Hono 앱에는 계정 삭제 경로를 추가하지 않는다.
- 모바일 앱은 현재 사용자의 access token으로 Edge Function을 직접 호출한다. 함수는
  `@supabase/server`의 `auth: 'user'`를 사용하고 플랫폼의 `verify_jwt` 검사를 켠다.
- 삭제할 사용자 식별자는 검증한 사용자 정보에서 읽는다. 요청 본문으로 사용자
  식별자를 받지 않는다.
- Edge Function은 Supabase가 주입한 `SUPABASE_SECRET_KEYS`로 관리자 클라이언트를
  만들어 프로필 사진과 현재 사용자의 인증 계정을 삭제한다.
- 함수는 먼저 `profiles.account_deletion_started_at`을 기록한다. 프로필 사진 쓰기
  정책은 이 행을 잠근 채 값을 확인하므로, 이미 시작한 쓰기가 끝날 때까지 함수가
  기다리고 새 쓰기는 거부한다. 함수는 그다음 사용자 폴더의 파일을 모두 지우고
  마지막에 인증 계정을 지운다.
- 프로필 사진의 새 경로는 `<사용자 ID>/<파일 이름>` 한 단계만 허용한다. 함수는
  이전 정책에서 만들었을 수 있는 중첩 폴더도 재귀적으로 지운다.
- `apps/api` 배포 환경에는 실제 Supabase secret key를 두지 않는다. AI 경로는 현재
  자리표시자를 유지하고 `supabaseAdmin`이 관리자 작업에 성공하지 못하게 한다.
- 함수는 Deno 호환 Edge Runtime에서 실행한다. `@supabase/server`를 `npm:`으로
  가져오고 함수 전용 `deno.json`에서 버전을 고정한다.
- 계정 삭제 뒤에도 만료 전 access token의 서명은 유효할 수 있다. 개인정보를
  다루거나 비용이 드는 사용자 경로는 서명만 확인하지 않고, Supabase Auth에 현재
  사용자가 남아 있는지도 확인한다.
- 삭제 도중 Storage 또는 Auth 작업이 실패하면 삭제 시작 표시는 그대로 둔다. 이
  상태에서는 프로필 사진을 새로 쓸 수 없으며, 같은 삭제 요청으로 남은 작업을 다시
  시도할 수 있다.

## 경계

- 모바일 앱은 사용자 access token만 Edge Function에 보낸다. secret key를 앱,
  공유 패키지, 공개 환경 변수, 로그와 응답에 넣지 않는다.
- Edge Function은 `auth: 'secret'`을 사용하지 않는다. secret key는 호출자를
  인증하는 값이 아니라, 로그인한 현재 사용자의 삭제를 실행하는 서버 권한이다.
- 이 선택은 Supabase Edge Function과 `apps/api` 사이의 배포 경계를 만든다. 다만
  Supabase는 같은 프로젝트의 Edge Function 환경에 관리자 key를 자동으로
  주입하므로, 앞으로 추가할 모든 Edge Function도 관리자 권한을 다룰 수 있는
  코드로 검토해야 한다.
- 새 관리자 기능이 생겼다는 이유만으로 기존 AI 경로에 `supabaseAdmin` 사용을
  허용하지 않는다. 각 기능은 별도 결정을 거쳐야 한다.
- 삭제 화면과 삭제 범위, 확인 단계, 실패 상태는
  [모바일 계정 삭제](mobile-account-deletion.md)를 따른다.

## 이유

기존 Hono 앱에서 경로별 환경 값을 덮어쓰면 AI 경로에 작동하는 관리자 클라이언트를
전달하지 않을 수 있다. 하지만 실제 secret key는 같은 Bun 프로세스에 남으므로 코드
실수만 줄일 뿐, 프로세스가 침해됐을 때 관리자 권한까지 보호하지는 못한다.

계정 삭제는 사용자 계정 전체를 지우는 제한된 관리자 작업이다. Deno 실행과 별도
배포 절차가 추가되더라도 Supabase Edge Function으로 분리하면 AI 서버는 실제
Supabase secret key를 전혀 받지 않는다. 현재 `supabase/config.toml`은 이미 로컬
Edge Runtime과 Deno 2를 켜 두었으므로 새 런타임을 준비하는 범위도 제한적이다.

## 재검토 조건

- Supabase Edge Function이 필요한 Auth 또는 Storage 관리자 작업을 안정적으로
  지원하지 못할 때
- 관리자 기능이 늘어나 공통 로직, 배포와 상태 확인을 별도 서버 앱에서 관리하는
  편이 더 단순해질 때
- 같은 Supabase 프로젝트의 Edge Function끼리도 관리자 key를 격리해야 할 때
- 프로젝트가 Edge Runtime을 더는 로컬이나 원격에서 운영할 수 없게 될 때

## 계속 제외하는 대안

- 기존 `apps/api` Hono 앱: 실행과 배포 절차를 재사용할 수 있지만 실제 secret
  key가 AI 서버와 같은 프로세스에 들어간다. 배포 단위 격리가 더는 필요하지 않을
  때만 다시 검토한다.
- 별도 Hono 서버 또는 Vercel 프로젝트: Bun을 유지하면서 자격 증명을 격리하지만
  Supabase가 제공하는 함수 실행과 환경 설정 대신 서버 배포를 하나 더 운영해야
  한다. Deno 제약이 실제 구현을 막을 때 다시 검토한다.
- 모바일 앱에서 관리자 API 직접 호출: secret key가 배포된 앱에서 추출될 수 있고
  다른 사용자를 삭제할 권한까지 노출하므로 허용하지 않는다.
- 공개 데이터베이스 함수로 인증 사용자 삭제: 관리자 삭제와 Storage 파일 정리를
  공개 데이터 경로에 섞고 권한 검증을 우회할 위험이 있어 허용하지 않는다.

## 보존할 근거

- 공식 [Supabase Edge Function 인증 문서](https://supabase.com/docs/guides/functions/auth)는
  `auth: 'user'`와 기본 `verify_jwt = true`를 로그인 사용자 호출 방식으로 안내한다.
- Supabase Edge Function은 `SUPABASE_SECRET_KEYS`를 자동으로 주입하고
  `@supabase/server`의 `supabaseAdmin`을 제공한다.
- 공식 [의존성 관리 문서](https://supabase.com/docs/guides/functions/dependencies)는 함수별
  `deno.json` 사용을 권장한다.
- 현재 `supabase/config.toml`은 Edge Runtime을 켜고 Deno 2를 지정한다.
- 현재 Supabase CLI 2.113.0은 함수 생성, 로컬 실행과 배포 명령을 제공한다.
