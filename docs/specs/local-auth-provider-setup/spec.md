# 로컬 인증 제공자 설정 명세

## 목표

- 템플릿에서 새 앱을 시작한 사람이 원격 Supabase 프로젝트를 만들지 않고도
  로컬 스택에서 Google과 Apple 로그인을 검증한다.
- `bun run setup`이 아는 값은 사람이 다시 옮겨 적지 않는다.
- Google OAuth client 등록 절차에서 지금 README가 잘못 안내하는 부분을 고친다.

## 배경

`toy-crane/flyn`이 이 템플릿으로 시작하면서 같은 설정을 처음부터 다시 풀었다.
그 결과([PR #1](https://github.com/toy-crane/flyn/pull/1))에서 프로젝트 고유값을
뺀 나머지를 템플릿으로 되돌린다. flyn의 시작 커밋은 이 템플릿 `main`과 같은
상태였으므로 아래 항목은 전부 템플릿에 없는 내용이다.

## 확정 범위

### 설정 파일

- `supabase/config.toml`에 `[auth.external.google]` 블록을 더한다.
  `client_id`는 `env(SUPABASE_AUTH_GOOGLE_CLIENT_IDS)`를 가리키고,
  `skip_nonce_check`는 `false`, `enabled`는 `false`로 둔다.
- `supabase/.env.example`을 만든다. `SUPABASE_AUTH_GOOGLE_CLIENT_IDS` 하나를
  담고, 복사 위치와 값을 바꾼 뒤 스택을 다시 띄워야 한다는 점을 적는다.
- `.worktreeinclude`에 `supabase/.env`를 더한다.
- `[auth.external.apple]`의 `client_id`를 `bun run setup`이 iOS
  bundleIdentifier와 같은 값으로 채운다. `enabled`는 `false`로 남긴다.

### `bun run setup`

- `IDENTITY_FIELDS`에 `[auth.external.apple]`의 `client_id`를 더하고
  `mobileAppId`를 원본으로 삼는다.
- TOML 읽기와 적용 검증이 블록을 구분하게 고친다. 지금
  [identity.ts](../../../scripts/setup/identity.ts)의 `readTomlKey`는
  `^client_id = "…"$`의 첫 일치를 돌려주므로, google 블록이 생기면 apple 값을
  읽지 못한다.
- 새 필드와 블록 구분을 덮는 테스트를 더한다.

### README

- 사전 준비 표의 Google·Apple 행에 로컬 스택으로도 검증할 수 있음을 적는다.
- Google과 Apple 절차를 로컬 스택과 원격 프로젝트로 나눈다.
- Supabase Client ID 목록에서 Android client ID를 뺀다. Android가 돌려주는 ID
  Token의 `aud`는 Web client ID이고 Android client ID는 `azp`에만 들어가므로
  Supabase가 검증에 쓰지 않는다.
- Web client의 Authorized redirect URI로 로컬 주소
  `http://127.0.0.1:54321/auth/v1/callback`을 먼저 안내하고, 원격 프로젝트를 쓸
  때 원격 callback을 함께 등록하게 한다.
- Android debug 서명 SHA-1을 고정값으로 적고, 직접 확인하는 방법을
  `./gradlew signingReport` 대신 `keytool`로 바꾼다.
- Android 빌드 생성 명령을 `bun run --cwd apps/mobile android`에서
  `bun run dev android`로 고친다. 지금 문구는 [AGENTS.md](../../../AGENTS.md)의
  "`apps/mobile`의 명령을 직접 쓰지 않는다"와 어긋난다.

### 문서

- 결정 계약 `docs/decisions/local-auth-provider-configuration.md`를 만든다.
  OAuth client 이름 규칙은 프로젝트 슬러그를 쓰는 형태로 일반화한다.
- `docs/decisions/README.md`의 데이터베이스 영역에 한 줄을 더한다.
- `docs/decisions/mobile-authentication.md`에서 새 계약을 가리키는 한 줄을
  더한다.
- flyn이 남긴 follow-up "지운 계정의 세션이 남아 앱이 프로필 오류 화면에서
  멈춘다"를 `docs/follow-ups/`로 옮긴다. 증상, 증거, 의심 원인, 다음 단계를
  그대로 보존하고 flyn 고유의 기기 이름과 bundle identifier만 바꾼다.

## 수용 기준

- 갓 받은 템플릿에서 `bun run db:start`가 성공한다. 두 제공자 모두 꺼져 있어
  `/auth/v1/settings`가 `google`과 `apple`에 `false`, `email`에 `true`를
  돌려준다.
- `bun run setup`을 실행하면 `supabase/config.toml`의
  `[auth.external.apple].client_id`가 `apps/mobile/app.json`의
  `expo.ios.bundleIdentifier`와 같아진다.
- `[auth.external.google]`이 있는 상태에서 `bun run setup`이 google 블록의
  `client_id`를 건드리지 않는다.
- `bun run setup`을 두 번 실행해도 결과가 같고 오류가 나지 않는다.
- `supabase/.env.example`을 `supabase/.env`로 복사해 Google client ID를 채우고
  `[auth.external.google]`의 `enabled`를 `true`로 바꾼 뒤 스택을 다시 띄우면
  `/auth/v1/settings`가 `google`에 `true`를 돌려준다.
- `supabase/.env`는 커밋되지 않고 `supabase/.env.example`은 커밋된다.
- 새 worktree를 만들면 `supabase/.env`가 함께 복사된다.
- README를 따라가면 원격 Supabase 프로젝트를 만들지 않고 Google·Apple 로그인
  준비를 끝낼 수 있다.
- README 어디에도 Supabase Client ID 목록에 Android client ID를 넣으라는 안내가
  남아 있지 않다.
- `bun run check-types`와 `bun run test`가 통과한다.

## 확정 제약과 이유

- 두 제공자의 `enabled` 기본값은 `false`다. `SUPABASE_AUTH_GOOGLE_CLIENT_IDS`가
  비어 있으면 Supabase가 `env(…)` 문자열을 그대로 client ID로 쓴다. 자격 정보를
  담지 않는 템플릿에서 켜 두면 실패하는 설정으로 출발한다.
- Apple `client_id`는 환경 변수로 빼지 않는다. 같은 값이 `apps/mobile/app.json`에
  이미 커밋돼 있어 숨기는 효과 없이 설정 단계만 늘어난다.
- Apple `client_id`는 사람이 아니라 `bun run setup`이 채운다. 두 파일이
  같아야 한다는 제약이고, 어긋나면 Apple 로그인이 `Bad ID token`으로만 드러나
  원인을 찾기 어렵다.
- `skip_nonce_check`는 `false`를 유지한다. `config.toml`의 기본 주석은 Google
  로컬 로그인에 필요하다고 안내하지만, 이 앱은 로그인마다 nonce를 만들어
  보내므로 해당하지 않는다.

## 가정

- 결정 계약은 결정 계약 색인의 데이터베이스 영역에 둔다. Supabase 설정을 다루기
  때문이다.
- Android debug SHA-1 고정값
  `5E:8F:16:06:2E:A3:CD:2C:4A:0D:54:78:76:BA:A6:F3:8C:AB:F6:25`를 README에 적는다.
  Expo 템플릿이 debug keystore를 프로젝트마다 만들지 않고 그대로 복사하므로
  머신과 worktree가 달라도 같다. 고정값을 적으면 Android 빌드를 한 번 만들기
  전에 Google Cloud에 SHA-1을 먼저 등록할 수 있다. 구현할 때 이 워크트리에서
  keystore의 SHA-256을 Expo 공식 저장소 파일과 다시 대조한다.
- OAuth client 이름 규칙은 `<프로젝트 슬러그>-<플랫폼>[-<서명>]`으로 적는다.

## 제외와 이유

- 프로젝트 고유값은 옮기지 않는다. 루트 package name, Expo 표시 이름, slug,
  scheme, bundleIdentifier, Android package, Supabase `project_id`는 전부 flyn의
  값이고 `bun run setup`이 이미 다루는 필드다.
- 실제 client ID, client secret, keystore와 자격 정보는 넣지 않는다.
- 원격 Supabase 프로젝트의 제공자 설정 방식은 바꾸지 않는다. Dashboard가 계속
  소유한다.
- 프로필 조회 동작은 바꾸지 않는다. 지운 계정 세션 결함은 follow-up으로만
  옮기고 별도 작업 단위로 정한다. 설정 변경과 다른 논리적 변경이고, 세션은
  있는데 프로필 행이 없을 때 로그아웃할지 정하는 제품 결정이 먼저 필요하다.
- 웹 로그인은 다루지 않는다. 브라우저 OAuth callback과 client secret이 실행
  경로에 들어오지 않는다.

## 남은 위험

- Google 로그인의 끝까지 검증은 실제 Google Cloud 프로젝트와 OAuth client가
  있어야 한다. 템플릿 저장소에서는 `/auth/v1/settings` 응답과 `enabled` 전환까지
  확인하고, 실제 로그인 성공은 이 템플릿으로 시작한 프로젝트에서 확인한다.
- Apple 로그인은 Apple Developer의 App ID capability가 있어야 검증된다.
  템플릿에서는 `client_id`가 bundleIdentifier와 같아지는지까지 확인한다.
- `readTomlKey`를 블록 인식 방식으로 고치면 `project_id` 읽기 경로도 함께
  바뀐다. 기존 setup 테스트가 이 변경을 잡아내야 한다.
- Supabase CLI가 `supabase/.env`를 읽는 동작에 기대고 있다. CLI를 올릴 때 이
  동작이 유지되는지 확인한다.
