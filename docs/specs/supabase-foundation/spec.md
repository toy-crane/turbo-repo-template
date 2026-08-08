# Supabase 기반 스펙

## 목표

Expo 모바일 앱과 향후 서버가 같은 Supabase 스키마 계약을 공유할 수 있는 최소 기반을 만든다. 개발은 local-first와 declarative schema 방식으로 진행하고, 모바일 런타임은 typed Supabase client와 TanStack Query를 사용한다. 템플릿 최초 설정, migration 검토, 타입 생성 및 사람·AI가 따라갈 문서를 함께 제공하되 인증, 제품 데이터 모델과 원격 배포는 포함하지 않는다.

## 적용할 결정

- [Supabase 클라이언트 경계](../../decisions/supabase-client-boundaries.md)
- [Supabase 스키마 작업 방식](../../decisions/supabase-schema-workflow.md)
- [모바일 원격 데이터 상태](../../decisions/mobile-remote-data.md)
- [템플릿 프로젝트 정체성](../../decisions/template-project-identity.md)

## 필요한 최종 상태

### 저장소 구조와 의존성 소유권

| 위치 | 소유 항목 |
| --- | --- |
| 모노레포 루트 | 정확한 버전으로 고정한 Supabase CLI, local database 명령, 프로젝트 setup command |
| `supabase/` | local stack 설정, declarative schema, 생성 migration과 선택적인 seed·database test |
| `packages/supabase` | 로컬 스키마에서 생성한 TypeScript database 타입과 명시적인 타입 override |
| `apps/mobile` | Supabase runtime client, 공개 환경 변수, Expo SQLite session storage, TanStack Query |
| `.agents/skills` | Supabase 공식 지침, Postgres best practices와 공용 Supabase reviewer Skill |
| `.codex/agents`, `.claude/agents` | 각 도구에서 호출할 수 있는 read-only Supabase reviewer agent 정의 |

- Supabase CLI는 루트 개발 의존성으로 정확한 버전을 고정하고 모든 명령은 저장소에 고정된 CLI를 사용한다.
- `@supabase/supabase-js`, `react-native-url-polyfill`, Expo SDK 57과 호환되는 `expo-sqlite`, `@tanstack/react-query`는 모바일 워크스페이스가 소유한다.
- `@repo/supabase`는 runtime 의존성, 환경 변수 접근, Expo storage 또는 완성된 client를 갖지 않는다.
- 설치한 정확한 의존성 해석 결과를 Bun lockfile에 함께 커밋한다.

### 최초 프로젝트 setup

- 템플릿 사용자는 모노레포 루트에서 `bun run setup`을 한 번 실행한다.
- 대화형 wizard는 다음 값을 한 단계씩 받는다.
  1. lowercase kebab-case `project slug`
  2. 사용자에게 표시할 앱 이름
  3. iOS와 Android가 공유할 완성된 reverse-DNS 앱 식별자
- 적용 전에는 변경 대상과 기존 값·새 값을 모두 보여주고 확인을 받는다.
- `project slug`는 루트 `package.json`의 `name`, Expo `slug`와 `scheme`, `supabase/config.toml`의 `project_id`에 적용한다.
- 앱 표시 이름은 Expo `name`에, 모바일 앱 식별자는 iOS `bundleIdentifier`와 Android `package`에 적용한다.
- 비대화형 실행은 `--project-slug`, `--display-name`, `--mobile-app-id`, `--yes`를 지원한다.
- 입력 형식을 검증하고 알려진 필드만 구조적으로 수정한다. 저장소 전체 문자열 치환은 하지 않는다.
- 이미 설정된 저장소에서는 현재 값을 보여주고 변경 없이 종료한다. 다시 적용하려면 명시적인 override가 필요하다.
- setup은 local stack을 시작·중지·reset하거나 원격 프로젝트를 link하지 않으며, Supabase URL·key 또는 env 파일을 읽거나 쓰지 않는다.
- setup 동작은 실제 작업 저장소가 아닌 격리된 fixture에서 대화형, 비대화형, 잘못된 입력, 미변경 재실행을 검증한다.

### Local-first declarative schema

- `supabase/config.toml`, `supabase/schemas/`와 `supabase/migrations/`를 Git으로 관리한다.
- local PostgreSQL database의 실제 이름은 `postgres`로 유지하고 `project_id`만 setup에서 변경한다.
- `supabase/schemas/`가 원하는 최종 database 구조의 source of truth다. 최초 기반에는 제품 테이블이나 예시 데이터 모델을 만들지 않는다.
- schema 파일의 실행 순서는 이름 또는 `schema_paths`에서 명확하고 재현 가능해야 한다.
- 일반적인 구조 변경은 schema를 먼저 수정하고 `supabase db diff -f <descriptive-name>`으로 migration을 생성한다.
- 생성 migration은 초안으로 취급한다. schema 의도와 함께 destructive SQL, 권한·RLS, view·function 보안, diff 누락 객체, lock과 실행 순서를 검토한다.
- 배포된 migration은 수정하지 않고 forward migration을 추가한다. 일반 migration 안에 임의의 `BEGIN` 또는 `COMMIT`을 넣지 않는다.
- schema 변경자는 전체 migration을 `supabase db reset`으로 재생한 뒤 `supabase gen types typescript --local`로 공유 타입을 다시 생성한다.
- schema, migration, 생성 타입과 관련 database test는 하나의 논리 변경으로 커밋한다.
- 일반 CI는 local Supabase stack이나 database를 매 실행마다 생성하지 않는다. database replay 증거는 변경자가 로컬에서 만든다.
- root README에는 local stack 시작·중지·reset, migration 생성, 타입 생성과 reviewer 실행의 실제 명령 및 생성 파일 경로를 적는다.

### 공유 database 타입 package

- `packages/supabase`는 `@repo/supabase`라는 내부 types-only package다.
- 로컬 스키마에서 생성한 `Database`, `Json`과 Supabase가 생성하는 table·enum helper 타입을 외부에 제공한다.
- 생성 파일은 직접 편집하지 않는다. 필요한 보정이 실제로 생기면 별도 override 모듈에 명시하고 생성 타입과 구분해 export한다.
- 빈 override, query 함수, repository 계층이나 runtime-neutral client factory를 미리 만들지 않는다.
- 모바일과 향후 서버는 이 package의 같은 `Database` 타입을 사용한다.

### Expo Supabase client

- 모바일 앱은 `createClient<Database>`로 하나의 singleton client를 직접 생성한다.
- client 초기화 전에 React Native URL polyfill과 Expo SQLite의 `localStorage` polyfill을 설치한다.
- client는 `process.env.EXPO_PUBLIC_SUPABASE_URL`과 `process.env.EXPO_PUBLIC_SUPABASE_PUBLISHABLE_KEY`를 정적으로 읽고 누락된 값에는 식별 가능한 초기화 오류를 낸다.
- session storage는 Expo SQLite 기반 `localStorage`를 사용하고, session 유지와 token refresh를 지원하며 React Native에서는 URL session 감지를 끈다.
- 모바일 코드와 공유 package에는 `service_role`, secret key 또는 서버 전용 환경 변수를 포함하지 않는다.
- 인증 화면, 로그인·로그아웃, session bootstrap UI와 authorization 정책은 이번 기반에 추가하지 않는다.

### TanStack Query

- 모바일 앱의 root provider tree에 장수하는 단일 `QueryClient`와 `QueryClientProvider`를 둔다.
- 향후 Supabase query와 mutation은 모바일 기능 영역에서 작성하고 생성 database 타입을 사용한다.
- remote query의 loading, error, stale, retry, refetch와 mutation invalidation은 TanStack Query가 담당한다.
- 인증 session과 로컬 UI state는 query cache에 저장하지 않는다.
- 이번 기반에는 제품 테이블, 예시 network query, query key factory, offline cache persistence 또는 낙관적 update 규칙을 만들지 않는다.

### 환경 변수와 README

- `apps/mobile/.env.example`에는 아래 변수 이름과 placeholder만 둔다.

```dotenv
EXPO_PUBLIC_SUPABASE_URL=
EXPO_PUBLIC_SUPABASE_PUBLISHABLE_KEY=
```

- 실제 값은 Git에서 제외한 `apps/mobile/.env.local`에 사용자가 직접 넣는다.
- README의 local 절차는 `bun run setup`, local stack 시작, CLI 출력 또는 status에서 API URL과 **publishable key만** 확인, `.env.local` 작성, 모바일 Development Build 실행 순서로 안내한다.
- 원격 프로젝트를 사용할 때도 사용자가 project URL과 publishable key를 같은 두 변수에 직접 설정한다.
- setup, `db:start`, 모바일 실행 또는 별도 helper command가 env 파일을 생성·덮어쓰기하거나 local·remote 값을 자동 전환하지 않는다.
- README는 `EXPO_PUBLIC_` 값이 앱 bundle에 공개된다는 점과 `service_role`·secret key를 넣으면 안 된다는 경고를 포함한다.
- local API의 loopback 주소가 선택한 simulator, emulator 또는 실제 기기에서 접근 가능한지 사용자가 확인해야 함을 troubleshooting 항목에 설명한다. 이를 위한 tunnel이나 host rewrite 자동화는 추가하지 않는다.

### AI context와 migration reviewer

- Supabase 공식 Skill과 Supabase Postgres best-practices Skill은 `.agents/skills`를 canonical source로 유지하고 Claude가 같은 내용을 상대 symlink로 사용한다.
- 공용 `supabase-reviewer` Skill은 declarative schema와 생성 migration을 함께 읽고 data loss, 권한·RLS, diff blind spot, 재현성과 생성 타입 일치를 read-only로 검토한다.
- Codex와 Claude의 reviewer agent는 파일이나 database를 변경할 수 없는 도구 경계를 유지한다.
- reviewer는 실행하지 못한 reset, database test 또는 production-size lock 검증을 성공으로 간주하지 않고 `UNVERIFIED`로 보고한다.
- README의 schema 변경 절차는 migration 생성 후 reviewer 검토를 명시적인 단계로 포함한다.

## 완료 조건

- 깨끗한 checkout에서 고정된 Bun과 Node.js 버전으로 모든 의존성을 설치할 수 있다.
- `bun run setup`의 대화형·비대화형 경로와 idempotence가 격리된 fixture에서 검증된다.
- setup 결과로 root package, Expo와 Supabase `project_id`의 식별자가 입력값과 일치하며 database 이름과 env 파일은 바뀌지 않는다.
- local stack을 시작하고 전체 migration을 처음부터 reset할 수 있다.
- `supabase/schemas/`에서 생성한 migration을 review한 뒤 같은 local schema에서 `@repo/supabase` 타입을 재생성할 수 있다.
- 모바일 앱이 `Database` 타입을 사용하는 singleton Supabase client와 Expo SQLite session storage를 구성한다.
- 필요한 공개 환경 변수가 없을 때 원인을 알 수 있는 오류가 발생하고, 올바른 local 값이 있으면 iOS와 Android Development Build에서 client 초기화가 성공한다.
- 모바일 root tree에 TanStack Query provider가 있으며 기존 화면과 테스트가 계속 동작한다.
- `bun run check`, `bun run check-types`와 `bun run test`가 통과한다.
- README만으로 템플릿 setup, local schema workflow, 수동 env 설정, 타입 생성과 reviewer 호출 위치를 찾을 수 있다.
- Git 추적 파일과 앱 bundle에 `service_role`, secret key 또는 실제 사용자 환경 값이 없다.
- 일반 CI 설정에는 local Supabase stack 시작이나 `db reset`이 추가되지 않는다.

## 가정

- 모바일 앱은 기존 Expo SDK 57 Development Build와 iOS·Android 범위를 유지한다.
- 최초 Supabase 소비자는 모바일 앱 하나지만 향후 별도 서버 runtime이 추가된다.
- `local-first`는 schema와 migration 개발 기준이 local Supabase라는 뜻이며, 모바일 데이터의 offline-first 저장·동기화를 뜻하지 않는다.
- 인증 기능은 나중에 구현하지만 client의 session persistence storage는 지금 준비한다.
- 원격 Supabase 프로젝트, project ref와 배포 환경은 아직 정해지지 않았다.

## 이번 구현에서 제외할 범위

- 로그인 화면, 인증 provider, deep-link callback과 session UI
- 서버용 Supabase client, cookie·header 전달과 관리자 권한 경계
- 제품 테이블, RLS policy, seed data와 실제 query·mutation
- Storage, Realtime, Edge Functions, Cron, Queues와 Vectors
- 원격 프로젝트 생성·link, migration 배포와 environment promotion
- EAS environment 설정과 local·remote env 자동 전환 command
- CI의 Docker 기반 local database 생성, reset 또는 database test
- TanStack Query cache persistence와 offline synchronization

## 남은 위험

- Supabase CLI, declarative diff engine과 Expo integration API는 바뀔 수 있으므로 구현 시 changelog와 현재 공식 문서를 다시 확인하고 정확한 버전을 고정해야 한다.
- 일반 CI에서 전체 migration replay를 하지 않으므로 schema 변경자가 남기는 local reset 증거와 reviewer 품질에 의존한다.
- Android emulator나 실제 기기는 local Supabase의 기본 loopback URL에 직접 접근하지 못할 수 있다. README의 수동 host 설정만으로 부족해지는 경우 별도 개발 네트워크 결정을 내려야 한다.
- 제품 schema가 없으므로 최초 기반에서는 실제 typed query와 RLS 동작까지 검증할 수 없다.
- future server runtime과 인증·authorization 경계가 정해지면 client 구성과 database policy를 별도 명세로 확장해야 한다.

## 공식 근거

- [Supabase CLI local development](https://supabase.com/docs/guides/local-development/cli/getting-started)
- [Supabase declarative database schemas](https://supabase.com/docs/guides/local-development/declarative-database-schemas)
- [Supabase local development workflow](https://supabase.com/docs/guides/local-development/cli-workflows)
- [Supabase TypeScript 타입 생성](https://supabase.com/docs/guides/api/rest/generating-types)
- [Supabase와 Expo React Native 연동](https://supabase.com/docs/guides/getting-started/quickstarts/expo-react-native)
- [Expo 환경 변수](https://docs.expo.dev/guides/environment-variables/)
- [TanStack QueryClientProvider](https://tanstack.com/query/latest/docs/framework/react/reference/QueryClientProvider)
