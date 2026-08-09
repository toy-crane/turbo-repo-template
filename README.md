# Turbo Repo Template

Bun, Turborepo, Ultracite, Expo와 Supabase로 만든 시작용 작업 공간입니다.
애플리케이션은 `apps/`에, 공유 패키지는 `packages/`에 추가합니다.

## 처음 실행할 때: 프로젝트 정보 설정

```bash
bun install
```

```bash
bun run setup
```

`bun run setup`은 프로젝트 슬러그, 표시 이름, 모바일 앱 식별자를 한 단계씩 묻습니다.
바꿀 필드마다 기존 값과 새 값을 보여주고, 사용자가 확인한 뒤에만 적용합니다.
질문은 한국어로 표시됩니다.

| 입력값 | 적용 위치 |
| --- | --- |
| 프로젝트 슬러그(영문 소문자 kebab-case, 첫 글자는 문자) | 루트 `package.json`의 `name`, Expo의 `slug`와 `scheme`, `supabase/config.toml`의 `project_id` |
| 표시 이름 | Expo의 `name` |
| 모바일 앱 식별자(완성된 reverse-DNS) | iOS의 `bundleIdentifier`, Android의 `package` |

질문 없이 실행하려면 세 값을 모두 전달합니다.

```bash
bun run setup --project-slug aurora-notes --display-name "Aurora Notes" --mobile-app-id com.aurora.notes --yes
```

모바일 앱 식별자 하나를 두 플랫폼에 함께 사용하므로 iOS와 Android 규칙을 모두 충족해야 합니다.
하이픈과 밑줄, Java 또는 Kotlin 예약어는 사용할 수 없습니다.
프로젝트 슬러그는 Expo의 `scheme`이 되므로 숫자로 시작할 수 없습니다.

모든 식별자를 이미 바꾼 상태에서 다시 실행하면 현재 값을 보여주고 아무것도 수정하지 않습니다.
다시 적용하려면 `--force`를 전달합니다.
초기 설정은 위 표에 있는 필드만 수정하며 저장소 전체의 문자열을 치환하지 않습니다.
로컬 Supabase 스택을 시작하거나 중지하거나 초기화하지 않으며 환경 변수 파일도 읽거나 쓰지 않습니다.
로컬 PostgreSQL 데이터베이스의 실제 이름은 계속 `postgres`입니다.

## 처음 실행할 때: 프로젝트 전용 인증 설정

`bun run setup`은 앱 식별자만 바꿉니다. Google Cloud, Apple Developer와 원격 Supabase
프로젝트를 만들거나 자격 정보를 저장하지 않습니다. 템플릿으로 새 프로젝트를 시작한 사람은
이 절차를 직접 진행해야 합니다.

모든 설정을 첫날에 끝낼 필요는 없습니다.

| 필요한 시점 | 먼저 추가할 것 |
| --- | --- |
| 로컬 이메일 로그인 개발 | `bun run setup`, 로컬 Supabase URL과 publishable key |
| 원격 Supabase 사용 | 새 Supabase 프로젝트, 프로젝트 URL과 publishable key |
| Google 로그인 검증 | Google Cloud 프로젝트, Web·iOS·Android OAuth 클라이언트, Supabase Google Provider |
| Apple 로그인 검증 | Apple Developer App ID와 capability, Supabase Apple Provider |
| 원격 이메일 로그인 검증 | 전용 SMTP 발신자, 6자리 OTP 이메일 템플릿 |

이 템플릿에는 실제 OAuth client ID, client secret, 서명 자격 정보, SMTP 계정 또는 백엔드
비밀 값을 포함하지 않습니다. 새 프로젝트마다 다음 값을 새로 만드세요.

### 1. 앱 식별자 확정

먼저 `bun run setup`을 실행합니다.

```bash
bun run setup
```

실행 결과에서 다음 값을 확인합니다. 이후 제공자 설정의 값은 이 결과와 글자 하나까지 같아야
합니다.

| 확인할 값 | 사용하는 곳 |
| --- | --- |
| iOS bundle identifier | Google iOS OAuth client, Apple App ID, Supabase Apple Client IDs |
| Android package | Google Android OAuth client |
| Expo scheme | 앱 자체 링크가 필요한 향후 기능 |

bundle identifier나 package를 나중에 바꾸면 Google과 Apple 설정도 다시 만들어야 합니다.

### 2. Supabase 준비

로컬 이메일 로그인만 개발할 때는 원격 프로젝트가 필요하지 않습니다. `bun run db:start`로 로컬
스택을 시작하고 [Supabase 연결](#supabase-연결)에 따라 `apps/mobile/.env.local`에 로컬 API
URL과 publishable key를 넣습니다.

원격 환경이 필요하면 새 Supabase 프로젝트를 만든 뒤 다음 공개 값만
`apps/mobile/.env.local`에 넣습니다.

```dotenv
EXPO_PUBLIC_SUPABASE_URL=https://<project-ref>.supabase.co
EXPO_PUBLIC_SUPABASE_PUBLISHABLE_KEY=sb_publishable_...
```

`service_role`, secret key와 데이터베이스 비밀번호는 앱에 넣지 않습니다.
Google이나 Apple 로그인을 검증할 때는 `.env.local`이 해당 Provider를 설정한 원격 Supabase
프로젝트를 가리키는지 먼저 확인합니다. 이 템플릿은 로컬 값과 원격 값을 자동으로 바꾸지 않습니다.

### 3. Google 로그인 준비

이 템플릿은 Firebase를 추가하지 않는 Google Cloud 설정을 기본으로 사용합니다.
`google-services.json`과 `GoogleService-Info.plist`는 Google 로그인만을 위해 추가하지 않습니다.
Nitro Google Sign-In의 Expo config plugin, 공개 client ID와 iOS URL scheme을 사용합니다.

1. [Google Auth Platform](https://console.cloud.google.com/auth)을 열고 새 Google Cloud
   프로젝트를 만듭니다.
2. Branding, Audience와 Data Access를 설정합니다.
   - 앱이 External 테스트 상태라면 로그인 검증에 사용할 Google 계정을 Test users에 추가합니다.
   - `openid`, `https://www.googleapis.com/auth/userinfo.email`,
     `https://www.googleapis.com/auth/userinfo.profile`만 사용합니다. Google API 추가 scope는
     등록하지 않습니다.
3. 같은 Google Cloud 프로젝트에서 OAuth client를 만듭니다.

   | 유형 | 입력값 | 용도 |
   | --- | --- | --- |
   | Web application | Supabase Provider 화면에 표시된 callback URL | 앱이 요청할 Google ID Token의 대상과 Supabase Provider 설정 |
   | iOS | `bun run setup`에서 정한 bundle identifier | iOS 네이티브 Google 로그인과 URL scheme |
   | Android | Android package와 서명 인증서 SHA-1 | Android Credential Manager에서 앱 신원 확인 |

4. Web client에는 원격 Supabase callback URL을 Authorized redirect URI로 등록합니다. 일반적인
   형식은 다음과 같습니다.

   ```text
   https://<project-ref>.supabase.co/auth/v1/callback
   ```

   Google Provider를 로컬 Supabase에도 연결할 때만 다음 callback도 추가합니다.

   ```text
   http://127.0.0.1:54321/auth/v1/callback
   ```

   모바일 앱은 브라우저 OAuth callback을 사용하지 않지만, Web client와 Supabase Provider를
   등록하려면 이 값이 필요합니다.
5. 첫 Android Development Build 뒤 로컬 서명 SHA-1은 다음 명령으로 확인할 수 있습니다.

   ```bash
   cd apps/mobile/android
   ./gradlew signingReport
   ```

   `apps/mobile/android`는 `bun run --cwd apps/mobile android`를 처음 실행할 때 생성됩니다.
   Play 서명 값은 Google Play Console의 **Setup > App integrity**에서 확인합니다.
6. Android OAuth client는 서명 인증서마다 만듭니다. 최소한 실제로 사용하는 항목을 모두
   등록합니다.
   - 로컬 Development Build의 debug SHA-1
   - 배포 빌드의 release 또는 upload key SHA-1
   - Google Play에서 설치할 앱의 Play App Signing SHA-1
7. 공개 Web client ID와 iOS client ID를 `apps/mobile/.env.local`에 넣습니다.

   ```dotenv
   EXPO_PUBLIC_GOOGLE_WEB_CLIENT_ID=<web-client-id>.apps.googleusercontent.com
   EXPO_PUBLIC_GOOGLE_IOS_CLIENT_ID=<ios-client-id>.apps.googleusercontent.com
   ```

   Android client ID는 앱 코드에 넣지 않습니다. Google은 package와 SHA-1로 Android 앱을
   확인합니다. Expo config plugin은 iOS client ID에 대응하는
   `com.googleusercontent.apps.<client-prefix>` URL scheme을 사용합니다.
8. Supabase Dashboard의 **Authentication > Sign In / Providers > Google**에서 Google을
   활성화합니다.
   - Client IDs에는 Web, iOS, Android client ID를 쉼표로 연결합니다.
   - Web client ID를 첫 번째에 둡니다.
   - Android 서명별 client ID가 여러 개면 모두 추가합니다.
   - Client Secret에는 Web client secret을 넣습니다.
   - nonce 검사를 끄지 않습니다.

Web client secret은 Supabase Dashboard에만 저장합니다. 모바일 환경 변수와 Git에는 넣지
않습니다. 자세한 내용은 [Expo Google 인증](https://docs.expo.dev/guides/google-authentication/),
[Nitro Google Sign-In 설정](https://react-native-nitro-google-sign-in.github.io/docs/setup/google-cloud),
[Supabase Google 로그인](https://supabase.com/docs/guides/auth/social-login/auth-google)을
참고하세요.

### 4. Apple 로그인 준비

Apple 로그인은 iOS 네이티브 방식만 사용합니다. Android와 웹용 Apple OAuth는 설정하지
않습니다.

1. [Apple Developer Identifiers](https://developer.apple.com/account/resources/identifiers/list)에서
   Explicit App ID를 만듭니다.
2. Bundle ID에는 `bun run setup`에서 정한 iOS bundle identifier를 그대로 입력합니다.
3. App ID의 capability에서 **Sign in with Apple**을 활성화합니다.
4. Supabase Dashboard의 **Authentication > Sign In / Providers > Apple**에서 Apple을
   활성화합니다.
5. Client IDs에 iOS bundle identifier를 추가합니다.

이 템플릿은 네이티브 `signInWithIdToken`만 사용하므로 Services ID, 웹 callback, `.p8` signing
key와 6개월마다 바꿔야 하는 Apple OAuth secret이 필요하지 않습니다. 나중에 웹이나 Android에서
Apple 로그인을 추가한다면 별도의 웹 OAuth 설정이 필요합니다.

앱 설정에는 `expo-apple-authentication` config plugin과 `ios.usesAppleSignIn: true`가 있어야
합니다. 자세한 내용은 [Expo Apple 인증](https://docs.expo.dev/versions/latest/sdk/apple-authentication/),
[Supabase Apple 로그인](https://supabase.com/docs/guides/auth/social-login/auth-apple)을 참고하세요.

### 5. 이메일 OTP 준비

로컬 Supabase는 SMTP 설정이 필요하지 않습니다. `bun run db:start`가 시작한 Mailpit에서
이메일을 확인합니다.

원격 Supabase에서 실제 주소로 OTP를 보내려면 다음 설정을 추가합니다.

1. Supabase Dashboard의 **Authentication > SMTP Settings**에서 제품 전용 SMTP host, port,
   username, password, sender email과 sender name을 설정합니다.
2. 발신 서비스가 요구하는 도메인 DNS 인증을 완료합니다.
3. **Authentication > Email Templates > Magic Link** 템플릿을 6자리 코드용으로 바꾸고
   `{{ .Token }}`을 포함합니다.

   ```html
   <h2>로그인 코드</h2>
   <p>앱에 다음 코드를 입력하세요: {{ .Token }}</p>
   ```

4. Email Provider에서 가입을 허용하고 OTP 길이, 만료 시간, 다시 보내기 간격과 전송 한도를
   확인합니다. 이 템플릿의 기본값은 6자리, 1시간 만료입니다.
5. 실제 수신 주소로 전송과 코드 확인을 시험합니다.

Supabase 기본 메일 서버는 운영용이 아니며 수신 대상도 제한됩니다. 2026년 6월 이후 만든 Free
프로젝트는 기본 SMTP를 사용하는 동안 인증 이메일 템플릿을 바꿀 수 없으므로, 원격 OTP를
시험하기 전에 custom SMTP를 먼저 설정합니다. SMTP password는 Supabase Dashboard에만
저장합니다. 자세한 내용은 [Supabase 이메일 OTP](https://supabase.com/docs/guides/auth/auth-email-passwordless),
[Supabase custom SMTP](https://supabase.com/docs/guides/auth/auth-smtp),
[Free 프로젝트 이메일 템플릿 변경 안내](https://supabase.com/changelog/46599-changes-to-email-template-customisation-on-free-tier)를
참고하세요.

### 6. Development Build 다시 만들기

Google client ID, iOS URL scheme, Apple capability 또는 인증용 네이티브 패키지가 바뀌면 기존
Development Build를 재사용할 수 없습니다. 생성된 `ios`와 `android` 폴더를 다시 만든 뒤 앱을
컴파일합니다.

```bash
cd apps/mobile
bunx expo prebuild --clean
```

```bash
bun run ios
bun run android
```

Expo Go와 Metro 재시작만으로는 Google 네이티브 로그인을 검증할 수 없습니다.

### 설정 완료 확인

- iOS bundle identifier가 Expo, Google iOS client와 Apple App ID에서 같다.
- Android package와 각 Android OAuth client의 package가 같다.
- 현재 설치본을 서명한 SHA-1이 Google에 등록되어 있다.
- Supabase Google Client IDs의 첫 값은 Web client ID다.
- Supabase Apple Client IDs에 iOS bundle identifier가 있다.
- `apps/mobile/.env.local`에는 공개 값만 있다.
- Web client secret, SMTP password, Supabase secret key와 `service_role`은 Git과 앱 번들에 없다.
- 원격 이메일 템플릿에는 링크 대신 `{{ .Token }}`이 있다.

## 로컬 이메일 로그인 확인

Google과 Apple은 각 프로젝트의 자격 정보가 있어야 확인할 수 있습니다.
이메일 코드 로그인은 로컬 스택만으로 처음부터 끝까지 확인할 수 있습니다.

로컬 Supabase는 메일을 밖으로 보내지 않고 Mailpit에 모읍니다.
`bun run db:start`을 실행한 뒤 <http://127.0.0.1:54324>에서 받은 메일을 볼 수 있습니다.

### 사람이 확인할 때

1. `bun run db:start`으로 로컬 스택을 켭니다.
2. `bun run --cwd apps/mobile ios` 또는 `android`로 Development Build를 실행합니다.
3. 로그인 화면에서 이메일을 입력하고 **계속**을 누릅니다.
   실행할 때마다 다른 주소를 사용하세요. 없는 주소면 계정이 새로 만들어집니다.
4. <http://127.0.0.1:54324>에서 방금 도착한 메일을 열고 6자리 코드를 확인합니다.
5. 앱에 코드를 입력합니다. 확인이 끝나면 보호 화면이 열립니다.
6. 설정 화면의 **로그아웃**을 누르면 이 기기의 세션만 끝나고 로그인 화면으로 돌아갑니다.

### AI 에이전트가 확인할 때

메일함을 눈으로 볼 수 없으므로 코드를 읽어 주는 명령을 사용합니다.

```bash
bun run auth:otp -- --email agent-20260809-01@example.test
```

이 명령은 해당 수신자에게 방금 도착한 코드만 표준 출력으로 보여줍니다.
코드를 요청하지도, 확인하지도, 세션을 만들지도 않습니다.
앱에서 코드를 요청한 뒤에 실행하세요.
실행할 때마다 다른 주소를 사용해야 예전 코드를 잘못 고르지 않습니다.
`EXPO_PUBLIC_SUPABASE_URL`이 로컬이 아니면 코드를 읽지 않고 종료합니다.
원격 프로젝트의 코드는 실제 받은 편지함에서 확인해야 합니다.

화면 검증은 `agent-device` 한 세션에서 다음 순서로 진행합니다.
세션을 여러 번 열지 말고, 끝나면 닫습니다.

1. 앱을 엽니다.
2. 이메일 입력에 이번 실행에만 쓸 주소를 넣고 **계속**을 누릅니다.
3. 위 명령으로 코드를 읽습니다.
4. 인증 코드 입력에 코드를 넣습니다.
5. 보호 화면이 열렸는지 확인합니다.
6. 설정에서 로그아웃합니다.
7. 로그인 화면으로 돌아왔는지 확인합니다.

화면 요소는 접근성 이름으로 찾습니다.
같은 이름을 React Native Testing Library 테스트도 사용합니다.

| 접근성 이름 | 위치 |
| --- | --- |
| `Google로 계속하기` | 로그인 화면 |
| `Apple로 계속하기` | 로그인 화면, iOS만 |
| `이메일` | 로그인 화면 입력 |
| `이메일로 계속하기` | 로그인 화면 버튼 |
| `인증 코드` | 코드 입력 |
| `코드 확인` | 코드 확인 버튼 |
| `코드 다시 받기` | 코드 다시 받기 버튼 |
| `다른 이메일 사용` | 이메일 수정 버튼 |
| `로그인 상태 확인 중` | 세션 확인 중 화면 |
| `로그아웃` | 설정 화면 |

관리자 API, `service_role`, 고정 JWT로 만든 세션은 로그인 확인으로 인정하지 않습니다.
이런 방법은 실제 인증 화면과 RLS 경로를 지나가지 않고, 서버 전용 비밀을 테스트 도구로 퍼뜨립니다.

### 데이터베이스와 통합 테스트

```bash
bun run db:test
bun run test:integration
```

`db:test`는 pgTAP으로 trigger, 권한, RLS를 확인합니다.
`test:integration`은 실제 Supabase Auth와 Mailpit으로 가입부터 프로필 조회·수정까지 확인합니다.
둘 다 로컬 스택이 켜져 있어야 합니다.
그래서 기본 `bun run test`에는 포함하지 않습니다.

## 자주 쓰는 명령

```bash
bun run dev
bun run build
bun run check
bun run fix
bun run check-types
bun run test
bun run auth:otp -- --email <주소>
```

## 모바일 개발

Expo SDK 57 앱은 `apps/mobile`에 있습니다.
iOS와 Android 모두 앱 전용 Development Build를 사용합니다.

```bash
bun run --cwd apps/mobile ios
bun run --cwd apps/mobile android
bun run --cwd apps/mobile start
bun run --cwd apps/mobile test:watch
```

저장소에 고정된 CLI로 로컬 기기 자동화 도구를 실행합니다.

```bash
bun run agent-device:doctor
```

## 로컬 Supabase 스택

먼저 Docker를 실행해야 합니다.

```bash
bun run db:start
bun run db:status
bun run db:stop
bun run db:reset
bun run db:test
```

`bun run db:start`는 API URL과 publishable key를 포함한 접속 정보를 출력합니다.
같은 정보는 `bun run db:status`로 다시 확인할 수 있습니다.

## Supabase 스키마 변경

`supabase/schemas/`의 `.sql` 파일이 데이터베이스 구조의 원본입니다.
마이그레이션부터 직접 작성하지 마세요.

1. `supabase/schemas/`의 스키마 파일에 원하는 최종 상태를 작성합니다.
2. 마이그레이션을 생성합니다. 결과는 `supabase/migrations/<timestamp>_<name>.sql`에 저장됩니다.

   ```bash
   bun run db:diff -- -f <descriptive-name>
   ```

3. **생성된 마이그레이션은 초안으로 보고 검토 에이전트가 읽게 합니다.**
   파괴적인 변경, 권한과 RLS, 뷰와 함수의 보안, diff가 놓친 객체, 잠금과 실행 순서를 확인합니다.
4. 전체 마이그레이션 기록을 처음부터 재생합니다.

   ```bash
   bun run db:reset
   ```

5. 같은 로컬 스키마에서 공유 타입을 다시 생성합니다.
   결과는 `packages/supabase/src/database.types.ts`에 저장됩니다.

   ```bash
   bun run db:types
   ```

6. 데이터베이스 테스트를 실행합니다.
   테스트 파일은 `supabase/tests/*_test.sql`에 두고 pgTAP으로 작성합니다.

   ```bash
   bun run db:test
   ```

7. 스키마, 마이그레이션, 생성 타입과 관련 데이터베이스 테스트를 하나의 논리적 변경으로 커밋합니다.

이미 배포한 마이그레이션은 수정하지 마세요.
변경이 필요하면 앞으로 진행하는 새 마이그레이션을 추가합니다.
일반 마이그레이션 안에 임의의 `BEGIN` 또는 `COMMIT`을 넣지 마세요.
일반 CI는 로컬 Supabase 스택을 만들지 않습니다.
따라서 전체 기록의 재생 여부는 스키마를 바꾼 사람이 확인하고 증거를 남겨야 합니다.

### 마이그레이션 검토

검토 에이전트는 읽기 전용입니다.
파일과 데이터베이스를 바꾸지 않습니다.
새로 재생하기, 데이터베이스 테스트, 운영 규모의 잠금 동작처럼 실행하지 못한 검사는 성공으로 처리하지 않고 `UNVERIFIED`로 보고합니다.

| 도구 | 실행 위치 |
| --- | --- |
| Claude Code | `supabase-reviewer` 하위 에이전트: [.claude/agents/supabase-reviewer.md](.claude/agents/supabase-reviewer.md) |
| Codex | [.codex/agents/supabase-reviewer.toml](.codex/agents/supabase-reviewer.toml) |
| 공용 Skill | [.agents/skills/supabase-reviewer/SKILL.md](.agents/skills/supabase-reviewer/SKILL.md). Claude는 `.claude/skills/supabase-reviewer` 심볼릭 링크로 읽습니다. |

### 스키마 파일 실행 순서

`supabase/config.toml`의 `schema_paths`는 `./schemas/*.sql`을 읽습니다.
Supabase는 파일을 이름의 사전순으로 실행합니다.
파일 이름에는 두 자리 숫자 접두사를 붙여 실행 순서를 바로 알 수 있게 합니다.
자세한 내용은 [supabase/schemas/README.md](supabase/schemas/README.md)를 참고하세요.

## 공유 데이터베이스 타입

`packages/supabase`는 `@repo/supabase`라는 타입 전용 패키지입니다.
모바일 앱과 앞으로 추가할 서버가 같은 `Database` 타입을 사용합니다.
런타임 의존성, 환경 변수 접근과 완성된 클라이언트는 이 패키지에 두지 않습니다.

`bun run db:types`는 `packages/supabase/src/database.types.ts`를 생성합니다.
이 파일을 직접 수정하지 마세요.
`packages/supabase/biome.jsonc`는 생성 결과를 그대로 유지하기 위해 이 파일만 lint 대상에서 제외합니다.
타입 생성에 실패하면 기존 파일을 그대로 남깁니다.

## Supabase 연결

Supabase URL과 publishable key는 사용자가 직접 설정합니다.

1. `bun run setup`으로 프로젝트 식별자를 설정합니다.
2. `bun run db:start`로 로컬 스택을 시작합니다.
3. 출력 결과나 `bun run db:status`에서 **API URL과 publishable key만** 확인합니다.
4. [apps/mobile/.env.example](apps/mobile/.env.example)을 참고해 `apps/mobile/.env.local`을 만듭니다.

   ```dotenv
   EXPO_PUBLIC_SUPABASE_URL=http://127.0.0.1:54321
   EXPO_PUBLIC_SUPABASE_PUBLISHABLE_KEY=sb_publishable_...
   ```

5. 모바일 Development Build를 실행합니다.

   ```bash
   bun run --cwd apps/mobile ios
   ```

원격 Supabase 프로젝트를 사용하려면 같은 두 변수에 해당 프로젝트의 URL과 publishable key를 넣습니다.
`bun run setup`, `bun run db:start`와 모바일 실행 명령은 환경 변수 파일을 만들거나 덮어쓰지 않습니다.
로컬 값과 원격 값도 자동으로 전환하지 않습니다.

두 변수는 앱을 빌드하거나 시작할 때 모두 필요합니다.
[apps/mobile/src/supabase/env.ts](apps/mobile/src/supabase/env.ts)는 `@t3-oss/env-core`로 두 변수를 선언합니다.
Expo가 앱 설정을 읽을 때 `apps/mobile/app.config.ts`가 값을 검사합니다.
따라서 `expo start`, `expo prebuild`, `expo run:*`, `expo export`는 값이 없거나 형식이 잘못되면 문제의 변수 이름을 보여주고 종료합니다.
실행 중인 앱도 같은 검사를 수행하고 오류를 화면에 표시합니다.
무선으로 배포한 번들에서도 같은 오류를 확인할 수 있습니다.

환경 변수를 추가하려면 [apps/mobile/src/supabase/env.ts](apps/mobile/src/supabase/env.ts)에 선언합니다.
Supabase secret key, 데이터베이스 URL, 빌드 시점의 업로드 토큰처럼 기기에 전달하면 안 되는 값은 `server` 블록에 둡니다.
`server` 블록의 변수에는 `EXPO_PUBLIC_` 접두사를 붙이지 않습니다.
비밀 값을 `client` 블록에 넣거나 앱 코드에서 읽으면 검사가 실패하므로 모든 설치본에 값이 배포되는 일을 막을 수 있습니다.

### 세션 저장 위치

로그인 세션은 디스크에 저장하기 전에 암호화합니다.
쓸 때마다 AES-256-GCM 키를 만들고 암호문은 앱의 SQLite 저장소에 둡니다.
키는 iOS keychain과 Android keystore를 사용하는 `expo-secure-store`에 저장합니다.
값이 변조되었거나 읽을 수 없으면 세션이 없는 것으로 처리합니다.
앱은 사용할 수 없는 상태로 실패하는 대신 사용자에게 다시 로그인을 요청합니다.

Supabase 세션에는 베어러 토큰이 들어 있습니다.
암호화하지 않으면 앱 파일을 읽을 수 있는 주체가 토큰도 평문으로 읽을 수 있습니다.

> **경고**: `EXPO_PUBLIC_` 값은 앱 번들에 그대로 들어가므로 공개 정보입니다.
> `service_role` 키나 secret key를 절대 넣지 마세요.
> `.env.local`은 Git에서 제외합니다.
> 저장소에는 변수 이름만 적은 예시 파일을 둡니다.

### 문제 해결

- **빌드나 앱이 환경 변수 누락을 보고할 때**: `.env.local`을 채우고 번들러를 다시 시작하세요. 오류 메시지에서 누락된 변수 이름을 확인할 수 있습니다.
- **앱이 로컬 API에 연결되지 않을 때**: `http://127.0.0.1:54321`은 iOS Simulator에서만 그대로 사용할 수 있습니다. Android Emulator는 `10.0.2.2`로 호스트의 loopback에 연결합니다. 실제 기기에서는 개발 컴퓨터의 LAN IP가 필요합니다. 사용하는 기기에서 접근할 수 있는 주소를 찾아 `EXPO_PUBLIC_SUPABASE_URL`에 넣으세요. 이 템플릿은 터널을 자동으로 만들거나 호스트 주소를 바꾸지 않습니다.
- **네이티브 모듈을 추가했을 때**: `expo-sqlite`처럼 네이티브 코드가 있는 의존성은 기존 Development Build에서 실행할 수 없습니다. `ios` 또는 `android` 명령으로 다시 빌드하세요.
