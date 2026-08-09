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

## 자주 쓰는 명령

```bash
bun run dev
bun run build
bun run check
bun run fix
bun run check-types
bun run test
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

6. 스키마, 마이그레이션, 생성 타입과 관련 데이터베이스 테스트를 하나의 논리적 변경으로 커밋합니다.

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
