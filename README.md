# Turbo Repo Template

Bun, Turborepo, Ultracite, Expo, Supabase로 구성한 스타터 워크스페이스.
애플리케이션은 `apps/`, 공유 패키지는 `packages/`에 추가한다.

## 처음 한 번: 프로젝트 정체성 설정

```bash
bun install
```

```bash
bun run setup
```

`bun run setup`은 project slug, 앱 표시 이름, 모바일 앱 식별자를 한 단계씩
묻고, 바뀔 필드를 기존 값과 새 값까지 모두 보여준 뒤 확인을 받아 적용한다.

| 입력 | 적용 대상 |
| --- | --- |
| project slug (소문자 kebab-case) | 루트 `package.json`의 `name`, Expo `slug`와 `scheme`, `supabase/config.toml`의 `project_id` |
| 앱 표시 이름 | Expo `name` |
| 모바일 앱 식별자 (완성된 reverse-DNS) | iOS `bundleIdentifier`, Android `package` |

비대화형으로 실행하려면 세 값을 모두 넘긴다.

```bash
bun run setup --project-slug aurora-notes --display-name "Aurora Notes" --mobile-app-id com.aurora.notes --yes
```

이미 설정을 마친 저장소에서는 현재 값만 보여주고 변경 없이 끝난다. 다시 적용해야
하면 `--force`를 함께 넘긴다. setup은 위 표의 필드만 수정하며 저장소 전체 문자열을
치환하지 않는다. local Supabase stack을 시작·중지·reset하지 않고, env 파일을
읽거나 쓰지도 않는다. local PostgreSQL database 이름은 `postgres` 그대로 둔다.

## 공통 명령

```bash
bun run dev
bun run build
bun run check
bun run fix
bun run check-types
bun run test
```

## 모바일 개발

Expo SDK 57 앱은 `apps/mobile`에 있고 iOS와 Android 모두 앱 전용 Development
Build를 사용한다.

```bash
bun run --cwd apps/mobile ios
bun run --cwd apps/mobile android
bun run --cwd apps/mobile start
bun run --cwd apps/mobile test:watch
```

로컬 기기 자동화 도구는 저장소에 고정된 CLI로 실행한다.

```bash
bun run agent-device:doctor
```

## Supabase local stack

Docker가 실행 중이어야 한다.

```bash
bun run db:start
bun run db:status
bun run db:stop
bun run db:reset
```

`bun run db:start`는 API URL, publishable key를 포함한 접속 정보를 출력한다.
같은 정보는 `bun run db:status`로 다시 볼 수 있다.

## Supabase 스키마 변경

`supabase/schemas/`의 `.sql` 파일이 데이터베이스 구조의 source of truth다.
migration을 직접 손으로 먼저 쓰지 않는다.

1. `supabase/schemas/`의 스키마 파일을 원하는 최종 상태로 수정한다.
2. migration을 생성한다. 결과는 `supabase/migrations/<timestamp>_<name>.sql`이다.

   ```bash
   bun run db:diff -- -f <descriptive-name>
   ```

3. 생성된 migration을 **초안으로 보고 reviewer에게 검토받는다** (아래 참조).
   파괴적 변경, 권한과 RLS, view·function 보안, diff가 놓친 객체, lock과 실행
   순서를 확인한다.
4. 전체 migration을 처음부터 재생해 검증한다.

   ```bash
   bun run db:reset
   ```

5. 같은 local 스키마에서 공유 타입을 다시 생성한다. 결과는
   `packages/supabase/src/database.types.ts`다.

   ```bash
   bun run db:types
   ```

6. 스키마, migration, 생성 타입, 관련 database test를 하나의 커밋으로 남긴다.

이미 배포한 migration은 수정하지 않고 forward migration을 추가한다. 일반
migration 안에 임의의 `BEGIN`이나 `COMMIT`을 넣지 않는다. 일반 CI는 local
Supabase stack을 만들지 않으므로, 전체 replay 증거는 스키마를 바꾼 사람이
로컬에서 만든다.

### migration reviewer

reviewer는 파일과 데이터베이스를 바꾸지 않는 read-only 검토자다. 실행하지 못한
reset, database test, production 규모 lock 검증은 성공이 아니라 `UNVERIFIED`로
보고한다.

| 도구 | 호출 위치 |
| --- | --- |
| Claude Code | `supabase-reviewer` 서브에이전트 — [.claude/agents/supabase-reviewer.md](.claude/agents/supabase-reviewer.md) |
| Codex | [.codex/agents/supabase-reviewer.toml](.codex/agents/supabase-reviewer.toml) |
| 공용 Skill | [.agents/skills/supabase-reviewer/SKILL.md](.agents/skills/supabase-reviewer/SKILL.md) (Claude는 `.claude/skills/supabase-reviewer` symlink로 읽는다) |

## 공유 database 타입

`packages/supabase`는 `@repo/supabase`라는 types-only package다. 모바일 앱과 향후
서버가 같은 `Database` 타입을 사용한다. runtime 의존성, 환경 변수 접근, 완성된
client는 이 package에 두지 않는다.

`packages/supabase/src/database.types.ts`는 `bun run db:types`가 생성하므로 직접
편집하지 않는다. `packages/supabase/biome.jsonc`가 이 파일만 lint 대상에서
제외하므로 생성기 출력 그대로 유지된다. 생성이 실패해도 기존 파일은 그대로
남는다.

## Supabase 연결

Supabase URL과 publishable key는 사용자가 직접 설정한다.

1. `bun run setup`으로 프로젝트 식별자를 정한다.
2. `bun run db:start`로 local stack을 띄운다.
3. 출력 또는 `bun run db:status`에서 **API URL**과 **publishable key만**
   확인한다.
4. [apps/mobile/.env.example](apps/mobile/.env.example)을 참고해
   `apps/mobile/.env.local`을 만든다.

   ```dotenv
   EXPO_PUBLIC_SUPABASE_URL=http://127.0.0.1:54321
   EXPO_PUBLIC_SUPABASE_PUBLISHABLE_KEY=sb_publishable_...
   ```

5. 모바일 Development Build를 실행한다.

   ```bash
   bun run --cwd apps/mobile ios
   ```

원격 Supabase 프로젝트를 사용할 때도 project URL과 publishable key를 같은 두
변수에 직접 넣는다. `bun run setup`, `bun run db:start`, 모바일 실행 command는
env 파일을 만들거나 덮어쓰지 않고 local과 remote 값을 자동으로 바꾸지도 않는다.

> **경고**: `EXPO_PUBLIC_` 값은 앱 bundle에 그대로 포함되어 공개된다.
> `service_role` 키나 secret key를 이 변수에 넣지 않는다. `.env.local`은 Git에서
> 제외되며 저장소에는 변수 이름만 있는 `.env.example`만 둔다.

### 문제 해결

- **환경 변수가 없을 때**: 앱이 시작하면서 빠진 변수 이름을 담은 초기화 오류를
  낸다. `.env.local`을 채우고 번들러를 다시 시작한다.
- **local API에 연결되지 않을 때**: `http://127.0.0.1:54321`은 iOS 시뮬레이터에서만
  그대로 동작한다. Android emulator는 host loopback이 `10.0.2.2`이고, 실제 기기는
  개발 머신의 LAN IP가 필요하다. 사용하는 기기에서 실제로 접근 가능한 주소를
  직접 확인해 `EXPO_PUBLIC_SUPABASE_URL`에 넣는다. 템플릿은 이를 위한 tunnel이나
  host 치환을 자동화하지 않는다.
- **네이티브 모듈을 추가한 뒤**: `expo-sqlite`처럼 네이티브 코드를 포함한
  의존성이 늘면 기존 Development Build로는 실행되지 않는다. `ios` 또는
  `android` command로 Development Build를 다시 만든다.
