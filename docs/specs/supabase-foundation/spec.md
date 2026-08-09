# Supabase 기반 명세

## 목표

Expo 모바일 앱과 향후 서버가 같은 Supabase 스키마 계약을 공유할 수 있는 최소 기반을 만든다. 개발은 로컬 우선과 선언형 스키마 방식으로 진행한다. 모바일 런타임은 타입이 지정된 Supabase 클라이언트와 TanStack Query를 사용한다. 템플릿 초기 설정, 마이그레이션 검토, 타입 생성과 사람이 따라갈 문서를 함께 제공한다. 인증, 제품 데이터 모델과 원격 배포는 포함하지 않는다.

## 적용할 결정

- [Supabase 클라이언트 경계](../../decisions/supabase-client-boundaries.md)
- [Supabase 스키마 작업 방식](../../decisions/supabase-schema-workflow.md)
- [모바일 원격 데이터 상태](../../decisions/mobile-remote-data.md)
- [템플릿 프로젝트 정체성](../../decisions/template-project-identity.md)

## 필요한 최종 상태

### 저장소 구조와 의존성 소유권

| 위치 | 소유 항목 |
| --- | --- |
| 모노레포 루트 | 정확한 버전으로 고정한 Supabase CLI, 로컬 데이터베이스 명령, 프로젝트 초기 설정 명령 |
| `supabase/` | 로컬 스택 설정, 선언형 스키마, 생성 마이그레이션과 선택적인 초기 데이터·데이터베이스 테스트 |
| `packages/supabase` | 로컬 스키마에서 생성한 TypeScript 데이터베이스 타입과 명시적인 타입 보정 |
| `apps/mobile` | Supabase 런타임 클라이언트, 공개 환경 변수, Expo SQLite 세션 저장소, TanStack Query |
| `.agents/skills` | Supabase 공식 지침, Postgres 모범 사례와 공용 Supabase 검토 Skill |
| `.codex/agents`, `.claude/agents` | 각 도구에서 호출할 수 있는 읽기 전용 Supabase 검토 에이전트 정의 |

- Supabase CLI는 루트 개발 의존성으로 정확한 버전을 고정하고 모든 명령은 저장소에 고정된 CLI를 사용한다.
- `@supabase/supabase-js`, `react-native-url-polyfill`, Expo SDK 57과 호환되는 `expo-sqlite`, `@tanstack/react-query`는 모바일 워크스페이스가 소유한다.
- `@repo/supabase`는 런타임 의존성, 환경 변수 접근, Expo 저장소 또는 완성된 클라이언트를 갖지 않는다.
- 설치한 정확한 의존성 해석 결과를 Bun 잠금 파일에 함께 커밋한다.

### 최초 프로젝트 설정

- 템플릿 사용자는 모노레포 루트에서 `bun run setup`을 한 번 실행한다.
- 대화형 마법사는 다음 값을 한 단계씩 받는다.
  1. 영문 소문자 kebab-case 형식의 프로젝트 슬러그
  2. 사용자에게 표시할 앱 이름
  3. iOS와 Android가 공유할 완성된 reverse-DNS 앱 식별자
- 적용 전에는 변경 대상과 기존 값·새 값을 모두 보여주고 확인을 받는다.
- 프로젝트 슬러그는 루트 `package.json`의 `name`, Expo `slug`와 `scheme`, `supabase/config.toml`의 `project_id`에 적용한다.
- 앱 표시 이름은 Expo `name`에, 모바일 앱 식별자는 iOS `bundleIdentifier`와 Android `package`에 적용한다.
- 비대화형 실행은 `--project-slug`, `--display-name`, `--mobile-app-id`, `--yes`를 지원한다.
- 입력 형식을 검증하고 알려진 필드만 구조적으로 수정한다. 저장소 전체 문자열 치환은 하지 않는다.
- 이미 설정된 저장소에서는 현재 값을 보여주고 변경 없이 종료한다. 다시 적용하려면 명시적인 강제 실행 옵션이 필요하다.
- 초기 설정은 로컬 스택을 시작하거나 중지하거나 초기화하지 않는다. 원격 프로젝트를 연결하지 않으며 Supabase URL·키 또는 환경 변수 파일도 읽거나 쓰지 않는다.
- 초기 설정 동작은 실제 작업 저장소가 아닌 격리된 테스트 복사본에서 검증한다. 대화형 실행, 비대화형 실행, 잘못된 입력과 미변경 재실행을 모두 확인한다.

### 로컬 우선 선언형 스키마

- `supabase/config.toml`, `supabase/schemas/`와 `supabase/migrations/`를 Git으로 관리한다.
- 로컬 PostgreSQL 데이터베이스의 실제 이름은 `postgres`로 유지하고 `project_id`만 초기 설정에서 변경한다.
- `supabase/schemas/`가 원하는 최종 데이터베이스 구조의 원본이다. 최초 기반에는 제품 테이블이나 예시 데이터 모델을 만들지 않는다.
- 스키마 파일의 실행 순서는 이름 또는 `schema_paths`에서 명확하고 재현 가능해야 한다.
- 일반적인 구조 변경은 스키마를 먼저 수정하고 `supabase db diff -f <descriptive-name>`으로 마이그레이션을 생성한다.
- 생성된 마이그레이션은 초안으로 취급한다. 스키마 의도, 파괴적인 SQL, 권한·RLS, 뷰·함수 보안, diff가 놓친 객체, 잠금과 실행 순서를 검토한다.
- 배포된 마이그레이션은 수정하지 않고 앞으로 진행하는 새 마이그레이션을 추가한다. 일반 마이그레이션 안에 임의의 `BEGIN` 또는 `COMMIT`을 넣지 않는다.
- 스키마 변경자는 전체 마이그레이션을 `supabase db reset`으로 재생한 뒤 `supabase gen types typescript --local`로 공유 타입을 다시 생성한다.
- 스키마, 마이그레이션, 생성 타입과 관련 데이터베이스 테스트는 하나의 논리 변경으로 커밋한다.
- 일반 CI는 로컬 Supabase 스택이나 데이터베이스를 매 실행마다 생성하지 않는다. 전체 재생 증거는 변경자가 로컬에서 만든다.
- 루트 README에는 로컬 스택 시작·중지·초기화, 마이그레이션 생성, 타입 생성과 검토 에이전트 실행의 실제 명령 및 생성 파일 경로를 적는다.

### 공유 데이터베이스 타입 패키지

- `packages/supabase`는 `@repo/supabase`라는 내부 타입 전용 패키지다.
- 로컬 스키마에서 생성한 `Database`, `Json`과 Supabase가 생성하는 테이블·열거형 도우미 타입을 외부에 제공한다.
- 생성 파일은 직접 편집하지 않는다. 필요한 보정이 실제로 생기면 별도 보정 모듈에 명시하고 생성 타입과 구분해 `export`한다.
- 빈 보정, 쿼리 함수, 저장소 계층이나 런타임 중립 클라이언트 팩터리를 미리 만들지 않는다.
- 모바일과 향후 서버는 이 패키지의 같은 `Database` 타입을 사용한다.

### Expo Supabase 클라이언트

- 모바일 앱은 `createClient<Database>`로 하나의 싱글턴 클라이언트를 직접 생성한다.
- 클라이언트를 초기화하기 전에 React Native URL polyfill과 Expo SQLite의 `localStorage` polyfill을 설치한다.
- 클라이언트는 `process.env.EXPO_PUBLIC_SUPABASE_URL`과 `process.env.EXPO_PUBLIC_SUPABASE_PUBLISHABLE_KEY`를 정적으로 읽는다. 값이 없으면 원인을 식별할 수 있는 초기화 오류를 낸다.
- 세션 저장소는 Expo SQLite 기반 `localStorage`를 사용한다. 세션 유지와 토큰 갱신을 지원하고 React Native에서는 URL 세션 감지를 끈다.
- 모바일 코드와 공유 패키지에는 `service_role`, `secret key` 또는 서버 전용 환경 변수를 포함하지 않는다.
- 인증 화면, 로그인·로그아웃, 세션 초기화 UI와 권한 정책은 이번 기반에 추가하지 않는다.

### TanStack Query

- 모바일 앱의 루트 Provider 트리에 수명이 긴 단일 `QueryClient`와 `QueryClientProvider`를 둔다.
- 향후 Supabase 쿼리와 데이터 변경 함수는 모바일 기능 영역에서 작성하고 생성된 데이터베이스 타입을 사용한다.
- 원격 쿼리의 로딩, 오류, 오래된 상태, 재시도, 재조회와 데이터 변경 후 무효화는 TanStack Query가 담당한다.
- 인증 세션과 로컬 UI 상태는 쿼리 캐시에 저장하지 않는다.
- 이번 기반에는 제품 테이블, 예시 네트워크 쿼리, 쿼리 키 팩터리, 오프라인 캐시 유지 또는 낙관적 갱신 규칙을 만들지 않는다.

### 환경 변수와 README

- `apps/mobile/.env.example`에는 아래 변수 이름과 자리표시자만 둔다.

```dotenv
EXPO_PUBLIC_SUPABASE_URL=
EXPO_PUBLIC_SUPABASE_PUBLISHABLE_KEY=
```

- 실제 값은 Git에서 제외한 `apps/mobile/.env.local`에 사용자가 직접 넣는다.
- README의 로컬 절차는 다음 순서로 안내한다.
  1. `bun run setup` 실행
  2. 로컬 스택 시작
  3. CLI 출력 또는 상태에서 API URL과 **publishable key만** 확인
  4. `.env.local` 작성
  5. 모바일 Development Build 실행
- 원격 프로젝트를 사용할 때도 사용자가 프로젝트 URL과 publishable key를 같은 두 변수에 직접 설정한다.
- 초기 설정, `db:start`, 모바일 실행 또는 별도 보조 명령은 환경 변수 파일을 생성하거나 덮어쓰지 않는다. 로컬 값과 원격 값도 자동으로 전환하지 않는다.
- README는 `EXPO_PUBLIC_` 값이 앱 번들에 공개된다는 점과 `service_role`·`secret key`를 넣으면 안 된다는 경고를 포함한다.
- 로컬 API의 루프백 주소가 선택한 Simulator, Emulator 또는 실제 기기에서 접근 가능한지 사용자가 확인해야 한다. README의 문제 해결 항목에서 이 내용을 설명한다. 터널 생성이나 호스트 주소 자동 변경은 추가하지 않는다.

### 에이전트 지침과 마이그레이션 검토

- Supabase 공식 Skill과 Supabase Postgres best-practices Skill은 `.agents/skills`를 원본으로 유지한다. Claude는 같은 내용을 상대 심볼릭 링크로 사용한다.
- 공용 `supabase-reviewer` Skill은 선언형 스키마와 생성 마이그레이션을 함께 읽는다. 데이터 손실, 권한·RLS, diff 누락, 재현성과 생성 타입 일치를 읽기 전용으로 검토한다.
- Codex와 Claude의 검토 에이전트는 파일이나 데이터베이스를 변경할 수 없는 도구 경계를 유지한다.
- 검토 에이전트는 실행하지 못한 초기화, 데이터베이스 테스트 또는 운영 규모의 잠금 검증을 성공으로 간주하지 않고 `UNVERIFIED`로 보고한다.
- README의 스키마 변경 절차는 마이그레이션 생성 후 검토 에이전트 확인을 명시적인 단계로 포함한다.

## 완료 조건

- 깨끗한 체크아웃에서 고정된 Bun과 Node.js 버전으로 모든 의존성을 설치할 수 있다.
- `bun run setup`의 대화형·비대화형 경로와 멱등성이 격리된 테스트 복사본에서 검증된다.
- 초기 설정 결과로 루트 패키지, Expo와 Supabase `project_id`의 식별자가 입력값과 일치한다. 데이터베이스 이름과 환경 변수 파일은 바뀌지 않는다.
- 로컬 스택을 시작하고 전체 마이그레이션을 처음부터 초기화할 수 있다.
- `supabase/schemas/`에서 생성한 마이그레이션을 검토한 뒤 같은 로컬 스키마에서 `@repo/supabase` 타입을 재생성할 수 있다.
- 모바일 앱이 `Database` 타입을 사용하는 싱글턴 Supabase 클라이언트와 Expo SQLite 세션 저장소를 구성한다.
- 필요한 공개 환경 변수가 없으면 원인을 알 수 있는 오류가 발생한다. 올바른 로컬 값이 있으면 iOS와 Android Development Build에서 클라이언트 초기화가 성공한다.
- 모바일 루트 트리에 TanStack Query Provider가 있으며 기존 화면과 테스트가 계속 동작한다.
- `bun run check`, `bun run check-types`와 `bun run test`가 통과한다.
- README만으로 템플릿 초기 설정, 로컬 스키마 작업 방식, 수동 환경 변수 설정, 타입 생성과 검토 에이전트 호출 위치를 찾을 수 있다.
- Git 추적 파일과 앱 번들에 `service_role`, `secret key` 또는 실제 사용자 환경 값이 없다.
- 일반 CI 설정에는 로컬 Supabase 스택 시작이나 `db reset`이 추가되지 않는다.

## 가정

- 모바일 앱은 기존 Expo SDK 57 Development Build와 iOS·Android 범위를 유지한다.
- 최초 Supabase 소비자는 모바일 앱 하나지만 향후 별도 서버 런타임이 추가된다.
- 로컬 우선은 스키마와 마이그레이션의 개발 기준이 로컬 Supabase라는 뜻이다. 모바일 데이터의 오프라인 우선 저장·동기화를 뜻하지 않는다.
- 인증 기능은 나중에 구현하지만 클라이언트의 세션 유지 저장소는 지금 준비한다.
- 원격 Supabase 프로젝트, `project ref`와 배포 환경은 아직 정해지지 않았다.

## 이번 구현에서 제외할 범위

- 로그인 화면, 인증 Provider, 딥 링크 콜백과 세션 UI
- 서버용 Supabase 클라이언트, 쿠키·헤더 전달과 관리자 권한 경계
- 제품 테이블, RLS 정책, 초기 데이터와 실제 쿼리·데이터 변경
- Storage, Realtime, Edge Functions, Cron, Queues와 Vectors
- 원격 프로젝트 생성·연결, 마이그레이션 배포와 환경 승격
- EAS 환경 설정과 로컬·원격 환경 변수 자동 전환 명령
- CI의 Docker 기반 로컬 데이터베이스 생성, 초기화 또는 데이터베이스 테스트
- TanStack Query 캐시 유지와 오프라인 동기화

## 남은 위험

- Supabase CLI, 선언형 diff 엔진과 Expo 통합 API는 바뀔 수 있다. 구현할 때 변경 기록과 현재 공식 문서를 다시 확인하고 정확한 버전을 고정해야 한다.
- 일반 CI에서 전체 마이그레이션을 재생하지 않으므로 스키마 변경자가 남기는 로컬 초기화 증거와 검토 품질에 의존한다.
- Android Emulator나 실제 기기는 로컬 Supabase의 기본 루프백 URL에 직접 접근하지 못할 수 있다. README의 수동 호스트 설정만으로 부족하면 별도 개발 네트워크 결정을 내려야 한다.
- 제품 스키마가 없으므로 최초 기반에서는 실제 타입이 지정된 쿼리와 RLS 동작까지 검증할 수 없다.
- 향후 서버 런타임과 인증·권한 경계가 정해지면 클라이언트 구성과 데이터베이스 정책을 별도 명세로 확장해야 한다.

## 공식 근거

- [Supabase CLI 로컬 개발](https://supabase.com/docs/guides/local-development/cli/getting-started)
- [Supabase 선언형 데이터베이스 스키마](https://supabase.com/docs/guides/local-development/declarative-database-schemas)
- [Supabase 로컬 개발 작업 방식](https://supabase.com/docs/guides/local-development/cli-workflows)
- [Supabase TypeScript 타입 생성](https://supabase.com/docs/guides/api/rest/generating-types)
- [Supabase와 Expo React Native 연동](https://supabase.com/docs/guides/getting-started/quickstarts/expo-react-native)
- [Expo 환경 변수](https://docs.expo.dev/guides/environment-variables/)
- [TanStack QueryClientProvider](https://tanstack.com/query/latest/docs/framework/react/reference/QueryClientProvider)
