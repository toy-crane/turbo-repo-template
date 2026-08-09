# 모바일 인증 명세

## 목표

Expo 모바일 앱에 Google, Apple과 이메일 일회용 비밀번호 로그인을 추가한다. Supabase Auth를 앱 세션의 기준으로 삼고 로그인한 사용자만 앱 화면에 들어갈 수 있게 한다. `public.profiles`는 `auth.users`와 일대일로 연결하며 사용자가 직접 고친 프로필 값을 제공자 정보로 덮어쓰지 않는다. 사람과 AI 에이전트가 같은 로컬 이메일 인증 경로를 재현할 수 있게 한다.

## 적용할 결정

- [모바일 인증](../../decisions/mobile-authentication.md)
- [모바일 개발 런타임](../../decisions/mobile-development-runtime.md)
- [모바일 테스트와 런타임 검증](../../decisions/mobile-testing-and-verification.md)
- [Supabase 클라이언트 경계](../../decisions/supabase-client-boundaries.md)
- [Supabase 스키마 작업 방식](../../decisions/supabase-schema-workflow.md)
- [모바일 원격 데이터 상태](../../decisions/mobile-remote-data.md)
- [템플릿 프로젝트 정체성](../../decisions/template-project-identity.md)

## 필요한 최종 상태

### 제공자와 플랫폼

| 로그인 방식 | iOS | Android | Supabase 연결 |
| --- | --- | --- | --- |
| Google | 제공 | 제공 | 네이티브 ID Token과 원본 nonce를 `signInWithIdToken`에 전달 |
| Apple | 제공 | 제공하지 않음 | 네이티브 ID Token과 원본 nonce를 `signInWithIdToken`에 전달 |
| 이메일 | 6자리 일회용 비밀번호 | 6자리 일회용 비밀번호 | `signInWithOtp` 요청 뒤 `verifyOtp`로 확인 |

- 웹 로그인, 브라우저 OAuth 콜백과 인증용 딥 링크를 만들지 않는다.
- Google은 `react-native-nitro-google-signin`과 `react-native-nitro-modules`을 사용한다.
- Apple은 `expo-apple-authentication`을 사용하고 iOS 앱에 Sign in with Apple capability를 설정한다.
- 네이티브 의존성이나 설정이 바뀌면 iOS와 Android Development Build를 다시 만든다. Expo Go는 인증 검증 경로가 아니다.
- Google과 Apple 버튼은 각 제공자의 공식 네이티브 버튼을 사용한다. HeroUI Native는 로그인 화면 배치, 이메일 입력, 일회용 비밀번호 입력, 일반 동작 버튼, 진행 상태와 오류를 담당한다.

### 인증 화면과 보호 경로

- 로그인 화면은 앱 이름과 짧은 안내, Google 버튼, iOS의 Apple 버튼, 구분선, 이메일 입력과 계속 버튼을 이 순서로 보여준다.
- 이메일을 제출하면 같은 인증 흐름 안에서 6자리 일회용 비밀번호 입력 단계로 이동한다. 이메일 수정과 코드 다시 받기 동작을 제공한다.
- 이메일 형식 오류, 잘못되거나 만료된 코드, 전송 제한과 네트워크 오류를 해당 입력 가까이에 알려준다.
- Expo Router는 인증 전용 route group과 앱 route group을 나눈다. `Stack.Protected`의 세션 조건으로 탭과 설정 화면을 보호한다.
- 앱은 저장된 Supabase 세션 확인이 끝날 때까지 로그인 화면이나 보호 화면을 먼저 보여주지 않는다. 이때는 중립적인 시작 상태만 보여준다.
- 유효한 세션이 있으면 제공자 SDK를 다시 호출하지 않고 앱 화면을 연다.
- 세션이 없거나 읽을 수 없으면 로그인 화면을 연다. Supabase 공개 설정이 잘못된 오류는 로그아웃 상태와 구분해서 보여준다.
- 로그아웃이나 세션 만료로 보호 조건이 거짓이 되면 Expo Router가 보호 경로 기록을 제거하고 로그인 화면으로 이동한다.
- 로그인 성공 뒤 별도 필수 온보딩은 열지 않는다. 프로필 이름과 이미지는 없어도 앱을 사용할 수 있다.

### Google 로그인

- 앱은 기본 신원 확인에 필요한 ID Token만 사용한다. Google API 추가 scope, access token, offline access와 `serverAuthCode`를 요청하지 않는다.
- 앱은 로그인 시도마다 암호학적으로 안전한 원본 nonce를 새로 만든다. SHA-256으로 해시한 nonce를 Google 요청에 넣고 원본 nonce를 Supabase `signInWithIdToken`에 전달한다.
- Supabase Google Provider의 nonce 검사를 끄지 않는다.
- iOS에서 새 Supabase 로그인이 필요하면 `presentExplicitSignIn()`으로 Google 계정 선택 화면을 연다. `signIn()`의 저장된 사용자 복원을 새 앱 로그인으로 사용하지 않는다.
- Android에서는 사용자가 Google 버튼을 누른 뒤 Credential Manager 기반 로그인 화면을 연다. 사용자 동작 없이 새 Supabase 로그인을 만들지 않는다.
- 사용자가 계정 선택을 취소하면 오류 알림을 띄우지 않고 로그인 화면을 유지한다.
- Google이 ID Token을 반환하지 않거나 Supabase 검증이 실패하면 원인을 알 수 있는 오류를 보여주고 버튼의 진행 상태를 끝낸다.

### Apple 로그인

- Apple 버튼은 iOS에서만 보여준다. 공식 `AppleAuthenticationButton`의 현지화, 크기와 스타일 규칙을 유지한다.
- Apple 요청은 `FULL_NAME`과 `EMAIL` scope를 포함한다.
- 앱은 로그인 시도마다 원본 nonce를 새로 만들고 SHA-256 해시를 Apple 요청에 전달한다. 원본 nonce는 ID Token과 함께 Supabase에 전달하며 nonce 검사를 끄지 않는다.
- Apple이 이름을 첫 승인 때만 줄 수 있으므로 값이 있으면 첫 로그인 완료 과정에서 바로 프로필 후보로 사용한다. 값이 없다고 로그인을 실패시키지 않는다.
- 사용자가 로그인을 취소하면 오류 알림을 띄우지 않는다. ID Token이 없거나 Supabase 검증이 실패하면 오류를 보여준다.
- 로그아웃 때 `AppleAuthentication.signOutAsync`를 호출하지 않는다. 앱과 Supabase의 현재 기기 세션만 지운다.

### 이메일 일회용 비밀번호

- 이메일 로그인과 가입은 하나의 화면 흐름으로 제공한다. 존재하지 않는 이메일이면 Supabase가 사용자를 만들 수 있게 한다.
- 이메일 템플릿은 magic link 대신 `{{ .Token }}`을 포함해 6자리 일회용 비밀번호를 보낸다.
- 앱은 이메일 전송에 `signInWithOtp`를 사용하고 입력한 코드는 `verifyOtp`의 이메일 유형으로 확인한다.
- 비밀번호, 비밀번호 재설정과 magic link는 제공하지 않는다.
- 코드 길이, 만료 시간, 다시 보내기 간격과 전송 한도는 Supabase 설정과 화면 안내가 일치해야 한다. 운영 환경은 남용 방지 한도를 유지하고 로컬 환경만 반복 테스트가 가능한 별도 한도를 사용한다.
- 코드 다시 받기는 중복 요청을 막고 남은 대기 시간을 보여준다.

### 세션 생명주기

- 기존 암호화 영구 저장소와 단일 Supabase 클라이언트를 계속 사용한다.
- 인증 Provider는 첫 렌더링에서 `getSession`으로 저장된 세션을 읽고 `onAuthStateChange`로 이후 변경을 반영한다.
- 앱이 foreground로 돌아오면 현재 구성의 자동 토큰 갱신을 다시 시작하고 background에서는 멈춘다.
- 세션 상태는 초기 확인 중, 로그인됨, 로그아웃됨과 설정 오류를 구분한다.
- 만료된 refresh token이나 해독할 수 없는 저장값은 로그인된 상태로 취급하지 않는다. 안전하게 로컬 세션을 지우고 로그인 화면을 연다.
- 인증 세션은 TanStack Query에 저장하지 않는다.

### 신원 연결

- Google, Apple과 이메일 인증이 Supabase가 안전하게 확인한 같은 이메일을 사용하면 Supabase의 자동 신원 연결 결과를 따른다.
- Apple의 비공개 이메일처럼 제공자 이메일이 다르면 서로 다른 사용자와 프로필로 유지한다.
- 앱은 이메일 문자열만 비교해 계정을 합치지 않는다.
- 수동 신원 연결, 계정 병합 화면과 충돌 해결 도구를 만들지 않는다. Supabase의 `enable_manual_linking`은 끈 상태를 유지한다.

### 프로필 스키마와 권한

`public.profiles`는 다음 열만 갖는다.

| 열 | 형식과 규칙 | 용도 |
| --- | --- | --- |
| `id` | `uuid primary key references auth.users(id) on delete cascade` | Supabase 사용자와 일대일로 연결 |
| `display_name` | `text null` | 앱에 표시할 사용자가 수정할 수 있는 이름 |
| `avatar_url` | `text null` | 앱에 표시할 사용자가 수정할 수 있는 이미지 주소 |
| `created_at` | `timestamptz not null default now()` | 프로필 생성 시각 |
| `updated_at` | `timestamptz not null default now()` | 마지막 프로필 수정 시각 |

- `auth.users`에 사용자가 생기면 최소 권한의 데이터베이스 trigger가 같은 `id`의 프로필 한 행을 만든다.
- trigger 함수는 `security definer`와 고정된 빈 `search_path`를 사용하고 모든 객체를 정규화된 이름으로 참조한다. 클라이언트 역할과 `PUBLIC`에는 함수 직접 실행 권한을 주지 않는다.
- trigger는 신원 행만 만든다. 제공자 메타데이터를 해석하거나 외부 작업을 하지 않는다.
- 스키마를 적용할 때 기존 `auth.users`에 대응하는 프로필이 없으면 행을 보충한다. 기존 프로필은 덮어쓰지 않는다.
- `updated_at`은 프로필이 실제로 바뀔 때 데이터베이스가 갱신한다.
- 로그인 성공 뒤 앱은 Google의 이름과 이미지 또는 Apple이 처음 제공한 이름을 빈 프로필 값의 후보로만 사용한다. 이미 값이 있으면 덮어쓰지 않는다.
- 이메일, 제공자 이름, 역할, 사용자 이름, 소개와 온보딩 상태를 프로필에 복제하거나 미리 추가하지 않는다.
- 테이블은 RLS를 켠다. `anon`은 어떤 행도 읽거나 바꿀 수 없다.
- `authenticated`에는 `select`와 `update`만 명시적으로 허용한다. 사용자는 `auth.uid() = id`인 자신의 행만 읽고 수정할 수 있다.
- update 정책은 `USING`과 `WITH CHECK`를 모두 사용해 다른 사용자 `id`로 바꾸지 못하게 한다.
- 클라이언트에는 insert와 delete 권한을 주지 않는다. 프로필 생성과 사용자 삭제 연동은 데이터베이스가 담당한다.
- 기본 권한을 그대로 믿지 않고 `anon`, `authenticated`와 `PUBLIC`의 table, sequence와 function 권한을 명시적으로 정리한다.
- 현재 예시용 `notes` 테이블, 정책, seed와 생성 타입 사용처는 첫 실제 테이블인 `profiles`로 교체한다.

### 로그아웃

- 일반 로그아웃은 `supabase.auth.signOut({ scope: "local" })`으로 현재 기기 세션만 끝낸다.
- Google SDK에는 로컬 `signOut`을 호출해 다음 로그인 때 계정 선택 화면을 다시 보여준다. `revokeAccess`는 호출하지 않는다.
- Apple에는 별도 제공자 로그아웃을 호출하지 않는다.
- 로그아웃이 끝나면 사용자별 TanStack Query 캐시를 지워 다음 사용자가 이전 사용자의 데이터를 보지 않게 한다.
- 로그아웃 중 일부 정리가 실패해도 보호 경로를 계속 보여주지 않는다. 사용자에게 다시 시도할 수 있는 오류를 알리고 로컬 인증 상태를 안전한 쪽으로 정리한다.
- 모든 기기 로그아웃, 다른 기기만 로그아웃, 제공자 동의 철회와 계정 삭제는 별도 기능이다.

### 로컬 AI 인증 검증

- 루트는 `bun run auth:otp -- --email <고유한-로컬-테스트-이메일>` 명령을 제공한다. 구현 파일은 `scripts/auth/read-local-email-otp.ts`에 둔다.
- 이 명령은 로컬 Supabase Mailpit에서 해당 수신자에게 최근 도착한 일회용 비밀번호를 기다렸다가 코드만 사람이 다시 입력할 수 있는 형태로 보여준다.
- 각 실행은 고유한 테스트 이메일을 사용한다. 명령은 수신자와 도착 시각을 확인해 오래된 코드를 잘못 고르지 않으며 제한 시간 안에 메일이 없으면 실패한다.
- 명령은 로컬 Supabase API와 기본 Mailpit 주소에서만 동작한다. 원격 또는 알 수 없는 호스트를 감지하면 코드를 읽지 않고 종료한다.
- 명령은 일회용 비밀번호를 확인하거나 소비하지 않고 앱 세션을 만들거나 주입하지 않는다.
- 화면 검증은 하나의 `agent-device` 세션에서 앱 열기, 이메일 입력, 코드 요청, 위 명령으로 코드 읽기, 코드 입력, 보호 화면 확인, 로그아웃, 로그인 화면 확인 순서로 진행한다.
- `agent-device` 세션 모드는 같은 앱과 기기 문맥에서 여러 화면 동작을 이어갈 때만 사용한다. 검증이 끝나면 세션을 닫는다.
- API와 RLS 통합 테스트는 테스트 내부 전용 도우미를 사용한다. 도우미는 고유 이메일로 실제 코드를 요청하고 Mailpit에서 읽어 `verifyOtp`를 호출한 뒤 그 테스트 프로세스 안에서만 인증된 Supabase 클라이언트를 돌려준다.
- 통합 테스트 도우미는 화면 테스트에 세션을 주입하지 않는다. access token, refresh token과 관리자 비밀을 stdout, 파일 또는 공용 CLI 결과에 남기지 않는다.
- 관리자 API, `service_role`, 고정 JWT와 인증 우회는 로그인 완료 증거로 인정하지 않는다.

### 프로젝트별 설정과 README

- README의 인증 안내는 한국어로 작성하며 템플릿에서 만든 각 프로젝트가 자체 자격 정보를 새로 만드는 절차만 설명한다.
- Google Cloud에서 OAuth 동의 화면과 Web, iOS, Android client ID를 만드는 방법을 설명한다. iOS bundle identifier, Android package와 개발·배포·Play App Signing SHA-1을 각각 올바른 client에 연결하는 방법을 포함한다.
- Supabase Google Provider에 허용할 client ID와 필요한 서버 설정을 연결하고, 모바일 앱에는 공개 client ID만 넣는다는 점을 설명한다.
- Apple Developer에서 App ID와 Sign in with Apple capability를 설정하고 Expo bundle identifier 및 Supabase Apple Provider와 맞추는 절차를 설명한다.
- 로컬 이메일은 Mailpit을 사용한다. 원격 Supabase는 운영 전용 SMTP와 `{{ .Token }}` 이메일 템플릿, 리디렉션 및 전송 한도를 별도로 설정해야 한다고 설명한다.
- 네이티브 설정을 바꾼 뒤 Development Build를 다시 만드는 명령과 실제 생성 위치를 적는다.
- `EXPO_PUBLIC_` 값은 앱 번들에서 공개된다는 점을 설명한다. Google client ID와 Supabase publishable key 같은 공개 값만 넣는다.
- Google client secret, Apple private key, Supabase `service_role`, secret key와 SMTP 비밀번호를 모바일 환경 변수나 Git에 넣지 않는다.
- README는 사람용 로컬 이메일 로그인 절차와 AI 에이전트용 `auth:otp` 및 `agent-device` 절차를 함께 제공한다. 프로젝트 에이전트 지침에는 이 표준 경로를 짧게 가리키고 인증 우회를 금지한다.
- 실제 client ID, private key, secret과 운영 이메일 계정은 템플릿에 포함하지 않는다.

### 오류, 중복 실행과 접근성

- 로그인 요청이 진행 중일 때 같은 버튼이나 코드 확인을 중복 실행하지 못하게 한다.
- 사용자가 Google 또는 Apple 화면을 취소한 경우 실패 알림을 띄우지 않는다. 네트워크, 설정, 누락된 토큰과 Supabase 오류는 사용자가 다시 시도할 수 있게 구분한다.
- 오류가 발생해도 모든 버튼과 입력이 영구 진행 상태에 남지 않는다.
- 이메일 입력, 일회용 비밀번호 입력, Google 버튼, Apple 버튼, 코드 요청·확인, 로그아웃과 로그인 후 첫 화면에는 안정적인 접근성 역할과 이름을 둔다.
- 접근성 이름은 React Native Testing Library와 `agent-device`가 함께 사용하는 검증 계약이다.
- 로그인 화면에 목적지가 없는 이용약관이나 개인정보 처리방침 링크를 만들지 않는다. 실제 문서 위치가 정해지면 별도 제품 요구로 추가한다.

## 완료 조건

- iOS Development Build에서 Apple, Google과 이메일 일회용 비밀번호 로그인이 Supabase 세션을 만들고 보호 화면을 연다.
- Android Development Build에서 Google과 이메일 일회용 비밀번호 로그인이 같은 결과를 만든다.
- 새 Google 로그인은 사용자가 버튼을 누른 뒤 계정 선택 화면을 보여준다. 저장된 Google 정보만으로 앱이 백그라운드 로그인하지 않는다.
- 로그인 시도마다 서로 다른 nonce를 사용하고 Google과 Apple의 정상, 불일치, 재사용 토큰 경로를 검증한다.
- 앱을 다시 열었을 때 유효한 Supabase 세션은 로그인 화면 없이 복원된다. 세션 확인 중에는 보호 화면이 잠깐 보이지 않는다.
- 로그아웃은 현재 기기 세션과 사용자별 캐시를 지우고 로그인 화면으로 보낸다. 다른 기기 세션과 제공자 동의는 유지한다.
- 새 `auth.users` 행마다 `profiles`가 하나 생기며 기존 사용자를 위한 누락 행도 보충된다. 사용자 삭제 시 프로필도 삭제된다.
- 인증되지 않은 사용자와 다른 사용자는 프로필을 읽거나 수정할 수 없다. 로그인한 사용자는 자기 행만 읽고 수정할 수 있으며 클라이언트에서 프로필을 만들거나 지울 수 없다.
- 제공자 이름과 이미지는 빈 값만 채우고 사용자가 저장한 값을 덮어쓰지 않는다.
- 데이터베이스 테스트는 trigger 실패가 가입을 막을 수 있는 경로, RLS, 명시적 grant와 자기 행 update의 `WITH CHECK`를 검증한다.
- React Native Testing Library 테스트는 세션 초기화 상태, 보호 경로, 이메일과 코드 입력, 제공자 취소·오류, 중복 실행 방지와 로그아웃을 사용자 관점에서 검증한다.
- 순수 함수 테스트는 nonce 생성·해시와 오류 분류를 검증한다.
- 로컬 통합 테스트는 실제 Supabase Auth, Mailpit과 Data API를 사용해 이메일 가입부터 자기 프로필 조회·수정까지 통과한다.
- `agent-device`는 `auth:otp` 명령과 함께 이메일 로그인, 보호 화면, 로그아웃 전체 흐름을 한 세션에서 검증한다.
- README만으로 새 프로젝트의 Google, Apple, Supabase와 SMTP 설정, Development Build 재생성, 로컬 사람·에이전트 검증 절차를 찾을 수 있다.
- `supabase db reset`, 데이터베이스 타입 생성, 데이터베이스 테스트, 권한 검사, Supabase 보안 검사, `bun run check`, `bun run check-types`와 `bun run test`가 통과한다.
- Git 추적 파일과 앱 번들에는 실제 secret, private key, `service_role`, SMTP 비밀번호와 운영 사용자 토큰이 없다.

## 가정

- 앱은 Expo SDK 57 Development Build와 Expo Router를 계속 사용한다.
- 모바일 Supabase 클라이언트의 암호화 영구 세션 저장소와 TanStack Query Provider는 이미 준비되어 있다.
- HeroUI Native에는 Google 또는 Apple 전용 로그인 묶음 컴포넌트가 없으므로 입력과 일반 UI에만 사용한다.
- 각 구현 프로젝트는 실제 제공자 로그인을 검증할 자체 Apple Developer, Google Cloud와 Supabase 접근 권한을 갖는다.
- 로컬 Supabase의 Mailpit은 기본 개발 포트에서 접근할 수 있다.

## 이번 구현에서 제외할 범위

- Expo Web과 웹 OAuth
- Android의 Apple 로그인
- Google API 추가 scope, access token과 서버 장기 접근
- 이메일 magic link, 비밀번호와 비밀번호 재설정
- 필수 프로필 온보딩, 사용자 이름, 소개, 역할과 공개 프로필 탐색
- 수동 신원 연결, 사용자 계정 병합과 Apple 비공개 이메일 충돌 해결
- 모든 기기 로그아웃, 다른 기기만 로그아웃과 제공자 동의 철회
- 계정 삭제와 데이터 보존 정책
- 이용약관과 개인정보 처리방침 문서 작성
- 실제 client ID, secret, private key, SMTP 계정과 운영 환경 배포
- CI 기기 자동화와 실제 제공자 계정을 사용하는 무인 E2E

## 남은 위험

- `react-native-nitro-google-signin`, Expo Apple Authentication과 Supabase SDK가 nonce 인자 형식을 바꾸면 원본과 해시 전달 규칙을 구현 시점의 공식 API로 다시 확인해야 한다. nonce 검사를 끄는 방식으로 맞추지 않는다.
- Apple은 이름과 이메일을 첫 승인 때만 줄 수 있다. 첫 로그인 완료 전에 앱이 종료되면 다음 로그인에서 값을 다시 받지 못할 수 있으므로 값 저장 시점을 실제 기기에서 확인해야 한다.
- Google client ID, Android 서명 지문, Apple capability 또는 Supabase Provider 설정이 하나라도 맞지 않으면 네이티브 로그인은 코드 테스트만으로 확인할 수 없다.
- Apple 로그인은 Simulator에서 제한이 생길 수 있다. 최종 제공자 검증에는 실제 iOS 기기가 필요할 수 있다.
- 인증 사용자 생성 trigger가 실패하면 Supabase 가입 전체가 실패한다. 최소 trigger와 데이터베이스 테스트를 유지해야 한다.
- 자동 신원 연결은 안전하게 확인된 같은 이메일에만 의존한다. Apple 비공개 이메일이나 사용자가 제공자별로 다른 이메일을 쓰면 별도 계정이 생긴다.
- 계정 삭제가 범위 밖이므로 이 명세만 구현한 상태를 앱 스토어 제출에 필요한 완성된 계정 생명주기로 보지 않는다.

## 공식 근거

- [Expo Router Protected routes](https://docs.expo.dev/router/advanced/protected/)
- [Expo Google authentication](https://docs.expo.dev/guides/google-authentication/)
- [React Native Nitro Google Sign-In 공식 문서](https://react-native-nitro-google-sign-in.github.io/)
- [React Native Nitro Google Sign-In 사용법](https://react-native-nitro-google-sign-in.github.io/docs/guide/usage/)
- [Expo Apple Authentication](https://docs.expo.dev/versions/latest/sdk/apple-authentication/)
- [Supabase Google 로그인](https://supabase.com/docs/guides/auth/social-login/auth-google)
- [Supabase Apple 로그인](https://supabase.com/docs/guides/auth/social-login/auth-apple)
- [Supabase 이메일 passwordless 로그인](https://supabase.com/docs/guides/auth/auth-email-passwordless)
- [Supabase 신원 연결](https://supabase.com/docs/guides/auth/auth-identity-linking)
- [Supabase 사용자 데이터와 프로필](https://supabase.com/docs/guides/auth/managing-user-data)
- [Supabase 로그아웃 범위](https://supabase.com/docs/guides/auth/signout)
- [Supabase 로컬 Auth와 Mailpit 테스트](https://supabase.com/docs/guides/local-development/cli/testing-and-linting)
- [HeroUI Native Input OTP](https://heroui.com/docs/native/components/input-otp)
