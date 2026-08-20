# 로컬 인증 제공자 설정

## 결정

- Google과 Apple 로그인은 원격 Supabase 프로젝트 없이 로컬 스택에서 검증한다. 제공자 설정은 `supabase/config.toml`의 `[auth.external.google]`과 `[auth.external.apple]`이 소유한다.
- Google client ID 목록은 `supabase/.env`의 `SUPABASE_AUTH_GOOGLE_CLIENT_IDS`에 두고 `config.toml`은 `env()`로 가리킨다. Supabase CLI가 `supabase/.env`를 자동으로 읽는다.
- Apple의 `client_id`에는 iOS bundle identifier를 그대로 적는다. `bun run setup`이 `apps/mobile/app.json`의 값과 함께 채운다. 환경 변수로 빼지 않는다.
- 두 제공자의 `enabled` 기본값은 `false`다. 자격 정보를 채운 뒤에만 `true`로 바꾼다.
- `.worktreeinclude`에 `supabase/.env`를 포함해 새 worktree가 제공자 설정을 함께 받는다.
- Google OAuth client는 Web, iOS, Android 서명별로 하나씩 만들고 이름은 `<프로젝트 슬러그>-<플랫폼>[-<서명>]`으로 짓는다.

## 경계

- 앱이 `signInWithIdToken`만 사용하므로 Google Web client secret은 로컬 검증에 필요하지 않다. 원격 프로젝트를 쓸 때만 Dashboard에 넣는다.
- Android client ID는 `apps/mobile/.env.local`과 `supabase/.env` 어디에도 넣지 않는다. Android 토큰의 `aud`는 Web client ID이고 Android client ID는 `azp`에만 들어간다.
- Android OAuth client 하나는 package와 SHA-1 한 쌍만 담는다. 서명이 늘면 client를 추가로 만든다.
- 로컬 Development Build의 debug SHA-1은 Google Cloud에만 등록하고 환경 변수나 앱 코드에 넣지 않는다.
- `apps/mobile/android`는 생성물이므로 debug keystore를 포함해 커밋하지 않는다.
- 원격 Supabase 프로젝트의 제공자 설정은 Dashboard가 소유한다. `config.toml`은 로컬 스택만 설정한다.

## 이유

앱은 브라우저 OAuth 대신 네이티브 로그인이 발급한 ID Token을 Supabase에 넘긴다. Supabase가 하는 일은 서명, `aud`, nonce 검증뿐이라 redirect URI가 실행 경로에 없다. 그래서 원격 프로젝트 없이도 로컬 스택이 같은 검증을 수행한다. 제공자 설정 때문에 원격 프로젝트를 먼저 만들 이유가 사라진다.

client ID는 앱 번들에 들어가는 공개 값이지만 프로젝트마다 다르다. `supabase/.env`에 두면 `config.toml`을 프로젝트 사이에서 그대로 옮길 수 있고, 셸 환경 변수가 파일을 이기므로 CI에서는 파일 없이 주입할 수 있다. Apple의 `client_id`는 `apps/mobile/app.json`에 이미 커밋된 bundle identifier와 같은 값이라, 환경 변수로 빼면 숨기는 것 없이 설정 단계만 늘어난다. 대신 두 파일이 어긋나면 Apple 로그인이 `Bad ID token`으로만 드러나므로 `bun run setup`이 두 값을 함께 쓴다.

Google은 Android 앱을 package와 서명 인증서로 확인한다. Android OAuth client는 그 쌍을 등록하는 수단이고 client ID 자체는 코드가 쓰지 않는다. 등록이 빠지면 `DEVELOPER_ERROR`로 즉시 실패한다.

## 재검토 조건

- 웹 로그인을 추가해 브라우저 OAuth callback과 client secret이 실행 경로에 들어올 때
- Supabase가 Android 토큰의 `azp`까지 검증하도록 바뀔 때
- 로컬 스택과 원격 프로젝트의 제공자 설정을 한 곳에서 관리해야 할 때
- Expo가 템플릿 debug keystore를 프로젝트마다 생성하는 방식으로 바꿀 때
- Supabase CLI가 `supabase/.env`를 자동으로 읽지 않게 될 때

## 계속 제외하는 대안

- 제공자 검증에 원격 Supabase 프로젝트를 요구: 네이티브 ID Token 검증에 필요하지 않은 원격 자원과 자격 정보 관리를 첫날부터 강제한다.
- Apple `client_id`를 환경 변수로 분리: 같은 값이 `app.json`에 이미 공개돼 있어 숨기는 효과 없이 설정 단계만 늘어난다.
- Apple `client_id`를 README 절차로 사람이 적게 하기: `bun run setup`이 이미 아는 값이고, 어긋나도 아무도 알려 주지 않는다.
- Android client ID를 `SUPABASE_AUTH_GOOGLE_CLIENT_IDS`에 추가: 검증에 쓰이지 않는 값이라 목록이 실제 검증 대상과 어긋난다.
- debug keystore를 저장소에 커밋: `apps/mobile/android` 전체가 생성물이라 `app.json`과 어긋나기 시작하고, 템플릿에서 언제든 다시 나오므로 잃어버릴 위험도 없다.
- Google Cloud 프로젝트를 개발용과 배포용으로 분리: client ID가 전부 갈라져 환경마다 다른 값을 관리해야 한다. 서명별 Android client만 추가하면 한 프로젝트로 충분하다.

## 보존할 근거

- Expo 템플릿의 debug keystore는 프로젝트마다 생성하지 않고 그대로 복사한다. `expo-template-bare-minimum@57.0.16`의 `android/app/debug.keystore` SHA-256이 `221e0a3106aa4c3ccc154e0a418b55020b3f9ea6e84f92e8749cd9e2f39f5e58`이고, 인증서는 2014-01-01 발급에 2052-05-01 만료다. 따라서 debug SHA-1 `5E:8F:16:06:2E:A3:CD:2C:4A:0D:54:78:76:BA:A6:F3:8C:AB:F6:25`은 worktree와 머신이 달라도 같다. 순수 React Native CLI 프로젝트는 이와 달리 머신마다 다른 값을 만든다.
- 로컬 스택의 제공자 활성 상태는 `/auth/v1/settings`로 확인한다. 2026-08-20 이 저장소에서 기본 설정은 `google`과 `apple`이 `false`, `email`이 `true`였고, `supabase/.env`를 채우고 `enabled = true`로 바꾸자 `google`이 `true`가 됐다. Apple은 `client_id`에 bundle identifier만 넣고 secret 없이 `true`가 됐다.
- 셸 환경 변수가 `supabase/.env`를 이긴다. 2026-08-20 파일에 `FILE-VALUE`를, 셸에 `SHELL-VALUE`를 넣고 스택을 띄우자 auth 컨테이너의 `GOTRUE_EXTERNAL_GOOGLE_CLIENT_ID`가 `SHELL-VALUE`였다. 그래서 CI는 파일 없이 환경 변수로 주입할 수 있다.
- 꺼진 제공자에 ID Token을 보내면 `Unsupported provider`가, 켜진 제공자에 잘못된 토큰을 보내면 `Bad ID token`이 돌아온다. 두 응답이 설정 문제와 토큰 문제를 구분해 준다.
- `config.toml`의 `skip_nonce_check` 기본 주석은 "Required for local sign in with Google auth"라고 안내하지만 이 앱에는 해당하지 않는다. 앱이 로그인마다 nonce를 만들어 보내므로 `false`를 유지한다.
